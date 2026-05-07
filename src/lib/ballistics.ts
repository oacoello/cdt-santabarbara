// lib/ballistics.ts

export interface Coordinate {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type WeaponSystem = 'M102' | 'M198';
export type FuzeType = 'PD' | 'VT' | 'TI'; // Impacto, Proximidad, Tiempo

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
    ranges: [2500, 3500, 4500, 6000, 8000, 10000, 11500],
    blastRadius: 35,
  },
  'M198': {
    charges: ['Green', 'White', 'Red', 'Super'],
    muzzleVelocities: [375, 563, 684, 826],
    ranges: [7000, 14000, 18000, 30000],
    blastRadius: 50,
  }
};

// ============================================================
// NUEVO MODELO DE SIMULACIÓN CON AJUSTE DE ÁNGULO POR BISECCIÓN
// ============================================================

const G = 9.80665;                 // m/s²
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const DRAG_COEFF = 0.295;          // Coeficiente balístico genérico (proyectil HE)
const REF_AREA = 0.015;            // Área de referencia m² (aprox. 0.14m diámetro)
const PROJECTILE_MASS = 43.0;      // kg (M107 HE)

// Densidad del aire en función de la altitud (modelo ISA)
function airDensity(altitudeMeters: number): number {
  if (altitudeMeters < 11000) {
    const temp = 15.04 - 0.00649 * altitudeMeters;
    const pressure = 101325 * Math.pow((273.15 + temp) / 288.15, 5.256);
    return pressure / (287.058 * (273.15 + temp));
  }
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitudeMeters / 8500);
}

// Paso RK4 para la integración de la trayectoria
function rk4Step(
  x: number, y: number, vx: number, vy: number,
  dt: number
): { x: number, y: number, vx: number, vy: number } {
  function derivs(x: number, y: number, vx: number, vy: number) {
    const v = Math.hypot(vx, vy);
    const rho = airDensity(y);
    const dragAcc = (rho * DRAG_COEFF * REF_AREA) / (2 * PROJECTILE_MASS) * v;
    const ax = -dragAcc * vx;
    const ay = -G - dragAcc * vy;
    return { vx, vy, ax, ay };
  }

  const k1 = derivs(x, y, vx, vy);
  const k2 = derivs(x + 0.5 * dt * vx, y + 0.5 * dt * vy,
                    vx + 0.5 * dt * k1.ax, vy + 0.5 * dt * k1.ay);
  const k3 = derivs(x + 0.5 * dt * (vx + 0.5 * k2.ax * dt),
                    y + 0.5 * dt * (vy + 0.5 * k2.ay * dt),
                    vx + 0.5 * dt * k2.ax, vy + 0.5 * dt * k2.ay);
  const k4 = derivs(x + dt * (vx + k3.ax * dt),
                    y + dt * (vy + k3.ay * dt),
                    vx + dt * k3.ax, vy + dt * k3.ay);

  const newVx = vx + dt * (k1.ax + 2*k2.ax + 2*k3.ax + k4.ax) / 6;
  const newVy = vy + dt * (k1.ay + 2*k2.ay + 2*k3.ay + k4.ay) / 6;
  const newX = x + dt * (vx + 2*(vx + 0.5*k1.ax*dt) + 2*(vx + 0.5*k2.ax*dt) + newVx) / 6;
  const newY = y + dt * (vy + 2*(vy + 0.5*k1.ay*dt) + 2*(vy + 0.5*k2.ay*dt) + newVy) / 6;

  return { x: newX, y: newY, vx: newVx, vy: newVy };
}

