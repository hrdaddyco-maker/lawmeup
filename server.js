const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { build } = require('./lib/build');
const { evaluate, qualify, SITUATIONS } = require('./lib/eligibility');
const PORT = process.env.PORT || 3000;
const LLM_URL = process.env.LLM_URL || 'https://text.pollinations.ai/openai';
const LLM_KEY = process.env.LLM_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'openai';
const GAP = +(process.env.LLM_GAP_MS || (LLM_KEY ? 0 : 3000));
const DATA = path.join(__dirname, 'data', 'settlements.json');
let db = JSON.parse(fs.readFileSync(DATA));
let pages = {}; try { pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pages_text.json'))); } catch {}
const byId = () => new Map(db.settlements.map(s => [s.id, s]));
let index = byId();

// ---- scheduled refresh: re-scrape + re-verify daily (and on boot if stale) ----
let refreshing = false;
async function refresh(reason) {
  if (refreshing) return; refreshing = true;
  try {
    const prev = {}; for (const s of db.settlements) if (s.url_check) prev[s.claim_url] = { ...s.url_check, at: Date.parse(s.url_check.checked_at) };
    const d = await build({ prev });
    if (d.count >= 30) { db = d; index = byId(); try { fs.writeFileSync(DATA, JSON.stringify(d)); } catch {} console.log('refreshed', reason, d.count); }
  } catch (e) { console.log('refresh failed', e.message); } finally { refreshing = false; }
}
if (Date.now() - Date.parse(db.generated_at) > 20 * 3600e3) setTimeout(() => refresh('boot'), 5000);
setInterval(() => refresh('daily'), 24 * 3600e3).unref();

// ---- LLM (Pollinations free keyless by default; any OpenAI-compatible endpoint via env) ----
let chain = Promise.resolve(), lastCall = 0;
function queued(fn) { const p = chain.then(async () => { const w = lastCall + GAP - Date.now(); if (w > 0) await new Promise(r => setTimeout(r, w)); try { return await fn(); } finally { lastCall = Date.now(); } }); chain = p.catch(() => {}); return p; }
async function llm(messages, json) {
  for (let i = 0; i < 3; i++) {
    const j = await queued(async () => { const r = await fetch(LLM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(LLM_KEY ? { Authorization: 'Bearer ' + LLM_KEY } : {}) }, body: JSON.stringify({ model: LLM_MODEL, messages, seed: Math.floor(Math.random() * 1e9), max_tokens: 1800, ...(json ? { response_format: { type: 'json_object' } } : {}) }), signal: AbortSignal.timeout(90000) }); return r.json().catch(() => ({})); }).catch(e => ({ error: String(e.message) }));
    const c = j.choices?.[0]?.message?.content; if (c) return c;
    console.log('llm fail', JSON.stringify(j).slice(0, 200));
    await new Promise(r => setTimeout(r, 4000 * (i + 1)));
  }
  throw new Error('The free AI service is busy right now. The rule-based result above is still valid; try the AI explanation again in a minute.');
}
const extract = t => { t = t.replace(/```json|```/g, ''); return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); };
const pageCache = new Map();
async function officialText(s) {
  if (pageCache.has(s.id)) return pageCache.get(s.id);
  let t = pages[s.id]?.text || '';
  if (!t) { try { const r = await fetch(s.claim_url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124' }, signal: AbortSignal.timeout(15000) }); if (r.ok) t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 7000); } catch {} }
  pageCache.set(s.id, t); return t;
}
async function aiExplain(s, answers, verdict) {
  const page = await officialText(s);
  const qa = s.questions.map(q => `- ${q.q} => ${answers?.[q.id] || 'not answered'}`).join('\n');
  const sys = 'You explain class action settlements to ordinary people in plain, friendly language. You are not a lawyer and must not give legal advice. Base every statement ONLY on the provided settlement facts and official-site text; if something is not stated, say it is not stated. Never encourage a false claim. Return JSON: {"case_story": "2-3 sentences: who was sued, what they allegedly did wrong, current status", "your_situation": "2-3 sentences explaining the verdict for this person in second person", "tidbits": ["3-4 short, concrete facts from the text (fund size, payment tiers, notable details)"], "before_you_file": ["2-4 practical tips: documents, where to find a claim ID, deadline"]}';
  const user = `SETTLEMENT: ${s.name}\nDEFENDANT: ${s.defendant}\nCOUNTRY: ${s.country}\nCLASS: ${s.class_definition}\nDEADLINE: ${s.deadline || 'varies'}\nPAYOUT: ${s.payout}\nPROOF REQUIRED: ${s.proof}\nBACKGROUND: ${s.why}\nRULE-BASED VERDICT: ${verdict?.verdict} (${verdict?.headline})\nUSER ANSWERS:\n${qa}\nOFFICIAL SITE TEXT (may be partial):\n${page.slice(0, 5000) || '(not available)'}`;
  const c = await llm([{ role: 'system', content: sys }, { role: 'user', content: user }], true);
  const o = extract(c); o.page_used = !!page; return o;
}
async function aiParse(text, all) {
  const sys = 'Extract consumer facts from a person\'s description of themselves for matching class action settlements. Return JSON: {"keywords": [lowercase company, brand, product, app or service names mentioned or clearly implied, max 25], "vehicles": [car makes], "situations": [subset of the allowed situation ids that clearly apply], "country": "US"|"CA"|null, "region": state or province full name or null}. Allowed situation ids: ' + Object.keys(SITUATIONS).join(', ');
  const c = await llm([{ role: 'system', content: sys }, { role: 'user', content: String(text).slice(0, 2000) }], true);
  const o = extract(c);
  return { keywords: (o.keywords || []).map(String).slice(0, 25), vehicles: [...new Set((o.vehicles || []).map(v => String(v).split(/\s+/)[0]))], situations: (o.situations || []).filter(k => SITUATIONS[k]), country: ['US', 'CA'].includes(o.country) ? o.country : null, region: o.region || null };
}

// ---- HTTP ----
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
function send(req, res, code, body, type) {
  const gz = /gzip/.test(req.headers['accept-encoding'] || '') && body.length > 1024;
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': type.startsWith('application/json') ? 'no-store' : 'public, max-age=300', ...(gz ? { 'Content-Encoding': 'gzip' } : {}), 'X-Content-Type-Options': 'nosniff' });
  res.end(gz ? zlib.gzipSync(body) : body);
}
const listView = s => { const { questions, why, docs, url_check, ...r } = s; return { ...r, url_status: url_check?.note, checked_at: url_check?.checked_at }; };
http.createServer(async (req, res) => {
  const J = (c, o) => send(req, res, c, Buffer.from(JSON.stringify(o)), 'application/json');
  const url = new URL(req.url, 'http://x');
  const body = () => new Promise((ok, bad) => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { bad(e); } }); });
  try {
    if (url.pathname === '/healthz') return J(200, { ok: true, count: db.count });
    if (url.pathname === '/api/meta') return J(200, { count: db.count, generated_at: db.generated_at, sources: db.sources, situations: Object.fromEntries(Object.entries(SITUATIONS).map(([k, v]) => [k, v.label])), ai: { provider: LLM_URL.includes('pollinations') ? 'Pollinations (free, keyless)' : 'custom' } });
    if (url.pathname === '/api/settlements') return J(200, { generated_at: db.generated_at, settlements: db.settlements.map(listView) });
    let m;
    if ((m = url.pathname.match(/^\/api\/settlements\/([\w-]+)$/))) { const s = index.get(m[1]); return s ? J(200, s) : J(404, { error: 'Not found' }); }
    if (req.method === 'POST' && url.pathname === '/api/evaluate') { const b = await body(); const s = index.get(b.id); if (!s) return J(404, { error: 'Not found' }); return J(200, evaluate(s, b.answers || {}, b.profile || {})); }
    if (req.method === 'POST' && url.pathname === '/api/qualify') { const b = await body(); return J(200, { results: qualify(db.settlements, b).map(r => ({ ...r, settlement: listView(index.get(r.id)) })) }); }
    if (req.method === 'POST' && url.pathname === '/api/ai/explain') { const b = await body(); const s = index.get(b.id); if (!s) return J(404, { error: 'Not found' }); const v = evaluate(s, b.answers || {}, b.profile || {}); return J(200, await aiExplain(s, b.answers, v)); }
    if (req.method === 'POST' && url.pathname === '/api/ai/parse') { const b = await body(); return J(200, await aiParse(b.text || '', db.settlements)); }
    if (req.method === 'POST' && url.pathname === '/api/admin/refresh') { if (!process.env.ADMIN_TOKEN || req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) return J(403, { error: 'forbidden' }); refresh('manual'); return J(202, { started: true }); }
    if (url.pathname.startsWith('/api/')) return J(404, { error: 'Not found' });
    let p = path.join(__dirname, 'public', path.normalize(url.pathname).replace(/^[/\\.]+/, ''));
    if (!path.extname(p) || !fs.existsSync(p)) p = path.join(__dirname, 'public', 'index.html');
    return send(req, res, 200, fs.readFileSync(p), types[path.extname(p)] || 'application/octet-stream');
  } catch (e) { return J(500, { error: String(e.message || e) }); }
}).listen(PORT, () => console.log('LawMeUp on', PORT, 'settlements', db.count));
