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
let ALL = null, META = null, CONS = null, RES = null;
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Varies';
const daysLeft = d => d ? Math.ceil((Date.parse(d + 'T23:59:59-05:00') - Date.now()) / 864e5) : null;
const dlPill = d => { const n = daysLeft(d); if (n === null) return '<span class="pill">No fixed deadline</span>'; if (n < 0) return '<span class="pill red">Closed</span>'; return `<span class="pill ${n <= 14 ? 'red' : n <= 45 ? 'amber' : 'green'}">${n === 0 ? 'Last day' : n + ' day' + (n === 1 ? '' : 's') + ' left'}</span>`; };
const proofPill = p => p === 'No' ? '<span class="pill green">No proof needed</span>' : p === 'Yes' ? '<span class="pill amber">Proof required</span>' : '<span class="pill">Proof varies</span>';
const ctry = c => c === 'CA' ? '<span class="pill ca">🇨🇦 Canada</span>' : '<span class="pill us">🇺🇸 U.S.</span>';
const region = s => s.region?.note || '';
function card(s, extra = '', badge = '') {
  return `<article class="card">
    <div class="card-top"><div class="pills">${ctry(s.country)}<span class="pill">${esc(s.category_label)}</span></div>${badge || dlPill(s.deadline)}</div>
    <h3><a href="#/s/${s.id}">${esc(s.name)}</a></h3>
    <p class="def">${esc(s.class_definition)}</p>${extra}
    <div class="pills">${badge ? dlPill(s.deadline) : ''}${proofPill(s.proof)}</div>
    <div class="amount"><div><small>Payout</small><b>${esc(s.payout)}</b></div><div class="r"><small>Deadline</small><b>${fmtDate(s.deadline)}</b></div></div>
    <a class="cta" href="#/s/${s.id}">Check if I qualify <span aria-hidden="true">→</span></a></article>`;
}
async function load() { if (ALL) return; const [a, m] = await Promise.all([api('/api/settlements'), api('/api/meta')]); ALL = a.settlements; CONS = ALL.filter(s => s.audience !== 'business'); META = m; checkWatch(); $('#foot-meta').textContent = `${ALL.length} open settlements · data refreshed ${new Date(a.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · sources: ClassAction.org open settlements list, Canadian administrator sites and trackers, verified against each official claim site.`; }
function setNav(k) { document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === k)); const on = document.querySelector('.mainnav a.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }

// ---------- HOME ----------
function home() {
  setNav('');
  const soon = CONS.filter(s => { const n = daysLeft(s.deadline); return n !== null && n >= 0; }).sort((a, b) => a.deadline < b.deadline ? -1 : 1).slice(0, 6);
  const feat = CONS.filter(s => s.featured && s.country === 'CA').slice(0, 3).concat(CONS.filter(s => s.featured && s.country === 'US' && s.proof === 'No').slice(0, 6));
  const ca = CONS.filter(s => s.country === 'CA').length, nop = CONS.filter(s => s.proof === 'No').length;
  const tool = (h, i, t, p, go) => `<a class="tool" href="${h}"><span class="ti">${i}</span><h3>${t}</h3><p>${p}</p><span class="go">${go} →</span></a>`;
  app.innerHTML = `<section class="hero"><div>
    <span class="eyebrow">🇺🇸 U.S. &amp; 🇨🇦 Canada · free · no sign-up</span>
    <h1>Companies settled. <em>Some of that money might be yours.</em></h1>
    <p class="lead">Check ${CONS.length} open class action settlements, unclaimed government money, and flight compensation in minutes. You get a clear verdict and a direct link to the official claim form.</p>
    <form class="search" id="hs" role="search"><input id="hq" placeholder="Search “Apple”, “data breach”, “Kia”, “CRA”…" aria-label="Search settlements"><button class="btn btn-primary">Search</button></form>
    <div class="hero-ctas"><a class="btn btn-primary btn-lg" href="#/qualify">Start now: find what I qualify for →</a><a class="btn btn-glass btn-lg" href="#/unclaimed">Search unclaimed money</a></div>
    <div class="stats"><div><b>${CONS.length}</b>open settlements</div><div><b>${ca}</b>in Canada</div><div><b>${nop}</b>need no proof</div><div><b>100%</b>official claim links</div></div></div>
    <div class="preview" aria-hidden="true"><div class="pv-h"><span class="kind" style="margin:0">Eligibility check</span><span class="elig strong">Likely eligible</span></div><h4>Apple Gift Card Scam Settlement</h4><p class="muted" style="margin:0 0 10px;font-size:13.5px">🇨🇦 Canada · No proof needed</p>
      <div class="pv-row"><span class="tick">✓</span>Bought Apple gift cards for a scammer<b></b></div><div class="pv-row"><span class="tick">✓</span>Lived in Canada at the time</div><div class="pv-row"><span class="tick">✓</span>Within the class period</div><div class="pv-row" style="border-top:1px solid var(--line)"><span class="muted">Next</span><b style="color:var(--green)">Apply on official site ↗</b></div></div></section>
    <div class="tools">${tool('#/qualify', '🧭', 'What do I qualify for?', 'Answer a few general questions and we rank settlements that fit you.', 'Find matches')}${tool('#/unclaimed', '💰', 'Unclaimed money', 'Official searches for forgotten balances, refunds and pensions.', 'Search')}${tool('#/refunds', '✈️', 'Flights &amp; recalls', 'APPR, EU261 and U.S. DOT calculator, plus recall lookups.', 'Check a flight')}${tool('#/business', '🏢', 'For businesses', 'Price-fixing and antitrust settlements for companies and farms.', 'See business cases')}${tool('#/watch', '🔔', 'Watch', 'Save your profile and see new matches after each daily refresh.', 'Set up')}</div>
    <h2 class="sec">Closing soon <a href="#/browse?sort=deadline">See all →</a></h2><div class="grid">${soon.map(s => card(s)).join('')}</div>
    <h2 class="sec">Popular picks <a href="#/browse">Browse all ${CONS.length} →</a></h2><div class="grid">${feat.map(s => card(s)).join('')}</div>
    <div class="trust"><div><div class="ti">🔗</div><b>Official links only</b><p>Every claim link goes to the court-appointed administrator or government site and is re-checked daily.</p></div><div><div class="ti">🔒</div><b>Private by design</b><p>Your answers and details stay in your browser. No account, no tracking of your searches.</p></div><div><div class="ti">⚖️</div><b>Clear, honest verdicts</b><p>Rule-based checks against the actual class definition. Not legal advice, and we never file for you.</p></div></div>`;
  $('#hs').onsubmit = e => { e.preventDefault(); location.hash = '#/browse?q=' + encodeURIComponent($('#hq').value); };
}

// ---------- BROWSE ----------
function browse(params) {
  setNav('browse');
  const f = { q: params.get('q') || '', country: params.get('country') || store.get('profile', {}).country || 'all', cat: params.get('cat') || 'all', dl: params.get('dl') || 'any', proof: params.get('proof') || 'any', pay: +(params.get('pay') || 0), sort: params.get('sort') || 'relevance' };
  const cats = [...new Map(CONS.map(s => [s.category, s.category_label])).entries()].sort((a, b) => a[1] < b[1] ? -1 : 1);
  app.innerHTML = `<div class="pagehead"><div><div class="kind">Settlements</div><h1>Open class action settlements</h1><p>Filter by country, deadline, payout and proof, then check any one in under a minute.</p></div><button class="btn btn-ghost filter-toggle" id="ft">Filters</button></div>
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
    let r = CONS.filter(s => {
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
  setNav('browse');
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
  box.innerHTML = `<div class="verdict v-${v.verdict}"><span class="vbadge">${({ likely: '● Likely eligible', maybe: '● Maybe eligible', unlikely: '● Unlikely', closed: '● Closed' })[v.verdict] || ''}</span><h3>${esc(v.headline)}</h3><p>${v.verdict === 'likely' ? 'Your answers match every required part of the class definition.' : v.verdict === 'maybe' ? 'Some answers are uncertain or could limit your payment.' : v.verdict === 'closed' ? 'The claim deadline has passed.' : 'At least one required condition does not match.'}</p><div class="meter"><i style="width:${v.score}%"></i></div></div>
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
  const head = `<div class="pagehead"><div><div class="kind">Qualify</div><h1>Your matches</h1><p>${results.length} settlement${results.length === 1 ? '' : 's'} ranked by how well they fit what you told us. Open one to confirm with its specific questions.</p></div><a class="btn btn-ghost" href="#/qualify">Edit answers</a></div>`;
  if (!results.length) { app.innerHTML = head + `<div class="empty panel">No matches yet. Try adding more brands or situations, include the other country, or <a href="#/browse">browse everything</a>.</div>`; return; }
  const strengthPill = s => s === 'strong' ? '<span class="elig strong">Strong match</span>' : s === 'possible' ? '<span class="elig possible">Possible match</span>' : '<span class="elig weak">Worth a look</span>';
  const w = store.get('watch', null);
  app.innerHTML = head + `<div class="panel watchbox"><div><b>🔔 Watch for new matches</b><p class="muted" style="margin:4px 0 0">Save this profile on this device. When the daily refresh adds settlements that fit you, a badge appears on <b>Watch</b>. Your profile stays in your browser.</p></div><button class="btn btn-primary" id="watch-save">${w ? 'Update watch' : 'Save &amp; watch'}</button></div><div class="grid">${results.map(r => card(r.settlement, `<p class="def" style="-webkit-line-clamp:4"><b>Why it's here:</b> ${esc(r.reasons.join(' · '))}</p>`, strengthPill(r.strength))).join('')}</div>`;
  $('#watch-save').onclick = () => { store.set('watch', { profile: p, seen: results.map(r => r.id), saved: new Date().toISOString() }); $('#watch-save').textContent = 'Watching ✓'; setBadge(0); };
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

// ---------- SHARED (phase 2) ----------
async function res() { if (!RES) RES = await api('/api/resources'); return RES; }
const linkStatus = st => /human/.test(st || '') ? '<span class="pill amber" title="This official site runs a &quot;verify you are human&quot; check, which is normal">Human check</span>' : '<span class="pill green">Link checked</span>';
const reslink = l => `<li class="rlink"><div><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>${l.note ? `<p class="muted">${esc(l.note)}</p>` : ''}</div>${linkStatus(l.status)}</li>`;
const copyBtn = (text, label = 'Copy') => `<button class="btn btn-ghost btn-sm copy" data-copy="${esc(text)}">${esc(label)}</button>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (!b) return; const t = b.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }); const o = b.textContent; b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = o, 1400); });

// ---------- UNCLAIMED MONEY ----------
async function unclaimed() {
  setNav('unclaimed');
  const R = (await res()).unclaimed;
  const saved = store.get('uc', null);
  const f = saved || { name: '', other: '', places: [], remember: false };
  app.innerHTML = `<div class="panel prose"><div class="kind">Unclaimed money</div><h1>Find money held in your name</h1>
  <p class="sub">Governments hold forgotten bank balances, uncashed refund cheques, old pensions and insurance payouts. We list the <b>official</b> free searches for every place you've lived. LawMeUp doesn't search for you, and your name never leaves this page.</p>
  <div class="row2"><label class="field"><span>Your full name</span><input id="u-n" value="${esc(f.name)}" placeholder="e.g. Oliver Tremblay" autocomplete="name"></label>
  <label class="field"><span>Other names you've used (maiden name, nicknames, old spellings), comma-separated</span><input id="u-o" value="${esc(f.other)}" placeholder="e.g. Ollie Tremblay, O. Tremblay"></label></div>
  <p class="field"><span>Provinces / territories you've lived in</span></p><div class="chips" id="u-ca">${PROVINCES.map(x => `<button class="chip ${f.places.includes(x) ? 'on' : ''}">${x}</button>`).join('')}</div>
  <details ${f.places.some(x => STATES.includes(x)) ? 'open' : ''}><summary class="field"><span>U.S. states you've lived or worked in</span></summary><div class="chips" id="u-us">${STATES.map(x => `<button class="chip ${f.places.includes(x) ? 'on' : ''}">${x}</button>`).join('')}</div></details>
  <label class="checks" style="display:block;margin-top:10px"><label><input type="checkbox" id="u-r" ${f.remember ? 'checked' : ''}> Remember these on this device (stored only in your browser)</label></label>
  <div class="wnav"><span class="muted">Free. Never pay a "finder" to search these for you.</span><button class="btn btn-primary btn-lg" id="u-go">Show my official searches →</button></div></div><div id="u-out"></div>`;
  const chips = e => { const b = e.target.closest('.chip'); if (b) b.classList.toggle('on'); };
  $('#u-ca').onclick = chips; $('#u-us').onclick = chips;
  const show = () => {
    const name = $('#u-n').value.trim(), other = $('#u-o').value.split(',').map(x => x.trim()).filter(Boolean);
    const places = [...app.querySelectorAll('#u-ca .chip.on, #u-us .chip.on')].map(b => b.textContent);
    const v = { name, other, places: places, remember: $('#u-r').checked };
    if (v.remember) store.set('uc', { name, other: other.join(', '), places, remember: true }); else localStorage.removeItem('lmu_uc');
    const ca = places.filter(x => PROVINCES.includes(x)), us = places.filter(x => STATES.includes(x));
    const names = [name, ...other].filter(Boolean);
    const split = n => { const w = n.split(/\s+/); return w.length > 1 ? { first: w.slice(0, -1).join(' '), last: w[w.length - 1] } : { first: '', last: n }; };
    const nameBox = names.length ? `<div class="panel namebox"><b>Names to search</b> <span class="muted">These official sites don't accept a name in the link, so copy and paste it. Search each name separately, and try last name only too.</span><div class="names">${names.map(n => { const s = split(n); return `<div class="nm"><span>${esc(n)}</span>${copyBtn(n, 'Copy full name')}${s.first ? copyBtn(s.last, 'Copy last name') + copyBtn(s.first, 'Copy first name') : ''}</div>`; }).join('')}</div></div>` : '';
    let html = nameBox;
    if (ca.length || !us.length) {
      html += `<div class="panel"><h2>🇨🇦 Canada: federal (search these no matter where you lived)</h2><ul class="rlist">${R.canada.federal.map(reslink).join('')}</ul>`;
      for (const pr of ca) { const L = R.canada.provinces[pr]; html += `<h2>${esc(pr)}</h2>` + (L ? `<ul class="rlist">${L.map(reslink).join('')}</ul>` : `<p class="muted">No provincial unclaimed property search exists for ${esc(pr)}. ${pr === 'Ontario' ? "Ontario's Unclaimed Intangible Property Act never took effect. " : ''}Use the Bank of Canada and CRA searches above.</p>`); }
      if (!ca.length) html += `<p class="muted">Provincial programs exist only in Quebec, Alberta, British Columbia and New Brunswick. Pick provinces above to see them.</p>`;
      html += '</div>';
    }
    if (us.length) {
      html += `<div class="panel"><h2>🇺🇸 United States: multi-state and federal</h2><ul class="rlist">${[...R.us.multi, ...R.us.federal].map(reslink).join('')}</ul><h2>Your states' official programs</h2><ul class="rlist">${us.map(st => { const u = R.usStates[st]; return u ? reslink({ name: `${st}: official unclaimed property search`, url: u, status: R.usHumanCheck.includes(st) ? 'human-check' : 'ok' }) : ''; }).join('')}</ul><p class="muted">MissingMoney.com covers most states at once, but not all. Search each state you lived or worked in as well.</p></div>`;
    }
    html += `<div class="panel prose"><h2>Tips</h2><ul><li>All of these searches are free. Some claims need ID and proof of a past address, so keep old bills or tax slips handy.</li><li>Ignore letters or calls that ask for a fee or a percentage to "recover" your money. Government programs pay you directly.</li><li>Links checked ${esc(R.checked)}. "Human check" means the official site shows a verify-you're-human step, which is normal.</li></ul></div>`;
    $('#u-out').innerHTML = html; $('#u-out').scrollIntoView({ behavior: 'smooth' });
  };
  $('#u-go').onclick = show;
  if (saved) show();
}

