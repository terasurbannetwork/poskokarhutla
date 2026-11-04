---
name: betutu-sambe-fondasi
description: "Keputusan pemilik 3 Okt 2026 untuk proyek Betutu Sambe (FnB ayam betutu) — disalin dari Gemah Ripah, WIB, Supabase Free, jalan sendiri sampai tayang"
metadata:
  node_type: memory
  type: project
  originSessionId: 586ee183-cd0e-4a12-9ba3-6b876e17bbce
  modified: 2026-10-03T04:38:34.407Z
---

Betutu Sambe = usaha FnB ayam betutu Bali (menu Sambe 1–5 + add-on), sistem dapur & penjualan.
Diputus pemilik 3 Okt 2026:
- Fondasi disalin dari Gemah Ripah (bukan pangantara), domain toko supplier dibuang, pola resep/BOM dari pangantara.
- Empat jalur jual: kasir outlet, ojol, link pesan WA bertoken, katering/frozen. Dapur pusat + beberapa outlet.
- Zona waktu WIB (Asia/Jakarta) — BUKAN WITA walau usahanya Bali.
- Supabase org Free (slot gratis), ref mzssrcsleuopqfkhrwgj, Tokyo.
- GitHub pangantara/betutu-sambe, Vercel tim pangantara.
- Merek merah logo + krem.
- Super Admin SATU-SATUNYA: [email-disamarkan] (Dewa Made Agung), dibuat 3 Okt 2026, sandi diset sendiri lewat Lupa sandi. Pande Andhi TIDAK ikut (beda dengan GR).
- WA otomatis (Fonnte) dan Anthropic TIDAK dipakai (3 Okt 2026): jangan minta tokennya. AI JALAN lewat Groq (GROQ_API_KEY) + Gemini (VISION_API_KEY/VISION_MODEL/VISION_BASE_URL), kunci yang sama dengan Gemah Ripah (disalin dari env Development Vercel GR ke .env.local BS; kuota gratis dipakai bersama dua app).
- Pemilik minta dikerjakan sendiri sampai tayang, lapor di akhir; Opus merencanakan, Sonnet/Haiku mengerjakan.
- Sumber data: ~/Downloads/Daftar Order Dapur Sambe (AKTIF).xlsx, ~/Downloads/Menu Betutu Sambe.pdf. HPP per komponen dari sheet ASUMSI DASHBOARD (file HPP Betutu Sambe.xlsx tidak ada).

**Why:** pemilik ingin mengulang kecepatan awal Gemah Ripah/pangantara dan menyempurnakannya.
**How to apply:** usulan di docs/usulan/betutu-sambe-v1/proposal.md; jangan tanya ulang hal di atas. Lihat [[armada-agent-proyek-baru]].

**Status 3 Okt 2026 malam:** v1 TAYANG di https://betutu-sambe.vercel.app (main 637195a). Semua modul spec §1–17 ada, 34 e2e + 44 gerbang hijau, impor xlsx cocok Rp 4.413.000. Belum: Buku Pegangan artifact + routine, hari produksi belum dibuka (pemilik), keputusan lunas/piutang data impor, HPP Matah In Jar, anti-enumerasi token link_* (kembalikan not-found sebagai data). Remote git = SSH (https OAuth ditolak karena workflow). Kit pangantara-kit (sesi "Gemah Ripah sistem awal", MacBook-Neo) menarik sisi jual BS sebagai tahap 3; resep di docs/RESEP-PROYEK-BARU.md.
