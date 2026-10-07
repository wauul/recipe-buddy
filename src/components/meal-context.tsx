"use client";
import { useState } from "react";
import {
  BriefcaseBusiness,
  Sofa,
  Dumbbell,
  Sparkles,
  Clock3,
  CookingPot,
  Microwave,
  Flame,
  Check,
} from "lucide-react";
import type { Kitchen } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";

export function MealContext({
  date,
  context,
  equipmentDefault = [],
  mutate,
  busy,
}: {
  date: string;
  context?: NonNullable<Kitchen["contexts"]>[number];
  equipmentDefault?: string[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [minutes, setMinutes] = useState<number | null>(
    context?.timeMinutes ?? null,
  );
  const [equipment, setEquipment] = useState(
    context?.equipment ?? equipmentDefault,
  );
  const [dayType, setDayType] = useState(context?.dayType ?? "work");
  const [saved, setSaved] = useState(false);
  return (
    <section className="meal-simple-form">
      <fieldset className="meal-visual-options">
        <legend>{text("Day", "Journée")}</legend>
        {[
          ["work", text("Work", "Travail"), BriefcaseBusiness],
          ["rest", text("Rest", "Repos"), Sofa],
          ["gym", text("Gym", "Sport"), Dumbbell],
          ["flexible", text("Flexible", "Souple"), Sparkles],
        ].map(([id, label, Glyph]) => {
          const Icon = Glyph as typeof Clock3;
          return (
            <button
              type="button"
              key={String(id)}
              aria-pressed={dayType === id}
              onClick={() => {
                setDayType(String(id));
                setSaved(false);
              }}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{String(label)}</span>
            </button>
          );
        })}
      </fieldset>
      <fieldset className="meal-choice-chips">
        <legend>
          <Clock3 size={18} aria-hidden="true" /> {text("Minutes", "Minutes")}
        </legend>
        {[15, 30, 45, 60].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={minutes === value}
            onClick={() => {
              setMinutes(minutes === value ? null : value);
              setSaved(false);
            }}
          >
            {value}
          </button>
        ))}
        {minutes !== null && ![15, 30, 45, 60].includes(minutes) && (
          <button
            type="button"
            aria-pressed="true"
            onClick={() => {
              setMinutes(null);
              setSaved(false);
            }}
          >
            {minutes}
          </button>
        )}
      </fieldset>
      <fieldset className="meal-visual-options">
        <legend>{text("Kitchen", "Cuisine")}</legend>
        {[
          ["stove", text("Stove", "Plaques"), CookingPot],
          ["oven", text("Oven", "Four"), Flame],
          ["microwave", text("Microwave", "Micro-ondes"), Microwave],
        ].map(([id, label, Glyph]) => {
          const Icon = Glyph as typeof Clock3;
          return (
            <button
              type="button"
              key={String(id)}
              aria-pressed={equipment.includes(String(id))}
              onClick={() => {
                setEquipment(
                  equipment.includes(String(id))
                    ? equipment.filter((e) => e !== id)
                    : [...equipment, String(id)],
                );
                setSaved(false);
              }}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{String(label)}</span>
            </button>
          );
        })}
        {equipment
          .filter((e) => !["stove", "oven", "microwave"].includes(e))
          .map((e) => (
            <button
              type="button"
              key={e}
              aria-pressed="true"
              onClick={() => {
                setEquipment(equipment.filter((old) => old !== e));
                setSaved(false);
              }}
            >
              <CookingPot size={24} aria-hidden="true" />
              <span>{e}</span>
            </button>
          ))}
      </fieldset>
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          if (
            await mutate("context", {
              date,
              timeMinutes: minutes,
              equipment,
              dayType,
              appetite: context?.appetite ?? "unknown",
              mealSize: context?.mealSize ?? "unknown",
            })
          )
            setSaved(true);
        }}
      >
        <Check size={18} aria-hidden="true" />
        {saved ? text("Saved", "Enregistré") : text("Save", "Enregistrer")}
      </button>
    </section>
  );
}