// ---------- REFUNDS & RECALLS ----------
async function refunds() {
  setNav('refunds');
  const R = await res(); const F = R.flights;
  app.innerHTML = `<div class="panel"><div class="kind">Flight refunds &amp; compensation</div><h1>Was your flight delayed, cancelled or overbooked?</h1><p class="sub">Answer a few questions to see what Canada's APPR, Europe's EU261 and the U.S. DOT rules say you may be owed. This is an estimate. The airline or regulator decides.</p>
  <p class="field"><span>1. Where did the flight go? (tick all that apply)</span></p>
  <div class="checks" id="fl-where"><label><input type="checkbox" value="ca"> To, from or within Canada</label><label><input type="checkbox" value="eu_dep"> Departed from an EU, Iceland, Norway or Switzerland airport (any airline)</label><label><input type="checkbox" value="eu_arr"> Arrived in the EU on an EU-based airline</label><label><input type="checkbox" value="uk"> Departed the UK (UK rules mirror EU261)</label><label><input type="checkbox" value="us"> To, from or within the United States</label></div>
  <div class="row2"><label class="field"><span>2. What happened?</span><select id="fl-what"><option value="delay">Delayed</option><option value="cancel">Cancelled</option><option value="bump">Bumped (denied boarding, flight overbooked)</option></select></label>
  <label class="field"><span>3. How late did you reach your final destination?</span><select id="fl-late"><option value="0">On time or under 1 hour</option><option value="1">1 to 2 hours</option><option value="2">2 to 3 hours</option><option value="3">3 to 4 hours</option><option value="4">4 to 6 hours</option><option value="6">6 to 9 hours</option><option value="9">9 hours or more / never got there</option></select></label></div>
  <div class="row2"><label class="field"><span>4. What reason did the airline give?</span><select id="fl-why"><option value="control">Their fault: crew, maintenance found on routine check, IT, overbooking, scheduling</option><option value="safety">Safety-related problem within their control (e.g. unexpected mechanical fault)</option><option value="outside">Outside their control: weather, air traffic control, security, strikes by others, medical emergency</option><option value="unknown">Not told / not sure</option></select></label>
  <label class="field"><span>5. When were you told?</span><select id="fl-notice"><option value="late">14 days or less before departure (or at the airport)</option><option value="early">More than 14 days before</option></select></label></div>
  <div class="row2"><label class="field"><span>6. Canada only: airline size</span><select id="fl-size"><option value="large">Large: ${esc(F.appr.largeAirlines)}</option><option value="small">Small / regional airline</option></select></label>
  <label class="field"><span>7. EU/UK only: flight distance</span><select id="fl-dist"><option value="1">1,500 km or less</option><option value="2">1,500 to 3,500 km (or any intra-EU flight over 1,500 km)</option><option value="3">More than 3,500 km (e.g. Toronto–Paris)</option></select></label></div>
  <div class="row2"><label class="field"><span>8. U.S. only: domestic or international?</span><select id="fl-usint"><option value="dom">Domestic (within the U.S.)</option><option value="int">International</option></select></label>
  <label class="field"><span>9. U.S. only: did you turn down the airline's new flight or voucher and not travel?</span><select id="fl-decline"><option value="yes">Yes, I declined / didn't travel</option><option value="no">No, I took the new flight</option></select></label></div>
  <label class="field" style="max-width:320px"><span>10. One-way fare paid (for U.S. bumping), optional</span><input id="fl-fare" type="number" min="0" placeholder="e.g. 250"></label>
  <div class="wnav"><span></span><button class="btn btn-primary btn-lg" id="fl-go">Check what I'm owed →</button></div><div id="fl-out"></div></div>
  <div class="panel" style="margin-top:16px"><div class="kind">Product &amp; vehicle recalls</div><h2>Check your car</h2><p class="muted">Your 17-character VIN is on the driver-side dashboard (visible through the windshield), the door jamb, or your registration and insurance card.</p>
  <div class="row2"><label class="field"><span>VIN</span><input id="vin" maxlength="17" placeholder="e.g. 1HGCM82633A004352" style="text-transform:uppercase"></label><div class="field"><span>&nbsp;</span><div id="vin-acts" class="muted">Enter your VIN to copy it, then open the official lookup.</div></div></div>
  <ul class="rlist">${R.recalls.canada.filter(l => /Transport/.test(l.name)).concat(R.recalls.us.filter(l => /NHTSA/.test(l.name))).map(reslink).join('')}</ul>
  <h2>Check a product, food or medicine</h2><div class="row2"><label class="field"><span>Product or brand</span><input id="prod" placeholder="e.g. crib, air fryer, peanut butter"></label><div class="field"><span>&nbsp;</span><div id="prod-acts" class="pills"></div></div></div>
  <ul class="rlist">${R.recalls.canada.filter(l => !/Transport/.test(l.name)).concat(R.recalls.us.filter(l => !/NHTSA/.test(l.name))).map(reslink).join('')}</ul>
  <p class="muted">Recall fixes are free. If a recalled product hurt you or a fix is refused, that may be a matter for a lawyer, not a settlement claim.</p></div>`;
  const qLinks = R.recalls.canada.concat(R.recalls.us).filter(l => l.q);
  $('#prod').oninput = () => { const v = $('#prod').value.trim(); $('#prod-acts').innerHTML = v ? qLinks.map(l => `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${esc(l.q + encodeURIComponent(v))}">Search ${esc(l.name.split(':')[0])} ↗</a>`).join(' ') : ''; };
  $('#vin').oninput = () => { const v = $('#vin').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); const ok = /^[A-HJ-NPR-Z0-9]{17}$/.test(v); $('#vin-acts').innerHTML = ok ? copyBtn(v, 'Copy VIN') + ' <span class="muted">then paste it into the lookup below.</span>' : v.length ? `<span class="muted">${v.length}/17 characters${/[IOQ]/.test(v) ? ' · VINs never contain I, O or Q' : ''}</span>` : 'Enter your VIN to copy it, then open the official lookup.'; };
  $('#fl-go').onclick = () => {
    const where = [...app.querySelectorAll('#fl-where input:checked')].map(i => i.value);
    const what = $('#fl-what').value, late = +$('#fl-late').value, why = $('#fl-why').value, notice = $('#fl-notice').value, size = $('#fl-size').value, dist = +$('#fl-dist').value, usint = $('#fl-usint').value, decline = $('#fl-decline').value === 'yes', fare = +$('#fl-fare').value || 0;
    if (!where.length) { $('#fl-out').innerHTML = '<div class="verdict v-maybe"><p>Tick where the flight went (question 1).</p></div>'; return; }
    const out = [];
    const box = (cls, title, body, links) => `<div class="verdict ${cls}"><div class="kind">${title}</div>${body}<p style="margin-top:8px">${links}</p></div>`;
    const money = (n, c = '$') => c + n.toLocaleString('en-US');
    if (where.includes('ca')) {
      const L = `<a href="${F.appr.url}" target="_blank" rel="noopener">CTA: delay &amp; cancellation rules ↗</a> · <a href="${F.appr.complaint}" target="_blank" rel="noopener">File a complaint with the CTA ↗</a>`;
      if (what === 'bump') {
        const amt = late >= 9 ? 2400 : late >= 6 ? 1800 : 900;
        out.push(why === 'outside' ? box('v-maybe', '🇨🇦 Canada (APPR): denied boarding', `<h3>Rebooking, but probably no cash</h3><p>If you were bumped for a reason outside the airline's control, it must rebook you but owes no compensation.</p>`, L)
          : box('v-likely', '🇨🇦 Canada (APPR): denied boarding', `<h3>About ${money(amt)} CAD</h3><p>For being bumped for a reason within the airline's control, based on how late you arrived (under 6h: $900, 6–9h: $1,800, 9h+: $2,400). The airline must pay as soon as it's practical, without you having to ask.</p>`, L));
      } else {
        const tiers = F.appr[size]; let amt = 0; for (const [h, a] of tiers) if (late >= h) amt = a;
        const refund = (what === 'cancel' || late >= 3) ? ' If you no longer wanted to travel, you can also ask for a <b>refund</b> of the unused ticket, even when the cause was outside the airline\'s control.' : '';
        if (why === 'control' && notice === 'late' && amt) out.push(box('v-likely', '🇨🇦 Canada (APPR)', `<h3>About ${money(amt)} CAD</h3><p>${size === 'large' ? 'Large' : 'Small'} airline, a disruption within its control and not needed for safety, and you arrived ${late >= 9 ? '9+' : late >= 6 ? '6–9' : '3–6'} hours late. Send the airline a written compensation request within <b>1 year</b>. It has 30 days to pay or explain why not.${refund}</p>`, L));
        else if (why === 'unknown' && notice === 'late' && amt) out.push(box('v-maybe', '🇨🇦 Canada (APPR)', `<h3>Maybe ${money(amt)} CAD</h3><p>That's what you'd get if the cause was within the airline's control and not needed for safety. Ask the airline in writing for the reason. It has to tell you.${refund}</p>`, L));
        else out.push(box('v-unlikely', '🇨🇦 Canada (APPR)', `<h3>No cash compensation likely</h3><p>${notice === 'early' ? 'You were told more than 14 days ahead. ' : ''}${why === 'outside' || why === 'safety' ? 'Disruptions outside the airline\'s control or needed for safety don\'t earn compensation. ' : ''}${!amt && notice === 'late' ? 'Compensation starts when you arrive 3+ hours late. ' : ''}You may still be owed rebooking, and meals and communication during long waits.${refund}</p>`, L));
      }
    }
    if (where.some(w => w === 'eu_dep' || w === 'eu_arr' || w === 'uk')) {
      const isUK = where.includes('uk') && !where.some(w => w.startsWith('eu')); const cur = isUK ? '£' : '€';
      const base = isUK ? [0, 220, 350, 520][dist] : [0, 250, 400, 600][dist];
      const L = `<a href="${F.eu261.url}" target="_blank" rel="noopener">EU: Your Europe air passenger rights ↗</a> · <a href="${F.eu261.uk}" target="_blank" rel="noopener">UK CAA: delays &amp; cancellations ↗</a>`;
      const qualifies = what === 'bump' ? why !== 'outside' : (what === 'delay' ? late >= 3 : notice === 'late') && why !== 'outside';
      const half = dist === 3 && late >= 3 && late < 4 && what === 'delay';
      const amt = half ? base / 2 : base;
      if (what === 'cancel' && late < 2) out.push(box('v-maybe', `🇪🇺 ${isUK ? 'UK261' : 'EU261'}`, `<h3>Maybe ${cur}${amt / 2}–${cur}${amt}</h3><p>Cancelled with less than 14 days' notice, but the replacement got you there close to schedule, so compensation can be cut by 50% or dropped. You're always owed a refund or rerouting.</p>`, L));
      else if (qualifies && why !== 'unknown') out.push(box('v-likely', `🇪🇺 ${isUK ? 'UK261' : 'EU261'}`, `<h3>${cur}${amt} per passenger</h3><p>${what === 'bump' ? 'Denied boarding against your will' : what === 'cancel' ? 'Cancellation with 14 days\' notice or less' : 'Arrival delay of 3+ hours'}${half ? ' (halved: a long-haul flight 3–4 hours late)' : ''}. Claim from the operating airline. It can refuse only for "extraordinary circumstances" such as weather or air traffic control.</p>`, L));
      else if (qualifies) out.push(box('v-maybe', `🇪🇺 ${isUK ? 'UK261' : 'EU261'}`, `<h3>Maybe ${cur}${amt}</h3><p>That's what you'd get unless the airline shows extraordinary circumstances. Ask it for the reason in writing.</p>`, L));
      else out.push(box('v-unlikely', `🇪🇺 ${isUK ? 'UK261' : 'EU261'}`, `<h3>No compensation likely</h3><p>${why === 'outside' ? 'Extraordinary circumstances (weather, air traffic control, security) are exempt. ' : ''}${what === 'delay' && late < 3 ? 'Compensation starts at a 3-hour arrival delay. ' : ''}${what === 'cancel' && notice === 'early' ? 'You were told 14+ days ahead. ' : ''}You're still owed care (meals, a hotel if overnight) and, for cancellations, a refund or rerouting.</p>`, L));
    }
    if (where.includes('us')) {
      const L = `<a href="${F.dot.url}" target="_blank" rel="noopener">DOT: automatic refund rule ↗</a> · <a href="${F.dot.bumping}" target="_blank" rel="noopener">DOT: bumping &amp; oversales ↗</a>`;
      const sig = usint === 'dom' ? 3 : 6;
      if (what === 'bump') {
        const lo = usint === 'dom' ? 1 : 1, hi = usint === 'dom' ? 2 : 4;
        const pct = late < lo ? 0 : late < hi ? 200 : 400, cap = pct === 200 ? 1075 : 2150;
        out.push(pct ? box('v-likely', '🇺🇸 U.S. DOT: involuntary bumping', `<h3>${pct}% of your one-way fare${fare ? `: about ${money(Math.min(cap, fare * pct / 100))}` : ''} (max ${money(cap)})</h3><p>Applies to flights departing the U.S. when you were bumped involuntarily from an oversold flight. If you volunteered, you get whatever you agreed to instead. You're also owed a refund of unused fees.</p>`, L)
          : box('v-unlikely', '🇺🇸 U.S. DOT: involuntary bumping', '<h3>No cash compensation</h3><p>The airline got you there within 1 hour of your original arrival.</p>', L));
      } else if ((what === 'cancel' || late >= sig) && decline) out.push(box('v-likely', '🇺🇸 U.S. DOT: refund', `<h3>Full cash refund, automatically</h3><p>${what === 'cancel' ? 'Your flight was cancelled' : `Your flight was changed or delayed ${sig}+ hours (${usint === 'dom' ? 'domestic' : 'international'})`} and you didn't accept the alternative, so the airline must refund the ticket and fees in cash (to your card within 7 business days), not a voucher.</p>`, L));
      else out.push(box('v-unlikely', '🇺🇸 U.S. DOT', `<h3>No federal cash compensation</h3><p>U.S. law doesn't require compensation for delays. ${what === 'cancel' || late >= sig ? 'You took the new flight, so no refund is due. ' : `Refunds apply to cancellations or ${sig}+ hour changes you decline. `}Check your airline's own commitments for meals, hotels or vouchers on delays it caused.</p>`, L));
    }
    $('#fl-out').innerHTML = out.join('') + '<p class="muted">Estimates only, not legal advice. Keep your boarding pass, booking reference and receipts, and claim from the airline in writing first.</p>';
  };
}

