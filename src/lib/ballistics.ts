// lib/ballistics.ts

export interface Coordinate {
  x: number;
  y: number;
}

export interface LatLng { lat: number; lng: number; }

export type WeaponSystem = 'M102' | 'M198';
export type FuzeType = 'PD' | 'VT' | 'TI';

export interface TrajectoryPoint {
  distance: number;
  altitude: number;
  velocity: number;
  time: number;
}

export interface FiringSolution {
  range: number;
  azimuth: number;
  elevMils: number;
  timeOfFlight: number;
  maxOrdinate: number;
  impactVelocity: number;
  recommendedCharge: string;
  deflection?: number;
  fuzeTime?: number;
}

export const WEAPON_DATA = {
  'M102': {
    charges: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    muzzleVelocities: [205, 230, 260, 300, 350, 410, 494],
    dragCoefficient: 0.25,
    mass: 14.97, 
    area: 0.0086,
  },
  'M198': {
    charges: ['M3A1', 'M4A2', 'M119A1', 'M203'],
    muzzleVelocities: [260, 310, 420, 684],
    dragCoefficient: 0.22,
    mass: 43.54,
    area: 0.0188,
  }
};

const G = 9.80665;
const RHO = 1.225; // Densidad del aire al nivel del mar

/**
 * Motor de Integración RK4 (Runge-Kutta 4to Orden)
 * Corrige el error de Infinity asegurando que el proyectil siempre caiga.
 */
export function simulateTrajectoryRK4(elevMils: number, v0: number, weapon: WeaponSystem = 'M102') {
  const specs = WEAPON_DATA[weapon];
  const angleRad = (elevMils * Math.PI) / 3200;
  
  let vx = v0 * Math.cos(angleRad);
  let vy = v0 * Math.sin(angleRad);
  let x = 0, y = 0, t = 0;
  const dt = 0.05; // Paso de tiempo estable
  const points: TrajectoryPoint[] = [];

  // Seguridad: Limitar a 300 segundos para evitar bucles infinitos
  while (y >= -0.5 && t < 300) {
    points.push({ 
      distance: x, 
      altitude: Math.max(0, y), 
      velocity: Math.sqrt(vx * vx + vy * vy), 
      time: t 
    });

    const getAcc = (cvx: number, cvy: number) => {
      const v = Math.sqrt(cvx * cvx + cvy * cvy);
      if (v < 0.01) return { ax: 0, ay: -G };
      const drag = 0.5 * RHO * v * v * specs.dragCoefficient * specs.area;
      return {
        ax: -(drag * (cvx / v)) / specs.mass,
        ay: -G - (drag * (cvy / v)) / specs.mass
      };
    };

    const k1 = getAcc(vx, vy);
    const k2 = getAcc(vx + k1.ax * dt/2, vy + k1.ay * dt/2);
    const k3 = getAcc(vx + k2.ax * dt/2, vy + k2.ay * dt/2);
    const k4 = getAcc(vx + k3.ax * dt, vy + k3.ay * dt);

    vx += (dt/6) * (k1.ax + 2*k2.ax + 2*k3.ax + k4.ax);
    vy += (dt/6) * (k1.ay + 2*k2.ay + 2*k3.ay + k4.ay);
    
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }

  return { 
    points, 
    range: x, 
    maxAlt: Math.max(...points.map(p => p.altitude)), 
    tof: t 
  };
}
export const simulateTrajectory = simulateTrajectoryRK4;

/**
 * Encuentra la solución de tiro usando bisección para precisión milimétrica.
 */
function findElevation(range: number, v0: number, weapon: WeaponSystem): {elevMils: number, timeOfFlight: number, maxOrdinate: number, impactVelocity: number} {
  let low = 0, high = 1550; // Límites en MILs (0 a 87 grados aprox)
  let bestElev = 0;
  
  // 15 iteraciones de bisección para encontrar el ángulo correcto
  for (let i = 0; i < 15; i++) {
    bestElev = (low + high) / 2;
    const sim = simulateTrajectoryRK4(bestElev, v0, weapon);
    if (sim.range < range) low = bestElev;
    else high = bestElev;
  }

  const finalSim = simulateTrajectoryRK4(bestElev, v0, weapon);
  
  return {
    elevMils: Math.round(bestElev),
    timeOfFlight: Number(finalSim.tof.toFixed(1)),
    maxOrdinate: Math.round(finalSim.maxAlt),
    impactVelocity: Math.round(finalSim.points[finalSim.points.length - 1]?.velocity || 0),
  };
}

