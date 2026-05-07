'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, ArrowUp, Thermometer, Weight, Target, Zap } from 'lucide-react';
import { 
  WEAPON_DATA, 
  type WeaponSystem, 
  type FuzeType, 
  type MetData,
  type FiringSolution
} from '@/lib/ballistics';

interface ManualCalculatorProps {
  calcWeapon: WeaponSystem;
  setCalcWeapon: (w: WeaponSystem) => void;
  calcCharge: string;
  setCalcCharge: (c: string) => void;
  calcFuze: FuzeType;
  setCalcFuze: (f: FuzeType) => void;
  calcRange: number;
  calcAzimuth: number;
  handlePolarChange: (r: number, az: number) => void;
  manualGunAlt: number;
  setManualGunAlt: (alt: number) => void;
  propTemp: number;
  setPropTemp: (temp: number) => void;
  projWeight: string;
  setProjWeight: (w: string) => void;
  manualMet: MetData | null;
  calcSolution: FiringSolution;
}

export function ManualCalculator({
  calcWeapon,
  setCalcWeapon,
  calcCharge,
  setCalcCharge,
  calcFuze,
  setCalcFuze,
  calcRange,
  calcAzimuth,
  handlePolarChange,
  manualGunAlt,
  setManualGunAlt,
  propTemp,
  setPropTemp,
  projWeight,
  setProjWeight,
  manualMet,
  calcSolution
}: ManualCalculatorProps) {

  const weaponInfo = WEAPON_DATA[calcWeapon];
  const targetAlt = manualMet?.elevation || 0;
  const verticalInterval = targetAlt - manualGunAlt;
  const siteCorrection = Math.round(verticalInterval * 0.5); // Simplificación táctica

  return (
    <Card className="p-6 bg-transparent border-[#F39C63] border-2 backdrop-blur-md rounded-3xl shadow-2xl relative overflow-hidden">
      {/* Decoración Táctica de Fondo */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Calculator className="w-32 h-32 text-[#F39C63]" />
      </div>

      {/* ENCABEZADO */}
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="p-3 bg-[#F39C63]/10 rounded-2xl border border-[#F39C63]/20">
          <Calculator className="w-6 h-6 text-[#F39C63]" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-[#F39C63]">Calculador de Tiro Manual</h2>
          <p className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase">Unidad de balística técnica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* COLUMNA 1: CONFIGURACIÓN DE ARMA */}
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1">Sistema de Armas</Label>
            <Select value={calcWeapon} onValueChange={(v) => setCalcWeapon(v as WeaponSystem)}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white h-12 rounded-2xl focus:ring-[#F39C63]">
                <SelectValue placeholder="Arma" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {Object.keys(WEAPON_DATA).map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1">Carga</Label>
              <Select value={calcCharge} onValueChange={setCalcCharge}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-12 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  {weaponInfo.charges.map(c => <SelectItem key={c} value={c}>CHG {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1">Espoleta</Label>
              <Select value={calcFuze} onValueChange={(v) => setCalcFuze(v as FuzeType)}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white h-12 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="Impacto">PD (Impacto)</SelectItem>
                  <SelectItem value="Tiempo">TI (Tiempo)</SelectItem>
                  <SelectItem value="Proximidad">VT (Prox)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: DATOS TÁCTICOS */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1 flex items-center gap-2">
                <Target className="w-3 h-3 text-[#F39C63]" /> Alcance (m)
              </Label>
              <Input 
                type="number" 
                value={calcRange}
                onChange={(e) => handlePolarChange(Number(e.target.value), calcAzimuth)}
                className="bg-black/20 border-white/10 text-white h-12 rounded-2xl focus:border-[#F39C63]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1">Azimut (mils)</Label>
              <Input 
                type="number" 
                value={calcAzimuth}
                onChange={(e) => handlePolarChange(calcRange, Number(e.target.value))}
                className="bg-black/20 border-white/10 text-white h-12 rounded-2xl focus:border-[#F39C63]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1 flex items-center gap-2">
                <Thermometer className="w-3 h-3 text-[#F39C63]" /> Temp. Pólvora
              </Label>
              <Input 
                type="number" 
                value={propTemp}
                onChange={(e) => setPropTemp(Number(e.target.value))}
                className="bg-black/20 border-white/10 text-white h-12 rounded-2xl focus:border-[#F39C63]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-white ml-1 flex items-center gap-2">
                <Weight className="w-3 h-3 text-[#F39C63]" /> Peso Proy.
              </Label>
              <Input 
                value={projWeight}
                onChange={(e) => setProjWeight(e.target.value)}
                className="bg-black/20 border-white/10 text-white h-12 rounded-2xl focus:border-[#F39C63]"
              />
            </div>
          </div>
        </div>

        {/* COLUMNA 3: SOLUCIÓN DE TIRO (OUTPUT) */}
        <div className="bg-[#F39C63]/5 rounded-3xl border border-[#F39C63] p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-2 right-4">
            <Zap className="w-4 h-4 text-[#F39C63] animate-pulse" />
          </div>
          
          <div className="text-center space-y-1 mb-6">
            <p className="text-[10px] text-[#F39C63] font-black uppercase tracking-[0.3em]">Elevación Final</p>
            <div className="flex items-baseline justify-center gap-2">
              <p className="text-7xl font-mono font-black text-white tracking-tighter">
                {Math.round(calcSolution.elevMils + siteCorrection)}
              </p>
              <span className="text-lg font-bold text-[#F39C63]/40 tracking-widest">MIL</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 border-t border-[#F39C63]/20 pt-6">
            <div className="text-center">
              <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Deriva</p>
              <p className="text-xl font-mono text-white font-black">L 2.4</p>
            </div>
            <div className="text-center border-l border-[#F39C63]/20">
              <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Tiempo</p>
              <p className="text-xl font-mono text-white font-black">
                {(calcSolution.timeOfFlight).toFixed(1)}s
              </p>
            </div>
          </div>
        </div>

      </div>
    </Card>
  );
}