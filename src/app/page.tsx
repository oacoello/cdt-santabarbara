'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TacticalBackground } from '@/components/TacticalBackground';
import { type LatLng, type WeaponSystem } from '@/lib/ballistics';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SimulatorTab } from '@/components/fdc/SimulatorTab';
import { ReportDialog } from '@/components/ReportDialog';
import { computeFiringSolution, getMuzzleVelocity, simulateTrajectory } from '@/lib/ballistics';
import HP71Emulator from '@/components/HP71Emulator';
import { HP71ReportsTab } from '@/components/HP71ReportsTab';
import type { AuthenticatedCdtProfile } from '@/lib/sb-access-session';
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
  const [sessionState, setSessionState] = useState<
    | { status: "loading" }
    | { status: "valid"; profile: AuthenticatedCdtProfile; sessionId?: string }
    | { status: "blocked"; reason: string }
  >({ status: "loading" });
  const loggedUser = sessionState.status === "valid" ? sessionState.profile : null;
  const [activeTab, setActiveTab] = useState("sim");
  const [logSessionId, setLogSessionId] = useState("");


  useEffect(() => {
    setLogSessionId(`hp71-${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase());
  }, []);

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.status !== 'valid') {
          setSessionState({
            status: 'blocked',
            reason: data.reason ?? 'Debe abrir CDT desde Servicios de Usuario Santa Barbara',
          });
          return;
        }

        setSessionState({ status: 'valid', profile: data.profile, sessionId: data.sessionId });
      })
      .catch(() => {
        setSessionState({
          status: 'blocked',
          reason: 'No se pudo validar la sesión contra cdt-auth',
        });
      });
  }, []);

  useEffect(() => {
    if (!loggedUser?.username || !logSessionId) return;

    fetch('/api/hp71/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SYSTEM',
        content: 'NUEVA SESIÓN CDT',
        user: loggedUser.username,
        sessionId: logSessionId,
      }),
    }).catch((error) => console.error('Error iniciando log de sesión:', error));
  }, [loggedUser?.username, logSessionId]);


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
    reportApplicationEvent('shooting_record_generated', {
      recordId: reportData.id,
      exerciseName: `${weapon} ${charge}`,
      score: reportData.solution.range,
    });
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

    const easting = rawE;
    const northing = rawN;
    const point = utmToLatLon(easting, northing, mapModelUtm.gz, mapModelUtm.spher);
    const position = { lat: point.latitude, lng: point.longitude };

    setCoordinateInput(role, {
      e: coordinates.e,
      n: coordinates.n,
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

  const reportApplicationEvent = (eventType: string, metadata: Record<string, unknown>) => {
    if (!loggedUser) return;

    fetch('/api/application-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationCode: 'cdt',
        eventType,
        profileId: loggedUser.profileId,
        sessionId: sessionState.status === 'valid' ? sessionState.sessionId ?? logSessionId : logSessionId,
        occurredAt: new Date().toISOString(),
        metadata,
      }),
    }).catch((error) => console.error('Error reportando evento CDT:', error));
  };

  if (sessionState.status === 'loading') {
    return (
      <main className="cdt-app-shell relative flex h-full min-h-[720px] w-full min-w-[1100px] items-center justify-center bg-[#0A0A0E] text-white font-['Stack_Sans_Text']">
        <TacticalBackground />
        <Card className="relative z-10 max-w-lg border-[#F39C63]/30 bg-black/80 p-8 text-center">
          <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#F39C63]">Validando sesión CDT</h1>
          <p className="mt-3 text-sm text-white/60">Consultando Servicios de Usuario Santa Barbara...</p>
        </Card>
      </main>
    );
  }

  if (sessionState.status === 'blocked') {
    return (
      <main className="cdt-app-shell relative flex h-full min-h-[720px] w-full min-w-[1100px] items-center justify-center bg-[#0A0A0E] text-white font-['Stack_Sans_Text']">
        <TacticalBackground />
        <Card className="relative z-10 max-w-xl border-red-500/40 bg-black/85 p-8 text-center">
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-red-400">Acceso bloqueado</h1>
          <p className="mt-4 text-lg font-black text-white">Debe abrir CDT desde Servicios de Usuario Santa Barbara</p>
          <p className="mt-3 text-sm text-white/60">{sessionState.reason}</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="cdt-app-shell relative flex h-full min-h-[600px] w-full min-w-[1100px] flex-col overflow-auto bg-transparent font-['Stack_Sans_Text']">

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
              <span className="material-symbols-rounded text-sm mr-2">badge</span> Operador
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
              <div className="min-h-0 flex items-start justify-center overflow-auto">
                <HP71Emulator
                  userName={loggedUser?.username ?? undefined}
                  logSessionId={logSessionId}
                  metPosition={gunPosition ?? mapCenter}
                  onMapModelComplete={handleHp71MapModelComplete}
                  onObserverComplete={handleHp71ObserverComplete}
                  onPieceComplete={handleHp71PieceComplete}
                  onTargetComplete={handleHp71TargetComplete}
                  onManualCalculationComplete={(result) => reportApplicationEvent('hp71b_manual_calculation_completed', {
                    exerciseName: `${weapon} ${charge}`,
                    inputSummary: `Operador ${loggedUser?.username ?? 'sin-perfil'}`,
                    resultSummary: `DIST ${result.alcance}; QE ${result.elevacion}; TOF ${result.tof}`,
                    generatedFilePath: `/api/hp71/log?user=${encodeURIComponent(loggedUser?.username ?? 'sin-perfil')}&sessionId=${encodeURIComponent(logSessionId)}`,
                  })}
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
            <HP71ReportsTab userName={loggedUser?.username ?? undefined} currentSessionId={logSessionId} />
          </TabsContent>

          <TabsContent value="staff" className="h-full w-full m-0 border-none bg-transparent data-[state=active]:flex items-center justify-center p-6">
            <Card className="p-8 bg-[#1a1a1a]/80 backdrop-blur-xl border-white/5 shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-auto border-t-2 border-t-[#F39C63]">
              <div className="space-y-8 text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 border-4 border-[#F39C63] shadow-[0_0_25px_rgba(243,156,99,0.2)]">
                    {loggedUser?.profilePhotoPath ? (
                      <AvatarImage src={loggedUser.profilePhotoPath} alt={loggedUser.nombre} />
                    ) : null}
                    <AvatarFallback className="bg-[#F39C63]/10 text-[#F39C63] text-2xl font-black">
                      {loggedUser?.nombre?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 right-0 bg-[#F39C63] text-black text-[8px] font-bold px-2 py-1 rounded uppercase">
                    Sesión activa
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xl font-black uppercase text-white tracking-tight">{loggedUser?.nombre}</div>
                  <div className="text-[10px] text-white/45 font-bold uppercase tracking-widest">
                    @{loggedUser?.username}
                  </div>
                  <div className="text-[10px] text-[#F39C63] font-bold uppercase tracking-widest opacity-80">
                    Rol: {loggedUser?.role}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4">
                  <PermissionBox label="Cálculo auto" enabled={!!loggedUser?.permissions.canUseAutomaticCalculation} />
                  <PermissionBox label="HP71B" enabled={!!loggedUser?.permissions.canUseCalculator} />
                  <PermissionBox label="Reportes" enabled={!!loggedUser?.permissions.canUseReports} />
                </div>

                <p className="text-xs text-white/45">
                  El acceso se valida contra Servicios de Usuario Santa Barbara. CDT ya no acepta usuario/contraseña local.
                </p>
              </div>
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
function PermissionBox({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`p-2 rounded border ${enabled ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 opacity-30'}`}>
      <p className="text-[8px] uppercase font-bold text-white/50">{label}</p>
      <p className="text-[10px] font-black text-white">{enabled ? 'HABILITADO' : 'CERRADO'}</p>
    </div>
  );
}
