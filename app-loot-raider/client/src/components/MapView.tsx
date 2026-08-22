import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useQuery } from "urql";
import { VENUES_NEAR_QUERY } from "../api/queries";
import type { CollectibleItem, VenueSummary } from "../api/types";
import type { Coordinates } from "../hooks/useGeolocation";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
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

function buildPinIcon(recent: boolean): L.DivIcon {
  return L.divIcon({
    className: `loot-pin ${recent ? "loot-pin--recent" : "loot-pin--stale"}`,
    html: `<svg viewBox="0 0 24 32" width="28" height="38">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" class="loot-pin__body" />
      <circle cx="12" cy="12" r="4.5" class="loot-pin__core" />
    </svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
    tooltipAnchor: [0, -30],
  });
}

const recentPinIcon = buildPinIcon(true);
const stalePinIcon = buildPinIcon(false);

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

  return (
    <Marker
      position={[venue.latitude, venue.longitude]}
      icon={isRecentActivity(venue.lastCheckInAtUtc) ? recentPinIcon : stalePinIcon}
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

  const handleViewportChange = useDebouncedCallback(setViewport, VIEWPORT_DEBOUNCE_MS);

  const [{ data, fetching, error }, reexecuteVenuesQuery] = useQuery<{ venuesNear: VenueSummary[] }>({
    query: VENUES_NEAR_QUERY,
    variables: {
      lat: viewport.lat,
      lng: viewport.lng,
      radiusMeters: viewport.radiusMeters,
      promotionId,
    },
  });

  const venues = data?.venuesNear ?? [];

  function refetchVenues() {
    reexecuteVenuesQuery({ requestPolicy: "network-only" });
  }

  return (
    <div className="map-view">
      <SearchBar onLocationFound={setFlyToCenter} />
      <CollectibleCatalogPanel items={catalog} />

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
          No {chainName} locations found here — try zooming out.
        </p>
      )}
    </div>
  );
}
