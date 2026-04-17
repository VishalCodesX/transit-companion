import { lazy, Suspense } from "react";
import { isGoogleMapsConfigured } from "@/services/mapsLoader";
import { MapView } from "./MapView";
import { Spinner } from "./Spinner";
import type { MapBus } from "./MapView";

const GoogleMapView = lazy(() =>
  import("./GoogleMapView").then((m) => ({ default: m.GoogleMapView })),
);

interface Props {
  buses: MapBus[];
  selectedBusId?: string | null;
  myStop?: { lat: number; lng: number } | null;
  polyline?: { lat: number; lng: number }[];
  onBusClick?: (bus: MapBus) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  showStubBanner?: boolean;
  stopDraggable?: boolean;
}

/**
 * Renders Google Maps when VITE_GOOGLE_MAPS_API_KEY is set, otherwise falls back
 * to the stylized SVG stub. Same props for both.
 */
export function SmartMapView(props: Props) {
  if (isGoogleMapsConfigured) {
    return (
      <Suspense
        fallback={
          <div className={`flex items-center justify-center glass rounded-xl ${props.className ?? ""}`}>
            <Spinner size="lg" />
          </div>
        }
      >
        <GoogleMapView {...props} />
      </Suspense>
    );
  }
  return <MapView {...props} />;
}
