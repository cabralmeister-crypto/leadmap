import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { PRESENCE_META } from "../lib/classify";

// Pan/zoom the map whenever the search center changes.
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], 14);
  }, [center, map]);
  return null;
}

export default function MapView({ center, leads, selectedId, onSelect }) {
  const start = center || { lat: 41.8836, lng: -87.6505 };

  return (
    <MapContainer
      center={[start.lat, start.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />

      {leads
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => {
          const meta = PRESENCE_META[l.presence];
          const active = l.placeId === selectedId;
          return (
            <CircleMarker
              key={l.placeId}
              center={[l.lat, l.lng]}
              radius={active ? 12 : 8}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: meta.color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => onSelect?.(l.placeId) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-900">{l.name}</p>
                  <p
                    className="mt-0.5 text-xs font-medium"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </p>
                  {l.address && (
                    <p className="mt-1 text-xs text-slate-500">{l.address}</p>
                  )}
                  {l.phone && (
                    <a
                      href={`tel:${l.phone}`}
                      className="mt-1 block text-xs font-medium text-brand-600"
                    >
                      {l.phone}
                    </a>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
}
