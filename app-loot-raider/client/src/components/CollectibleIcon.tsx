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
 * catalog item without an imageUrl falls back to a colored swatch, tinted
 * deterministically per item so items stay visually distinct.
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
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="white">
        <path d="M12 2 L15 8.5 L21 9.3 L16.5 13.6 L17.6 20 L12 17 L6.4 20 L7.5 13.6 L3 9.3 L9 8.5 Z" />
      </svg>
    </div>
  );
}
