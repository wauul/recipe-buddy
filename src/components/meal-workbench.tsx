"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, BookOpen, History, Users } from "lucide-react";
import { MealAgenda, agendaWeekStart, MealPlanEditor } from "./meal-agenda";
import { MealTaskSheet, MealTaskFeedbackContext } from "./meal-task-sheet";
import { useTranslation } from "./language-provider";
import { request } from "@/lib/client";
import type { readMeals } from "@/lib/meal-service";
import type {
  Batch,
  Occasion,
  Plan,
  Profile,
  Ingredient,
} from "@/lib/meal-engine";
import { RecipePhotoInput } from "./recipe-photo-input";
import { MealDiscovery } from "./meal-discovery";
import { MealLeftovers } from "./meal-leftovers";
import { MealWeekPreview } from "./meal-week-preview";
import { MealDailyNutrition } from "./meal-nutrition";
import { MealEaten } from "./meal-eaten";
import { MealCommerce } from "./meal-commerce";
import { MealRescue } from "./meal-rescue";
import { MealCheckIn } from "./meal-check-in";
import { MealPreparation } from "./meal-preparation";
import { MealContext } from "./meal-context";
type Snapshot = Awaited<ReturnType<typeof readMeals>>;
type Recipe = {
  id: string;
  title: string;
  servings: number;
  imageUrl?: string;
  steps?: unknown;
  recipeVersion?: string;
  source?: "mine" | "friends";
};
function today() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}
function dayAfter(date: string, offset: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function MealWorkbench({
  recipes,
  section = "agenda",
}: {
  recipes: Recipe[];
  section?: string;
}) {
  const { t, locale } = useTranslation();
  useEffect(() => setTab(section), [section]);
  const portionLabel = (value: number, prepared = false) =>
    `${new Intl.NumberFormat(locale).format(value)} ${locale === "fr" ? (value === 1 ? "portion" : "portions") : value === 1 ? "serving" : "servings"}${prepared ? (locale === "fr" ? (value === 1 ? " préparée" : " préparées") : " prepared") : ""}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState(section),
    [from, setFrom] = useState(() => agendaWeekStart(today())),
    [days] = useState(7),
    [message, setMessage] = useState("");
  const [activeDay, setActiveDay] = useState(today);
  const [task, setTask] = useState("");
  const [weeklyPreview, setWeeklyPreview] = useState<Plan[]>([]);
  const [kitchenId, setKitchenId] = useState("");
  const pending = useRef<{
    operationId: string;
    action: string;
    data: unknown;
    kitchenId?: string;
    baseVersion?: number;
  } | null>(null);
  const reload = useCallback(async () => {
    try {
      setSnapshot(
        await request<Snapshot>(
          `/api/meals?from=${from}&to=${dayAfter(from, days - 1)}${kitchenId ? "&kitchenId=" + encodeURIComponent(kitchenId) : ""}`,
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    }
  }, [from, days, kitchenId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function mutate(
    action: string,
    data: unknown,
    optimisticVersion = true,
  ) {
    setBusy(true);
    setError("");
    const operation = {
      operationId: crypto.randomUUID(),
      kitchenId: snapshot?.kitchenId,
      action,
      data,
      ...(optimisticVersion ? { baseVersion: snapshot?.version } : {}),
    };
    pending.current = operation;
    try {
      await request("/api/meals", "POST", operation);
      pending.current = null;
      setMessage("Saved");
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (!pending.current) {
      await reload();
      return;
    }
    setBusy(true);
    try {
      await request("/api/meals", "POST", pending.current);
      pending.current = null;
      await reload();
      setError("");
      setMessage("Saved");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function reviewSavedDraft() {
    if (!pending.current) return;
    try {
      const fresh = await request<Snapshot>(
        `/api/meals?kitchenId=${encodeURIComponent(pending.current.kitchenId ?? snapshot!.kitchenId)}`,
      );
      setSnapshot(fresh);
      pending.current = {
        ...pending.current,
        operationId: crypto.randomUUID(),
        baseVersion: fresh.version,
      };
      setMessage("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    }
  }
  const [name, setName] = useState(""),
    [quantity, setQuantity] = useState(""),
    [quantityEstimated, setQuantityEstimated] = useState(false),
    [unit, setUnit] = useState("g"),
    [brand, setBrand] = useState(""),
    [label, setLabel] = useState(""),
    [storage, setStorage] = useState("pantry"),
    [packageDate, setPackageDate] = useState("");
  const [batchId, setBatchId] = useState(""),
    [packageSize, setPackageSize] = useState(""),
    [opened, setOpened] = useState(""),
    [frozen, setFrozen] = useState(""),
    [dateType, setDateType] = useState("unknown"),
    [barcode, setBarcode] = useState("");
  const [productEvidence, setProductEvidence] =
    useState<Batch["evidence"]>(null);
  const [recipeId, setRecipeId] = useState(""),
    [mealTitle, setMealTitle] = useState(""),
    [date, setDate] = useState(today),
    [slot, setSlot] = useState("dinner"),
    [servings, setServings] = useState(2),
    [diners] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Recipe[]>([]),
    [suggestionReason, setSuggestionReason] = useState("");
  const [selectedPantry, setSelectedPantry] = useState<string[]>([]);
  const [profileName, setProfileName] = useState(""),
    [ageBand, setAgeBand] = useState("adult"),
    [country, setCountry] = useState("FR"),
    [allergies, setAllergies] = useState(""),
    [intolerances, setIntolerances] = useState(""),
    [coeliac, setCoeliac] = useState(false),
    [pregnancy, setPregnancy] = useState(false),
    [breastfeeding, setBreastfeeding] = useState(false),
    [diabetes, setDiabetes] = useState("none"),
    [clinician, setClinician] = useState(""),
    [consent, setConsent] = useState(false),
    [profileId, setProfileId] = useState("");
  const [caregiver, setCaregiver] = useState(false),
    [dislikes, setDislikes] = useState(""),
    [equipment, setEquipment] = useState(""),
    [routine, setRoutine] = useState(""),
    [otherConditions, setOtherConditions] = useState("");
  const [follow, setFollow] = useState<Occasion | null>(null),
    [photo, setPhoto] = useState(""),
    [rating, setRating] = useState(""),
    [comment, setComment] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false),
    [sharePhoto, setSharePhoto] = useState(false),
    [shareRating, setShareRating] = useState(false),
    [caption, setCaption] = useState("");
  const [person, setPerson] = useState(""),
    [ateAmount, setAteAmount] = useState(""),
    [leftoverAmount, setLeftoverAmount] = useState("");
  const [stockEdit, setStockEdit] = useState<Batch | null>(null),
    [stockDelta, setStockDelta] = useState("");
  const [actual, setActual] = useState<Ingredient[]>([]),
    [cookedServings, setCookedServings] = useState(""),
    [cookedDate, setCookedDate] = useState(""),
    [cookedTimezone, setCookedTimezone] = useState("");
  const hydrated = useRef("");
  const draftKey = snapshot
    ? `rb-meal-draft:${snapshot.actorId}:${snapshot.kitchenId}`
    : "";
  useEffect(() => {
    if (!draftKey || hydrated.current === draftKey) return;
    hydrated.current = draftKey;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      const text = (key: string, set: (v: string) => void) => {
        if (typeof d[key] === "string") set(d[key]);
      };
      text("name", setName);
      text("quantity", setQuantity);
      text("unit", setUnit);
      text("brand", setBrand);
      text("label", setLabel);
      text("recipeId", setRecipeId);
      text("mealTitle", setMealTitle);
      text("date", setDate);
      text("slot", setSlot);
      text("comment", setComment);
      text("caption", setCaption);
      if (typeof d.servings === "number") setServings(d.servings);
      if (d.pending && typeof d.pending.operationId === "string") {
        pending.current = d.pending;
        setMessage("");
      }
    } catch {
      /* A corrupt draft must not prevent kitchen access. */
    }
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || hydrated.current !== draftKey) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          name,
          quantity,
          unit,
          brand,
          label,
          recipeId,
          mealTitle,
          date,
          slot,
          servings,
          comment,
          caption,
          pending: pending.current,
        }),
      );
    } catch {
      /* Private storage may be disabled or full. */
    }
  }, [
    draftKey,
    name,
    quantity,
    unit,
    brand,
    label,
    recipeId,
    mealTitle,
    date,
    slot,
    servings,
    comment,
    caption,
    error,
    busy,
  ]);
  async function suggest(weekly = false) {
    setBusy(true);
    try {
      const result = await request<{ candidates: Recipe[]; reason: string }>(
        "/api/meals/suggestions",
        "POST",
        {
          kitchenId: snapshot?.kitchenId,
          diners,
          limit: 7,
          ingredients: selectedPantry,
          servings,
          date,
        },
      );
      setSuggestions(result.candidates);
      setSuggestionReason(result.reason);
      if (weekly && result.candidates.length) {
        setWeeklyPreview(
          Array.from({ length: days }, (_, n) => {
            const r = result.candidates[n % result.candidates.length];
            return {
              id: crypto.randomUUID(),
              date: dayAfter(from, n),
              slot: slot as Plan["slot"],
              recipeId: r.id,
              title: r.title,
              servings,
              diners,
              locked: false,
              ingredients: [],
              referenceServings: r.servings,
              recipeVersion: r.recipeVersion ?? "",
            };
          }).filter(
            (p) =>
              !snapshot?.state.plans.some(
                (old) => old.date === p.date && old.slot === p.slot,
              ),
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  function followUp(occasion: Occasion) {
    setActual(structuredClone(occasion.ingredients));
    setCookedServings(String(occasion.servings));
    setCookedDate(occasion.date);
    setCookedTimezone(occasion.timezone);
    setFollow(occasion);
    setPhoto(occasion.photo);
    setRating(occasion.rating?.toString() ?? "");
    setComment(occasion.comment);
    setCaption("");
    setSharePhoto(false);
    setShareRating(false);
  }
  function loadProfile(profile: Profile) {
    setCaregiver(profile.caregiverAuthorized);
    setDislikes(profile.dislikes.join(", "));
    setEquipment(profile.equipment);
    setRoutine(profile.routine);
    setOtherConditions(profile.otherConditions);
    setProfileId(profile.id);
    setProfileName(profile.name);
    setAgeBand(profile.ageBand);
    setCountry(profile.country);
    setAllergies(profile.allergies.join(", "));
    setIntolerances(profile.intolerances.join(", "));
    setCoeliac(profile.coeliac);
    setPregnancy(profile.pregnancy);
    setBreastfeeding(profile.breastfeeding);
    setDiabetes(profile.diabetes);
    setClinician(profile.clinicianInstructions);
    setConsent(true);
  }
  if (!snapshot && !error)
    return (
      <div className="meal-loading" role="status">
        {t("Loading your kitchen…")}
      </div>
    );
  const field = (
    text: string,
    value: string,
    change: (v: string) => void,
    type = "text",
  ) => (
    <label>
      {t(text)}
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
  return (
    <MealTaskFeedbackContext.Provider
      value={{
        error: t(error),
        busy,
        retry,
        pending: !!pending.current,
        review:
          pending.current?.baseVersion !== undefined
            ? reviewSavedDraft
            : undefined,
      }}
    >
      <div className="meal-workbench">
        <header className="meal-heading">
          <div>
            <h1>
              {t(
                tab === "agenda"
                  ? "Agenda"
                  : tab === "pantry"
                    ? "Pantry"
                    : tab === "profiles"
                      ? "Diners"
                      : tab === "history"
                        ? "Journal"
                        : "Shopping list",
              )}
            </h1>
          </div>
        </header>
        <nav
          className="meal-visible-nav"
          aria-label={locale === "fr" ? "Votre cuisine" : "Your kitchen"}
        >
          {[
            ["agenda", "Agenda", BookOpen],
            ["history", "Journal", History],
            ["profiles", locale === "fr" ? "Foyer" : "Household", Users],
          ].map(([key, label, Glyph]) => {
            const Icon = Glyph as typeof BookOpen;
            return (
              <button
                key={String(key)}
                type="button"
                aria-current={tab === key ? "page" : undefined}
                onClick={() => setTab(String(key))}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{String(label)}</span>
              </button>
            );
          })}
        </nav>
        {!busy && (error || pending.current) && (
          <div className="error" role="alert">
            <p>
              {error
                ? t(error)
                : locale === "fr"
                  ? "Modification à vérifier"
                  : "Review saved change"}
            </p>
            <button
              className="button secondary"
              onClick={retry}
              disabled={busy}
            >
              {t("Retry saved change")}
            </button>
            {pending.current?.baseVersion !== undefined && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={reviewSavedDraft}
              >
                {t("Refresh and review saved draft")}
              </button>
            )}
            <button
              className="text-button"
              onClick={() => {
                pending.current = null;
                void reload();
              }}
            >
              {t("Reload kitchen")}
            </button>
          </div>
        )}
        {message && <p role="status">{t(message)}</p>}
        {!snapshot ? (
          <button onClick={reload}>{t("Retry")}</button>
        ) : (
          <>
            <details hidden={tab !== "profiles"}>
              <summary>{t("Shared kitchen & calendar settings")}</summary>
              <div className="meal-fields">
                <label>
                  {t("Household kitchen")}
                  <select
                    value={snapshot.kitchenId}
                    onChange={(e) => setKitchenId(e.target.value)}
                  >
                    {snapshot.kitchens.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.owner.username}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {t(
                    "Granted households appear in each member’s kitchen selector.",
                  )}
                </p>
                {field("Timezone", snapshot.state.timezone, (v) =>
                  setSnapshot({
                    ...snapshot,
                    state: { ...snapshot.state, timezone: v },
                  }),
                )}
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    mutate("settings", {
                      timezone: snapshot.state.timezone,
                      units: snapshot.state.units,
                    })
                  }
                >
                  {t("Save calendar settings")}
                </button>
                {snapshot.members.map((m) => (
                  <div key={m.userId}>
                    {m.user.username} · {t(m.role)}
                    {m.role !== "owner" && (
                      <button
                        onClick={() =>
                          mutate("remove-member", { userId: m.userId })
                        }
                      >
                        {t("Remove")}
                      </button>
                    )}
                  </div>
                ))}
                <MemberForm mutate={mutate} friends={snapshot.friends} />
              </div>
            </details>

            {tab === "agenda" && (
              <MealAgenda
                snapshot={snapshot}
                recipes={recipes}
                day={activeDay}
                onDay={(day) => {
                  setActiveDay(day);
                  setDate(day);
                }}
                from={from}
                onWeek={setFrom}
                busy={busy}
                mutate={mutate}
                suggest={suggest}
                onJournal={() => setTab("history")}
                tools={{
                  eaten: (
                    <MealEaten
                      key={activeDay}
                      recipes={recipes}
                      date={activeDay}
                      plans={snapshot.state.plans}
                      profiles={snapshot.profiles.map((p) => ({
                        id: p.id,
                        name: (p.data as unknown as Profile).name,
                      }))}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  week: (
                    <MealWeekPreview
                      plans={weeklyPreview}
                      setPlans={setWeeklyPreview}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  checkin: (
                    <MealCheckIn
                      state={snapshot.state}
                      profiles={snapshot.profiles.map(
                        (p) => p.data as unknown as Profile,
                      )}
                      actorId={snapshot.actorId}
                      kitchenId={snapshot.kitchenId}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  context: (
                    <MealContext
                      key={activeDay}
                      date={activeDay}
                      equipmentDefault={
                        snapshot.state.contexts
                          ?.filter(
                            (c) =>
                              c.actorId === snapshot.actorId &&
                              c.date < activeDay,
                          )
                          .sort((a, b) => b.date.localeCompare(a.date))[0]
                          ?.equipment ?? []
                      }
                      context={snapshot.state.contexts?.find(
                        (c) =>
                          c.date === activeDay &&
                          c.actorId === snapshot.actorId,
                      )}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  rescue: (
                    <MealRescue
                      kitchenId={snapshot.kitchenId}
                      state={snapshot.state}
                      from={from}
                      to={dayAfter(from, 6)}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  prepare: (
                    <MealPreparation
                      key={activeDay}
                      selectedDate={activeDay}
                      recipes={recipes}
                      state={snapshot.state}
                      actorId={snapshot.actorId}
                      members={snapshot.members}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  leftovers: (
                    <MealLeftovers
                      selectedDate={activeDay}
                      leftovers={snapshot.state.leftovers}
                      profiles={snapshot.profiles.map((p) => ({
                        id: p.id,
                        name: (p.data as unknown as Profile).name,
                      }))}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  nutrition: (
                    <MealDailyNutrition
                      snapshot={{
                        ...snapshot,
                        dailyNutrition: snapshot.dailyNutrition.filter(
                          (d) => d.date === activeDay,
                        ),
                        nutrition: snapshot.nutrition.filter(
                          (n) => n.date === activeDay,
                        ),
                      }}
                      mutate={mutate}
                      busy={busy}
                    />
                  ),
                  ideas: (
                    <>
                      {busy && (
                        <p role="status">
                          {locale === "fr"
                            ? "Recherche de repas…"
                            : "Finding meal ideas…"}
                        </p>
                      )}
                      {suggestionReason && (
                        <p className="small-note">
                          {suggestionReason ===
                          "practical-candidates-not-medical-assessment"
                            ? locale === "fr"
                              ? "Adéquation médicale non évaluée"
                              : "Health suitability unassessed"
                            : locale === "fr"
                              ? "Aucune proposition"
                              : "No suggestions"}
                        </p>
                      )}
                      <section aria-label="Stock">
                        <div className="meal-choice-chips">
                          {snapshot.state.pantry
                            .filter(
                              (b, i, batches) =>
                                batches.findIndex(
                                  (other) => other.name === b.name,
                                ) === i,
                            )
                            .map((b) => (
                              <button
                                type="button"
                                key={b.id}
                                aria-pressed={selectedPantry.includes(b.name)}
                                onClick={() =>
                                  setSelectedPantry(
                                    selectedPantry.includes(b.name)
                                      ? selectedPantry.filter(
                                          (n) => n !== b.name,
                                        )
                                      : [...selectedPantry, b.name],
                                  )
                                }
                              >
                                {b.name}
                              </button>
                            ))}
                        </div>
                        <button
                          className="button secondary"
                          disabled={busy || !selectedPantry.length}
                          onClick={() => suggest()}
                        >
                          {locale === "fr" ? "Actualiser" : "Refresh"}
                        </button>
                      </section>
                      <MealPlanEditor
                        draftKey={`recipe-buddy:meal-ideas:v2:${snapshot.actorId}:${snapshot.kitchenId}:${activeDay}`}
                        recipes={suggestions}
                        diners={snapshot.diners}
                        date={activeDay}
                        plan={null}
                        external={false}
                        busy={busy}
                        onSave={async (p) => {
                          const source = suggestions.find(
                            (r) => r.id === p.recipeId,
                          );
                          return await mutate("plan", {
                            ...p,
                            suggested: true,
                            recipeVersion: source?.recipeVersion,
                          });
                        }}
                      />
                      <MealDiscovery
                        kitchenId={snapshot.kitchenId}
                        diners={diners}
                        ingredients={selectedPantry}
                        servings={servings}
                      />
                    </>
                  ),
                }}
              />
            )}
            {tab === "pantry" && (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    setBatchId("");
                    setName("");
                    setQuantity("");
                    setQuantityEstimated(false);
                    setBrand("");
                    setLabel("");
                    setProductEvidence(null);
                    setPackageDate("");
                    setPackageSize("");
                    setOpened("");
                    setFrozen("");
                    setDateType("unknown");
                    setStorage("pantry");
                    setUnit("g");
                    setTask("pantry");
                  }}
                >
                  <Plus size={18} />
                  {locale === "fr" ? "Ajouter un ingrédient" : "Add ingredient"}
                </button>
                {task === "pantry" && (
                  <MealTaskSheet
                    title={t(batchId ? "Edit batch" : "Add pantry batch")}
                    onClose={() => setTask("")}
                  >
                    <form
                      className="meal-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await mutate("pantry", {
                            id: batchId || crypto.randomUUID(),
                            name,
                            quantity: quantity === "" ? null : Number(quantity),
                            quantityEstimated,
                            unit,
                            brand,
                            label,
                            storage,
                            evidence: productEvidence,
                            date: packageDate || null,
                            dateType,
                            packageSize: packageSize
                              ? Number(packageSize)
                              : null,
                            opened: opened || null,
                            frozen: frozen || null,
                          })
                        ) {
                          setTask("");
                          setName("");
                          setQuantity("");
                          setQuantityEstimated(false);
                          setBatchId("");
                          setProductEvidence(null);
                          setBrand("");
                          setLabel("");
                          setPackageDate("");
                          setPackageSize("");
                          setOpened("");
                          setFrozen("");
                        }
                      }}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={quantityEstimated}
                          onChange={(e) =>
                            setQuantityEstimated(e.target.checked)
                          }
                        />
                        {locale === "fr"
                          ? "Quantité estimée · à vérifier avant utilisation"
                          : "Estimated quantity · review before use"}
                      </label>
                      <div className="meal-fields">
                        {field("Ingredient", name, setName)}
                        {field(
                          "Quantity (leave blank for presence)",
                          quantity,
                          setQuantity,
                          "number",
                        )}
                        {field("Unit", unit, setUnit)}
                        <label>
                          {t("Storage")}
                          <select
                            value={storage}
                            onChange={(e) => setStorage(e.target.value)}
                          >
                            {["pantry", "fridge", "freezer"].map((s) => (
                              <option key={s}>{t(s)}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <details>
                        <summary>{t("Product, label & dates")}</summary>
                        <div className="meal-fields">
                          {field("Brand / variant", brand, setBrand)}
                          {field("Barcode", barcode, setBarcode)}
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || !barcode}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                const p = await request<
                                  NonNullable<Batch["evidence"]>
                                >("/api/meals/product", "POST", { barcode });
                                setName(p.name);
                                setBrand(p.brand);
                                setLabel(p.label);
                                setProductEvidence(p);
                                setMessage(
                                  "Check the package label before saving. Open Food Facts · ODbL / Database Contents License.",
                                );
                              } catch (e) {
                                setError(
                                  e instanceof Error ? e.message : "Try again.",
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {t("Look up barcode")}
                          </button>
                          {field(
                            "Label composition & allergens",
                            label,
                            setLabel,
                          )}
                          {field(
                            "Package date",
                            packageDate,
                            setPackageDate,
                            "date",
                          )}
                          {field(
                            "Package size",
                            packageSize,
                            setPackageSize,
                            "number",
                          )}
                          {field("Opened date", opened, setOpened, "date")}
                          {field("Frozen date", frozen, setFrozen, "date")}
                          <label>
                            {t("Date type")}
                            <select
                              value={dateType}
                              onChange={(e) => setDateType(e.target.value)}
                            >
                              {["unknown", "use-by", "best-before"].map((v) => (
                                <option key={v} value={v}>
                                  {t(v)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p>
                            {t(
                              "Dates and labels do not certify food safety. Cross-contact is unknown until confirmed.",
                            )}
                          </p>
                        </div>
                      </details>
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          !name.trim() ||
                          (quantity !== "" && Number(quantity) < 0)
                        }
                      >
                        {t(batchId ? "Save batch" : "Add batch")}
                      </button>
                    </form>
                  </MealTaskSheet>
                )}
                {snapshot.state.pantry.length === 0 && (
                  <p>
                    {t(
                      "Your pantry is empty. Add what you have, with or without a quantity.",
                    )}
                  </p>
                )}
                {snapshot.state.pantry.map((b) => (
                  <article className="meal-row" key={b.id}>
                    <h3>{b.name}</h3>
                    <p>
                      {b.quantity === null
                        ? t("Presence only")
                        : new Intl.NumberFormat(locale).format(b.quantity) +
                          " " +
                          b.unit}{" "}
                      · {t(b.storage)} {b.brand}
                      {b.quantityEstimated && (
                        <span>
                          {" "}
                          ·{" "}
                          {locale === "fr"
                            ? "Estimation · à vérifier"
                            : "Estimate · review required"}
                        </span>
                      )}
                    </p>
                    {b.label && <p>{b.label}</p>}
                    <button
                      className="text-button"
                      onClick={() => {
                        setTask("pantry");
                        setBatchId(b.id);
                        setQuantityEstimated(!!b.quantityEstimated);
                        setProductEvidence(b.evidence);
                        setName(b.name);
                        setQuantity(
                          b.quantity === null ? "" : String(b.quantity),
                        );
                        setUnit(b.unit);
                        setBrand(b.brand);
                        setLabel(b.label);
                        setStorage(b.storage);
                        setPackageDate(b.date ?? "");
                        setOpened(b.opened ?? "");
                        setFrozen(b.frozen ?? "");
                        setDateType(b.dateType);
                        setPackageSize(
                          b.packageSize === null ? "" : String(b.packageSize),
                        );
                      }}
                    >
                      {t("Edit batch")}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setStockEdit(b);
                        setStockDelta("");
                      }}
                    >
                      {t("Use / discard / correct")}
                    </button>
                  </article>
                ))}
                {stockEdit && (
                  <MealTaskSheet
                    title={stockEdit.name}
                    onClose={() => setStockEdit(null)}
                  >
                    <form
                      className="meal-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await mutate(
                            "stock",
                            {
                              id: stockEdit.id,
                              delta: Number(stockDelta),
                              reason: "correction",
                            },
                            false,
                          )
                        )
                          setStockEdit(null);
                      }}
                    >
                      {field(
                        "Quantity change (negative to use)",
                        stockDelta,
                        setStockDelta,
                        "number",
                      )}
                      <button
                        className="button primary"
                        disabled={busy || stockDelta === ""}
                      >
                        {t("Save correction")}
                      </button>
                    </form>
                  </MealTaskSheet>
                )}
                {snapshot.state.history
                  .filter((h) => !h.reversed && h.action === "stock")
                  .slice(-5)
                  .map((h) => (
                    <button
                      key={h.id}
                      className="text-button"
                      onClick={() => mutate("undo-stock", { id: h.id }, false)}
                    >
                      {t("Undo stock change")} ·{" "}
                      {new Date(h.date).toLocaleString(locale)}
                    </button>
                  ))}
              </>
            )}
            {tab === "shopping" && (
              <>
                <div className="meal-calendar-heading">
                  <h2>
                    {locale === "fr" ? "Pour cette semaine" : "For this week"}
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => setTask("commerce")}
                  >
                    {locale === "fr"
                      ? "Services et tickets"
                      : "Services & receipts"}
                  </button>
                </div>
                {task === "commerce" && (
                  <MealTaskSheet
                    title={
                      locale === "fr" ? "Services d’achat" : "Shopping services"
                    }
                    onClose={() => setTask("")}
                  >
                    <MealCommerce
                      state={snapshot.state}
                      kitchenId={snapshot.kitchenId}
                      version={snapshot.version}
                      needs={snapshot.shopping.needs}
                      from={from}
                      to={dayAfter(from, 6)}
                      mutate={mutate}
                      busy={busy}
                      reload={reload}
                      receiptChecks={snapshot.receiptChecks}
                    />
                  </MealTaskSheet>
                )}
                {snapshot.shopping.needs.map((need, n) => (
                  <article key={n} className="meal-row">
                    <h3>{need.name}</h3>
                    <p>
                      {need.quantity === null
                        ? t("Check quantities")
                        : new Intl.NumberFormat(locale).format(need.quantity) +
                          " " +
                          need.unit}{" "}
                      · {t("First needed")} {need.firstDate}
                    </p>
                    <small>
                      {need.meals
                        .map(
                          (id) =>
                            snapshot.state.plans.find((p) => p.id === id)
                              ?.title,
                        )
                        .join(", ")}
                    </small>
                    <PurchaseForm
                      name={need.name}
                      unit={need.unit}
                      mutate={mutate}
                      busy={busy}
                    />
                  </article>
                ))}
                {snapshot.shopping.needs.length === 0 && (
                  <p>{t("No generated shopping needs in this window.")}</p>
                )}
                <ManualShopping
                  items={snapshot.state.manualShopping}
                  mutate={mutate}
                  busy={busy}
                />
              </>
            )}
            {tab === "profiles" && (
              <>
                <p className="small-note">
                  {locale === "fr"
                    ? "Préférences et restrictions privées."
                    : "Private preferences and restrictions."}
                </p>
                <button
                  className="button primary"
                  onClick={() => {
                    setProfileId("");
                    setProfileName("");
                    setAgeBand("adult");
                    setAllergies("");
                    setIntolerances("");
                    setCoeliac(false);
                    setPregnancy(false);
                    setBreastfeeding(false);
                    setDiabetes("none");
                    setClinician("");
                    setConsent(false);
                    setCaregiver(false);
                    setDislikes("");
                    setEquipment("");
                    setRoutine("");
                    setOtherConditions("");
                    setTask("profile");
                  }}
                >
                  <Plus size={18} />
                  {locale === "fr" ? "Ajouter une personne" : "Add person"}
                </button>
                {task === "profile" && (
                  <MealTaskSheet
                    title={locale === "fr" ? "Profil privé" : "Private profile"}
                    onClose={() => setTask("")}
                  >
                    <form
                      className="meal-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await mutate("profile", {
                            id: profileId || crypto.randomUUID(),
                            name: profileName,
                            ageBand,
                            country,
                            consent,
                            caregiverAuthorized: caregiver,
                            dislikes: dislikes
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                            equipment,
                            routine,
                            otherConditions,
                            allergies: allergies
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                            intolerances: intolerances
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                            coeliac,
                            pregnancy,
                            breastfeeding,
                            diabetes,
                            clinicianInstructions: clinician,
                          })
                        ) {
                          setProfileId("");
                          setTask("");
                          setProfileName("");
                        }
                      }}
                    >
                      <div className="meal-fields">
                        {field("Name", profileName, setProfileName)}
                        <fieldset className="meal-choice-chips">
                          <legend>{t("Age band")}</legend>
                          {["adult", "child", "under5", "infant"].map((age) => (
                            <button
                              type="button"
                              key={age}
                              aria-pressed={ageBand === age}
                              onClick={() => setAgeBand(age)}
                            >
                              {t(age)}
                            </button>
                          ))}
                        </fieldset>
                      </div>
                      <details>
                        <summary>
                          {t("Restrictions & clinician instructions")}
                        </summary>
                        <div className="meal-fields">
                          {field("Guidance country", country, setCountry)}
                          {field(
                            "Allergies (comma separated)",
                            allergies,
                            setAllergies,
                          )}
                          {field(
                            "Intolerances (comma separated)",
                            intolerances,
                            setIntolerances,
                          )}
                          <label>
                            {t("Diabetes category")}
                            <select
                              value={diabetes}
                              onChange={(e) => setDiabetes(e.target.value)}
                            >
                              {[
                                "none",
                                "type1",
                                "type2",
                                "gestational",
                                "preexisting-pregnancy",
                              ].map((s) => (
                                <option value={s} key={s}>
                                  {t(s)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {field(
                            "Clinician instructions",
                            clinician,
                            setClinician,
                          )}
                          {field(
                            "Other declared conditions",
                            otherConditions,
                            setOtherConditions,
                          )}
                          {field("Disliked ingredients", dislikes, setDislikes)}
                          {field("Cooking equipment", equipment, setEquipment)}
                          {field("Practical routine", routine, setRoutine)}
                        </div>
                        {[
                          [coeliac, setCoeliac, "Coeliac disease"],
                          [pregnancy, setPregnancy, "Pregnancy"],
                          [breastfeeding, setBreastfeeding, "Breastfeeding"],
                        ].map(([value, change, text]) => (
                          <label className="check-row" key={String(text)}>
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) =>
                                (change as (v: boolean) => void)(
                                  e.target.checked,
                                )
                              }
                            />
                            {t(String(text))}
                          </label>
                        ))}
                      </details>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />
                        {t(
                          "I agree to private health-data use for restriction checks. These details are not sent to AI or friends. I can delete this profile to withdraw.",
                        )}
                      </label>
                      {ageBand !== "adult" && (
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={caregiver}
                            onChange={(e) => setCaregiver(e.target.checked)}
                          />
                          {t(
                            "I am authorized to manage this child’s private profile.",
                          )}
                        </label>
                      )}
                      <button
                        className="button primary"
                        disabled={
                          busy ||
                          !consent ||
                          !profileName.trim() ||
                          (ageBand !== "adult" && !caregiver)
                        }
                      >
                        {t("Save diner")}
                      </button>
                    </form>
                  </MealTaskSheet>
                )}
                {snapshot.profiles.map((p) => (
                  <article key={p.id} className="meal-row">
                    <h3>{(p.data as unknown as Profile).name}</h3>
                    <button
                      className="text-button"
                      onClick={() => {
                        loadProfile(p.data as unknown as Profile);
                        setTask("profile");
                      }}
                    >
                      {t("Edit")}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => mutate("delete-profile", { id: p.id })}
                    >
                      {t("Delete private profile & eating history")}
                    </button>
                  </article>
                ))}
                <details>
                  <summary>{t("Health coverage & review status")}</summary>
                  <p>
                    {t(
                      "Validated countries: none. Europe and US modules require country, age, condition and combination review. Infant and therapeutic diets are unsupported.",
                    )}
                  </p>
                  <p>
                    {t("Rule version")}: {snapshot.coverage.version}
                  </p>
                  <ul>
                    {snapshot.coverage.modules.map((m) => (
                      <li key={m.condition}>
                        {t(m.condition)} · {t(m.status)}
                      </li>
                    ))}
                  </ul>
                  <ul>
                    {snapshot.coverage.sources.map((s) => (
                      <li key={s.id}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s.id}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
                <button
                  className="button secondary"
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(snapshot, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "recipe-buddy-private-meals.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  {t("Export my meal data")}
                </button>
              </>
            )}
            {tab === "history" && (
              <>
                <button
                  className="text-button"
                  onClick={() => setTask("nutrition")}
                >
                  {locale === "fr" ? "Nutrition du jour" : "Daily nutrition"}
                </button>
                {task === "nutrition" && (
                  <MealTaskSheet
                    title={
                      locale === "fr"
                        ? "Nutrition quotidienne"
                        : "Daily nutrition"
                    }
                    onClose={() => setTask("")}
                  >
                    <MealDailyNutrition
                      snapshot={{
                        ...snapshot,
                        dailyNutrition: snapshot.dailyNutrition.filter(
                          (d) => d.date === activeDay,
                        ),
                        nutrition: snapshot.nutrition.filter(
                          (n) => n.date === activeDay,
                        ),
                      }}
                      mutate={mutate}
                      busy={busy}
                    />
                  </MealTaskSheet>
                )}
                <div className="meal-calendar-heading">
                  <label className="meal-journal-date">
                    <span>{locale === "fr" ? "Jour" : "Day"}</span>
                    <input
                      type="date"
                      value={activeDay}
                      onChange={(e) => {
                        if (e.target.value) {
                          setActiveDay(e.target.value);
                          setDate(e.target.value);
                          setFrom(agendaWeekStart(e.target.value));
                        }
                      }}
                    />
                  </label>
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setDate(activeDay);
                    setTask("eating");
                  }}
                >
                  <Plus size={18} />
                  {locale === "fr" ? "Noter un repas mangé" : "Record eating"}
                </button>
                {task === "eating" && (
                  <MealTaskSheet
                    title={locale === "fr" ? "Repas consommé" : "Record eating"}
                    onClose={() => setTask("")}
                  >
                    <MealEaten
                      key={activeDay}
                      recipes={recipes}
                      date={activeDay}
                      plans={snapshot.state.plans}
                      profiles={snapshot.profiles.map((p) => ({
                        id: p.id,
                        name: (p.data as unknown as Profile).name,
                      }))}
                      mutate={mutate}
                      busy={busy}
                      onSaved={() => setTask("")}
                    />
                  </MealTaskSheet>
                )}
                <p>
                  {t(
                    "Unlogged meals are unknown. Cooking does not mean eating.",
                  )}
                </p>
                {snapshot.state.occasions
                  .slice()
                  .reverse()
                  .filter((o) => o.date === activeDay)
                  .map((o) => (
                    <article key={o.id} className="meal-row">
                      <h3>{o.title}</h3>
                      <p>
                        {o.date} · {portionLabel(o.servings, true)} ·{" "}
                        {t(o.undone ? "Undone" : "Cooked")}
                      </p>
                      {o.unresolved.length > 0 && (
                        <p>
                          {t("Pantry reconciliation needed")}:{" "}
                          {o.unresolved.map((u) => u.name).join(", ")}
                        </p>
                      )}
                      {!o.undone && (
                        <div className="meal-row-actions">
                          <button
                            className="text-button"
                            onClick={() => followUp(o)}
                          >
                            {t("Photo, rating & follow-up")}
                          </button>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              mutate("undo-cook", { id: o.id }, false)
                            }
                          >
                            {t("Undo cooking")}
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                {snapshot.state.eaten
                  .filter((e) => e.date === activeDay)
                  .map((e) => (
                    <article key={e.id} className="meal-row">
                      <h3>{e.title}</h3>
                      <p>
                        {e.date} · {t(e.slot)} · {t("Eaten")}
                      </p>
                      <button
                        className="text-button"
                        onClick={() =>
                          mutate("remove-eaten", { id: e.id }, false)
                        }
                      >
                        {t("Remove eating record")}
                      </button>
                    </article>
                  ))}
              </>
            )}
            {follow && (
              <MealTaskSheet
                title={follow.title}
                onClose={() => setFollow(null)}
              >
                <section className="meal-form">
                  <details>
                    <summary>{t("Correct cooking & reconcile stock")}</summary>
                    <div className="meal-fields">
                      {field(
                        "Servings prepared",
                        cookedServings,
                        setCookedServings,
                        "number",
                      )}
                      {field("Date", cookedDate, setCookedDate, "date")}
                      {field("Timezone", cookedTimezone, setCookedTimezone)}
                    </div>
                    {actual.map((i, index) => (
                      <div key={index} className="meal-fields">
                        {field("Actual ingredient", i.name, (v) =>
                          setActual((rows) =>
                            rows.map((r, n) =>
                              n === index ? { ...r, name: v } : r,
                            ),
                          ),
                        )}
                        {field("Reference recipe quantity", i.quantity, (v) =>
                          setActual((rows) =>
                            rows.map((r, n) =>
                              n === index ? { ...r, quantity: v } : r,
                            ),
                          ),
                        )}
                        {field("Unit", i.unit, (v) =>
                          setActual((rows) =>
                            rows.map((r, n) =>
                              n === index ? { ...r, unit: v } : r,
                            ),
                          ),
                        )}
                        <label>
                          <input
                            type="checkbox"
                            checked={!!i.omitted}
                            onChange={(e) =>
                              setActual((rows) =>
                                rows.map((r, n) =>
                                  n === index
                                    ? { ...r, omitted: e.target.checked }
                                    : r,
                                ),
                              )
                            }
                          />
                          {t("Not used")}
                        </label>
                      </div>
                    ))}
                    <button
                      className="button secondary"
                      disabled={busy || Number(cookedServings) <= 0}
                      onClick={() =>
                        mutate(
                          "edit-cook",
                          {
                            id: follow.id,
                            recipeId: follow.recipeId,
                            servings: Number(cookedServings),
                            date: cookedDate,
                            timezone: cookedTimezone,
                            ingredients: actual,
                          },
                          false,
                        )
                      }
                    >
                      {t("Save cooking correction")}
                    </button>
                  </details>
                  <p>
                    {t(
                      "Cooking is saved. These details are optional and do not affect chef points.",
                    )}
                  </p>
                  <RecipePhotoInput
                    value={photo}
                    onChange={setPhoto}
                    onBusy={setPhotoBusy}
                  />
                  <label>
                    {t("Personal enjoyment rating")}
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    >
                      <option value="">{t("Not rated")}</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  {field("Private comment", comment, setComment)}
                  <button
                    className="button primary"
                    disabled={busy || photoBusy}
                    onClick={() =>
                      mutate(
                        "follow-up",
                        {
                          id: follow.id,
                          photo,
                          rating: rating ? Number(rating) : null,
                          comment,
                        },
                        false,
                      )
                    }
                  >
                    {t("Save optional details")}
                  </button>
                  <details>
                    <summary>{t("I also ate this")}</summary>
                    <label>
                      {t("Person")}
                      <select
                        value={person}
                        onChange={(e) => setPerson(e.target.value)}
                      >
                        <option value="">{t("Choose diner")}</option>
                        {snapshot.profiles.map((p) => (
                          <option value={p.id} key={p.id}>
                            {(p.data as unknown as Profile).name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {field("Date", date, setDate, "date")}
                    {field(
                      "Amount (optional servings)",
                      ateAmount,
                      setAteAmount,
                      "number",
                    )}
                    <button
                      className="button secondary"
                      disabled={busy || !person}
                      onClick={() =>
                        mutate(
                          "eat",
                          {
                            id: crypto.randomUUID(),
                            personId: person,
                            date,
                            slot,
                            title: follow.title,
                            occasionId: follow.id,
                            amount: ateAmount ? Number(ateAmount) : null,
                          },
                          false,
                        )
                      }
                    >
                      {t("Save eating record")}
                    </button>
                  </details>
                  <details>
                    <summary>{t("Keep leftovers")}</summary>
                    {field(
                      "Servings remaining",
                      leftoverAmount,
                      setLeftoverAmount,
                      "number",
                    )}
                    <button
                      className="button secondary"
                      disabled={busy || !leftoverAmount}
                      onClick={() =>
                        mutate(
                          "leftover",
                          {
                            id: crypto.randomUUID(),
                            occasionId: follow.id,
                            title: follow.title,
                            remaining: Number(leftoverAmount),
                            storage: "fridge",
                            date: null,
                          },
                          false,
                        )
                      }
                    >
                      {t("Save leftover batch")}
                    </button>
                  </details>
                  <details>
                    <summary>{t("Share a result with friends")}</summary>
                    {field("Published caption", caption, setCaption)}
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={sharePhoto}
                        onChange={(e) => setSharePhoto(e.target.checked)}
                      />
                      {t("Publish photo")}
                    </label>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={shareRating}
                        onChange={(e) => setShareRating(e.target.checked)}
                      />
                      {t("Publish personal rating")}
                    </label>
                    <p>
                      {t(
                        "Only the caption and selected fields will be published. Private comments, eating and health data stay private. Recipe access is separate.",
                      )}
                    </p>
                    <button
                      className="button secondary"
                      disabled={busy || !caption.trim()}
                      onClick={async () => {
                        if (
                          !(await mutate(
                            "follow-up",
                            {
                              id: follow.id,
                              photo,
                              rating: rating ? Number(rating) : null,
                              comment,
                            },
                            false,
                          ))
                        )
                          return;
                        try {
                          await request("/api/meals/activity", "POST", {
                            id: crypto.randomUUID(),
                            kitchenId: snapshot.kitchenId,
                            occasionId: follow.id,
                            caption,
                            includePhoto: sharePhoto,
                            includeRating: shareRating,
                            includeRecipe: false,
                          });
                          setMessage("Shared with friends");
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Try again.",
                          );
                        }
                      }}
                    >
                      {t("Publish selected fields")}
                    </button>
                  </details>
                  <button
                    className="text-button"
                    onClick={() => setFollow(null)}
                  >
                    {t("Close")}
                  </button>
                </section>
              </MealTaskSheet>
            )}
          </>
        )}
      </div>
    </MealTaskFeedbackContext.Provider>
  );
}
function MemberForm({
  mutate,
  friends,
}: {
  friends: { id: string; username: string }[];
  mutate: (
    action: string,
    data: unknown,
    version?: boolean,
  ) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [id, setId] = useState(""),
    [role, setRole] = useState("planner");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void mutate("member", { userId: id, role });
      }}
    >
      <label>
        {t("Accepted friend")}
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">{t("Choose friend")}</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.username}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Role")}
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {["planner", "shopper", "member"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <button className="button secondary" disabled={!id}>
        {t("Grant household role")}
      </button>
    </form>
  );
}
function PurchaseForm({
  name,
  unit,
  mutate,
  busy,
}: {
  name: string;
  unit: string;
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [open, setOpen] = useState(false),
    [amount, setAmount] = useState(""),
    [actual, setActual] = useState(name),
    [actualUnit, setActualUnit] = useState(unit);
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        {text("Record purchase", "Noter l’achat")}
      </button>
      {open && (
        <MealTaskSheet title={name} onClose={() => setOpen(false)}>
          <form
            className="meal-simple-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(
                  "purchase",
                  {
                    id: crypto.randomUUID(),
                    name: actual,
                    quantity: Number(amount),
                    unit: actualUnit,
                    date: today(),
                  },
                  false,
                )
              ) {
                setAmount("");
                setOpen(false);
              }
            }}
          >
            <label>
              {text("Actual quantity", "Quantité achetée")}
              <input
                type="number"
                required
                min="0.001"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <p className="small-note">{actualUnit}</p>
            <details>
              <summary>
                {text("Different product or unit", "Autre produit ou unité")}
              </summary>
              <label>
                {text("Product", "Produit")}
                <input
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </label>
              <label>
                {text("Unit", "Unité")}
                <input
                  value={actualUnit}
                  onChange={(e) => setActualUnit(e.target.value)}
                />
              </label>
            </details>
            <button
              className="button primary"
              disabled={busy || !(Number(amount) > 0)}
            >
              {text("Confirm purchase", "Confirmer l’achat")}
            </button>
          </form>
        </MealTaskSheet>
      )}
    </>
  );
}
function ManualShopping({
  items,
  mutate,
  busy,
}: {
  items: Snapshot["state"]["manualShopping"];
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  busy: boolean;
}) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button className="button primary" onClick={() => setOpen(true)}>
        <Plus size={18} />
        {locale === "fr" ? "Ajouter" : "Add item"}
      </button>
      {open && (
        <MealTaskSheet
          title={locale === "fr" ? "Ajouter" : "Add item"}
          onClose={() => setOpen(false)}
        >
          <form
            className="meal-fields"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate("manual-shopping", {
                  id: crypto.randomUUID(),
                  name,
                  quantity: "",
                  checked: false,
                })
              ) {
                setName("");
                setOpen(false);
              }
            }}
          >
            <label>
              {locale === "fr" ? "Article" : "Item"}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="button secondary" disabled={busy || !name}>
              {locale === "fr" ? "Ajouter" : "Add item"}
            </button>
          </form>
        </MealTaskSheet>
      )}
      {items.map((i) => (
        <div className="meal-row" key={i.id}>
          <label className="check-row">
            <input
              type="checkbox"
              checked={i.checked}
              onChange={(e) =>
                mutate("manual-shopping", { ...i, checked: e.target.checked })
              }
            />
            {i.name}
          </label>
          <button
            className="text-button"
            onClick={() => mutate("remove-shopping", { id: i.id })}
          >
            {t("Remove")}
          </button>
        </div>
      ))}
    </section>
  );
}
