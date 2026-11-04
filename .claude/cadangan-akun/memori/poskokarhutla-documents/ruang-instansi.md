---
name: ruang-instansi
description: "Program 21 Okt 2026, akun pemda/TNI/Polri + tugas api + laporan karhutla otomatis + konpers + OMC; daftar permintaan pemilik"
metadata:
  node_type: memory
  type: project
  originSessionId: c9552d10-e21e-4a3e-bba7-274c29b090f7
  modified: 2026-10-21T15:41:15.253Z
---

Program besar yang dimulai 21 Okt 2026 (sesi panjang, banyak pengerja). Permintaan pemilik, semua wajib:

1. Akun instansi dibuat di awal dengan sandi acak, lalu diklaim (verifikasi: NIP/NRP, surat tugas, kartu pegawai) dan disetujui admin. Jenis: pemprov, pemkab/pemkot, polda, polres, kodam (lintas provinsi, daftar 21 Kodam PERLU DICEK PEMILIK), kodim. Korem dilewati.
2. Tugas api per kompleks (dikunci ke lokasi, gabung ≤ 2 km). Konfirmasi foto GPS ≤ 6 jam, PIC lapangan wajib, kabar tiap 24 jam sampai padam, tagih lewat wa.me (tanpa kiriman otomatis).
3. Media multi-berkas foto dan video. Jumlah orang dihitung Workers AI (maksimum per foto, "minimal terlihat"). Waktu mulai dan padam "terdokumentasi" diambil dari waktu foto.
4. Rekomendasi cara padam per kompleks (scripts/data/taktik.py): cara utama atau pelengkap, regu, personel, pompa (kelas, HP, unit), air liter, BBM, genset, kedalaman bara (proksi persistensi + FRE Himawari sebagai pemeriksa kasar). Heli selalu pelengkap. Dry ice bukan pemadaman titik.
5. Kontak konsesi: instansi mengusulkan, admin menerima, lalu masuk kontak_pt.
6. Laporan karhutla otomatis: docs/laporan-karhutla/SOP.md. Form daerah (BPBD provinsi) dan pusat (udara, TMC, Koordalops). Kunci menghasilkan snapshot. Keluaran PPTX/PDF dan teks WA. Laporan belum lengkap = belum bisa diunduh.
7. Konpers harian: deck, naskah juru bicara + teleprompter, mode Matador (huruf besar, dipecah per halaman).
8. Pemantauan dampak OMC (NaCl: hujan; dry ice: PM2.5 dan jarak pandang) dengan pembanding kontrol dan pola diurnal. Jujur, bukan klaim sebab-akibat.
9. Inventaris peralatan per pihak dan gudang. Akun internal BNPB per orang dengan peran, plus Meja Pantau (antrean kerja harian: konsesi tanpa kontak atau belum dihubungi, tugas terlambat, laporan belum masuk).
11. (permintaan 21 Okt malam) Generator laporan harian Dit. Koordalops (teks WA + PDF) dari isian harian; deteksi metadata foto (jam, lat/lon) seperti modul foto publik; laporan korban meninggal (nama privat, butir Pantau prioritas); inventaris P3K (kedaluwarsa, stok); pop-up peta titik/kompleks saat akun daerah masuk; penugasan orang (driver/regu) dengan tautan pelacak GPS ala gemah-ripah/pangantara; verifikasi "apinya sudah padam belum"; rute ke jalan terdekat + km jalan kaki + alat yang dipikul; checklist persiapan sebelum berangkat.
10. Melapor semudah mungkin, ponsel dan desktop sama-sama dirancang. UI/UX sebaik mungkin, alur bisnis dan bug direvisi semua.

**Why:** pemilik adalah staf ahli BNPB ([[ruang-bnpb]]) dan ingin sistem ini dipakai harian oleh daerah dan pusat. Pemilik menuntut tanpa salah ([[kendali-mutu]]).
**How to apply:** sebelum menyatakan selesai, cocokkan dengan daftar ini. Migrasi D1 produksi tetap diterapkan pemilik.
