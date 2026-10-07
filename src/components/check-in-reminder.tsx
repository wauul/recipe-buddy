"use client";
import { useEffect, useState } from "react";
import type { checkInSnapshot } from "@/lib/meal-check-in";
import { reminderDue } from "@/lib/check-in-reminder";
import { useTranslation } from "./language-provider";
type Snapshot = ReturnType<typeof checkInSnapshot>;
export function CheckInReminder({
  actorId,
  kitchenId,
  checkIn,
  mutate,
  controls = true,
}: {
  actorId: string;
  kitchenId: string;
  checkIn: Snapshot | null;
  mutate: (a: string, d: unknown, v?: boolean) => Promise<boolean>;
  controls?: boolean;
}) {
  const { locale } = useTranslation();
  const text = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [value, setValue] = useState(checkIn?.reminder),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setValue(checkIn?.reminder);
  }, [checkIn?.reminder]);
  useEffect(() => {
    if (
      controls ||
      !checkIn?.reminder.enabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    let cancelled = false;
    const key = `rb-check-in:${actorId}:${kitchenId}:notification`;
    const check = async () => {
      try {
        const response = await fetch(
          `/api/meals/check-in?kitchenId=${encodeURIComponent(kitchenId)}`,
        );
        if (!response.ok) return;
        const body = await response.json();
        const current: Snapshot | null = body.checkIn;
        const r = current?.reminder;
        if (
          cancelled ||
          !current ||
          !r?.enabled ||
          !current.total ||
          !reminderDue(r.time, r.quietStart, r.quietEnd, r.timezone)
        )
          return;
        // One generic reminder per local date, even after dismissal/restart.
        const stamp = new Intl.DateTimeFormat("en-CA", {
          timeZone: r.timezone,
        }).format(new Date());
        if (localStorage.getItem(key) === stamp) return;
        const notification = new Notification(
          locale === "fr" ? "Point cuisine" : "Kitchen check-in",
          {
            body:
              locale === "fr"
                ? "Un point facultatif est disponible dans votre cuisine."
                : "An optional check-in is available in your kitchen.",
            tag: `kitchen-check-in:${actorId}`,
          },
        );
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        localStorage.setItem(key, stamp);
      } catch {
        /* Permission/network/storage failure must never imply an answer. */
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [actorId, kitchenId, checkIn?.reminder.enabled, locale, controls]);
  if (!value || !controls) return null;
  return (
    <details>
      <summary>{text("Optional reminders", "Rappels facultatifs")}</summary>
      <div className="meal-simple-form">
        <p>
          {text(
            "Browser reminders work while Agenda or Pantry is open. Android can check in the background when connected; battery settings may delay delivery.",
            "Les rappels du navigateur fonctionnent lorsque l’agenda ou le garde-manger est ouvert. Android peut vérifier en arrière-plan avec une connexion ; l’économie de batterie peut retarder l’envoi.",
          )}
        </p>
        <label>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
          />
          {text("Enable reminders", "Activer les rappels")}
        </label>
        {(
          [
            ["time", text("After", "Après")],
            [
              "quietStart",
              text("Quiet hours start", "Début des heures calmes"),
            ],
            ["quietEnd", text("Quiet hours end", "Fin des heures calmes")],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="time"
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
        <p>{value.timezone}</p>
        <button
          className="button secondary"
          onClick={async () => {
            if (
              value.enabled &&
              typeof Notification !== "undefined" &&
              Notification.permission === "default"
            )
              await Notification.requestPermission();
            if (await mutate("check-in-reminder", value, false))
              setNotice(
                value.enabled
                  ? typeof Notification !== "undefined" &&
                    Notification.permission === "granted"
                    ? text(
                        "Reminders enabled on this browser.",
                        "Rappels activés dans ce navigateur.",
                      )
                    : text(
                        "Preferences saved. Browser notification permission is unavailable or denied.",
                        "Préférences enregistrées. L’autorisation des notifications est indisponible ou refusée.",
                      )
                  : text("Reminders off.", "Rappels désactivés."),
              );
          }}
        >
          {text("Save reminder settings", "Enregistrer les rappels")}
        </button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </details>
  );
}
