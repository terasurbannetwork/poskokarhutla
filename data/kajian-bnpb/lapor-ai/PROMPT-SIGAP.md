# Prompt render Sigap: 60 skenario untuk gerak halus

Pemilik, 26 Nov 2026: "buatkan 60 skenario prompt ... biar gerakannya smooth dan bagus dan sesuai sama konteks kebutuhan".

Render 3D Sigap adalah foto utuh, jadi gerak halus dibuat dari **urutan bingkai** (keyframe) yang
diputar bergantian dengan pudar 150 sampai 250 ms, ditambah gerak badan dari CSS (napas, melayang,
miring, lompat). Supaya bingkai tidak "meloncat", tiap bingkai harus identik dengan bingkai
sebelumnya kecuali bagian yang bergerak.

## Cara membuat

1. **Pakai gambar rujukan.** Unggah `public/lapor/sigap/lambai.webp` (atau pose dasar yang disebut
   di kolom Dasar) sebagai *character reference* / *image prompt*. Di ChatGPT: lampirkan gambar,
   tulis "same character, same style". Di Midjourney: `--cref <url gambar> --cw 100`, dan untuk bingkai
   lanjutan pakai gambar bingkai sebelumnya sebagai `--sref` juga.
2. **Tempel Prompt dasar**, lalu tambahkan kalimat skenario di belakangnya.
3. **Ukuran 1254 x 1254, latar transparan** (atau putih polos, nanti dibuang mesin).
4. **Kamera dan skala sama**: badan penuh, di tengah, ujung sepatu di garis yang sama
   (sekitar 3 persen dari bawah), ukuran badan sama di semua bingkai.
5. **Lingkaran di helm dibiarkan putih polos.** Lambang BNPB asli ditempel mesin
   (`sigap.py`); AI jangan disuruh menggambar lambang, hurufnya pasti rusak.
6. Simpan dengan **nama berkas di kolom Berkas** (huruf kecil, `.webp` atau `.png`), kumpulkan dalam
   satu folder, kirim ke Claude.

### Prompt dasar (tempel di depan tiap skenario)

```text
3D render of the same cute chibi Indonesian disaster-response rescuer mascot "Sigap" as the reference image: big round head, short black hair, glossy black bead eyes with one white highlight, pink cheeks, small nose, orange hard hat with a plain white round badge on the front (leave the badge blank, no text, no logo), orange reflective safety vest with two silver reflective stripes and chest pockets, navy long-sleeve shirt, navy cargo trousers with orange-silver reflective bands, dark navy boots, black backpack straps. Soft velvety clay-toy material, Pop Mart / Pixar toy style, soft studio lighting from upper left, gentle contact shadow under the feet, full body, centered, same scale and same camera angle as the reference, feet on the same baseline, transparent background, 1254x1254, no text, no watermark.
```

### Aturan isi

- Tanpa tulisan, angka, atau logo lain di gambar.
- Tidak ada senjata, darah, api, atau korban di gambar; kalau konteksnya duka, cukup wajah prihatin.
- Wajah tegang hanya untuk skenario darurat; skenario lain ramah.
- Tidak meniru maskot merek lain; karakter tetap Sigap.

## Daftar skenario

Kolom **Dasar** = gambar rujukan yang dilampirkan. Kolom **Prompt skenario** ditempel sesudah Prompt dasar.

### A. Melambai bergerak (sapaan pembuka, beranda) — diputar A1, A2, A3, A2, A4

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 1 | `a1-lambai-turun` | lambai | Identical to the reference, but the waving right hand is lowered to shoulder height, palm facing viewer, eyes happily closed, big open smile. |
| 2 | `a2-lambai-tengah` | lambai | Identical to the reference, right hand raised beside the head, palm facing viewer, fingers spread, eyes happily closed, big open smile. |
| 3 | `a3-lambai-kiri` | lambai | Identical to the reference, raised right hand tilted 20 degrees toward the head (mid-wave), eyes happily closed, big open smile. |
| 4 | `a4-lambai-kanan` | lambai | Identical to the reference, raised right hand tilted 20 degrees away from the head (mid-wave), eyes happily closed, big open smile. |

### B. Mata hidup (dipakai di semua pose berdiri) — kedip dan melirik

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 5 | `b1-diam-senyum` | tunjuk | Same character standing relaxed, both arms down, right hand holding the walkie-talkie at the hip, eyes open looking straight at viewer, gentle closed-mouth smile. This is the neutral idle frame. |
| 6 | `b2-kedip-setengah` | b1-diam-senyum | Identical to the reference, eyelids half closed, everything else unchanged. |
| 7 | `b3-kedip-tutup` | b1-diam-senyum | Identical to the reference, eyes fully closed as two soft curved lines, everything else unchanged. |
| 8 | `b4-lirik-kiri` | b1-diam-senyum | Identical to the reference, pupils looking to the viewer's left, head turned 5 degrees left. |
| 9 | `b5-lirik-kanan` | b1-diam-senyum | Identical to the reference, pupils looking to the viewer's right, head turned 5 degrees right. |
| 10 | `b6-lirik-atas` | b1-diam-senyum | Identical to the reference, pupils looking up, head tilted slightly up, curious expression. |
| 11 | `b7-lirik-bawah` | b1-diam-senyum | Identical to the reference, pupils looking down at the ground, small smile. |
| 12 | `b8-senyum-lebar` | b1-diam-senyum | Identical to the reference, big open happy smile showing a small tongue, eyes open and sparkling. |

