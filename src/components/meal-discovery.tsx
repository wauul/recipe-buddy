"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/lib/client";
import { useTranslation } from "./language-provider";
type Candidate = {
  token: string;
  title: string;
  servings: number;
  source: { url: string; publisher: string; license: string };
  missing: {
    name: string;
    missing: number | null;
    unit: string;
    reason: string;
  }[];
  reasons: string[];
};
export function MealDiscovery({
  kitchenId,
  diners,
  ingredients,
  servings,
}: {
  kitchenId: string;
  diners: string[];
  ingredients: string[];
  servings: number;
}) {
  const { t,locale } = useTranslation(),
    router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const [reviewSources,setReviewSources]=useState<{url:string;publisher:string;reason:string}[]>([]);
  return (
    <details>
      <summary>{t("Find new recipes online · Pro")}</summary>
      <p>
        {t(
          "Search shares only selected ingredient names and country with the provider. Health profiles and your diary stay on our server.",
        )}
      </p>
      <button
        className="button secondary"
        disabled={busy || !ingredients.length}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await request<{
              candidates: Candidate[];
              reason: string;
              reviewSources:{url:string;publisher:string;reason:string}[];
            }>("/api/meals/discovery", "POST", {
              kitchenId,
              diners,
              ingredients,
              servings,
            });
            setCandidates(r.candidates);
            setReviewSources(r.reviewSources??[]);
            setStatus(r.reason);
          } catch (e) {
            setStatus(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(busy ? "Loading…" : "Find new recipes online")}
      </button>
      <p role="status">{t(status)}</p>
      {reviewSources.map(s=><article className="meal-row" key={s.url}><strong>{locale==="fr"?"Recette incomplète · vérification manuelle":"Incomplete recipe · manual review"}</strong><p>{locale==="fr"?"Quantités, portions ou instructions manquantes. Vérifiez la source puis saisissez les informations manquantes dans une nouvelle recette. Aucun import ni admissibilité approuvé.":s.reason}</p><a href={s.url} target="_blank" rel="noopener noreferrer">{s.publisher}</a> · <Link href="/recipes/new">{locale==="fr"?"Créer une recette après vérification":"Create a recipe after review"}</Link></article>)}
      {candidates.map((c) => (
        <article className="meal-row" key={c.token}>
          <h3>{c.title}</h3>
          <a href={c.source.url} target="_blank" rel="noopener noreferrer">
            {c.source.publisher}
          </a>
          <p>
            {c.source.license} · {c.servings} {t("Servings")}
          </p>
          <p>{t("Health suitability is not established")}</p>
          <ul>
            {c.missing.map((n, i) => (
              <li key={i}>
                {n.name}: {n.missing ?? t("Unknown")} {n.unit}
              </li>
            ))}
          </ul>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await request<{ id: string }>(
                  "/api/meals/discovery/import",
                  "POST",
                  { token: c.token },
                );
                router.push(`/recipes/${r.id}`);
              } catch (e) {
                setStatus(e instanceof Error ? e.message : "Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Import this recipe")}
          </button>
        </article>
      ))}
    </details>
  );
}
