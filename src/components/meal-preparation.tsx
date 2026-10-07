"use client";
import { useState } from "react";
import type { Kitchen, Preparation } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";
import {
  Scissors,
  CookingPot,
  Boxes,
  Clock3,
  LockKeyhole,
  Check,
} from "lucide-react";
export function MealPreparation({
  recipes,
  state,
  actorId,
  members,
  mutate,
  busy,
  selectedDate,
}: {
  recipes: { id: string; steps?: unknown }[];
  state: Kitchen;
  actorId: string;
  members: { userId: string; user: { username: string } }[];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
  selectedDate?: string;
}) {
  const { t, locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [taskId, setTaskId] = useState(() => crypto.randomUUID());
  const [editing, setEditing] = useState<Preparation | null>(null),
    [description, setDescription] = useState(""),
    [planId, setPlanId] = useState(""),
    [date, setDate] = useState(
      selectedDate ?? new Date().toLocaleDateString("en-CA"),
    ),
    [time, setTime] = useState(""),
    [active, setActive] = useState("0"),
    [passive, setPassive] = useState("0"),
    [assignee, setAssignee] = useState(actorId),
    [dependencies, setDependencies] = useState<string[]>([]),
    [override, setOverride] = useState(false);
  const tasks = state.preparation ?? [];
  const dependencyChoices = tasks.filter(
    (x) =>
      x.id !== editing?.id &&
      x.status !== "dismissed" &&
      ((x.date === date && x.status !== "completed") ||
        dependencies.includes(x.id)),
  );
  return (
    <section>
      <div className="meal-simple-form">
        <label>
          {text("Task", "Tâche")}
          <input
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="meal-choice-chips">
          {[
            [text("Chop vegetables", "Couper les légumes"), Scissors],
            [text("Mix ingredients", "Mélanger les ingrédients"), CookingPot],
            [text("Portion food", "Répartir les portions"), Boxes],
          ].map(([value, Glyph]) => {
            const Icon = Glyph as typeof Clock3;
            return (
              <button
                type="button"
                key={String(value)}
                aria-label={String(value)}
                aria-pressed={description === value}
                onClick={() => setDescription(String(value))}
              >
                <Icon size={20} aria-hidden="true" />
                {value === text("Chop vegetables", "Couper les légumes")
                  ? text("Chop", "Couper")
                  : value ===
                      text("Mix ingredients", "Mélanger les ingrédients")
                    ? text("Mix", "Mélanger")
                    : text("Portion", "Répartir")}
              </button>
            );
          })}
        </div>
        <div className="meal-tool-row">
          <label>
            {text("Day", "Jour")}
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (planId) setOverride(true);
              }}
            />
          </label>
          <label>
            {text("Time", "Heure")}
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        {!!state.plans.filter(
          (p) => !p.cookedId && (p.date === date || p.id === planId),
        ).length && (
          <fieldset className="meal-choice-chips">
            <legend>{text("Meal", "Repas")}</legend>
            {state.plans
              .filter(
                (p) => !p.cookedId && (p.date === date || p.id === planId),
              )
              .map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={planId === p.id}
                  onClick={() => {
                    setPlanId(planId === p.id ? "" : p.id);
                    if (planId !== p.id) {
                      setDate(p.date);
                      setOverride(false);
                    }
                  }}
                >
                  {p.title}
                </button>
              ))}
          </fieldset>
        )}
        {planId && (
          <div className="meal-choice-chips">
            {(Array.isArray(
              recipes.find(
                (r) =>
                  r.id === state.plans.find((p) => p.id === planId)?.recipeId,
              )?.steps,
            )
              ? (recipes.find(
                  (r) =>
                    r.id === state.plans.find((p) => p.id === planId)?.recipeId,
                )!.steps as string[])
              : []
            )
              .filter((step) => typeof step === "string")
              .map((step, i) => (
                <button
                  type="button"
                  key={i}
                  aria-label={step}
                  aria-pressed={description === step}
                  onClick={() => setDescription(step)}
                >
                  {i + 1}
                </button>
              ))}
          </div>
        )}
        <PreparationMinutes
          label={text("Active", "Actif")}
          value={active}
          change={setActive}
          maximum={1440}
        />
        <PreparationMinutes
          label={text("Waiting", "Attente")}
          value={passive}
          change={setPassive}
          maximum={10080}
        />
        {members.length > 1 && (
          <fieldset className="meal-choice-chips">
            <legend>{text("Who", "Qui")}</legend>
            {members.map((m) => (
              <button
                type="button"
                key={m.userId}
                aria-pressed={assignee === m.userId}
                onClick={() => setAssignee(m.userId)}
              >
                {m.user.username}
              </button>
            ))}
          </fieldset>
        )}
        {!!dependencyChoices.length && (
          <fieldset className="meal-choice-chips">
            <legend>{text("After", "Après")}</legend>
            {dependencyChoices.map((x) => (
              <button
                type="button"
                key={x.id}
                aria-pressed={dependencies.includes(x.id)}
                onClick={() =>
                  setDependencies(
                    dependencies.includes(x.id)
                      ? dependencies.filter((id) => id !== x.id)
                      : [...dependencies, x.id],
                  )
                }
              >
                {x.description}
              </button>
            ))}
          </fieldset>
        )}
        {planId && (
          <button
            type="button"
            className="text-button"
            aria-pressed={override}
            onClick={() => setOverride(!override)}
          >
            <LockKeyhole size={18} aria-hidden="true" />
            {text("Fixed day", "Jour fixe")}
            {override && <Check size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      <button
        className="button primary"
        disabled={busy || !description.trim()}
        onClick={async () => {
          if (
            await mutate("preparation", {
              id: editing?.id ?? taskId,
              description,
              planId: planId || undefined,
              date,
              time: time || null,
              timezone: state.timezone,
              activeMinutes: active ? Number(active) : null,
              passiveMinutes: passive ? Number(passive) : null,
              assignee,
              dependencies,
              override,
              reminder: editing?.reminder ?? false,
            })
          ) {
            setDescription("");
            setEditing(null);
            setTaskId(crypto.randomUUID());
            setPlanId("");
            setTime("");
            setActive("0");
            setPassive("0");
            setDependencies([]);
            setAssignee(actorId);
            setOverride(false);
          }
        }}
      >
        <Check size={18} aria-hidden="true" />
        {text("Save", "Enregistrer")}
      </button>
      {tasks
        .filter((task) => task.date === date || task.id === editing?.id)
        .slice()
        .sort((a, b) =>
          (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")),
        )
        .map((task) => (
          <article className="meal-card" key={task.id}>
            <strong>{task.description}</strong>
            <p>
              {task.date} {task.time} · {t(task.status)}
            </p>
            {task.reviewNeeded && (
              <p role="status">
                {t("Meal changed. Review this preparation task.")}
              </p>
            )}
            {task.status !== "completed" && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setEditing(task);
                  setDescription(task.description);
                  setPlanId(task.planId ?? "");
                  setDate(task.date);
                  setTime(task.time ?? "");
                  setActive(String(task.activeMinutes ?? 0));
                  setPassive(String(task.passiveMinutes ?? 0));
                  setAssignee(task.assignee);
                  setDependencies(task.dependencies);
                  setOverride(task.override);
                }}
              >
                {text("Edit", "Modifier")}
              </button>
            )}
            {task.status === "planned" && (
              <PreparationComplete task={task} mutate={mutate} busy={busy} />
            )}
            {task.status !== "planned" && (
              <button
                className="button secondary"
                disabled={busy || !!task.cookedId}
                onClick={() => mutate("undo-preparation", { id: task.id })}
              >
                {text("Undo", "Annuler")}
              </button>
            )}
            {task.status === "planned" && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => mutate("dismiss-preparation", { id: task.id })}
              >
                {t("Dismiss")}
              </button>
            )}
            {task.time && task.status === "planned" && (
              <button
                className="button secondary"
                onClick={() => {
                  const contents = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Recipe Buddy//Preparation//EN\r\nBEGIN:VEVENT\r\nUID:${task.id}@recipebuddy\r\nDTSTAMP:${new Date()
                    .toISOString()
                    .replace(/[-:]/g, "")
                    .replace(
                      /\.\d+Z/,
                      "Z",
                    )}\r\nDTSTART;TZID=${task.timezone}:${task.date.replace(/-/g, "")}T${task.time!.replace(":", "")}00\r\nSUMMARY:Recipe Buddy preparation\r\nBEGIN:VALARM\r\nTRIGGER:-PT10M\r\nACTION:DISPLAY\r\nDESCRIPTION:Recipe Buddy preparation\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
                  const url = URL.createObjectURL(
                    new Blob([contents], { type: "text/calendar" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "recipe-buddy-preparation.ics";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Clock3 size={18} aria-hidden="true" />
                {text("Reminder", "Rappel")}
              </button>
            )}
          </article>
        ))}
    </section>
  );
}
function PreparationComplete({
  task,
  mutate,
  busy,
}: {
  task: Preparation;
  mutate: (a: string, d: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { t, locale } = useTranslation();
  const [ingredients, setIngredients] = useState<
    { name: string; quantity: string; unit: string }[]
  >([]);
  return (
    <div className="meal-simple-form">
      {ingredients.map((row, i) => (
        <div className="meal-fields" key={i}>
          {(["name", "quantity", "unit"] as const).map((key) => (
            <label key={key}>
              {t(
                key === "name"
                  ? "Ingredient"
                  : key === "quantity"
                    ? "Actual quantity"
                    : "Unit",
              )}
              <input
                value={row[key]}
                onChange={(e) =>
                  setIngredients(
                    ingredients.map((old, j) =>
                      i === j ? { ...old, [key]: e.target.value } : old,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            className="button secondary"
            onClick={() =>
              setIngredients(ingredients.filter((_, j) => j !== i))
            }
          >
            {t("Remove")}
          </button>
        </div>
      ))}
      <button
        className="button secondary"
        onClick={() =>
          setIngredients([
            ...ingredients,
            { name: "", quantity: "", unit: "g" },
          ])
        }
      >
        {locale === "fr" ? "Stock utilisé" : "Stock used"}
      </button>
      <button
        className="button secondary"
        disabled={
          busy || ingredients.some((i) => !!i.name.trim() && !i.quantity.trim())
        }
        onClick={() =>
          mutate("complete-preparation", {
            id: task.id,
            ingredients: ingredients.filter((i) => !!i.name.trim()),
          })
        }
      >
        <Check size={18} aria-hidden="true" />
        {locale === "fr" ? "Terminé" : "Done"}
      </button>
    </div>
  );
}

function PreparationMinutes({
  label,
  value,
  change,
  maximum,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  maximum: number;
}) {
  const { locale } = useTranslation();
  const minutes = value ? Number(value) : 0;
  return (
    <div className="meal-stepper">
      <span>{label}</span>
      <div>
        <button
          type="button"
          aria-label={`${locale === "fr" ? "Moins" : "Less"} · ${label}`}
          disabled={minutes <= 0}
          onClick={() => change(String(Math.max(0, minutes - 5)))}
        >
          −
        </button>
        <output>{`${minutes} min`}</output>
        <button
          type="button"
          aria-label={`${locale === "fr" ? "Plus" : "More"} · ${label}`}
          disabled={(minutes ?? 0) >= maximum}
          onClick={() => change(String(Math.min(maximum, (minutes ?? 0) + 5)))}
        >
          +
        </button>
      </div>
    </div>
  );
}
