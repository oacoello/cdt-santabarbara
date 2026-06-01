import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";

export type LocalUser = {
  id: string;
  username: string;
  password: string;
  email: string;
  rank: string;
  role: string;
  canUseSim: boolean;
  canUseCalc: boolean;
  canUseArchive: boolean;
  canUseFT: boolean;
  createdAt: string;
  updatedAt: string;
};

type EncryptedPayload = {
  version: 1;
  iv: string;
  authTag: string;
  data: string;
};

const DATA_DIR = process.env.CDT_DATA_DIR ?? path.join(process.cwd(), ".cdt-data");
const USERS_FILE = path.join(DATA_DIR, "users.enc");

function getEncryptionKey() {
  const secret = process.env.CDT_LOCAL_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "cdt-local-desktop-secret";
  return crypto.createHash("sha256").update(`cdt-users:${secret}`).digest();
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function encryptJson(value: unknown): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);

  return {
    version: 1,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptJson<T>(payload: EncryptedPayload): T {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}

function readUsersUnsafe(): LocalUser[] {
  if (!fs.existsSync(USERS_FILE)) return [];
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  if (!raw.trim()) return [];
  return decryptJson<LocalUser[]>(JSON.parse(raw));
}

function backupUnreadableUsersFile(error: unknown) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `${USERS_FILE}.invalid-${timestamp}`;

  try {
    fs.renameSync(USERS_FILE, backupFile);
    console.error(
      `CDT local users store was unreadable and has been backed up to ${backupFile}.`,
      error
    );
  } catch (backupError) {
    console.error("CDT local users store was unreadable and could not be backed up.", {
      error,
      backupError,
    });
  }
}

function readUsers(): LocalUser[] {
  try {
    return readUsersUnsafe();
  } catch (error) {
    backupUnreadableUsersFile(error);
    return [];
  }
}

function writeUsers(users: LocalUser[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(encryptJson(users), null, 2));
}

export async function ensureLocalUsers() {
  ensureDataDir();
  const users = readUsers();
  if (users.length > 0) return;

  const now = new Date().toISOString();
  const username = process.env.CDT_ADMIN_USERNAME ?? "admin";
  const password = process.env.CDT_ADMIN_PASSWORD ?? "TuPasswordSeguro123";

  writeUsers([
    {
      id: crypto.randomUUID(),
      username,
      email: process.env.CDT_ADMIN_EMAIL ?? `${username}@santabarbara.local`,
      password: await bcrypt.hash(password, 10),
      rank: "Administrador",
      role: "SUPERADMIN",
      canUseSim: true,
      canUseCalc: true,
      canUseArchive: true,
      canUseFT: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function findLocalUserByUsername(username: string) {
  await ensureLocalUsers();
  return readUsers().find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function listLocalUserProfiles() {
  await ensureLocalUsers();
  return readUsersUnsafe().map(({ password, ...user }) => user);
}

export async function createLocalUser(input: {
  username: string;
  password: string;
  rank?: string;
  canUseCalc?: boolean;
  canUseSim?: boolean;
}) {
  await ensureLocalUsers();
  const users = readUsers();

  if (users.some((user) => user.username.toLowerCase() === input.username.toLowerCase())) {
    return { error: "Tactical ID already exists in the local terminal." };
  }

  const now = new Date().toISOString();
  users.push({
    id: crypto.randomUUID(),
    username: input.username,
    email: `${input.username}@santabarbara.local`,
    password: await bcrypt.hash(input.password, 10),
    rank: input.rank ?? "Operador",
    role: "USER",
    canUseSim: input.canUseSim ?? true,
    canUseCalc: input.canUseCalc ?? true,
    canUseArchive: false,
    canUseFT: false,
    createdAt: now,
    updatedAt: now,
  });

  writeUsers(users);
  return { success: true };
}

export function getCdtDataDir() {
  ensureDataDir();
  return DATA_DIR;
}
