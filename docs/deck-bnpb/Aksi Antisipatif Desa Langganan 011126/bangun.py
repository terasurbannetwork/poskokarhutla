# CARA BANGUN ULANG: siapkan folder akar (AKAR di bawah, bawaan: folder "akar" di sebelah berkas ini) dengan menyalin
# tema.json, pustaka.json, logo/, geo/, naskah/, peta/ dan data/glosarium.json dari
# ~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-kampus (data/angka.json awal: {"angka": {}}; buat folder spek/ dan out/).
# Lalu: python3 bangun.py && ~/.claude/skills/ppt-konsultan/bnpb/.venv/bin/python ~/.claude/skills/ppt-konsultan/bnpb/scripts/deck.py akar/spek/aksi-011126.json "akar/out/Aksi Antisipatif Desa Langganan 011126.pptx" --akar akar --pdf
#!/usr/bin/env python3
"""Aksi Antisipatif Desa Langganan: usulan kerja sama (BNPB ke mitra), 1 Nov 2026.
Angka dari docs/analisis/INSIGHT-LINTAS-DATA-2026-11.md dan docs/kolaborasi/*.md (hanya butir [V]).
Jalankan: python3 bangun_aksi.py (menulis ke akar), lalu deck.py spek/aksi-011126.json --akar akar --pdf
"""
import csv
import json
from pathlib import Path

AKAR = Path(__file__).resolve().parent / 'akar'
ANGKA, PUSTAKA = {}, {}
BNPB = {'literal': 'Badan Nasional Penanggulangan Bencana', 'singkatan': 'BNPB'}


def pus(pid, penulis, judul, tgl, url=None):
    PUSTAKA[pid] = {'id': pid, 'type': 'webpage' if url else 'report', 'author': [{'literal': penulis}], 'issued': {'date-parts': [tgl]},
                    'title': judul, 'verifikasi': 'sekunder' if url else 'primer', **({'URL': url} if url else {})}


pus('aksi-log', 'Badan Nasional Penanggulangan Bencana', 'Logbook harian Pusdalops BNPB 2011–2026 (56.685 kejadian), diolah penyusun', [2026, 11, 1])
pus('aksi-insight', 'Badan Nasional Penanggulangan Bencana', 'Insight lintas data: logbook Pusdalops disilangkan dengan hotspot FIRMS, InaRISK, DIBI, SK status darurat, dan korpus riset direktori', [2026, 11, 1])
pus('aksi-rancangan', 'Badan Nasional Penanggulangan Bencana', 'Rancangan aksi antisipatif desa langganan: strategi tiga lapis dan pilot longsor Jawa Tengah (draf penyusun)', [2026, 11, 1])
pus('aksi-peta', 'Badan Nasional Penanggulangan Bencana', 'Peta kolaborasi dan permintaan data aksi antisipatif desa langganan (butir terverifikasi saja)', [2026, 11, 1])
pus('aksi-komdigi', 'detikFinance', 'Komdigi ungkap 2.121 desa blank spot belum teraliri internet', [2025, 12, 10],
    'https://finance.detik.com/berita-ekonomi-bisnis/d-8252690/duh-komdigi-ungkap-2-121-desa-blankspot-belum-teraliri-internet')
pus('aksi-bts', 'Bisnis.com', '8 hari pascabanjir Aceh dan Sumatra, Komdigi: 60,7% BTS di Aceh masih padam', [2025, 12, 9],
    'https://teknologi.bisnis.com/read/20251209/101/1935349/8-hari-pascabanjir-aceh-sumatra-komdigi-607-bts-di-aceh-masih-padam')
pus('aksi-eap', 'IFRC dan Palang Merah Indonesia', 'Indonesia floods Early Action Protocol annual report, EAP2024ID01, MDRID027', [2026, 3, 31],
    'https://reliefweb.int/report/indonesia/indonesia-floods-early-action-protocol-annual-report-31-march-2026-eap-no-eap2024id01-operation-no-mdrid027')
pus('aksi-bmkg', 'Badan Meteorologi, Klimatologi, dan Geofisika', 'Prakiraan cuaca terbuka per desa, data.bmkg.go.id', [2026, 11, 1], 'https://data.bmkg.go.id/prakiraan-cuaca/')
pus('aksi-pfb', 'Bisnis.com', 'Pemerintah bentuk dana abadi penanggulangan bencana, tersedia Rp7,4 triliun', [2023, 3, 2],
    'https://ekonomi.bisnis.com/read/20230302/9/1633394/pemerintah-bentuk-dana-abadi-penanggulangan-bencana-tersedia-rp74-triliun')
pus('aksi-ugm', 'Universitas Gadjah Mada', 'UGM dan BNPB bekerja sama memitigasi longsor (GAMA-EWS)', [2026, 11, 1], 'https://ugm.ac.id/en/news/10222-ugm-bnpb-cooperate-to-mitigate-landslides/')

S_LOG = 'Logbook Pusdalops BNPB 2011–2026'
S_INS = 'Insight lintas data BNPB, 1 Nov 2026'
S_RAN = 'Rancangan aksi antisipatif, 1 Nov 2026'
S_PETA = 'Peta kolaborasi BNPB, 1 Nov 2026'


def a(kunci, nilai, satuan, pid, sumber, keyakinan='terverifikasi', catatan=None):
    ANGKA[kunci] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pid, 'sumber': sumber, 'keyakinan': keyakinan, **({'catatan': catatan} if catatan else {})}


def t(kunci, opsi=''):
    return '{{angka:%s%s}}' % (kunci, opsi)


