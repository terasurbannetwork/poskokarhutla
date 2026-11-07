# Operational flood forecasting & early warning systems: international benchmarks for an Indonesian district-day flood warning (1–3 day lead)

Labels used below:
- **[verified]**: read in a fetched primary or near-primary document in this session.
- **[snippet]**: taken from a search-result summary only; the full document was not read.
- **[memory, not re-verified]**: from prior knowledge, with no source checked this session. Re-check these before quoting them in a report.

The researcher hit the 15-tool-call budget. Several systems (NOAA NWM, BoM, CWC, MRC, PAGASA/NOAH, Vietnam, Korea, Start Network) could therefore only be covered from memory or not at all. See the Gaps sections.

---

## Q1. Which design choices most improved verified skill or reduced false alarms?

### Takeaway
The best-documented false-alarm reducers are all decision-rule changes made on top of an existing hydrological chain, and all were tuned against verification:
- probabilistic thresholds combined with persistence or multi-model rules (EFAS);
- a minimum catchment-area cut-off (EFAS, ERIC);
- runoff or soil-storage indices from a simple tank model instead of raw rainfall thresholds (JMA);
- thresholds derived from the model's own climatology (GloFAS, EFAS, Google).

The single biggest documented skill jump in a data-poor setting is the Google LSTM. It is trained across many basins and needs no per-basin calibration, which extended ungauged-basin reliability from 0 to 5 days lead.

### Cited findings

**System architectures (summary inventory)**

- **EFAS (Copernicus, Europe).**
  - Model chain: LISFLOOD hydrological model driven by four NWP sources (ECMWF-ENS, ECMWF-HRES, DWD, COSMO-LEPS). Thresholds are the EFAS 5-year return period from EFAS reanalysis. [verified] — [Casado Rodríguez, "An assessment of the EFAS notification criteria", 18th EFAS Annual Meeting 2023](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2023/An%20assessment%20of%20the%20EFAS%20notifications%20criteria_EC_JRC_18thEFASAM2023.pdf)
  - Formal flood notification criteria (as of 2023), all of which must hold:
    - the catchment is part of the Condition of Access;
    - catchment area ≥ 2000 km²;
    - the event is ≥ 48 h ahead;
    - 3 consecutive forecasts each give ≥ 30% probability of exceeding the EFAS 5-yr return period, according to ECMWF ENS or COSMO-LEPS;
    - at least one deterministic forecast (ECMWF or DWD) exceeds the 5-yr return period. [verified] — same source
  - Proposed new criteria (2023):
    - catchment area ≥ 1,000 km²;
    - event ≥ 48 h ahead;
    - total probability of exceeding the EFAS 5-yr return period ≥ 50%, where "total probability is computed as a skill weighted mean of the 4 meteorological models". This replaces the 3/3 persistence rule. [verified] — same source
  - Optimisation results, scored with f0.8 (weights precision over recall):

    | Rule | Recall | Precision | f0.8 |
    |---|---|---|---|
    | Current "1D+1P", prob 0.300, persistence 3/3 | 0.413 | 0.618 | 0.518 |
    | EUE (ensemble of all members), prob 0.650 | 0.416 | 0.725 | 0.562 |
    | BW (skill/"member"-weighted), prob 0.525 | 0.451 | 0.700 | 0.576 |

    [verified] — same source

  - Data behind that optimisation:
    - 1,239 reporting points (upstream area > 500 km², KGE ≥ 0.5); 562 of them (45%) had ≥ 1 "observed" flood.
    - 874 events in total; 72% lasted under 2 days and 11% only 6 h.
    - Period October 2020 – June 2023.
    - "Observed" floods are defined from the **EFAS v4 reanalysis**, not gauges. Forecasts are the EFAS v4 reforecasts.

    [verified] — same source
