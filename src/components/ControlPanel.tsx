'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Flame, RefreshCw, Crosshair, Settings2, AlertTriangle, MapPin, Target,
  Pin, PinOff, Maximize2, Minimize2, GripHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type LatLng, type WeaponSystem, computeFiringSolution, WEAPON_DATA } from '@/lib/ballistics';
import { cn } from '@/lib/utils';
import { utmToLatLon } from '@/lib/coordinates';

export type CoordinateRole = 'piece' | 'target' | 'observer';

export type CoordinateInput = {
  e: string;
  n: string;
  alt: string;
};

interface ControlPanelProps {
  gunPosition: LatLng | null;
  targetPosition: LatLng | null;
  isGunLocated: boolean;
  weapon: WeaponSystem;
  charge: string;
  corrections: string[];
  setWeapon: (w: WeaponSystem) => void;
  setCharge: (c: string) => void;
  onAdjust: (type: 'add' | 'drop' | 'left' | 'right') => void;
  onFire: () => void;
  onReport: () => void;
  onSetGun?: () => void;
  onSetTarget?: () => void;
  onUpdatePosition?: (mode: 'PIEZA' | 'OBJETIVO', coord: LatLng) => void;
  onDrawMapModel?: (bounds: [LatLng, LatLng]) => void;
  onMapModelInputApply?: (model: {
    maxE: number;
    minE: number;
    maxN: number;
    minN: number;
    gz: number;
    spher: string;
  }) => void;
  coordinateInputs: Record<CoordinateRole, CoordinateInput>;
  onCoordinateInputChange: (role: CoordinateRole, field: keyof CoordinateInput, value: string) => void;
  onPlaceCoordinate: (role: CoordinateRole) => void;
  onClearCoordinate: (role: CoordinateRole) => void;
  mapModelInput?: {
    maxE: number;
    minE: number;
    maxN: number;
    minN: number;
    gz: number;
    spher: string;
  } | null;
  isFiring: boolean;
  isGeneratingReport: boolean;
  numPieces: number;
  beamType: 'parallel' | 'convergent' | 'divergent';
}

