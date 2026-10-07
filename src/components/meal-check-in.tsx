"use client";
import { useState } from "react";
import { ArrowRight, Check, CircleDashed, Refrigerator } from "lucide-react";
import type { Kitchen, Profile } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";
export function MealCheckIn({
  state,
  mutate,
  busy,
}: {
  state: Kitchen;
  profiles: Profile[];
  actorId: string;
  kitchenId: string;
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState("");
  const [estimated, setEstimated] = useState(false);
  return (
    <section className="meal-simple-form">
      {!state.pantry.length && (
        <div className="meal-empty">
          <Refrigerator size={28} aria-hidden="true" />
          <p>{text("Empty stock", "Stock vide")}</p>
        </div>
      )}
      {state.pantry
        .slice()
        .sort(
          (a, b) =>
            Number(b.quantity === null || b.quantityEstimated) -
            Number(a.quantity === null || a.quantityEstimated),
        )
        .map((batch) => (
          <div key={batch.id}>
            <button
              className="meal-action-row"
              type="button"
              aria-expanded={selected === batch.id}
              onClick={() => {
                setSelected(selected === batch.id ? "" : batch.id);
                setQuantity(batch.quantity?.toString() ?? "");
                setEstimated(batch.quantityEstimated ?? false);
              }}
            >
              <Refrigerator size={22} aria-hidden="true" />
              <span>
                {batch.name}
                <small>
                  {batch.quantity ?? text("Unknown", "Inconnu")} {batch.unit}
                  {batch.quantityEstimated
                    ? " · " + text("Estimated", "Estimé")
                    : ""}
                </small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            {selected === batch.id && (
              <div className="meal-simple-form">
                <label>
                  {text("Quantity", "Quantité")} · {batch.unit}
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </label>
                <div className="meal-choice-chips">
                  <button
                    type="button"
                    aria-pressed={!estimated}
                    onClick={() => setEstimated(false)}
                  >
                    <Check size={18} aria-hidden="true" />
                    {text("Exact", "Exact")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={estimated}
                    onClick={() => setEstimated(true)}
                  >
                    <CircleDashed size={18} aria-hidden="true" />
                    {text("Estimate", "Estimation")}
                  </button>
                </div>
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    !quantity.trim() ||
                    !Number.isFinite(Number(quantity)) ||
                    Number(quantity) < 0
                  }
                  onClick={async () => {
                    if (
                      await mutate(
                        batch.quantity === null ? "pantry" : "stock",
                        batch.quantity === null
                          ? {
                              ...batch,
                              quantity: Number(quantity),
                              quantityEstimated: estimated,
                            }
                          : {
                              id: batch.id,
                              delta: Number(quantity) - batch.quantity,
                              reason: "correction",
                              quantityEstimated: estimated,
                            },
                        batch.quantity === null,
                      )
                    )
                      setSelected("");
                  }}
                >
                  <Check size={18} aria-hidden="true" />
                  {text("Save", "Enregistrer")}
                </button>
              </div>
            )}
          </div>
        ))}
    </section>
  );
}