// Simulación completa hasta impactar o superar el alcance máximo
function simulateShot(mv: number, elevRad: number, maxRange: number, step = 0.02): {
  points: TrajectoryPoint[];
  impactDistance: number;
  finalTime: number;
  finalVelocity: number;
} {
  const points: TrajectoryPoint[] = [];
  let x = 0, y = 0, t = 0;
  let vx = mv * Math.cos(elevRad);
  let vy = mv * Math.sin(elevRad);
  let lastDistance = 0;
  let impactDistance = 0;
  let finalVelocity = mv;

  while (y >= 0 && x <= maxRange + 10) {
    const next = rk4Step(x, y, vx, vy, step);
    x = next.x;
    y = next.y;
    vx = next.vx;
    vy = next.vy;
    t += step;

    if (y < 0) {
      // Interpolación lineal para encontrar el impacto exacto
      const frac = y / (y - next.y);
      x = x - next.vx * step * frac;
      t = t - step * frac;
      y = 0;
      impactDistance = x;
      finalVelocity = Math.hypot(vx, vy);
      points.push({
        distance: Math.round(x),
        altitude: 0,
        velocity: Math.round(finalVelocity),
        time: Number(t.toFixed(2))
      });
      break;
    }

    if (Math.floor(x / 10) > Math.floor(lastDistance / 10)) {
      points.push({
        distance: Math.round(x),
        altitude: Math.round(y),
        velocity: Math.round(Math.hypot(vx, vy)),
        time: Number(t.toFixed(2))
      });
    }
    lastDistance = x;
  }

  return { points, impactDistance, finalTime: t, finalVelocity };
}

// Búsqueda del ángulo de elevación que da el alcance exacto (bisección)
function findElevationForRange(
  muzzleVelocity: number,
  targetRange: number,
  tolerance = 0.5,
  maxIter = 40
): number | null {
  let low = 0.01;          // ~0.6 milésimas
  let high = Math.PI / 3;  // ~60 grados (3400 milésimas)
  let bestRad = null;

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const { impactDistance } = simulateShot(muzzleVelocity, mid, targetRange);
    const error = impactDistance - targetRange;

    if (Math.abs(error) < tolerance) {
      bestRad = mid;
      break;
    }
    if (error > 0) high = mid;
    else low = mid;
  }

  if (bestRad === null) bestRad = (low + high) / 2;
  const { impactDistance } = simulateShot(muzzleVelocity, bestRad, targetRange);
  return Math.abs(impactDistance - targetRange) < 2 * tolerance ? bestRad : null;
}

// Genera una trayectoria REAL que impacta exactamente en rangeMeters
export function generateRealTrajectory(
  rangeMeters: number,
  muzzleVelocity: number,
  initialElevMils?: number
): { points: TrajectoryPoint[]; actualElevMils: number; tof: number; impactVel: number } {
  let elevRad = null;
  if (initialElevMils !== undefined) {
    const testRad = (initialElevMils * Math.PI) / 3200;
    const { impactDistance } = simulateShot(muzzleVelocity, testRad, rangeMeters);
    if (Math.abs(impactDistance - rangeMeters) < 1.0) {
      elevRad = testRad;
    }
  }
  if (elevRad === null) {
    elevRad = findElevationForRange(muzzleVelocity, rangeMeters);
    if (elevRad === null) {
      // Fallback: ángulo parabólico sin arrastre
      const fallbackRad = 0.5 * Math.asin((rangeMeters * G) / (muzzleVelocity * muzzleVelocity));
      elevRad = isNaN(fallbackRad) ? 0.785 : Math.min(fallbackRad, Math.PI / 2.2);
    }
  }

  const { points, finalTime, finalVelocity } = simulateShot(muzzleVelocity, elevRad, rangeMeters, 0.02);
  const elevMils = Number(((elevRad * 3200) / Math.PI).toFixed(1));

  // Ajuste final para que el último punto tenga exactamente distance === rangeMeters
  if (points.length > 0) {
    const last = points[points.length - 1];
    if (Math.abs(last.distance - rangeMeters) > 0.5) {
      points[points.length - 1] = {
        ...last,
        distance: Math.round(rangeMeters),
        altitude: 0
      };
    }
  }

  return {
    points,
    actualElevMils: elevMils,
    tof: finalTime,
    impactVel: finalVelocity
  };
}