export function computeFiringSolution(gunPosition: LatLng, targetPosition: LatLng, weapon: WeaponSystem, charge: string): FiringSolution {
  const range = calculateDistance(gunPosition.lat, gunPosition.lng, targetPosition.lat, targetPosition.lng);
  
  // 1. Encontrar la carga recomendada (la mínima que alcance el rango)
  const specs = WEAPON_DATA[weapon];
  let recommendedCharge = specs.charges[specs.charges.length - 1]; // Por defecto la máxima
  
  for (const c of specs.charges) {
    const testV0 = getMuzzleVelocity(weapon, c);
    // Aproximación: el rango máximo se alcanza cerca de los 800 MILs (45 grados)
    const simMax = simulateTrajectoryRK4(800, testV0, weapon);
    if (simMax.range >= range) {
      recommendedCharge = c;
      break;
    }
  }

  const v0 = getMuzzleVelocity(weapon, charge);
  const azimuth = calculateAzimuth(gunPosition, targetPosition);
  
  const elevationData = findElevation(range, v0, weapon);
  
  return {
    range,
    azimuth,
    ...elevationData,
    recommendedCharge,
  };
}

/**
 * Función puente para el gráfico de trayectoria.
 */
export function generateRealTrajectory(range: number, v0: number, weapon: WeaponSystem = 'M102') {
  const elevationData = findElevation(range, v0, weapon);
  return simulateTrajectoryRK4(elevationData.elevMils, v0, weapon);
}

// --- UTILIDADES GEOGRÁFICAS ---

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function calculateAzimuth(start: LatLng, end: LatLng): number {
  const dLon = (end.lng - start.lng) * Math.PI / 180;
  const lat1 = start.lat * Math.PI / 180;
  const lat2 = end.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return (brng * 6400) / 360; // Convertir grados a MILs
}

export function getMuzzleVelocity(weapon: WeaponSystem, charge: string): number {
  const specs = WEAPON_DATA[weapon];
  const idx = specs.charges.indexOf(charge);
  return idx !== -1 ? specs.muzzleVelocities[idx] : specs.muzzleVelocities[0];
}

// --- FUNCIONES MILITARES AUXILIARES ---

export interface MilitaryData {
  zone: string;
  spheroid: string;
  easting: number;
  northing: number;
  mgrs: string;
  altitude: number;
}

export function getPreciseMilitaryData(coord: LatLng): MilitaryData {
  const CM = -87; // Meridiano central de Honduras
  const easting = 500000 + (coord.lng - CM) * 111320 * Math.cos(coord.lat * Math.PI / 180);
  const northing = coord.lat * 111320;
  
  // Altitud simulada para Comayagua/Santa Bárbara
  const altitude = Math.round(150 + Math.abs(Math.sin(coord.lat * 100) * 800));

  return {
    zone: "16P",
    spheroid: "WGS84",
    easting: Math.round(easting),
    northing: Math.round(northing),
    mgrs: `16P DQ ${Math.round(easting % 100000).toString().padStart(5, '0')} ${Math.round(northing % 100000).toString().padStart(5, '0')}`,
    altitude
  };
}

/**
 * Calcula correcciones OT (Observador-Objetivo).
 */
export function calculateOTCorrection(target: LatLng, otAzimuthMils: number, lr: number, ad: number): LatLng {
  const otRad = (otAzimuthMils * Math.PI) / 3200;
  const dy_ot = Math.cos(otRad);
  const dx_ot = Math.sin(otRad);
  const dy_perp = -Math.sin(otRad);
  const dx_perp = Math.cos(otRad);
  
  const totalDx = (dx_ot * ad) + (dx_perp * lr);
  const totalDy = (dy_ot * ad) + (dy_perp * lr);
  
  return {
    lat: target.lat + (totalDy / 111320),
    lng: target.lng + (totalDx / (111320 * Math.cos(target.lat * Math.PI / 180)))
  };
}

// --- AGREGAR AL FINAL DE ballistics.ts ---

export interface MetData {
  temp: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  windDirMils: number;
  elevation: number;
}

export interface TelemetryData {
  timestamp: number;
  position: LatLng;
  altitude: number;
  velocity: number;
  elevation: number;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
}

export function getTacticalMet(position: LatLng): MetData {
  return {
    temp: 28 + Math.random() * 2,
    pressure: 1012 - (Math.random() * 4),
    humidity: 70,
    windSpeed: 8,
    windDirMils: 1200, // MILs
    elevation: 150 + Math.random() * 200
  };
}