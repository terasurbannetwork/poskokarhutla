export const meta = {
  name: 'audit-metode-platform',
  description: 'Audit relevance and validity of every method on the Pantau Bencana platform for a presidential briefing',
  phases: [
    { title: 'Telaah', detail: 'satu penelaah per modul: inventaris metode + vonis' },
    { title: 'Tantang', detail: 'pendapat kedua per modul: uji bukti, bantah vonis' },
    { title: 'Alternatif', detail: 'riset metode yang lebih tepat per modul' },
  ],
}
const REPO = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla'
const BASE = `You are a subagent. Don't run memo. READ-ONLY task: do not modify, create, or delete any file in the repo (${REPO}), do not run git commands that change state, do not run pipelines that write data, do not deploy, do not call external APIs. You may read files, grep, and run small read-only python3 -I / node snippets that only print. Answer in Indonesian.

Context: "Pantau Bencana" (repo ${REPO}) is a national disaster-monitoring platform (Cloudflare Worker + static vanilla-JS screens in public/, Python stdlib pipelines in scripts/ writing JSON to public/data and public/*/data). Its numbers are about to be used in briefings for the PRESIDENT of Indonesia via BNPB (Laporan Harian, Paparan Presiden decks). The owner wants an honest expert evaluation of EVERY method: is it scientifically relevant and appropriate for that audience, or not.

Evaluation lens for each method (a "method" = any model, index, estimate, rule, threshold, simulation, aggregation or classification that produces a number, status, map layer, alert or sentence shown on a screen or in a report):
1. What it computes and where it is shown (screen file, report, alert) — cite file:line.
2. Inputs / data sources, their latency and coverage (e.g. satellite NRT, ERA5, BMKG, OSM, WorldPop).
3. Scientific basis: is it an established standard (cite the standard by name, e.g. Canadian FWI, WMO SPI, GMPE name, ISPU regulation) or a home-made heuristic?
4. Validation evidence IN THIS REPO: backtests (uji balik), calibration, skill scores. Quote the actual numbers from code/JSON/markdown (e.g. POD, FAR, BSS, AUC, error %). Note if no validation exists.
5. Honesty of presentation: are uncertainty/limitations shown to the user? Does the screen/report overclaim (false precision, "prediksi" without skill, numbers that contradict official BNPB/BMKG/KLHK data without explanation)?
6. VERDICT for a presidential briefing: "layak" (standard + validated, safe to present), "layak_catatan" (usable only if labelled as estimate/indicative with stated limits), "tidak_layak" (no demonstrated skill, misleading, or methodologically wrong — should not be put in front of the President).
7. Concrete fix (what to change/label/remove, or what validation is missing).
Be specific and evidence-based; do not pad. Prefer depth on methods whose output reaches reports/decks or headline cards.`

const MOD_SCHEMA = {
  type: 'object',
  properties: {
    modul: { type: 'string' },
    ringkasan: { type: 'string' },
    metode: { type: 'array', items: { type: 'object', properties: {
      nama: { type: 'string' },
      apa: { type: 'string' },
      tampil_di: { type: 'string' },
      sumber_data: { type: 'string' },
      dasar_ilmiah: { type: 'string' },
      validasi: { type: 'string' },
      vonis: { type: 'string', enum: ['layak', 'layak_catatan', 'tidak_layak'] },
      alasan: { type: 'string' },
      risiko_presiden: { type: 'string' },
      perbaikan: { type: 'string' },
      bukti: { type: 'string' },
    }, required: ['nama', 'apa', 'tampil_di', 'sumber_data', 'dasar_ilmiah', 'validasi', 'vonis', 'alasan', 'risiko_presiden', 'perbaikan', 'bukti'] } },
  },
  required: ['modul', 'ringkasan', 'metode'],
}
const CH_SCHEMA = {
  type: 'object',
  properties: {
    modul: { type: 'string' },
    catatan_umum: { type: 'string' },
    keputusan: { type: 'array', items: { type: 'object', properties: {
      nama: { type: 'string' },
      vonis_awal: { type: 'string' },
      vonis_akhir: { type: 'string', enum: ['layak', 'layak_catatan', 'tidak_layak'] },
      bukti_terverifikasi: { type: 'boolean' },
      alasan: { type: 'string' },
    }, required: ['nama', 'vonis_awal', 'vonis_akhir', 'bukti_terverifikasi', 'alasan'] } },
    metode_terlewat: { type: 'array', items: { type: 'object', properties: {
      nama: { type: 'string' }, vonis: { type: 'string', enum: ['layak', 'layak_catatan', 'tidak_layak'] }, alasan: { type: 'string' }, bukti: { type: 'string' },
    }, required: ['nama', 'vonis', 'alasan', 'bukti'] } },
  },
  required: ['modul', 'catatan_umum', 'keputusan', 'metode_terlewat'],
}

