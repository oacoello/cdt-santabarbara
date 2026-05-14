"use client";

import React, { useState, useEffect, useCallback } from "react";

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
  const styles = {
    black: { top: "bg-gradient-to-b from-[#3a3a3a] via-[#222] to-[#1c1c1c]", front: "bg-[#0f0f0f]", text: "text-gray-100" },
    white: { top: "bg-gradient-to-b from-[#e3ddd1] via-[#c4bdab] to-[#cfc8b6]", front: "bg-[#8e8674]", text: "text-black" },
    orange: { top: "bg-gradient-to-b from-[#fbcf33] via-[#f59e0b] to-[#fbbf24]", front: "bg-[#b45309]", text: "text-black" },
    blue: { top: "bg-gradient-to-b from-[#7dd3fc] via-[#0ea5e9] to-[#38bdf8]", front: "bg-[#0369a1]", text: "text-white" },
  }[color] || { top: "bg-[#2a2a2a]", front: "bg-[#141414]", text: "text-gray-200" };

  return (
    <div className={`flex flex-col items-center group select-none relative z-10 mx-0.5 ${className}`}>
      <div className="h-4 mb-1 flex flex-col items-center justify-end">
        {topLabel && <span className="text-[7px] text-[#C2A766] font-black uppercase">{topLabel}</span>}
      </div>

      <button onClick={() => onClick(data)} className="relative active:translate-y-[2px] transition-all duration-75">
        <div className={`relative z-10 w-12 h-8 ${styles.top} rounded-t-md border-t border-x border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]`}>
          <span className={`text-sm font-black ${styles.text}`}>{label}</span>
        </div>
        <div className={`relative z-10 w-12 h-3 ${styles.front} rounded-b-md border-b-[3px] border-black/90 flex items-center justify-center`}>
          {subLabel && <span className="text-[8px] text-[#00e5ff] font-bold">{subLabel}</span>}
        </div>
      </button>

      <div className="h-4 mt-1">
        {bottomLabel && <span className="text-[7px] font-bold text-gray-400 uppercase">{bottomLabel}</span>}
      </div>
    </div>
  );
};

// ---------- Utilidad: detectar piezas en la respuesta ----------
function parsePieces(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const result: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const clean = line.trim();

    if (clean.includes("PIECE") && clean.includes("-----")) {
      if (current.length > 0) {
        result.push(current.join("\n"));
      }
      current = [clean];
      continue;
    }

    if (current.length > 0) {
      if (clean.startsWith("COMP CORR") || clean.startsWith("TESON")) continue;
      if (clean !== "") current.push(clean);
    }
  }

  if (current.length > 0) result.push(current.join("\n"));
  return result;
}

