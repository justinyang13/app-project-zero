import { useEffect, useState } from "react";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coords: Coordinates | null;
  status: "loading" | "granted" | "denied" | "unavailable";
}

/**
 * UC-1: centers the map on the visitor's location when granted, and lets
 * the caller fall back to a default center + address search (UC-2)
 * otherwise, rather than leaving the map blank.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() =>
    "geolocation" in navigator
      ? { coords: null, status: "loading" }
      : { coords: null, status: "unavailable" },
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
          status: "granted",
        });
      },
      () => {
        setState({ coords: null, status: "denied" });
      },
      { timeout: 8000 },
    );
  }, []);

  return state;
}
