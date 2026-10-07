"use client";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Plan } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";

export function MealEaten({
  date,
  plans,
  profiles,
  mutate,
  busy,
  onSaved,
}: {
  date: string;
  plans: Plan[];
  profiles: { id: string; name: string }[];
  mutate: (
    action: string,
    data: unknown,
    version?: boolean,
  ) => Promise<boolean>;
  busy: boolean;
  onSaved?: () => void;
}) {
  const { locale, t } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [id] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState(
    profiles.length === 1 ? profiles[0].id : "",
  );
  const [slot, setSlot] = useState<Plan["slot"]>("dinner");
  const [amount, setAmount] = useState<number | null>(null);
  const [planId, setPlanId] = useState("");
  const [saved, setSaved] = useState(false);
  const plan = plans.find((p) => p.id === planId);
  return (
    <form
      className="meal-simple-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await mutate(
            "eat",
            {
              id,
              personId: person,
              date,
              slot,
              title: title.trim(),
              amount,
              ...(plan
                ? {
                    planId: plan.id,
                    ...(plan.cookedId ? { occasionId: plan.cookedId } : {}),
                  }
                : {}),
            },
            false,
          )
        ) {
          setSaved(true);
          onSaved?.();
        }
      }}
    >
      {!!plans.length && (
        <div className="meal-choice-chips">
          {plans
            .filter((p) => p.date === date)
            .map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={planId === p.id}
                onClick={() => {
                  setPlanId(p.id);
                  setTitle(p.title);
                  setSlot(p.slot);
                  setSaved(false);
                }}
              >
                {p.title}
              </button>
            ))}
        </div>
      )}
      <label>
        {text("Food", "Aliment")}
        <input
          value={title}
          maxLength={1000}
          onChange={(e) => {
            setTitle(e.target.value);
            setPlanId("");
            setSaved(false);
          }}
        />
      </label>
      <fieldset className="meal-choice-chips">
        <legend>{text("Person", "Personne")}</legend>
        {profiles.map((p) => (
          <button
            type="button"
            key={p.id}
            aria-pressed={person === p.id}
            onClick={() => {
              setPerson(p.id);
              setSaved(false);
            }}
          >
            {p.name}
          </button>
        ))}
      </fieldset>
      <fieldset className="meal-choice-chips">
        <legend>{text("Meal", "Repas")}</legend>
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((s) => (
          <button
            type="button"
            key={s}
            aria-pressed={slot === s}
            onClick={() => {
              setSlot(s);
              setSaved(false);
            }}
          >
            {t(s)}
          </button>
        ))}
      </fieldset>
      <div className="meal-stepper">
        <span>{text("Servings", "Portions")}</span>
        <div>
          <button
            type="button"
            aria-label={text("Fewer servings", "Moins de portions")}
            disabled={amount === null}
            onClick={() => {
              setAmount(amount === null || amount <= 0.5 ? null : amount - 0.5);
              setSaved(false);
            }}
          >
            <Minus size={18} />
          </button>
          <output>{amount ?? text("Unknown", "Inconnu")}</output>
          <button
            type="button"
            aria-label={text("More servings", "Plus de portions")}
            disabled={amount !== null && amount >= 100}
            onClick={() => {
              setAmount(amount === null ? 0.5 : Math.min(100, amount + 0.5));
              setSaved(false);
            }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      {!profiles.length && (
        <p>
          {text(
            "Add a person in Household.",
            "Ajoutez une personne dans Foyer.",
          )}
        </p>
      )}
      <button
        className="button primary"
        disabled={busy || saved || !person || !title.trim()}
      >
        <Check size={18} />
        {saved ? text("Saved", "Enregistré") : text("Save", "Enregistrer")}
      </button>
    </form>
  );
}
