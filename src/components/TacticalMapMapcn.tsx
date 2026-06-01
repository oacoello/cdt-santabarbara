'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { type LatLng } from '@/lib/ballistics';
import { latLonToUtm, utmToLatLon } from '@/lib/coordinates';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'VRmMIQ93urJL9gK2BcI1'; 
const MAP_STYLE = `https://api.maptiler.com/maps/outdoor-v2-dark/style.json?key=${MAPTILER_KEY}`;

const UTM_GRID_ZONE = 16;
const UTM_GRID_BAND = 'P';
const UTM_GRID_LABEL = `${UTM_GRID_ZONE}${UTM_GRID_BAND}`;

const shouldHideNonSettlementLabel = (layer: maplibregl.LayerSpecification) => {
  if (layer.type !== 'symbol') return false;

  const id = layer.id.toLowerCase();
  const sourceLayer = String((layer as { 'source-layer'?: unknown })['source-layer'] ?? '').toLowerCase();
  const text = `${id} ${sourceLayer}`;

  const keepSettlementLabels = [
    'place',
    'settlement',
    'city',
    'town',
    'village',
    'hamlet',
    'municipality',
    'neighbourhood',
    'neighborhood',
    'suburb',
    'locality',
  ];

  if (keepSettlementLabels.some((term) => text.includes(term))) return false;

  return [
    'poi',
    'amenity',
    'business',
    'shop',
    'commercial',
    'tourism',
    'leisure',
    'religion',
    'place_of_worship',
    'housenumber',
  ].some((term) => text.includes(term));
};

const hideNonSettlementLabels = (mapInstance: maplibregl.Map) => {
  mapInstance.getStyle().layers?.forEach((layer) => {
    if (!shouldHideNonSettlementLabel(layer)) return;
    mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
  });
};

const getGridStepMeters = (zoom: number) => {
  if (zoom >= 15) return 1000;
  if (zoom >= 13) return 2000;
  if (zoom >= 11) return 5000;
  return 10000;
};

const buildUtmGridData = (bounds: maplibregl.LngLatBounds, zoom: number) => {
  const step = getGridStepMeters(zoom);
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const nw = bounds.getNorthWest();
  const se = bounds.getSouthEast();
  const corners = [sw, ne, nw, se].map((corner) => latLonToUtm(corner.lat, corner.lng, UTM_GRID_ZONE));

  const minE = Math.floor(Math.min(...corners.map((c) => c.easting)) / step) * step;
  const maxE = Math.ceil(Math.max(...corners.map((c) => c.easting)) / step) * step;
  const minN = Math.floor(Math.min(...corners.map((c) => c.northing)) / step) * step;
  const maxN = Math.ceil(Math.max(...corners.map((c) => c.northing)) / step) * step;
  const sampleStep = Math.max(250, step / 4);

  const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  const labelFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
  const quadrantFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (let easting = minE; easting <= maxE; easting += step) {
    const coordinates: [number, number][] = [];
    for (let northing = minN; northing <= maxN; northing += sampleStep) {
      const point = utmToLatLon(easting, northing, UTM_GRID_ZONE, UTM_GRID_BAND);
      coordinates.push([point.longitude, point.latitude]);
    }
    lineFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { kind: 'easting', label: `E ${Math.round(easting)}` },
    });
    const labelPoint = utmToLatLon(easting, minN + step * 0.35, UTM_GRID_ZONE, UTM_GRID_BAND);
    labelFeatures.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [labelPoint.longitude, labelPoint.latitude] },
      properties: { label: `E ${Math.round(easting)}` },
    });
  }

  for (let northing = minN; northing <= maxN; northing += step) {
    const coordinates: [number, number][] = [];
    for (let easting = minE; easting <= maxE; easting += sampleStep) {
      const point = utmToLatLon(easting, northing, UTM_GRID_ZONE, UTM_GRID_BAND);
      coordinates.push([point.longitude, point.latitude]);
    }
    lineFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { kind: 'northing', label: `N ${Math.round(northing)}` },
    });
    const labelPoint = utmToLatLon(minE + step * 0.35, northing, UTM_GRID_ZONE, UTM_GRID_BAND);
    labelFeatures.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [labelPoint.longitude, labelPoint.latitude] },
      properties: { label: `N ${Math.round(northing)}` },
    });
  }

  for (let easting = minE; easting < maxE; easting += step) {
    for (let northing = minN; northing < maxN; northing += step) {
      const center = utmToLatLon(easting + step / 2, northing + step / 2, UTM_GRID_ZONE, UTM_GRID_BAND);
      quadrantFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [center.longitude, center.latitude] },
        properties: { label: UTM_GRID_LABEL },
      });
    }
  }

  return {
    lines: { type: 'FeatureCollection', features: lineFeatures } as GeoJSON.FeatureCollection<GeoJSON.LineString>,
    labels: { type: 'FeatureCollection', features: labelFeatures } as GeoJSON.FeatureCollection<GeoJSON.Point>,
    quadrants: { type: 'FeatureCollection', features: quadrantFeatures } as GeoJSON.FeatureCollection<GeoJSON.Point>,
  };
};


