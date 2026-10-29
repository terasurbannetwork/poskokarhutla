# Hemat token: semua cara yang berlaku di repo poskokarhutla

Disusun 29 Okt 2026 dari pengukuran di mesin pemilik dan dari bab "Hook, gerbang mekanis, dan anggaran token" buku MBG Bangka (`rujukan/mbg-bangka.md`). Bab "Hemat token" di `pantau-bencana.md` merangkum berkas ini; yang lengkap ada di sini.

Prinsipnya satu: **yang mahal bukan yang ditulis, melainkan yang dibaca ulang.** Tiap pesan di thread utama membayar ulang seluruh konteks yang sudah ada. Jadi yang dihemat pertama adalah apa yang masuk konteks dan berapa lama ia tinggal di sana.

## 1. Yang dibayar tiap sesi sebelum kerja dimulai (diukur 29 Okt 2026)

| Muatan | Ukuran | Kapan masuk | Tuas |
| --- | --- | --- | --- |
| Ringkasan sesi lalu dari hook SessionStart `cavemem` | 26,3 KB, sekitar 7 ribu token | tiap sesi baru | terbesar; `cavemem` tidak punya setelan batas, jadi pilihannya mencopot hooknya atau menerima ongkosnya. Memori berkas (`memory/`) sudah menyimpan hal yang sama |
| Daftar skill | 303 skill di `~/.claude/skills`, ratusan di antaranya skill pemasaran media sosial | tiap sesi, satu baris deskripsi per skill | pindahkan skill yang tidak dipakai di repo ini ke folder arsip di luar `~/.claude/skills` |
| Nama alat MCP tertunda | `rea` sekitar 190 alat, `browseros-neo`, `computer-use`, `claude-in-chrome`, Cloudflare | tiap sesi, nama alatnya saja | matikan server yang tidak dipakai repo ini lewat pengaturan konektor aplikasi |
| Plugin `superpowers` | satu skill penuh disuntik SessionStart, sekitar 1,5 ribu token | tiap sesi | copot bila alurnya tidak dipakai; ia juga mendorong pemanggilan skill tambahan |
| `AGENTS.md` lewat `@AGENTS.md` | 10,2 KB, sekitar 2,7 ribu token | tiap sesi | tetap, karena ia router; jaga di bawah 12 KB |
| `MEMORY.md` | 8 KB, 55 berkas memori | tiap sesi | satu baris per memori; gabung memori yang tumpang tindih (contoh: `tanpa-titik-pemisah` dan `tanpa-titik-tengah`) |
| `~/.claude/CLAUDE.md` + `RTK.md` | 4,1 KB | tiap sesi | sudah ramping: empat berkas aturan besar (`DUMMY.md`, `INP.md`, `TEST.md`, `FITUR.md`) sengaja tidak di-@import |
| Suntikan gaya `caveman` dan `ponytail` | sekitar 1,5 ribu token masing-masing, plus pelacak tiap prompt | tiap sesi | biarkan: keduanya memangkas keluaran jauh lebih banyak daripada ongkosnya |

## 2. Yang dibayar per giliran

| Cara | Kenapa | Cara pakai |
| --- | --- | --- |
| **rtk** | memangkas keluaran perintah shell sebelum masuk konteks | hook `rtk hook claude` di `~/.claude/settings.json`, rtk 1.1.0 di `/opt/homebrew/bin/rtk`. 29 Okt: 23 perintah, hemat 11,8%. Hemat besar ada di `git log`, `git diff`, `npm test`, log build. Cek `rtk gain`; bila nol, cek `which rtk` dulu |
| **Baca sebagian, bukan seluruh berkas** | buku ini 320 KB, sekitar 90 ribu token; `public/index.html` 841 KB | `grep -n '^## ' <berkas>` untuk peta bab, lalu `sed -n 'awal,akhirp'` atau Read dengan `offset`/`limit`. Jangan pernah `allow_large` untuk buku pegangan |
| **Batasi keluaran perintah** | log panjang dibayar ulang tiap pesan sesudahnya | `| head`, `| tail -20`, `--format` ringkas, `cut -c1-200` untuk baris panjang |
| **Gaya keluaran ringkas** | keluaran thread utama juga dibaca ulang | caveman penuh aktif; tanpa tabel hiasan, tanpa ringkasan berulang |
| **Effort** | tingkat pikir menentukan token pikir | `modelSettings` Opus 5.5 = medium; naikkan per sesi hanya untuk rancangan model risiko atau skema D1 berisiko |
| **Panggilan paralel** | satu putaran, bukan beberapa | baca berkas yang saling bebas dalam satu pesan |
| **Sesi baru untuk tugas baru** | konteks sesi lama ikut dibayar di tiap pesan tugas baru | median konteks per pesan di repo MBG 103.900 token di awal, 209.700 di akhir sesi |

