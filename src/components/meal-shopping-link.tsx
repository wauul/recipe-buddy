"use client";
import Link from "next/link";
import { useTranslation } from "./language-provider";
export function MealShoppingLink() {
  const { t } = useTranslation();
  return (
    <Link className="button secondary" href="/agenda">
      {t("Agenda")} · {t("Pantry")} · {t("Connected shopping")}
    </Link>
  );
}
