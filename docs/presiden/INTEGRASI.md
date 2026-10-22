# Integrasi panel karhutla ke dashboard Presiden

Untuk tim teknis dashboard Presiden. Bentuk data lengkap ada di `KONTRAK.md`.

## Pilihan tampil

| Cara | URL | Catatan |
| --- | --- | --- |
| Halaman penuh | `https://centurisk97.id/presiden` | Kartu dan tab Peta |
| Satu widget (iframe) | `https://centurisk97.id/presiden?w=<id>` | Latar transparan, tanpa kepala, selalu tema terang |
| Peta saja (iframe) | `https://centurisk97.id/presiden?w=peta&lapis=provinsi,kejadian` | `lapis` memilih lapisan yang menyala; satu lapisan provinsi saja |
| Data JSON | `https://centurisk97.id/data/presiden/semua.json` | Semua widget; per widget di `/data/presiden/<id>.json`, daftar di `indeks.json` |

Daftar `id` widget: `situasi`, `provinsi`, `kejadian`, `konsesi`, `gambut`, `cuaca`,
`asap`, `penerbangan`, `sumberdaya`, `dampak`, `luas`, `berulang`, `pencegahan`,
`peringatan`, `kesegaran`.

## Iframe

```html
<iframe src="https://centurisk97.id/presiden?w=situasi" title="Situasi karhutla"
        style="width:100%;border:0" loading="lazy"></iframe>
<script>
  addEventListener("message", e => {
    if (e.origin !== "https://centurisk97.id" || e.data?.presiden !== "tinggi") return;
    document.querySelector(`iframe[src$="w=${e.data.w}"]`).style.height = e.data.tinggi + "px";
  });
</script>
```

Halaman mengirim `{presiden: "tinggi", w, tinggi}` setiap tinggi isinya berubah.
Halaman boleh di-iframe dari domain mana pun dan feed JSON boleh diambil dari
domain mana pun (CORS `*`).

## Kesegaran

- Data dibangun ulang tiap 3 jam (menit 40 UTC). Feed di-cache 5 menit di tepi.
- Halaman mengambil ulang data tiap 10 menit dan saat tab kembali terlihat.
- Tiap widget membawa `per` (tanggal data) dan `status`. `basi` artinya sumbernya
  melewati batas jadwalnya; kartu basi tampil redup dengan pill "Data terakhir …".
- Umur panel dipantau di `https://centurisk97.id/api/status` (sumber `presiden`,
  batas 8 jam).

## Batas tafsir

- Titik panas bukan luas terbakar. Luas resmi hanya dari SiPongi.
- Angka konsesi adalah indikasi titik panas di dalam batas izin, bukan penetapan pelaku.
- Angka bertanda perkiraan berasal dari model dan dibulatkan.
- Feed tidak memuat data pribadi (nama pelapor, nomor telepon, regu, foto).
