"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Plan } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";
export function MealWeekPreview({
  plans,
  setPlans,
  mutate,
  busy,
}: {
  plans: Plan[];
  setPlans: (plans: Plan[]) => void;
  mutate: (a: string, d: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { t, locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [selected, setSelected] = useState("");
  const update = (id: string, patch: Partial<Plan>) =>
    setPlans(plans.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <section>
      {plans.map((plan) => (
        <div key={plan.id}>
          <button
            className="meal-action-row"
            onClick={() => setSelected(selected === plan.id ? "" : plan.id)}
          >
            <span>
              <small>
                {plan.date} · {t(plan.slot)}
              </small>
              {plan.title}
            </span>
            <ArrowRight size={18} />
          </button>
          <div className="meal-tool-row">
            {" "}
            <button
              className="button primary"
              disabled={busy || !(plan.servings > 0)}
              onClick={async () => {
                if (await mutate("plan", { ...plan, suggested: true })) {
                  setPlans(plans.filter((p) => p.id !== plan.id));
                  setSelected("");
                }
              }}
            >
              {text("Add", "Ajouter")}
            </button>
            <button
              className="text-button"
              onClick={() => {
                setPlans(plans.filter((p) => p.id !== plan.id));
                setSelected("");
              }}
            >
              {text("Skip", "Ignorer")}
            </button>
          </div>
          {selected === plan.id && (
            <div className="meal-simple-form">
              <label>
                {text("Day", "Jour")}
                <input
                  type="date"
                  value={plan.date}
                  onChange={(e) => update(plan.id, { date: e.target.value })}
                />
              </label>
              <fieldset className="meal-choice-chips">
                <legend>{text("Meal", "Repas")}</legend>
                {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                  (slot) => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={plan.slot === slot}
                      onClick={() => update(plan.id, { slot })}
                    >
                      {t(slot)}
                    </button>
                  ),
                )}
              </fieldset>
              <div className="meal-stepper">
                <span>{text("Servings", "Portions")}</span>
                <div>
                  <button
                    aria-label={text("Fewer servings", "Moins de portions")}
                    disabled={plan.servings <= 0.5}
                    onClick={() =>
                      update(plan.id, {
                        servings: Math.max(0.5, plan.servings - 0.5),
                      })
                    }
                  >
                    −
                  </button>
                  <output>{plan.servings}</output>
                  <button
                    aria-label={text("More servings", "Plus de portions")}
                    disabled={plan.servings >= 100}
                    onClick={() =>
                      update(plan.id, {
                        servings: Math.min(100, plan.servings + 0.5),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {!busy && !plans.length && (
        <p>
          {text("No suggestions to review.", "Aucune proposition à vérifier.")}
        </p>
      )}
      <button className="text-button" onClick={() => setPlans([])}>
        {text("Clear", "Effacer")}
      </button>
    </section>
  );
}
