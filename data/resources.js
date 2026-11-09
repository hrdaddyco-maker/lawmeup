// Official sources only. Each link was checked on 2026-11-09 (status noted). "human-check" = the site is live but shows a bot/"verify you are human" step to scripts.
// None of these sites accept a name in the URL (tested Bank of Canada, Kelmar-platform states, Texas, MissingMoney), so the UI offers "copy name" instead of prefilling.
const V = '2026-11-09';
const L = (name, url, note, status = 'ok', extra = {}) => ({ name, url, note, status, checked: V, ...extra });

const canada = {
  federal: [
    L('Bank of Canada: unclaimed bank balances', 'https://www.unclaimedproperties.bankofcanada.ca/app/claim-search', 'Bank accounts, GICs, drafts and money orders at federally regulated banks/trust companies left inactive 10+ years. Search by last name (and first name / province).', 'ok', { searchable: true }),
    L('CRA: uncashed cheques (via My Account)', 'https://www.canada.ca/en/revenue-agency/services/uncashed-cheque.html', 'Tax refunds, GST/HST credit, CCB and provincial benefit cheques older than 6 months. Sign in to CRA My Account, select "Uncashed cheques". Or call 1-800-959-8281 (refunds) / 1-800-387-1193 (benefits).', 'ok (fetched via web reader)'),
    L('CRA My Account sign-in', 'https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html', 'Where the "Uncashed cheques" tool lives (needs identity-verified access).', 'ok (listed on CRA page)'),
    L('Service Canada: EI, CPP and OAS payments (My Service Canada Account)', 'https://www.canada.ca/en/employment-social-development/services/my-account.html', 'No online uncashed-cheque search. Sign in to check payments, or call CPP/OAS 1-800-277-9914 or the EI line to trace and reissue an uncashed EI/CPP/OAS cheque.', 'ok (fetched via web reader)'),
  ],
  provinces: {
    'Quebec': [L('Revenu Québec: Register of Unclaimed Property (search)', 'https://www5.services.mrq.gouv.qc.ca/MrqAnonyme/BR/BR01/BR01A1_01A_ConsulterBNR_PC/P_Consultation.aspx?CLNG=A', 'Free search by your name, a relative\'s name or a business name: inactive Quebec financial assets, unclaimed successions and other property. Also check "My Account for individuals".', 'human-check'), L('Revenu Québec: unclaimed property (how to claim)', 'https://www.revenuquebec.ca/en/unclaimed-property/', 'How claims work, required forms and warnings about paid heir-finders.', 'human-check (confirmed via search index; site blocks automated checks)')],
    'Alberta': [L('Alberta: unclaimed property', 'https://www.alberta.ca/unclaimed-property', 'Alberta Treasury Board and Finance unclaimed property search.')],
    'British Columbia': [L('BC Unclaimed Property Society', 'https://www.bcunclaimed.ca/', 'BC\'s legislated unclaimed property program (search and claim).')],
    'New Brunswick': [L('FundsFinderNB (FCNB)', 'https://fcnb.ca/en/programs/fundsfindernb', 'New Brunswick\'s unclaimed property program run by the Financial and Consumer Services Commission.')],
  },
  noProgram: 'Ontario, Manitoba, Saskatchewan, Nova Scotia, PEI, Newfoundland and Labrador and the territories have no general provincial unclaimed property search (Ontario\'s Unclaimed Intangible Property Act never took effect). Use the Bank of Canada and CRA searches above.',
};

