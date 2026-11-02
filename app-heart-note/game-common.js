// Small helpers shared by the calm games (Worry Boat, Lantern Friends, Lullaby Lights, Joy Jar).
const G = (() => {
  const load = (key, def) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch { return def; } };
  const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => [...a].sort(() => Math.random() - 0.5);
  const date = t => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  // sound toggle button shared by every game page
  const wireSound = btn => {
    const show = () => { btn.textContent = Sfx.on ? "🔊 Sound on" : "🔇 Sound off"; btn.setAttribute("aria-pressed", String(Sfx.on)); };
    btn.onclick = () => { Sfx.toggle(); show(); }; show();
  };
  // a simple popup dialog; returns { box, close }
  const modal = (html, onClose) => {
    const ov = el("div", "g-modal"); const box = el("div", "g-modal-card", html);
    ov.appendChild(box); document.body.appendChild(ov);
    const close = () => { ov.remove(); removeEventListener("keydown", key); onClose && onClose(); };
    const key = e => { if (e.key === "Escape") close(); };
    addEventListener("keydown", key);
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    return { box, close };
  };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch {}
  return { load, save, esc, pick, shuffle, date, el, reduced, wireSound, modal };
})();
