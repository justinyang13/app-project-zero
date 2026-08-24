import "./Backdrop.css";

const PANEL_LINE_COUNT = 8;

// Warm wood-panel wall + upper-right lamp-glow vignette, from the mockup.
export function Backdrop() {
  return (
    <svg className="backdrop" preserveAspectRatio="none" viewBox="0 0 1440 900" aria-hidden="true">
      <defs>
        <radialGradient id="lampglow" cx="88%" cy="8%" r="45%">
          <stop offset="0%" stopColor="var(--sd-lamp-glow)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--sd-lamp-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="var(--sd-bg)" />
      <g stroke="var(--sd-wood-line)" strokeWidth="1">
        {Array.from({ length: PANEL_LINE_COUNT + 1 }, (_, i) => {
          const x = (1440 / PANEL_LINE_COUNT) * i;
          return <path key={x} d={`M${x} 0 L${x} 900`} />;
        })}
      </g>
      <rect width="1440" height="900" fill="url(#lampglow)" />
    </svg>
  );
}
