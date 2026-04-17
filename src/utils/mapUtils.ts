/** Geo math utilities — bearing, distance (haversine), speed */

const R = 6371000; // Earth radius in metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Distance in metres between two coords */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Bearing 0-360° from point 1 → point 2 */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Speed in km/h given distance in metres and elapsed ms */
export function speedKmh(meters: number, ms: number): number {
  if (ms <= 0) return 0;
  return (meters / 1000) / (ms / 1000 / 3600);
}
