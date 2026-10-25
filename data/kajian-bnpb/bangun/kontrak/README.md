# kontrak

Dua kontrak yang dipakai semua komponen kajian BNPB, dengan pembaca dan validatornya.

| Berkas | Isi |
| --- | --- |
| `../../tema.json` | token desain (warna, skala, tipografi DOCX dan slide, margin A4, spasi, garis, header/footer, ikon, kosakata kode) |
| `../NASKAH-SPEK.md` | dialek Markdown naskah bab, dengan contoh lengkap |
| `../../data/angka.json` | registri token angka: kunci ke berkas, jalur JSON, keyakinan, sumber |
| `../../pustaka.json` | pustaka CSL-JSON untuk kutipan APA 7 |
| `tema.py` | `muat()`, `warna(t, 'navy')`, validator tema (CIEDE2000, kontras, rujukan token, hex terlarang, batas huruf, geometri) |
| `naskah.py` | `Konteks`, `baca()`, `nomori()`, format angka id-ID, kutipan APA 7, manifest injeksi |
| `lembar.py`, `pdf.mjs` | lembar bukti: token tema + contoh naskah ke HTML A4, lalu PDF lewat Chromium |

Semua stdlib Python dan Playwright yang sudah terpasang; tanpa venv.

## Cara membuat ulang dan memeriksa

```sh
cd data/kajian-bnpb/bangun/kontrak
python3 tema.py                      # validator tema + 7 fixture negatif
python3 naskah.py                    # uji diri: contoh NASKAH-SPEK.md, potongan, lampiran, 20 fixture negatif
python3 naskah.py ../../naskah/air/*.md   # periksa naskah sungguhan
python3 lembar.py keluaran/lembar.html && node pdf.mjs keluaran/lembar.html keluaran/lembar.pdf
pdftoppm -r 60 -png keluaran/lembar.pdf keluaran/lembar   # lalu baca tiap PNG
```

`keluaran/` diabaikan git. Menyetel tampilan: sunting `tema.json`, jalankan `python3 tema.py`.
Menambah angka: tambah entri di `data/angka.json`, panggil dengan `{{angka:<kunci>}}`.
