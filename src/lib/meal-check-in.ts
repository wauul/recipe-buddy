import { createHash } from "node:crypto";
import { z } from "zod";
import type { Kitchen } from "./meal-engine";
export class CheckInError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const checkInPolicy = "kitchen-check-in-v1";
export const checkInGuard = z.object({
  kind: z.enum(["meal", "pantry", "leftover", "context", "eaten"]),
  sourceId: z.string().min(1).max(160),
  personId: z.string().max(80).optional(),
  sourceVersion: z.string().length(64),
});
export type CheckInGuard = z.infer<typeof checkInGuard>;
export type CheckInQuestion = CheckInGuard & {
  id: string;
  title: string;
  date?: string;
  slot?: string;
  personName?: string;
  quantity?: number | null;
  unit?: string;
  approximate?: boolean;
};
export type CheckInConfirmation = {
  actorId: string;
  id: string;
  sourceVersion: string;
  at: string;
  operationId: string;
  action: string;
  recordId: string;
  title: string;
  before?: number | null;
  after?: number | null;
  unit?: string;
};
// PostgreSQL JSONB normalizes object key order. Hash semantic data, never insertion order.
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b, "en"))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : value;
const hash = (value: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
export function checkInSource(
  state: Kitchen,
  actor: string,
  ref: Omit<CheckInGuard, "sourceVersion">,
) {
  const { kind, sourceId, personId } = ref;
  if (kind === "meal") {
    const plan = state.plans.find((p) => p.id === sourceId);
    return plan
      ? {
          plan,
          eaten: state.eaten.filter(
            (e) => e.planId === sourceId && e.personId === personId,
          ),
        }
      : null;
  }
  if (kind === "pantry") {
    const batch = state.pantry.find((b) => b.id === sourceId);
    return batch
      ? {
          batch,
          history: state.history.filter((h) =>
            h.effects.some((e) => e.batchId === sourceId),
          ),
        }
      : null;
  }
  if (kind === "leftover")
    return state.leftovers.find((l) => l.id === sourceId) ?? null;
  if (kind === "eaten")
    return state.eaten.find((e) => e.id === sourceId) ?? null;
  return {
    date: sourceId,
    timezone: state.timezone,
    context:
      state.contexts?.find((c) => c.actorId === actor && c.date === sourceId) ??
      null,
  };
}
export function checkInVersion(
  state: Kitchen,
  actor: string,
  ref: Omit<CheckInGuard, "sourceVersion">,
) {
  return hash([checkInPolicy, checkInSource(state, actor, ref)]);
}
export function checkInSnapshot(
  state: Kitchen,
  actor: string,
  role: string,
  people: { id: string; name: string }[],
  now = new Date(),
  offset = 0,
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: state.timezone,
  }).format(now);
  const start = new Date(today + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - 7);
  const from = start.toISOString().slice(0, 10);
  const questions: CheckInQuestion[] = [];
  const confirmations = (state.checkInConfirmations ?? []).filter(
    (c) => c.actorId === actor,
  );
  const confirmed = new Set(confirmations.map((c) => c.id + c.sourceVersion));
  const histories = new Map<string, Kitchen["history"]>();
  for (const h of state.history)
    for (const id of new Set(h.effects.map((e) => e.batchId)))
      histories.set(id, [...(histories.get(id) ?? []), h]);
  const add = (
    q: Omit<CheckInQuestion, "id" | "sourceVersion">,
    source: unknown,
  ) => {
    const id = `${q.kind}:${q.sourceId}:${q.personId ?? ""}`;
    const sourceVersion = hash([checkInPolicy, source]);
    if (!confirmed.has(id + sourceVersion))
      questions.push({ ...q, id, sourceVersion });
  };
  const eaten = new Set(state.eaten.map((e) => `${e.planId}:${e.personId}`));
  for (const plan of state.plans
    .filter((p) => p.date >= from && p.date < today)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))) {
    for (const person of people.filter((p) => plan.diners.includes(p.id))) {
      if (!eaten.has(`${plan.id}:${person.id}`))
        add(
          {
            kind: "meal",
            sourceId: plan.id,
            personId: person.id,
            personName: person.name,
            title: plan.title,
            date: plan.date,
            slot: plan.slot,
          },
          { plan, eaten: [] },
        );
    }
  }
  if (role !== "member")
    for (const batch of state.pantry
      .filter((b) => b.quantity === null || b.quantityEstimated)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      add(
        {
          kind: "pantry",
          sourceId: batch.id,
          title: batch.name,
          quantity: batch.quantity,
          unit: batch.unit,
          approximate: batch.quantityEstimated,
        },
        { batch, history: histories.get(batch.id) ?? [] },
      );
    }
  if (role === "owner" || role === "planner") {
    const own = new Set(
      state.occasions
        .filter((o) => o.actorId === actor && !o.undone)
        .map((o) => o.id),
    );
    for (const batch of state.leftovers
      .filter((l) => own.has(l.occasionId) && l.remaining > 0)
      .sort((a, b) => a.id.localeCompare(b.id))) {
      add(
        {
          kind: "leftover",
          sourceId: batch.id,
          title: batch.title,
          quantity: batch.remaining,
          unit: "servings",
          date: batch.date ?? undefined,
        },
        batch,
      );
    }
  }
  const context = { kind: "context" as const, sourceId: today };
  const contexts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const ref = {
      kind: "context" as const,
      sourceId: d.toISOString().slice(0, 10),
    };
    return { ...ref, sourceVersion: checkInVersion(state, actor, ref) };
  });
  const corrections: CheckInQuestion[] = [];
  for (const e of state.eaten
    .filter((e) => people.some((p) => p.id === e.personId))
    .slice(-30)
    .reverse()) {
    const ref = {
      kind: "eaten" as const,
      sourceId: e.id,
      personId: e.personId,
    };
    corrections.push({
      ...ref,
      id: `eaten:${e.id}:${e.personId}`,
      title: e.title,
      date: e.date,
      slot: e.slot,
      personName: people.find((p) => p.id === e.personId)?.name,
      quantity: e.amount,
      approximate: e.approximate,
      sourceVersion: checkInVersion(state, actor, ref),
    });
  }
  for (const c of confirmations.slice(-30).reverse()) {
    const [kind, sourceId] = c.id.split(":");
    if (kind !== "pantry" && kind !== "leftover") continue;
    if (kind === "pantry" && role === "member") continue;
    const batch =
      kind === "pantry"
        ? state.pantry.find((b) => b.id === sourceId)
        : state.leftovers.find(
            (l) =>
              l.id === sourceId &&
              state.occasions.some(
                (o) =>
                  o.id === l.occasionId && o.actorId === actor && !o.undone,
              ),
          );
    if (!batch) continue;
    const ref = { kind, sourceId } as const;
    corrections.push({
      ...ref,
      id: c.id,
      title: "name" in batch ? batch.name : batch.title,
      quantity: "quantity" in batch ? batch.quantity : batch.remaining,
      unit: "unit" in batch ? batch.unit : "servings",
      approximate:
        "quantityEstimated" in batch ? batch.quantityEstimated : false,
      sourceVersion: checkInVersion(state, actor, ref),
    });
  }
  return {
    policy: checkInPolicy,
    maxPerVisit: 5,
    today,
    timezone: state.timezone,
    total: questions.length,
    reminder: state.checkInReminders?.find((r) => r.actorId === actor) ?? {
      actorId: actor,
      enabled: false,
      time: "18:00",
      quietStart: "21:00",
      quietEnd: "08:00",
      timezone: state.timezone,
    },
    questions: questions.slice(offset, offset + 100),
    nextOffset: offset + 100 < questions.length ? offset + 100 : null,
    offset,
    corrections,
    contexts,
    context: {
      ...context,
      sourceVersion: checkInVersion(state, actor, context),
    },
    confirmations: confirmations.slice(-30).reverse(),
  };
}

