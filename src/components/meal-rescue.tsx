"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Refrigerator,
  ShoppingBasket,
  Timer,
  RefreshCw,
  Pencil,
  Check,
  LockKeyhole,
  Clock3,
} from "lucide-react";
import type { Kitchen } from "@/lib/meal-engine";
import { shopping } from "@/lib/meal-engine";
import type { RescueProposal } from "@/lib/meal-rescue";
import { useTranslation } from "./language-provider";
import { mealReasonLabel } from "@/lib/meal-reason-label";
type Proposal = RescueProposal & { token: string };
export function MealRescue({
  kitchenId,
  state,
  from,
  to,
  mutate,
  busy,
}: {
  kitchenId: string;
  state: Kitchen;
  from: string;
  to: string;
  mutate: (a: string, d: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { t, locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [objective, setObjective] = useState("");
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generate = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/meals/rescue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kitchenId, from, to }),
          signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error ?? "Could not generate rescue proposals.");
        if (signal?.aborted) return;
        setProposals(result.proposals);
        setObjective("");
        setEditing("");
        setSelected(
          result.proposals.flatMap((p: Proposal) =>
            p.changes.map((c) => c.after.id),
          ),
        );
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [kitchenId, from, to],
  );
  useEffect(() => {
    const controller = new AbortController();
    void generate(controller.signal);
    return () => controller.abort();
  }, [generate]);
  const proposal =
    proposals.find((p) => p.objective === objective) ?? proposals[0];
  function edit(
    id: string,
    field: "date" | "servings" | "slot",
    value: string | number,
  ) {
    if (!proposal) return;
    setProposals(
      proposals.map((p) =>
        p.objective !== proposal.objective
          ? p
          : {
              ...p,
              changes: p.changes.map((c) =>
                c.after.id !== id
                  ? c
                  : { ...c, after: { ...c.after, [field]: value } },
              ),
            },
      ),
    );
  }
  const draft = structuredClone(state);
  for (const change of proposal?.changes.filter((c) =>
    selected.includes(c.after.id),
  ) ?? []) {
    const index = draft.plans.findIndex((p) => p.id === change.after.id);
    if (index >= 0) draft.plans[index] = change.after;
  }
  const needs = shopping(draft, from, to).needs;
  const option = (p: Proposal) =>
    p.objective === "Use on-hand food"
      ? { label: text("Stock", "Stock"), Icon: Refrigerator }
      : p.objective === "Reduce additional groceries"
        ? { label: text("Groceries", "Courses"), Icon: ShoppingBasket }
        : { label: text("Time", "Temps"), Icon: Timer };
  return (
    <section className="meal-simple-form">
      <div className="meal-tool-row">
        <fieldset className="meal-choice-chips">
          {proposals.map((p) => {
            const { label, Icon } = option(p);
            return (
              <button
                type="button"
                key={p.objective}
                aria-pressed={proposal === p}
                onClick={() => {
                  setObjective(p.objective);
                  setEditing("");
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </fieldset>
        <button
          type="button"
          className="meal-icon-button"
          aria-label={text("Refresh", "Actualiser")}
          disabled={busy || loading}
          onClick={() => void generate()}
        >
          <RefreshCw size={20} />
        </button>
      </div>
      {loading && <p role="status">{text("Finding options…", "Recherche…")}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {!loading && !error && !proposal && (
        <p>{text("No changes available", "Aucun changement disponible")}</p>
      )}
      {!loading && proposal && (
        <>
          {proposal.changes.map((c) => (
            <div className="meal-card" key={c.after.id}>
              <div className="meal-tool-row">
                <label className="meal-replan-choice">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.after.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.after.id]
                          : selected.filter((id) => id !== c.after.id),
                      )
                    }
                  />
                  <span>
                    <small>
                      {c.before.date} · {t(c.before.slot)}
                    </small>
                    <span className="small-note">{c.before.title}</span>
                    <strong>{c.after.title}</strong>
                  </span>
                </label>
                <button
                  type="button"
                  className="meal-icon-button"
                  aria-label={text("Edit", "Modifier") + " · " + c.after.title}
                  aria-expanded={editing === c.after.id}
                  onClick={() =>
                    setEditing(editing === c.after.id ? "" : c.after.id)
                  }
                >
                  <Pencil size={18} />
                </button>
              </div>
              {editing === c.after.id && (
                <div className="meal-simple-form">
                  <label>
                    {text("Day", "Jour")}
                    <input
                      type="date"
                      value={c.after.date}
                      onChange={(e) => edit(c.after.id, "date", e.target.value)}
                    />
                  </label>
                  <div className="meal-stepper">
                    <span>{text("Servings", "Portions")}</span>
                    <div>
                      <button
                        type="button"
                        aria-label={text("Fewer servings", "Moins de portions")}
                        disabled={c.after.servings <= 0.5}
                        onClick={() =>
                          edit(
                            c.after.id,
                            "servings",
                            Math.max(0.5, c.after.servings - 0.5),
                          )
                        }
                      >
                        −
                      </button>
                      <output>{c.after.servings}</output>
                      <button
                        type="button"
                        aria-label={text("More servings", "Plus de portions")}
                        disabled={c.after.servings >= 100}
                        onClick={() =>
                          edit(
                            c.after.id,
                            "servings",
                            Math.min(100, c.after.servings + 0.5),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <fieldset className="meal-choice-chips">
                    <legend>{text("Meal", "Repas")}</legend>
                    {["breakfast", "lunch", "dinner", "snack"].map((slot) => (
                      <button
                        type="button"
                        key={slot}
                        aria-pressed={c.after.slot === slot}
                        onClick={() => edit(c.after.id, "slot", slot)}
                      >
                        {t(slot)}
                      </button>
                    ))}
                  </fieldset>
                  <p className="small-note">
                    {c.reasons
                      .map((reason) => mealReasonLabel(reason, locale))
                      .join(" · ")}
                  </p>
                </div>
              )}
            </div>
          ))}
          <div className="meal-tool-row small-note">
            {!!proposal.retainedLocked.length && (
              <span>
                <LockKeyhole size={16} aria-hidden="true" />{" "}
                {proposal.retainedLocked.length}
              </span>
            )}
            {!!proposal.preparationReview.length && (
              <span>
                <Clock3 size={16} aria-hidden="true" />{" "}
                {text("Tasks", "Tâches")} {proposal.preparationReview.length}
              </span>
            )}
            <span>
              <ShoppingBasket size={16} aria-hidden="true" />{" "}
              {proposal.previousShopping.needs.length} → {needs.length}
            </span>
          </div>
          {needs.map((need, i) => (
            <p key={i} className="small-note">
              {need.name} · {need.quantity ?? text("Unknown", "Inconnu")}{" "}
              {need.unit}
            </p>
          ))}
          <button
            className="button primary"
            disabled={
              busy ||
              !proposal.changes.some((c) => selected.includes(c.after.id))
            }
            onClick={async () => {
              const changes = proposal.changes.filter((c) =>
                selected.includes(c.after.id),
              );
              if (
                await mutate("accept-rescue", {
                  token: proposal.token,
                  selected: changes.map((c) => c.after.id),
                  overrides: changes.map((c) => ({
                    id: c.after.id,
                    date: c.after.date,
                    slot: c.after.slot,
                    servings: c.after.servings,
                    diners: c.after.diners,
                  })),
                })
              )
                setProposals([]);
            }}
          >
            <Check size={18} aria-hidden="true" />
            {text("Apply", "Appliquer")}
          </button>
        </>
      )}
      {(state.rescues ?? [])
        .filter((r) => !r.undone)
        .map((r) => (
          <button
            className="text-button"
            key={r.id}
            disabled={busy}
            onClick={() => mutate("undo-rescue", { id: r.id })}
          >
            {text("Undo", "Annuler")}
          </button>
        ))}
    </section>
  );
}
