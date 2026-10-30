# Forecasting food insecurity, price shocks and livelihood crises from climate/disaster hazards: benchmarks for Centurisk97

Research date: 2026-10-29. Scope: operational systems, academic models, open data/code, reported accuracy and lead times, Indonesia data sources. About 23 search/fetch calls. Several headline numbers could not be retrieved from full texts; these are flagged as gaps, not invented.

## 1. Benchmarks: FEWS NET, WFP HungerMap, FAO GIEWS/ASIS, GEOGLAM, IPC, World Bank, Westerveld, Krishnamurthy

### Takeaway
The best food-crisis forecasters reach roughly 75–80% accuracy, but they do it mostly by persisting the last IPC phase. The skill that matters is catching *deteriorations*, and there it is weak: FEWS NET's own recall for crisis onset was reported as 0.23. ML models (World Bank random forest, Westerveld XGBoost) beat expert outlooks mainly at 6–12 month horizons. Soil moisture and past food-security state are the strongest predictors, and conflict settings break most models.

### Cited Findings
**FEWS NET (expert scenario development, IPC-compatible projections)**
- Independent evaluation (Bertetti, Agnolucci, Calzadilla & Capra 2024, *Global Food Security*, arXiv 2410.09384): FEWS NET near-term (ML1) projections average "around 78%" accuracy, and 98.7% of errors fall within ±1 IPC class. The study covers 24 African countries plus Yemen and analyses ML1 only, with no medium-term (ML2) numbers. — [arXiv 2410.09384](https://arxiv.org/html/2410.09384v1)
- Naive baselines from the same study come close. "Previous period's score" gets about 76% (the paper prints "0.76%", probably a typo), max of the previous two periods 74% (worst period 64%), and same period last year 67% (worst 53%). FEWS NET beats all of them only modestly. — [arXiv 2410.09384](https://arxiv.org/html/2410.09384v1)
- FEWS NET accuracy falls in crisis and conflict contexts: Somalia 57%, South Sudan 60%, Uganda/Cameroon about 92%. The biggest drop came in summer-2020 projections, which overestimated COVID-19 impacts. — [arXiv 2410.09384](https://arxiv.org/html/2410.09384v1)
- Backer & Billing (2021), cited there, report 84% overall accuracy that "declines sharply in presence of severe food crises". — [arXiv 2410.09384](https://arxiv.org/html/2410.09384v1)
- A third-party paper on the World Bank dataset cites FEWS NET's recall at 0.23 and precision at 0.42 for crisis prediction. — [MDPI AI 2(2):15](https://www.mdpi.com/2673-2688/2/2/15)
- Somalia 2017–2025 comparison (AGILE GIScience 2026): current-situation assessments from FEWS NET and IPC largely agree, but projections diverge. Projection agreement with later outcomes is 61.8% (FEWS NET) and 64.5% (IPC). Both underestimate low classes and overestimate high classes, which the authors describe as a "precautionary bias". — [AGILE-GISS 7/17/2026](https://agile-giss.copernicus.org/articles/7/17/2026/); [HeiGIT summary](https://heigit.org/new-paper-food-insecurity-projections-for-anticipatory-action-comparative-spatiotemporal-analysis-of-fews-net-and-the-ipc-in-somalia/)
- FEWS NET projection horizons used as targets: near-term 3–4 months, medium-term 6–8 months. — [World Bank Microdata 3811](https://microdata.worldbank.org/catalog/3811)

**World Bank, Andrée et al. 2020 ("Predicting Food Crises", PRWP 9412)**
- A random-forest model predicts district-level IPC phase outbreaks with monthly covariates for 21 countries, 2007–2020. Its conclusion is that statistical forecasts "compare favorably to expert-based outlooks", particularly at longer horizons. The replication data are public. — [World Bank doc txt](https://documents1.worldbank.org/curated/en/304451600783424495/text/Predicting-Food-Crises.txt); [AGRIS](https://agris.fao.org/search/ru/records/647477be79cbb2c2c1b4bb28); [Microdata 3811](https://microdata.worldbank.org/catalog/3811)
- A follow-up World Bank/VoxDev line of work uses news-text (NLP) features to predict food crisis outbreaks up to 12 months ahead at district level. — [World Bank Data Blog](https://blogs.worldbank.org/en/opendata/predicting-food-crisis-outbreaks-using-natural-language-processing-news-streams); [VoxDev](https://www.voxdev.org/topic/methods-measurement/reading-between-lines-leveraging-news-data-ai-powered-food-insecurity)

**Westerveld et al. 2021 (510 Netherlands Red Cross / Utrecht)**
- An XGBoost model forecasts monthly IPC-phase *transitions* (deterioration, improvement, stable) per Ethiopian livelihood zone at 1–12 month lead, using 130 open variables from 19 dataset categories (climate, land, markets, conflict, infrastructure, demographics). — [Utrecht research portal](https://research-portal.uu.nl/en/publications/forecasting-transitions-in-the-state-of-food-security-with-machin/); [Anticipation Hub](https://www.anticipation-hub.org/news/forecasting-changes-in-the-state-of-food-security-with-machine-learning)
- The strongest predictors are food-security history and surface soil moisture. F1-macro for "deterioration" is at least twice the dummy baseline. F1-macro is 0.61 at 7 months, better than at 3 months. — [Anticipation Hub](https://www.anticipation-hub.org/news/forecasting-changes-in-the-state-of-food-security-with-machine-learning)
- In the thesis precursor, XGBoost reached F1-macro 0.526 against 0.637 for FEWS NET, so the ML model did *not* beat the experts. — [UU thesis](https://studenttheses.uu.nl/handle/20.500.12932/32699)
- Busker et al. 2024 (*Earth's Future*) extend ML prediction of food-security crises to the Horn of Africa. — [Busker et al. 2024 PDF](https://down2earth.eri.ucsb.edu/assets/pdfs/publications/Busker_etal_2024.pdf)

**Krishnamurthy et al. 2022 (*Nature Sustainability* 5:956–964, "Anticipating drought-related food security changes")**
- SMART (Soil Moisture Auto-Regressive Threshold) combines lag-1 autocorrelation of SMAP soil moisture with food prices. It flagged all 212 studied food-security transitions with 3–6 months lead, tracking timing and magnitude at R² ≈ 0.80–0.83. Caveats: no out-of-sample forecast evaluation, and it performs poorly in conflict settings. Note that this is a threshold/early-warning-signal method, not ML. — [Chapman summary](https://blogs.chapman.edu/community-relations/2022/12/16/breakthrough-research-offers-game-changing-potential-for-global-food-security/); [CA Water Library record](https://cawaterlibrary.net/document/anticipating-drought-related-food-security-changes/)

**WFP HungerMap LIVE**
- The nowcast targets the Food Consumption Score (FCS) and reduced Coping Strategy Index (rCSI) prevalence where no live survey exists. Inputs are conflict (ACLED fatalities), economic shocks, extreme weather, and FAOSTAT undernourishment. Models explain >70% of variance in insufficient food consumption and crisis-level coping. That is explanatory fit, not out-of-sample error. In 2022 the 30-day forecasts were still under development. — [ISI abstract, Martini/WFP](https://www.isi-web.org/sites/default/files/import/pdf/abstractwfpmartini-353-449-martini-giulia.pdf); [UNIDO nowcasting workshop WFP deck](https://stat.unido.org:443/pdf/NowcastingWorkshop-Day2-WFP.pdf); [Nutrition Cluster deck](https://stg.nutritioncluster.net/sites/nutritioncluster.com/files/2021-02/Session%204%29%20HungerMap%20LIVE%20-%20Predictive%20model.pdf)
- Foini, Tizzoni, Martini, Paolotti & Omodei 2023 (*Scientific Reports* 13:2793, not Nature Food) use gradient-boosted trees to forecast insufficient food consumption up to 30 days ahead in 6 countries. The model beats a naive last-value baseline only in Syria and Yemen, the countries with the longest series. Performance depends on the length of history. — [CEU record](https://research.ceu.edu/en/publications/on-the-forecastability-of-food-insecurity/); [medRxiv preprint](https://www.medrxiv.org/content/10.1101/2021.07.09.21260276v2)
- The 2026 relaunch ("HungerMap Live") adds AI-assisted forecasting of projected needs for 16 Hunger Hotspots, more than 300 analysts' inputs, and IPC classifications. — [WFP news 2026](https://www.wfp.org/news/wfp-releases-hungermap-live-modernized-intelligence-platform-turns-data-global-hunger-early); [UN Geneva 2026](https://www.ungeneva.org/en/news-media/news/2026/04/117701/new-food-alert-platform-helps-humanitarians-combat-hunger)

**FAO GIEWS ASIS (Agricultural Stress Index)**
- ASI is the share of cropland with VHI below 35, temporally averaged over the crop season per pixel and classed slight/moderate/severe. Updates are dekadal (3x per month) at 1 km resolution, from NOAA AVHRR 1984–2006 and METOP-AVHRR 2007 onward. — [FAO AgriTech Observatory](https://agritechobservatory.review.fao.org/en/agricultural-stress-index-system-asis); [UN-SPIDER](https://un-spider.org/es/node/9450)
- Access: FAO EO portal (ASI, Drought Intensity, Weighted Mean VHI; dekadal and annual; web service/WMTS/download), an ASIS integration API at data.apps.fao.org, and GEE assets. The licence is listed inconsistently as CC BY-NC-SA 4.0 on one page and CC BY 4.0 on another. — [FAO EO access](https://eo.apps.fao.org/access.jsp?lang=en); [GIEWS EO](https://www.fao.org/giews/earthobservation/index.jsp); [GIEWS Data & Tools](https://www.fao.org/giews/data-tools/en)

### Inferences
- For Indonesia, any food-crisis model must report skill against a **persistence baseline**, as Bertetti et al. show. Otherwise an "accuracy" of about 78% is meaningless. The right metric is recall/precision on *transitions* (deterioration), with persistence as the floor.
- Indonesia has no IPC/FEWS NET time series to train on. The platform cannot replicate Andrée/Westerveld directly; it would need a proxy target (FSVA priority class, SKPG monthly red/yellow/green, Susenas food-insecurity prevalence, or price/production anomalies).
- The platform's existing soil-moisture, SPI and FAO-56 paddy water simulation are exactly the predictor class shown to dominate (Westerveld, Krishnamurthy). The gap is the *outcome* side, not the hazard side.

### Gaps
- Exact Andrée et al. 2020 recall/precision tables by horizon: not retrieved (full PDF needed).
- Bertetti et al. precision/recall/F1 values (Figure 7 only) and ML2 accuracy: not reported in text.
- No out-of-sample RMSE/MAE published for HungerMap LIVE production nowcasts.
- GEOGLAM Crop Monitor coverage and skill for Indonesia rice was not verified in this session. Indonesia is not a FEWS NET country, but no source was fetched to confirm the current FEWS NET country list.

## 2. Price forecasting: rice/chili spikes, El Niño and floods; FPMA, ALPS; Indonesian price data and APIs

### Takeaway
The ENSO-to-rice-*production* link in Indonesia is well established and gives usable lead time: August SST anomalies explain about half of wet-season paddy variance, with 4–8 month lead. The ENSO-to-*rice price* link is weak and lagged because of Bulog stocks and imports. Chili and shallot prices respond quickly to excess rain (La Niña, floods); this is the most forecastable "hazard to price" channel for a disaster platform. WFP ALPS is a simple, stdlib-portable price-anomaly indicator. Indonesian price portals (PIHPS, Panel Harga) have no documented public API; Bapanas monthly datasets exist on data.go.id as CSV/JSON.

### Cited Findings
**ENSO and rice production**
- Naylor et al. 2002 (*Bulletin of Indonesian Economic Studies*), 1971–1998 data: August SSTA explains about 50% of interannual variance in wet-season paddy production, about 1.4 Mt per 1°C. — [IDEAS/RePEc](https://ideas.repec.org/a/taf/bindes/v38y2002i1p75-91.html); [Stanford FSE](https://fse.fsi.stanford.edu/node/23892)
- Companion paper (*Climatic Change*, Falcon/Naylor et al.): SSTAs measured 4 and 8 months ahead explain two-thirds of Java rice *planting* variance and 40% of wet-season *production* variance. In strong El Niño years the wet-season shortfall is not recovered later in the crop year. — [DOI 10.1023/A:1010662115348](https://dx.doi.org/10.1023/A:1010662115348)
- IPB study (year unconfirmed): best predictor is September SSTA of the previous year, with R² above 40% for January–April production. — [IPB repository](https://repository.ipb.ac.id/handle/123456789/47427)
- Banten 2002–2015: El Niño reduces rice output and La Niña raises it. — [Agromet IPB](https://journal.ipb.ac.id/agromet/article/view/28018)
- The 2023 El Niño: BPS put 2023 rice output at 30.90 Mt, down 2.05% (about 650 kt), with harvested area falling from 10.45 to 10.20 Mha. The Ministry of Agriculture claimed a 1.2 Mt loss against target, using a different baseline. — [The Star / Reuters](https://www.thestar.com.my/business/business-news/2023/11/06/el-nino-phenomenon-disrupts-rice-production); [Tempo](https://en.tempo.co/amp/1766490/indonesia-loses-1-2m-tonnes-of-rice-over-el-nino-agriculture-minister-says); [WFP Indonesia seasonal bulletin Q3 2023](https://reliefweb.int/report/indonesia/indonesia-seasonal-monitoring-bulletin-july-september-q3-2023-dec-2023-enid)
- An ARIMAX study (FORSTAT 2026) finds ENSO effects on wholesale rice *prices* "relatively weak" and lagged. — search result summary, [Unram proceedings](https://proceeding.unram.ac.id/index.php/ficon/article/download/3697/1255/6747). Treat with caution: the snippet's attribution to this exact URL is uncertain.

**Chili/shallot, rain and floods**
- WFP 2022: above-average rain damaged chili and shallot crops; prices "soared starting on the third week of May". — [WFP seasonal bulletin Apr–Jun 2022](https://www.wfp.org/publications/wfp-seasonal-bulletin-impact-monitoring-hydrometeorological-hazards-april-june-2022)
- Bank Indonesia (2016) warned that La Niña disruption raises horticulture prices (chili, onion, rice). — [Kontan](https://english.kontan.co.id/news/bi-warns-of-inflation-risks-due-to-la-nin)
- BI (2017): heavy rainfall disrupts harvests, and volatile food inflation is driven mainly by chili and onion. — [Indonesia Investments](https://indonesia-investments.com/news/todays-headlines/bank-indonesia-concerned-about-the-impact-of-floods-on-inflation/item7636)
- 2010: wet weather pushed chili prices up more than 50%. — [PRI](https://www.pri.org/stories/2010-08-05/indonesia-sweats-high-chili-prices)
- In late 2023 red chili rose +33.21% month on month during El Niño (broker note). — [KB Valbury Dec 2023](https://www.kbvalbury.com/cfind/source/files/indonesia-macro-update---inf---231201.pdf)

**WFP ALPS and price forecasting**
- ALPS compares the monthly price (actual and forecast) to an estimated seasonal trend. The deviation in standard deviations is classed normal / stress / alert / crisis. It is based on CERDI empirical work and requires at least 3 years of series with less than 30% missing values. — [WFP VAM manual: forecasting & ALPS](https://vamresources.manuals.wfp.org/docs/food-price-forecasting-and-alert-for-price-spikes); [ALPS calculation doc](https://vamresources.manuals.wfp.org/docs/alps-calculation-and-use-of-the-alert-for-price-spikes-indicator.md); [ALPS technical note 2014](https://documents.wfp.org/stellent/groups/public/documents/manual_guide_proced/wfp264186.pdf)
- WFP Indonesia has applied ALPS to garlic and sugar after COVID-19, not to rice. — [WFP doc](https://docs.wfp.org/api/documents/WFP-0000155936/download)
- Rice price leadership across 25 Indonesian markets has been studied with Granger causality, which can identify lead markets for alerts. — [Uni Bonn dissertation](https://bonndoc.ulb.uni-bonn.de/xmlui/handle/20.500.11811/6607)

**Indonesian price data**
- PIHPS Nasional moved to bi.go.id/hargapangan from 1 July 2023; hargapangan.id was retired. It covers rice, eggs, chicken, beef, red chili, bird's-eye chili, shallot, garlic, cooking oil and sugar across traditional, modern, wholesale and producer markets. In 2017 data were collected 09:00–11:00 and published at 13:00 WIB. The only documentation is a 2017 user manual; no API docs were found. — [Bisnis 2023](https://ekonomi.bisnis.com/read/20230628/9/1669951/mulai-1-juli-2023-warga-bisa-cek-harga-pangan-harian-di-website-bi); [BI manual PDF](https://www.bi.go.id/Hargapangan/images/manual.pdf); [Bisnis 2017, early-detection system in PIHPS](https://ekonomi.bisnis.com/read/20170612/9/661632/ada-sistem-deteksi-dini-dalam-pihps-nasional)
- Panel Harga Bapanas (panelharga.badanpangan.go.id) is public on the web and in an app. No API documentation was found. Bapanas posts monthly national consumer and producer price datasets on data.go.id in CSV/JSON/XLSX, some "Terbuka" (open) and some "Terbatas" (restricted). — [data.go.id Bapanas](https://data.go.id/instantion/badan-pangan-nasional); [IDX Channel](https://www.idxchannel.com/economics/antisipasi-gejolak-harga-dan-pasokan-nfa-luncurkan-panel-harga-pangan)
- Kabupaten open-data portals also publish periodic consumer and producer prices (e.g. Sidoarjo, Penajam). — [Sidoarjo](https://opendata.sidoarjokab.go.id/dataset/informasi-harga-pangan-di-tingkat-konsumen-berkala/resource/c19404c4-3980-4f81-955c-f357a62c48df); [Penajam](https://opendata.penajamkab.go.id/tl/dataset/rata-rata-harga-pangan-dirinci-per-bulan-menurut-komoditas-bahan-pangan/resource/fcc21c1e-f0b8-4c8f-85cf-0c6550fc86a0)

### Inferences
- **Most realistic next product:** an ENSO-conditioned rice *production* outlook per province, plus an ALPS-style *chili/shallot price alert* fed by the platform's flood and extreme-rain forecasts. ALPS is a seasonal trend plus a z-score, which fits stdlib Python easily.
- Rice price forecasting from hazards should be presented as low-skill. Policy (Bulog, imports, HET ceiling prices) dominates.
- Ingesting PIHPS or Panel Harga likely means reverse-engineering the site's XHR JSON (not verified). Check the terms of use. The data.go.id Bapanas monthly datasets are the safer, documented route.

### Gaps
- No documented public API or ToS for PIHPS or Panel Harga confirmed.
- BPS KSA (Kerangka Sampel Area) monthly harvest-area data access and API: not researched in this session. BPS has a WebAPI generally, but it was not verified for KSA.
- FAO FPMA tool: not fetched. Indonesia coverage in FPMA is not confirmed.
- No peer-reviewed 2021–2026 Indonesia study found quantifying the flood-to-chili price elasticity or lead time.

## 3. Indonesia systems (FSVA, SKPG, BMKG agroclimate): what is missing

### Takeaway
FSVA is an *annual, structural* vulnerability atlas (kabupaten, and village in some regions). SKPG is a *monthly* red/yellow/green early-warning system run by local food agencies, often on Excel, with no forward projection. Neither ingests hazard forecasts. A hazard-driven, forward-looking (1–6 month) layer at kabupaten level is the clear gap the platform could fill.

### Cited Findings
- FSVA 2024: Bapanas changed the method from 9 to 12 indicators (secondary source). — [UM Tapsel journal](https://jurnal.um-tapsel.ac.id/index.php/muqoddimah/article/download/25270/pdf)
- Vulnerable kabupaten/kota (priority 1–3): 72 (2021), 68 (2022), 62 (2023) per Bapanas, October 2024. A February 2024 release gave 68 for 2023 (about 13%), down from 74 in 2022. These counts conflict, likely because they come from different releases. — [IDX Channel](https://www.idxchannel.com/economics/bapanas-sebut-jumlah-daerah-rentan-rawan-pangan-terus-turun-jadi-62-kabupaten-kota); [Bisnis Feb 2024](https://ekonomi.bisnis.com/read/20240227/12/1744546/jumlah-daerah-rentan-rawan-pangan-turun-di-2023-ini-data-terbarunya); [Detik](https://finance.detik.com/berita-ekonomi-bisnis/d-7214317/68-daerah-berstatus-rawan-pangan)
- FSVA is used to target poverty and stunting interventions; the 2024 national map was set by Bapanas Decree No. 558/2024. — [Metro TV](https://www.metrotvnews.com/read/KZmCdGXE-pangkas-kemiskinan-ekstrem-bapanas-kendalikan-kerawanan-pangan); [Kotawaringin Barat doc](https://bappeda.kotawaringinbaratkab.go.id/uploads/dokumen/99EbJgGK4llYDH34N7krS42S2mktQ8mrnsgnLUm1.pdf)
- SKPG was first set out in Permentan 43/2010, with monthly indicators across availability, access and utilisation and a composite score. It is now governed by Peraturan Bapanas 16/2022 as "Sistem Peringatan Dini Kerawanan Pangan dan Gizi", with red/yellow/green status. — [Permentan 43/2010](https://peraturan.bpk.go.id/Download/152682/Permentan%20Nomor%2043%20Tahun2010.pdf); [BN 383/2010](https://peraturan.go.id/files/bn383-2010.pdf); [AKP journal 2024](https://epublikasi.pertanian.go.id/berkala/index.php/akp/article/download/3845/3891/7762)
- SKPG is run locally (e.g. Bondowoso 2024 report, Malang 2022/2023 reports); Sijunjung used an Excel-based SKPG app in 2021. — [Bondowoso SKPG 2024](https://pertanian.bondowosokab.go.id/uploads/pelayanan/data%20file/SKPG%20Tahun%202024.pdf); [Malang 2023](https://dispangtan.malangkota.go.id/wp-content/uploads/sites/15/2024/04/LAPORAN-AKHIR-SKPG-KOTA-MALANG-2023.pdf); [UNP Agriness](https://agriness.ppj.unp.ac.id/index.php/agrnes/article/download/48/37/290)
- WFP Indonesia publishes seasonal bulletins on hydrometeorological hazard impacts on food (price and production), so a hazard-to-food narrative product already exists at national level. — [WFP Q3 2023 bulletin](https://reliefweb.int/report/indonesia/indonesia-seasonal-monitoring-bulletin-july-september-q3-2023-dec-2023-enid); [WFP Apr–Jun 2022](https://www.wfp.org/publications/wfp-seasonal-bulletin-impact-monitoring-hydrometeorological-hazards-april-june-2022)

### Inferences
- Gaps the platform could fill:
  1. A **forward** kabupaten-level "harvest stress outlook" that combines SEAS5 rainfall, SPI, the FAO-56 paddy water deficit and ENSO lag regression.
  2. **Hazard overlays on FSVA priority 1–3 kabupaten**, i.e. where a forecast hazard meets structural vulnerability. This is cheap and high-value.
  3. An automated **SKPG-compatible** monthly red/yellow/green suggestion for local food agencies.
- FSVA indicators and maps are public PDFs or maps. A machine-readable FSVA table per kabupaten may need manual extraction (unverified).

### Gaps
- No official machine-readable FSVA 2024 dataset or URL confirmed.
- BMKG agroclimate products (prakiraan musim, peringatan dini kekeringan meteorologis, agroclimate bulletins) were not researched in this session for API or format.
- Whether Bapanas operates a national SKPG dashboard: not found.

## 4. Fisheries and coastal livelihoods: waves, marine heatwaves and coral bleaching, HABs

### Takeaway
BMKG already issues wave warnings with an explicit no-sail threshold for small boats. Converting these into "fishing days lost per kabupaten" is straightforward. Monetising that as lost income lacks an Indonesian empirical basis (not found). The NOAA Coral Reef Watch 4-month outlook gives free, operational bleaching-stress forecasts, with best skill where ENSO dominates. Use caution beyond 20 weeks lead. HAB early warning in Indonesia exists only as research (Jakarta Bay chlorophyll-a above 10 mg/m³), with no operational system found.

### Cited Findings
- BMKG advises small fishing boats not to sail when wind reaches 15 knots and waves 1.25 m (July 2026 warnings). BMKG only warns; the decision to sail stays with fishers. — [Kompas TV Jul 2026](https://www.kompas.tv/info-publik/679026/peringatan-dini-gelombang-tinggi-6-hingga-9-juli-2026-ini-wilayah-yang-perlu-waspada?page=all); [Antara Jateng](https://jateng.antaranews.com/berita/342477/bmkg-nelayan-harus-antisipasi-kemungkinan-terjadinya-gelombang-tinggi)
- Example: Maritim Tenau Kupang warned of 1.25–2.5 m waves for NTT waters, "high risk" for fishing boats (July 2026). — [RRI Ende](https://rri.co.id/ende/regional/2601108/bmkg-imbau-nelayan-waspadai-gelombang-tinggi-perairan-ntt-hari-ini)
- NOAA CRW 4-month Bleaching Heat Stress Outlook: CRW's heat-stress algorithm applied to NCEP CFSv2 seasonal SST. It gives weekly probabilities, and the headline is the maximum weekly probability over 4 months. — [CRW outlook page](https://coralreefwatch.noaa.gov/satellite/bleachingoutlook_cfs/weekly_90.php); [JCU record of Liu et al. 2018](https://researchonline.jcu.edu.au/58671)
- Skill: the 2011–2015 qualitative verification found high hit rates and low miss rates for most reef regions, with some high false-alarm regions. Skill is higher where large-scale climate signals dominate (central and eastern Pacific, Indian Ocean, Caribbean; ENSO). CRW advises caution beyond 20 weeks. Newer work weights the best-skill ensemble members and maps skill by grid, season and lead (under evaluation). — [Liu et al. 2018, Frontiers Mar Sci](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2018.00057/pdf); [ESSIC](https://essic.umd.edu/?p=11384)
- HABs, Jakarta Bay 2004–2007: 7 mass fish kills coincided with MODIS chlorophyll-a above 10 mg/m³ over more than 25% of the bay. 2006 had blooms but no kills, so oxygen depletion and weak circulation are the key co-factors. — [JAXA proceedings](https://www.eorc.jaxa.jp/ALOS/conf/Proc_PIsymp2007/contents/proceedings/Oceanography_Opt/OCO05.pdf)
- A satellite EWS for algal blooms in Jakarta Bay was proposed (IPB); cloud cover is the main limitation. — [IPB Jurnal IKT](https://journal.ipb.ac.id/jurnalikt/article/view/52627); [KKP J. Kebijakan Perikanan](https://ejournal-balitbang.kkp.go.id/index.php/jkn/article/view/6226)
- Lampung Bay: a 2012 bloom near a fish farm killed many fish, and blooms have become more frequent since 2012. — [Frontiers for Young Minds](https://www.frontiersin.org/journals/frontiers-for-young-minds/articles/10.3389/frym.2023.858326/pdf)

### Inferences
- A cheap, defensible product is a **"hari tidak melaut" (no-sail days) forecast** per coastal kabupaten: wave height above 1.25 m or wind above 15 kt from an existing wave or wind forecast (e.g. Open-Meteo Marine, already Open-Meteo-adjacent in the stack), summed over 7–10 days. Present it as exposure, not income loss.
- CRW outlook and daily Degree Heating Week products could be ingested as JSON or NetCDF summaries per reef area (format not verified here) for an "aquaculture/reef stress" card.
- HAB: chlorophyll-a anomaly plus calm-wind days for Jakarta Bay and Lampung Bay would be experimental only; there is no validated Indonesian skill.

### Gaps
- No Indonesian study quantifying fisher income loss per no-sail day (searched; none found).
- No verification of the CRW outlook for Indonesian waters or the 2024 global bleaching event was found.
- No current (2020+) operational HAB warning in Indonesia found.

## 5. Livestock and drought: water stress in NTT/NTB

### Takeaway
Livestock losses in NTT follow long dry spells and pasture failure, with horses hit hardest. Records are anecdotal news counts, so there is no training data for a model. The platform's consecutive-dry-days, SPI and seasonal outlooks can drive a rule-based "pasture/water stress" alert. Its skill cannot be validated with available data.

### Cited Findings
- East Sumba, February 2020: dozens of livestock (mostly horses) died of lack of feed after an erratic rainy season; the regent put the toll at under 100. Cows and buffalo survive better because they browse leaves. — [Medcom](https://www.medcom.id/english/national/xkEYmMMk-dozens-of-cattle-in-ntt-s-east-sumba-die-of-starvation-regent)
- East Sumba reportedly had 249 consecutive rainless days in the year before a Reuters report of horse and cattle deaths in Hambapraing (date unclear). — [Gulf News/Reuters](https://gulfnews.com/photos/lifestyle-photos/as-crops-fail-indonesias-sumba-seeks-lifeline-in-weaving-fishing-1.1591267960235)
- East Manggarai, January 2016: at least 600 livestock died in a prolonged dry season. — [Jakarta Post 2016](https://www.thejakartapost.com/news/2016/01/11/islands-focus-prolonged-dry-season-killing-livestock-ntt)
- 2023: six NTT kabupaten, including Southwest Sumba, declared drought emergency alert status, with the provincial status valid until October 2023. — [VOI](https://voi.id/en/news/304849)
- 2012: in Timor Tengah Utara, people drank from a dike built for cattle farmers. — [Jakarta Post 2012](https://www.thejakartapost.com/news/2012/09/17/water-deficit-leads-consumption-dirty-water)

### Inferences
- A threshold product is feasible: consecutive dry days above X plus SPI-3 below -1 plus SEAS5 dry outlook over savanna and grazing kabupaten (Sumba, Timor, Flores, Sumbawa) gives a "pakan & air ternak" (feed and livestock water) watch. Thresholds should be calibrated against the few dated events above and BPBD drought declarations.
- NDVI/VHI (FAO ASIS VHI, already dekadal and 1 km) over grassland is the obvious pasture-condition input.

### Gaps
- No systematic livestock-mortality dataset for NTT/NTB was found.
- No 2025–2026 livestock-loss reports found.
- No study linking SPI or dry-spell length to livestock losses in Nusa Tenggara found.

## 6. Open code: GitHub repos for food-security nowcasting and crop-yield forecasting

### Takeaway
Few production food-security forecasters publish code. The WFP HungerMap and FEWS NET models are not open, as far as found. The most reusable open assets are the World Bank replication *data* (Andrée et al.) and the CY-Bench yield benchmark (WUR-AI). CY-Bench covers maize and wheat, not rice, so it is mostly a design reference. Porting to stdlib Python is realistic only for simple methods: ALPS, threshold/autocorrelation indicators (SMART-like), and linear ENSO-lag regression. Gradient boosting would need hand-written trees; the repo already has a hand-written GBDT in `model-sebaran`.

### Cited Findings
- CY-Bench (AgML): subnational yield benchmark for wheat (29 countries) and maize (38). Predictors are stored as one CSV per variable, crop and country (NDVI, FPAR, soil moisture, meteorology, crop calendars). Code is at github.com/WUR-AI/AgML-CY-Bench; the licence is listed as "other", so check before reuse. Data are on Zenodo. — [ESSD 18/3997/2026](https://essd.copernicus.org/articles/18/3997/2026/essd-18-3997-2026-assets.html); [Zenodo](https://zenodo.org/records/17279151); [ecosyste.ms](https://ost.ecosyste.ms/projects/193752)
- NASA Harvest yield intercomparison results are hosted on a CKAN portal; no code was found. — [Harvest portal](https://data.harvestportal.org/ro/organization/about/nasa-harvest-yield-intercomparison)
- World Bank "Predicting Food Crises" dataset (21 countries, monthly, 2007–2020) is downloadable from the Microdata Library. — [Microdata 3811](https://microdata.worldbank.org/catalog/3811)
- FAO ASIS has a GEE Colab sample notebook and an integration API. — [FAO EO access](https://eo.apps.fao.org/access.jsp?lang=en)

### Inferences
- Portability ranking for this stack (Python 3.12 stdlib, GitHub Actions):
  1. ALPS: trivially portable (seasonal trend plus residual z-score).
  2. ENSO-lag OLS for rice production: portable.
  3. SMART-style rolling lag-1 autocorrelation of soil moisture: portable.
  4. XGBoost-style transition classifier: possible by reusing the repo's hand-written GBDT, but there is no Indonesian outcome label to train on.
- CY-Bench's data layout (one CSV per variable × crop × admin unit) is a good template for a rice-yield predictor table per kabupaten.

### Gaps
- GitHub star counts and languages were not retrieved for any repo (only CY-Bench was located). No open WFP/FAO code for HungerMap or ASIS processing was confirmed.
- WorldCereal, the Harvest/Helmets crop-type repos and rice-specific open yield models in Southeast Asia were not searched in this session.
- No open Indonesian rice yield or price forecasting repo was found.
