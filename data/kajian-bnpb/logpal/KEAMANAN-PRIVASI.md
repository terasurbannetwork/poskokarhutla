# KEAMANAN-PRIVASI-LOGPAL

## Matriks hak
| Aksi | BPBD pemkab/pemkot | BPBD pemprov | Staf BNPB atau moderator | Lainnya |
| --- | --- | --- | --- | --- |
| Baca gudang | miliknya | semua di provinsi cakupan | semua | 403 atau 401 |
| Tulis gudang, barang, mutasi, opname | miliknya | miliknya | gudang BNPB saja | ditolak |
| Ajukan permintaan | ya | ya | ya | ditolak |
| Lihat permintaan | miliknya | miliknya | semua | ditolak |
| Proses tahap | tidak (403) | tidak (403) | ya | ditolak |
| Baca kebutuhan | tidak | tidak | ya | ditolak |
| Dummy | tidak | tidak | tidak | Super Admin |

Gudang di luar jangkauan baca dijawab 404; terbaca tetapi bukan miliknya 403.

## Kontrol
- Semua POST wajib `x-pb: 1` dan Origin sama-situs; `tolakOrigin` mencakup cookie `sesi_instansi`.
- Pemilik, provinsi, akun, dan pemohon diturunkan dari sesi, bukan dari kiriman.
- Validasi di server: tipe dan panjang tiap kolom, `jenis` harus string, tanggal sah, jumlah bilangan bulat; kolom teks diawali `=`, `+`, `-`, `@`, tab, CR ditolak. Ekspor CSV menetralkan awalan itu.
- Semua teks masukan (gudang, kab, barang, mutasi, opname, permintaan, tahap) lewat satu fungsi `ts` yang menolak awalan rumus.
- Teks pengguna digambar lewat `textContent`; unduhan HTML memakai `esc`.
- Tidak ada IP, nomor HP, atau identitas orang di tabel LogPal; kolom `oleh` berisi id akun atau staf.
- Data gudang asli tidak di repo. `impor.mjs` menolak masukan atau keluaran di dalam repo. SQL hasilnya berisi data asli: simpan di luar repo, jangan commit.
- Halaman dan data gudang wajib login (keputusan pemilik 9 Nov 2026). Data statis publik hanya wilayah (tanpa nama gudang dan jam), provinsi, peta provinsi. Titik gudang, usulan, rute, jangkauan, catatan, dan kebutuhan ada di D1 dan lewat API bersesi. Nama gudang asli tidak ada di `public/` dan `src/` (uji memeriksa).
- Secret tidak ada di berkas modul ini.
