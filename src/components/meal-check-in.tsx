"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ClipboardCheck, Pencil, Plus } from "lucide-react";
import type { Kitchen, Profile } from "@/lib/meal-engine";
import type { CheckInQuestion, checkInSnapshot } from "@/lib/meal-check-in";
import { useTranslation } from "./language-provider";
import { CheckInReminder } from "./check-in-reminder";

type Draft = {
  question?: CheckInQuestion;
  mode: string;
  title: string;
  quantity: string;
  approximate: boolean;
  personId: string;
  date: string;
  slot: string;
  dayType: string;
  diners: string[];
  eatingOut: boolean;
  operationId: string;
  recordId: string;
  pending?: { action: string; data: Record<string, unknown> };
  skipped: string[];
  done: boolean;
  visited: number;
};
type Props = {
  state: Kitchen;
  profiles: Profile[];
  actorId: string;
  kitchenId: string;
  checkIn: ReturnType<typeof checkInSnapshot> | null;
  diners: { id: string; name: string }[];
  reload: () => Promise<void>;
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
};
export function MealCheckIn({
  state,
  profiles,
  actorId,
  kitchenId,
  checkIn: initialCheckIn,
  diners,
  reload,
  mutate,
}: Props) {
  const [page, setPage] = useState<Props["checkIn"]>(null);
  useEffect(() => setPage(null), [initialCheckIn]);
  const checkIn = page ?? initialCheckIn;
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const slotLabel = (s: string) =>
    ({
      breakfast: text("Breakfast", "Petit-déjeuner"),
      lunch: text("Lunch", "Déjeuner"),
      dinner: text("Dinner", "Dîner"),
      snack: text("Snack / drink", "Collation / boisson"),
    })[s] ?? s;
  const key = `rb-check-in:${actorId}:${kitchenId}`;
  const empty = (): Draft => ({
    mode: "",
    title: "",
    quantity: "",
    approximate: true,
    personId: profiles[0]?.id ?? "",
    date: checkIn?.today ?? "",
    slot: "snack",
    dayType: "flexible",
    diners: [],
    eatingOut: false,
    operationId: crypto.randomUUID(),
    recordId: crypto.randomUUID(),
    skipped: [],
    done: false,
    visited: 0,
  });
  const [draft, setDraft] = useState<Draft>(empty),
    [ready, setReady] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(draft);
  live.current = draft;
  const storageAllowed = useRef(true);
  useEffect(() => {
    const clear = () => {
      storageAllowed.current = false;
    };
    window.addEventListener("rb-clear-meal-drafts", clear);
    return () => window.removeEventListener("rb-clear-meal-drafts", clear);
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.operationId && Array.isArray(d.skipped)) {
          live.current={ ...empty(), ...d };
          setDraft(live.current);
        }
      }
    } catch {}
    setReady(true);
    const flush = () => {
      try {
        if (storageAllowed.current)
          localStorage.setItem(key, JSON.stringify(live.current));
      } catch {}
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
    // Each account and kitchen mounts a separate keyed draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try {
        if (storageAllowed.current)
          localStorage.setItem(key, JSON.stringify(draft));
      } catch {
        setError(
          locale === "fr"
            ? "Stockage indisponible. Gardez cette page ouverte jusqu’à l’enregistrement."
            : "Storage unavailable. Keep this page open until saved.",
        );
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, key, ready, locale]);
  const patch = (value: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...value }));
  const open = (q?: CheckInQuestion, mode = q?.kind ?? "food") => {
    if (draft.pending) return;
    const context = state.contexts?.find(
      (c) => c.actorId === actorId && c.date === (q?.date ?? checkIn?.today),
    );
    setDraft({
      ...empty(),
      skipped: draft.skipped,
      visited: draft.visited,
      question: q,
      mode,
      title: q?.title ?? "",
      quantity:
        mode === "context"
          ? (context?.timeMinutes?.toString() ?? "")
          : (q?.quantity?.toString() ?? ""),
      approximate: q?.approximate ?? true,
      personId: q?.personId ?? profiles[0]?.id ?? "",
      date: q?.date ?? checkIn?.today ?? "",
      slot: q?.slot ?? "snack",
      dayType: context?.dayType ?? "flexible",
      diners: context?.diners ?? [],
      eatingOut: context?.eatingOut ?? false,
    });
    setError("");
    setNotice("");
  };
  const submit = async (action: string, data: Record<string, unknown>) => {
    if (saving) return;
    setSaving(true);
    setError("");
    const pending = draft.pending ?? { action, data };
    const saved = { ...draft, pending };
    setDraft(saved);
    try {
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {}
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: draft.operationId,
          kitchenId,
          action: pending.action,
          data: pending.data,
        }),
      });
      await response.json();
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          localStorage.removeItem(key);
          setDraft(empty());
          setError(
            text(
              "No longer authorized. Sign in or refresh your kitchen.",
              "Accès indisponible. Reconnectez-vous ou actualisez votre cuisine.",
            ),
          );
        } else if (response.status === 409)
          setError(
            text(
              "Already resolved or changed since opening. Refresh, then review the current record. Your answer is kept.",
              "Déjà résolu ou modifié depuis l’ouverture. Actualisez puis vérifiez le relevé actuel. Votre réponse est conservée.",
            ),
          );
        else
          setError(
            text(
              "Could not save. Your answer is kept; try again.",
              "Enregistrement impossible. Votre réponse est conservée ; réessayez.",
            ),
          );
        return;
      }
      const visited = (draft.visited ?? 0) + 1;
      const next = {
        ...empty(),
        skipped: draft.skipped,
        visited,
        done: visited >= 5,
      };
      setDraft(next);
      live.current = next;
      localStorage.setItem(key, JSON.stringify(next));
      setNotice(
        text(
          "Saved. You can correct it below.",
          "Enregistré. Vous pouvez le corriger ci-dessous.",
        ),
      );
      await reload();
    } catch {
      setError(
        text(
          "Offline or connection interrupted. Your answer is pending on this device.",
          "Hors ligne ou connexion interrompue. Votre réponse reste en attente sur cet appareil.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  if (!checkIn)
    return (
      <p>
        {text(
          "Kitchen check-in is temporarily unavailable. Recorded answers are retained.",
          "Le point cuisine est momentanément indisponible. Les réponses enregistrées sont conservées.",
        )}
      </p>
    );
  const questions = checkIn.questions.filter(
    (q) => !draft.skipped.includes(q.id + q.sourceVersion),
  );
  const q = draft.question;
  const amount =
    draft.quantity.trim() === ""
      ? null
      : Number(draft.quantity.replace(",", "."));
  const numberValid =
    amount === null ||
    (Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= (draft.mode === "pantry" ? 1e7 : 1440));
  const guard = q
    ? {
        kind: q.kind,
        sourceId: q.sourceId,
        personId: q.personId,
        sourceVersion: q.sourceVersion,
      }
    : undefined;
  const save = () => {
    const base = { ...(guard ? { _checkIn: guard } : {}) };
    if (draft.mode === "pantry" && q) {
      const batch = state.pantry.find((b) => b.id === q.sourceId);
      if (!batch) return;
      void submit(
        q.quantity === null ? "pantry" : "stock",
        q.quantity === null
          ? {
              ...batch,
              ...base,
              quantity: amount,
              quantityEstimated: draft.approximate,
            }
          : {
              ...base,
              id: q.sourceId,
              delta: amount! - q.quantity!,
              reason: "correction",
              quantityEstimated: draft.approximate,
            },
      );
    } else if (draft.mode === "leftover" && q) {
      const batch = state.leftovers.find((b) => b.id === q.sourceId);
      if (batch)
        void submit("leftover", { ...batch, ...base, remaining: amount });
    } else if (draft.mode === "context") {
      const ref = checkIn.contexts.find((c) => c.sourceId === draft.date);
      const prior = state.contexts?.find(
        (c) => c.actorId === actorId && c.date === draft.date,
      );
      void submit("context", {
        ...prior,
        _checkIn: guard ?? ref,
        date: draft.date,
        timeMinutes: amount,
        equipment: prior?.equipment ?? [],
        dayType: draft.dayType,
        appetite: prior?.appetite ?? "unknown",
        mealSize: prior?.mealSize ?? "unknown",
        diners: draft.diners,
        eatingOut: draft.eatingOut,
      });
    } else {
      const previous =
        draft.mode === "eaten"
          ? state.eaten.find((e) => e.id === q?.sourceId)
          : undefined;
      void submit(previous ? "edit-eaten" : "eat", {
        ...base,
        id: previous?.id ?? draft.recordId,
        personId: draft.personId,
        date: draft.date,
        slot: draft.slot,
        title: draft.title.trim(),
        amount,
        approximate: draft.approximate,
        ...(q?.kind === "meal"
          ? { planId: q.sourceId }
          : previous?.planId
            ? { planId: previous.planId }
            : {}),
        ...(draft.mode === "leftover-eat"
          ? { leftoverId: q?.sourceId }
          : previous?.title === draft.title.trim()
            ? {
                leftoverId: previous.leftoverId,
                occasionId: previous.occasionId,
                recipeId: previous.recipeId,
              }
            : {}),
      });
    }
  };
  const field = (
    label: string,
    value: string,
    onChange: (s: string) => void,
    type = "text",
    max = 160,
  ) => (
    <label>
      {label}
      <input
        type={type}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
  return (
    <section
      className="meal-simple-form check-in"
      aria-label={text("Kitchen check-in", "Point cuisine")}
    >
      <p className="muted">
        {text(
          "A few optional questions. Skipped answers stay unknown.",
          "Quelques questions facultatives. Les réponses ignorées restent inconnues.",
        )}{" "}
        · {checkIn.timezone}
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {draft.pending && (
        <div className="meal-simple-form">
          <p>
            {text(
              "1 answer pending · not yet confirmed",
              "1 réponse en attente · non confirmée",
            )}
          </p>
          <button
            className="button primary"
            disabled={saving}
            onClick={() =>
              void submit(draft.pending!.action, draft.pending!.data)
            }
          >
            {text("Retry saved answer", "Réessayer la réponse")}
          </button>
          <button
            className="button secondary"
            disabled={saving}
            onClick={async () => {
              await reload();
              patch({
                pending: undefined,
                operationId: crypto.randomUUID(),
                mode: "",
                question: undefined,
              });
              setError("");
            }}
          >
            {text("Refresh and review", "Actualiser et vérifier")}
          </button>
        </div>
      )}
      {draft.mode ? (
        <form
          className="meal-simple-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h3>{draft.mode==="context"?text("Availability","Disponibilités"):q?.title ?? text("Food or drink", "Aliment ou boisson")}</h3>
          {q && (
            <p>
              {q.personName} {q.date} {q.slot ? slotLabel(q.slot) : ""}
              {q.quantity !== undefined
                ? ` · ${q.quantity ?? text("Unknown", "Inconnu")} ${q.unit === "servings" ? text("servings", "portions") : (q.unit ?? "")} · ${q.quantity === null ? text("Unknown", "Inconnu") : q.approximate ? text("Approximate", "Approximatif") : text("Exact", "Exact")}`
                : ""}
            </p>
          )}
          <fieldset
            disabled={saving || !!draft.pending}
            className="meal-simple-form"
          >
            {["meal", "eaten", "food", "leftover-eat"].includes(draft.mode) && (
              <>
                {field(
                  text(
                    "What was eaten or drunk?",
                    "Qu’avez-vous mangé ou bu ?",
                  ),
                  draft.title,
                  (v) => patch({ title: v }),
                )}
                {q?.kind === "meal" && (
                  <p className="muted">
                    {text(
                      "Keep the planned meal, or describe what was actually eaten elsewhere.",
                      "Gardez le repas prévu ou décrivez ce qui a réellement été consommé ailleurs.",
                    )}
                  </p>
                )}
                <div
                  className="meal-choice-chips"
                  role="group"
                  aria-label={text("Person", "Personne")}
                >
                  {profiles.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      disabled={!!q?.personId}
                      aria-pressed={draft.personId === p.id}
                      onClick={() => patch({ personId: p.id })}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                {field(
                  text("Date", "Date"),
                  draft.date,
                  (v) => patch({ date: v }),
                  "date",
                )}
                <div className="meal-choice-chips">
                  {["breakfast", "lunch", "dinner", "snack"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      aria-pressed={draft.slot === s}
                      onClick={() => patch({ slot: s })}
                    >
                      {slotLabel(s)}
                    </button>
                  ))}
                </div>
                {!profiles.length && (
                  <p>
                    {text(
                      "Add a person through Household’s consent flow first.",
                      "Ajoutez d’abord une personne avec son consentement dans Foyer.",
                    )}
                  </p>
                )}
              </>
            )}
            {draft.mode === "context" && (
              <>
                <div className="meal-choice-chips">
                  {checkIn.contexts.map((c) => (
                    <button
                      type="button"
                      key={c.sourceId}
                      aria-pressed={draft.date === c.sourceId}
                      onClick={() =>
                        open(
                          {
                            ...c,
                            id: `context:${c.sourceId}:`,
                            title: text("Availability", "Disponibilités"),
                            date: c.sourceId,
                          },
                          "context",
                        )
                      }
                    >
                      {c.sourceId}
                    </button>
                  ))}
                </div>
                <p>
                  {text(
                    "Applies only on this local date; expires at the next midnight.",
                    "S’applique uniquement à cette date locale ; expire au prochain minuit.",
                  )}
                </p>
                <div className="meal-choice-chips">
                  {[
                    ["work", "Work", "Travail"],
                    ["rest", "Rest", "Repos"],
                    ["gym", "Workout", "Sport"],
                    ["flexible", "Flexible", "Souple"],
                  ].map(([v, en, fr]) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={draft.dayType === v}
                      onClick={() => patch({ dayType: v })}
                    >
                      {text(en, fr)}
                    </button>
                  ))}
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.eatingOut}
                    onChange={(e) => patch({ eatingOut: e.target.checked })}
                  />
                  {text("Eating out", "Repas à l’extérieur")}
                </label>
                <fieldset className="meal-choice-chips">
                  <legend>{text("Expected diners", "Convives prévus")}</legend>
                  {diners.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={draft.diners.includes(p.id)}
                      onClick={() =>
                        patch({
                          diners: draft.diners.includes(p.id)
                            ? draft.diners.filter((id) => id !== p.id)
                            : [...draft.diners, p.id],
                        })
                      }
                    >
                      {p.name}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
            <label>
              {draft.mode === "context"
                ? text(
                    "Available minutes (blank if unknown)",
                    "Minutes disponibles (vide si inconnu)",
                  )
                : draft.mode === "pantry"
                  ? `${text("New amount", "Nouvelle quantité")} · ${q?.unit ?? ""}`
                  : draft.mode === "leftover"
                    ? text("Remaining servings", "Portions restantes")
                    : text(
                        "Servings (blank if unknown)",
                        "Portions (vide si inconnu)",
                      )}
              <input
                inputMode="decimal"
                value={draft.quantity}
                maxLength={16}
                onChange={(e) => patch({ quantity: e.target.value })}
              />
            </label>
            {!["context", "leftover"].includes(draft.mode) && (
              <label>
                <input
                  type="checkbox"
                  checked={draft.approximate}
                  onChange={(e) => patch({ approximate: e.target.checked })}
                />
                {text("Approximate amount", "Quantité approximative")}
              </label>
            )}
            {draft.mode === "leftover" && (
              <>
                <p>
                  {text(
                    "Correcting or discarding changes remaining servings only. Record eating separately.",
                    "Corriger ou jeter modifie uniquement les portions restantes. Enregistrez la consommation séparément.",
                  )}
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => patch({ quantity: "0" })}
                >
                  {text(
                    "Discard remaining servings",
                    "Jeter les portions restantes",
                  )}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    patch({
                      mode: "leftover-eat",
                      quantity: "",
                      date: checkIn.today,
                    })
                  }
                >
                  {text(
                    "Record eating leftovers",
                    "Enregistrer les restes consommés",
                  )}
                </button>
              </>
            )}
            {!numberValid && (
              <p role="alert">
                {text(
                  "Enter a valid non-negative amount.",
                  "Saisissez une quantité positive ou nulle valide.",
                )}
              </p>
            )}
            <button
              className="button primary"
              disabled={
                !numberValid ||
                (["pantry", "leftover"].includes(draft.mode) &&
                  amount === null) ||
                (draft.mode === "context" &&
                  amount !== null &&
                  (amount < 5 || !Number.isInteger(amount))) ||
                (["meal", "eaten", "food", "leftover-eat"].includes(
                  draft.mode,
                ) &&
                  (!draft.personId ||
                    !draft.title.trim() ||
                    (amount !== null && (amount <= 0 || amount > 100)))) ||
                (draft.mode === "leftover-eat" && amount === null)
              }
            >
              <Check size={18} />
              {text("Save answer", "Enregistrer la réponse")}
            </button>
          </fieldset>
          <button
            type="button"
            className="button secondary"
            disabled={saving || !!draft.pending}
            onClick={() => patch({ mode: "", question: undefined })}
          >
            {text("Back to questions", "Retour aux questions")}
          </button>
        </form>
      ) : (
        <>
          {draft.done ? (
            <p role="status">
              {text(
                "Done for now. Only saved answers changed your kitchen; this does not confirm a complete day’s intake.",
                "Terminé pour le moment. Seules les réponses enregistrées ont modifié votre cuisine ; cela ne confirme pas une journée alimentaire complète.",
              )}
            </p>
          ) : (
            <>
              {!questions.length && (
                <div className="meal-empty">
                  <ClipboardCheck size={28} />
                  <p>
                    {checkIn.total
                      ? text(
                          "Skipped for now. Nothing was assumed.",
                          "Ignoré pour le moment. Aucune information n’a été déduite.",
                        )
                      : text(
                          "Nothing needs confirmation. Your check-in is optional.",
                          "Rien à confirmer. Votre point cuisine est facultatif.",
                        )}
                  </p>
                </div>
              )}
              {questions
                .slice(0, Math.max(0, 5 - (draft.visited ?? 0)))
                .map((item) => (
                  <div key={item.id} className="check-in-row">
                    <button
                      className="meal-action-row"
                      disabled={!!draft.pending}
                      onClick={() => open(item)}
                    >
                      <Pencil size={20} />
                      <span>
                        {item.title}
                        <small>
                          {item.personName ??
                            text(
                              item.kind === "pantry"
                                ? "Check quantity"
                                : "Check leftovers",
                              item.kind === "pantry"
                                ? "Vérifier la quantité"
                                : "Vérifier les restes",
                            )}{" "}
                          {item.date} {item.slot ? slotLabel(item.slot) : ""}
                        </small>
                      </span>
                    </button>
                    <button
                      className="button secondary"
                      onClick={() =>
                        patch({
                          visited: (draft.visited ?? 0) + 1,
                          done: (draft.visited ?? 0) + 1 >= 5,
                          skipped: [
                            ...draft.skipped,
                            item.id + item.sourceVersion,
                          ],
                        })
                      }
                    >
                      {text("Skip", "Passer")}
                    </button>
                  </div>
                ))}
              {questions.length > 5 && (
                <p>
                  {text(
                    `${questions.length - 5} more available after these questions. None are required.`,
                    `${questions.length - 5} autres questions disponibles ensuite. Aucune n’est obligatoire.`,
                  )}
                </p>
              )}
            </>
          )}
          <div className="meal-choice-chips">
            <button
              type="button"
              disabled={!!draft.pending}
              onClick={() => open()}
            >
              <Plus size={18} />
              {text("Add food or drink", "Ajouter un aliment ou une boisson")}
            </button>
            <button
              type="button"
              disabled={!!draft.pending}
              onClick={() =>
                open(
                  {
                    ...checkIn.context,
                    id: `context:${checkIn.today}:`,
                    title: text("Availability", "Disponibilités"),
                    date: checkIn.today,
                  },
                  "context",
                )
              }
            >
              {text("Update availability", "Modifier les disponibilités")}
            </button>
          </div>
          <button
            className="button secondary"
            onClick={() => patch({ done: !draft.done, visited: 0 })}
          >
            {draft.done
              ? text("Return to questions", "Revenir aux questions")
              : text("Done for now", "Terminer pour le moment")}
          </button>
          {!!draft.skipped.length && (
            <button
              className="button secondary"
              onClick={() => patch({ skipped: [], done: false })}
            >
              {text(
                "Review skipped questions",
                "Revoir les questions ignorées",
              )}
            </button>
          )}
          {checkIn.nextOffset !== null && (
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const r = await fetch(
                    `/api/meals/check-in?kitchenId=${encodeURIComponent(kitchenId)}&offset=${checkIn.nextOffset}`,
                  );
                  if (!r.ok) throw Error();
                  setPage((await r.json()).checkIn);
                  patch({ done: false });
                } catch {
                  setError(
                    text(
                      "Could not load more questions. Try again.",
                      "Impossible de charger la suite. Réessayez.",
                    ),
                  );
                }
              }}
            >
              {text("More questions", "Autres questions")}
            </button>
          )}
        </>
      )}
      <CheckInReminder
        actorId={actorId}
        kitchenId={kitchenId}
        checkIn={checkIn}
        mutate={mutate}
      />
      <details>
        <summary>
          {text(
            "Saved changes and corrections",
            "Modifications enregistrées et corrections",
          )}
        </summary>
        <div className="meal-simple-form">
          {checkIn.confirmations.slice(0, 10).map((c) => (
            <p key={c.operationId}>
              <Check size={16} aria-hidden="true" /> {c.title} ·{" "}
              {new Date(c.at).toLocaleString(locale)}
            </p>
          ))}
          {checkIn.corrections.map((c) => (
            <button
              key={c.id}
              className="meal-action-row"
              disabled={!!draft.pending}
              onClick={() => open(c)}
            >
              <Pencil size={18} />
              <span>
                {text("Correct", "Corriger")} {c.title}
                <small>
                  {c.personName} {c.date}{" "}
                  {c.quantity ?? text("Unknown", "Inconnu")}
                </small>
              </span>
            </button>
          ))}
          {q?.kind === "eaten" && (
            <button
              className="button secondary"
              disabled={saving || !!draft.pending}
              onClick={() =>
                void submit("remove-eaten", { id: q.sourceId, _checkIn: guard })
              }
            >
              {text("Undo this eating record", "Annuler ce relevé alimentaire")}
            </button>
          )}
        </div>
      </details>
    </section>
  );
}