const MODULES = [
  { key: 'karhutla-titik-luas-status', scope: 'Karhutla — hotspot counting & statistics, burned-area estimate (4.3 ha per VIIRS point, NOAA-20 x 0.978 substitution), "dampak" area, cumulative comparison vs 2015/2019/2023, fire complexes (kompleks) and their active/extinguished status rules (72h / 168h peat), daily report generation, operations need estimates (regu, pompa, personel, koefisien), peat smoldering (gambut_bara), preventive priority, official-data splicing. Files: scripts/data/** (laporan.py, kumulatif.py, dampak.py, operasi.py, gambut_bara.py, preventif.py, status/aturan, sejarah, splice*), scripts/umum/laporan.py, scripts/splice_*.py, public/laporan.js, public/inti/laporan.js, public/data/laporan.json, kumulatif.json, operasi.json.' },
  { key: 'karhutla-risiko-cuaca', scope: 'Karhutla — fire danger & risk indices: FWI (Canadian FWI system components), weather ensemble inputs (Open-Meteo/ERA5), soil moisture, PFVI (peat fire vulnerability index), seasonal/ENSO/IOD outlook, any district/kecamatan risk ranking for karhutla. Files: scripts/data/** (fwi*, cuaca*, ensemble*, tanah*, pfvi*, musim*, iklim*), scripts/sebaran/PFVI docs (PAPER-PFVI.md, RISET-PFVI.md, pfvi_balik.py), scripts/umum/iklim_outlook.py, outlook12.py, peluang.py, relevant public/*.js cards.' },
  { key: 'karhutla-model-sebaran', scope: 'Karhutla — fire spread / escalation model: handwritten GBDT, features, physics simulation (FBP/Rothermel-like), 72h spread alerts (jejak.py, Awas/Siaga thresholds), prospective evaluation, backtests, JS evaluator and treatment simulations on screen. Files: scripts/sebaran/** (all, incl. SEBARAN_MODEL.md, RISET-SEBARAN.md, lolos.py, prospektif.py, simfisika.py, galat.py, gbdt.py, latih*.py, jejak.py), public/sebaran_model.js, public/sim_*, public/insight_sebaran.js, public/data/model_sebaran.json, prospektif.json.' },
  { key: 'banjir-rob-longsor', scope: 'Banjir, rob (coastal flood), longsor (landslide): rainfall thresholds per region, ECMWF/ensemble probability per kecamatan, river levels, tide/rob model, 72h prediction, DEM inundation simulation 3D, landslide bucket model, impact estimates, DAS upstream evidence, backtests vs DIBI. Files: scripts/banjir/** (incl. RISET-*.md, ambang_wilayah.py, ujibalik*), public/banjir/** (exclude *_gunungapi.json and cuaca_* which belong to other modules).' },
  { key: 'gempa-tsunami', scope: 'Gempa & tsunami: shaking model (GMPE + MMI conversion), damage/casualty calibration (kalibrasi_kerusakan), aftershock forecasting (Reasenberg-Jones), facility exposure, tsunami simulation (shallow-water, ETOPO), daily report. Files: scripts/gempa/**, public/gempa/** (incl. sim.js, kerusakan.js, data/kalibrasi_kerusakan.json), docs/multi-bencana/RINCI-GEMPA.md, PARITAS-GEMPA.md.' },
  { key: 'gunungapi', scope: 'Gunung api: MAGMA/PVMBG status ingestion, eruption scope, KRB exposure/evacuation, Lagrangian ash dispersion 72h, lahar D8 routing, 3D simulation, emergency response sim. Files: scripts/gunungapi/**, public/gunungapi/** (sim.js, sim_tanggap.js), public/banjir/data/*_gunungapi.json, PARITAS-GUNUNGAPI.md.' },
  { key: 'kekeringan', scope: 'Kekeringan (drought): SPI/HTH (consecutive dry days), soil moisture, SEAS5/Open-Meteo seasonal ensemble, ENSO outlook skill, rice/padi impact, water balance FAO-56 simulation, LOO backtests, binomial tests on recurring dry districts. Files: scripts/kekeringan/** (spi.py, ujibalik.py, uji_rantai.py, status.py, riwayat.py, tutupan.py, resmi.py ...), public/kekeringan/** (app.js, insight.js, simulasi.js), tests/kekeringan/, PARITAS-KEKERINGAN.md.' },
  { key: 'cuaca-ekstrem', scope: 'Cuaca ekstrem: BMKG warnings ingestion, kecamatan 72h extreme weather probability, tropical cyclones (JTWC/GDACS), waves, wind impact, runoff, storm surge, ensemble bands, action ranking, verification vs DIBI (POD/FAR), IRBI/infra-risk BNPB per kabupaten. Files: scripts/cuaca/**, public/cuaca/**, public/banjir/data/cuaca_*.json, PARITAS-CUACA.md.' },
  { key: 'udara-asap', scope: 'Kualitas udara & asap: PM2.5/ISPU conversion and categories, forecasts (prakiraan, prakiraan_teruji), smoke attribution to fires (atribusi, lintasan/trajectories, asal), airport visibility, vulnerability (rentan), health impact (dampak_udara), smoke season, PLTU, client-side simulation with ensemble/clusters. Files: scripts/udara/**, public/udara/** (incl. sim/model.js, sim/sim.js, sim/tanggap.js, sim/ensemble*.js, kluster.worker.js), tests/udara/, PARITAS-UDARA.md.' },
  { key: 'lintas-bnpb-sosial', scope: 'Cross-cutting: BNPB coordination room (scripts/bnpb/**, public/bnpb/**: kecamatan risk index, seasonal needs estimate, sitrep), event/incident aggregation (scripts/umum/kejadian.py, laporan_kejadian.py, bencana.py), 12-month outlook & probability (outlook12.py, peluang.py), news clustering and sentiment (scripts/umum/berita.py, scripts/berita/**), social-media analysis (sosmed.py), building exposure via Open Buildings (bangunan.py, paparan_bangunan.py), concession burn report (scripts/data/konsesi_laporan.py, public/laporan_konsesi.js, group nationality rules), citizen reports & house-damage RB/RS/RR (src/*.js), and the /laporan-bnpb Laporan Harian & Paparan Presiden generator (public/laporan.html/js, data/laporan-bnpb/*.json).' },
]

