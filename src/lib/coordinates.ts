// src/lib/coordinates.ts

export function utmToLatLon(easting: number, northing: number, zoneNum: number, zoneLetter: string) {
  const x = easting - 500000;
  const y = northing;

  const a = 6378137; // Semieje mayor (WGS84)
  const f = 1 / 298.257223563; // Aplanamiento (WGS84)
  const b = a * (1 - f); // Semieje menor
  const e = Math.sqrt(1 - (b * b) / (a * a)); // Excentricidad
  
  const e1sq = (e * e) / (1 - e * e);
  const k0 = 0.9996; // Factor de escala UTM

  const arc = y / k0;
  const mu = arc / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

  const ei = (1 - Math.pow(1 - e * e, 0.5)) / (1 + Math.pow(1 - e * e, 0.5));
  const ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32;
  const cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
  const cc = 151 * Math.pow(ei, 3) / 96;
  const cd = 1097 * Math.pow(ei, 4) / 512;
  const phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

  const n0 = a / Math.pow(1 - Math.pow(e * Math.sin(phi1), 2), 0.5);
  const r0 = a * (1 - e * e) / Math.pow(1 - Math.pow(e * Math.sin(phi1), 2), 1.5);
  const d = x / (n0 * k0);

  const lat = phi1 - (n0 * Math.tan(phi1) / r0) * (d * d / 2 - (5 + 3 * Math.tan(phi1) * Math.tan(phi1) + 10 * e1sq * Math.pow(Math.cos(phi1), 2) - 4 * e1sq * e1sq * Math.pow(Math.cos(phi1), 4) - 9 * e1sq * Math.tan(phi1) * Math.tan(phi1) * Math.pow(Math.cos(phi1), 2)) * Math.pow(d, 4) / 24 + (61 + 90 * Math.tan(phi1) * Math.tan(phi1) + 298 * e1sq * Math.pow(Math.cos(phi1), 2) + 45 * Math.pow(Math.tan(phi1), 4) - 252 * e1sq * Math.pow(Math.cos(phi1), 2) - 3 * e1sq * e1sq * Math.pow(Math.cos(phi1), 4)) * Math.pow(d, 6) / 720);

  const lo = (d - (1 + 2 * Math.tan(phi1) * Math.tan(phi1) + e1sq * Math.pow(Math.cos(phi1), 2)) * Math.pow(d, 3) / 6 + (5 - 2 * e1sq * Math.pow(Math.cos(phi1), 2) + 28 * Math.pow(Math.tan(phi1), 2) - 3 * Math.pow(e1sq, 2) * Math.pow(Math.cos(phi1), 4) + 8 * e1sq * Math.pow(Math.cos(phi1), 2) + 24 * Math.pow(Math.tan(phi1), 4)) * Math.pow(d, 5) / 120) / Math.cos(phi1);
  const lon0 = ((zoneNum + 540 - 1) % 60 - 30) * 6 + 3; // Meridiano central de la zona
  
  return {
    latitude: lat * (180 / Math.PI),
    longitude: lon0 + lo * (180 / Math.PI)
  };
}