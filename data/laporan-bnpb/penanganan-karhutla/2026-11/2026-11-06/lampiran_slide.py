"""Lampiran kab/kota 061126 bergaya lampiran deck harian (pemilik 5 Nov: "desain lampirannya mirip" daftar kejadian selesai harian 061126,
infonya tetap lampiran-kab.json). Mesin gambarnya harian.Deck (kepala navy, baris induk provinsi abu, anak kab/kota, dua kolom), dibangun
dengan folder kerja harian-2026-11-06 (templat dan ikon sudah ada); hanya halaman lampirannya yang dipakai bingkai.py.
    PYTHONUTF8=1 C:/Python314/python lampiran_slide.py   (sesudah lampiran_hitung.py)  ->  lampiran-kab.pptx, halaman lampiran dicetak"""
import datetime as dt, json, os, sys
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator')); sys.path.insert(0, G); os.chdir(G)
import harian, wa_harian, lewat_deck
from harian import NAVY, ORG, INK, ABU, T_ORG, T_NAVY, TEKS
HR = os.path.join(S, '..', '..', '..', 'harian/2026-11/2026-11-06')
KE = os.path.join(HR, 'kerja-061126')
L = json.load(open(os.path.join(S, 'lampiran-kab.json'), encoding='utf-8'))
NAMA = harian.NAMA
T = dt.date(2026, 11, 6)
f_ = lambda v: f'{v:,}'.replace(',', '.')

D = json.load(open(os.path.join(KE, 'data.json'), encoding='utf-8'))
wa = wa_harian.koordalops(open(os.path.join(HR, 'wa-koordalops.txt'), encoding='utf-8').read())
w = wa_harian.bmkg(open(os.path.join(HR, 'wa-bmkg.txt'), encoding='utf-8').read())
dk = harian.Deck(KE, D, wa, w, T, None)
dk.BJ, dk.LAMPIRAN, dk.SIAGA, dk.GA = None, False, False, None
s = dk
# 5 Nov pemilik ("jgn pill deh, ini aja headernya bikin gini"): kepala kolom = kotak berwarna slide 2 (ikon + label + satuan);
# ikon disalin dari pptx generator slide 2 (ikon-kepala/)
for k_ in ('hotspot', 'firespot', 'luas', 'belum'):
    s.I['kp_' + k_] = os.path.join(S, 'ikon-kepala', k_ + '.png')
KEPALA = (('HOTSPOT', '(titik)', '051C2C', 'kp_hotspot'), ('FIRESPOT', '(titik)', 'C8102E', 'kp_firespot'),
          ('LUAS TERBAKAR', '(ha)', '3F5F80', 'kp_luas'), ('BELUM PADAM', '(ha)', 'D9600B', 'kp_belum'))

GR = [(p, rows) for p, rows in L['prov'].items()]
JUM = {p: {m: sum(r[m] for r in rows) for m in ('hot', 'fs', 'luas', 'belum')} for p, rows in GR}
N_KAB = sum(len(r) for _, r in GR)
X0, W, Y = 548640, 11094415, 1325880; KP, PAD, KK, RH = 365760, 137160, 320040, 201168
cw = (W - 3 * PAD) // 2; PER = (5950000 - Y - KP - PAD - KK - 45720 - 91440) // RH   # sisa ruang untuk kotak KETERANGAN


def potong(gr):
    """Isi kolom berurutan (urutan provinsi = slide 2); grup yang tidak muat dipotong, lanjutannya diberi induk ulang "(lanjutan)"."""
    kol, cur, isi_ = [], [], 0
    for p, anak in gr:
        anak, lanj = list(anak), False
        while anak:
            muat = PER - isi_ - 1
            if muat < 2:   # induk tanpa anak (atau satu anak) di dasar kolom: pindah kolom
                kol.append(cur); cur, isi_ = [], 0; continue
            if 0 < len(anak) - muat < 2: muat -= 1   # lanjutan minimal 2 baris (5 Nov: Lamandau sendirian di kolom lanjutan)
            cur.append((p, anak[:muat], lanj)); isi_ += 1 + len(anak[:muat]); anak = anak[muat:]; lanj = True
    if cur: kol.append(cur)
    return kol


