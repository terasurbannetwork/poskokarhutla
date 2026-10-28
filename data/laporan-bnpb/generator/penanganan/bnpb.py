"""Isi bagian deck Penanganan yang bersumber laporan BNPB/BMKG dari teks WA yang diurai wa_operasi.py (dipanggil penanganan.py).
- slide tabel (slide1.xml): pil PM2.5 = stasiun BMKG tertinggi per provinsi; di luar daftar = "PM2.5 < nilai ke-10". Pil cuaca dari potensi cuaca BMKG.
  Jenis pil (warna + ikon) disalin dari pustaka pil templat 211026 (slide1 dan slide2 sumber), jadi tak bergantung provinsi mana yang ada di baris.
- slide operasi (slide3.xml): armada, OMC 4 provinsi templat (Kalbar, Kalteng, Sumsel, Kalsel), semai 2 provinsi berbahan terbanyak;
  rincian personel per instansi templat dibuang (tidak ada di WA).
  Hanya dengan penanganan.py --operasi (teks WA satgas hari itu); tanpa itu halaman operasi dibuang (tambah_peta.buang_slide),
  karena WA satgas tidak diarsipkan dan hari lampau tak bisa diisi."""
import re
from kisi import lebar_teks

X_PM, X_CU = 2798064, 3767328   # x pil PM2.5 dan pil cuaca di tiap baris
T0, PB = 2316480, 518160         # y pil baris 1 tabel, jarak baris
BULAN = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember')
bln = lambda d: f'{d.day} {BULAN[d.month - 1][:3]}'


def rep(s, a, b, n=1):
    assert s.count(a) == n, (a, s.count(a)); return s.replace(a, b)


def blok(s, x, y):
    """(awal, akhir) potongan XML satu pil: <p:sp> bentuk di (x, y) + <p:pic> ikon + <p:sp> teks."""
    m = re.search(rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="{x}" y="{y}"/>(?:(?!</p:sp>).)*?</p:sp>\s*<p:pic>.*?</p:pic>\s*<p:sp>.*?</p:sp>', s, re.S)
    assert m and m.group(0).count('<p:sp>') == 2, (x, y); return m.start(), m.end()


def isi_pil(s, x, y, teks, donor_y=None):
    """Ganti teks pil di (x, y). donor_y: salin jenis pil (warna, ikon, warna teks) dari pil di (x, donor_y)."""
    a, b = blok(s, x, y)
    if donor_y is not None:
        da, db = blok(s, x, donor_y)
        baru = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) - donor_y + y}"/>', s[da:db])
        ids = re.findall(r'<p:cNvPr id="(\d+)"', s[a:b])   # pakai id pil lama: tetap unik
        baru = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', baru)
        s = s[:a] + baru + s[b:]; a, b = blok(s, x, y)
    pot = s[a:b]
    lama = re.findall(r'<a:t>([^<]*)</a:t>', pot); assert len(lama) == 1, lama
    pot = pot.replace(f'<a:t>{lama[0]}</a:t>', f'<a:t>{teks}</a:t>')
    if len(teks) > 12: pot = pot.replace('wrap="square"', 'wrap="none"')   # "CERAH BERAWAN" sedikit lebih lebar dari kotak teks; muat di dalam pil
    # teks lebih lebar dari kotaknya tertutup pil sebelah ("231 SGT TDK SEH", 28 Okt 2026): huruf dikecilkan secukupnya, pil lain tetap
    tx = next(t for t in re.findall(r'<p:sp>.*?</p:sp>', pot, re.S) if '<a:t>' in t)   # kotak tulisan pil (bukan latar/ikon)
    kotak, sz = int(re.search(r'<a:ext cx="(\d+)"', tx).group(1)), int(re.search(r'sz="(\d+)"', tx).group(1))
    w = lebar_teks([(teks.replace('&lt;', '<'), sz, True)])
    if w > kotak * 1.02:   # metrik Arial sedikit lebih lebar dari Roboto: "HUJAN SEDANG" (+1,5%) tampil utuh, jangan ikut dikecilkan
        pot = pot.replace(tx, re.sub(r'sz="\d+"', f'sz="{sz * kotak // w // 10 * 10}"', tx))
    return s[:a] + pot + s[b:]


