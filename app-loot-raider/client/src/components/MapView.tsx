import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useQuery } from "urql";
import { VENUES_NEAR_QUERY } from "../api/queries";
import type { CollectibleItem, VenueSummary } from "../api/types";
import type { Coordinates } from "../hooks/useGeolocation";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { DEFAULT_TIME_RANGE_HOURS, isWithinTimeRange, type TimeRangeHours } from "../utils/timeRange";
import { CollectibleCatalogPanel } from "./CollectibleCatalogPanel";
import { SearchBar } from "./SearchBar";
import { VenuePopupContent } from "./VenuePopupContent";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

const DEFAULT_RADIUS_METERS = 4000;
const MIN_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 20000;
const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWPORT_DEBOUNCE_MS = 400;

interface Viewport {
  lat: number;
  lng: number;
  radiusMeters: number;
}

interface MapViewProps {
  promotionId: string;
  chainName: string;
  catalog: CollectibleItem[];
  initialCenter: Coordinates;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRecentActivity(lastCheckInAtUtc: string | null): boolean {
  if (!lastCheckInAtUtc) {
    return false;
  }
  return Date.now() - new Date(lastCheckInAtUtc).getTime() < RECENT_ACTIVITY_WINDOW_MS;
}

function buildPinIcon(recent: boolean, checkInCount: number): L.DivIcon {
  const badge =
    checkInCount > 0
      ? `<div class="loot-pin__badge">${checkInCount > 99 ? "99+" : checkInCount}</div>`
      : "";

  return L.divIcon({
    className: `loot-pin ${recent ? "loot-pin--recent" : "loot-pin--stale"}`,
    html: `<div class="loot-pin__dot-wrap">
      <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" class="loot-pin__circle" /></svg>
      ${badge}
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
    tooltipAnchor: [0, -12],
  });
}

function ViewportWatcher({ onViewportChange }: { onViewportChange: (viewport: Viewport) => void }) {
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const map = useMapEvents({
    moveend: () => report(),
    zoomend: () => report(),
  });

  function report() {
    const center = map.getCenter();
    const radiusMeters = clamp(
      Math.round(center.distanceTo(map.getBounds().getNorthEast())),
      MIN_RADIUS_METERS,
      MAX_RADIUS_METERS,
    );
    onViewportChangeRef.current({ lat: center.lat, lng: center.lng, radiusMeters });
  }

  useEffect(() => {
    report();
    // Only on mount — subsequent viewport changes come from moveend/zoomend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function FlyToLocation({ coords }: { coords: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([coords.lat, coords.lng], 14);
  }, [coords, map]);

  return null;
}

interface VenueMarkerProps {
  venue: VenueSummary;
  promotionId: string;
  catalog: CollectibleItem[];
  onCheckInAdded: () => void;
}

function VenueMarker({ venue, promotionId, catalog, onCheckInAdded }: VenueMarkerProps) {
  const [hasOpened, setHasOpened] = useState(false);

  const icon = useMemo(
    () => buildPinIcon(isRecentActivity(venue.lastCheckInAtUtc), venue.checkInCount),
    [venue.lastCheckInAtUtc, venue.checkInCount],
  );

  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={icon}
      eventHandlers={{ popupopen: () => setHasOpened(true) }}
    >
      <Tooltip direction="top">
        {venue.checkInCount === 0
          ? "No check-ins yet — be the first!"
          : `${venue.checkInCount} check-in${venue.checkInCount === 1 ? "" : "s"} · ${venue.recentItems
              .map((item) => item.name)
              .join(", ")}`}
      </Tooltip>
      <Popup minWidth={240}>
        {hasOpened ? (
          <VenuePopupContent
            venue={venue}
            promotionId={promotionId}
            catalog={catalog}
            onCheckInAdded={onCheckInAdded}
          />
        ) : (
          <p>Loading…</p>
        )}
      </Popup>
    </Marker>
  );
}

export function MapView({ promotionId, chainName, catalog, initialCenter }: MapViewProps) {
  const [viewport, setViewport] = useState<Viewport>({
    lat: initialCenter.lat,
    lng: initialCenter.lng,
    radiusMeters: DEFAULT_RADIUS_METERS,
  });
  const [flyToCenter, setFlyToCenter] = useState<Coordinates | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [timeRangeHours, setTimeRangeHours] = useState<TimeRangeHours>(DEFAULT_TIME_RANGE_HOURS);

  const handleViewportChange = useDebouncedCallback(setViewport, VIEWPORT_DEBOUNCE_MS);

  const [{ data, fetching, error }, reexecuteVenuesQuery] = useQuery<{ venuesNear: VenueSummary[] }>({
    query: VENUES_NEAR_QUERY,
    variables: {
      lat: viewport.lat,
      lng: viewport.lng,
      radiusMeters: viewport.radiusMeters,
      promotionId,
      collectibleItemId: selectedItemId,
    },
  });

  const venues = (data?.venuesNear ?? []).filter((venue) => isWithinTimeRange(venue.lastCheckInAtUtc, timeRangeHours));
  const selectedItem = catalog.find((item) => item.id === selectedItemId) ?? null;

  function refetchVenues() {
    reexecuteVenuesQuery({ requestPolicy: "network-only" });
  }

  return (
    <div className="map-view">
      <SearchBar onLocationFound={setFlyToCenter} />
      <CollectibleCatalogPanel
        items={catalog}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        timeRangeHours={timeRangeHours}
        onTimeRangeChange={setTimeRangeHours}
      />

      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={13}
        scrollWheelZoom
        className="map-view__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewportWatcher onViewportChange={handleViewportChange} />
        {flyToCenter && <FlyToLocation coords={flyToCenter} />}

        {venues.map((venue) => (
          <VenueMarker
            key={venue.id}
            venue={venue}
            promotionId={promotionId}
            catalog={catalog}
            onCheckInAdded={refetchVenues}
          />
        ))}
      </MapContainer>

      {error && (
        <p className="map-view__banner" role="status">
          Couldn't refresh venues — showing cached locations.
        </p>
      )}

      {!fetching && !error && venues.length === 0 && (
        <p className="map-view__banner" role="status">
          {selectedItem
            ? `No ${chainName} locations here have a "${selectedItem.name}" sighting yet — try zooming out or clearing the filter.`
            : timeRangeHours !== "all"
              ? `No ${chainName} locations here had activity in the last ${timeRangeHours}h — try "All" or zooming out.`
              : `No ${chainName} locations found here — try zooming out.`}
        </p>
      )}
    </div>
  );
}