### C. Bicara (gelembung Sigap, tur, panduan) — diputar C1, C2, C3, C2

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 13 | `c1-bicara-tutup` | b1-diam-senyum | Identical to the reference, left hand raised palm up at chest level as if explaining, mouth closed smiling. |
| 14 | `c2-bicara-a` | c1-bicara-tutup | Identical to the reference, mouth half open as if saying "a". |
| 15 | `c3-bicara-o` | c1-bicara-tutup | Identical to the reference, mouth small round "o" shape. |

### D. Lapor darurat (tombol darurat, langkah darurat)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 16 | `d1-ht-angkat` | ht | Identical to the reference, walkie-talkie being raised from chest toward the mouth, determined eyebrows, mouth closed. |
| 17 | `d2-ht-bicara` | ht | Identical to the reference, walkie-talkie at the mouth, mouth open speaking firmly, determined eyebrows. |
| 18 | `d3-ht-dengar` | ht | Identical to the reference, walkie-talkie held next to the ear, listening, eyes looking to the side, serious but calm. |
| 19 | `d4-tunjuk-tegas` | tunjuk | Identical to the reference but serious determined face, pointing firmly forward toward the viewer with the free hand, walkie-talkie in the other hand. |

### E. Lapor kejadian (isi laporan, kirim)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 20 | `e1-hp-ketik` | hp | Identical to the reference, both thumbs pressing the phone screen, eyes looking down at the phone, focused small smile. |
| 21 | `e2-hp-ketik-2` | e1-hp-ketik | Identical to the reference, thumbs in a slightly different position (typing motion), everything else unchanged. |
| 22 | `e3-hp-tunjukkan` | hp | Holding the phone up with both hands with the screen facing the viewer (blank glowing screen, no text), proud smile, eyes looking at viewer. |
| 23 | `e4-hp-kirim` | hp | Holding the phone in one hand, the other hand flicking a small white paper plane flying up out of the screen, happy expression. |

### F. Foto kejadian (langkah foto dari kamera)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 24 | `f1-foto-bidik` | hp | Holding the phone horizontally with both hands in front of the face like taking a photo, one eye squinting, concentrated. |
| 25 | `f2-foto-jepret` | f1-foto-bidik | Identical to the reference, a small soft white flash burst from the phone, slight smile. |
| 26 | `f3-foto-cek` | hp | Looking down at the phone screen checking the photo, satisfied smile, one thumb up from the free hand. |

### G. Lokasi kejadian (langkah titik lokasi)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 27 | `g1-pin-pegang` | tunjuk | Holding a big glossy red map location pin (no text) in one hand at chest height, smiling, other hand holding the walkie-talkie. |
| 28 | `g2-tunjuk-bawah` | tunjuk | Pointing down at the ground in front of the feet with the free hand, eyes following the finger, as if saying "right here". |

### H. Cek status laporan

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 29 | `h1-klip-baca` | hp | Holding a wooden clipboard with a blank white paper (no text) with both hands, reading it, focused. |
| 30 | `h2-klip-centang` | h1-klip-baca | Identical to the reference, holding a pen and drawing a big green check mark on the paper, happy. |
| 31 | `h3-jempol` | b1-diam-senyum | Giving a big thumbs up toward the viewer with the free hand, wink with one eye, big smile. |

### I. Edukasi siaga (cara melapor, panduan)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 32 | `i1-baca-halaman` | baca | Identical to the reference, turning a page of the open book with one hand, the page mid-air. |
| 33 | `i2-baca-ide` | baca | Identical to the reference sitting pose, one hand holding the open book, the other index finger raised up as if having an idea, eyes wide and bright, open smile. |
| 34 | `i3-buku-tunjukkan` | baca | Standing, holding the open book toward the viewer with both hands (blank pages, no text), smiling. |

### J. Peringatan dini

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 35 | `j1-lonceng-pegang` | tunjuk | Holding a small golden hand bell raised at shoulder height, attentive expression. |
| 36 | `j2-lonceng-bunyi` | j1-lonceng-pegang | Identical to the reference, bell tilted mid-swing with small yellow motion lines around it, mouth open calling out. |
| 37 | `j3-waspada-atas` | tunjuk | Pointing up toward the sky with the free hand, eyes looking up, alert but calm expression, small yellow exclamation spark lines next to the head (no text). |

### K. Lapor orang hilang (mencari)

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 38 | `k1-kaca-kiri` | pikir | Holding a big magnifying glass in front of one eye, leaning and looking to the viewer's left, searching. |
| 39 | `k2-kaca-kanan` | k1-kaca-kiri | Identical to the reference, leaning and looking to the viewer's right. |
| 40 | `k3-kaca-temu` | k1-kaca-kiri | Magnifying glass lowered, eyes wide, mouth open, pleased surprised expression as if he just found something. |

