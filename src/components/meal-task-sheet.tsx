"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useTranslation } from "./language-provider";

export const MealTaskFeedbackContext = createContext<{
  error: string;
  busy: boolean;
  pending: boolean;
  review?: () => Promise<void>;
  retry: () => Promise<boolean | void>;
} | null>(null);

/** Native dialog supplies focus containment, Escape and an inert background. */
export function MealTaskSheet({
  title,
  onClose,
  onRetrySaved,
  children,
}: {
  title: string;
  onClose: () => void;
  onRetrySaved?: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { locale } = useTranslation();
  const feedback = useContext(MealTaskFeedbackContext);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = scroll;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="meal-task-sheet"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="meal-icon-button"
          aria-label={locale === "fr" ? "Fermer" : "Close"}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="meal-sheet-body">
        {feedback && !feedback.busy && (feedback.error || feedback.pending) && (
          <div className="error" role="alert">
            <p>
              {feedback.error ||
                (locale === "fr"
                  ? "Modification à vérifier"
                  : "Review saved change")}
            </p>
            {feedback.review && (
              <button
                type="button"
                className="button secondary"
                onClick={feedback.review}
              >
                {locale === "fr" ? "Actualiser" : "Refresh"}
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={feedback.busy}
              onClick={async () => {
                if (await feedback.retry()) {
                  onRetrySaved?.();
                  onClose();
                }
              }}
            >
              {locale === "fr" ? "Réessayer" : "Retry"}
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
