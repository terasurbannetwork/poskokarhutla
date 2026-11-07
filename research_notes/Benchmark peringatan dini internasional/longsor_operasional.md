# Operational regional landslide early warning systems (LEWS): benchmarks for an Indonesian district-day landslide nowcast

Scope: operational and pre-operational *territorial* (regional/national/global) LEWS. Notes compiled 3 Nov 2026.
Tags: **[V]** = checked against the fetched primary text in this session; **[S]** = from search-result snippets only; **[M]** = from model memory, NOT verified this session (re-check before citing); **[I]** = inference.

Core review sources used (full text fetched):
- Guzzetti F., Gariano S.L., Peruccacci S., Brunetti M.T., Marchesini I., Rossi M., Melillo M. (2020). Geographical landslide early warning systems. *Earth-Science Reviews* 200, 102973. doi:10.1016/j.earscirev.2019.102973 — [PDF](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Krøgli I.K., Devoli G., Colleuille H., Boje S., Sund M., Engen I.K. (2018). The Norwegian forecasting and warning service for rainfall- and snowmelt-induced landslides. *NHESS* 18, 1427–1450. doi:10.5194/nhess-18-1427-2018 — [PDF](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- Stanley T.A., Kirschbaum D.B., Benz G., Emberson R.A., Amatya P.M., Medwedeff W., Clark M.K. (2021). Data-driven landslide nowcasting at the global scale. *Front. Earth Sci.* 9:640043. doi:10.3389/feart.2021.640043 — [Frontiers](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- JMA (2018). Soil Water Index, Runoff Index, and Surface Water Index (WMO QMWS presentation) — [PDF](https://www.jma.go.jp/jma/en/Activities/qmws_2018/Presentation/3.1/Soil%20Water%20Index,%20Runoff%20Index,%20and%20Surface%20Water%20Index_revised.pdf)

---

## Q1. Which approach gives the best verified regional skill: ID thresholds, SWI critical lines (JMA), hydro-met thresholds (Norway), or ML (LHASA v2)?

### Takeaway
No head-to-head comparison exists, and no common verification standard does either, so "best" cannot be ranked on published numbers. The strongest *documented* operational records come from systems that track an antecedent wetness state plus a short-term trigger: Norway's water-supply × soil-saturation thresholds (~96% correct days 2013–2017), Japan's SWI × 60-min-rain RBFN critical line, and Hong Kong's engineered-slope R24 → landslide-number model. Plain ID/ED thresholds are the most common but often unvalidated, and several Italian regional systems have no published validation at all. ML (LHASA v2) roughly doubles detection over a threshold decision tree globally, but at 1 km/daily with a news-based catalogue it has not been verified for Indonesia.

### Cited Findings — system by system

**Cross-cutting (Guzzetti 2020)**
- Reviewed 26 regional, national and global LEWSs worldwide from 1977 to Aug 2019. 20 of 26 (76.9%) had some evaluation: 10 (38.5%) quantitative, 3 (11.5%) qualitative, 2 (7.7%) both, 5 (19.2%) in progress. One national and seven regional systems operate with no skill evaluation, and "no standard method exists" **[V]** — [Guzzetti et al. 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- The most common threshold type is mean intensity–duration (ID), followed by cumulated event rainfall–duration (ED) **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Some thresholds rest on very few events: Chittagong 14 landslides, Rio de Janeiro 65, **Indonesia 83 (Mulyana et al. 2019)**, Hong & Adler global ~70. "A small landslide catalogue results in large uncertainties" **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Threshold updating: adding 335 events (+14.5%) to the Italian national ED dataset left the threshold unchanged, while new Seattle data gave slightly different thresholds **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- 30 recommendations, including clear and open skill-evaluation criteria and the use of Calvello & Piciullo (2016) EDuMaP or similar **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Piciullo L., Calvello M., Cepeda J.M. (2018). Territorial early warning systems for rainfall-induced landslides. *Earth-Sci. Rev.* 179, 228–247, doi:10.1016/j.earscirev.2018.02.013. Reviews 24 territorial systems in a setting–modelling–warning–response framework **[S]** — [NHESS relations page](https://nhess.copernicus.org/articles/18/3179/2018/nhess-18-3179-2018-relations.html); [IRIS UniSa](https://www.iris.unisa.it/handle/11386/4923915)

**NASA LHASA v1 (Kirschbaum & Stanley 2018)**
- 0.01° grid, 60°N–60°S, every 3 h. Uses a 7-day weighted Antecedent Rainfall Index (ARI) from IMERG. A nowcast is issued if ARI > its 95th percentile (2000–2014 TMPA climatology, transformed to IMERG) **and** susceptibility is "moderate-high" or "very high"; the result is a "moderate-high" or "high" hazard. Hindcast against 4,930 global landslides and 384 fatal Nepal landslides: "acceptable performance". Cannot use rainfall forecasts **[V]** — [Guzzetti 2020 §4.2](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view). Primary: Kirschbaum D., Stanley T. (2018) *Earth's Future* 6, 505–523, doi:10.1002/2017EF000715 **[M for DOI/pages]**
- v1 POD against the Global Landslide Catalog ranged from 8% to 60%, depending on period, precipitation product and spatial/temporal window **[S]** — [Kirschbaum & Stanley 2018 via search (PreventionWeb)](https://www.preventionweb.net/quick/47116)
- The precursor Central America prototype used percentile triggers: ARI ≥ P50 and daily rain P50–P95 gave "moderate", daily rain ≥ P95 gave "high" **[V]** — [Guzzetti 2020 §4.2.4](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

**NASA LHASA v2 (Stanley et al. 2021)**
- Model: XGBoost binary:logistic, 300 trees kept of 1,000 trained, max depth 2, η 0.05. Monotone constraints are positive for all variables except distance to faults and lithologic strength. Interaction constraints force every variable to interact with rainfall **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Inputs:
  - Static: max slope (90 m DEM), distance to active faults (GEM), lithologic strength (GLiM 0–6).
  - Dynamic: daily IMERG-Early rain rescaled by each cell's 99th-percentile daily rain; 2-day antecedent rain; SMAP L4 profile soil wetness; SMAP snow mass.
  - Daily, 30 arc-sec (~1 km) grid **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Training: ~9,700 landslide cells (GLC, Landslide Reporter, USLI, national and event inventories, 3 Apr 2015–31 Dec 2018), plus more than 1 million random space-time negatives. 2019–2020 held out for evaluation **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Verification: no AUC reported. TPR at p = 0.12 (chosen to match v1's false-positive rate):
  - training inventories (95,957 landslides): 38% (v1) vs 98% (v2)
  - validation inventories (3,555 landslides): 45% vs 93%
  - per inventory: Burundi 12% → 46%; Rio de Janeiro 0% → 0%
  - Most GLC landslides fell *below* 0.12 **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Authors' headline: "twice as likely to predict the occurrence of historical landslides as LHASA version 1, given the same global false positive rate" **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Alarm frequency: under 1% of the time over large mountainous regions, but above 10% of the time in small hotspots **in Colombia, Indonesia, and Papua New Guinea** **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Indonesia: mean predicted probability is high across the archipelago, but **no Indonesian inventory is in training or validation**. Compared with the Cepeda et al. (2010) Indonesian hazard map, v2 puts less emphasis on Sulawesi, Borneo and Flores **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Output is a continuous probability. The authors say an operational system must choose its own thresholds; the public product shows 4 levels (minimal/low/moderate/high) **[S]** — [NTRS 20210015014](https://ntrs.nasa.gov/citations/20210015014)
- Limitations: GLC news bias, no anthropogenic/road factor, IMERG underestimates short convective bursts, SMAP latency ~2.5–3 days **[V]** — [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- A forecast extension driven by GEOS-FP rainfall exists: Khan S. et al. (2022) *Front. Earth Sci.* 10:878996 **[S]** — [Frontiers](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.878996/epub)

**Japan JMA / prefectures: Sediment Disaster Alert Information (土砂災害警戒情報)**
- SWI = total water depth in a three-tank cascade (Ishihara & Kobatake 1979). Tank 1 is surface runoff, tank 2 surface-layer infiltration runoff, tank 3 groundwater. Input is rainfall to tank 1, and each lower tank is fed by the bottom outlet of the one above. The SWI drives Emergency Warnings, Warnings, Advisories for heavy rain and Landslide Alert Information **[V]** — [JMA 2018](https://www.jma.go.jp/jma/en/Activities/qmws_2018/Presentation/3.1/Soil%20Water%20Index,%20Runoff%20Index,%20and%20Surface%20Water%20Index_revised.pdf)
- Okada et al. (2001) defined the tank storage as the SWI and judged danger by comparing it with 10 years of disaster history **[S]** — [NILIM sabo1](https://www.nilim.go.jp/english/hottopics/pdf/sabo1.pdf)
- Fixed, nationally uniform parameters on ~1 km tertiary meshes (originally 5 km meshes) **[S]** — [PIAHS 386, 2024](https://piahs.copernicus.org/articles/386/197/2024/); [Osanai et al. 2010 via secondary source](https://conference.unsri.ac.id/index.php/uniid/article/download/641/253)
- Critical line (CL): long-term index = SWI, short-term index = 60-min rainfall. The CL is a nonlinear boundary between occurrence and non-occurrence rainfall, fitted with a radial-basis-function network (RBFN; Kuramoto et al. 2001). It is tuned per mesh against the disaster *capture rate*, the *issuance frequency*, and whether past major disasters and evacuations are captured **[S]** — [JMA Tenki 2006 article](https://www.metsoc.jp/tenki/pdf/2006/2006_01_0043.pdf); [Taiwan review citing Kuramoto 2005 / Osanai 2010](https://www.cswcs.org.tw/AllDataPos/JournalPos/VOL44/NO2/jcswc44(2)131-143_04.pdf)
- Primary paper: Osanai N., Shimizu T., Kuramoto K., Kojima S., Noro T. (2010). Japanese early-warning for debris flows and slope failures using rainfall indices with Radial Basis Function Network. *Landslides* 7, 325–338, doi:10.1007/s10346-010-0229-5 **[M — not fetched; hit rates not retrieved]**
- Kuramoto et al. (2005) compared 7 short/long-term index pairs on correct-prediction rate, mean lead time and false-alarm rate **[S]** — [CSWCS paper](https://www.cswcs.org.tw/AllDataPos/JournalPos/VOL44/NO2/jcswc44(2)131-143_04.pdf)
- Lead time: across 36 sites (2018 study), where the SWI kept rising after crossing the alert level, 75% of the sediment disasters occurred within ~19 h **[S]** — [search snippet, JSECE/J-STAGE](https://jsece.or.jp/?p=3819)
- Known weaknesses:
  - Does not forecast disaster scale **[S]** — [same search](https://www.metsoc.jp/tenki/pdf/2006/2006_01_0043.pdf)
  - Misses deep-seated / layer-boundary failures that lag the rain; a "parallel tank index" has been proposed **[S]** — [KAKEN 20K05032](https://kaken.nii.ac.jp/grant/KAKENHI-PROJECT-20K05032)
  - A locally calibrated tank gave a more accurate CL than JMA's uniform model (Saba River) **[S]** — [JSCE F6](https://www.jstage.jst.go.jp/browse/jscejsp/67/1/_contents/-char/en)
- Guzzetti 2020 does not list Japan among its 26 reviewed systems; it mentions only early Japanese threshold work **[V]**. So the review-level comparisons above do not include JMA.

**Hong Kong GEO–HKO Landslip Warning System (since 1977)**
- Called "the longest-lived and arguably the most successful LEWS in the world" **[V]** — [Guzzetti 2020 §4.1.1](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Current phase since 2004:
  - 122 automatic 5-min rain gauges plus SWIRLS radar nowcasts (1–3 h).
  - Four empirical R24 → landslide-density curves, one per engineered-slope type (soil cuts, rock cuts, fill slopes, retaining walls).
  - 1,600 grid cells of 1.2 × 1.5 km; forecasts the *expected number of landslides*.
  - Three levels: internal "consultation" (R24 > 100 mm at ≥10 gauges); internal "alert"; public "warning" when ≥15 failures are forecast (≥10 before 2001) **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Verification: 15 events 2001–2005 (Cheung et al. 2006), "successful … with very few false alarms" **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

**Norway NVE (varsom.no, operational Oct 2013)**
- Threshold axes:
  - *Relative water supply* = simulated rain + snowmelt as % of the 1981–2010 annual mean.
  - *Degree of soil water saturation* = HBV-simulated total soil + groundwater content ÷ 30-year maximum.
  - These axes gave "the best performance" among the variables tested. Raster at 1 × 1 km **[V]** — [Krøgli 2018](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- Inputs: ~400 met stations, ~400 hydrological stations, ~80 groundwater stations. Forecasts from AROME MetCoOp 2.5 km (days 1–3) and ECMWF 9 km (to 9 days), the distributed HBV model, and the S-Flow soil model **[V]** — [Guzzetti 2020 §4.2.3](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Threshold setting: min/average/max thresholds set by *expert judgement* from 206 historical landslides, using a few large events (2000, 2005, 2008). Regional thresholds for Southern and Eastern Norway were later added because of many false alarms. They were raised manually "until no impact was shown in the threshold map". The authors admit this "lacks in objectivity and is not easily reproducible" **[V]** — [Krøgli 2018](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- Levels and timing: 4 colours (green/yellow/orange/red) per county or municipality group. Daily issue for 3 days, each valid 24 h, published before 11:00 and 15:00. 14 forecasters, some shared with flood and avalanche desks **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Verification 2013–2017:
  - Level frequency: green 87.6%, yellow 10.9%, orange 1.4% of days; red only in 2013.
  - ~96% correct on all days, ~88% on "challenging days" (25–30% of days per year).
  - False alarms and misses are mostly due to changes in the weather forecast. The verification unit is the region-day, with a level counted correct if the observed impacts match the level's description **[V]** — [Krøgli 2018](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- EDuMaP applied to Norway: Piciullo L., Dahl M.-P., Devoli G., Colleuille H., Calvello M. (2017). *NHESS* 17, 817–831, doi:10.5194/nhess-17-817-2017 **[M — not fetched]**

**Italy**
- **SANF (national, CNR-IRPI for the Civil Protection Department):** hourly nowcast and forecasts for all of Italy.
  - Inputs: >2,500 gauges (~1 per 120 km²) and COSMO-I7 QPF.
  - Threshold: a single probabilistic ED threshold from 2,819 landslides 1996–2014 (Peruccacci 2017), covering durations 1–1212 h.
  - Nowcast = weighted sum of exceedance probabilities for 24/48/72/96-h antecedent windows, combined with 25 m statistical susceptibility. Run by 16 forecasters **[V]** — [Guzzetti 2020 §4.2.2](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **Emilia-Romagna SIGMA (since 2006):**
  - Statistical cumulative-rain thresholds: 1–3 days for shallow landslides, 4–245 days for deep-seated ones. Snow accumulation and snowmelt included. 25 alert zones.
  - Criticality by expected count: 0–1 / 2–19 / 20–59 / ≥60 landslides. Modulated by 100 m random-forest susceptibility in 4 nested tiers.
  - Verification 2008–2010: all missed alarms and 84% of false alarms fell in the lowest criticality level **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **Tuscany (since 2015):** 322 gauges, 25 statistical ID thresholds (one per alert zone) from >3,000 landslides 2000–2013. 6/12/24/48-h measured+forecast scenarios, 4 levels. "No validation … was performed" **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **Sicily HEWS:** ED thresholds at non-exceedance probabilities 0.07/0.20/0.50 map to 4 levels. No validation **[V]** — same source
- **Piedmont:** DEFENSE/SMART/TRAPS. Hindcast of the 2013 and 2016 events was successful **[V]** — same source
- **Campania:** not described in Guzzetti 2020; no verified source found this session (see Gaps).

**USA**
- **Seattle (USGS–NWS–City, prototype from 2002):**
  - Antecedent threshold plus an ID threshold (40 or 55 mm/day depending on wetness) and an Antecedent Water Index (AWI).
  - Levels null → outlook → watch (AWI > −0.1) → warning (AWI > 0.02 or soil saturation > 60%, plus ID exceeded) **[V]** — [Guzzetti 2020 §4.1.4](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **Southern California post-fire debris flow (NOAA–USGS):** ID thresholds for the first winter after fire and after one year of recovery, updated repeatedly (Staley 2013/2016/2017). Outlook/watch/warning levels. 2005–2008: 104 warnings, of which **45% produced debris flows** (i.e., ~55% false-alarm ratio, accepted operationally) **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

**Brazil**
- **Alerta-Rio (GEO-Rio, since 1996):** 33 stations (~1 per 37 km²), radar, thresholds from 65 landslides on 1-, 24- and 96-h rain. 4 levels. EDuMaP evaluation 2010–2012: "overall good performance … significant number of false alarms in the SE zone", likely from a low threshold **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **CEMADEN (national, municipality-level):** thresholds from cluster analysis of historical landslides (Recife study). Adding soil moisture cut false positives at "Alert" and "Maximum Alert" by 43.9% and 66.3% (São Bernardo do Campo) **[S]** — [EGU24-11530](https://presentations.copernicus.org/EGU24/EGU24-11530_presentation.pdf); [Univap repository](https://repositorio.univap.br/bitstreams/375b7d84-b2bf-4b0c-be31-006dc3770fd3/download). No national CEMADEN verification statistics found.

**Sri Lanka NBRO (regional rainfall thresholds since 2007)**
- Daily rainfall levels: 75 mm/day (Level 1, yellow), 100 mm/day (Level 2, amber), 150 mm/day or 75 mm/h (Level 3, red, evacuation). Level names differ between sources **[S]** — [Springer chapter](https://link.springer.com/doi/10.1007/978-3-031-16898-7_16); [JICA 2019](https://www.jica.go.jp/srilanka/english/office/topics/c8h0vm0000f7mnlp-att/191121_02.pdf)
- JICA (2019) says these daily criteria need improvement and points to Japan's SWI as the refinement — a direct precedent for transferring the JMA method to a tropical country **[S]** — [JICA 2019](https://www.jica.go.jp/srilanka/english/office/topics/c8h0vm0000f7mnlp-att/191121_02.pdf)
- No verification numbers found.

**India GSI**
- LANDSLIP prototype (GSI + BGS, from 2016) for Darjeeling and Nilgiris: rainfall thresholds plus 24–48 h and 10-day forecasts plus susceptibility, giving low → very high levels. Daily bulletins in the 2020 and 2021 monsoons. National rollout planned from 2026 **[S]** — [BGS LANDSLIP paper](https://nora.nerc.ac.uk/id/eprint/535797/1/The%20LANDSLIP.pdf); [Geoengineer 2026 news](https://www.geoengineer.org/news/geological-survey-of-india-to-launch-landslide-warning-system-in-2026); [Down To Earth](https://www.downtoearth.org.in/amp/story/natural-disasters/stemming-the-landslide-gsi-is-working-on-early-warning-systems-for-landslips-in-india-but-how-do-they-work)
- No verification statistics found.

**Taiwan SWCB debris-flow warning (national)**
- Rainfall Triggering Index RTI (Jan 2004) = rainfall intensity × effective accumulated rainfall. Critical lines per torrent; a simplified critical accumulated rainfall (Rc, roughly 200–600 mm) is given to the public. Rain checked every 10 min **[S]** — [EGU2011-2983](https://meetingorganizer.copernicus.org/EGU2011/EGU2011-2983.pdf); [SWCB slides, EGU2016](https://presentations.copernicus.org/EGU2016/EGU2016-18332_presentation.pdf)
- Performance is evaluated annually against new debris-flow events with reliability/accuracy indexes; advisories range up to forced evacuation **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- An SWI-type (tank) index was also tested in Taiwan; debris flows in Eastern Taiwan occurred when SWI > 107 mm **[S]** — [CSWCS](https://www.cswcs.org.tw/AllDataPos/JournalPos/VOL44/NO2/jcswc44(2)131-143_04.pdf); [ACRS 2019](https://acrs-aars.org/proceeding/ACRS2019/WeD1-5.pdf)
- Southern Taiwan pre-operational (Wei 2018): I3 × R24 matrix thresholds per susceptibility class on slope units, 4 levels up to mandatory evacuation **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

**China (Zhejiang, national CGS/CMA geohazard meteorological warning)**
- Not covered by retrieved sources this session (see Gaps). **[M]** China's national geohazard–meteorological warning (CGS + CMA) is a joint daily product with 5 levels, and Zhejiang runs a provincial version, but this is unverified.

**Indonesia**
- **Balai Litbang Sabo (BLS) national LEWS**, built with Deltares and Universitas Muhammadiyah Yogyakarta; operational from 2017:
  - Platform: Delft-FEWS. Grid: 0.25°.
  - Inputs: TRMM satellite rain plus QPF from the national water-resources research centre (Pusair) and BMKG.
  - Thresholds: two empirical rainfall thresholds (day-of-event rain and 3-day antecedent) from 83 rainfall events.
  - Issued only for areas Badan Geologi rates as prone. Twice weekly (Tue/Fri), valid for the next 4 days.
  - Levels: one threshold exceeded → yellow; both → red. Red is confirmed by TRIGRS (factor of safety < 1.2) at 9 sites in Java and Sumatra.
  - Dissemination by website plus a WhatsApp group. **Not validated** as of 2019 **[V]** — [Guzzetti 2020 §4.2.5](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view); primary: Hidayat et al. 2019; Mulyana et al. 2019 **[M for full refs]**
- **Java design (Liao et al. 2010):** TRMM + QPF + susceptibility + the physically based SLIDE model at 30 m. Status unknown **[V]** — [Guzzetti 2020 §4.1.9](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- **PVMBG/Badan Geologi monthly ground-movement forecast** ("Prakiraan Wilayah Potensi Terjadi Gerakan Tanah"): **[M]** overlays the BMKG monthly rainfall outlook on the ground-movement susceptibility zones (ZKGT), giving low/medium/high per kecamatan, published monthly per province. No verification found. Unverified this session.
- **Indonesian soil-moisture × rainfall threshold (UGM thesis):** negative-slope line (wetter soil → less rain needed), >80% accuracy reported **[S]** — [UGM ETD](https://etd.repository.ugm.ac.id/penelitian/detail/261575)

### Inferences
- **[I]** The systems with the best documented skill share one design: a *slowly varying wetness state* (SWI, HBV saturation, 15-day antecedent, AWI) crossed with a *short-term trigger* (60-min rain, R24, water supply), with thresholds per region or per mesh. Rain-only daily thresholds (Sri Lanka, BLS) are the simplest and the least verified.
- **[I]** ML (LHASA v2) shows the largest relative gain, but it is verified only globally, on a news-biased catalogue, against v1 at a single fixed false-positive rate. It is a strong *prior/feature source* for Indonesia, not a verified Indonesian benchmark.
- **[I]** Norway's ~96% "correct days" is inflated by the 87.6% of green days. Correct-negatives dominate any district-day evaluation, so Indonesia should report POD, FAR and TSS/HSS on event days, not accuracy.

### Gaps
- Exact Japanese hit rates and capture ratios for Osanai 2010 (paper not fetched).
- Official CEMADEN, NBRO, GSI and SWCB verification statistics: none found.
- Campania (Italy) regional system and China/Zhejiang: no source retrieved this session.
- Any peer-reviewed LHASA v1/v2 verification *specific to Indonesia*: none found. Stanley 2021 explicitly has no Indonesian inventory.

---

## Q2. How are warnings verified with incomplete inventories (EDuMaP, Segoni 2018)?

### Takeaway
The accepted approach is to verify *warning-zone × time-window* events against *landslide events* (not single landslides), weight errors by alert level and duration (EDuMaP), and widen space-time windows to absorb location and timing errors. Treat the inventory as a known-biased sample, harvest media and social media, and report how the detection rate changes with the window. No standard has been adopted.

### Cited Findings
- EDuMaP: Calvello M., Piciullo L. (2016). Assessing the performance of regional landslide early warning models: the EDuMaP method. *NHESS* 16, 103–122, doi:10.5194/nhess-16-103-2016. Tested on Rio de Janeiro data **[S]** — [NHESS 16/103](https://nhess.copernicus.org/articles/16/103/2016/)
- **[M]** EDuMaP mechanics, unverified this session:
  - Builds "landslide events" from (number of landslides, spatial density) classes and "warning events" from continuous periods at a given level.
  - Fills a duration matrix (time spent in each warning-level × landslide-class cell).
  - Derives correct/false/missed/wrong-level counts and indicators (efficiency index, odds ratio, missed and false alarm rates) weighted by a "grade of accuracy" matrix.
- Piciullo et al. (2017a, b) proposed choosing the number and level of thresholds by optimisation that minimises the false alarm rate using EDuMaP. None of the 26 reviewed LEWS set their levels by optimisation, because levels are dictated by organisational/legal constraints or multi-hazard frameworks **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Guzzetti 2020 on incomplete inventories:
  - Forecasters should "consider the possible (or probable) lack of accurate landslide information".
  - Inventories are biased along roads and in populated areas.
  - Recommends satellite event detection (Mondini 2019) and social-media harvesting (Kirschbaum 2010/2015; Calvello & Pecoraro 2018; Froude & Petley 2018).
  - Uncertain landslide timing gives "erroneous thresholds … wrong forecasts, and … flawed verifications" **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Segoni S., Piciullo L., Gariano S.L. (2018). A review of the recent literature on rainfall thresholds for landslide occurrence. *Landslides* 15, 1483–1501, doi:10.1007/s10346-018-0966-4. Finds landslide cataloguing to be as important as rainfall data and widespread drawbacks in recent literature, including a lack of objective, reproducible calibration and validation **[S]** — [FLORE UniFI](https://flore.unifi.it/handle/2158/1131027); [EGU2018-8432](https://meetingorganizer.copernicus.org/EGU2018/EGU2018-8432.pdf)
- LHASA practice: widening the time window and buffer around nowcasts raised detection by more than 10%, attributed partly to time-zone and location errors **[S]** — [Kirschbaum & Stanley 2018 via search](https://www.preventionweb.net/quick/47116)
- Norway practice:
  - Verification unit is the *region-day*. Correct means observed impacts match the level description (e.g., orange = many landslides and road closures).
  - Events are gathered via the regObs crowdsourcing app and media monitoring.
  - A second quality-assurance pass follows as late reports arrive **[V]** — [Krøgli 2018](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- Emilia-Romagna: errors are reported *per criticality level*. The misses and 84% of false alarms sat at the lowest level, which is useful for tuning only that boundary **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

### Inferences
- **[I]** For Indonesia (DIBI + GLC + news, strong under-reporting off-road and in remote districts), use the district-day as the warning event and a "landslide day" (≥1 reported landslide) as the observed event. Report POD/FAR/TSS at ±1-day tolerance. Treat "false alarms" in low-reporting districts as partly unverifiable, e.g., stratify FAR by a reporting-density proxy (population/road density).
- **[I]** Because of under-reporting, observed FAR is biased *upward*. Do not tune thresholds purely to minimise observed FAR in sparse-reporting regions, or the system will become under-warning where reporting is worst.

### Gaps
- The EDuMaP matrix definitions were not re-read this session (marked [M]).
- No source found that quantifies inventory completeness for Indonesia.

---

## Q3. What FAR levels do operational services accept, and how do they communicate probability?

### Takeaway
Operational services tolerate high false-alarm ratios at the lower levels, typically 50% or more. Lower levels are deliberately "cheap" and internal or for authorities, and public warnings are reserved for high-confidence levels. Most use 3–4 traffic-light levels and impact-described categories rather than explicit probabilities; LHASA v2 is the main system issuing raw probabilities.

### Cited Findings
- Southern California post-fire: 104 warnings 2005–2008, only 45% followed by debris flows, yet used successfully for evacuations **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- North Vancouver experimental system: 9 "warning" reaches with no debris flow (false alarms) vs debris flows in 4 warning storms plus 1 watch-II storm **[V]** — same source
- Most LEWS use 3–4 levels. Guzzetti calls 3–4 "a reasonable compromise", with more levels for public than internal use. Traffic-light colours cause problems: colour blindness, and "green" read as "safe" when landslides are still possible (UK, Norway and Italy green definitions all allow landslides) **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Norway issues yellow on 10.9% of days and orange on 1.4% nationally (2013–2017). Levels are described by expected impacts, illustrated with boots of increasing height. Regional thresholds were raised after "many false alarms" **[V]** — [Krøgli 2018](https://nhess.copernicus.org/articles/18/1427/2018/nhess-18-1427-2018.pdf)
- Hong Kong public warning only when ≥15 failures are forecast; lower levels are internal **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- LHASA v2 publishes a probability so users "directly manage the trade-off between false negatives and false positives". Its alarm frequency exceeds 10% of days in Indonesian hotspots **[S/V]** — [NTRS](https://ntrs.nasa.gov/citations/20210015014); [Stanley 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.640043/full)
- Cost asymmetry: one Brazilian study puts missed alarms at ~7× the cost of false alarms, which pushes optimal thresholds lower **[S]** — [search summary, Brazil studies](https://repositorio.univap.br/bitstreams/375b7d84-b2bf-4b0c-be31-006dc3770fd3/download)
- Combeima (Colombia) used a cost function weighting missed events (lives) against evacuation costs **[V]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)
- Sicily HEWS maps non-exceedance probabilities 0.07/0.20/0.50 of the ED threshold to ordinary/moderate/high, so probability is encoded in the levels, not shown **[V]** — same source

### Inferences
- **[I]** A district-day product for BNPB/BPBD should expose probability internally (for calibration and verification) but publish 3–4 impact-described levels. Accept FAR of roughly 0.5–0.8 at the lowest level and push FAR down at the top level. Report alert frequency (% of district-days at each level) as a control metric, as Norway does.

### Gaps
- No published explicit "acceptable FAR" policy number from any agency was found; the figures above are realised values.

---

## Q4. How is Japan's SWI tank model computed, and has it been applied in Indonesia?

### Takeaway
SWI is the summed storage of a three-tank cascade (Ishihara & Kobatake 1979) with nationally fixed parameters, computed on ~1 km meshes from radar–gauge analysed precipitation and nowcasts. Thresholds are a per-mesh nonlinear critical line in (SWI, 60-min rain) space, fitted by RBFN. No peer-reviewed operational Indonesian application of the JMA SWI/CL was found. Tropical precedents exist: Malaysia (Ulu Klang, Sabah), Taiwan, and a JICA recommendation for Sri Lanka.

### Cited Findings
- Structure: three tanks in series. Each has side outlet(s) (lateral runoff) and a bottom outlet (infiltration to the next tank). Rain enters tank 1. SWI = sum of the three storages **[V]** — [JMA 2018](https://www.jma.go.jp/jma/en/Activities/qmws_2018/Presentation/3.1/Soil%20Water%20Index,%20Runoff%20Index,%20and%20Surface%20Water%20Index_revised.pdf)
- Parameters are "fixed … uniformly allocated for all grid cells" and "uniform in all Japan" **[S]** — [PIAHS 386:197, 2024](https://piahs.copernicus.org/articles/386/197/2024/)
- **[M — standard values quoted in the literature (Okada et al. 2001; Ishihara & Kobatake 1979), NOT verified this session; confirm before coding.]** Storage S in mm; outflow q = α·max(S − L, 0) per hour.
  - Tank 1: side outlets L₁₁ = 15 mm (α₁₁ = 0.10) and L₁₂ = 60 mm (α₁₂ = 0.15); bottom β₁ = 0.12.
  - Tank 2: side L₂ = 15 mm (α₂ = 0.05); bottom β₂ = 0.05.
  - Tank 3: side L₃ = 15 mm (α₃ = 0.01); bottom β₃ = 0.01.
  - JMA computes on ~1 km meshes at 10-min steps from "Analysed Precipitation" (radar calibrated by gauges) and short-range rainfall forecasts.
- Local recalibration improves skill:
  - Shuffled-complex-evolution parameter identification is accurate.
  - Optimising 6 parameters matched deep-seated landslide timing.
  - A locally fitted tank gave a better CL than JMA's uniform one **[S]** — [PIAHS 2024](https://piahs.copernicus.org/articles/386/197/2024/); [JSCE F6](https://www.jstage.jst.go.jp/browse/jscejsp/67/1/_contents/-char/en)
- Tropical applications:
  - Malaysia Ulu Klang: 15 landslides 1993–2012, SWI thresholds **[S]** — [Jurnal Teknologi UTM](https://journals.utm.my/jurnalteknologi/article/download/4005/2907/10944)
  - Malaysia Sabah: SWI approach **[S]** — [UMS eprints](https://eprints.ums.edu.my/id/eprint/35185)
  - Taiwan: SWI > 107 mm for debris flow in the east **[S]** — [CSWCS](https://www.cswcs.org.tw/AllDataPos/JournalPos/VOL44/NO2/jcswc44(2)131-143_04.pdf)
  - Sri Lanka: JICA recommends SWI to replace daily-rain criteria **[S]** — [JICA 2019](https://www.jica.go.jp/srilanka/english/office/topics/c8h0vm0000f7mnlp-att/191121_02.pdf)
- Indonesia: the search found no tank-model SWI + CL study for Indonesia. The nearest are a physically based Upper Citarum threshold and a UGM soil-moisture × rain threshold (>80% accuracy) **[S]** — [UGM journal](https://journal.ugm.ac.id/jag/article/download/7261/5693); [UGM ETD](https://etd.repository.ugm.ac.id/penelitian/detail/261575). BLS (Balai Sabo) has long-standing Japanese (JICA) sabo ties, but its 2017 national LEWS uses rain thresholds, not SWI **[V for LEWS design]** — [Guzzetti 2020](https://geomorphology.irpi.cnr.it/publications/repository/public/journals/2020/guzzetti-et-al-2020-geographical-landslide-early-warning-systems.pdf/view)

### Inferences
- **[I]** The SWI tank is cheap (three state variables per cell, an hourly or daily step) and runs on IMERG or GSMaP. GSMaP is JAXA's, so the pairing is natural. It is a strong candidate state variable for a district-day model in place of a fixed 7-day sum. With daily data, the 60-min short-term index must be replaced by daily or 3-h max rain; this is a known departure from JMA.
- **[I]** Volcanic andosols and deep tropical weathering profiles are highly permeable with large storage, so the Japanese uniform parameters (calibrated largely on Japanese volcanic and granitic soils) are a reasonable *starting* point. Recalibrate β/α against Indonesian events or swap in SMAP/ERA5-Land soil moisture as a check.

### Gaps
- Exact JMA parameter table and current mesh/time-step: not verified this session (the JMA English PDF shows the schematic only).
- No Indonesian SWI/CL study found.

---

## Best-practice methods transferable to Indonesia (synthesis; all [I] unless cited)

1. **Two-axis trigger: state × trigger.** Pair an antecedent wetness state (JMA-style SWI tank, or HBV/SMAP saturation as in Norway and LHASA v2) with a short-term rain index. This is common to Norway (water supply × saturation, "best performance" [V]), Japan (SWI × 60-min rain), and Seattle (AWI + ID).
2. **Percentile/climatology-normalised rain.** LHASA scales rain by the local P95 or P99 [V]. This is essential across Indonesia's strong rainfall gradients and avoids Sri Lanka-style national mm/day constants.
3. **Regionalised thresholds, updated after false alarms.** Norway split national thresholds into regional ones after false alarms [V]; Tuscany uses 25 zone thresholds [V]. For Indonesia, regionalise by island or climate type (monsoonal/equatorial/local) and lithology, including volcanic regions.
4. **Susceptibility gating/modulation.** Used by LHASA, SANF, SIGMA, Southern Taiwan and BLS (Badan Geologi prone areas) [V]. Reuse the ZKGT plus slope/fault/lithology.
5. **Expected-count or impact-based levels with 3–4 tiers.** Hong Kong's expected number of failures and SIGMA's count classes [V] translate naturally to an "expected landslide district-days" framing.
6. **Probabilistic core, categorical publication.** LHASA v2 probability [V]; Sicily's non-exceedance probability levels [V].
7. **Verification protocol.**
   - Use district-day events with ±1-day tolerance and report POD, FAR, TSS and alert frequency by level.
   - Report the per-level confusion, as Emilia-Romagna does [V]. Run an EDuMaP-style duration matrix for multi-day warnings.
   - Run a second QA pass for late reports, as Norway does [V].
   - Stratify by a reporting-density proxy to handle under-reporting.
   - Hold out years, as LHASA v2 does with 2019–2020 [V].
8. **Forecaster-in-the-loop and forecast-error awareness.** Norway's misses and false alarms are mostly from QPF changes [V]. Nowcast (observed rain) and forecast (QPF) skill should be reported separately.
9. **Avoid the BLS pitfalls.** Thresholds from 83 events, 0.25° grid, no validation [V]. Grow the event base with DIBI + GLC + media harvesting before fitting thresholds, and validate before publishing.
