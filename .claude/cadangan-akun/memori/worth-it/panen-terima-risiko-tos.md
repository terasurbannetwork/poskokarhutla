---
name: panen-terima-risiko-tos
description: "Pemilik (11 Okt 2026) menerima risiko ToS untuk memanen portal yang ToS-nya melarang otomasi, target 1 juta data jual+sewa, fokus Jabodetabek"
metadata:
  node_type: memory
  type: project
  originSessionId: a84e43f4-27da-417b-bc58-51cb45fde27f
  modified: 2026-10-11T07:50:58.339Z
---

11 Okt 2026 pemilik memilih "Terima risiko ToS": bot server boleh memanen halaman publik yang DIBUKA robots.txt meski ToS situs melarang otomasi (Rumah123, Pinhome, Mamikos, OLX, dst.). Target pemilik: data terlengkap se-Indonesia, minimal 1 juta listing jual + sewa, Jabodetabek dulu, deskripsi lengkap, "akhir minggu" (17-18 Okt 2026).

**Why:** volume terbesar ada di portal yang ToS-nya melarang; pemilik sadar risiko hukumnya (sama seperti keputusan 4 Okt untuk Rumah123/OLX yang sempat dicabut audit 8 Okt).

**How to apply:** tetap TANPA mengakali dinding bot (Cloudflare/Incapsula/DataDome: berhenti, catat), hormati Disallow robots dan Crawl-delay, jeda per domain, UA WorthItBot jelas, berhenti di 403/429, buang nomor HP/email/WA dari deskripsi (UU PDP), foto hanya URL. Situs bertembok bot (99.co, Lamudi, Flokq) tetap extension/kemitraan. Login-only (IG, Shopee, FB) tetap extension (invarian 2). Keputusan ini per sumber dicatat di `sumber.tos_catatan`. Lihat [[satu-clone-di-developer]].
