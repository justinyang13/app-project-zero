import { useState } from "react";
import type { CollectibleItem } from "../api/types";
import { CollectibleIcon } from "./CollectibleIcon";
import "./CollectibleCatalogPanel.css";

interface CollectibleCatalogPanelProps {
  items: CollectibleItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
}

/**
 * UC-7: the full catalog as a reference checklist, independent of any venue.
 * Doubles as the map's collectible filter — clicking an item shows only
 * venues with a check-in for it; clicking it again clears the filter.
 */
export function CollectibleCatalogPanel({ items, selectedItemId, onSelectItem }: CollectibleCatalogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className="catalog-panel">
      <button
        type="button"
        className="catalog-panel__toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span>Collectible catalog</span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className={`catalog-panel__chevron ${isOpen ? "catalog-panel__chevron--open" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 15 L12 9 L18 15" />
        </svg>
      </button>

      {isOpen && (
        <div className="catalog-panel__body">
          {selectedItem && (
            <div className="catalog-panel__filter-row">
              <span>Filtering: {selectedItem.name}</span>
              <button type="button" onClick={() => onSelectItem(null)}>
                Clear
              </button>
            </div>
          )}

          <div className="catalog-panel__grid">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`catalog-panel__item ${isSelected ? "catalog-panel__item--selected" : ""}`}
                  aria-pressed={isSelected}
                  title="Tap to filter the map to venues with a sighting of this item"
                  onClick={() => onSelectItem(isSelected ? null : item.id)}
                >
                  <CollectibleIcon imageUrl={item.imageUrl} name={item.name} itemId={item.id} size={38} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
