'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Globe, Search } from 'lucide-react';
import { type LatLng } from '@/lib/ballistics';

interface LocalisatorPanelProps {
  calcRange: number;
  calcAzimuth: number;
  calcDeltaX: number;
  calcDeltaY: number;
  handlePolarChange: (r: number, az: number) => void;
  handleRectChange: (dx: number, dy: number) => void;
  setCalcTargetCoord: (coord: LatLng) => void;
}

export function LocalisatorPanel({
  calcRange,
  calcAzimuth,
  calcDeltaX,
  calcDeltaY,
  handlePolarChange,
  handleRectChange,
  setCalcTargetCoord,
}: LocalisatorPanelProps) {
  return (
    <Card className="p-8 bg-black/40 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Globe className="w-24 h-24 text-accent" />
      </div>

      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="p-2.5 bg-accent/20 rounded-xl">
          <Globe className="w-5 h-5 text-accent" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">Santa Bárbara Localizer</h2>
          <span className="text-[8px] font-bold text-white/20 tracking-[0.3em] uppercase mt-0.5">Geospatial Targeting Unit</span>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-accent rounded-full" />
            <Label className="text-[10px] uppercase font-black tracking-widest text-white/40">Coordinate Telemetry</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/5 gap-3 group hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-primary transition-colors">Polar (D ∠ AZ)</span>
              </div>
              <div className="flex gap-2 items-center">
                <Input 
                  type="number" 
                  value={calcRange} 
                  onChange={(e) => handlePolarChange(Number(e.target.value), calcAzimuth)}
                  className="h-10 text-xs bg-black/40 font-mono border-white/10 rounded-xl focus:border-primary/50 transition-all font-bold text-white"
                  placeholder="Range"
                />
                <span className="text-primary font-black text-lg">∠</span>
                <Input 
                  type="number" 
                  value={calcAzimuth} 
                  onChange={(e) => handlePolarChange(calcRange, Number(e.target.value))}
                  className="h-10 text-xs bg-black/40 font-mono border-white/10 rounded-xl focus:border-primary/50 transition-all font-bold text-white"
                  placeholder="Azimuth"
                />
              </div>
            </div>

            <div className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/5 gap-3 group hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-accent transition-colors">Rectangular (ΔX | ΔY)</span>
              </div>
              <div className="flex gap-2 items-center">
                <Input 
                  type="number" 
                  value={calcDeltaX} 
                  onChange={(e) => handleRectChange(Number(e.target.value), calcDeltaY)}
                  className="h-10 text-xs bg-black/40 font-mono border-white/10 rounded-xl focus:border-accent/50 transition-all font-bold text-white"
                  placeholder="ΔX"
                />
                <span className="text-accent font-black text-lg opacity-40">|</span>
                <Input 
                  type="number" 
                  value={calcDeltaY} 
                  onChange={(e) => handleRectChange(calcDeltaX, Number(e.target.value))}
                  className="h-10 text-xs bg-black/40 font-mono border-white/10 rounded-xl focus:border-accent/50 transition-all font-bold text-white"
                  placeholder="ΔY"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-white/5 h-[1px]" />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-white/20 rounded-full" />
            <Label className="text-[10px] uppercase font-black tracking-widest text-white/40">Geographic Search</Label>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input 
                placeholder="Lat, Lng or UTM/MGRS Coordinates..." 
                className="bg-black/40 border-white/10 text-xs h-12 rounded-2xl pl-10 focus:border-accent/50 transition-all font-bold text-white w-full" 
                onChange={(e) => {
                  const val = e.target.value.split(',');
                  if (val.length === 2) {
                    setCalcTargetCoord({ lat: parseFloat(val[0]), lng: parseFloat(val[1]) });
                  }
                }}
              />
              <Search className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <Button className="bg-accent hover:bg-accent/80 text-white h-12 w-12 rounded-2xl shadow-lg shadow-accent/20 active:scale-95 transition-all" size="icon">
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
