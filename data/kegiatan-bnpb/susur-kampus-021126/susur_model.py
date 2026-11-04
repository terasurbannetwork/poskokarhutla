#!/usr/bin/env python3
"""Model rencana susur kampus Jawa (2 Nov 2026): 38 kampus, tiga skenario 3/7/15 hari kerja (pemilik: paling lama 15 hari), biaya SBM 2026.

Hari = hari kerja kunjungan. Tim 3 orang (1 Tenaga Ahli setara golongan IV, 2 staf golongan III), berangkat dari Jakarta,
pulang tiap akhir pekan. Biaya dua lapis: pagu (batas SBM PMK 32/2025) dan perkiraan riil (hotel 80% pagu, tiket pesawat
tarif pasar bila ada). Semua angka deck dibaca dari hasil modul ini lewat bangun_spek_susur.py.
"""
from datetime import date

TIM = 3
# ---------- SBM TA 2026, PMK 32/2025 (Rp) ----------
UH_LUAR = {'DKI': 530000, 'Banten': 370000, 'Jabar': 430000, 'Jateng': 370000, 'DIY': 420000, 'Jatim': 410000}
UH_DALAM = 210000  # DKI, dalam kota lebih dari 8 jam
HOTEL_TA = {'DKI': 1062000, 'Banten': 1301000, 'Jabar': 1366000, 'Jateng': 1286000, 'DIY': 1600000, 'Jatim': 1234000}
HOTEL_STAF = {'DKI': 730000, 'Banten': 775000, 'Jabar': 735000, 'Jateng': 810000, 'DIY': 845000, 'Jatim': 814000}
SEWA = {'DKI': 1305000, 'Banten': 1017000, 'Jabar': 988000, 'Jateng': 1347000, 'DIY': 978000, 'Jatim': 1212000}
TRANSFER_DKI = 250000  # per orang per kali, rumah ke stasiun/bandara Jakarta
PROV_NAMA = {'DKI': 'DKI Jakarta', 'Banten': 'Banten', 'Jabar': 'Jawa Barat', 'Jateng': 'Jawa Tengah', 'DIY': 'DI Yogyakarta', 'Jatim': 'Jawa Timur'}
HOTEL_RIIL = 0.8   # asumsi tarif korporat
KONTINJENSI = 0.10
PAKET_KAMPUS = 1500000   # asumsi: bahan cetak dan cenderamata per kampus audiensi
FORUM = 5000000          # asumsi: forum kampus kota, konsumsi dan bahan
LOKAKARYA = 20000000     # asumsi: lokakarya regional sehari, 100 peserta kampus dan BPBD
FORNAS = 30000000        # asumsi: forum nasional dan penandatanganan PKS kolektif di Jakarta

# ---------- tiket per orang sekali jalan: (pagu, riil, sumber) ----------
TIKET = {
    'WH': (350000, 350000, 'Whoosh premium ekonomi, tarif normal'),
    'CGK-YIA': (1134000, 1134000, 'SBM pp Jakarta ke Yogyakarta dibagi dua'),
    'YIA-CGK': (1134000, 1134000, 'SBM pp Jakarta ke Yogyakarta dibagi dua'),
    'CGK-SUB': (1337000, 1135900, 'SBM pp Jakarta ke Surabaya dibagi dua; riil rata-rata bulan termahal'),
    'SUB-CGK': (1337000, 1135900, 'SBM pp Jakarta ke Surabaya dibagi dua; riil rata-rata bulan termahal'),
    'KA-BDG-YK': (490000, 490000, 'KA Lodaya eksekutif'),
    'KA-YK-SUB': (380000, 380000, 'KA Sancaka eksekutif, batas atas'),
    'KA-JKT-SMG': (410000, 410000, 'KA Muria'),
    'KA-SMG-JKT': (410000, 410000, 'KA Muria'),
    'KRL': (8000, 8000, 'KRL Yogyakarta ke Solo'),
}
TOL = {'Jakarta ke Bandung': 82500, 'Semarang ke Solo': 92000, 'Solo ke Yogyakarta': 42500, 'Surabaya ke Malang': 76500}

