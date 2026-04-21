import { MapView } from "./MapView";
import type { MapBus } from "./MapView";

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

export function SmartMapView(props: Props) {
  return <MapView {...props} />;
}
