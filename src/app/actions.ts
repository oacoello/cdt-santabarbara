'use server';

import { generateMissionReport, type MissionReportInput, type MissionReportOutput } from '@/ai/flows/mission-report-generation';

export async function createMissionReport(input: MissionReportInput): Promise<MissionReportOutput> {
  return await generateMissionReport(input);
}
