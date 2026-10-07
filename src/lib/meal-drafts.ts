export function clearMealDrafts() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("rb-clear-meal-drafts"));
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith("rb-meal-draft:")) sessionStorage.removeItem(key);
    for (const key of Object.keys(localStorage))
      if (key.startsWith("rb-check-in:")) localStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}
