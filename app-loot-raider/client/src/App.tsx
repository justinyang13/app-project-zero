import { useState } from "react";
import { Provider, useQuery } from "urql";
import { ACTIVE_PROMOTION_QUERY, COLLECTIBLE_ITEMS_QUERY } from "./api/queries";
import type { CollectibleItem, Promotion } from "./api/types";
import logoUrl from "./assets/logo.png";
import { HoldingState } from "./components/HoldingState";
import { MapView } from "./components/MapView";
import { SearchBar } from "./components/SearchBar";
import { urqlClient } from "./graphqlClient";
import type { Coordinates } from "./hooks/useGeolocation";
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
  const [flyToCenter, setFlyToCenter] = useState<Coordinates | null>(null);

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
        <div className="app__header-brand">
          <img src={logoUrl} alt="" className="app__header-logo" />
          <h1>Loot Raider</h1>
        </div>
        <SearchBar onLocationFound={setFlyToCenter} />
      </header>
      <MapView
        promotionId={promotion.id}
        chainName={promotion.chainName}
        catalog={catalog}
        initialCenter={center}
        userCoords={geolocation.coords}
        flyToCenter={flyToCenter}
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
