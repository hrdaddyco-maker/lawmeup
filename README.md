# LawMeUp

Find open **class action settlements** in the U.S. and Canada, check whether you likely qualify, see why each case exists, and go straight to the **official** claim form.

**Live:** https://lawmeup.onrender.com

- **Browse/search** 200+ open settlements with filters (country, category, deadline, proof required, payout).
- **Guided questionnaire** per settlement, built from its class definition → verdict (*likely / maybe / unlikely*) with matched/blocking criteria, payout, deadline and docs needed.
- **"What do I qualify for?"** mode: location + situations + brands (or a sentence parsed by AI) → ranked matches.
- **Apply** = copyable prefilled summary + link to the official administrator's form. LawMeUp **never submits claims**. Not legal advice.

## Data
`node lib/build.js` rebuilds `data/settlements.json`:
1. Scrapes ClassAction.org's open settlements list (name, payout, deadline, proof, official URL, class summary).
2. Merges hand-reviewed enrichments + Canadian records from `data/curated.js` (official administrator sites).
3. Drops closed deadlines and checks every official claim URL (dead sites are dropped; Cloudflare "verify you're human" pages count as live).

The server re-runs this on boot if the data is >20h old and every 24h.

## Eligibility & AI
- Rule engine (`lib/eligibility.js`): questions are `req` (class membership), `strong` (needed to be paid) or `info`. Any required "no" → unlikely; any "not sure" → maybe; else likely. Instant, no AI.
- Optional AI (`/api/ai/explain`, `/api/ai/parse`) via Pollinations' free keyless OpenAI-compatible API. Set `LLM_URL`, `LLM_KEY`, `LLM_MODEL` to use another provider.

Run: `npm start` (Node 18+, no dependencies).
