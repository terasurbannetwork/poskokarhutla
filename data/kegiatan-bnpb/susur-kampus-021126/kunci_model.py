#!/usr/bin/env python3
"""Model jadwal susur kampus kunci Jawa (2 Nov 2026): 12 kampus kunci, skenario 7, 10, 14 hari kalender.

Pemilik 2 Nov 2026: "dengan banyaknya hari ga perlu banyak univ, tapi bikin jadwal yang rasional antara kerja, persiapan,
istirahat, dan menyusuri kota"; "hanya kampus2 kunci aja. Utamakan PTN dan PTS tier 1".
Kampus kunci = 9 PTN Jawa di QS WUR 2027 peringkat 700 besar + 3 PTS Jawa yang masuk QS 2027 (Binus, Telkom U, UMY).
Tiap hari dibagi tiga slot (pagi, siang, sore dan malam); tiap slot satu jenis: K kunjungan, J perjalanan, P persiapan dan rekap,
I istirahat, S susur kota. Biaya: SBM 2026 (PMK 32/2025) dari susur_model, tim tiga orang, uang harian dan hotel dihitung juga
pada akhir pekan di luar kota. Susur kota tidak dibiayai di luar uang harian.
"""
from susur_model import (TIM, UH_LUAR, UH_DALAM, HOTEL_TA, HOTEL_STAF, SEWA, TRANSFER_DKI, PROV_NAMA, HOTEL_RIIL,
                         KONTINJENSI, PAKET_KAMPUS, TIKET as TIKET0, TOL as TOL0, K as K0, HARI, BULAN)
from datetime import date


def tgl(y, m, d):
    x = date(y, m, d)
    return f'{HARI[x.weekday()]} {d} {BULAN[m - 1]}'


KUNCI = ['UI', 'UGM', 'Unair', 'ITB', 'IPB', 'Unpad', 'ITS', 'UB', 'Undip', 'Binus', 'Tel-U', 'UMY']
K = {k: K0[k] for k in KUNCI}
QS26 = {'UI': 189, 'UGM': 224, 'Unair': 287, 'ITB': 255, 'IPB': 399, 'Unpad': 515, 'ITS': 509, 'UB': 680, 'Undip': 624}

TIKET = dict(TIKET0)
TIKET['KA-BDG-YK'] = (490000, 490000, 'KA Bandung ke Yogyakarta; acuan tarif Lodaya eksekutif')
TIKET['KA-SMG-SUB'] = (400000, 400000, 'asumsi; tarif KA Semarang ke Surabaya belum ditemukan')
TOL = dict(TOL0)
TOL['Yogyakarta ke Semarang'] = TOL0['Solo ke Yogyakarta'] + TOL0['Semarang ke Solo']

JENIS = {'K': 'Kunjungan kampus', 'J': 'Perjalanan', 'P': 'Persiapan dan rekap', 'I': 'Istirahat', 'S': 'Susur kota'}
DLM = ('dalam', 'DKI')


def H(tanggal, kota, pagi, siang, malam, slot, aud=(), inap=None, uh=('luar', 'DKI'), tiket=(), sewa=None, tol=(), trf=0):
    assert len(slot) == 3 and set(slot) <= set(JENIS), slot
    return dict(tgl=tanggal, kota=kota, pagi=pagi, siang=siang, malam=malam, slot=slot, aud=list(aud), inap=inap, uh=uh,
                tiket=list(tiket), sewa=sewa, tol=list(tol), trf=trf)


