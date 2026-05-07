"use client";

import React, { useState, useMemo } from "react";
import { Globe, Search } from "lucide-react";
import dynamic from "next/dynamic";
const TacticalMap = dynamic(
  () => import("@/components/TacticalMap").then((mod) => mod.TacticalMap),
  { ssr: false },
);
import { ControlPanel } from "@/components/ControlPanel";
import {
  type LatLng,
  type WeaponSystem,
  simulateTrajectory,
  getPreciseMilitaryData,
  calculateDistance,
  getMuzzleVelocity,
} from "@/lib/ballistics";
import { AdvancedObserver } from "./AdvancedObserver";
import { utmToLatLon } from '@/lib/coordinates'; // Importación de tu nueva utilidad[cite: 8]
import { MeteorologyPanel } from "./MeteorologyPanel";
import { TrajectoryChart } from "./TrajectoryChart";
import { cn } from "@/lib/utils";

interface SimulatorTabProps {
  gunPosition: LatLng | null;
  targetPosition: LatLng | null;
  mapCenter: LatLng;
  setMapCenter: (coord: LatLng) => void;
  isGunLocated: boolean;
  numPieces: number;
  setNumPieces: (n: number) => void;
  beamType: "parallel" | "convergent" | "divergent";
  setBeamType: (b: "parallel" | "convergent" | "divergent") => void;
  impacts: LatLng[];
  isFiring: boolean;
  showExplosion: boolean;
  fireProgress: number;
  lastTrajectory?: { gun: LatLng; target: LatLng } | null;
  weapon: WeaponSystem;
  charge: string;
  corrections: string[];
  setWeapon: (w: WeaponSystem) => void;
  setCharge: (c: string) => void;
  handleSetTarget: (coord: LatLng) => void;
  handleSetGun: (coord: LatLng) => void;
  handleAdjust: (type: "add" | "drop" | "left" | "right") => void;
  handleFire: () => void;
  handleGenerateReport: () => void;
  handleUpdatePosition?: (mode: "PIEZA" | "OBJETIVO", coord: LatLng) => void;
  realLatLng: LatLng | null;
  handleAOCorrection: (otLine: number, lr: number, ad: number) => void;
}

