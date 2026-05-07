'use client';

import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Cloud, Wind, Thermometer, Droplets, Gauge, RefreshCw } from 'lucide-react';
import { type MetData, getTacticalMet, type LatLng } from '@/lib/ballistics';
import { Button } from '@/components/ui/button';

interface MeteorologyPanelProps {
  position: LatLng;
}

export function MeteorologyPanel({ position }: MeteorologyPanelProps) {
  const [met, setMet] = useState<MetData | null>(null);
  const [loading, setLoading] = useState(false);

  const updateMet = async () => {
    setLoading(true);
    const data = await getTacticalMet(position.lat, position.lng);
    setMet(data);
    setLoading(false);
  };

  useEffect(() => {
    updateMet();
  }, [position.lat, position.lng]);

  return (
    <Card className="p-3 bg-transparent border-[#F39C63] border-2 w-72 backdrop-blur-sm rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-3 h-3 text-[#F39C63]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#F39C63]">Meteorología Táctica</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={updateMet}
          className="h-7 w-7 text-[#F39C63]/60 hover:text-[#F39C63] transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {!met ? (
        <div className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-white/30">
          {loading ? 'Sincronizando...' : 'Sin Datos'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MetStat icon={<Thermometer/>} label="Temp" value={met.temp} unit="°C" />
          <MetStat icon={<Gauge/>} label="Presión" value={met.pressure} unit="hPa" />
          <MetStat icon={<Wind/>} label="Viento" value={met.windSpeed} unit="m/s" />
          <MetStat icon={<Wind/>} label="Dir" value={met.windDirMils} unit="MIL" isSpecial />
          <MetStat icon={<Droplets/>} label="Humedad" value={met.humidity} unit="%" />
          <MetStat icon={<Cloud/>} label="Altitud" value={met.elevation} unit="m" />
        </div>
      )}
    </Card>
  );
}

function MetStat({ icon, label, value, unit, isSpecial = false }: { icon: React.ReactNode, label: string, value: number, unit: string, isSpecial?: boolean }) {
  return (
    <div className="bg-black/20 p-2 rounded-lg border border-white/5">
      <div className="flex items-center gap-1.5 mb-1 opacity-60">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-2.5 h-2.5 text-[#F39C63]" })}
        <span className="text-[10px] font-bold uppercase text-white/50 tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-sm font-black font-mono ${isSpecial ? 'text-[#F39C63]' : 'text-white'}`}>
          {value}
        </span>
        <span className="text-[8px] font-bold text-white/30">{unit}</span>
      </div>
    </div>
  );
}