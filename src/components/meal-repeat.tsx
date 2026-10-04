"use client";
import { useState } from "react";
import { useTranslation } from "./language-provider";
import type { Plan } from "@/lib/meal-engine";
export function MealRepeat({
  plan,
  plans,
  mutate,
  busy,
}: {
  plan: Plan;
  plans: Plan[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [interval, setInterval] = useState(7),
    [count, setCount] = useState(4),
    [other, setOther] = useState("");
  return (
    <details>
      <summary>{t("Repeat schedule / swap")}</summary>
      <label>
        {t("Repeat every")}
        <select
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
        >
          <option value={1}>{t("Day")}</option>
          <option value={7}>{t("Week")}</option>
        </select>
      </label>
      <label>
        {t("Occurrences")}
        <input
          type="number"
          min="1"
          max="12"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>
      <button
        className="button secondary"
        disabled={busy || count < 1 || count > 12}
        onClick={() =>
          mutate("repeat-plan", { id: plan.id, intervalDays: interval, count })
        }
      >
        {t("Repeat schedule")}
      </button>
      <label>
        {t("Swap with")}
        <select value={other} onChange={(e) => setOther(e.target.value)}>
          <option value="">{t("Choose meal")}</option>
          {plans
            .filter((p) => p.id !== plan.id && !p.cookedId)
            .map((p) => (
              <option value={p.id} key={p.id}>
                {p.date} · {p.title}
              </option>
            ))}
        </select>
      </label>
      <button
        className="button secondary"
        disabled={busy || !other || !!plan.cookedId}
        onClick={() => mutate("swap-plan", { id: plan.id, otherId: other })}
      >
        {t("Swap meals")}
      </button>
    </details>
  );
}