# ---------------------------------------------------------------- 7 hari: Senin 16 sampai Minggu 22 Nov 2026, 6 kampus
S7 = [
    H(tgl(2026, 11, 16), 'Depok, Bandung', 'Uji paparan; UI 10.00 (DRRC UI)', 'Whoosh Halim 15.00 ke Tegalluar',
      'Check-in; persiapan ITB dan Unpad', 'KJP', aud=['UI'], uh=('luar', 'Jabar'), tiket=['WH'], sewa='DKI', trf=1, inap='Jabar'),
    H(tgl(2026, 11, 17), 'Bandung, Jatinangor', 'ITB 09.00 (rektor, PPMB)', 'Unpad 14.30 (Pusat Riset Kebencanaan)',
      'Museum Geologi dan Jalan Braga; notula', 'KKS', aud=['ITB', 'Unpad'], uh=('luar', 'Jabar'), sewa='Jabar', inap='Jabar'),
    H(tgl(2026, 11, 18), 'Bandung ke Yogyakarta', 'KA Argo Wilis 07.45', 'Tiba 13.34; istirahat',
      'Persiapan UGM dan UMY', 'JIP', uh=('luar', 'DIY'), tiket=['KA-BDG-YK'], sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 19), 'Yogyakarta', 'UGM 09.00 (rektor, PSBA)', 'UMY 14.00 (PSLB)', 'Malioboro; notula',
      'KKS', aud=['UGM', 'UMY'], uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 20), 'Yogyakarta ke Semarang', 'Mobil pukul 06.30 lewat tol Solo', 'Undip 13.30', 'Kota Lama dan Polder Tawang',
      'JKS', aud=['Undip'], uh=('luar', 'Jateng'), sewa='DIY', tol=['Yogyakarta ke Semarang'], inap='Jateng'),
    H(tgl(2026, 11, 21), 'Semarang', 'Istirahat', 'Rekap enam kampus dan draf tindak lanjut', 'Lawang Sewu',
      'IPS', uh=('luar', 'Jateng'), sewa='Jateng', inap='Jateng'),
    H(tgl(2026, 11, 22), 'Semarang ke Jakarta', 'KA Muria 07.00 ke Gambir', 'Tiba; pulang', 'Istirahat', 'JII',
      uh=('luar', 'Jateng'), tiket=['KA-SMG-JKT'], trf=1),
]

# ---------------------------------------------------------------- 10 hari: Senin 16 sampai Rabu 25 Nov 2026, 10 kampus (9 PTN kunci + UMY)
S10 = [
    H(tgl(2026, 11, 16), 'Depok, Bogor', 'Uji paparan; UI 10.00 (DRRC UI)', 'IPB 14.00 (PSB LPPM)', 'Pulang; persiapan Bandung',
      'KKP', aud=['UI', 'IPB'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 17), 'Bandung, Jatinangor', 'Whoosh Halim 07.25; ITB 10.00 (PPMB)', 'Unpad 14.30 (Pusat Riset Kebencanaan)',
      'Jalan Braga; notula', 'KKS', aud=['ITB', 'Unpad'], uh=('luar', 'Jabar'), tiket=['WH'], sewa='Jabar', trf=1, inap='Jabar'),
    H(tgl(2026, 11, 18), 'Bandung ke Yogyakarta', 'KA Argo Wilis 07.45', 'Tiba 13.34; istirahat', 'Persiapan UGM dan UMY',
      'JIP', uh=('luar', 'DIY'), tiket=['KA-BDG-YK'], sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 19), 'Yogyakarta', 'UGM 09.00 (rektor, PSBA)', 'UMY 14.00 (PSLB)', 'Malioboro; notula',
      'KKS', aud=['UGM', 'UMY'], uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 20), 'Yogyakarta ke Semarang', 'Mobil pukul 06.30 lewat tol Solo', 'Undip 10.00, selesai sebelum salat Jumat',
      'Kota Lama dan Polder Tawang', 'JKS', aud=['Undip'], uh=('luar', 'Jateng'), sewa='DIY', tol=['Yogyakarta ke Semarang'], inap='Jateng'),
    H(tgl(2026, 11, 21), 'Semarang', 'Istirahat', 'Rekap pekan pertama', 'Lawang Sewu', 'IPS', uh=('luar', 'Jateng'), sewa='Jateng',
      inap='Jateng'),
    H(tgl(2026, 11, 22), 'Semarang ke Surabaya', 'Istirahat', 'KA ke Surabaya', 'Persiapan ITS dan Unair', 'IJP',
      uh=('luar', 'Jatim'), tiket=['KA-SMG-SUB'], sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 11, 23), 'Surabaya', 'ITS 09.00 (Puslit MKPI)', 'Unair 14.00', 'Jalan Tunjungan; notula', 'KKS',
      aud=['ITS', 'Unair'], uh=('luar', 'Jatim'), sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 11, 24), 'Malang', 'Tol ke Malang; UB 10.00', 'Istirahat', 'Kayutangan', 'KIS',
      aud=['UB'], uh=('luar', 'Jatim'), sewa='Jatim', tol=['Surabaya ke Malang'], inap='Jatim'),
    H(tgl(2026, 11, 25), 'Malang ke Jakarta', 'Rekap sepuluh kampus', 'Tol ke Surabaya; pesawat sore ke CGK', 'Tiba; pulang',
      'PJI', uh=('luar', 'Jatim'), sewa='Jatim', tol=['Surabaya ke Malang'], tiket=['SUB-CGK'], trf=1),
]

