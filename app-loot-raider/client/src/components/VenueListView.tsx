import type { VenueSummary } from "../api/types";
import { formatCheckInTime } from "../utils/relativeTime";
import { CollectibleIcon } from "./CollectibleIcon";
import "./VenueListView.css";

interface VenueListViewProps {
  venues: VenueSummary[];
  selectedVenueId: string | null;
  onSelectVenue: (venueId: string) => void;
}

/** The list half of the List/Map toggle — renders the same filtered venues MapView already fetched. */
export function VenueListView({ venues, selectedVenueId, onSelectVenue }: VenueListViewProps) {
  if (venues.length === 0) {
    return null;
  }

  return (
    <ul className="venue-list">
      {venues.map((venue) => (
        <li key={venue.id}>
          <button
            type="button"
            className={`venue-list__row ${venue.id === selectedVenueId ? "venue-list__row--selected" : ""}`}
            onClick={() => onSelectVenue(venue.id)}
          >
            <div className="venue-list__main">
              <span className="venue-list__name">{venue.name}</span>
              {venue.address && <span className="venue-list__address">{venue.address}</span>}
            </div>

            <div className="venue-list__meta">
              {venue.recentItems.length > 0 && (
                <div className="venue-list__items">
                  {venue.recentItems.map((item) => (
                    <CollectibleIcon key={item.id} imageUrl={item.imageUrl} name={item.name} itemId={item.id} size={22} />
                  ))}
                </div>
              )}
              <span className="venue-list__count">
                {venue.checkInCount} check-in{venue.checkInCount === 1 ? "" : "s"}
              </span>
              {venue.lastCheckInAtUtc && (
                <span className="venue-list__time">{formatCheckInTime(venue.lastCheckInAtUtc)}</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
