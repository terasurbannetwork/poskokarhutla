# Global multi-hazard and anticipatory-action platforms, plus open-source impact-based forecasting (IBF) code: a benchmark for Centurisk97 (poskokarhutla)

Research date: 2026-10-29. GitHub figures (stars, last push, licence, language, archived) were pulled live from the GitHub API on 2026-10-29 with `gh api repos/<owner>/<repo>` and `gh api orgs/<org>/repos`. They are cited to each repo URL. "Last push" is the `pushed_at` field. It shows activity on any branch, not necessarily a release.

## 1. Platforms: what they predict, triggers, and skill

### Takeaway
The global systems split into three groups. Short-range hazard alerting (GDACS, PDC DisasterAWARE and its ASEAN/Indonesian forks DMRS and InAWARE) sits closest to what Centurisk97 already does. Medium-range composite crisis risk (INFORM Warning, 1–12 months) and finance-linked trigger frameworks (OCHA/CERF, IFRC EAPs, Start Ready) are where non-natural risks show up: cholera, conflict, food insecurity and displacement. Centurisk97's biggest gap against them is not hazard coverage. It lacks three things: (a) a pre-agreed impact threshold that releases money or action, (b) any non-natural signal layer, and (c) an explicit evaluation of triggers against observed impact.

### Cited Findings

