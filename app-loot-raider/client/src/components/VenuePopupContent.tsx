import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "urql";
import { CHECK_INS_FOR_VENUE_QUERY, REPORT_CHECK_IN_MUTATION } from "../api/queries";
import type { CheckIn, CollectibleItem, VenueSummary } from "../api/types";
import { hasReportedToday, recordReport } from "../utils/checkInHistory";
import { currentTimeValue, timeValueToUtcIso } from "../utils/reportTime";
import { CollectibleIcon } from "./CollectibleIcon";
import "./VenuePopupContent.css";

interface VenuePopupContentProps {
  venue: VenueSummary;
  promotionId: string;
  catalog: CollectibleItem[];
  onCheckInAdded: () => void;
}

/** UC-5 (check-in list) + UC-6 (report form), both inside the same open popup. */
export function VenuePopupContent({ venue, promotionId, catalog, onCheckInAdded }: VenuePopupContentProps) {
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
    <div className="venue-popup">
      <div className="venue-popup__header">
        <h3 className="venue-popup__title">{venue.name}</h3>
        {venue.address && <p className="venue-popup__address">{venue.address}</p>}
      </div>

      <div className="venue-popup__section">
        <p className="venue-popup__eyebrow">Recent check-ins</p>

        {fetching && <p role="status">Loading check-ins…</p>}

        {error && (
          <div role="alert" className="venue-popup__error">
            <p>Couldn't load check-ins.</p>
            <button type="button" onClick={() => refetchCheckIns({ requestPolicy: "network-only" })}>
              Retry
            </button>
          </div>
        )}

        {!fetching && !error && checkIns.length === 0 && (
          <p className="venue-popup__empty">No check-ins yet — be the first!</p>
        )}

        {!fetching && !error && checkIns.length > 0 && (
          <ul className="venue-popup__list">
            {checkIns.map((checkIn) => {
              const item = catalogById.get(checkIn.collectibleItemId);
              return (
                <li key={checkIn.id} className="venue-popup__list-item">
                  <CollectibleIcon
                    imageUrl={item?.imageUrl}
                    name={item?.name ?? "Unknown item"}
                    itemId={checkIn.collectibleItemId}
                    size={28}
                  />
                  <div>
                    <span className="venue-popup__item-name">{item?.name ?? "Unknown item"}</span>
                    <span className="venue-popup__meta">
                      {new Date(checkIn.reportedAtUtc).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
        <div className="venue-popup__section">
          <p className="venue-popup__eyebrow">Report a sighting</p>

          <form onSubmit={handleSubmit}>
            <div className="venue-popup__swatches" role="radiogroup" aria-label="I saw this">
              {catalog.map((item) => {
                const isSelected = item.id === selectedItemId;
                const reportedToday = hasReportedToday(venue.id, item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={item.name + (reportedToday ? " (already reported today)" : "")}
                    title={item.name + (reportedToday ? " — already reported today" : "")}
                    className={`venue-popup__swatch ${isSelected ? "venue-popup__swatch--selected" : ""} ${
                      reportedToday ? "venue-popup__swatch--reported" : ""
                    }`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <CollectibleIcon imageUrl={item.imageUrl} name={item.name} itemId={item.id} size={32} />
                  </button>
                );
              })}
            </div>

            {alreadyReportedSelected && (
              <p className="venue-popup__hint">You already reported this today — you can still submit if you're sure.</p>
            )}

            <div className="venue-popup__time-row">
              <label htmlFor={`time-${venue.id}`}>Time seen (today)</label>
              <input
                id={`time-${venue.id}`}
                type="time"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="venue-popup__submit" disabled={submitting}>
              {submitting ? "Logging…" : "Log it"}
            </button>

            {submitError && <p role="alert" className="venue-popup__error">Couldn't submit — try again.</p>}
          </form>
        </div>
      )}
    </div>
  );
}
