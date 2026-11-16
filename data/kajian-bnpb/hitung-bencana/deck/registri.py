"""Registri angka, tema, pustaka, kredit proyek hitung-bencana (12 Nov 2026). Dimuat oleh bangun_spek_hitung.py."""
import csv, json
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
D = AKAR / 'data' / 'hitung'
D.mkdir(parents=True, exist_ok=True)

SDIBI = 'DIBI BNPB, tarikan 12 November 2026, diolah'
SLB = 'Logbook Pusdalops BNPB, Januari sampai Oktober 2026, diolah'
SHS = 'Hotspot VIIRS, 15 Oktober sampai 11 November 2026, diolah'
SKJ = 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana, BNPB, 12 November 2026'
SSIM = 'Simulasi kajian pada data DIBI dan logbook, BNPB, 12 November 2026'


def tulis_csv(nama, kolom, baris):
    with open(D / nama, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kolom)
        w.writerows(baris)
    return f'data/hitung/{nama}'


JUDUL = 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana'
KREDIT = 'Foto: BNPB, banjir merendam permukiman, laporan situasi harian 17 Okt 2026'
KR_GBR = 'Gambar: tim kajian BNPB, 12 Nov 2026'


def tulis_tema():
    tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    for k in ('tinggi-banjir', 'tinggi-banjir-ringkas', 'alur-pks'):
        tema['kajian'].pop(k, None)
    basis = {'subjudul': 'Cara menghitung satu kejadian dan menilai besarnya untuk Satu Data Bencana',
             'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
             'kata_kunci': ['BNPB', 'kejadian bencana', 'DIBI', 'Juklak', 'klasifikasi', 'Satu Data Bencana'],
             'cakupan_sampul': 'DIBI, logbook Pusdalops, dan hotspot VIIRS'}
    tema['kajian']['hitung-bencana'] = dict(basis, judul=JUDUL, judul_pendek='Kajian Penghitungan Kejadian Bencana',
                                            nama_berkas='Deck Kajian Penghitungan dan Klasifikasi Kejadian Bencana {DDMMYY}')
    tema['kajian']['hitung-bencana-ringkas'] = dict(basis, judul=JUDUL, judul_pendek='Ringkasan Kajian Penghitungan Kejadian Bencana',
                                                    nama_berkas='Deck Ringkas Kajian Penghitungan dan Klasifikasi Kejadian Bencana {DDMMYY}')
    (AKAR / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'kredit.json').write_text(json.dumps([{'file': 'sampul-banjir.jpg', 'penulis': 'BNPB, banjir merendam permukiman, laporan situasi harian 17 Okt 2026', 'lisensi': 'dikutip dari pemberitaan'}],
                                                 ensure_ascii=False, indent=1), encoding='utf-8')


def pus(id_, penulis, singkat, tahun, judul, url, jenis='document', catatan=''):
    return {'id': id_, 'type': jenis, 'author': [{'literal': penulis, 'singkatan': singkat}], 'issued': {'date-parts': [[tahun]]},
            'title': judul, 'URL': url, 'verifikasi': 'primer', 'note': catatan}


def tulis_pustaka():
    p = [
        pus('dibi', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2026, 'Data dan Informasi Bencana Indonesia (DIBI), tarikan 12 November 2026',
            'https://dibi.bnpb.go.id', 'dataset', 'diolah kajian dari dasbor publik'),
        pus('logbook', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2026, 'Logbook harian Pusdalops BNPB, Januari sampai Oktober 2026',
            'https://bnpb.go.id', 'dataset', 'diolah sistem data BNPB'),
        pus('hotspot', 'NASA', 'NASA', 2026, 'Hotspot VIIRS (FIRMS), 15 Oktober sampai 11 November 2026',
            'https://firms.modaps.eosdis.nasa.gov', 'dataset', 'diolah sistem data BNPB'),
        pus('kajian', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2026, 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana, 12 November 2026',
            'https://bnpb.go.id', 'document', 'dokumen kajian Staf Ahli Kepala BNPB'),
        pus('juklak', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2023, 'Petunjuk Pelaksanaan Nomor 7 Tahun 2023 tentang Pengelolaan Data Kejadian Bencana',
            'https://bnpb.go.id', 'legislation', 'salinan tidak resmi; salinan resmi menunggu'),
        pus('sim', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2026, 'Simulasi kajian pada data DIBI dan logbook ',
            'https://bnpb.go.id', 'document', 'analisis kajian, 12 November 2026'),
        pus('lampiran-c', 'Badan Nasional Penanggulangan Bencana', 'BNPB', 2026, 'Lampiran C kajian: perbandingan basis data dan negara (EM-DAT, PAGER, Jepang, Amerika Serikat, Filipina)',
            'https://bnpb.go.id', 'document', 'rujukan primer tiap basis data tercantum di Lampiran C kajian'),
    ]
    (AKAR / 'pustaka.json').write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding='utf-8')


