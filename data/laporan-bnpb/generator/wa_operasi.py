"""Pengurai teks WhatsApp untuk deck Penanganan: laporan BMKG (PM2.5 + cuaca) dan "LAPORAN UPAYA PEMADAMAN KARHUTLA OLEH SATGAS".
Teks ditempel apa adanya (format WA Koordalops); bentuk lain = gagal keras, bukan tebakan.
    bmkg(teks)    -> {'pm': {kode: (nilai, kategori, stasiun)}, 'pm_ke10': nilai, 'hujan': {kode}, 'lebat': {kode}, 'angin': {kode}, 'periode': '23–25 Okt'}
    operasi(teks) -> {'tanggal': date data, 'personel': {nama: n}, 'armada': {nama: [patroli, wb]}, 'omc': {nama: {...}}, 'pemilik': {instansi: unit}}
Uji: python3 wa_operasi.py   (contoh/ 24 Okt)"""
import datetime as dt, json, os, re

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BULAN = {b: i + 1 for i, b in enumerate(('januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'))}
# stasiun BMKG pm2p5-obs -> kode provinsi (kata kunci huruf besar, cocok sebagian)
STASIUN = {'PANGKALAN': '62', 'PALANGKA': '62', 'SAMPIT': '62', 'MUARA TEWEH': '62', 'JAMBI': '15', 'PALEMBANG': '16', 'SAMARINDA': '64', 'BALIKPAPAN': '64',
           'SINTANG': '61', 'KUBU RAYA': '61', 'MEMPAWAH': '61', 'PONTIANAK': '61', 'KETAPANG': '61', 'BANJAR': '63', 'SORONG': '96', 'PEKANBARU': '14',
           'DUMAI': '14', 'SEMARANG': '33', 'KEMAYORAN': '31', 'MAROS': '73', 'LORE LINDU': '72', 'PALU': '72', 'MERAUKE': '93', 'PANGKAL PINANG': '19', 'BANDAR LAMPUNG': '18',
           'KOTOTABANG': '13', 'KOTABARU': '63'}


def _kunci(n):
    n = n.lower().replace('kepulauan', 'kep.').replace('kep ', 'kep. ').replace('*', '').strip(' .')
    return re.sub(r'[^a-z]', '', n)


def kode_prov():
    """nama provinsi (dinormalkan) -> kode, dari public/data/laporan.json (nama sama dengan layar)."""
    out = {_kunci(v['nama']): k for k, v in json.load(open(os.path.join(AKAR, 'public/data/laporan.json')))['prov'].items()}
    out.update({_kunci('DI Yogyakarta'): '34', _kunci('Yogyakarta'): '34', _kunci('Daerah Istimewa Yogyakarta'): '34', _kunci('Jakarta'): '31'})
    return out


def _daftar(s):
    """'Aceh, Sumatera Utara, dan Riau.' -> ['Aceh', 'Sumatera Utara', 'Riau']"""
    return [x.strip(' .*') for x in re.split(r',\s*(?:dan\s+)?|\s+dan\s+', s.strip().rstrip('.')) if x.strip(' .*')]


def bmkg(teks):
    KP = kode_prov()
    def kode(nama):
        k = KP.get(_kunci(nama))
        if not k:
            raise SystemExit(f'BMKG: provinsi tak dikenal "{nama}"')
        return k
    pm, nilai = {}, []
    for m in re.finditer(r'^[\s*\-•]*([A-Za-z][A-Za-z0-9 .]+?)(?::\s*|\s+)([\d.,]+)\s*(?:µg/m³)?\s*\(([^)]+)\)', teks, re.M):
        st, v, kat = m.group(1).strip(), float(m.group(2).replace(',', '.')), m.group(3).strip().lower()
        nilai.append(v)
        k = next((c for kw, c in STASIUN.items() if kw in st.upper()), None)
        if k is None:
            print(f'BMKG: stasiun "{st}" belum dipetakan ke provinsi, dilewati'); continue
        if k not in pm or v > pm[k][0]:
            pm[k] = (v, kat, st)
    if len(nilai) < 5:
        raise SystemExit('BMKG: daftar PM2.5 tidak terbaca')
    per = re.search(r'Periode\s+(\d+)\s*[–-]\s*(\d+)\s+(\w+)', teks)
    cuaca = lambda pola: {kode(n) for n in _daftar(re.search(pola, teks, re.S).group(1))}
    return {'pm': pm, 'pm_ke10': sorted(nilai)[0], 'periode': f'{per.group(1)}–{per.group(2)} {per.group(3)[:3]}',
            'hujan': cuaca(r'intensitas sedang yang terjadi di (.+?)\.\s*\n'), 'lebat': cuaca(r'Siaga \(hujan lebat[^)]*\)\*?:\s*(.+?)\n'),
            'angin': cuaca(r'Angin Kencang\*?:\s*(.+?)\n')}


