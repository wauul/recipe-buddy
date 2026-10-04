import {
  canonical,
  type Batch,
  type Ingredient,
  type Profile,
} from "./meal-engine";
export const healthRuleVersion = "2026-10-04.1";
export const healthSources = [
  {
    id: "FDA-allergens",
    url: "https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies",
    accessed: "2026-10-04",
  },
  {
    id: "EU-allergens",
    url: "https://food.ec.europa.eu/food-safety/campaign-2026/allergies_en",
    accessed: "2026-10-03",
  },
  {
    id: "CDC-diabetes",
    url: "https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html",
    accessed: "2026-10-04",
  },
  {
    id: "USDA-composition",
    url: "https://fdc.nal.usda.gov/data-documentation/",
    accessed: "2026-10-04",
  },
  {
    id: "CNIL-health",
    url: "https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser",
    accessed: "2026-10-04",
  },
];
// Review cannot be inferred from a source link. All modules remain unreleased.
export const coverageManifest = {
  version: healthRuleVersion,
  intendedMarkets: ["Europe", "US"],
  primaryMarkets: ["FR", "US"],
  expansionMarkets: "Remaining European countries require country-specific validation",
  validatedCountries: [] as string[],
  candidateCountries: ["FR", "US"],
  otherCountries: "not-assessed",
  reviewer: null,
  modules: [
    "allergies",
    "intolerances",
    "coeliac",
    "pregnancy",
    "breastfeeding",
    "type1",
    "type2",
    "gestational",
    "preexisting-pregnancy",
    "children",
    "combined-restrictions",
  ].map((condition) => ({
    condition,
    countries: ["FR", "US"],
    ageBands: ["adult", "child", "under5"],
    status: "unreviewed",
    requiredEvidence: [
      "ingredient/product composition",
      "preparation",
      "cross-contact",
      "selected diner",
      "country",
      "profile version",
    ],
    owner: "Recipe Buddy operator",
    reviewer: null,
    version: healthRuleVersion,
    reviewedAt: null,
    nextReview: "before activation and after source/rule changes",
  })),
  exclusions: [
    "infant feeding",
    "therapeutic paediatric diets",
    "child weight loss",
    "insulin dosing",
    "medication advice",
    "clinical adequacy",
    "food-safety certification",
  ],
  sources: healthSources,
};
const derivatives: Record<string, string[]> = {
  crustaceans: [
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "crayfish",
    "crevette",
    "crabe",
    "homard",
    "langoustine",
  ],
  molluscs: [
    "mussel",
    "oyster",
    "clam",
    "squid",
    "octopus",
    "moule",
    "huître",
    "palourde",
    "calamar",
    "poulpe",
  ],
  celery: ["celery", "celeri", "céleri", "celeriac"],
  mustard: ["mustard", "moutarde"],
  lupin: ["lupin", "lupine"],
  sulphites: [
    "sulphite",
    "sulfite",
    "sulphites",
    "sulfites",
    "sulfur dioxide",
    "sulphur dioxide",
    "dioxyde de soufre",
  ],
  milk: [
    "milk",
    "lait",
    "whey",
    "casein",
    "butter",
    "beurre",
    "cream",
    "creme",
    "crème",
    "cheese",
    "fromage",
    "yogurt",
    "yaourt",
    "parmesan",
    "mozzarella",
    "feta",
    "ghee",
    "lactalbumin",
    "lactoglobulin",
  ],
  egg: ["egg", "eggs", "oeuf", "oeufs", "œuf", "œufs", "mayonnaise", "albumin"],
  wheat: [
    "wheat",
    "ble",
    "blé",
    "semolina",
    "semoule",
    "couscous",
    "seitan",
    "spelt",
    "épeautre",
  ],
  gluten: [
    "wheat",
    "ble",
    "blé",
    "barley",
    "orge",
    "rye",
    "seigle",
    "malt",
    "spelt",
    "épeautre",
    "semolina",
    "semoule",
    "couscous",
    "seitan",
  ],
  peanut: ["peanut", "cacahuète", "arachide", "groundnut"],
  soy: ["soy", "soja", "tofu", "miso", "edamame"],
  sesame: ["sesame", "sésame", "tahini"],
  nuts: [
    "almond",
    "amande",
    "walnut",
    "noix",
    "hazelnut",
    "noisette",
    "cashew",
    "cajou",
    "pistachio",
    "pistache",
  ],
  fish: [
    "fish",
    "poisson",
    "salmon",
    "saumon",
    "tuna",
    "thon",
    "cod",
    "cabillaud",
    "anchovy",
    "anchois",
  ],
};
export type HealthCheck = {
  status: "conflict" | "unresolved" | "not-assessed";
  reasons: string[];
  ruleVersion: string;
  nutrition: null;
  diaryCoverage: "unknown";
};
export function checkMeal(
  ingredients: Ingredient[],
  profiles: Profile[],
  unknownDiner = false,
  products: Batch[] = [],
): HealthCheck {
  const composition = ingredients.flatMap((i) => [
    i,
    ...products
      .filter((p) => canonical(p.name) === canonical(i.name))
      .map((p) => ({
        ...i,
        name: [p.label, p.evidence?.label, p.name].filter(Boolean).join(" "),
      })),
  ]);
  const reasons: string[] = [],
    conflicts: string[] = [];
  for (const profile of profiles) {
    const restrictions = [
      ...profile.allergies,
      ...profile.intolerances,
      ...(profile.coeliac ? ["gluten"] : []),
    ];
    for (const restriction of restrictions) {
      const raw = canonical(restriction),
        aliases: Record<string, string> = {
          dairy: "milk",
          lactose: "milk",
          lait: "milk",
          œuf: "egg",
          oeuf: "egg",
          eggs: "egg",
          blé: "wheat",
          ble: "wheat",
          soja: "soy",
          sésame: "sesame",
          shellfish: "crustaceans",
          crustacean: "crustaceans",
          mollusc: "molluscs",
          céleri: "celery",
          celeri: "celery",
          moutarde: "mustard",
          sulfites: "sulphites",
        },
        key = aliases[raw] ?? raw,
        terms = derivatives[key] ?? [key];
      if (
        composition
          .filter((i) => !i.omitted)
          .some((i) =>
            terms.some((t) =>
              new RegExp(
                `(?:^|[^\\p{L}])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}])`,
                "iu",
              ).test(canonical(i.name)),
            ),
          )
      )
        conflicts.push("declared-restriction-conflict");
    }
    if (restrictions.length)
      reasons.push("composition-and-cross-contact-unresolved");
    if (
      profile.pregnancy ||
      profile.breastfeeding ||
      profile.diabetes !== "none" ||
      profile.otherConditions ||
      profile.clinicianInstructions ||
      profile.ageBand !== "adult"
    )
      reasons.push("country-age-condition-module-unreviewed");
  }
  if (unknownDiner) reasons.push("diner-profile-unknown");
  if (
    ingredients.some((i) =>
      /sauce|pesto|stock|bouillon|mix|mélange|seasoning/i.test(i.name),
    )
  )
    reasons.push("compound-ingredient-unresolved");
  if (!ingredients.length) reasons.push("composition-unknown");
  return {
    status: conflicts.length
      ? "conflict"
      : reasons.length
        ? "unresolved"
        : "not-assessed",
    reasons: [
      ...new Set([
        ...conflicts,
        ...reasons,
        "no-validated-medical-suitability",
      ]),
    ],
    ruleVersion: healthRuleVersion,
    nutrition: null,
    diaryCoverage: "unknown",
  };
}