kolom = potong(GR)
hal = [kolom[i:i + 2] for i in range(0, len(kolom), 2)]
# 5 Nov pemilik ("upgrade lagi desainnya jadi kayak gini"): gaya tabel karhutla deck harian (harian.tabel_kh): kepala navy dua baris
# (label tebal + tanggal pudar), terbakar "± X ha" tebal polos, firespot pil biru muda, belum padam pil oranye selebar kolom.
# "yang 0 ha juga tetep ada pill-nya, warna dllnya sesuaikan": nilai 0 = pil abu (slate) berikon abu. Legenda ikon di kotak KETERANGAN.
FR = (.28, .16, .16, .20, .20)   # kab/kota, hotspot, firespot, luas, belum: LUAS TERBAKAR muat di kotaknya
HARI_ = '6 NOV'
NOL = ('EEF0F3', ABU, 'api_slate')


def xs(x0):
    o, x = [], x0
    for f in FR: o.append((x, cw * f)); x += cw * f
    return o


def baris_angka(o, x0, y, v, tebal):
    """Angka polos rata tengah di bawah kotak kepalanya (sama dengan tabel slide 2); nol ditulis abu."""
    for (xx, ww), m in zip(xs(x0)[1:], ('hot', 'fs', 'luas', 'belum')):
        o.append(s.tx(xx, y, ww, RH, [f_(v[m])], sz=800, b=tebal, c=INK if v[m] else ABU, al='ctr', an='ctr', wrap='none'))


