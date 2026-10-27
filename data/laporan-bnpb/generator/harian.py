"""Laporan Kejadian Bencana Harian DDMMYY (4 slide: sampul, ringkasan + peta, rincian, penutup) dari teks WA, dalam format deck pemilik 221026.

    python3 harian.py --tanggal 2026-10-25 --koordalops wa.txt --bmkg bmkg.txt [--jam 12:00] [--out DIR] [--templat PPTX]

- Cut-off baku pemilik (24 Okt 2026): laporan harian bencana jam 12.00 WIB. Angka karhutla = hari laporan sementara s.d. --jam (satelit.hitung,
  mesin website): titik panas tanpa titik industri, luas, belum padam per provinsi/kabupaten/kecamatan. Terbakar 1 Jan = luas harian website
  sampai kemarin + luas hari ini s.d. jam. --jam lengkap = mode lama (hari kemarin penuh, langsung dari berkas website), dipakai untuk cek.
- Kejadian, status BPBD, kekeringan, gempa, TPA dari WA Koordalops 07.00 (wa_harian.koordalops); PM2.5 dari WA BMKG (wa_harian.bmkg).
- Aturan pemilik (Buku Pegangan, Riwayat 23-24 Okt): status karhutla ikut sisa belum padam data kita (0 ha selesai; >= 10 ha ditangani walau
  BPBD padam; < 10 ha selesai kecuali BPBD belum padam); provinsi berstatus Prioritas di website wajib masuk; perlu perhatian semua jenis;
  luas karhutla hanya angka kita (luas BPBD tidak tampil); tiap pil berikon; panel setinggi isinya; tanpa titik tengah.
- Templat = deck pemilik "Laporan Kejadian Bencana Harian 221026.pptx" (bukan di git; bawaan cache/templat/harian-221026.pptx)."""
import argparse, datetime as dt, json, os, posixpath, re, shutil, subprocess, sys, urllib.request, zipfile
from xml.sax.saxutils import escape

DI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, DI)
import wa_harian, banjir_data  # noqa: E402

AKAR = wa_harian.AKAR
BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
HARI_ID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
NAVY, ORG, MERAH, KER, SLATE, INK, ABU, TEKS = '051C2C', 'D9600B', 'C8102E', 'B08A3E', '5B7A99', '1A1A1A', '6B7280', '2E3440'
T_NAVY, T_ORG, T_MERAH, T_KER, T_SLATE = 'E6EAF0', 'FBE7D6', 'F8DDE0', 'F4ECDC', 'E3EAF1'
NAMA = {k: v['nama'].replace('Kepulauan ', 'Kep. ') for k, v in json.load(open(os.path.join(AKAR, 'public', 'data', 'laporan.json')))['prov'].items()}
SINGKAT = {'Kep. Bangka Belitung': 'Kep. Babel', 'Nusa Tenggara Timur': 'NTT', 'Nusa Tenggara Barat': 'NTB', 'Papua Barat Daya': 'Papua Barat Daya'}
PENDEK = lambda k: SINGKAT.get(NAMA[k]) or re.sub(r'^(Kalimantan|Sumatera|Sulawesi) ', lambda m: m.group(1)[:3] + '. ', NAMA[k])
# kawasan yang dilaporkan BPBD tanpa nama kabupaten: kecamatan pembentuknya (sama dengan kotak kawasan paparan Jatim 231026)
KAWASAN = {'Gunung Arjuno': ['35|Pasuruan|Prigen', '35|Pasuruan|Purwosari', '35|Malang|Singosari', '35|Malang|Lawang', '35|Malang|Karangploso',
                             '35|Kota Batu|Bumiaji', '35|Mojokerto|Gondang', '35|Mojokerto|Pacet', '35|Mojokerto|Trawas', '35|Mojokerto|Jatirejo']}
JENIS_LAIN = {'gempabumi': ('Gempa bumi', 'gempa', SLATE, T_SLATE), 'lainnya': ('Kebakaran TPA', 'api', 'A23B2A', 'F5E1DD'), 'banjir': ('Banjir', 'banjir', '2F6FB5', 'DCE7F5')}
WEB = ('peta_karhutla.json', 'peta_karhutla_kab.json', 'peta_karhutla_wil.json', 'harian30.json', 'kluster_awal.json')


def f0(v): return f'{int(round(v)):,}'.replace(',', '.')
def tgl_id(d, bulan=True): return f'{d.day} {BULAN[d.month - 1] if bulan else BULAN[d.month - 1][:3]} {d.year}'


def rentang(a, b):
    """'23–24 Oktober 2026' / '31 Oktober–1 November 2026'."""
    return f'{a.day}–{tgl_id(b)}' if a.month == b.month else f'{a.day} {BULAN[a.month - 1]}–{tgl_id(b)}'


