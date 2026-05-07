'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigation } from 'lucide-react';
import { type LatLng } from '@/lib/ballistics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Explosion } from '@/components/Explosion';

import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMapEvents,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TacticalMapProps {
  gunPosition: LatLng | null;
  targetPosition: LatLng | null;
  mapCenter: LatLng; // Ahora es obligatoria para recibir la búsqueda[cite: 5]
  impacts: LatLng[];
  onSetTarget: (coord: LatLng) => void;
  onSetGun: (coord: LatLng) => void;
  onLocateGun: () => void;
  onCenterChange?: (coord: LatLng) => void;
  realLatLng: LatLng | null;
  isFiring?: boolean;
  showExplosion?: boolean;
  fireProgress?: number;
  isGunLocated?: boolean;
}

// COMPONENTE DE MOVIMIENTO: Escucha la prop mapCenter del padre
function CenterManager({ center }: { center: LatLng }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom(), {
        animate: true,
        duration: 1.0
      });
    }
  }, [center, map]);

  return null;
}

// MANEJADOR DE EVENTOS: Corregido para clic izquierdo
function MapEventsHandler({ onSetTarget, onSetGun, onCenterChange }: { 
  onSetTarget: (coord: LatLng) => void, 
  onSetGun: (coord: LatLng) => void,
  onCenterChange?: (coord: LatLng) => void
}) {
  const map = useMapEvents({
    click(e) {
      // El clic izquierdo ahora coloca la pieza correctamente[cite: 5]
      onSetGun({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    contextmenu(e) {
      L.DomEvent.stopPropagation(e);
      onSetTarget({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    moveend() {
      const center = map.getCenter();
      if (onCenterChange) {
        onCenterChange({ lat: center.lat, lng: center.lng });
      }
    }
  });

  return null;
}

// (Componente ExplosionOverlay se mantiene igual...)
function ExplosionOverlay({ position }: { position: LatLng }) {
  const map = useMap();
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    const pane = map.getPanes().overlayPane;
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';
    container.style.pointerEvents = 'none';
    pane.appendChild(container);

    const updatePosition = () => {
      const point = map.latLngToLayerPoint([position.lat, position.lng]);
      container.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    };

    updatePosition();
    map.on('move zoom resize', updatePosition);

    return () => {
      map.off('move zoom resize', updatePosition);
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }, [container, map, position]);

  return createPortal(
    <div style={{ transform: 'translate(-50%, -50%)' }}>
      <Explosion />
    </div>,
    container
  );
}

export function TacticalMap({
  gunPosition,
  targetPosition,
  mapCenter, // Propiedad recibida del buscador de SimulatorTab
  impacts,
  onSetTarget,
  onSetGun,
  onLocateGun,
  onCenterChange,
  realLatLng,
  isFiring,
  showExplosion,
  fireProgress = 0,
  isGunLocated
}: TacticalMapProps) {
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleLocateExact = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS no soportado");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onSetGun(newCoords);
        if (onCenterChange) onCenterChange(newCoords); // Actualiza el centro global
        setGpsError(null);
      },
      (err) => {
        console.error(err);
        setGpsError("Señal GPS débil");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#F39C63] shadow-2xl group">
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={15}
        className="w-full h-full z-0"
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />

        {/* CORRECCIÓN: Ahora usa la prop mapCenter que viene del buscador */}
        <CenterManager center={mapCenter} />

        <MapEventsHandler 
          onSetTarget={onSetTarget} 
          onSetGun={onSetGun} 
          onCenterChange={onCenterChange} 
        />

        {/* Marcador de Pieza: Muestra la posición real de la artillería[cite: 5] */}
        {gunPosition && (
          <Marker 
            position={[gunPosition.lat, gunPosition.lng]}
            icon={new L.DivIcon({
              className: 'custom-icon',
              html: `<div class="w-8 h-8 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg shadow-blue-500/40">
                      <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup className="tactical-popup">PIEZA DE ARTILLERÍA</Popup>
          </Marker>
        )}

        {/* (Marcadores de Objetivo e Impactos se mantienen igual...) */}
        {targetPosition && (
          <Marker 
            position={[targetPosition.lat, targetPosition.lng]}
            icon={new L.DivIcon({
              className: 'custom-icon',
              html: `<div class="w-8 h-8 bg-[#F39C63]/20 border-2 border-[#F39C63] rounded-sm rotate-45 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-[#F39C63]/40">
                        <div class="w-2 h-2 bg-[#F39C63] rounded-full"></div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup className="tactical-popup">OBJETIVO DESIGNADO</Popup>
          </Marker>
        )}

        {isFiring && gunPosition && targetPosition && (
          <Polyline 
            positions={[
              [gunPosition.lat, gunPosition.lng],
              [
                gunPosition.lat + (targetPosition.lat - gunPosition.lat) * (fireProgress / 100),
                gunPosition.lng + (targetPosition.lng - gunPosition.lng) * (fireProgress / 100)
              ]
            ]}
            pathOptions={{ color: '#F39C63', weight: 2, dashArray: '6, 4' }} 
          />
        )}

        {showExplosion && targetPosition && (
          <ExplosionOverlay position={targetPosition} />
        )}

        {impacts.map((impact, i) => (
          <Marker
            key={i}
            position={[impact.lat, impact.lng]}
            icon={new L.DivIcon({
              className: 'impact-icon',
              html: `<div class="w-4 h-4 bg-red-600/60 border border-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />
        ))}
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "h-10 w-10 shadow-2xl backdrop-blur-xl border transition-all active:scale-95",
            gpsError ? "bg-red-500/90 border-red-500 text-white" : "bg-black/60 border-[#F39C63]/40 text-[#F39C63]"
          )}
          onClick={handleLocateExact}
        >
          <Navigation className={cn("w-5 h-5", !gpsError && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
}