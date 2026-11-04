---
name: resep-lintas-komponen-2026-10
description: "Vonis 5 Okt 2026 pemilahan resep panen lintas komponen — pecah dua, Lalapan X, Susu UHT, tumis pepaya = sayur, jasuke tetap susu"
metadata:
  node_type: memory
  type: project
  originSessionId: cca12a6f-69dc-4c22-b3ec-9d0a0104980a
  modified: 2026-10-05T06:30:06.516Z
---

Vonis pemilik 5 Okt 2026 untuk resep hasil panen yang namanya memuat beberapa komponen:
- Sayur+buah (Kol Melon, Tumis Kol Wortel Jeruk, Wortel Pisang Susu UHT) DIPECAH per komponen; sisi sayur mengisi slot Sayur kalender (slot terisi tidak ditimpa, dicatat sebagai "tertahan"). Membalik migrasi 20261005210000/230000 yang membuang sisi sayur.
- Sisi sayur tanpa cara masak: "Lalapan X" (timun/kemangi/selada/tomat), lainnya "Tumis X". Susu polos jadi "Susu UHT".
- Tumis/Sayur/Acar + pepaya = pepaya muda = sayur, satu resep. Jagung Susu Keju (jasuke) tetap di slot Susu.
- Pisang Susu = buah; Kaki Naga = lauk hewani; Naga polos = Buah Naga; UHT = Susu UHT; Full Cream/Fullcream/Ff satu ejaan.

**Why:** pemilik melihat resep panen salah komponen di /resep dan minta mesin, bukan rapikan tangan.
**How to apply:** mesinnya `resep_lintas_*` (migrasi 20261005250000+), satu penyapu malam; kelas temuan `resep_nama_lintas_komponen`. Lihat [[nama-resep-satu-masakan]].
