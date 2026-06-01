'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TacticalBackground } from '@/components/TacticalBackground';
import { type LatLng, type WeaponSystem } from '@/lib/ballistics';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { signIn, signOut, useSession } from "next-auth/react";
import { SimulatorTab } from '@/components/fdc/SimulatorTab';
import { ReportDialog } from '@/components/ReportDialog';
import { computeFiringSolution, getMuzzleVelocity, simulateTrajectory } from '@/lib/ballistics';
import HP71Emulator from '@/components/HP71Emulator';
import { HP71ReportsTab } from '@/components/HP71ReportsTab';
import { ProfileManager } from '@/components/ProfileManager';
import { utmToLatLon } from '@/lib/coordinates';
import type { CoordinateInput, CoordinateRole } from '@/components/ControlPanel';

const TacticalMap = dynamic(
  () => import("@/components/TacticalMapMapcn").then((mod) => mod.TacticalMapMapcn),
  { ssr: false }
);

const EMPTY_COORDINATES: Record<CoordinateRole, CoordinateInput> = {
  piece: { e: '', n: '', alt: '' },
  target: { e: '', n: '', alt: '' },
  observer: { e: '', n: '', alt: '' },
};

const DEFAULT_MAP_MODEL_UTM = {
  maxE: 473000,
  minE: 447000,
  maxN: 1584000,
  minN: 1567000,
  gz: 16,
  spher: '1',
};