// ---------- BUSINESS ----------
const BIZ_IND = [['food', 'Restaurant, grocery or food distributor', ['beef', 'meat', 'restaurant', 'grocery', 'food distributor', 'wholesale']], ['construction', 'Construction, contractor or builder', ['concrete', 'ready-mix', 'construction', 'contractor', 'builder']], ['farm', 'Farm or agriculture', ['john deere', 'tractor', 'farm', 'agriculture']], ['health', 'Health plan, self-insured employer or pharmacy', ['generic drugs', 'health plan', 'self-insured employer', 'third-party payer', 'pharmacy']], ['invest', 'Holds investments (stocks, options, funds)', ['stock', 'options', 'investor', 'securities', 'mutual fund', 'fund']], ['property', 'Owns buildings or property with solar panels', ['solar panels', 'building owner', 'property']], ['cards', 'Accepted Visa or Mastercard', []]];
function business() {
  setNav('business');
  const b = store.get('biz', { country: 'all', ind: [] });
  const list = ALL.filter(s => s.audience === 'business' || s.audience === 'both');
  app.innerHTML = `<div class="panel"><div class="kind">For businesses</div><h1>Settlements your business may be owed</h1><p class="sub">In many antitrust and price-fixing cases, the class members are businesses that bought directly from the defendants, often for large sums. Tell us a little about the business.</p>
  <div class="row2"><label class="field"><span>Where is the business?</span><select id="b-c"><option value="all">U.S. or Canada</option><option value="US" ${b.country === 'US' ? 'selected' : ''}>🇺🇸 United States</option><option value="CA" ${b.country === 'CA' ? 'selected' : ''}>🇨🇦 Canada</option></select></label><span></span></div>
  <p class="field"><span>What does the business do or have? (tick all that apply)</span></p><div class="checks" id="b-ind">${BIZ_IND.map(([k, l]) => `<label><input type="checkbox" value="${k}" ${b.ind.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
  <div class="panel tips"><b>Questions every business claim asks</b><ul><li>Are you filing for a business, farm or organization (legal name, EIN/BN, address during the class period)?</li><li>Did you buy <b>directly</b> from a defendant (invoices in your name), or through a distributor? Many cases cover only direct purchasers.</li><li>Was the purchase for use or delivery in the covered country?</li><li>Do you have invoices, statements, or a Claim ID/PIN from a mailed notice?</li></ul></div>
  <div class="wnav"><span class="muted">${list.length} open settlements where businesses can be class members.</span><button class="btn btn-primary btn-lg" id="b-go">Show matches →</button></div></div><div id="b-out"></div>`;
  const show = () => {
    const country = $('#b-c').value, ind = [...app.querySelectorAll('#b-ind input:checked')].map(i => i.value); store.set('biz', { country, ind });
    const kws = BIZ_IND.filter(([k]) => ind.includes(k)).flatMap(x => x[2]);
    const rows = list.filter(s => country === 'all' || s.country === country).map(s => { const hits = kws.filter(k => (s.tags || []).includes(k)); return { s, score: hits.length * 10 + (s.audience === 'business' ? 2 : 0), hits }; }).sort((a, c) => c.score - a.score);
    const visa = ind.includes('cards') && country !== 'CA' ? `<div class="verdict v-info"><div class="kind">🇺🇸 Visa/Mastercard interchange fee settlement ($5.5B)</div><h3>Claims closed Feb 4, 2025. Payments are being made</h3><p>The class covered businesses that accepted Visa or Mastercard in the U.S. from Jan 1, 2004 to Jan 25, 2019. If you filed, check your claim and payment status in the Merchant Portal; payments for the second partial distribution go out on a rolling basis from September 2026. Call 1-800-625-6440 with questions. Ignore paid "claims services": the court has warned about some of them.</p><p style="margin-top:8px"><a href="https://www.paymentcardsettlement.com/en" target="_blank" rel="noopener">Official settlement site and Merchant Portal ↗</a></p></div>` : '';
    $('#b-out').innerHTML = visa + `<div class="grid">${rows.map(({ s, hits }) => card(s, `<div class="pills">${s.audience === 'business' ? '<span class="pill amber">Businesses only</span>' : '<span class="pill">Businesses &amp; individuals</span>'}</div>`, hits.length ? '<span class="elig strong">Fits your business</span>' : '')).join('')}</div>`;
    $('#b-out').scrollIntoView({ behavior: 'smooth' });
  };
  $('#b-go').onclick = show;
  if (b.ind.length) show();
}

// ---------- WATCH ----------
function setBadge(n) { const el = $('#watch-badge'); if (!el) return; el.textContent = n; el.hidden = !n; }
async function watchMatches(w) { const { results } = await api('/api/qualify', w.profile); return results.map(r => ({ ...r, isNew: !w.seen.includes(r.id) })); }
async function checkWatch() { const w = store.get('watch', null); if (!w) return setBadge(0); try { const r = await watchMatches(w); setBadge(r.filter(x => x.isNew).length); } catch {} }
async function watchView() {
  setNav('watch');
  const w = store.get('watch', null);
  const emailNote = `<p class="muted"><b>Email alerts aren't available yet.</b> LawMeUp doesn't store anything about you on its server, so alerts show here as a badge on <b>Watch</b> instead. If email alerts are added, they'll need you to confirm your address (double opt-in) and every email will have an unsubscribe link.</p>`;
  if (!w) { app.innerHTML = `<div class="panel prose"><div class="kind">Watch mode</div><h1>Get told about new settlements that fit you</h1><p>Run <a href="#/qualify">Find what I qualify for</a> and press <b>Save &amp; watch</b> on your results. LawMeUp keeps your profile in this browser, and each time you visit after the daily refresh it shows settlements that are new for you.</p>${emailNote}<a class="btn btn-primary btn-lg" href="#/qualify">Set up my profile →</a></div>`; return; }
  app.innerHTML = '<div class="loading">Checking for new matches…</div>';
  const r = await watchMatches(w); const fresh = r.filter(x => x.isNew);
  setBadge(fresh.length);
  const p = w.profile;
  app.innerHTML = `<div class="panel"><div class="kind">Watch mode</div><h1>${fresh.length ? `${fresh.length} new match${fresh.length === 1 ? '' : 'es'} since you saved` : 'No new matches yet'}</h1>
  <p class="sub">Watching since ${new Date(w.saved).toLocaleDateString('en-US', { dateStyle: 'medium' })} for ${esc(p.region || '')}${p.country ? ' (' + esc(p.country) + ')' : ''}${p.keywords?.length ? ' · ' + esc(p.keywords.slice(0, 8).join(', ')) : ''}${p.vehicles?.length ? ' · ' + esc(p.vehicles.join(', ')) : ''}. Settlements are refreshed daily.</p>
  <div class="pills" style="gap:8px"><button class="btn btn-dark" id="w-seen" ${fresh.length ? '' : 'disabled'}>Mark all as seen</button><a class="btn btn-ghost" href="#/qualify">Edit profile</a><button class="btn btn-ghost" id="w-stop">Stop watching</button></div>${emailNote}</div>
  ${fresh.length ? `<h2 class="sec">New for you</h2><div class="grid">${fresh.map(x => card(x.settlement, '', '<span class="elig new">New for you</span>')).join('')}</div>` : ''}
  <h2 class="sec">All your current matches (${r.length})</h2><div class="grid">${r.filter(x => !x.isNew).map(x => card(x.settlement)).join('')}</div>`;
  $('#w-seen').onclick = () => { w.seen = [...new Set([...w.seen, ...r.map(x => x.id)])]; store.set('watch', w); watchView(); };
  $('#w-stop').onclick = () => { localStorage.removeItem('lmu_watch'); setBadge(0); watchView(); };
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
  else if (p === '/unclaimed') await unclaimed();
  else if (p === '/refunds') await refunds();
  else if (p === '/business') business();
  else if (p === '/watch') await watchView();
  else home();
  if (!p.startsWith('/browse')) window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
window.addEventListener('hashchange', route);
route();
})();