**INFORM (JRC): Risk, Severity, Warning**
- The INFORM Risk hazard dimension has two categories, natural hazards and human-induced hazards. They are aggregated by geometric mean with equal weight, and conflict sits on the human side — [JRC INFORM Risk methodology](https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Risk/Methodology)
- A 2018–19 JRC report says epidemic risk was not yet part of the INFORM model. It built a separate "INFORM Epidemic GRI" from WHO/JRC epidemic-risk components and left the core model unchanged — [JRC EUR 29603](https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/Publications/EUR%2029603%20-%20Incorporating%20epidemics%20risk%20in%20the%20INFORM%20Global%20Risk%20Index.pdf); [PreventionWeb summary](https://www.preventionweb.net/publication/incorporating-epidemics-risk-inform-global-risk-index)
- A 2022 subnational INFORM (South-East Europe) infographic lists earthquake, flood, landslide, drought, wildfire, epidemic, uprooted people and current conflict as hazard indicators. The PDF text was garbled when extracted, so the column placement is unconfirmed — [UNDRR-SEE infographic](https://drmkc.jrc.ec.europa.eu/inform-index/portals/0/InfoRM/2022/Subnational/SEE/UNDRR-SEE-infographic-03.04.23.pdf)
- INFORM Warning is described as a global early-warning system for where crisis risk is likely to rise over the next 1–12 months. The user guide is JRC146982, dated 2026-07-22 — [JRC publication JRC146982](https://publications.jrc.ec.europa.eu/repository/handle/JRC146982)
- INFORM Warning deliberately does not issue alerts for short-term forecast events such as tsunamis or tropical storms, because "other systems already exist" — [INFORM Warning page](https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Warning)
- The 2022 design has four parts: a Risk Monitor of dynamic indicators, forecasts and predictions; analysis that generates warnings; human curation to validate, contextualise and prioritise; and a web platform. The source is a 2022-era UNDP project document, so the 2026 guide may differ — [UNDP project document](https://mptf.undp.org/sites/default/files/documents/2024-05/undp_project_document_signed_redacted.pdf); [INFORM Warning proposal Apr 2022](https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/2022/INFORM%20Warning%20Proposal%20April%202022.pdf)
- The INFORM COVID-19 Warning tool was used as a case study for designing INFORM Warning — [JRC126938](https://publications.jrc.ec.europa.eu/repository/handle/JRC126938)
- INFORM Severity is published monthly and attributes crises to drivers. Example: in July 2025 the DRC complex crisis was driven by conflict, floods and political/economic crisis, with severity 4.3/5 — [INFORM Severity July 2025](https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/Severity/2025/INFORM%20Severity%20Index%20July%202025%20-%20All%20Crisis.pdf)
- The INFORM Severity methodology was revised in 2026 after user feedback and changes in the data ecosystem; the previous methodology dates from 2020 — [ACAPS Severity methodology update 2026-02-02](https://www.acaps.org/fileadmin/Dataset/Methodology_files/Severity_Methodology_update-online_20260202.pdf)

**GDACS**
- In GDACS, each event type computes its own alert score with its own model — [IFRC Monty GDACS source mapping](https://ifrcgo.org/monty-stac-extension/model/sources/GDACS/)
- GDACS event types are flood, earthquake, tropical cyclone, tsunami, volcano and drought (DR). Drought alerts are Green/Orange/Red with an affected area in km². I found no GDACS epidemic, conflict or technological alert type — [IFRC Monty GDACS mapping](https://ifrcgo.org/monty-stac-extension/model/sources/GDACS/); [example GDACS drought RSS](https://www.gdacs.org/datareport/resources/DR/1017629/rss_1017629.xml)

**PDC DisasterAWARE → InAWARE (BNPB) and DMRS (AHA Centre)**
- InAWARE is a customised DisasterAWARE built for BNPB and hosted at the BNPB Jakarta Data Center. It was first deployed in 2014 with USAID/OFDA funding — [PDC: InAWARE boosts DRR in Indonesia](https://www.pdc.org/inaware-system-boosts-disaster-risk-reduction-in-indonesia/)
- InAWARE v6 added offline operation and touch-screen support — [PDC: Indonesia unveils new technology](https://www.pdc.org/?p=3979)
- BNPB and PDC drafted InAWARE SOPs around 2015, and ownership was being handed over to BNPB — [PDC: BNPB drafts SOPs for InAWARE](https://www.pdc.org/indonesias-bnpb-drafts-standard-operating-procedures-for-inaware/); [PDC: Incorporating InAWARE](https://www.pdc.org/?p=4096)
- InAWARE ingests USGS and BMKG earthquake data and sends SMS/email alerts to BNPB staff (the PDC article is undated) — [PDC: Response to destructive earthquake in Indonesia](https://www.pdc.org/response-to-destructive-earthquake-in-indonesia)
- DMRS launched in 2012 as ASEAN's first regional multi-hazard early-warning and risk-intelligence platform. It runs at the AHA Centre in Jakarta on DisasterAWARE and includes near-real-time impact analysis, tsunami early warning and travel-time modelling — [PDC DMRS case study](https://www.pdc.org/dmrs-case-study/); [DMRS case study PDF](https://pdc.org/wp-content/uploads/DMRS-Case-Study.pdf)
- During Typhoon Vamco (2020), the AHA Centre produced automated hazard briefs with modelled exposure of population and infrastructure. Indonesia, the Philippines, Thailand and Viet Nam adopted DMRS elements for national platforms — [PDC DMRS case study](https://www.pdc.org/dmrs-case-study/)

**OCHA Centre for Humanitarian Data / CERF anticipatory action**
- In 2024 there were 20 active OCHA anticipatory-action frameworks, with 17 more in development, covering drought, floods, storms and cholera — [OCHA Centre: Climate data for anticipatory action](https://centre.humdata.org/climate-data-for-anticipatory-action/)
- The DRC cholera framework was set up in 2022 and revised in 2025. CERF activated it in North Kivu (Mar 2025), Maniema and Tshopo (May 2025) and Kinshasa (Jul 2025). A similar plan is being developed for Mozambique — [PreventionWeb: AA in DRC saving lives from cholera](https://www.preventionweb.net/news/how-anticipatory-action-drc-saving-lives-cholera)
- CERF pre-committed AA funding reached US$124.7 m by Nov 2025, up from US$48 m in 2020 — [CERF: At the forefront of AA](https://cerf.un.org/sites/default/files/resources/CERF_Atforefront_AA.pdf)
- Current OCHA-DAP repos include IPC/Cadre Harmonisé, FEWS NET, HNRP People-in-Need and ACLED mirrors or fetchers, a cholera PDF scraper, SEAS5 skill analysis, a "longterm outlook" (people in areas with a seasonal dry signal, alongside FEWS NET), and Philippines typhoon and Myanmar cyclone monitoring. This shows that food insecurity, conflict and cholera feed their AA work alongside hydromet — [OCHA-DAP GitHub org](https://github.com/OCHA-DAP) (see the repo table in §5)

**IFRC / Red Cross Forecast-based Financing (FbF) / EAPs: Indonesia and the Philippines**
- Indonesia (PMI) flood EAP: EAP2024ID01 / operation MDRID027, approved 24 Dec 2024, runs five years to Feb 2030. DREF allocated CHF 517,485: CHF 237,943 for readiness, CHF 78,930 for prepositioning and CHF 200,612 for early actions — [IFRC GO EAP annual report](https://go-api.ifrc.org/api/DownloadFile/90449/MDRID027eapar2025); [ReliefWeb: Indonesia Floods EAP annual report 31 Mar 2026](https://reliefweb.int/report/indonesia/indonesia-floods-early-action-protocol-annual-report-31-march-2026-eap-no-eap2024id01-operation-no-mdrid027)
- Year-1 readiness under that EAP included 1,500 dignity kits, 10,000 water containers, cash readiness and engagement with BMKG. Some activities slipped into 2026 because of the Cyclone Senyar response in Sumatra. As of the April 2026 update the trigger had not been activated (trigger date "NA") — [IFRC GO operations update](https://go-api.ifrc.org/api/DownloadFile/94788/MDRID027OU1)
- Philippines (PRC) typhoon EAP: the Philippine Red Cross activates when the 510 model forecasts more than 10% of buildings destroyed in a municipality — [Anticipation Hub: IBF for typhoons in the Philippines](https://www.anticipation-hub.org/news/impact-based-forecasting-for-typhoons-in-the-philippines); [PreventionWeb](https://www.preventionweb.net/news/impact-based-forecasting-typhoons-philippines)
- Other Indonesia AA: WFP worked to embed a Tropical Cyclone AA protocol for DI Yogyakarta in a Governor's Regulation, with triggers set through focus groups, and co-organised a BNPB workshop on an operational definition of AA (July 2024) — [ReliefWeb: WFP Indonesia country brief Jul 2024](https://reliefweb.int/report/indonesia/wfp-indonesia-country-brief-july-2024)
- The Anticipation Hub hosts a World Vision AA feasibility study for Indonesia (Kampung Melayu, East Jakarta; Alor, NTT) and I CAN ACT community-based AA learning — [World Vision feasibility study](https://www.anticipation-hub.org/Documents/Feasibility_Study/world-vision-feasibility-study-anticipatory-action-indonesia.pdf); [Anticipation Hub file 5024](https://www.anticipation-hub.org/download/file-5024)

**Start Network / Start Ready**
- Risk Pool 3 (May 2024–Apr 2025) covered 8 countries, including the Philippines, with 13 systems for heatwaves, cyclones, floods and drought. It activated 14 times and reached 495,271 people — [Start Ready Risk Pool 3 summary](https://startnetwork.org/learn-change/resources/library/start-ready-risk-pool-3-summary-report); [Risk Pool 3 structuring report](https://startnetwork.org/sites/default/files/2024-07/Start%20Ready%20Risk%20Pool%203%20Structuring%20report.pdf)
- Risk Pool 4 (May 2025–Apr 2026) covered 811,665 people in 9 countries with 14 systems. Risk Pool 5 (May 2026–Apr 2027) covers 767,078 people in 10 countries with 17 systems. Both cover heatwave, drought, flood and cyclone — [Risk Pool 4 structuring report](https://startnetwork.org/learn-change/resources/library/start-ready-risk-pool-4-structuring-report); [Risk Pool 5 2026 PDF](https://startnetwork.org/sites/default/files/2026-07/Risk%20Pool%205%202026.pdf)
- Start Ready funds "crises that happen with regular and predictable patterns". I found no dengue or displacement triggers. Start Fund risk bulletins do watch outbreaks such as Sudan virus disease and dengue, but as monitored risks rather than pooled triggers — [Start Ready](https://startnetwork.org/start-ready); [Start Fund Risk Bulletin Feb 2025](https://startnetwork.org/sites/default/files/webform/submit_content/_sid_/%28Feb%202025%29%20Start%20Fund%20Risk%20Bulletin.pdf)

**Philippines: Project NOAH and PAGASA IBF**
- The UPRI NOAH Center built a nationwide impact-based flood forecast with roughly 24-hour lead time. It lists potentially affected people per barangay and was funded by USAID-BHA (published 14 Apr 2025) — [UP IESM](https://iesm.science.upd.edu.ph/up-scientists-develop-advanced-impact-based-flood-forecasting-system/); [GMA News](https://gmanetwork.com/news/scitech/science/942731/up-scientists-develop-impact-based-flood-forecasting-system/story)
- In August 2026 the DBM released new funding to UP for NOAH's AI flood forecasting and real-time monitoring, including P935 m for research — [Daily Tribune 6 Sep 2026](https://tribune.net.ph/2026/09/06/p1-b-noah-boost-to-strengthen-flood-disaster-response)
- PAGASA's Multi-Hazard Impact-Based Forecasting and EWS (MHIBFEWS) project is funded by a US$10 m GCF grant plus US$12 m co-finance, runs 2023–2027, and aims to institutionalise IBF. PAGASA and Oxfam Pilipinas signed an IBF/AA agreement in July 2026 — [Daily Tribune Mar 2025](https://tribune.net.ph/2025/03/21/pagasa-eyes-impact-based-forecast); [Oxfam Pilipinas](https://oxfam.org.ph/?p=6854)

### Inferences
- Indonesia is already "in" several of these systems, through InAWARE (BNPB), DMRS (AHA Centre, Jakarta) and the PMI flood EAP with BMKG. The useful benchmark is therefore the trigger logic: the EAP's thresholds and the 510 "more than X% houses destroyed" rule. Copying a dashboard is not the point. Centurisk97 could publish an explicit "would this trigger have fired?" flag per kab/kota for flood and wildfire.
- INFORM Warning's 1–12 month horizon is the slot where Centurisk97's SEAS5 drought and seasonal karhutla outlook already sit. Its human-curation step is a design pattern worth copying for BNPB daily reports.
- InAWARE's current operational status in 2026 is unknown (see Gaps). If it is dormant, Centurisk97 overlaps its function.

### Gaps
- I could not open the INFORM Warning 2026 user guide to list its exact indicators and forecast sources.
- I found no 2018+ source on InAWARE's current status. PDC pages date from about 2014–2017.
- I did not locate the GDACS alert-score formulas, Copernicus GDO indicators, GloFAS skill, or the ECMWF/WMO IBF guidance documents. Their searches returned nothing usable.
- I did not find the PMI flood EAP's trigger definition (which forecast, return period or lead time). It is in the full EAP document on IFRC GO, which I did not open.
- InaRISK (BNPB) coverage was not verified from a primary source. GitHub shows only small hobby repos that scrape it, e.g. [devjuhans/inarisk-to-qgis](https://github.com/devjuhans/inarisk-to-qgis) (GPL-3.0, 0 stars).
- I found no information on the Anticipation Hub trigger database structure or API.

## 2. Coverage of non-natural risks: epidemics, food insecurity, conflict, displacement, heat, technological

### Takeaway
Among the platforms reviewed, only OCHA/CERF (cholera, plus food-insecurity and conflict data feeds), INFORM (conflict, uprooted people, epidemic in a separate index, socio-economic risk in Warning) and HDX Signals treat non-natural risks operationally. GDACS, DisasterAWARE/DMRS/InAWARE, Start Ready and the IFRC Indonesia EAP are natural-hazard only. Heat is the one "new" hazard with operational financing (Start Ready). I found no platform among them that forecasts technological failure (industrial or dam) as a hazard.

### Cited Findings
- Epidemics: an operational cholera AA framework exists in DRC with three CERF activations in 2025 — [PreventionWeb](https://www.preventionweb.net/news/how-anticipatory-action-drc-saving-lives-cholera). There is also an INFORM Epidemic GRI — [JRC EUR 29603](https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/Publications/EUR%2029603%20-%20Incorporating%20epidemics%20risk%20in%20the%20INFORM%20Global%20Risk%20Index.pdf). OCHA-DAP also maintains a cholera PDF scraper — [OCHA-DAP/ds-cholera-pdf-scraper](https://github.com/OCHA-DAP/ds-cholera-pdf-scraper)
- Food insecurity: OCHA-DAP mirrors IPC/Cadre Harmonisé and FEWS NET classifications daily and builds a year-ahead dry-signal × FEWS NET outlook — [ds-ipc-mirror](https://github.com/OCHA-DAP/ds-ipc-mirror); [ds-fewsnet-mirror](https://github.com/OCHA-DAP/ds-fewsnet-mirror); [ds-longterm-outlook](https://github.com/OCHA-DAP/ds-longterm-outlook)
- Conflict: INFORM Risk models it as a human-induced hazard — [JRC methodology](https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Risk/Methodology). INFORM Severity names it as a crisis driver — [Severity Jul 2025](https://drmkc.jrc.ec.europa.eu/inform-index/Portals/0/InfoRM/Severity/2025/INFORM%20Severity%20Index%20July%202025%20-%20All%20Crisis.pdf). OCHA-DAP has an ACLED fetcher — [ds-acled-fetcher](https://github.com/OCHA-DAP/ds-acled-fetcher)
- Displacement: "uprooted people" is an INFORM hazard-side indicator (placement unconfirmed) — [UNDRR-SEE infographic](https://drmkc.jrc.ec.europa.eu/inform-index/portals/0/InfoRM/2022/Subnational/SEE/UNDRR-SEE-infographic-03.04.23.pdf). OCHA-DAP builds daily flood-exposed-population estimates — [ds-floodexposure-monitoring](https://github.com/OCHA-DAP/ds-floodexposure-monitoring)
- Generic "negative change" alerting across datasets: HDX Signals sends automated email alerts "when significant, negative changes are detected" in monitored datasets. Its dataset list is on an external methodology site that I did not open. It is GPL-3.0 and written in R — [OCHA-DAP/hdx-signals](https://github.com/OCHA-DAP/hdx-signals)
- Heat: Start Ready pools 3–5 finance heatwave systems — [Risk Pool 5](https://startnetwork.org/sites/default/files/2026-07/Risk%20Pool%205%202026.pdf). Start Ready's Nepal work prioritises flood, heat and cold wave — [Start Ready](https://startnetwork.org/start-ready)
- Technological failure and economic impacts: I found no operational forecasting in any reviewed platform (see Gaps).

### Inferences
- The cheapest non-natural additions for Centurisk97 follow OCHA's pattern of mirroring an authoritative feed and alerting on change. The candidates are dengue (Kemenkes weekly), food-price anomalies (Panel Harga / WFP VAM), conflict (ACLED Indonesia) and displacement (BNPB pengungsi counts already in daily reports). That fits stdlib Python plus committed JSON with no modelling risk.
- A cholera-style framework maps naturally to dengue × La Niña/rainfall in Indonesia. Indonesia's health ministry has linked hotter temperatures to dengue surges — [Arab News](https://www.arabnews.pk/node/1494706). This news item is undated and weak evidence.

### Gaps
- I found no operational forecasting for technological failure (dam breaks, industrial accidents, grid failure) or economic impact in any reviewed platform.
- I did not open HDX Signals' list of monitored datasets, so ACLED, IPC, IDMC, WFP and JRC ASAP inclusion is unconfirmed beyond the separate OCHA-DAP mirror repos.
- I did not check WHO, ProMED, EIOS or ASEAN BioDiaspora as epidemic-intelligence comparators.

## 3. Heat stress / extreme-heat health warnings (WBGT, UTCI, ERA5-HEAT) in Southeast Asia

### Takeaway
The data and code exist and are open: ERA5-HEAT (UTCI and MRT, hourly, 0.25°) and ECMWF's `thermofeel` library (Apache-2.0). Operational heat-health warning in SE Asia is still Heat-Index based (PAGASA Philippines). I found no evidence of operational UTCI or WBGT warnings in Indonesia or Viet Nam.

### Cited Findings
- ERA5-HEAT provides hourly global MRT and UTCI at 0.25° from ERA5. It has a consolidated stream (about 2–3 months latency) and an intermediate stream (about 5 days latency), and it is free through the CDS — [Geoscience Data Journal 2021 (Di Napoli et al.)](https://doaj.org/article/60c3ba0b9f1b4c6fa32b8ac1b4d4dbc1); [CDS derived-utci-historical](https://cds.climate.copernicus.eu/datasets/derived-utci-historical)
- Sources disagree on the start date: the paper says 1979, the current CDS page says January 1940 — [GDJ](https://doaj.org/article/60c3ba0b9f1b4c6fa32b8ac1b4d4dbc1) vs [CDS](https://cds.climate.copernicus.eu/datasets/derived-utci-historical)
- ERA5-HEAT showed lower bias than WMO station data as a proxy for on-site comfort surveys (Curitiba, Brazil) — [Theor. Appl. Climatol. 2022](https://link.springer.com/article/10.1007/s00704-022-04129-x)
- ECMWF `thermofeel` is a library for human thermal-comfort indices: Apache-2.0, Python, 100 stars, last push 2026-10-10 — [ecmwf/thermofeel](https://github.com/ecmwf/thermofeel)
- A SE Asia projection at 22 km and 3-hourly resolution finds sharp increases in exposure to UTCI > 46 °C and WBGT > 33 °C by 2030–2059, worst in continental SE Asia — [Sci. Rep. 2025](https://link.springer.com/10.1038/s41598-025-28817-6)
- The Philippines heat EWS case study (Zurich Climate Resilience Alliance, Aug 2026) covers PAGASA, DOH and GHHIN. It is framed on Heat Index, and WBGT appears only in its glossary — [ZCRA Philippines HEWS case study](https://preparecenter.org/wp-content/uploads/2026/08/ZCRA_Philippines-HEWS-case-study.pdf)
- Start Ready finances heatwave triggers, though not in SE Asia as far as the sources show — [Risk Pool 3 report](https://startnetwork.org/sites/default/files/2024-07/Start%20Ready%20Risk%20Pool%203%20Structuring%20report.pdf)

### Inferences
- Centurisk97 already pulls Open-Meteo/ERA5 temperature, humidity and wind for FWI. Heat Index (NOAA Rothfusz) and an approximate WBGT (Liljegren, or the simpler Australian BoM shade formula) are closed-form and stdlib-portable. UTCI is a sixth-order polynomial of about 200 terms (published, and in `thermofeel`) and is also portable to pure Python. This would be a cheap new hazard layer with a clear impact link: outdoor workers, school closures, and dengue co-signal.
- Indonesia has no operational UTCI/WBGT warning (as far as found), so this is a genuine gap Centurisk97 could fill.

### Gaps
- I could not confirm BMKG's current heat products (whether any heat-index or "suhu panas" warnings exist) or the GHHIN SE Asia inventory.
- I did not find validation of UTCI/WBGT thresholds against Indonesian mortality or morbidity.

## 4. GitHub projects: stars, activity, licence, language, portability to Python stdlib

### Takeaway
The most reusable code is the logic, not the packages. Trigger-analysis notebooks (OCHA-DAP `ds-aa-*` / `pa-aa-*`), 510's typhoon-damage model design, and `thermofeel` formulas are small and re-implementable. The heavyweight engines (CLIMADA GPL-3.0, OpenQuake AGPL-3.0, LISFLOOD EUPL-1.2) are active, but their copyleft licences and numpy/xarray stacks make them unsuitable to vendor into a stdlib-only pipeline. Use them offline to produce reference tables, or re-derive formulas from the papers.

### Cited Findings (GitHub API, 2026-10-29)

| Repo | Stars | Last push | Licence | Lang | Archived | What it is |
|---|---|---|---|---|---|---|
| [OCHA-DAP/ocha-anticipy](https://github.com/OCHA-DAP/ocha-anticipy) (old name pa-aa-toolbox redirects here) | 11 | 2023-08-24 | GPL-3.0 | Python | no (stale) | AA framework helper package; docs at [aa-toolbox.readthedocs.io](https://aa-toolbox.readthedocs.io/en/latest/introduction.html) |
| [OCHA-DAP/pa-anticipatory-action](https://github.com/OCHA-DAP/pa-anticipatory-action) | 18 | 2024-09-20 | GPL-3.0 | HTML | no (stale) | Code and docs for early OCHA AA pilots |
| [OCHA-DAP/hdx-signals](https://github.com/OCHA-DAP/hdx-signals) | 14 | 2026-10-23 | GPL-3.0 | R | no | Automated negative-change alerts across HDX datasets |
| [OCHA-DAP/hdx-python-api](https://github.com/OCHA-DAP/hdx-python-api) | 96 | 2026-10-28 | MIT | Python | no | HDX data portal API |
| [OCHA-DAP/ds-aa-phl-typhoon-monitoring](https://github.com/OCHA-DAP/ds-aa-phl-typhoon-monitoring) | 0 | 2026-10-27 | none | Python | no | Philippines typhoon AA monitoring (SE Asia) |
| [OCHA-DAP/ds-aa-mmr-cyclones](https://github.com/OCHA-DAP/ds-aa-mmr-cyclones) | 0 | 2026-10-15 | none | Python | no | Myanmar cyclone AA (SE Asia) |
| [OCHA-DAP/ds-seas5-skill](https://github.com/OCHA-DAP/ds-seas5-skill) | 1 | 2026-10-19 | none | HTML | no | SEAS5 skill analysis (relevant to Centurisk97's SEAS5 drought) |
| [OCHA-DAP/ds-floodexposure-monitoring](https://github.com/OCHA-DAP/ds-floodexposure-monitoring) | 1 | 2026-10-26 | GPL-3.0 | Python | no | Daily flood-exposed population estimates |
| [OCHA-DAP/ds-ipc-mirror](https://github.com/OCHA-DAP/ds-ipc-mirror) / [ds-fewsnet-mirror](https://github.com/OCHA-DAP/ds-fewsnet-mirror) / [ds-acled-fetcher](https://github.com/OCHA-DAP/ds-acled-fetcher) / [ds-cholera-pdf-scraper](https://github.com/OCHA-DAP/ds-cholera-pdf-scraper) | 0 | Oct 2026 | none | Python | no | Non-natural feeds: food insecurity, conflict, cholera |
| [OCHA-DAP/ds-aa-bfa-drought](https://github.com/OCHA-DAP/ds-aa-bfa-drought), [pa-aa-fji-storms](https://github.com/OCHA-DAP/pa-aa-fji-storms), [ds-aa-uga-flooding](https://github.com/OCHA-DAP/ds-aa-uga-flooding) (Apache-2.0), [ds-aa-nga-flooding](https://github.com/OCHA-DAP/ds-aa-nga-flooding) (Apache-2.0) | 0–2 | 2026 | mixed | Py/HTML | no | Per-country trigger designs; worked examples of return-period thresholds |
| [OCHA-DAP/ds-knowledge-base](https://github.com/OCHA-DAP/ds-knowledge-base) | 3 | 2026-10-29 | none | HTML | no | Team knowledge base: AA frameworks, triggers, pipelines |
| [rodekruis/IBF-system](https://github.com/rodekruis/IBF-system) | 7 | 2026-10-06 | Apache-2.0 | TypeScript | no | Red Cross IBF portal for triggering and managing EAPs |
| [rodekruis/IBF](https://github.com/rodekruis/IBF) | 1 | 2026-10-29 | Apache-2.0 | TypeScript | no | "IBF v2", the successor repo |
| [rodekruis/IBF-river-flood-pipeline](https://github.com/rodekruis/IBF-river-flood-pipeline), [IBF-flash-flood-pipeline](https://github.com/rodekruis/IBF-flash-flood-pipeline), [IBF-drought-pipeline](https://github.com/rodekruis/IBF-drought-pipeline) | 0–1 | 2026-03 to 10 | none | Python | no | Hazard pipelines feeding the IBF portal; no licence means no reuse rights |
| [rodekruis/IBF-pipelines](https://github.com/rodekruis/IBF-pipelines) | 1 | 2025-12-30 | AGPL-3.0 | Python | no | Older combined pipelines |
| [rodekruis/Typhoon-Impact-based-forecasting-model](https://github.com/rodekruis/Typhoon-Impact-based-forecasting-model) | 18 | 2025-06-10 | GPL-3.0 | Jupyter | **archived** | Original Philippines typhoon housing-damage model |
| [rodekruis/IBF_TYPHOON_DATA_PIPELINE](https://github.com/rodekruis/IBF_TYPHOON_DATA_PIPELINE) | 1 | 2026-07-08 | GPL-3.0 | Python | no | Current typhoon data pipeline |
| [rodekruis/Typhoon_IBF_Rice_Damage_Model](https://github.com/rodekruis/Typhoon_IBF_Rice_Damage_Model) | 1 | 2026-05-20 | GPL-3.0 | Jupyter | no | Typhoon → rice damage (food-security impact) |
| [rodekruis/GLOFAS_ImpactFloodForecasting_PHL](https://github.com/rodekruis/GLOFAS_ImpactFloodForecasting_PHL) | 1 | 2026-05-25 | GPL-3.0 | — | no | Philippines GloFAS IBF using EVT and Pareto |
| [CLIMADA-project/climada_python](https://github.com/CLIMADA-project/climada_python) | 486 | 2026-10-29 | GPL-3.0 | Jupyter/Py | no | Hazard × exposure × vulnerability impact framework |
| [CLIMADA-project/climada_petals](https://github.com/CLIMADA-project/climada_petals) | 39 | 2026-10-29 | GPL-3.0 | Python | no | Extra hazards and applications for CLIMADA |
| [gem/oq-engine](https://github.com/gem/oq-engine) | 466 | 2026-10-29 | AGPL-3.0 | Python | no | Seismic hazard and risk (GMPEs, fragility) |
| [ec-jrc/lisflood-code](https://github.com/ec-jrc/lisflood-code) | 172 | 2026-10-28 | EUPL-1.2 | Python | no | Hydrological model behind GloFAS/EFAS |
| [ecmwf/thermofeel](https://github.com/ecmwf/thermofeel) | 100 | 2026-10-10 | Apache-2.0 | Python | no | UTCI, WBGT, heat index, MRT |
| [ecmwf/earthkit-data](https://github.com/ecmwf/earthkit-data) | 123 | 2026-10-28 | Apache-2.0 | Python | no | GRIB/NetCDF access (not stdlib) |
| [DSSAT/dssat-csm-os](https://github.com/DSSAT/dssat-csm-os) | 239 | 2026-10-03 | BSD-3 | Fortran | no | Crop model (food-production impact) |
| [tehoro/ibf](https://github.com/tehoro/ibf) | 12 | 2026-10-19 | Apache-2.0 | Python | no | Small generic "impact based forecasting" repo found by search; purpose not inspected |
| [icpac-igad/ea-ibf-climada](https://github.com/icpac-igad/ea-ibf-climada) | 0 | 2026-06-24 | none | Jupyter | no | East Africa IBF on CLIMADA (regional-centre example) |
| [NadiaAnnisaChasiavera/dengue-forecasting-indonesia](https://github.com/NadiaAnnisaChasiavera/dengue-forecasting-indonesia) | 1 | 2026-06-16 | MIT | Jupyter | no | Only Indonesia dengue-forecast repo found; student-scale |

- The 510 typhoon model uses wind speed, track and vulnerability per municipality to predict the share of houses destroyed. It is XGBoost trained on 39 Philippine typhoons (2006–2020) — [Anticipation Hub](https://www.anticipation-hub.org/news/impact-based-forecasting-for-typhoons-in-the-philippines)
- The NHESS 2024 extension uses two stages, first classifying whether damage exceeds 10% and then regressing. It treats the scarce, skewed training data with stratified sampling and validation — [NHESS 24, 309, 2024](https://nhess.copernicus.org/articles/24/309/2024/nhess-24-309-2024.pdf); [preprint egusphere-2023-2205](https://egusphere.copernicus.org/preprints/2023/egusphere-2023-2205/)
- A comparative study recommended the 510 DREF trigger model, partly because it had already been used operationally — [PreventionWeb node 67249](https://preventionweb.net/quick/67249)
- Searches were not run, or found nothing, for: `pyDGRS`, `rhealpix`, INFORM methodology code (no official JRC INFORM repo found), and any BNPB or BMKG official GitHub org. Searching "bnpb indonesia disaster" returned no repos.

### Inferences
- **Portability ranking for stdlib Python:**
  - (1) `thermofeel` formulas: pure arithmetic, Apache-2.0, so formulas and constants can be copied with attribution.
  - (2) OCHA-DAP trigger designs, i.e. return-period thresholds plus hit/miss/false-alarm tables: logic only. The code is mostly GPL or unlicensed, so re-implement rather than copy.
  - (3) The 510 two-stage damage model: Centurisk97 already has a hand-written GBDT (`model-sebaran`), so the design (binary "above 10% damage" classifier, then regression, stratified CV) transfers directly without code.
  - (4) CLIMADA impact functions (sigmoid or step vulnerability curves) are about 10 lines of maths each, but CLIMADA itself is GPL-3.0 and depends on numpy, xarray and geopandas, so it should run offline only.
  - (5) OpenQuake is AGPL-3.0. Centurisk97's GMPE+MMI module should keep citing papers rather than copying OQ code.
- Licence hygiene: anything GPL, AGPL or EUPL copied verbatim would impose copyleft on Centurisk97's repo. Repos with no licence (most `ds-*` and the IBF pipelines) grant no reuse rights at all. Read them for ideas only.
- The IBF-system portal (TypeScript, NestJS/Angular per its stack) is not portable to "vanilla JS, no build step". Its data model of admin-area × lead-time × trigger state × EAP actions is the part worth copying into D1.

### Gaps
- I did not inspect the 510 model's reported skill (exact hit rate or RMSE). The NHESS paper has it but was not opened.
- Contents of `tehoro/ibf` and `MeteoSwiss/impact-forecasting-warning` were not inspected.
- No official Indonesian government open-source IBF code was found on GitHub.

## 5. Lessons: how impact predictions are validated (EM-DAT, DesInventar, DIBI)

### Takeaway
Validation of impact-based forecasts is acknowledged as immature. The practice is to verify against several impact databases at once, at the finest admin level available, while accounting for reporting bias. For Indonesia, DIBI (BNPB) plays the role DesInventar plays elsewhere: subnational and low threshold. Combining DIBI with Centurisk97's own BNPB daily-report archive is the right verification target.

### Cited Findings
- A Uganda/Kenya study compared flood-impact records from five repositories, including DesInventar and EM-DAT, against gauge data. Impact data helps verification in data-scarce regions, but only where exposure and vulnerability make impacts get reported at all — [J. Flood Risk Mgmt via PreventionWeb](https://www.preventionweb.net/quick/77415); [DOAJ Mar 2025](https://doaj.org/article/df81ec52d9a641b88458700c74e3e1e0)
- Only DesInventar provides municipal-level impact data, while the other databases are country-level. EM-DAT's entry threshold drops small events that DesInventar records — [Univ. Reading paper](https://centaur.reading.ac.uk/111678/1/111678%20VoR.pdf)
- CRED itself lists EM-DAT's limitations: a limited number of sources, uneven reporting worldwide, and no fully accurate impact database — [EM-DAT known issues](https://doc.emdat.be/_print/docs/known-issues-and-limitations/)
- Mapping EM-DAT's national aggregates down to subnational scale "remains challenging" — [egusphere-2025-4891](https://egusphere.copernicus.org/preprints/2025/egusphere-2025-4891/egusphere-2025-4891-ATC2.pdf)
- Systematic methods to validate IBF "remain relatively under-explored". Open questions are how forecasted impacts align with observed damage and how skill varies by event — [Univ. Twente MSc topic](https://mscresearch.itc.utwente.nl/node/707)
- A single repository cannot cover a meteorological event, so several should be combined — [PreventionWeb: recording and cataloguing hazards and impacts](https://www.preventionweb.net/news/recording-and-cataloguing-hazards-and-their-impacts-balances-challenges-and-perspectives)
- 510 handled scarce and skewed damage labels with stratification, sampling and careful validation — [NHESS 2024](https://nhess.copernicus.org/articles/24/309/2024/nhess-24-309-2024.pdf)
- OCHA's Centre "validat[es] models and set[s] release thresholds" for CERF frameworks, and maintains SEAS5 skill analyses — [aa-toolbox docs](https://aa-toolbox.readthedocs.io/en/latest/introduction.html); [ds-seas5-skill](https://github.com/OCHA-DAP/ds-seas5-skill)

### Inferences
- For Centurisk97 this means a per-hazard trigger back-test against DIBI events at kab/kota level, reporting hits, misses, false alarms, lead time, and the activation rate per year. A trigger that fires every month is unfundable. This is the same "uji balik" pattern the repo already uses for karhutla and banjir, extended to an impact target.
- Each hazard page should state where impact labels are missing. Silence in DIBI is not proof that nothing happened, especially in remote Papua and Maluku.

### Gaps
- I did not find a published study that evaluates a specific AA trigger against EM-DAT, DesInventar or DIBI in Indonesia.
- I did not verify DIBI data access or format (API, CSV, coverage years) in this session.
- The 2025 trigger performance of the PMI flood EAP is unknown, since it has not activated so far.
