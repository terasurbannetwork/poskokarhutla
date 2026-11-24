# RENCANA-UJI: Simulasi tsunami dengan genangan darat

Perintah hanya dijalankan setelah tiketnya dikerjakan; sampai itu berkasnya belum ada. Uji memakai berkas nyata di repo, dan fixture tulisan tangan untuk kasus tepi. Pembuktian layar di browser pada 1440 dan 390 px, tinjau di `http://localhost:8800/gempa/sim`. Aturan model mengikuti `docs/multi-bencana/PELATIHAN-MODEL.md`: uji dibuka sekali, pembanding sederhana, kesetaraan Python-JS, prospektif append-only.

## Perintah bukti

| Fitur | Perintah | Membuktikan |
| --- | --- | --- |
| F2 sampai F4 (sumber) | `python3 -I scripts/gempa/tsunami_sumber.py uji` | Okada pada kasus tulisan tangan (nilai rujukan dari makalah/sumber yang disebut di berkasnya) cocok; perpindahan nol jauh dari patahan; volume terangkat setara hitungan `Tsunami.rupture` dalam batas TS-04; `layak` Python sama dengan JS pada himpunan gempa tetap. |
| F9 (kesetaraan `layak`) | `python3 scripts/gempa/uji_js_tsunami.py` | invarian stepper tetap hijau; padanan Python identik dengan JS untuk `layak` termasuk syarat dalam kurang dari 100 km dan pembacaan `batimetri.bin` (urutan Int16, lon0, lat0, langkah, perilaku di luar grid). |
| F5 | `node --test tests/gempa/tsunami_genangan.test.mjs` (bagian run-up) | titik run-up memuat tahun, lokasi, tinggi, sumber, jenis amatan; jenis berbeda tidak dicampur dalam satu batang. |
| F7 | `node --test tests/gempa/tsunami_genangan.test.mjs` (bagian label) | label tingkat dan status ada di setiap tampilan dan berkas; "teruji" hanya muncul bila kelas sumber dan kotak diwakili kejadian uji kelas A dan tingkat A; kalimat batas di samping legenda ada; kelas "kurang dari 0,05 m" tertulis di legenda. |
| F10 | `node --test tests/gempa/tsunami_genangan.test.mjs` (bagian metode) | bab Metode genangan memuat bagian sumber, DEM, kekasaran, mesin, uji balik, batas kelas B, dan tidak memuat "akurat" atau "aman". |
| F12 | `python3 -I scripts/gempa/tsunami_ujibalik.py uji` (mode prospektif) | arsip hanya menambah baris; stasiun di luar domain hitung berstatus "tidak dinilai"; genangan darat tanpa run-up lapangan berstatus "tidak dinilai". |
| F6 | `python3 -I scripts/gempa/tsunami_runup.py uji` | penyaringan Indonesia dan kode validitas; kejadian yang disebut K1 (Banyuwangi 1994, Rajegwesi) terbaca bila ada di keluaran; atribusi tertulis; titik tanpa koordinat dibuang dengan hitungan. |
| F2, F3, F4 | `python3 -I scripts/gempa/tsunami_hitung.py uji` | uji tolok ukur sederhana (pantai bidang miring; gelombang soliter naik di lereng) mengembalikan run-up dalam toleransi yang ditulis di berkasnya; massa terjaga dalam batas; sel kering tetap kering tanpa gelombang; bentuk keluaran sesuai skema. |
| F8 | `python3 -I scripts/gempa/tsunami_pustaka.py uji` | pemilih menghasilkan skenario terdekat, "belum dihitung" bila jarak atau selisih M melebihi ambang; ambang dari berkas. |
| F11 | `python3 -I scripts/gempa/tsunami_ujibalik.py uji` | K dan kappa cocok contoh tulisan tangan; bagi nol menghasilkan null; kriteria terkunci sebelum uji dibuka (hash berkas kriteria dan versi mesin di berkas hasil; hitungan kejadian uji menolak jalan bila hash tidak cocok); kelas B dan kejadian pengembangan tidak ikut vonis; pasangan besaran per jenis titik (run-up lawan 2 Hr, tinggi pantai lawan Hr); selang bootstrap tidak dilaporkan bila n kejadian uji di bawah `n_min`; "teruji" mustahil tanpa `n_min` dan tanpa uji kepekaan tingkat B. |
| Layar | `node --test tests/gempa/tsunami_genangan.test.mjs` | indeks dan keluaran sesuai skema; setiap tampilan genangan punya label tingkat dan status; tidak ada kata "aman" atau "Pantau Bencana"; pantai di luar indeks tidak bernilai 0; `dem` hanya dari daftar izin. |
| Layar | `node --test tests/gempa/tsunami_okada.test.mjs` | pembaca JS (bila ada) cocok dengan Python pada kasus tetap. |
| Gerbang | `npm run uji:agen` | gerbang token warna, tanpa kesimpulan, dan kartu standar tetap hijau. |
| Pratinjau | browser 1440 dan 390 px, `http://localhost:8800/gempa/sim` | tidak ada galat konsol; geser waktu dan pilih pantai tidak membekukan layar (INP); legenda dan label terbaca; "belum dihitung" tampil untuk pantai di luar kotak. |