// ---------- Componente principal ----------
export default function HP71Emulator() {
  const [screenText, setScreenText] = useState("SANTA BARBARA");
  const [buffer, setBuffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);

  // Estado de navegación de piezas
  const [pieces, setPieces] = useState<string[]>([]);
  const [pieceIndex, setPieceIndex] = useState(0);
  const [pieceMode, setPieceMode] = useState(false);

  // Estado para almacenar resultados manuales extraídos
  const [manualResults, setManualResults] = useState<{alcance: number, elevacion: number, tof: number}[]>([]);

  // Nuevos estados para pieza base
  const [basePieceNumber, setBasePieceNumber] = useState<number>(1);
  const [waitingBasePiece, setWaitingBasePiece] = useState<boolean>(false);

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
        body: JSON.stringify({ type, content }),
      });
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }, []);

  // ---------- Envío de comandos al servidor ----------
  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hp71?cmd=${encodeURIComponent(command)}`, { method: "POST" });
      const json = await res.json();
      const responseText: string = json.display || "";

      // Lógica nueva para pieza base
      const basePiece = extractBasePiece(responseText);
      if (basePiece !== null) {
        setBasePieceNumber(basePiece);
        setWaitingBasePiece(true);
      }
      if (!isAskingForBasePiece(responseText)) {
        setWaitingBasePiece(false);
      }

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
        setPieceIndex(Math.max(0, Math.min(basePieceNumber - 1, foundPieces.length - 1)));
        setPieceMode(true);
        setPromptVisible(false);
      } else {
        setPieceMode(false);
        setScreenText(responseText + "\n> ");
        setPromptVisible(true);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      setScreenText("ERROR\n> ");
      setPromptVisible(true);
    } finally {
      setLoading(false);
    }
  }, [basePieceNumber]);

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
        const cmd = buffer.trim() === "" ? "MAIN" : buffer.trim();
        if (waitingBasePiece && /^\d+$/.test(cmd) && parseInt(cmd, 10) > 0) {
          setBasePieceNumber(parseInt(cmd, 10));
          setWaitingBasePiece(false);
        }
        setBuffer("");
        sendCommand(cmd);
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
        setBasePieceNumber(1);
        setWaitingBasePiece(false);
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
      if ((key === "P" || key === "Y" || key === "N") && pieces.length > 0) {
        setPieceIndex(Math.max(0, Math.min(basePieceNumber - 1, pieces.length - 1)));
      }
      setBuffer((prev) => prev + key.toUpperCase());
    },
    [buffer, sendCommand, pieces.length, logEvent, waitingBasePiece, basePieceNumber]
  );

  // ---------- Teclado físico ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
  }, [handleKeyPress]);

  // ---------- Contenido del LCD ----------
  const lcdContent = loading
    ? "BUSCANDO..."
    : pieceMode && pieces.length > 0
    ? `${pieces[pieceIndex]}\n\nPIECE ${pieceIndex + 1}/${pieces.length}\n← → flechas para mover`
    : promptVisible
    ? screenText + buffer
    : screenText;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] p-8">
      <div className="relative bg-gradient-to-b from-[#4a4a4a] to-[#2a2a2a] p-10 rounded-[40px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border-x-4 border-b-[12px] border-[#1a1a1a] w-max">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_40%)] pointer-events-none rounded-[40px]" />

        <div className="flex justify-end mb-4">
          <a href="/hp71_log.txt" target="_blank" className="text-[#baff7c] text-sm underline hover:text-white z-10">
            📄 LOG
          </a>
        </div>

        {/* --- PANTALLA LCD --- */}
        <div className="mb-12 flex justify-center z-10">
          <div className="bg-gradient-to-r from-[#d9c7a0] via-[#ae986d] to-[#d9c7a0] px-[32px] py-[4px] rounded shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] border border-[#c4a96c]">
            <div className="relative bg-[#8b967d] w-[540px] h-24 p-4 shadow-[inset_4px_4px_12px_rgba(0,0,0,0.6)] border-2 border-[#7a856c] flex items-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none" />
              <div className="relative z-10 font-mono text-[#1a1a1a] text-2xl font-bold flex items-center w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
                {lcdContent}
                <span className="w-3 h-7 bg-[#1a1a1a]/80 ml-1 flex-shrink-0 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* --- BRANDING --- */}
        <div className="flex justify-between items-start mb-8 px-2 z-10">
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#222] to-[#333] p-3 rounded border border-white/5 shadow-inner">
            <div className="bg-white p-1 rounded-sm flex items-center justify-center w-12 h-10">
              <span className="text-black font-bold tracking-widest text-[10px] leading-tight">V-IMM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-widest text-[10px] leading-tight">COMPUTADORA</span>
              <span className="text-white font-bold tracking-widest text-[10px] leading-tight">BALÍSTICA</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            <span className="text-white font-black text-3xl tracking-tighter">C . O . R . Z</span>
          </div>
        </div>

        {/* --- TECLADO COMPLETO ORIGINAL --- */}
        <div className="flex px-6 py-8 bg-[#222]/50 rounded-3xl border border-black/40 z-10">
          <div className="relative z-10 flex gap-4 items-start">
            <div className="grid grid-cols-10 gap-x-1.5 gap-y-5">
              {[{k:"Q", t:"IF"}, {k:"W", t:"THEN"}, {k:"E", t:"ELSE"}, {k:"R", t:"FOR"}, {k:"T", t:"TO"}, {k:"Y", t:"NEXT"}, {k:"U", t:"DEF"}, {k:"I", t:"KEY"}, {k:"O", t:"ADD"}, {k:"P", t:"LR"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} onClick={handleKeyPress} data={x.k} />)}
              {[{k:"A", t:"CALL"}, {k:"S", t:"GOSUB"}, {k:"D", t:"RETURN"}, {k:"F", t:"GOTO"}, {k:"G", t:"INPUT"}, {k:"H", t:"PRINT"}, {k:"J", t:"DISP"}, {k:"K", t:"DIM"}, {k:"L", t:"BEEP"}, {k:"=", t:"FACT", s:";"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}
              {[{k:"Z", t:"EDIT"}, {k:"X", t:"CAT"}, {k:"C", t:"NAME"}, {k:"V", t:"PURGE"}, {k:"B", t:"FETCH"}, {k:"N", t:"LIST"}, {k:"M", t:"DELETE"}, {k:"(", t:"AUTO", s:"["}, {k:")", t:"COPY", s:"]"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}

              <CalcKey label="ON" topLabel="OFF" bottomLabel="ATTN" color="black" onClick={handleKeyPress} data="ON" />
              <CalcKey label="f" color="orange" onClick={handleKeyPress} data="F" />
              <CalcKey label="g" color="blue" onClick={handleKeyPress} data="G" />

              {[{k:"RUN", t:"SST", s:"CNTL"}, {k:"<", t:"BACK", s:"|<"}, {k:">", t:"CHAR", s:">|"}, {k:"SPC", t:"I/R", s:"ERRM"}, {k:"^", t:"LC", s:"A"}, {k:"v", t:"LINE", s:"V"}].map(x => <CalcKey key={x.k} label={x.k} topLabel={x.t} subLabel={x.s} onClick={handleKeyPress} data={x.k} />)}
            </div>

            <div className="flex flex-col items-center pt-[45px]">
              <span className="text-[7px] text-[#C2A766] font-black mb-2 uppercase">RES</span>
              <div className="relative w-12 h-[105px]">
                <div className="absolute inset-0 bg-[#0a0a0a] rounded-md shadow-inner translate-y-[1px]" />
                <button onClick={() => handleKeyPress("ENTER")} className="relative w-full h-full group active:translate-y-[4px] transition-all">
                  <div className="relative z-20 w-full h-[85px] bg-gradient-to-b from-[#3a3a3a] via-[#222] to-[#1a1a1a] border-t border-white/10 border-x border-white/5 rounded-t-md flex flex-col items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <div className="flex flex-col text-[10px] font-bold text-gray-100 items-center">
                      <span>END</span>
                      <div className="w-6 h-[0.5px] bg-white/20 my-1" />
                      <span>LINE</span>
                    </div>
                  </div>
                  <div className="relative z-10 w-full h-5 bg-[#0f0f0f] rounded-b-md border-b-[3px] border-black/90 flex items-center justify-center">
                    <span className="text-[8px] text-[#00e5ff] font-bold tracking-widest uppercase">CMDS</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-1.5 gap-y-5 border-l border-black/20 pl-4 relative z-10">
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
    </div>
  );
}