/** Fade out and remove the static splash screen from index.html. */
let revealed = false;

export function revealSplash(): void {
  if (revealed) return;
  revealed = true;
  const el = document.getElementById("splash");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 400);
}
