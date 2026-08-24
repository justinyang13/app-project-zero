// The four placeholder-cover line icons, defined once as SVG <symbol>s and
// referenced elsewhere via <use href="#c-star">, etc. Exact path data from
// the locked "Cozy Den" mockup.
export function IconDefs() {
  return (
    <svg style={{ display: "none" }} aria-hidden="true">
      <defs>
        <symbol id="c-star" viewBox="0 0 24 24" fill="white">
          <path d="M12 1 L14.8 8.6 L23 9.2 L16.6 14.2 L18.8 22 L12 17.4 L5.2 22 L7.4 14.2 L1 9.2 L9.2 8.6 Z" />
        </symbol>
        <symbol id="c-leaf" viewBox="0 0 24 24" fill="white">
          <path d="M3 21 C3 12 9 3 21 3 C21 15 12 21 3 21 Z M3 21 C7 17 11 13 17 8" />
        </symbol>
        <symbol id="c-wave" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M2 8 C6 4 10 12 14 8 S22 4 22 8" />
          <path d="M2 15 C6 11 10 19 14 15 S22 11 22 15" />
        </symbol>
        <symbol id="c-moon" viewBox="0 0 24 24" fill="white">
          <path d="M20 14.5 A9 9 0 1 1 9.5 4 A7 7 0 0 0 20 14.5 Z" />
        </symbol>
      </defs>
    </svg>
  );
}