# ------------------------------------------------------------------ angka
def ambil_web(ke):
    os.makedirs(ke, exist_ok=True)
    for f in WEB:
        req = urllib.request.Request(f'https://centurisk97.id/data/{f}', headers={'User-Agent': 'Mozilla/5.0 (generator laporan BNPB)'})
        open(os.path.join(ke, f), 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    return {f: json.load(open(os.path.join(ke, f))) for f in WEB}


def angka_karhutla(kej, web, tanggal, jam):
    """Isi x['sat'] = {'kum','sisa','hot'} tiap karhutla + daftar provinsi Prioritas website. Mode jam: hari laporan s.d. jam; mode lengkap: kemarin penuh."""
    P, K, WL, H = web['peta_karhutla.json'], web['peta_karhutla_kab.json'], web['peta_karhutla_wil.json'], web['harian30.json']
    hari = tanggal if jam else tanggal - dt.timedelta(days=1)
    i0 = P['hari'].index(WL['hari0'])
    # luas harian website sebelum hari data (kumulatif 1 Jan), lalu angka hari data
    sblm = (P['hari'].index((hari - dt.timedelta(days=1)).isoformat()))
    def web_prov(k, i):
        p = P['prov'].get(k); return (sum(v or 0 for v in p['luas'][:i + 1]) if p else 0)
    def web_kab(key, i):
        return sum(l for x, l, b in K['kab'].get(key, {'d': []})['d'] if x <= i)
    def web_kec(keys, i):
        n = 0
        for kk in keys:
            f = WL['d'].get(kk, [])
            n += sum(f[j + 2] for j in range(0, len(f), 5) if f[j] + i0 <= i)
        return n
    if jam:
        import satelit
        a = satelit.hitung(tanggal, jam, 1)
        hari_ini = lambda t, k: (lambda o: {'hot': o['hot_bersih'][-1], 'luas': o['luas'][-1], 'sisa': o['belum'][-1]} if o else {'hot': 0, 'luas': 0, 'sisa': 0})(a[t].get(k))
        def nilai(tingkat, k, kum_kemarin):
            if tingkat == 'kec':
                o = [hari_ini('kec', kk) for kk in k]; h = {m: sum(x[m] for x in o) for m in ('hot', 'luas', 'sisa')}
            else:
                h = hari_ini(tingkat, k)
            return {'kum': kum_kemarin + h['luas'], 'sisa': h['sisa'], 'hot': h['hot']}
        cutoff = a['cutoff']
    else:
        i, j = P['hari'].index(hari.isoformat()), H['hari'].index(hari.isoformat())
        def nilai(tingkat, k, kum_kemarin):
            if tingkat == 'prov':
                p = P['prov'].get(k, {'luas': [0] * 999, 'belum': [0] * 999})
                return {'kum': kum_kemarin + (p['luas'][i] or 0), 'sisa': p['belum'][i] or 0, 'hot': H['prov'].get(k, [0] * 999)[j]}
            if tingkat == 'kab':
                d = K['kab'].get(k, {'d': []})['d']
                return {'kum': kum_kemarin + next((l for x, l, b in d if x == i), 0), 'sisa': next((b for x, l, b in d if x == i), 0), 'hot': H['kab'].get(k, [0] * 999)[j]}
            o = {'kum': kum_kemarin, 'sisa': 0, 'hot': 0}
            for kk in k:
                f = WL['d'].get(kk, [])
                for n in range(0, len(f), 5):
                    if f[n] + i0 == i: o['kum'] += f[n + 2]; o['sisa'] += f[n + 3]; o['hot'] += f[n + 1]
            return o
        cutoff = P['dibuat']
    for x in kej:
        if x['jenis'] != 'karhutla':
            continue
        lok, p = x['lokasi'], x['prov']
        if not lok:
            x['sat'] = nilai('prov', p, web_prov(p, sblm))
        elif lok in KAWASAN:
            x['sat'] = nilai('kec', KAWASAN[lok], web_kec(KAWASAN[lok], sblm))
        else:
            key = f'{p}|{lok}'
            if key not in K['kab'] and key not in H['kab']:
                sys.exit(f'kabupaten {key!r} tidak ada di data website; tambahkan ke KAWASAN atau betulkan nama di WA')
            x['sat'] = nilai('kab', key, web_kab(key, sblm))
    prio = {f['properties']['prov'] for f in web['kluster_awal.json']['features'] if f['properties']['level'] == 3}
    return hari, cutoff, prio, (lambda k: nilai('prov', k, web_prov(k, sblm)))


def susun(wa, web, tanggal, jam):
    kej = [dict(x) for x in wa['kejadian']]
    hari, cutoff, prio, prov_baru = angka_karhutla(kej, web, tanggal, jam)
    # pedoman pemilik 23 Okt: provinsi berstatus Prioritas di website (cluster level 3) yang tidak ada di laporan Koordalops ditambahkan
    ada = {x['prov'] for x in kej if x['jenis'] == 'karhutla'}
    baru = sorted(({'jenis': 'karhutla', 'prov': k, 'lokasi': '', 'status': 'berjalan', 'angka': {}, 'sat': prov_baru(k)} for k in prio - ada), key=lambda x: -x['sat']['sisa'])
    # urutan tabel karhutla: baris provinsi dulu (sisa terbesar di atas), lalu kabupaten/kawasan menurut urutan provinsi di WA
    kh = [x for x in kej if x['jenis'] == 'karhutla']
    kh = sorted([x for x in kh if not x['lokasi']] + baru, key=lambda x: -x['sat']['sisa']) + [x for x in kh if x['lokasi']]
    kej = kh + [x for x in kej if x['jenis'] != 'karhutla']
    for y in kej:
        sisa = round(y['sat']['sisa']) if 'sat' in y else None
        # status karhutla ikut sisa data kita (pemilik 24 Okt); jenis lain ikut BPBD
        y['tangani'] = (y['status'] != 'selesai') if sisa is None else False if sisa == 0 else True if sisa >= 10 else y['status'] == 'belum'
        y['perhatian'] = y['tangani'] and ((sisa >= 100 or y['status'] == 'belum') if sisa is not None else y['status'] == 'belum')
    return {'hari': hari.isoformat(), 'cutoff': cutoff, 'kejadian': kej, 'prioritas_baru': [x['prov'] for x in baru]}


# ------------------------------------------------------------------ deck
class Deck:
    def __init__(s, ke, D, wa, w, tanggal, jam):
        s.ke, s.D, s.wa, s.w, s.tanggal, s.jam = ke, D, wa, w, tanggal, jam
        s.N, s.MED = [300], {}
        M, IK = os.path.join(ke, 'tpl', 'ppt', 'media') + '/', os.path.join(ke, 'ik') + '/'
        s.I = {'papan_p': M + 'image-2-2.png', 'awas_p': M + 'image-2-3.png', 'papan_n': M + 'image-2-4.png', 'seru_n': M + 'image-2-5.png', 'api_o': M + 'image-2-6.png',
               'daun_k': M + 'image-2-7.png', 'cek_p': M + 'image-2-10.png', 'titik3_p': M + 'image-2-11.png', 'api_p': M + 'image-2-12.png',
               'api_o2': M + 'image-2-13.png', 'heli_p': M + 'image-2-30.png', 'pendaki_p': M + 'image-2-31.png', 'daun_p': M + 'image-2-32.png', 'api_n': M + 'image-3-4.png',
               'rumah_k': M + 'image-3-36.png', 'orang_k': M + 'image-3-37.png', 'tetes_k': M + 'image-3-38.png', 'daun2_p': M + 'image-3-34.png',
               'peta.png': os.path.join(ke, 'peta.png')}
        for n in ('gempa', 'api', 'banjir', 'tenda', 'rumah', 'orang', 'hati', 'kalender', 'sampah', 'awas'):
            for c in ('putih', 'slate', 'merah', 'oranye', 'navy'):
                s.I[f'{n}_{c}'] = IK + f'{n}-{c}.png'
        s.I['awas_p2'], s.I['awas_b'] = IK + 'awas-putih.png', IK + 'awas-slate.png'
        KJ = D['kejadian']
        s.KJ, s.KH = KJ, [x for x in KJ if x['jenis'] == 'karhutla']
        s.KR, s.LN = [x for x in KJ if x['jenis'] == 'kekeringan'], [x for x in KJ if x['jenis'] not in ('karhutla', 'kekeringan')]
        s.KH_T, s.SER = [x for x in s.KH if x['tangani']], [x for x in KJ if x['perhatian']]
        s.N_SEL, s.N_TOT, s.N_PROV = sum(1 for x in KJ if not x['tangani']), len(KJ), len({x['prov'] for x in KJ})
        s.TT = json.load(open(os.path.join(ke, 'titik.json')))
        s.BJ = banjir_data.baca(AKAR, tanggal, NAMA)   # None = sumber banjir kosong: halaman banjir tidak dibuat
        hd = dt.date.fromisoformat(D['hari'])
        s.lbl_hari = f'{hd.day} {BULAN[hd.month - 1][:3].upper()}' + (f' S.D. {jam.replace(":", ".")}' if jam else '')
        s.lbl_kum = f'TERBAKAR 1 JAN–{hd.day} {BULAN[hd.month - 1][:3].upper()}'

    # primitif (sama dengan buat.py 241026)
    def nid(s): s.N[0] += 1; return s.N[0]
    def rpr(s, sz, b, c, spc=0): return f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""}{f" spc=\"{spc}\"" if spc else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>'
    def tx(s, x, y, w, h, paras, sz=1000, c=INK, b=False, al='l', an='t', spc=0, wrap='square'):
        ps = ''
        for p in paras:
            runs = [(p, c, b)] if isinstance(p, str) else [r if len(r) == 3 else (r[0], r[1], b) for r in p]
            ps += f'<a:p><a:pPr algn="{al}"><a:buNone/></a:pPr>' + ''.join(f'<a:r>{s.rpr(sz, rb, rc, spc)}<a:t>{escape(t)}</a:t></a:r>' for t, rc, rb in runs) + f'<a:endParaRPr lang="id-ID" sz="{sz}"/></a:p>'
        return (f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm>'
                f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="{wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="{an}"/><a:lstStyle/>{ps}</p:txBody></p:sp>')
    def kotak(s, x, y, w, h, fill=None, geom='rect', ln=None, adj=None, lw=9525):
        av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj is not None else ''
        f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
        l = f'<a:ln w="{lw}"><a:solidFill><a:srgbClr val="{ln}"/></a:solidFill></a:ln>' if ln else '<a:ln><a:noFill/></a:ln>'
        return f'<p:sp><p:nvSpPr><p:cNvPr id="{s.nid()}" name="K"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{max(int(w), 1)}" cy="{max(int(h), 1)}"/></a:xfrm><a:prstGeom prst="{geom}"><a:avLst>{av}</a:avLst></a:prstGeom>{f}{l}</p:spPr></p:sp>'
    def garis(s, x, y, w, c=INK, t=9525, h=0):
        return f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{s.nid()}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{t}"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
    def gambar(s, x, y, w, h, nama):
        rid = s.MED.setdefault(s.I[nama], f'rIdM{len(s.MED) + 1}')
        return f'<p:pic><p:nvPicPr><p:cNvPr id="{s.nid()}" name="G"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
    def kartu(s, x, y, ikon, tint, nilai, lab, warna, w=2021373):
        return (s.kotak(x, y, w, 512064, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=14286) + s.kotak(x + 109728, y + 91440, 329184, 329184, tint, 'ellipse')
                + s.gambar(x + 182880, y + 164592, 182880, 182880, ikon) + s.tx(x + 512064, y + 36576, w - 548640, 274320, [nilai], sz=1700, b=True, c=warna, an='ctr')
                + s.tx(x + 512064, y + 301752, w - 548640, 155448, [lab], sz=750, c=TEKS))
    def pil_bagian(s, x, y, w, teks, ikon, warna):
        return s.kotak(x, y, w, 182880, warna, 'roundRect', adj=50000) + s.gambar(x + 73152, y + 36576, 109728, 109728, ikon) + s.tx(x + 237744, y, w - 260000, 182880, [teks], sz=660, b=True, c='FFFFFF', spc=100, an='ctr', wrap='none')
    def status_ikon(s, x, y, d, st):
        return s.kotak(x, y, d, d, ORG if st else NAVY, 'ellipse') + s.gambar(x + d * .18, y + d * .18, d * .64, d * .64, 'titik3_p' if st else 'cek_p')
    def pil(s, x, y, teks, fill, warna, ikon, sz=620, h=164592, b=True):
        w = 120000 + len(teks) * sz * 62 + h * .9
        return (s.kotak(x, y, w, h, fill, 'roundRect', adj=50000) + s.gambar(x + h * .35, y + h * .2, h * .6, h * .6, ikon)
                + s.tx(x + h * .95, y, w - h * .95, h, [teks], sz=sz, b=b, c=warna, al='ctr', an='ctr', wrap='none')), w
    def geser(s, xml, dy):
        return re.sub(r'<a:off x="(\d+)" y="(-?\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) + dy}"/>', xml)

    # ---------------------------------------------------------- isi teks yang tergantung data
    def tindak(s):
        sisa = sorted((x for x in s.KH if x['tangani'] and not x['lokasi']), key=lambda x: -x['sat']['sisa'])
        b1 = [f"•  {NAMA[x['prov']]} sisa ±{f0(x['sat']['sisa'])} ha belum padam" for x in sisa[:1]]
        kab = [x['lokasi'] for x in s.KH if x['lokasi'] and x['status'] == 'belum' and x['tangani']]
        if kab:
            b1.append('•  ' + (', '.join(kab[:-1]) + ' dan ' + kab[-1] if len(kab) > 1 else kab[0]) + ' masih pemadaman')
        elif len(sisa) > 1:
            b1.append(f"•  {NAMA[sisa[1]['prov']]} sisa ±{f0(sisa[1]['sat']['sisa'])} ha belum padam")
        kota = list(dict.fromkeys(k for k, v, kat in s.w['pm'] if kat.lower() == 'berbahaya'))
        b2 = ['•  Masker dan layanan ISPA di ' + (', '.join(kota[:-1]) + ', dan ' + kota[-1] if len(kota) > 1 else kota[0]) + ', kota dengan PM2.5 Berbahaya'] if kota else ['•  Pemantauan kualitas udara di wilayah terdampak asap']
        if s.KR:
            kk = sum(x['angka'].get('kk', 0) for x in s.KR); lok = [x['lokasi'] for x in s.KR]
            tk, lt = sum(x['angka'].get('tangki', 0) for x in s.KR), sum(x['angka'].get('liter', 0) for x in s.KR)
            b3 = [f"•  Distribusi air bersih untuk ±{f0(kk)} KK di Kab. {', '.join(lok)}"] + ([f'•  Sudah tersalur {f0(tk)} tangki, {f0(lt)} liter'] if lt else [])
            k3 = ('daun_p', 'Air bersih', b3)
        else:
            g = next((x for x in s.LN if x['tangani']), None)
            k3 = ('awas_p', 'Pemulihan', [f"•  {JENIS_LAIN[g['jenis']][0]} {NAMA[g['prov']]}: pendampingan berlanjut"] if g else ['•  Pemantauan kejadian lain berlanjut'])
        return [('heli_p', 'Pemadaman prioritas', b1), ('pendaki_p', 'Keselamatan warga', b2), k3]

    def detail(s, x):
        a = x['angka']
        if x['jenis'] in ('gempabumi', 'banjir'):
            pil = []
            if a.get('transisi_sd'):
                d = dt.date.fromisoformat(a['transisi_sd']); pil.append((f'Transisi s.d. {d.day} {BULAN[d.month - 1][:3]}', T_ORG, ORG, 'kalender_oranye'))
            if a.get('huntara'): pil.append((f"{f0(a['huntara'])} huntara", T_NAVY, NAVY, 'rumah_navy'))
            stat = [((('±' if k in ('mengungsi', 'kk') else '') + f0(a[k])), lab, ik, c) for k, lab, ik, c in (('mengungsi', 'jiwa mengungsi', 'tenda_slate', SLATE), ('meninggal', 'jiwa meninggal', 'hati_merah', MERAH),
                                                                         ('rumah', 'rumah rusak', 'rumah_slate', SLATE)) if a.get(k)]
            if a.get('kk') and len(stat) < 3: stat.append((f"±{f0(a['kk'])}", 'KK terdampak', 'orang_slate', SLATE))
            return {'pil': pil, 'stat': stat}
        kon = x['teks']['kondisi'].lower()
        st = 'pendinginan' if 'pendinginan' in kon else 'masih pemadaman' if x['status'] == 'belum' else 'padam' if x['status'] == 'selesai' else 'penanganan'
        luas = [(f"± {f0(a['ha']) if a['ha'] == int(a['ha']) else str(a['ha']).replace('.', ',')} ha terbakar", 'F7F8FA', INK, 'sampah_slate')] if a.get('ha') else []
        return {'pil': luas + [(st, T_ORG if x['tangani'] else T_NAVY, ORG if x['tangani'] else NAVY, 'api_oranye' if x['tangani'] else 'kalender_navy')]}

    def judul(s):
        mulai = dt.date.fromisoformat(s.wa['mulai'][:10]); sampai = dt.date.fromisoformat(s.wa['sampai'][:10])
        H, P = (lambda t: (t, ORG, True)), (lambda t: (t, INK, True))
        J2 = [P(f'Laporan {rentang(mulai, sampai)}: '), H(f0(s.N_TOT)), P(' kejadian menonjol di '), H(f'{s.N_PROV} provinsi'), P(', terdiri atas '), H(f0(len(s.KH))), P(' karhutla, '),
              H(f0(len(s.KR))), P(' kekeringan, dan '), H(f0(len(s.LN))), P(' bencana lainnya; '), H(f0(len(s.KH_T))), P(' karhutla masih dalam proses penanganan')]
        pk = list(dict.fromkeys(NAMA[x['prov']] for x in s.KR))
        J3 = [P('Rincian '), H(f0(s.N_TOT)), P(' kejadian menonjol: '), H(f0(len(s.KH))), P(' karhutla ('), H(f0(len(s.KH_T))), P(' di antaranya masih dalam proses penanganan), '),
              H(f0(len(s.KR))), P(f" kekeringan{' di ' + ' dan '.join(pk) if pk else ''}, dan "), H(f0(len(s.LN))), P(' bencana lainnya')]
        return J2, J3

    # ---------------------------------------------------------- slide 2: ringkasan
    def s2(s):
        KJ, I = s.KJ, s.I
        o = s.kotak(548640, 1280160, 8579267, 932688, 'F3F5F8', 'roundRect', adj=7843) + s.pil_bagian(658368, 1335024, 1525219, 'KEJADIAN BENCANA', 'papan_p', NAVY)
        o += s.kotak(9402227, 1280160, 2240829, 932688, 'FCF1F2', 'roundRect', adj=7843) + s.pil_bagian(9511955, 1335024, 1453896, 'PERLU PERHATIAN', 'awas_p', MERAH)
        T = [('papan_n', T_NAVY, f0(s.wa['laporan']), 'laporan kejadian', NAVY), ('seru_n', T_NAVY, f0(s.N_TOT), 'kejadian menonjol', NAVY),
             ('api_o', T_ORG, f0(len(s.KH)), 'karhutla', ORG), ('daun_k', T_KER, f0(len(s.KR)), 'kekeringan', KER), ('awas_b', T_SLATE, f0(len(s.LN)), 'bencana lainnya', SLATE)]
        kw = (8359811 - 4 * 91440) // 5
        for i, t in enumerate(T): o += s.kartu(658368 + i * (kw + 91440), 1591056, *t, w=kw)
        o += s.kartu(9511955, 1591056, 'awas_merah', T_MERAH, f0(len(s.SER)), 'kejadian perlu perhatian', MERAH)
        MX, MY, MW, MH = 502920, 2331720, 7680960, 2880360
        o += s.gambar(MX, MY, MW, MH, 'peta.png')
        per = {}
        for x in KJ: per.setdefault(x['prov'], []).append(x)
        # posisi lingkaran: pusat poligon terbesar + GESER manual untuk provinsi yang rapat; label dipilih otomatis (kanan, kiri, bawah) yang
        # tidak menabrak lingkaran/label lain atau tepi peta; urutan KIRI/BAWAH lama jadi pilihan pertama provinsi itu.
        KIRI = {'15', '16', '61', '12', '32', '71', '64', '93', '95'}; BAWAH = {'33', '63', '73'}
        GESER = {'19': (40, 25), '32': (0, 10), '35': (40, 0), '96': (-30, 0), '73': (0, 30), '72': (-20, 0)}
        titik = {}
        for p in per:
            px, py = s.TT['pusat'][p]; dx, dy = GESER.get(p, (0, 0)); titik[p] = (MX + (px + dx) / s.TT['PW'] * MW, MY + (py + dy) / s.TT['PH'] * MH)
        besar = lambda xs: (lambda u: 219456 if u <= 1 else 265176 if u <= 3 else 310896)(sum(1 for x in xs if x['jenis'] == 'karhutla') or len(xs))
        terisi = [(cx - besar(per[p]) / 2, cy - besar(per[p]) / 2, cx + besar(per[p]) / 2, cy + besar(per[p]) / 2) for p, (cx, cy) in titik.items()]
        tabrak = lambda r: r[0] < MX or r[2] > MX + MW or any(not (r[2] <= q[0] or q[2] <= r[0] or r[3] <= q[1] or q[3] <= r[1]) for q in terisi)
        for p, xs in per.items():
            cx, cy = titik[p]
            nk = sum(1 for x in xs if x['jenis'] == 'karhutla'); nr = sum(1 for x in xs if x['jenis'] == 'kekeringan'); nl = len(xs) - nk - nr
            wl = JENIS_LAIN[next(x['jenis'] for x in xs if x['jenis'] not in ('karhutla', 'kekeringan'))][2] if nl else SLATE
            utama, warna = (nk, ORG) if nk else (nl, wl)
            d = besar(xs)
            o += s.kotak(cx - d / 2, cy - d / 2, d, d, warna, 'ellipse', ln='FFFFFF', lw=19050) + s.tx(cx - d / 2, cy - d / 2, d, d, [str(utama)], sz=850, b=True, c='FFFFFF', al='ctr', an='ctr')
            for n, w, sdx in ((nr, KER, 1), (nl if nk else 0, wl, -1)):
                if n:
                    q = 155448; o += s.kotak(cx + sdx * d * .42 - q / 2, cy + d * .42 - q / 2, q, q, w, 'ellipse', ln='FFFFFF', lw=12700) + s.tx(cx + sdx * d * .42 - q / 2, cy + d * .42 - q / 2, q, q, [str(n)], sz=650, b=True, c='FFFFFF', al='ctr', an='ctr')
            if any(x['perhatian'] for x in xs):
                q = 137160; o += s.kotak(cx + d * .42 - q / 2, cy - d * .42 - q / 2, q, q, MERAH, 'ellipse', ln='FFFFFF', lw=12700) + s.tx(cx + d * .42 - q / 2, cy - d * .42 - q / 2, q, q, ['!'], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr')
            nm = PENDEK(p); lw = 60000 + len(nm) * 52000
            yb = max(d / 2 + 27432, d * .42 + 77724 + 18288 if nr or (nl and nk) else 0)
            calon = {'kanan': (cx + d / 2 + 54864, cy - 73152, cx + d / 2 + 54864 + lw, cy + 73152), 'kiri': (cx - d / 2 - 54864 - lw, cy - 73152, cx - d / 2 - 54864, cy + 73152),
                     'bawah': (cx - lw / 2, cy + yb, cx + lw / 2, cy + yb + 146304)}
            urut = ['kiri', 'bawah', 'kanan'] if p in KIRI else ['bawah', 'kanan', 'kiri'] if p in BAWAH else ['kanan', 'kiri', 'bawah']
            sisi = next((u for u in urut if not tabrak(calon[u])), urut[0])
            r = calon[sisi]; terisi.append(r)
            o += (s.tx(r[2] - 1463040, cy - 73152, 1463040, 146304, [nm], sz=750, b=True, al='r', an='ctr') if sisi == 'kiri'
                  else s.tx(cx - 731520, cy + yb, 1463040, 146304, [nm], sz=750, b=True, al='ctr', an='ctr') if sisi == 'bawah'
                  else s.tx(r[0], cy - 73152, 1463040, 146304, [nm], sz=750, b=True, an='ctr'))
        lx = 1371600
        for bentuk, w, t, seru in [('rect', ORG, 'karhutla', False)] + ([('ellipse', KER, 'kekeringan', False)] if s.KR else []) + [('ellipse', v[2], v[0][0].lower() + v[0][1:], False) for k, v in JENIS_LAIN.items() if any(x['jenis'] == k for x in s.LN)] + [('ellipse', MERAH, 'perlu perhatian', True)]:
            q = 128016 if bentuk == 'rect' else 146304
            o += s.kotak(lx, 5207508 + (146304 - q) / 2, q, q, w, bentuk) + (s.tx(lx, 5207508, q, q, ['!'], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr') if seru else '')
            o += s.tx(lx + q + 54864, 5184648, 1100000, 192024, [t], sz=750, an='ctr'); lx += q + 54864 + len(t) * 52000 + 228600
        # status penanganan: batang selesai | belum selesai, lalu daftar perlu perhatian (semua jenis)
        o += s.kotak(8503920, 2331720, 3139135, 3017520, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(8668512, 2441448, 2864815, 182880, ['STATUS PENANGANAN'], sz=750, b=True, c=NAVY, spc=100)
        BW = 2809951; YB, HB = 2697480, 256032
        SEG = [(s.N_SEL, NAVY, 'selesai', 'cek_p'), (s.N_TOT - s.N_SEL, ORG, 'belum selesai', 'titik3_p')]
        lws = [max(731520, round(BW * SEG[0][0] / s.N_TOT))]; lws.append(BW - lws[0]); x0 = 8668512
        for (n, c, lab, ik), w0 in zip(SEG, lws):
            lt = 52000 * (len(lab) + len(f0(n)) + 1); xi = x0 + max(64008, (w0 - lt - 164592) // 2)
            if n: o += s.kotak(x0, YB, w0, HB, c) + s.gambar(xi, YB + (HB - 118872) / 2, 118872, 118872, ik) + s.tx(xi + 164592, YB, lt + 40000, HB, [[(f0(n), 'FFFFFF', True), (f' {lab}', 'FFFFFF', False)]], sz=800, an='ctr', wrap='none')
            x0 += w0
        YH = YB + HB + 91440; YL = YH + 228600
        o += s.tx(8668512, YH, 2864815, 182880, [f'PERLU PERHATIAN ({len(s.SER)})'], sz=750, b=True, c=MERAH, spc=60)
        daftar = sorted([x for x in s.SER if 'sat' in x], key=lambda x: -x['sat']['sisa']) + [x for x in s.SER if 'sat' not in x]
        rp = min(164592, (5280000 - YL) // max(1, len(daftar)))
        for n, x in enumerate(daftar):
            y = YL + n * rp; q = int(rp * .8)
            if n: o += s.garis(8668512, y - (rp - q) // 2, 2809951, 'F1F2F4')
            kar = x['jenis'] == 'karhutla'
            wj, ij = (ORG, 'api_p') if kar else (KER, 'daun_p') if x['jenis'] == 'kekeringan' else (JENIS_LAIN[x['jenis']][2], JENIS_LAIN[x['jenis']][1] + '_putih')
            o += s.kotak(8668512, y, q, q, wj, 'ellipse') + s.gambar(8668512 + q * .19, y + q * .19, q * .62, q * .62, ij)
            nm = [(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], TEKS, False)] if x['lokasi'] else [])
            o += s.tx(8869680, y - (164592 - q) // 2, 1758391, 164592, [nm], sz=680, an='ctr', wrap='none')
            if not kar:
                ikp = {'kekeringan': 'daun_k', 'gempabumi': 'gempa_slate', 'banjir': 'banjir_slate'}.get(x['jenis'], 'sampah_slate')
                a = x['angka']; teks = (f"±{f0(a['kk'])} KK" if x['jenis'] == 'kekeringan' and a.get('kk') else f"±{f0(a['mengungsi'])} mengungsi" if a.get('mengungsi')
                                       else f"±{str(a['ha']).replace('.', ',').removesuffix(',0')} ha terbakar" if a.get('ha') else x['status'])
                o += s.kotak(10545775, y, 932688, q, 'F3F5F8', 'roundRect', adj=50000) + s.gambar(10609783, y + q * .16, q * .68, q * .68, ikp) + s.tx(10746943, y, 713232, q, [teks], sz=620, b=True, c=INK, an='ctr', wrap='none')
                continue
            sis = f"sisa ± {f0(x['sat']['sisa'])} ha" if x['sat']['sisa'] else 'sisa –'
            o += s.kotak(10545775, y, 932688, q, T_ORG, 'roundRect', adj=50000) + s.gambar(10609783, y + q * .16, q * .68, q * .68, 'api_o2') + s.tx(10746943, y, 713232, q, [sis], sz=620, b=True, c=ORG, an='ctr', wrap='none')
        o += s.kotak(548640, 5468112, 11094415, 822960, 'FDF4EC', 'roundRect', adj=8889) + s.tx(694944, 5541264, 3657600, 182880, ['YANG AKAN DILAKUKAN BNPB'], sz=750, b=True, c=ORG, spc=100)
        for i, (ik, jd, isi) in enumerate(s.tindak()):
            x = 694944 + i * 3600602
            if i: o += s.garis(x - 73152, 5797296, 0, 'F2D3BA', h=457200)
            o += s.kotak(x, 5815584, 329184, 329184, ORG, 'ellipse') + s.gambar(x + 73152, 5888736, 182880, 182880, ik)
            o += s.tx(x + 420624, 5760720, 3051962, 201168, [jd], sz=900, b=True) + s.tx(x + 420624, 5961888, 3051962, 329184, isi, sz=720, c=TEKS)
        return o

    # ---------------------------------------------------------- slide 3: rincian
    def kepala(s, x, y, w, warna, tint, ikon, nama, n, h=457200):
        return (s.kotak(x, y, w, h, tint, 'roundRect', adj=16000) + s.kotak(x, y + h * .6, w, h * .4, tint) + s.kotak(x + 128016, y + (h - 292608) / 2, 292608, 292608, warna, 'ellipse')
                + s.gambar(x + 182880, y + (h - 182880) / 2, 182880, 182880, ikon) + s.tx(x + 502920, y, w - 1100000, h, [nama], sz=1100, b=True, an='ctr')
                + s.tx(x + w - 640080, y, 512064, h, [str(n)], sz=1800, b=True, c=warna, al='r', an='ctr'))

    def s3(s):
        KH, KR, LN = s.KH, s.KR, s.LN
        o = s.kotak(548640, 1325880, 6720840, 5029200, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + s.kepala(548640, 1325880, 6720840, ORG, T_ORG, 'api_p', 'Karhutla', len(KH))
        for t, x, w, al in (('LOKASI', 676656, 2194560, 'l'), (s.lbl_kum, 3291840, 1280160, 'l'), (f'{s.lbl_hari}: HOTSPOT, SISA', 4617720, 2523744, 'ctr')):
            o += s.tx(x, 1856232, w, 164592, [t], sz=650, b=True, c=ABU, spc=60, al=al)
        o += s.garis(676656, 2039112, 6464808, INK)
        baris = []
        for p in dict.fromkeys(x['prov'] for x in KH):
            xs = [x for x in KH if x['prov'] == p]
            if len(xs) > 1: baris.append(('grup', p, xs))
            baris += [('anak' if len(xs) > 1 else 'satu', p, [x]) for x in xs]
        y0, yb = 2057400, 6300000; rp = (yb - y0) // max(1, len(baris)); k = rp / 300446
        rp = min(rp, 300446)
        sz_n, sz_p = (int(920 * max(k, .78)), int(760 * max(k, .8))) if k < 1 else (920, 760)
        for n, (jenis, p, xs) in enumerate(baris):
            y = y0 + n * rp
            if n and jenis != 'grup': o += s.garis(676656, y, 6464808, 'EEF0F3')
            if jenis == 'grup':
                tot = sum(x['sat']['kum'] for x in xs); ph = int(rp * .62)
                o += s.kotak(676656, y + rp * .06, 6464808, rp * .88, 'F7F8FA') + s.tx(749808, y, 1645920, rp, [NAMA[p]], sz=sz_n, b=True, an='ctr')
                wn = 1645920 if len(NAMA[p]) > 14 else 1040000
                o += s.kotak(749808 + wn - 80000, y + (rp - ph) / 2, 638251, ph, T_ORG, 'roundRect', adj=50000) + s.gambar(749808 + wn - 80000 + ph * .35, y + (rp - ph) / 2 + ph * .2, ph * .6, ph * .6, 'api_o2') + s.tx(749808 + wn - 80000 + ph * .8, y + (rp - ph) / 2, 638251 - ph * .8, ph, [f'{len(xs)} kejadian'], sz=int(sz_p * .9), b=True, c=ORG, al='ctr', an='ctr')
                o += s.kotak(3291840, y + (rp - ph) / 2, 1005840, ph, 'FFFFFF', 'roundRect', ln='F2C9A8', adj=50000) + s.gambar(3291840 + ph * .4, y + (rp - ph) / 2 + ph * .2, ph * .6, ph * .6, 'api_o2') + s.tx(3291840 + ph * .8, y + (rp - ph) / 2, 1005840 - ph * .8, ph, [f'total ± {f0(tot)} ha'], sz=int(sz_p * .95), b=True, al='ctr', an='ctr')
                continue
            x = xs[0]; sa = x['sat']; ind = 164592 if jenis == 'anak' else 0; d = int(min(201168, rp * .66))
            o += s.status_ikon(676656 + ind, y + (rp - d) / 2, d, x['tangani'])
            nm = [(x['lokasi'], INK, False)] if jenis == 'anak' else [(NAMA[p], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])
            o += s.tx(950976 + ind, y, 2112264 - ind, rp, [nm], sz=sz_n, an='ctr', wrap='none')
            o += s.tx(3291840, y, 1234440, rp, [f"±  {f0(sa['kum'])} ha"], sz=int(sz_n * .98), b=True, an='ctr')
            if x['tangani']:
                ph = int(min(210312, rp * .7)); yy = y + (rp - ph) / 2; ic = int(ph * .65)
                o += s.kotak(4739006, yy, 1052584, ph, T_NAVY, 'roundRect', adj=50000) + s.gambar(4812158, yy + (ph - ic) / 2, ic, ic, 'api_n') + s.tx(4985894, yy, 796552, ph, [f"{f0(sa['hot'])} hotspot"], sz=sz_p, b=True, c=NAVY, an='ctr', wrap='none')
                sis = f"sisa ± {f0(sa['sisa'])} ha" if sa['sisa'] else 'sisa –'
                o += s.kotak(5864742, yy, 1155436, ph, T_ORG, 'roundRect', adj=50000) + s.gambar(5937894, yy + (ph - ic) / 2, ic, ic, 'api_o2') + s.tx(6111630, yy, 899404, ph, [sis], sz=sz_p, b=True, c=ORG, an='ctr', wrap='none')
        QX, QW = 7406640, 4236415; XL, XR = 7571232, 11478463
        lain, yy = '', 0
        for jn, (nama, ikon, warna, tint) in JENIS_LAIN.items():
            xs = [x for x in LN if x['jenis'] == jn]
            if not xs: continue
            if yy: yy += 54864
            lain += f'@{yy}@' + s.kotak(XL, 0, XR - XL, 182880, 'F3F5F8', 'roundRect', adj=30000) + s.kotak(XL + 45720, 18288, 146304, 146304, warna, 'ellipse') + s.gambar(XL + 73152, 45720, 91440, 91440, f'{ikon}_putih')
            p_, _ = s.pil(XL + 300000 + len(nama) * 64000, 27432, f'{len(xs)} kejadian', tint, warna, {'gempa': 'gempa_slate', 'api': 'api_merah', 'banjir': 'banjir_navy'}[ikon], sz=580, h=128016)
            lain += s.tx(XL + 237744, 0, 1600000, 182880, [nama], sz=820, b=True, an='ctr', wrap='none') + p_ + '@@'
            yy += 182880 + 18288
            for x in xs:
                dt_ = s.detail(x)
                lain += f'@{yy}@' + s.status_ikon(XL + 18288, 18288, 146304, x['tangani']) + s.tx(XL + 219456, 0, 2286000, 182880, [[(NAMA[x['prov']], INK, True)] + ([(', ' + x['lokasi'], INK, False)] if x['lokasi'] else [])], sz=760, an='ctr', wrap='none')
                px_ = XR - 18288; pills = ''
                for t, f, c, ik in reversed(dt_.get('pil', [])):
                    ww = 120000 + len(t) * 600 * 62 + 164592 * .9; px_ -= ww; pills += s.pil(px_, 9144, t, f, c, ik, sz=600, h=164592)[0]; px_ -= 36576
                lain += pills + '@@'
                yy += 182880 + 9144
                if dt_.get('stat'):
                    sw = (XR - XL - 219456 - 2 * 45720) // len(dt_['stat']); sx = XL + 219456
                    lain += f'@{yy}@'
                    for v, lab, ik, c in dt_['stat']:
                        lain += s.kotak(sx, 0, sw, 320040, 'F7F8FA', 'roundRect', adj=14000) + s.gambar(sx + 64008, 45720, 118872, 118872, ik) + s.tx(sx + 219456, 18288, sw - 240000, 164592, [v], sz=950, b=True, c=c, an='ctr', wrap='none')
                        lain += s.tx(sx + 64008, 182880, sw - 100000, 118872, [lab], sz=620, c=TEKS, an='ctr', wrap='none')
                        sx += sw + 45720
                    lain += '@@'; yy += 320040 + 18288
                yy += 9144
        LH = 411480 + yy + 64008
        # panel setinggi isinya (pemilik 24 Okt): kekeringan di atas, bencana lainnya langsung di bawahnya, keterangan menempel di bawahnya
        KB_isi = 2304288 + 320040 * (len(KR) + (len(KR) > 1)) + 137160 if KR else 1325880
        LY = KB_isi + 91440 if 6007608 - (KB_isi + 91440) >= LH else 6007608 - LH
        KB = LY - 91440
        if KR:
            o += s.kotak(QX, 1325880, QW, KB - 1325880, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.kepala(QX, 1325880, QW, KER, T_KER, 'daun2_p', 'Kekeringan', len(KR))
        for p in dict.fromkeys(x['prov'] for x in KR):
            xs = [x for x in KR if x['prov'] == p]
            tkk, tjw, tl, ttk = (sum(x['angka'].get(m, 0) for x in xs) for m in ('kk', 'jiwa', 'liter', 'tangki'))
            o += s.tx(XL, 1856232, 1828800, 201168, [NAMA[p]], sz=950, b=True, an='ctr') + s.kotak(8458200, 1883664, 640080, 146304, T_KER, 'roundRect', adj=50000) + s.gambar(8458200 + 51206, 1883664 + 29261, 87782, 87782, 'daun_k') + s.tx(8458200 + 117043, 1883664, 640080 - 117043, 146304, [f'{len(xs)} kejadian'], sz=620, b=True, c='8A6A2E', al='ctr', an='ctr')
            for t, x0 in (('LOKASI', XL), ('TERDAMPAK', 8686800), ('BANTUAN AIR', 10241280)): o += s.tx(x0, 2121408, 1200000, 146304, [t], sz=620, b=True, c=ABU, spc=60)
            o += s.garis(XL, 2286000, XR - XL, INK)
            tot = len(xs) > 1
            rp = min(320040, (KB - 91440 - 2304288) // (len(xs) + tot))
            def baris_air(y, kk, jw, liter, tangki, garis_c, b=True):
                r = s.gambar(8686800, y + (rp - 109728) / 2, 109728, 109728, 'rumah_k') + s.tx(8832000, y, 640000, rp, [kk], sz=800, b=True, an='ctr', wrap='none') + s.gambar(8832000 + 676656, y + (rp - 109728) / 2, 109728, 109728, 'orang_k') + s.tx(8832000 + 822960, y, 760000, rp, [jw], sz=800, c=TEKS, an='ctr', wrap='none')
                r += s.kotak(10241280, y + (rp - 155448) / 2, 1237183, 155448, 'FFFFFF', 'roundRect', ln=garis_c, adj=50000) + s.gambar(10296144, y + (rp - 155448) / 2 + 27432, 100584, 100584, 'tetes_k')
                return r + s.tx(10424160, y + (rp - 155448) / 2, 1030000, 155448, [[(liter, '8A6A2E' if not b else INK, True), (tangki, TEKS, False)]], sz=700, an='ctr', wrap='none')
            if tot:
                y = 2304288
                o += s.kotak(XL, y + rp * .08, XR - XL, rp * .84, 'F3F5F8', 'roundRect', adj=12000) + s.tx(XL + 91440, y, 1000000, rp, ['TOTAL'], sz=700, b=True, c=ABU, spc=60, an='ctr')
                o += baris_air(y, f'{f0(tkk)} KK', f'{f0(tjw)} jiwa', f'{f0(tl)} liter', f', {f0(ttk)} tangki', 'B08A3E', b=False)
            for n, x in enumerate(xs):
                y = 2304288 + (n + tot) * rp; a = x['angka']
                if n: o += s.garis(XL, y, XR - XL, 'EEF0F3')
                o += s.status_ikon(XL, y + (rp - 164592) / 2, 164592, True) + s.tx(XL + 228600, y, 1100000, rp, [x['lokasi']], sz=850, b=True, an='ctr')
                o += baris_air(y, f"{f0(a['kk'])} KK" if a.get('kk') else 'dalam pendataan', f"{f0(a['jiwa'])} jiwa" if a.get('jiwa') else 'dalam pendataan',
                               f"{f0(a['liter'])} liter" if a.get('liter') else 'belum dilaporkan', f", {f0(a['tangki'])} tangki" if a.get('tangki') else '', 'E2D3B5')
        if LN:
            o += s.kotak(QX, LY, QW, LH, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000) + s.kepala(QX, LY, QW, SLATE, T_SLATE, 'awas_p2', 'Bencana lainnya', len(LN), h=365760)
            o += re.sub(r'@(\d+)@(.*?)@@', lambda m: s.geser(m.group(2), LY + 411480 + int(m.group(1))), lain, flags=re.S)
        ket = s.kotak(QX, 6080760, QW, 274320, 'F7F8FA', 'roundRect', adj=30000) + s.tx(7974025, 6080760, 868680, 274320, ['KETERANGAN'], sz=680, b=True, spc=100, an='ctr')
        for x0, w, ik, t in ((9117025, NAVY, 'cek_p', 'selesai'), (10011308, ORG, 'titik3_p', 'dalam penanganan')):
            ket += s.kotak(x0, 6140196, 155448, 155448, w, 'ellipse') + s.gambar(x0 + 32004, 6172200, 91440, 91440, ik) + s.tx(x0 + 210312, 6080760, 1064362, 274320, [t], sz=750, an='ctr')
        o += s.geser(ket, (LY + LH if LN else KB) + 73152 - 6080760)
        return o


    # ---------------------------------------------------------- slide banjir (setelah rincian): status banjir dan rob dari sistem kita
    def judul_banjir(s):
        t = s.BJ['total']; hd = dt.date.fromisoformat(s.BJ['hari'])
        H, P = (lambda x: (x, ORG, True)), (lambda x: (x, INK, True))
        ada = [(t['awas'], 'Awas'), (t['siaga'], 'Siaga')]
        J = [P(f'Status banjir {tgl_id(hd)}: ')]
        for n, lab in ada:
            if n: J += [H(f'{n} provinsi'), P(f' {lab}, ')]
        if t['kejadian_aktif']: J += [H(f0(t['kejadian_aktif'])), P(' kejadian aktif, ')]
        if t['rob']: J += [H(f0(t['rob'])), P(' titik rob Waspada atau lebih, ')]
        if len(J) == 1: J += [P('tidak ada provinsi Siaga atau Awas, ')]
        J[-1] = (J[-1][0].rstrip(', '), J[-1][1], True)
        return J

    def s_banjir(s):
        B, o = s.BJ, ''
        ST = {3: ('Awas', MERAH, T_MERAH, 'banjir_merah'), 2: ('Siaga', ORG, T_ORG, 'banjir_oranye'), 1: ('Waspada', '8A6A2E', T_KER, 'banjir_kering'), 0: ('Normal', NAVY, T_NAVY, 'banjir_navy')}
        P, T = B['prov'], B['total']; jiwa = T['terpapar_jiwa'] is not None
        # Awas dan Siaga wajib masuk (aturan pemilik): baris sisanya diringkas bila lebih dari 12
        wajib = sum(p['status'] >= 2 for p in P); baris = P if len(P) <= max(12, wajib) else P[:max(11, wajib)] + [None]
        y0, yb = 2057400, 6260000; rp = min((yb - y0) // len(baris), 380000)
        LH_ = len(baris) * rp + y0 + 91440 - 1325880   # panel setinggi isinya
        o += s.kotak(548640, 1325880, 6720840, LH_, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=2000) + s.kepala(548640, 1325880, 6720840, '2F6FB5', 'DCE7F5', 'banjir_putih', 'Status banjir per provinsi', len(P))
        kol = [('PROVINSI', 676656, 1700000, 'l'), ('STATUS', 2400000, 1000000, 'ctr'), ('HUJAN 3 HARI TERBESAR', 3450000, 1700000, 'ctr'), ('KEJADIAN AKTIF', 5200000, 800000, 'ctr'),
               ('TITIK ROB', 5950000, 600000, 'ctr')] + ([('TERPAPAR', 6550000, 700000, 'ctr')] if jiwa else [])
        for t, x, w, al in kol: o += s.tx(x, 1856232, w, 164592, [t], sz=650, b=True, c=ABU, al=al)
        o += s.garis(676656, 2039112, 6464808, INK)
        hm = max([p['hujan3_mm'] or 0 for p in P] + [1])
        for n, p in enumerate(baris):
            y = y0 + n * rp
            if n: o += s.garis(676656, y, 6464808, 'EEF0F3')
            if p is None:
                sisa = P[len(baris) - 1:]
                o += s.tx(676656, y, 3000000, rp, [f'{len(sisa)} provinsi lainnya'], sz=720, c=TEKS, an='ctr', wrap='none'); continue
            nm, w, tint, ik = ST[p['status']]
            o += s.tx(676656, y, 1700000, rp, [p['nama']], sz=880, b=True, an='ctr', wrap='none')
            ph = int(min(200000, rp * .62)); _, pw = s.pil(0, 0, nm, tint, w, ik, sz=720, h=ph)
            o += s.pil(2900000 - pw / 2, y + (rp - ph) / 2, nm, tint, w, ik, sz=720, h=ph)[0]
            if p['hujan3_mm'] is not None:
                bw = 1100000 * p['hujan3_mm'] / hm
                o += s.kotak(3500000, y + rp * .3, 1100000, rp * .4, 'F3F5F8') + s.kotak(3500000, y + rp * .3, max(bw, 12000), rp * .4, '2F6FB5') + s.tx(4650000, y, 520000, rp, [f"{f0(p['hujan3_mm'])} mm"], sz=760, c=TEKS, an='ctr', wrap='none')
            o += s.tx(5200000, y, 800000, rp, ['–' if p['kejadian_aktif'] is None else f0(p['kejadian_aktif'])], sz=880, b=bool(p['kejadian_aktif']), c=NAVY if p['kejadian_aktif'] else ABU, al='ctr', an='ctr')
            o += s.tx(5950000, y, 600000, rp, ['–' if p['rob'] is None else f0(p['rob'])], sz=880, b=bool(p['rob']), c=NAVY if p['rob'] else ABU, al='ctr', an='ctr')
            if jiwa: o += s.tx(6550000, y, 700000, rp, [f0(p['terpapar_jiwa']) if p['terpapar_jiwa'] is not None else '–'], sz=800, c=TEKS, al='ctr', an='ctr', wrap='none')
        QX, QW = 7406640, 4236415; kw = (QW - 91440) // 2
        o += s.kotak(QX, 1325880, QW, 2377440, 'FFFFFF', 'roundRect', ln='BFC5CC', adj=3000) + s.tx(QX + 164592, 1417320, QW - 329184, 182880, ['RINGKAS PROVINSI'], sz=750, b=True, c=NAVY, spc=100)
        n_tot = T['awas'] + T['siaga'] + T['waspada']; bw = QW - 329184; x = QX + 164592
        for n, k in ((T['awas'], 3), (T['siaga'], 2), (T['waspada'], 1)):
            if n:
                ww = bw * n / n_tot; o += s.kotak(x, 1645920, ww, 201168, ST[k][1]) + s.tx(x, 1645920, ww, 201168, [str(n)], sz=750, b=True, c='FFFFFF', al='ctr', an='ctr'); x += ww
        kar = [('banjir_merah', T_MERAH, f0(T['awas']), 'provinsi Awas', MERAH), ('banjir_oranye', T_ORG, f0(T['siaga']), 'provinsi Siaga', ORG),
               ('banjir_navy', T_NAVY, '–' if T['kejadian_aktif'] is None else f0(T['kejadian_aktif']), 'kejadian banjir aktif', NAVY), ('banjir_slate', T_SLATE, '–' if T['rob'] is None else f0(T['rob']), 'titik rob Waspada atau lebih', SLATE)]
        for i, (ik, tint, v, lab, w) in enumerate(kar): o += s.kartu(QX + 164592 + (i % 2) * (kw - 80000 + 45720), 1965960 + (i // 2) * 594360, ik, tint, v, lab, w, w=kw - 80000)
        o += s.tx(QX + 164592, 3200400, QW - 329184, 560000, [f'Hari data {tgl_id(dt.date.fromisoformat(B["hari"]))}'
                                                            + (f', cut-off {s.jam.replace(":", ".")} WIB' if s.jam else '') + '.'], sz=720, c=TEKS)
        if B.get('rob_depan'):
            RD = B['rob_depan'][:6]
            o += s.kotak(QX, 3794760, QW, 160000 + 320000 + 228600 * len(RD), 'FFFFFF', 'roundRect', ln='BFC5CC', adj=4000)
            o += s.tx(QX + 164592, 3886200, QW - 329184, 182880, ['ROB 1 SAMPAI 3 HARI KE DEPAN'], sz=750, b=True, c=NAVY, spc=100)
            for i, r in enumerate(RD):
                y = 4160520 + i * 228600; nm, w, tint, ik = ST[r['lv']]; d = dt.date.fromisoformat(r['hari'])
                o += s.tx(QX + 164592, y, 2300000, 182880, [r['kec']], sz=760, an='ctr', wrap='none') + s.pil(QX + 2750000, y + 9144, nm, tint, w, ik, sz=700, h=164592)[0]
                o += s.tx(QX + 3500000, y, 570000, 182880, [f'{d.day} {BULAN[d.month - 1][:3]}'], sz=760, c=TEKS, al='r', an='ctr', wrap='none')
        o += s.tx(QX, 6080760, QW, 274320, [f'Sumber: Centurisk97, model banjir dan rob, data {tgl_id(dt.date.fromisoformat(B["hari"]))}'], sz=650, c=ABU, an='ctr')
        return o

    # ---------------------------------------------------------- rakit
    def bangun(s, templat, keluar):
        zi = zipfile.ZipFile(templat); F = {n: zi.read(n) for n in zi.namelist()}
        GEO = r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>'
        J2, J3 = s.judul()
        for i, judul, fn, szj in ((2, J2, s.s2, 2000), (3, J3, s.s3, 2200)):   # judul dua baris: slide 2 lebih panjang, huruf sedikit lebih kecil
            s.N[0] = 300; s.MED.clear()
            sk = F[f'ppt/slides/slide{i}.xml'].decode(); a = sk.index('</p:grpSpPr>') + len('</p:grpSpPr>'); b = sk.index('</p:spTree>')
            simpan = []
            for blk in re.findall(r'<p:sp>.*?</p:sp>|<p:pic>.*?</p:pic>|<p:cxnSp>.*?</p:cxnSp>', sk[a:b], re.S):
                g = re.search(GEO, blk); g = tuple(map(int, g.groups())) if g else None
                if blk.startswith('<p:pic>') and 'r:embed="rId1"' in blk: simpan.append(blk); continue
                if g and ((g[3] == 0 and g[1] in (1207008, 6446520)) or g[1] == 6510528): simpan.append(blk)
            if i == 3: dekor3 = (sk[:a], sk[b:], simpan)
            body = fn()
            jd = s.tx(548640, 292608, 10454335, 822960, [[(t, c, True) for t, c, _ in judul]], sz=szj, an='b')
            F[f'ppt/slides/slide{i}.xml'] = (sk[:a] + ''.join(simpan) + jd + body + sk[b:]).encode()
            rel = F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode()
            tetap = ''.join(r for r in re.findall(r'<Relationship [^>]*/>', rel) if 'Id="rId1"' in r or '/image"' not in r)
            nama = lambda p: 'h-' + os.path.relpath(p, s.ke).replace('/', '-')
            F[f'ppt/slides/_rels/slide{i}.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + tetap
                + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{nama(p)}"/>' for p, r in s.MED.items()) + '</Relationships>').encode()
            for p in s.MED: F[f'ppt/media/{nama(p)}'] = open(p, 'rb').read()
        if s.BJ:   # klon slide 3 (kerangka sama), isi diganti, disisipkan sebagai slide 4; penutup jadi slide 5
            s.N[0] = 300; s.MED.clear(); body = s.s_banjir(); awal, akhir, dekor = dekor3
            tetap = [x.replace('<a:t>3</a:t>', '<a:t>4</a:t>') for x in dekor]   # dekor slide 3 (logo, garis, nomor halaman) tanpa isinya
            jd = s.tx(548640, 292608, 10454335, 822960, [[(t, c, True) for t, c, _ in s.judul_banjir()]], sz=2200, an='b')
            F['ppt/slides/slide5.xml'] = (awal + ''.join(tetap) + jd + body + akhir).encode()
            rel = F['ppt/slides/_rels/slide3.xml.rels'].decode()
            keep = ''.join(r for r in re.findall(r'<Relationship [^>]*/>', rel) if 'Id="rId1"' in r or '/image"' not in r)
            nama = lambda p: 'h-' + os.path.relpath(p, s.ke).replace('/', '-')
            F['ppt/slides/_rels/slide5.xml.rels'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + keep
                + ''.join(f'<Relationship Id="{r}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{nama(p)}"/>' for p, r in s.MED.items()) + '</Relationships>').encode()
            for p in s.MED: F[f'ppt/media/{nama(p)}'] = open(p, 'rb').read()
            F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'<Override PartName="/ppt/slides/slide4.xml"', b'<Override PartName="/ppt/slides/slide5.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide4.xml"', 1)
            F['ppt/_rels/presentation.xml.rels'] = F['ppt/_rels/presentation.xml.rels'].replace(b'</Relationships>', b'<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide5.xml"/></Relationships>')
            F['ppt/presentation.xml'] = F['ppt/presentation.xml'].replace(b'<p:sldId id="259" r:id="rId5"/>', b'<p:sldId id="260" r:id="rId99"/><p:sldId id="259" r:id="rId5"/>', 1)
        mulai = dt.datetime.strptime(s.wa['mulai'], '%Y-%m-%d %H.%M'); sampai = dt.datetime.strptime(s.wa['sampai'], '%Y-%m-%d %H.%M')
        jam = lambda t: f'{t.day} {BULAN[t.month - 1][:3]} {t.year}, {t:%H.%M}'
        GANTI = {1: [('21 Okt 2026, 07.00  –  22 Okt 2026, 07.00 WIB', f'{jam(mulai)}  –  {jam(sampai)} WIB'), ('Kamis, 22 Oktober 2026', f'{HARI_ID[s.tanggal.weekday()]}, {tgl_id(s.tanggal)}')],
                 4: [('Laporan Kejadian Bencana Harian, 21–22 Oktober 2026', f'Laporan Kejadian Bencana Harian, {rentang(mulai.date(), sampai.date())}')]}
        for i, gs in GANTI.items():
            x = F[f'ppt/slides/slide{i}.xml'].decode()
            for a_, b_ in gs: assert x.count(a_) == 1, f'templat bukan deck 221026: {a_!r}'; x = x.replace(a_, b_)
            F[f'ppt/slides/slide{i}.xml'] = x.encode()
        x = F['ppt/slides/slide4.xml'].decode(); blk = [b for b in re.findall(r'<p:sp>.*?</p:sp>', x, re.S) if 'Lampiran (data rinci)' in b]
        if blk: F['ppt/slides/slide4.xml'] = x.replace(blk[0], '').encode()   # deck tanpa lampiran (pemilik 23 Okt)
        for i in (1, 2, 3, 4) + ((5,) if s.BJ else ()):
            t = re.sub(r'<[^>]+>', '', F[f'ppt/slides/slide{i}.xml'].decode())
            assert '·' not in t and '—' not in t, f'titik tengah / em dash di slide {i}'
        dipakai = set()
        for n, v in F.items():
            if n.endswith('.rels'):
                dipakai |= {t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(posixpath.dirname(n)), t)) for t in re.findall(r'Target="([^"]+)"', v.decode())}
        for n in [n for n in F if n.startswith('ppt/media/') and n not in dipakai]: del F[n]
        ct = F['[Content_Types].xml'].decode()
        F['[Content_Types].xml'] = re.sub(r'<Override PartName="/([^"]+)"[^>]*/>', lambda m: m.group(0) if m.group(1) in F else '', ct).encode()
        zo = zipfile.ZipFile(keluar, 'w', zipfile.ZIP_DEFLATED)
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
        zo.close()


def utama():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--tanggal', required=True, help='hari laporan (YYYY-MM-DD), = tanggal akhir periode WA 07.00')
    ap.add_argument('--koordalops', required=True); ap.add_argument('--bmkg', required=True)
    ap.add_argument('--jam', default='12:00', help="cut-off WIB hari laporan (bawaan 12:00); 'lengkap' = hari kemarin penuh dari berkas website")
    ap.add_argument('--out', default='.'); ap.add_argument('--templat', default=os.path.join(DI, 'cache', 'templat', 'harian-221026.pptx'))
    g = ap.parse_args()
    tanggal = dt.date.fromisoformat(g.tanggal); jam = None if g.jam == 'lengkap' else g.jam
    if not os.path.exists(g.templat):
        sys.exit(f'templat tidak ada: {g.templat} (salin "Laporan Kejadian Bencana Harian 221026.pptx" pemilik ke sana)')
    wa = wa_harian.koordalops(open(g.koordalops).read()); w = wa_harian.bmkg(open(g.bmkg).read())
    if wa['sampai'][:10] != g.tanggal:
        sys.exit(f"WA Koordalops s.d. {wa['sampai']} bukan hari laporan {g.tanggal}")
    ke = os.path.abspath(os.path.join(g.out, f'kerja-{tanggal:%d%m%y}')); os.makedirs(ke, exist_ok=True)
    web = ambil_web(os.path.join(ke, 'web'))
    D = susun(wa, web, tanggal, jam)
    json.dump(D, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
    if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
    zipfile.ZipFile(g.templat).extractall(os.path.join(ke, 'tpl'))
    subprocess.run(['node', os.path.join(DI, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
    if not os.path.exists(os.path.join(ke, 'ik', 'awas-merah.png')):
        subprocess.run(['node', os.path.join(DI, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
    nama = os.path.join(os.path.abspath(g.out), f'Laporan Kejadian Bencana Harian {tanggal:%d%m%y}.pptx')
    dk = Deck(ke, D, wa, w, tanggal, jam); dk.bangun(g.templat, nama)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', os.path.abspath(g.out), nama], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('ok', nama, '| cut-off', D['cutoff'], '| hari data', D['hari'], '| kejadian', dk.N_TOT, 'karhutla', len(dk.KH), 'ditangani', len(dk.KH_T),
          'perlu perhatian', len(dk.SER), 'selesai', dk.N_SEL, '| Prioritas ditambah', D['prioritas_baru'])


if __name__ == '__main__':
    utama()
