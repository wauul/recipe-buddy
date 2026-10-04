"use client";
import { useState } from "react";
import { useTranslation } from "./language-provider";
export function MealContext({
  date,
  mutate,
  busy,
}: {
  date: string;
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const [time, setTime] = useState(""),
    [equipment, setEquipment] = useState(""),
    [dayType, setDayType] = useState("work"),
    [appetite, setAppetite] = useState("unknown"),
    [mealSize, setMealSize] = useState("unknown");
  return (
    <details>
      <summary>{t("Today’s practical context")}</summary>
      <p>
        {t(
          "Context expires after its local day. Flexible and gym days keep every restriction check.",
        )}
      </p>
      <div className="meal-fields">
        <label>
          {t("Time available · minutes")}
          <input
            type="number"
            min="5"
            max="1440"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label>
          {t("Available equipment · comma separated")}
          <input
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          />
        </label>
        {[
          [
            "Day type",
            dayType,
            setDayType,
            ["work", "rest", "gym", "flexible"],
          ],
          [
            "Appetite",
            appetite,
            setAppetite,
            ["unknown", "small", "usual", "large"],
          ],
          [
            "Meal size",
            mealSize,
            setMealSize,
            ["unknown", "light", "usual", "substantial"],
          ],
        ].map(([name, value, set, values]) => (
          <label key={String(name)}>
            {t(String(name))}
            <select
              value={String(value)}
              onChange={(e) => (set as (s: string) => void)(e.target.value)}
            >
              {(values as string[]).map((v) => (
                <option key={v} value={v}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        className="button secondary"
        disabled={busy || (time !== "" && Number(time) < 5)}
        onClick={() =>
          mutate("context", {
            date,
            timeMinutes: time ? Number(time) : null,
            equipment: equipment
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            dayType,
            appetite,
            mealSize,
          })
        }
      >
        {t("Save daily context")}
      </button>
    </details>
  );
}
