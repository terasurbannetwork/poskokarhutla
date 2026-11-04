---
name: nama-resep-satu-masakan
description: "Vonis 23 Sep 2026 soal nama resep — satu masakan satu nama; label, bahan, dan lauk tidak boleh menempel di nama menu"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8e25c9e2-d1a5-4260-b3ec-b603a9ded38c
  modified: 2026-09-23T07:25:11.412Z
---

Pemilik menunjuk ±30 pasang nama resep kembar di /resep dalam satu sesi (23 Sep 2026) dan minta semuanya dipagari mesin, bukan dibereskan satu per satu.

Vonisnya:
- Kata golongan/rasa yang tidak mengubah masakan dibuang: "Buah Anggur" jadi Anggur, "Ikan Lele" jadi Lele, "Jeruk Manis" jadi Jeruk, "Telur Ayam Balado" jadi Telur Balado, "Telur Bulat" jadi Telur, "Saus" dan "Bumbu" tidak membedakan.
- Urutan kata, "&", dan Rica vs Rica-Rica tidak membedakan masakan.
- Label sasaran, porsi, alergi, gramasi, dan bulan-tahun bukan nama menu: (Balita, Tk), Extra Protein Bumil & Busui, (Porsi Besar), (Alergi), 32 Gr, September 2026.
- Pola "bahan, masakan" (Ayam Fillet/Boiler/Karkas, X) diambil masakannya. Pola "X, X Sambal Matah" diambil yang pendek.
- Di slot Karbo, nasi = nasinya saja ("Nasi Dendeng Balado" jadi Nasi Putih), lauknya pindah ke slot Lauk Hewani. Jenis nasi (Liwet, Kuning, Uduk) tetap.

**Why:** kembaran memecah analitik dan kalender, dan pemilik sudah capek menunjuknya berulang ("lu udah tau semua yang gw ga mau").

**How to apply:** pola baru masuk ke `resep_nama_baku` atau `resep_kunci` (migrasi 20260923140000), dengan uji di `tests/e2e/95-*.sql`. Jangan dibetulkan per baris. Diputus sore 23 Sep: nama yang cuma bahan mentah ("Kentang", "Mie", "Ayam") tidak boleh ada di slot mana pun kecuali buah/susu, dan cara masak balado/goreng/bakar/rebus/kukus/geprek/penyet/rica ditaruh di BELAKANG bahan ("Kentang Balado", bukan "Balado Kentang"); Tumis/Sop/Semur tetap di depan. Mesinnya gelombang lima (migrasi 20260923190000, uji tests/e2e/98-*.sql). Malamnya pemilik minta gerbang yang MENORMALKAN semua nama, bukan cuma menolak: gelombang enam (20260923200000) memasang resep_nama_normal(nama, komponen) di trigger recipes_a1_nama_normal + kamus ejaan satu-per-bahan (Kol, Timun, Sop, Pir, Strawberry). Standar lengkapnya di .claude/agents/resep-auditor.md bagian "Standar nama resep yang NORMAL". Nama hidangan asing (Chicken Katsu) sengaja tidak diterjemahkan.
Diputus malam 23 Sep: pola nama panjang [BAHAN] [CARA MASAK] [BUMBU]; "A, Bumbu X" = satu menu tapi dua masakan berbeda dibiarkan ("jangan dimasukin dulu"); Puding/Jelly/Agar-Agar di Buah SAH; sayur nempel di nama buah dipisah; alias bahan tidak boleh meruntuhkan nama resep (Edamame Rebus). Antrean /keputusan diselesaikan mesin (resep_nama_putus, migrasi 20260923220000) dan nav Keputusan DICABUT atas perintah pemilik; temuan nama baru = aturan mesin baru, bukan antrean tangan.
