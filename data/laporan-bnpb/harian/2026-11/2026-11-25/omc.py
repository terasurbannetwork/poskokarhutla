"""Slide Operasi Modifikasi Cuaca (OMC) Provinsi Aceh, laporan harian 25 Nov 2026.
Atasan 25 Nov (Ghozi, WA 07.07: "saran mgkn OMC di Aceh (SIM) dan Lanud Soewondo sdh di masukan dlm laporan").
Angka disalin dari WA Tim Pendampingan OMC Provinsi Aceh 25 Nov 07.07 (sorti 24 Nov dan rekap sejak awal operasi) dan infografis
OMC Aceh update 24 Nov 2026. Foto: potongan kolase tim pendampingan (posko SIM dan Lanud Soewondo), 24 Nov 2026."""
import os

S_ = os.path.dirname(os.path.abspath(__file__))
POSKO = [
    {'nama': 'Posko Bandara Sultan Iskandar Muda', 'armada': 'Cessna Caravan 208B PK-SNK, PT Smart Cakrawala Aviation',
     'layanan': 'Aceh bagian utara hingga tengah', 'periode': '18–24 Nov', 'foto': 'omc-sim.jpg',
     'ket': 'Tim BNPB bersama kru PK-SNK, 24 Nov 2026', 'kpi': [('28 jam 21 menit', 'jam terbang'), ('11 sorti', 'penerbangan'), ('10.000 kg', 'bahan semai NaCl')]},
    {'nama': 'Posko Lanud Soewondo, Medan', 'armada': 'CASA 212-200 A-2103, BMKG dan TNI AU',
     'layanan': 'Aceh bagian tengah hingga selatan', 'periode': '21–24 Nov', 'foto': 'omc-soewondo.jpg',
     'ket': 'Pemuatan NaCl ke CASA A-2103, 24 Nov 2026', 'kpi': [('4 jam 55 menit', 'jam terbang'), ('2 sorti', 'penerbangan'), ('1.600 kg', 'bahan semai NaCl')]},
]
SORTI = [  # posko, armada, sorti, engine on-off, wilayah semai, ketinggian, NaCl
    ('Bandara SIM', 'PK-SNK', '1', '07.09–10.05', 'Perairan timur Provinsi Aceh', '11.000 kaki', '800 kg'),
    ('Bandara SIM', 'PK-SNK', '2', '22.32–01.10', 'Perairan barat Provinsi Aceh', '10.000 kaki', '1.000 kg'),
    ('Lanud Soewondo', 'A-2103', '1', '07.34–10.14', 'Perairan barat Aceh Selatan', '10.000 kaki', '800 kg'),
]
JUMLAH = ('Jumlah 24 Nov', '', '3 sorti', '', '', '', '2.600 kg')


def judul(H):
    return [('Operasi Modifikasi Cuaca Aceh: ', H.INK, True), ('3 sorti', H.ORG, True), (' dan ', H.INK, True), ('2.600 kg NaCl', H.ORG, True),
            (' pada 24 Nov, total ', H.INK, True), ('13 sorti', H.ORG, True), (' di dua posko', H.INK, True)]


def gambar(dk, H):
    s = dk; X0, W, Y0, YB = 548640, 11094415, 1280160, 5852160
    G = 182880; CW = (W - G) // 2
    o = ''
    HK = 420624; FH = 1856232; FW = int(FH * 686 / 552)   # foto 686 x 552 piksel
    for i, p in enumerate(POSKO):
        x = X0 + i * (CW + G)
        o += s.kotak(x, Y0, CW, HK + FH + 137160, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2500)
        o += s.kotak(x, Y0, CW, HK, 'E8EEF6', 'roundRect', adj=12000)
        o += s.tx(x + 137160, Y0 + 54864, CW - 274320, 182880, [p['nama']], sz=1000, b=True, c=H.NAVY, an='ctr', wrap='none')
        o += s.tx(x + 137160, Y0 + 237744, CW - 274320, 146304, [p['armada'] + ', wilayah ' + p['layanan']], sz=750, c=H.TEKS, an='ctr', wrap='none')
        fy = Y0 + HK + 68580; fx = x + 68580
        s.I['omc_' + str(i)] = os.path.join(S_, 'foto', p['foto'])
        o += s.gambar(fx, fy, FW, FH, 'omc_' + str(i))
        PT = 420624; pita = s.kotak(fx, fy + FH - PT, FW, PT, '1B2A47')   # pemilik 19 Nov: keterangan dan kredit di dalam foto, pita navy tembus
        o += pita.replace('<a:srgbClr val="1B2A47"/>', '<a:srgbClr val="1B2A47"><a:alpha val="78000"/></a:srgbClr>', 1)
        o += s.tx(fx + 91440, fy + FH - 301752, FW - 182880, 155448, [p['ket']], sz=750, b=True, c='FFFFFF', wrap='none')
        o += s.tx(fx + 91440, fy + FH - 146304, FW - 182880, 128016, ['Foto: Tim Pendampingan OMC BNPB'], sz=650, c='DCE3EE', wrap='none')
        kx = fx + FW + 137160; kw = x + CW - 91440 - kx; kh = (FH - 2 * 91440) // 3
        for j, (nilai, lab) in enumerate(p['kpi']):
            ky = fy + j * (kh + 91440)
            o += s.kotak(kx, ky, kw, kh, 'F6F8FA', 'roundRect', ln='D1D5DB', adj=8000)
            o += s.tx(kx + 109728, ky + 64008, kw - 219456, kh * 0.55, [nilai], sz=2000, b=True, c=H.NAVY if j else H.ORG, an='ctr', wrap='none')
            o += s.tx(kx + 109728, ky + kh * 0.6, kw - 219456, kh * 0.3, [f"{lab}, {p['periode']}"], sz=800, c=H.TEKS, an='t', wrap='none')
    # tabel sorti 24 Nov, lebar penuh
    ty = Y0 + HK + FH + 137160 + 137160
    o += s.tx(X0, ty, W, 182880, ['SORTI 24 NOVEMBER 2026 (WIB)'], sz=750, b=True, c=H.NAVY, spc=100)
    ty += 228600
    lebar = [0.15, 0.09, 0.07, 0.14, 0.29, 0.13, 0.13]
    kep = ('POSKO', 'ARMADA', 'SORTI', 'ENGINE ON–OFF', 'WILAYAH SEMAI', 'KETINGGIAN', 'NACL')
    RH = (YB - ty) // (len(SORTI) + 2)
    for r, baris in enumerate([kep] + SORTI + [JUMLAH]):
        y = ty + r * RH; xx = X0
        isi_kep = r == 0; isi_jml = r == len(SORTI) + 1
        o += s.kotak(X0, y, W, RH, H.NAVY if isi_kep else 'EEF2F7' if isi_jml else ('FFFFFF' if r % 2 else 'F8FAFC'))
        for k, (t, lf) in enumerate(zip(baris, lebar)):
            cw = int(W * lf)
            o += s.tx(xx + 91440, y, cw - 182880, RH, [t], sz=750 if isi_kep else 900, b=isi_kep or isi_jml, c='FFFFFF' if isi_kep else H.INK,
                      al='ctr' if k in (2, 3, 5, 6) else 'l', an='ctr', wrap='none')
            xx += cw
        if not isi_kep: o += s.garis(X0, y + RH, W, 'D1D5DB', t=6350)
    return o
