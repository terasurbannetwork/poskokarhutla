# Epidemic and outbreak early warning from environmental and disaster drivers: a benchmark for Centurisk97

Research date: 2026-10-29. About 16 web searches and fetches. Lead-time and skill figures below come from search-result abstracts and summaries. Where a full text was not read, the note says so. Older classics are marked "(older)".

Naming trap to keep straight throughout: Indonesia's national **SKDR is also called "EWARS"** (Early Warning Alert and Response System). It is a weekly syndromic surveillance system. **WHO-TDR "EWARS"** is a different thing: a dengue outbreak *prediction* tool that uses climate covariates. They share an acronym and nothing else.

---

## Q1. Which climate-sensitive diseases relevant to Indonesia have published forecasting models (drivers, lead time, skill)?

### Takeaway
Dengue (DBD) is the only disease with a mature forecasting literature, operational systems in the region (Singapore, Barbados, Brazil, BMKG DBDKlim) and reported skill. Typical lead time is 1–3 months, and the best retrospective models reach AUC 0.75–0.98 or hit rates of 80–90%. Leptospirosis after floods has well-documented lags of 2 weeks to 3 months, but no validated Indonesian forecast model. Diarrhoea after floods, malaria in Papua and ISPA from haze have weak or mixed evidence and no forecasting skill numbers I could find for Indonesia.

### Cited Findings

