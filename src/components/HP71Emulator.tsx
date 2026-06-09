"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Pin, PinOff, Trash2, X } from "lucide-react";

// ---------- Funciones auxiliares ----------
function extractBasePiece(text: string): number | null {
  const match = text.match(/BASE PIECE \(P \*\): (\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function isAskingForBasePiece(text: string): boolean {
  return text.includes("BASE PIECE");
}

// ---------- Tipado de teclas ----------
type KeyColor = "black" | "white" | "orange" | "blue";

const COLOR_PALETTE: Record<KeyColor, { top: string; front: string; text: string }> = {
  black: {
    top: "bg-gradient-to-b from-[#383838] via-[#242424] to-[#1e1e1e]",
    front: "bg-[#121212]",
    text: "text-gray-100",
  },
  white: {
    top: "bg-gradient-to-b from-[#f2ece0] via-[#dfd8ca] to-[#cbc3b3]",
    front: "bg-[#a39a87]",
    text: "text-[#1a1a1a]",
  },
  orange: {
    top: "bg-gradient-to-b from-[#eab308] via-[#ca8a04] to-[#a16207]",
    front: "bg-[#713f12]",
    text: "text-black",
  },
  blue: {
    top: "bg-gradient-to-b from-[#0284c7] via-[#0369a1] to-[#075985]",
    front: "bg-[#0c4a6e]",
    text: "text-white",
  },
};

interface KeyProps {
  label: string;
  data: string;
  topLabel?: string;
  subLabel?: string;
  bottomLabel?: string;
  color?: KeyColor;
  className?: string;
  onClick: (data: string) => void;
}

const CalcKey: React.FC<KeyProps> = ({
  label,
  data,
  topLabel,
  subLabel,
  bottomLabel,
  color = "black",
  className = "",
  onClick,
}) => {
  const styles = COLOR_PALETTE[color] || COLOR_PALETTE.black;

  return (
    <div className={`flex flex-col items-center select-none relative z-10 mx-[1px] sm:mx-[1.5px] ${className}`}>
      <div className="h-4 mb-[2px] flex flex-col items-center justify-end">
        {topLabel && (
          <span className="text-[7.5px] sm:text-[8.5px] text-[#C5A059] font-black uppercase tracking-tight">
            {topLabel}
          </span>
        )}
      </div>

      <button onClick={() => onClick(data)} className="relative active:translate-y-[1.5px] transition-all duration-75 group outline-none">
        <div className={`relative z-10 w-9 h-[22px] sm:w-[46px] sm:h-[26px] ${styles.top} rounded-t-[3px] border-t border-x border-white/5 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:brightness-105 transition-all`}>
          <span className={`text-[10px] sm:text-[11px] font-black tracking-wide ${styles.text}`}>{label}</span>
        </div>
        <div className={`relative z-10 w-9 h-2.5 sm:w-[46px] sm:h-3.5 ${styles.front} rounded-b-[3px] border-b-[2.5px] border-black/85 flex items-center justify-center`}>
          {subLabel && (
            <span className="text-[7px] sm:text-[8.5px] text-[#29f3ff] font-extrabold tracking-tight scale-[0.85] sm:scale-100">
              {subLabel}
            </span>
          )}
        </div>
      </button>

      <div className="h-4 mt-[2px] flex items-start justify-center">
        {bottomLabel && (
          <span className="text-[7px] sm:text-[8px] text-[#29f3ff] font-extrabold uppercase tracking-tighter">
            {bottomLabel}
          </span>
        )}
      </div>
    </div>
  );
};

// ---------- Utilidad: detectar piezas en la respuesta ----------
type PieceResult = {
  number: number;
  text: string;
};

type MissionCapture = {
  id: string;
  title: string;
  text: string;
  pinned: boolean;
  createdAt: number;
};

type Hp71RecordData = {
  targetNumber?: number;
  pieceNumber?: number;
  distance?: number;
  deflection?: number;
  qe?: number;
  angleT?: number;
  tof?: number;
  charge?: number;
  observerDirection?: number;
  correctionLR?: number;
  correctionAD?: number;
  correctionUD?: number;
};

type Hp71RecordRow = Pick<
  Hp71RecordData,
  "targetNumber" | "pieceNumber" | "distance" | "charge" | "tof" | "deflection" | "qe"
> & {
  id: string;
};

type Hp71RecordInputField = "observerDirection" | "correctionLR" | "correctionAD" | "correctionUD";



const RESULT_KEYS = ["MISION", "MISSION", "DIST", "AZ", "DEF", "CHG", "QE", "TOF", "FUZE"];
const PIECE_HEADER_PATTERN = /^[\s\-–—]*PIECE\s+(\d+)[\s\-–—]*$/i;

function normalizePieceHeader(line: string): string {
  const match = line.trim().match(PIECE_HEADER_PATTERN);
  return match ? `----- PIECE ${match[1]} -----` : line.trim();
}

function extractMissionResultCapture(piece: PieceResult): string | null {
  const lines = piece.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const output: string[] = [normalizePieceHeader(lines[0])];
  let foundMission = false;

  for (const line of lines.slice(1)) {
    const key = line.split(/\s+/)[0]?.toUpperCase();
    if (key === "COMP" || key === "TESON") break;
    if (!RESULT_KEYS.includes(key)) continue;

    output.push(line.toUpperCase());
    if (key === "MISION" || key === "MISSION") foundMission = true;
    if (key === "FUZE") break;
  }

  const hasRequiredResult = output.some((line) => /^DIST\s+/i.test(line))
    && output.some((line) => /^AZ\s+/i.test(line))
    && output.some((line) => /^FUZE\s+/i.test(line));

  return foundMission && hasRequiredResult ? output.join("\n") : null;
}

function parsePieces(text: string): PieceResult[] {
  const lines = text.split(/\r?\n/);
  const result: PieceResult[] = [];
  let current: string[] = [];
  let currentNumber: number | null = null;

  for (const line of lines) {
    const clean = line.trim();
    const pieceMatch = clean.match(PIECE_HEADER_PATTERN);

    if (pieceMatch) {
      if (current.length > 0 && currentNumber !== null) {
        result.push({ number: currentNumber, text: current.join("\n") });
      }
      currentNumber = parseInt(pieceMatch[1], 10);
      current = [clean];
      continue;
    }

    if (current.length > 0) {
      if (clean.startsWith("COMP CORR") || clean.startsWith("TESON")) continue;
      if (clean !== "") current.push(clean);
    }
  }

  if (current.length > 0 && currentNumber !== null) {
    result.push({ number: currentNumber, text: current.join("\n") });
  }

  return result;
}

function getVisibleLcdLines(text: string, preferStart: boolean): [string, string] {
  const lines = text.split(/\r?\n/);
  const relevantLines = preferStart ? lines : lines.filter((line) => line.trim() !== "");

  if (preferStart) {
    return [relevantLines[0] ?? "", relevantLines[1] ?? ""];
  }

  if (relevantLines.length <= 1) {
    return [relevantLines[0] ?? "", ""];
  }

  const last = relevantLines[relevantLines.length - 1] ?? "";
  const beforeLast = relevantLines[relevantLines.length - 2] ?? "";

  if (last.trim() === ">" && beforeLast.trim().endsWith(">")) {
    return [beforeLast, ""];
  }

  return [beforeLast, last];
}

function ensureSinglePrompt(text: string): string {
  const clean = text.replace(/\s+$/g, "");
  if (/>$/.test(clean)) return clean;
  return `${clean}\n>`;
}

async function fetchHp71Display(command: string): Promise<string> {
  const encoded = encodeURIComponent(command);

  if (process.env.NODE_ENV === "development") {
    try {
      const directRes = await fetch("http://127.0.0.1:8080/input", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `cmd=${encoded}`,
      });

      if (directRes.ok) return await directRes.text();
    } catch {
      // Fall back to the Next proxy below.
    }
  }

  const proxyRes = await fetch(`/api/hp71?cmd=${encoded}`, { method: "POST" });
  const json = await proxyRes.json();
  return json.display || "";
}

async function fetchHp71Record(): Promise<Hp71RecordData | null> {
  try {
    if (process.env.NODE_ENV === "development") {
      const directRes = await fetch("http://127.0.0.1:8080/record", { cache: "no-store" });
      if (directRes.ok) return await directRes.json();
    }
  } catch {
    // Fall back to the Next proxy below.
  }

  try {
    const proxyRes = await fetch("/api/hp71/record", { cache: "no-store" });
    if (!proxyRes.ok) return null;
    const json = await proxyRes.json();
    return "error" in json ? null : json;
  } catch {
    return null;
  }
}

function cleanNumber(value: string | undefined): number | undefined {
  if (!value || /NO\s+DATA/i.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRecordFromDisplay(text: string, fallbackPiece: number): Hp71RecordData {
  const pieces = parsePieces(text);
  const piece = pieces.find((item) => item.number === fallbackPiece) ?? pieces[0];
  const source = piece?.text ?? text;

  return {
    pieceNumber: piece?.number,
    distance: cleanNumber(source.match(/\bDIST\s+([^\s]+)/i)?.[1]),
    deflection: cleanNumber(source.match(/\bDEF\s+([^\s]+)/i)?.[1]),
    charge: cleanNumber(source.match(/\bCHG\s+([^\s]+)/i)?.[1]),
    qe: cleanNumber(source.match(/\bQE\s+([^\s]+)/i)?.[1]),
    tof: cleanNumber(source.match(/\bTOF\s+([^\s]+)/i)?.[1]),
    angleT: cleanNumber(text.match(/\bANG\s+T(?:\s+\(P\*\):)?\s*([^\s]+)/i)?.[1]),
    observerDirection: cleanNumber(text.match(/\bDIR(?:\s+\(P\s+X\):)?\s*([^\s]+)/i)?.[1]),
    correctionLR: cleanNumber(text.match(/\bLR\s+SHIFT\s+([^\s]+)/i)?.[1]),
    correctionAD: cleanNumber(text.match(/\bAD\s+SHIFT\s+([^\s]+)/i)?.[1]),
    correctionUD: cleanNumber(text.match(/\bUD\s+SHIFT\s+([^\s]+)/i)?.[1]),
  };
}

function parsePieceRecordRow(piece: PieceResult, context: Hp71RecordData): Hp71RecordRow | null {
  const parsed = parseRecordFromDisplay(piece.text, piece.number);
  const row = definedRecordPatch({
    targetNumber: context.targetNumber,
    pieceNumber: parsed.pieceNumber ?? piece.number,
    distance: parsed.distance,
    charge: parsed.charge,
    tof: parsed.tof,
    deflection: parsed.deflection,
    qe: parsed.qe,
  });

  if (
    row.pieceNumber === undefined &&
    row.distance === undefined &&
    row.charge === undefined &&
    row.tof === undefined &&
    row.deflection === undefined &&
    row.qe === undefined
  ) {
    return null;
  }

  return {
    id: `${Date.now()}-${piece.number}-${Math.random().toString(36).slice(2, 7)}`,
    ...row,
  };
}

function currentTargetFromDisplay(text: string): number | undefined {
  const match = text.match(/\b(?:KNPT|BLANCO|TGT)\s*(?:\(P\s+\*\))?\s*:?\s*(\d+)/i);
  return cleanNumber(match?.[1]);
}

function parseDirectionalNumber(value: string, positiveLetters: string, negativeLetters: string): number | undefined {
  const clean = value.trim().toUpperCase();
  if (!clean) return undefined;

  const direction = clean[0];
  const numeric = Number((positiveLetters + negativeLetters).includes(direction) ? clean.slice(1) : clean);
  if (!Number.isFinite(numeric)) return undefined;

  return negativeLetters.includes(direction) ? -numeric : numeric;
}

function getRecordInputField(text: string): Hp71RecordInputField | null {
  if (/DIR\s+\(P\s+X\):/i.test(text)) return "observerDirection";
  if (/\(L\/R\)\s+SHIFT/i.test(text)) return "correctionLR";
  if (/\(A\/D\)\s+SHIFT/i.test(text)) return "correctionAD";
  if (/\(U\/D\)\s+SHIFT/i.test(text)) return "correctionUD";
  return null;
}

function definedRecordPatch(patch: Partial<Hp71RecordData>): Partial<Hp71RecordData> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  ) as Partial<Hp71RecordData>;
}

function fmtRecord(value: number | undefined): string {
  return value === undefined || value === 0 ? "" : String(Math.round(value * 10) / 10);
}

function RecordDeTiroDialog({
  data,
  rows,
  onClose,
}: {
  data: Hp71RecordData;
  rows: Hp71RecordRow[];
  onClose: () => void;
}) {
  const valueBoxClass = "absolute -translate-x-1/2 translate-y-[36px] overflow-hidden whitespace-nowrap text-center font-mono text-[clamp(10px,1.05vw,17px)] font-black leading-none text-blue-600";
  const rowValueBoxClass = "absolute -translate-x-1/2 translate-y-[36px] overflow-hidden whitespace-nowrap text-center font-mono text-[clamp(9px,0.95vw,15px)] font-black leading-none text-green-600";
  const fields: Array<{ id: string; key: keyof Hp71RecordData; className: string }> = [
    { id: "target", key: "targetNumber", className: "left-[53.3%] top-[6.4%] w-[8%]" },
    { id: "piece", key: "pieceNumber", className: "left-[33%] top-[26.6%] w-[4.5%]" },
    { id: "distance", key: "distance", className: "left-[52%] top-[26.6%] w-[9%]" },
    { id: "charge", key: "charge", className: "left-[40%] top-[30%] w-[3.8%]" },
    { id: "tof-initial", key: "tof", className: "left-[65.2%] top-[30%] w-[6.2%]" },
    { id: "deflection", key: "deflection", className: "left-[76.5%] top-[30%] w-[7.5%]" },
    { id: "qe", key: "qe", className: "left-[84%] top-[30%] w-[6.5%]" },
    { id: "angle-t-message", key: "angleT", className: "left-[40.8%] top-[30%] w-[7.5%]" },
    { id: "observer-direction", key: "observerDirection", className: "left-[6.7%] top-[43.5%] w-[6.5%]" },
    { id: "correction-lr", key: "correctionLR", className: "left-[12.1%] top-[43.5%] w-[4.8%]" },
    { id: "correction-ad", key: "correctionAD", className: "left-[16.1%] top-[43.5%] w-[4.8%]" },
    { id: "correction-ud", key: "correctionUD", className: "left-[21.8%] top-[43.5%] w-[4.8%]" },
  ];
  const rowFields: Array<{ key: keyof Hp71RecordRow; left: string; width: string }> = [
    { key: "targetNumber", left: "5%", width: "6.3%" },
    { key: "pieceNumber", left: "6%", width: "4.5%" },
    { key: "distance", left: "12.8%", width: "5.7%" },
    { key: "charge", left: "24.7%", width: "3.6%" },
    { key: "tof", left: "40%", width: "5.3%" },
    { key: "deflection", left: "61.5%", width: "6.2%" },
    { key: "qe", left: "79.5%", width: "5.6%" },
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/85 p-4">
      <div className="relative h-[94vh] w-[98vw] overflow-hidden rounded-2xl border-2 border-[#F39C63] bg-white shadow-2xl">
        <div className="absolute right-3 top-3 z-30 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/80 p-2 text-white transition hover:bg-[#F39C63] hover:text-black"
            aria-label="Cerrar record de tiro"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex h-full w-full items-start justify-center overflow-auto bg-white p-4 pt-12">
          <div className="relative aspect-[792/612] w-[min(1500px,calc(100vw-64px))] min-w-[960px]">
            <iframe
              title="Record de tiro"
              src="/record-de-tiro.html"
              className="absolute inset-0 h-full w-full border-0"
            />
            <div className="pointer-events-none absolute inset-0 z-20">
              {fields.map((field) => (
                <span
                  key={field.id}
                  className={`${valueBoxClass} ${field.className}`}
                  title={fmtRecord(data[field.key])}
                >
                  {fmtRecord(data[field.key])}
                </span>
              ))}
              {rows.slice(0, 7).map((row, rowIndex) => (
                <React.Fragment key={row.id}>
                  {rowFields.map((field) => (
                    <span
                      key={`${row.id}-${field.key}`}
                      className={rowValueBoxClass}
                      style={{
                        left: field.left,
                        top: `${43.5 + rowIndex * 2.65}%`,
                        width: field.width,
                      }}
                      title={fmtRecord(row[field.key] as number | undefined)}
                    >
                      {fmtRecord(row[field.key] as number | undefined)}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type HP71EmulatorProps = {
  userName?: string;
  logSessionId?: string;
  onMapModelComplete?: (model: {
    maxE: number;
    minE: number;
    maxN: number;
    minN: number;
    gz: number;
    spher: string;
  }) => void;
  onObserverComplete?: (observer: {
    alt: number;
    e: number;
    n: number;
  }) => void;
  onPieceComplete?: (piece: {
    alt: number;
    e: number;
    n: number;
  }) => void;
  onTargetComplete?: (target: {
    alt: number;
    e: number;
    n: number;
  }) => void;
  isActive?: boolean;
};

type MapModelField = "maxE" | "minE" | "maxN" | "minN" | "gz" | "spher";
type ObserverField = "alt" | "e" | "n";
type PieceField = "e" | "n" | "alt";
type TargetField = "e" | "n" | "alt";

const MAP_MODEL_PROMPTS: Array<[MapModelField, RegExp]> = [
  ["maxE", /MAX\s+E\s+\(P\s+\*\)/i],
  ["minE", /MIN\s+E\s+\(P\s+\*\)/i],
  ["maxN", /MAX\s+N\s+\(P\s+\*\)/i],
  ["minN", /MIN\s+N\s+\(P\s+\*\)/i],
  ["gz", /GZ\s+\(P\s+\*\)/i],
  ["spher", /SPHER\s+\(P\s+\*\)/i],
];

function getMapModelPromptField(text: string): MapModelField | null {
  return MAP_MODEL_PROMPTS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const OBSERVER_PROMPTS: Array<[ObserverField, RegExp]> = [
  ["alt", /OBS\s+ALT(?:\s+\(P\s+\*\))?:/i],
  ["e", /OBS\s+E\s+\(P\s+\*\)/i],
  ["n", /OBS\s+N\s+\(P\s+\*\)/i],
];

function getObserverPromptField(text: string): ObserverField | null {
  return OBSERVER_PROMPTS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const PIECE_PROMPTS: Array<[PieceField, RegExp]> = [
  ["e", /GB\s+E\s+\(P\s+\*\)/i],
  ["n", /GB\s+N\s+\(P\s+\*\)/i],
  ["alt", /GB\s+ALT\s+\(P\s+\*\)/i],
];

function getPiecePromptField(text: string): PieceField | null {
  return PIECE_PROMPTS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const TARGET_PROMPTS: Array<[TargetField, RegExp]> = [
  ["e", /TGT\s+E\s+\(P\s+\*\)/i],
  ["n", /TGT\s+N\s+\(P\s+\*\)/i],
  ["alt", /TGT\s+ALT\s+\(P\s+\*\)/i],
];

function getTargetPromptField(text: string): TargetField | null {
  return TARGET_PROMPTS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

// ---------- Componente principal ----------
export default function HP71Emulator({
  userName = "sin-perfil",
  logSessionId = "session",
  onMapModelComplete,
  onObserverComplete,
  onPieceComplete,
  onTargetComplete,
  isActive = true,
}: HP71EmulatorProps) {
  const [screenText, setScreenText] = useState("SANTA BARBARA");
  const [buffer, setBuffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);

  // Estado de navegación de piezas
  const [pieces, setPieces] = useState<PieceResult[]>([]);
  const [pieceIndex, setPieceIndex] = useState(0);
  const [pieceMode, setPieceMode] = useState(false);

  // Estado para almacenar resultados manuales extraídos
  const [manualResults, setManualResults] = useState<{alcance: number, elevacion: number, tof: number}[]>([]);
  const [missionCaptures, setMissionCaptures] = useState<MissionCapture[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordData, setRecordData] = useState<Hp71RecordData>({});
  const [recordRows, setRecordRows] = useState<Hp71RecordRow[]>([]);
  const [recordInputField, setRecordInputField] = useState<Hp71RecordInputField | null>(null);
  const lastVisibleCaptureRef = useRef<string>("");
  const capturesRef = useRef<HTMLDivElement>(null);

  // Nuevos estados para pieza base
  const [basePieceNumber, setBasePieceNumber] = useState<number>(1);
  const [waitingBasePiece, setWaitingBasePiece] = useState<boolean>(false);
  const [mapModelField, setMapModelField] = useState<MapModelField | null>(null);
  const mapModelDraftRef = useRef<Partial<Record<MapModelField, string>>>({});
  const [observerField, setObserverField] = useState<ObserverField | null>(null);
  const observerDraftRef = useRef<Partial<Record<ObserverField, string>>>({});
  const [pieceField, setPieceField] = useState<PieceField | null>(null);
  const pieceDraftRef = useRef<Partial<Record<PieceField, string>>>({});
  const [targetField, setTargetField] = useState<TargetField | null>(null);
  const targetDraftRef = useRef<Partial<Record<TargetField, string>>>({});

  // ---------- Arranque original: SANTA BARBARA durante 2 segundos ----------
  useEffect(() => {
    const timer = setTimeout(() => {
      setPromptVisible(true);
      setScreenText("> ");
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // ---------- Función para registrar eventos en el log ----------
  const logEvent = useCallback(async (type: 'INPUT' | 'OUTPUT', content: string) => {
    try {
      await fetch('/api/hp71/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, user: userName, sessionId: logSessionId }),
      });
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }, [userName, logSessionId]);

  const addMissionCapture = useCallback((piece: PieceResult) => {
    const captureText = extractMissionResultCapture(piece);
    if (!captureText) return;
    const recordRow = parsePieceRecordRow(piece, recordData);

    setMissionCaptures((prev) => [
      {
        id: `${Date.now()}-${piece.number}-${Math.random().toString(36).slice(2, 7)}`,
        title: `Captura ${prev.length + 1}`,
        text: captureText,
        pinned: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    if (recordRow) {
      setRecordRows((prev) => [...prev, recordRow].slice(-7));
    }
  }, [recordData]);

  const toggleMissionCapturePin = useCallback((id: string) => {
    setMissionCaptures((prev) => prev.map((capture) => (
      capture.id === id ? { ...capture, pinned: !capture.pinned } : capture
    )));
  }, []);

  const deleteMissionCapture = useCallback((id: string) => {
    lastVisibleCaptureRef.current = "";
    setMissionCaptures((prev) => prev.filter((capture) => capture.id !== id));
  }, []);

  const refreshRecordData = useCallback(async () => {
    const backendRecord = await fetchHp71Record();
    if (backendRecord) {
      setRecordData((prev) => ({ ...prev, ...backendRecord }));
    }
  }, []);

  const openRecord = useCallback(() => {
    setRecordOpen(true);
    void refreshRecordData();
  }, [refreshRecordData]);

  // ---------- Envío de comandos al servidor ----------
  const sendCommand = useCallback(async (command: string, preferredBasePieceNumber = basePieceNumber) => {
    if (loading) return;
    const pendingMapModelField = command !== "P" ? mapModelField : null;
    const pendingObserverField = command !== "P" ? observerField : null;
    const pendingPieceField = command !== "P" ? pieceField : null;
    const pendingTargetField = command !== "P" ? targetField : null;
    const pendingRecordInputField = command !== "P" && command !== "*" ? recordInputField : null;
    setLoading(true);
    try {
      const responseText = await fetchHp71Display(command);
      let nextBasePieceNumber = preferredBasePieceNumber;
      const recordInputPatch: Partial<Hp71RecordData> = {};

      if (pendingRecordInputField) {
        const cleanCommand = command.trim();
        if (cleanCommand) {
          if (pendingRecordInputField === "observerDirection") {
            const value = Number(cleanCommand);
            if (Number.isFinite(value)) recordInputPatch.observerDirection = value;
          } else if (pendingRecordInputField === "correctionLR") {
            const value = parseDirectionalNumber(cleanCommand, "R", "L");
            if (value !== undefined) recordInputPatch.correctionLR = value;
          } else if (pendingRecordInputField === "correctionAD") {
            const value = parseDirectionalNumber(cleanCommand, "A", "D");
            if (value !== undefined) recordInputPatch.correctionAD = value;
          } else if (pendingRecordInputField === "correctionUD") {
            const value = parseDirectionalNumber(cleanCommand, "U", "D");
            if (value !== undefined) recordInputPatch.correctionUD = value;
          }
        }
      }

      if (pendingMapModelField) {
        mapModelDraftRef.current = {
          ...mapModelDraftRef.current,
          [pendingMapModelField]: command.trim(),
        };
      }

      const nextMapModelField = getMapModelPromptField(responseText);
      setMapModelField(nextMapModelField);

      if (pendingObserverField) {
        observerDraftRef.current = {
          ...observerDraftRef.current,
          [pendingObserverField]: command.trim(),
        };
      }

      const nextObserverField = getObserverPromptField(responseText);
      setObserverField(nextObserverField);

      if (/OBS\s+STORED/i.test(responseText)) {
        const draft = observerDraftRef.current;
        if (draft.alt && draft.e && draft.n) {
          onObserverComplete?.({
            alt: Number(draft.alt),
            e: Number(draft.e),
            n: Number(draft.n),
          });
        }
        observerDraftRef.current = {};
      }

      if (pendingPieceField) {
        pieceDraftRef.current = {
          ...pieceDraftRef.current,
          [pendingPieceField]: command.trim(),
        };
      }

      const nextPieceField = getPiecePromptField(responseText);
      setPieceField(nextPieceField);

      if (pendingPieceField === "alt") {
        const draft = pieceDraftRef.current;
        if (draft.e && draft.n && draft.alt) {
          onPieceComplete?.({
            e: Number(draft.e),
            n: Number(draft.n),
            alt: Number(draft.alt),
          });
          pieceDraftRef.current = {};
        }
      }

      if (/COB\s+STORED/i.test(responseText)) {
        const draft = pieceDraftRef.current;
        if (draft.e && draft.n && draft.alt) {
          onPieceComplete?.({
            e: Number(draft.e),
            n: Number(draft.n),
            alt: Number(draft.alt),
          });
        }
        pieceDraftRef.current = {};
      }

      if (pendingTargetField) {
        targetDraftRef.current = {
          ...targetDraftRef.current,
          [pendingTargetField]: command.trim(),
        };
      }

      const nextTargetField = getTargetPromptField(responseText);
      setTargetField(nextTargetField);

      if (/TGT\s+.+STORED/i.test(responseText)) {
        const draft = targetDraftRef.current;
        if (draft.e && draft.n && draft.alt) {
          onTargetComplete?.({
            e: Number(draft.e),
            n: Number(draft.n),
            alt: Number(draft.alt),
          });
        }
        targetDraftRef.current = {};
      }

      if (/MAP\s+STORED/i.test(responseText)) {
        const draft = mapModelDraftRef.current;
        if (
          draft.maxE &&
          draft.minE &&
          draft.maxN &&
          draft.minN &&
          draft.gz &&
          draft.spher
        ) {
          onMapModelComplete?.({
            maxE: Number(draft.maxE),
            minE: Number(draft.minE),
            maxN: Number(draft.maxN),
            minN: Number(draft.minN),
            gz: Number(draft.gz),
            spher: draft.spher,
          });
        }
        mapModelDraftRef.current = {};
      }

      // Lógica nueva para pieza base
      const basePiece = extractBasePiece(responseText);
      if (basePiece !== null) {
        nextBasePieceNumber = basePiece;
        setBasePieceNumber(basePiece);
        setWaitingBasePiece(true);
      }
      if (!isAskingForBasePiece(responseText)) {
        setWaitingBasePiece(false);
      }

      setRecordData((prev) => ({
        ...prev,
        targetNumber: currentTargetFromDisplay(responseText) ?? prev.targetNumber,
        ...definedRecordPatch(parseRecordFromDisplay(responseText, nextBasePieceNumber)),
        ...recordInputPatch,
      }));
      setRecordInputField(getRecordInputField(responseText));
      void refreshRecordData();

      // ---------- Extraer QE, TOF y Alcance siempre que aparezcan ----------
      if (/DIST/i.test(responseText)) {
        const distMatch = responseText.match(/DIST\s+(\d+(?:\.\d+)?)/);
        const qeMatch   = responseText.match(/QE\s+(\d+(?:\.\d+)?)/);
        const tofMatch  = responseText.match(/TOF\s+(\d+(?:\.\d+)?)/);

        if (distMatch && qeMatch && tofMatch) {
          setManualResults(prev => [...prev, {
            alcance: parseFloat(distMatch[1]),
            elevacion: parseFloat(qeMatch[1]),
            tof: parseFloat(tofMatch[1])
          }]);
        }
      }

      // ---------- Detectar múltiples piezas ----------
      const foundPieces = parsePieces(responseText);
      if (foundPieces.length > 0) {
        setPieces(foundPieces);
        const selectedIndex = foundPieces.findIndex((piece) => piece.number === nextBasePieceNumber);
        const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
        setPieceIndex(nextIndex);
        setPieceMode(true);
        setPromptVisible(false);
      } else {
        setPieces([]);
        setPieceMode(false);
        setScreenText(ensureSinglePrompt(responseText));
        setPromptVisible(true);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      setScreenText("ERROR\n> ");
      setPromptVisible(true);
    } finally {
      setLoading(false);
    }
  }, [basePieceNumber, loading, mapModelField, observerField, pieceField, targetField, recordInputField, onMapModelComplete, onObserverComplete, onPieceComplete, onTargetComplete, addMissionCapture, refreshRecordData]);

  // ---------- Manejo unificado de teclas ----------
  const handleKeyPress = useCallback(
    (key: string) => {
      console.log("Tecla presionada:", key);

      // Navegación de piezas (se registra con símbolos)
      if (key === "UP") {
        logEvent('INPUT', 'USUARIO: ▲');
        setPieceIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (key === "DOWN") {
        logEvent('INPUT', 'USUARIO: ▼');
        setPieceIndex((prev) => Math.min(prev + 1, pieces.length - 1));
        return;
      }

      if (pieceMode && key !== "BACK" && key !== " ") {
        setBuffer("");
        setPieceMode(false);
        sendCommand(key.toUpperCase());
        logEvent('INPUT', `USUARIO: ${key.toUpperCase()}`);
        return;
      }

      // Salir del modo piezas
      setPieceIndex(0);
      setPieceMode(false);

      // Tecla RUN
      if (key === "RUN") {
        setBuffer("");
        sendCommand("MAIN");
        logEvent('INPUT', 'USUARIO: MAIN');
        return;
      }

      // Tecla ENTER → envía el comando acumulado o "MAIN"
      if (key === "ENTER") {
        const cmd = buffer.trim();
        if (cmd === "") {
          sendCommand("");
          logEvent('INPUT', 'USUARIO: ENTER');
          return;
        }
        let preferredBasePieceNumber = basePieceNumber;
        if (waitingBasePiece && /^\d+$/.test(cmd) && parseInt(cmd, 10) > 0) {
          preferredBasePieceNumber = parseInt(cmd, 10);
          setBasePieceNumber(preferredBasePieceNumber);
          setWaitingBasePiece(false);
        }
        setBuffer("");
        sendCommand(cmd, preferredBasePieceNumber);
        logEvent('INPUT', `USUARIO: ${cmd}`);
        return;
      }

      // Tecla ON (reinicio)
      if (key === "ON") {
        setBuffer("");
        setScreenText("SANTA BARBARA");
        setPromptVisible(false);
        setPieceMode(false);
        setManualResults([]);
        setRecordData({});
        setRecordRows([]);
        setRecordInputField(null);
        setBasePieceNumber(1);
        setWaitingBasePiece(false);
        setMapModelField(null);
        mapModelDraftRef.current = {};
        setObserverField(null);
        observerDraftRef.current = {};
        setPieceField(null);
        pieceDraftRef.current = {};
        setTargetField(null);
        targetDraftRef.current = {};
        setTimeout(() => {
          setPromptVisible(true);
          setScreenText("> ");
        }, 2000);
        logEvent('INPUT', 'USUARIO: ON');
        return;
      }

      // BACK y SPC no se registran, solo modifican el buffer
      if (key === "BACK") {
        setBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (key === " ") {
        setBuffer((prev) => prev + " ");
        return;
      }

      // Tecla normal (se añade al buffer sin registrar)
      setBuffer((prev) => prev + key.toUpperCase());
    },
    [buffer, sendCommand, pieceMode, logEvent, waitingBasePiece, basePieceNumber]
  );

  // ---------- Teclado físico ----------
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.repeat) return; // evita repeticiones
      e.preventDefault();

      if (e.key === "ArrowUp") handleKeyPress("UP");
      else if (e.key === "ArrowDown") handleKeyPress("DOWN");
      else if (e.key === "Enter") handleKeyPress("ENTER");
      else if (e.key === "Backspace") handleKeyPress("BACK");
      else if (e.key === "Escape") handleKeyPress("ON");
      else if (e.key === " ") handleKeyPress(" ");
      else if (/^[a-zA-Z0-9.\/*\-+,=^()<>_]$/.test(e.key))
        handleKeyPress(e.key.toUpperCase());
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress, isActive]);

  useEffect(() => {
    if (!pieceMode) {
      lastVisibleCaptureRef.current = "";
    }
  }, [pieceMode]);

  useEffect(() => {
    if (!pieceMode || pieces.length === 0) return;
    const selectedPiece = pieces[pieceIndex];
    if (!selectedPiece) return;

    const signature = `${selectedPiece.number}:${selectedPiece.text}`;
    if (lastVisibleCaptureRef.current === signature) return;
    lastVisibleCaptureRef.current = signature;
    addMissionCapture(selectedPiece);
  }, [pieceMode, pieceIndex, pieces, addMissionCapture]);

  useEffect(() => {
    if (missionCaptures.length === 0) return;
    capturesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [missionCaptures.length]);

  // ---------- Contenido del LCD ----------
  const lcdContent = pieceMode && pieces.length > 0
    ? pieces[pieceIndex]?.text ?? ""
    : promptVisible
    ? `${screenText}${buffer}`
    : screenText;

  const isPieceDisplay = pieceMode && pieces.length > 0;
  const lcdLines = isPieceDisplay
    ? lcdContent.split(/\r?\n/).filter((line) => line.trim() !== "")
    : [];
  const visibleLcdLines = getVisibleLcdLines(lcdContent, pieceMode);

  return (
    <div className="h-full w-full bg-[#0d0d0f] text-gray-100 flex items-start justify-center p-4 sm:p-6 overflow-auto">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=WDXL+Lubrifont+JP+N:wght@400;700;900&display=swap');

        .retro-lcd-font {
          font-family: "WDXL Lubrifont JP N", monospace;
          font-weight: 900;
        }

        .lcd-grid-overlay {
          background-image:
            linear-gradient(rgba(0, 0, 0, 0.08) 50%, transparent 50%),
            linear-gradient(90deg, rgba(0, 0, 0, 0.08) 50%, transparent 50%);
          background-size: 2px 2px;
        }
      `}} />

      <div className="flex min-h-max flex-col items-center gap-4 max-w-full w-[1100px] pb-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={`/api/hp71/log?user=${encodeURIComponent(userName)}&sessionId=${encodeURIComponent(logSessionId)}`}
            target="_blank"
            className="h-10 px-6 rounded-xl border-2 border-[#F39C63] bg-[#0A0A0B]/60 text-[#F39C63] hover:bg-[#F39C63] hover:text-black transition-all flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl"
          >
            Historial
          </a>
          <button
            type="button"
            onClick={openRecord}
            className="h-10 px-6 rounded-xl border-2 border-[#F39C63] bg-[#0A0A0B]/60 text-[#F39C63] hover:bg-[#F39C63] hover:text-black transition-all flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl"
          >
            Record de tiro
          </button>
        </div>

      <div className="relative bg-[#6F6F6F] p-[10px] sm:p-[14px] rounded-[20px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95)] border-[4px] border-[#101011] border-b-[12px] max-w-full w-full">

        <div className="relative w-full select-none h-[175px] overflow-hidden">
          <div
            className="absolute inset-0 bg-[#6F6F6F] rounded-t-[8px]"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 169px, 64% 169px, 64% 137px, 0 137px)" }}
          />

          <div
            className="absolute inset-0 bg-[#CBBF97] rounded-t-[8px] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.4)]"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 157px, 64% 157px, 64% 135px, 0 135px)" }}
          />

          <div className="absolute inset-0 flex z-20">
            <div className="w-[64%] h-[135px] flex items-center px-4 pr-6">
              <div className="relative bg-[#1F1F1F] p-[4px] rounded border-2 border-[#52594a] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.65)] w-full h-[106px] flex items-center overflow-hidden">
                <div className="absolute inset-0 lcd-grid-overlay pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/5 pointer-events-none" />

                <div className="relative w-full h-full px-4 py-2 flex flex-col justify-around overflow-hidden z-10">
                  <div className="retro-lcd-font text-[#BAFF7C] text-[20px] sm:text-[25px] justify-around leading-none flex flex-col w-full h-full tracking-[0.08em] uppercase select-none">
                    <div className="opacity-85 overflow-hidden whitespace-nowrap">
                      {visibleLcdLines[0]}
                    </div>
                    <div className="flex items-center overflow-hidden whitespace-nowrap">
                      <span>{visibleLcdLines[1]}</span>
                      <span className={`inline-block w-[10px] h-[18px] bg-[#BAFF7C] ml-[2px] ${loading ? "animate-pulse" : ""}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[36%] h-[157px] flex flex-col justify-between py-3.5 px-4">
              <div className="bg-[#121212] p-1.5 rounded border border-[#444] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)] flex items-center gap-2 w-full h-11 self-start">
                <div className="bg-[#dfdfdf] rounded-sm p-[1px] w-6 h-6 flex items-center justify-center border border-black shadow-sm">
                  <span className="text-black font-sans font-black text-[10px] leading-none tracking-tighter">C</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[#dfdfdf] font-sans font-black tracking-[0.08em] text-[11px] leading-none">C.O.R.Z</span>
                </div>
                <div className="ml-auto flex items-end h-full pb-[1px]">
                  <span className="text-[#c5a059] font-sans font-black tracking-wide text-[14px] leading-none shadow-sm">V-IMM</span>
                </div>
              </div>

              <div className="w-full h-[72px] bg-gradient-to-b from-[#dfdfdf] to-[#bcbcbc] rounded-[3px] border border-[#bcbcbc]/40 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.35),_0_1.5px_2px_rgba(0,0,0,0.5)] flex items-center justify-center relative">
                <div className="absolute inset-x-0 bottom-2 h-[1px] bg-black/10" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 py-4 sm:px-4 sm:py-5 bg-[#6F6F6F] rounded-b-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex flex-col md:flex-row gap-2 items-start overflow-x-auto">
            <div className="grid grid-cols-10 gap-x-[1px] sm:gap-x-[2px] gap-y-1.5 flex-1">
              {[{k:"Q", t:"IF"}, {k:"W", t:"THEN"}, {k:"E", t:"ELSE"}, {k:"R", t:"FOR"}, {k:"T", t:"TO"}, {k:"Y", t:"NEXT"}, {k:"U", t:"DEF"}, {k:"I", t:"KEY"}, {k:"O", t:"ADD"}, {k:"P", t:"LR"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} onClick={handleKeyPress} data={x.k} />)}
              {[{k:"A", t:"CALL"}, {k:"S", t:"GOSUB"}, {k:"D", t:"RETURN"}, {k:"F", t:"GOTO"}, {k:"G", t:"INPUT"}, {k:"H", t:"PRINT"}, {k:"J", t:"DISP"}, {k:"K", t:"DIM"}, {k:"L", t:"BEEP"}, {k:"=", t:"FACT", s:";"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}
              {[{k:"Z", t:"EDIT"}, {k:"X", t:"CAT"}, {k:"C", t:"NAME"}, {k:"V", t:"PURGE"}, {k:"B", t:"FETCH"}, {k:"N", t:"LIST"}, {k:"M", t:"DELETE"}, {k:"(", t:"AUTO", s:"["}, {k:")", t:"COPY", s:"]"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}

              <CalcKey label="ON" topLabel="OFF" bottomLabel="ATTN" color="black" onClick={handleKeyPress} data="ON" />
              <CalcKey label="f" color="orange" onClick={handleKeyPress} data="F" />
              <CalcKey label="g" color="blue" onClick={handleKeyPress} data="G" />

              {[{k:"RUN", t:"SST", s:"CNTL"}, {k:"<", t:"BACK", s:"|<"}, {k:">", t:"-CHAR", s:">|"}, {k:"SPC", t:"I/R", s:"ERRM"}, {k:"^", t:"LC", s:"A"}, {k:"v", t:"-LINE", s:"V"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}
            </div>

            <div className="flex flex-col items-center pt-[20px] w-full md:w-auto self-stretch justify-center md:justify-start">
              <span className="text-[7.5px] sm:text-[8.5px] text-[#C5A059] font-black mb-[3px] uppercase tracking-wider hidden md:inline">RES</span>
              <div className="relative w-full md:w-[46px] h-14 md:h-[88px]">
                <div className="absolute inset-0 bg-[#09090a] rounded-[3px] shadow-inner translate-y-[1px]" />
                <button onClick={() => handleKeyPress("ENTER")} className="relative w-full h-full group active:translate-y-[2px] transition-all outline-none">
                  <div className="relative z-20 w-full h-[72%] bg-gradient-to-b from-[#3a3a3a] via-[#242424] to-[#1e1e1e] border-t border-white/5 border-x border-white/5 rounded-t-[3px] flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:brightness-105">
                    <div className="flex flex-row md:flex-col text-[8.5px] sm:text-[9.5px] font-extrabold text-gray-100 items-center leading-tight">
                      <span>END</span>
                      <span className="hidden md:inline w-5 h-[0.5px] bg-white/20 my-1" />
                      <span>LINE</span>
                    </div>
                  </div>
                  <div className="relative z-10 w-full h-[28%] bg-[#121212] rounded-b-[3px] border-b-[2.5px] border-black/80 flex items-center justify-center">
                    <span className="text-[7.5px] text-[#29f3ff] font-extrabold tracking-wider uppercase">CMDS</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-[1.5px] sm:gap-x-[2.5px] gap-y-1.5 border-t md:border-t-0 md:border-l border-black/50 pt-4 md:pt-0 md:pl-3.5 self-stretch md:self-auto">
              {[
                {k: "7", t: "PREDV", s: "|"}, {k: "8", t: "MEAN", s: "("}, {k: "9", t: "SDEV", s: ")"}, {k: "/", t: "SQR", s: "^"},
                {k: "4", t: "SIN", s: "$"}, {k: "5", t: "COS", s: "%"}, {k: "6", t: "TAN", s: "&"}, {k: "*", t: "EXP", s: ":"},
                {k: "1", t: "ASIN", s: "!"}, {k: "2", t: "ACOS", s: '"'}, {k: "3", t: "ATAN", s: "#"}, {k: "-", t: "LOG", s: "@"},
                {k: "0", t: "USER", s: "1 USER"}, {k: ".", t: "VIEW", s: "<"}, {k: ",", t: "CALC", s: ">"}, {k: "+", t: "CONT", s: "?"}
              ].map(x => <CalcKey key={x.k} label={x.k} color="white" topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}
            </div>
          </div>
        </div>
      </div>

        {missionCaptures.length > 0 && (
          <div ref={capturesRef} className="w-full max-w-full overflow-x-auto pb-2 pt-1">
            <div className="flex min-w-max gap-5 px-2">
              {missionCaptures.map((capture) => (
                <div
                  key={capture.id}
                  className="w-[260px] min-h-[210px] rounded-xl border-2 border-[#F39C63] bg-[#0A0A0E] p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 text-[#F39C63]">
                    <h3 className="text-sm font-black uppercase tracking-[0.08em]">{capture.title}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={capture.pinned ? "Quitar pin" : "Fijar captura"}
                        onClick={() => toggleMissionCapturePin(capture.id)}
                        className="text-[#F39C63] transition hover:text-[#85C5F1]"
                      >
                        {capture.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        title="Eliminar captura"
                        onClick={() => deleteMissionCapture(capture.id)}
                        className="text-[#F39C63] transition hover:text-[#FF7D73]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[15px] font-bold leading-[1.15] text-white">{capture.text}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
        {recordOpen && (
          <RecordDeTiroDialog
            data={recordData}
            rows={recordRows}
            onClose={() => setRecordOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
