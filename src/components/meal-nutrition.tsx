"use client";
import type { readMeals } from "@/lib/meal-service";
import { useTranslation } from "./language-provider";
import { useState } from "react";
import {
  Utensils,
  Pencil,
  Info,
  Check,
  Circle,
  AlertTriangle,
} from "lucide-react";
import {
  targetNutrients,
  type NutritionTarget,
} from "@/lib/meal-daily-nutrition";
type Snapshot = Awaited<ReturnType<typeof readMeals>>;
export function MealDailyNutrition({
  snapshot,
  mutate,
  busy,
}: {
  snapshot: Snapshot;
  mutate: (action: string, data: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [person, setPerson] = useState(""),
    [nutrient, setNutrient] =
      useState<(typeof targetNutrients)[number]>("energyKcal"),
    [minimum, setMinimum] = useState(""),
    [maximum, setMaximum] = useState(""),
    [source, setSource] = useState(""),
    [issued, setIssued] = useState(new Date().toISOString().slice(0, 10)),
    [review, setReview] = useState(""),
    [clinical, setClinical] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [minimumValid, setMinimumValid] = useState(true),
    [maximumValid, setMaximumValid] = useState(true);
  const [viewPerson, setViewPerson] = useState(
    snapshot.dailyNutrition[0]?.personId ?? snapshot.profiles[0]?.id ?? "",
  );
  const [edit, setEdit] = useState(false),
    [notes, setNotes] = useState(false);
  const targets =
    (
      snapshot.profiles.find((p) => p.id === person)?.data as unknown as {
        nutritionTargets?: NutritionTarget[];
      }
    )?.nutritionTargets ?? [];
  const label = (key: string) =>
    ({
      energyKcal: text("Energy · kcal", "Énergie · kcal"),
      carbohydrateG: text("Carbohydrate · g", "Glucides · g"),
      proteinG: text("Protein · g", "Protéines · g"),
      fatG: text("Fat · g", "Lipides · g"),
      sodiumG: "Sodium · g",
      saltG: text("Salt · g", "Sel · g"),
    })[key] ?? key;
  const status = (key: string) =>
    ({
      "no-target": text("No target", "Aucun objectif"),
      "review-required": text("Target needs review", "Objectif à réviser"),
      incomplete: text("Incomplete", "Incomplet"),
      "below-target": text("Below target", "Sous l’objectif"),
      "above-target": text("Above target", "Au-dessus de l’objectif"),
      "within-target": text("Within target", "Dans l’objectif"),
    })[key] ?? key;
  return (
    <section className="meal-daily-summary">
      <div className="meal-choice-chips">
        {snapshot.profiles.map((p) => (
          <button
            type="button"
            key={p.id}
            aria-pressed={viewPerson === p.id}
            onClick={() => {
              setViewPerson(p.id);
              setPerson(p.id);
            }}
          >
            {(p.data as unknown as { name: string }).name}
          </button>
        ))}
      </div>
      {!snapshot.dailyNutrition.some((day) => day.personId === viewPerson) && (
        <div className="meal-empty">
          <Utensils size={28} aria-hidden="true" />
          <p>{text("No intake recorded", "Aucun apport enregistré")}</p>
        </div>
      )}
      {snapshot.dailyNutrition
        .filter((day) => day.personId === viewPerson)
        .map((day) => (
          <article className="meal-card" key={day.personId + day.date}>
            <div className="meal-nutrition-day">
              <span>
                {new Intl.DateTimeFormat(locale, {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(day.date + "T12:00Z"))}
              </span>
              <span className="meal-nutrition-missing">
                {day.rows.some((row) => row.value === null)
                  ? text("— Missing data", "— Données manquantes")
                  : ""}
              </span>
            </div>
            <dl className="meal-nutrition-tiles">
              {day.rows.map((row) => (
                <div key={row.nutrient}>
                  <dt>{label(row.nutrient).split(" · ")[0]}</dt>
                  <dd>
                    <div className="meal-nutrition-value">
                      <strong
                        aria-label={
                          row.value === null
                            ? text("Unknown", "Inconnu")
                            : undefined
                        }
                      >
                        {row.value ?? "—"}
                      </strong>
                      <span>
                        {row.nutrient === "energyKcal" ? "kcal" : "g"}
                      </span>
                    </div>
                    {row.value === null && row.knownSubtotal !== null && (
                      <small>
                        {row.knownSubtotal} {text("recorded", "enregistré")}
                      </small>
                    )}
                    {row.target && (
                      <span
                        className="meal-nutrition-bound"
                        title={status(row.status)}
                      >
                        {row.status === "within-target" ? (
                          <Check size={16} aria-label={status(row.status)} />
                        ) : [
                            "below-target",
                            "above-target",
                            "review-required",
                          ].includes(row.status) ? (
                          <AlertTriangle
                            size={16}
                            aria-label={status(row.status)}
                          />
                        ) : null}
                        <span>
                          <span className="sr-only">
                            {text("Target", "Objectif")}{" "}
                          </span>
                          {row.target.minimum === null
                            ? `≤ ${row.target.maximum}`
                            : row.target.maximum === null
                              ? `≥ ${row.target.minimum}`
                              : `${row.target.minimum} – ${row.target.maximum}`}
                        </span>
                        {row.status === "below-target"
                          ? text("Low", "Bas")
                          : row.status === "above-target"
                            ? text("High", "Haut")
                            : row.status === "review-required"
                              ? text("Review", "Réviser")
                              : ""}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {notes &&
              day.rows
                .filter((row) => row.target)
                .map((row) => (
                  <p key={row.nutrient}>
                    {label(row.nutrient)} · {row.target!.source} ·{" "}
                    {text("Review by", "Réviser avant le")}{" "}
                    {row.target!.reviewDate} ·{" "}
                    {row.target!.kind === "clinician-prescribed"
                      ? text(
                          "Prescription entered by user, not verified by Recipe Buddy",
                          "Prescription saisie par l’utilisateur, non vérifiée par Recipe Buddy",
                        )
                      : text("Personal target", "Objectif personnel")}
                  </p>
                ))}
            <button
              className="meal-nutrition-coverage"
              aria-pressed={day.dayConfirmed}
              disabled={busy}
              onClick={() =>
                void mutate("daily-coverage", {
                  personId: day.personId,
                  date: day.date,
                  confirmed: !day.dayConfirmed,
                })
              }
            >
              {day.dayConfirmed ? (
                <Check size={20} aria-hidden="true" />
              ) : (
                <Circle size={20} aria-hidden="true" />
              )}
              {day.dayConfirmed
                ? text(
                    "All food & drinks logged",
                    "Repas et boissons enregistrés",
                  )
                : text(
                    "All food & drinks logged",
                    "Repas et boissons enregistrés",
                  )}
            </button>
          </article>
        ))}
      <div className="meal-tool-row">
        <button
          className="button secondary"
          type="button"
          aria-expanded={edit}
          onClick={() => {
            setPerson(viewPerson);
            setEdit(!edit);
          }}
        >
          <Pencil size={18} />
          {text("Targets", "Objectifs")}
        </button>
        <button
          className="button secondary"
          type="button"
          aria-expanded={notes}
          onClick={() => setNotes(!notes)}
        >
          <Info size={18} />
          {text("Info", "Infos")}
        </button>
      </div>
      {notes && (
        <section>
          <p>
            {text(
              "Compare recorded intake with personal or clinician-prescribed targets. Confirm all meals, snacks and drinks after the day ends. Missing portions and composition remain unknown. One day cannot diagnose deficiency or establish long-term adequacy. Vitamins and minerals are not assessed. Clinical validation is pending.",
              "Comparez les apports enregistrés aux objectifs personnels ou prescrits. Confirmez repas, collations et boissons après la fin de la journée. Portions et composition manquantes restent inconnues. Une journée ne diagnostique ni carence ni équilibre à long terme. Vitamines et minéraux non évalués. Validation clinique en attente.",
            )}
          </p>
        </section>
      )}
      {edit && (
        <section className="meal-simple-form">
          <p>
            {text(
              "Use exact targets. Children, pregnancy and medical conditions require clinician-prescribed targets.",
              "Utilisez les objectifs exacts. Enfants, grossesse et pathologies nécessitent des objectifs prescrits.",
            )}
          </p>
          <fieldset className="meal-choice-chips">
            <legend>{text("Person", "Personne")}</legend>
            {snapshot.profiles.map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={p.id === person}
                onClick={() => setPerson(p.id)}
              >
                {(p.data as unknown as { name: string }).name}
              </button>
            ))}
          </fieldset>
          {targets.map((target) => (
            <p key={target.nutrient}>
              {label(target.nutrient)} · {target.minimum ?? "—"} –{" "}
              {target.maximum ?? "—"} · {target.source}{" "}
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void mutate("nutrition-target", {
                    personId: person,
                    targets: targets.filter(
                      (t) => t.nutrient !== target.nutrient,
                    ),
                  })
                }
              >
                {text("Remove", "Retirer")}
              </button>
            </p>
          ))}
          <fieldset className="meal-choice-chips">
            <legend>{text("Nutrient", "Nutriment")}</legend>
            {targetNutrients.map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={n === nutrient}
                onClick={() => setNutrient(n)}
              >
                {label(n)}
              </button>
            ))}
          </fieldset>
          <div className="meal-fields">
            <label>
              {text("Minimum (optional)", "Minimum (facultatif)")}
              <input
                type="number"
                min="0"
                max="100000"
                step="any"
                value={minimum}
                onChange={(e) => {
                  setMinimum(e.target.value);
                  setMinimumValid(e.currentTarget.validity.valid);
                }}
              />
            </label>
            <label>
              {text("Maximum (optional)", "Maximum (facultatif)")}
              <input
                type="number"
                min="0"
                max="100000"
                step="any"
                value={maximum}
                onChange={(e) => {
                  setMaximum(e.target.value);
                  setMaximumValid(e.currentTarget.validity.valid);
                }}
              />
            </label>
          </div>
          <label>
            {text(
              "Source or prescription reference",
              "Source ou référence de prescription",
            )}
            <input
              value={source}
              maxLength={500}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <label>
            {text("Issued date", "Date d’émission")}
            <input
              type="date"
              value={issued}
              onChange={(e) => setIssued(e.target.value)}
            />
          </label>
          <label>
            {text("Review date", "Date de révision")}
            <input
              type="date"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={clinical}
              onChange={(e) => {
                setClinical(e.target.checked);
                setConfirmed(false);
              }}
            />
            {text("Clinician-prescribed target", "Objectif prescrit")}
          </label>
          {clinical && (
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {text(
                "My clinician prescribed these exact bounds for this person",
                "Le professionnel a prescrit ces limites exactes pour cette personne",
              )}
            </label>
          )}
          <button
            className="button"
            disabled={
              busy ||
              !minimumValid ||
              !maximumValid ||
              !person ||
              !source.trim() ||
              !review ||
              (!minimum && !maximum) ||
              (clinical && !confirmed)
            }
            onClick={() =>
              void mutate("nutrition-target", {
                personId: person,
                targets: [
                  ...targets.filter((t) => t.nutrient !== nutrient),
                  {
                    nutrient,
                    minimum: minimum === "" ? null : Number(minimum),
                    maximum: maximum === "" ? null : Number(maximum),
                    kind: clinical ? "clinician-prescribed" : "personal",
                    source,
                    issued,
                    reviewDate: review,
                    clinicianConfirmed: confirmed,
                  },
                ],
              })
            }
          >
            {text("Save target", "Enregistrer l’objectif")}
          </button>
          <p>
            <a
              href="https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator"
              target="_blank"
              rel="noopener noreferrer"
            >
              USDA · DRI
            </a>{" "}
            ·{" "}
            <a
              href="https://realfood.gov/"
              target="_blank"
              rel="noopener noreferrer"
            >
              US · 2025–2030
            </a>{" "}
            ·{" "}
            <a
              href="https://www.anses.fr/fr"
              target="_blank"
              rel="noopener noreferrer"
            >
              France · ANSES
            </a>
          </p>
        </section>
      )}
      {snapshot.nutrition
        .filter((entry) => entry.personId === viewPerson)
        .map((entry) => (
          <RecordedPortion
            key={entry.id}
            entry={entry}
            mutate={mutate}
            busy={busy}
          />
        ))}
      {notes && (
        <MealNutrition
          entries={snapshot.nutrition.filter(
            (entry) => entry.personId === viewPerson,
          )}
        />
      )}
    </section>
  );
}
function RecordedPortion({
  entry,
  mutate,
  busy,
}: {
  entry: Snapshot["nutrition"][number];
  mutate: (action: string, data: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [portion, setPortion] = useState(
      entry.nutritionEvidence?.portion ?? "",
    ),
    [source, setSource] = useState(entry.nutritionEvidence?.source ?? ""),
    [confirmed, setConfirmed] = useState(false),
    [values, setValues] = useState<Record<string, string>>(
      Object.fromEntries(
        targetNutrients.map((n) => [
          n,
          entry.nutritionEvidence?.values[n]?.toString() ?? "",
        ]),
      ),
    );
  const [invalidNutrients, setInvalidNutrients] = useState<
    Record<string, boolean>
  >({});
  const labels = {
    energyKcal: text("Energy · kcal", "Énergie · kcal"),
    carbohydrateG: text("Carbohydrate · g", "Glucides · g"),
    proteinG: text("Protein · g", "Protéines · g"),
    fatG: text("Fat · g", "Lipides · g"),
    sodiumG: "Sodium · g",
    saltG: text("Salt · g", "Sel · g"),
  };
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        className="meal-action-row"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{entry.title}</span>
        <Pencil size={18} aria-label={text("Composition", "Composition")} />
      </button>
      {open && (
        <>
          <p>
            {text(
              "Values for the portion eaten. Scale label values to that portion; leave unknowns blank.",
              "Valeurs pour la portion consommée. Ajustez l’étiquette à cette portion ; laissez les inconnues vides.",
            )}
          </p>
          <label>
            {text("Portion eaten", "Portion consommée")}
            <input
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
            />
          </label>
          <label>
            {text("Source", "Source")}
            <input value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
          <div className="meal-fields">
            {targetNutrients.map((n) => (
              <label key={n}>
                {labels[n]}
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="any"
                  value={values[n]}
                  onChange={(e) => {
                    setValues({ ...values, [n]: e.target.value });
                    setInvalidNutrients({
                      ...invalidNutrients,
                      [n]: !e.currentTarget.validity.valid,
                    });
                  }}
                />
              </label>
            ))}
          </div>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {text(
              "These values describe this actual consumed portion",
              "Ces valeurs décrivent cette portion réellement consommée",
            )}
          </label>
          <button
            className="button"
            disabled={
              busy ||
              Object.values(invalidNutrients).some(Boolean) ||
              !confirmed ||
              !portion.trim() ||
              source.trim().length < 3
            }
            onClick={() =>
              void mutate("eaten-nutrition", {
                id: entry.id,
                evidence: {
                  portion,
                  source,
                  confirmed: true,
                  values: Object.fromEntries(
                    targetNutrients.map((n) => [
                      n,
                      values[n] === "" ? null : Number(values[n]),
                    ]),
                  ),
                },
              })
            }
          >
            {text("Save composition", "Enregistrer la composition")}
          </button>
          {entry.nutritionEvidence && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void mutate("eaten-nutrition", { id: entry.id, evidence: null })
              }
            >
              {text(
                "Remove manual composition",
                "Retirer la composition saisie",
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
function MealNutrition({ entries }: { entries: Snapshot["nutrition"] }) {
  const { t, locale } = useTranslation();
  return (
    <details>
      <summary>{t("Recorded food · source estimates")}</summary>
      <p>
        {locale === "fr"
          ? "Aliments non notés et portions inconnues restent inconnus. Les estimations d’ingrédients utilisent les données vendues ; pertes de cuisson et rendement non mesurés."
          : "Unlogged food and unknown portions remain unknown. Ingredient estimates use as-sold label data; cooking losses and final yield are not measured."}
      </p>
      {!entries.length && <p>{t("No actual food records in this window.")}</p>}
      {entries.map((e) => (
        <article className="meal-card" key={e.id}>
          <strong>
            {e.date} · {e.title}
          </strong>
          {e.estimate ? (
            <>
              {e.nutritionEvidence && (
                <p>
                  {e.nutritionEvidence.portion} · {e.nutritionEvidence.source}
                </p>
              )}
              <dl>
                {Object.entries(e.estimate.values).map(([name, value]) => (
                  <div key={name}>
                    <dt>{t(name)}</dt>
                    <dd>{value ?? t("Unknown")}</dd>
                  </div>
                ))}
              </dl>
              {!!e.estimate.missingIngredients.length && (
                <p>
                  {t("Missing composition evidence")}:{" "}
                  {e.estimate.missingIngredients.join(", ")}
                </p>
              )}
              {e.estimate.sources.map((s, i) => (
                <p key={i}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.ingredient} · Open Food Facts
                  </a>{" "}
                  · {s.retrievedAt.slice(0, 10)}
                </p>
              ))}
            </>
          ) : (
            <p>{t("Portion or composition evidence unavailable.")}</p>
          )}
        </article>
      ))}
    </details>
  );
}