export function SimulatorTab({
  gunPosition,
  targetPosition,
  mapCenter,
  setMapCenter,
  isGunLocated,
  impacts,
  isFiring,
  showExplosion,
  fireProgress,
  weapon,
  charge,
  corrections,
  setWeapon,
  setCharge,
  handleSetTarget,
  handleSetGun,
  handleAdjust,
  handleFire,
  handleGenerateReport,
  handleUpdatePosition,
  realLatLng,
  numPieces,
  setNumPieces,
  beamType,
  setBeamType,
  handleAOCorrection,
}: SimulatorTabProps) {
  const [otLine, setOtLine] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() !== "") {
      e.preventDefault();
      const input = searchQuery.trim();

      // 1. Lógica para procesar coordenadas UTM (Ej: 16P 429141 1579245)[cite: 8]
      const utmRegex = /^(\d{1,2}[A-Z])\s+(\d+)\s+(\d+)$/i;
      const utmMatch = input.match(utmRegex);

      if (utmMatch) {
        try {
          const zone = utmMatch[1]; 
          const zoneNum = parseInt(zone.slice(0, -1));
          const zoneLetter = zone.slice(-1).toUpperCase();
          const easting = parseFloat(utmMatch[2]);
          const northing = parseFloat(utmMatch[3]);

          // Uso de la utilidad local para evitar errores de librería[cite: 8]
          const converted = utmToLatLon(easting, northing, zoneNum, zoneLetter);
          setMapCenter({ lat: converted.latitude, lng: converted.longitude });
          setSearchQuery("");
          return;
        } catch (err) {
          console.error("Error en conversión UTM:", err);
        }
      }
      
      // 2. Lógica para procesar Latitud/Longitud decimal[cite: 8]
      const parts = input.split(/[ ,]+/).map(Number);
      if (parts.length === 2 && !parts.some(isNaN)) {
        setMapCenter({ lat: parts[0], lng: parts[1] });
        setSearchQuery("");
      } else {
        console.warn("Formato no reconocido. Use 'LAT LNG' o 'ZONA ESTE NORTE'");
      }
    }
  };

  const internalHandleUpdatePosition = (mode: "PIEZA" | "OBJETIVO", coord: LatLng) => {
    if (mode === "PIEZA") handleSetGun(coord);
    else handleSetTarget(coord);
  };

  const centerData = useMemo(() => getPreciseMilitaryData(mapCenter), [mapCenter]);

  const distanceToCenter = useMemo(() => {
    if (!isGunLocated || !gunPosition) return 0;
    return calculateDistance(gunPosition.lat, gunPosition.lng, mapCenter.lat, mapCenter.lng);
  }, [gunPosition, mapCenter, isGunLocated]);

  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 grid grid-cols-[18rem_1fr_18rem] gap-3 p-3">
        {/* Panel Izquierdo: Localización */}
        <div className="h-full min-h-0 flex flex-col gap-3">
          <div className="bg-[#0A0A0B] p-5 rounded-[20px] border-2 border-[#F39C63] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#F39C63]">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">LOCALIZACIÓN</span>
              </div>
              <span className="text-[10px] font-mono text-[#F39C63]/80 border border-[#F39C63]/30 px-2 py-0.5 rounded">WGS84-S1</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="flex flex-col border border-[#F39C63]/20 p-2 rounded">
                <span className="text-[10px] text-[#F39C63] font-bold uppercase">ZONA</span>
                <span className="text-sm font-mono font-bold text-white">{centerData.zone}</span>
              </div>
              <div className="flex flex-col border border-[#F39C63]/20 p-2 rounded">
                <span className="text-[10px] text-[#F39C63] font-bold uppercase">MGRS</span>
                <span className="text-xs font-mono font-bold text-white truncate">{centerData.mgrs}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col border border-[#F39C63]/20 p-2 rounded">
                <span className="text-[10px] text-[#F39C63] font-bold uppercase">ALTITUD</span>
                <span className="text-sm font-mono font-bold text-white">{centerData.altitude} m</span>
              </div>
              <div className="flex flex-col border border-[#F39C63]/20 p-2 rounded">
                <span className="text-[10px] text-[#F39C63] font-bold uppercase">DISTANCIA</span>
                <span className="text-sm font-mono font-bold text-white">{distanceToCenter.toFixed(0)} m</span>
              </div>
            </div>
          </div>

          {/* Configuración de Batería */}
          <div className="bg-[#0A0A0B]/60 backdrop-blur-xl p-5 rounded-[20px] border-2 border-[#F39C63] shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F39C63] mb-4">Configuración de Batería</p>
            <div className="flex gap-3 mb-6">
              {[4, 6, 9].map((n) => (
                <button key={n} onClick={() => setNumPieces(n)} className={cn("flex-1 h-10 rounded-xl text-xs font-black border-2", numPieces === n ? "bg-[#F39C63] text-black border-[#F39C63]" : "text-white/70 border-[#F39C63]/40")}>{n}P</button>
              ))}
            </div>
            <div className="h-[1px] bg-white/10 mb-6" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#F39C63] mb-4">Tipo de Haz</p>
            <div className="grid grid-cols-1 gap-3">
              {["parallel", "convergent", "divergent"].map((type) => (
                <button key={type} onClick={() => setBeamType(type as any)} className={cn("w-full h-11 px-4 rounded-xl text-xs font-black uppercase border-2 flex items-center justify-between", beamType === type ? "bg-[#F39C63] text-black border-[#F39C63]" : "text-white/70 border-[#F39C63]/40")}>
                  {type === "parallel" ? "Paralelo" : type === "convergent" ? "Convergente" : "Divergente"}
                  {beamType === type && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Centro: Mapa + Buscador Flotante */}
        <div className="h-full min-h-0 flex flex-col gap-3">
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border bg-background relative">
            
            <div className="absolute top-4 right-16 z-[400] flex items-center gap-2 pointer-events-auto">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F39C63] opacity-70 group-focus-within:opacity-100 transition-opacity z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="LAT LNG o ZONA ESTE NORTE..."
                  className="w-64 h-11 pl-10 bg-[#0A0A0B]/80 backdrop-blur-xl border-2 border-[#7c4a3a] focus:border-[#F39C63] text-white font-black text-[10px] tracking-widest rounded-xl transition-all duration-300 outline-none placeholder:text-white/20 shadow-2xl"
                />
              </div>
            </div>

            <TacticalMap
              gunPosition={gunPosition}
              targetPosition={targetPosition}
              mapCenter={mapCenter} 
              impacts={impacts}
              onSetTarget={handleSetTarget}
              onSetGun={handleSetGun}
              onLocateGun={() => handleSetGun(mapCenter)}
              onCenterChange={setMapCenter}
              realLatLng={realLatLng}
              isFiring={isFiring}
              showExplosion={showExplosion}
              fireProgress={fireProgress}
              isGunLocated={isGunLocated}
            />
          </div>

          {(isFiring || impacts.length > 0) && (
            <TrajectoryChart
              range={gunPosition && targetPosition ? calculateDistance(gunPosition.lat, gunPosition.lng, targetPosition.lat, targetPosition.lng) : 0}
              muzzleVelocity={getMuzzleVelocity(weapon, charge)}
              weapon={weapon}
            />
          )}
        </div>

        {/* Panel Derecho */}
        <div className="h-full min-h-0 flex flex-col gap-3">
          <MeteorologyPanel position={gunPosition || mapCenter} />
          <AdvancedObserver otLine={otLine} setOtLine={setOtLine} onCorrection={(lr, ad) => handleAOCorrection(otLine, lr, ad)} />
        </div>
      </div>

      <div className="flex-none border-t-2 border-[#F39C63] bg-black/20 backdrop-blur-md">
        <ControlPanel
          gunPosition={gunPosition} targetPosition={targetPosition} isGunLocated={isGunLocated}
          weapon={weapon} charge={charge} corrections={corrections} setWeapon={setWeapon} setCharge={setCharge}
          onAdjust={handleAdjust} onFire={handleFire} onReport={handleGenerateReport}
          onSetGun={() => handleSetGun(mapCenter)} onSetTarget={() => handleSetTarget(mapCenter)}
          onUpdatePosition={handleUpdatePosition || internalHandleUpdatePosition}
          isFiring={isFiring} isGeneratingReport={false} numPieces={numPieces} beamType={beamType}
        />
      </div>
    </div>
  );
}