export function validateCheckInSource(
  state: Kitchen,
  actor: string,
  ref: CheckInGuard,
  action: string,
  data: Record<string, unknown>,
) {
  if (!checkInSource(state, actor, ref))
    throw new CheckInError(
      409,
      "No longer available. Refresh Kitchen check-in.",
    );
  if (
    ref.kind === "meal" &&
    state.eaten.some(
      (e) => e.planId === ref.sourceId && e.personId === ref.personId,
    )
  )
    throw new CheckInError(409, "Already resolved. Review the eating record.");
  if (checkInVersion(state, actor, ref) !== ref.sourceVersion)
    throw new CheckInError(
      409,
      "Changed since opening. Refresh and review your answer.",
    );
  const valid =
    ref.kind === "meal"
      ? action === "eat" &&
        data.planId === ref.sourceId &&
        data.personId === ref.personId
      : ref.kind === "pantry"
        ? ["pantry", "stock"].includes(action) && data.id === ref.sourceId
        : ref.kind === "leftover"
          ? (action === "leftover" && data.id === ref.sourceId) ||
            (action === "eat" && data.leftoverId === ref.sourceId)
          : ref.kind === "eaten"
            ? ["edit-eaten", "remove-eaten"].includes(action) &&
              data.id === ref.sourceId
            : action === "context" && data.date === ref.sourceId;
  if (!valid)
    throw new CheckInError(400, "Answer does not match this question.");
}
