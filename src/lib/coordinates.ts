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

export function latLonToUtm(latitude: number, longitude: number, zoneNum?: number) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e = Math.sqrt(f * (2 - f));
  const ePrimeSq = (e * e) / (1 - e * e);

  const zone = zoneNum ?? Math.floor((longitude + 180) / 6) + 1;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const latRad = latitude * Math.PI / 180;
  const lonRad = longitude * Math.PI / 180;
  const lonOriginRad = lonOrigin * Math.PI / 180;

  const n = a / Math.sqrt(1 - e * e * Math.sin(latRad) * Math.sin(latRad));
  const t = Math.tan(latRad) * Math.tan(latRad);
  const c = ePrimeSq * Math.cos(latRad) * Math.cos(latRad);
  const aa = Math.cos(latRad) * (lonRad - lonOriginRad);

  const m = a * (
    (1 - e * e / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256) * latRad
    - (3 * e * e / 8 + 3 * Math.pow(e, 4) / 32 + 45 * Math.pow(e, 6) / 1024) * Math.sin(2 * latRad)
    + (15 * Math.pow(e, 4) / 256 + 45 * Math.pow(e, 6) / 1024) * Math.sin(4 * latRad)
    - (35 * Math.pow(e, 6) / 3072) * Math.sin(6 * latRad)
  );

  const easting = k0 * n * (
    aa + (1 - t + c) * Math.pow(aa, 3) / 6
    + (5 - 18 * t + t * t + 72 * c - 58 * ePrimeSq) * Math.pow(aa, 5) / 120
  ) + 500000;

  let northing = k0 * (
    m + n * Math.tan(latRad) * (
      aa * aa / 2
      + (5 - t + 9 * c + 4 * c * c) * Math.pow(aa, 4) / 24
      + (61 - 58 * t + t * t + 600 * c - 330 * ePrimeSq) * Math.pow(aa, 6) / 720
    )
  );

  if (latitude < 0) northing += 10000000;

  return { easting, northing, zoneNum: zone, hemisphere: latitude >= 0 ? 'N' : 'S' };
}