def teks(s, lama, baru, n=1):
    return rep(s, f'<a:t>{lama}</a:t>', f'<a:t>{baru}</a:t>', n)


def sp_di(s, x, y):
    """(awal, akhir) satu <p:sp> dengan offset (x, y); harus tunggal."""
    hit = [m.span() for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', s, re.S) if f'<a:off x="{x}" y="{y}"/>' in m.group(0)]
    assert len(hit) >= 1, (x, y); return hit


def ubah_sp(s, x, y, teks_baru=None, x_baru=None, cx=None, semua=True):
    """Ubah semua <p:sp> di (x, y) (bentuk + kotak teksnya): teks, posisi x, lebar."""
    for a, b in reversed(sp_di(s, x, y)):
        p = s[a:b]
        if teks_baru is not None and '<a:t>' in p:
            lama = re.findall(r'<a:t>([^<]*)</a:t>', p)   # teks bertingkat ('10' + ' unit'): run pertama saja
            p = p.replace(f'<a:t>{lama[0]}</a:t>', f'<a:t>{teks_baru}</a:t>', 1)
        if cx is not None: p = re.sub(r'(<a:off x=")\d+(" y="\d+"/><a:ext cx=")\d+', lambda m: f'{m.group(1)}{x_baru if x_baru is not None else x}{m.group(2)}{cx}', p)
        elif x_baru is not None: p = p.replace(f'<a:off x="{x}" y="{y}"/>', f'<a:off x="{x_baru}" y="{y}"/>')
        s = s[:a] + p + s[b:]
    return s


def lebar_pil(t): return round(72000 * len(t) + 130000)   # sejalan dengan pil yang ada: 'BELUM HUJAN' 925.373, 'HUJAN RINGAN–LEBAT' 1.386.230



def pustaka(sl1, sl2):
    """Pil contoh per jenis dari slide templat sumber (slide2: rId diberi awalan S2 seperti ganti.py). -> {(x, jenis): xml}"""
    out = {}
    for s, awal in ((sl1, ''), (sl2, 'S2')):
        for x in (X_PM, X_CU):
            for m in re.finditer(rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="{x}" y="(\d+)"/>(?:(?!</p:sp>).)*?</p:sp>\s*<p:pic>.*?</p:pic>\s*<p:sp>.*?</p:sp>', s, re.S):
                b, t = m.group(0), re.findall(r'<a:t>([^<]*)</a:t>', m.group(0))[0]
                j = ('berbahaya' if 'BERBAHAYA' in t else 'tidak sehat' if 'SEHAT' in t else 'rendah') if x == X_PM else \
                    ('hujan' if 'HUJAN' in t and 'TANPA' not in t else 'angin' if 'ANGIN' in t else 'cerah')
                if awal: b = re.sub(r'r:embed="(\w+)"', rf'r:embed="{awal}\1"', b)
                out.setdefault((x, j), (int(m.group(1)), b))
    return out


def pasang(s, lib, x, y, jenis, teks_):
    """Ganti pil di (x, y) dengan pil jenis itu dari pustaka (posisi digeser, id lama dipakai), lalu isi teksnya."""
    y0, b = lib[(x, jenis)]
    a, z = blok(s, x, y)
    baru = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{int(m.group(2)) - y0 + y}"/>', b)
    ids = re.findall(r'<p:cNvPr id="(\d+)"', s[a:z])
    baru = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', baru)
    s = s[:a] + baru + s[z:]
    return isi_pil(s, x, y, teks_)


def ganti_tabel(s, lib, top6, bm):
    """bm dari wa_operasi.bmkg (stasiun BMKG tertinggi; provinsi di luar daftar tak punya angka) ATAU pil_sendiri.bahan
    (rata-rata provinsi, semua provinsi punya angka). Keduanya sebentuk, jadi kedua kelas rendah ikut dilayani di sini."""
    for i, k in enumerate(top6):
        y = T0 + i * PB
        v, kat = (bm['pm'][k][0], bm['pm'][k][1]) if k in bm['pm'] else (None, '')
        if 'bahaya' in kat:
            s = pasang(s, lib, X_PM, y, 'berbahaya', f'{round(v)} BERBAHAYA')
        elif 'tidak sehat' in kat:
            s = pasang(s, lib, X_PM, y, 'tidak sehat', f'{round(v)} SGT TDK SEHAT' if 'sangat' in kat else f'{round(v)} TIDAK SEHAT')
        elif v is not None:
            s = pasang(s, lib, X_PM, y, 'rendah', f'{round(v)} {kat.upper()}' if kat else f'PM2.5 {round(v)}')
        else:
            s = pasang(s, lib, X_PM, y, 'rendah', f'PM2.5 &lt; {round(bm["pm_ke10"])}')
        h, a = k in bm['hujan'] or k in bm['lebat'], k in bm['angin']
        s = pasang(s, lib, X_CU, y, 'hujan' if h else 'angin' if a else 'cerah',
                   ('HUJAN LEBAT' if k in bm['lebat'] else 'HUJAN, ANGIN' if a else 'HUJAN SEDANG') if h else 'ANGIN KENCANG' if a else 'CERAH BERAWAN')
    # legenda biru = pil cuaca saja (pemilik 27 Okt 2026: "bukannya prakiraan cuaca?"); tanggal PM2,5 pil_sendiri (hari sebelumnya) tak ditulis
    return rep(s, '<a:t>prakiraan cuaca 20–22 Okt</a:t>', f'<a:t>prakiraan cuaca {bm["periode"]}</a:t>')



def ganti_tabel_banjir(s, lib, top6, st, h3, tgl):
    """Versi banjir dari ganti_tabel: kolom pil kiri = status banjir provinsi hari laporan (wilayah_hari, tertinggi kabupaten),
    kolom pil kanan = hujan 3 hari terakhir tertinggi kecamatan (mm, None = tak ada kecamatan tercatat). Jenis pil dipinjam
    dari pustaka PM2,5/cuaca templat: Awas = merah, Siaga = oranye, lainnya = abu; hujan > 0 = pil hujan."""
    for i, k in enumerate(top6):
        y = T0 + i * PB
        v = st.get(k) or 'Normal'
        s = pasang(s, lib, X_PM, y, {'Awas': 'berbahaya', 'Siaga': 'tidak sehat'}.get(v, 'rendah'), v.upper())
        h = h3.get(k)
        s = pasang(s, lib, X_CU, y, 'hujan' if h else 'cerah', f'HUJAN {round(h)} MM' if h else 'TIDAK TERCATAT')
    s = rep(s, '<a:t>PM2.5 berbahaya</a:t>', '<a:t>status Awas</a:t>')
    s = rep(s, '<a:t>PM2.5 tidak sehat</a:t>', '<a:t>status Siaga</a:t>')
    return rep(s, '<a:t>prakiraan cuaca 20–22 Okt</a:t>', f'<a:t>hujan 3 hari s.d. {tgl}</a:t>')

def singkat(t, n=46):
    t = re.sub(r',?\s+dan\s+', ', ', t.replace('Kabupaten ', '').replace(' dan sekitarnya', ''))
    return t if len(t) <= n else t[:t.rfind(',', 0, n - 5)] + ', dll.'


OMC_BARIS = [('Kalimantan Barat', 3108960, 3170682, 3294126), ('Kalimantan Tengah', 3552444, 3614166, 3737610),
             ('Sumatera Selatan', 3995928, 4057650, 4181094), ('Kalimantan Selatan', 4439412, 4501134, 4624578)]   # nama, y teks, y pil, y titik


def pasang_sp(s, x, y, proto, label):
    """Pil slide operasi = dua <p:sp> (bentuk + teks) di (x, y). Ganti dengan proto (y0, xml) digeser ke y, id lama dipakai, lalu teks + lebar."""
    y0, b = proto
    hit = sp_di(s, x, y); ids = [i for a_, z_ in hit for i in re.findall(r'<p:cNvPr id="(\d+)"', s[a_:z_])]
    baru = b.replace(f'y="{y0}"', f'y="{y}"')
    baru = re.sub(r'<p:cNvPr id="\d+"', lambda m, it=iter(ids): f'<p:cNvPr id="{next(it)}"', baru)
    a0 = hit[0][0]
    for a_, z_ in reversed(hit): s = s[:a_] + s[z_:]
    s = s[:a0] + baru + s[a0:]
    return ubah_sp(s, x, y, label, cx=lebar_pil(label))


def ganti_operasi(s, op):
    # judul dan pil tanggal = tanggal laporan WA, bukan hari kegiatan di isinya (pemilik 28 Okt 2026: "bukannya udah ada tanggal 28?");
    # sama dengan label cut-off luas terbakar (kegiatan 27 Okt dilaporkan 28 Okt)
    D = op.get('tanggal_laporan') or op['tanggal']
    ARMADA = sorted(([n, p, w] for n, (p, w) in op['armada'].items()), key=lambda r: -(r[1] + r[2]))
    s = teks(s, '21', str(D.day)); s = teks(s, ' Oktober ', f' {BULAN[D.month - 1]} ')   # judul templat 211026: data per tanggal D
    # personel (per provinsi dan per instansi) tidak diganti: templat sudah memuat angka WA 21 s.d. 26 Okt; WA tak memuat rincian instansi
    pendek = {'Kalimantan Tengah': 'Kalteng', 'Riau': 'Riau', 'Kalimantan Barat': 'Kalbar', 'Sumatera Selatan': 'Sumsel', 'Kalimantan Selatan': 'Kalsel', 'Jambi': 'Jambi'}
    for n, v in op['personel'].items():
        assert f'<a:t>{pendek[n]}</a:t>' in s and f'<a:t>{v:,}</a:t>'.replace(',', '.') in s, f'personel {n} {v} beda dengan templat: isi ulang halaman personel'
    pat, wb = sum(r[1] for r in ARMADA), sum(r[2] for r in ARMADA)
    omc = {n: o for n, o in op['omc'].items() if o['sortie'] or o['sasaran']}   # Kalsel 26 Okt: disasar Hercules yang terbang dari Kalteng
    ada = [n for n, *_ in OMC_BARIS if n in omc]   # baris templat tanpa OMC dibuang (Kalbar 26 Okt; pemilik 27 Okt 2026)
    hujan = [n for n in ada if op['omc'][n].get('hujan')]
    hujan_wa = [n for n, o in op['omc'].items() if o.get('hujan')]   # subjudul: semua provinsi yang hujannya dilaporkan WA, bukan hanya 4 baris OMC
    s = teks(s, '51', str(pat + wb)); s = teks(s, '4 provinsi', 'OMC#'); s = teks(s, '3 provinsi', f'{len(hujan_wa)} provinsi'); s = teks(s, 'OMC#', f'{len(omc)} provinsi')   # penanda: hasil pertama bisa sama dengan teks kedua
    s = teks(s, '15', str(pat)); s = teks(s, '36', str(wb))
    s = teks(s, '51 unit', f'{pat + wb} unit'); s = teks(s, '15 ', f'{pat} '); s = teks(s, '36 ', f'{wb} ')
    # ---- hujan setelah OMC: 4 baris templat; pil biru (hujan) / abu (belum hujan) dari baris Kalbar / Kalsel templat
    proto = lambda y0: (y0, ''.join(s[a_:z_] for a_, z_ in sp_di(s, 3561885, y0)))
    pil = {'biru': proto(3170682), 'abu': proto(4501134)}   # Kalbar templat = biru (hujan), Kalsel templat = abu (belum hujan)
    s = teks(s, '19 Okt', bln(D)); s = teks(s, '3 dari 4 provinsi hujan', f'{len(hujan)} dari {len(ada)} provinsi hujan')
    s = teks(s, 'HUJAN SETELAH OMC', 'OMC DAN HUJAN')   # baris tanpa sortie (Kalbar 26 Okt) tetap memuat hujan yang dilaporkan WA: bukan hasil OMC
    lama_sas = ['Ketapang, Kayong Utara', 'Barito Selatan, Seruyan, Kotawaringin Timur dan Barat', 'Ogan Ilir, OKI, Banyuasin, Palembang', 'Tabalong, Banjar, Barito Kuala']
    lama_has = ['13 kab/kota, termasuk 2 sasaran', 'di 4 kabupaten sasaran', 'Ogan Ilir dan Lahat', 'radar BMKG 24 jam']
    for (nama, yt, yp, yd), ls, lh in zip(OMC_BARIS, lama_sas, lama_has):
        o = op['omc'].get(nama) or {'sortie': 0, 'hujan': None, 'sasaran': ''}
        s = teks(s, ls, singkat(o['sasaran']) if o['sasaran'] else 'tidak ada sortie')
        h = o['hujan']
        label = ('HUJAN ' + h['intensitas'].upper().replace(' HINGGA ', '–')).strip() if h else 'BELUM HUJAN'
        s = pasang_sp(s, 3561885, yp, pil['biru' if h else 'abu'], label)
        s = teks(s, lh, ('di ' + singkat(h['lokasi'], 40)) if h else f'belum ada laporan hujan {bln(D)}')
        for e, f in sp_di(s, 676656, yd): s = s[:e] + re.sub(r'val="(4A9BE0|C4CAD3)"', f'val="{"4A9BE0" if h else "C4CAD3"}"', s[e:f]) + s[f:]
    s = rapat_omc(s, ada)
    # ---- semai: 2 provinsi berbahan terbanyak (baris templat Kalteng, Sumsel)
    dua = sorted(((n, o) for n, o in omc.items() if o['sortie']), key=lambda kv: -(kv[1]['nacl'] + kv[1]['dryice']))[:2]
    s = teks(s, 'SEMAI DRY ICE', 'SEMAI OMC'); s = teks(s, 'BAHAN SEMAI', 'DRY ICE + NaCl' if any(o['dryice'] for o in op['omc'].values()) else 'NaCl')
    s = teks(s, '20 Okt', bln(D), 2)
    # pil tanggal ARMADA UDARA (panel kanan, x >= 6164428) = tanggal rekap gelar pesawat, bisa sehari sesudah operasi (28 Okt 2026)
    s = re.sub(rf'(<p:sp>(?:(?!</p:sp>).)*?<a:off x="(\d+)"(?:(?!</p:sp>).)*?<a:t>){bln(D)}(</a:t>)',
               lambda m: m.group(1) + (bln(op.get('tanggal_armada') or D) if int(m.group(2)) >= 6164428 else bln(D)) + m.group(3), s, flags=re.S)
    tot_s, tot_kg = sum(o['sortie'] for _, o in dua), sum(o['nacl'] + o['dryice'] for _, o in dua)
    rb = lambda v: f'{v:,.0f}'.replace(',', '.')   # ribuan bertitik
    lab = f'{tot_s} sortie, {rb(tot_kg)} kg'
    cx = lebar_pil(lab) - 60000
    s = ubah_sp(s, 4856836, 4983480, lab, x_baru=4856836 + 1042416 - cx, cx=cx)
    for (nama, o), (ln, lkg, lso, yp, lh) in zip(dua, (('Kalimantan Tengah', '3.900 kg', '5 sortie', 5401818, 'pagi, 1.907 ke 1.200'),
                                                       ('Sumatera Selatan', '800 kg', '1 sortie', 5845302, 'Palembang, 700 m ke 7.000 m'))):
        s = re.sub(rf'(<a:off x="795528" y="{5340096 if yp == 5401818 else 5783580}"/>(?:(?!</p:sp>).)*?<a:t>){ln}(</a:t>)', rf'\g<1>{nama}\2', s, count=1, flags=re.S)
        s = teks(s, lkg, f'{rb(o["nacl"] + o["dryice"])} kg'); s = teks(s, lso, f'{o["sortie"]} sortie')
        h = o['hujan']
        label = 'HUJAN' if h else 'JARAK PANDANG NAIK' if o['jarak_pandang'] else 'BELUM HUJAN'
        s = pasang_sp(s, 3561885, yp, pil['abu' if label == 'BELUM HUJAN' else 'biru'], label)
        kom = ', '.join(x for x in (f'NaCl {rb(o["nacl"])} kg' if o['nacl'] else '', f'dry ice {rb(o["dryice"])} kg' if o['dryice'] else '') if x)
        s = teks(s, lh, ('di ' + singkat(h['lokasi'], 40)) if h else kom)
    jumlah = op.get('pemilik') or {}
    assert not jumlah or sum(jumlah.values()) == pat + wb, f'pemilik {jumlah} tidak berjumlah {pat + wb} unit armada'
    return pemilik(armada(tanpa_instansi(s), ARMADA, 5990000 if jumlah else 6300000), jumlah)


def rapat_omc(s, ada):
    """Baris OMC templat yang provinsinya tidak ada di `ada` dibuang; sisanya dibagi rata di tempat 4 baris templat."""
    A0, PB = OMC_BARIS[0][1], OMC_BARIS[1][1] - OMC_BARIS[0][1]; slot = 4 * PB // len(ada)
    dy = {}
    for nama, yt, yp, yd in OMC_BARIS:   # tiap baris: titik (yd), nama & sasaran (yt), pil (yp), keterangan hasil (yp + 164592)
        for y in (yt, yp, yp + 164592, yd):
            dy[y] = A0 + ada.index(nama) * slot + (slot - PB) // 2 - yt if nama in ada else None
    def ubah(m):
        b = m.group(0); o = re.search(r'<a:off x="(\d+)" y="(\d+)"/>', b)
        if not o or int(o.group(1)) not in (676656, 795528, 2027869, 3561885) or int(o.group(2)) not in dy: return b
        d = dy[int(o.group(2))]
        return '' if d is None else b.replace(o.group(0), f'<a:off x="{o.group(1)}" y="{int(o.group(2)) + d}"/>', 1)
    return re.sub(r'<p:(sp|pic)>.*?</p:\1>', ubah, s, flags=re.S)


PIL_PEMILIK = {'BNPB': 6895948, 'TNI': 7659472, 'Kemenhut': 8322412, 'PT Sinarmas': 9236812}   # x kotak pil templat; ikon +73152, tulisan +164592


def pemilik(s, jumlah):
    """Baris PEMILIK armada dari rekap WA (A. BERDASARKAN INSTANSI), urutan WA (pemilik 27 Okt 2026). Pil templat disalin beserta ikonnya;
    Pemda = pil Kemenhut berikon ikon/pemda.png (rIdPemda, dipasang penanganan.py). Tanpa rekap: baris PEMILIK dibuang."""
    Y, YI = 6108192, 6140196
    cari = lambda tag, x, y: re.search(rf'<p:{tag}>(?:(?!</p:{tag}>).)*?<a:off x="{x}" y="{y}"/>(?:(?!</p:{tag}>).)*?</p:{tag}>', s, re.S).group(0)
    pil = {n: [cari('sp', x, Y), cari('pic', x + 73152, YI), cari('sp', x + 164592, Y)] for n, x in PIL_PEMILIK.items()}
    for b in (b for blok in pil.values() for b in blok): s = s.replace(b, '', 1)
    if not jumlah:
        return re.sub(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="\d+" y="(?:6108192|6044184)"/>(?:(?!</p:sp>).)*?</p:sp>', '', s, flags=re.S)
    nid = max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))
    x, tambah = 6895948, ''
    for nama, n in jumlah.items():
        if nama not in pil and nama != 'Pemda':
            raise SystemExit(f'pemilik armada "{nama}" belum punya pil/ikon di templat (penanganan/bnpb.py PIL_PEMILIK)')
        bg, ik, tx = pil.get(nama) or [pil['Kemenhut'][0], re.sub(r'r:embed="[^"]+"', 'r:embed="rIdPemda"', pil['Kemenhut'][1]), pil['Kemenhut'][2]]
        isi = iter((f'{nama}  ', str(n)))
        tx = re.sub(r'<a:t>[^<]*</a:t>', lambda m: f'<a:t>{next(isi, "")}</a:t>', tx)
        tw = 114300 + 50292 * len(f'{nama}  {n}'); bw = tw + 182880   # lebar pil templat: 'BNPB  40' 516636 / 699516
        for b, bx, by, cx in ((bg, x, Y, bw), (ik, x + 73152, YI, None), (tx, x + 164592, Y, tw)):
            b = re.sub(r'<a:off x="\d+" y="\d+"/>(\s*)<a:ext cx="(\d+)"', lambda m: f'<a:off x="{bx}" y="{by}"/>{m.group(1)}<a:ext cx="{cx or m.group(2)}"', b, count=1)
            nid += 1; tambah += re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid}"', b, count=1)
        x += bw + 64008
    assert x - 64008 <= 11551920, f'pil PEMILIK melewati panel (x akhir {x - 64008})'
    return s.replace('</p:spTree>', tambah + '</p:spTree>')


