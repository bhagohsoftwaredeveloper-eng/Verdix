/**
 * POS-side storage of the per-customer cloud DB connection, delivered by the
 * license server at activation/heartbeat. Encrypted at rest with a key derived
 * from this machine's fingerprint, so the file is useless if copied elsewhere.
 * All reads are null-safe: a missing/foreign/tampered file reads as "absent",
 * keeping the POS offline-first.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { encryptGcm, decryptGcm, deriveKey } from '../crypto/aes-gcm';
import { getMachineId } from './machine';
import { readLicensePayload } from './verify';

export interface CloudConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export function getCloudConfigFilePath(): string {
  if (process.env.CLOUD_CONFIG_FILE) return process.env.CLOUD_CONFIG_FILE;
  const base = process.env.PROGRAMDATA || process.env.APPDATA || os.homedir();
  return path.join(base, 'Verdix', 'cloud.dat');
}

function keyFor(machineId: string): Buffer {
  return deriveKey('verdix-cloud-cfg', machineId);
}

export function saveCloudConfig(cfg: CloudConfig, machineId?: string): void {
  const p = getCloudConfigFilePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, encryptGcm(JSON.stringify(cfg), keyFor(machineId ?? getMachineId())), 'utf8');
}

export function readCloudConfig(machineId?: string): CloudConfig | null {
  try {
    const p = getCloudConfigFilePath();
    if (!fs.existsSync(p)) return null;               // no file → offline-only, never touches machine fingerprint
    const raw = fs.readFileSync(p, 'utf8').trim();
    if (!raw) return null;
    const json = decryptGcm(raw, keyFor(machineId ?? getMachineId()));
    if (!json) return null;
    const cfg = JSON.parse(json);
    if (!cfg?.host || !cfg?.name || !cfg?.user) return null;
    return cfg as CloudConfig;
  } catch {
    return null;
  }
}

export function removeCloudConfig(): void {
  try {
    const p = getCloudConfigFilePath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* ignore */
  }
}

/** True when the given config exactly matches what's already stored on disk. */
export function cloudConfigMatches(cfg: CloudConfig, machineId?: string): boolean {
  const cur = readCloudConfig(machineId);
  if (!cur) return false;
  return cur.host === cfg.host && cur.port === cfg.port && cur.name === cfg.name
      && cur.user === cfg.user && cur.password === cfg.password;
}

/** True when the locally-installed, signature-verified license grants cloud sync. */
export function hasCloudSyncFeature(): boolean {
  const payload = readLicensePayload();
  return !!payload?.features?.includes('cloud-sync');
}
