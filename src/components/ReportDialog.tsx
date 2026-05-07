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
import { FileText, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { type TrajectoryPoint, type FiringSolution } from '@/lib/ballistics';
// Importación corregida con XAxis y YAxis para resolver errores ts(2304)[cite: 3, 4]
import { 
  AreaChart, 
  Area, 
  CartesianGrid, 
  ResponsiveContainer, 
  XAxis, 
  YAxis 
} from 'recharts';

const SALMON_COLOR = "#F39C63";

interface ManualResult {
  alcance: number;
  elevacion: number;
  tof: number;
}

interface MissionReportData {
  id: string;
  timestamp: string;
  classification: string;
  solution: FiringSolution;
  manualSolution: FiringSolution;
  trajectory: TrajectoryPoint[];
  weapon: string;
  charge: string;
  targetUTM: string;
  targetMGRS: string;
  targetAlt: string;
  impactDamage: number;
  corrections: string[];
  range: string;
  maxOrd: string;
  observerId?: string;
  targetNumber?: string;
  missionType?: string;
  ammoLot?: string;
  metTemp?: number;
  metWindSpeed?: number;
  verticalInterval?: number;
  timeReceived?: string;
  timeFired?: string;
}

export function ReportDialog({ report, isOpen, onClose, manualResults = [] }: { report: MissionReportData | null, isOpen: boolean, onClose: () => void, manualResults?: ManualResult[] }) {
  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto bg-black/40 backdrop-blur-xl border-2 border-[#F39C63] p-6 shadow-[0_0_50px_rgba(243,156,99,0.15)] z-[5000] rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F39C63]/20 rounded-xl border border-[#F39C63]/30">
                <FileText className="w-7 h-7 text-[#F39C63]" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white">
                  INFORME
                </DialogTitle>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-white/40 block uppercase">ID MISIÓN</span>
              <span className="text-sm font-black text-[#F39C63]">{report.id}</span>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-transparent w-full justify-start gap-4 mb-8 p-0 h-auto border-none">
            <TabsTrigger value="overview" className="uppercase font-black text-xs h-14 px-8 rounded-2xl border-2 border-[#7c4a3a] bg-black/40 text-gray-400 data-[state=active]:bg-[#F39C63] data-[state=active]:text-black transition-all tracking-widest">
              RESUMEN
            </TabsTrigger>
            <TabsTrigger value="comparison" className="uppercase font-black text-xs h-14 px-8 rounded-2xl border-2 border-[#7c4a3a] bg-black/40 text-gray-400 data-[state=active]:bg-[#F39C63] data-[state=active]:text-black transition-all tracking-widest flex gap-2">
              <ArrowRightLeft className="w-4 h-4" /> COMPARATIVA
            </TabsTrigger>
            <TabsTrigger value="doctrinal" className="uppercase font-black text-xs h-14 px-8 rounded-2xl border-2 border-[#7c4a3a] bg-black/40 text-gray-400 data-[state=active]:bg-[#F39C63] data-[state=active]:text-black transition-all tracking-widest flex gap-2">
              <ClipboardList className="w-4 h-4" /> DA 4504
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500 outline-none">
            <div className="bg-black/40 rounded-2xl border border-[#F39C63]/20 p-6 h-64 shadow-inner backdrop-blur-sm relative">
              <div className="absolute top-4 left-6 z-10">
                <span className="text-[10px] font-black text-[#F39C63]/60 uppercase tracking-widest">
                  Perfil Balístico Real (RK4 + Drag)
                </span>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.trajectory} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAltReport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SALMON_COLOR} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={SALMON_COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  {/* Tipado (value: number) añadido para resolver error ts(7006)[cite: 3, 4] */}
                  <XAxis 
                    dataKey="distance" 
                    stroke="#ffffff20" 
                    fontSize={10}
                    tickFormatter={(value: number) => `${(value / 1000).toFixed(1)}k`}
                    hide={false}
                  />

                  <YAxis 
                    stroke="#ffffff20" 
                    fontSize={10}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]} 
                    tickFormatter={(value: number) => `${Math.round(value)}m`}
                  />

                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <Area type="monotone" dataKey="altitude" stroke={SALMON_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorAltReport)" isAnimationActive={true} animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <DataBox label="Alcance" value={`${report.range} m`} />
              <DataBox label="Q.E. (Elev)" value={`${report.solution.elevMils} MIL`} color="text-[#F39C63]" />
              <DataBox label="Max Ord" value={`${report.maxOrd} m`} color="text-amber-400" />
              <DataBox label="Altura Obj" value={`${report.targetAlt} m`} color="text-sky-400" />
              <DataBox label="Clasificación" value={report.classification} color="text-emerald-400" />
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6 animate-in slide-in-from-right-4 duration-500 outline-none">
            {manualResults.length === 0 ? (
              <Card className="bg-black/40 border-[#F39C63]/20 overflow-hidden rounded-2xl backdrop-blur-md p-6">
                <div className="text-center text-[#F39C63]/60">
                  <p className="text-sm font-mono">Sin datos del emulador aún</p>
                </div>
              </Card>
            ) : (
              <Card className="bg-black/40 border-[#F39C63]/20 overflow-hidden rounded-2xl backdrop-blur-md">
                <Table>
                  <TableHeader className="bg-[#F39C63]/10">
                    <TableRow className="hover:bg-transparent border-[#F39C63]/20">
                      <TableHead className="text-[11px] font-black uppercase text-white/60 tracking-widest py-4">Parámetro</TableHead>
                      <TableHead className="text-[11px] font-black uppercase text-white tracking-widest text-center">Simulador</TableHead>
                      <TableHead className="text-[11px] font-black uppercase text-[#F39C63] tracking-widest text-center">Manual</TableHead>
                      <TableHead className="text-[11px] font-black uppercase text-emerald-400 tracking-widest text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualResults.map((result, idx) => (
                      <React.Fragment key={idx}>
                        <TableRow className="border-[#F39C63]/10 hover:bg-[#F39C63]/5 transition-colors">
                          <TableCell className="text-[11px] font-black uppercase text-white/50 py-5">ELEVACIÓN (Lectura {idx + 1})</TableCell>
                          <TableCell className="text-sm font-mono text-white font-black text-center">{report.solution.elevMils} <span className="text-[10px] opacity-40">MIL</span></TableCell>
                          <TableCell className="text-sm font-mono text-[#F39C63]/80 font-bold text-center">{result.elevacion.toFixed(2)} <span className="text-[10px] opacity-40">MIL</span></TableCell>
                          <TableCell className="text-sm font-mono font-black text-emerald-400 text-right">+{Math.abs(parseFloat(report.solution.elevMils as string) - result.elevacion).toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow className="border-[#F39C63]/10 hover:bg-[#F39C63]/5 transition-colors">
                          <TableCell className="text-[11px] font-black uppercase text-white/50 py-5">T. VUELO (Lectura {idx + 1})</TableCell>
                          <TableCell className="text-sm font-mono text-white font-black text-center">{report.solution.timeOfFlight.toFixed(1)} <span className="text-[10px] opacity-40">s</span></TableCell>
                          <TableCell className="text-sm font-mono text-[#F39C63]/80 font-bold text-center">{result.tof.toFixed(2)} <span className="text-[10px] opacity-40">s</span></TableCell>
                          <TableCell className="text-sm font-mono font-black text-emerald-400 text-right">+{Math.abs(report.solution.timeOfFlight - result.tof).toFixed(2)}</TableCell>
                        </TableRow>
                        <TableRow className="border-[#F39C63]/10 hover:bg-[#F39C63]/5 transition-colors">
                          <TableCell className="text-[11px] font-black uppercase text-white/50 py-5">ALCANCE (Lectura {idx + 1})</TableCell>
                          <TableCell className="text-sm font-mono text-white font-black text-center">{report.range} <span className="text-[10px] opacity-40">m</span></TableCell>
                          <TableCell className="text-sm font-mono text-[#F39C63]/80 font-bold text-center">{result.alcance.toFixed(0)} <span className="text-[10px] opacity-40">m</span></TableCell>
                          <TableCell className="text-sm font-mono font-black text-emerald-400 text-right">+{Math.abs(parseFloat(report.range as string) - result.alcance).toFixed(0)}</TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="doctrinal" className="space-y-4 animate-in slide-in-from-right-4 duration-500 outline-none">
            <div className="bg-black/30 border border-[#F39C63]/20 rounded-2xl overflow-hidden p-4 backdrop-blur-md">
              <h3 className="text-xs font-black uppercase text-[#F39C63] mb-4 border-b border-[#F39C63]/20 pb-2 flex justify-between items-center">
                <span>Registro de Misión Oficial (DA Form 4504)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <DataBox label="Observador (CFF)" value={report.observerId || "N/A"} color="text-white" />
                <DataBox label="Blanco Asignado" value={report.targetNumber || "N/A"} color="text-amber-400" />
                <DataBox label="Tipo Misión" value={report.missionType || "N/A"} color="text-[#F39C63]" />
                <DataBox label="Int. Vertical (VI)" value={`${report.verticalInterval || 0} m`} color={(report.verticalInterval || 0) >= 0 ? "text-emerald-400" : "text-rose-500"} />
                <DataBox label="Lote Munición" value={report.ammoLot || "N/A"} color="text-white" />
                <DataBox label="MET Temp/Viento" value={`${report.metTemp || 0}°C | ${report.metWindSpeed || 0}kt`} color="text-white" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row gap-4 mt-8">
          <Button variant="outline" className="flex-1 uppercase font-black text-xs tracking-[0.25em] h-14 rounded-2xl border-2 border-[#7c4a3a] bg-black/20 text-gray-300" onClick={onClose}>
            CERRAR
          </Button>
          <Button className="flex-1 bg-[#F39C63] hover:bg-[#ffad75] text-black uppercase font-black text-xs tracking-widest h-14 rounded-2xl shadow-[0_10px_20px_rgba(243,156,99,0.3)]">
            IMPRIMIR INFORME
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

function ComparisonRow({ label, sim, man, unit }: { label: string, sim: any, man: any, unit: string }) {
  const sVal = parseFloat(sim);
  const mVal = parseFloat(man);
  const diff = Math.abs(sVal - mVal).toFixed(1);
  
  return (
    <TableRow className="border-[#F39C63]/10 hover:bg-[#F39C63]/5 transition-colors">
      <TableCell className="text-[11px] font-black uppercase text-white/50 py-5">{label}</TableCell>
      <TableCell className="text-sm font-mono text-white font-black text-center">{sim} <span className="text-[10px] opacity-40">{unit}</span></TableCell>
      <TableCell className="text-sm font-mono text-[#F39C63]/80 font-bold text-center">{man} <span className="text-[10px] opacity-40">{unit}</span></TableCell>
      <TableCell className="text-sm font-mono font-black text-emerald-400 text-right">+{diff}</TableCell>
    </TableRow>
  );
}