# ---------------------------------------------------------------- 14 hari: Senin 16 sampai Minggu 29 Nov 2026, 12 kampus
S14 = [
    H(tgl(2026, 11, 16), 'Jakarta, Depok', 'Rapat persiapan dan uji paparan', 'UI 13.30 (DRRC UI)', 'Pulang', 'PKI',
      aud=['UI'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 17), 'Bogor, Jakarta', 'IPB 09.00 (PSB LPPM)', 'Binus 14.30', 'Pulang; persiapan Bandung', 'KKP',
      aud=['IPB', 'Binus'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 18), 'Bandung', 'Whoosh Halim 07.25; ITB 10.00 (PPMB)', 'Rekap dan istirahat', 'Jalan Braga dan Asia Afrika',
      'KIS', aud=['ITB'], uh=('luar', 'Jabar'), tiket=['WH'], sewa='Jabar', trf=1, inap='Jabar'),
    H(tgl(2026, 11, 19), 'Jatinangor, Bandung', 'Unpad 09.00 (Pusat Riset Kebencanaan)', 'Telkom University 14.00',
      'Museum Geologi Bandung; notula', 'KKS', aud=['Unpad', 'Tel-U'], uh=('luar', 'Jabar'), sewa='Jabar', inap='Jabar'),
    H(tgl(2026, 11, 20), 'Bandung ke Yogyakarta', 'KA Argo Wilis 07.45', 'Tiba 13.34; istirahat', 'Malioboro', 'JIS',
      uh=('luar', 'DIY'), tiket=['KA-BDG-YK'], sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 21), 'Yogyakarta', 'Rekap pekan pertama', 'Istirahat', 'Kraton dan Kotagede', 'PIS',
      uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 22), 'Yogyakarta', 'Istirahat', 'Museum Gunungapi Merapi, Kaliurang', 'Persiapan UGM dan UMY', 'ISP',
      uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 23), 'Yogyakarta', 'UGM 09.00 (rektor, PSBA)', 'UMY 14.00 (PSLB)', 'Notula', 'KKP',
      aud=['UGM', 'UMY'], uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 24), 'Yogyakarta ke Semarang', 'Mobil pukul 07.00 lewat tol Solo', 'Undip 13.30', 'Kota Lama dan Polder Tawang',
      'JKS', aud=['Undip'], uh=('luar', 'Jateng'), sewa='DIY', tol=['Yogyakarta ke Semarang'], inap='Jateng'),
    H(tgl(2026, 11, 25), 'Semarang ke Surabaya', 'KA ke Surabaya', 'Tiba; istirahat', 'Persiapan ITS dan Unair', 'JIP',
      uh=('luar', 'Jatim'), tiket=['KA-SMG-SUB'], sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 11, 26), 'Surabaya', 'ITS 09.00 (Puslit MKPI)', 'Unair 14.00', 'Jalan Tunjungan; notula', 'KKS',
      aud=['ITS', 'Unair'], uh=('luar', 'Jatim'), sewa='Jatim', inap='Jatim'),
    H(tgl(2026, 11, 27), 'Malang', 'Tol ke Malang; UB 10.00', 'Istirahat', 'Kayutangan', 'KIS', aud=['UB'], uh=('luar', 'Jatim'),
      sewa='Jatim', tol=['Surabaya ke Malang'], inap='Jatim'),
    H(tgl(2026, 11, 28), 'Malang ke Surabaya', 'Rekap dua belas kampus', 'Tol ke Surabaya', 'Draf tindak lanjut', 'PJP',
      uh=('luar', 'Jatim'), sewa='Jatim', tol=['Surabaya ke Malang'], inap='Jatim'),
    H(tgl(2026, 11, 29), 'Surabaya ke Jakarta', 'Istirahat', 'Pesawat siang ke CGK', 'Tiba; pulang', 'IJI',
      uh=('luar', 'Jatim'), tiket=['SUB-CGK'], trf=1),
]