const results = await pipeline(
  MODULES,
  m => agent(`${BASE}

YOUR MODULE: ${m.scope}

Explore the files (list directories first, read the markdown research/backtest docs and the code that produces displayed numbers), then return the full inventory of methods in this module with a verdict per method following the lens. Aim for completeness: every method whose output a user or report can see.`, { label: `telaah:${m.key}`, phase: 'Telaah', schema: MOD_SCHEMA }),
  (rev, m) => rev ? agent(`${BASE}

You are the SECOND, ADVERSARIAL expert reviewer (think: a senior scientist from BMKG / BNPB / KLHK / PVMBG / BRIN reviewing material before it goes to the President). Module scope: ${m.scope}

A first reviewer produced this evaluation (JSON):
${JSON.stringify(rev)}

Your job: (1) for EACH method, open the cited evidence and verify it is real and correctly read (numbers, file:line); (2) challenge each verdict in both directions — a "layak" that is actually unvalidated/overclaimed should go down; a "tidak_layak" that has real validation or is clearly labelled should go up; (3) list important methods in this module the first reviewer missed, with verdict and evidence. Return final verdicts with reasons.`, { label: `tantang:${m.key}`, phase: 'Tantang', schema: CH_SCHEMA }).then(ch => ({ modul: m.key, telaah: rev, tantang: ch })) : null,
  (prev, m) => prev ? agent(`${BASE}

EXCEPTION for this stage: you MAY and SHOULD use web research (load WebSearch / WebFetch via ToolSearch, e.g. query "select:WebSearch,WebFetch") to find literature, agency practice and datasets. The repo stays read-only.

Module scope: ${m.scope}

Two expert reviewers already evaluated this module's methods (JSON; use "tantang.keputusan[].vonis_akhir" as the final verdicts and "tantang.metode_terlewat" as extra methods):
${JSON.stringify(prev)}

YOUR JOB: find MORE EFFECTIVE and MORE APPROPRIATE methods. For every method whose final verdict is "tidak_layak" or "layak_catatan" — and for "layak" methods where a clearly better standard exists — propose the best replacement or upgrade:
- What Indonesian agencies officially use for the same quantity (BMKG, BNPB/InaRISK/DIBI, KLHK/Kemenhut SiPongi, PVMBG/MAGMA, BRIN, BIG, KKP, PUPR/SDA, KLH ISPU), so the President hears numbers consistent with official sources; and the international state of the art (peer-reviewed, operational products such as NASA/ESA/Copernicus/ECMWF/GloFAS/GEM/USGS products).
- Prefer options feasible for this stack: free/open data, Python-stdlib pipelines on GitHub Actions (no GPU, limited minutes), static JS screens. If the better method needs paid data or heavy compute, say so and give the best feasible approximation.
- For each: why it is more accurate/appropriate, required data (URL, latency, resolution, license), implementation effort (S/M/L), how to validate it locally (concrete backtest: target dataset, metric, pass threshold), and priority for a presidential briefing (P1 = fix before next briefing, P2 = soon, P3 = later).
Cite sources with URLs. Do not invent references; if unsure, say so.`, {
    label: `alternatif:${m.key}`, phase: 'Alternatif',
    schema: { type: 'object', properties: {
      modul: { type: 'string' },
      usulan: { type: 'array', items: { type: 'object', properties: {
        metode_lama: { type: 'string' }, vonis_akhir: { type: 'string' }, alternatif: { type: 'string' },
        praktik_resmi_indonesia: { type: 'string' }, kenapa_lebih_tepat: { type: 'string' },
        data_dibutuhkan: { type: 'string' }, upaya: { type: 'string', enum: ['S', 'M', 'L'] },
        cara_validasi: { type: 'string' }, prioritas: { type: 'string', enum: ['P1', 'P2', 'P3'] },
        rujukan: { type: 'array', items: { type: 'string' } },
      }, required: ['metode_lama', 'vonis_akhir', 'alternatif', 'praktik_resmi_indonesia', 'kenapa_lebih_tepat', 'data_dibutuhkan', 'upaya', 'cara_validasi', 'prioritas', 'rujukan'] } },
    }, required: ['modul', 'usulan'] },
  }).then(alt => ({ ...prev, alternatif: alt })) : null,
)
return results.filter(Boolean)
