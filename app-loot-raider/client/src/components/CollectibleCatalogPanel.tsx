import { useState } from "react";
import type { CollectibleItem } from "../api/types";
import { CollectibleIcon } from "./CollectibleIcon";
import "./CollectibleCatalogPanel.css";

interface CollectibleCatalogPanelProps {
  items: CollectibleItem[];
}

/** UC-7: the full catalog as a reference checklist, independent of any venue. */
export function CollectibleCatalogPanel({ items }: CollectibleCatalogPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`catalog-panel ${isOpen ? "catalog-panel--open" : ""}`}>
      <button
        type="button"
        className="catalog-panel__toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        {isOpen ? "Close catalog" : "Collectible Catalog"}
      </button>

      {isOpen && (
        <div className="catalog-panel__body">
          <ul className="catalog-panel__list">
            {items.map((item) => (
              <li key={item.id} className="catalog-panel__item">
                <CollectibleIcon imageUrl={item.imageUrl} name={item.name} size={36} />
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
