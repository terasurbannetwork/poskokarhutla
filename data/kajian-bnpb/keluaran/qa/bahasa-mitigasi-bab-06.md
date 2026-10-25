# Lapis (c) penyunting bahasa: mitigasi bab 6 (Bencana Geologi)

Berkas: `data/kajian-bnpb/naskah/mitigasi/bab-06.md`. Tanggal: 25 Oktober 2026.

## Vonis

- `qa/slop.py --final`: **LOLOS, skor 0** (4.250 kata, kata kosong 0,0 per 1.000), nol temuan di semua tingkat. Sebelum sunting juga LOLOS skor 0 (4.227 kata).
- Keutuhan: 324 token `{{angka:...}}`, 76 kutipan `[@...]`, dan 20 rujukan silang sama persis dengan versi sebelum sunting. Jumlah baris tetap 508. Tanpa em dash dan tanpa " · ".

## Suntingan

| Jenis | Lokasi | Perubahan |
| --- | --- | --- |
| Istilah terlarang glosarium (D-10) | §Bahaya dan Status Resmi | "rencana kontingensi" menjadi "rencana kontinjensi" (Perban 2/2023) |
| Singkatan dieja pada kemunculan pertama di prosa (L66, T-9) | §Bahaya dan Status Resmi, §Tuas Penekan Korban | BNPB dieja pada kemunculan pertamanya di prosa ("Peraturan Badan Nasional Penanggulangan Bencana (BNPB) Nomor 2 Tahun 2023"); Rekompak dieja (di luar glosarium, sebelumnya tanpa kepanjangan) |
| Pengulangan penghubung "karena itu" (lima kali) | pembuka bab, §Skenario Platform (dua), §Gunung Api, §Majemuk | diganti "Karena itu," di depan kalimat, "Akibatnya,", "Oleh sebab itu,", atau kalimat dipecah; tumpukan "karena itu ... sehingga" pada pita korban dibuang |
| Kalimat tanpa predikat | §Bahaya dan Status Resmi, §Skenario Platform | "Ketiganya turunan penyusun, di atas ambang" dan "lantai itu kejadian dari sumber lain" diberi "merupakan"/"berada" |
| Pengulangan kata dalam kalimat | §Sesar Darat | "Penilaian awal itu menilai" menjadi "Dokumen itu menilai" |
| Kalimat kabur | §Sesar Darat, §Gunung Api | sisipan "menurut penilaian kajian, yang belum diuji" menjadi "kajian ini menilai, tanpa pengujian, bahwa"; "memperkirakan prakiraan" diberi "bahwa" |
| Diksi | ringkasan bab | "tidak menaruh" menjadi "tidak menempatkan" |
| Tiga-serangkai (S-18) yang muncul akibat ejaan Rekompak | §Tuas Penekan Korban | deret tiga program berbukti lemah ditulis sebagai jumlah dengan rujukan @tbl:program-geologi; nama ketiganya tetap di tabel |

## Yang diperiksa dan dibiarkan

- L16: semua paragraf temuan dibuka kalimat tebal berangka. Paragraf R3P Cianjur (desa dikosongkan) pendek tetapi satu gagasan dan berangka.
- M-1: pasif yang tersisa ("dikalibrasi", "ditulis berdampingan") pelakunya penyusun dan jelas dari konteks metode; tidak ada pasif yang menyembunyikan lembaga.
- M-10 "X, bukan Y": tiap kontras berlandaskan data atau definisi (sesar darat/intraslab bukan megathrust, keluaran model bukan *run-up* terukur, paparan bukan genangan, nilai aset bukan kerugian kejadian).
- Label kekuatan bukti: tidak ada program yang disebut "terbukti"; Destana, SPAB, InaTEWS ditulis belum terbukti atau dampak belum dievaluasi; tiga program rehabilitasi berbukti lemah.
- Singkatan di metadata kartu (BPBD, Kementerian ESDM, Kemenko PMK) tampil sebagai chip lembaga atau sumber tabel, bukan prosa; tidak diubah. "DI" pada "DI Yogyakarta" adalah Daerah Istimewa (periksa=false di glosarium). "Perban BNPB 2/2023" di tabel kesenjangan adalah bentuk rujukan peraturan (periksa=false).
- "tidak ditemukan" berhuruf kecil bukan tag riset (D-10 hanya menolak `[TIDAK DITEMUKAN]` berkurung siku).

## Di luar lapis ini

- T-9 dan T-10 (`qa/periksa.py`) membaca DOCX; belum dijalankan karena DOCX bab ini belum dibangun ulang.
