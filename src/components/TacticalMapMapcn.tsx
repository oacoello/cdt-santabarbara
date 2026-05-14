'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { type LatLng } from '@/lib/ballistics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'VRmMIQ93urJL9gK2BcI1'; 
const MAP_STYLE = `https://api.maptiler.com/maps/outdoor-v2-dark/style.json?key=${MAPTILER_KEY}`;

interface TacticalMapProps {
  gunPosition: LatLng | null;
  targetPosition: LatLng | null;
  mapCenter: LatLng;
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
  mapModelBounds?: [LatLng, LatLng] | null;
}

/**
 * Calcula puntos con altitud Z para renderizado 3D.
 */
const get3DParabolicPath = (start: LatLng, end: LatLng, progress: number, segments: number = 100) => {
  const points = [];
  const currentSegments = Math.floor(segments * (progress / 100));
  
  // Cálculo de distancia aproximada en metros para una parábola realista
  const R = 6371e3; // Radio de la Tierra
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLon = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const distanceInMeters = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;

  // Altura máxima: 1/4 de la distancia (típico de trayectoria parabólica de artillería)
  const maxHeight = distanceInMeters * 0.25; 

  for (let i = 0; i <= currentSegments; i++) {
    const t = i / segments;
    const lng = start.lng + (end.lng - start.lng) * t;
    const lat = start.lat + (end.lat - start.lat) * t;
    
    // Altitud en metros: h = 4 * H * t * (1 - t)
    const alt = 4 * maxHeight * t * (1 - t);
    
    // IMPORTANTE: MapLibre usa [lng, lat, alt]
    points.push([lng, lat, alt]);
  }
  return points;
};

export function TacticalMapMapcn({
  gunPosition,
  targetPosition,
  mapCenter,
  impacts,
  onSetTarget,
  onSetGun,
  onCenterChange,
  isFiring,
  fireProgress = 0,
  mapModelBounds,
}: TacticalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 14,
      pitch: 65, // Inclinación fuerte para ver el arco volar
      bearing: 0,
      attributionControl: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;
      
      map.current.addSource('trajectory', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
      });
      

      map.current.addLayer({
        id: 'trajectory-line',
        type: 'line',
        source: 'trajectory',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#F39C63',
          'line-width': 4,
          'line-opacity': 0.9
        }
      });
    });

    map.current.on('click', (e) => onSetGun({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    map.current.on('contextmenu', (e) => {
      e.preventDefault();
      onSetTarget({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.flyTo({ center: [mapCenter.lng, mapCenter.lat], duration: 1000 });
    }
  }, [mapCenter]);

  // Actualización de Trayectoria con elevación Z
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const source = map.current.getSource('trajectory') as maplibregl.GeoJSONSource;
    if (!source) return;

    if (isFiring && gunPosition && targetPosition) {
      const curvePoints = get3DParabolicPath(gunPosition, targetPosition, fireProgress);
      source.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: curvePoints },
        properties: {}
      });
    } else {
      source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });
    }
  }, [fireProgress, isFiring, gunPosition, targetPosition]);

  // Map Model Bounds Rectangle
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    if (mapModelBounds) {
      const bounds = mapModelBounds;
      const rectangleData: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bounds[0].lng, bounds[0].lat], // SW
            [bounds[1].lng, bounds[0].lat], // SE
            [bounds[1].lng, bounds[1].lat], // NE
            [bounds[0].lng, bounds[1].lat], // NW
            [bounds[0].lng, bounds[0].lat]  // Close
          ]]
        },
        properties: {}
      };

      if (map.current.getSource('map-model-rectangle')) {
        (map.current.getSource('map-model-rectangle') as maplibregl.GeoJSONSource).setData(rectangleData);
      } else {
        map.current.addSource('map-model-rectangle', {
          type: 'geojson',
          data: rectangleData
        });

        map.current.addLayer({
          id: 'map-model-rectangle',
          type: 'line',
          source: 'map-model-rectangle',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 3,
            'line-opacity': 1,
            'line-dasharray': [2, 2]
          }
        });
      }
      
      // Zoom para enmarcar el mapa modelo
      map.current.fitBounds([
        [bounds[0].lng, bounds[0].lat],
        [bounds[1].lng, bounds[1].lat]
      ], { padding: 50, duration: 1500 });
    } else {
      if (map.current.getSource('map-model-rectangle')) {
        map.current.removeLayer('map-model-rectangle');
        map.current.removeSource('map-model-rectangle');
      }
    }
  }, [mapModelBounds]);

  useEffect(() => {
    if (!map.current) return;
    const updateMarker = (id: string, pos: LatLng | null, html: string) => {
      if (markersRef.current[id]) markersRef.current[id].remove();
      if (!pos) return;
      const el = document.createElement('div');
      el.innerHTML = html;
      markersRef.current[id] = new maplibregl.Marker({ element: el })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map.current!);
    };

    updateMarker('gun', gunPosition, `
      <div class="w-8 h-8 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
      </div>`);

    updateMarker('target', targetPosition, `
      <div class="w-8 h-8 bg-[#F39C63]/20 border-2 border-[#F39C63] rounded-sm rotate-45 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(243,156,99,0.5)]">
        <div class="w-2 h-2 bg-[#F39C63] rounded-full"></div>
      </div>`);

    Object.keys(markersRef.current).forEach(k => { if (k.startsWith('impact-')) markersRef.current[k].remove(); });
    impacts.forEach((imp, i) => {
      updateMarker(`impact-${i}`, imp, `<div class="w-4 h-4 bg-red-600/60 border border-red-400 rounded-full animate-ping"></div>`);
    });
  }, [gunPosition, targetPosition, impacts]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#F39C63] shadow-2xl">
      <div ref={mapContainer} className="w-full h-full bg-[#0A0A0B]" />
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10 shadow-2xl backdrop-blur-xl border bg-black/60 border-[#F39C63]/40 text-[#F39C63]"
          onClick={() => {
            navigator.geolocation.getCurrentPosition((pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              onSetGun(coords);
              if (onCenterChange) onCenterChange(coords);
            });
          }}
        >
          <Navigation className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}