def a(nilai, satuan, pustaka='kajian', sumber=SKJ, kyk='terverifikasi'):
    return {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': kyk}


def db(nilai, satuan, sumber=SDIBI, kyk='terverifikasi'):
    return a(nilai, satuan, 'dibi', sumber, kyk)


def lb(nilai, satuan):
    return a(nilai, satuan, 'logbook', SLB)


def hs(nilai, satuan):
    return a(nilai, satuan, 'hotspot', SHS)


def sm(nilai, satuan, kyk='terverifikasi'):
    return a(nilai, satuan, 'sim', SSIM, kyk)


def bw(nilai, satuan):   # bawaan sementara kerangka (belum dikalibrasi)
    return a(nilai, satuan, 'kajian', SKJ + ', bawaan sementara', 'asumsi-kebijakan')


def jk(nilai, satuan):
    return a(nilai, satuan, 'juklak', 'Juklak BNPB Nomor 7 Tahun 2023, salinan tidak resmi', 'resmi')


ANGKA = {
    # karhutla
    'hs.kali': hs(2.2, 'kali'), 'hs.deteksi': hs(295488, 'deteksi'), 'hs.hari': hs(28, 'hari'), 'hs.kapuas.jarak': hs(8.9, 'km'),
    'hs.kapuas.a': hs(116, 'piksel'), 'hs.kapuas.b': hs(19, 'piksel'), 'hs.kapuas.gabung': hs(690, 'piksel'), 'hs.kandidat': hs(105, 'kasus'),
    'hs.gabung_p': hs(0.28, 'persen'), 'hs.piksel_ha': hs(14, 'hektare'),
    # DIBI
    'dibi.baris': db(15974, 'baris', 'DIBI BNPB, 1 Januari 2024 sampai 12 November 2026, diolah'), 'dibi.baris12': db(4185, 'baris'),
    'dibi.lolos': db(1903, 'baris'), 'dibi.tunggal': db(973, 'baris'), 'dibi.tunggal_p': db(51.1, 'persen'),
    'dibi.pecahan': db(643, 'baris'), 'dibi.kering_p': db(94.6, 'persen'), 'dibi.karhutla_p': db(1.4, 'persen'),
    'dibi.kering_n': db(129, 'baris'), 'dibi.karhutla_n': db(1208, 'baris'), 'dibi.konsen_1': db(85.5, 'persen'),
    'dibi.tanpa_mati_p': db(94.8, 'persen'), 'dibi.logika_dan': db(96.5, 'persen'),
    'dibi.ambang_min': db(67, 'baris'), 'dibi.ambang_maks': db(2484, 'baris'), 'dibi.rumah_tanpa_korban': db(28, 'baris'),
    'aceh.mati': db(246, 'jiwa', 'DIBI BNPB, banjir Aceh Utara 28 November 2025'), 'aceh.terdampak': db(739710, 'jiwa', 'DIBI BNPB, banjir Aceh Utara 28 November 2025'),
    'aceh.rumah': db(91286, 'unit', 'DIBI BNPB, banjir Aceh Utara 28 November 2025'),
    # gempa 15 Agustus 2026
    'gempa.kab': db(11, 'kabupaten'), 'gempa.pecah': db(0.091, 'kejadian'), 'gempa.manggarai': db(62, 'jiwa'), 'gempa.nagekeo': db(20, 'jiwa'),
    'gempa.rumah_mg': db(23034, 'unit'), 'gempa.rumah_ng': db(51332, 'unit'),
    # logbook
    'lb.min': lb(2809, 'kejadian'), 'lb.maks': lb(3860, 'kejadian'), 'lb.mentah': lb(8715, 'kejadian'),
    'lb.sel': lb(27, 'persen'), 'lb.sel_lolos': lb(3, 'persen'), 'lb.kumulatif': lb(12523, 'jiwa'), 'lb.terbesar': lb(609, 'jiwa'),
    'lb.susulan': lb(124, 'kejadian'), 'lb.lolos_akhir': lb(975, 'kejadian'), 'lb.susulan_p': lb(12.7, 'persen'),
    # uji kerangka
    'uji.par': sm(65, 'kasus sulit'), 'uji.penuh': sm(42, 'kasus sulit'), 'uji.sebagian': sm(23, 'kasus sulit'), 'uji.gagal': sm(0, 'kasus sulit'),
    'uji.adv': sm(26, 'kasus'), 'uji.adv_penuh': sm(17, 'kasus'), 'uji.adv_sebagian': sm(9, 'kasus'), 'uji.adv_berat': sm(13, 'kasus'),
    'uji.hubungan': sm(239, 'hubungan'), 'uji.inti': sm(8, 'kasus sulit'), 'uji.gagal_v1': sm(2, 'kasus sulit'),
    'l2.lama': sm(7535, 'kejadian'), 'l2.usulan': sm(6835, 'kejadian'), 'l2.selisih': sm(9.3, 'persen'),
    'kelas.sama': sm(98.5, 'persen'), 'kelas.berubah': sm(1.6, 'persen'), 'kelas.naik_n': sm(112, 'kejadian'), 'kelas.n_v1': sm(6812, 'kejadian'), 'tren.lolos': sm(43, 'persen'), 'kelas.pangkat': sm(10, 'kali'), 'lb.kali22': sm(22, 'kali'), 'kelas.idx_sama': sm(96.9, 'persen'), 'l2.gugur_n': sm(868, 'kejadian'), 'l2.baru_n': sm(168, 'kejadian'), 'rumah.hanya': db(273, 'catatan'), 'rumah.kecil': db(212, 'catatan'), 'lb.terakhir': lb(565, 'korban meninggal'), 'tren.i25': sm(274, 'indeks'), 'tren.i26': sm(106, 'indeks'), 'kjn.total': sm(15637, 'kejadian'), 'kelas.cocok_c': sm(52.7, 'persen'), 'kelas.besar_c': sm(38.6, 'persen'),
    'kelas.atas_min': sm(0.4, 'persen'), 'kelas.atas_maks': sm(0.9, 'persen'),
    'tren.naik': sm(174, 'persen'), 'tren.turun': sm(61, 'persen'), 'tren.bukan_2024': sm(2.5, 'persen'), 'tren.bukan_2025': sm(41.4, 'persen'),
    'tren.rumah': sm(227, 'persen'),
    # kerangka (bawaan sementara)
    'lapis': bw(3, 'lapis'), 'bagian': bw(5, 'bagian'), 'kelas4': bw(4, 'kelas'), 'tahap': bw(4, 'tahap'),
    'juk.mati': jk(1, 'jiwa'), 'juk.terdampak': jk(50, 'orang'), 'juk.rumah': jk(5, 'unit'), 'juk.lahan': jk(1, 'hektare'), 'juk.kriteria': jk(6, 'kriteria'),
    'usul.jumlah': a(15, 'perubahan', 'kajian', SKJ, 'asumsi-kebijakan'), 'usul.tampil': a(8, 'perubahan', 'kajian', SKJ, 'asumsi-kebijakan'),
    'm5.lahan': bw(2, 'hektare'), 'm5.puso': bw(10, 'hektare'),
    'gabung.jam': bw(48, 'jam'), 'gabung.selesai': bw(7, 'hari'), 'gabung.maks': bw(30, 'hari'), 'gabung.gempa': bw(90, 'hari'),
    'kab.persen': bw(10, 'persen'), 'kolom.baru': bw(11, 'kolom'), 'keputusan': a(3, 'keputusan', 'kajian', SKJ, 'asumsi-kebijakan'),
    'provinsi.uji': a(3, 'provinsi', 'kajian', SKJ, 'asumsi-kebijakan'),
    'kelompok': a(7, 'kelompok'), 'kriteria.diuji': a(3, 'kriteria'), 'kriteria.tak': a(3, 'kriteria'),
    'negara': a(5, 'negara'), 'basis': a(9, 'basis data'),
    'emdat.mati': a(10, 'jiwa', 'lampiran-c', 'EM-DAT, kriteria masuk, dikutip Lampiran C kajian', 'resmi'),
    'emdat.terdampak': a(100, 'orang', 'lampiran-c', 'EM-DAT, kriteria masuk, dikutip Lampiran C kajian', 'resmi'),
    'pager.merah': a(1000, 'jiwa', 'lampiran-c', 'USGS PAGER, dikutip Lampiran C kajian', 'resmi'),
}

ANGKA.update({
    'kriteria.ubah': a(5, 'kriteria', 'kajian', SKJ, 'asumsi-kebijakan'), 'kriteria.usul': a(6, 'kriteria', 'kajian', SKJ, 'asumsi-kebijakan'),
    'par.a': sm(18, 'kasus sulit'), 'l2.gugur': sm(700, 'kejadian'), 'pertanyaan': a(3, 'pertanyaan'),
})

ANGKA.update({
    'kriteria.ubah': a(5, 'kriteria', 'kajian', SKJ, 'asumsi-kebijakan'), 'kriteria.usul': a(6, 'kriteria', 'kajian', SKJ, 'asumsi-kebijakan'),
    'par.a': sm(18, 'kasus sulit'), 'l2.gugur': sm(700, 'kejadian'), 'pertanyaan': a(3, 'pertanyaan'),
    'gugur.terdampak': sm(48, 'orang'), 'gugur.rb': sm(2, 'unit'), 'gugur.rr': sm(3, 'unit'),
})

ANGKA.update({'lb.kali': lb(20, 'kali'), 'kelas.a_atas': sm(0.4, 'persen'), 'kelas.u_atas': sm(0.8, 'persen'), 'pembanding': a(5, 'pembanding')})

ANGKA.update({'kelas.poin': sm(1.2, 'poin')})

ANGKA.update({'kelas.a_v2': sm(0.4, 'persen')})

ANGKA.update({'ubah.baris': a(7, 'baris', 'kajian', SKJ, 'asumsi-kebijakan')})

ANGKA.update({'kelas.a_n': sm(26, 'kejadian'), 'kelas.u_n': sm(57, 'kejadian')})

ANGKA.update({'lb.baris': lb(9329, 'baris'), 'lima': a(5, 'cara')})
