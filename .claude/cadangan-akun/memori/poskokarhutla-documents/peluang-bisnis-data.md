---
name: peluang-bisnis-data
description: "28 Oct 2026 catalog of business/government offers from Pantau Bencana data + Open Buildings; owner decisions; build all together later, not one by one"
metadata:
  node_type: memory
  type: project
  originSessionId: 7ada68e0-5614-4966-a1cb-d5105aefd652
  modified: 2026-10-27T18:23:48.228Z
---

Owner asked (28 Oct 2026) what business / government problems the satellite data + Google Open Buildings can solve. Owner instruction: **record everything first, recommend, then build ALL chosen items together later** — do not start building single items mid-discussion (I started a KRB generator agent and owner stopped it: "nanti dulu").

**Owner decisions on first 7 ideas:** 1 rumah terdampak 24 jam = run (already in session "Perhitungan luas banjir dan rumah terdampak", local_730c328b); 2 KRB kab/kota = gas; 3 PBB bangunan baru = no; 4 gakkum karhutla konsesi = gas; 5 EUDR = no; 6 asuransi/bank = no; 7 utilitas PLN/telco = no (later list re-offered PLN/telco under swasta, owner not yet answered).

**Swakelola facts (researched):** tipe III = ormas berbadan hukum (yayasan, perkumpulan, PTS); PT cannot. Tipe IV = kelompok masyarakat; tipe II = other agency/PTN. Syarat tipe III (ESDM 2025 example): badan hukum disahkan, wajib pajak valid, AD/ART, personel tetap ahli, pengalaman sejenis, kantor tetap. Real packets: ESDM Satgas Hilirisasi 7 kajian Rp600–900 jt (incl. "Social and Ecological Assessment Proyek Strategis" Rp900 jt); Dit. SMK Rp1 M. Competitors on KRB/renkon: ITS MKPI (Nganjuk, Mojokerto), UNS (renkon Karanganyar), UGM PSBA. Search packets in SiRUP filter swakelola. Basis: Perpres 46/2025, Perlem LKPP 3/2021.

**40 swakelola-type recommendations:** A pemda: 1 draf KRB, 2 renkon per bahaya, 3 RPB 5 thn, 4 jalur evakuasi desa, 5 prioritas Destana, 6 data IKD, 7 dasbor SPM bencana, 8 sitrep harian kab, 9 bimtek BPBD. B karhutla: 10 bukti gakkum per konsesi, 11 hitung kerugian lingkungan (Permen LH 7/2014), 12 prioritas sekat kanal gambut, 13 luas terbakar dNBR untuk SiPongi, 14 pemantauan MPA per desa, 15 audit sarpras karhutla perusahaan (Permen LHK 32/2016), 16 catatan api ISPO, 17 peringatan asap Dinkes/Disdik. C air: 18 prioritas pemeliharaan sungai/tanggul, 19 daya dukung air KLHS (neraca air), 20 sasaran droping air, 21 rob + bangunan pesisir, 22 abrasi RZWP3K, 23 sasaran klaim AUTP, 24 genangan kota/drainase. D ruang: 25 bangunan di sempadan, 26 bangunan KRB III gunung api, 27 sekolah/faskes zona bahaya, 28 lokasi aman 3 juta rumah, 29 lokasi huntara/huntap, 30 jalur logistik putus. E proyek: 31 penapisan sosial-ekologis PSN/hilirisasi, 32 penapisan tapak AMDAL, 33 risiko iklim proyek donor, 34 food estate api/banjir, 35 lokasi dapur MBG aman, 36 gudang Kopdes Merah Putih. F masyarakat: 37 pemantau warga /uji-pilot via Dana Desa, 38 latihan SPAB, 39 paket data kampus, 40 kemitraan PTN tipe II.
My top picks there: 1–3, 31, 10–11, 19.

**Non-swakelola (PT, not limited to APBN), 23 items:** korporat: sawit/HTI pemantauan konsesi, tambang/smelter nikel ESG, energi (PLN, panas bumi, Pertamina hulu), menara telco, logistik/ritel, developer due diligence, BUMN karya tapak, penerbangan asap/abu, pertanian prakiraan panen. Karbon: MRV api proyek REDD+/gambut, validator/pembeli kredit, BPDLH. Donor: anticipatory action triggers (WFP, FAO, IFRC/PMI, Start Network), UNICEF/Save the Children, Bank Dunia/ADB/JICA/GIZ/DFAT consultants, filantropi. Data: outlook api/asap for CPO traders, lisensi ke Verisk/Moody's RMS/Jupiter, media API, kursus GIS. Pemerintah non-swakelola: e-Katalog LKPP (PT lists SaaS, pemda buys direct), BUMN/BUMD (PTPN, Perhutani, PDAM, Pelindo), tender konsultan biasa.
My top 5: MRV api karbon, langganan konsesi sawit/HTI, anticipatory action triggers, e-Katalog, outlook trader CPO.

**Why:** owner is staf ahli BNPB ([[ruang-bnpb]]) — conflict of interest selling to BNPB/BPBD; advised separate yayasan/PT and Inspektorat check. Licenses: Open Buildings CC BY 4.0, WorldPop, Copernicus/ERA5, FIRMS OK commercial with attribution; InaRISK/BNPB derivatives — sell analysis, not raw.

**How to apply:** when owner returns to this topic, start from this list, ask which numbers to build, then plan and build them together. Existing assets to reuse: `scripts/bnpb/risiko.py` (risiko kecamatan), `scripts/umum/paparan_bangunan.py` + `data/terkunci/bangunan/` (Open Buildings grid only prov 13, 33, 63 so far), konsesi/KHG, neraca air Jawa, abrasi.
