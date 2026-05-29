'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Flame, FileText, RefreshCw, Crosshair, Settings2, Zap, AlertTriangle, MapPin, Target,
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
        "bg-background overflow-hidden",
        isDragged ? "pointer-events-auto" : "pointer-events-auto"
      )}>

        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground/80">
                Unidad de Control Táctico
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estado del sistema</div>
              <div className="text-[11px] font-mono text-green-500/80">LISTO // ÓPTIMO</div>
            </div>
          </div>
        </div>

        <div className="p-3">
          <div className="flex flex-col lg:flex-row gap-4">

            {/* ─── Configuración de Arma ─── */}
            <div className="flex-none w-full lg:w-64 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Arma</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">Tipo de sistema</span>
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
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">Carga propulsora</span>
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
                  <div className="text-[11px] font-mono text-muted-foreground bg-background p-2 rounded-lg border border-border">
                    CARGA AUTOMÁTICA: {sol.recommendedCharge}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Mapa Modelo ─── */}
            <div className="flex-none w-full lg:w-64 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Mapa modelo</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MAX E</span>
                    <input
                      type="number"
                      value={maxE}
                      onChange={(e) => setMaxE(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MIN E</span>
                    <input
                      type="number"
                      value={minE}
                      onChange={(e) => setMinE(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MAX N</span>
                    <input
                      type="number"
                      value={maxN}
                      onChange={(e) => setMaxN(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">MIN N</span>
                    <input
                      type="number"
                      value={minN}
                      onChange={(e) => setMinN(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">ZONA</span>
                    <input
                      type="number"
                      value={zona}
                      onChange={(e) => setZona(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">ESFEROIDE</span>
                    <input
                      type="number"
                      value={esferoide}
                      onChange={(e) => setEsferoide(e.target.value)}
                      className="w-full bg-background border border-border h-10 text-sm font-bold rounded-xl hover:bg-secondary transition-colors px-3"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleDrawMapModel}
                  className="w-full bg-[#F39C63] hover:bg-[#F39C63]/90 text-[#0A0A0B] font-black uppercase tracking-widest h-10 shadow-[0_0_15px_rgba(243,156,99,0.3)] transition-all duration-300"
                >
                  Dibujar mapa modelo
                </Button>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block h-32 my-auto bg-border" />

            {/* ─── Datos de Tiro ─── */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Datos de tiro</h2>
              </div>
              <div className="space-y-2">
                <FiringRow label="Alcance" value={sol && typeof sol.range === 'number' ? sol.range.toFixed(0) : "0"} unit="m" />
                <FiringRow label="Elevación" value={sol ? sol.elevMils.toString() : "0"} unit="MIL" valueClassName="text-primary" />
                <FiringRow label="Azimut" value={sol ? Math.round(sol.azimuth).toString() : "0"} unit="MIL" valueClassName="text-yellow-500" />
                <FiringRow label="Tiempo de vuelo" value={sol ? sol.timeOfFlight.toFixed(1) : "0"} unit="s" />
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

            <Separator orientation="vertical" className="hidden lg:block h-32 my-auto bg-border" />

            {/* ─── Ajustes Manuales ─── */}
            <div className="flex-[1.35] flex flex-col gap-3 min-w-[520px]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Ajustes</h2>
              </div>
              <div className="space-y-3">
                <CoordinatePlacementRow
                  label="Pieza"
                  buttonLabel="Colocar pieza"
                  value={coordinateInputs.piece}
                  onChange={(field, value) => onCoordinateInputChange('piece', field, value)}
                  onPlace={() => onPlaceCoordinate('piece')}
                />
                <CoordinatePlacementRow
                  label="Objetivo"
                  buttonLabel="Colocar objetivo"
                  value={coordinateInputs.target}
                  onChange={(field, value) => onCoordinateInputChange('target', field, value)}
                  onPlace={() => onPlaceCoordinate('target')}
                />
                <CoordinatePlacementRow
                  label="Observador"
                  buttonLabel="Colocar observador"
                  value={coordinateInputs.observer}
                  onChange={(field, value) => onCoordinateInputChange('observer', field, value)}
                  onPlace={() => onPlaceCoordinate('observer')}
                />
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block h-32 my-auto bg-border" />

            {/* ─── Acciones Finales ─── */}
            <div className="flex-none flex flex-col gap-3 min-w-[200px]">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Acciones</h2>
              </div>
              <div className="flex flex-row lg:flex-col gap-3">
                {numPieces > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBatteryDetails(!showBatteryDetails)}
                    className={cn(
                      "h-10 text-[11px] font-black uppercase gap-2 rounded-xl transition-colors border border-border",
                      showBatteryDetails ? "text-primary bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {showBatteryDetails ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    {showBatteryDetails ? 'Ocultar datos de batería' : 'Ver datos de batería'}
                  </Button>
                )}
                <Button
                  onClick={onFire}
                  disabled={!targetPosition || !isGunLocated || isFiring}
                  className={cn(
                    "flex-1 font-black uppercase tracking-[0.2em] gap-3 h-16 shadow-2xl active:scale-95 transition-all text-xs rounded-2xl border-t border-white/20",
                    numPieces > 1
                      ? "bg-[#F39C63] text-black hover:bg-[#F39C63]/90 shadow-[#F39C63]/20"
                      : "bg-gradient-to-br from-primary to-green-800 hover:from-primary/90 hover:to-green-700 shadow-green-900/40"
                  )}
                >
                  <div className={cn("p-1.5 bg-black/20 rounded-lg", isFiring && "animate-pulse")}>
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  {isFiring ? 'EN VUELO' : numPieces > 1 ? `FUEGO DE BATERÍA (${numPieces})` : 'EJECUTAR FUEGO'}
                </Button>

                <Button
                  variant="outline"
                  onClick={onReport}
                  disabled={!targetPosition || isGeneratingReport}
                  className="flex-1 border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary rounded-2xl font-black uppercase tracking-widest gap-2 h-12 text-[11px] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {isGeneratingReport ? 'COMPILANDO...' : 'GENERAR REPORTE'}
                </Button>
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

function CoordinatePlacementRow({
  label,
  buttonLabel,
  value,
  onChange,
  onPlace,
}: {
  label: string;
  buttonLabel: string;
  value: CoordinateInput;
  onChange: (field: keyof CoordinateInput, value: string) => void;
  onPlace: () => void;
}) {
  return (
    <div className="grid grid-cols-[84px_repeat(3,minmax(100px,1fr))_128px] items-end gap-3 border-b border-border/70 pb-3 last:border-b-0 last:pb-0">
      <div className="pb-3 text-[11px] font-black uppercase tracking-wider text-foreground">
        {label}
      </div>
      <CoordinateField label="Este" value={value.e} onChange={(next) => onChange('e', next)} />
      <CoordinateField label="Norte" value={value.n} onChange={(next) => onChange('n', next)} />
      <CoordinateField label="Altura" value={value.alt} onChange={(next) => onChange('alt', next)} />
      <Button
        onClick={onPlace}
        className="h-9 rounded-xl bg-[#F39C63] text-[#0A0A0B] hover:bg-[#F39C63]/90 text-[11px] leading-none font-black uppercase tracking-wide"
      >
        {buttonLabel}
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
        className="w-full bg-background border border-border h-9 text-sm font-mono font-black rounded-xl hover:bg-secondary transition-colors px-3 text-[#F39C63]"
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
