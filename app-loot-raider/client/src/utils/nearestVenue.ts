interface LocatedVenue {
  latitude: number;
  longitude: number;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The closest venue to a point, or null if the list is empty. */
export function findNearestVenue<T extends LocatedVenue>(
  coords: { lat: number; lng: number },
  venues: T[],
): T | null {
  let nearest: T | null = null;
  let nearestDistanceMeters = Infinity;

  for (const venue of venues) {
    const distanceMeters = haversineDistanceMeters(coords.lat, coords.lng, venue.latitude, venue.longitude);
    if (distanceMeters < nearestDistanceMeters) {
      nearestDistanceMeters = distanceMeters;
      nearest = venue;
    }
  }

  return nearest;
}
