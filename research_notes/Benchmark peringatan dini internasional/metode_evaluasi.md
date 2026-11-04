# Benchmarks, evaluation frameworks and best-performing methods for data-scarce hydrometeorological hazard forecasting (flood/landslide, district-day, Indonesia)

Scope note: research done 3 Nov 2026 with ~17 tool calls. Items tagged **[UNVERIFIED MEMORY]** come from the researcher's training knowledge and were NOT confirmed against the source in this session; check them before quoting any number.

## Q1. Benchmark datasets and intercomparisons: what exists, and what covers Indonesia/SE Asia?

### Takeaway
The streamflow benchmark ecosystem (CAMELS family → Caravan) is large but has almost no Indonesian or Southeast Asian gauges. For district-level *occurrence* labels, the usable global sources are event catalogues: the Global Flood Database (satellite, large events only), Groundsource (news-derived, 2.6 M events, not peer reviewed, recency-biased) and the NASA Global Landslide Catalog behind LHASA. No published benchmark exists for flood or landslide occurrence at district-day resolution in Indonesia, so the platform has to build its own backtest.

### Cited Findings
- Caravan (Kratzert et al. 2023, *Scientific Data* 10:61) harmonises 7 large-sample datasets into **6,830 catchments**: CAMELS-US 482, CAMELS-AUS 150, CAMELS-BR 376, CAMELS-CL 314, CAMELS-GB 408, a HYSETS subset, and LamaH-CE 479. All use ERA5-Land forcing and ship as open-source code that users can extend to new basins in the cloud. Sources differ on the HYSETS count (4,621 vs "4,298 added"). — [Google Research pub page](https://research.google/pubs/caravan-a-global-community-dataset-for-large-sample-hydrology/); [4TU.ResearchData record](https://data.4tu.nl/datasets/ca13056c-c347-4a27-b320-930c2a4dd207); [Zenodo](https://zenodo.org/records/7944025)
- Size of the other CAMELS datasets: CAMELS-US 671 catchments (Newman et al. 2015), CAMELS-AUS 222, CAMELS-CH 331, CAMELS-BR 897 catchments with forcing (3,679 gauges). CAMELS-KR (2026 ESSD preprint, 282 catchments) states that East Asia "remains relatively underrepresented". — [UCAR CAMELS](https://ral.ucar.edu/dataset/camels-catchment-attributes-and-meteorology-large-sample-studies-dataset-downloads); [ESSD preprint essd-2026-544](https://essd.copernicus.org/preprints/essd-2026-544/essd-2026-544.pdf)
- This session's search found **no CAMELS-style dataset for Indonesia or Southeast Asia**. — same search as above (negative result)
- Global Flood Database (Tellman et al. 2021, *Nature*, doi 10.1038/s41586-021-03695-w):
  - Contents: MODIS maximum inundation for **913 of 3,054** Dartmouth Flood Observatory events, 2000–2018. Only those 913 had enough cloud-free imagery.
  - Geography: Asia has the most events (n = 398), and **90% of exposure is in South and Southeast Asia**.
  - Exposure trend: population in observed-inundation areas rose by 58–86 million between 2000 and 2015, a 20–24% increase in the exposed share.
  - [CSDMS PDF](https://csdms.colorado.edu/pub/users/kettner/paper/s41586-021-03695-w.pdf); [UMich news](https://news.umich.edu/new-satellite-data-reveal-increasing-proportion-of-worlds-population-exposed-to-floods)
- Groundsource (Google Research, released Feb/Mar 2026):
  - Contents: **2.6 million** flood events extracted with Gemini from more than 5 million news articles in over 150 countries. Zenodo doi 10.5281/zenodo.18647054.
  - Recency bias: about **64% of events fall in 2020–2025**, which tracks the growth of online news rather than a rise in flooding.
  - Status: linked to a **non-peer-reviewed** EarthArXiv preprint (9 Mar 2026). Google uses it to train flash-flood prediction with up to 24 h lead.
  - [Google Research blog](https://research.google/blog/introducing-groundsource-turning-news-reports-into-data-with-gemini/); [GEE community catalog](https://gee-community-catalog.org/projects/groundsource/); [EGU26-3253](https://meetingorganizer.copernicus.org/EGU26/EGU26-3253.html)
- The Nearing et al. (2024) global flood model was trained on streamflow from **5,680 gauges** and outputs a probability distribution of flow. — [Google Research](https://research.google/pubs/ai-increases-global-access-to-reliable-flood-forecasts/); [RePEc record, Nature 627:559–563, doi 10.1038/s41586-024-07145-1](https://ideas.repec.org/a/nat/nature/v627y2024i8004d10.1038_s41586-024-07145-1.html)
- LHASA 2.0 (Stanley et al. 2021, *Front. Earth Sci.*, doi 10.3389/feart.2021.640043) was trained on the Global Landslide Catalog plus several rainfall-triggered inventories from **2015–2018**, with **2019–2020 held out**. This train/test-by-year design is the benchmark protocol to copy. — [Frontiers](https://www.frontiersin.org/articles/10.3389/feart.2021.640043/full)
- **[UNVERIFIED MEMORY]** GRDC (Global Runoff Data Centre, Koblenz) holds daily discharge for roughly 10k+ stations. Indonesian coverage is sparse, and many records end before 2000.
- **[UNVERIFIED MEMORY]** Copernicus Global Flood Monitoring (GFM, part of GloFAS, operational since about 2021) maps Sentinel-1 SAR flood extent automatically with an ensemble of three algorithms. Being SAR-based, it sees through cloud.

### Inferences
- For Indonesian district-days, the realistic label stack is DIBI (BNPB) + Groundsource + GFM/GFD + the Global Landslide Catalog. Each has a different detection process (inference), which turns Q4 (under-reporting) into the central design issue rather than a footnote.
- Groundsource's 64% concentration in 2020–2025 means base rates estimated from it across years are biased. Any model using it as a label must include a year or reporting-intensity offset (inference).
- No method in the literature has been benchmarked on Indonesian district-day occurrence. Claims of "best method" here must come from the platform's own prospective scoring, not from transfer of published rankings (inference).

### Gaps
- No search confirmed the number of Indonesian gauges inside Caravan, GRDC, or the Google 5,680-gauge training set.
- I found no peer-reviewed "LSH benchmark" for flood *occurrence* at administrative units.
- I did not fetch GFM's own validation paper.

## Q2. Which method families win head-to-head (ML vs process models vs thresholds), and when does ML stop helping?

### Takeaway
Two places have solid evidence that ML wins:
1. Streamflow in ungauged basins, when one model is trained across **hundreds to thousands of basins**: LSTM beats calibrated conceptual models and regionalisation.
2. Global landslide nowcasting with large inventories: XGBoost in LHASA 2.0 is about twice the detection of v1 at the same false-positive rate.

For regional landslide early warning from rainfall, the published margins over a well-built threshold are modest (TSS 0.50 → 0.59 in Sicily). Better hydrological inputs (soil moisture) gave a larger jump (0.50 → 0.71) than switching to ML did. I found no published intercomparison of flood occurrence at administrative units.

### Cited Findings
- **Global ML for floods in ungauged basins.** Nearing et al. (2024) report AI forecasts in ungauged basins at **lead times up to 5 days** with reliability for extreme events "comparable to or better than" GloFAS nowcasts (0-day lead). A Nov 2024 follow-up extended this to 7 days and noted that validation data remain limited in many regions. — [Google Research](https://research.google/pubs/ai-increases-global-access-to-reliable-flood-forecasts/); [Google blog Nov 2024](https://research.google/blog/a-flood-forecasting-ai-model-trained-and-evaluated-globally/)
- **LSTM vs calibrated conceptual model.** Kratzert et al. (2019, HESS 23:5089–5110) trained one LSTM on **531 CAMELS basins** with forcing plus static attributes. An earlier preliminary study already found an LSTM used *ungauged* beat a SAC-SMA *calibrated per basin* on average. — [HESS PDF](https://hess.copernicus.org/articles/23/5089/2019/hess-23-5089-2019.pdf); [arXiv 1907.08456](https://arxiv.org/pdf/1907.08456.pdf)
- **[UNVERIFIED MEMORY] Ungauged-basin numbers.** Kratzert et al. (2019, WRR, doi 10.1029/2019WR026065), "Toward improved predictions in ungauged basins": out-of-sample LSTM median NSE ≈ 0.69 vs ≈ 0.64 for basin-calibrated SAC-SMA. Check before quoting.
- **Forcing data quality matters.** An LSTM trained on CAMELS-US with ERA5 forcing scored higher NSE in western and north-western US (median daily NSE **0.83 vs 0.78**), but local high-resolution forcing was better overall. — [Frontiers in Water 2023, doi 10.3389/frwa.2023.1166124](https://frontiersin.org/articles/10.3389/frwa.2023.1166124/full)
- **Landslides, global (LHASA 2.0).**
  - Gain: the XGBoost nowcast was "**twice as likely**" as LHASA v1 to predict historical landslides at the **same global false-positive rate**.
  - Side effects: nowcasts are issued more often in tropical countries such as Colombia and PNG.
  - Authors' warning: many variables with large data can produce overfitted, "physically unrealistic" models.
  - [Frontiers](https://www.frontiersin.org/articles/10.3389/feart.2021.640043/full); [NASA software page](https://software.nasa.gov/software/GSC-18595-1)
- **Landslides, regional thresholds vs ML (Sicily).**
  - Neural-network thresholds reached TSS **0.59** vs **0.50** for a power-law event duration–depth rainfall threshold (NHESS 22:1151, 2022, brief communication, described as "preliminary").
  - The authors state that ANN use for *territorial* (regional) early warning "has not been investigated so far".
  - [NHESS 22/1151/2022](https://nhess.copernicus.org/articles/22/1151/2022/nhess-22-1151-2022.html)
- **Landslides, better inputs vs better model.** Multi-layer soil-moisture thresholds in Sicily scored TSS **0.71 vs 0.50** for precipitation-only thresholds. In Rwanda, modelled root-zone antecedent soil moisture was the most informative variable. The search snippet's metadata was garbled, so verify which paper is which. — [NHESS 2021-206 preprint](https://nhess.copernicus.org/preprints/nhess-2021-206/nhess-2021-206-manuscript-version2.pdf); [NHESS 18/633/2018 relations](https://nhess.copernicus.org/articles/18/633/2018/nhess-18-633-2018-relations.html)
- **Impact at municipality level (typhoons, Philippines).**
  - Model: the 510/Red Cross XGBoost model, trained on **39 typhoons (2006–2020)**, uses two stages: classify damage > 10%, then regress.
  - Results: the two-stage grid model beat the municipality model with local features. Global-only features did "not significantly influence" performance.
  - Use: it served as the trigger model for the UN OCHA anticipatory-action pilot in 2021.
  - Limit: the authors say impact skill is capped by hazard-forecast skill.
  - [NHESS 24:309–329, 2024](https://nhess.copernicus.org/articles/24/309/2024/nhess-24-309-2024.html)

### Inferences
- Pattern across sources: ML pays off when **many events** (thousands of gauge-years or landslides) can be pooled across sites. With ~39 events (typhoons) or one region's inventory, gains are modest and depend on features. In Sicily, the soil-moisture input gave more lift (+0.21 TSS) than switching to ML (+0.09) (inference).
- Rough working rule (inference, not from a benchmark): with fewer than ~100–200 positive events per model, prefer regularised logistic/GAM or a threshold-plus-calibration model, pooled hierarchically. Gradient boosting becomes worth it once positives number in the high hundreds or more, and only when pooled across many districts.
- Hazard skill caps impact skill (Kooshki Forooshani 2024). Improving the rainfall and soil-moisture inputs is likely worth more than a fancier classifier (inference).

### Gaps
- No peer-reviewed intercomparison of **flood occurrence at administrative units** (ML vs process vs threshold) was found.
- Exact median-NSE tables of Kratzert 2019 were not retrieved.
- No study quantifying "the data size at which ML stops helping" was found. The rule above is inference.
- Analog methods were not covered by searches. From memory, Hamill & Whitaker (2006, MWR) analog/reforecast calibration of precipitation probabilities is the reference **[UNVERIFIED MEMORY]**.

## Q3. Post-processing and calibration best practice for rare-event probabilities

### Takeaway
The standard reference is Vannitsem et al. (2021, BAMS):
- **Ensemble output:** parametric EMOS / nonhomogeneous regression and BMA are the operational baselines. Quantile regression forests and ML variants handle nonlinearity.
- **A single-score model (like this platform's):** use logistic (Platt) recalibration or isotonic. Isotonic is unstable in the rare high-probability tail with small calibration sets, so on few events prefer Platt/logistic or a hybrid.

### Cited Findings
- Vannitsem et al. 2021, "Statistical Postprocessing for Weather Forecasts: Review, Challenges, and Avenues in a Big Data World", *BAMS* 102(3):E681–E699, doi 10.1175/BAMS-D-19-0308.1. It states that post-processing is now a key part of forecast suites in many national weather services. Listed challenges: km-scale ensembles, preserving space-time correlation, model upgrades, and research-to-operations transfer. — [arXiv 2004.06582](https://arxiv.org/pdf/2004.06582); [ORFEO record](https://orfeo.belnet.be/handle/internal/9795)
- EMOS (Gneiting et al. 2005) fits a parametric predictive distribution whose moments depend linearly on ensemble statistics. — [arXiv 2004.06582](https://arxiv.org/abs/2004.06582v1)
- Random-forest-based methods have been compared with EMOS for rainfall ensembles. — [arXiv 1711.10937](https://arxiv.org/pdf/1711.10937)
- Weighted verification tools exist for evaluating high-impact events. — [arXiv 2209.04872](https://arxiv.org/pdf/2209.04872)
- **Isotonic vs Platt** (low-authority tutorial sources plus one arXiv theory paper):
  - Isotonic overfits small calibration sets, and its tail bins rest on very few points. Its step function shifts between retrainings, while Platt's 2 parameters stay stable. One rule of thumb is to use Platt below ~500 calibration samples (low-authority source).
  - The arXiv theory paper (2607.27301) argues isotonic controls expected calibration error asymptotically and uses precipitation as its example.
  - [arXiv 2607.27301](https://arxiv.org/pdf/2607.27301); [arXiv 2509.23665](https://arxiv.org/pdf/2509.23665); [MetricGate (low authority)](https://metricgate.com/docs/calibration-isotonic-platt)
- **[UNVERIFIED MEMORY]** Raftery et al. 2005 (MWR) introduced BMA for ensembles. Wilks 2009 (Meteorol. Appl.) introduced extended logistic regression, which gives coherent exceedance probabilities across thresholds. Gneiting & Raftery 2007 (JASA) is the proper-scoring-rules reference that justifies Brier/log/CRPS for fitting calibrators. Quantile mapping is the usual bias correction for satellite/NWP rainfall before thresholding.
- **[UNVERIFIED MEMORY]** Conformal prediction gives distribution-free *marginal* coverage for intervals. It does not by itself calibrate probabilities of rare binary events, and coverage under temporal non-exchangeability (seasons, trends) requires adaptive variants.

### Inferences
- For this platform the largest likely reliability gain is **recalibrating the raw score per lead time with a 2–3 parameter logistic model** (optionally with a season or region term), fitted on rolling out-of-time data (inference).
- Use isotonic only once calibration sets hold several hundred positives. With few positives, isotonic and fine reliability bins overfit (inference).
- Calibrate per pooled stratum (e.g. island × season), not per district, because per-district calibrators have too few events (inference, links to Q5).

### Gaps
- No peer-reviewed head-to-head of Platt vs isotonic vs BMA on **rare-event hydrometeorological binary probabilities** was found.
- No quantified "largest reliability gain" number was found.
- Conformal methods in flood forecasting were not searched in depth.

## Q4. Verification of rare high-impact events, under-reported labels, and choosing warning thresholds (cost-loss, FbF)

### Takeaway
For deterministic yes/no warnings of rare events, use **SEDI/EDI**, which do not degenerate as base rate → 0, alongside hit rate, false-alarm ratio and TSS/Peirce. For probabilities, use Brier skill score, reliability diagrams and precision-recall curves. Choose thresholds with **Richardson's relative economic value**, whose maximum equals the Peirce score, and the **forecast-based-financing** logic: a trigger probability per action, set from willingness to "act in vain". Label under-reporting is best handled with positive-unlabelled learning or an explicit latent-event/reporting model. The only benchmark evidence found is small.

### Cited Findings
- **SEDI/EDI.**
  - Origin: Ferro & Stephenson (2011, *Weather and Forecasting*) introduced the Extremal Dependence Index and Symmetric EDI because traditional measures "degenerate to trivial values as events become rarer".
  - Uptake: ECMWF's 2014 verification memo adopts SEDI, which was then used for UK Met Office and ECMWF precipitation verification (North et al. 2013).
  - [ECMWF tech memo 10909](https://www.ecmwf.int/sites/default/files/elibrary/2014/10909-verification-extreme-weather-events-discrete-predictands.pdf); [Exeter repository](https://ore.exeter.ac.uk/repository/handle/10871/8521)
- **[UNVERIFIED MEMORY, standard formulas]** With hit rate H and false-alarm rate F:
  - SEDI = [ln F − ln H − ln(1−F) + ln(1−H)] / [ln F + ln H + ln(1−F) + ln(1−H)]
  - EDI = (ln F − ln H) / (ln F + ln H)
- SEDI has also been used to evaluate SPC severe-weather outlooks. — [AMS 27SLS paper 254551](https://ams.confex.com/ams/27SLS/webprogram/Paper254551.html)
- **Economic value.** Richardson (2000, QJRMS 126:649–668) applied the cost-loss model (C/L = cost of protecting ÷ loss avoided) to ECMWF EPS. Main points:
  - Skill alone can misrepresent value.
  - Maximum relative value equals the **Peirce skill score (TSS)**.
  - The ensemble is valuable to a much wider range of users than the deterministic run.
  - [ECMWF "Predictability and economic value"](https://www.ecmwf.int/sites/default/files/elibrary/2003/11922-predictability-and-economic-value.pdf); [ECMWF "Decisions, decisions"](https://www.ecmwf.int/sites/default/files/elibrary/2014/17333-decisions-decisions.pdf); [CAWCR relative-value page](https://cawcr.gov.au/projects/verification/value/relativevalue_more.html)
- **Forecast-based financing.**
  - Coughlan de Perez et al. (2015, NHESS 15:895, doi 10.5194/nhess-15-895-2015) set a **threshold forecast probability per action**. Funds are released automatically when a threshold forecast is issued, under standard operating procedures, explicitly trading off the risk of acting in vain.
  - A reviewer noted that false alarms and misses have very different costs and that repeated false alarms erode trust.
  - [NHESS 15/895/2015](https://nhess.copernicus.org/articles/15/895/2015/nhess-15-895-2015.html)
- **FbF in Uganda.**
  - Coughlan de Perez et al. (2016, HESS 20:3549, doi 10.5194/hess-20-3549-2016) set GloFAS-based "action triggers" for northern Uganda (Uganda Red Cross FbF pilot). Triggers draw on (1) the magnitude of past floods and (2) willingness to act in vain. The paper assesses trigger uncertainty in a data-scarce location.
  - A follow-up (EGU21 presentation) used a **30-day action lifetime**, trigger probability 60% and a 90th-percentile lead-time-dependent threshold, reporting FAR and POD by lead time.
  - [HESS 20/3549/2016](https://hess.copernicus.org/articles/20/3549/2016/hess-20-3549-2016.html); [EGU21-16169 slides](https://presentations.copernicus.org/EGU21/EGU21-16169_presentation.pdf)
- **Under-reporting, latent-event model.** Agostini, Pierson & Garg (AAAI 2024) give each location a latent true-flood indicator (with Ising spatial coupling), separate from a reporting process, and pool reporting parameters across events. Findings:
  - Reporting rates are higher in tracts with more population, more white residents and more owner-occupiers.
  - The model predicts future reports better than models without under-reporting.
  - [arXiv 2312.11754](https://arxiv.org/abs/2312.11754v1); [AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/30190)
- **Under-reporting, PU learning for landslides.**
  - Gains: PU learning "substantially improves" AUC and recall over binary classification in Chamoli, India.
  - Bias source: negatives taken from flat or stable terrain cause "easy-negative bias" that inflates performance (Land 2026).
  - Protocol: spatial block cross-validation is recommended.
  - Floods: a 2022 urban-flood study frames the problem as case-control sampling with contaminated controls and reports better-calibrated probabilities.
  - [NSF PAR Chamoli](https://par.nsf.gov/biblio/10524652-enhancing-landslide-susceptibility-mapping-using-positive-unlabeled-machine-learning-approach-case-study-chamoli-india); [Land 15:1778](https://www.citedrive.com/en/discovery/a-new-negative-sample-construction-strategy-for-landslide-susceptibility-mapping/); [Land 11:1971 (2022)](https://ideas.repec.org/a/gam/jlands/v11y2022i11p1971-d962994.html)

### Inferences
- **District-day verification set for this platform (inference):**
  - Probability scores: Brier skill score vs climatology *and* vs persistence, a reliability diagram with few, wide bins, and a PR curve (better than ROC when positives are < 1%).
  - Warning scores: SEDI plus H/F/FAR at each candidate warning threshold.
  - Value: a relative-value curve over C/L ∈ [0.01, 0.5].
  - All of it scored on time-held-out years, not random splits.
- Thresholds: choose per action, not one global "high" level. Each action (posko readiness, logistics pre-positioning, evacuation) has its own C/L, so its own trigger probability (inference from Coughlan de Perez 2015 / Richardson 2000).
- With under-reported labels, apparent FAR is inflated, because "false alarms" may be unreported events. Report FAR against a multi-source union label (DIBI ∪ news ∪ SAR) and treat it as an upper bound (inference).

### Gaps
- No benchmark directly compares PU vs reporting-offset vs multi-source fusion for **flood occurrence**.
- Exact Uganda hit/false-alarm numbers were not retrieved.
- The SEDI formula was not checked against the paper in this session.

## Q5. Combining weak signals hierarchically when events per unit are few

### Takeaway
Partial pooling (multilevel / Bayesian hierarchical models) is the established way to estimate per-unit effects with few events. It borrows strength across districts and events, and it can also host a reporting-rate sub-model. The evidence here is from flood losses and urban flood reports, not from Indonesian district-day occurrence.

### Cited Findings
- A 2018 EGU study used a hierarchical Bayesian model for household flood losses. Partial pooling "helps balance bias and variance". — [EGU2018-6676](https://meetingorganizer.copernicus.org/EGU2018/EGU2018-6676.pdf)
- A 2018 HESS preprint applied hierarchical Bayesian pooling to regional flood frequency. — [hess-2018-22](https://hess.copernicus.org/preprints/hess-2018-22/hess-2018-22.pdf)
- Agostini et al. (AAAI 2024) pool reporting parameters across storms while letting intercepts and flood frequency vary by storm. This is a direct template for "event model + reporting model" with few events per unit. — [arXiv 2312.11754](https://arxiv.org/pdf/2312.11754)
- Pooling across basins is also what makes the LSTM win in Q2: one model is trained over 531 → 5,680 basins and transferred to ungauged ones. — [Kratzert 2019 HESS](https://hess.copernicus.org/articles/23/5089/2019/hess-23-5089-2019.pdf); [Nearing 2024](https://research.google/pubs/ai-increases-global-access-to-reliable-flood-forecasts/)

### Inferences
- **Suggested structure (inference):** logit P(event in district d, day t) = global hazard terms (rain-percentile, soil moisture, river-flow percentile) + random intercepts for province and district (partial pooling) + a season term.
- **Labels:** model the observed report as event × p_report. Let p_report vary by data source and year, which absorbs the Groundsource 2020+ surge and DIBI under-reporting.
- **Fitting:** this fits cheaply with penalised GLM/GAM (random effects as ridge penalties). It does not need MCMC.
- Weak signals (news counts, warga reports, SAR detections) are better added as *label-side* evidence in the reporting model than as predictors, which avoids leakage (inference).

### Gaps
- No published Bayesian hierarchical model of flood/landslide **occurrence per administrative unit with an explicit detection probability** against a national disaster database (DIBI, EM-DAT) was found.
- No quantitative evidence was found on how much partial pooling improves Brier or SEDI for district-level hazard forecasts.
