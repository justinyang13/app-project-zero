import { getInitials } from "../utils/initials";
import { itemTint } from "../utils/itemTint";

interface CollectibleIconProps {
  imageUrl?: string;
  name: string;
  itemId: string;
  size?: number;
}

/**
 * Real per-item character art is deliberately out of scope (no licensed
 * character art, no user-uploaded photos — see the app README) so every
 * catalog item without an imageUrl falls back to a colored swatch showing
 * its initials, tinted deterministically per item so items stay distinct.
 */
export function CollectibleIcon({ imageUrl, name, itemId, size = 32 }: CollectibleIconProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className="collectible-icon"
        style={{ borderRadius: size * 0.25, flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      className="collectible-icon collectible-icon--placeholder"
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        background: itemTint(itemId),
        borderRadius: size * 0.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: size * 0.36,
          color: "white",
          letterSpacing: "-0.02em",
          userSelect: "none",
        }}
      >
        {getInitials(name)}
      </span>
    </div>
  );
}
