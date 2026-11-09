# RISET-LOGPAL: ringkasan tiga riset

Rincian ada di `riset/` (disalin dari berkas kerja sumber, isinya tidak diubah). Tanda [TERVERIFIKASI] dan [TIDAK KETEMU] di sana dipertahankan; jangan dikutip sebagai fakta bila bertanda tidak ketemu.

| Berkas | Isi | Dipakai di |
| --- | --- | --- |
| `riset/R1-audit-bmn-bmd.md` | syarat inventarisasi BMN dan BMD agar lolos BPK, BPKP, Inspektorat: PMK 181/2016, PMK 100/2025, Permendagri 47/2021, KMK 295/2019, daftar 10 uji auditor | tab Kesiapan audit, kolom aset dan persediaan, opname semester |
| `riset/R2-praktik-dunia.md` | WFP LESS, Logistics Cluster, UNHRD, AHA Centre, FEMA; 15 fitur usulan; KPI rantai pasok | usulan fitur lanjutan |
| `riset/R3-sistem-indonesia.md` | SIMAN, SAKTI, SIMDA, Renas PB 2025-2029, status Juklak 1/2024, 10 usulan | tab Standar, Jaringan logistik |

## Temuan yang mengubah desain

1. Opname persediaan dirancang semesteran (PMK 100/2025 Bab VI E), bukan tahunan. Uji "opname semester ini" di tab Kesiapan audit memakai awal semester Jakarta.
2. BMD memakai KIBAR (Permendagri 47/2021), bukan KIB A-F. Kolom format II.N.2 tidak ada di teks yang bisa diunduh; kolom ekspor DBKP atau KIBAR di LogPal adalah perkiraan, bukan format resmi.
3. Masa manfaat dan nilai buku memakai KMK 295/2019 dengan garis lurus; hasilnya perkiraan.
4. Juklak BNPB 1/2024 ada dan dipakai daerah, tetapi teks resminya tidak ketemu. Rumus di tab Standar mengikuti draf dan harus berlabel itu (lihat KEPUTUSAN Q4).
5. Tidak ada API resmi SIMAN, SAKTI, SIMDA. Penyambungan realistis lewat impor berkas, bukan mesin ke mesin; belum dibangun.
6. Sumber harga satuan terbuka tidak ada; kolom harga diisi pengguna.