const usStates = {
  'Alabama': 'https://unclaimed.alabama.gov/app/claim-search', 'Alaska': 'https://unclaimedproperty.alaska.gov/', 'Arizona': 'https://azdor.gov/unclaimed-property', 'Arkansas': 'https://www.claimitar.gov/',
  'California': 'https://www.sco.ca.gov/search_upd.html', 'Colorado': 'https://unclaimedproperty.colorado.gov/', 'Connecticut': 'https://ctbiglist.gov/', 'Delaware': 'https://unclaimedproperty.delaware.gov/',
  'District of Columbia': 'https://unclaimedproperty.dc.gov/', 'Florida': 'https://www.fltreasurehunt.gov/', 'Georgia': 'https://dor.georgia.gov/unclaimed-property', 'Hawaii': 'https://budget.hawaii.gov/finance/unclaimedproperty/',
  'Idaho': 'https://yourmoney.idaho.gov/', 'Illinois': 'https://icash.illinoistreasurer.gov/', 'Indiana': 'https://www.indianaunclaimed.gov/', 'Iowa': 'https://www.greatiowatreasurehunt.gov/',
  'Kansas': 'https://kansascash.ks.gov/', 'Kentucky': 'https://treasury.ky.gov/unclaimedproperty/Pages/overview.aspx', 'Louisiana': 'https://lacashclaim.org/', 'Maine': 'https://www.maineunclaimedproperty.gov/',
  'Maryland': 'https://www.claimitmd.gov/', 'Massachusetts': 'https://www.findmassmoney.gov/', 'Michigan': 'https://unclaimedproperty.michigan.gov/', 'Minnesota': 'https://mn.gov/commerce/money/unclaimed-property/',
  'Mississippi': 'https://treasury.ms.gov/for-citizens/unclaimed-property/', 'Missouri': 'https://treasurer.mo.gov/UnclaimedProperty/', 'Montana': 'https://revenue.mt.gov/unclaimed-property/', 'Nebraska': 'https://treasurer.nebraska.gov/up/',
  'Nevada': 'https://www.nevadatreasurer.nv.gov/', 'New Hampshire': 'https://www.findnhmoney.gov/', 'New Jersey': 'https://www.nj.gov/treasury/unclaimed-property/', 'New Mexico': 'https://www.tax.newmexico.gov/individuals/what-is-unclaimed-property/search-unclaimed-property/',
  'New York': 'https://www.osc.ny.gov/unclaimed-funds', 'North Carolina': 'https://www.nccash.gov/', 'North Dakota': 'https://unclaimedproperty.nd.gov/', 'Ohio': 'https://unclaimedfunds.ohio.gov/app/claim-search',
  'Oklahoma': 'https://yourmoney.ok.gov/', 'Oregon': 'https://unclaimed.oregon.gov/app/claim-search', 'Pennsylvania': 'https://www.patreasury.gov/unclaimed-property/', 'Rhode Island': 'https://www.findrimoney.gov/',
  'South Carolina': 'https://treasurer.sc.gov/what-we-do/for-citizens/unclaimed-property-program/', 'South Dakota': 'https://southdakota.findyourunclaimedproperty.com/', 'Tennessee': 'https://treasury.tn.gov/Unclaimed-Property/Claim-Unclaimed-Property/Find-Your-Missing-Money', 'Texas': 'https://www.claimittexas.gov/',
  'Utah': 'https://mycash.utah.gov/', 'Vermont': 'https://www.vermonttreasurer.gov/content/unclaimed-property', 'Virginia': 'https://www.vamoneysearch.gov/', 'Washington': 'https://ucp.dor.wa.gov/',
  'West Virginia': 'https://www.wvunclaimedproperty.gov/', 'Wisconsin': 'https://www.revenue.wi.gov/Pages/UnclaimedProperty/Home.aspx', 'Wyoming': 'https://statetreasurer.wyo.gov/unclaimed-property/', 'Puerto Rico': 'https://www.ocif.pr.gov/consumidores',
};
const usHumanCheck = ['Kansas', 'Louisiana', 'Missouri', 'New Jersey', 'New Mexico', 'Minnesota', 'Montana'];