- **EFAS flash flood indicator ERIC.**
  - In v5.0, ERIC is "computed directly from LISFLOOD surface runoff". Earlier versions combined precipitation with LISFLOOD soil moisture. [verified] — [EFAS v5.0 Flash Flood Skill Assessment – Results, ECMWF Confluence](https://confluence.ecmwf.int/spaces/CEMS/pages/340784798/EFAS+v5.0+-+Flash+Flood+Skill+Assessment+-+Results)
  - Retained notification criteria:
    - 30% exceedance probability of the 5-yr return period;
    - upstream area ≤ 1000 km²;
    - lead time ≤ 48 h.

    [verified] — same source
  - Grid searched: probability 0–100% in 10% steps; return periods 2/5/20 yr; lead times 0–24 h through 96–120 h; F-beta with beta 1.0/0.9/0.8/0.7; maximum area 2000/1000/500 km². [verified] — same source
  - Matching was by date and **EFAS administrative region ID**, using all 2022 00 UTC forecasts. [verified] — same source
  - Effect of thresholds: 2-yr/30–40% and 5-yr/20% produced "a large number of false alarms". 5-yr/30% gave "a much lower number of false alarms" with "only a small reduction in overall skill" at beta = 0.7. [verified] — same source
  - Lowering the area cap from 2000 to 1000 km² cost little skill; 500 km² reduced skill slightly. [snippet] — [Confluence summary](https://confluence.ecmwf.int/x/HAm4F)
  - An earlier rule notified at 5-yr exceedance ≥ 10% with lead < 72 h. [snippet] — [EFAS news, C. Baugh](https://european-flood.emergency.copernicus.eu/en/node/433)
  - EFAS partners had flagged "the large number of false alarms" from flash flood notifications. [snippet] — [Confluence v5.0 page](https://confluence.ecmwf.int/spaces/CEMS/pages/340784798/EFAS+v5.0+-+Flash+Flood+Skill+Assessment+-+Results)
  - ERIC was introduced by Alfieri et al. as an indicator combining upstream-accumulated precipitation with a soil-moisture weighting, with thresholds from a 20-yr climatology. [memory, not re-verified; Alfieri, Berenguer, Knechtl et al. 2017, *Environ. Model. Softw.*, "Flash flood detection through a multi-stage probabilistic warning system for heavy precipitation events"]
- **GloFAS (global).**
  - Flood thresholds at the 2-, 5- and 20-year return periods are derived for each river cell from the long-term reanalysis series. [snippet] — [ECMWF "New products for the Global Flood Awareness System"](https://www.ecmwf.int/sites/default/files/elibrary/2020/19365-new-products-global-flood-awareness-system.pdf)
  - GloFAS v4 introduced new return-period thresholds and anomaly maps based on a 1980–2022 climatology. [snippet] — [CEMS Confluence](https://confluence.ecmwf.int/x/Wx4oFw)
  - GloFAS-ERA5 reanalysis (v2.1) was skilful against a mean-flow benchmark in 86% of catchments (modified KGE skill score). [snippet] — [Harrigan et al. 2020, ESSD 12, 2043, doi:10.5194/essd-12-2043-2020](https://essd.copernicus.org/articles/12/2043/2020/essd-12-2043-2020.html)
  - Constant thresholds were found consistent across the whole 30-day range in only 30%–40% of the river network. This argues for lead-time-dependent thresholds (forecast-consistent thresholds). [snippet] — [ECMWF eLibrary node 19351](https://www.ecmwf.int/node/19351)
- **Google Flood Hub (Nearing et al. 2024, Nature 627:559–563, doi:10.1038/s41586-024-07145-1).**
  - Architecture: encoder–decoder LSTM. The encoder reads 365 days of history; the decoder covers 7 days of forecast. Hidden size 256. The output is an asymmetric Laplacian distribution, the median is used, and results come from an ensemble of 3 models. [verified] — [Nearing et al. 2024, PMC10954541](https://pmc.ncbi.nlm.nih.gov/articles/PMC10954541/)
  - Inputs:
    - ECMWF IFS HRES (forecast only) and ERA5-Land;
    - NOAA CPC gauge precipitation;
    - IMERG Early;
    - HydroATLAS basin attributes;
    - **no streamflow inputs**.

    [verified] — same source
  - Training and evaluation: 5,680 gauges; 4,089 evaluation gauges; 1,144 gauges where GloFAS was calibrated. Cross-validation used random 10-fold spatial splits plus time splits, and also by continent, climate zone and basin group. [verified] — same source
  - Headline: reliability extended "from zero to five days" lead in ungauged basins. [verified] — [Google Research blog](https://research.google/blog/using-ai-to-expand-global-access-to-reliable-flood-forecasts/)
- **JMA Japan ("Kikikuru" risk-distribution maps).**
  - Three indices come from the Ishihara & Kobatake (1979) three-tank cascade model. Tank 1 is surface runoff, tank 2 surface-layer infiltration runoff, tank 3 groundwater outflow.
    - **Soil Water Index (SWI)**: total storage of the three tanks, used for landslide/heavy-rain warnings.
    - **Runoff Index**: water amount at a point in a river at 1-km resolution, from a runoff plus flow-routing simulation using river channel, basin and land-use data, computed "for all rivers in Japan". Used for Flood Warnings/Advisories.
    - **Surface Water Index**: tank model "with landform-induced correction" for inland (pluvial) inundation.

    [verified] — [JMA, "Soil Water Index, Runoff Index, and Surface Water Index" (QMWS 2018)](https://www.jma.go.jp/jma/en/Activities/qmws_2018/Presentation/3.1/Soil%20Water%20Index,%20Runoff%20Index,%20and%20Surface%20Water%20Index_revised.pdf)
  - Indices use observed (radar–gauge) rainfall plus very-short-range forecasts. [snippet] — [JMA, Relationships between criteria and indices](https://www.jma.go.jp/jma/en/Emergency_Warning/Relationships_between_criteria_and_indices.pdf)
  - In the 2017 revision, flood warnings use the Runoff Index criterion (fluvial) plus a composite criterion (pluvial), and **plain rainfall-amount criteria for flood warnings were abolished**. [snippet, Japanese] — [Mito Local Met. Office / MSJ material, search summary](https://www.metsoc.jp/default/wp-content/uploads/2018/10/03_SS2018.pdf)
  - A black "disaster imminent" level was added in June 2022. [snippet, Japanese] — [JMA riskmap page](https://www.jma.go.jp/jma/kishou/know/bosai/riskmap.html)
- **WMO Flash Flood Guidance System (FFGS, HRC-designed).**
  - Performance is judged by skill scores of the flash flood forecasts and warnings. [snippet] — [WMO news "Flash flood guidance system improves predictive skills"](https://wmo.int/node/32542)
  - Architecture: Sacramento soil-moisture accounting on small basins of about 25–200 km², using satellite (GHE) plus gauge-merged and radar precipitation. FFG is the rainfall over 1/3/6 h needed to reach bankfull flow, and it is compared with nowcast or forecast rainfall to give a flash flood threat. [memory, not re-verified; Georgakakos 2006 J. Hydrol.; HRC documentation]
- **UK Flood Forecasting Centre.**
  - The Surface Water Flooding Hazard Impact Model (SWF HIM) runs on real-time probabilistic rainfall and surface-runoff forecasts. It is coupled to an "Impact Library" for England & Wales and was tested first on the 2012 North-East England floods. [snippet] — [Aldridge et al., JFRM 2020 (DOAJ record)](https://doaj.org/article/263d5551812e4e8180f5ffdbedf4b5c9); [NORA 515031](https://nora.nerc.ac.uk/id/eprint/515031/)
  - In operation it uses the Met Office MOGREPS-UK ensemble and Grid-to-Grid (G2G) runoff, and outputs impact levels by county. [memory, not re-verified]
  - The FGS uses a likelihood × impact risk matrix by county over a 5-day horizon. [memory, not re-verified]
- **US NWS FLASH (NSSL, MRMS-driven CREST model).**
  - CREST maximum unit streamflow at the onset of observed flash flooding ranged from 1.1 to 6.5 m³ s⁻¹ km⁻². The 25th-percentile value, 2.0 m³ s⁻¹ km⁻², is suggested as a lower bound for issuing a flash flood warning, as "a good compromise between a high POD and a low FAR". [snippet] — [NWS Memphis, FLASH Extended Abstract 2022](https://www.weather.gov/media/meg/FLASH_Extended_Abstract_2022.pdf)
  - Herman & Schumacher (2018) found **rainfall average recurrence intervals (ARIs) outperformed fixed thresholds and FFG, with the 1-h ARI the most skillful**. [snippet, as cited in the same abstract] — [FLASH Extended Abstract 2022](https://www.weather.gov/media/meg/FLASH_Extended_Abstract_2022.pdf). Original: Herman & Schumacher 2018, *J. Hydrometeorol.* 19, "Flash flood verification: pondering precipitation proxies" [memory for the bibliographic detail].
- **Bangladesh (FFWC + IFRC/BDRCS/WFP/OCHA anticipatory action).**
  - Two-step trigger:
    1. Pre-activation: GloFAS forecast with > 50% likelihood that discharge at Bahadurabad (Jamuna) exceeds 100,000 m³/s, at about 10-day lead.
    2. Activation: FFWC 5-day deterministic forecast of water level crossing Danger Level + 0.85 m.

    [snippet] — [OCHA CERF Anticipatory Action Pilot 2020 Trigger Analysis (Anticipation Hub)](https://www.anticipation-hub.org/Documents/Reports/Anticipatory_Action_Pilot_2020__Trigger_Analysis_Bangladesh.pdf); [Centre for Humanitarian Data](https://centre.humdata.org/anticipatory-action-in-bangladesh-before-peak-monsoon-flooding/)
  - GloFAS v3.1 gave no improvement over v2.1 at Bahadurabad. An IFRC protocol note reported a 60% success rate for pre-activation at 15-day lead using v3.1. [snippet; two different analyses] — [ECMWF Hydrology Workshop, Stephens](https://events.ecmwf.int/event/222/contributions/2367/attachments/1318/2389/Hydrology-WS_Stephens.pdf); [IFRC EAP Bangladesh](https://go-api.ifrc.org/api/downloadfile/88201/MDRBD037eapafr)
  - The July 2024 activation covered 5 Jamuna districts and reached 478,140 people. [snippet] — [Financial Protection Forum 2025 slides](https://www.financialprotectionforum.org/sites/default/files/2025-11/D3S15_Anticipatory%20Action%20in%20Bangladesh.pdf)
- **510 / Philippine Red Cross typhoon impact-based forecasting (IBF).**
  - Two-stage ML model (classifier, then regressor) trained on over 60 historical typhoons. The classifier predicts whether ≥ 10% of a municipality's houses will be completely destroyed; the regressor then estimates the share destroyed.
  - It outperformed a baseline wind–damage-curve model.
  - The trigger fires at a predefined danger level, 120–72 h before landfall; for Kammuri (2019) it fired at 72 h.
  - The model later moved to a 0.1° grid by disaggregating municipal damage with Google Open Buildings, which "achieved a higher performance".
  - Known failure: Typhoon Goni (2020), where the hazard forecast did not show an extreme event until hours before landfall. "The model cannot be better than the hazard information that goes into it."

  [snippet] — [PreventionWeb/UNDRR case study](https://www.preventionweb.net/resource/case-study/impact-based-forecasting-anticipatory-action-typhoons-philippines); [Anticipation Hub](https://www.anticipation-hub.org/news/impact-based-forecasting-for-typhoons-in-the-philippines)

### Inferences
- EFAS shows that the decision layer can be tuned with no hydrological model change. Switching from 3/3 persistence to a **skill-weighted multi-model probability ≥ 0.5** raised f0.8 from 0.518 to 0.576: precision 0.618 → 0.700 and recall 0.413 → 0.451. For a district-day product this is the cheapest lever: optimise probability, persistence and minimum-area rules against an archive by grid search with an F-beta score where beta < 1.
- JMA's lesson: replace raw rainfall-accumulation thresholds with a **storage-aware index** from a tank model. JMA abolished plain rainfall criteria for flood warnings in 2017. A three-tank SWI/runoff index is cheap to compute daily over a national grid. This could directly upgrade "rain above P95" style rules (e.g. the repo's longsor/banjir nowcasts).
- Herman & Schumacher's finding that ARI (rainfall return period) beats FFG argues that in a data-poor setting, **rainfall return-period exceedance relative to local climatology** is a strong, simple baseline that should be the benchmark to beat. [inference]
- Google's design (training across basins on static attributes, no streamflow inputs) is the most transferable approach for ungauged Indonesian catchments. The model itself is proprietary; the open analogue (NeuralHydrology LSTM on Caravan-style data) is [memory, not re-verified].
- The Bangladesh two-stage trigger (a global ensemble for readiness, then a national deterministic forecast to act) maps naturally onto 1–3 day district warnings: GloFAS or Flood Hub for "siaga" at 3–10 days, a local model or BMKG rainfall for action at 1–2 days.

### Gaps
- **NOAA National Water Model (WRF-Hydro/NWM v3):** no published verification numbers retrieved. Not covered due to the call budget.
- **BoM Australia, India CWC, Mekong River Commission, PAGASA/Project NOAH, Vietnam (NCHMF), Korea (KMA/Han River Flood Control Office), Start Network:** no sources retrieved this session. Do not cite architecture details for them from these notes.
- Full ERIC hit/miss/FA counts for EFAS v5 exist only in figures that could not be read.
- JMA has published hit/miss/false-alarm counts in Japanese technical documents (e.g. [JMA yohkens 24 ch.2](https://www.jma.go.jp/jma/kishou/books/yohkens/24/chapter2.pdf)). The numbers were not extracted.

---

## Q2. How are per-location warning thresholds set?

### Takeaway
The dominant best practice is to set thresholds as **return periods from the model's own long reanalysis or simulation** (EFAS, GloFAS, Google, ERIC), not from observed discharge. This removes the model's systematic bias by construction. JMA instead tunes per-municipality index thresholds against **past disaster records**, trading capture rate against false-alarm rate. Rainfall-only systems use rainfall ARI or FFG computed per small basin.

### Cited findings
- **GloFAS:** 2-, 5- and 20-yr return-period thresholds per river cell come from the long-term reanalysis series. [snippet] — [ECMWF 19365](https://www.ecmwf.int/sites/default/files/elibrary/2020/19365-new-products-global-flood-awareness-system.pdf). In v4 the climatology is 1980–2022. [snippet] — [CEMS Confluence](https://confluence.ecmwf.int/x/Wx4oFw)
- **EFAS notifications:** "observed" floods are also defined against the EFAS 5-yr return period computed from the EFAS v4 reanalysis. Truth and forecast therefore share the model climatology. [verified] — [Casado Rodríguez 2023](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2023/An%20assessment%20of%20the%20EFAS%20notifications%20criteria_EC_JRC_18thEFASAM2023.pdf)
- **Google:** return-period thresholds are computed separately for every gauge, for **both observed and modelled series**, using USGS Bulletin 17B. An event is correctly predicted when modelled and observed hydrographs cross their own thresholds within 2 days of each other. [verified] — [Nearing et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10954541/)
- **GloFAS lead-time dependence:** constant thresholds were consistent across the 30-day forecast range in only 30%–40% of the river network. [snippet] — [ECMWF node 19351](https://www.ecmwf.int/node/19351)
- **JMA:**
  - Flood-warning thresholds on the Runoff Index were reviewed per municipality using "disaster capture rate" (災害捕捉率) and "false alarm/miss rate" (空振り率). JMA documentation says they are set to "capture as many disasters as possible within the allowed number of threshold exceedances", because floods are rare but high-impact. [snippet, Japanese, search summary] — [JMA 予報技術資料 yohkens 24 ch.2](https://www.jma.go.jp/jma/kishou/books/yohkens/24/chapter2.pdf); [Saitama/Kanto MLIT doc](https://www.ktr.mlit.go.jp/ktr_content/content/000832022.pdf)
  - JMA provides grid-wise flood risk judgement values for Criterion I (advisory-equivalent) and Criterion II (warning-equivalent). [snippet, Japanese] — [JMA r5 指数・危険度 text](https://www.jma.go.jp/jma/kishou/know/expert/pdf/r5_text/r5_shisu-kikendo.pdf)
  - Emergency-warning SWI criteria cluster grid cells: e.g. "10 or more 1 × 1 km grid boxes" exceeding thresholds set from past extreme landslide damage. [snippet] — [JMA, Relationships between criteria and indices](https://www.jma.go.jp/jma/en/Emergency_Warning/Relationships_between_criteria_and_indices.pdf)
- **FLASH (US):** an empirical threshold on unit streamflow (2.0 m³ s⁻¹ km⁻², the 25th percentile at observed onsets) applied uniformly. [snippet] — [NWS FLASH abstract 2022](https://www.weather.gov/media/meg/FLASH_Extended_Abstract_2022.pdf)
- **Bangladesh AA:** a single fixed gauge threshold (Danger Level + 0.85 m at Bahadurabad; 100,000 m³/s GloFAS) chosen from historical impact years. [snippet] — [OCHA Trigger Analysis 2020](https://www.anticipation-hub.org/Documents/Reports/Anticipatory_Action_Pilot_2020__Trigger_Analysis_Bangladesh.pdf)
- **510 IBF:** the threshold is on predicted impact (≥ 10% of houses completely destroyed per municipality), not on hazard. [snippet] — [PreventionWeb](https://www.preventionweb.net/resource/case-study/impact-based-forecasting-anticipatory-action-typhoons-philippines)

### Inferences
- For Indonesia, with few or poor gauges and biased rainfall forecasts: compute thresholds as percentiles or return periods of the **same model run in reanalysis or hindcast mode** (e.g. the district-day index from ERA5-Land, IMERG or CHIRPS history). Never compare forecast output against observed-based thresholds. Ideally make thresholds lead-time dependent: a per-lead-time percentile of the reforecast is the "forecast-consistent threshold" idea. [inference]
- Then, as JMA does, **retune per district against an impact archive** (DIBI/BNPB events), maximising capture subject to a ceiling on warning days per year. [inference]
- A per-location threshold should be paired with a minimum-signal rule (EFAS area cap, JMA "≥ N grid cells") to suppress single-pixel false alarms. [inference]

### Gaps
- JMA's exact percentile or return period for Runoff Index criteria, and its numeric capture rates, were not extracted.
- Quantile mapping or EMOS post-processing evidence for flood triggers was not found this session. EFAS does post-process at gauged points (MCP/EMOS-type) [memory, not re-verified], but no source was retrieved.

---

## Q3. How is verification done against impact reports with under-reporting?

### Takeaway
The leading systems largely **avoid impact-report verification for headline skill**:
- EFAS verifies notifications against threshold exceedance in its own reanalysis (a proxy truth);
- Google verifies against gauge exceedance.

Where impact reports are used (ERIC flash floods, JMA, FFC SWF HIM, NWS warnings), the systems:
- match at a coarse unit, by administrative region and date;
- use a precision-weighted F-beta or CSI rather than accuracy;
- treat counts as conditional on reporting.

### Cited findings
- **EFAS ERIC:**
  - Forecast points are matched to flash-flood observations **by date and EFAS administrative region ID**. Hit = matched forecast; false alarm = unmatched forecast; miss = unforecast observation.
  - Scored with F-beta, beta ∈ {1.0, 0.9, 0.8, 0.7}. Beta < 1 weights precision, i.e. fewer false alarms.

  [verified] — [EFAS v5.0 Flash Flood Skill Assessment](https://confluence.ecmwf.int/spaces/CEMS/pages/340784798/EFAS+v5.0+-+Flash+Flood+Skill+Assessment+-+Results)
- **EFAS riverine notifications:** the "observed" flood is the reanalysis crossing the 5-yr return period, at 1,239 points with KGE ≥ 0.5. Probabilistic skill was also scored with the Brier Skill Score. Metric: f0.8 = 1.64·P·R / (0.64·P + R). [verified] — [Casado Rodríguez 2023](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2023/An%20assessment%20of%20the%20EFAS%20notifications%20criteria_EC_JRC_18thEFASAM2023.pdf)
- **EFAS event verification, September 2024 Austria:** flood notifications were mostly hits during large events. **Flash flood notifications had only a 27% hit share**, with considerably more false alarms. [snippet] — [EFAS AM2024 presentation](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2024/Flood%20in%20September%202024%20in%20Austria%20and%20%20the%20quality%20of%20EFAS%20flood%20and%20flash%20flood%20notifications.pdf)
- **UK FFC:**
  - An improved quantitative verification system was added alongside customer feedback, because customer feedback tends to focus on single events or non-events. [snippet] — [Robbins, EMS2015-85](https://meetingorganizer.copernicus.org/EMS2015/EMS2015-85.pdf)
  - FGS performance for significant/severe impacts is tracked against colour-banded targets. [snippet] — [Perez, ECMWF 2014 "Hydrological ensembles at the FFC"](https://www.ecmwf.int/sites/default/files/elibrary/2014/13606-hydrological-ensembles-flood-forecasting-centre-current-and-future-developments.pdf); see also [ECMWF 2016 "Verification of FFC flood risk forecasts"](https://ecmwf.net/sites/default/files/elibrary/2016/16446-verification-fc-flood-risk-forecasts.pdf) (not read)
  - The 2022–23 annual review lists a priority to address counties that "frequently flag" with "consistently high false alarm rates" in surface-water forecasting. [snippet] — [FFC annual review 2022–23, gov.uk](https://www.gov.uk/government/publications/flood-forecasting-centre-annual-review-2022-to-2023/flood-forecasting-centre-annual-review-2022-to-2023)
  - The SWF HIM pilot computed standard statistics at several temporal and spatial resolutions per county and impact level. [snippet] — [Kegan, EFAS AM2022 FFC SWFHIM presentation](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2022/5-2_EFAS_2022_FFC_SWFHIM%20Presentation_KEGAN.pdf)
- **Flash flood verification as a problem:** NSSL calls verification "one of the most intractable problems" for flash flood warnings, partly because "flash flooding" means different things to different people. [snippet] — [NSSL FLASH blog](https://blog.nssl.noaa.gov/flash/news/page/2/)
- **NWS:** POD, FAR and CSI come from the NWS Performance Management portal, with FAR = false alarms / total warnings. [snippet] — [NWS Burlington study](https://www.weather.gov/btv/The-Utility-of-Maximum-Unit-Streamflow-Data-in-the-Flash-Flood-Warning-Decision-Process-at-the-National-Weather-Service-in-Burl)
- **WMO FFGS:** HRC published verification guidelines and WMO a contingency-table calculator. Country results:
  - Turkey: POD 70% (2014) and 55% (2015). The drop was attributed to more convective events.
  - Croatia: "skill score" 84% (2016).

  [snippet] — [WMO news](https://wmo.int/node/32542); [WMO ETRP](https://etrp.wmo.int/course/section.php?id=4969)

### Inferences
- Under-reporting inflates the apparent FAR: a "false alarm" may be an unreported flood. Practical mitigations taken from these systems:
  1. Match at **district × day with a ±1-day window** (Google uses ±2 days; EFAS uses region × date).
  2. Report **precision-weighted F-beta (beta ≈ 0.7–0.8) plus POD and FAR separately**, not accuracy.
  3. Also verify against a physical proxy truth (reanalysis exceedance, or satellite flood extent such as GFM/Sentinel-1), as EFAS does, so that skill does not depend only on DIBI reporting density.
  4. Stratify skill by reporting density. A district with no DIBI records in N years is "unknown", not "true negative". [inference]
- Note the circularity: EFAS's 0.70 precision is against its own reanalysis, so it measures forecast consistency with the model, not with real-world impact. [inference]

### Gaps
- No quantitative FFC FGS hit rate or FAR was retrieved. The ECMWF 2016 FFC verification PDF should be read.
- No paper explicitly correcting for impact under-reporting (e.g. a reporting-probability model) was found this session.

---

## Q4. What skill is realistically achievable at 1–3 day lead for district-level flood occurrence?

### Takeaway
Published operational numbers cluster around **precision 0.6–0.7 with recall 0.4–0.45** for large-river 5-yr events (EFAS, ≥ 48 h, against its own reanalysis). Global ungauged LSTM F1 for 5-yr events is **about 0.2–0.46 by continent**. Flash-flood or pluvial skill is markedly lower (EFAS ERIC hit share 27% in a major event; FFGS POD 55–70%). A district-day product in Indonesia should plan for an **F1 of roughly 0.3–0.5 at 1–3 days** and treat anything far above that with suspicion. [inference based on the figures below]

### Cited findings
- **EFAS riverine notifications** (≥ 48 h ahead; reanalysis-defined truth): recall 0.413 / precision 0.618 under the current rules; best combination recall 0.451 / precision 0.700 (f0.8 = 0.576). [verified] — [Casado Rodríguez 2023](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2023/An%20assessment%20of%20the%20EFAS%20notifications%20criteria_EC_JRC_18thEFASAM2023.pdf)
- **Google vs GloFAS, 5-yr event F1 by continent:**

  | | Lowest | Highest |
  |---|---|---|
  | GloFAS | 0.15 (South America) | 0.32 (Europe) |
  | Google AI | 0.21 (South America) | 0.46 (Southwest Pacific) |

  [verified] — [Nearing et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10954541/)
- **Google lead-time and return-period results:**
  - AI F1 up to 5-day lead was significantly better than GloFAS nowcasts for 1-yr events (P = 6×10⁻⁶, d = 0.08), and not significantly different for 2-yr (P = 0.98) and 5-yr (P = 0.69) events.
  - Share of gauges where AI ≥ GloFAS at 0-day lead: 1-yr 64%, 2-yr 70%, 5-yr 60%, 10-yr 49%.
  - Asia: no significant difference vs GloFAS for 5-yr (P = 0.04, d = 0.12) or 10-yr (P = 0.18) events.

  [verified] — same source
- **Indonesia in Nearing 2024:** neither Indonesia nor Southeast Asia is mentioned in the article. The paper reports a GDP–streamflow-data correlation of r = 0.611 (N = 117). [verified] — same source
- **Flood Hub coverage:**
  - Expanded to 100 countries and about 700 million people in November 2024.
  - A "virtual gauges" layer (> 250,000 points, by press reports) covers locations "where quality assessment was not possible ... or the evaluation did not produce sufficiently high metrics". Google warns not to use them as the sole source.

  [snippet] — [Google Flood Hub expert mode / virtual gauges](https://sites.research.google/gr/floodforecasting/flood-hub-expert-mode); [Business Today, 14 Nov 2024](https://www.businesstoday.in/amp/technology/news/story/google-expands-ai-driven-flood-forecasting-to-cover-700-million-people-in-100-countries-453699-2024-11-14)
  - Whether Indonesia has verified (non-virtual) Flood Hub gauges was **not confirmed**.
- **Flash or pluvial skill:**
  - EFAS flash flood notifications, Austria September 2024: 27% hit share, with many false alarms. [snippet] — [EFAS AM2024](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2024/Flood%20in%20September%202024%20in%20Austria%20and%20%20the%20quality%20of%20EFAS%20flood%20and%20flash%20flood%20notifications.pdf)
  - FFGS Turkey POD 70% (2014) and 55% (2015). [snippet] — [WMO](https://wmo.int/node/32542)
  - One WMO 2017 presentation tabulates POD 0.95, FAR 0.25 and CSI 0.72 with no stated region or period. Treat it as illustrative only. [snippet] — [WMO FFI-AG3 2017 presentation](https://old.wmo.int/extranet/pages/prog/hwrp/flood/documents/FFI-AG3-2017/presentations/12_Report_Main_FF_activities_FFGS.pdf)
- **Bangladesh anticipatory action:** 60% success rate for GloFAS v3.1 pre-activation at 15-day lead, at a single large-river station. [snippet] — [IFRC EAP](https://go-api.ifrc.org/api/downloadfile/88201/MDRBD037eapafr)
- **Event duration:** among EFAS "observed" events, 72% lasted under 2 days and 11% only 6 h. Daily-resolution matching is therefore borderline adequate for large rivers and inadequate for flash floods. [verified] — [Casado Rodríguez 2023](https://european-flood.emergency.copernicus.eu/sites/default/files/AM/AM2023/An%20assessment%20of%20the%20EFAS%20notifications%20criteria_EC_JRC_18thEFASAM2023.pdf)

### Inferences
- Indonesian district-day floods are dominated by short, intense convective and pluvial events in small catchments, plus tidal/rob flooding. This resembles the ERIC/FFGS regime (POD around 0.5–0.7 with high FAR, or CSI below 0.3), not the EFAS large-river regime. A realistic target at 1-day lead is **CSI around 0.2–0.35**, falling at 2–3 days as convective QPF skill decays. [inference, no Indonesian verification found]
- Recommended benchmark ladder for honest reporting:
  1. climatology (base rate per district-month);
  2. persistence;
  3. rainfall-ARI exceedance (the Herman & Schumacher finding);
  4. GloFAS or Flood Hub exceedance aggregated to the district.

  Claims of skill should be made relative to these. [inference]
- Score with Brier Skill Score for probabilities (as EFAS does) and F-beta (beta 0.7–0.8) for the binary warning, with POD, FAR and CSI shown alongside. [inference]

### Gaps
- No published district-level flood-occurrence verification for Indonesia (BMKG, BNPB InaRISK or Flood Hub) was found.
- No numbers were retrieved for the NWM, BoM, CWC, MRC, PAGASA, Vietnam or Korea systems.
- No full 510 IBF precision/recall figures were retrieved.
- JMA capture and false-alarm rates for Runoff Index flood warnings exist in Japanese documents but were not extracted.