SKENARIO = {7: S7, 10: S10, 14: S14}
NAMA_SK = {7: 'Ringkas', 10: 'Seimbang', 14: 'Lengkap'}


def hitung(hari):
    r = dict(tiket_p=0, tiket_r=0, inap_p=0, inap_r=0, uh=0, sewa=0, tol=0, trf=0, paket=0)
    aud, malam, kota = [], 0, set()
    slot = {j: 0 for j in JENIS}
    for h in hari:
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
            r['sewa'] += SEWA[h['sewa']]
        r['tol'] += sum(TOL[x] for x in h['tol'])
        r['trf'] += h['trf'] * TRANSFER_DKI * TIM
        r['paket'] += len(h['aud']) * PAKET_KAMPUS
        aud += h['aud']
        for k in h['aud']:
            kota.add(K[k][3])
        for c in h['slot']:
            slot[c] += 1
    assert len(aud) == len(set(aud)), aud
    assert max(len(h['aud']) for h in hari) <= 2
    lokal = r['sewa'] + r['tol'] + r['trf']
    pagu0 = r['tiket_p'] + r['inap_p'] + r['uh'] + lokal + r['paket']
    riil0 = r['tiket_r'] + r['inap_r'] + r['uh'] + lokal + r['paket']
    r.update(lokal=lokal, aud=aud, kampus=len(aud), malam=malam, hari=len(hari), kota=len(kota), slot=slot,
             hari_kampus=sum(1 for h in hari if h['aud']), hari_libur=sum(1 for h in hari if 'K' not in h['slot']),
             kontin_p=pagu0 * KONTINJENSI, kontin_r=riil0 * KONTINJENSI,
             pagu=pagu0 * (1 + KONTINJENSI), riil=riil0 * (1 + KONTINJENSI),
             pts=sum(1 for k in aud if K[k][1] == 'PTS'))
    return r


HASIL = {n: hitung(s) for n, s in SKENARIO.items()}

if __name__ == '__main__':
    for n, r in HASIL.items():
        assert r['hari'] == n, (n, r['hari'])
        print(n, 'kampus', r['kampus'], r['aud'], 'PTS', r['pts'], 'kota', r['kota'], 'malam', r['malam'], 'hari kampus', r['hari_kampus'],
              'hari tanpa kampus', r['hari_libur'], 'slot', r['slot'],
              f"pagu {r['pagu'] / 1e6:.1f} riil {r['riil'] / 1e6:.1f} per kampus {r['pagu'] / r['kampus'] / 1e6:.2f} per hari {r['pagu'] / n / 1e6:.2f}")
