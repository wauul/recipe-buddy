"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  BookOpen,
  Utensils,
  ChefHat,
  MoreHorizontal,
  Check,
  CalendarDays,
  Repeat,
  Trash2,
  SlidersHorizontal,
  HeartPulse,
  Sun,
  Clock,
  Package,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react";
import { useTranslation } from "./language-provider";
import { MealTaskSheet } from "./meal-task-sheet";
import type { readMeals } from "@/lib/meal-service";
import type { Plan } from "@/lib/meal-engine";
import { MealRepeat } from "./meal-repeat";
export type AgendaRecipe = {
  id: string;
  title: string;
  servings: number;
  imageUrl?: string;
};
type Snapshot = Awaited<ReturnType<typeof readMeals>>;
export { agendaWeekStart } from "@/lib/meal-calendar";
import { agendaDateAfter, agendaWeekStart } from "@/lib/meal-calendar";
export function MealAgenda({
  snapshot,
  recipes,
  day,
  onDay,
  from,
  onWeek,
  busy,
  mutate,
  tools,
  suggest,
  onJournal,
}: {
  snapshot: Snapshot;
  recipes: AgendaRecipe[];
  day: string;
  onDay: (day: string) => void;
  from: string;
  onWeek: (from: string) => void;
  busy: boolean;
  mutate: (
    action: string,
    data: unknown,
    version?: boolean,
  ) => Promise<boolean>;
  tools: Record<string, ReactNode>;
  suggest: (weekly?: boolean) => Promise<void>;
  onJournal: () => void;
}) {
  const { locale, t } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [sheet, setSheet] = useState(""),
    [selected, setSelected] = useState<Plan | null>(null);
  const fmt = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
      new Date(value + "T12:00Z"),
    );
  const plans = snapshot.state.plans
    .filter((p) => p.date === day)
    .sort(
      (a, b) =>
        ["breakfast", "lunch", "dinner", "snack"].indexOf(a.slot) -
        ["breakfast", "lunch", "dinner", "snack"].indexOf(b.slot),
    );
  const meal = selected
    ? (snapshot.state.plans.find((p) => p.id === selected.id) ?? selected)
    : null;
  const editorDraftKey = `recipe-buddy:meal-plan:v2:${snapshot.actorId}:${snapshot.kitchenId}:${meal?.id ?? day}:${sheet}`;
  const title =
    sheet === "add"
      ? text("Add a meal", "Ajouter un repas")
      : sheet === "recipe"
        ? text("Add a meal", "Ajouter un repas")
        : sheet === "external"
          ? text("Another meal", "Autre repas")
          : sheet === "edit"
            ? text("Edit meal", "Modifier le repas")
            : sheet === "meal"
              ? (meal?.title ?? "")
              : sheet === "day"
                ? text("Day options", "Options du jour")
                : sheet === "remove"
                  ? text("Remove meal?", "Retirer le repas ?")
                  : ({
                      cook: text("Confirm cooking", "Confirmer la cuisson"),
                      ideas: text("Ideas", "Idées"),
                      week: text("Week", "Semaine"),
                      context: text("My day", "Ma journée"),
                      prepare: text("Prepare", "Préparer"),
                      leftovers: text("Leftovers", "Restes"),
                      nutrition: text(
                        "Daily nutrition",
                        "Nutrition quotidienne",
                      ),
                      rescue: text("Replan", "Réorganiser"),
                      checkin: text("Kitchen check-in", "Point cuisine"),
                      eaten: text("Eaten", "Mangé"),
                    }[sheet] ?? "");
  const action = (label: string, icon: ReactNode, onClick: () => void) => (
    <button className="meal-action-row" type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
      <ArrowRight size={18} />
    </button>
  );
  return (
    <section
      className="meal-agenda"
      aria-label={text("Meal agenda", "Agenda repas")}
    >
      <div className="meal-calendar-heading">
        <h2>{fmt(day, { month: "long", year: "numeric" })}</h2>
        <div>
          <button
            className="text-button"
            onClick={() => {
              const now = new Intl.DateTimeFormat("en-CA").format(new Date());
              onDay(now);
              onWeek(agendaWeekStart(now));
            }}
          >
            {text("Today", "Aujourd’hui")}
          </button>
          <button
            className="meal-icon-button"
            aria-label={text("Previous week", "Semaine précédente")}
            onClick={() => {
              onWeek(agendaDateAfter(from, -7));
              onDay(agendaDateAfter(day, -7));
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            className="meal-icon-button"
            aria-label={text("Next week", "Semaine suivante")}
            onClick={() => {
              onWeek(agendaDateAfter(from, 7));
              onDay(agendaDateAfter(day, 7));
            }}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div className="meal-week-strip">
        {Array.from({ length: 7 }, (_, n) => agendaDateAfter(from, n)).map(
          (date) => {
            const count = snapshot.state.plans.filter(
              (p) => p.date === date,
            ).length;
            return (
              <button
                key={date}
                type="button"
                aria-pressed={date === day}
                aria-label={`${fmt(date, { weekday: "long", month: "long", day: "numeric" })}, ${count} ${text("meals", "repas")}`}
                onClick={() => onDay(date)}
              >
                <span>{fmt(date, { weekday: "short" }).replace(".", "")}</span>
                <strong>{fmt(date, { day: "numeric" })}</strong>
                <i className={count ? "has-meals" : ""} aria-hidden="true" />
              </button>
            );
          },
        )}
      </div>
      <div className="meal-selected-day">
        <div className="meal-selected-day-heading">
          <h2>
            {fmt(day, { weekday: "long", day: "numeric", month: "short" })}
          </h2>
          {snapshot.state.eaten.some((e) => e.date === day) && (
            <button
              className="meal-journal-count"
              onClick={onJournal}
              aria-label={text(
                "Open eating journal",
                "Ouvrir le journal des repas consommés",
              )}
            >
              <Check size={18} />
              <span>
                {snapshot.state.eaten.filter((e) => e.date === day).length}
              </span>
            </button>
          )}
        </div>
        <div className="meal-day-list">
          {plans.length ? (
            plans.map((plan) => (
              <button
                className="meal-agenda-event"
                key={plan.id}
                type="button"
                onClick={() => {
                  setSelected(plan);
                  setSheet("meal");
                }}
              >
                <span className="meal-event-symbol">
                  <Utensils size={22} />
                </span>
                <span>
                  <small>
                    {t(plan.slot)} · {plan.servings}{" "}
                    {text("servings", "portions")}
                  </small>
                  <strong>{plan.title}</strong>
                  <small>
                    {plan.cookedId
                      ? text("Cooked", "Cuisiné")
                      : t(
                          snapshot.shopping.readiness[plan.id] ??
                            "Check quantities",
                        )}
                    {plan.locked ? " · " + text("Fixed", "Fixe") : ""}
                  </small>
                </span>
                <MoreHorizontal size={20} />
              </button>
            ))
          ) : (
            <div className="meal-agenda-empty">
              <Utensils size={28} />
              <p>{text("No meals yet", "Aucun repas")}</p>
            </div>
          )}
        </div>
        <div className="meal-day-footer">
          <button
            className="button primary"
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setSheet("recipe");
            }}
          >
            <Plus size={18} />
            {text("Add meal", "Ajouter un repas")}
          </button>
        </div>
      </div>
      <div className="meal-visual-actions">
        {[
          ["eaten", text("Eaten", "Mangé"), Check],
          ["nutrition", text("Nutrition", "Nutrition"), HeartPulse],
          ["leftovers", text("Leftovers", "Restes"), Package],
          ["ideas", text("Ideas", "Idées"), ChefHat],
          ["week", text("Week", "Semaine"), CalendarDays],
          ["context", text("My day", "Ma journée"), Sun],
          ["prepare", text("Prep", "Préparer"), Clock],
          ["rescue", text("Replan", "Réorganiser"), RefreshCw],
          ["checkin", text("Check-in", "Point cuisine") + ` · ${snapshot.checkIn?.total ?? 0}`, ClipboardCheck],
        ].map(([key, label, Glyph]) => {
          const Icon = Glyph as typeof Check;
          return (
            <button
              type="button"
              key={String(key)}
              disabled={busy}
              onClick={() => {
                {
                  setSheet(String(key));
                  if (key === "ideas" || key === "week")
                    void suggest(key === "week");
                }
              }}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{String(label)}</span>
            </button>
          );
        })}
      </div>
      {sheet && (
        <MealTaskSheet
          title={title}
          onClose={() => setSheet("")}
          onRetrySaved={() => {
            try {
              if (["recipe", "external", "edit"].includes(sheet))
                sessionStorage.removeItem(editorDraftKey);
              if (sheet === "ideas")
                sessionStorage.removeItem(
                  `recipe-buddy:meal-ideas:v2:${snapshot.actorId}:${snapshot.kitchenId}:${day}`,
                );
            } catch {
              /* Private storage may be unavailable. */
            }
          }}
        >
          {sheet === "add" && (
            <>
              <p className="small-note">
                {fmt(day, { weekday: "long", day: "numeric", month: "short" })}
              </p>
              {action(
                text("Saved recipe", "Recette enregistrée"),
                <BookOpen size={22} />,
                () => setSheet("recipe"),
              )}
              {action(
                text("Eating out or another meal", "Restaurant ou autre repas"),
                <Utensils size={22} />,
                () => setSheet("external"),
              )}
              {action(text("Leftovers", "Restes"), <Repeat size={22} />, () =>
                setSheet("leftovers"),
              )}
              {action(
                text("Plan the week", "Planifier la semaine"),
                <CalendarDays size={22} />,
                () => {
                  setSheet("week");
                  void suggest(true);
                },
              )}
            </>
          )}
          {["recipe", "external", "edit"].includes(sheet) && (
            <>
              {sheet !== "edit" && (
                <div className="meal-choice-chips">
                  <button
                    type="button"
                    aria-pressed={sheet === "recipe"}
                    onClick={() => setSheet("recipe")}
                  >
                    {text("Saved recipe", "Recette enregistrée")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={sheet === "external"}
                    onClick={() => setSheet("external")}
                  >
                    {text("Another meal", "Autre repas")}
                  </button>
                </div>
              )}
              <MealPlanEditor
                draftKey={editorDraftKey}
                key={meal?.id ?? sheet}
                recipes={recipes}
                diners={snapshot.diners}
                date={day}
                plan={sheet === "edit" ? meal : null}
                external={sheet === "external"}
                busy={busy}
                onSave={async (plan) => {
                  const saved = await mutate("plan", plan);
                  if (saved) setSheet("");
                  return saved;
                }}
              />
            </>
          )}
          {sheet === "meal" && meal && (
            <>
              <p className="small-note">
                {t(meal.slot)} · {meal.servings} {text("servings", "portions")}
              </p>
              {meal.recipeId &&
                !meal.cookedId &&
                action(
                  text("Mark as cooked", "Noter comme cuisiné"),
                  <ChefHat size={22} />,
                  () => setSheet("cook"),
                )}
              {meal.recipeId && (
                <Link
                  className="meal-action-row"
                  href={`/recipes/${meal.recipeId}`}
                >
                  <BookOpen size={22} />
                  <span>{text("Open recipe", "Ouvrir la recette")}</span>
                  <ArrowRight size={18} />
                </Link>
              )}
              {action(
                text("Edit or move", "Modifier ou déplacer"),
                <SlidersHorizontal size={22} />,
                () => setSheet("edit"),
              )}
              <MealRepeat
                plan={meal}
                plans={snapshot.state.plans}
                mutate={mutate}
                busy={busy}
              />
              {action(
                text("Remove from agenda", "Retirer de l’agenda"),
                <Trash2 size={22} />,
                () => setSheet("remove"),
              )}
              <details>
                <summary>
                  {text("Restriction check", "Vérification des restrictions")}
                </summary>
                <p>{t(snapshot.checks[meal.id]?.status ?? "not-assessed")}</p>
              </details>
            </>
          )}
          {sheet === "cook" && meal && (
            <>
              <p>
                {text(
                  "Cooking updates the pantry. Record eating separately.",
                  "La cuisson met à jour le stock. Notez séparément ce qui est mangé.",
                )}
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate(
                      "cook",
                      {
                        id: crypto.randomUUID(),
                        recipeId: meal.recipeId,
                        planId: meal.id,
                        servings: meal.servings,
                        date: meal.date,
                        timezone: snapshot.state.timezone,
                      },
                      false,
                    )
                  )
                    setSheet("");
                }}
              >
                {text("Confirm cooking", "Confirmer la cuisson")}
              </button>
            </>
          )}
          {sheet === "remove" && meal && (
            <>
              <p>{meal.title}</p>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  if (await mutate("remove-plan", { id: meal.id }))
                    setSheet("");
                }}
              >
                {text("Remove meal", "Retirer le repas")}
              </button>
            </>
          )}
          {tools[sheet]}
        </MealTaskSheet>
      )}
    </section>
  );
}
export function MealPlanEditor({
  recipes,
  diners,
  date,
  plan,
  external,
  busy,
  onSave,
  draftKey,
}: {
  draftKey?: string;
  recipes: AgendaRecipe[];
  diners: { id: string; name: string }[];
  date: string;
  plan: Plan | null;
  external: boolean;
  busy: boolean;
  onSave: (
    plan: Pick<
      Plan,
      "id" | "title" | "servings" | "date" | "slot" | "diners" | "locked"
    > &
      Partial<Plan>,
  ) => Promise<boolean | void>;
}) {
  const { locale, t } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [restored] = useState<Partial<Plan>>(() => {
    if (!draftKey || typeof window === "undefined") return {};
    try {
      const raw = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (
        !raw ||
        typeof raw !== "object" ||
        typeof raw.id !== "string" ||
        typeof raw.title !== "string" ||
        typeof raw.recipeId !== "string" ||
        typeof raw.locked !== "boolean" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(raw.date) ||
        !["breakfast", "lunch", "dinner", "snack"].includes(raw.slot) ||
        !Number.isFinite(raw.servings) ||
        raw.servings <= 0 ||
        raw.servings > 100 ||
        !Array.isArray(raw.diners) ||
        raw.diners.some((id: unknown) => typeof id !== "string")
      )
        return {};
      return raw;
    } catch {
      return {};
    }
  });
  const [draftId, setDraftId] = useState(
    restored.id ?? plan?.id ?? crypto.randomUUID(),
  );
  const [recipeId, setRecipeId] = useState(
      restored.recipeId ?? plan?.recipeId ?? "",
    ),
    [title, setTitle] = useState(restored.title ?? plan?.title ?? ""),
    [query, setQuery] = useState(""),
    [slot, setSlot] = useState(restored.slot ?? plan?.slot ?? "dinner"),
    [servings, setServings] = useState(
      restored.servings ?? plan?.servings ?? 2,
    ),
    [people, setPeople] = useState(restored.diners ?? plan?.diners ?? []),
    [locked, setLocked] = useState(restored.locked ?? plan?.locked ?? false),
    [selectedDate, setDate] = useState(restored.date ?? plan?.date ?? date);
  useEffect(() => {
    if (!draftKey) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          id: draftId,
          recipeId,
          title,
          date: selectedDate,
          slot,
          servings,
          diners: people,
          locked,
        }),
      );
    } catch {
      /* Private storage may be unavailable. */
    }
  }, [
    draftKey,
    draftId,
    recipeId,
    title,
    selectedDate,
    slot,
    servings,
    people,
    locked,
  ]);
  if (!external && !recipeId && (!plan || !!plan.recipeId))
    return (
      <div className="meal-recipe-picker">
        <label>
          {text("Search your recipes", "Rechercher une recette")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>
        {recipes
          .filter((r) =>
            r.title
              .toLocaleLowerCase(locale)
              .includes(query.toLocaleLowerCase(locale)),
          )
          .map((r) => (
            <button
              className="meal-action-row"
              key={r.id}
              onClick={() => {
                setRecipeId(r.id);
                setTitle(r.title);
                setServings(r.servings);
              }}
            >
              <BookOpen size={22} />
              <span>
                {r.title}
                <small>
                  {r.servings} {text("servings", "portions")}
                </small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        {!recipes.length && (
          <p>
            {text(
              "Save a recipe first, or plan another meal.",
              "Enregistrez une recette ou prévoyez un autre repas.",
            )}
          </p>
        )}
      </div>
    );
  return (
    <form
      className="meal-simple-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const { recipeId: oldRecipe, ...existing } = plan ?? {};
        void oldRecipe;
        const saved = await onSave({
          ...existing,
          id: draftId,
          date: selectedDate,
          slot,
          title,
          servings,
          diners: people,
          locked,
          ...(recipeId ? { recipeId } : {}),
        });
        if (saved === true) {
          if (draftKey)
            try {
              sessionStorage.removeItem(draftKey);
            } catch {
              /* Storage can be disabled. */
            }
          if (!plan) setDraftId(crypto.randomUUID());
        }
      }}
    >
      {recipeId ? (
        <div className="meal-chosen-recipe">
          <h3>{title}</h3>
          <button
            type="button"
            className="text-button"
            onClick={() => setRecipeId("")}
          >
            {text("Change recipe", "Changer de recette")}
          </button>
        </div>
      ) : (
        <label>
          {text("Meal name", "Nom du repas")}
          <input
            value={title}
            required
            maxLength={160}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}
      {plan ? (
        <label>
          {text("Day", "Jour")}
          <input
            type="date"
            value={selectedDate}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      ) : (
        <p className="small-note">
          {new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(new Date(selectedDate + "T12:00Z"))}
        </p>
      )}
      <fieldset className="meal-choice-chips">
        <legend>{text("Meal", "Repas")}</legend>
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((s) => (
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
      <div className="meal-stepper">
        <span>{text("Servings", "Portions")}</span>
        <div>
          <button
            type="button"
            aria-label={text("Fewer servings", "Moins de portions")}
            disabled={servings <= 0.5}
            onClick={() => setServings(Math.max(0.5, servings - 0.5))}
          >
            −
          </button>
          <output>{servings}</output>
          <button
            type="button"
            aria-label={text("More servings", "Plus de portions")}
            disabled={servings >= 100}
            onClick={() => setServings(Math.min(100, servings + 0.5))}
          >
            +
          </button>
        </div>
      </div>
      {diners.length > 0 && (
        <fieldset className="meal-choice-chips">
          <legend>{text("For whom?", "Pour qui ?")}</legend>
          {diners.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={people.includes(p.id)}
              onClick={() =>
                setPeople(
                  people.includes(p.id)
                    ? people.filter((id) => id !== p.id)
                    : [...people, p.id],
                )
              }
            >
              {p.name}
            </button>
          ))}
        </fieldset>
      )}
      <label className="check-row">
        <input
          type="checkbox"
          checked={locked}
          onChange={(e) => setLocked(e.target.checked)}
        />
        {text("Keep this meal fixed", "Garder ce repas fixe")}
      </label>
      <button className="button primary" disabled={busy || !title.trim()}>
        {text("Save meal", "Enregistrer le repas")}
      </button>
    </form>
  );
}
