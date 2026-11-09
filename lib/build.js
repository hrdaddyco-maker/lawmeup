// Builds data/settlements.json from (1) a live scrape of classaction.org's open-settlement list,
// (2) hand-reviewed enrichments + Canadian records in data/curated.js, and (3) URL checks on every official claim site.
const fs = require('fs'), path = require('path');
const curated = require('../data/curated.js');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Puerto Rico'];
const dec = s => String(s || '').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&#8217;|’/g, "'").replace(/&quot;|&ldquo;|&rdquo;|“|”/g, '"').replace(/&ndash;|–/g, '-').replace(/&nbsp;/g, ' ').replace(/&bullet;/g, '•').replace(/&[a-z]+;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function scrapeClassActionOrg() {
  const h = await (await fetch('https://www.classaction.org/settlements', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) })).text();
  const out = new Map();
  const re = /<div id="([^"]+)"[^>]*class="[^"]*settlement-card([\s\S]*?)Share<\/button>/g; let m;
  while ((m = re.exec(h))) {
    const [_, slug, b] = m; const g = r => { const x = b.match(r); return x ? dec(x[1]) : ''; };
    const url = (b.match(/href="([^"]+)" class="js-settlement-link/) || [])[1] || '';
    out.set(slug, { slug, name: g(/data-name="([^"]+)"/), url: dec(url), payout: g(/Payout<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/), deadline: g(/Deadline<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/), proof: g(/Required\?<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/), summary: g(/<p class="f6[^"]*"[^>]*>([\s\S]*?)<\/p>/), source: 'https://www.classaction.org/settlements#' + slug });
  }
  return [...out.values()];
}

function isoDeadline(s) { const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); return m ? `20${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; }
function payoutRange(s) { const n = [...String(s).replace(/,/g, '').matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map(x => +x[1]); return n.length ? { min: Math.min(...n), max: Math.max(...n), upTo: /up to/i.test(s) } : null; }
function category(name, sum) {
  const t = (name + ' ' + sum).toLowerCase();
  if (/data breach|data security incident|cyber/.test(t)) return 'data_breach';
  if (/data privacy|biometric|privacy|tracking/.test(t)) return 'privacy';
  if (/unwanted (texts|calls|faxes)|text message|pre-recorded|robocall|fax/.test(t)) return 'telemarketing';
  if (/job posting|wage|employee|employed|worked for|labor law|401\(k\)|unused vacation|background check|faculty|cobra|welfare benefits/.test(t)) return 'employment';
  if (/\b(kia|hyundai|toyota|ford|gm|ram|dodge|nissan|chevrolet|gmc|infiniti|vehicle)\b/.test(t)) return 'vehicle';
  if (/securities|stock|retirement account|mutual fund/.test(t)) return 'securities';
  if (/overdraft|bank|credit union|loan|equifax|credit report|mortgage|insurance|atm|gift card|credit repair/.test(t)) return 'financial';
  if (/ticket|fee|surcharge|admission|parking/.test(t)) return 'fees';
  if (/hospital|medical|health|surgery|prescription|testing|drug|patient/.test(t)) return 'health';
  if (/rent|tenant|apartment|residence|property|landfill|fire/.test(t)) return 'housing';
  if (/correction|strip search|city of|county|commission|university|school/.test(t)) return 'government';
  return 'consumer_product';
}
const CAT_LABEL = { data_breach: 'Data breach', privacy: 'Online privacy / tracking', telemarketing: 'Spam texts & calls', employment: 'Work & jobs', vehicle: 'Vehicles', securities: 'Investments', financial: 'Banking, credit & insurance', fees: 'Fees & tickets', health: 'Health & pharmacy', housing: 'Housing & property', government: 'Government & institutions', consumer_product: 'Products & shopping', injury: 'Injury & safety' };
const WHY = {
  data_breach: d => `Plaintiffs allege ${d} failed to adequately protect the personal information it held, leading to a data breach that exposed people's data and put them at risk of identity theft. ${d} typically denies wrongdoing; the settlement pays for lost time, out-of-pocket losses and sometimes a flat cash amount.`,
  privacy: d => `The lawsuit alleges ${d} shared or collected users' personal information (often through website tracking pixels, cookies or biometric scans) without proper notice or consent, in violation of privacy laws. ${d} denies wrongdoing.`,
  telemarketing: d => `Plaintiffs allege ${d} sent marketing texts, calls or faxes without the consent required by the Telephone Consumer Protection Act (TCPA) or similar state laws.`,
  employment: d => `The lawsuit alleges ${d} violated employment or job-application laws (for example, unpaid wages, missing pay-range disclosures in Washington job postings, or benefits-notice rules).`,
  vehicle: d => `Owners allege certain ${d} vehicles have a defect that the company knew about or failed to fix properly. The settlement typically reimburses repair costs and/or extends warranty coverage.`,
  securities: d => `Investors allege ${d} or related parties made misleading statements or charged improper fees that cost investors money.`,
  financial: d => `The lawsuit alleges ${d} charged improper fees or mishandled customers' accounts or credit information in violation of consumer finance laws.`,
  fees: d => `The lawsuit alleges ${d} charged hidden or improper fees, or advertised prices that left out mandatory charges.`,
  health: d => `The lawsuit alleges ${d} overcharged or harmed patients or customers in connection with medical services or products.`,
  housing: d => `Residents allege ${d} caused them harm or losses connected to their homes or property.`,
  government: d => `The lawsuit alleges ${d} violated people's rights through its policies or practices.`,
  consumer_product: d => `Buyers allege ${d} misrepresented its products or prices, or sold products that did not live up to what was advertised.`,
};
const DOCS = {
  data_breach: ['Notice letter / Class Member ID if you received one', 'Receipts for out-of-pocket losses (credit monitoring, fraud) for larger payments', 'An estimate of hours spent dealing with the breach'],
  telemarketing: ['The phone number (or fax number) that was contacted', 'Screenshots of the messages, if you have them'],
  employment: ['Employment dates, job title and location', 'Pay stubs or employee ID if available'],
  vehicle: ['VIN and proof of ownership/lease', 'Repair invoices and receipts'],
  securities: ['Brokerage statements / trade confirmations'],
};

