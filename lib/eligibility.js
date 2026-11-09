// Rule-based eligibility: fast, deterministic, no AI needed.
const DAY = 864e5;
function daysLeft(deadline, now = new Date()) { if (!deadline) return null; const end = Date.parse(deadline + 'T23:59:59-05:00'); return Math.ceil((end - now.getTime()) / DAY); }
const clean = q => q.replace(/^(Is this true for you\?|Does this describe you\?)\s*/, '');

function evaluate(s, answers = {}, profile = {}) {
  const matched = [], blockers = [], uncertain = [], concerns = [], notes = [];
  let proofAnswer = null;
  for (const q of s.questions) {
    const a = answers[q.id];
    const text = clean(q.q);
    if (q.kind === 'info') { if (/proof|records|receipt|statement/i.test(q.q)) proofAnswer = a; if (a === 'yes') matched.push('Bonus: ' + text); continue; }
    if (a === 'yes') matched.push(text);
    else if (a === 'no') (q.kind === 'req' ? blockers : concerns).push(text);
    else (q.kind === 'req' ? uncertain : concerns).push(text + ' (not sure)');
  }
  const dl = daysLeft(s.deadline);
  let verdict;
  if (dl !== null && dl < 0) verdict = 'closed';
  else if (blockers.length) verdict = 'unlikely';
  else if (uncertain.length || concerns.some(c => !/not sure/.test(c))) verdict = 'maybe';
  else verdict = 'likely';

  // Location sanity check against the user's profile
  if (profile.country && profile.country !== s.country) notes.push(`This is a ${s.country === 'US' ? 'U.S.' : 'Canadian'} settlement and you said you live in ${profile.country === 'CA' ? 'Canada' : 'the U.S.'}. You can still qualify if the qualifying purchase/event happened there.`);
  const lim = (s.region && (s.region.states?.length ? s.region.states : s.region.provinces?.length ? s.region.provinces : null));
  if (lim && profile.region && !lim.includes(profile.region)) notes.push(`Limited to ${lim.join(', ')}. You said you live in ${profile.region}; you qualify only if the qualifying event happened there.`);

  if (s.proof === 'Yes') notes.push(proofAnswer === 'no' ? 'Proof is required for this settlement and you said you don\'t have it. You may only qualify for a lower tier, or the claim may be denied.' : 'Proof is required. Gather the documents listed below before you file.');
  else if (s.proof === 'No') notes.push('No proof of purchase is required to file.');
  if (dl !== null && dl >= 0 && dl <= 14) notes.push(`Deadline is in ${dl} day${dl === 1 ? '' : 's'}. File soon.`);
  if (!s.deadline) notes.push('No fixed deadline is listed. Confirm the claim period is still open on the official site.');

  const total = s.questions.filter(q => q.kind !== 'info').length || 1;
  const score = Math.round(100 * (matched.filter(m => !m.startsWith('Bonus')).length) / total);
  const headline = { likely: 'You likely qualify', maybe: 'You might qualify', unlikely: 'You probably don\'t qualify', closed: 'This claim deadline has passed' }[verdict];
  return { verdict, headline, score, matched, blockers, uncertain, concerns, notes, days_left: dl, deadline: s.deadline, payout: s.payout, payout_range: s.payout_range, docs: s.docs, why: s.why, claim_url: s.claim_url };
}

