# Standar website siap rilis + selera pemilik

Disusun 7 Okt 2026 dari: bedah Oyenza (kode, API, ±200 screenshot review), 6 situs pembanding
(Vantis, Lovable, Bolt, Pally, Littlebird, Vikey), 8 galeri desain, dan riset modul siap pakai.
Rujukan rinci: `~/.claude/referensi/oyenza-blueprint.md`, `~/.claude/referensi/oyenza-ui-live.md` (ukuran komponen terukur live), `~/.claude/referensi/situs-pembanding.md`.

Dibaca saat: membangun website/app baru, menambah landing, atau menilai "sudah siap rilis belum".

## 0. Mulai dari starter kit, bukan dari nol

Repo `~/Documents/GitHub/starter-kit` adalah implementasi standar ini yang sudah jalan (Next 16 +
Supabase + shadcn, tema G1–G9, rumah tunggal, kit INP, RLS, gerbang, uji SQL, armada
agent, landing/legal/blog/SEO, auth + shell app + admin, 11 modul plug). Proyek website/app baru:
klon repo itu, ikuti README-nya (brand di `lib/merek.ts`, paket di `lib/paket.ts`, gaya lewat
`NEXT_PUBLIC_GAYA`, modul lewat `NEXT_PUBLIC_MODUL_<ID>`), lalu bangun domainnya. Utang yang belum
diverifikasi tercatat di README starter kit; baca sebelum menjanjikan "siap rilis".

---

## 1. Selera pemilik (disimpulkan dari review & permintaan, koreksi kalau meleset)

- **Rujukan utama: Oyenza.** Monokrom ala iOS: putih + panel abu `#F5F5F7`, teks `#171717`, tombol pill
  hitam, tanpa border berat, angka besar dengan "Rp" kecil, ikon emoji dalam lingkaran warna lembut,
  SATU warna aksen (ungu untuk grafik), hijau/merah hanya untuk arah uang. Light + dark mode setara.
- **Detail dan konsistensi di atas segalanya.** Pemilik memeriksa tiap layar sampai angka: format
  angka/tanggal/jam yang beda, label beda nama, hitungan yang tidak cocok antar-layar — semuanya dianggap bug.
- **Angka harus benar dan bisa dicek.** Mockup dan data dummy dihitung, bukan dikarang.
- **Pasar Indonesia dulu.** Bahasa Indonesia kasual-santun ("kamu"), Rupiah format Indonesia, QRIS/e-wallet,
  bahasa gaul paham (goceng, ceban), EN sebagai opsi.
- **Premium tapi tenang.** Suka galeri premium (bento grid, motion halus 60fps, footer/CTA/404 yang dirancang),
  tapi animasi melayani makna, bukan hiasan. Hormati reduced-motion.
- **Jujur.** Klaim di landing tidak boleh lebih manis dari kebijakan privasi/kenyataan.
- **Siap rilis = lengkap.** Bukan demo: legal, empty state, error, 404, SEO, PWA, test. Tanpa data dummy (11 Nov 2026).

## 2. Checklist "siap rilis" (semua wajib sebelum bilang selesai)

**Fondasi (hari pertama, FITUR.md §0)**
- [ ] Token tema light/dark di satu tempat; `:focus-visible` (bukan `:focus`); kontras AA.
- [ ] SATU formatter: uang (Rp format Indonesia di semua bahasa), angka ringkas (rb/jt), tanggal, jam (satu: 24 jam untuk ID).
- [ ] SATU modul hitung untuk tiap pertanyaan bisnis (saldo, sisa, total) — semua layar memakainya.
- [ ] Katalog error code → kalimat manusiawi; endpoint `/health` + feature flag.
- [ ] Tidak ada tombol atau data dummy di layar (pemilik 11 Nov 2026).

**UI/UX**
- [ ] Tiap layar punya: loading (skeleton), empty state dengan SATU aksi berukuran normal, error state, offline state.
- [ ] Sheet/modal tingginya mengikuti isi; tanpa label section yang mengulang judul.
- [ ] Nama fitur/paket sama persis di landing, app, legal, email.
- [ ] Fitur yang tidak jalan di platform itu disembunyikan, bukan dinonaktifkan dengan catatan kecil.
- [ ] Destruktif: konfirmasi yang menyebut dampak (berapa data), tawarkan ekspor dulu.
- [ ] Tombol status ("Your plan") tidak terlihat seperti tombol aksi.
- [ ] Klik tidak membekukan layar (INP.md).
- [ ] Mobile 375px tanpa scroll horizontal; safe-area iOS; target sentuh ≥44px.