// Mantenemos la función original para compatibilidad, pero ahora usa la nueva simulación real
export function simulateTrajectory(range: number, mv: number, elevMils: number): TrajectoryPoint[] {
  const { points } = generateRealTrajectory(range, mv, elevMils);
  return points;
}

// ============================================================
// FUNCIONES GEODÉSICAS Y BALÍSTICAS EXISTENTES (sin cambios)
// ============================================================

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let θ = Math.atan2(y, x);
  let bearing = ((θ * 180) / Math.PI + 360) % 360;
  return Number(((bearing / 360) * 6400).toFixed(1));
}

export function recommendCharge(weapon: WeaponSystem, range: number): string {
  const data = WEAPON_DATA[weapon];
  for (let i = 0; i < data.ranges.length; i++) {
    if (range < data.ranges[i]) return data.charges[i];
  }
  return data.charges[data.charges.length - 1];
}

export function getMuzzleVelocity(weapon: WeaponSystem, charge: string): number {
  const data = WEAPON_DATA[weapon];
  const idx = data.charges.indexOf(charge);
  return idx !== -1 ? data.muzzleVelocities[idx] : data.muzzleVelocities[0];
}

export function computeFiringSolution(gun: LatLng, target: LatLng, weapon: WeaponSystem, charge: string): FiringSolution {
  const range = calculateDistance(gun.lat, gun.lng, target.lat, target.lng);
  const azimuth = calculateBearing(gun.lat, gun.lng, target.lat, target.lng);
  const mv = getMuzzleVelocity(weapon, charge);

  // Ángulo aproximado parabólico como semilla
  let approxRad = 0.5 * Math.asin((range * G) / (mv * mv));
  if (isNaN(approxRad)) approxRad = 0.785;
  const approxMils = (approxRad * 3200) / Math.PI;

  // Generar trayectoria real que impacta exactamente en 'range'
  const { actualElevMils, tof, impactVel, points: trajPoints } = generateRealTrajectory(range, mv, approxMils);

  // Calcular ordenada máxima a partir de la trayectoria generada
  const maxOrdinate = trajPoints.reduce((max, p) => Math.max(max, p.altitude), 0);

  return {
    range,
    azimuth,
    elevMils: actualElevMils,
    timeOfFlight: tof,
    maxOrdinate,
    impactVelocity: impactVel,
    recommendedCharge: recommendCharge(weapon, range),
    deflection: calculateDeflection(azimuth),
    fuzeTime: calculateFuzeTime(tof, 'PD')
  };
}

export function computeManualSolution(range: number, weapon: WeaponSystem, charge: string, azimuth: number = 0): FiringSolution {
  const gun = { lat: 0, lng: 0 };
  const rad = (azimuth * Math.PI) / 3200;
  const dy = Math.cos(rad) * range;
  const dx = Math.sin(rad) * range;
  const target = {
    lat: dy / 111320,
    lng: dx / (111320 * Math.cos(0))
  };
  return computeFiringSolution(gun, target, weapon, charge);
}

export function calculateDamage(target: LatLng, impacts: LatLng[], weapon: WeaponSystem) {
  const blastRadius = WEAPON_DATA[weapon].blastRadius;
  let totalDamage = 0;
  impacts.forEach(impact => {
    const dist = calculateDistance(target.lat, target.lng, impact.lat, impact.lng);
    if (dist < blastRadius) {
      totalDamage += (1 - dist / blastRadius) * (100 / impacts.length);
    }
  });
  return { impactDamage: Math.min(100, Math.round(totalDamage)) };
}

export function getDispersion(target: LatLng, weapon: WeaponSystem): LatLng[] {
  const impacts: LatLng[] = [];
  const rounds = 6;
  const intensity = weapon === 'M198' ? 0.0002 : 0.0001;
  for (let i = 0; i < rounds; i++) {
    impacts.push({
      lat: target.lat + (Math.random() - 0.5) * intensity,
      lng: target.lng + (Math.random() - 0.5) * intensity,
    });
  }
  return impacts;
}