// "Find what I qualify for": rank settlements against a general profile.
const SITUATIONS = {
  breach_notice: { label: 'I got a data-breach notice letter or email', cats: ['data_breach'], w: 2 },
  spam: { label: 'I get spam texts, robocalls or junk faxes from companies', cats: ['telemarketing'], w: 2 },
  health_sites: { label: 'I use hospital/clinic portals, pharmacy or telehealth apps', cats: ['privacy', 'health'], kw: ['patient portal', 'pharmacy', 'telehealth'], w: 2 },
  car: { label: 'I own or lease a car', cats: ['vehicle'], w: 1 },
  renter: { label: 'I rent an apartment', kw: ['rent', 'apartment', 'tenant'], cats: ['housing'], w: 3 },
  atm: { label: 'I\'ve paid fees at non-bank ATMs (stores, bars, venues)', kw: ['atm'], w: 6 },
  investor: { label: 'I invest in stocks or mutual funds', cats: ['securities'], w: 2 },
  bank_dispute: { label: 'A bank denied my fraud dispute or I had a fraudulent loan opened', kw: ['dispute denied', 'loan fraud', 'atm fraud'], w: 4 },
  credit_dispute: { label: 'I disputed something on my credit report', kw: ['credit report', 'hard inquiry', 'credit dispute'], w: 4 },
  giftcard_scam: { label: 'I was scammed into buying gift cards (e.g., iTunes / Apple)', kw: ['gift card scam'], w: 12 },
  gov_account: { label: 'I have a CRA My Account / GCKey (Canada)', kw: ['cra', 'gckey'], w: 6 },
  hourly_job: { label: 'I work(ed) an hourly job or applied for jobs in Washington State', cats: ['employment'], w: 1 },
  incarcerated: { label: 'I was held in a provincial jail or correctional centre', kw: ['inmate', 'solitary confinement', 'lockdown'], w: 6 },
  indigenous: { label: 'I\'m First Nations, Métis or Inuit', kw: ['indigenous', 'first nations'], w: 4 },
  foster: { label: 'I was in foster / child-welfare care', kw: ['foster care', 'child welfare'], w: 5 },
  online_shop: { label: 'I shop online a lot (Amazon etc.) and return items', kw: ['amazon return'], w: 5 },
  iphone: { label: 'I bought an iPhone 15 Pro or iPhone 16', kw: ['iphone 16', 'iphone 15 pro'], w: 12 },
  smoker: { label: 'I was diagnosed with a smoking-related disease', kw: ['tobacco'], w: 8 },
};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function qualify(all, p = {}) {
  const kws = [...new Set((p.keywords || []).map(k => String(k).toLowerCase().trim()).filter(k => k.length > 1))];
  const sits = (p.situations || []).filter(k => SITUATIONS[k]);
  const makes = (p.vehicles || []).map(v => v.toLowerCase());
  const out = [];
  for (const s of all) {
    const dl = daysLeft(s.deadline); if (dl !== null && dl < 0) continue;
    if (s.audience === 'business' && !p.business) continue;
    if (p.country && !p.include_other && s.country !== p.country) continue;
    let score = 0; const reasons = [];
    const hay = (s.name + ' ' + s.defendant + ' ' + s.class_definition + ' ' + (s.tags || []).join(' | ')).toLowerCase();
    for (const k of kws) {
      const re = new RegExp('(^|[^a-z0-9])' + esc(k) + '([^a-z0-9]|$)');
      if ((s.tags || []).some(t => t === k) || re.test(hay)) { score += 12; reasons.push(`You mentioned "${k}"`); }
    }
    for (const m of makes) if (s.category === 'vehicle' && new RegExp('\\b' + esc(m) + '\\b').test(hay)) { score += 12; reasons.push(`You have a ${m[0].toUpperCase() + m.slice(1)}`); }
    for (const k of sits) {
      const S = SITUATIONS[k]; let hit = false;
      if (S.cats && S.cats.includes(s.category)) hit = true;
      if (S.kw && S.kw.some(w => hay.includes(w))) hit = true;
      if (hit) { score += S.w; reasons.push(S.label); }
    }
    if (!score) continue;
    const lim = s.region?.states?.length ? s.region.states : s.region?.provinces?.length ? s.region.provinces : null;
    if (lim && p.region) { if (lim.includes(p.region)) { score += 3; reasons.push(`Covers ${p.region}`); } else { score -= 4; reasons.push(`Limited to ${lim.join(', ')}`); } }
    if (s.country === p.country) score += 1;
    if (s.featured) score += 1;
    out.push({ id: s.id, score, reasons: [...new Set(reasons)], strength: score >= 12 ? 'strong' : score >= 5 ? 'possible' : 'weak' });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 40);
}
module.exports = { evaluate, qualify, daysLeft, SITUATIONS };
