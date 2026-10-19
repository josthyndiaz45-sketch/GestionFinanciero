import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@schedule_v1_';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function storageKey(userId) {
  return `${KEY_PREFIX}${userId || 'local'}`;
}

function makeId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBlock(raw) {
  return {
    id: raw.id || makeId(),
    day: DAYS.includes(raw.day) ? raw.day : 'mon',
    title: (raw.title || '').trim(),
    start: raw.start || '08:00',
    end: raw.end || '09:00',
    color: raw.color || '#4F46E5',
    note: raw.note || '',
    done: !!raw.done,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export async function loadSchedule(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeBlock);
  } catch (_) {
    return [];
  }
}

async function persist(userId, blocks) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(blocks));
  return blocks;
}

export async function saveSchedule(userId, blocks) {
  return persist(userId, (blocks || []).map(normalizeBlock));
}

export async function addBlock(userId, blocks, data) {
  const block = normalizeBlock({ ...data, id: makeId() });
  const next = [...(blocks || []), block];
  await persist(userId, next);
  return { blocks: next, block };
}

export async function updateBlock(userId, blocks, id, data) {
  const next = (blocks || []).map((b) => (b.id === id ? normalizeBlock({ ...b, ...data, id }) : b));
  await persist(userId, next);
  return next;
}

export async function removeBlock(userId, blocks, id) {
  const next = (blocks || []).filter((b) => b.id !== id);
  await persist(userId, next);
  return next;
}

export async function toggleBlockDone(userId, blocks, id) {
  const next = (blocks || []).map((b) => (b.id === id ? { ...b, done: !b.done } : b));
  await persist(userId, next);
  return next;
}

export async function clearSchedule(userId) {
  await AsyncStorage.removeItem(storageKey(userId));
  return [];
}

export const SCHEDULE_DAYS = [
  { key: 'mon', label: 'Lunes', short: 'Lun' },
  { key: 'tue', label: 'Martes', short: 'Mar' },
  { key: 'wed', label: 'Miércoles', short: 'Mié' },
  { key: 'thu', label: 'Jueves', short: 'Jue' },
  { key: 'fri', label: 'Viernes', short: 'Vie' },
  { key: 'sat', label: 'Sábado', short: 'Sáb' },
];

export const SCHEDULE_COLORS = [
  '#4F46E5',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#EA580C',
  '#E11D48',
  '#7C3AED',
  '#DB2777',
  '#CA8A04',
  '#334155',
];

export const DEFAULT_BLOCK_COLOR = SCHEDULE_COLORS[0];

export function sortBlocksForDay(blocks, day) {
  return (blocks || [])
    .filter((b) => b.day === day)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function minutesFromTime(t) {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map((n) => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function formatTimeLabel(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${h}:${m}`;
}

export function blockMinutes(b) {
  const diff = minutesFromTime(b.end) - minutesFromTime(b.start);
  return diff > 0 ? diff : 0;
}

export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
