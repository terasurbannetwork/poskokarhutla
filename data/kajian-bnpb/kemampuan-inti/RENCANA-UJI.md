# RENCANA-UJI: Kemampuan Inti

Mengikuti `~/.claude/TEST.md`: lapisan uji ditentukan oleh letak logikanya.

| Logika | Uji | Tiket |
| --- | --- | --- |
| Fungsi murni Python (pembanding, sidik, selang, label mutu, lift, lonjakan, kerusakan) | `python3 -I <skrip> uji` dengan contoh hitung tangan dan kasus tepi; wajib ada kasus yang DITOLAK | KI-10, KI-11, KI-14, KI-16, KI-51, KI-52, KI-60 |
| Paritas Python-JS | `node --test tests/layar/ki_setara.test.mjs`, dengan kontrol negatif yang harus gagal | KI-15 |
| Penilai dan kanal Worker | `node --test tests/warga/ews.test.mjs`, `tests/warga/push.test.mjs`, `tests/lapor/peringatan.test.mjs` lewat handler sungguhan (Miniflare atau pola yang ada), bukan mock klien | KI-01, KI-02, KI-50 |
| Layar membaca gerbang | `node --test tests/layar/ki_gerbang.test.mjs`: berkas hilang, rusak, atau false semuanya berpil hipotesis | KI-12, KI-20 |
| Golden tidak mundur | karhutla `gerbang_model.json` dan `senyap` keluarannya sama, gunung api `sim_tanggap` 15/15 | KI-12, KI-40, KI-53 |
| Invarian fisik | `node --test tests/layar/ki_invarian.test.mjs` | KI-44 |
| Gerbang dokumen | `node --test tests/agen/gerbang-kemampuan.test.mjs`, `tests/agen/gerbang-lisensi-model.test.mjs` | KI-70, KI-17 |

Cara menulis asersi:

- Asersi menguji invarian, bukan potret data. "Tiap keluaran tanpa selang = false", bukan "udara punya 4 entri".
- Pesan gagal menyebut angkanya dan sebab teknisnya.

Perintah penutup tiap fase: `npm run uji:agen` dan `npm run uji` hijau, ditambah perintah bukti tiket fase itu.
