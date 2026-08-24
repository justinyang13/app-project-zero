import { useState } from "react";
import type { Promotion } from "../api/types";
import "./PromotionSelector.css";

interface PromotionSelectorProps {
  promotions: Promotion[];
  selectedPromotionId: string;
  onSelectPromotion: (promotionId: string) => void;
}

/**
 * Header dropdown, left of the search box — lists every promotion (not
 * just the active one), ready to grow beyond today's single hunt.
 *
 * A custom trigger rather than a native <select>: browsers don't apply
 * overflow/text-overflow to a select's own closed-state text, so long
 * promotion names ("McDonald's x Sanrio x Godzilla Happy Meal") got
 * abruptly clipped with no ellipsis no matter how the box was sized. A
 * plain button + span respects ellipsis correctly, and the open menu
 * shows full names regardless of the trigger's width.
 */
export function PromotionSelector({ promotions, selectedPromotionId, onSelectPromotion }: PromotionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (promotions.length === 0) {
    return null;
  }

  const selected = promotions.find((promotion) => promotion.id === selectedPromotionId) ?? promotions[0];

  return (
    <div className="promotion-selector">
      <button
        type="button"
        className="promotion-selector__trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="promotion-selector__label">{selected.name}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className={`promotion-selector__chevron ${isOpen ? "promotion-selector__chevron--open" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9 L12 15 L18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul className="promotion-selector__menu" role="listbox" aria-label="Choose a promotion">
          {promotions.map((promotion) => {
            const isSelected = promotion.id === selected.id;
            return (
              <li key={promotion.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`promotion-selector__option ${isSelected ? "promotion-selector__option--selected" : ""}`}
                  onClick={() => {
                    onSelectPromotion(promotion.id);
                    setIsOpen(false);
                  }}
                >
                  {promotion.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