def tulis(nama, kepala, baris):
    (AKAR / 'data/aksi').mkdir(parents=True, exist_ok=True)
    with (AKAR / 'data/aksi' / f'{nama}.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/aksi/{nama}.csv'


# ---------------- angka ----------------
a('log.kejadian', 56685, 'kejadian', 'aksi-log', S_LOG, 'resmi')
a('log.th0', 2011, '', 'aksi-log', S_LOG, 'resmi')
a('lang.banjir', 78, 'kab/kota', 'aksi-insight', S_INS, catatan='9 dari 9 tahun dasar: 2014–2020, 2024, 2025')
a('lang.longsor', 49, 'kab/kota', 'aksi-insight', S_INS, catatan='9 dari 9 tahun dasar: 2014–2020, 2024, 2025')
a('dasar.hari', 25, 'hari', 'aksi-insight', S_INS)
a('lang.cuaca', 62, 'kab/kota', 'aksi-insight', S_INS, catatan='9 dari 9 tahun dasar: 2014–2020, 2024, 2025')
a('lang.tahun', 9, 'tahun', 'aksi-insight', S_INS, catatan='9 dari 9 tahun dasar: 2014–2020, 2024, 2025')
a('lama.banjir', 85, 'kab/kota', 'aksi-insight', S_INS, catatan='basis lama 2014–2020 (7 dari 7 tahun); celah riset belum dihitung ulang')
a('lama.longsor', 52, 'kab/kota', 'aksi-insight', S_INS, catatan='basis lama 2014–2020 (7 dari 7 tahun); celah riset belum dihitung ulang')
a('ets', 0.011, '', 'aksi-insight', S_INS, catatan='ETS gabungan empat tahun uji 2022–2025, banjir dari hujan, selang 0,008–0,014')
a('alarm.per', 100, 'alarm', 'aksi-insight', S_INS)
a('alarm.salah', 98, 'dari 100 alarm', 'aksi-insight', S_INS)
a('auc.longsor', 0.65, '', 'aksi-insight', S_INS, catatan='skor longsor hujan 3 hari x bahaya, 2022–2025')
a('lift.baru', 1.95, '', 'aksi-insight', S_INS, catatan='titik api vs laporan karhutla 2023–2025; 2,23 untuk 2014–2022')
a('log.2025', 5906, 'kejadian', 'aksi-log', S_LOG, 'resmi')
a('dibi.banjir25', 2991, 'kejadian', 'aksi-insight', S_INS)
a('dibi.cuaca25', 2432, 'kejadian', 'aksi-insight', S_INS)
a('dibi.longsor25', 1171, 'kejadian', 'aksi-insight', S_INS)
a('jawa.lapor.min', 1, '%', 'aksi-insight', S_INS)
a('jawa.lapor.max', 5, '%', 'aksi-insight', S_INS)
a('papua.min', 0.3, 'kejadian per kab per tahun', 'aksi-insight', S_INS)
a('papua.max', 1, 'kejadian per kab per tahun', 'aksi-insight', S_INS)
a('median.lapor', 1, 'laporan', 'aksi-insight', S_INS)
a('kor.banjir', 0.08, '', 'aksi-insight', S_INS)
a('kor.longsor', 0.10, '', 'aksi-insight', S_INS)
a('kor.karhutla', 0.09, '', 'aksi-insight', S_INS)
a('kor.gempa', 0.48, '', 'aksi-insight', S_INS)
a('longsor.200', 200, 'longsor', 'aksi-insight', S_INS, catatan='sekitar 200-an longsor tercatat di Bogor, Magelang, Cilacap, Kota Semarang')
a('k.akses', 2000, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.logistik', 1377, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.sinyal', 963, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.air', 1479, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.personel', 927, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.alat', 495, 'entri', 'aksi-log', S_LOG, 'resmi')
a('k.gambut', 363, 'entri', 'aksi-log', S_LOG, 'resmi')
a('desa.isolir', 2151, 'desa', 'aksi-insight', S_INS)
a('musim.maluku', 56, '%', 'aksi-insight', S_INS)
a('musim.malut', 46, '%', 'aksi-insight', S_INS)
a('musim.sultra', 45, '%', 'aksi-insight', S_INS)
a('musim.sulteng', 34, '%', 'aksi-insight', S_INS)
a('rantai', 15.8, '%', 'aksi-insight', S_INS, catatan='banjir diikuti longsor di kab yang sama dalam 3 hari')
a('sk.lewat', 232, 'SK', 'aksi-insight', S_INS)
a('sk.total', 453, 'SK', 'aksi-insight', S_INS)
a('prioritas.kab', 30, 'kab/kota', 'aksi-insight', S_INS)
a('makalah', 14869, 'makalah', 'aksi-insight', S_INS)
a('senyap.kab', 134, 'kab/kota', 'aksi-insight', S_INS, catatan='hotspot 10 atau lebih dalam 3 hari tanpa episode karhutla di laporan harian, acuan 27 Okt 2026')
a('senyap.kukar', 744, 'hotspot', 'aksi-insight', S_INS)
a('blank.spot', 2121, 'desa', 'aksi-komdigi', 'Komdigi dikutip detik, 10 Des 2025', 'resmi')
a('bts.padam', 60.7, '%', 'aksi-bts', 'Komdigi dikutip Bisnis.com, 9 Des 2025', 'resmi')
a('eap.chf', 517485, 'CHF', 'aksi-eap', 'IFRC dan PMI, 31 Mar 2026', 'resmi')
a('eap.mm', 100, 'mm per 24 jam', 'aksi-eap', 'IFRC dan PMI, 31 Mar 2026', 'resmi')
a('pfb.rp', 7.5, 'triliun rupiah', 'aksi-pfb', 'Kemenkeu dikutip Bisnis.com', 'terverifikasi', 'saldo sekitar Rp7,5 triliun (Des 2025)')
a('bmkg.menit', 60, 'permintaan per menit', 'aksi-bmkg', 'data.bmkg.go.id', 'resmi')
a('pilot.kab', 5, 'kab', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan')
a('pilot.target', 3, 'laporan', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan', 'ukuran keberhasilan: median laporan per kejadian dari 1 menjadi 3 atau lebih')
a('aceh.kej', 88, 'kejadian', 'aksi-insight', S_INS)
a('aceh.tot', 226, 'kejadian', 'aksi-insight', S_INS)
a('riau.kej', 56, 'kejadian', 'aksi-insight', S_INS)
a('riau.tot', 97, 'kejadian', 'aksi-insight', S_INS)
a('brebes', 94, 'longsor', 'aksi-insight', S_INS)
a('batu', 77, 'longsor', 'aksi-insight', S_INS)
a('situbondo', 94, 'kejadian', 'aksi-insight', S_INS)
a('porsi.jatim', 0.24, '', 'aksi-insight', S_INS)
a('porsi.jateng', 0.25, '', 'aksi-insight', S_INS)
a('senyap.min', 10, 'hotspot', 'aksi-insight', S_INS)
a('senyap.hari', 3, 'hari', 'aksi-insight', S_INS)
a('mappi', 198, 'hotspot', 'aksi-insight', S_INS)
a('dogiyai', 78, 'hotspot', 'aksi-insight', S_INS)
a('mojokerto', 22, 'hotspot', 'aksi-insight', S_INS)
a('jeda.min', 1, 'hari', 'aksi-insight', S_INS)
a('jeda.max', 2, 'hari', 'aksi-insight', S_INS)
a('h.30', 30, 'hari', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan')
a('h.60', 60, 'hari', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan')
a('h.90', 90, 'hari', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan')
a('ugm.prov', 33, 'provinsi', 'aksi-ugm', 'UGM, klaim sendiri', 'penilaian-pakar')
a('ugm.jam', 4, 'jam', 'aksi-ugm', 'UGM, klaim sendiri', 'penilaian-pakar')
a('bmkg.hari', 3, 'hari', 'aksi-bmkg', 'data.bmkg.go.id', 'resmi')
a('bmkg.jam', 3, 'jam', 'aksi-bmkg', 'data.bmkg.go.id', 'resmi')
a('eap.kit', 1500, 'unit', 'aksi-eap', 'IFRC dan PMI, 31 Mar 2026', 'resmi')
a('bogor.mk', 51, 'makalah', 'aksi-insight', S_INS)
a('magelang.mk', 23, 'makalah', 'aksi-insight', S_INS)
a('banyumas.mk', 25, 'makalah', 'aksi-insight', S_INS)
a('cilacap.ls', 207, 'longsor', 'aksi-insight', S_INS)
a('cilacap.mk', 3, 'makalah', 'aksi-insight', S_INS)
a('lapis', 3, 'lapis', 'aksi-rancangan', S_RAN, 'asumsi-kebijakan')
a('tutup.hari', 3, 'hari', 'aksi-insight', S_INS)

# ---------------- tabel ----------------
c_lang = tulis('langganan', ['jenis', 'kab'], [['Banjir', 78], ['Cuaca ekstrem', 62], ['Longsor', 49]])
c_kendala = tulis('kendala', ['kendala', 'entri'], [['Akses putus', 2000], ['Air', 1479], ['Logistik', 1377],
                                                  ['Sinyal putus', 963], ['Personel', 927], ['Alat berat', 495], ['Gambut', 363]])
c_kor = tulis('korelasi', ['jenis', 'korelasi'], [['Banjir', 0.08], ['Longsor', 0.10], ['Karhutla', 0.09], ['Gempa', 0.48]])
c_musim = tulis('musim', ['daerah', 'pola', 'implikasi'], [
    ['Maluku, Maluku Utara', 'Banjir dan longsor memuncak Juni–Agustus', 'Siaga justru pertengahan tahun'],
    ['Sulawesi Tenggara, Sulawesi Tengah', 'Banjir dan longsor memuncak Juni–Agustus', 'SOP musim hujan November–Maret tidak cocok'],
    ['Aceh, Riau', 'Karhutla di musim hujan, Desember–Maret', 'Siaga karhutla Februari–Maret'],
    ['Lima kota Jakarta, Kota Semarang', 'Kebakaran permukiman Juli–September', 'Kampanye listrik aman sebelum kemarau'],
    ['Kab/kota banjir', 'Banjir diikuti longsor di kab yang sama dalam tiga hari', 'Banjir memicu siaga longsor otomatis'],
])
c_celah = tulis('celah', ['jenis', 'kab', 'tanpa', 'celah'], [
    ['Banjir', 85, 7, 'Kota Batu, Sampang, Kebumen, Barito Utara, Jepara'],
    ['Longsor', 52, 3, 'Brebes, Kota Batu, Pamekasan'],
    ['Karhutla terlapor', '', '', 'Situbondo, Sidoarjo, Sragen'],
    ['Karhutla Jatim', '', '', 'Situbondo, Nganjuk, Ponorogo, Mojokerto'],
    ['Papua', '', '', 'Pelaporan rendah; kejadian sebenarnya belum diketahui'],
])
c_prior = tulis('prioritas', ['daerah', 'provinsi', 'jenis'], [
    ['Kab. Aceh Selatan', 'Aceh', 'Banjir dan longsor'], ['Kab. Aceh Tenggara', 'Aceh', 'Banjir'],
    ['Kab. Agam', 'Sumatera Barat', 'Longsor'], ['Kab. Rokan Hulu', 'Riau', 'Banjir'],
    ['Kab. Wajo', 'Sulawesi Selatan', 'Banjir'], ['Kab. Aceh Barat', 'Aceh', 'Banjir'],
    ['Kab. Aceh Utara', 'Aceh', 'Banjir'], ['Kab. Aceh Singkil', 'Aceh', 'Banjir'],
    ['Kab. Langkat', 'Sumatera Utara', 'Banjir'], ['Kab. Pidie', 'Aceh', 'Banjir'],
    ['Kab. Barito Utara', 'Kalimantan Tengah', 'Banjir'], ['Kab. Aceh Timur', 'Aceh', 'Banjir'],
])
c_tek = tulis('teknologi', ['bencana', 'alat', 'tugas', 'biaya'], [
    ['Banjir', 'Jarak muka air sungai (ultrasonik) dan papan duga', 'Laju kenaikan muka air jadi bahan peringatan desa', 'Rp 1,3-2,5 juta per titik'],
    ['Hujan', 'Ember jungkit 0,2 mm', 'Intensitas hujan 10 menit dan 60 menit di desa', 'Rp 1,3-3,2 juta per titik'],
    ['Longsor', 'Potensiometer kawat, kemiringan, kelembapan tanah, sirene lokal', 'Gerakan lereng memicu sirene di desa tanpa sinyal', 'Rp 2,5-4 juta per titik'],
    ['Gambut', 'Transduser tekanan pada pipa pantau', 'Muka air gambut terhadap ambang siaga, acuan 40 cm', 'Rp 2,5-5,5 juta per titik'],
    ['Asap dan api', 'Sensor PM2,5 dan CO', 'Deteksi dini asap di kluster gambut atau hutan', 'Rp 1,3-2,3 juta per titik'],
    ['Komunikasi desa', 'Gateway LoRaWAN atau node Meshtastic; modem seluler', 'Meneruskan bacaan alat ke sistem Centurisk97', 'Gateway Rp 1,8-12 juta; seluler tambah Rp 0,5-0,9 juta'],
])
c_komp = tulis('komponen', ['komponen', 'pihak'], [
    ['Sensor longsor serta muka air sungai dan hujan', 'UGM, PVMBG Badan Geologi, BMKG, Kementerian PU (BBWS dan BWS), ITB, BPBD pilot Jawa Tengah'],
    ['Sensor gambut dan api', 'BRGM, IPB, Kehutanan, Dryad (uji kecil)'],
    ['Radio mesh dan satelit; peringatan ke warga', 'Komdigi dan BAKTI, operator seluler, Starlink, komunitas Meshtastic, BMKG, Google, PMI, Polri dan TNI'],
    ['Data cuaca, wilayah, jalan, penduduk', 'BMKG, BIG, BPS, Kemendagri, Kementerian PU, Komdigi'],
    ['Pendanaan antisipatif', 'Kemenkeu dan Bappenas beserta lima lembaga donor'],
    ['Riset dan uji', 'UGM, ITB, IPB, UI, ITS, Unpad, universitas gambut'],
])
KOL_MITRA = [{'nama': 'pihak', 'kepala': 'Pihak'}, {'nama': 'punya', 'kepala': 'Yang dimiliki', 'rata': 'l', 'bobot': 1.9},
             {'nama': 'minta', 'kepala': 'Kita minta', 'rata': 'l', 'bobot': 1.7}, {'nama': 'beri', 'kepala': 'Kita beri', 'rata': 'l', 'bobot': 1.5},
             {'nama': 'wahana', 'kepala': 'Wahana dan waktu', 'rata': 'l', 'bobot': 1.5}]
c_pt = tulis('mitra_pt', ['pihak', 'punya', 'minta', 'beri', 'wahana'], [
    ['UGM', 'GAMA-EWS: ekstensometer, tiltmeter, alat hujan, telemetri, alarm masyarakat', 'Bacaan alat terpasang; lokasi dan ambang per desa; uji pasang di kluster',
     'Logbook untuk kalibrasi ambang; daftar desa langganan longsor', 'PKS, tinjau perjanjian yang ada; sekarang'],
    ['ITB', 'Kajian awal prakiraan banjir berbasis dampak', 'Metode ambang banjir berbasis dampak; pendampingan uji balik',
     'Label dampak per kejadian; set uji luar-sampel', 'MoU lalu PKS riset; musim ini'],
    ['IPB University', 'Riset gambut, muka air tanah, kebakaran lahan', 'Data muka air dan kelembapan gambut; lokasi uji; kalibrasi ambang siaga',
     'Hotspot dan luas terbakar; bahan skripsi dan tesis', 'PKS; tahun depan, mulai bicara sekarang'],
    ['ITS', 'Materi mitigasi gerakan tanah dan geofisika', 'Survei geofisika untuk desa pilot; sensor murah', 'Lokasi uji dan data', 'MoU; tahun depan'],
    ['Kampus gambut', 'Publikasi dan stasiun lapangan gambut di lima kampus Sumatra dan Kalimantan', 'Akses lokasi uji, data muka air lokal, tenaga lapangan',
     'Peta kluster langganan karhutla; hotspot harian', 'PKS per kampus; tahun depan'],
])
c_kl1 = tulis('mitra_kl1', ['pihak', 'punya', 'minta', 'beri', 'wahana'], [
    ['BMKG', 'Prakiraan cuaca terbuka per desa, 3 hari, interval 3 jam, kode adm4', 'Data AWS dan ARG kluster pilot; radar; izin di atas batas terbuka',
     'Laporan dampak aktual; daftar daerah senyap', 'PKS; sekarang'],
    ['Kementerian PU', 'Ditjen SDA beserta BBWS dan BWS: pos hidrologi dan duga air, sistem informasi', 'Muka air telemetri dan ambang siaga; status pos; kontrak alat berat',
     'Peta kejadian banjir per desa; usulan perbaikan pos', 'PKS Ditjen SDA lalu surat teknis BBWS; sekarang'],
    ['BRGM', 'SIPALAGA: pemantau muka air gambut, kelembapan tanah, hujan tiap 10 menit', 'Akses data SIPALAGA, titik stasiun, status alat',
     'Hotspot dan indikator kekeringan; peta desa langganan karhutla', 'PKS; musim ini'],
    ['Komdigi dan BAKTI', 'Data desa blank spot; rencana cell broadcast; layanan 112', 'Daftar blank spot; data BTS padam; jalur cell broadcast',
     'Desa langganan yang butuh jaringan siaga; hasil sinyal putus logbook', 'MoU BNPB-Komdigi, PKS teknis BAKTI; sekarang'],
    ['BIG', 'Peta dasar dan batas wilayah (perlu konfirmasi)', 'Batas desa, jaringan jalan, DEMNAS, peta sungai', 'Koreksi atribut dari survei desa terisolir', 'Permintaan data; PKS bila volume besar; musim ini'],
])
c_kl2 = tulis('mitra_kl2', ['pihak', 'punya', 'minta', 'beri', 'wahana'], [
    ['PVMBG, Badan Geologi', 'Portal MBG: zona kerentanan gerakan tanah, prakiraan bulanan', 'ZKGT vektor lengkap; data kejadian; rekomendasi teknis desa pilot',
     'Kejadian longsor terlapor; daftar desa langganan', 'Permintaan data dan PKS; sekarang'],
    ['BPS dan Kemendagri', 'Kode wilayah Kepmendagri 2025; data penduduk dan Podes', 'Kode desa terbaru; penduduk per desa; Podes jalan, sinyal, listrik',
     'Dua data dipetakan ke satu kunci desa; temuan kode ganda', 'Permintaan data Satu Data Indonesia; sekarang'],
    ['Kemenkeu', 'PARB dan BPDLH: Pooling Fund Bencana, saldo sekitar Rp7,5 triliun', 'Masukan desain pemicu; jalur pencairan antisipatif',
     'Bukti biaya per kejadian dan untung-rugi aksi dini', 'Koordinasi Kemenko PMK, Kemenkeu, BNPB; musim ini'],
    ['Kemenko PMK, Bappenas', 'Koordinasi aksi antisipatif nasional; menerima WFP, PMI, OCHA sejak 2022', 'Mandat dan masuk Renstra',
     'Naskah akademik hasil uji pilot', 'Rapat koordinasi; musim ini'],
    ['Polri dan TNI', 'Polri memasang 8 terminal Starlink saat banjir Sumatra 2025', 'Jalur logistik dan komunikasi siaga; operator',
     'Daftar desa terisolir dan lokasi stok', 'MoU yang ada, PKS operasional; musim ini'],
])
c_swasta = tulis('mitra_swasta', ['pihak', 'punya', 'minta', 'beri', 'wahana'], [
    ['Operator seluler', 'Telkomsel, Indosat, XL Smart: jaringan seluler dan cell broadcast', 'Peta cakupan per desa; status BTS; uji cell broadcast',
     'Desa langganan terisolir untuk prioritas pemulihan', 'MoU BNPB-operator, PKS; musim ini'],
    ['Starlink', 'Terminal satelit: 17 unit ke Sumatera Utara, 280 unit tambahan', 'Terminal siaga di pos BPBD; tarif lembaga',
     'Daftar lokasi prioritas', 'Pengadaan atau hibah bersyarat; musim ini'],
    ['Komunitas Meshtastic', 'Komunitas dan vendor LoRa: jaringan mesh, uji informal 8,5 km', 'Panduan pasang; perangkat murah lima desa pilot',
     'Hasil uji jangkauan di medan Jawa Tengah', 'PKS kecil atau pengadaan; sekarang'],
    ['Dryad Networks', 'Silvanet: sensor gas tenaga surya; klaim perusahaan', 'Uji coba kecil di satu kluster gambut; harga',
     'Hasil uji dengan pembanding hotspot satelit', 'Uji bersama kampus (IPB); tahun depan'],
])
c_intl = tulis('mitra_intl', ['pihak', 'punya', 'minta', 'beri', 'wahana'], [
    ['IFRC dan PMI', 'Early Action Protocol banjir Indonesia, alokasi CHF 517.485, pemicu 100 mm per 24 jam', 'Pemicu EAP disatukan dengan desa langganan; relawan desa',
     'Data prakiraan terinci dan daftar desa langganan; hasil uji', 'MoU tiga pihak BNPB, PMI, IFRC; sekarang'],
    ['WFP', 'Kajian integrasi aksi antisipatif; pengajuan ke Kemenko PMK sejak 2022', 'Pendanaan uji pilot, analitik, bantuan tunai',
     'Hasil uji dan dasbor', 'MoU; musim ini'],
    ['UNDP dan OCHA', 'Pembiayaan risiko bencana; kerangka OCHA', 'Pendanaan dan penyelarasan',
     'Data uji', 'MoU; tahun depan'],
    ['Google (Flood Hub)', 'Prakiraan banjir sungai sampai tujuh hari', 'Akses prakiraan banjir sungai untuk Indonesia',
     'Data lapangan sebagai verifikasi', 'Perjanjian data; musim ini'],
    ['PetaBencana.id', 'Laporan warga lewat chatbot; terhubung ke InAWARE BNPB', 'Umpan laporan warga ke daftar daerah senyap',
     'Verifikasi dari logbook', 'Perjanjian data; musim ini'],
])
c_hukum = tulis('hukum', ['dasar', 'isi', 'arti'], [
    ['Perpres 39/2019 Satu Data Indonesia', 'Data pemerintah dibagipakaikan antarinstansi; data di Portal SDI diakses tanpa biaya dan tanpa MoU', 'Surat permintaan data cukup untuk data yang sudah di portal'],
    ['UU 24/2007 Penanggulangan Bencana', 'BNPB menyelenggarakan penanggulangan bencana; Pasal 26 hak atas informasi', 'Dasar kewenangan surat dinas BNPB'],
    ['Kepmendagri 300.2.2-2138 Tahun 2025', 'Kode wilayah baku yang dipakai BMKG dan instansi lain', 'Kunci gabung semua data per desa'],
])
c_wahana = tulis('wahana', ['wahana', 'isi', 'untuk'], [
    ['Surat permintaan data', 'Surat dinas satu halaman, merujuk UU 24/2007 dan Perpres 39/2019', 'Data yang sudah ada di instansi'],
    ['MoU', 'Nota kesepahaman payung, tanpa uang', 'Hubungan jangka panjang dan arah bersama'],
    ['PKS', 'Perjanjian kerja sama rinci: data, alat, waktu, hak cipta, keamanan', 'Data berkala lewat API, pemasangan alat, uji bersama'],
])
DATA_COLS = [{'nama': 'no', 'kepala': 'No'}, {'nama': 'data', 'kepala': 'Data', 'rata': 'l', 'bobot': 2.2}, {'nama': 'pemegang', 'kepala': 'Pemegang', 'rata': 'l', 'bobot': 1.4},
             {'nama': 'format', 'kepala': 'Format', 'rata': 'l', 'bobot': 1.0}, {'nama': 'guna', 'kepala': 'Untuk apa', 'rata': 'l', 'bobot': 1.6}]
c_data1 = tulis('data1', ['no', 'data', 'pemegang', 'format', 'guna'], [
    ['1', 'Prakiraan cuaca per desa (adm4), 3 hari, interval 3 jam', 'BMKG', 'JSON API', 'Eskalasi harian di desa langganan'],
    ['3', 'Curah hujan AWS dan ARG historis 10 tahun dan waktu nyata, lima kab pilot Jawa Tengah', 'BMKG', 'CSV per stasiun', 'Kalibrasi ambang hujan longsor'],
    ['5', 'Tinggi muka air telemetri pos duga air dan status siaga', 'Kementerian PU, BBWS', 'CSV atau API', 'Sensor sungai dan peringatan banjir'],
    ['6', 'Daftar pos hidrologi: koordinat, jenis, status, ambang siaga', 'Ditjen SDA, BBWS', 'CSV', 'Menentukan titik tambahan sensor'],
    ['9', 'Zona kerentanan gerakan tanah skala detail dan KRB', 'PVMBG, Badan Geologi', 'SHP atau GeoTIFF', 'Daftar desa langganan longsor'],
    ['12', 'Batas desa, jaringan jalan, sungai, DEMNAS', 'BIG', 'SHP atau GeoTIFF', 'Menghitung keterisolasian desa'],
])
c_data2 = tulis('data2', ['no', 'data', 'pemegang', 'format', 'guna'], [
    ['13', 'Kode dan data wilayah administrasi terbaru, provinsi sampai desa', 'Kemendagri', 'CSV', 'Kunci gabung semua data'],
    ['14', 'Penduduk per desa dan Podes: akses jalan, sinyal, listrik, kejadian bencana', 'BPS', 'CSV', 'Penyebut per desa dan indikator keterisolasian'],
    ['15', 'Daftar desa belum 4G (blank spot) berkoordinat, jadwal pembangunan', 'Komdigi, BAKTI', 'CSV atau SHP', 'Memilih desa yang butuh radio mesh'],
    ['21', 'Dana Siap Pakai: realisasi per kab per kejadian 2019–2026', 'BNPB, direktorat internal', 'CSV', 'Menghitung untung-rugi aksi dini'],
    ['22', 'Data Early Action Protocol banjir: pemicu, desa sasaran, hasil', 'PMI, IFRC', 'PDF, tabel', 'Menyatukan desa langganan dan sasaran EAP'],
    ['23', 'Bacaan sensor longsor terpasang di lokasi BNPB dan UGM', 'UGM, BPBD', 'CSV atau API', 'Sensor lapis dua'],
])
c_pilot = tulis('pilot', ['komponen', 'isi', 'mitra'], [
    ['Siapkan sebelum musim', 'Desa langganan dan terisolir, stok penyangga, kontrak alat berat, SOP pra-musim', 'BPBD lima kab, PU, PVMBG'],
    ['Pelapor desa', 'Pelapor lewat WhatsApp; pengingat lanjutan sehari dan tiga hari sesudahnya', 'BPBD, PMI'],
    ['Daerah senyap', 'Daftar harian sinyal satelit atau cuaca tanpa laporan; Pusdalops menelepon', 'Pusdalops BNPB, BPBD'],
    ['Sensor longsor', 'Ekstensometer, tiltmeter, alat hujan, sirene luring di desa terpilih', 'UGM, BMKG'],
    ['Radio mesh', 'LoRa mesh untuk desa tanpa sinyal, setelah survei jangkauan', 'Komdigi, BAKTI, komunitas Meshtastic'],
    ['Peta dan kalibrasi', 'Peta publik riwayat dan musim; kalibrasi kalender tiap akhir musim', 'BNPB, kampus'],
])
c_ukur = tulis('ukuran', ['ukuran', 'kini', 'target'], [
    ['Laporan per kejadian (median)', t('median.lapor') + ' laporan', t('pilot.target') + ' laporan atau lebih'],
    ['Waktu BNPB tahu kejadian', 'Belum diukur, dicatat dalam jam', 'Turun dari nilai awal pilot'],
    ['Stok tersedia sebelum kejadian', 'Belum diukur', 'Stok ada di kabupaten sebelum musim'],
    ['Sinyal tanpa laporan yang ditelepon', 'Belum diukur', 'Persentase naik dari nilai awal pilot'],
])
PROFIL = {
    'UGM': dict(
        judul='Profil UGM: sensor longsor GAMA-EWS dan bacaan alat untuk kluster pilot',
        kartu=[('ugm.prov', 'provinsi terpasang, klaim UGM', 'wilayah'), ('ugm.jam', 'jam deteksi dini Banjarnegara, klaim UGM', 'longsor')],
        baris=[['Yang dimiliki', 'GAMA-EWS: ekstensometer, tiltmeter, alat hujan, alat muka air, telemetri GSM, radio, satelit, platform data, dan alarm masyarakat.'],
               ['Kita minta', 'Bacaan alat terpasang lewat API atau CSV; lokasi dan ambang per desa; uji pasang di kluster pilot; spesifikasi antarmuka ke /api/sensor/baca.'],
               ['Kita beri', 'Logbook terstruktur sejak 2011 untuk kalibrasi ambang; daftar desa langganan longsor; ko-penulisan hasil uji prospektif; dasbor status alat.'],
               ['Wahana dan waktu', 'PKS, sekarang. UGM dan BNPB sudah bekerja sama untuk peringatan dini longsor; tinjau perjanjian yang ada lebih dulu.'],
               ['Perlu konfirmasi', 'Angka sebaran GAMA-EWS berbeda antarhalaman UGM; pilih satu sumber sebelum dipakai di surat.']],
        langkah=['**Tinjau** perjanjian BNPB dan UGM yang sudah ada.', '**Minta** bacaan alat dan lokasi di lima kabupaten pilot.', '**Susun** spesifikasi antarmuka bersama tim sensor.']),
    'BMKG': dict(
        judul='Profil BMKG: prakiraan terbuka per desa dan data stasiun kabupaten pilot',
        kartu=[('bmkg.hari', 'hari prakiraan terbuka per desa', 'kalender'), ('bmkg.jam', 'jam interval prakiraan', 'kalender'), ('bmkg.menit', 'permintaan per menit per IP', 'data')],
        baris=[['Yang dimiliki', 'Prakiraan cuaca terbuka per desa dengan kode adm4 Kemendagri, wajib mencantumkan BMKG; peringatan dini cuaca berpoligon.'],
               ['Kita minta', 'Data AWS dan ARG historis serta waktu nyata lima kabupaten pilot; data radar; kerja sama peringatan ke desa; izin di atas batas terbuka.'],
               ['Kita beri', 'Laporan lapangan terstruktur (dampak aktual) untuk verifikasi prakiraan berbasis dampak; daftar daerah senyap harian.'],
               ['Wahana dan waktu', 'PKS, sekarang. Periksa kerja sama BNPB dan BMKG yang masih berlaku sebelum menyusun naskah baru.'],
               ['Perlu konfirmasi', 'Jumlah dan akses jaringan AWS dan ARG serta radar belum diverifikasi.']],
        langkah=['**Periksa** kerja sama BNPB dan BMKG yang masih berlaku.', '**Kirim** surat permintaan data stasiun lima kabupaten.', '**Tawarkan** laporan dampak aktual untuk verifikasi.']),
    'Kementerian PU': dict(
        judul='Profil Kementerian PU: data pos duga air dan alat berat siaga',
        kartu=[('pilot.kab', 'kabupaten pilot butuh data pos', 'wilayah'), ('lang.banjir', 'kab/kota langganan banjir', 'banjir')],
        baris=[['Yang dimiliki', 'Pos hidrologi dan duga air serta sistem informasi hidrologi; SE Dirjen SDA 10/2021 mengatur mutu data hidrologi.'],
               ['Kita minta', 'Tinggi muka air telemetri dan ambang siaga sungai; kontrak siaga alat berat; status pos rusak; daftar pos berkoordinat.'],
               ['Kita beri', 'Peta kejadian banjir per desa, dan permintaan perbaikan pos duga air berdasarkan kejadian yang tercatat di logbook sejak 2011.'],
               ['Wahana dan waktu', 'PKS dengan Ditjen SDA, lalu surat teknis ke tiap BBWS; data sekarang, alat berat musim ini.'],
               ['Perlu konfirmasi', 'Kepemilikan alat berat dan pompa, serta nama BBWS di lima kabupaten pilot, belum diverifikasi. Konfirmasi lewat telepon sebelum surat dikirim.']],
        langkah=['**Kirim** surat permintaan data pos ke Ditjen SDA.', '**Tunjuk** BBWS wilayah pilot setelah nama dikonfirmasi.', '**Bahas** kontrak siaga alat berat untuk musim ini.']),
    'PMI dan IFRC': dict(
        judul='Profil PMI dan IFRC: protokol aksi dini banjir dan desa langganan',
        kartu=[('eap.chf', 'alokasi EAP banjir Indonesia', 'pembiayaan'), ('eap.mm', 'ambang hujan pemicu EAP', 'banjir'), ('eap.kit', 'unit kit martabat dibeli', 'rumah')],
        baris=[['Yang dimiliki', 'Early Action Protocol banjir Indonesia (EAP2024ID01): pemicu dari prakiraan BMKG atau dasbor pencegahan BNPB.'],
               ['Kita minta', 'Menyatukan pemicu EAP dengan desa langganan kita; paket aksi dini; relawan desa.'],
               ['Kita beri', 'Data prakiraan terinci dan daftar desa langganan, karena PMI melaporkan akses data prakiraan terinci terbatas (pembaruan April 2026); hasil uji pilot.'],
               ['Wahana dan waktu', 'MoU tiga pihak BNPB, PMI, IFRC; sekarang.'],
               ['Langkah pertama', 'Rapat penyamaan pemicu EAP banjir dengan daftar desa langganan.']],
        langkah=['**Samakan** pemicu EAP dengan desa langganan.', '**Bagikan** daftar desa dan data prakiraan terinci.', '**Rancang** MoU tiga pihak.']),
    'Komdigi dan BAKTI': dict(
        judul='Profil Komdigi dan BAKTI: desa blank spot dan jalur cell broadcast',
        kartu=[('blank.spot', 'desa blank spot per Desember 2025', 'wilayah'), ('bts.padam', 'BTS Aceh padam delapan hari pascabanjir', 'telepon'), ('k.sinyal', 'entri sinyal putus di logbook', 'peringatan')],
        baris=[['Yang dimiliki', 'Data desa blank spot, rencana peringatan dini cell broadcast, dan layanan 112.'],
               ['Kita minta', 'Daftar desa blank spot berkoordinat; data BTS padam saat bencana; jalur cell broadcast; frekuensi radio untuk LoRa.'],
               ['Kita beri', 'Daftar desa langganan yang butuh jaringan siaga; hasil uji sinyal putus dari logbook.'],
               ['Wahana dan waktu', 'MoU BNPB-Komdigi dan PKS teknis dengan BAKTI; sekarang.'],
               ['Perlu konfirmasi', 'Status akhir 2026 rencana cell broadcast, dan izin frekuensi LoRa 915–923 MHz di Indonesia.']],
        langkah=['**Minta** daftar blank spot berkoordinat.', '**Cocokkan** dengan desa langganan terisolir.', '**Bahas** jalur cell broadcast untuk pilot.']),
}
c_ap = {k: tulis('ap_' + k.split()[0].lower(), ['aspek', 'isi'], v['baris']) for k, v in PROFIL.items()}
c_lamp = tulis('lampiran_sumber', ['klaim', 'sumber', 'status'], [
    ['UGM dan BNPB bekerja sama untuk peringatan dini longsor', 'ugm.ac.id, berita 10222', 'Terverifikasi'],
    ['GAMA-EWS terpasang di 33 provinsi; deteksi empat jam sebelum Banjarnegara 2007', 'gama-inatek.ugm.ac.id', 'Klaim UGM; angka beda antarhalaman'],
    ['SIPALAGA BRGM: 142 pemantau di 7 provinsi sampai 2018', 'mongabay.co.id, 28 Jan 2019', 'Terverifikasi; jumlah kini belum dicek'],
    ['Prakiraan cuaca terbuka per desa, batas 60 permintaan per menit', 'data.bmkg.go.id', 'Terverifikasi'],
    ['SE Dirjen SDA 10/2021 kendali mutu data hidrologi', 'sda.pu.go.id', 'Terverifikasi'],
    ['Portal MBG PVMBG: zona kerentanan gerakan tanah', 'esdm.go.id', 'Terverifikasi'],
    ['2.121 desa blank spot per 10 Desember 2025', 'detik.com, 10 Des 2025', 'Terverifikasi'],
    ['60,7% BTS di Aceh padam delapan hari pascabanjir 2025', 'bisnis.com, 9 Des 2025', 'Terverifikasi'],
    ['Starlink: 17 unit ke Sumatera Utara, 280 unit tambahan', 'kompas.tv; bcasekuritas.co.id', 'Terverifikasi'],
    ['Polri memasang 8 terminal Starlink saat banjir Sumatra 2025', 'rm.id', 'Terverifikasi'],
    ['Pooling Fund Bencana sekitar Rp7,4 triliun (2023) dan Rp7,5 triliun (Des 2025)', 'fiskal.kemenkeu.go.id; bisnis.com', 'Terverifikasi'],
    ['EAP banjir Indonesia: alokasi CHF 517.485, pemicu 100 mm per 24 jam', 'reliefweb.int, 31 Mar 2026', 'Terverifikasi'],
    ['WFP: kajian integrasi aksi antisipatif di Indonesia', 'wfp.org', 'Terverifikasi'],
    ['Kemenko PMK menerima WFP, PMI, OCHA sejak 2022', 'kemenkopmk.go.id, node 4115', 'Terverifikasi'],
    ['Perpres 39/2019 Satu Data Indonesia', 'pasal.id; setkab.go.id', 'Terverifikasi; perubahan belum dicek'],
    ['Kepmendagri 300.2.2-2138 Tahun 2025 kode wilayah', 'data.bmkg.go.id', 'Teks resmi belum dibaca'],
    ['Rencana peringatan dini cell broadcast Komdigi', 'investortrust.id', 'Rencana; status 2026 belum dikonfirmasi'],
    ['Flood Hub Google: prakiraan sungai di lebih dari 100 negara', 'blog.google', 'Cakupan Indonesia belum dikonfirmasi'],
    ['PetaBencana.id terhubung dengan InAWARE BNPB', 'itu.int', 'Terverifikasi'],
])

# ---------------- slide ----------------


def tm(kode, ikon, teks, keyakinan='terverifikasi'):
    return {'kode': kode, 'keyakinan': keyakinan, 'ikon': ikon, 'teks': teks}


def kt(nilai, label, ikon, warna='navy'):
    return {'nilai': nilai, 'label': label, 'ikon': ikon, 'warna': warna}


def kolom_t(*c):
    return [dict(zip(['nama', 'kepala', 'rata', 'bobot'], x)) if len(x) == 4 else dict(zip(['nama', 'kepala'], x)) for x in c]


SLIDE = [
    {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.85,
     'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Staf Ahli BNPB'},
     'kepada': 'Ditujukan khusus untuk mitra kerja sama BNPB'},

    # ---- Bagian 1: diagnosis ----
    {'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan eksekutif',
     'sumber': 'Logbook Pusdalops BNPB 2011–2026; insight lintas data BNPB, 1 Nov 2026; rancangan aksi antisipatif, 1 Nov 2026',
     'judul': f'Bencana berulang di desa yang sama dan {t("lapis")} lapis aksi antisipatif memerlukan mitra di empat kelompok lembaga',
     'cut_off': False, 'skala_huruf': 1.5,
     'grup': [{'pil': 'Dasar usulan', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': [
         kt(t('log.kejadian'), f'kejadian logbook Pusdalops {t("log.th0", "|tahun")}–2026', 'peringatan'),
         kt(t('lang.banjir'), 'kab/kota langganan banjir', 'banjir'),
         kt(t('lang.longsor'), 'kab/kota langganan longsor', 'longsor', 'oranye')]}],
     'panel': [
         {'judul': 'Yang kita temukan', 'ikon': 'peringatan', 'nada': 'kendala', 'temuan': [
             tm('Temuan A.1', 'kalender', f'**Berulang.** Banjir dan longsor menimpa kab/kota yang sama tiap tahun.'),
             tm('Temuan A.2', 'peringatan', '**Banyak tak terlapor.** Kebakaran lahan Jawa jarang dilaporkan.'),
             tm('Temuan A.3', 'infrastruktur', f'**Kendala berulang.** Akses putus {t("k.akses")} entri, logistik {t("k.logistik")}.')]},
         {'judul': 'Yang kita usulkan', 'ikon': 'kapasitas', 'nada': 'capaian', 'temuan': [
             tm('Temuan B.1', 'prabencana', '**Siapkan sebelum musim.** Stok dan alat berat di desa langganan.', 'asumsi-kebijakan'),
             tm('Temuan B.2', 'telepon', '**Mata di desa.** Pelapor, daftar senyap, sensor.', 'asumsi-kebijakan'),
             tm('Temuan B.3', 'data', '**Satu catatan baku.** Form logbook dan laporan otomatis.', 'asumsi-kebijakan')]},
         {'judul': 'Yang kita minta', 'ikon': 'regulasi', 'nada': 'tindak', 'temuan': [
             tm('Temuan C.1', 'lembaga', f'**Mitra.** Empat kelompok lembaga di luar BNPB dan BPBD.', 'asumsi-kebijakan'),
             tm('Temuan C.2', 'situs', '**Data.** Dua belas permintaan data kepada instansi untuk dikirim pada minggu pertama.', 'asumsi-kebijakan'),
             tm('Temuan C.3', 'wilayah', f'**Pilot.** Longsor di {t("pilot.kab")} kab Jawa Tengah, November–Maret.', 'asumsi-kebijakan')]}]},

    {'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.42,
     'pesan': 'Bencana berulang', 'cut_off': False,
     'judul': f'{t("lang.banjir")} kab/kota terkena banjir, {t("lang.cuaca")} cuaca ekstrem, dan {t("lang.longsor")} longsor di setiap tahun dasar ({t("lang.tahun")} dari {t("lang.tahun")} tahun, 2014–2020 dan 2024–2025)',
     'grafik': {'judul_panel': 'Kab/kota langganan', 'ikon': 'wilayah', 'judul': '**Kab/kota langganan**, jumlah, 2014–2025',
                'keluarga': 'air', 'ubah': False, 'persen_batang': False, 'pembanding': False, 'seragam': True,
                'data': {'csv': c_lang, 'kolom': [{'nama': 'jenis', 'kepala': 'Jenis'}, {'nama': 'kab', 'kepala': 'Kab/kota', 'fmt': '0'}],
                         'keyakinan': 'terverifikasi', 'sumber': S_INS}},
     'panel': {'judul': 'Kepastian musim lebih andal', 'ikon': 'ringkasan', 'skala_huruf': 1.28, 'temuan': [
         tm('Temuan A.1', 'kalender', '**Musim sangat pasti.** Daerah yang sama terkena di bulan yang hampir sama, tahun demi tahun.'),
         tm('Temuan A.2', 'peringatan', f'**Ramalan harian lemah.** Model banjir dari hujan gagal di uji 2022–2025 (ETS {t("ets", "|fmt=3")}), kalah dari persisten; sekitar {t("alarm.salah")} dari {t("alarm.per")} alarm Waspada salah.'),
         tm('Temuan A.3', 'banjir', f'**Rantai banjir ke longsor.** {t("rantai", "|persen")} banjir diikuti longsor di kab yang sama dalam {t("tutup.hari")} hari.'),
         tm('Temuan A.4', 'prabencana', '**Dasar tindakan.** Siaga sebulan sebelum musim di desa langganan, tanpa menunggu prakiraan harian.', 'asumsi-kebijakan')]},
     'pita': {'label': 'Catatan', 'nada': 'data', 'skala': 1.5, 'kolom': [
         {'ikon': 'regulasi', 'judul': 'Yang dihitung', 'isi': f'Tahun dasar: tiap bulan tercatat minimal {t("dasar.hari")} hari. Langganan: kejadian di {t("lang.tahun")} dari {t("lang.tahun")} tahun dasar.'},
         {'ikon': 'data', 'judul': 'Batas data', 'isi': f'Bias kuat ke Jawa. Tahun 2025 melonjak ke {t("log.2025")} kejadian, tertinggi sejak 2011; DIBI juga naik.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.6,
     'pesan': 'Tak terlapor', 'cut_off': False,
     'judul': f'Kebakaran lahan Jawa hanya terlapor pada {t("jawa.lapor.min")}–{t("jawa.lapor.max", "|persen")} hari-hotspot, dan satu kejadian rata-rata dilaporkan {t("median.lapor")} kali',
     'grup': [{'pil': 'Tahu terlambat atau tidak tahu', 'nada': 'perhatian', 'ikon': 'peringatan', 'kartu': [
         kt(t('jawa.lapor.min') + '–' + t('jawa.lapor.max', '|persen'), 'hari-hotspot Jawa yang terlapor', 'karhutla', 'merah'),
         kt(t('median.lapor'), 'laporan per kejadian (median)', 'ringkasan')]}],
     'tabel': {'judul_panel': 'Tanda kejadian tak terlapor', 'ikon': 'peringatan', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.28,
               'data': {'csv': tulis('taklapor', ['tanda', 'bukti', 'bacaan'], [
                   ['Jawa 2014–2018', 'Laporan per hari-hotspot naik tajam, padahal hotspot tidak naik sebesar itu', 'Kebiasaan lapor berubah; hotspot tidak naik sebesar itu'],
                   ['Situbondo dan Wonogiri', 'Hotspot sama banyak pada 2015 dan 2018; laporan naik dari nol ke sekitar dua puluh', 'Kebakaran lahan Jawa jarang masuk laporan'],
                   ['Provinsi di Papua', 'Hanya 0,3–1 kejadian per kab per tahun', 'Pelaporan rendah; kejadian sebenarnya belum diketahui'],
                   ['Laporan sekali', 'Median satu kejadian hanya dilaporkan sekali', 'Kondisi akhir dan korban akhir jarang tercatat'],
                   ['SK status darurat', 'Sebagian SK kabupaten 2025 lewat batas 14 hari; jeda median 13 hari', 'Masa berlaku SK perlu dipantau']]),
                        'kolom': [{'nama': 'tanda', 'kepala': 'Tanda'}, {'nama': 'bukti', 'kepala': 'Bukti', 'rata': 'l', 'bobot': 2.2},
                                  {'nama': 'bacaan', 'kepala': 'Bacaan', 'rata': 'l', 'bobot': 1.5}],
                        'keyakinan': 'terverifikasi', 'sumber': S_INS}},
     'panel': {'judul': 'Akibat bagi BNPB', 'ikon': 'ringkasan', 'skala_huruf': 1.2, 'temuan': [
         tm('Temuan A.1', 'peringatan', '**Tahu terlambat.** Tindakan menunggu laporan yang sering tidak datang.'),
         tm('Temuan A.2', 'data', '**Tahu sepotong.** Korban terhitung ganda; angka korban logbook tidak dipakai.'),
         tm('Temuan A.3', 'telepon', '**Jalan keluar.** Pelapor desa dengan pengingat lanjutan; daftar daerah senyap.', 'asumsi-kebijakan'),
         tm('Temuan A.4', 'regulasi', '**Dasar tindakan.** Daftar daerah senyap menjadi daftar telepon Pusdalops tiap hari.', 'asumsi-kebijakan')]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.7,
     'pesan': 'Peta risiko dan frekuensi', 'cut_off': False,
     'judul': f'Peringkat risiko InaRISK nyaris tak berhubungan dengan frekuensi kejadian: korelasi banjir {t("kor.banjir", "|fmt=2")}, longsor {t("kor.longsor", "|fmt=2")}, karhutla {t("kor.karhutla", "|fmt=2")}',
     'tabel': {'judul_panel': 'Korelasi peringkat risiko dan kejadian', 'ikon': 'data', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.2,
               'data': {'csv': tulis('korelasi_baca', ['jenis', 'korelasi', 'bacaan'], [
                   ['Banjir', 0.08, 'Nyaris tak berhubungan'],
                   ['Longsor', 0.10, 'Nyaris tak berhubungan; Bogor, Magelang, Cilacap, Kota Semarang di bawah median'],
                   ['Karhutla', 0.09, 'Nyaris tak berhubungan'],
                   ['Gempa', 0.48, 'Paling tinggi di antara empat jenis']]),
                        'kolom': [{'nama': 'jenis', 'kepala': 'Jenis', 'bobot': 1.3}, {'nama': 'korelasi', 'kepala': 'Korelasi', 'fmt': '2', 'bobot': 1.0}, {'nama': 'bacaan', 'kepala': 'Bacaan', 'rata': 'l', 'bobot': 2.2}],
                        'keyakinan': 'terverifikasi', 'sumber': S_INS}},
     'panel': {'judul': 'Bacaan untuk perencanaan', 'ikon': 'ringkasan', 'skala_huruf': 1.0, 'temuan': [
         tm('Temuan A.1', 'longsor', '**Langganan di bawah median.** Longsor banyak, indeks risiko rendah.'),
         tm('Temuan A.2', 'regulasi', '**Dua ukuran berbeda.** InaRISK menilai bahaya dan keparahan, logbook menghitung frekuensi.'),
         tm('Temuan A.3', 'data', '**Melengkapi InaRISK.** Lapisan frekuensi nyata masuk perencanaan tahunan.', 'asumsi-kebijakan')]},
     'pita': {'label': 'Cara membaca', 'nada': 'data', 'skala': 1.7, 'kolom': [
         {'ikon': 'data', 'judul': 'Korelasi peringkat', 'isi': 'Nilai mendekati nol berarti dua peringkat nyaris tak berhubungan.'},
         {'ikon': 'kalender', 'judul': 'Data kejadian', 'isi': 'Logbook Pusdalops, basis perhitungan korelasi 2014–2020.'}]}},

    {'jenis': 'temuan-grafik', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'rasio': 0.42,
     'pesan': 'Kendala lapangan', 'cut_off': False,
     'judul': f'Akses jalan terputus tercatat {t("k.akses")} kali, terbanyak di antara kendala lapangan yang berulang dan bisa disiapkan sebelumnya',
     'grafik': {'judul_panel': 'Kendala lapangan', 'ikon': 'infrastruktur', 'judul': '**Kendala**, entri logbook, 2011–2026',
                'keluarga': 'netral', 'ubah': False, 'persen_batang': False, 'pembanding': False, 'seragam': True,
                'data': {'csv': c_kendala, 'kolom': [{'nama': 'kendala', 'kepala': 'Kendala'}, {'nama': 'entri', 'kepala': 'Entri', 'fmt': '0'}],
                         'keyakinan': 'resmi', 'sumber': S_LOG}},
     'panel': {'judul': 'Barang tidak di tempat', 'ikon': 'ringkasan', 'skala_huruf': 1.15, 'temuan': [
         tm('Temuan A.1', 'infrastruktur', f'**Air** {t("k.air")} entri, **logistik** {t("k.logistik")}, **alat berat** {t("k.alat")}, **gambut** {t("k.gambut")}.'),
         tm('Temuan A.2', 'kapasitas', f'**Personel** {t("k.personel")} entri; satu entri bisa memuat beberapa kategori kendala.'),
         tm('Temuan A.3', 'prabencana', '**Bisa disiapkan.** Kendala sama muncul tiap musim. Stok dan kontrak siaga bisa diatur lebih dulu.', 'asumsi-kebijakan'),
         tm('Temuan A.4', 'telepon', f'**Sinyal putus** {t("k.sinyal")} entri; desa tanpa sinyal tidak dapat melapor.')]},
     'pita': {'label': 'Dibaca untuk tindakan', 'nada': 'aksi', 'skala': 1.7, 'kolom': [
         {'ikon': 'infrastruktur', 'judul': 'Akses', 'isi': f'{t("desa.isolir")} desa terisolir berulang masuk peta jalan putus.'},
         {'ikon': 'telepon', 'judul': 'Sinyal', 'isi': 'Desa tanpa sinyal mendapat radio mesh atau satelit.'},
         {'ikon': 'prabencana', 'judul': 'Barang', 'isi': 'Stok penyangga dan alat berat disiagakan sebelum musim.'}]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.62,
     'pesan': 'Pola musim', 'cut_off': False,
     'judul': f'Puncak banjir dan longsor di Maluku jatuh pada Juni–Agustus ({t("musim.maluku", "|persen")} kejadian), bukan musim hujan November–Maret',
     'grup': [{'pil': 'Kejadian Juni–Agustus', 'nada': 'data', 'ikon': 'kalender', 'kartu': [
         kt(t('musim.maluku', '|persen'), 'Maluku', 'kalender'), kt(t('musim.malut', '|persen'), 'Maluku Utara', 'kalender'),
         kt(t('musim.sultra', '|persen'), 'Sulawesi Tenggara', 'kalender'), kt(t('musim.sulteng', '|persen'), 'Sulawesi Tengah', 'kalender')]}],
     'utama': {'judul': 'Pola musim per daerah', 'ikon': 'kalender', 'banding': {
         'skala_huruf': 1.15, 'kiri': {'judul': 'Pola'}, 'kanan': {'judul': 'Implikasi'},
         'baris': [{'label': r[0], 'kiri': r[1], 'kanan': r[2]} for r in [list(x) for x in csv.reader((AKAR / c_musim).open(encoding='utf-8'))][1:]]}},
     'panel': {'judul': 'Satu SOP tidak cukup', 'ikon': 'ringkasan', 'skala_huruf': 1.12, 'temuan': [
         tm('Temuan A.1', 'kalender', '**Siaga menyesuaikan daerah.** Kalender kejadian per daerah menggantikan satu jadwal nasional.', 'asumsi-kebijakan'),
         tm('Temuan A.2', 'karhutla', f'**Karhutla di musim hujan.** Aceh mencatat {t("aceh.kej")} dari {t("aceh.tot")} kejadian pada Desember–Maret; Riau {t("riau.kej")} dari {t("riau.tot")}.'),
         tm('Temuan A.3', 'banjir', '**Rantai bencana.** Banjir memicu siaga longsor otomatis di kab yang sama.', 'asumsi-kebijakan')]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Celah riset', 'cut_off': False,
     'judul': f'Dari {t("makalah")} makalah yang dicocokkan, {t("lama.banjir")} kab langganan banjir dan {t("lama.longsor")} longsor (basis 2014–2020) masih menyisakan daerah tanpa satu pun makalah',
     'tabel': {'judul_panel': 'Daerah langganan dan celah riset, basis 2014–2020', 'ikon': 'sekolah', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.4,
               'data': {'csv': c_celah, 'kolom': [{'nama': 'jenis', 'kepala': 'Jenis'},
                                                  {'nama': 'kab', 'kepala': 'Kab langganan', 'fmt': '0'}, {'nama': 'tanpa', 'kepala': 'Tanpa makalah', 'fmt': '0'},
                                                  {'nama': 'celah', 'kepala': 'Celah teratas', 'rata': 'l', 'bobot': 2.4}],
                        'keyakinan': 'terverifikasi', 'sumber': S_INS}},
     'panel': {'judul': 'Arah riset dan kejadian', 'ikon': 'ringkasan', 'skala_huruf': 0.98, 'temuan': [
         tm('Temuan A.1', 'longsor', f'**Brebes** mencatat {t("brebes")} longsor dan **Kota Batu** {t("batu")}, riset longsornya sedikit.'),
         tm('Temuan A.2', 'karhutla', f'**Situbondo** mencatat {t("situbondo")} kejadian karhutla, tanpa satu makalah.'),
         tm('Temuan A.3', 'wilayah', f'**Jawa Timur dan Jawa Tengah** paling kurang diteliti ({t("porsi.jatim", "|fmt=2")} dan {t("porsi.jateng", "|fmt=2")}).'),
         tm('Temuan A.4', 'sekolah', '**Agenda kampus.** Longsor Brebes dan Kota Batu; banjir Kebumen, Jepara, Sampang.', 'asumsi-kebijakan')]},
     'pita': {'label': 'Bahan riset yang sudah ada untuk longsor', 'nada': 'aksi', 'skala': 1.3, 'kolom': [
         {'ikon': 'sekolah', 'judul': 'Kab. Bogor', 'isi': f'{t("bogor.mk")} makalah, termasuk jalur evakuasi dan sosialisasi mitigasi di Citeureup.'},
         {'ikon': 'sekolah', 'judul': 'Magelang dan Banyumas', 'isi': f'{t("magelang.mk")} dan {t("banyumas.mk")} makalah: peta rawan longsor dan investigasi bidang gelincir.'},
         {'ikon': 'peringatan', 'judul': 'Kab. Cilacap', 'isi': f'{t("cilacap.ls")} longsor tetapi hanya {t("cilacap.mk")} makalah longsor.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.58,
     'pesan': 'Daerah prioritas', 'cut_off': False,
     'judul': f'{t("prioritas.kab")} kab/kota langganan (basis 2014–2020) berkapasitas rendah menjadi kandidat pertama stok penyangga dan pendampingan BPBD, Aceh mendominasi',
     'grup': [{'pil': 'Daftar kerja', 'nada': 'data', 'ikon': 'wilayah', 'kartu': [
         kt(t('prioritas.kab'), 'langganan dan berkapasitas rendah', 'wilayah', 'oranye')]}],
     'tabel': {'judul_panel': 'Dua belas kab/kota teratas', 'ikon': 'wilayah', 'peringkat': True, 'sel_dua_baris': True, 'skala_huruf': 1.4,
               'data': {'csv': c_prior, 'kolom': [{'nama': 'daerah', 'kepala': 'Daerah', 'bobot': 1.3}, {'nama': 'provinsi', 'kepala': 'Provinsi', 'rata': 'l', 'bobot': 1.2},
                                                  {'nama': 'jenis', 'kepala': 'Langganan', 'rata': 'l', 'bobot': 1.2}],
                        'keyakinan': 'terverifikasi', 'sumber': S_INS}},
     'panel': {'judul': 'Daerah senyap akhir Oktober', 'ikon': 'telepon', 'skala_huruf': 1.36, 'temuan': [
         tm('Temuan A.1', 'telepon', f'**Kab/kota senyap.** Ada {t("senyap.kab")} yang punya hotspot {t("senyap.min")} atau lebih dalam {t("senyap.hari")} hari tanpa episode karhutla di laporan harian (acuan akhir Oktober 2026).'),
         tm('Temuan A.2', 'karhutla', f'**Kutai Kartanegara** {t("senyap.kukar")} hotspot, Mappi {t("mappi")}, Dogiyai {t("dogiyai")}, Mojokerto {t("mojokerto")}.'),
         tm('Temuan A.3', 'regulasi', f'**Batas.** Laporan warga dan BPBD di D1 belum terbaca oleh pipeline hotspot; laporan harian terbit dengan jeda {t("jeda.min")}–{t("jeda.max")} hari.')]}},

    # ---- Bagian 2: strategi dan teknologi ----
    {'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Strategi tiga lapis',
     'judul': f'Strategi: {t("lapis")} lapis aksi antisipatif di desa langganan, dari kepastian musim', 'cut_off': False, 'skala_isi': 1.1,
     'kartu': [
         {'label': 'Siapkan', 'ikon': 'prabencana', 'warna': 'navy', 'judul': 'Daftar dan stok', 'isi': 'Daftar desa langganan terisolir; saran stok penyangga per bulan.'},
         {'label': 'Siapkan', 'ikon': 'infrastruktur', 'warna': 'navy', 'judul': 'Alat berat dan air', 'isi': 'Kontrak siaga alat berat; sumber air pemadaman disiapkan.'},
         {'label': 'Siapkan', 'ikon': 'regulasi', 'warna': 'navy', 'judul': 'SOP pra-musim', 'isi': 'SIPPA di karhutla langganan; SOP sebulan sebelum musim.'},
         {'label': 'Mata desa', 'ikon': 'telepon', 'warna': 'oranye', 'judul': 'Pelapor desa', 'isi': 'Pelapor lewat WhatsApp dengan pengingat lanjutan sehari dan tiga hari sesudahnya.'},
         {'label': 'Mata desa', 'ikon': 'peringatan', 'warna': 'oranye', 'judul': 'Daerah senyap', 'isi': 'Daftar harian sinyal tanpa laporan, ditelepon Pusdalops.'},
         {'label': 'Mata desa', 'ikon': 'data', 'warna': 'oranye', 'judul': 'Sensor dan radio', 'isi': 'Sensor lapangan; radio mesh LoRa untuk desa tanpa sinyal.'},
         {'label': 'Catatan baku', 'ikon': 'ringkasan', 'warna': 'navy', 'judul': 'Form logbook baku', 'isi': 'Masukan terstruktur, laporan harian otomatis, pemeriksa angka wajar.'},
         {'label': 'Catatan baku', 'ikon': 'kalender', 'warna': 'navy', 'judul': 'Kalibrasi tiap musim', 'isi': 'Kalender risiko dikalibrasi ulang tiap akhir musim.'},
     ],
     'arahan': {'label': 'PRINSIP', 'ikon': 'ringkasan', 'teks': 'Bertindak pada kepastian musim di desa langganan; prakiraan harian dan sensor dipakai untuk eskalasi.'}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.9,
     'pesan': 'Masalah dan tindakan', 'cut_off': False,
     'judul': 'Setiap lapis strategi menjawab satu masalah yang terbukti di logbook',
     'utama': {'judul': 'Masalah dan tindakan', 'ikon': 'data', 'banding': {
         'skala_huruf': 1.3, 'kiri': {'judul': 'Masalah dan bukti'}, 'kanan': {'judul': 'Tindakan'},
         'baris': [
             {'label': 'Terlambat', 'kiri': f'Kebakaran lahan Jawa hanya terlapor pada {t("jawa.lapor.min")}–{t("jawa.lapor.max", "|persen")} hari-hotspot.', 'kanan': 'Pelapor desa dan daftar daerah senyap harian.'},
             {'label': 'Sepotong', 'kiri': 'Median satu kejadian dilaporkan sekali; korban terhitung ganda.', 'kanan': 'Pengingat lanjutan sehari dan tiga hari sesudahnya dari form logbook baku.'},
             {'label': 'Terputus', 'kiri': f'Akses putus {t("k.akses")} entri; sinyal putus {t("k.sinyal")}.', 'kanan': 'Peta desa terisolir dan radio mesh atau satelit di desa itu.'},
             {'label': 'Tidak di tempat', 'kiri': f'Logistik dan BBM {t("k.logistik")}, air pemadaman {t("k.air")}, alat berat {t("k.alat")}.', 'kanan': 'Stok penyangga dan kontrak siaga alat berat sebelum musim.'},
             {'label': 'Prakiraan lemah', 'kiri': f'Banjir dari hujan gagal di uji 2022–2025 (ETS gabungan {t("ets", "|fmt=3")}); longsor AUC {t("auc.longsor", "|fmt=2")}.', 'kanan': 'Bertindak pada kepastian musim; prakiraan untuk eskalasi.'},
             {'label': 'Peta tak cukup', 'kiri': f'Korelasi peringkat risiko dan kejadian {t("kor.banjir", "|fmt=2")}–{t("kor.longsor", "|fmt=2")}.', 'kanan': 'Lapisan frekuensi nyata ditambahkan ke perencanaan.'}]}},
     'sumber': S_INS},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'deskriptif', 'rasio': 0.9,
     'pesan': 'Teknologi per bencana', 'cut_off': False,
     'judul': 'Teknologi per bencana: firmware lima jenis alat terkompilasi, belum diuji di perangkat keras',
     'tabel': {'judul_panel': 'Alat dan tugas dengan perkiraan biaya', 'ikon': 'infrastruktur', 'peringkat': False, 'sel_dua_baris': True,
               'data': {'csv': c_tek, 'kolom': [{'nama': 'bencana', 'kepala': 'Bencana'}, {'nama': 'alat', 'kepala': 'Alat', 'rata': 'l', 'bobot': 1.8},
                                                {'nama': 'tugas', 'kepala': 'Tugas', 'rata': 'l', 'bobot': 2.0}, {'nama': 'biaya', 'kepala': 'Perkiraan biaya', 'rata': 'l', 'bobot': 1.3}],
                        'keyakinan': 'asumsi-kebijakan', 'sumber': S_RAN}},
     'pita': {'label': 'Status perangkat lunak', 'nada': 'data', 'kolom': [
         {'ikon': 'data', 'judul': 'Siap', 'isi': 'Firmware kelima jenis terkompilasi untuk tiga jalur kirim; gateway dan simulator berjalan.'},
         {'ikon': 'regulasi', 'judul': 'Uji otomatis', 'isi': 'Tiga puluh uji otomatis lulus tanpa perangkat keras.'},
         {'ikon': 'peringatan', 'judul': 'Belum teruji', 'isi': 'Belum diuji di perangkat keras; ambang titik awal dikalibrasi per lokasi.'}]}},

    # ---- Bagian 3: peta kolaborasi ----
    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.9,
     'pesan': 'Komponen ke pihak', 'cut_off': False,
     'judul': 'Enam kelompok kebutuhan dipetakan ke pihak yang kita ajak bekerja sama',
     'utama': {'judul': 'Komponen dan pihak utama', 'ikon': 'lembaga', 'banding': {
         'skala_huruf': 1.25, 'kiri': {'judul': 'Komponen strategi'}, 'kanan': {'judul': 'Pihak utama, urut prioritas'},
         'baris': [{'label': lb, 'kiri': r[0], 'kanan': r[1]} for lb, r in zip(['Sensor', 'Gambut', 'Komunikasi', 'Data', 'Dana', 'Riset'], [list(x) for x in csv.reader((AKAR / c_komp).open(encoding='utf-8'))][1:])]}},
     'pita': {'label': 'Prinsip', 'nada': 'data', 'kolom': [
         {'ikon': 'lembaga', 'judul': 'Kita adalah BNPB dan BPBD', 'isi': 'Daftar ini memuat pihak lain yang diajak bekerja sama.'},
         {'ikon': 'regulasi', 'judul': 'Hanya butir terverifikasi', 'isi': 'Butir yang belum terverifikasi ditandai perlu konfirmasi.'}]},
     'sumber': S_PETA},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'deskriptif', 'seri': 'mitra', 'rasio': 0.97,
     'pesan': 'Mitra perguruan tinggi', 'cut_off': False, 'skala_huruf': 1.0,
     'judul': 'Perguruan tinggi: UGM untuk sensor longsor, ITB untuk banjir berbasis dampak, IPB untuk gambut',
     'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'sekolah', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.1,
               'data': {'csv': c_pt, 'kolom': KOL_MITRA, 'keyakinan': 'terverifikasi', 'sumber': 'Peta kolaborasi BNPB, 1 Nov 2026; laman UGM dan IPB'}},
     'pita': {'label': 'Prioritas', 'nada': 'data', 'kolom': [
         {'ikon': 'kalender', 'judul': 'Sekarang', 'isi': 'UGM untuk sensor longsor di kluster pilot Jawa Tengah.'},
         {'ikon': 'kalender', 'judul': 'Musim ini', 'isi': 'ITB untuk ambang banjir berbasis dampak.'},
         {'ikon': 'kalender', 'judul': 'Tahun depan', 'isi': 'IPB, UPR, Unsri, Unri, ULM, Untan, sebelum kemarau 2027.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'deskriptif', 'seri': 'mitra', 'rasio': 0.97,
     'pesan': 'Mitra kementerian satu', 'cut_off': False,
     'judul': 'Kementerian dan lembaga, bagian pertama: BMKG dan Kementerian PU menyimpan data cuaca dan sungai; BRGM dan Komdigi menyimpan data gambut dan jaringan',
     'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'lembaga', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.1,
               'data': {'csv': c_kl1, 'kolom': KOL_MITRA, 'keyakinan': 'terverifikasi', 'sumber': S_PETA}},
     'pita': {'label': 'Cara mendekati', 'nada': 'data', 'kolom': [
         {'ikon': 'situs', 'judul': 'Surat satu halaman', 'isi': 'Per instansi, dilampiri baris tabel permintaan data yang relevan.'},
         {'ikon': 'telepon', 'judul': 'Narahubung', 'isi': 'Telepon tiap unit dalam dua minggu untuk menunjuk narahubung dan format.'},
         {'ikon': 'regulasi', 'judul': 'PKS menyusul', 'isi': 'Setelah data pertama masuk, untuk data berkala lewat API.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'deskriptif', 'seri': 'mitra', 'rasio': 0.97,
     'pesan': 'Mitra kementerian dua', 'cut_off': False,
     'judul': 'Kementerian dan lembaga, bagian kedua: PVMBG dan BPS memberi data; Kemenkeu dan Kemenko PMK memberi jalur pendanaan dan mandat',
     'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'lembaga', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.1,
               'data': {'csv': c_kl2, 'kolom': KOL_MITRA, 'keyakinan': 'terverifikasi', 'sumber': S_PETA}},
     'pita': {'label': 'Prinsip permintaan', 'nada': 'data', 'kolom': [
         {'ikon': 'data', 'judul': 'Data agregat', 'isi': 'Per desa atau kecamatan; data individu korban tidak diminta.'},
         {'ikon': 'regulasi', 'judul': 'Kunci wilayah', 'isi': 'Kode wilayah Kemendagri dipakai untuk menggabung semua data.'},
         {'ikon': 'situs', 'judul': 'Surat dahulu', 'isi': 'Surat dinas sebelum PKS untuk data yang sudah ada di portal.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'seri': 'mitra', 'rasio': 0.97,
     'pesan': 'Mitra BUMN dan swasta', 'cut_off': False,
     'judul': f'BUMN dan swasta: operator seluler dan Starlink menjawab desa blank spot, {t("blank.spot")} desa belum terjangkau jaringan generasi keempat per Desember 2025',
     'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'telepon', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.3,
               'data': {'csv': c_swasta, 'kolom': KOL_MITRA, 'keyakinan': 'terverifikasi', 'sumber': 'Komdigi dikutip detik, 10 Des 2025; peta kolaborasi BNPB'}},
     'pita': {'label': 'Catatan bukti', 'nada': 'data', 'skala': 1.6, 'kolom': [
         {'ikon': 'peringatan', 'judul': 'Cell broadcast', 'isi': 'Butuh operator dan izin Komdigi; status 2026 belum dikonfirmasi.'},
         {'ikon': 'wilayah', 'judul': 'Radio mesh', 'isi': 'Medan jadi pembatas utama; survei jangkauan dulu.'},
         {'ikon': 'telepon', 'judul': 'Starlink', 'isi': 'Tarif lembaga belum diketahui; gratis untuk korban.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'deskriptif', 'seri': 'mitra', 'rasio': 0.97,
     'pesan': 'Mitra internasional', 'cut_off': False,
     'judul': 'Mitra internasional dan nirlaba: IFRC dan PMI paling dekat karena protokol aksi dini banjir sudah berjalan',
     'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'lembaga', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.1,
               'data': {'csv': c_intl, 'kolom': KOL_MITRA, 'keyakinan': 'terverifikasi', 'sumber': 'IFRC dan PMI, 31 Mar 2026; peta kolaborasi BNPB'}},
     'pita': {'label': 'Catatan bukti', 'nada': 'data', 'kolom': [
         {'ikon': 'banjir', 'judul': 'Google', 'isi': 'Cakupan Indonesia untuk prakiraan banjir sungai belum dikonfirmasi.'},
         {'ikon': 'data', 'judul': 'PMI', 'isi': 'Melaporkan akses data prakiraan terinci terbatas, pembaruan April 2026.'},
         {'ikon': 'sekolah', 'judul': 'WFP', 'isi': 'Kajian integrasi aksi antisipatif di Indonesia sudah terbit.'}]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.9,
     'pesan': 'Wahana hukum', 'cut_off': False,
     'judul': 'Tiga wahana kerja sama, dari surat permintaan data sampai PKS, dipilih menurut jenis kebutuhan',
     'utama': {'judul': 'Wahana dan kegunaan', 'ikon': 'regulasi', 'banding': {
         'skala_huruf': 1.4, 'kiri': {'judul': 'Isi'}, 'kanan': {'judul': 'Dipakai untuk'},
         'baris': [{'label': r[0], 'kiri': r[1], 'kanan': r[2]} for r in [list(x) for x in csv.reader((AKAR / c_wahana).open(encoding='utf-8'))][1:]]}},
     'pita': {'label': 'Landasan', 'nada': 'data', 'kolom': [
         {'ikon': 'regulasi', 'judul': 'Perpres 39/2019', 'isi': 'Data di Portal SDI diakses antarinstansi tanpa biaya dan tanpa MoU.'},
         {'ikon': 'regulasi', 'judul': 'UU 24/2007', 'isi': 'BNPB menyelenggarakan penanggulangan bencana; Pasal 26 menjamin hak atas informasi.'},
         {'ikon': 'data', 'judul': 'Data agregat saja', 'isi': 'Kita meminta data agregat per desa; data individu korban tidak diminta.'}]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'seri': 'data', 'rasio': 0.97,
     'pesan': 'Permintaan data satu', 'cut_off': False,
     'judul': 'Permintaan data minggu pertama, bagian pertama: cuaca, sungai, gerakan tanah, dan peta dasar',
     'tabel': {'judul_panel': 'Enam dari dua belas permintaan', 'ikon': 'situs', 'peringkat': False, 'sel_dua_baris': True,
               'data': {'csv': c_data1, 'kolom': DATA_COLS, 'keyakinan': 'terverifikasi', 'sumber': 'Permintaan data konkret BNPB, 1 Nov 2026'}}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'seri': 'data', 'rasio': 0.97,
     'pesan': 'Permintaan data dua', 'cut_off': False,
     'judul': 'Permintaan data minggu pertama, bagian kedua: data wilayah dan jaringan; data dana dan sensor',
     'tabel': {'judul_panel': 'Enam dari dua belas permintaan', 'ikon': 'situs', 'peringkat': False, 'sel_dua_baris': True,
               'data': {'csv': c_data2, 'kolom': DATA_COLS, 'keyakinan': 'terverifikasi', 'sumber': 'Permintaan data konkret BNPB, 1 Nov 2026'}}},

    # ---- Bagian 4: pilot dan langkah ----
    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'rasio': 0.72,
     'pesan': 'Pilot longsor', 'cut_off': False,
     'judul': f'Pilot longsor di {t("pilot.kab")} kabupaten Jawa Tengah, November–Maret, menguji enam komponen bersama mitra',
     'grup': [{'pil': 'Kluster pilot', 'nada': 'data', 'ikon': 'longsor', 'kartu': [
         kt(t('pilot.kab'), 'kabupaten pilot', 'wilayah'), kt('Nov–Mar', 'musim hujan 2026/2027', 'kalender', 'oranye')]}],
     'utama': {'judul': 'Komponen pilot dan mitra', 'ikon': 'longsor', 'banding': {
         'skala_huruf': 1.22, 'kiri': {'judul': 'Isi'}, 'kanan': {'judul': 'Mitra'},
         'baris': [{'label': r[0], 'kiri': r[1], 'kanan': r[2]} for r in [list(x) for x in csv.reader((AKAR / c_pilot).open(encoding='utf-8'))][1:]]}},
     'panel': {'judul': 'Lima kabupaten', 'ikon': 'wilayah', 'skala_huruf': 0.9, 'temuan': [
         tm('Temuan D.1', 'wilayah', '**Banjarnegara, Banyumas, Cilacap, Magelang, Temanggung.**', 'asumsi-kebijakan'),
         tm('Temuan D.2', 'longsor', f'**Alasan.** Cilacap dan Magelang mencatat {t("longsor.200")}-an longsor; Magelang dan Banyumas punya bahan riset.'),
         tm('Temuan D.3', 'regulasi', '**Pemilik sistem** menjalankan migrasi produksi dan penyimpanan kunci alat.', 'asumsi-kebijakan'),
         tm('Temuan D.4', 'data', '**Data awal.** Logbook 2011–2026 dan stasiun hujan BMKG sebagai bahan kalibrasi.', 'asumsi-kebijakan')]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Ukuran keberhasilan', 'cut_off': False,
     'judul': f'Pilot dianggap berhasil bila median laporan per kejadian naik dari {t("median.lapor")} menjadi {t("pilot.target")} atau lebih',
     'utama': {'judul': 'Empat ukuran keberhasilan', 'ikon': 'data', 'banding': {
         'skala_huruf': 1.55, 'kiri': {'judul': 'Kini'}, 'kanan': {'judul': 'Target pilot'},
         'baris': [{'label': r[0], 'kiri': r[1], 'kanan': r[2]} for r in [list(x) for x in csv.reader((AKAR / c_ukur).open(encoding='utf-8'))][1:]]}},
     'panel': {'judul': 'Cara menilai', 'ikon': 'ringkasan', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan D.1', 'data', '**Nilai awal dulu.** Tiga ukuran belum punya nilai awal; pilot mengukurnya pada bulan pertama.', 'asumsi-kebijakan'),
         tm('Temuan D.2', 'regulasi', '**Uji prospektif.** Hasil dibandingkan dengan kabupaten non-pilot di provinsi yang sama.', 'asumsi-kebijakan'),
         tm('Temuan D.3', 'sekolah', '**Terbuka bagi kampus.** Hasil ditulis bersama mitra riset.', 'asumsi-kebijakan'),
         tm('Temuan D.4', 'data', '**Dasbor.** Status alat dan laporan per kabupaten tampil untuk semua mitra.', 'asumsi-kebijakan')]},
     'sumber': S_RAN},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.9,
     'pesan': 'Langkah 30, 60, 90 hari', 'cut_off': False,
     'judul': f'Langkah {t("h.30")}, {t("h.60")}, dan {t("h.90")} hari: dari surat data ke perjanjian dan pilot',
     'utama': {'judul': 'Kegiatan dan keluaran', 'ikon': 'kalender', 'banding': {
         'skala_huruf': 1.5, 'kiri': {'judul': 'Kegiatan'}, 'kanan': {'judul': 'Keluaran'},
         'baris': [
             {'label': 'Bulan pertama', 'kiri': 'Kirim surat data ke tujuh instansi dan rapat dengan empat mitra.', 'kanan': 'Narahubung tiap instansi; draf PKS UGM; pemicu EAP disamakan.'},
             {'label': 'Bulan kedua', 'kiri': 'Tindak lanjut telepon; survei jangkauan radio mesh; pasang pelapor desa dan form logbook di lima kabupaten.', 'kanan': 'Data pertama masuk; lokasi sensor dan gateway ditetapkan.'},
             {'label': 'Bulan ketiga', 'kiri': 'Tanda tangan MoU dan PKS prioritas; pasang sensor di desa terpilih; ukur nilai awal pilot.', 'kanan': 'Pilot berjalan penuh dan dasbor status alat tampil.'}]}},
     'pita': {'label': 'Prioritas', 'nada': 'aksi', 'kolom': [
         {'ikon': 'kalender', 'judul': 'Sekarang', 'isi': 'Sebelum Desember 2026: BMKG, PU, UGM, PMI dan IFRC, Komdigi.'},
         {'ikon': 'kalender', 'judul': 'Musim ini', 'isi': 'Hingga Maret 2027: BRGM, ITB, operator seluler, WFP.'},
         {'ikon': 'kalender', 'judul': 'Tahun depan', 'isi': 'Kemarau 2027: IPB dan kampus gambut, UNDP, uji sensor gas.'}]}},

    {'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'seri': 'minta',
     'pesan': 'Yang diminta dari mitra', 'cut_off': False, 'skala_huruf': 1.25,
     'judul': 'Yang diminta dari mitra pada tahap pertama',
     'rekomendasi': [
         {'kode': 'M-1', 'jenis': 'data', 'langkah': 'Tunjuk narahubung data', 'waktu': '100-hari', 'rincian': 'Instansi menunjuk pejabat untuk dua belas permintaan data minggu pertama.', 'lembaga': ['BMKG, PU, BPS, PVMBG']},
         {'kode': 'M-2', 'jenis': 'infrastruktur', 'langkah': 'Sepakati uji sensor longsor', 'waktu': '100-hari', 'rincian': 'Bacaan alat terpasang dan uji pasang di kluster pilot Jawa Tengah.', 'lembaga': ['UGM']},
         {'kode': 'M-3', 'jenis': 'regulasi', 'langkah': 'Samakan pemicu EAP', 'waktu': '100-hari', 'rincian': 'Pemicu protokol aksi dini banjir disatukan dengan daftar desa langganan.', 'lembaga': ['PMI, IFRC']},
         {'kode': 'M-4', 'jenis': 'infrastruktur', 'langkah': 'Buka data jaringan', 'waktu': '100-hari', 'rincian': 'Daftar blank spot berkoordinat dan jalur cell broadcast untuk desa langganan.', 'lembaga': ['Komdigi, BAKTI']},
         {'kode': 'M-5', 'jenis': 'pembiayaan', 'langkah': 'Rancang pemicu pendanaan', 'waktu': '2026-2027', 'rincian': 'Masukan desain pemicu antisipatif dari Pooling Fund Bencana dan mitra donor.', 'lembaga': ['Kemenkeu, WFP']},
     ]},

    {'jenis': 'penutup', 'laporan': 'Aksi Antisipatif Desa Langganan: usulan kerja sama'},

    # ---- Lampiran ----
    {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Daftar sumber klaim luar'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Sumber dan status verifikasi', 'kode': 'AA', 'maks_baris': 24,
     'judul': 'Sumber klaim luar yang dipakai dan status verifikasinya', 'judul_daftar': 'Sumber dan status verifikasi',
     'data': {'csv': c_lamp, 'kolom': [{'nama': 'klaim', 'kepala': 'Klaim', 'rata': 'l', 'bobot': 3.6}, {'nama': 'sumber', 'kepala': 'Sumber', 'rata': 'l', 'bobot': 2.0},
                                       {'nama': 'status', 'kepala': 'Status', 'rata': 'l', 'bobot': 2.2}],
              'keyakinan': 'terverifikasi', 'sumber': 'Peta kolaborasi BNPB, 1 Nov 2026'}},
]
_PI = next(i for i, x in enumerate(SLIDE) if x.get('jenis') == 'penutup')
_prof = []
for kunci, d in PROFIL.items():
    kartu = []
    for key, label, ikon in d['kartu']:
        opsi = '|persen' if key == 'bts.padam' else ''
        nilai = ('CHF ' + t(key)) if key == 'eap.chf' else t(key, opsi)
        kartu.append(kt(nilai, label, ikon, 'oranye' if len(kartu) == 1 else 'navy'))
    _prof.append({'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'seri': 'profil', 'rasio': 0.66, 'cut_off': False,
                  'pesan': 'Profil ' + kunci, 'judul': d['judul'], 'sumber': 'Peta kolaborasi BNPB, 1 Nov 2026; laman resmi lembaga',
                  'grup': [{'pil': 'Angka kunci', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': kartu}],
                  'tabel': {'judul_panel': 'Peran dan pertukaran', 'ikon': 'lembaga', 'peringkat': False, 'sel_dua_baris': True, 'skala_huruf': 1.4,
                            'data': {'csv': c_ap[kunci], 'kolom': [{'nama': 'aspek', 'kepala': 'Aspek', 'bobot': 0.9}, {'nama': 'isi', 'kepala': 'Isi', 'rata': 'l', 'bobot': 3.4}],
                                     'keyakinan': 'terverifikasi', 'sumber': S_PETA}},
                  'panel': {'judul': 'Langkah pertama', 'ikon': 'kalender', 'skala_huruf': 1.8,
                            'temuan': [tm('Temuan D.%d' % (n + 1), 'kalender', x, 'asumsi-kebijakan') for n, x in enumerate(d['langkah'])]}})
SLIDE[_PI:_PI] = _prof
_iL = next(i for i, x in enumerate(SLIDE) if x.get('jenis') == 'pembatas-lampiran')

BAGIAN = [('Bencana berulang', 'Diagnosis dari Logbook', 'Diagnosis'), ('Strategi tiga lapis', 'Strategi dan Teknologi', 'Strategi'),
          ('Komponen ke pihak', 'Peta Kolaborasi', 'Kolaborasi'), ('Pilot longsor', 'Pilot dan Langkah', 'Pilot'), ('Profil UGM', 'Profil Mitra Utama', 'Profil')]
for n_, (pesan_, _, _) in reversed(list(enumerate(BAGIAN, 1))):
    SLIDE.insert(next(i for i, x in enumerate(SLIDE) if x.get('pesan') == pesan_), {'jenis': 'pembatas-seksi', 'bagian': n_})
SLIDE.insert(1, {'jenis': 'daftar-isi'})
SLIDE[0]['kota'] = 'Jakarta'

SPEK = {
    '_catatan': 'Usulan kerja sama aksi antisipatif desa langganan, 1 Nov 2026. Dibangun dari bangun_aksi.py.',
    'pesan_kunci': 'Bencana berulang di desa yang sama, jadi BNPB dan BPBD mengajak kampus, kementerian, BUMN dan swasta, serta mitra internasional menjalankan tiga lapis aksi antisipatif, dimulai dari pilot longsor lima kabupaten Jawa Tengah.',
    'judul_dokumen': 'Aksi Antisipatif Desa Langganan: usulan kerja sama',
    'subjek_dokumen': 'Kerja Sama Aksi Antisipatif Bencana',
    'format': 'kajian', 'bagian': [{'judul': j_, 'label': l_} for _, j_, l_ in BAGIAN],
    'kajian': 'aksi', 'tanggal': '2026-11-01', 'cut_off': '1 Nov 2026',
    'slide': SLIDE,
}

if __name__ == '__main__':
    p = AKAR / 'pustaka.json'
    pl = json.loads(p.read_text(encoding='utf-8'))
    ada = {x['id'] for x in pl}
    pl += [v for k, v in PUSTAKA.items() if k not in ada]
    p.write_text(json.dumps(pl, ensure_ascii=False, indent=1), encoding='utf-8')
    tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    tema['slide']['komponen']['bingkai']['sumber'].update({'awalan_olah': 'Pengolahan data BNPB dari', 'label_olah': 'diolah BNPB'})
    tema['kajian']['aksi'] = {
        'judul': 'Aksi Antisipatif Desa Langganan: usulan kerja sama',
        'subjudul': 'BNPB bersama Empat Kelompok Mitra Lembaga',
        'judul_pendek': 'Aksi Antisipatif Desa Langganan', 'nama_berkas': 'Aksi Antisipatif Desa Langganan {DDMMYY}',
        'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'aksi antisipatif', 'desa langganan', 'kerja sama', 'logbook Pusdalops'], 'cakupan_sampul': 'Kab/kota langganan banjir, longsor, dan karhutla di Indonesia'}
    (AKAR / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    reg_p = AKAR / 'data/angka.json'
    reg = json.loads(reg_p.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/aksi-011126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SLIDE)} slide')