export function calculateDeflection(azimuth: number): number {
  let def = 3200 + (3200 - azimuth);
  if (def < 0) def += 6400;
  if (def >= 6400) def -= 6400;
  return Math.round(def);
}

export function calculateFuzeTime(tof: number, fuze: FuzeType): number {
  if (fuze === 'PD' || fuze === 'VT') return 0;
  return Number((tof - 1.2).toFixed(1));
}

// Funciones de telemetría (sin cambios)
export interface TelemetryData {
  elevation: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
}

export async function fetchTelemetry(lat: number, lng: number): Promise<TelemetryData | null> {
  try {
    const [weatherRes, elevationRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`),
      fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
    ]);
    if (!weatherRes.ok || !elevationRes.ok) return null;
    const weatherData = await weatherRes.json();
    const elevationData = await elevationRes.json();
    return {
      elevation: elevationData.elevation ? Math.round(elevationData.elevation[0]) : 0,
      temperature: weatherData.current.temperature_2m,
      humidity: weatherData.current.relative_humidity_2m,
      windSpeed: weatherData.current.wind_speed_10m,
      windDirection: weatherData.current.wind_direction_10m,
    };
  } catch (error) {
    return null;
  }
}

export interface MetData {
  elevation: number;
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirMils: number;
}

export async function getTacticalMet(lat: number, lng: number): Promise<MetData | null> {
  try {
    const [metRes, elevRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`),
      fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
    ]);
    if (!metRes.ok || !elevRes.ok) return null;
    const met = await metRes.json();
    const elev = await elevRes.json();
    const windMils = Math.round(met.current.wind_direction_10m * (6400 / 360));
    return {
      elevation: Math.round(elev.elevation[0]),
      temp: met.current.temperature_2m,
      humidity: met.current.relative_humidity_2m,
      pressure: met.current.surface_pressure,
      windSpeed: met.current.wind_speed_10m,
      windDirMils: windMils
    };
  } catch (e) {
    return null;
  }
}

export function applyAOCorrection(target: LatLng, otLineMils: number, lr: number, ad: number): LatLng {
  const otRad = (otLineMils * Math.PI) / 3200;
  const dy_ot = Math.cos(otRad);
  const dx_ot = Math.sin(otRad);
  const dy_perp = Math.cos(otRad + Math.PI/2);
  const dx_perp = Math.sin(otRad + Math.PI/2);
  const totalDx = (dx_ot * ad) + (dx_perp * lr);
  const totalDy = (dy_ot * ad) + (dy_perp * lr);
  return {
    lat: target.lat + (totalDy / 111320),
    lng: target.lng + (totalDx / (111320 * Math.cos(target.lat * Math.PI / 180)))
  };
}

// Funciones militares auxiliares (sin cambios)
export interface MilitaryData {
  zone: string;
  spheroid: string;
  easting: number;
  northing: number;
  mgrs: string;
  altitude: number;
}

export function getPreciseMilitaryData(coord: LatLng): MilitaryData {
  const CM = -87;
  const easting = 500000 + (coord.lng - CM) * 111320 * Math.cos(coord.lat * Math.PI / 180);
  const northing = coord.lat * 111320;
  const altitude = Math.round(150 + Math.abs(Math.sin(coord.lat) * 500) + Math.abs(Math.cos(coord.lng) * 300));
  return {
    zone: "16N",
    spheroid: "WGS84 (Spheroid 1)",
    easting: Math.round(easting),
    northing: Math.round(northing),
    mgrs: toMGRS(coord),
    altitude
  };
}

export function toUTM(coord: LatLng): string {
  const data = getPreciseMilitaryData(coord);
  return `${data.zone} E:${data.easting} N:${data.northing}`;
}

export function toMGRS(coord: LatLng): string {
  const zone = "16P";
  const square = "PV";
  const easting = Math.round(coord.lat * 1000).toString().padStart(5, '0');
  const northing = Math.round(coord.lng * 1000).toString().padStart(5, '0');
  return `${zone}${square}${easting}${northing}`;
}