interface TacticalMapProps {
  gunPosition: LatLng | null;
  targetPosition: LatLng | null;
  observerPosition?: LatLng | null;
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
  enableClickPlacement?: boolean;
  compassClassName?: string;
}

/**
 * Calcula puntos con altitud Z para renderizado 3D.
 */
const get3DParabolicPath = (start: LatLng, end: LatLng, progress: number, segments: number = 100) => {
  const points = [];
  const currentSegments = Math.floor(segments * (progress / 100));
  
  // CÃ¡lculo de distancia aproximada en metros para una parÃ¡bola realista
  const R = 6371e3; // Radio de la Tierra
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLon = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const distanceInMeters = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * R;

  // Altura mÃ¡xima: 1/4 de la distancia (tÃ­pico de trayectoria parabÃ³lica de artillerÃ­a)
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
  observerPosition,
  mapCenter,
  impacts,
  onSetTarget,
  onSetGun,
  onCenterChange,
  isFiring,
  fireProgress = 0,
  mapModelBounds,
  enableClickPlacement = false,
  compassClassName,
}: TacticalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [mapBearing, setMapBearing] = useState(0);
  const [mapPitch, setMapPitch] = useState(65);
  const [isLocating, setIsLocating] = useState(false);

  const requestUserLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      window.alert('Este entorno no soporta geolocalización.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onCenterChange?.(coords);
        const mapInstance = map.current;
        mapInstance?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: Math.max(mapInstance.getZoom(), 15),
          duration: 900,
        });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'Permiso de ubicación denegado.',
          [error.POSITION_UNAVAILABLE]: 'La ubicación no está disponible en este equipo.',
          [error.TIMEOUT]: 'La solicitud de ubicación tardó demasiado.',
        };
        window.alert(messages[error.code] ?? 'No se pudo obtener la ubicación.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 14,
      pitch: 65, // InclinaciÃ³n fuerte para ver el arco volar
      bearing: 0,
      attributionControl: false,
    });

    const syncMapOrientation = () => {
      if (!map.current) return;
      setMapBearing(map.current.getBearing());
      setMapPitch(map.current.getPitch());
    };

    map.current.on('move', syncMapOrientation);
    map.current.on('rotate', syncMapOrientation);
    map.current.on('pitch', syncMapOrientation);

    map.current.on('load', () => {
      if (!map.current) return;
      hideNonSettlementLabels(map.current);
      
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

      map.current.addSource('utm-grid-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'utm-grid-lines',
        type: 'line',
        source: 'utm-grid-lines',
        paint: {
          'line-color': '#85C5F1',
          'line-width': 1,
          'line-opacity': 0.45
        }
      });

      map.current.addSource('utm-grid-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'utm-grid-labels',
        type: 'symbol',
        source: 'utm-grid-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#85C5F1',
          'text-halo-color': '#0A0A0E',
          'text-halo-width': 2,
          'text-opacity': 0.95
        }
      });



      map.current.addSource('utm-grid-quadrants', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'utm-grid-quadrants',
        type: 'symbol',
        source: 'utm-grid-quadrants',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 15,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#D8DEE9',
          'text-halo-color': '#0A0A0E',
          'text-halo-width': 2,
          'text-opacity': 0.35
        }
      });

      const updateUtmGrid = () => {
        if (!map.current) return;
        const lines = map.current.getSource('utm-grid-lines') as maplibregl.GeoJSONSource | undefined;
        const labels = map.current.getSource('utm-grid-labels') as maplibregl.GeoJSONSource | undefined;
        const quadrants = map.current.getSource('utm-grid-quadrants') as maplibregl.GeoJSONSource | undefined;
        if (!lines || !labels || !quadrants) return;
        const grid = buildUtmGridData(map.current.getBounds(), map.current.getZoom());
        lines.setData(grid.lines);
        labels.setData(grid.labels);
        quadrants.setData(grid.quadrants);
      };

      updateUtmGrid();
      map.current.on('moveend', updateUtmGrid);
      map.current.on('zoomend', updateUtmGrid);

    });

    if (enableClickPlacement) {
      map.current.on('click', (e) => onSetGun({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    }
    map.current.on('contextmenu', (e) => {
      e.preventDefault();
      if (enableClickPlacement) {
        onSetTarget({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (map.current) {
      map.current.flyTo({ center: [mapCenter.lng, mapCenter.lat], duration: 1000 });
    }
  }, [mapCenter]);

  // ActualizaciÃ³n de Trayectoria con elevaciÃ³n Z
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
      <div class="relative flex flex-col items-center">
        <div class="mb-1 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[10px] font-black tracking-widest text-blue-300 border border-blue-400/50">Pieza</div>
        <div class="w-8 h-8 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      </div>`);

    updateMarker('observer', observerPosition ?? null, `
      <div class="relative flex flex-col items-center">
        <div class="mb-1 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[10px] font-black tracking-widest text-white border border-white/60">Obs</div>
        <div class="w-8 h-8 bg-white/20 border-2 border-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(255,255,255,0.55)]">
          <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
      </div>`);

    updateMarker('target', targetPosition, `
      <div class="relative flex flex-col items-center">
        <div class="mb-1 whitespace-nowrap rounded bg-black/75 px-2 py-0.5 text-[10px] font-black tracking-widest text-[#F39C63] border border-[#F39C63]/50">Obj</div>
        <div class="w-8 h-8 bg-[#F39C63]/20 border-2 border-[#F39C63] rounded-sm rotate-45 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(243,156,99,0.5)]">
          <div class="w-2 h-2 bg-[#F39C63] rounded-full"></div>
        </div>
      </div>`);

    Object.keys(markersRef.current).forEach(k => { if (k.startsWith('impact-')) markersRef.current[k].remove(); });
    impacts.forEach((imp, i) => {
      updateMarker(`impact-${i}`, imp, `<div class="w-4 h-4 bg-red-600/60 border border-red-400 rounded-full animate-ping"></div>`);
    });
  }, [gunPosition, targetPosition, observerPosition, impacts]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#F39C63] shadow-2xl">
      <div ref={mapContainer} className="w-full h-full bg-[#0A0A0B]" />
      <button
        type="button"
        title="Restablecer norte e inclinación"
        className={cn(
          "absolute top-4 left-4 z-[1000] flex flex-col items-center gap-1 rounded-2xl border border-slate-300/25 bg-[#0A0A0E]/75 px-2 py-2 shadow-2xl backdrop-blur-md transition hover:border-slate-200/45 hover:bg-[#0A0A0E]/90",
          compassClassName,
        )}
        onClick={() => {
          map.current?.easeTo({ bearing: 0, pitch: 65, duration: 700 });
        }}
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-300/20 bg-slate-400/5">
          <div className="absolute h-14 w-[1px] bg-slate-300/35" />
          <div className="absolute h-[1px] w-14 bg-slate-300/25" />
          <div className="absolute top-1 text-[10px] font-black tracking-widest text-slate-200">N</div>
          <div className="absolute right-2 text-[9px] font-black tracking-widest text-slate-400">E</div>
          <div className="absolute bottom-1 text-[9px] font-black tracking-widest text-slate-500">S</div>
          <div className="absolute left-2 text-[9px] font-black tracking-widest text-slate-400">W</div>
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
            style={{ transform: `rotate(${-mapBearing}deg)` }}
          >
            <div className="absolute -translate-y-3 h-0 w-0 border-x-[7px] border-b-[28px] border-x-transparent border-b-slate-100 drop-shadow-[0_0_8px_rgba(216,222,233,0.45)]" />
            <div className="absolute translate-y-4 h-0 w-0 border-x-[5px] border-t-[20px] border-x-transparent border-t-slate-500/85" />
          </div>
          <div
            className="absolute bottom-4 h-[3px] w-9 rounded-full bg-[#85C5F1]/70 transition-transform duration-100"
            style={{ transform: `perspective(60px) rotateX(${Math.min(mapPitch, 75)}deg)` }}
          />
        </div>
        <div className="flex w-full items-center justify-between gap-2 px-1 font-mono text-[9px] font-black text-slate-300/85">
          <span>{Math.round((mapBearing + 360) % 360).toString().padStart(3, '0')}°</span>
          <span>{Math.round(mapPitch)}°</span>
        </div>
      </button>
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          disabled={isLocating}
          title={isLocating ? 'Solicitando ubicación...' : 'Solicitar ubicación actual'}
          className="h-10 w-10 shadow-2xl backdrop-blur-xl border bg-black/60 border-[#F39C63]/40 text-[#F39C63]"
          onClick={requestUserLocation}
        >
          <Navigation className={cn("w-5 h-5", isLocating && "animate-pulse")} />
        </Button>
      </div>
    </div>
  );
}