def _angka(s):
    return float(s.replace('.', '').replace(',', '.'))


def _bagian(teks, awal, akhir):
    m = re.search(awal + r'(.*?)' + akhir, teks, re.S | re.I)
    if not m:
        raise SystemExit(f'WA operasi: bagian "{awal}" tidak ada')
    return m.group(1)


def _total(v):
    """Baris total provinsi ("*9 sortie/14.400 kg NaCl*") yang diikuti rincian per pesawat yang jumlahnya sama: pakai totalnya saja."""
    return v[0] if len(v) > 1 and abs(sum(v[1:]) - v[0]) < 1 else sum(v)


PEMILIK = {'BNPB': 'BNPB', 'TNI': 'TNI', 'KEMENHUT': 'Kemenhut', 'PEMDA': 'Pemda', 'PT SINARMAS': 'PT Sinarmas'}   # ejaan pil deck; WA 28 Okt huruf besar


def gelar(teks):
    """Armada per provinsi dari LAPORAN GELAR PESAWAT ('*1. KALIMANTAN BARAT: 9 UNIT*' lalu baris '- WB: 3 Unit (Palangka Raya), 1 Unit
    (Sampit)'): {provinsi: [patroli/OMC, WB]}, tanggal 'Data:'. None bila pesan tak memuat rincian per provinsi. Rekap ini dipakai bila ada,
    karena badan WA bisa masih menyalin armada hari sebelumnya (28 Okt: Jabar dan Jateng masih ada di badan, rekap sudah tidak)."""
    if 'GELAR PESAWAT' not in teks:
        return None
    t = teks[teks.index('GELAR PESAWAT'):]
    t = t[:t.index('REKAPITULASI NASIONAL')] if 'REKAPITULASI NASIONAL' in t else t
    blok = re.split(r'^\*\d+\. ([A-Z][A-Z /]+?): (\d+) UNIT\*\s*$', t, flags=re.M)
    if len(blok) < 3:
        return None
    armada = {}
    for nama, n, isi in zip(blok[1::3], blok[2::3], blok[3::3]):
        nama = ' '.join(w.capitalize() for w in nama.split()).replace(' / ', '/').replace('Ikn', 'IKN')
        pw = [0, 0]
        for jenis, sisa in re.findall(r'^-\s*([^:\n]+):(.*)$', isi, re.M):
            pw[jenis.strip().upper().startswith('WB')] += sum(int(x) for x in re.findall(r'(\d+) Unit', sisa, re.I))
        assert sum(pw) == int(n), f'gelar {nama}: rincian {pw} tidak berjumlah {n} unit'
        armada[nama] = pw
    tgl = re.search(r'Data: (\d+) (\w+) (\d{4})', t)
    return armada, dt.date(int(tgl.group(3)), BULAN[tgl.group(2).lower()], int(tgl.group(1))) if tgl else None


