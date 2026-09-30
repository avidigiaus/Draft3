/**
 * Tracking service — first-resume-free eligibility + request persistence
 *
 * Default: in-memory store (resets on server restart).
 * Production: swap `load()` and `persist()` to use Redis, MongoDB, Postgres, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.resolve(__dirname, '../data/resume-requests.json');

const state = {
  freeUsed: new Set(),  // emails that already used their free resume
  requests: new Map(),  // requestId -> payload
};

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ freeUsed: [], requests: [] }, null, 2));
}

function load() {
  try {
    ensureDataFile();
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    state.freeUsed = new Set(raw.freeUsed || []);
    state.requests = new Map((raw.requests || []).map((r) => [r.requestId, r]));
  } catch (err) {
    console.warn('tracking: failed to load state, starting fresh.', err.message);
  }
}

function persist() {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      freeUsed: Array.from(state.freeUsed),
      requests: Array.from(state.requests.values()),
    }, null, 2));
  } catch (err) {
    console.warn('tracking: persist failed.', err.message);
  }
}

load();

export function hasUsedFree(email) {
  return state.freeUsed.has(email.toLowerCase());
}

export function markFreeUsed(email) {
  state.freeUsed.add(email.toLowerCase());
  persist();
}

export function saveRequest(payload) {
  state.requests.set(payload.requestId, payload);
  persist();
}

export function getRequest(id) {
  return state.requests.get(id) || null;
}

export function listRequests() {
  return Array.from(state.requests.values()).sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
  );
}