## 3. Delegasi: Opus merencanakan, model murah mengerjakan

Keputusan pemilik 29 Okt 2026 (memori `hemat-token-model`): Haiku dulu bila pekerjaannya mencocokkan pola, menghitung, atau melapor terhadap aturan tertulis; Sonnet bila perlu membaca beberapa berkas dan membetulkan; Opus hanya sesi induk.

- **Tiap `.claude/agents/*.md` wajib `model:`**; generator menolak entri roster tanpa model. Gerbang `tests/agen/gerbang-model-agent.test.mjs`.
- **Agent bawaan** (`general-purpose`, `Explore`, `Plan`) tidak punya berkas, jadi diam-diam mewarisi Opus. Penutupnya `env.CLAUDE_CODE_SUBAGENT_MODEL = sonnet` di `.claude/settings.json` dan `~/.claude/settings.json`. Di MBG 88% dispatch sempat jalan di Opus sebelum ini ditutup.
- **Prompt agent menyebut BERKAS atau glob-nya, bukan domainnya.** Tingkat murah menurunkan tarif per token, bukan jumlah yang dibaca: dua agent Sonnet di MBG menghabiskan 271.532 token untuk hasil satu layar karena promptnya menyebut domain.
- **Kerja kecil tetap di induk.** Beberapa panggilan alat lebih murah dikerjakan sendiri daripada membayar brief dan konteks awal agent.
- **Jejak agent** (`node scripts/agents/ilmu.mjs cek`): jawaban `LEWATI` berarti berkas dan definisi agent tidak berubah sejak vonis terakhir, jadi review tidak diulang.
- **Pemeriksa membaca sinyal**, bukan ulang menelusuri: `npm run uji:agen` hijau, uji balik jalan.

## 4. Aturan yang dimesinkan berhenti memakan token

Pola tiga lapis dari MBG: (1) **penunjuk** di `CLAUDE.md` dan router `AGENTS.md`, beberapa baris saja; (2) **suntikan per kebutuhan** lewat hook saat jenis berkas tertentu disentuh; (3) **gerbang mekanis**, nol token. Tiap aturan yang jadi gerbang (`npm run uji:agen`) berhenti perlu diingat, dibaca, atau diingatkan. Itu sebabnya aturan baru dari pemilik diusahakan jadi gerbang lewat `penulis-gerbang`, bukan paragraf baru di `AGENTS.md`.

## 5. Untuk buku pegangan ini sendiri

- Jangan muat utuh. Peta babnya: `grep -n '^## ' docs/buku-pegangan/pantau-bencana.md`. Bab "Mulai dari sini" menunjuk bab mana untuk tugas apa.
- Bab Selera presentasi (PPT) sekitar sepertiga buku. Untuk kerja deck, sumber kerjanya skill `ppt-konsultan` (`keputusan-pemilik.md`); buku ini salinan bacaan manusia.
- Routine harian `pembaru-buku-pegangan-pb` berhenti tanpa menulis bila hari sepi, dan membaca `git log` sejak commit terakhir, bukan seluruh buku.
- Artifact merender Markdown di peramban, jadi sumbernya cukup satu berkas `.md`; HTML terbit dibangun ulang, tidak disunting.

## 6. Tuas yang butuh keputusan pemilik

Belum diterapkan karena mengubah pengaturan global di luar repo:

1. Copot hook SessionStart `cavemem` atau seluruh `cavemem` (hemat sekitar 7 ribu token tiap sesi).
2. Arsipkan skill yang tidak dipakai di repo ini (pemasaran, video, media sosial).
3. Matikan MCP `rea`, `hermes`, dan `browseros-neo` untuk proyek ini bila tidak dipakai.
4. Copot plugin `superpowers` bila alur brainstorming dan rencananya tidak dipakai.
5. Gabungkan memori kembar dan memori PPT yang sudah dipindah ke skill (`selera-ppt-final` sudah menunjuk ke sana).
