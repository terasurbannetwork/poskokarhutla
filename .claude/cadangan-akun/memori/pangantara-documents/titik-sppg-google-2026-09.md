---
name: titik-sppg-google-2026-09
description: "Geocoding + Places SPPG dari Mac mini; kunci di .env.local, sb_secret pernah lewat chat; PAGU HARIAN Places project MBG Peta cuma 100/hari dan itu penahan sebenarnya"
metadata: 
  node_type: memory
  type: project
  originSessionId: ff59add6-435c-4d46-854f-19728552fa1c
  modified: 2026-09-05T14:35:57.898Z
---

5 Sep 2026 pemilik menjalankan dua tahap perbaikan titik `sppg_bgn` lewat
`scripts/geocode-sppg.mjs` (alamat, 11.782 baris, ~$9) lalu `scripts/places-sppg.mjs`
(nama dapur, ~9.174 baris, Text Search Pro) memakai bonus $300 Google Cloud.
Project Google Cloud-nya "MBG Peta", key "Maps Platform API Key" dibatasi ke API Maps.

Mac mini pemilik adalah mesin BARU untuk repo ini: `node_modules` dan `.env.local`
sempat kosong; kini `.env.local` berisi GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY (format `sb_secret_`). Kunci `sb_secret_` itu pernah
ditempel ke chat, pemilik disarankan revoke sesudah selesai.

**Why:** dua skrip itu aman diulang (baris berlabel Google dilewati), tapi Places
API (New) kena 429 di 6 paralel; laju harus pelan. Titik lama 65 SPPG pernah di
luar Indonesia karena rata-rata koordinat sekolah salah ketik (bujur 497).
Malam 5 Sep 2026 juga: Radar → app jadi OTOMATIS lewat trigger DB (migrasi
20260906001000 & 20260906002000): institusi Radar mendarat ke `schools`
(Penerima Manfaat Order) dan menu harian Radar ke `recipes` + `menu_calendar`
per SPPG yang tertaut (`sppg_bgn.sppg_id`). Pemilik tidak mau tombol tarik.
Gizi Radar cuma per MENU per porsi → view `v_menu_gizi_radar`, bukan per resep.

6 Sep 2026 dini hari: launchd `com.pinka.mbg-geocode-bulanan` (tgl 2, 02:30) menjalankan
`geocode-sppg.mjs --sumber kdmp` & `--sumber sekolah`; penaut Radar→Dapodik
`radar_instansi_tautkan_sekolah(p_kode_prov)` WAJIB per provinsi ("11." dst),
se-Indonesia sekaligus kena statement_timeout PostgREST. Lewat MCP execute_sql
fungsi itu butuh `set_config('request.jwt.claim.role','service_role',true)`.
Routes API: `/api/rute/jarak` + pil 📏 di perakit surat jalan; butuh Routes API
di-Enable dan GOOGLE_MAPS_API_KEY di Vercel (belum, 6 Sep 2026).

**How to apply:** SPPG baru masuk → jalankan dua skrip itu lagi. Jangan naikkan
PARALEL di places-sppg. Hook luar repo `~/.claude/hooks/mbg-gerbang-luar-repo.mjs`
belum dicek terdaftar di Mac mini ini. Lihat [[cara-kerja-pinka]].

**6 Sep 2026 — pagu harian, bukan uang, yang menahan sapuan titik.** Project
Google Cloud `791236504784` ("MBG Peta") dipatok `SearchTextRequest per day =
100`, dan pagu itu habis sebelum sapuan pertama dijalankan. `places-sppg.mjs`
MENAMPILKANNYA sebagai `403 The caller does not have permission`, padahal badan
aslinya `429 RESOURCE_EXHAUSTED` — diagnosa hari itu mundur satu putaran karena
percaya pesan 403-nya. Curl langsung ke `places:searchText` yang membuktikannya.

Pagu melekat pada PROJECT, bukan pada tagihan, jadi akun Google KEDUA =
jatah harian kedua. `GOOGLE_MAPS_API_KEYS` (daftar dipisah koma) sudah dibaca
`scripts/titik/sapu-harian.mjs`, yang pindah ke kunci berikutnya hanya ketika
yang sekarang kehabisan. Pemilik menyebut akun `[email-disamarkan]`
untuk jatah kedua; kuncinya harus dibuat pemilik sendiri (agent tidak membuat
akun / kredensial), lalu ditempel ke `.env.local`.

**How to apply:** sebelum menuduh kunci atau izin, curl dulu. Sebelum menaikkan
`TITIK_SAPU_BATAS`, naikkan dulu pagunya di APIs & Services -> Places API (New)
-> Quotas; anggaran yang melebihi pagu cuma jadi panggilan yang ditolak.
Lihat juga [[mesin-24-jam-mac-mini]] dan 700 §9.10.

**6 Sep 2026 malam — project Google KEDUA dipakai, pagunya lega.** Akun
`Alfatehan Septianta` (Free Trial, kredit Rp5.323.050 ≈ $300 utuh, HANGUS
6 Des 2026), project `endless-anagram-487112-p8`. Places API (New) di-Enable,
API key dibatasi lewat "API restriction" (bukan Websites/IP: skripnya Node, dan
IP Mac mini dinamis). Diuji langsung ke `places:searchText` → 200, jadi pagu
100/hari yang melumpuhkan project lama TIDAK berlaku di sini.

`.env.local` sekarang: `GOOGLE_MAPS_API_KEYS=<baru>,<lama>` — yang BARU di
depan karena jatah project lama sudah habis hari itu, dan rotasi memakai kunci
pertama sampai kehabisan. `TITIK_SAPU_BATAS=400`.

**Why:** biaya sapuan = Place Details Pro saja ($17/1.000, gratis 5.000/bulan);
Text Search-nya `places.id` doang jadi Essentials ID-Only = $0. 9.923 baris =
$84 sampai $252 tergantung berapa yang butuh kandidat kedua. Kredit $300 nutup,
tapi hangus 6 Des jadi jangan dipelankan sampai lewat tanggal itu.

**How to apply:** key project baru ini PERNAH DITEMPEL KE CHAT (6 Sep 2026) —
regenerate di Credentials sesudah sapuan selesai. Pola yang sama dengan
`sb_secret` 5 Sep; pemilik memang cenderung menempel rahasia ke chat, jadi
mintalah "bilang udah masuk" alih-alih nilainya.
