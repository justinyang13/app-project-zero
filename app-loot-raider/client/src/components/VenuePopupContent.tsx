import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "urql";
import { CHECK_INS_FOR_VENUE_QUERY, REPORT_CHECK_IN_MUTATION } from "../api/queries";
import type { CheckIn, CollectibleItem, VenueSummary } from "../api/types";
import { hasReportedToday, recordReport } from "../utils/checkInHistory";
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
  const [nickname, setNickname] = useState("");
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
        nickname: nickname.trim() || null,
      },
    });

    if (!result.error) {
      recordReport(venue.id, selectedItemId);
      setNickname("");
      refetchCheckIns({ requestPolicy: "network-only" });
      onCheckInAdded();
    }
  }

  return (
    <div className="venue-popup">
      <h3 className="venue-popup__title">{venue.name}</h3>
      {venue.address && <p className="venue-popup__address">{venue.address}</p>}

      <div className="venue-popup__divider" />

      <div className="venue-popup__checkins">
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
                  <CollectibleIcon imageUrl={item?.imageUrl} name={item?.name ?? "Unknown item"} size={28} />
                  <div>
                    <span className="venue-popup__item-name">{item?.name ?? "Unknown item"}</span>
                    <span className="venue-popup__meta">
                      {new Date(checkIn.reportedAtUtc).toLocaleDateString()}
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
        <>
          <div className="venue-popup__divider" />
          <form className="venue-popup__form" onSubmit={handleSubmit}>
            <label htmlFor={`item-${venue.id}`}>I saw this:</label>
            <select
              id={`item-${venue.id}`}
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
            >
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {hasReportedToday(venue.id, item.id) ? " — already reported today" : ""}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Nickname (optional)"
              maxLength={40}
            />

            {alreadyReportedSelected && (
              <p className="venue-popup__hint">You already reported this today — you can still submit if you're sure.</p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? "Reporting…" : "I saw this"}
            </button>

            {submitError && <p role="alert" className="venue-popup__error">Couldn't submit — try again.</p>}
          </form>
        </>
      )}
    </div>
  );
}