## Uji balik (sebelum label berubah dari hipotesis)

1. **Pembekuan kriteria.** Kelas kejadian (menurut sifat sumber dan ketersediaan data, dikunci di TS-14 setelah TS-03), pembagian pengembangan dan uji, jendela jarak W, metrik, pasangan besaran per jenis titik, aturan terbit (tepat satu), `n_min`, ambang K dan kappa, aturan pembuangan titik, versi mesin, dan hash masukan di-commit sebelum hitungan kejadian uji pertama. Hash berkas kriteria direkam di setiap berkas hasil.
2. **Pengembangan.** Penyetelan hanya pada kejadian pengembangan (bawaan Aceh 2004), hasilnya dilaporkan berlabel "disetel" dan tidak ikut vonis. Tiap penyetelan dicatat.
3. **Dibuka sekali.** Kejadian uji dihitung sekali dengan parameter terkunci. Hasil dicatat apa adanya, termasuk yang gagal. Penyetelan sesudahnya berarti kriteria baru dan hitungan prospektif.
4. **Pembanding.** Abe, dipasangkan per jenis titik (run-up lawan `hi` = 2 Hr, tinggi pantai lawan Hr). "Lebih baik" butuh selisih berpasangan d_i dengan selang bootstrap 95% (resampel per kejadian) yang tidak memotong nol.
5. **Kelas B.** Kejadian rupture lambat, longsor, dan non-gempa dijalankan dan dilaporkan di bab Batas dengan K, kappa, E, dan peta selisih; tidak menggugurkan vonis dan tidak dipakai menyatakan model lulus.
6. **Kepekaan.** DEM berbeda pada satu pantai; sumber seragam lawan heterogen; dan kepekaan tingkat B: skenario terdekat lawan hitungan langsung gempa buatan (selisih ln d_maks, luas, waktu tiba), dari mana ambang jarak dan selisih M diturunkan. Tanpa uji ini tingkat B tidak boleh berlabel "teruji".
7. **Selang kepercayaan.** Bootstrap per kejadian hanya dilaporkan bila kejadian uji paling sedikit `n_min`. Di bawahnya tidak ada selang, selisih per kejadian ditulis apa adanya (jackknife per kejadian boleh sebagai gambaran dan harus disebut bukan selang), dan label tetap hipotesis. Dengan kelas A yang kecil, hasil yang paling mungkin adalah "hipotesis, belum cukup kejadian uji"; itu ditulis terbuka.
8. **Prospektif.** Sesudah lulus, tiap simulasi nyata dibekukan dan dinilai (D10), hanya terhadap pembanding yang titiknya ada di dalam domain hitung; selain itu "tidak dinilai". Tidak ada klaim ketepatan sebelum jumlah kejadian prospektif yang ditetapkan di TS-23.
9. Hasil dicatat di berkas terpisah; tidak mengubah kriteria model lain di repo.
