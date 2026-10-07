"use client";
import { useState } from "react";
import { Check, Minus, Plus, BookOpen, Users, Pencil } from "lucide-react";
import type { Plan } from "@/lib/meal-engine";
import { useTranslation } from "./language-provider";

export function MealEaten({
  date,
  plans,
  recipes,
  profiles,
  mutate,
  busy,
  onSaved,
}: {
  date: string;
  plans: Plan[];
  recipes: { id: string; title: string; source?: "mine" | "friends" }[];
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
  const [id, setId] = useState(() => crypto.randomUUID());
  const [recipeId, setRecipeId] = useState("");
  const [source, setSource] = useState<"mine" | "friends">("mine");
  const [query, setQuery] = useState("");
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
        if (busy || saved || !recipeId || !person) return;
        if (
          await mutate(
            "eat",
            {
              id,
              personId: person,
              date,
              slot,
              title: title.trim(),
              recipeId,
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
      {!recipeId &&
        !!plans.filter(
          (p) => p.date === date && recipes.some((r) => r.id === p.recipeId),
        ).length && (
          <div className="meal-choice-chips">
            {plans
              .filter(
                (p) =>
                  p.date === date && recipes.some((r) => r.id === p.recipeId),
              )
              .map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={planId === p.id}
                  onClick={() => {
                    setPlanId(p.id);
                    setRecipeId(p.recipeId!);
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
      {!recipeId ? (
        <section className="meal-simple-form meal-eaten-picker">
          <div
            className="meal-choice-chips"
            role="group"
            aria-label={text("Recipes", "Recettes")}
          >
            {(["mine", "friends"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                onClick={() => setSource(value)}
              >
                {value === "mine" ? (
                  <BookOpen size={18} aria-hidden="true" />
                ) : (
                  <Users size={18} aria-hidden="true" />
                )}
                {value === "mine"
                  ? text("My recipes", "Mes recettes")
                  : text("Friends", "Amis")}
              </button>
            ))}
          </div>
          {recipes.length > 8 && (
            <label>
              <span className="sr-only">
                {text("Find a recipe", "Trouver une recette")}
              </span>
              <input
                type="search"
                value={query}
                maxLength={100}
                placeholder={text("Find a recipe", "Trouver une recette")}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
          <div className="meal-eaten-recipes">
            {recipes
              .filter(
                (r) =>
                  (r.source ?? "mine") === source &&
                  r.title
                    .toLocaleLowerCase(locale)
                    .includes(query.toLocaleLowerCase(locale)),
              )
              .map((recipe) => (
                <button
                  type="button"
                  className="meal-action-row"
                  key={recipe.id}
                  disabled={busy}
                  onClick={() => {
                    setRecipeId(recipe.id);
                    setTitle(recipe.title);
                    setPlanId("");
                    setSaved(false);
                  }}
                >
                  <BookOpen size={22} aria-hidden="true" />
                  <span>{recipe.title}</span>
                  <Plus size={18} aria-hidden="true" />
                </button>
              ))}
            {!recipes.some(
              (r) =>
                (r.source ?? "mine") === source &&
                r.title
                  .toLocaleLowerCase(locale)
                  .includes(query.toLocaleLowerCase(locale)),
            ) && (
              <p className="muted">
                {source === "friends"
                  ? text("No shared recipes", "Aucune recette partagée")
                  : text("No recipes", "Aucune recette")}
              </p>
            )}
          </div>
        </section>
      ) : (
        <div className="meal-eaten-selected">
          <BookOpen size={24} aria-hidden="true" />
          <strong>{title}</strong>
          <button
            type="button"
            className="meal-icon-button"
            disabled={saved || busy}
            aria-label={text("Change recipe", "Changer de recette")}
            onClick={() => {
              setRecipeId("");
              setPlanId("");
            }}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {recipeId && (
        <>
          <fieldset className="meal-choice-chips" disabled={busy || saved}>
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
          <fieldset className="meal-choice-chips" disabled={busy || saved}>
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
                disabled={saved || busy || amount === null}
                onClick={() => {
                  setAmount(
                    amount === null || amount <= 0.5 ? null : amount - 0.5,
                  );
                  setSaved(false);
                }}
              >
                <Minus size={18} />
              </button>
              <output>{amount ?? text("Unknown", "Inconnu")}</output>
              <button
                type="button"
                aria-label={text("More servings", "Plus de portions")}
                disabled={saved || busy || (amount !== null && amount >= 100)}
                onClick={() => {
                  setAmount(
                    amount === null ? 0.5 : Math.min(100, amount + 0.5),
                  );
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
          {saved && (
            <button
              type="button"
              className="meal-action-row"
              onClick={() => {
                setId(crypto.randomUUID());
                setSaved(false);
                setRecipeId("");
                setPlanId("");
                setTitle("");
                setAmount(null);
              }}
            >
              <Plus size={18} aria-hidden="true" />
              {text("Another meal", "Autre repas")}
            </button>
          )}
        </>
      )}
    </form>
  );
}