# ---------- 38 kampus ----------
# kode: (nama, PTN/PTS, tingkat, kota, prov, qs2027 teks, qs angka atau None, unit kebencanaan)
K = {
    'UI': ('Universitas Indonesia', 'PTN', 'Inti', 'Depok', 'Jabar', '191', 191, 'DRRC UI'),
    'UGM': ('Universitas Gadjah Mada', 'PTN', 'Inti', 'Yogyakarta', 'DIY', '206', 206, 'PSBA UGM'),
    'Unair': ('Universitas Airlangga', 'PTN', 'Inti', 'Surabaya', 'Jatim', '276', 276, 'Magister Manajemen Bencana'),
    'ITB': ('Institut Teknologi Bandung', 'PTN', 'Inti', 'Bandung', 'Jabar', '287', 287, 'PPMB ITB'),
    'IPB': ('IPB University', 'PTN', 'Inti', 'Bogor', 'Jabar', '419', 419, 'PSB LPPM IPB'),
    'Unpad': ('Universitas Padjadjaran', 'PTN', 'Inti', 'Jatinangor', 'Jabar', '496', 496, 'Pusat Riset Kebencanaan'),
    'ITS': ('Institut Teknologi Sepuluh Nopember', 'PTN', 'Inti', 'Surabaya', 'Jatim', '497', 497, 'Puslit MKPI ITS'),
    'UB': ('Universitas Brawijaya', 'PTN', 'Inti', 'Malang', 'Jatim', '616', 616, 'Anggota GADRI'),
    'Undip': ('Universitas Diponegoro', 'PTN', 'Inti', 'Semarang', 'Jateng', '662', 662, 'Belum teridentifikasi'),
    'UNS': ('Universitas Sebelas Maret', 'PTN', 'Unggulan', 'Solo', 'Jateng', '951–1000', None, 'Belum teridentifikasi'),
    'UPI': ('Universitas Pendidikan Indonesia', 'PTN', 'Unggulan', 'Bandung', 'Jabar', '1401+', None, 'Belum teridentifikasi'),
    'UNY': ('Universitas Negeri Yogyakarta', 'PTN', 'Unggulan', 'Yogyakarta', 'DIY', '1401+', None, 'Pusat Studi Mitigasi Kebencanaan'),
    'Binus': ('Universitas Bina Nusantara', 'PTS', 'Unggulan', 'Jakarta', 'DKI', '901–950', None, 'Belum teridentifikasi'),
    'Tel-U': ('Telkom University', 'PTS', 'Unggulan', 'Bandung', 'Jabar', '1201–1400', None, 'Belum teridentifikasi'),
    'UMY': ('Universitas Muhammadiyah Yogyakarta', 'PTS', 'Unggulan', 'Yogyakarta', 'DIY', '1201–1400', None, 'PSLB UMY'),
    'Usakti': ('Universitas Trisakti', 'PTS', 'Unggulan', 'Jakarta', 'DKI', '1401+', None, 'Belum teridentifikasi'),
    'Itenas': ('Institut Teknologi Nasional', 'PTS', 'Unggulan', 'Bandung', 'Jabar', '1201–1400 (edisi 2026)', None, 'Belum teridentifikasi'),
    'UAJ': ('Universitas Katolik Indonesia Atma Jaya', 'PTS', 'Unggulan', 'Jakarta', 'DKI', '1401+ (edisi 2026)', None, 'Belum teridentifikasi'),
    'UPNVY': ('UPN Veteran Yogyakarta', 'PTN', 'Penguat', 'Yogyakarta', 'DIY', 'Tidak masuk', None, 'PSMB UPN'),
    'UAD': ('Universitas Ahmad Dahlan', 'PTS', 'Penguat', 'Yogyakarta', 'DIY', 'Tidak masuk', None, 'PSMPB UAD'),
    'UII': ('Universitas Islam Indonesia', 'PTS', 'Penguat', 'Yogyakarta', 'DIY', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Unesa': ('Universitas Negeri Surabaya', 'PTN', 'Penguat', 'Surabaya', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UM': ('Universitas Negeri Malang', 'PTN', 'Penguat', 'Malang', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Unnes': ('Universitas Negeri Semarang', 'PTN', 'Penguat', 'Semarang', 'Jateng', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Unsoed': ('Universitas Jenderal Soedirman', 'PTN', 'Penguat', 'Purwokerto', 'Jateng', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Unej': ('Universitas Jember', 'PTN', 'Penguat', 'Jember', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UINJ': ('UIN Syarif Hidayatullah Jakarta', 'PTN', 'Penguat', 'Tangerang Selatan', 'Banten', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UNJ': ('Universitas Negeri Jakarta', 'PTN', 'Penguat', 'Jakarta', 'DKI', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Untirta': ('Universitas Sultan Ageng Tirtayasa', 'PTN', 'Penguat', 'Serang', 'Banten', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UPNJ': ('UPN Veteran Jawa Timur', 'PTN', 'Penguat', 'Surabaya', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UMM': ('Universitas Muhammadiyah Malang', 'PTS', 'Penguat', 'Malang', 'Jatim', 'Tidak masuk', None, 'Jejaring MDMC'),
    'UMS': ('Universitas Muhammadiyah Surakarta', 'PTS', 'Penguat', 'Solo', 'Jateng', 'Tidak masuk', None, 'Jejaring MDMC'),
    'Petra': ('Universitas Kristen Petra', 'PTS', 'Penguat', 'Surabaya', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Unpar': ('Universitas Katolik Parahyangan', 'PTS', 'Penguat', 'Bandung', 'Jabar', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UPH': ('Universitas Pelita Harapan', 'PTS', 'Penguat', 'Tangerang', 'Banten', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'UAJY': ('Universitas Atma Jaya Yogyakarta', 'PTS', 'Penguat', 'Yogyakarta', 'DIY', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Ubaya': ('Universitas Surabaya', 'PTS', 'Penguat', 'Surabaya', 'Jatim', 'Tidak masuk', None, 'Belum teridentifikasi'),
    'Untar': ('Universitas Tarumanagara', 'PTS', 'Penguat', 'Jakarta', 'DKI', 'Tidak masuk', None, 'Belum teridentifikasi'),
}
KOTA_XY = {'Jakarta': (106.82, -6.19), 'Depok': (106.83, -6.36), 'Tangerang': (106.61, -6.23), 'Tangerang Selatan': (106.76, -6.31),
           'Serang': (106.16, -6.11), 'Bogor': (106.73, -6.56), 'Bandung': (107.61, -6.90), 'Jatinangor': (107.77, -6.93),
           'Purwokerto': (109.25, -7.40), 'Semarang': (110.42, -7.05), 'Solo': (110.82, -7.56), 'Yogyakarta': (110.39, -7.77),
           'Surabaya': (112.76, -7.29), 'Malang': (112.61, -7.95), 'Jember': (113.72, -8.16)}

HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']


def tgl(y, m, d):
    x = date(y, m, d)
    assert x.weekday() < 5, x
    return f'{HARI[x.weekday()]} {d} {BULAN[m - 1]}'


def H(tanggal, kota, pagi, siang, malam, aud=(), forum=None, lok=None, inap=None, uh=('luar', 'DKI'), tiket=(), sewa=None,
      tol=(), trf=0, fornas=False):
    return dict(tgl=tanggal, kota=kota, pagi=pagi, siang=siang, malam=malam, aud=list(aud), forum=forum, lok=lok, inap=inap,
                uh=uh, tiket=list(tiket), sewa=sewa, tol=list(tol), trf=trf, fornas=fornas)


def F(host, peserta):
    return {'host': host, 'peserta': list(peserta)}


DLM = ('dalam', 'DKI')
# ---------------------------------------------------------------- skenario 3 hari
S3 = [
    H(tgl(2026, 11, 18), 'Bandung, Jatinangor', 'Whoosh Halim 07.25; ITB pukul 09.30 (PPMB)', 'Unpad pukul 14.00 (Pusat Riset Kebencanaan)',
      'Whoosh Tegalluar ke Halim; pulang', aud=['ITB', 'Unpad'], uh=('luar', 'Jabar'), tiket=['WH', 'WH'], sewa='Jabar', trf=2),
    H(tgl(2026, 11, 19), 'Yogyakarta', 'Pesawat CGK–YIA pagi; UMY pukul 09.30 (PSLB)', 'UGM pukul 13.00 (PSBA)',
      'KA Sancaka sore ke Surabaya; menginap', aud=['UMY', 'UGM'], uh=('luar', 'DIY'), tiket=['CGK-YIA', 'KA-YK-SUB'], sewa='DIY',
      inap='Jatim', trf=1),
    H(tgl(2026, 11, 20), 'Surabaya', 'Unair pukul 08.30', 'ITS pukul 13.30 (Puslit MKPI)', 'Pesawat SUB–CGK malam; pulang',
      aud=['Unair', 'ITS'], uh=('luar', 'Jatim'), tiket=['SUB-CGK'], sewa='Jatim', trf=1),
]
# ---------------------------------------------------------------- skenario 7 hari
S7 = [
    H(tgl(2026, 11, 16), 'Depok, Jakarta', 'UI 08.30 (DRRC UI)', 'Binus 13.30', 'Pulang', aud=['UI', 'Binus'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 17), 'Bogor, Bandung', 'IPB 08.30 (PSB LPPM)', 'Mobil ke Bandung; ITB 15.00 (PPMB)', 'Menginap Bandung',
      aud=['IPB', 'ITB'], uh=('luar', 'Jabar'), sewa='DKI', tol=['Jakarta ke Bandung'], inap='Jabar'),
    H(tgl(2026, 11, 18), 'Jatinangor, Bandung', 'Unpad 08.30', 'Tel-U 13.30', 'KA malam Lodaya ke Yogyakarta',
      aud=['Unpad', 'Tel-U'], uh=('luar', 'Jabar'), sewa='Jabar', tiket=['KA-BDG-YK']),
    H(tgl(2026, 11, 19), 'Yogyakarta', 'UGM 08.30 (PSBA)', 'UMY 13.30 (PSLB)', 'Menginap Yogyakarta', aud=['UGM', 'UMY'],
      uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 20), 'Solo, Semarang', 'KRL ke Solo; UNS 08.30', 'Tol ke Semarang; Undip 14.00', 'KA Muria malam; pulang',
      aud=['UNS', 'Undip'], uh=('luar', 'Jateng'), sewa='Jateng', tiket=['KRL', 'KA-SMG-JKT'], tol=['Semarang ke Solo'], trf=1),
    H(tgl(2026, 11, 23), 'Surabaya', 'Pesawat CGK–SUB pagi; ITS 09.30', 'Unair 13.30', 'Menginap Surabaya', aud=['ITS', 'Unair'],
      uh=('luar', 'Jatim'), sewa='Jatim', tiket=['CGK-SUB'], inap='Jatim', trf=1),
    H(tgl(2026, 11, 24), 'Malang', 'Tol ke Malang; UB 09.00', 'UMM 13.30', 'Pesawat SUB–CGK malam; pulang', aud=['UB', 'UMM'],
      uh=('luar', 'Jatim'), sewa='Jatim', tiket=['SUB-CGK'], tol=['Surabaya ke Malang', 'Surabaya ke Malang'], trf=1),
]
# ---------------------------------------------------------------- skenario 15 hari (16 Nov sampai 4 Des 2026)
S15 = [
    H(tgl(2026, 11, 16), 'Depok, Jakarta', 'UI 08.30 (DRRC UI)', 'UNJ 13.30', 'Pulang', aud=['UI', 'UNJ'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 17), 'Jakarta', 'Binus 08.30', 'Usakti 13.30 audiensi; forum kampus kota 15.30 (Untar, Atma Jaya, UIN Jakarta)', 'Pulang',
      aud=['Binus', 'Usakti'], forum=F('Usakti', ['Untar', 'UAJ', 'UINJ']), uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 18), 'Tangerang, Serang', 'UPH 08.30', 'Untirta 13.30', 'Pulang', aud=['UPH', 'Untirta'], uh=('luar', 'Banten'), sewa='DKI'),
    H(tgl(2026, 11, 19), 'Bogor, Bandung', 'IPB 08.30 (PSB LPPM)', 'Mobil ke Bandung; ITB 15.00 (PPMB)', 'Menginap Bandung',
      aud=['IPB', 'ITB'], uh=('luar', 'Jabar'), sewa='DKI', tol=['Jakarta ke Bandung'], inap='Jabar'),
    H(tgl(2026, 11, 20), 'Jatinangor, Bandung', 'Unpad 08.30', 'Tel-U 13.30 audiensi; forum kampus kota 15.30 (UPI, Itenas, Unpar)',
      'Whoosh Tegalluar ke Halim; pulang', aud=['Unpad', 'Tel-U'], forum=F('Tel-U', ['UPI', 'Itenas', 'Unpar']), uh=('luar', 'Jabar'),
      sewa='Jabar', tiket=['WH'], trf=1),
    H(tgl(2026, 11, 23), 'Semarang', 'KA Muria Gambir 06.00', 'Undip 13.30', 'Menginap Semarang', aud=['Undip'], uh=('luar', 'Jateng'),
      sewa='Jateng', tiket=['KA-JKT-SMG'], inap='Jateng', trf=1),
    H(tgl(2026, 11, 24), 'Semarang, Solo', 'Unnes 08.30', 'Tol ke Solo; UMS 14.00', 'Menginap Solo', aud=['Unnes', 'UMS'],
      uh=('luar', 'Jateng'), sewa='Jateng', tol=['Semarang ke Solo'], inap='Jateng'),
    H(tgl(2026, 11, 25), 'Solo, Yogyakarta', 'UNS 08.30', 'Tol ke Yogyakarta; UII 14.00', 'Menginap Yogyakarta', aud=['UNS', 'UII'],
      uh=('luar', 'Jateng'), sewa='Jateng', tol=['Solo ke Yogyakarta'], inap='DIY'),
    H(tgl(2026, 11, 26), 'Yogyakarta', 'UGM 08.30 (PSBA)', 'Forum kampus kota di UGM 13.30 (UPN Veteran, UAD, UAJY)', 'Menginap Yogyakarta',
      aud=['UGM'], forum=F('UGM', ['UPNVY', 'UAD', 'UAJY']), uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 27), 'Yogyakarta', 'UMY 08.30 (PSLB)', 'UNY 13.30 (Pusat Studi Mitigasi)', 'Pesawat YIA–CGK malam; pulang',
      aud=['UMY', 'UNY'], uh=('luar', 'DIY'), sewa='DIY', tiket=['YIA-CGK'], trf=1),
    H(tgl(2026, 11, 30), 'Surabaya', 'Pesawat CGK–SUB pagi; ITS 09.30', 'Unair 13.30', 'Menginap Surabaya', aud=['ITS', 'Unair'],
      uh=('luar', 'Jatim'), sewa='Jatim', tiket=['CGK-SUB'], inap='Jatim', trf=1),
    H(tgl(2026, 12, 1), 'Surabaya', 'Unesa 08.30', 'Petra 13.30 audiensi; forum kampus kota 15.30 (Ubaya, UPN Jatim)', 'Menginap Surabaya',
      aud=['Unesa', 'Petra'], forum=F('Petra', ['Ubaya', 'UPNJ']), uh=('luar', 'Jatim'), sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 12, 2), 'Malang', 'Tol ke Malang; UB 09.00', 'UM 13.30', 'Menginap Malang', aud=['UB', 'UM'], uh=('luar', 'Jatim'),
      sewa='Jatim', tol=['Surabaya ke Malang'], inap='Jatim'),
    H(tgl(2026, 12, 3), 'Malang, Jember', 'UMM 08.30', 'Perjalanan darat ke Jember, sekitar 5 jam', 'Menginap Jember', aud=['UMM'],
      uh=('luar', 'Jatim'), sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 12, 4), 'Jember', 'Unej 08.30', 'Perjalanan darat ke Surabaya, sekitar 5 jam', 'Pesawat SUB–CGK malam; pulang', aud=['Unej'],
      uh=('luar', 'Jatim'), sewa='Jatim', tiket=['SUB-CGK'], trf=1),
]
SKENARIO = {3: S3, 7: S7, 15: S15}
NAMA_SK = {3: 'Kilat', 7: 'Inti', 15: 'Jangkau'}


def hitung(hari_list):
    r = dict(tiket_p=0, tiket_r=0, inap_p=0, inap_r=0, uh=0, lokal=0, giat=0, sewa=0, tol=0, trf=0,
             g_paket=0, g_forum=0, g_lok=0, g_fornas=0)
    aud, peserta, forum, lok, kota, malam = [], [], 0, 0, set(), 0
    for h in hari_list:
        for tk in h['tiket']:
            r['tiket_p'] += TIKET[tk][0] * TIM
            r['tiket_r'] += TIKET[tk][1] * TIM
        if h['inap']:
            p = HOTEL_TA[h['inap']] + 2 * HOTEL_STAF[h['inap']]
            r['inap_p'] += p
            r['inap_r'] += p * HOTEL_RIIL
            malam += 1
        if h['uh']:
            jenis, prov = h['uh']
            r['uh'] += (UH_LUAR[prov] if jenis == 'luar' else UH_DALAM) * TIM
        if h['sewa']:
            r['lokal'] += SEWA[h['sewa']]
            r['sewa'] += SEWA[h['sewa']]
        r['lokal'] += sum(TOL[x] for x in h['tol']) + h['trf'] * TRANSFER_DKI * TIM
        r['tol'] += sum(TOL[x] for x in h['tol'])
        r['trf'] += h['trf'] * TRANSFER_DKI * TIM
        r['g_paket'] += len(h['aud']) * PAKET_KAMPUS
        r['g_forum'] += FORUM if h['forum'] else 0
        r['g_lok'] += LOKAKARYA if h['lok'] else 0
        r['g_fornas'] += FORNAS if h['fornas'] else 0
        aud += h['aud']
        if h['forum']:
            forum += 1
            peserta += h['forum']['peserta']
        if h['lok']:
            lok += 1
        r['giat'] += len(h['aud']) * PAKET_KAMPUS + (FORUM if h['forum'] else 0) + (LOKAKARYA if h['lok'] else 0) + (FORNAS if h['fornas'] else 0)
        for k in h['aud']:
            kota.add(K[k][3])
    assert len(aud) == len(set(aud)), 'kampus audiensi ganda'
    assert not set(aud) & set(peserta), 'peserta forum juga audiensi'
    pagu0 = r['tiket_p'] + r['inap_p'] + r['uh'] + r['lokal'] + r['giat']
    riil0 = r['tiket_r'] + r['inap_r'] + r['uh'] + r['lokal'] + r['giat']
    r.update(aud=aud, peserta=peserta, forum=forum, lok=lok, kota=len(kota), malam=malam, hari=len(hari_list),
             kampus=len(aud) + len(peserta), kontin_p=pagu0 * KONTINJENSI, kontin_r=riil0 * KONTINJENSI,
             pagu=pagu0 * (1 + KONTINJENSI), riil=riil0 * (1 + KONTINJENSI))
    r['inti'] = sum(1 for k in aud + peserta if K[k][2] == 'Inti')
    r['unggul'] = sum(1 for k in aud + peserta if K[k][2] == 'Unggulan')
    r['penguat'] = sum(1 for k in aud + peserta if K[k][2] == 'Penguat')
    r['pts'] = sum(1 for k in aud + peserta if K[k][1] == 'PTS')
    return r


HASIL = {n: hitung(s) for n, s in SKENARIO.items()}

if __name__ == '__main__':
    assert len(K) == 38
    for n, r in HASIL.items():
        assert len(r['aud']) + len(r['peserta']) == r['kampus']
        print(n, 'hari', r['hari'], 'aud', len(r['aud']), 'forum', r['forum'], 'peserta', len(r['peserta']), 'lok', r['lok'],
              'kampus', r['kampus'], f"(inti {r['inti']}, unggul {r['unggul']}, penguat {r['penguat']}, PTS {r['pts']})",
              'kota', r['kota'], 'malam', r['malam'],
              f"pagu {r['pagu'] / 1e6:.1f} jt riil {r['riil'] / 1e6:.1f} jt per kampus {r['pagu'] / r['kampus'] / 1e6:.2f}",
              {k: round(r[k] / 1e6, 1) for k in ('tiket_p', 'inap_p', 'uh', 'lokal', 'giat', 'kontin_p')})
    print('belum di 15:', set(K) - set(HASIL[15]['aud']) - set(HASIL[15]['peserta']))
