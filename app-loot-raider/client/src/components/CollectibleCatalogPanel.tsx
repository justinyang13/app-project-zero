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
    <div className={`catalog-panel ${isOpen ? "catalog-panel--open" : ""}`}>
      <button
        type="button"
        className="catalog-panel__toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        {isOpen ? "Close catalog" : selectedItem ? `Filtering: ${selectedItem.name}` : "Collectible Catalog"}
      </button>

      {isOpen && (
        <div className="catalog-panel__body">
          <p className="catalog-panel__hint">Tap an item to show only venues with a sighting of it.</p>

          {selectedItem && (
            <button type="button" className="catalog-panel__clear" onClick={() => onSelectItem(null)}>
              Clear filter ✕
            </button>
          )}

          <ul className="catalog-panel__list">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`catalog-panel__item ${isSelected ? "catalog-panel__item--selected" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectItem(isSelected ? null : item.id)}
                  >
                    <CollectibleIcon imageUrl={item.imageUrl} name={item.name} size={36} />
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
