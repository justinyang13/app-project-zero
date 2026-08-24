import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useQuery } from "urql";
import { VENUES_NEAR_QUERY } from "../api/queries";
import type { CollectibleItem, VenueSummary } from "../api/types";
import type { Coordinates } from "../hooks/useGeolocation";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { findNearestVenue } from "../utils/nearestVenue";
import {
  DEFAULT_TIME_RANGE_HOURS,
  ITEM_FILTER_TIME_RANGE_HOURS,
  isWithinTimeRange,
  type TimeRangeHours,
} from "../utils/timeRange";
import { CollectibleCatalogPanel } from "./CollectibleCatalogPanel";
import { VenueDetailPanel } from "./VenueDetailPanel";
import { VenueListView } from "./VenueListView";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

const DEFAULT_RADIUS_METERS = 4000;
const MIN_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 20000;
const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWPORT_DEBOUNCE_MS = 400;

type ViewMode = "map" | "list";

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
  /** Real geolocation, distinct from initialCenter's NYC fallback — auto-selects the nearest venue on load only when this is set. */
  userCoords: Coordinates | null;
  /** Set by the header's SearchBar (owned by App, since the search bar now lives in the header). */
  flyToCenter: Coordinates | null;
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

function buildPinIcon(recent: boolean, checkInCount: number, selected: boolean): L.DivIcon {
  const badge =
    checkInCount > 0
      ? `<div class="loot-pin__badge">${checkInCount > 99 ? "99+" : checkInCount}</div>`
      : "";

  return L.divIcon({
    className: `loot-pin ${recent ? "loot-pin--recent" : "loot-pin--stale"} ${selected ? "loot-pin--selected" : ""}`,
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

function buildClusterIcon(childCount: number): L.DivIcon {
  return L.divIcon({
    className: "venue-cluster",
    html: `<div class="venue-cluster__inner">${childCount > 99 ? "99+" : childCount}</div>`,
    iconSize: [36, 36],
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
  isSelected: boolean;
  onSelect: (venueId: string) => void;
}

function VenueMarker({ venue, isSelected, onSelect }: VenueMarkerProps) {
  const icon = useMemo(
    () => buildPinIcon(isRecentActivity(venue.lastCheckInAtUtc), venue.checkInCount, isSelected),
    [venue.lastCheckInAtUtc, venue.checkInCount, isSelected],
  );

  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(venue.id) }}
    >
      <Tooltip direction="top">
        {venue.checkInCount === 0
          ? "No check-ins yet — be the first!"
          : `${venue.checkInCount} check-in${venue.checkInCount === 1 ? "" : "s"} · ${venue.recentItems
              .map((item) => item.name)
              .join(", ")}`}
      </Tooltip>
    </Marker>
  );
}

export function MapView({ promotionId, chainName, catalog, initialCenter, userCoords, flyToCenter }: MapViewProps) {
  const [viewport, setViewport] = useState<Viewport>({
    lat: initialCenter.lat,
    lng: initialCenter.lng,
    radiusMeters: DEFAULT_RADIUS_METERS,
  });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [timeRangeHours, setTimeRangeHours] = useState<TimeRangeHours>(DEFAULT_TIME_RANGE_HOURS);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

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
  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) ?? null;

  function refetchVenues() {
    reexecuteVenuesQuery({ requestPolicy: "network-only" });
  }

  // Time range defaults to "all" so every location shows on load. Picking a
  // collectible switches the visitor into a "recent sightings of X" mode, so
  // that's the one point where a 24h default is actually useful; clearing
  // the item filter returns to the unfiltered "all" default.
  function handleSelectItem(itemId: string | null) {
    setSelectedItemId(itemId);
    setTimeRangeHours(itemId ? ITEM_FILTER_TIME_RANGE_HOURS : DEFAULT_TIME_RANGE_HOURS);
  }

  // UC-1/UC-5: once, when the visitor's real location and the first batch of
  // nearby venues are both in, auto-select the closest one's detail panel.
  // Adjusting state during render (guarded by hasAutoSelected so it only
  // fires once) rather than in an effect, per React's pattern for deriving
  // state from changing props/data — a ref wouldn't do here since it can't
  // be read during render. Simpler than the old marker/popup version: this
  // is a plain panel now, not a Leaflet-managed popup, so there's no
  // separate "disarm after use" round-trip needed.
  if (!hasAutoSelected && userCoords && venues.length > 0) {
    setHasAutoSelected(true);
    const nearest = findNearestVenue(userCoords, venues);
    if (nearest) {
      setSelectedVenueId(nearest.id);
    }
  }

  return (
    <div className="map-view">
      <div className="map-view__toggle">
        <button
          type="button"
          className={`map-view__toggle-btn ${viewMode === "list" ? "map-view__toggle-btn--active" : ""}`}
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        <button
          type="button"
          className={`map-view__toggle-btn ${viewMode === "map" ? "map-view__toggle-btn--active" : ""}`}
          onClick={() => setViewMode("map")}
        >
          Map
        </button>
      </div>

      {viewMode === "list" ? (
        <VenueListView venues={venues} selectedVenueId={selectedVenueId} onSelectVenue={setSelectedVenueId} />
      ) : (
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

          <MarkerClusterGroup maxClusterRadius={60} iconCreateFunction={(cluster) => buildClusterIcon(cluster.getChildCount())}>
            {venues.map((venue) => (
              <VenueMarker key={venue.id} venue={venue} isSelected={venue.id === selectedVenueId} onSelect={setSelectedVenueId} />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      )}

      {selectedVenue && (
        <VenueDetailPanel
          venue={selectedVenue}
          promotionId={promotionId}
          catalog={catalog}
          onCheckInAdded={refetchVenues}
          onClose={() => setSelectedVenueId(null)}
        />
      )}

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

      <CollectibleCatalogPanel
        items={catalog}
        selectedItemId={selectedItemId}
        onSelectItem={handleSelectItem}
        timeRangeHours={timeRangeHours}
        onTimeRangeChange={setTimeRangeHours}
      />
    </div>
  );
}