**Dengue (DBD)**
- Singapore's NEA runs an operational model based on LASSO. Its inputs are recent cases, meteorological data, vector surveillance and population statistics, and it produces national forecasts up to 3 months ahead. NEA uses it to plan vector control and in public communication — [EHP, Shi et al. 2016](https://ehp.niehs.nih.gov/15-09981); [PMC5010405](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5010405/)
- That model correctly projected the upward trend and the two major outbreaks of 2013 and 2014 — [PMC5010413](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5010413/)
- A Singapore neighbourhood-level real-time forecast reported AUC above 0.75 at every forecast window and above 0.80 within the next month — [BMC Medicine 2018](https://bmcmedicine.biomedcentral.com/articles/10.1186/s12916-018-1108-5)
- A Singapore climate-plus-serotype model (Nature Communications 2025) reported AUC 98% (95% CI 97.7–99.0%) with a false-alarm rate of 2.1%. This is a retrospective result, and the authors note that operational use changes transmission and complicates evaluation — [Nat Commun 2025](https://www.nature.com/articles/s41467-025-66411-6); [PMC12727700](https://pmc.ncbi.nlm.nih.gov/articles/PMC12727700/)
- A lag review (older, 2012) found rising weekly mean temperature precedes dengue increases by 4–20 weeks and cumulative rainfall by 8–20 weeks. The authors suggested a 3-month lead gives authorities enough time to act — [Optimal Lead Time for Dengue Forecast, PMC3475667](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3475667/)
- In Barbados, drought raised dengue relative risk at lead times up to 5 months and excess rainfall at 1–2 months. The final model had a 90% hit rate and a 31% false-alarm rate — [PLOS Medicine 2018, Lowe et al.](https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1002613)
- Barbados, Fletcher et al. 2025 in Lancet Planetary Health: forecasts outbreak probability and approximate case count 3 months ahead, trained on confirmed cases from 1999 to 2022. Its risk sequence is dry conditions about 5 months before, extreme heat about 3 months before, and heavy rain about 1 month before. It correctly identified past outbreaks 81% of the time — [Lancet Planet Health, DOI 10.1016/j.lanplh.2025.06.003](https://www.thelancet.com/journals/lanplh/article/PIIS2542-5196(25)00157-3/fulltext); [LSHTM news](https://www.lshtm.ac.uk/research/centres/centre-mathematical-modelling-infectious-diseases/news/466141/barbados-ministry-health-wellness-implements-new-dengue-outbreak-model); [PubMed 40840486](https://pubmed.ncbi.nlm.nih.gov/40840486/)
- Vietnam: a seasonal superensemble had its highest skill at a 1-month lead, with skill declining after that (medRxiv preprint) — [medRxiv 2020](https://www.medrxiv.org/content/10.1101/2020.05.20.20108019v1.full). A Mekong Delta district-level probabilistic ensemble of five models forecasts at 1–3-month leads, scored with Brier score and CRPS — [PMC12507206](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12507206/)
- Brazil, 2014 World Cup (Lowe, older): seasonal climate forecasts issued in February, combined with surveillance data available in March, predicted June risk, a 3-month lead. This is from a slide deck, not the paper — [ISID slides](https://isid.org/wp-content/uploads/2019/03/Lowe16.002.pdf)
- CDC/NOAA open challenge (Johansson et al., PNAS 2019): 16 teams forecast peak week, peak incidence and total incidence over 8 seasons in Iquitos and San Juan. Early-season skill was low, and skill was lowest in high-incidence seasons, which are the ones that matter most. Multi-model and multi-team ensembles consistently beat individual models. Models with biological mechanisms did not average higher skill — [NOAA repository](https://repository.library.noaa.gov/view/noaa/29091); [CDC stacks](https://stacks.cdc.gov/view/cdc/89379); [Exeter record](https://ore.exeter.ac.uk/repository/handle/10871/133961?show=full)
- Indonesia, Lampung: an LSTM on monthly incidence plus climate with 2–3-month lags. Humidity and maximum temperature were the top predictors, and a temporal-attention LSTM performed best — [Jurnal UINSU](https://jurnal.uinsu.ac.id/index.php/zero/article/view/26192)
- Indonesia, Java weekly model (BIOTROPIA 2012, older): the best predictor was a rainfall index with a 2-week lead plus a 1-week lag of incidence — [BIOTROPIA 2012](https://journal.biotrop.org/index.php/biotropia/article/download/236/212/998)
- Indonesia, Semarang: an ARDL model found 18-day lags for both humidity and precipitation — [ResearchGate](https://www.researchgate.net/publication/350343191_Climate-based_dengue_model_in_Semarang_Indonesia_Predictions_and_descriptive_analysis)
- Indonesia, Jakarta and Bali: Poisson regression produced the BMKG dengue early-warning map, with software that uses climate predictions to forecast monthly or weekly cases — [J-STAGE 2024](https://www.jstage.jst.go.jp/article/afreport/93/0/93_2024_117/_pdf)

**Leptospirosis after floods**
- Jakarta 2019–2020: 282 flood-linked cases after extreme rainfall. Authorities issued an alert in early January 2020, after the heaviest rain in about 24 years. Laboratory capacity is limited, so cases are under-diagnosed — [PLOS NTD](https://journals.plos.org/plosntds/article?id=10.1371%2Fjournal.pntd.0014243); [medRxiv](https://www.medrxiv.org/content/10.1101/2025.10.14.25338029.full.pdf)
- South Java after Cyclone Cempaka (2017–2018): the strongest rainfall–case correlations came at a 1-month lag (r = 0.745) and a 3-month lag (r = 0.856) — [JKL Unair](https://e-journal.unair.ac.id/JKL/article/view/29554)
- Bantul, Yogyakarta: rainfall correlated with cases (Spearman r = 0.372), and the authors proposed rainfall as a predictor — [BIO Web of Conferences 2024](https://www.bio-conferences.org/articles/bioconf/abs/2024/63/bioconf_sage-grace2024_03003/bioconf_sage-grace2024_03003.html)
- Manila (2001–2012): risk peaked 2 weeks after rainfall and rose non-linearly at high rainfall. Adjusting for floods weakened the rainfall effect, so floods are the mediating pathway — [PLOS NTD 2018](https://journals.plos.org/plosntds/article?id=10.1371%2Fjournal.pntd.0006331)
- Central Java: no significant flood–case association, but the study did not test lags — [JPMPH](https://www.jpmph.org/journal/view.php?doi=10.3961%2Fjpmph.25.114)

**Diarrhoea and cholera after floods**
- A systematic review found many studies report higher diarrhoea in flood-affected groups, though not all, and that flood-related outbreaks were reported for cholera and acute watery diarrhoea — [PMC5468171](https://pmc.ncbi.nlm.nih.gov/articles/PMC5468171/)
- North Jakarta surveillance (2001–2003, older) gives baseline burden, with the highest incidence in infants. It contains no flood or forecast analysis — [BMC Infect Dis 2005](https://bmcinfectdis.biomedcentral.com/articles/10.1186/1471-2334-5-89)
- West Sumatra flash flood, April–May 2024: roughly 200–300 acute diarrhoea cases listed — [Frontiers Microbiol 2025](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1694246/full)

**Malaria**
- Jayapura coastal study (2025): wind speed and sunshine duration dominated, and a GAM beat a GLM. Rainfall, humidity and temperature showed weak or insignificant correlations — [GPI Kesling](https://gpijournal.com/index.php/kesling/article/view/392)
- District-level climate data for malaria are not specifically available in Papua Province — [ScienceDirect 2025](https://www.sciencedirect.com/science/article/pii/S2666535225000448)
- Method benchmark from Africa (older, 2014): ECMWF monthly and seasonal temperature and precipitation forecasts drove a dynamical malaria model up to 4 months ahead, in Uganda, Rwanda and Malawi — [PMC4179486](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4179486/). In South Africa, a DLNM using seasonal forecasts lost accuracy as lead time grew but stayed useful to 16 weeks — [PMC6884483](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6884483/)

**ISPA and respiratory illness from haze**
- 2015 haze: a district-level study using satellite AOD as a PM2.5 proxy found no short-term effect on primary or secondary healthcare use overall. Children's primary-care respiratory visits did rise in more urban areas. The authors note the proxy may bias estimates downward — [Environ Health 2024](https://link.springer.com/article/10.1186/s12940-024-01079-x)
- Central Kalimantan, 2015–2019 Puskesmas data: effects on respiratory visits were inconclusive overall but stood out in areas dominated by fire haze — [PMC12533422](https://pmc.ncbi.nlm.nih.gov/articles/PMC12533422/)
- 2015 haze mortality was estimated at 26,300–174,300 premature deaths, a figure the Indonesian, Malaysian and Singaporean health ministries downplayed — [Mongabay 2016](https://news.mongabay.com/2016/09/se-asian-governments-dismiss-finding-that-2015-haze-killed-100300/)
- RAND and the Planetary Health Alliance have published Indonesia haze–health policy reviews — [RAND RRA1314-1](https://www.rand.org/content/dam/rand/pubs/research_reports/RRA1300/RRA1314-1/RAND_RRA1314-1.pdf); [PHA Health and Haze](https://planetaryhealthalliance.org/wp-content/uploads/2025/02/Health-and-Haze.pdf)
- One search snippet reported +1.65% (95% CI 1.51–1.80) all-cause hospitalisation per 10 μg/m³ of wildfire PM2.5 "at national level". I could not attribute it to a paper or country, so it is **unverified** — see Gaps.

### Inferences
- Dengue is the clear first candidate. The platform already produces the drivers that matter in the literature: rainfall, temperature, humidity, drought indices (SPI, consecutive dry days) and SEAS5 seasonal forecasts. The Barbados sequence of drought at 5 months, heat at 3 months and heavy rain at 1 month maps directly onto the existing SPI, extreme-weather and seasonal pipelines.
- Leptospirosis is the second candidate. The "risk window" product can be rule-based: flood event plus heavy rain, then elevated risk for 2–12 weeks in the affected kecamatan or kabupaten. It is rule-based because no case data exist for skill evaluation. It should be presented as an alert advisory, not a case forecast.
- Haze/ISPA: the platform already has PM2.5 forecasts. Because Indonesian evidence on healthcare use is mixed, the honest product is a "health advisory threshold" based on WHO and ISPU categories, not a predicted admissions number.
- Malaria and diarrhoea: evidence is too weak or too local to justify a forecast. At most, show a contextual flag such as "flood → diarrhoea risk" in the post-disaster checklist.

### Gaps
- No Indonesian dengue model with an operationally tested 3-month lead and a published hit rate or AUC was found. The Lampung, Semarang and Java studies give lags or fit, not out-of-sample skill.
- Heat-related illness in Indonesia: no search was run, for lack of tool budget, and no evidence was collected.
- The "+1.65% per 10 μg/m³" figure could not be attributed. It needs the original paper before anyone cites it.
- Diarrhoea after floods in Indonesia: no lag or forecast study was found.

---

## Q2. Operational systems and benchmarks: what lead times and performance do they report?

### Takeaway
Climate-driven dengue systems (Singapore NEA, Barbados MoH, InfoDengue, WHO-TDR EWARS) give 0–3 months of warning. Validated sensitivity is roughly 74–92%, with PPV of 50–68% for EWARS and hit rates of 81–90% for the Barbados models. Event-based surveillance systems such as EIOS and HealthMap detect outbreaks that have already happened, not forecast them, and the peer-reviewed evaluation finds they are often late. BlueDot's early-detection claims are poorly documented.

### Cited Findings
- **WHO-TDR EWARS (dengue):** calibrated dengue results gave sensitivity of 74–92% and PPV of 50–68%, and multiple-alarm prediction improved the model. The search snippet did not name the countries — [BMC Infect Dis 2022, EWARS-TDR](https://bmcinfectdis.biomedcentral.com/articles/10.1186/s12879-022-07197-6); [PMC8902764](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8902764/); [WHO IRIS EWARS guide](https://iris.who.int/server/api/core/bitstreams/50b98ccb-b193-44c9-9583-6148d6270f8f/content); [Research Square](https://www.researchsquare.com/article/rs-9103/v1)
- **InfoDengue (Brazil):** launched in 2015 with the Ministry of Health, city authorities and research institutions, and now covers 788 cities. Inputs are reported cases, climate (temperature, humidity, pressure) and filtered Twitter mentions. A Bayesian nowcast corrects for reporting delay. Weekly alerts run green, yellow, orange and red, and orange requires 3 consecutive weeks of Rt > 1 to avoid false alarms. It is a **nowcast**, not a long-lead forecast — [bioRxiv InfoDengue](https://www.biorxiv.org/content/10.1101/046193v1.full); [SciELO review](http://www.scielo.br/j/rsbmt/a/NgpWNgdtwHHJcNhKNRVYbYn/?lang=en)
- **Mosqlimate/InfoDengue sprints:** in 2024, six international teams produced weekly probabilistic forecasts for the 2024–2025 season in 5 Brazilian states — [PNAS 2025](https://www.pnas.org/doi/10.1073/pnas.2508989123); [medRxiv](https://www.medrxiv.org/content/10.1101/2025.05.12.25327419.full.pdf). In the 2025 sprint, 15 teams submitted 19 models covering all Brazilian states for 2025–2026 — [GitHub 2nd_IMDC_sprint_results](https://github.com/Mosqlimate-project/2nd_IMDC_sprint_results)
- **Singapore NEA:** LASSO model, 3-month national horizon, used operationally (see Q1) — [EHP](https://ehp.niehs.nih.gov/15-09981)
- **Barbados MoH:** in June 2024, before the ICC T20 World Cup, the model gave a 95% outbreak probability and the government added mosquito control. The Ministry then adopted it as the national EWS — [BSC news](https://www.bsc.es/news/bsc-news/bsc-leads-development-early-warning-system-predicts-dengue-outbreaks-the-caribbean-months-advance); [EurekAlert](https://www.eurekalert.org/news-releases/1095184)
- **EIOS and HealthMap** (Ganser et al. 2022, influenza, FluNet as gold standard): HealthMap and EIOS failed to detect outbreaks in a timely way in 12 and 19 of 24 countries respectively. EIOS timeliness was especially poor, with less than 50% of outbreak duration remaining at detection in 15 countries. EIOS ingests HealthMap — [JMIR PH&S 2022](https://publichealth.jmir.org/2022/10/e36211); [PMC9664335](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9664335/)
- **EIOS in Korea:** KDCA flagged 8 events via EIOS about 20 days, on average, before WHO's EIS or Disease Outbreak News. This is a preliminary assessment — [PMC12325167](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12325167/)
- **BlueDot:** sources conflict on whether it flagged Wuhan before WHO, and no primary documentation was found — [Public Health AI Handbook](https://publichealthaihandbook.com/applications/surveillance.html). Tokyo 2020 combined EIOS and BlueDot: 121 events, none high-risk, under 60 minutes per fellow per day — [WPSAR](https://ojs.wpro.who.int/ojs/index.php/wpsar/article/download/903/1063)

### Inferences
- Two different product types exist, and they should not be mixed on the platform:
  - Climate-driven risk forecasts (dengue, leptospirosis), with weeks to months of lead.
  - Event detection (EIOS-style news and rumour scraping), with zero lead: it detects what is already happening.
- The platform's existing news scraping (`scripts/umum` berita) could do the second cheaply, but the literature says such systems are often late.
- The InfoDengue design pattern fits the stack well: weekly colour alert, Rt from cases, persistence rule to suppress false alarms. It needs case data, which is the binding constraint (Q3).

### Gaps
- Malaysia iDengue: the search returned nothing on its method or performance.
- ProMED: no performance evaluation was collected.
- Copernicus/ECMWF health applications, such as C3S dengue indicators: not searched.
- EWARS-TDR: the countries behind the 74–92% sensitivity figure were not confirmed, and it is unknown whether Indonesia ever piloted the WHO-TDR dengue tool, as opposed to SKDR.

---

## Q3. Indonesia specifics: SKDR, case data availability, Indonesian forecasting studies

### Takeaway
BMKG already runs a climate-based dengue early warning, **DBDKlim**: monthly maps for the next 3 months with green, orange and red classes, built with ITB, first for Jakarta (2018), then Bali, with West Java announced. The binding constraint for Centurisk97 is case data. SKDR collects weekly aggregates from more than 10,000 facilities, but no public download was found. Province-monthly DBD data exist but are restricted or appear only in press releases. Jakarta is the one place where routine surveillance is reported to be freely accessible.

### Cited Findings
- **BMKG DBDKlim:** predicts DBD incidence and relative humidity per region. Maps show monthly DBD figures for the next 3 months in green (safe), orange (caution) and red (higher risk). Inputs are temperature, humidity and rainfall. It was developed with local health agencies and ITB, the Jakarta PKS was signed in 2018, Bali followed, and West Java was to follow — [BMKG DBDKlim](https://iklim.bmkg.go.id/id/dbdklim/); [BMKG berita](https://www.bmkg.go.id/berita/utama/informasi-peringatan-dini-dbd-berbasis-iklim); [Staklim Bali DBDKlim](https://staklim-bali.bmkg.go.id/?page_id=2708); [Bali Post 2024](https://www.balipost.com/news/2024/04/29/398033/Cegah-Dampak-Parah,BMKG-Kembangkan...html); [ANTARA](https://www.antaranews.com/berita/4891813/bmkg-perluas-layanan-informasi-iklim-untuk-tekan-kasus-dbd-nasional)
- Kemenkes data: 242,000 dengue cases and 1,400 deaths in 2024, the highest since 2016 (via ANTARA and BMKG reporting) — [ANTARA](https://www.antaranews.com/berita/4891813/bmkg-perluas-layanan-informasi-iklim-untuk-tekan-kasus-dbd-nasional)
- **SKDR (Indonesian EWARS):** collects aggregated weekly data from more than 10,000 primary health facilities — [PMC12646807](https://pmc.ncbi.nlm.nih.gov/articles/PMC12646807/)
- West Papua evaluation: sensitivity was limited by incomplete coverage, since some areas lack mobile network. Officers found 2 dengue outbreaks in 2017–2018 that EWARS did not detect. National alert thresholds may not suit some locations — [WHO SEAJPH 2020](https://journals.lww.com/wsep/Fulltext/2020/09020/Evaluation_of_the_Indonesian_Early_Warning_Alert.6.aspx)
- 2023 FETP Indonesia–Japan evaluation covered dengue and measles in Banten, East Kalimantan and South Sulawesi. The snippet gave no numbers — [PMC12867514](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12867514/)
- Bali Mandara Hospital (2025): perceived sensitivity and PPV were suboptimal, with 47% agreeing the system detects most suspected cases and 41% strongly disagreeing. These are perception measures, not calculated values — [JBE Unair](https://e-journal.unair.ac.id/JBE/article/view/1893)
- Jakarta's routine surveillance data are freely accessible from the Jakarta health department's surveillance site — [PMC12646807](https://pmc.ncbi.nlm.nih.gov/articles/PMC12646807/)
- A 2025 preprint analysed Kemenkes province-level dengue data for 2010–2024 across 34 provinces (pre-2022 boundaries), studying climate-driven spatiotemporal patterns. The full text could not be fetched (403) — [medRxiv 2025.08.24.25334332](https://www.medrxiv.org/content/10.1101/2025.08.24.25334332.full.pdf)
- UI IMERI holds province-month DBD counts for 2019–2024, restricted to GFID project researchers — [BUU AIDA catalogue](https://aida.informatics.buu.ac.th/dataset/indonesia_dengue_2019-2024_monthly)
- WHO WPRO dengue situation updates carry Indonesia's national weekly and monthly counts supplied by the Ministry — [WHO WPRO update 743, Apr 2026](https://cdn.who.int/media/docs/default-source/wpro---documents/emergency/surveillance/dengue/dengue_20260416.pdf)
- Province totals appear in press releases, for example West Java with 32,761 cases from January to May 2024 — [Katadata](https://databoks.katadata.co.id/en/consumer-services/statistics/727c0c27890fb59/119000-dengue-fever-cases-reported-in-indonesia-until-may-2024-heres-the-distribution). By mid-2025, three Papua provinces had reported no dengue — [Katadata 2025](https://databoks.katadata.co.id/en/consumer-services/statistics/68591d2fe5c87/67000-dengue-fever-cases-in-indonesia-until-mid-2025-highest-in-west-java)
- OpenDengue is a global compilation from 843 sources, 99.8% of it weekly or monthly. Its Indonesian sub-national coverage was not confirmed — [Scientific Data 2024](https://www.nature.com/articles/s41597-024-03120-7)
- An IPB early-warning model for dengue and malaria, intended to guide fogging timing, is mentioned in a 2019 opinion piece — [Jakarta Post 2019](https://www.thejakartapost.com/academia/2019/02/19/managing-climate-risks-for-early-warning-system-on-epidemics)

### Inferences
- Do not duplicate DBDKlim. The cheapest honest move is to **link or ingest DBDKlim** for the provinces it covers. The platform's added value is extending the same climate-hazard logic to all 38 provinces using its own SPI, SEAS5 and extreme-rain pipelines, clearly labelled as a *climate suitability index* and not a case forecast.
- Without public kab-level weekly cases, the platform cannot back-test (uji balik) a case forecast. Per the repo's own rule (validasi-model, no false precision), any DBD product without a back-test must be presented as a "hazard-driver index", not as predicted cases.
- Jakarta is the one place where a real back-test may be feasible, using the Jakarta surveillance portal plus the platform's weather history.

### Gaps
- Whether SKDR or Satu Data Kesehatan exposes any public API or download: not found. Contact Kemenkes Ditjen P2P directly.
- BPS health tables: not checked. BPS typically publishes annual province DBD counts in Statistik Kesehatan, but this is unverified here.
- DBDKlim's current 2026 status, update cadence and skill: not verified. Its methodology page and any published validation were not read.
- The Yogyakarta and Bandung DBD-climate forecasting studies the brief asked about were not found in the searches run.

---

## Q4. Open-source code on GitHub: which could be ported to Python stdlib?

### Takeaway
The active, open ecosystem is Brazilian: the Mosqlimate and InfoDengue organisation, with sprint results, a stacking ensemble and a Python client, plus the CDC 2015 challenge data repo. Most entries are Python or R with ML or INLA dependencies, so none ports directly to stdlib-only Python. The parts that are portable are the simple ones: InfoDengue's Rt-based colour-alert rule, distributed-lag climate indices, and a LASSO-like or logistic outbreak classifier with hand-written coefficients. The repo already does the last kind of thing for its handwritten GBDT.

### Cited Findings
- Mosqlimate-project GitHub org (data platform, client, sprint repos) — [GitHub org](https://github.com/Mosqlimate-project)
- `Mosqlimate-project/Dengue-Forecast-Ensemble`: a stacking regression ensemble of the 2024 sprint models — [GitHub](https://github.com/Mosqlimate-project/Dengue-Forecast-Ensemble)
- `Mosqlimate-project/2nd_IMDC_sprint_results`: 2025 sprint, 15 teams, 19 models — [GitHub](https://github.com/Mosqlimate-project/2nd_IMDC_sprint_results)
- `Mosqlimate-project/mosqlimate-client`: a Python client that fetches InfoDengue cases by city geocode or state — [GitHub](https://github.com/Mosqlimate-project/mosqlimate-client); platform description at [arXiv 2410.18945](https://arxiv.org/pdf/2410.18945)
- `kamrul28890/3rd_imdc_purdue_neuralearth`: an IMDC 2026 weekly probabilistic dengue and chikungunya pipeline — [GitHub](https://github.com/kamrul28890/3rd_imdc_purdue_neuralearth)
- `fccoelho/mosqlimate-ai-competitor`: an AI multi-agent forecasting competitor — [GitHub](https://github.com/fccoelho/mosqlimate-ai-competitor)
- `cdcepi/dengue-forecasting-project-2015`: data and forecasts from the CDC/NOAA challenge — cited via [Exeter record](https://ore.exeter.ac.uk/repository/handle/10871/133961?show=full)

### Inferences
- A stdlib-portable recipe, adapted from the cited methods:
  - Weekly lagged covariates from existing pipelines: rainfall sums over 1–2 months, temperature anomaly over 3 months, SPI or consecutive dry days over 5 months.
  - An InfoDengue-style persistence rule (N consecutive weeks above threshold before escalating).
  - A logistic or Poisson model with fixed coefficients fitted offline where case data exist.
- INLA spatial models (Lowe) and LSTM models are not portable to stdlib. They should be treated as offline research, not pipeline code.

### Gaps
- GitHub stars, activity and language for each repo were not collected. No fetches were made to GitHub pages.
- No Lowe-authored INLA dengue repo was found by search. The DengAI (DrivenData) winning solutions were not found or verified.
- The Mosqlimate `dengue_sprint_paper` repo is referenced in the PNAS paper but was not confirmed.

---

## Q5. Zoonosis / One Health (avian flu, rabies, anthrax) and PMK/FMD 2022: any forecastable component?

### Takeaway
Weak. For FMD (PMK) in Java, recent work produced static risk maps from precipitation, livestock markets, slaughterhouses and herd sizes, with no temporal forecast. H5N1 risk work in Indonesia is old (2008–2011), driven by expert weighting, with rice paddies and ducks as the main factors. No climate-driven, lead-time forecast was found for any zoonosis in Indonesia.

### Cited Findings
- FMD on Java: the 2022 outbreak peaked in June 2022 and declined through 2023. Significant risk factors were annual precipitation, livestock markets, slaughterhouses, animal health centres, and cattle and goat populations. Higher-risk areas were in eastern and central Java — [BMC Vet Res 2025, s12917-025-04621-2](https://biomedcentral-bmcvetres.publicaciones.saludcastillayleon.es/articles/10.1186/s12917-025-04621-2); [Utrecht portal](https://research-portal.uu.nl/en/publications/spatial-temporal-distribution-and-risk-factors-of-foot-and-mouth-/)
- Central Java FMD: more than 65,000 livestock affected, with a peak in week 11. Emergency vaccination began about 7 weeks after the outbreak started — [PMC12451135](https://pmc.ncbi.nlm.nih.gov/articles/PMC12451135)
- FMD reached 15 provinces in 2022 — [Katadata](https://databoks.katadata.co.id/en/consumer-services/statistics/2f05c2dd42b192f/foot-and-mouth-disease-fmd-outbreak-spreads-to-15-provinces-which-ones)
- H5N1 Indonesia multicriteria risk map (older, about 2009): rice paddies were the most important spread factor — [SVEPM poster](https://svepm.org.uk/wp-content/uploads/2023/05/deGlanville-Mapping-the-risk-of-spread-of-highly-pathogenic-avianiInfluenza-H5N1-in-Indonesia-using-multicriteria-decision-modelling.pdf); [FAO AGRIS](https://agris.fao.org/search/en/providers/122432/records/6473a38a96fdec8b71b47335)
- Seasonality of human H5N1 versus temperature, precipitation and humidity in Indonesia and Egypt (2011, older). The search did not show the findings — [PMC3164700](https://pmc.ncbi.nlm.nih.gov/articles/PMC3164700)
- In Thailand and Vietnam (older, 2008), duck abundance, human population and rice cropping intensity mattered more than chicken numbers. The authors cautioned against extrapolating to Indonesia — [CIDRAP](https://www.cidrap.umn.edu/avian-influenza-bird-flu/ducks-rice-people-add-risk-h5n1-outbreaks)

### Inferences
- For zoonoses, the platform's realistic role is **context layers**, not forecasts. Examples:
  - Flood or drought stress overlaid on livestock density and markets for FMD.
  - Event-based news alerts for rabies, anthrax and H5N1 from the existing berita scraping, framed as detection with zero lead.
- Animal-disease case data sit with Kementan (iSIKHNAS). Access was not investigated.

### Gaps
- Rabies and anthrax: no searches were run, for lack of budget.
- iSIKHNAS data access and any Kementan FMD forecasting: not investigated.
- No evidence was found of any climate-lead forecast for H5N1 in Indonesia after 2011.
