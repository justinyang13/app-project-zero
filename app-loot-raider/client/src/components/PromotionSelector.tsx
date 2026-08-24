import type { Promotion } from "../api/types";
import "./PromotionSelector.css";

interface PromotionSelectorProps {
  promotions: Promotion[];
  selectedPromotionId: string;
  onSelectPromotion: (promotionId: string) => void;
}

/** Header dropdown, left of the search box — lists every promotion (not just the active one), ready to grow beyond today's single hunt. */
export function PromotionSelector({ promotions, selectedPromotionId, onSelectPromotion }: PromotionSelectorProps) {
  if (promotions.length === 0) {
    return null;
  }

  return (
    <select
      className="promotion-selector"
      value={selectedPromotionId}
      onChange={(event) => onSelectPromotion(event.target.value)}
      aria-label="Choose a promotion"
    >
      {promotions.map((promotion) => (
        <option key={promotion.id} value={promotion.id}>
          {promotion.name}
        </option>
      ))}
    </select>
  );
}
