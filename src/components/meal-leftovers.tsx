"use client";
import { useState } from "react";
import { useTranslation } from "./language-provider";
import type { Leftover } from "@/lib/meal-engine";
export function MealLeftovers({
  leftovers,
  profiles,
  mutate,
  busy,
}: {
  leftovers: Leftover[];
  profiles: { id: string; name: string }[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(() =>
      new Intl.DateTimeFormat("en-CA").format(new Date()),
    ),
    [person, setPerson] = useState(""),
    [amount, setAmount] = useState("1"),
    [slot, setSlot] = useState("lunch");
  if (!leftovers.length) return null;
  return (
    <details>
      <summary>{t("Leftovers")}</summary>
      <div className="meal-fields">
        <label>
          {t("Date")}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          {t("Person")}
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">{t("Choose diner")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Servings")}
          <input
            type="number"
            min="0.1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          {t("Meal slot")}
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {["breakfast", "lunch", "dinner", "snack"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {leftovers.map((l) => (
        <article className="meal-row" key={l.id}>
          <h3>{l.title}</h3>
          <p>
            {l.remaining} {t("Servings remaining")} · {t(l.storage)} ·{" "}
            {l.date ?? t("Unknown date")}
          </p>
          <button
            className="button secondary"
            disabled={busy || Number(amount) <= 0}
            onClick={() =>
              mutate("plan", {
                id: crypto.randomUUID(),
                leftoverId: l.id,
                title: l.title,
                date,
                slot,
                servings: Number(amount),
                diners: person ? [person] : [],
                locked: false,
              })
            }
          >
            {t("Plan leftovers")}
          </button>
          <button
            className="button secondary"
            disabled={busy || !person || Number(amount) <= 0}
            onClick={() =>
              mutate(
                "eat",
                {
                  id: crypto.randomUUID(),
                  leftoverId: l.id,
                  personId: person,
                  title: l.title,
                  date,
                  slot,
                  amount: Number(amount),
                },
                false,
              )
            }
          >
            {t("Record eating leftovers")}
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => mutate("remove-leftover", { id: l.id }, false)}
          >
            {t("Remove leftover batch")}
          </button>
        </article>
      ))}
    </details>
  );
}
