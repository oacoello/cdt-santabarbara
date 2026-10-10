export type CdtRole = "admin" | "commander" | "instructor";

export type PermissionSet = {
  canUseAutomaticCalculation?: boolean;
  canUseCalculator?: boolean;
  canUseReports?: boolean;
  canUseSimulator?: boolean;
  canDeleteUserLogs?: boolean;
  canManageProfiles?: boolean;
  canGenerateTempProfiles?: boolean;
  canManageRoles?: boolean;
  canUseTableGenerator?: boolean;
};

export type AuthenticatedCdtProfile = {
  profileId: string;
  username: string;
  nombre: string;
  role: CdtRole;
  permissions: PermissionSet;
  profilePhotoPath?: string;
};

export type CdtLaunchContext = {
  sessionToken: string;
  deviceId: string;
  applicationCode: "cdt";
  sessionId?: string;
  authUrl?: string;
  profile?: Partial<AuthenticatedCdtProfile>;
};

export type CdtSessionState =
  | { status: "valid"; context: CdtLaunchContext; profile: AuthenticatedCdtProfile }
  | { status: "blocked"; reason: string };

export const CDT_REQUIRED_PERMISSIONS = [
  "canUseAutomaticCalculation",
  "canUseCalculator",
  "canUseReports",
] as const;

export function getCdtAuthBaseUrl() {
  return process.env.CDT_AUTH_URL ?? process.env.NEXT_PUBLIC_CDT_AUTH_URL ?? "http://localhost:3001";
}

export function normalizeRole(value: unknown): CdtRole {
  return value === "admin" || value === "commander" || value === "instructor"
    ? value
    : "instructor";
}

