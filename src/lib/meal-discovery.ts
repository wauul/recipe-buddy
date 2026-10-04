import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./http";
import { requirePro } from "./native-pro";
import { requireTerms } from "./account-controls";
import { rateLimit } from "./rate-limit";
import { recipeUrlText } from "./recipe-url";
import { parsedDiscoveryRecipe } from "./meal-discovery-parser";
import { checkMeal, healthRuleVersion } from "./meal-health";
import {
  canonical,
  consume,
  type Ingredient,
  type Profile,
} from "./meal-engine";
import { practicalRank } from "./meal-ranking";
import { localDate } from "./meal-engine";
import { readMeals } from "./meal-service";
import { recipeSchema } from "./validation";

export const discoveryInput = z.object({
  date: localDate.optional(),
  kitchenId: z.string().max(80).optional(),
  diners: z.array(z.string().max(80)).max(20),
  ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  servings: z.number().min(1).max(100).default(2),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default("FR"),
});
const sourceSchema = z.object({
  host: z.string().regex(/^[a-z0-9.-]+$/),
  license: z.string().min(1).max(200),
  rightsUrl: z.string().url(),
  reviewedBy: z.string().min(1).max(120),
  expiresAt: z.string().datetime(),
  allowPrivateImport: z.literal(true),
});
function sources() {
  try {
    return z
      .array(sourceSchema)
      .max(20)
      .parse(JSON.parse(process.env.MEAL_DISCOVERY_SOURCES ?? "[]"))
      .filter((s) => Date.parse(s.expiresAt) > Date.now());
  } catch {
    throw new HttpError(
      503,
      "Recipe discovery source permissions need configuration.",
    );
  }
}
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
function key() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new HttpError(503, "Recipe discovery needs configuration.");
  return value;
}
function sign(data: unknown) {
  const raw = Buffer.from(JSON.stringify(data)).toString("base64url");
  return (
    raw +
    "." +
    createHmac("sha256", key())
      .update("meal-discovery:" + raw)
      .digest("base64url")
  );
}
function verify(token: string) {
  const [raw, signature] = token.split(".");
  const expected = createHmac("sha256", key())
    .update("meal-discovery:" + raw)
    .digest();
  const got = Buffer.from(signature ?? "", "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected))
    throw new HttpError(400, "Invalid recipe candidate.");
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid recipe candidate.");
  }
}
async function assessment(
  user: string,
  input: z.infer<typeof discoveryInput>,
  ingredients: Ingredient[],
) {
  const kitchen = await readMeals(user, input.kitchenId);
  const profiles = await db.mealProfile.findMany({
    where: { kitchenId: kitchen.kitchenId, id: { in: input.diners } },
  });
  const check = checkMeal(
    ingredients,
    profiles.map((p) => p.data as unknown as Profile),
    !input.diners.length || profiles.length !== input.diners.length,
    kitchen.state.pantry,
  );
  const eligible =
    check.status === "not-assessed" ||
    (input.diners.length === 0 && check.status !== "conflict");
  return {
    kitchen,
    check,
    eligible,
    profiles: profiles.map((p) => p.data as unknown as Profile),
  };
}
export async function discoverMeals(user: string, raw: unknown) {
  await requirePro(user);
  await requireTerms(user);
  const input = discoveryInput.parse(raw),
    permitted = sources();
  if (!process.env.BRAVE_SEARCH_API_KEY || !permitted.length)
    throw new HttpError(
      503,
      "Online discovery is unavailable until search and permitted recipe sources are configured.",
    );
  // Both account and deployment-wide caps limit paid calls. No diagnoses or diary leave the server.
  if (
    !(await rateLimit(`meal-discovery:${user}`, 6, 86400)) ||
    !(await rateLimit(
      "meal-discovery-global",
      Number(process.env.MEAL_DISCOVERY_DAILY_LIMIT ?? 100),
      86400,
    ))
  )
    throw new HttpError(429, "Recipe discovery daily limit reached.");
  const query =
    input.ingredients.map(canonical).join(" ") +
    " recipe (" +
    permitted.map((s) => "site:" + s.host).join(" OR ") +
    ")";
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("country", input.country);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
  } catch {
    throw new HttpError(
      503,
      "Online recipe search is temporarily unavailable.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      503,
      "Online recipe search is temporarily unavailable.",
    );
  const results = z
    .object({
      web: z
        .object({
          results: z.array(z.object({ url: z.string().max(2048) })).max(20),
        })
        .optional(),
    })
    .parse(await response.json());
  const urls = [
      ...new Set((results.web?.results ?? []).map((r) => r.url)),
    ].slice(0, 8),
    candidates = [];
  const includedSources = new Set<string>(),
    includedContent = new Set<string>();
  let reviewNeeded = 0,
    failed = 0;
  const reviewSources:{url:string;publisher:string;reason:string}[]=[];
  for (const url of urls) {
    const host = (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return "";
        }
      })(),
      permission = permitted.find((s) => s.host === host);
    if (!permission) continue;
    try {
      const page = await recipeUrlText(url, 0, [host]),
        recipe = parsedDiscoveryRecipe(page.structuredRecipe);
      if (!recipe) {
        reviewNeeded++;
        reviewSources.push({url,publisher:host,reason:"Incomplete quantities, servings or instructions. Review the original source and enter missing information manually; no eligibility or import is approved."});
        continue;
      }
      const assessed = await assessment(user, input, recipe.ingredients);
      if (!assessed.eligible) continue;
      const usage = consume(
        assessed.kitchen.state.pantry,
        recipe.ingredients,
        input.servings / recipe.servings,
      );
      const reasons = [
        "Uses selected pantry ingredients",
        "Health suitability is not established",
      ];
      const selected = recipe.ingredients.filter((i) =>
        input.ingredients.some((n) => canonical(n) === canonical(i.name)),
      ).length;
      if (!selected) continue;
      const author = page.structuredRecipe?.author;
      const attribution =
        typeof author === "string"
          ? author
          : author && typeof author === "object" && !Array.isArray(author)
            ? String((author as Record<string, unknown>).name ?? host)
            : host;
      const provenance = {
        url: page.sourceUrl,
        publisher: host,
        author: attribution,
        license: permission.license,
        rightsUrl: permission.rightsUrl,
        reviewedBy: permission.reviewedBy,
        retrievedAt: new Date().toISOString(),
        contentHash: digest(recipe),
        parserVersion: 1,
        imageRights: "not-imported",
        totalTimeMinutes: (() => {
          const m = String(page.structuredRecipe?.totalTime ?? "").match(
            /^PT(?:(\d+)H)?(?:(\d+)M)?$/,
          );
          return m ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : null;
        })(),
      };
      if (
        includedSources.has(provenance.url) ||
        includedContent.has(provenance.contentHash)
      )
        continue;
      includedSources.add(provenance.url);
      includedContent.add(provenance.contentHash);
      candidates.push({
        title: recipe.title,
        servings: recipe.servings,
        source: provenance,
        check: assessed.check,
        missing: usage.unresolved,
        reasons,
        rank:
          usage.unresolved.length +
          practicalRank(
            { ...recipe, sourceProvenance: provenance },
            assessed.kitchen.state,
            assessed.profiles,
            input.ingredients,
            input.date ?? new Intl.DateTimeFormat("en-CA").format(new Date()),
          ).rank,
        token: sign({
          purpose: "meal-candidate",
          user,
          input,
          recipe,
          provenance,
          rule: healthRuleVersion,
          expires: Date.now() + 15 * 60_000,
        }),
      });
    } catch {
      failed++;
    }
  }
  return {
    candidates: candidates.sort((a, b) => a.rank - b.rank).slice(0, 3),
    reviewNeeded,
    reviewSources,
    failed,
    requested: 3,
    reason:
      "Only complete, permitted sources passing the available checks are included. Fewer matches are possible.",
  };
}
export async function importDiscoveredMeal(user: string, raw: unknown) {
  await requirePro(user);
  await requireTerms(user);
  const { token } = z.object({ token: z.string().max(80000) }).parse(raw),
    candidate = verify(token);
  if (
    candidate.purpose !== "meal-candidate" ||
    candidate.user !== user ||
    candidate.expires < Date.now() ||
    candidate.rule !== healthRuleVersion
  )
    throw new HttpError(409, "Recipe candidate expired. Search again.");
  const input = discoveryInput.parse(candidate.input),
    recipe = recipeSchema.parse(candidate.recipe),
    permission = sources().find(
      (s) =>
        s.host === new URL(candidate.provenance.url).hostname &&
        s.license === candidate.provenance.license,
    );
  if (!permission)
    throw new HttpError(409, "Recipe import permission has changed.");
  const id =
    "meal-import-" +
    digest({ user, url: candidate.provenance.url }).slice(0, 40);
  const existing = await db.recipe.findFirst({ where: { id, userId: user } });
  if (existing) return existing;
  if (!(await rateLimit(`meal-import:${user}`, 10, 3600)))
    throw new HttpError(429, "Too many recipe imports. Try later.");
  const fresh = await recipeUrlText(candidate.provenance.url, 0, [
    permission.host,
  ]).catch(() => {
    throw new HttpError(503, "The recipe source is unavailable. Retry later.");
  });
  if (
    digest(parsedDiscoveryRecipe(fresh.structuredRecipe)) !==
    candidate.provenance.contentHash
  )
    throw new HttpError(
      409,
      "The source recipe changed. Search again before importing.",
    );
  const assessed = await assessment(user, input, recipe.ingredients);
  if (!assessed.eligible)
    throw new HttpError(
      409,
      "Diner restrictions changed. Review the recipe again.",
    );
  return db.recipe.upsert({
    where: { id },
    create: {
      ...recipe,
      id,
      userId: user,
      roastLine: "",
      sourceProvenance: candidate.provenance,
    },
    update: {},
  });
}
