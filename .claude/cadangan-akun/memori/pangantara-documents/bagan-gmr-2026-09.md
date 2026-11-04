---
name: bagan-gmr-2026-09
description: "Vonis 26 Sep 2026 — organisasi Pangantara = 21 wilayah GMR; kursi, rasio, jabatan yang dicabut, akun uji tes123!!, Koordinasi Tim Wilayah"
metadata:
  node_type: memory
  type: project
  originSessionId: c570cae9-a164-4399-9a16-4491144d8ab5
  modified: 2026-09-26T14:23:55.545Z
---

Pemilik membentuk ulang organisasi 26 Sep 2026 (satu sesi panjang):

- Pusat: Super Admin (= CEO, kursi CEO dihapus), COO (tanpa Akuntansi), CFO (jalur uang saja), Chief HR & Legal (`chro`), Kepala IT & Data + 10 Tim IT (`kepala_it`/`tim_it`), Kepala Audit + 10 Tim Audit (`kepala_audit`/`tim_audit`). IT & Audit tidak dibagi teritori.
- 21 wilayah General Manager Regional (`gm_provinsi`, katalog `lib/wilayah-gmr.ts`), dibagi per provinsi ±1.100–1.700 SPPG; Jabar/Jateng/Jatim/Sumut dibelah per kab/kota; Papua & Maluku tidak dipegang dari luar pulau.
- Tiap GMR: Finance Manager, Operational Manager (`manager_humas`), Procurement Manager (+ mutu & keamanan pangan), HR Manager (`manager_hr`).
- Staf: Operational Staff (`tim_humas`, ±150 SPPG per kab/kota, kab ≥300 dibelah per kecamatan), Finance Staff (kembar OS), Procurement Team (1 per 2 OS), HR Staff (1 per 10 orang tim, tanpa lapangan/finance support).
- Lapangan: Tim Lapangan (`staf_lapangan`, 4 per OS, tanpa lihat harga) dan Finance Support (2 per FS); dapur dibagi lewat `kursi_regional_sppg` + `susun_regional()`.
- Dapur cukup 5 kursi (Ka SPPG, Chef SPPG, Pengawas Gizi, Pengawas Keuangan, Aslap). DICABUT & akun dihapus: PIC Kab/Kota, Koordinator KDMP, Pengawas Provinsi, Tim PIC Lapangan, Mitra, procurement tanpa kursi; arsip di skema `_arsip.akun_dicabut_20260926`.
- KDMP BUKAN supplier (jangan buat akun portal /mitra untuk kode KDMP-*; DB menolak). Baris `suppliers` cakupan='koperasi' masih dipakai jalur Barang Ops.
- 24 akun uji kursi (wilayah GMR Lampung + akun "Uji ..." dapur) + `sup002` bersandi `tes123!!` di PRODUKSI. Vonis pemilik 29 Sep 2026: akun uji itu DIBIARKAN aktif, jangan diusulkan dicabut lagi.
- Koordinasi: tab pertama "Tim Wilayah" (RPC `koordinasi_papan_wilayah`), usulan `docs/usulan/koordinasi-tim-wilayah/`.

**Why:** pemilik ingin tim tiap provinsi terkontrol lewat satu rantai GMR, bukan kursi lintas-lapis lama.
**How to apply:** kursi baru → tambah di `lib/formasi-provinsi.ts` + constraint jabatan + daftar jabatan di `get_my_sppg_ids`/`my_kdmp_scope`/`koordinasi_papan_wilayah` + SCOPE_OF/SEBUTAN_KE_DB (gerbang `gerbang-tim-provinsi`). Terkait [[hr-bagan-organisasi-2026-09]], [[kesiapan-provinsi-2026-09]].