function claimText(sum) {
  let s = sum.replace(/\s+/g, ' ').trim();
  const m = s.match(/\bif (?:you|your)\b([\s\S]*?)(?:,? you may [\s\S]*)?$/i);
  if (m) { let c = s.slice(s.toLowerCase().indexOf(' if ') + 4); c = c.replace(/,? you may (be|have)[\s\S]*$/i, '').replace(/,? this settlement may[\s\S]*$/i, '').replace(/\.$/, ''); return c.charAt(0).toUpperCase() + c.slice(1); }
  return null;
}
function regionOf(name, sum) {
  const t = name + ' ' + sum; const found = STATES.filter(st => new RegExp('\\b' + st + '\\b').test(t) && !(st === 'Washington' && /Washington (Nationals|Gastroenterology)|District of Columbia/.test(t) && !/in Washington/.test(t)));
  return found.length && found.length < 10 ? { states: found, note: found.join(', ') } : { states: [], note: 'United States (nationwide)' };
}
function autoQuestions(x, cat, region) {
  const ct = claimText(x.summary);
  const q = [{ id: 'core', kind: 'req', q: ct ? 'Is this true for you? ' + ct + '.' : 'Does this describe you? ' + x.summary.replace(/ may be covered by this settlement/i, '') }];
  if (region.states.length && !region.states.every(st => q[0].q.includes(st))) q.push({ id: 'state', kind: 'req', q: `Did this happen while you lived in or were in ${region.states.join(' / ')}?` });
  else q.push({ id: 'us', kind: 'req', q: 'Did this happen in the United States?' });
  if (cat === 'data_breach') q.push({ id: 'notice', kind: 'strong', q: `Did you receive a letter or email from ${x.defendant} (or the settlement administrator) saying your information was involved?` });
  if (cat === 'telemarketing') q.push({ id: 'number', kind: 'strong', q: 'Do you still know the phone number that received the messages or calls?' });
  if (/^yes/i.test(x.proof)) q.push({ id: 'proof', kind: 'info', q: 'Do you have proof (receipts, statements, records) for this?' });
  return q;
}
function allegationsFromPage(slug) { try { const p = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pages_text.json'))); return (p[slug] && p[slug].allege) || []; } catch { return []; } }

async function checkUrl(u) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    const body = r.status === 403 || r.status === 503 ? await r.text().catch(() => '') : '';
    const challenge = /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(body) || r.headers.get('cf-mitigated') === 'challenge';
    return { status: r.status, ok: r.ok || challenge, note: r.ok ? 'resolves' : challenge ? 'live (bot-protected; opens in a normal browser)' : 'error ' + r.status, final: r.url };
  } catch (e) { return { status: 0, ok: false, note: 'unreachable: ' + (e.cause?.code || e.name) }; }
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

async function build({ raw, today = new Date(), checks = true, prev = {} } = {}) {
  raw = raw || await scrapeClassActionOrg();
  const todayIso = today.toISOString().slice(0, 10);
  const recs = [];
  for (const x of raw) {
    const c = curated.us[x.slug] || {};
    const deadline = isoDeadline(x.deadline);
    if (deadline && deadline < todayIso) continue; // closed
    const defendant = c.defendant || x.name.split(/ - | – /)[0].replace(/\s*\(.*?\)\s*/g, ' ').trim();
    const cat = c.category || category(x.name, x.summary);
    const region = c.region ? { states: [], ...c.region } : regionOf(x.name, x.summary);
    const al = allegationsFromPage(x.slug).map(dec).filter(s => s.length > 60 && !/^In the Lawsuit, the Plaintiffs allege that Dr\.$/.test(s)).slice(0, 2);
    recs.push({
      id: x.slug, name: x.name.replace(/\s+Class Action Settlement$/, '') + ' Settlement', defendant, country: 'US', region, category: cat, category_label: CAT_LABEL[cat],
      class_definition: x.summary, deadline, deadline_text: deadline ? null : 'Varies / ongoing (check official site)',
      payout: x.payout || 'Varies', payout_range: payoutRange(x.payout), proof: /^yes/i.test(x.proof) ? 'Yes' : /^no/i.test(x.proof) ? 'No' : 'Varies',
      claim_url: x.url, source: x.source, source_name: 'ClassAction.org open settlements list',
      why: c.why || (al.length ? al.join(' ') : WHY[cat](defendant)), why_source: c.why ? 'reviewed' : al.length ? 'official site' : 'general background for this case type',
      questions: c.questions || autoQuestions({ ...x, defendant }, cat, region), questions_source: c.questions ? 'reviewed' : 'auto-generated from class definition',
      docs: c.docs || DOCS[cat] || (/^yes/i.test(x.proof) ? ['Proof of purchase or records showing you are in the class'] : ['No proof required; basic contact details']),
      tags: [...new Set([...(c.tags || []), ...defendant.toLowerCase().split(/[,&]| and /).map(s => s.replace(/\b(inc|llc|corp|corporation|company|co)\b\.?/g, '').trim()).filter(s => s.length > 2)])],
      featured: !!curated.us[x.slug],
    });
  }
  for (const c of curated.ca) {
    if (c.deadline && c.deadline < todayIso) continue;
    recs.push({ ...c, category_label: CAT_LABEL[c.category], payout_range: payoutRange(c.payout), source_name: 'Official administrator / Canadian class action trackers', why_source: 'reviewed', questions_source: 'reviewed', featured: true, region: { states: [], provinces: [], ...c.region } });
  }
  if (checks) {
    const res = await pool(recs, 16, r => prev[r.claim_url] && Date.now() - prev[r.claim_url].at < 7 * 864e5 ? prev[r.claim_url] : checkUrl(r.claim_url).then(v => ({ ...v, at: Date.now() })));
    recs.forEach((r, i) => { r.url_check = { ...res[i], checked_at: new Date(res[i].at).toISOString() }; });
  }
  const live = recs.filter(r => !r.url_check || r.url_check.ok);
  const dropped = recs.filter(r => r.url_check && !r.url_check.ok).map(r => ({ id: r.id, url: r.claim_url, why: r.url_check.note }));
  live.sort((a, b) => (b.featured - a.featured) || ((a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1));
  return { generated_at: new Date().toISOString(), count: live.length, sources: ['https://www.classaction.org/settlements', 'https://www.canooq.ca/blog/current-class-action-settlements-canada-deadlines-payouts', 'https://settleworth.co/settlements', 'Official settlement administrator sites (each record links its own)'], dropped, settlements: live };
}
module.exports = { build, scrapeClassActionOrg, checkUrl, CAT_LABEL };

if (require.main === module) {
  (async () => {
    const file = path.join(__dirname, '../data/settlements.json');
    let prev = {}; try { for (const s of JSON.parse(fs.readFileSync(file)).settlements) if (s.url_check) prev[s.claim_url] = { ...s.url_check, at: Date.parse(s.url_check.checked_at) }; } catch {}
    const d = await build({ prev });
    fs.writeFileSync(file, JSON.stringify(d, null, 1));
    console.log('settlements:', d.count, 'dropped (dead claim URL):', d.dropped.length, d.dropped.map(x => x.id + ' ' + x.why).join('; '));
  })().catch(e => { console.error(e); process.exit(1); });
}