export default function SantaBarbaraFDC() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const loggedUser = session?.user;
  const [activeTab, setActiveTab] = useState("sim");
  const [logSessionId, setLogSessionId] = useState("");


  useEffect(() => {
    setLogSessionId(`hp71-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase());
  }, []);

  useEffect(() => {
    if (!loggedUser?.name || !logSessionId) return;

    fetch('/api/hp71/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SYSTEM',
        content: 'NUEVA SESIÓN CDT',
        user: loggedUser.name,
        sessionId: logSessionId,
      }),
    }).catch((error) => console.error('Error iniciando log de sesión:', error));
  }, [loggedUser?.name, logSessionId]);

  // Estados del Formulario de Login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Estados de balística
  const [gunPosition, setGunPosition] = useState<LatLng | null>(null);
  const [targetPosition, setTargetPosition] = useState<LatLng | null>(null);

  // NUEVO: Estado para persistir la última trayectoria disparada
  const [lastTrajectory, setLastTrajectory] = useState<{gun: LatLng, target: LatLng} | null>(null);

  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 14.0818, lng: -87.2068 });
  const [mapModelBounds, setMapModelBounds] = useState<[LatLng, LatLng] | null>(null);
  const [mapModelUtm, setMapModelUtm] = useState<{
    maxE: number;
    minE: number;
    maxN: number;
    minN: number;
    gz: number;
    spher: string;
  } | null>(DEFAULT_MAP_MODEL_UTM);
  const [observerPosition, setObserverPosition] = useState<LatLng | null>(null);
  const [coordinateInputs, setCoordinateInputs] = useState<Record<CoordinateRole, CoordinateInput>>(EMPTY_COORDINATES);
  const [isGunLocated, setIsGunLocated] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [fireProgress, setFireProgress] = useState(0);
  const [showExplosion, setShowExplosion] = useState(false);
  const [weapon, setWeapon] = useState<WeaponSystem>('M102');
  const [charge, setCharge] = useState<string>('C4');
  const [numPieces, setNumPieces] = useState<4 | 6 | 9>(4);
  const [beamType, setBeamType] = useState<'parallel' | 'convergent' | 'divergent'>('parallel');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);

  const buildMissionReport = () => {
    if (!gunPosition || !targetPosition) return null;

    const solution = computeFiringSolution(gunPosition, targetPosition, weapon, charge);
    const v0 = getMuzzleVelocity(weapon, charge);
    const trajectory = simulateTrajectory(solution.elevMils, v0, weapon).points;

    return {
      id: `RPT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      classification: 'SECRET//NOFORN',
      solution,
      trajectory,
      weapon,
      charge,
      targetUTM: `${targetPosition.lat.toFixed(6)}, ${targetPosition.lng.toFixed(6)}`,
      targetMGRS: '',
      targetAlt: '0',
      impactDamage: 0,
      corrections: [],
    };
  };

  // Función para generar reporte
  const handleGenerateReport = () => {
    const reportData = buildMissionReport();
    if (!reportData) return;

    setActiveReport(reportData);
    setIsReportOpen(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFiring && fireProgress < 100) {
      interval = setInterval(() => {
        setFireProgress((prev) => {
          const next = prev + 5;
          if (next >= 100) {
            setShowExplosion(true);

            // CAMBIO: Guardamos la trayectoria justo al completar el disparo
            if (gunPosition && targetPosition) {
              setLastTrajectory({ gun: gunPosition, target: targetPosition });
            }

            return 100;
          }
          return next;
        });
      }, 20);
    }

    return () => clearInterval(interval);
  }, [isFiring, fireProgress, gunPosition, targetPosition]);

  useEffect(() => {
    if (showExplosion) {
      const timer = setTimeout(() => {
        setShowExplosion(false);
        setIsFiring(false);
        setFireProgress(0);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [showExplosion]);

  const handleFire = () => {
    if (gunPosition && targetPosition) {
      setIsFiring(true);
      setFireProgress(0);
      setShowExplosion(false);
    }
  };

  const handleDrawMapModel = (bounds: [LatLng, LatLng]) => {
    setMapModelBounds(bounds);
    // Centrar el mapa en el centro del rectángulo
    const centerLat = (bounds[0].lat + bounds[1].lat) / 2;
    const centerLng = (bounds[0].lng + bounds[1].lng) / 2;
    setMapCenter({ lat: centerLat, lng: centerLng });
  };

  const handleHp71MapModelComplete = (model: {
    maxE: number;
    minE: number;
    maxN: number;
    minN: number;
    gz: number;
    spher: string;
  }) => {
    try {
      setMapModelUtm(model);
      const pointMax = utmToLatLon(model.maxE, model.maxN, model.gz, model.spher);
      const pointMin = utmToLatLon(model.minE, model.minN, model.gz, model.spher);

      handleDrawMapModel([
        { lat: pointMin.latitude, lng: pointMin.longitude },
        { lat: pointMax.latitude, lng: pointMax.longitude },
      ]);
    } catch (error) {
      console.error('Error drawing HP71 map model:', error);
    }
  };

  const expandUtmPart = (value: number, reference: number) => {
    const raw = String(Math.trunc(value));
    const ref = String(Math.trunc(reference));

    if (raw.length >= ref.length) return value;
    return Number(`${ref.slice(0, ref.length - raw.length)}${raw}`);
  };

  const setCoordinateInput = (role: CoordinateRole, next: CoordinateInput) => {
    setCoordinateInputs((prev) => ({ ...prev, [role]: next }));
  };

  const handleCoordinateInputChange = (
    role: CoordinateRole,
    field: keyof CoordinateInput,
    value: string,
  ) => {
    setCoordinateInputs((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const placeCoordinate = (role: CoordinateRole, coordinates = coordinateInputs[role]) => {
    if (!mapModelUtm) {
      toast({
        variant: "destructive",
        title: "MAPA MODELO NO DEFINIDO",
        description: "Dibujá o cargá el mapa modelo antes de colocar coordenadas.",
      });
      return;
    }

    const rawE = Number(coordinates.e);
    const rawN = Number(coordinates.n);
    if (!Number.isFinite(rawE) || !Number.isFinite(rawN)) return;

    const easting = expandUtmPart(rawE, mapModelUtm.minE);
    const northing = expandUtmPart(rawN, mapModelUtm.minN);
    const point = utmToLatLon(easting, northing, mapModelUtm.gz, mapModelUtm.spher);
    const position = { lat: point.latitude, lng: point.longitude };

    setCoordinateInput(role, {
      e: String(Math.trunc(easting)),
      n: String(Math.trunc(northing)),
      alt: coordinates.alt,
    });

    if (role === 'piece') {
      setGunPosition(position);
      setIsGunLocated(true);
      setMapCenter(position);
      setLastTrajectory(null);
    } else if (role === 'target') {
      setTargetPosition(position);
      setLastTrajectory(null);
    } else {
      setObserverPosition(position);
    }
  };

  const clearCoordinate = (role: CoordinateRole) => {
    setCoordinateInput(role, { e: '', n: '', alt: '' });

    if (role === 'piece') {
      setGunPosition(null);
      setIsGunLocated(false);
      setLastTrajectory(null);
    } else if (role === 'target') {
      setTargetPosition(null);
      setLastTrajectory(null);
    } else {
      setObserverPosition(null);
    }
  };

  const handleHp71ObserverComplete = (observer: { alt: number; e: number; n: number }) => {
    try {
      placeCoordinate('observer', {
        e: String(observer.e),
        n: String(observer.n),
        alt: String(observer.alt),
      });
    } catch (error) {
      console.error('Error drawing HP71 observer:', error);
    }
  };

  const handleHp71PieceComplete = (piece: { alt: number; e: number; n: number }) => {
    placeCoordinate('piece', {
      e: String(piece.e),
      n: String(piece.n),
      alt: String(piece.alt),
    });
  };

  const handleHp71TargetComplete = (target: { alt: number; e: number; n: number }) => {
    placeCoordinate('target', {
      e: String(target.e),
      n: String(target.n),
      alt: String(target.alt),
    });
  };

  // Lógica de Autenticación
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      const result = await signIn("credentials", {
        username: loginUsername,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "ERROR DE ACCESO",
          description: "Credenciales no reconocidas por el clúster.",
        });
      } else {
        toast({
          title: "ACCESO CONCEDIDO",
          description: "Sincronizando terminal táctica...",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <main className="cdt-app-shell relative flex h-[100dvh] min-h-[720px] w-full min-w-[1100px] flex-col overflow-auto bg-transparent font-['Stack_Sans_Text']">

      {/* CAPA 0: FONDO TÁCTICO FIJO */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <TacticalBackground />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10 flex min-h-0 w-full flex-1 flex-col bg-transparent">

        {/* CAPA 1: HEADER TRASLÚCIDO */}
        <header className="flex-none h-[3.25rem] border-b border-white/10 px-4 flex items-center gap-6 bg-black/20 backdrop-blur-sm overflow-x-auto scrollbar-hide">
          <div className="flex-none py-2">
            <img src="/logosbcdt.png" alt="Logo" className="h-8 w-auto object-contain" />
          </div>

          <TabsList className="bg-transparent h-full gap-2 flex-none">
            <TabsTrigger
              value="sim"
              className="px-6 uppercase text-[11px] font-black tracking-[0.2em] h-full transition-all data-[state=active]:text-[#F39C63]"
            >
              <span className="material-symbols-rounded text-sm mr-2">target</span> Simulador
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="px-6 uppercase text-[11px] font-black tracking-[0.2em] h-full transition-all data-[state=active]:text-[#F39C63]"
            >
              <span className="material-symbols-rounded text-sm mr-2">calculate</span> Calculadora
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="px-6 uppercase text-[11px] font-black tracking-[0.2em] h-full transition-all data-[state=active]:text-[#F39C63]"
            >
              <span className="material-symbols-rounded text-sm mr-2">assignment</span> Reportes
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className="px-6 uppercase text-[11px] font-black tracking-[0.2em] h-full transition-all data-[state=active]:text-[#F39C63]"
            >
              <span className="material-symbols-rounded text-sm mr-2">badge</span> {loggedUser ? 'Operador' : 'Acceso'}
            </TabsTrigger>
          </TabsList>
        </header>

        {/* CAPA 2: CONTENIDO PRINCIPAL */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-transparent">

          {/* SIMULADOR */}
          <TabsContent value="sim" forceMount className="h-full w-full m-0 p-0 border-none bg-transparent data-[state=inactive]:hidden">
            <SimulatorTab
              gunPosition={gunPosition} targetPosition={targetPosition} mapCenter={mapCenter} setMapCenter={setMapCenter}
              isGunLocated={isGunLocated} weapon={weapon} charge={charge} numPieces={numPieces} setNumPieces={setNumPieces as any}
              beamType={beamType} setBeamType={setBeamType as any} setWeapon={setWeapon as any} setCharge={setCharge}
              // MODIFICACIÓN: Al cambiar target o gun, limpiamos lastTrajectory
              handleSetTarget={(coord) => { setTargetPosition(coord); setLastTrajectory(null); }}
              handleSetGun={(coord) => { setGunPosition(coord); setIsGunLocated(true); setLastTrajectory(null); }}
              impacts={[]} isFiring={isFiring} showExplosion={showExplosion} fireProgress={fireProgress}
              // NUEVA PROP: Pasamos la trayectoria guardada
              lastTrajectory={lastTrajectory}
              corrections={[]} handleAdjust={() => {}} handleFire={handleFire} handleGenerateReport={handleGenerateReport}
              realLatLng={null} handleAOCorrection={() => {}} onDrawMapModel={handleDrawMapModel} onMapModelInputApply={setMapModelUtm} mapModelBounds={mapModelBounds}
              observerPosition={observerPosition}
              coordinateInputs={coordinateInputs}
              onCoordinateInputChange={handleCoordinateInputChange}
              onPlaceCoordinate={placeCoordinate}
              onClearCoordinate={clearCoordinate}
              mapModelInput={mapModelUtm}
            />
          </TabsContent>

          {/* CALCULADORA */}
          <TabsContent value="manual" forceMount className="h-full w-full m-0 border-none bg-transparent data-[state=inactive]:hidden p-4">
            <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-4">
              <div className="min-h-0 flex items-center justify-center overflow-auto">
                <HP71Emulator
                  userName={loggedUser?.name ?? undefined}
                  logSessionId={logSessionId}
                  onMapModelComplete={handleHp71MapModelComplete}
                  onObserverComplete={handleHp71ObserverComplete}
                  onPieceComplete={handleHp71PieceComplete}
                  onTargetComplete={handleHp71TargetComplete}
                  isActive={activeTab === "manual"}
                />
              </div>

              <div className="min-h-[320px] xl:min-h-0 rounded-xl overflow-hidden border border-border bg-background relative">
                <TacticalMap
                  gunPosition={gunPosition}
                  targetPosition={targetPosition}
                  observerPosition={observerPosition}
                  mapCenter={mapCenter}
                  impacts={[]}
                  onSetTarget={(coord) => { setTargetPosition(coord); setLastTrajectory(null); }}
                  onSetGun={(coord) => { setGunPosition(coord); setIsGunLocated(true); setLastTrajectory(null); }}
                  onLocateGun={() => {
                    setGunPosition(mapCenter);
                    setIsGunLocated(true);
                    setLastTrajectory(null);
                  }}
                  onCenterChange={setMapCenter}
                  realLatLng={null}
                  isFiring={isFiring}
                  showExplosion={showExplosion}
                  fireProgress={fireProgress}
                  isGunLocated={isGunLocated}
                  mapModelBounds={mapModelBounds}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="h-full w-full m-0 border-none bg-transparent data-[state=active]:block">
            <HP71ReportsTab userName={loggedUser?.name ?? undefined} currentSessionId={logSessionId} />
          </TabsContent>

          <TabsContent value="staff" className="h-full w-full m-0 border-none bg-transparent data-[state=active]:flex items-center justify-center p-6">
             {/* Contenido del Login Card */}
             <Card className="p-8 bg-[#1a1a1a]/80 backdrop-blur-xl border-white/5 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-auto border-t-2 border-t-[#F39C63]">
              {!loggedUser ? (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="text-center space-y-1 mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#F39C63]">Fire Control Unit</h2>
                    <p className="text-[10px] text-white/40 uppercase">Autenticación de Terminal</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-white/50 ml-1">ID de Operador</Label>
                      <Input
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="USER_ID"
                        className="bg-white/5 border-white/10 h-12 text-white focus:border-[#F39C63] transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-bold text-white/50 ml-1">Código de Seguridad</Label>
                      <Input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 h-12 text-white focus:border-[#F39C63] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full bg-[#F39C63] hover:bg-[#F39C63]/90 text-black font-black uppercase h-12 tracking-widest"
                  >
                    {isAuthenticating ? "Verificando..." : "Iniciar sesión"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-8 text-center">
                  <div className="relative inline-block">
                    <Avatar className="w-24 h-24 border-4 border-[#F39C63] shadow-[0_0_25px_rgba(243,156,99,0.2)]">
                      <AvatarFallback className="bg-[#F39C63]/10 text-[#F39C63] text-2xl font-black">
                        {loggedUser.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 right-0 bg-[#F39C63] text-black text-[8px] font-bold px-2 py-1 rounded uppercase">
                      Online
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xl font-black uppercase text-white tracking-tight">{loggedUser.name}</div>
                    <div className="text-[10px] text-[#F39C63] font-bold uppercase tracking-widest opacity-70">
                      Rango: {session?.user?.role || 'Operador'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-4">
                     <div className={`p-2 rounded border ${loggedUser.canUseSim ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 opacity-30'}`}>
                        <p className="text-[8px] uppercase font-bold text-white/50">Simulador</p>
                        <p className="text-[10px] font-black text-white">{loggedUser.canUseSim ? 'HABILITADO' : 'CERRADO'}</p>
                     </div>
                     <div className={`p-2 rounded border ${loggedUser.canUseCalc ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 opacity-30'}`}>
                        <p className="text-[8px] uppercase font-bold text-white/50">Balística HP</p>
                        <p className="text-[10px] font-black text-white">{loggedUser.canUseCalc ? 'HABILITADO' : 'CERRADO'}</p>
                     </div>
                  </div>

                  <ProfileManager enabled={session?.user?.role === 'SUPERADMIN'} />

                  <Button
                    onClick={() => signOut()}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 font-black uppercase h-11 tracking-widest transition-all"
                  >
                    Desvincular
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      <Toaster />
      <ReportDialog
        isOpen={isReportOpen}
        data={activeReport}
        onClose={() => setIsReportOpen(false)}
      />
    </main>
  );
}
