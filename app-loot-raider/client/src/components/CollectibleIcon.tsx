import { getInitials } from "../utils/initials";
import { itemTint } from "../utils/itemTint";
import { TOY_PHOTOS } from "../utils/toyPhotos";

interface CollectibleIconProps {
  imageUrl?: string;
  name: string;
  itemId: string;
  size?: number;
}

/**
 * Real toy photos are opt-in per item (see toyPhotos.ts) — a bundled local
 * photo wins, then the server-provided imageUrl, then a colored initials
 * swatch (tinted deterministically per item) as the final fallback for any
 * item without a photo yet.
 */
export function CollectibleIcon({ imageUrl, name, itemId, size = 32 }: CollectibleIconProps) {
  const photo = TOY_PHOTOS[itemId] ?? (imageUrl || undefined);

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="collectible-icon"
        style={{ borderRadius: size * 0.25, flexShrink: 0, objectFit: "cover" }}
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
