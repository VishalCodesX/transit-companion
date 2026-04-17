import { Loader } from "@googlemaps/js-api-loader";

/** Google Maps JS API key — optional. When unset, MapView falls back to the stub. */
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
export const isGoogleMapsConfigured = Boolean(GOOGLE_MAPS_API_KEY);

let loader: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (!isGoogleMapsConfigured) {
    return Promise.reject(new Error("Google Maps API key not configured"));
  }
  if (loadPromise) return loadPromise;
  loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["maps", "marker"],
  });
  loadPromise = loader.importLibrary("maps").then(() => google);
  return loadPromise;
}

/** Dark "aubergine" inspired style for our app theme. */
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#a5b3c1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6e7d8c" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#15321f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2333" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3346" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1c2333" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1929" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4f8ef7" }] },
];