def tanpa_instansi(s):
    """Buang rincian personel per instansi (TNI, BPBD, ... M. Agni) dari panel PENANGANAN: WA satgas tidak memuatnya; angka templat 21 Okt
    jumlahnya 65.529, bukan total personel WA (pemilik 27 Okt 2026). Tiga angka utama (personel, heli, pesawat) disebar rata selebar panel."""
    X0, P0, KANAN = 1152144, 868680, 7665415 - 228600   # kiri angka pertama, jarak templat, tepi kanan isi panel (panel 548640 + 7116775)
    P = (KANAN - X0 - 1005840) // 2                      # 1005840 = lebar label angka
    def ubah(m):
        b = m.group(0); o = re.search(r'<a:off x="(\d+)" y="(\d+)"/>', b)
        if not o: return b
        x, y = map(int, o.groups())
        if 3749040 <= x < 7600000 and 1390000 <= y <= 1900000: return ''   # instansi: garis pemisah, ikon, nama, angka
        k = next((k for k, xs in ((1, (2020824, 2203704)), (2, (2889504, 3072384))) if x in xs and y in (1572768, 1655064, 1847088)), 0)
        return b.replace(f'<a:off x="{x}" y="{y}"/>', f'<a:off x="{x + k * (P - P0)}" y="{y}"/>', 1) if k else b
    hasil = re.sub(r'<p:(sp|pic)>.*?</p:\1>', ubah, s, flags=re.S)
    assert 'M. Agni' not in hasil and '13.396' not in hasil, 'rincian instansi masih tersisa'
    return hasil


