'use client';

import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Cloud, Wind, Thermometer, Droplets, Gauge, RefreshCw, Minus } from 'lucide-react';
import { type MetData, getTacticalMet, type LatLng } from '@/lib/ballistics';
import { Button } from '@/components/ui/button';

interface MeteorologyPanelProps {
  position: LatLng;
  onCollapse?: () => void;
}

export function MeteorologyPanel({ position, onCollapse }: MeteorologyPanelProps) {
  const [met, setMet] = useState<MetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRealLocation = () =>
    new Promise<LatLng>((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        reject(new Error('Este equipo no soporta geolocalización.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (geoError) => {
          const messages: Record<number, string> = {
            [geoError.PERMISSION_DENIED]: 'Permiso de ubicación denegado.',
            [geoError.POSITION_UNAVAILABLE]: 'Ubicación no disponible.',
            [geoError.TIMEOUT]: 'La ubicación tardó demasiado.',
          };
          reject(new Error(messages[geoError.code] ?? 'No se pudo obtener la ubicación real.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000,
        },
      );
    });

  const updateMet = async () => {
    setLoading(true);
    setError(null);

    try {
      const realPosition = await getRealLocation();
      const data = await getTacticalMet(realPosition);
      setMet(data);
    } catch (err) {
      setMet(null);
      setError(err instanceof Error ? err.message : 'No se pudo sincronizar meteorología real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateMet();
  }, []);

  return (
    <Card className="p-3 bg-transparent border-[#F39C63] border-2 w-72 backdrop-blur-sm rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-3 h-3 text-[#F39C63]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#F39C63]">Meteorología Táctica</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={updateMet}
            className="h-7 w-7 text-[#F39C63]/60 hover:text-[#F39C63] transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="h-7 w-7 text-[#F39C63]/60 hover:text-[#F39C63] transition-colors"
              title="Retraer meteorología"
            >
              <Minus className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {!met ? (
        <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
          {loading ? 'Sincronizando GPS...' : error ?? 'Sin Datos Reales'}
        </div>
      ) : (
        <>
          <div className="mb-2 rounded-lg border border-[#F39C63]/20 bg-black/20 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40">
            {met.source} · GPS real · {met.observedAt ?? 'actual'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MetStat icon={<Thermometer />} label="Temp" value={met.temp} unit="°C" />
            <MetStat icon={<Gauge />} label="Presión" value={met.pressure} unit="hPa" />
            <MetStat icon={<Wind />} label="Viento" value={met.windSpeed} unit="m/s" />
            <MetStat icon={<Wind />} label="Dir" value={met.windDirMils} unit="MIL" isSpecial />
            <MetStat icon={<Droplets />} label="Humedad" value={met.humidity} unit="%" />
            <MetStat icon={<Cloud />} label="Altitud" value={met.elevation} unit="m" />
          </div>
        </>
      )}
    </Card>
  );
}

function MetStat({ icon, label, value, unit, isSpecial = false }: { icon: React.ReactNode, label: string, value: number, unit: string, isSpecial?: boolean }) {
  // Redondear a máximo 1 cifra decimal
  const displayValue = Math.round(value * 10) / 10;

  return (
    <div className="bg-black/20 p-2 rounded-lg border border-white/5">
      <div className="flex items-center gap-1.5 mb-1 opacity-60">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-2.5 h-2.5 text-[#F39C63]" })}
        <span className="text-[10px] font-bold uppercase text-white/50 tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm font-black font-mono ${isSpecial ? 'text-[#F39C63]' : 'text-white'}`}>
          {displayValue}
        </span>
        <span className="text-[8px] font-bold text-white/30">{unit}</span>
      </div>
    </div>
  );
}
