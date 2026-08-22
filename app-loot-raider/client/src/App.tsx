import { Provider, useQuery } from "urql";
import { ACTIVE_PROMOTION_QUERY, COLLECTIBLE_ITEMS_QUERY } from "./api/queries";
import type { CollectibleItem, Promotion } from "./api/types";
import { HoldingState } from "./components/HoldingState";
import { MapView } from "./components/MapView";
import { urqlClient } from "./graphqlClient";
import { useGeolocation } from "./hooks/useGeolocation";
import "./App.css";

// Times Square, NYC — a reasonable global fallback with dense fast-food
// coverage when geolocation is denied/unavailable (UC-1 alt flow).
const DEFAULT_CENTER = { lat: 40.758, lng: -73.9855 };

function LootRaiderApp() {
  const [{ data: promotionData, fetching: promotionFetching, error: promotionError }] = useQuery<{
    activePromotion: Promotion;
  }>({ query: ACTIVE_PROMOTION_QUERY });

  const promotion = promotionData?.activePromotion;
  const geolocation = useGeolocation();

  const [{ data: catalogData }] = useQuery<{ collectibleItems: CollectibleItem[] }>({
    query: COLLECTIBLE_ITEMS_QUERY,
    variables: { promotionId: promotion?.id ?? "" },
    pause: !promotion,
  });

  if (promotionFetching || geolocation.status === "loading") {
    return <HoldingState title="Charting the map…" message="Loading the current hunt." />;
  }

  if (promotionError || !promotion) {
    return (
      <HoldingState
        title="No active hunt right now"
        message="Check back soon — new promotions get posted here as soon as they start."
      />
    );
  }

  const center = geolocation.coords ?? DEFAULT_CENTER;
  const catalog = catalogData?.collectibleItems ?? [];

  return (
    <div className="app">
      <header className="app__header">
        <svg
          className="app__header-logo"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
        <h1>Loot Raider</h1>
      </header>
      <MapView
        promotionId={promotion.id}
        chainName={promotion.chainName}
        catalog={catalog}
        initialCenter={center}
      />
    </div>
  );
}

function App() {
  return (
    <Provider value={urqlClient}>
      <LootRaiderApp />
    </Provider>
  );
}

export default App;
