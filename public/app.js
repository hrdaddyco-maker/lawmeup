(() => {
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (p, body) => { const r = await fetch(p, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem('lmu_' + k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem('lmu_' + k, JSON.stringify(v)) };
const PROVINCES = ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan','Northwest Territories','Nunavut','Yukon'];
const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Puerto Rico','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const BRANDS = ['Apple','Amazon','CVS','GoodRx','Kroger','Equifax','Bank of America','Navy Federal','Merrill Edge','CIBC','Dr. Squatch','Teleflora','MDLIVE','Simplilearn','Thinkware','Coast Dental','ConnectAmerica','BuyAlerts','Tenet','Warner Music','Capital One Arena','CRA','RealPage','Pulsz','Huuuge Casino','SeatGeek','Domino\'s','Six Flags','Kaiser Permanente','Starbucks','Wiz','Xarelto'];
const MAKES = ['Hyundai','Kia','Toyota','Ford','GM','Chevrolet','Ram','Dodge','Nissan','Fiat'];
let ALL = null, META = null;
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Varies';
const daysLeft = d => d ? Math.ceil((Date.parse(d + 'T23:59:59-05:00') - Date.now()) / 864e5) : null;
const dlPill = d => { const n = daysLeft(d); if (n === null) return '<span class="pill">No fixed deadline</span>'; if (n < 0) return '<span class="pill red">Closed</span>'; return `<span class="pill ${n <= 14 ? 'red' : n <= 45 ? 'amber' : 'green'}">${n === 0 ? 'Last day' : n + ' day' + (n === 1 ? '' : 's') + ' left'}</span>`; };
const proofPill = p => p === 'No' ? '<span class="pill green">No proof needed</span>' : p === 'Yes' ? '<span class="pill amber">Proof required</span>' : '<span class="pill">Proof varies</span>';
const ctry = c => c === 'CA' ? '<span class="pill ca">🇨🇦 Canada</span>' : '<span class="pill us">🇺🇸 U.S.</span>';
const region = s => s.region?.note || '';
function card(s, extra = '') {
  return `<article class="card">
    <div class="pills">${ctry(s.country)}<span class="pill">${esc(s.category_label)}</span>${dlPill(s.deadline)}</div>
    <h3><a href="#/s/${s.id}">${esc(s.name)}</a></h3>
    <p class="def">${esc(s.class_definition)}</p>${extra}
    <div class="facts"><div class="fact"><small>Payout</small><b>${esc(s.payout)}</b></div><div class="fact"><small>Deadline</small><b>${fmtDate(s.deadline)}</b></div><div class="fact"><small>Proof</small><b>${s.proof === 'No' ? 'Not needed' : s.proof === 'Yes' ? 'Required' : 'Varies'}</b></div></div>
    <a class="btn btn-dark" href="#/s/${s.id}">Check if I qualify →</a></article>`;
}
async function load() { if (ALL) return; const [a, m] = await Promise.all([api('/api/settlements'), api('/api/meta')]); ALL = a.settlements; META = m; $('#foot-meta').textContent = `${ALL.length} open settlements · data refreshed ${new Date(a.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · sources: ClassAction.org open settlements list, Canadian administrator sites and trackers, verified against each official claim site.`; }
function setNav(k) { document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === k)); }

// ---------- HOME ----------
function home() {
  setNav('');
  const soon = ALL.filter(s => { const n = daysLeft(s.deadline); return n !== null && n >= 0; }).sort((a, b) => a.deadline < b.deadline ? -1 : 1).slice(0, 6);
  const feat = ALL.filter(s => s.featured && s.country === 'CA').slice(0, 3).concat(ALL.filter(s => s.featured && s.country === 'US' && s.proof === 'No').slice(0, 6));
  const ca = ALL.filter(s => s.country === 'CA').length, nop = ALL.filter(s => s.proof === 'No').length;
  app.innerHTML = `<section class="hero"><h1>Companies settled. <em>Some of that money might be yours.</em></h1>
    <p>Search ${ALL.length} open class action settlements in the U.S. and Canada, answer a few quick questions, and see if you likely qualify, why the case exists, and how to file on the official site.</p>
    <form class="search" id="hs"><input id="hq" placeholder="Try “Apple”, “data breach”, “Kia”, “CRA”…" aria-label="Search settlements"><button class="btn btn-primary">Search</button></form>
    <div style="margin-top:14px"><a class="btn btn-primary btn-lg" href="#/qualify">Start now: find what I qualify for →</a></div>
    <div class="stats"><span><b>${ALL.length}</b> open settlements</span><span><b>${ca}</b> in Canada</span><span><b>${nop}</b> need no proof</span><span>Every claim link checked against the official site</span></div></section>
    <div class="two"><a class="choice" href="#/qualify"><div class="ico">🧭</div><h3>Find what I qualify for</h3><p>Answer general questions about what you buy and use, plus any data breaches. We rank the settlements that fit you.</p></a>
    <a class="choice" href="#/browse"><div class="ico">🔎</div><h3>Browse all settlements</h3><p>Filter by country, deadline, payout and whether you need proof. Then check one in under a minute.</p></a></div>
    <h2 class="sec">Closing soon <a href="#/browse?sort=deadline">See all →</a></h2><div class="grid">${soon.map(s => card(s)).join('')}</div>
    <h2 class="sec">Popular picks</h2><div class="grid">${feat.map(s => card(s)).join('')}</div>`;
  $('#hs').onsubmit = e => { e.preventDefault(); location.hash = '#/browse?q=' + encodeURIComponent($('#hq').value); };
}

// ---------- BROWSE ----------
function browse(params) {
  setNav('browse');
  const f = { q: params.get('q') || '', country: params.get('country') || store.get('profile', {}).country || 'all', cat: params.get('cat') || 'all', dl: params.get('dl') || 'any', proof: params.get('proof') || 'any', pay: +(params.get('pay') || 0), sort: params.get('sort') || 'relevance' };
  const cats = [...new Map(ALL.map(s => [s.category, s.category_label])).entries()].sort((a, b) => a[1] < b[1] ? -1 : 1);
  app.innerHTML = `<div class="resbar" style="margin-bottom:6px"><h1 style="margin:0;font-size:28px;letter-spacing:-.02em;color:var(--ink)">Open settlements</h1><button class="btn btn-ghost filter-toggle" id="ft">Filters</button></div>
  <div class="layout"><aside class="filters" id="filters">
    <label>Search<input id="f-q" value="${esc(f.q)}" placeholder="Company, product, keyword"></label>
    <label>Country<div class="seg" id="f-country">${['all', 'US', 'CA'].map(c => `<button data-v="${c}" class="${f.country === c ? 'on' : ''}">${c === 'all' ? 'All' : c === 'US' ? '🇺🇸 U.S.' : '🇨🇦 Canada'}</button>`).join('')}</div></label>
    <label>Category<select id="f-cat"><option value="all">All categories</option>${cats.map(([k, v]) => `<option value="${k}" ${f.cat === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <label>Deadline<select id="f-dl">${[['any', 'Any'], ['14', 'Within 2 weeks'], ['30', 'Within 30 days'], ['90', 'Within 90 days'], ['later', 'More than 90 days'], ['none', 'No fixed deadline']].map(([v, l]) => `<option value="${v}" ${f.dl === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Proof of purchase<select id="f-proof">${[['any', 'Any'], ['No', 'No proof needed'], ['Yes', 'Proof required']].map(([v, l]) => `<option value="${v}" ${f.proof === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Max payout at least<select id="f-pay">${[[0, 'Any amount'], [25, '$25+'], [100, '$100+'], [500, '$500+'], [1000, '$1,000+'], [5000, '$5,000+']].map(([v, l]) => `<option value="${v}" ${f.pay === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Sort<select id="f-sort">${[['relevance', 'Recommended'], ['deadline', 'Deadline (soonest)'], ['payout', 'Highest payout'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button class="btn btn-ghost" id="f-reset">Reset filters</button>
  </aside><section><div class="resbar"><span id="count"></span></div><div class="grid" id="list"></div></section></div>`;
  const render = () => {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    let r = ALL.filter(s => {
      if (f.country !== 'all' && s.country !== f.country) return false;
      if (f.cat !== 'all' && s.category !== f.cat) return false;
      if (f.proof !== 'any' && s.proof !== f.proof) return false;
      if (f.pay && !(s.payout_range && s.payout_range.max >= f.pay)) return false;
      const n = daysLeft(s.deadline);
      if (f.dl === 'none' && n !== null) return false;
      if (/^\d+$/.test(f.dl) && !(n !== null && n <= +f.dl)) return false;
      if (f.dl === 'later' && !(n !== null && n > 90)) return false;
      if (words.length) { const h = (s.name + ' ' + s.defendant + ' ' + s.class_definition + ' ' + s.category_label + ' ' + (s.tags || []).join(' ') + ' ' + region(s)).toLowerCase(); if (!words.every(w => h.includes(w))) return false; }
      return true;
    });
    const dkey = s => s.deadline || '9999';
    if (f.sort === 'deadline') r.sort((a, b) => dkey(a) < dkey(b) ? -1 : 1);
    else if (f.sort === 'payout') r.sort((a, b) => (b.payout_range?.max || 0) - (a.payout_range?.max || 0));
    else if (f.sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
    $('#count').textContent = `${r.length} settlement${r.length === 1 ? '' : 's'}`;
    $('#list').innerHTML = r.length ? r.slice(0, 120).map(s => card(s)).join('') + (r.length > 120 ? `<p class="muted">Showing first 120. Narrow your search to see more.</p>` : '') : '<div class="empty">No settlements match. Try fewer filters, or <a href="#/qualify">let us find matches for you</a>.</div>';
    const p = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && v !== 'all' && v !== 'any' && !(k === 'sort' && v === 'relevance')));
    history.replaceState(null, '', '#/browse' + (p.toString() ? '?' + p : ''));
  };
  $('#f-q').oninput = e => { f.q = e.target.value; render(); };
  $('#f-country').onclick = e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); f.country = b.dataset.v; $('#f-country').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); render(); };
  for (const [id, k, num] of [['f-cat', 'cat'], ['f-dl', 'dl'], ['f-proof', 'proof'], ['f-pay', 'pay', 1], ['f-sort', 'sort']]) $('#' + id).onchange = e => { f[k] = num ? +e.target.value : e.target.value; render(); };
  $('#f-reset').onclick = () => browse(new URLSearchParams('country=all'));
  $('#ft').onclick = () => $('#filters').classList.toggle('open');
  render();
}

// ---------- DETAIL + QUESTIONNAIRE ----------
async function detail(id) {
  setNav('');
  app.innerHTML = '<div class="loading">Loading…</div>';
  let s; try { s = await api('/api/settlements/' + id); } catch { app.innerHTML = '<div class="empty">Settlement not found. <a href="#/browse">Browse all</a></div>'; return; }
  const saved = store.get('answers_' + id, {});
  const urlNote = s.url_check?.note?.startsWith('live') ? 'Official site checked: live (it uses a bot check, so it may show a "verify you are human" step).' : 'Official site checked: resolves.';
  app.innerHTML = `<a class="back" href="javascript:history.back()">← Back</a>
  <div class="detail"><div class="panel">
    <div class="pills">${ctry(s.country)}<span class="pill">${esc(s.category_label)}</span>${dlPill(s.deadline)}${proofPill(s.proof)}</div>
    <h1>${esc(s.name)}</h1><p class="sub">Defendant: <b>${esc(s.defendant)}</b> · ${esc(region(s))}</p>
    <div class="keyfacts"><div class="fact"><small>Payout</small><b>${esc(s.payout)}</b></div><div class="fact"><small>Deadline</small><b>${fmtDate(s.deadline)}</b></div><div class="fact"><small>Proof</small><b>${s.proof === 'No' ? 'Not required' : s.proof === 'Yes' ? 'Required' : 'Varies'}</b></div><div class="fact"><small>Where</small><b>${esc(s.country === 'CA' ? 'Canada' : 'U.S.')}</b></div></div>
    <h2>Why this case exists</h2><div class="why"><p>${esc(s.why)}</p><div class="src">${s.why_source === 'reviewed' ? 'Summarized from the official settlement notice.' : s.why_source === 'official site' ? 'Quoted from the official settlement website.' : 'General background for this type of case. Tap “Explain with AI” after the questions for case-specific details.'}</div></div>
    <h2>Who's included (class definition)</h2><p>${esc(s.class_definition)}</p>
    <h2>What you'll need</h2><ul class="reasons">${s.docs.map(d => `<li class="doc">${esc(d)}</li>`).join('')}</ul>
    <p class="src">Source: <a href="${esc(s.source)}" target="_blank" rel="noopener">${esc(s.source_name)}</a> · Official site: <a href="${esc(s.claim_url)}" target="_blank" rel="noopener">${esc(new URL(s.claim_url).hostname)}</a> · ${urlNote}</p>
  </div><aside class="panel quiz" id="quiz"></aside></div>`;
  quiz(s, saved);
}
function quiz(s, answers, i = 0) {
  const box = $('#quiz'); const qs = s.questions;
  if (i >= qs.length) return result(s, answers);
  const q = qs[i]; const a = answers[q.id];
  box.innerHTML = `<div class="kind">Eligibility check · Question ${i + 1} of ${qs.length}</div><div class="progress"><i style="width:${(i / qs.length) * 100}%"></i></div>
    <p class="qtext">${esc(q.q)}</p>
    <div class="ans">${[['yes', 'Yes', '✓'], ['no', 'No', '✕'], ['unsure', 'Not sure', '?']].map(([v, l, k]) => `<button data-v="${v}" class="${a === v ? 'sel' : ''}"><span class="k">${k}</span>${l}</button>`).join('')}</div>
    <div class="qnav"><button ${i ? '' : 'style="visibility:hidden"'} id="qb">← Previous</button><span class="muted">${q.kind === 'req' ? 'Required to be in the class' : q.kind === 'strong' ? 'Helps your claim get paid' : 'Affects payout / documents'}</span></div>
    <p class="src">${s.questions_source === 'reviewed' ? 'Questions written from the official class definition.' : 'Questions generated automatically from the class definition.'}</p>`;
  box.querySelectorAll('.ans button').forEach(b => b.onclick = () => { answers[q.id] = b.dataset.v; store.set('answers_' + s.id, answers); quiz(s, answers, i + 1); });
  const qb = $('#qb'); if (qb) qb.onclick = () => quiz(s, answers, i - 1);
}
async function result(s, answers) {
  const box = $('#quiz'); box.innerHTML = '<div class="loading">Checking…</div>';
  const v = await api('/api/evaluate', { id: s.id, answers, profile: store.get('profile', {}) });
  const li = (arr, c) => arr.map(x => `<li class="${c}">${esc(x)}</li>`).join('');
  box.innerHTML = `<div class="verdict v-${v.verdict}"><h3>${esc(v.headline)}</h3><p>${v.verdict === 'likely' ? 'Your answers match every required part of the class definition.' : v.verdict === 'maybe' ? 'Some answers are uncertain or could limit your payment.' : v.verdict === 'closed' ? 'The claim deadline has passed.' : 'At least one required condition does not match.'}</p><div class="meter"><i style="width:${v.score}%"></i></div></div>
    ${v.matched.length ? `<p class="rh">What matched</p><ul class="reasons">${li(v.matched, 'ok')}</ul>` : ''}
    ${v.blockers.length ? `<p class="rh">What doesn't match</p><ul class="reasons">${li(v.blockers, 'no')}</ul>` : ''}
    ${v.uncertain.length || v.concerns.length ? `<p class="rh">Check these</p><ul class="reasons">${li(v.uncertain.concat(v.concerns), 'q')}</ul>` : ''}
    ${v.notes.length ? `<p class="rh">Good to know</p><ul class="reasons">${li(v.notes, 'n')}</ul>` : ''}
    <div class="keyfacts" style="grid-template-columns:1fr 1fr;margin:10px 0"><div class="fact"><small>Estimated payout</small><b>${esc(v.payout)}</b></div><div class="fact"><small>Deadline</small><b>${fmtDate(v.deadline)}${v.days_left !== null && v.days_left >= 0 ? ` (${v.days_left}d)` : ''}</b></div></div>
    <div class="stack">${v.verdict === 'closed' ? '' : `<button class="btn btn-primary btn-lg" id="apply">${v.verdict === 'unlikely' ? 'View official claim site' : 'Apply on the official site →'}</button>`}
    <button class="btn btn-ghost" id="aibtn">✨ Explain this case &amp; my result with AI</button><button class="btn btn-ghost" id="redo">Change my answers</button></div><div id="aiout"></div>`;
  $('#redo').onclick = () => quiz(s, answers, 0);
  const ap = $('#apply'); if (ap) ap.onclick = () => applyModal(s, answers, v);
  $('#aibtn').onclick = async () => {
    const b = $('#aibtn'); b.disabled = true; b.textContent = 'Reading the official notice… (about 10–40s)';
    try {
      const o = await api('/api/ai/explain', { id: s.id, answers, profile: store.get('profile', {}) });
      $('#aiout').innerHTML = `<div class="ai"><h4>✨ AI explanation</h4><p><b>The case:</b> ${esc(o.case_story)}</p><p><b>Your situation:</b> ${esc(o.your_situation)}</p>${(o.tidbits || []).length ? `<p><b>Tidbits</b></p><ul>${o.tidbits.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${(o.before_you_file || []).length ? `<p><b>Before you file</b></p><ul>${o.before_you_file.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p class="muted">AI-generated from the settlement notice${o.page_used ? ' and official site text' : ''}. It can make mistakes and is not legal advice. The official site is the final word.</p></div>`;
      b.remove();
    } catch (e) { b.disabled = false; b.textContent = '✨ Try the AI explanation again'; $('#aiout').innerHTML = `<p class="warn">${esc(e.message)}</p>`; }
  };
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function applyModal(s, answers, v) {
  const me = store.get('me', {});
  const m = $('#modal');
  const summary = () => {
    const lines = [`CLAIM PREP SUMMARY: ${s.name}`, `Official claim site: ${s.claim_url}`, `Deadline: ${fmtDate(s.deadline)}   Payout: ${s.payout}   Proof required: ${s.proof}`, ''];
    const info = [['Name', me.name], ['Email', me.email], ['Phone', me.phone], ['Mailing address', me.address]].filter(x => x[1]);
    if (info.length) { lines.push('MY DETAILS'); info.forEach(([k, x]) => lines.push(`${k}: ${x}`)); lines.push(''); }
    lines.push('MY ELIGIBILITY ANSWERS');
    s.questions.forEach(q => lines.push(`- ${q.q.replace(/^(Is this true for you\?|Does this describe you\?)\s*/, '')}  -> ${({ yes: 'Yes', no: 'No', unsure: 'Not sure' })[answers[q.id]] || 'Not answered'}`));
    lines.push('', 'DOCUMENTS TO HAVE READY'); s.docs.forEach(d => lines.push('- ' + d));
    lines.push('', `LawMeUp estimate: ${v.headline}. The settlement administrator makes the final decision.`);
    return lines.join('\n');
  };
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ah"><h2 id="ah">Apply on the official site</h2>
    <p class="muted">LawMeUp doesn't file for you. Copy this summary, open the official claim form, and paste or type your details. Your details stay in this browser only.</p>
    <div class="row2"><label class="field"><span>Full name</span><input id="m-name" value="${esc(me.name || '')}" autocomplete="name"></label><label class="field"><span>Email</span><input id="m-email" value="${esc(me.email || '')}" autocomplete="email"></label></div>
    <div class="row2"><label class="field"><span>Phone</span><input id="m-phone" value="${esc(me.phone || '')}" autocomplete="tel"></label><label class="field"><span>Mailing address</span><input id="m-address" value="${esc(me.address || '')}" autocomplete="street-address"></label></div>
    <textarea id="m-sum" readonly></textarea>
    <div class="warn">⚠️ Only submit a claim if everything is true. Filing a false claim can be fraud, and administrators audit claims.</div>
    <div class="stack"><button class="btn btn-dark" id="m-copy">Copy summary</button><a class="btn btn-primary btn-lg" href="${esc(s.claim_url)}" target="_blank" rel="noopener" id="m-go">Open official claim form ↗</a><button class="btn btn-ghost" id="m-close">Close</button></div></div>`;
  m.hidden = false;
  const upd = () => { $('#m-sum').value = summary(); };
  ['name', 'email', 'phone', 'address'].forEach(k => $('#m-' + k).oninput = e => { me[k] = e.target.value; store.set('me', me); upd(); });
  upd();
  $('#m-copy').onclick = async () => { try { await navigator.clipboard.writeText($('#m-sum').value); } catch { $('#m-sum').select(); document.execCommand('copy'); } $('#m-copy').textContent = 'Copied ✓'; };
  $('#m-close').onclick = () => { m.hidden = true; };
  m.onclick = e => { if (e.target === m) m.hidden = true; };
}

// ---------- QUALIFY WIZARD ----------
function qualifyView() {
  setNav('qualify');
  const p = store.get('profile', { country: 'CA', region: 'Ontario', situations: [], keywords: [], vehicles: [], include_other: false });
  p.situations ||= []; p.keywords ||= []; p.vehicles ||= [];
  let step = 0;
  const steps = () => `<div class="steps">${[0, 1, 2].map(i => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>`;
  const draw = () => {
    if (step === 0) {
      app.innerHTML = `<div class="wizard panel">${steps()}<div class="kind">Step 1 of 3</div><h1>Where do you live?</h1><p class="sub">Most settlements only cover one country, and some only one state or province.</p>
      <div class="row2"><label class="field"><span>Country</span><select id="w-c"><option value="CA" ${p.country === 'CA' ? 'selected' : ''}>🇨🇦 Canada</option><option value="US" ${p.country === 'US' ? 'selected' : ''}>🇺🇸 United States</option></select></label>
      <label class="field"><span id="w-rl">${p.country === 'US' ? 'State' : 'Province / territory'}</span><select id="w-r"></select></label></div>
      <label class="checks" style="display:block"><label><input type="checkbox" id="w-o" ${p.include_other ? 'checked' : ''}> Also include settlements from the other country (e.g., you lived there or bought things there)</label></label>
      <div class="wnav"><span></span><button class="btn btn-dark btn-lg" id="next">Next →</button></div></div>`;
      const fill = () => { const list = $('#w-c').value === 'US' ? STATES : PROVINCES; $('#w-rl').textContent = $('#w-c').value === 'US' ? 'State' : 'Province / territory'; $('#w-r').innerHTML = list.map(x => `<option ${x === p.region ? 'selected' : ''}>${x}</option>`).join(''); };
      fill(); $('#w-c').onchange = fill;
      $('#next').onclick = () => { p.country = $('#w-c').value; p.region = $('#w-r').value; p.include_other = $('#w-o').checked; store.set('profile', p); step = 1; draw(); };
    } else if (step === 1) {
      app.innerHTML = `<div class="wizard panel">${steps()}<div class="kind">Step 2 of 3</div><h1>What applies to you?</h1><p class="sub">Tick anything that's true now or in the past few years. You can skip this.</p>
      <div class="checks">${Object.entries(META.situations).map(([k, l]) => `<label><input type="checkbox" value="${k}" ${p.situations.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
      <p class="field"><span>Cars you've owned or leased</span></p><div class="chips" id="mk">${MAKES.map(x => `<button class="chip ${p.vehicles.includes(x) ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div class="wnav"><button class="btn btn-ghost" id="prev">← Back</button><button class="btn btn-dark btn-lg" id="next">Next →</button></div></div>`;
      $('#mk').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; b.classList.toggle('on'); };
      $('#prev').onclick = () => { step = 0; draw(); };
      $('#next').onclick = () => { p.situations = [...app.querySelectorAll('.checks input:checked')].map(i => i.value); p.vehicles = [...app.querySelectorAll('#mk .chip.on')].map(b => b.textContent); store.set('profile', p); step = 2; draw(); };
    } else {
      app.innerHTML = `<div class="wizard panel">${steps()}<div class="kind">Step 3 of 3</div><h1>Brands, apps &amp; companies you've used</h1><p class="sub">Tap any you've bought from, used, or got a breach notice from. Add others below.</p>
      <div class="chips" id="br">${BRANDS.map(x => `<button class="chip ${p.keywords.includes(x.toLowerCase()) ? 'on' : ''}">${esc(x)}</button>`).join('')}</div>
      <label class="field"><span>Others (comma-separated)</span><input id="w-k" placeholder="e.g. Walmart, Ticketmaster, Rogers, LastPass, DaVita" value="${esc(p.keywords.filter(k => !BRANDS.some(b => b.toLowerCase() === k)).join(', '))}"></label>
      <label class="field"><span>Or describe yourself in a sentence, and AI pulls out the companies and situations</span><textarea id="w-t" rows="3" placeholder="e.g. I live in Toronto, use the CRA app, got scammed with iTunes cards in 2021, drove a 2016 Kia Optima and order on Amazon a lot"></textarea></label>
      <button class="btn btn-ghost" id="w-ai">✨ Extract with AI</button> <span class="muted" id="w-ais"></span>
      <div class="wnav"><button class="btn btn-ghost" id="prev">← Back</button><button class="btn btn-primary btn-lg" id="go">Show my matches →</button></div></div>`;
      $('#br').onclick = e => { const b = e.target.closest('.chip'); if (b) b.classList.toggle('on'); };
      $('#prev').onclick = () => { step = 1; draw(); };
      const collect = () => { p.keywords = [...new Set([...app.querySelectorAll('#br .chip.on')].map(b => b.textContent.toLowerCase()).concat($('#w-k').value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)))]; store.set('profile', p); };
      $('#w-ai').onclick = async () => {
        const t = $('#w-t').value.trim(); if (!t) return $('#w-t').focus();
        const b = $('#w-ai'); b.disabled = true; $('#w-ais').textContent = 'Reading… (about 10–30s)';
        try {
          const o = await api('/api/ai/parse', { text: t }); collect();
          p.keywords = [...new Set(p.keywords.concat(o.keywords.map(k => k.toLowerCase())))]; p.vehicles = [...new Set(p.vehicles.concat(o.vehicles))]; p.situations = [...new Set(p.situations.concat(o.situations))];
          if (o.country) p.country = o.country; if (o.region) p.region = o.region; store.set('profile', p);
          $('#w-ais').textContent = `Found: ${[...o.keywords, ...o.vehicles].join(', ') || 'nothing specific'}${o.situations.length ? ' · ' + o.situations.length + ' situation(s)' : ''}`;
          draw(); $('#w-ais').textContent = 'Added from your description ✓';
        } catch (e) { $('#w-ais').textContent = e.message + ' You can still type companies above.'; b.disabled = false; }
      };
      $('#go').onclick = () => { collect(); results(p); };
    }
  };
  draw();
}
async function results(p) {
  app.innerHTML = '<div class="loading">Ranking settlements…</div>';
  const { results } = await api('/api/qualify', p);
  const head = `<div class="resbar"><div><h1 style="margin:0;font-size:28px;letter-spacing:-.02em">Your matches</h1><span>${results.length} settlement${results.length === 1 ? '' : 's'} ranked by how well they fit what you told us. Open one to confirm with its specific questions.</span></div><a class="btn btn-ghost" href="#/qualify">Edit answers</a></div>`;
  if (!results.length) { app.innerHTML = head + `<div class="empty panel">No matches yet. Try adding more brands or situations, include the other country, or <a href="#/browse">browse everything</a>.</div>`; return; }
  const strengthPill = s => s === 'strong' ? '<span class="pill green">Strong match</span>' : s === 'possible' ? '<span class="pill amber">Possible match</span>' : '<span class="pill">Worth a look</span>';
  app.innerHTML = head + `<div class="grid">${results.map(r => card(r.settlement, `<div class="pills">${strengthPill(r.strength)}</div><p class="def" style="-webkit-line-clamp:4"><b>Why it's here:</b> ${esc(r.reasons.join(' · '))}</p>`)).join('')}</div>`;
}

// ---------- ABOUT ----------
function about() {
  setNav('about');
  app.innerHTML = `<div class="panel prose"><h1>How LawMeUp works</h1>
  <h2>1. Real, current settlements</h2><p>${META.count} open settlements in the U.S. and Canada, rebuilt daily from <a href="https://www.classaction.org/settlements" target="_blank" rel="noopener">ClassAction.org's open-settlement list</a> plus Canadian settlements taken from the administrators' own sites (Deloitte, KPMG, MNP, Proactio, Verita and others) and Canadian trackers. Settlements whose deadline has passed are removed automatically. Every official claim link is checked, and dead sites are dropped.</p>
  <h2>2. Rule-based eligibility</h2><p>Each settlement's class definition becomes a short list of yes / no / not-sure questions. <b>Required</b> questions decide whether you're in the class, <b>helpful</b> ones affect whether a claim is likely to be paid, and <b>info</b> ones affect payout and paperwork. Any "no" on a required question means <i>unlikely</i>. Any "not sure" means <i>maybe</i>. All yes means <i>likely</i>. This runs instantly, without AI.</p>
  <h2>3. Optional AI</h2><p>The AI reads the official notice and explains the case, the tidbits and your result in plain language, or turns a sentence about you into companies to match. It uses a free AI service, so it can be slow or busy, and it never changes the rule-based verdict.</p>
  <h2>4. You apply on the official site</h2><p>LawMeUp never submits claims. "Apply" gives you a copyable summary of your answers and details, then opens the court-appointed administrator's claim form.</p>
  <h2>Limits</h2><ul><li>Not legal advice. Only the administrator decides claims.</li><li>Payout amounts are what the notices list. Most are pro rata and depend on how many people claim.</li><li>Questions for featured settlements were reviewed by hand. The rest are generated automatically from the class definition.</li><li>Some official sites run a "verify you're human" check. That's normal.</li><li>Data last refreshed ${new Date(META.generated_at).toLocaleString()}.</li></ul></div>`;
}

// ---------- ROUTER ----------
async function route() {
  try { await load(); } catch (e) { app.innerHTML = `<div class="empty">Couldn't load settlements (${esc(e.message)}). The server may be waking up; refresh in ~30 seconds.</div>`; return; }
  $('#modal').hidden = true;
  const h = location.hash.slice(1) || '/'; const [p, qs] = h.split('?'); const params = new URLSearchParams(qs || '');
  let m;
  if ((m = p.match(/^\/s\/([\w-]+)/))) await detail(m[1]);
  else if (p === '/browse') browse(params);
  else if (p === '/qualify') qualifyView();
  else if (p === '/about') about();
  else home();
  if (!p.startsWith('/browse')) window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);
route();
})();
