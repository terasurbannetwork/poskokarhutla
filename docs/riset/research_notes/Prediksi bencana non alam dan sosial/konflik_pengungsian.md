# Forecasting social disasters (conflict, unrest, land conflict, displacement), with climate/disaster triggers, as a benchmark for Centurisk97

Research date: 2026-10-29. Scope: what can be forecast responsibly, at what spatial level, and on what evidence, for an Indonesian 38-province hazard platform (Python stdlib pipelines, Cloudflare Worker + D1, vanilla JS). Older sources are marked [klasik].

## 1. Operational conflict and unrest forecasting systems: method, resolution, reported accuracy

### Takeaway
The mature systems (VIEWS, ACLED CAST, ConflictForecast, Early Warning Project) forecast **armed or political violence counts** at **country-month** level, or **55 km grid-month** level at the finest, with horizons of 1–36 months. Their skill comes mostly from persistence and spatial clustering: conflict recurs where it already exists. Predicting **onset in previously peaceful places**, which is the Indonesian case for most kabupaten, remains the hard, low-precision problem. The best-documented unrest system, EMBERS, reached precision of about 0.87 and recall of about 0.79, but it had a days-scale lead time, sat on top of a large news and social-media ingestion stack, and was funded by IARPA.

### Cited Findings
**VIEWS (Uppsala/PRIO), now on the "views-platform" codebase**
- VIEWS is an ensemble of constituent models, each built around a conflict-research theme or a specific ML method. It produces monthly forecasts 36 months ahead for UCDP violence types. — [Hegre et al. 2019 JPR (via KOPS)](https://kops.uni-konstanz.de/server/api/core/bitstreams/197041e4-3a22-46b3-8ac4-1d0f6c75b916/content); [SSOAR record](https://www.ssoar.info/ssoar/handle/document/62201?show=full)
- The 2019 JPR paper evaluates forecasts for October 2018 to October 2021. It finds that ensembles beat several baselines at both country and subnational level. — [JPR 2019](https://journals.sagepub.com/doi/10.1177/0022343319823860)
- ViEWS2020 added new training and weighting infrastructure, with a retrospective evaluation for July 2018 to December 2019. Its metrics compare favourably with the earlier 2015–17 out-of-sample results. — [Hegre et al. 2020/21 JPR (OECD copy)](https://oecd-opsi.org/wp-content/uploads/2022/09/Hegre-et-al-2020-Journal-of-Peace-Research.pdf)
- Spatial unit: PRIO-GRID cells of 0.5° × 0.5° (about 55 km at the equator). The country level is global, but **subnational forecasts are restricted to Africa and the Middle East**. Targets are UCDP "best" fatality estimates for state-based conflict, 1–36 months ahead. — [2023/24 VIEWS Prediction Challenge, arXiv 2407.11045](https://arxiv.org/pdf/2407.11045); [PRIO project page](https://www.prio.org/projects/1977)
- Independent benchmark (HydraNet, 2025 arXiv): on a 36-month test, VIEWS and HydraNet beat a no-change baseline on MSE, AP and AUC. On the **Brier score the naive baseline stays competitive**. — [arXiv 2506.14817](https://arxiv.org/pdf/2506.14817)
- 2020/21 prediction competition (Vesco, Colaresi, Hegre; International Interactions special issue): predict changes in fatalities at country-month and PRIO-GRID-month for October 2020 to March 2021. Findings: models beat the baseline. The ensemble was significantly better than the average individual entry. Models that capture temporal recurrence and spatial clustering did well even with few predictors. The authors note a "ceiling on model performance". New metrics TaDDA and pEMDiv were introduced. No numeric scores appear on the PRIO summary page. — [PRIO comment 585](https://www.prio.org/comments/585)
- 2023/24 challenge: predict the number of fatalities **with uncertainty** (a distributional forecast). — [arXiv 2407.11045](https://arxiv.org/pdf/2407.11045); [PRIO publication 14414](https://www.prio.org/publications/14414)

**ACLED CAST (Conflict Alert System)**
- Forecasts political violence up to 6 months ahead, updated monthly, at global, national and subnational level, broken down by event type (battles, explosions/remote violence, violence against civilians). Accuracy metrics for past forecasts are published in a dashboard tab. — [ACLED CAST page](https://acleddata.com/early-warning/conflict-alert-system/)
- Third-party description: an ML model covering every country, national and subnational, up to 6 months ahead. — [Paris Peace Forum](https://parispeaceforum.org/projects/cast-the-conflict-alert-system/)
- Example of self-reported accuracy (March 2024 report): a global February forecast of 11,787 events, with actual events 31 above the forecast (about 0% difference). Of countries with at least 20 events, nine were within 5% of the forecast. Aggregate accuracy hides larger country-level misses. — [ACLED CAST report March 2024](https://acleddata.com/wp-content/data-viz/cast-report/march-2024/report.html)
- A peer-review "Model Report" for CAST exists in a catalogue entry, but its contents were not retrieved. — [AmeriGEOSS catalogue](https://data.amerigeoss.org/it/dataset/repository-for-pdf-files/resource/7faed1a0-9b5e-4c7e-890e-ab3f654a028d)

**ConflictForecast.org (Mueller & Rauh, news text)**
- Method: LDA topic model over **3.8 million newspaper articles**. Topic shares feed a random forest that predicts conflict. The authors' claim: "hard" onsets in previously peaceful countries can be forecast, and supervised learning helps despite small samples. — [Hard Problem of Prediction, CEPR DP13748](https://repec.cepr.org/repec/cpr/ceprdp/DP13748.pdf); [summary](https://causalclaims.trfetzer.com/paper/DP13748.html)
- Public dataset (Mueller, Rauh & Seimon 2024, *Data & Policy* 6, doi 10.1017/dap.2024.10): monthly news topics and armed-conflict forecasts from January 2010, covering more than 170 countries and **about 65,000 grid cells of 55 × 55 km**, updated monthly at conflictforecast.org. — [Cambridge Core PDF](https://core-cms.cambridgecore.org/core/services/aop-cambridge-core/content/view/AADA08BD5FC80EDD01E5CEBA7434F6E0/S2632324924000105a.pdf/introducing-a-global-dataset-on-conflict-forecasts-and-news-topics.pdf); [DOAJ](https://doaj.org/article/d7b71cb6bf064b5293ff50fba098f5c5)
- Framing: onsets in peaceful countries are rare events, which is why they are hard to predict. — [BSE Focus](https://focus.bse.eu/can-machine-learning-help-policymakers-detect-conflict/)

**Early Warning Project (USHMM, mass-killing risk)**
- Annual statistical risk assessment since 2014. Definition: at least 1,000 civilians deliberately killed within a year because of group membership. — [EWP accuracy page](https://earlywarningproject.ushmm.org/accuracy)
- Self-evaluation results: average risk was about 8% in onset years versus 3% otherwise. About two-thirds of onsets since 1994 were in the Top-30 list in the two years before. **At a 4% "high risk" threshold, the model produces about 20 false positives per onset.** A model that always predicts "no" would be about 99% accurate, so accuracy is a misleading metric. — [EWP accuracy page](https://earlywarningproject.ushmm.org/accuracy)

**EMBERS (Virginia Tech et al., IARPA Open Source Indicators) [klasik, 2012–2016]**
- Live forecasts of civil unrest in Latin America since late 2012. MITRE scored them independently against a newspaper-coded "Gold Standard Report". Metrics: lead time, precision, recall, and a quality score covering date, location and type. — [EMBERS flyer](https://people.cs.vt.edu/naren/papers/EMBERSFlyer.pdf); [KDD 2014 "Beating the News"](https://arxiv.org/pdf/1402.7035)
- Fused system (KDD 2014): quality score 3.11, **average lead time 8.8 days, precision 0.69, recall 0.82**. Claimed hits: Brazil June 2013 and Venezuela February 2014. — [arXiv 1402.7035](https://arxiv.org/pdf/1402.7035)
- Month 36 versus IARPA targets: quality 3.4 vs 3.5 target, **recall 0.79 vs 0.80, precision 0.87 vs 0.80**. Early months scored lower. — [EMBERS at 4 years, arXiv 1604.00033](https://arxiv.org/pdf/1604.00033)
- The planned-protest model, which detects announced future protests in news and social media, had an **average lead time of 4.08 days** across 10 countries. The authors note that most protests in lawful settings are announced in advance. — [IAAI 2015](https://people.cs.vt.edu/~naren/papers/plannedProtest_IAAI15.pdf); [AI Magazine 2016](https://linqs.org/assets/resources/muthiah-aim16.pdf)
- Volume: about 45–50 alerts per day across Latin America. — [EMBERS flyer](https://people.cs.vt.edu/naren/papers/EMBERSFlyer.pdf)

### Inferences
- None of these systems produce subnational Indonesian forecasts that could be ingested. VIEWS' subnational grid excludes Asia. CAST does have subnational outputs, but access is gated by ACLED terms. ConflictForecast's grid is global, so it is the only candidate for a ready-made Indonesian grid layer, subject to its licence (not verified).
- What works generically is persistence plus spatial lags plus news-volume signals. For Indonesia that means a **"recent history" layer** (events in the last 3–12 months per kabupaten) is the honest baseline. Any model has to beat it before a "forecast" label is justified.
- EMBERS' best component, detecting *announced* protests, maps directly onto the platform's existing curated social-media and TikTok analysis. Its lead time is days, not months.
- The Early Warning Project's 20:1 false-positive ratio is the realistic order of magnitude for rare-event alarms. Ranking or watch lists beat binary alerts.

### Gaps
- No numeric VIEWS competition scores were retrieved (only qualitative). ACLED's CAST methodology page and peer-review contents were not read.
- ConflictForecast's AUC and precision figures, and its licence and terms for redistribution, were not retrieved.
- Crisis Group CrisisWatch: no source retrieved. It is known to be a qualitative monthly expert tracker (deteriorated/improved/risk alerts), but that is unverified in this session.
- GDELT-based unrest prediction beyond EMBERS (accuracy of GDELT-only models) was not found. EMBERS used multiple feeds, not GDELT alone.

## 2. Displacement forecasting and data (IOM DTM, IDMC, UNHCR Jetson, DRC Foresight)

### Takeaway
Displacement **data** for Indonesian disasters exist: IDMC country figures and IOM DTM deployments for Palu 2018, Sinabung and Agung. Displacement **forecast models** (Jetson, Foresight) are conflict- and drought-oriented and country- or region-level. Their published accuracy is thin, exploratory or self-reported. In Indonesia, disaster displacement is mostly pre-emptive evacuation, so it is better estimated from hazard exposure (the platform's existing domain) than from social-conflict models.

### Cited Findings
- IDMC counts about 6.5 million new disaster displacements in Indonesia from January 2010 to December 2021, including about 749,000 in 2021. Most were **pre-emptive evacuations**. Flood displacements peak in December–January and concentrate in Central and West Java and Aceh. — [IDMC Indonesia country report 2022](https://api.internal-displacement.org/sites/default/files/publications/documents/220304_IDMC_CountryReport_Indonesia.pdf)
- Global context: 2024 had a record 45.8 million disaster displacements (GRID 2025). 2025 had about 29.9 million across 140 countries, above the 15-year average of about 24 million. — [WTW summary of IDMC](https://www.wtwco.com/en-ae/insights/2025/12/disaster-displacement-how-growing-risks-are-reshaping-resilience); [UNDRR/PreventionWeb on IDMC risk model](https://www.preventionweb.net/resource/case-study/understanding-disaster-displacement-and-assessing-future-risk)
- IOM DTM Indonesia: introduced in coordination with the government to build capacity at BNPB and Kemensos. Deployments include Sinabung 2016, Agung 2017 and Central Sulawesi 2018. In Central Sulawesi, three mobility-tracking rounds were run with about 350 student enumerators per round. A DTM API exists. — [IOM DTM Indonesia](https://dtm.iom.int/indonesia)
- Palu, Donggala and Sigi DTM round 1: more than 211,000 displaced across 980 sites. — [OCHA snapshot Oct 2018, ReliefWeb](https://reliefweb.int/report/indonesia/asia-and-pacific-weekly-regional-humanitarian-snapshot-23-29-october-2018)
- UNHCR **Project Jetson** (2017, Somalia): monthly predicted IDP arrivals for 18 regions, using about 10 variables (commodity prices, rainfall, conflict and others). Models are selected by R² and MAE, and predictions are shown as ranges (moderate to critical). No published MAE figure was found. It relied on about 10 years of historical displacement data, which is rare. — [Migration Data Portal](https://migrationdataportal.org/data-innovation/Project-Jetson-experiment-predicting-movements-displaced-Somalia-machine-learning); [Jetson archive](https://webarchive.archive.unhcr.org/20190720143802mp_/http://jetson.unhcr.org); [Notre Dame case study](https://aegai.nd.edu/assets/507344/alina_jetson_casestudy.pdf)
- **DRC Foresight**: an ML plus Bayesian-network model of total forced displacement from a country 1–3 years ahead, using 148 indicators from 18 open sources. The OCHA Centre for Humanitarian Data's peer review completed only steps 1–2 of 5 **because the model is still exploratory**. Accuracy claims in summaries are qualitative ("high degree of accuracy"). — [Centre for Humanitarian Data review](https://centre.humdata.org/reviewing-the-danish-refugee-councils-foresight-model/); [HDX DRC forecasts dataset](https://data.humdata.org/dataset/drc-displacement-forecasts); [Global Displacement Forecast 2026 snapshot](https://www.anticipation-hub.org/download/file-6118)

### Inferences
- For Centurisk97, "displacement forecasting" should mean **expected evacuees given a hazard forecast** (exposure × historical evacuation rate per hazard and kabupaten), calibrated on IDMC/DTM/BNPB counts. That stays within the platform's competence and avoids conflict prediction.
- Conflict-driven displacement in Papua is real, but no structured, open, regularly updated dataset was found. Do not model it; at most, cite reports.

### Gaps
- IDMC's model-based average annual displacement for Indonesia (from the Global Disaster Displacement Risk model) was not retrieved.
- Numeric error metrics for Jetson or Foresight were not found (Foresight's Model Evaluation Matrix may contain them).
- No source on Papua conflict-displacement data (DTM results returned only Papua New Guinea).

## 3. Climate/disaster → conflict evidence: strength and controversy

### Takeaway
There is a real but **modest and conditional** effect. Experts attribute about 3–20% of last-century within-country conflict risk to climate, and rank it well below development and state capacity. Disaster→conflict links appear only in countries with large populations, ethnic political exclusion and low development. Food-price *levels* (not volatility) predict unrest. The literature supports climate as a **risk multiplier to display as context**, not as a predictor that names a place for a kabupaten-month alarm.

### Cited Findings
- Hsiang, Burke & Miguel 2013 (*Science*) [klasik]: a meta-analysis of about 60 studies. A 1 SD shift toward warmer temperatures or more extreme rainfall is associated with about **4% more interpersonal violence and 14% more intergroup conflict** (median). Critics note the lack of mechanisms. — [Science PDF (WHOI copy)](https://www.whoi.edu/cms/files/Science-2013-Hsiang-_169884.pdf); [IDEAS](https://ideas.repec.org/p/cdl/econwp/qt28c3c631.html); [Physics Today](https://physicstoday.aip.org/news/is-there-a-link-between-the-weather-and-human-conflict)
- Controversy [klasik]: Buhaug et al. 2014 (*Climatic Change*) argue that the "consistent climate effect" contrasts with the wider literature and dispute the fixed-effects meta-analysis approach. Hsiang, Burke & Miguel reply that Buhaug et al. misclassify studies and make coding errors. Buhaug & Nordkvelle maintain their concerns remain valid. — [Hsiang et al. reply](https://emiguel.econ.berkeley.edu/research/reconciling-climate-conflict-meta-analyses-reply-to-buhaug-et-al/); [Buhaug et al., Essex repository](https://repository.essex.ac.uk/14106/1/art%253A10.1007%252Fs10584-014-1266-1.pdf); [PRIO rejoinder](https://www.prio.org/publications/7521)
- Mach et al. 2019 (*Nature* 571, structured elicitation of 11 experts): climate has affected within-country armed conflict, but low socioeconomic development and low state capability are **substantially more influential**. Climate's share of conflict risk over the last century is about **3–20%**; this figure comes from the press release and should be checked against the paper. Intensifying climate change is expected to raise future risk. — [PRIO record](https://www.prio.org/publications/11405); [William & Mary press release](https://www.wm.edu/news/stories/2019/in-nature-the-role-of-climate-change-in-armed-conflict.php)
- Schleussner et al. 2016 (*PNAS*): about **23% of conflict outbreaks in highly ethnically fractionalized countries** coincide with climatic calamities (1980–2010). — [Stockholm Resilience Centre](https://www.stockholmresilience.org/publications/publications/2017-01-04-armed-conflict-risks-enhanced-by-climate-related-disasters-in-ethnically-fractionalized-countries.html)
- Ide, Brzoska, Donges & Schleussner 2020 (*Global Environmental Change* 62:102063; multi-method): climate-related disasters increase the risk of armed-conflict onset, but **only in countries with large populations, political exclusion of ethnic groups and low development**. Disasters do not directly trigger conflict. — [Climate Analytics](https://climateanalytics.org/publications/multi-method-evidence-for-when-and-how-climate-related-disasters-contribute-to-armed-conflict-risk); [PIK press release](https://www.pik-potsdam.de/@@multilingual-selector/3f57737dc733465f8c8e55ab29a49c26/en)
- Bellemare 2015 (*AJAE* 97(1):1–21): monthly international data for 1990–2011, using natural disasters as an instrument. **Higher food price levels raise unrest; volatility does not.** — [IDEAS](https://ideas.repec.org/a/oup/ajagec/v97y2015i1p1-21..html)
- Lagi, Bertrand & Bar-Yam 2011 (arXiv working paper, not peer-reviewed at the time) [klasik]: identifies an FAO Food Price Index threshold above which protests become likely, and projected a crossing to the high-impact domain in 2012–2013. — [arXiv 1108.2455](https://arxiv.org/abs/1108.2455); [NECSI](https://necsi.edu/the-food-crises-and-political-instability-in-north-africa-and-the-middle-east)

### Inferences
- Indonesia is ethnically diverse, populous and middle-income, with localized exclusion (Papua). So the conditional disaster→conflict findings are plausible at subnational scale, but none were estimated *for* Indonesia.
- A defensible platform feature: show **food-price level** (for example rice prices from the national strategic food price panel) alongside drought, flood and fire stress as "social stress context". It should not be framed as a riot probability.

### Gaps
- The exact Lagi threshold value (often quoted as FAO FPI ≈ 210) is **not confirmed** in sources read. Verify against the full PDF.
- The 2015 Burke–Hsiang–Miguel *Annual Review of Economics* update (commonly quoted as about 2.4% interpersonal and 11.3% intergroup per SD) was **not verified** in this session.
- No Indonesia-specific econometric study linking rainfall, temperature or disasters to conflict was retrieved.

## 4. Indonesia: data sources and studies

### Takeaway
Indonesia **lost its best subnational violence dataset** when SNPK/NVMS stopped collecting in March 2015. Current options are ACLED (from 2015, national with sub-national coding, account-gated), CSIS CVEW (2019–2021, province level, media-coded), and KPA's annual agrarian-conflict counts (province and sector, yearly). UU 7/2012 legally obliges government and regional governments to build conflict early-warning systems, but no public government dashboard was found. Fire→land-conflict links are documented in CIFOR case studies, and the causality runs in both directions: tenure conflict causes fires.

### Cited Findings
**Datasets**
- **SNPK / National Violence Monitoring System**: a World Bank, Habibie Center and Kemenko PMK partnership from 2012, owned by the coordinating ministry (snpk-indonesia.com). It initially covered 13 provinces, with incidents back to 1997 at village-to-province resolution. — [Habibie Center study 2014](https://mail.habibiecenter.or.id/storage/publications/34756d8b3eff8a8e8a33a31cafe2b0eb.pdf); [IHSN catalogue](https://datacatalog.ihsn.org/catalog/6645)
- **Data collection for NVMS ended in March 2015.** — [CSIS CVEW](https://cvew.csis.or.id/)
- The World Bank Microdata Library still hosts SNPK files by year (for example 2002, 2006, 2009, 2014), which are usable as historical training data. — [WB Microdata 2626](https://microdata.worldbank.org/catalog/2626/variable/F1/V63?name=s5); [WB Microdata 2635](https://microdata.worldbank.org/catalog/2635/data-dictionary)
- **CSIS Collective Violence Early Warning (CVEW)**: coded from online, local and reputable media (Kompas, Jawa Pos group, local papers) using the UN Framework of Analysis for Atrocity Crimes. Phase 2 covers January 2019 to December 2021 at **province** level, with a "live CVEW API" mentioned. The dashboard did not load when checked, and no update date was found. — [cvew.csis.or.id](https://cvew.csis.or.id/); [violence.csis.or.id](https://violence.csis.or.id/)
- **ACLED Indonesia**: coverage starts January 2015. In February 2024 ACLED reviewed 1,199 "violent demonstration" events and reclassified 488 as peaceful protests, about a 45.5% drop. These were mostly tyre burning and road blocking. **Trend analyses spanning this recode are biased** unless the corrected data are used. — [ACLED update log 27 Feb 2024](https://acleddata.com/knowledge-base/27-february-2024-update-correction-of-violent-demonstration-events-in-indonesia)
- ACLED notes: Papua violence reached a year-high in May 2025, and Indonesia's anti-government demonstrations turned deadly in August 2025. Data export requires a free myACLED account. — [ACLED Indonesia tag](https://acleddata.com/tag/indonesia); [ACLED Asia-Pacific](https://acleddata.com/article-categories/asia-pacific)
- **KPA agrarian conflict (Catatan Akhir Tahun)**: 2024 had **295 conflicts** covering 1,113,577 ha and affecting about 67,436 families, up about 21% from 241 in 2023. By sector: plantations 111 (mostly palm oil), infrastructure 79, mining 41, property 25. By province: South Sulawesi 37, North Sumatra 32. Semester 1 2025: 114 conflicts on 266,097 ha, affecting 96,320 families. — [Kompas 22 Jan 2025](https://www.kompas.com/properti/read/2025/01/22/120325721/konflik-tanah-tahun-2024-naik-21-persen-perkebunan-sawit-mendominasi); [GoodStats](https://data.goodstats.id/statistic/perkebunan-jadi-sektor-dengan-konflik-agraria-terbanyak-pada-2024-lpeuD); [Mongabay Dec 2025](https://mongabay.co.id/2025/12/26/catatan-akhir-tahun-reforma-agraria-masih-sebatas-janji/); [KPA 2023 annual report](https://pustaka.taratsa.id/book/2023-annual-agrarian-report-the-decade-of-agrarian-crises-the-legacy-of-the-nawa-cita-and-the-future-of-agrarian-re-6815/)
- KPA delivered its 2024 and 2025 year-end reports to the DPR (May 2026 article). The 2025 totals were not found. — [JatimTimes 18 May 2026](https://jatimtimes.com/baca/3331343867/20260518/185800/delapan-bulan-pansus-pka-terbentuk-kpa-tagih-janji-penyelesaian-konflik-agraria-struktural-ke-dpr)

**Legal basis**
- UU 7/2012 on Penanganan Konflik Sosial: prevention, cessation and post-conflict recovery. Article 6 lists "membangun sistem peringatan dini" (building an early-warning system) as a prevention measure. Article 10 obliges Pemerintah and Pemerintah Daerah to build early warning for conflict-prone areas, including dissemination to the public via communication media. The elucidation says earlier handling tended to be militaristic and repressive. — [UU 7/2012 (Kemhan PDF)](https://www.kemhan.go.id/itjen/wp-content/uploads/migrasi/peraturan/uu7-2012gab_0.pdf); [Pasal 6](https://api-law.crpg.info/peraturan/uu/7/2012/pasal/6); [Pasal 10](https://api-law.crpg.info/peraturan/uu/7/2012/pasal/10)
- Local and academic EWS examples: a Yogyakarta social and religious conflict information system built bottom-up from kecamatan data, and the ICRS "Interfaith Weather Station". — [UMY repository](https://repository.umy.ac.id/handle/123456789/35265); [UGM IGSC paper](https://igsci.pasca.ugm.ac.id/wp-content/uploads/sites/1426/2023/05/igsc-07-022-leonard-chrysostomos-epafras.pdf)

**Hazard–conflict studies in Indonesia**
- Riau (CIFOR): more than 28% of company oil-palm land in northern Riau lies **outside** legal concession boundaries. Up to 75% of fires were not in forest; most targeted idle land. — [CIFOR Purnomo et al.](https://cifor-icraf.org/publications/pdf_files/articles/APurnomo1902.pdf)
- Burning inside a concession does not mean the company did it. Concession land may be claimed and occupied by other users. — [CIFOR Forests News](https://forestsnews.cifor.org/23479/new-maps-reveal-more-complex-picture-of-sumatran-fires?fnl=)
- Riau and Jambi: **tenure conflict often triggers fire**, with fire used to destabilise livelihoods and force people off land. Community–company partnerships were associated with lower fire incidence. — [CIFOR publication 30047](https://cifor-icraf.org/knowledge/publication/30047)
- Older CIFOR review [klasik]: companies used fire to drive communities off land, and communities used fire to deter companies from claimed land. — [CIFOR Kurniawan 2004](https://cifor-icraf.org/publications/pdf_files/articles/AKurniawan0401.pdf); [ASEAN Haze portal, Tanah Tumbuh Jambi](https://hazeportal.asean.org/?p=5734)
- October 2026: authorities opened an inquiry into suspected land-clearing fires in a concession run by a Kencana Agri subsidiary. — [The Star, 20 Oct 2026](https://www.thestar.com.my/business/business-news/2026/10/20/planter-faces-investigation-over-fire)
- Drought: in 2017, 2,726 villages in 105 kabupaten/kota were affected, with 3.9 million people needing clean water. Evidence on inter-village water conflict is only case-level (a Central Java water-sharing action research project 2006–09, and Aceh irrigation disputes). — [AHA Centre ADInet](https://adinet.ahacentre.org/report/indonesia-drought-in-2726-villages-across-country-20171031); [Cahiers Agricultures 2018](https://www.cahiersagricultures.fr/articles/cagri/full_html/2018/02/cagri170155/cagri170155.html)
- Palu 2018 (press reports): at least 92 people detained for looting. Survivors blocked aid trucks after days without food or water. A military commander ordered soldiers to shoot looters, and police used warning shots and tear gas. Remote Donggala complained aid was concentrated in Palu. — [Inquirer/AFP](https://newsinfo.inquirer.net/1038919/indonesian-soldiers-ordered-to-fire-on-looters-in-disaster-zone); [Inquirer arrests](https://newsinfo.inquirer.net/1038296/indonesia-arrests-dozens-for-looting-in-quake-tsunami-zone/amp); [Jakarta Post](https://www.thejakartapost.com/news/2018/10/01/chaos-in-palu-after-quake-as-survivors-deal-with-hunger-thirst)

### Inferences
- **The best platform fit is concession × fire × KPA conflict overlap.** The platform already has fire hotspots and concession maps. Showing "fire in a concession with a known agrarian conflict" as **context** is evidence-backed by CIFOR. Attributing blame is not: the CIFOR finding warns against it.
- **Post-disaster aid-access stress** (Palu pattern): a quick indicator is displaced population (DTM or BNPB) ÷ aid access or road damage, plus the number of days since the event. This is an operational logistics signal, not a "riot forecast".
- At kabupaten-month level, the only regularly updated event source is ACLED. Without it, the platform's own curated media feed would need coding into an SNPK-style schema, which is labour-heavy.

### Gaps
- **BNPB DIBI "konflik sosial" records**: no source retrieved on whether DIBI still records social conflict, or on its completeness. Unverified.
- **Kemenko Polhukam / Kemendagri (Kesbangpol) early-warning dashboard**: no public source found.
- **Komnas HAM complaint data** by province and type: not searched successfully.
- No peer-reviewed Indonesia-wide quantification of drought → water conflict.
- No peer-reviewed analysis of post-disaster aid conflict in Palu was retrieved (press only).
- Transmigration/Papua conflict studies were not retrieved. ACLED has a 2022 Papua report, but it was not read.
- The UU 24/2007 definition of "bencana sosial" was taken from the task brief and not re-verified in this session.

## 5. Open code on GitHub (portability to a stdlib-Python / Worker stack)

### Takeaway
The open conflict-forecasting code is real but heavy and low-traction. views-platform is a multi-repo Python MLOps stack with 0–5 stars per repo, actively pushed in October 2026, and built on pandas/ML libraries. Nothing is portable to a stdlib-only pipeline. The reusable pieces are **ideas** (step-shift models, persistence baselines, evaluation metrics) and **data clients** (GDELT).

### Cited Findings (GitHub API, queried 2026-10-29)
- `views-platform/views-pipeline-core`: 3 stars, Python, MIT, pushed 2026-10-29. Described as a pipeline for "monthly predictions of future violent conflict at both country and sub-country levels". Sibling repos: `views-models` (2★), `views-hydranet` (5★), `views-stepshifter`, `views-baseline`, `views-evaluation`, `views-r2darts2`, `views-datafactory`, `views-nowcasting` (0–1★ each, all Python, mostly pushed September–October 2026). Older `prio-data/views_pipeline`: 7★, Jupyter, last push January 2025. — [github.com/views-platform](https://github.com/views-platform); [views-pipeline-core](https://github.com/views-platform/views-pipeline-core); [prio-data/views_pipeline](https://github.com/prio-data/views_pipeline)
- ACLED clients: `chris-dworschak/acled.api` (R, 10★, 2024) and `cran/acled.api` (R mirror, 9★). No official ACLED Python client was found at the guessed paths. — [acled.api](https://github.com/chris-dworschak/acled.api)
- GDELT: `linwoodc3/gdeltPyR` (260★, GPL-3.0, last push 2023), `alex9smith/gdelt-doc-api` (232★, Python, MIT, 2025), `gdelt/gdelt.github.io` (79★, JS), `abresler/gdeltr2` (R, 77★, active 2026). — [gdeltPyR](https://github.com/linwoodc3/gdeltPyR); [gdelt-doc-api](https://github.com/alex9smith/gdelt-doc-api)
- VIEWS publishes forecasts at viewsforecasting.org, and code sits under the prio-data and viewsforecasting organizations. — [Hegre GDSD 2023 slides](https://www.gdsd.statistik.uni-muenchen.de/2023_neu/presentations_speaker/hegre_gdsd_2023_corrected.pdf)

### Inferences
- The GDELT DOC 2.0 API is plain HTTP+JSON, so it can be called with `urllib` in a stdlib pipeline. `gdelt-doc-api` is a reference for query syntax, not a dependency. This is the cheapest way to add a "news volume about konflik/bentrok/demo per province" signal.
- The VIEWS evaluation design (persistence baseline, step-ahead, Brier/AP/MSE) can be copied as a *standard* for any Centurisk97 social layer, in keeping with the repo's existing "uji balik" (backtest) culture.

### Gaps
- No competition-entry code repos (2020 or 2023 challenge) were located via the GitHub search. Mueller & Rauh's code repo was not found at the guessed path.
- ConflictForecast's data download format and licence were not verified.

## 6. Ethics and risk: stigmatisation, false positives, dual use

### Takeaway
Rare-event forecasts generate many false positives (about 20:1 in the Early Warning Project). In Indonesia, the state's own law acknowledges a history of militaristic and repressive conflict handling, and security forces were ordered to shoot looters in Palu. Publishing named-place "conflict risk" maps therefore carries real risks of stigmatisation and of legitimising repression. Recommended practice: aggregate coarsely (province or kabupaten, never village or group), present context rather than predictions, keep human review in the loop, and have the model peer-reviewed (OCHA framework).

### Cited Findings
- Early Warning Project: about 20 false positives per mass-killing onset at a 4% threshold, and raw accuracy (about 99% for an always-"no" model) is misleading. — [EWP accuracy](https://earlywarningproject.ushmm.org/accuracy)
- UU 7/2012 elucidation: earlier conflict handling "cenderung militeristik dan represif" (tended to be militaristic and repressive). — [UU 7/2012](https://www.kemhan.go.id/itjen/wp-content/uploads/migrasi/peraturan/uu7-2012gab_0.pdf)
- Palu 2018: soldiers ordered to shoot looters, while hungry survivors took food from aid trucks. Predictive "unrest" labels on hungry populations risk triggering securitised rather than humanitarian responses. — [Inquirer/AFP](https://newsinfo.inquirer.net/1038919/indonesian-soldiers-ordered-to-fire-on-looters-in-disaster-zone)
- OCHA Centre for Humanitarian Data **Peer Review Framework for Predictive Analytics**: technical rigour, operational readiness and ethical review, the last with a non-exhaustive list of 17 potential issues. Drought-trigger reviews treat false negatives as depriving communities of aid and false positives as wasted resources, and call for reflection on false-alarm harms. — [Niger AA model report](https://www.anticipation-hub.org/Documents/Briefing_Sheets_and_Fact_Sheets/niger-aa-trigger-for-drought-model-report-1.pdf); [Burkina Faso AA report](https://www.anticipation-hub.org/Documents/Reports/model-report-bfa-aa.pdf); [OCHA predictive analytics workshop 2019](https://centre.humdata.org/wp-content/uploads/2019/05/Workshop-Report-Predictive-Analytics-April-2019.pdf)
- Humanitarian data-science ethics framework (Humanitarian Data Science and Ethics Group). — [ALNAP framework PDF](https://library.alnap.org/system/files/content/resource/files/main/A-framework-for-the-ethical-use-of-advanced-data-science-methods-in-the-humanitarian-sector.pdf)
- CIFOR: fire inside a concession does not establish who lit it. Naive overlays misattribute blame. — [CIFOR Forests News](https://forestsnews.cifor.org/23479/new-maps-reveal-more-complex-picture-of-sumatran-fires?fnl=)
- ACLED's 2024 Indonesia recode (about 45% of "violent demonstrations" reclassified as peaceful) shows that **the labelling itself is contestable**. "Violent" versus "peaceful" coding of Indonesian protests changed materially. — [ACLED update log](https://acleddata.com/knowledge-base/27-february-2024-update-correction-of-violent-demonstration-events-in-indonesia)

### Inferences (recommended practice for Centurisk97)
- **Do not** publish probabilities of riot, unrest or ethnic conflict per kabupaten or village. The evidence (base rates, about 20:1 false positives, no Indonesia-validated model) does not support it, and it conflicts with UU 7/2012's non-repressive intent.
- **Do** publish, at province or kabupaten level, **observed** event counts (ACLED/KPA, with source and date), **hazard-driven social stress context** (evacuees, drought-affected villages, food-price level, fire in conflict-tagged concessions), and **expected evacuation** from hazard forecasts. Label everything "konteks, bukan prediksi" (context, not prediction).
- Keep raw social-media or TikTok-derived "tension" signals **behind staff login with human review**, never on a public map. Aggregate before display, strip actors and group identities, and do not name ethnic or religious groups.
- Any future model should carry a model card, pass a persistence-baseline backtest, and follow OCHA's peer-review framework before public release.

### Gaps
- No source specifically on surveillance or dual-use misuse of conflict forecasts in Indonesia. The 17-issue list of the OCHA ethics checklist was not read in full.
- No Indonesian regulation found on publishing conflict-risk maps. PDP law (UU 27/2022) implications for social-media-derived signals were not researched.
