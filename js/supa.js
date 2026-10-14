import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ── 테이블 CRUD ──
export async function list(table, eq = {}, order = 'created_at', asc = false) {
  let q = sb.from(table).select('*');
  for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
  return check(await q.order(order, { ascending: asc }));
}
export async function listIn(table, col, ids) {
  if (!ids.length) return [];
  return check(await sb.from(table).select('*').in(col, ids));
}
export async function get(table, id) {
  return check(await sb.from(table).select('*').eq('id', id).maybeSingle());
}
export async function insert(table, row) {
  return check(await sb.from(table).insert(row).select().single());
}
export async function update(table, id, patch) {
  return check(await sb.from(table).update(patch).eq('id', id).select().single());
}
export async function remove(table, id) {
  check(await sb.from(table).delete().eq('id', id));
}
export async function latest(table, pairId) {
  const rows = check(await sb.from(table).select('*').eq('pair_id', pairId).order('created_at', { ascending: false }).limit(1));
  return rows[0] || null;
}

// ── 이미지 (비공개 버킷 + 서명 URL) ──
export async function upload(file) {
  const { data: { user } } = await sb.auth.getUser();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  check(await sb.storage.from('images').upload(path, file, { contentType: file.type, upsert: false }));
  return path;
}
export async function removeFile(path) {
  if (!path) return;
  await sb.storage.from('images').remove([path]);
}
const urlCache = new Map();
export async function imgUrl(path) {
  if (!path) return '';
  const hit = urlCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const data = check(await sb.storage.from('images').createSignedUrl(path, 3600));
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3500 * 1000 });
  return data.signedUrl;
}

// ── AI (Supabase Edge Function 'ai' → Gemini) ──
export async function ai(mode, context) {
  const { data, error } = await sb.functions.invoke('ai', { body: { mode, context } });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.items || [];
}

// ── 페어 + 두 캐릭터 한 번에 ──
export async function loadPair(id) {
  const pair = await get('pairs', id);
  if (!pair) return null;
  const chars = await listIn('characters', 'id', [pair.char_a, pair.char_b].filter(Boolean));
  const a = chars.find((c) => c.id === pair.char_a) || { name: 'A', color: '#f2c6c2', profile: {} };
  const b = chars.find((c) => c.id === pair.char_b) || { name: 'B', color: '#cfe0ec', profile: {} };
  pair.detail = pair.detail || {};
  a.pairTitle = b.pairTitle = pair.detail.name || '';
  return { pair, a, b };
}