def operasi(teks):
    tgl = re.search(r'water bombing pada (\d+) (\w+) (\d{4})', teks, re.I)
    tanggal = dt.date(int(tgl.group(3)), BULAN[tgl.group(2).lower()], int(tgl.group(1)))
    personel = {m.group(1).strip(): int(m.group(2).replace('.', '')) for m in re.finditer(r'^>\s*([A-Z][\w ]+?)\s+\*([\d.]+)\*\s+personel', teks, re.M)}
    armada = {}
    for i, (awal, akhir) in enumerate(((r'\*Patroli Udara[^\n]*\n', r'\*Helikopter'), (r'\*Helikopter[^\n]*\n', r'\*b\. Pelaksanaan'))):
        induk = None
        for baris in _bagian(teks, awal, akhir).splitlines():
            m = re.match(r'^\*\s*([A-Z][\w ]+?)\s*:?\s*\*(\d+) unit', baris.strip())   # "Jawa Tengah *2 unit*" (27 Okt) tanpa titik dua
            sub = re.match(r'^>\s*\*(\d+) unit\*\s*tergelar di (.+?)\s*$', baris.strip())
            if m:
                induk = m.group(1).strip() + ('/IKN' if 'tergelar di IKN' in baris else '')   # "Kalimantan Timur: *1 unit* tergelar di IKN" (29 Okt)
                armada.setdefault(induk, [0, 0])[i] += int(m.group(2))
            elif sub:
                tujuan = sub.group(2).strip(' *')
                tujuan = 'Kalimantan Timur/IKN' if 'IKN' in tujuan else tujuan.split(',')[-1].strip()
                armada.setdefault(tujuan, [0, 0])[i] += int(sub.group(1))
    omc = {}
    for m in re.finditer(r'\*\d+\. ([^*\n]+)\*\n((?:>.*\n?)+)', _bagian(teks, r'Operasi Modifikasi Cuaca\*', r'\*\*3\.')):
        nama, isi = m.group(1).strip(), m.group(2)
        nacl, dry = (_total([_angka(x) for x in re.findall(rf'([\d.]+) kg {b}', isi)]) for b in ('NaCl', 'dry ice'))
        so = re.search(r'\*(\d+) sortie', isi)
        sas = list(dict.fromkeys(k.strip() for x in re.findall(r'(?:menyasar|wilayah sasaran|kg (?:NaCl|dry ice)\* di) \*([^*]+)\*', isi.split('Hujan')[0])   # "di *X*" hanya sesudah muatan ("1.000 kg NaCl* di *Muara Enim*", Sumsel 29 Okt), bukan "PK-SNP diperbantukan di *Lampung*" (Riau 28 Okt)
                                 for k in re.split(r',\s*(?:dan\s+)?|\s+dan\s+', x.replace('sekitar ', '')) if k.strip()))   # kab yang disasar beberapa pesawat sekali saja
        sas = [k for i, k in enumerate(sas) if not any(a.endswith(' ' + k) for a in sas[:i])]   # "Palembang" sesudah "wilayah timur Palembang" (Sumsel 29 Okt); "OKU" sesudah "OKU Timur" tetap
        hujan = None
        h = re.search(r'Hujan\s+\*?([^*\n]*?)\*?\s*(?:terpantau|dilaporkan|pada)[^\n]*?di \*([^*]+)\*(?:[^\n]*?pada \*?(\d+) (\w+))?', isi, re.I)   # "hujan dilaporkan" huruf kecil (Sumsel 28 Okt)
        h2 = re.search(r'Hujan\s+([a-z ]+?)\s+pada (\d+) (\w+)[^\n]*?di \*([^*]+)\*', isi)
        h3 = re.search(r'Hujan\s+dilaporkan di ([^*\n]+?)(?: pada [^.\n]*)?\.', isi)
        if h2:   # "Hujan <intensitas> pada <tgl> ... di *X*" (tanggal di depan)
            hujan = {'intensitas': h2.group(1).strip().lower(), 'lokasi': h2.group(4), 'tanggal': dt.date(tanggal.year, BULAN[h2.group(3).lower()], int(h2.group(2)))}
        elif h:
            hujan = {'intensitas': h.group(1).strip().lower(), 'lokasi': h.group(2).replace('Kabupaten ', ''),
                     'tanggal': dt.date(tanggal.year, BULAN[h.group(4).lower()], int(h.group(3))) if h.group(3) else tanggal}
        elif h3:   # "Hujan dilaporkan di sebagian besar wilayah X pada dini hari" (27 Okt): lokasi tanpa cetak tebal
            hujan = {'intensitas': '', 'lokasi': h3.group(1), 'tanggal': tanggal}
        tg = h and not h2 and re.search(r'tanggal \*?(\d{1,2}) (\w+)', isi[isi.rfind('\n', 0, h.start()) + 1:h.end()])   # "Hujan ... dilaporkan tanggal 26 Oktober 2026 di *X*" (Jambi 28 Okt)
        if hujan and tg:
            hujan['tanggal'] = dt.date(tanggal.year, BULAN[tg.group(2).lower()], int(tg.group(1)))
        if hujan and hujan['tanggal'] != tanggal:
            hujan = None   # hujan hari lain bukan hasil OMC hari laporan
        omc[nama] = {'sortie': int(so.group(1)) if so else 0, 'nacl': nacl, 'dryice': dry, 'sasaran': ', '.join(sas),
                     'hujan': hujan, 'jarak_pandang': bool(re.search(r'jarak pandang|PM2,5', isi, re.I))}
    # pemilik armada dari rekap gelar pesawat (A. BERDASARKAN INSTANSI); pesan lama tanpa rekap = {} (baris PEMILIK tidak dipasang)
    pemilik = ({PEMILIK.get(m.group(1).strip().upper(), m.group(1).strip()): int(m.group(2))
                for m in re.finditer(r'^\*\d+\. ([^:*\n]+): (\d+) Unit\*', _bagian(teks, r'BERDASARKAN INSTANSI\*', r'\*B\. BERDASARKAN'), re.M)}
               if 'BERDASARKAN INSTANSI' in teks else {})
    g = gelar(teks)
    if g:
        armada = g[0]
    lap = re.search(r'^_(\d+) (\w+) (\d{4})_\s*$', teks, re.M)   # tanggal laporan di bawah judul WA ("_28 Oktober 2026_")
    return {'tanggal': tanggal, 'personel': personel, 'armada': armada, 'omc': omc, 'pemilik': pemilik,
            'tanggal_armada': (g and g[1]) or tanggal,
            'tanggal_laporan': dt.date(int(lap.group(3)), BULAN[lap.group(2).lower()], int(lap.group(1))) if lap else tanggal}