def keterangan(o, y):
    """Kotak KETERANGAN di bawah panel (gaya panel gunung api deck harian): arti ikon baris dan warna pil."""
    o.append(s.kotak(X0, y, W, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(X0 + 128016, y, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr'))
    lx, ph = X0 + 1060704, 164592
    for a_, teks in ((ORG, 'ada firespot 6 Nov'), ('BFC5CC', 'tanpa firespot 6 Nov')):
        d_ = 155448; yb = y + (274320 - d_) / 2
        o.append(s.kotak(lx, yb, d_, d_, a_, 'ellipse') + s.gambar(lx + d_ * .2, yb + d_ * .2, d_ * .6, d_ * .6, 'api_putih')); lx += d_ + 73152
        tw = s.lebar_runs([(teks, TEKS, False)], 750) + 20000
        o.append(s.tx(lx, y, tw, 274320, [teks], sz=750, c=TEKS, an='ctr', wrap='none')); lx += tw + 201168
    o.append(s.tx(lx, y, 1600000, 274320, [[('0', ABU, True), ('  tidak terdeteksi', TEKS, False)]], sz=750, an='ctr', wrap='none')); lx += 1600000
    o.append(s.tx(lx, y, X0 + W - lx - 128016, 274320, ['luas dan belum padam kab/kota: angka provinsi dibagi sesuai sebaran titik'], sz=700, c=ABU, al='r', an='ctr', wrap='none'))


P_, H_ = (lambda t: (t, INK, True)), (lambda t: (t, ORG, True))
LAMP = []
for h_, kol_h in enumerate(hal):
    judul = [P_('Lampiran: '), H_('Rincian Kabupaten/Kota Enam Provinsi')] + ([P_(f' ({h_ + 1}/{len(hal)})')] if len(hal) > 1 else [])
    catatan = ['Hotspot dan firespot per kabupaten/kota dihitung langsung dari data sistem; luas terbakar dan belum padam per kabupaten/kota '
               'adalah angka provinsi slide 2 yang dibagi sesuai sebaran titik.']

    def isi(kol_h=kol_h):
        n_baris = max([sum(1 + len(a) for _, a, _ in k) for k in kol_h] + [1])
        HB = KP + PAD + KK + 45720 + n_baris * RH + 91440
        kpl = 'Hotspot, firespot, luas terbakar, dan belum padam per kabupaten/kota, 6 Nov 2026 s.d. 18.00 WIB'
        o = [s.kotak(X0, Y, W, HB, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000), s.kepala(X0, Y, W, ORG, T_ORG, 'api_p', kpl, N_KAB, h=KP)]
        for c, kol in enumerate(kol_h):
            x0 = X0 + PAD + c * (cw + PAD); y = Y + KP + PAD
            k_ = xs(x0)
            o.append(s.tx(k_[0][0] + 91440, y, k_[0][1] - 91440, KK, ['KAB/KOTA'], sz=720, b=True, c='6B7280', spc=100, an='b', wrap='none'))
            for (xx, ww), (lab, sat, warna, ikon) in zip(k_[1:], KEPALA):
                bx, bw = xx + 27432, ww - 54864; ic = 137160
                tw = max(s.lebar_runs([(lab, 'FFFFFF', True)], 720), s.lebar_runs([(sat, 'FFFFFF', False)], 700)); g = ic + 64008 + tw; gx = bx + (bw - g) / 2
                o.append(s.kotak(bx, y, bw, KK, warna, 'roundRect', adj=12000) + s.gambar(gx, y + (KK - ic) / 2, ic, ic, ikon)
                         + s.tx(gx + ic + 64008, y, tw + 40000, KK, [[(lab, 'FFFFFF', True)], [(sat, 'E6ECF3', False)]], sz=720, an='ctr', wrap='none'))
            y += KK + 45720
            for p, anak, lanj in kol:
                # baris induk provinsi: latar abu tipis, nama tebal + pil jumlah kab/kota, angka provinsi (= slide 2)
                o.append(s.kotak(x0, y + 9144, cw, RH - 18288, 'F7F8FA'))
                nm = NAMA[p]; tw = s.lebar_runs([(nm, INK, True)], 820)
                o.append(s.tx(x0 + 91440, y, tw + 40000, RH, [nm], sz=820, b=True, an='ctr', wrap='none'))
                tk = '(lanjutan)' if lanj else f'{len(L["prov"][p])} kab/kota'
                o.append(s.tx(x0 + 91440 + tw + 64008, y, 900000, RH, [tk], sz=720, c=ABU, an='ctr', wrap='none'))
                baris_angka(o, x0, y, JUM[p], True)
                y += RH
                for n, r in enumerate(anak):
                    if n: o.append(s.garis(x0 + 164592, y, cw - 164592, 'EEF0F3'))
                    d_ = 128016; yc = y + (RH - d_) / 2
                    o.append(s.kotak(x0 + 164592, yc, d_, d_, ORG if r['fs'] else 'BFC5CC', 'ellipse') + s.gambar(x0 + 164592 + d_ * .2, yc + d_ * .2, d_ * .6, d_ * .6, 'api_putih'))
                    o.append(s.tx(x0 + 365760, y, cw * FR[0] - 365760, RH, [r['kab']], sz=780, an='ctr', wrap='none'))
                    baris_angka(o, x0, y, r, False)
                    y += RH
        keterangan(o, Y + HB + 73152)
        return ''.join(o)
    LAMP.append((judul, isi, catatan))

dk.LAMP_TAMBAH = LAMP
keluar = os.path.join(S, 'lampiran-kab.pptx')
dk.bangun(os.path.join(G, 'cache', 'templat', 'harian-221026.pptx'), keluar)
urut = lewat_deck.urutan_slide(keluar)
halaman = [n for n, t in urut if 'Rincian Kabupaten/Kota' in t]
json.dump(halaman, open(os.path.join(S, 'lampiran-kab-halaman.json'), 'w'))
print('ok', keluar, '| kolom', len(kolom), 'per kolom', PER, '| halaman lampiran', halaman, 'dari', len(urut))
