"use client";
import { useState } from "react";
import { ArrowRight, CalendarDays, Check, Minus, Plus } from "lucide-react";
import { useTranslation } from "./language-provider";
import type { Leftover } from "@/lib/meal-engine";
export function MealLeftovers({
  leftovers,
  profiles,
  mutate,
  busy,
  selectedDate,
}: {
  leftovers: Leftover[];
  profiles: { id: string; name: string }[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
  selectedDate?: string;
}) {
  const { locale, t } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [selected, setSelected] = useState(""),
    [amount, setAmount] = useState(1),
    [person, setPerson] = useState(profiles.length === 1 ? profiles[0].id : ""),
    [mode, setMode] = useState("plan"),
    [slot, setSlot] = useState("lunch");
  const [recordId, setRecordId] = useState(() => crypto.randomUUID());
  const date =
    selectedDate ?? new Intl.DateTimeFormat("en-CA").format(new Date());
  if (!leftovers.length)
    return <p>{text("No leftovers saved yet.", "Aucun reste enregistré.")}</p>;
  return (
    <section>
      <p className="small-note">{date}</p>
      {leftovers.map((l) => (
        <div key={l.id}>
          <button
            className="meal-action-row"
            onClick={() => {
              setSelected(selected === l.id ? "" : l.id);
              setAmount(Math.min(1, l.remaining));
            }}
          >
            <span>
              {l.title}
              <small>
                {l.remaining} {text("servings left", "portions restantes")} ·{" "}
                {t(l.storage)}
              </small>
            </span>
            <ArrowRight size={18} />
          </button>
          {selected === l.id && (
            <div className="meal-simple-form">
              <fieldset className="meal-choice-chips">
                <legend>{text("Use leftovers", "Utiliser les restes")}</legend>
                <button
                  type="button"
                  aria-pressed={mode === "plan"}
                  onClick={() => setMode("plan")}
                >
                  <CalendarDays size={18} />
                  {text("Plan", "Prévoir")}
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "eat"}
                  onClick={() => setMode("eat")}
                >
                  <Check size={18} />
                  {text("Eaten", "Mangé")}
                </button>
              </fieldset>
              <fieldset className="meal-choice-chips">
                <legend>{text("Meal", "Repas")}</legend>
                {["breakfast", "lunch", "dinner", "snack"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                  >
                    {t(s)}
                  </button>
                ))}
              </fieldset>
              <fieldset className="meal-choice-chips">
                <legend>{text("For whom?", "Pour qui ?")}</legend>
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={person === p.id}
                    onClick={() => setPerson(person === p.id ? "" : p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </fieldset>
              <div className="meal-stepper">
                <span>{text("Servings", "Portions")}</span>
                <div>
                  <button
                    type="button"
                    aria-label={text("Fewer servings", "Moins de portions")}
                    disabled={amount <= Math.min(0.5, l.remaining)}
                    onClick={() =>
                      setAmount(
                        Math.max(Math.min(0.5, l.remaining), amount - 0.5),
                      )
                    }
                  >
                    <Minus size={18} />
                  </button>
                  <output>{amount}</output>
                  <button
                    type="button"
                    aria-label={text("More servings", "Plus de portions")}
                    disabled={amount >= l.remaining}
                    onClick={() =>
                      setAmount(Math.min(l.remaining, amount + 0.5))
                    }
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <p className="small-note">
                {text(
                  "Check the batch. Dates cannot certify safety.",
                  "Vérifiez le lot. Les dates ne garantissent pas la sécurité.",
                )}
              </p>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !(amount > 0) ||
                  amount > l.remaining ||
                  (mode === "eat" && !person)
                }
                onClick={async () => {
                  if (
                    await mutate(
                      mode === "eat" ? "eat" : "plan",
                      {
                        id: recordId,
                        leftoverId: l.id,
                        title: l.title,
                        date,
                        slot,
                        ...(mode === "eat"
                          ? { personId: person, amount }
                          : {
                              servings: amount,
                              diners: person ? [person] : [],
                              locked: false,
                            }),
                      },
                      mode !== "eat",
                    )
                  ) {
                    setSelected("");
                    setRecordId(crypto.randomUUID());
                  }
                }}
              >
                {mode === "eat"
                  ? text("Save", "Enregistrer")
                  : text("Add", "Ajouter")}
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void mutate("remove-leftover", { id: l.id }, false)
                }
              >
                {text("Remove batch", "Retirer le lot")}
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
