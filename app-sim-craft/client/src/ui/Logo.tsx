export function Logo() {
  return (
    <img
      // BASE_URL, not a hardcoded leading slash — this app is deployed
      // under a subpath (/app-project-zero/app-sim-craft/), and Vite only
      // rewrites paths it processes as imports/HTML attributes, never a
      // plain runtime string literal like a hardcoded "/favicon.svg".
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      alt="SimCraft"
      title="SimCraft"
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        width: 44,
        height: 44,
        pointerEvents: "none",
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
      }}
    />
  );
}
