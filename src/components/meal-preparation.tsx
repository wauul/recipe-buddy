"use client";
import { useEffect, useRef, useState } from "react";
import { measure, type Kitchen, type Preparation } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";
import {
  Scissors,
  CookingPot,
  Boxes,
  Clock3,
  LockKeyhole,
  Check,
  Pencil,
  X,
  Undo2,
  Package,
  Plus,
  ChevronLeft,
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
  const form = useRef<HTMLDivElement>(null);
  const draft = {
    description,
    planId,
    date,
    time,
    active,
    passive,
    assignee,
    dependencies,
    override,
  };
  const previousDraft = useRef<typeof draft | null>(null);
  useEffect(() => {
    if (editing) {
      form.current?.scrollIntoView({ block: "start", behavior: "instant" });
      form.current
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    }
  }, [editing]);
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
      <div className="meal-simple-form" ref={form}>
        {editing && (
          <div className="meal-prep-edit-heading">
            <button
              type="button"
              className="meal-action-row"
              disabled={busy}
              onClick={() => {
                const old = previousDraft.current;
                if (old) {
                  setDescription(old.description);
                  setPlanId(old.planId);
                  setDate(old.date);
                  setTime(old.time);
                  setActive(old.active);
                  setPassive(old.passive);
                  setAssignee(old.assignee);
                  setDependencies(old.dependencies);
                  setOverride(old.override);
                }
                setEditing(null);
                previousDraft.current = null;
              }}
            >
              <ChevronLeft size={20} aria-hidden="true" />
              {text("Cancel", "Annuler")}
            </button>
            <strong>{text("Edit task", "Modifier la tâche")}</strong>
          </div>
        )}
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
        .filter(() => !editing)
        .filter((task) => task.date === date || task.id === editing?.id)
        .slice()
        .sort((a, b) =>
          (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")),
        )
        .map((task) => (
          <article className="meal-card" key={task.id}>
            <strong>{task.description}</strong>
            <p className="meal-prep-status">
              {task.status === "completed" ? (
                <Check size={16} aria-hidden="true" />
              ) : task.status === "dismissed" ? (
                <X size={16} aria-hidden="true" />
              ) : (
                <Clock3 size={16} aria-hidden="true" />
              )}
              {task.time || ""} {t(task.status)}
            </p>
            {task.reviewNeeded && (
              <p role="status">
                {t("Meal changed. Review this preparation task.")}
              </p>
            )}
            <div className="meal-prep-actions">
              {task.status === "planned" && (
                <button
                  className="meal-prep-action"
                  disabled={busy}
                  onClick={() => {
                    previousDraft.current = draft;
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
                  <Pencil size={20} aria-hidden="true" />
                  {text("Edit", "Modifier")}
                </button>
              )}
              {task.status === "planned" && (
                <PreparationComplete
                  task={task}
                  pantry={state.pantry}
                  mutate={mutate}
                  busy={busy}
                />
              )}
              {task.status !== "planned" && (
                <button
                  className="meal-prep-action"
                  disabled={busy || !!task.cookedId}
                  onClick={() => mutate("undo-preparation", { id: task.id })}
                >
                  <Undo2 size={20} aria-hidden="true" />
                  {text("Undo", "Annuler")}
                </button>
              )}
              {task.status === "planned" && (
                <button
                  className="meal-prep-action"
                  disabled={busy}
                  onClick={() => mutate("dismiss-preparation", { id: task.id })}
                >
                  <X size={20} aria-hidden="true" />
                  {t("Dismiss")}
                </button>
              )}
            </div>
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
  pantry,
  mutate,
  busy,
}: {
  task: Preparation;
  pantry: Kitchen["pantry"];
  mutate: (a: string, d: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [open, setOpen] = useState(false);
  const [ingredients, setIngredients] = useState<
    {
      id: string;
      name: string;
      quantity: string;
      unit: string;
      custom?: boolean;
      unitEditable?: boolean;
    }[]
  >([]);
  const stockPanel = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);
  useEffect(() => {
    if (open) {
      stockPanel.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
      if (ingredients.length > previousCount.current) {
        const rows = stockPanel.current?.querySelectorAll(
          ".meal-prep-quantity",
        );
        rows?.[rows.length - 1]
          ?.querySelector<HTMLInputElement>("input")
          ?.focus();
      }
    }
    previousCount.current = ingredients.length;
  }, [open, ingredients.length]);
  const eligible = pantry.filter((batch) => batch.quantity !== 0);
  const choices = eligible.filter(
    (batch, index, all) =>
      all.findIndex((b) => b.name === batch.name && b.unit === batch.unit) ===
      index,
  );
  const valid =
    ingredients.length > 0 &&
    ingredients.every(
      (row) => row.name.trim() && measure(row.quantity, row.unit),
    );
  const complete = async () => {
    if (
      await mutate("complete-preparation", {
        id: task.id,
        ingredients: open
          ? ingredients.map(({ name, quantity, unit }) => ({
              name,
              quantity,
              unit,
            }))
          : [],
      })
    ) {
      setOpen(false);
      setIngredients([]);
    }
  };
  const change = (
    id: string,
    key: "name" | "quantity" | "unit",
    value: string,
  ) =>
    setIngredients((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  return (
    <>
      <button
        type="button"
        className="meal-prep-action"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen(true)}
      >
        <Package size={20} aria-hidden="true" />
        {text("Stock used", "Stock utilisé")}
      </button>
      {!open && (
        <button
          type="button"
          className="meal-prep-action meal-prep-done"
          disabled={busy || (open && !valid)}
          onClick={complete}
        >
          <Check size={20} aria-hidden="true" />
          {text("Done", "Terminé")}
        </button>
      )}
      {open && (
        <div className="meal-prep-stock" ref={stockPanel}>
          <div className="meal-prep-stock-heading">
            <strong>{text("Stock used", "Stock utilisé")}</strong>
            <button
              type="button"
              className="meal-icon-button"
              disabled={busy}
              aria-label={text(
                "Cancel stock changes",
                "Annuler le stock utilisé",
              )}
              onClick={() => {
                setIngredients([]);
                setOpen(false);
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div
            className="meal-choice-chips"
            role="group"
            aria-label={text("Ingredients", "Ingrédients")}
          >
            {choices.map((batch) => (
              <button
                key={batch.id}
                type="button"
                disabled={busy}
                aria-pressed={ingredients.some((row) => row.id === batch.id)}
                onClick={() =>
                  setIngredients((rows) =>
                    rows.some((row) => row.id === batch.id)
                      ? rows.filter((row) => row.id !== batch.id)
                      : [
                          ...rows,
                          {
                            id: batch.id,
                            name: batch.name,
                            quantity: "",
                            unit: batch.unit,
                            unitEditable: !measure(1, batch.unit),
                          },
                        ],
                  )
                }
              >
                <Package size={16} aria-hidden="true" />
                {batch.name}
              </button>
            ))}
          </div>
          {ingredients.map((row) => (
            <div className="meal-prep-quantity" key={row.id}>
              {row.custom ? (
                <label>
                  {text("Ingredient", "Ingrédient")}
                  <input
                    value={row.name}
                    disabled={busy}
                    maxLength={120}
                    onChange={(e) => change(row.id, "name", e.target.value)}
                  />
                </label>
              ) : (
                <strong>{row.name}</strong>
              )}
              <label className="meal-prep-amount">
                <span className="sr-only">
                  {text("Quantity used", "Quantité utilisée")} · {row.name}
                </span>
                <input
                  inputMode="decimal"
                  aria-invalid={
                    !!row.quantity && !measure(row.quantity, row.unit)
                  }
                  placeholder="0"
                  value={row.quantity}
                  maxLength={40}
                  disabled={busy}
                  onChange={(e) => change(row.id, "quantity", e.target.value)}
                />
                {row.custom || row.unitEditable ? (
                  <input
                    value={row.unit}
                    maxLength={40}
                    disabled={busy}
                    aria-label={text("Unit", "Unité")}
                    onChange={(e) => change(row.id, "unit", e.target.value)}
                  />
                ) : (
                  <span>{row.unit}</span>
                )}
              </label>
              <button
                type="button"
                className="meal-icon-button"
                disabled={busy}
                aria-label={text("Remove", "Retirer") + " · " + row.name}
                onClick={() =>
                  setIngredients((rows) =>
                    rows.filter((old) => old.id !== row.id),
                  )
                }
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="meal-action-row"
            disabled={busy || ingredients.length >= 100}
            onClick={() =>
              setIngredients((rows) => [
                ...rows,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  quantity: "",
                  unit: "g",
                  custom: true,
                },
              ])
            }
          >
            <Plus size={18} aria-hidden="true" />
            {text("Other ingredient", "Autre ingrédient")}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy || !valid}
            onClick={complete}
          >
            <Check size={18} aria-hidden="true" />
            {text("Done", "Terminé")}
          </button>
        </div>
      )}
    </>
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
