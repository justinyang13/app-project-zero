interface CollectibleIconProps {
  imageUrl?: string;
  name: string;
  size?: number;
}

/**
 * Real per-item character art is deliberately out of scope (no licensed
 * character art, no user-uploaded photos — see the app README) so every
 * catalog item without an imageUrl falls back to this shared placeholder.
 */
export function CollectibleIcon({ imageUrl, name, size = 32 }: CollectibleIconProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} width={size} height={size} className="collectible-icon" />;
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="collectible-icon collectible-icon--placeholder"
      role="img"
      aria-label={name}
    >
      <rect x="3" y="13" width="26" height="15" rx="2" fill="var(--gold-bright)" stroke="var(--gold-deep)" strokeWidth="1.5" />
      <rect x="3" y="13" width="26" height="5" fill="var(--gold-deep)" opacity="0.35" />
      <path d="M16 13 V28 M9.5 13c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" fill="none" stroke="var(--gold-deep)" strokeWidth="1.5" />
      <circle cx="16" cy="7.5" r="2.2" fill="var(--parchment)" stroke="var(--gold-deep)" strokeWidth="1.2" />
    </svg>
  );
}
