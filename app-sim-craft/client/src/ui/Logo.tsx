export function Logo() {
  return (
    <img
      src="/favicon.svg"
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
