'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, ClipboardList } from 'lucide-react';
import dynamic from 'next/dynamic';
const TacticalMap = dynamic(() => import('@/components/TacticalMap').then(mod => mod.TacticalMap), { ssr: false });
import { type LatLng } from '@/lib/ballistics';

interface GeodeticLocalisatorProps {
  toolOrigin: LatLng;
  toolTarget: LatLng | null;
  setToolTarget: (coord: LatLng) => void;
  setToolOrigin: (coord: LatLng) => void;
  setCalcTargetCoord: (coord: LatLng) => void;
  handleGenerateToolCoords: () => void;
}

export function GeodeticLocalisator({
  toolOrigin,
  toolTarget,
  setToolTarget,
  setToolOrigin,
  setCalcTargetCoord,
  handleGenerateToolCoords
}: GeodeticLocalisatorProps) {
  return (
    <Card className="p-6 bg-card/50 border-primary/20 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black uppercase text-primary flex items-center gap-2">
          <MapIcon className="w-4 h-4" /> Localizador Geodésico Pro
        </h2>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleGenerateToolCoords}
          className="h-8 text-[10px] font-black uppercase tracking-widest gap-2"
        >
          <ClipboardList className="w-3.5 h-3.5" /> Generar Telemetría
        </Button>
      </div>
      
      <div className="h-[300px] rounded-xl overflow-hidden border border-primary/20 relative">
        <TacticalMap 
          gunPosition={toolOrigin}
          targetPosition={toolTarget}
          impacts={[]}
          onSetTarget={(coord) => {
            setToolTarget(coord);
            setCalcTargetCoord(coord);
          }}
          onSetGun={setToolOrigin}
          onLocateGun={() => {}}
          realLatLng={null}
          isGunLocated={true}
        />
        <div className="absolute top-2 right-2 z-[1000] bg-black/60 backdrop-blur-md p-2 rounded-md border border-white/10 pointer-events-none">
          <p className="text-[8px] font-bold text-white uppercase opacity-70">L-Click: Objetivo | R-Click: Origen</p>
        </div>
      </div>
    </Card>
  );
}
