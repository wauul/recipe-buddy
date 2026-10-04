"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { CookingPot } from "lucide-react";
import { request } from "@/lib/client";
import { useTranslation } from "./language-provider";
export function CookingOccasion({
  recipeId,
  servings,
}: {
  recipeId: string;
  servings: number;
}) {
  const { t } = useTranslation(),
    [open, setOpen] = useState(false),
    [amount, setAmount] = useState(servings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [unresolved, setUnresolved] = useState(false);
  const operation = useRef<{
    operationId: string;
    action: string;
    data: unknown;
  } | null>(null);
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!operation.current)
        operation.current = {
          operationId: crypto.randomUUID(),
          action: "cook",
          data: {
            id: crypto.randomUUID(),
            recipeId,
            servings: amount,
            date: new Intl.DateTimeFormat("en-CA").format(new Date()),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };
      const result = await request<{
        result: { occasionId: string; unresolved: unknown[] };
      }>("/api/meals", "POST", operation.current);
      setSaved(result.result.occasionId);
      setUnresolved(result.result.unresolved.length > 0);
      operation.current = null;
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cooking-occasion">
      <button
        className="button primary"
        onClick={() => {
          setOpen(!open);
          setSaved("");
        }}
      >
        <CookingPot size={18} />
        {t("Mark as cooked")}
      </button>
      {open && (
        <div className="meal-form">
          <label>
            {t("Servings prepared")}
            <input
              type="number"
              min="0.1"
              max="100"
              step="any"
              value={amount}
              disabled={busy || !!operation.current}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <p>
            {t(
              "Cooking updates known pantry quantities once. Eating is recorded separately.",
            )}
          </p>
          <button
            className="button primary"
            disabled={busy || amount <= 0}
            onClick={save}
          >
            {t(busy ? "Saving…" : "Confirm cooking")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {t(error)} <button onClick={save}>{t("Retry saved change")}</button>
        </p>
      )}
      {saved && (
        <div role="status">
          <p>
            {t(
              unresolved
                ? "Cooking saved. Some pantry quantities need checking."
                : "Cooking saved. Pantry updated.",
            )}
          </p>
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request("/api/meals", "POST", {
                  operationId: crypto.randomUUID(),
                  action: "undo-cook",
                  data: { id: saved },
                });
                setSaved("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Undo cooking")}
          </button>{" "}
          · <Link href="/agenda">{t("Photo, rating & follow-up")}</Link>
        </div>
      )}
    </section>
  );
}
