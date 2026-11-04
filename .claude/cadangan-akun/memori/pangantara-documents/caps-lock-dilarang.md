---
name: caps-lock-dilarang
description: "Pemilik menolak teks KAPITAL penuh di layar maupun di kertas; sudah EMPAT kali divonis, terakhir 25 Sep 2026"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 95da6f0b-63ca-48fb-8a32-775e3b0e4120
  modified: 2026-09-25T14:08:34.962Z
---

Tidak boleh ada teks KAPITAL penuh yang sampai ke mata orang: nama orang, nama
lembaga, nama wilayah, kepala kelompok, baris total, peta label/opsi. Berlaku
untuk LAYAR dan untuk lembar cetak/ekspor.

Vonisnya sudah EMPAT kali, dan tiap kali karena perapiannya dipasang per
TEMPAT atau per KELAS SUMBER, bukan menutup seluruh kelasnya:
- 7 Sep 2026 — "KOTA PADANGSIDIMPUAN" di tabel wilayah (data impor).
- 8 Sep 2026 pagi — "YAYASAN SINERGI TIGA TUJUH DELAPAN" di hasil pencarian
  (data impor).
- 8 Sep 2026 sore — nama manajer di lembar cetak sebaran (data impor + kertas):
  "Bro kan udah gw bilang gw ga mau ada yang CAPS LOCK. Lu mikir lah. Catat.
  Jangan lupa lagi."
- **25 Sep 2026 — kelas BARU: peta label literal TULIS TANGAN.** Akarnya
  `app/(app)/akuntansi/CoaAturanTab.tsx` (`TIPE_LABEL: Record<string,string>`
  berisi `aset: 'ASET', kewajiban: 'KEWAJIBAN', ...`) — BUKAN data impor sama
  sekali, konstanta yang penulisnya sendiri ketik kapital, dirender ke kepala
  grup/opsi. "Ini anjing gw bilang gw ga mau ada yang caps lock gini. Jadikan
  aturan ya." Gerbang lama (di bawah) BUTA terhadap kelas ini: satu memindai
  kolom data impor, satu lagi memindai kelas CSS `uppercase`/`.toUpperCase()`
  di jalur ekspor — dua-duanya tidak pernah melihat konstanta literal.

**Why (kelas lama, data impor):** data impor (BGN, simkopdes, Dapodik) memang
KAPITAL penuh — 16 rb dari 17 rb baris `sppg_bgn.yayasan`, 500 rb dari 543 rb
`sekolah_nasional.sekolah` — jadi yang tampil apa adanya bukan pengecualian,
itu bentuk bawaannya.

**Why (kelas baru, 25 Sep 2026):** kebiasaan menulis Enum/`Record`/label
konstanta dalam BAHASA INGGRIS-style ALL CAPS (`ASET`, `TOTAL BELANJA`,
`LAYAK MASAK`) — bukan data dari luar, murni gaya menulis kode.

**How to apply (data impor):** `rapikanNamaOrang()` untuk nama orang (ia
membuang gelar), `rapikanJikaKapital()` / `rapikanNamaWilayah()` untuk
lembaga & wilayah, semua dari `lib/format.ts`. DISPLAY-ONLY: jangan rapikan
nilai yang dipakai mencocokkan ke DB.

**How to apply (peta label/JSX literal, kelas baru):** tulis Title Case
langsung di sumbernya ("Total Aset", bukan "TOTAL ASET" + `.toUpperCase()`).
Singkatan resmi (SPPG, KDMP, SHU, dst) tetap boleh kapital apa adanya. Jangan
pakai CSS `uppercase` untuk label baru.

Tiga gerbang, TIGA kelas berbeda, jangan dikira saling menggantikan:
- `tests/unit/gerbang-caps-lock.test.ts` — kolom DATA IMPOR yang dirender
  mentah (`.ts`/`.tsx`), kolom baru didaftarkan di `KOLOM_KAPITAL`.
- `tests/unit/gerbang-caps-layar.test.ts` — kelas CSS `uppercase` di layar +
  `.toUpperCase()` di jalur ekspor (`lib/export/**`, `lib/pdf/**`).
- `tests/unit/gerbang-caps-label.test.ts` (BARU, 25 Sep 2026) — peta literal
  `Record<string,string>`/prop JSX/teks di antara tag yang PENULISNYA sendiri
  ketik kapital, di seluruh `app/`, `components/`, `lib/`. Nol temuan (bukan
  ratchet); singkatan & berkas replika-dokumen-resmi (`lib/nutriform.ts`,
  kamus normalisasi wilayah) dikecualikan eksplisit, bukan per baris.

Vonis yang sama 25 Sep 2026 juga menutup **pil "Aktif"/"Nonaktif" bertulisan**
di kolom Status: "Pakai icon aja lah ceklist kek gausah dalam tulisan gitu
labelnya" — jadi ikon ✅/⛔ dengan `title`/`aria-label`, gerbangnya
`tests/unit/gerbang-pil-aktif.test.ts`. Kelas ini beririsan sama tapi BUKAN
soal kapital; catat terpisah kalau menelusuri masalah "label tampil sebagai
teks padahal maunya ikon".
