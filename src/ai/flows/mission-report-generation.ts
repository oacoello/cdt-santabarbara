'use server';
/**
 * @fileOverview Un flujo de Genkit para generar informes de misión.
 *
 * - generateMissionReport - Función que genera un resumen y clasificación de un informe de misión.
 * - MissionReportInput - Tipo de entrada para la función generateMissionReport.
 * - MissionReportOutput - Tipo de retorno para la función generateMissionReport.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MissionReportInputSchema = z.object({
  gunPosition: z.string().describe('Las coordenadas GPS de la posición de la pieza.'),
  targetLocation: z
    .string()
    .describe('Las coordenadas UTM militares de la ubicación del objetivo.'),
  quadrantElevation: z.number().describe('La Elevación de Cuadrante (QE) utilizada para el disparo.'),
  impactStatus: z.string().describe('Una descripción del estado del impacto del disparo, incluyendo la dispersión.'),
});
export type MissionReportInput = z.infer<typeof MissionReportInputSchema>;

const MissionReportOutputSchema = z.object({
  summary: z.string().describe('Un resumen conciso del resultado de la misión y detalles clave.'),
  classification: z
    .string()
    .describe('Una clasificación del resultado de la misión (ej., "Compromiso exitoso", "Éxito parcial", "Objetivo fallido").'),
});
export type MissionReportOutput = z.infer<typeof MissionReportOutputSchema>;

export async function generateMissionReport(
  input: MissionReportInput
): Promise<MissionReportOutput> {
  return missionReportGenerationFlow(input);
}

const missionReportPrompt = ai.definePrompt({
  name: 'missionReportPrompt',
  input: {schema: MissionReportInputSchema},
  output: {schema: MissionReportOutputSchema},
  prompt: `Eres un asistente de IA especializado en analizar datos de misiones de tiro militar. Tu tarea es generar un resumen conciso y clasificar el resultado de una misión basándote en los detalles proporcionados. **Toda tu respuesta debe ser en español.**

Detalles de la Misión:
- Posición de la Pieza: {{{gunPosition}}}
- Ubicación del Objetivo (UTM): {{{targetLocation}}}
- Elevación de Cuadrante (QE): {{{quadrantElevation}}}
- Estado del Impacto: {{{impactStatus}}}

Instrucciones:
1.  **Resumen**: Proporciona un resumen breve y objetivo de la misión en español, incluyendo el objetivo, la QE y la naturaleza de los impactos. Evita la jerga innecesaria pero mantén la precisión técnica.
2.  **Clasificación**: Basándote en el 'Estado del Impacto', clasifica el resultado de la misión en una de las siguientes categorías en español: "Compromiso exitoso", "Éxito parcial" o "Objetivo fallido". Explica brevemente tu razonamiento si no es evidente.

Asegúrate de que tu salida se adhiera estrictamente al esquema JSON proporcionado para el resumen y la clasificación.`,
});

const missionReportGenerationFlow = ai.defineFlow(
  {
    name: 'missionReportGenerationFlow',
    inputSchema: MissionReportInputSchema,
    outputSchema: MissionReportOutputSchema,
  },
  async input => {
    const {output} = await missionReportPrompt(input);
    return output!;
  }
);