### L. Nomor penting dan telepon

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 41 | `l1-telepon` | hp | Holding the phone next to the ear, talking politely, small smile, other hand open at chest. |
| 42 | `l2-telepon-selesai` | l1-telepon | Phone lowered from the ear, friendly nod, eyes happily closed. |

### M. Pasang aplikasi

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 43 | `m1-hp-unduh` | hp | Holding the phone toward the viewer, a soft glowing downward arrow floating above the screen (no text), excited smile. |
| 44 | `m2-hp-pasang-jempol` | hp | Holding the phone in one hand at chest height, thumbs up with the other hand, big smile. |

### N. Pilih bahasa

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 45 | `n1-gelembung` | lambai | Two small blank speech bubbles (white and light blue, no text) floating next to the head, one hand raised friendly, smiling. |
| 46 | `n2-halo` | lambai | Both hands cupped beside the mouth as if calling "hello!", cheerful open mouth. |

### O. Keadaan laporan dan sistem

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 47 | `o1-terkirim-lompat` | lambai | Jumping in the air with both arms raised in celebration, feet off the ground, eyes happily closed, big smile, small yellow confetti sparks (no text). |
| 48 | `o2-mendarat` | lambai | Landing after the jump, knees slightly bent, arms half raised, big smile (in-between frame of the celebration). |
| 49 | `o3-tunggu-jam` | b1-diam-senyum | Looking at a wristwatch on the left wrist, patient waiting expression, small closed smile. |
| 50 | `o4-cari-sinyal` | hp | Holding the phone high above the head looking up at it, searching for signal, slightly worried but hopeful face. |
| 51 | `o5-maaf-garuk` | pikir | Scratching the side of the helmet with one hand, apologetic sheepish smile, eyebrows raised. |
| 52 | `o6-prihatin` | b1-diam-senyum | Soft concerned face, eyebrows tilted sad, one hand on the chest, gentle closed mouth, calm and empathetic (for condolence context). |
| 53 | `o7-terima-kasih` | b1-diam-senyum | Small respectful bow, both hands together in front of the chest, eyes closed, warm smile. |
| 54 | `o8-dua-jempol` | b1-diam-senyum | Two thumbs up toward the viewer, walkie-talkie clipped on the vest, big smile. |

### P. Tur dan penunjuk tata letak

| No | Berkas | Dasar | Prompt skenario |
| --- | --- | --- | --- |
| 55 | `p1-tunjuk-kiri` | tunjuk | Mirror the pointing gesture: pointing to the viewer's left with the free hand, eyes following the finger, smiling. |
| 56 | `p2-tunjuk-atas-kanan` | tunjuk | Pointing diagonally up to the viewer's right, eyes following the finger, smiling. |
| 57 | `p3-tunjuk-bawah-kanan` | tunjuk | Pointing diagonally down to the viewer's right, eyes following the finger, smiling. |
| 58 | `p4-intip` | b1-diam-senyum | Only the upper body peeking in from the right edge of the frame, one hand holding the edge, curious smile (body cut by the frame edge on purpose). |
| 59 | `p5-duduk-santai` | baca | Sitting cross-legged without a book, hands resting on the knees, relaxed friendly smile, looking at viewer. |
| 60 | `p6-tidur-siaga` | p5-duduk-santai | Same sitting pose, eyes closed dozing lightly, head tilted, small "z" shaped soft cloud puffs above the head (no letters), peaceful. For idle after a long time without activity. |

## Cara mesin memakainya (sesudah gambar dikirim)

| Konteks di `/lapor` | Urutan bingkai |
| --- | --- |
| Pembuka, beranda, gelembung | A1, A2, A3, A2, A4 (melambai), lalu B (kedip dan lirik acak) |
| Gelembung Sigap berbicara | C1, C2, C3, C2 selama teks tampil |
| Lapor darurat | D1, D2, D3 |
| Lapor kejadian | E1, E2 bergantian; E4 saat kirim |
| Langkah foto | F1, F2, F3 |
| Langkah lokasi | G1, G2 |
| Cek status | H1, H2, H3 |
| Edukasi | baca, I1, I2, I3 |
| Peringatan dini | J1, J2, J3 |
| Orang hilang | K1, K2 bergantian, K3 |
| Nomor penting | L1, L2 |
| Pasang aplikasi | M1, M2 |
| Pilih bahasa | N1, N2 |
| Laporan terkirim | O1, O2, H3 |
| Menunggu, tanpa sinyal, galat | O3, O4, O5 |
| Konteks duka | O6 saja, tanpa gilir dan tanpa lompat |
| Tur beranda | P1 sampai P4 sesuai arah sorotan |
| Diam lama | P5 lalu P6 |

Tiap gambar diproses `sigap.py`: lambang BNPB ditempel di helm, diperkecil ke 640 px WebP di bawah 120 KB.
Bingkai satu urutan dimuat lebih dulu supaya tidak berkedip saat berganti.
