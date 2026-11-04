---
name: aturan-deck-26-okt-rinci
description: "Every deck instruction the owner gave on 26 Oct 2026 (Australia EN/ID, Presiden, Papua, mitigasi/banjir, armada), with output file locations"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 68b5896f-3aa5-474b-967d-6023d8fdb0a4
  modified: 2026-10-26T10:11:23.520Z
---

Full list of the owner's instructions from 26 Oct 2026, kept in detail at their request ("Gw mau semua masuk rincian lu").

**Australia meeting deck (EN and ID), `~/Documents/6. Belajar/Pinka/Pertemuan BNPB Australia 261026/`**
- Slide 7 uses the "Operasi Penanganan" slide from the Laporan Penanganan Pengendalian Karhutla, in its original layout.
  - EN: every text translated. C/W/S Kalimantan and S Sumatra labels shrunk to fit one line. "units" plural, but "1 unit". Script `assets/proyek-australia/spek/sisip_operasi_en.py` in ppt-konsultan bnpb.
  - ID: the original slide, untranslated.
- Slide 2 key messages use the same figures: 39 water-bombing helicopters, ±71,878 personnel, 18 OMC sorties.
- 1,135,000 litres per day stays (Bakom).
- English-only for the foreign audience. No Indonesian weakness. No speech lines. No "dashboard", no "today". "Casualties", not "deaths". Kementerian Sekretariat Negara. Firespot instead of hotspot.

**Paparan Kepala BNPB kepada Presiden, `~/Documents/Laporan-Harian-BNPB/mesin/out/`**
- No cover, no closing page.
- Final file "Paparan … 261026" has 3 pages:
  1. Peta hotspot 26 Okt
  2. Tabel penanganan per tanggal 26 Oktober (columns 24/25/26 Okt)
  3. Operasi penanganan per tanggal 25 Oktober, with the BNPB "Jam terbang" column (total 1,821 hours)
- The 4-page version with the rainy-season page is kept as "… 4 halaman.pptx". "Slide 4 Musim Hujan 261026.pptx" is the rainy-season page alone.
- Cut-off label "26 Okt 2026, 15.00 WIB", as the owner wanted.
  - Data really: FIRMS cache pulled 14.15 WIB, web firespot 08.05.
  - Gap: web firespot for Papua Selatan and NTT on 26 Okt was 0.
- Base = the owner's uploaded deck. Edit it in place and add pages in the same visual style.
- Armada page format = the "Armada Udara" panel of the Operasi slide: stacked bars, navy = patroli, orange = water bombing, "N unit" at the bar end.
  - The owner then asked to merge it into the Operasi slide.
  - Never show PIC names or phone numbers from the flight-hour recap.
- Earlier engine versions (Utama/Lengkap) were superseded. Their mitigation page was rejected as "sangat general".

**Rainy-season/mitigation page (when used)**
- Title "Musim hujan 2026/2027 menjadi fokus selanjutnya". Nothing longer.
- Floods only. No other hazards. Focus on handling and concrete rencana aksi with places and numbers.
- No "Musim 2025/2026" card group. No "Kepala BNPB" as actor. No 1,043,740 evacuee figure.
- Historical tables say "berdasarkan data historis".
- Current flood handling comes from the Koordalops WA: Solok, Tapanuli Tengah, Bone.

**Papua report, `~/Documents/Laporan-Harian-BNPB/mesin/out/Laporan Karhutla Pulau Papua 261026`**
- Paparan-wilayah format with no cover. Five pages:
  1. Ikhtisar Pulau Papua
  2. Papua Selatan map
  3. Papua Selatan trend
  4. Papua Barat (the next-highest Papua province)
  5. Rencana tindak lanjut 7 hari
- Built in ppt-konsultan `assets/proyek-papua`.

**General**
- Never write "Pantau Bencana" in any BNPB deck.
- Answer "berapa lama" with minutes.
- Send interim files.
- Do not re-pull satellite or weather when time is short.

**Why:** the owner was presenting to the President and to the Australian delegation that day. Each item above was a correction they made, often with frustration.
**How to apply:** check this list before touching any of these decks again. See also [[deck-urgen-kerjakan-di-berkas]], [[penanganan-generator-offline]], [[ppt-tabel-dan-cutoff]], [[ppt-audiens-asing]], [[laporan-harian-bnpb]].
