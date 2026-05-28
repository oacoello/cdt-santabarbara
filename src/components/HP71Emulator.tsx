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

function parsePieces(text: string): PieceResult[] {
  const lines = text.split(/\r?\n/);
  const result: PieceResult[] = [];
  let current: string[] = [];
  let currentNumber: number | null = null;

  for (const line of lines) {
    const clean = line.trim();
    const pieceMatch = clean.match(/^-+\s*PIECE\s+(\d+)\s*-+$/i);

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

type HP71EmulatorProps = {
  userName?: string;
  logSessionId?: string;
};

// ---------- Componente principal ----------
export default function HP71Emulator({ userName = "sin-perfil", logSessionId = "session" }: HP71EmulatorProps) {
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
        body: JSON.stringify({ type, content, user: userName, sessionId: logSessionId }),
      });
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }, [userName, logSessionId]);

  // ---------- Envío de comandos al servidor ----------
  const sendCommand = useCallback(async (command: string, preferredBasePieceNumber = basePieceNumber) => {
    if (!command.trim() || loading) return;
    setLoading(true);
    try {
      const responseText = await fetchHp71Display(command);
      let nextBasePieceNumber = preferredBasePieceNumber;

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
        setPieceIndex(selectedIndex >= 0 ? selectedIndex : 0);
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
  }, [basePieceNumber, loading]);

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
        const cmd = buffer.trim();
        if (cmd === "") {
          sendCommand("MAIN");
          logEvent('INPUT', 'USUARIO: MAIN');
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
        const selectedIndex = pieces.findIndex((piece) => piece.number === basePieceNumber);
        setPieceIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      setBuffer((prev) => prev + key.toUpperCase());
    },
    [buffer, sendCommand, pieces.length, pieces, logEvent, waitingBasePiece, basePieceNumber]
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
  const lcdContent = pieceMode && pieces.length > 0
    ? pieces[pieceIndex]?.text ?? ""
    : promptVisible
    ? `${screenText}${buffer}`
    : screenText;

  const visibleLcdLines = getVisibleLcdLines(lcdContent, pieceMode);

  return (
    <div className="h-full w-full bg-[#0d0d0f] text-gray-100 flex items-center justify-center p-4 sm:p-6 overflow-x-auto">
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

      <div className="flex flex-col items-center gap-2 max-w-full w-[1100px]">
        <a
          href={`/api/hp71/log?user=${encodeURIComponent(userName)}&sessionId=${encodeURIComponent(logSessionId)}`}
          target="_blank"
          className="h-10 px-6 rounded-xl border-2 border-[#F39C63] bg-[#0A0A0B]/60 text-[#F39C63] hover:bg-[#F39C63] hover:text-black transition-all flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl"
        >
          Historial
        </a>

      <div className="relative bg-[#6F6F6F] p-[10px] sm:p-[14px] rounded-[20px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95)] border-[4px] border-[#101011] border-b-[12px] max-w-full w-full">

        <div className="relative h-[175px] w-full select-none overflow-hidden">
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
                  <div className="retro-lcd-font text-[#BAFF7C] text-[20px] sm:text-[25px] flex flex-col w-full h-full justify-around tracking-[0.08em] uppercase select-none leading-none">
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
      </div>
    </div>
  );
}
