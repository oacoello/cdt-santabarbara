// src/ballistics/index.ts
import weapons from "./weapons.json";
import he105 from "./105mm_HE_M1.json";
import illum105 from "./105mm_ILLUM_M314.json";
import smoke105 from "./105mm_SMOKE_HC.json";
import m107he from "./M107.json";
import he155 from "./155mm_HE_M106.json";
import hera155 from "./155mm_HERA_M549A1.json";
import illum155 from "./155mm_ILLUM_M485.json";
import raam155 from "./155mm_HE_RAAM_LM718A1.json";

export const WEAPONS_INDEX = weapons;

// Mapeamos los nombres exactos que aparecen en weapons.json con sus archivos de datos
export const PROJECTILES_INDEX: Record<string, any> = {
  "105mm HE M1": he105,
  "105mm ILLUM M314": illum105,
  "105mm SMOKE HC": smoke105,
  "M107 155mm HE": m107he,
  "155mm HE M106": he155,
  "155mm HERA M549A1": hera155,
  "155mm ILLUM M485": illum155,
  "155mm HE RAAM LM718A1": raam155,
};
