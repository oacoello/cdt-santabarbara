'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Zap } from 'lucide-react';
import { getTacticalMet, type MetData, type TelemetryData } from '@/lib/ballistics';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TelemetryPanelProps {
  probeLat: string;
  setProbeLat: (lat: string) => void;
  probeLng: string;
  setProbeLng: (lng: string) => void;
  isMetLoading: boolean;
  setIsMetLoading: (loading: boolean) => void;
  manualMet: MetData | null;
  setManualMet: (data: MetData | null) => void;
  telemetry: TelemetryData | null;
  isLoadingMet: boolean;
  handleFetchMet: () => void;
}

export function TelemetryPanel({
  probeLat,
  setProbeLat,
  probeLng,
  setProbeLng,
  isMetLoading,
  setIsMetLoading,
  manualMet,
  setManualMet,
  telemetry,
  isLoadingMet,
  handleFetchMet
}: TelemetryPanelProps) {
  const { toast } = useToast();

  return (
    <>
      <Card className="mt-6 p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl ring-1 ring-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Activity className="w-24 h-24 text-accent" />
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-6 mb-8 relative z-10">
          <div className="space-y-2 flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-3 bg-accent rounded-full" />
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">Sondeo Atmosférico (GPS)</Label>
            </div>
            <div className="flex gap-3">
              <Input 
                className="h-10 text-xs font-mono bg-white/5 border-white/10 rounded-xl focus:border-accent/50 transition-all font-bold text-white shadow-inner" 
                value={probeLat}
                onChange={(e) => setProbeLat(e.target.value)}
                placeholder="LAT"
              />
              <Input 
                className="h-10 text-xs font-mono bg-white/5 border-white/10 rounded-xl focus:border-accent/50 transition-all font-bold text-white shadow-inner" 
                value={probeLng}
                onChange={(e) => setProbeLng(e.target.value)}
                placeholder="LNG"
              />
            </div>
          </div>
          <Button 
            className="h-10 px-6 bg-accent hover:bg-accent/80 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95 whitespace-nowrap"
            disabled={isMetLoading}
            onClick={async () => {
              setIsMetLoading(true);
              const data = await getTacticalMet({ lat: parseFloat(probeLat), lng: parseFloat(probeLng) });
              setManualMet(data);
              setIsMetLoading(false);
              if(data) toast({ title: "Enlace MET Establecido", description: "Datos atmosféricos actualizados exitosamente." });
            }}
          >
            {isMetLoading ? <span className="animate-pulse flex items-center gap-2"><Activity className="w-3 h-3 animate-spin" /> Synchronizing...</span> : "Establish MET Link"}
          </Button>
        </div>

        {manualMet ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/5 pt-8 relative z-10">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase text-white/30 font-black tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Wind Dir</p>
              <p className="text-xl font-mono font-black text-blue-400">
                {manualMet.windDirMils} <span className="text-[10px] text-blue-400/40 font-bold tracking-normal">MIL</span>
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase text-white/30 font-black tracking-widest mb-1 group-hover:text-blue-300 transition-colors">Wind Vel</p>
              <p className="text-xl font-mono font-black text-white/90">
                {manualMet.windSpeed} <span className="text-[10px] text-white/30 font-bold tracking-normal">m/s</span>
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase text-white/30 font-black tracking-widest mb-1 group-hover:text-yellow-500 transition-colors">Temp</p>
              <p className="text-xl font-mono font-black text-yellow-500">
                {manualMet.temp}° <span className="text-[10px] text-yellow-500/40 font-bold tracking-normal">C</span>
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center group hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase text-white/30 font-black tracking-widest mb-1 group-hover:text-accent transition-colors">DEM Elev</p>
              <p className="text-xl font-mono font-black text-accent">
                {manualMet.elevation} <span className="text-[10px] text-accent/40 font-bold tracking-normal">m</span>
              </p>
            </div>
            
            <div className="col-span-full flex justify-between px-4 py-2 bg-black/40 rounded-xl border border-white/5">
               <span className="text-[10px] font-mono text-white/20 font-bold uppercase tracking-widest">Humidity: <span className="text-white/60">{manualMet.humidity}%</span></span>
               <span className="text-[10px] font-mono text-white/20 font-bold uppercase tracking-widest">Pressure: <span className="text-white/60">{manualMet.pressure} hPa</span></span>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-black/20 rounded-2xl border border-dashed border-white/10 relative z-10 group hover:border-accent/40 transition-colors">
            <Activity className="w-6 h-6 text-white/10 mx-auto mb-2 group-hover:text-accent/40 transition-colors" />
            <div className="text-[10px] text-white/30 font-black tracking-[0.3em] uppercase">No MET Data // Waiting for Signal</div>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-white/[0.02] backdrop-blur-lg border border-white/5 rounded-3xl mt-8 shadow-xl ring-1 ring-white/10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Zap className="w-4 h-4 text-accent fill-accent/20" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Satellite MET Analysis</h3>
              <span className="text-[8px] font-bold text-white/20 tracking-wider">SOURCE: OPEN-METEO // REAL-TIME TOPOGRAPHY</span>
            </div>
          </div>
          <Button 
            onClick={handleFetchMet} 
            disabled={isLoadingMet}
            variant="outline"
            className="h-10 px-6 text-[10px] uppercase font-black tracking-widest bg-white/5 border-white/10 text-white/60 hover:text-accent hover:border-accent/40 rounded-xl transition-all active:scale-95"
          >
            {isLoadingMet ? <span className="flex items-center gap-2"><Activity className="w-3 h-3 animate-spin" /> Receiving...</span> : "Fetch Satellite Data"}
          </Button>
        </div>

        {telemetry ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <TeleCard label="Elevation" value={`${telemetry.elevation}m`} color="text-white" />
            <TeleCard label="Surface Temp" value={`${telemetry.temperature}°C`} color="text-yellow-500" />
            <TeleCard label="Wind Velocity" value={`${telemetry.windSpeed} m/s`} color="text-blue-400" />
            <TeleCard label="Wind Azimuth" value={`${Math.round(telemetry.windDirection * 17.777)} MIL`} color="text-blue-400" />
            <TeleCard label="Rel Humidity" value={`${telemetry.humidity}%`} color="text-white" />
          </div>
        ) : (
          <div className="text-center py-10 text-[10px] font-black tracking-[0.2em] text-white/20 uppercase border border-dashed border-white/10 rounded-2xl bg-black/5 hover:border-white/20 transition-colors">
            Awaiting Probe Data Broadcast
          </div>
        )}
      </Card>
    </>
  );
}

function TeleCard({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-center group hover:border-white/20 transition-all">
      <p className="text-[8px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-white/40">{label}</p>
      <p className={cn("text-sm font-mono font-black", color)}>{value}</p>
    </div>
  );
}
