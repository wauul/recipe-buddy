export function clearMealDrafts() {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith("rb-meal-draft:")) sessionStorage.removeItem(key);
  } catch {
    /* Storage may be disabled. */
  }
}