def armada(s, ARMADA, batas=6300000):
    """Batang armada per provinsi. Baris tambahan disalin dari baris Riau; jarak baris dipadatkan supaya muat di atas `batas`
    (5990000 bila baris PEMILIK dipasang pemilik())."""
    Y0, P0 = 2898648, 384048; N = len(ARMADA); Y = [Y0 + i * P0 for i in range(N)]
    X0, U = 7792060, 2863440 / max(p + w for _, p, w in ARMADA)
    nid = [max(map(int, re.findall(r'<p:cNvPr id="(\d+)"', s)))]
    riau = [m.group(0) for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?</p:sp>', s, re.S)
            if re.search(r'<a:off x="(\d+)" y="(4434840|4489704)"/>', m.group(0)) and int(re.search(r'<a:off x="(\d+)"', m.group(0)).group(1)) >= 6329020]
    assert len(riau) == 6, len(riau)
    tambah = ''
    for i in range(8, N):
        dy = Y[i] - Y[4]
        for b in riau:
            nid[0] += 1
            b = re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda q: f'<a:off x="{q.group(1)}" y="{int(q.group(2)) + dy}"/>', b, count=1)
            tambah += re.sub(r'<p:cNvPr id="\d+"', f'<p:cNvPr id="{nid[0]}"', b, count=1)
    s = s.replace('</p:spTree>', tambah + '</p:spTree>')
    for y in [Y0 + i * P0 for i in range(N, 8)]:   # baris templat yang tak terpakai (armada < 8 provinsi) dibuang
        s = re.sub(rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="(?:\d+)" y="(?:{y}|{y + 54864})"/>(?:(?!</p:sp>).)*?</p:sp>',
                   lambda m: '' if int(re.search(r'<a:off x="(\d+)"', m.group(0)).group(1)) >= 6329020 else m.group(0), s, flags=re.S)
    for y, (nama, p, w) in zip(Y, ARMADA):
        yb = y + 54864
        s = ubah_sp(s, 6329020, y, nama)
        navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p and not navy:   # baris templat tanpa patroli: salin batang oranye sebagai navy
            xo0 = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
            if xo0 == X0: s = ubah_sp(s, X0, yb, x_baru=X0 + 1); xo0 = X0 + 1   # oranye minggir dulu supaya navy bisa di X0
            blk = ''.join(s[a_:b_] for a_, b_ in sp_di(s, xo0, yb)).replace(f'<a:off x="{xo0}" y="{yb}"/>', f'<a:off x="{X0}" y="{yb}"/>').replace('val="D9600B"', 'val="051C2C"')
            blk = re.sub(r'<p:cNvPr id="\d+"', lambda m: (nid.__setitem__(0, nid[0] + 1), f'<p:cNvPr id="{nid[0]}"')[1], blk)
            s = s.replace('</p:spTree>', blk + '</p:spTree>'); navy = [x for x in sp_di(s, X0, yb) if 'val="051C2C"' in s[x[0]:x[1]]]
        if p:
            wn = round(p * U); s = ubah_sp(s, X0, yb, str(p), cx=wn)
            xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        else:
            for a_, b_ in reversed(navy): s = s[:a_] + s[b_:]
            wn = 0; xo = int(re.search(rf'<a:off x="(\d+)" y="{yb}"/>(?:(?!</p:sp>).)*?val="D9600B"', s, re.S).group(1))
        if w: s = ubah_sp(s, xo, yb, str(w), x_baru=X0 + wn, cx=round(w * U))
        else:
            for a_, b_ in reversed(sp_di(s, xo, yb)): s = s[:a_] + s[b_:]
        xt = int(re.search(rf'<a:off x="(\d+)" y="{y}"/>(?:(?!</p:sp>).)*?<a:t> unit</a:t>', s, re.S).group(1))
        s = ubah_sp(s, xt, y, str(p + w), x_baru=X0 + wn + round(w * U) + 91443)
    # padatkan: baris i pindah ke Y0 + i*P, tinggi kotak diskala P/P0
    P = min(P0, (batas - Y0) // N); k = P / P0
    def geser(m):
        x, y, cx, cy = map(int, m.groups())
        if x < 6329020 or y in (6510528, 6044184, 6108192, 6140196) or not (Y0 <= y < Y0 + N * P0): return m.group(0)   # nomor halaman, baris PEMILIK tetap
        i, off = divmod(y - Y0, P0)
        return f'<a:off x="{x}" y="{Y0 + i * P + round(off * k)}"/><a:ext cx="{cx}" cy="{round(cy * k)}"/>'
    return re.sub(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', geser, s)


