---
name: menu-personalia-2026-09
description: "Pemilik minta menu Personalia (absensi, gaji) berdiri sendiri; Job Desc nanti pindah ke sana. Diucapkan 14 Sep 2026, belum dikerjakan."
metadata: 
  node_type: memory
  type: project
  originSessionId: f331f449-2bc5-4fc2-b495-d68f8a040554
  modified: 2026-09-14T07:10:15.313Z
---

14 Sep 2026 pemilik bertanya "mana menu Personalia? harusnya ada ya, terkait
absensi gaji", lalu menambahkan "Job Desc menunya nanti masukin ke personalia".
Kata "nanti" berarti belum diminta dikerjakan saat itu.

Keadaan saat vonis diucapkan: tidak ada menu bernama Personalia di mana pun.
Isinya tercecer di tiga tempat — Operasional › Keuangan memegang Absen Relawan,
Payroll Relawan, dan Honor Lepas; halaman `/absensi` (izin, shift, timesheet,
rekap presensi) punya pintu di AppNav tapi digerbangi `!isSuperAdmin`, sehingga
pemilik sendiri tak pernah melihatnya; Job Desc duduk sebagai tab pertama
Operasional.

**Why:** rumah sebuah menu ditentukan pekerjaan yang dijawabnya, dan absensi
plus payroll menjawab pertanyaan kepegawaian, bukan pertanyaan kas.

**How to apply:** saat menu Personalia dibuat, tarik ketiga sumber di atas ke
sana (termasuk mencabut gerbang `!isSuperAdmin` di pintu `/absensi`), dan
pindahkan Job Desc terakhir. Katalog tab wajib sinkron di dua tempat sekaligus,
`lib/nav-subtab.ts` dan halamannya, dijaga [[hemat-token-tanpa-turun-standar]]
lewat gerbang `tests/unit/gerbang-subtab.test.ts`.
