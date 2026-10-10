'use client';

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crosshair, Minus } from 'lucide-react';

interface AdvancedObserverProps {
  onCorrection: (lr: number, ad: number) => void;
  otLine: number;
  setOtLine: (val: number) => void;
  onCollapse?: () => void;
}

export function AdvancedObserver({ onCorrection, otLine, setOtLine, onCollapse }: AdvancedObserverProps) {
  const [lrInput, setLrInput] = useState(0);
  const [adInput, setAdInput] = useState(0);

  return (
    <Card className="p-3 bg-[#0A0A0B]/60 border-[#F39C63] border-2 w-full max-w-[18rem] rounded-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#F39C63]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[#F39C63]">Observador Avanzado</h3>
        </div>
        <div className="flex items-center gap-1">
          <Crosshair className="w-4 h-4 text-[#F39C63]/50" />
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="h-7 w-7 text-[#F39C63]/60 hover:text-[#F39C63] transition-colors"
              title="Retraer observador"
            >
              <Minus className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-1">Línea OT (mils)</Label>
          <Input 
            type="number" 
            value={otLine}
            onChange={(e) => setOtLine(Number(e.target.value))}
            className="h-10 text-sm font-mono bg-black/20 border-white/10 focus:border-[#F39C63] rounded-xl transition-all text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-1">Izq/Der</Label>
            <Input 
              type="number" 
              value={lrInput}
              onChange={(e) => setLrInput(Number(e.target.value))}
              className="h-10 text-sm font-mono bg-black/20 border-white/10 focus:border-[#F39C63] rounded-xl transition-all text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-1">Alargar/Acortar</Label>
            <Input 
              type="number" 
              value={adInput}
              onChange={(e) => setAdInput(Number(e.target.value))}
              className="h-10 text-sm font-mono bg-black/20 border-white/10 focus:border-[#F39C63] rounded-xl transition-all text-white"
            />
          </div>
        </div>

        <Button 
          onClick={() => onCorrection(lrInput, adInput)}
          className="w-full bg-[#F39C63] hover:bg-[#d88a55] text-black font-black text-[10px] uppercase tracking-[0.2em] h-12 rounded-2xl transition-all"
        >
          Aplicar Corrección
        </Button>
      </div>
    </Card>
  );
}