const us = {
  multi: [
    L('MissingMoney.com (endorsed by NAUPA; searches most states at once)', 'https://www.missingmoney.com/', 'Free multi-state search run by the state administrators\' association. Not every state participates, so also search each state you lived in.', 'human-check'),
    L('Unclaimed.org (NAUPA): official state program directory', 'https://unclaimed.org/', 'Links to every official state and province program. Use it to confirm a site is official.', 'ok'),
  ],
  federal: [
    L('TreasuryDirect Treasury Hunt: matured savings bonds and Treasury payments', 'https://www.treasurydirect.gov/savings-bonds/treasury-hunt/', 'Search by SSN for matured, unredeemed U.S. savings bonds (1974+) and undeliverable interest payments.', 'ok'),
    L('IRS: refunds (Where\'s My Refund / missing refunds)', 'https://www.irs.gov/refunds', 'Check refund status. Unfiled returns can still get a refund for about 3 years after the due date.', 'ok'),
    L('PBGC: unclaimed pension search', 'https://www.pbgc.gov/workers-retirees/find-unclaimed-retirement-benefits/search-unclaimed', 'Pensions from failed or ended private plans that PBGC holds for people it couldn\'t find.', 'ok'),
    L('DOL Retirement Savings Lost and Found', 'https://lostandfound.dol.gov/', 'Find old 401(k)/pension plans tied to your SSN (needs an identity-verified Login.gov account).', 'ok (fetched via web reader)'),
    L('NAIC Life Insurance Policy Locator', 'https://eapps.naic.org/life-policy-locator/', 'For a deceased relative: asks insurers to search for life policies/annuities in their name.', 'human-check'),
    L('FDIC: unclaimed funds from failed banks', 'https://closedbanks.fdic.gov/funds/', 'Deposits from failed U.S. banks that were never claimed.', 'ok'),
    L('USA.gov: unclaimed money from the government', 'https://www.usa.gov/unclaimed-money', 'Official overview of other federal sources (VA insurance, HUD, SEC, etc.).', 'ok'),
  ],
};
module.exports.unclaimed = { canada, us, usStates, usHumanCheck, checked: V };

module.exports.recalls = {
  canada: [
    L('Health Canada: Recalls and safety alerts (food, products, drugs, vehicles)', 'https://recalls-rappels.canada.ca/en', 'Search all Government of Canada recalls by product or brand.', 'ok', { q: 'https://recalls-rappels.canada.ca/en/search/site?search_api_fulltext=' }),
    L('Transport Canada: Motor Vehicle Safety Recalls Database (search by VIN or make/model)', 'https://wwwapps.tc.gc.ca/Saf-Sec-Sur/7/VRDB-BDRV/search-recherche/menu.aspx?lang=eng', 'Official vehicle, tire and child-seat recall search.', 'ok (official link confirmed by Transport Canada; box cannot reach canada.ca directly)'),
  ],
  us: [
    L('NHTSA: recalls by VIN', 'https://www.nhtsa.gov/recalls', 'Enter your 17-character VIN to see unrepaired safety recalls (cars, trucks, motorcycles).', 'human-check'),
    L('CPSC: consumer product recalls', 'https://www.cpsc.gov/Recalls', 'Toys, appliances, furniture and other household products.', 'human-check', { q: 'https://www.cpsc.gov/Recalls?search_combined_fields=' }),
    L('FDA: recalls, market withdrawals and safety alerts', 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts', 'Food, drugs, medical devices and cosmetics.', 'ok'),
    L('USDA FSIS: meat, poultry and egg recalls', 'https://www.fsis.usda.gov/recalls', 'Meat, poultry and processed egg recalls.', 'human-check'),
  ],
};

module.exports.flights = {
  appr: { name: 'Canada: Air Passenger Protection Regulations (APPR)', url: 'https://protection-passager-passenger.otc-cta.gc.ca/en/refunds-and-compensation/flight-delays-cancellations-rebooking-refunds-compensation', complaint: 'https://protection-passager-passenger.otc-cta.gc.ca/en/air-travel-complaints', status: 'ok (fetched via web reader)', checked: V,
    large: [[3, 400], [6, 700], [9, 1000]], small: [[3, 125], [6, 250], [9, 500]], denied: [[0, 900], [6, 1800], [9, 2400]],
    largeAirlines: 'Air Canada (incl. Jazz, Rouge), WestJet, Sunwing, Air Transat, Porter, Flair' },
  eu261: { name: 'EU Regulation 261/2004 (EU261)', url: 'https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm', status: 'ok', checked: V, uk: 'https://www.caa.co.uk/air-passengers/travel-problems-and-rights/flight-delays-and-cancellations/' },
  dot: { name: 'U.S. DOT airline refund rules', url: 'https://www.transportation.gov/briefing-room/what-airline-passengers-need-know-about-dots-automatic-refund-rule', bumping: 'https://www.transportation.gov/individuals/aviation-consumer-protection/bumping-oversales', status: 'human-check (confirmed via search index; DOT blocks automated checks)', checked: V },
};