**Landing**
- [ ] Hero: janji satu kalimat + aksi pertama nyata (coba tanpa daftar) + mockup yang angkanya dihitung.
- [ ] Section: cara kerja → fitur (bento) → bukti/keamanan → harga → FAQ → CTA akhir → footer.
- [ ] Header sticky + `scroll-margin-top` di tiap anchor; CTA mengambang tidak menutupi konten.
- [ ] i18n ID/EN, OG image 1200×630, favicon set, JSON-LD (SoftwareApplication + FAQPage), sitemap, robots, `llms.txt`.
- [ ] Halaman 404 yang dirancang (rujukan 404s.design), halaman privasi & ketentuan dengan header/nav, satu bahasa per tampilan.

**Teknis**
- [ ] PWA: manifest, ikon maskable, service worker offline shell, Web Push (selalu tampilkan notifikasi tiap push).
- [ ] Auth: email + Google minimal, lupa password, tampilkan password; migrasi data lokal saat login dijelaskan.
- [ ] Analitik first-party dengan consent (Umami/PostHog), Sentry untuk error. Tanpa tumpukan piksel iklan.
- [ ] Backup DB otomatis + enkripsi at-rest SEBELUM pengguna pertama (pelajaran Oyenza).
- [ ] Uji integrasi untuk RLS/trigger/route (TEST.md); Lighthouse ≥90 di landing.
- [ ] Armada agent proyek (AGEN.md).

**Keamanan & operasi peluncuran (daftar 20 pemilik, 28 Okt 2026)**
- [ ] Semua kunci API hanya di secret server: tidak ada di frontend, tidak ada di git.
- [ ] Kunci apa pun yang pernah ter-commit diputar ulang (bukan sekadar dihapus dari tree).
- [ ] Batas laju per pengguna/IP di tiap rute yang memakan kuota atau tagihan.
- [ ] Autentikasi diperiksa di SETIAP rute server, bukan hanya disembunyikan di UI.
- [ ] Aturan database/akses: pengguna hanya bisa membaca dan mengubah datanya sendiri.
- [ ] Validasi setiap input di server (tipe, panjang, rentang, enum).
- [ ] Batas pengeluaran (hard cap) di dasbor tiap penyedia AI/API berbayar.
- [ ] Error ke klien tidak pernah membawa stack trace atau pesan internal.
- [ ] Pelacakan error (Sentry atau setara) yang memberi tahu sebelum pengguna mengeluh.
- [ ] Backup DB otomatis DAN uji pemulihan yang benar-benar dijalankan.
- [ ] Halaman 404 dan 500 yang dirancang.
- [ ] Jalan lancar di ponsel Android murah (CPU lambat, 3G).
- [ ] Tidak ada halaman yang butuh lebih dari 3 detik untuk tampil.
- [ ] Tag meta + gambar OG agar tautan bagus di X/WhatsApp.
- [ ] Kebijakan privasi + syarat ketentuan.
- [ ] Analitik corong: tahu di langkah mana orang berhenti.
- [ ] Uji ujung ke ujung: pendaftaran, pembayaran, reset kata sandi.
- [ ] Email tidak masuk spam: SPF, DKIM, DMARC di domain pengirim.
- [ ] Cara pengguna menghubungi pemilik (form/email/WA).
- [ ] Rencana rollback tertulis untuk hari peluncuran.

## 3. Stack default

| Lapisan | Pilihan | Catatan |
| ------- | ------- | ------- |
| Framework | Next.js (App Router) + TypeScript | landing SSR untuk SEO/GEO, app di route yang sama |
| UI | Tailwind v4 + shadcn/ui (Radix) | komponen dimiliki di repo, bukan dependency |
| Motion | Motion (framer-motion); GSAP untuk scroll scene berat; Lenis kalau perlu smooth scroll | |
| Ikon | Lucide (default shadcn) | emoji untuk kategori ala Oyenza |
| State lokal / offline | Zustand + persist; Dexie (IndexedDB) untuk data besar | local-first bila app pribadi |
| PWA | Serwist (`@serwist/next`) | direkomendasikan docs Next.js |
| Backend | Supabase: Postgres + Auth + RLS + Storage + Edge Functions | backup harian aktif |
| Form | react-hook-form + zod | |
| Data fetching | TanStack Query; nuqs untuk state di URL (periode, filter) | |
| Tabel | TanStack Table (+ blok tabel shadcn) | |
| Grafik | shadcn/ui Charts (Recharts) | satu palet seri |
| AI | Claude API (model terbaru): parse teks, vision struk/PDF, asisten streaming SSE | |
| Email | Resend + React Email | |
| Bayar (ID) | Midtrans (QRIS ±0,7%, GoPay, VA) atau Xendit (subscription + multi-negara) | Stripe untuk pasar global |
| Hosting | Vercel + Supabase; DNS/proteksi di Cloudflare | |
| Monitoring | Sentry + Umami/PostHog (consent) | |

