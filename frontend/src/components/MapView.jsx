import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

export const ZONE_COLORS = {
  safe: '#16a34a',
  moderate: '#d97706',
  high: '#ea580c',
  restricted: '#b91c1c',
};

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick && onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

/**
 * Props:
 *  center: [lat, lng]
 *  zones: geo-fence list
 *  me: { lat, lng }  - current tourist position
 *  tourists: [{ touristId, name, lat, lng, status }]  - police view
 *  trail: [{lat,lng}] - recent points
 *  onMapClick(lat, lng): optional (used for the demo "simulate location" feature)
 *  followMe: recenter when `me` moves
 */
export default function MapView({ center = [17.7, 83.3], zones = [], me, tourists = [], trail = [], onMapClick, followMe, height = 420 }) {
  const statusColor = { safe: '#16a34a', warning: '#d97706', danger: '#dc2626' };
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        {followMe && me && <Recenter center={[me.lat, me.lng]} />}

        {zones.map((z) => (
          <Circle
            key={z._id}
            center={[z.center.lat, z.center.lng]}
            radius={z.radiusMeters}
            pathOptions={{ color: ZONE_COLORS[z.type], fillColor: ZONE_COLORS[z.type], fillOpacity: 0.2, weight: 2 }}
          >
            <Popup>
              <strong>{z.name}</strong>
              <br />
              {z.type.toUpperCase()} zone
              <br />
              {z.description}
            </Popup>
          </Circle>
        ))}

        {trail.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lng]} radius={3} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.6 }} />
        ))}

        {tourists.map((t) => (
          <CircleMarker
            key={t.touristId}
            center={[t.lat, t.lng]}
            radius={9}
            pathOptions={{ color: '#fff', weight: 2, fillColor: statusColor[t.status] || '#2563eb', fillOpacity: 1 }}
          >
            <Popup>
              <strong>{t.name}</strong>
              <br />
              Status: {t.status}
              <br />
              Safety score: {t.safetyScore}
              <br />
              Updated: {t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString() : '-'}
            </Popup>
          </CircleMarker>
        ))}

        {me && (
          <CircleMarker center={[me.lat, me.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
