import { useState } from "react";
import { randomSlug, slugify } from "../persistence/slug";

interface WorldNameModalProps {
  title: string;
  description: string;
  initialValue: string;
  confirmLabel: string;
  validate: (raw: string) => Promise<{ slug: string; error: null } | { slug: null; error: { message: string } }>;
  onConfirm: (slug: string) => void;
  onCancel?: () => void;
}

export function WorldNameModal({ title, description, initialValue, confirmLabel, validate, onConfirm, onCancel }: WorldNameModalProps) {
  const [raw, setRaw] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = slugify(raw);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    const result = await validate(raw);
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onConfirm(result.slug);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "monospace",
        color: "#fff",
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") void handleConfirm();
      }}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "rgba(20, 20, 20, 0.95)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 8,
          padding: 20,
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: "bold" }}>{title}</div>
        <div style={{ fontSize: 11, opacity: 0.8, lineHeight: 1.4 }}>{description}</div>

        <input
          autoFocus
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            padding: "6px 8px",
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
          }}
        />

        <div style={{ fontSize: 10, opacity: 0.6 }}>Saved as: {preview || "(empty)"}</div>

        {error && <div style={{ fontSize: 11, color: "#ff8080" }}>{error}</div>}

        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button
            onClick={() => setRaw(randomSlug())}
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 3,
              color: "#fff",
              padding: "5px 8px",
              cursor: "pointer",
            }}
          >
            Shuffle
          </button>
          <div style={{ flex: 1 }} />
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 3,
                color: "#fff",
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => void handleConfirm()}
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              background: "rgba(90,160,255,0.35)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 3,
              color: "#fff",
              padding: "5px 10px",
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