## 4. Modul plug-and-play (ambil dulu, tulis sendiri belakangan)

| Kebutuhan | Sumber |
| --------- | ------ |
| Komponen dasar | shadcn/ui — ui.shadcn.com (button, dialog, sheet/drawer via Vaul, sonner toast, command/cmdk, calendar, chart) |
| Komponen lengkap (form, auth, pricing, tabel, empty state) | Origin UI (coss.com/origin) |
| Section landing siap pakai | Tailark, Shadcnblocks, shadcn.io blocks, 21st.dev |
| Animasi & efek (marquee, beam, bento, text effect) | Magic UI (gratis, 150+), Aceternity UI (premium), Motion Primitives, Cult UI, Skiper UI |
| Dashboard | shadcn dashboard blocks, Tremor |
| Prompt desain siap tempel ke AI builder | jiro.build (1.272+ template prompt, ada MCP) |

## 5. Galeri inspirasi per bagian (buka sebelum mendesain bagian itu)

| Bagian | Galeri | Yang dicari |
| ------ | ------ | ----------- |
| Navbar | navbar.gallery | static, dropdown, mega menu, sidebar, announcement bar |
| Section apa pun | unsection.com | 770 hero, 1.970 feature, 426 CTA, 378 footer, 154 pricing, 150 FAQ |
| Bento fitur | bentogrids.com | grid campuran ukuran, light/dark |
| CTA | cta.gallery | per tipe: button, form, modal, pricing, newsletter |
| Footer | footer.design | typographic besar, grid, cards, dark |
| 404 | 404s.design | filter fintech/SaaS, minimal, interaktif |
| Motion mikro | 60fps.design | 2.100 shot interaksi app (Revolut, CRED, Netflix, Duolingo) |
| Pola app mobile/web | mobbin.com | alur lengkap app nyata |

**Pemilik menyebut gaya (modern, minimal, premium, playful, gelap, dll)?** Buka `~/.claude/referensi/katalog-gaya.md`:
9 gaya (G1–G9) dengan token awal, contoh situs, dan tautan filter galeri yang sudah dicek. Default G1.

Cara pakai: ambil POLA (struktur, hierarki, ritme), jangan salin aset/teks.
Isi tiap galeri sudah dibedah (statistik 330 section unsection, struktur template fintech jiro,
pola footer/CTA/404/bento, daftar motion app keuangan 60fps): `~/.claude/referensi/galeri-desain.md`.

## 6. Pola yang terbukti (ringkas; rinciannya di blueprint)

- Input cepat multi-jalur (ketik/suara/foto/impor) → selalu berakhir di **draf yang ditinjau** → simpan; tiap impor bisa di-undo.
- "Log again" chip, default pintar (dompet favorit, kategori per jenis), shortcut keyboard `N`.
- Satu angka besar + pembanding ("hampir sama dengan bulan lalu") + sisa aman per hari.
- Budget bar dengan penanda posisi hari; proyeksi pace hanya untuk kategori harian.
- Sankey "ke mana uangmu", mode sembunyikan angka, fitur opsional yang bisa dimatikan.
- Local-first: app jalan tanpa akun; akun untuk sinkron + AI.
- Paywall: tab paket dengan ringkasan 3 angka + daftar fitur + harga mingguan/bulanan.
- Hero dengan aksi nyata tanpa daftar (Pally/Vikey), blok privasi sebagai fitur (Littlebird),
  persetujuan sebelum aksi otomatis, bahasa kasual + QRIS (Vikey).

## 7. Yang dilarang (pelajaran mahal)

Daftar lengkap di `oyenza-blueprint.md` §13. Lima teratas: format campur; dua rumus untuk angka yang
sama; kartu kredit dihitung aset; klaim landing melebihi kebijakan; dev toggle / teks internal di produksi.