if __name__ == '__main__':
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'contoh')
    b = bmkg(open(os.path.join(d, 'bmkg_241026.txt')).read())
    assert b['pm']['62'][0] == 603 and b['pm']['16'][0] == 284.4 and b['pm']['63'][0] == 95.5 and b['pm_ke10'] == 87.8, b['pm']
    assert {'62', '61', '63'} <= b['angin'] and '64' in b['hujan'] and '63' not in b['hujan'] and b['periode'] == '23–25 Okt', b
    o = operasi(open(os.path.join(d, 'wa_operasi_241026.txt')).read())
    assert o['tanggal'] == dt.date(2026, 10, 23) and sum(o['personel'].values()) == 71878, o['personel']
    A = o['armada']
    assert A['Kalimantan Selatan'] == [9, 6] and A['Jawa Timur'] == [1, 1] and A['Lampung'] == [1, 1] and A['Jawa Barat'] == [1, 1], A
    assert A['Kalimantan Timur/IKN'] == [0, 1] and sum(p for p, _ in A.values()) == 24 and sum(w for _, w in A.values()) == 37, A
    O = o['omc']
    assert O['Kalimantan Barat']['hujan'] and O['Kalimantan Selatan']['hujan'] and not O['Kalimantan Tengah']['hujan'] and not O['Sumatera Selatan']['hujan'], O
    assert O['Kalimantan Tengah']['sortie'] == 8 and O['Kalimantan Tengah']['nacl'] == 2000 and O['Sumatera Selatan']['dryice'] == 4900 and O['Riau']['sortie'] == 0, O
    print('uji wa_operasi lolos', {k: v for k, v in A.items()})
