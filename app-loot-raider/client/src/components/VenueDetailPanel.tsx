import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "urql";
import { CHECK_INS_FOR_VENUE_QUERY, REPORT_CHECK_IN_MUTATION } from "../api/queries";
import type { CheckIn, CollectibleItem, VenueSummary } from "../api/types";
import { hasReportedToday, recordReport } from "../utils/checkInHistory";
import { formatCheckInTime } from "../utils/relativeTime";
import { currentTimeValue, timeValueToUtcIso } from "../utils/reportTime";
import { CollectibleIcon } from "./CollectibleIcon";
import "./VenueDetailPanel.css";

interface VenueDetailPanelProps {
  venue: VenueSummary;
  promotionId: string;
  catalog: CollectibleItem[];
  onCheckInAdded: () => void;
  onClose: () => void;
}

/**
 * UC-5 (check-in list) + UC-6 (report form) — previously a Leaflet popup,
 * now a persistent panel (side panel on desktop, bottom sheet on mobile;
 * see VenueDetailPanel.css). A popup couldn't fit this much content and,
 * being Leaflet-managed, fought the map on autoPan (see MapView.tsx's
 * FlyToLocation comment for that history) — a plain React panel driven by
 * selectedVenueId sidesteps both problems.
 */
export function VenueDetailPanel({ venue, promotionId, catalog, onCheckInAdded, onClose }: VenueDetailPanelProps) {
  const [{ data, fetching, error }, refetchCheckIns] = useQuery<{ checkInsForVenue: CheckIn[] }>({
    query: CHECK_INS_FOR_VENUE_QUERY,
    variables: { venueId: venue.id, promotionId },
  });

  const [selectedItemId, setSelectedItemId] = useState(catalog[0]?.id ?? "");
  const [timeValue, setTimeValue] = useState(currentTimeValue);
  const [{ fetching: submitting, error: submitError }, reportCheckIn] = useMutation(REPORT_CHECK_IN_MUTATION);

  const catalogById = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const checkIns = data?.checkInsForVenue ?? [];
  const alreadyReportedSelected = hasReportedToday(venue.id, selectedItemId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedItemId) {
      return;
    }

    const result = await reportCheckIn({
      input: {
        promotionId,
        collectibleItemId: selectedItemId,
        venueId: venue.id,
        reportedAtUtc: timeValueToUtcIso(timeValue),
      },
    });

    if (!result.error) {
      recordReport(venue.id, selectedItemId);
      setTimeValue(currentTimeValue());
      refetchCheckIns({ requestPolicy: "network-only" });
      onCheckInAdded();
    }
  }

  return (
    <div className="venue-detail" role="dialog" aria-label={venue.name}>
      <div className="venue-detail__header">
        <div>
          <h3 className="venue-detail__title">{venue.name}</h3>
          {venue.address && <p className="venue-detail__address">{venue.address}</p>}
        </div>
        <button type="button" className="venue-detail__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="venue-detail__body">
        <div className="venue-detail__section">
          <p className="venue-detail__eyebrow">Recent check-ins</p>

          {fetching && <p role="status">Loading check-ins…</p>}

          {error && (
            <div role="alert" className="venue-detail__error">
              <p>Couldn't load check-ins.</p>
              <button type="button" onClick={() => refetchCheckIns({ requestPolicy: "network-only" })}>
                Retry
              </button>
            </div>
          )}

          {!fetching && !error && checkIns.length === 0 && (
            <p className="venue-detail__empty">No check-ins yet — be the first!</p>
          )}

          {!fetching && !error && checkIns.length > 0 && (
            <ul className="venue-detail__list">
              {checkIns.map((checkIn) => {
                const item = catalogById.get(checkIn.collectibleItemId);
                return (
                  <li key={checkIn.id} className="venue-detail__list-item">
                    <CollectibleIcon
                      imageUrl={item?.imageUrl}
                      name={item?.name ?? "Unknown item"}
                      itemId={checkIn.collectibleItemId}
                      size={32}
                    />
                    <div>
                      <span className="venue-detail__item-name">
                        {item && <span className="venue-detail__item-number">#{item.sortOrder}</span>}{" "}
                        {item?.name ?? "Unknown item"}
                      </span>
                      <span className="venue-detail__meta">
                        {formatCheckInTime(checkIn.reportedAtUtc)}
                        {checkIn.nickname ? ` · ${checkIn.nickname}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {catalog.length > 0 && (
          <div className="venue-detail__section">
            <p className="venue-detail__eyebrow">Report a sighting</p>

            <form onSubmit={handleSubmit}>
              <div className="venue-detail__swatches" role="radiogroup" aria-label="I saw this">
                {catalog.map((item) => {
                  const isSelected = item.id === selectedItemId;
                  const reportedToday = hasReportedToday(venue.id, item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`#${item.sortOrder} ${item.name}` + (reportedToday ? " (already reported today)" : "")}
                      title={`#${item.sortOrder} ${item.name}` + (reportedToday ? " — already reported today" : "")}
                      className={`venue-detail__swatch ${isSelected ? "venue-detail__swatch--selected" : ""} ${
                        reportedToday ? "venue-detail__swatch--reported" : ""
                      }`}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <CollectibleIcon imageUrl={item.imageUrl} name={item.name} itemId={item.id} size={32} />
                      <span className="venue-detail__swatch-number">#{item.sortOrder}</span>
                    </button>
                  );
                })}
              </div>

              {alreadyReportedSelected && (
                <p className="venue-detail__hint">You already reported this today — you can still submit if you're sure.</p>
              )}

              <div className="venue-detail__time-row">
                <label htmlFor={`time-${venue.id}`}>Time seen (today)</label>
                <input
                  id={`time-${venue.id}`}
                  type="time"
                  value={timeValue}
                  onChange={(event) => setTimeValue(event.target.value)}
                  required
                />
              </div>

              <button type="submit" className="venue-detail__submit" disabled={submitting}>
                {submitting ? "Logging…" : "Log it"}
              </button>

              {submitError && <p role="alert" className="venue-detail__error">Couldn't submit — try again.</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