export function ControlPanel({
  gunPosition,
  targetPosition,
  isGunLocated,
  weapon,
  charge,
  corrections,
  setWeapon,
  setCharge,
  onAdjust,
  onFire,
  onReport,
  onSetGun,
  onSetTarget,
  onUpdatePosition,
  onDrawMapModel,
  onMapModelInputApply,
  coordinateInputs,
  onCoordinateInputChange,
  onPlaceCoordinate,
  onClearCoordinate,
  mapModelInput,
  isFiring,
  isGeneratingReport,
  numPieces,
  beamType,
}: ControlPanelProps) {
  const [showBatteryDetails, setShowBatteryDetails] = useState(false);
  const [activeEditMode, setActiveEditMode] = useState<'PIEZA' | 'OBJETIVO'>('OBJETIVO');
  const [maxE, setMaxE] = useState('473000');
  const [minE, setMinE] = useState('447000');
  const [maxN, setMaxN] = useState('1584000');
  const [minN, setMinN] = useState('1567000');
  const [zona, setZona] = useState('16');
  const [esferoide, setEsferoide] = useState('1');

  useEffect(() => {
    if (!mapModelInput) return;
    setMaxE(String(Math.trunc(mapModelInput.maxE)));
    setMinE(String(Math.trunc(mapModelInput.minE)));
    setMaxN(String(Math.trunc(mapModelInput.maxN)));
    setMinN(String(Math.trunc(mapModelInput.minN)));
    setZona(String(Math.trunc(mapModelInput.gz)));
    setEsferoide(mapModelInput.spher);
  }, [mapModelInput]);

  const handleDrawMapModel = () => {
    if (!onDrawMapModel) return;

    try {
      // Las coordenadas ingresadas son en realidad UTM (Este/Norte)
      const pointMax = utmToLatLon(Number(maxE), Number(maxN), Number(zona), esferoide);
      const pointMin = utmToLatLon(Number(minE), Number(minN), Number(zona), esferoide);

      const bounds: [LatLng, LatLng] = [
        { lat: pointMin.latitude, lng: pointMin.longitude }, // SW
        { lat: pointMax.latitude, lng: pointMax.longitude }  // NE
      ];

      onMapModelInputApply?.({
        maxE: Number(maxE),
        minE: Number(minE),
        maxN: Number(maxN),
        minN: Number(minN),
        gz: Number(zona),
        spher: esferoide,
      });
      onDrawMapModel(bounds);
    } catch (error) {
      console.error('Error converting UTM:', error);
    }
  };

  // Función de ajuste fino
  const handleFineAdjustment = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!onUpdatePosition) return;

    const currentCoord = activeEditMode === 'PIEZA' ? gunPosition : targetPosition;
    if (!currentCoord) return;

    const step = 0.00005; // Precisión métrica (~5m)
    let newCoord: LatLng = { ...currentCoord };

    switch (direction) {
      case 'up': // Alargar (aumentar distancia)
        newCoord.lat += step;
        break;
      case 'down': // Acortar (disminuir distancia)
        newCoord.lat -= step;
        break;
      case 'left': // Izquierda
        newCoord.lng -= step;
        break;
      case 'right': // Derecha
        newCoord.lng += step;
        break;
    }

    onUpdatePosition(activeEditMode, newCoord);
  };

  // Drag state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Drag disabled: panel is docked to avoid floating/overlaps.
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const isDragged = position !== null;

  useEffect(() => {
    if (panelRef.current) {
      if (isDragged && position) {
        panelRef.current.style.left = `${position.x}px`;
        panelRef.current.style.top = `${position.y}px`;
      } else {
        panelRef.current.style.left = '';
        panelRef.current.style.top = '';
      }
    }
  }, [position, isDragged]);

  const sol = (targetPosition && gunPosition) ? computeFiringSolution(gunPosition, targetPosition, weapon, charge) : null;

  // Referencias para detectar cambios reales en posiciones o arma
  const lastTargetStr = useRef(targetPosition ? `${targetPosition.lat},${targetPosition.lng}` : '');
  const lastGunStr = useRef(gunPosition ? `${gunPosition.lat},${gunPosition.lng}` : '');
  const lastWeapon = useRef(weapon);

  // Auto-ajustar la carga propulsora cuando se mueve la pieza o el objetivo
  useEffect(() => {
    const currentTargetStr = targetPosition ? `${targetPosition.lat},${targetPosition.lng}` : '';
    const currentGunStr = gunPosition ? `${gunPosition.lat},${gunPosition.lng}` : '';

    const positionOrWeaponChanged =
      currentTargetStr !== lastTargetStr.current ||
      currentGunStr !== lastGunStr.current ||
      weapon !== lastWeapon.current;

    if (positionOrWeaponChanged) {
      if (sol?.recommendedCharge && sol.recommendedCharge !== charge) {
        setCharge(sol.recommendedCharge);
      }
      lastTargetStr.current = currentTargetStr;
      lastGunStr.current = currentGunStr;
      lastWeapon.current = weapon;
    }
  }, [sol?.recommendedCharge, charge, targetPosition, gunPosition, weapon, setCharge]);

  return (
    <div
      ref={panelRef}
      className={cn(
        "w-full px-3 py-2"
      )}
    >
      <Card className={cn(
        "bg-transparent border-none shadow-none overflow-visible",
        isDragged ? "pointer-events-auto" : "pointer-events-auto"
      )}>

        <div className="p-3">
          <div className="flex flex-col lg:flex-row items-stretch gap-3">

            {/* ─── Configuración de Arma ─── */}
            <div className="relative flex-none w-full lg:w-60 h-[18rem] rounded-[18px] border-2 border-[#F39C63] px-4 pb-4 pt-8 bg-[#0A0A0E]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0E] px-5">
                <h2 className="text-lg font-black uppercase tracking-wide text-foreground leading-none whitespace-nowrap">Arma</h2>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#F39C63] ml-1 tracking-wider">Sistema</span>
                    <Select
                      value={weapon}
                      disabled={isFiring}
                      onValueChange={(v) => setWeapon(v as WeaponSystem)}
                    >
                      <SelectTrigger className="w-full bg-background border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors">
                        <SelectValue placeholder="Obús" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="M102">Obús 105mm M102</SelectItem>
                        <SelectItem value="M198">Obús 155mm M198</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#F39C63] ml-1 tracking-wider">Carga</span>
                    <Select
                      value={charge}
                      disabled={isFiring}
                      onValueChange={setCharge}
                    >
                      <SelectTrigger className="w-full bg-background border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors">
                        <SelectValue placeholder="Carga" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        {WEAPON_DATA[weapon].charges.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {sol && (
                  <div className="text-[11px] font-black uppercase text-[#C5D8D6] bg-background p-1 rounded-lg">
                    CARGA AUTOMÁTICA: {sol.recommendedCharge}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Mapa Modelo ─── */}
            <div className="relative flex-none w-full lg:w-72 h-[18rem] rounded-[18px] border-2 border-[#F39C63] px-5 pb-4 pt-8 bg-[#0A0A0E]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0E] px-5">
                <h2 className="text-lg font-black uppercase tracking-wide text-foreground leading-none whitespace-nowrap">Mapa modelo</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MAX E</span>
                    <input
                      type="number"
                      value={maxE}
                      onChange={(e) => setMaxE(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MIN E</span>
                    <input
                      type="number"
                      value={minE}
                      onChange={(e) => setMinE(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MAX N</span>
                    <input
                      type="number"
                      value={maxN}
                      onChange={(e) => setMaxN(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MIN N</span>
                    <input
                      type="number"
                      value={minN}
                      onChange={(e) => setMinN(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[0.8fr_0.8fr_1.3fr] gap-3 items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">GZ</span>
                    <input
                      type="number"
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">SPHR</span>
                    <input
                      type="number"
                      value={esferoide}
                      onChange={(e) => setEsferoide(e.target.value)}
                      className="no-number-spinner w-full bg-background border border-border h-10 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
                    />
                  </div>
                  <Button
                    onClick={handleDrawMapModel}
                  className="h-12 bg-[#85C5F1] hover:bg-[#85C5F1]/90 text-[#0A0A0B] font-black uppercase tracking-wide rounded-xl leading-none shadow-[0_0_15px_rgba(133,197,241,0.3)] transition-all duration-300"
                  >
                    <span className="leading-none">Dibujar<br />Mapa</span>
                  </Button>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden h-32 my-auto bg-border" />

            {/* ─── Datos de Tiro ─── */}
            <div className="relative flex-none w-full lg:w-64 xl:w-72 h-[18rem] rounded-[18px] border-2 border-[#F39C63] px-4 pb-4 pt-8 bg-[#0A0A0E]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0E] px-5">
                <h2 className="text-lg font-black uppercase tracking-wide text-foreground leading-none whitespace-nowrap">Datos de tiro</h2>
              </div>
              <div className="space-y-1">
                <FiringMetric label="DIST." value={sol && typeof sol.range === 'number' ? sol.range.toFixed(0) : "0"} unit="m" className="text-[#85C5F1]" />
                <FiringMetric label="QE." value={sol ? sol.elevMils.toString() : "0"} unit="mil" className="text-[#F29B62]" />
                <FiringMetric label="AZ." value={sol ? Math.round(sol.azimuth).toString() : "0"} unit="mil" className="text-[#85C5F1]" />
                <FiringMetric label="TOF." value={sol ? sol.timeOfFlight.toFixed(1) : "0"} unit="s" className="text-[#F29B62]" />
              </div>

              {corrections.length > 0 && (
                <div className="mt-2 p-2 bg-background rounded-lg border border-border">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Correcciones
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {corrections.map((corr, i) => (
                      <div key={i} className="px-3 py-1 rounded-md bg-secondary border border-border text-[11px] font-mono text-foreground font-bold">
                        {corr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator orientation="vertical" className="hidden h-32 my-auto bg-border" />

            {/* ─── Ajustes Manuales ─── */}
            <div className="relative flex-[1.35] min-w-[500px] h-[18rem] rounded-[18px] border-2 border-[#F39C63] px-5 pb-4 pt-8 bg-[#0A0A0E]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0E] px-5">
                <h2 className="text-lg font-black uppercase tracking-wide text-foreground leading-none whitespace-nowrap">Ajustes</h2>
              </div>
              <div className="space-y-2">
                <CoordinatePlacementRow
                  label="Pieza"
                  buttonLabel="Colocar pieza"
                  value={coordinateInputs.piece}
                  onChange={(field, value) => onCoordinateInputChange('piece', field, value)}
                  onPlace={() => onPlaceCoordinate('piece')}
                  onClear={() => onClearCoordinate('piece')}
                />
                <CoordinatePlacementRow
                  label="Objetivo"
                  buttonLabel="Colocar objetivo"
                  value={coordinateInputs.target}
                  onChange={(field, value) => onCoordinateInputChange('target', field, value)}
                  onPlace={() => onPlaceCoordinate('target')}
                  onClear={() => onClearCoordinate('target')}
                />
                <CoordinatePlacementRow
                  label="Observador"
                  buttonLabel="Colocar observador"
                  value={coordinateInputs.observer}
                  onChange={(field, value) => onCoordinateInputChange('observer', field, value)}
                  onPlace={() => onPlaceCoordinate('observer')}
                  onClear={() => onClearCoordinate('observer')}
                />
              </div>
            </div>

            <Separator orientation="vertical" className="hidden h-32 my-auto bg-border" />

            {/* ─── Acciones Finales ─── */}
            <div className="relative flex-none min-w-[190px] h-[18rem] rounded-[18px] border-2 border-[#F39C63] px-4 pb-4 pt-8 bg-[#0A0A0E]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0A0A0E] px-5">
                <h2 className="text-lg font-black uppercase tracking-wide text-foreground leading-none whitespace-nowrap">Acciones</h2>
              </div>
              <div className="flex h-full flex-col items-center justify-around gap-3">
                <Button
                  onClick={onFire}
                  disabled={!targetPosition || !isGunLocated || isFiring}
                  className={cn(
                    "w-40 font-black uppercase tracking-wide gap-3 h-12 shadow-2xl active:scale-95 transition-all text-[11px] rounded-xl border-none leading-none",
                    numPieces > 1
                      ? "bg-[#85C5F1] text-black hover:bg-[#85C5F1]/90 shadow-[#85C5F1]/20"
                      : "bg-[#85C5F1] text-black hover:bg-[#85C5F1]/90 shadow-[#85C5F1]/20"
                  )}
                >
                  <span className="material-symbols-outlined text-2xl leading-none text-[#171717]">destruction</span>
                  <span className="leading-none whitespace-pre-line">
                    {isFiring ? 'EN\nVUELO' : numPieces > 1 ? `FUEGO DE\nBATERÍA (${numPieces})` : 'EJECUTAR\nFUEGO'}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={onReport}
                  disabled={!targetPosition || isGeneratingReport}
                  className="w-40 border-2 border-[#85C5F1] bg-transparent text-[#85C5F1] hover:bg-[#85C5F1]/10 rounded-xl font-black uppercase tracking-wide gap-2 h-12 text-[11px] leading-none transition-colors"
                >
                  <span className="material-symbols-outlined text-xl leading-none text-[#85C5F1]">assignment</span>
                  <span className="leading-none whitespace-pre-line">
                    {isGeneratingReport ? 'COMPILANDO...' : 'GENERAR\nREPORTE'}
                  </span>
                </Button>
                {numPieces > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBatteryDetails(!showBatteryDetails)}
                    className="w-40 h-12 rounded-xl bg-[#85C5F1] text-[#171717] hover:bg-[#85C5F1]/90 text-[11px] leading-none font-black uppercase tracking-wide"
                  >
                    <span className="leading-none whitespace-pre-line">
                      {showBatteryDetails ? 'OCULTAR DATOS\nDE BATERÍA' : 'VER DATOS\nDE BATERÍA'}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Panel de Detalles de Batería (Desplegable) */}
          {showBatteryDetails && numPieces > 1 && sol && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: numPieces }).map((_, i) => {
                  const pieceNum = i + 1;
                  // Simular deflexión diferencial según el haz
                  const azOffset = beamType === 'parallel' ? 0 : beamType === 'convergent' ? (i - (numPieces - 1) / 2) * -5 : (i - (numPieces - 1) / 2) * 10;
                  return (
                    <div key={i} className="bg-background p-3 rounded-xl border border-border flex flex-col gap-2 group">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pieza {pieceNum}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">AZ</span>
                          <span className="text-sm font-mono font-black text-foreground">{Math.round(sol.azimuth + azOffset)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">EL</span>
                          <span className="text-xs font-mono font-bold text-primary">{sol.elevMils}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function FiringRow({
  label,
  value,
  unit,
  valueClassName,
}: {
  label: string;
  value: string;
  unit: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-background border border-border rounded-lg px-3 py-2">
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-mono font-black text-foreground", valueClassName)}>
        {value}
        <span className="ml-1 text-[11px] font-bold text-muted-foreground/80">{unit}</span>
      </span>
    </div>
  );
}

function FiringMetric({
  label,
  value,
  unit,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  className: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-[#22313B] py-1 last:border-b-0">
      <span className={cn("text-xl font-black uppercase", className)}>{label}</span>
      <span className={cn("text-3xl font-black tracking-tight", className)}>
        {value}
        <span className="ml-2 text-2xl lowercase">{unit}</span>
      </span>
    </div>
  );
}

function CoordinatePlacementRow({
  label,
  buttonLabel,
  value,
  onChange,
  onPlace,
  onClear,
}: {
  label: string;
  buttonLabel: string;
  value: CoordinateInput;
  onChange: (field: keyof CoordinateInput, value: string) => void;
  onPlace: () => void;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-[88px_repeat(3,minmax(92px,1fr))_124px_48px] items-end gap-2 border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
      <div className="pb-2 text-[11px] font-black uppercase tracking-wider text-foreground">
        {label}
      </div>
      <CoordinateField label="Este" value={value.e} onChange={(next) => onChange('e', next)} />
      <CoordinateField label="Norte" value={value.n} onChange={(next) => onChange('n', next)} />
      <CoordinateField label="Altura" value={value.alt} onChange={(next) => onChange('alt', next)} />
      <Button
        onClick={onPlace}
        className="h-9 rounded-xl bg-[#C5D8D6] text-black hover:bg-[#C5D8D6]/90 text-[10px] leading-none font-black uppercase tracking-wide"
      >
        <span className="whitespace-pre-line">{buttonLabel.replace(" ", "\n")}</span>
      </Button>
      <Button
        onClick={onClear}
        className="h-9 rounded-xl bg-[#FF7D73] text-[#171717] hover:bg-[#FF7D73]/90 text-[11px] leading-none font-black uppercase tracking-wide gap-0"
      >
        <span className="material-symbols-outlined text-xl leading-none text-[#171717]">delete</span>
      </Button>
    </div>
  );
}

function CoordinateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase font-bold text-[#F39C63] ml-1 tracking-wider">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border h-8 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
      />
    </label>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────
function DataInfo({ label, value, unit, color = "text-accent" }: { label: string, value: string, unit: string, color?: string }) {
  return (
    <div className="bg-background/40 p-3 rounded-2xl border border-primary/10 flex flex-col justify-center min-h-[70px] shadow-inner">
      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-1 opacity-60">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-mono font-black tracking-tighter", color)}>{value}</span>
        <span className={cn("text-[10px] font-bold opacity-60", color)}>{unit}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, color = "text-white" }: { label: string, value: string, unit: string, color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-black uppercase text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-mono font-bold", color)}>{value}</span>
      <span className={cn("text-[8px] font-bold opacity-40", color)}>{unit}</span>
    </div>
  );
}

function AdjBtn({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={title}
      className="h-10 w-10 hover:bg-primary/10 transition-colors"
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
    </Button>
  );
}
