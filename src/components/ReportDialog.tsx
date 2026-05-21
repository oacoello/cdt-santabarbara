'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ArrowRightLeft, ClipboardList, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { type TrajectoryPoint, type FiringSolution } from '@/lib/ballistics';
import { 
  AreaChart, 
  Area, 
  CartesianGrid, 
  ResponsiveContainer, 
  XAxis, 
  YAxis 
} from 'recharts';
import { cn } from '@/lib/utils';

const SALMON_COLOR = "#F39C63";

export interface MilitaryBallisticData {
  pieza: number | string;
  distancia: number;     
  azimut: number;        
  elevacion: number;     
  tiempoVuelo: number;   
  carga: string;
  proyectil: string;
  coordenadasPieza?: { x: number; y: number; alt: number };
  coordenadasObjetivo?: { x: number; y: number; alt: number };
}

interface MissionReportData {
  id: string;
  timestamp: string;
  classification: string;
  solution: FiringSolution;          
  hp71Solution?: MilitaryBallisticData; 
  trajectory: TrajectoryPoint[];
  weapon: string;
  charge: string;
  targetUTM: string;
  targetMGRS: string;
  targetAlt: string;
  impactDamage: number;
  corrections: string[];
}

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: MissionReportData | null;
}

export function ReportDialog({ isOpen, onClose, data }: ReportDialogProps) {
  if (!data) return null;

  const getDelta = (valSim: number | undefined, valHP: number | undefined, isInteger = true) => {
    if (valSim === undefined || valHP === undefined) return { txt: 'N/A', isCritical: false };
    const diff = valHP - valSim;
    const absDiff = Math.abs(diff);
    
    const isCritical = isInteger ? absDiff > 5 : absDiff > 1.5;
    
    return {
      txt: diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${diff.toFixed(isInteger ? 0 : 1)}`,
      isCritical
    };
  };

  const deltaDist = getDelta(data.solution.range, data.hp71Solution?.distancia, true);
  const deltaAzimut = getDelta(data.solution.azimuth, data.hp71Solution?.azimut, true);
  const deltaElev = getDelta(data.solution.elevMils, data.hp71Solution?.elevacion, true);
  const deltaTiempo = getDelta(data.solution.timeOfFlight, data.hp71Solution?.tiempoVuelo, false);

  const hasCriticalDeviation = deltaElev.isCritical || deltaAzimut.isCritical;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-black/95 text-white border border-[#F39C63]/20 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(243,156,99,0.15)] overflow-hidden p-6">
        
        <DialogHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F39C63]/10 rounded-xl border border-[#F39C63]/30">
              <FileText className="w-5 h-5 text-[#F39C63]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.3em] bg-red-900/40 text-red-400 px-2 py-0.5 rounded border border-red-950">
                  {data.classification}
                </span>
                <span className="text-[10px] font-mono text-white/40">{data.timestamp}</span>
              </div>
              <DialogTitle className="text-lg font-black tracking-wider uppercase text-white mt-1">
                Informe Computarizado del Récord de Tiro
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="comparison" className="w-full mt-4 relative z-10">
          <TabsList className="bg-black/60 border border-[#F39C63]/10 p-1 rounded-xl w-full grid grid-cols-3">
            <TabsTrigger value="comparison" className="data-[state=active]:bg-[#F39C63] data-[state=active]:text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all">
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Mapeo y Comparación HP-71B
            </TabsTrigger>
            <TabsTrigger value="trajectory" className="data-[state=active]:bg-[#F39C63] data-[state=active]:text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Gráfico de Trayectoria
            </TabsTrigger>
            <TabsTrigger value="telemetry" className="data-[state=active]:bg-[#F39C63] data-[state=active]:text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Datos de Misión
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="mt-4 space-y-4 outline-none">
            <div className="border border-[#F39C63]/10 rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-[#F39C63]/5">
                  <TableRow className="border-b border-[#F39C63]/10 hover:bg-transparent">
                    <TableHead className="text-white/60 font-black uppercase text-[10px] tracking-wider py-4">Parámetro (Récord de Tiro)</TableHead>
                    <TableHead className="text-[#F39C63] font-black uppercase text-[10px] tracking-wider text-center">Terminal HP-71B</TableHead>
                    <TableHead className="text-blue-400 font-black uppercase text-[10px] tracking-wider text-center">Simulador Tab (RK4)</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] tracking-wider text-right pr-6">Diferencia (Δ)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="font-mono text-xs">
                  
                  <TableRow className="border-b border-[#F39C63]/5 hover:bg-[#F39C63]/5 transition-colors">
                    <TableCell className="font-sans font-bold text-white/70 py-4">DISTANCIA (m)</TableCell>
                    <TableCell className="text-center text-[#F39C63] font-black text-sm">
                      {data.hp71Solution?.distancia ? `${data.hp71Solution.distancia.toFixed(0)} m` : '---'}
                    </TableCell>
                    <TableCell className="text-center text-blue-400 font-black text-sm">
                      {data.solution?.range ? `${data.solution.range.toFixed(0)} m` : '---'}
                    </TableCell>
                    <TableCell className={cn("text-right font-black text-sm pr-6", deltaDist.isCritical ? "text-red-500" : "text-green-400")}>
                      {deltaDist.txt} {data.hp71Solution && 'm'}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-b border-[#F39C63]/5 hover:bg-[#F39C63]/5 transition-colors">
                    <TableCell className="font-sans font-bold text-white/70 py-4">AZIMUT (Z) (₥)</TableCell>
                    <TableCell className="text-center text-[#F39C63] font-black text-sm">
                      {data.hp71Solution?.azimut ? `${Math.round(data.hp71Solution.azimut)} ₥` : '---'}
                    </TableCell>
                    <TableCell className="text-center text-blue-400 font-black text-sm">
                      {data.solution?.azimuth ? `${Math.round(data.solution.azimuth)} ₥` : '---'}
                    </TableCell>
                    <TableCell className={cn("text-right font-black text-sm pr-6", deltaAzimut.isCritical ? "text-red-500" : "text-green-400")}>
                      {deltaAzimut.txt} {data.hp71Solution && '₥'}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-b border-[#F39C63]/5 hover:bg-[#F39C63]/5 transition-colors">
                    <TableCell className="font-sans font-bold text-white/70 py-4">ELEVACIÓN (E) (₥)</TableCell>
                    <TableCell className="text-center text-[#F39C63] font-black text-sm">
                      {data.hp71Solution?.elevacion ? `${Math.round(data.hp71Solution.elevacion)} ₥` : '---'}
                    </TableCell>
                    <TableCell className="text-center text-blue-400 font-black text-sm">
                      {data.solution?.elevMils ? `${Math.round(data.solution.elevMils)} ₥` : '---'}
                    </TableCell>
                    <TableCell className={cn("text-right font-black text-sm pr-6", deltaElev.isCritical ? "text-red-500" : "text-green-400")}>
                      {deltaElev.txt} {data.hp71Solution && '₥'}
                    </TableCell>
                  </TableRow>

                  <TableRow className="border-b border-[#F39C63]/5 hover:bg-[#F39C63]/5 transition-colors">
                    <TableCell className="font-sans font-bold text-white/70 py-4">TIEMPO DE VUELO (T) (s)</TableCell>
                    <TableCell className="text-center text-[#F39C63] font-black text-sm">
                      {data.hp71Solution?.tiempoVuelo ? `${data.hp71Solution.tiempoVuelo.toFixed(1)} s` : '---'}
                    </TableCell>
                    <TableCell className="text-center text-blue-400 font-black text-sm">
                      {data.solution?.timeOfFlight ? `${data.solution.timeOfFlight.toFixed(1)} s` : '---'}
                    </TableCell>
                    <TableCell className={cn("text-right font-black text-sm pr-6", deltaTiempo.isCritical ? "text-red-500" : "text-green-400")}>
                      {deltaTiempo.txt} {data.hp71Solution && 's'}
                    </TableCell>
                  </TableRow>

                  <TableRow className="hover:bg-[#F39C63]/5 transition-colors border-none">
                    <TableCell className="font-sans font-bold text-white/70 py-4">CARGA / PIEZA DE ARTILLERÍA</TableCell>
                    <TableCell className="text-center text-white/60 font-sans text-[11px]">
                      {data.hp71Solution?.carga ? `CHG ${data.hp71Solution.carga} / Pza: ${data.hp71Solution.pieza}` : '---'}
                    </TableCell>
                    <TableCell className="text-center text-white/60 font-sans text-[11px]">
                      {data.charge ? `CHG ${data.charge} / OBÚS` : '---'}
                    </TableCell>
                    <TableCell className="text-right text-white/40 font-sans text-[10px] pr-6">
                      {data.hp71Solution?.carga === data.charge ? 'VERIFICADO' : 'DIFERENTE'}
                    </TableCell>
                  </TableRow>

                </TableBody>
              </Table>
            </div>

            {hasCriticalDeviation ? (
              <Card className="p-4 bg-red-950/30 border border-red-900/40 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-400">Desviación Fuera de Tolerancia Militar</h4>
                  <p className="text-[11px] text-red-200/60 leading-relaxed mt-1 font-sans">
                    La variación entre el algoritmo de la HP-71B y la simulación por integración numérica RK4 supera los límites de seguridad de tiro artillero (±5 milésimas). Compruebe los coeficientes de arrastre atmosférico o el reglaje de las coordenadas UTM.
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-green-950/30 border border-green-900/40 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-green-400">Solución Homologada con Éxito</h4>
                  <p className="text-[11px] text-green-200/60 leading-relaxed mt-1 font-sans">
                    Los datos de la calculadora de hardware militar coinciden perfectamente con el motor simulador balístico dentro de las tolerancias operacionales de las Fuerzas Armadas de Honduras.
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trajectory" className="mt-4 outline-none">
            <Card className="p-4 bg-black/40 border border-[#F39C63]/10 backdrop-blur-sm rounded-2xl">
              <div className="h-[240px] w-full font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trajectory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SALMON_COLOR} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={SALMON_COLOR} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="distance" stroke="#666" tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} label={{ value: 'Distancia (m)', position: 'insideBottomRight', offset: -5, fill: '#666' }} />
                    <YAxis stroke="#666" label={{ value: 'Altitud (m)', angle: -90, position: 'insideLeft', offset: 10, fill: '#666' }} />
                    <Area type="monotone" dataKey="altitude" stroke={SALMON_COLOR} strokeWidth={2} fillOpacity={1} fill="url(#colorAlt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="telemetry" className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 outline-none">
            <DataBox label="Sistema de Armas" value={data.weapon} />
            <DataBox label="Carga de Proyección" value={`CHG ${data.charge}`} />
            <DataBox label="Altitud de Impacto" value={`${data.targetAlt} M`} />
            <DataBox label="Coordenadas UTM" value={data.targetUTM} />
            <DataBox label="Georreferencia MGRS" value={data.targetMGRS} color="text-blue-400" />
            <DataBox label="Daño Estimado" value={`${data.impactDamage}%`} color="text-red-500" />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 border-t border-[#F39C63]/10 pt-4 flex sm:justify-between items-center gap-4 relative z-10">
          <div className="text-[10px] text-white/30 font-mono hidden md:block">
            ID MISIÓN: {data.id} | SECCIÓN DE COMPUTADORES TÁCTICOS
          </div>
          <Button onClick={() => window.print()} className="bg-gradient-to-r from-[#F39C63] to-[#e67e22] text-black font-black uppercase text-xs tracking-wider px-6 h-11 rounded-xl shadow-[0_0_20px_rgba(243,156,99,0.3)] hover:opacity-90 transition-all">
            IMPRIMIR RÉCORD DE TIRO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DataBox({ label, value, color = "text-[#F39C63]" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-black/40 p-4 rounded-2xl border border-[#F39C63]/10 backdrop-blur-sm group hover:border-[#F39C63]/40 transition-all duration-300">
      <span className="text-[9px] text-white/40 uppercase font-black block mb-2 tracking-widest">{label}</span>
      <span className={`text-sm font-mono ${color} font-black`}>{value}</span>
    </div>
  );
}