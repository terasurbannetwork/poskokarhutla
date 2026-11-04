#!/usr/bin/env python3
"""Rute optimal ke 12 kampus kunci pilihan pemilik (2 Nov 2026): UI, ITB, UGM, Unair, ITS, Undip, UB, IPB, Unpad, Binus, Telkom U, UMY.

Rute searah pilihan pemilik (3 Nov 2026): Jakarta, Bandung, Semarang, Yogyakarta, Malang, Surabaya; sepuluh hari kalender, Rabu 18
sampai Jumat 27 Nov 2026 = 7 hari kampus + akhir pekan (Sabtu KA Harina Bandung ke Semarang, Minggu istirahat) + Rabu darat
Yogyakarta ke Malang (sekitar lima jam, tanpa audiensi). Aturan ritme: kampus di pagi hari, paling banyak dua kampus per hari bila
searah, tidak ada audiensi sesudah perjalanan panjang, akhir pekan tanpa audiensi. Berakhir di Surabaya, dekat bandara.
"""
from kunci_model import H, hitung, tgl, DLM, K, HASIL as HASIL_KUNCI, JENIS, TIKET, TOL  # noqa: F401

# tarif tambahan rute ini (dict yang sama dipakai hitung())
TIKET['KA-BDG-SMG'] = (520000, 465000, 'KA Harina eksekutif; tiket.com Jul 2026, batas atas dan bawah; cek ulang di KAI')
TOL['Yogyakarta ke Malang'] = 350000  # asumsi tim: ruas Yogyakarta, Solo, Ngawi, Kertosono, Malang; tarif resmi belum diriset

OPT = [
    H(tgl(2026, 11, 18), 'Bogor, Depok', 'IPB 09.00 (PSB LPPM)', 'UI 13.30 (DRRC UI)', 'Pulang; persiapan Bandung', 'KKP',
      aud=['IPB', 'UI'], uh=DLM, sewa='DKI'),
    H(tgl(2026, 11, 19), 'Jakarta, Bandung', 'Binus 09.00', 'Whoosh siang ke Tegalluar', 'Telkom University 15.00; check-in', 'KJK',
      aud=['Binus', 'Tel-U'], uh=('luar', 'Jabar'), tiket=['WH'], sewa='DKI', inap='Jabar'),
    H(tgl(2026, 11, 20), 'Bandung, Jatinangor', 'ITB 09.00 (rektor, PPMB)', 'Unpad 14.00 (Pusat Riset Kebencanaan)', 'Notula dan rekap hari',
      'KKP', aud=['ITB', 'Unpad'], uh=('luar', 'Jabar'), sewa='Jabar', inap='Jabar'),
    H(tgl(2026, 11, 21), 'Bandung ke Semarang', 'KA Harina 09.35', 'Tiba 16.23', 'Istirahat', 'JJI',
      uh=('luar', 'Jateng'), tiket=['KA-BDG-SMG'], sewa='Jateng', inap='Jateng'),
    H(tgl(2026, 11, 22), 'Semarang', 'Istirahat', 'Istirahat', 'Rekap pekan pertama; persiapan Undip', 'IIP',
      uh=('luar', 'Jateng'), inap='Jateng'),
    H(tgl(2026, 11, 23), 'Semarang ke Yogyakarta', 'Undip 09.00', 'Mobil siang ke Yogyakarta, sekitar 3 jam', 'Tiba; persiapan UGM dan UMY', 'KJP',
      aud=['Undip'], uh=('luar', 'DIY'), sewa='Jateng', tol=['Yogyakarta ke Semarang'], inap='DIY'),
    H(tgl(2026, 11, 24), 'Yogyakarta', 'UGM 09.00 (rektor, PSBA)', 'UMY 13.30 (PSLB)', 'Notula; persiapan perjalanan', 'KKP',
      aud=['UGM', 'UMY'], uh=('luar', 'DIY'), sewa='DIY', inap='DIY'),
    H(tgl(2026, 11, 25), 'Yogyakarta ke Malang', 'Mobil pagi lewat tol Solo dan Kertosono, sekitar 5 jam', 'Tiba; istirahat', 'Persiapan UB',
      'JIP', uh=('luar', 'Jatim'), sewa='DIY', tol=['Yogyakarta ke Malang'], inap='Jatim'),
    H(tgl(2026, 11, 26), 'Malang ke Surabaya', 'UB 09.00', 'Tol ke Surabaya', 'Istirahat; persiapan ITS dan Unair', 'KJP',
      aud=['UB'], uh=('luar', 'Jatim'), sewa='Jatim', tol=['Surabaya ke Malang'], inap='Jatim'),
    H(tgl(2026, 11, 27), 'Surabaya ke Jakarta', 'ITS 09.00 (Puslit MKPI)', 'Unair 13.30', 'Pesawat malam ke CGK; pulang', 'KKJ',
      aud=['ITS', 'Unair'], uh=('luar', 'Jatim'), sewa='Jatim', tiket=['SUB-CGK'], trf=1),
]
R = hitung(OPT)

if __name__ == '__main__':
    assert sorted(R['aud']) == sorted(K), sorted(set(K) - set(R['aud']))
    print('hari', R['hari'], 'kampus', R['kampus'], 'hari kampus', R['hari_kampus'], 'tanpa kampus', R['hari_libur'], 'malam', R['malam'],
          'slot', R['slot'], f"pagu {R['pagu'] / 1e6:.1f} riil {R['riil'] / 1e6:.1f} per kampus {R['pagu'] / 12 / 1e6:.2f}",
          f"| pola 14 hari: pagu {HASIL_KUNCI[14]['pagu'] / 1e6:.1f}")
