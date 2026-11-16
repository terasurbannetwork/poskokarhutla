"""Data Laporan Bencana Oktober 2026 (deck untuk Presiden), dari data sistem.

Masukan (folder masukan/, salinan situs centurisk97.id/data/ per 11 Nov 2026):
  dibi_kejadian.json   DIBI BNPB per kab per hari (11 Nov 2025 s.d. 11 Nov 2026)
  logbook_kejadian.json Laporan harian Dit. Koordalops (status surut/padam per kejadian)
  peta_karhutla.json   titik panas, luas, belum padam per provinsi per hari (sistem kita)
  kalender_ancaman.json laju kejadian per kab per bulan + prakiraan BMKG
  iklim_outlook.json   prakiraan anomali hujan musiman (model statistik)
  omc_rekap.csv        rekap OMC 16-27 Okt
Keluaran: <proyek>/data/lb/*.csv, <proyek>/data/lb/nilai.json, <proyek>/data/angka.json (registri token).
Kebakaran gedung dan permukiman tidak dihitung (bukan bencana alam), sama dengan surat Kepala BNPB 2 Nov 2026.
"""
import csv, json, os, re, collections, glob, datetime as dt

HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
P = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/proyek-bulanan/'
M = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/masukan/'
LB = P + 'data/lb/'
os.makedirs(LB, exist_ok=True)
J = lambda f: json.load(open(M + f, encoding='utf-8'))

KEL = {  # jenis DIBI -> kelompok deck
    'Kebakaran Hutan dan Lahan': 'karhutla', 'Kebakaran Lahan': 'karhutla', 'Kebakaran Hutan': 'karhutla',
    'Banjir': 'banjir', 'Banjir Bandang': 'banjir', 'Banjir dan Tanah Longsor': 'banjir',
    'Tanah Longsor': 'longsor', 'Gerakan Tanah': 'longsor',
    'Cuaca Ekstrem': 'cuaca', 'Angin Kencang': 'cuaca', 'Puting Beliung': 'cuaca',
    'Kekeringan': 'kekeringan',
    'Gempabumi': 'gempa', 'Gempa Bumi dan Tsunami': 'gempa', 'Gempabumi Reruntuhan': 'gempa',
    'Erupsi Gunung Api': 'erupsi',
}
NAMA = {'karhutla': 'Kebakaran hutan dan lahan', 'banjir': 'Banjir', 'longsor': 'Tanah longsor', 'cuaca': 'Cuaca ekstrem',
        'kekeringan': 'Kekeringan', 'gempa': 'Gempa bumi', 'erupsi': 'Erupsi gunung api'}
URUT = ['karhutla', 'banjir', 'cuaca', 'longsor', 'kekeringan', 'gempa', 'erupsi']
LOGJ = {'karhutla': 'karhutla', 'banjir': 'banjir', 'banjir_longsor': 'banjir', 'banjir_bandang': 'banjir', 'longsor': 'longsor',
        'cuaca': 'cuaca', 'kekeringan': 'kekeringan', 'gempa': 'gempa', 'erupsi': 'erupsi'}
KOL = ['meninggal', 'hilang', 'luka', 'terdampak', 'kk', 'mengungsi', 'rr_berat', 'rr_sedang', 'rr_ringan', 'terendam',
       'f_pendidikan', 'f_kantor', 'jembatan', 'f_umum']

V = {}   # nilai bertoken


def tulis(nama, kolom, baris):
    with open(LB + nama, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kolom)
        w.writerows(baris)


# ---------- Logbook harian Pusdalops BNPB (logbook_okt.py), bukan DIBI (pemilik 12 Nov 2026: DIBI banyak bolong) ----------
# Satu kejadian logbook = satu baris berkejadian 1 di kab pertama; kab lain ikut sebagai baris berkejadian 0 (untuk peta dan
# hitungan kab), dampak hanya di baris pertama supaya tidak terhitung ganda.
LBK = J('logbook_2026.json')
PROV_KODE = {'Aceh': '11', 'Sumatera Utara': '12', 'Sumatera Barat': '13', 'Riau': '14', 'Jambi': '15', 'Sumatera Selatan': '16', 'Bengkulu': '17',
             'Lampung': '18', 'Kepulauan Bangka Belitung': '19', 'Kepulauan Riau': '21', 'DKI Jakarta': '31', 'Jawa Barat': '32', 'Jawa Tengah': '33',
             'DI Yogyakarta': '34', 'Jawa Timur': '35', 'Banten': '36', 'Bali': '51', 'Nusa Tenggara Barat': '52', 'Nusa Tenggara Timur': '53',
             'Kalimantan Barat': '61', 'Kalimantan Tengah': '62', 'Kalimantan Selatan': '63', 'Kalimantan Timur': '64', 'Kalimantan Utara': '65',
             'Sulawesi Utara': '71', 'Sulawesi Tengah': '72', 'Sulawesi Selatan': '73', 'Sulawesi Tenggara': '74', 'Gorontalo': '75', 'Sulawesi Barat': '76',
             'Maluku': '81', 'Maluku Utara': '82', 'Papua Barat': '91', 'Papua Barat Daya': '92', 'Papua': '94', 'Papua Selatan': '93',
             'Papua Tengah': '95', 'Papua Pegunungan': '96'}
JN = {'karhutla': 'Kebakaran Hutan dan Lahan', 'banjir': 'Banjir', 'banjir_longsor': 'Banjir dan Tanah Longsor', 'longsor': 'Tanah Longsor',
      'cuaca': 'Cuaca Ekstrem', 'kekeringan': 'Kekeringan', 'gempa': 'Gempabumi', 'erupsi': 'Erupsi Gunung Api'}
kab_nama = lambda k: re.sub(r'^Kab(?:upaten)?\.?\s+', '', k).strip()
baris = []
for e in LBK['kejadian']:
    dmp = e['dampak']
    nilai = {'kk': dmp.get('kk', 0), 'meninggal': dmp.get('md', 0), 'hilang': dmp.get('hilang', 0), 'luka': dmp.get('luka', 0), 'terdampak': dmp.get('jiwa', 0),
             'mengungsi': dmp.get('mengungsi', 0), 'rr_berat': dmp.get('rb', 0), 'rr_sedang': dmp.get('rs', 0), 'rr_ringan': dmp.get('rr', 0),
             'terendam': dmp.get('rumah_terdampak', 0)}
    pk = PROV_KODE.get(e['prov'], '00')
    kabs = e['kab'] or ['-']
    for i, kb in enumerate(kabs):
        r = {'tanggal': e['tgl'], 'jenis': JN.get(e['jenis'], 'Kebakaran Gedung dan Permukiman' if 'kebakaran' in e['jenis'] else 'Lainnya'),
             'prov': e['prov'], 'prov_kode': pk, 'kab': kab_nama(kb), 'kab_kode': pk + '|' + kab_nama(kb), 'kejadian': 1 if i == 0 else 0}
        if i == 0:
            r.update(nilai)
        baris.append(r)
D = {'kejadian': baris}
V['logbook.hari'] = sum(h.startswith('2026-10') for h in LBK['hari'])
semua = [k for k in D['kejadian'] if k['tanggal'].startswith('2026-10')]
gedung = sum(k['kejadian'] for k in semua if k['jenis'] not in KEL)
okt = [dict(k, kel=KEL[k['jenis']]) for k in semua if k['jenis'] in KEL]
print('non-alam dibuang:', gedung)
V['n.gedung'] = gedung


def jumlah(rows):
    t = collections.Counter()
    for k in rows:
        t['kej'] += k['kejadian']
        for c in KOL:
            t[c] += k.get(c, 0)
    t['rumah'] = t['rr_berat'] + t['rr_sedang'] + t['rr_ringan']
    t['fasum'] = t['f_pendidikan'] + t['f_kantor'] + t['jembatan'] + t['f_umum']
    t['md_hilang'] = t['meninggal'] + t['hilang']
    t['tdm'] = t['terdampak'] + t['mengungsi']
    return t


N = jumlah(okt)
for c, v in N.items():
    V['n.' + c] = v
V['n.prov'] = len({k['prov'] for k in okt})
V['n.kab'] = len({k['kab_kode'] for k in okt if not k['kab_kode'].endswith('|-')})
perkel = {g: [k for k in okt if k['kel'] == g] for g in URUT}
for g, rows in perkel.items():
    t = jumlah(rows)
    for c, v in t.items():
        V[f'{g}.{c}'] = v
    V[f'{g}.prov'] = len({k['prov'] for k in rows})
    V[f'{g}.kab'] = len({k['kab_kode'] for k in rows if not k['kab_kode'].endswith('|-')})
    V[f'{g}.persen'] = round(100 * t['kej'] / N['kej'], 1)
hidro_basah = sum(V[f'{g}.kej'] for g in ('banjir', 'longsor', 'cuaca'))
hidro_kering = sum(V[f'{g}.kej'] for g in ('karhutla', 'kekeringan'))
geo = sum(V[f'{g}.kej'] for g in ('gempa', 'erupsi'))
V.update({'n.basah': hidro_basah, 'n.kering': hidro_kering, 'n.geologi': geo,
          'n.basah.p': round(100 * hidro_basah / N['kej'], 1), 'n.kering.p': round(100 * hidro_kering / N['kej'], 1),
          'n.geologi.p': round(100 * geo / N['kej'], 1)})

# komposisi per jenis (grafik)
tulis('jenis.csv', ['jenis', 'kejadian', 'persen'], [[NAMA[g], V[f'{g}.kej'], V[f'{g}.persen']] for g in sorted(URUT, key=lambda g: -V[f'{g}.kej'])])

# provinsi x kelompok
pv = collections.defaultdict(collections.Counter)
for k in okt:
    pv[k['prov']][k['kel']] += k['kejadian']
prov_urut = sorted(pv, key=lambda p: -sum(pv[p].values()))
V['n.prov.top'] = prov_urut[0]
tulis('prov_jenis.csv', ['provinsi', 'total'] + [NAMA[g] for g in URUT],
      [[p, sum(pv[p].values())] + [pv[p][g] for g in URUT] for p in prov_urut])
for i, p in enumerate(prov_urut[:7], 1):
    V[f'prov{i}.n'] = sum(pv[p].values())
PENDEK = {'Kepulauan Bangka Belitung': 'Bangka Belitung'}
tulis('prov_top.csv', ['provinsi', 'kering', 'basah', 'geologi', 'total'],
      [[PENDEK.get(p, p), pv[p]['karhutla'] + pv[p]['kekeringan'], pv[p]['banjir'] + pv[p]['longsor'] + pv[p]['cuaca'], pv[p]['gempa'] + pv[p]['erupsi'],
        sum(pv[p].values())] for p in prov_urut[:10]])
# per provinsi untuk peta (kode prov dari kab_kode)
pk = collections.Counter()
for k in okt:
    pk[k['prov_kode']] += k['kejadian']
json.dump(pk, open(LB + 'prov_kejadian.json', 'w', encoding='utf-8'))

# dampak per kelompok (tabel)
tulis('dampak_jenis.csv', ['jenis', 'kejadian', 'md_hilang', 'luka', 'tdm', 'rumah', 'terendam', 'fasum'],
      [[NAMA[g], V[f'{g}.kej'], V[f'{g}.md_hilang'], V[f'{g}.luka'], V[f'{g}.tdm'], V[f'{g}.rumah'], V[f'{g}.terendam'], V[f'{g}.fasum']]
       for g in URUT] + [['Jumlah', N['kej'], N['md_hilang'], N['luka'], N['tdm'], N['rumah'], N['terendam'], N['fasum']]])

# riwayat 12 bulan per kelompok (Nov 2025 s.d. Okt 2026)
bulan = [f'2026-{m:02d}' for m in range(1, 11)]   # arsip logbook lokal: Januari sampai Oktober 2026
BL = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'}
rb = collections.defaultdict(collections.Counter)
for k in D['kejadian']:
    if k['jenis'] in KEL and k['tanggal'][:7] in bulan:
        rb[k['tanggal'][:7]][KEL[k['jenis']]] += k['kejadian']
lab = lambda b: f"{BL[int(b[5:])]} {b[2:4]}"
tulis('riwayat_bulan.csv', ['bulan', 'kering', 'basah', 'geologi'],
      [[lab(b), rb[b]['karhutla'] + rb[b]['kekeringan'], rb[b]['banjir'] + rb[b]['longsor'] + rb[b]['cuaca'], rb[b]['gempa'] + rb[b]['erupsi']] for b in bulan])
tulis('riwayat_geo.csv', ['bulan', 'gempa', 'erupsi'], [[lab(b), rb[b]['gempa'], rb[b]['erupsi']] for b in bulan])
for g in URUT:
    tulis(f'riwayat_{g}.csv', ['bulan', 'kejadian'], [[lab(b), rb[b][g]] for b in bulan])
V['riwayat.karhutla.sep'] = rb['2026-09']['karhutla']
V['riwayat.banjir.sep'] = rb['2026-09']['banjir']
V['riwayat.banjir.jan'] = rb['2026-01']['banjir']
V['riwayat.banjir.puncak'] = max(rb[b]['banjir'] for b in bulan)

# harian Oktober per kelompok
hr = collections.defaultdict(collections.Counter)
for k in okt:
    hr[k['tanggal']][k['kel']] += k['kejadian']
hari = [f'2026-10-{d:02d}' for d in range(1, 32)]
tulis('harian.csv', ['tanggal', 'karhutla', 'banjir_longsor', 'cuaca_kering', 'geologi'],
      [[str(int(h[8:])), hr[h]['karhutla'], hr[h]['banjir'] + hr[h]['longsor'], hr[h]['cuaca'] + hr[h]['kekeringan'], hr[h]['gempa'] + hr[h]['erupsi']] for h in hari])

# ---------- Logbook: status per kab ----------
L = J('logbook_kejadian.json')['kejadian']
st = collections.defaultdict(lambda: {'belum': False, 'ada': False, 'mulai': None, 'selesai': None, 'kk': 0, 'jiwa': 0, 'ungsi': 0})
for e in L:
    g = LOGJ.get(e['jenis'])
    if not g or not e.get('kab'):
        continue
    t0, t1 = (e.get('terlihat') or [None, None])[:2]
    mulai = e.get('mulai') or t0
    if not t1 or t1 < '2026-10-01' or (mulai and mulai > '2026-10-31'):
        continue
    s = st[(g, PROV_KODE.get(e['prov'], '00') + '|' + kab_nama(e['kab']))]
    s['ada'] = True
    if e.get('durasi_hari') is None or (e.get('surut') and e['surut'] > '2026-10-31'):
        s['belum'] = True
    s['mulai'] = min(filter(None, [s['mulai'], mulai]))
    if e.get('surut'):
        s['selesai'] = max(filter(None, [s['selesai'], e['surut']]))
    s['kk'] = max(s['kk'], e.get('kk') or 0)
    s['jiwa'] = max(s['jiwa'], e.get('jiwa') or 0)
    s['ungsi'] = max(s['ungsi'], e.get('mengungsi') or 0)
json.dump({f'{g}|{k}': v for (g, k), v in st.items()}, open(LB + 'status_logbook.json', 'w', encoding='utf-8'), ensure_ascii=False)

# ---------- kab per kelompok (peta + tabel) ----------
KABS = {}
for g in URUT:
    kb = collections.defaultdict(lambda: collections.Counter())
    nama = {}
    for k in perkel[g]:
        kb[k['kab_kode']]['kej'] += k['kejadian']
        for c in KOL:
            kb[k['kab_kode']][c] += k.get(c, 0)
        nama[k['kab_kode']] = (k['prov'], k['kab'], k['prov_kode'])
    rows = []
    for kode, t in kb.items():
        if kode.endswith('|-'):
            continue
        s = st.get((g, kode))
        status = ('belum' if s['belum'] else 'selesai') if s else 'tanpa'
        rows.append({'kode': kode, 'prov': nama[kode][0], 'kab': nama[kode][1], 'pk': nama[kode][2], 'kej': t['kej'],
                     'tdm': t['terdampak'] + t['mengungsi'], 'rumah': t['rr_berat'] + t['rr_sedang'] + t['rr_ringan'],
                     'terendam': t['terendam'], 'md': t['meninggal'] + t['hilang'], 'status': status})
    rows.sort(key=lambda r: (-r['kej'], -r['tdm']))
    KABS[g] = rows
    V[f'{g}.st.belum'] = sum(r['status'] == 'belum' for r in rows)
    V[f'{g}.st.selesai'] = sum(r['status'] == 'selesai' for r in rows)
    V[f'{g}.st.tanpa'] = sum(r['status'] == 'tanpa' for r in rows)
json.dump(KABS, open(LB + 'kab_kelompok.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
# gempa dan erupsi dihitung per peristiwa (tanggal dan provinsi; erupsi per tanggal), bukan per baris kabupaten DIBI
V['gempa.ev'] = len({(k['tanggal'], k['prov_kode']) for k in perkel['gempa']})
V['erupsi.ev'] = len({k['tanggal'] for k in perkel['erupsi']})
def _gempa(kab):
    e = max((e for e in LBK['kejadian'] if e['jenis'] == 'gempa' and e['tgl'].startswith('2026-10') and kab in e['kab']),
            key=lambda e: e['dampak'].get('rr', 0) + e['dampak'].get('rs', 0) + e['dampak'].get('rb', 0))
    return e['dampak']
_s, _b = _gempa('Kab. Sumba Barat Daya'), _gempa('Kab. Bogor')
V['g.sbd.rumah'] = _s.get('rb', 0) + _s.get('rs', 0) + _s.get('rr', 0)
V['g.sbd.tdm'] = _s.get('jiwa', 0)
V['g.bogor.rumah'] = _b.get('rb', 0) + _b.get('rs', 0) + _b.get('rr', 0)

# ---------- Karhutla dari sistem (titik panas, luas) ----------
K = J('peta_karhutla.json')
H = K['hari']
i0, i1 = H.index('2026-10-01'), H.index('2026-10-31') + 1
s_ = lambda xs: sum(x or 0 for x in xs)
V['kh.hot'] = s_(K['nasional']['hot'][i0:i1])
V['kh.luas'] = round(s_(K['nasional']['luas'][i0:i1]))
V['kh.belum31'] = round(K['nasional']['belum'][i1 - 1] or 0)
V['kh.hot.sep'] = s_(K['nasional']['hot'][H.index('2026-09-01'):H.index('2026-09-30') + 1])
V['kh.luas.sep'] = round(s_(K['nasional']['luas'][H.index('2026-09-01'):H.index('2026-09-30') + 1]))
hh = K['nasional']['hot'][i0:i1]
V['kh.hot.puncak'] = max(hh)
V['kh.hot.puncak.tgl'] = int(H[i0 + hh.index(max(hh))][8:])
V['kh.hot.akhir'] = hh[-1]
tulis('kh_harian.csv', ['tanggal', 'titik'], [[str(int(H[i][8:])), K['nasional']['hot'][i] or 0] for i in range(i0, i1)])
# bulanan Jan-Okt 2026
mb = []
for m in range(1, 11):
    idx = [i for i, h in enumerate(H) if h.startswith(f'2026-{m:02d}')]
    mb.append([BL[m], s_(K['nasional']['hot'][i] for i in idx), round(s_(K['nasional']['luas'][i] for i in idx))])
tulis('kh_bulan.csv', ['bulan', 'titik', 'luas'], mb)
pr = []
for kode, p in K['prov'].items():
    pr.append([p['nama'], s_(p['hot'][i0:i1]), round(s_(p['luas'][i0:i1])), round(p['belum'][i1 - 1] or 0), kode])
pr.sort(key=lambda r: -r[1])
tulis('kh_prov.csv', ['provinsi', 'titik', 'luas', 'belum', 'kode'], pr[:10])
for i, r in enumerate(pr[:6], 1):
    V[f'kh.p{i}.titik'] = r[1]
    V[f'kh.p{i}.luas'] = r[2]
V['kh.top6.persen'] = round(100 * sum(r[1] for r in pr[:6]) / V['kh.hot'], 1)
V['kh.top1'] = pr[0][0]
for i, a in enumerate([2000, 8000, 20000, 60000], 1):   # ambang kelas peta karhutla (peta.py)
    V[f'kh.amb{i}'] = a
json.dump({r[4]: r[1] for r in pr}, open(LB + 'kh_prov_titik.json', 'w', encoding='utf-8'))
# laporan kejadian karhutla daerah (logbook Pusdalops) dibanding titik panas sistem, per provinsi
dk = collections.Counter()
for k in perkel['karhutla']:
    dk[k['prov']] += k['kejadian']
tulis('kh_banding.csv', ['provinsi', 'titik', 'laporan'], [[r[0], r[1], dk.get(r[0], 0)] for r in pr[:8]])
V['kh.lapor.top6'] = sum(dk.get(r[0], 0) for r in pr[:6])
V['kh.lapor.jateng'] = dk.get('Jawa Tengah', 0)
V['kh.lapor.jatim'] = dk.get('Jawa Timur', 0)
V['kh.lapor.sulsel'] = dk.get('Sulawesi Selatan', 0)
V['kh.lapor.jawa_sulsel'] = V['kh.lapor.jateng'] + V['kh.lapor.jatim'] + V['kh.lapor.sulsel']
V['kh.lapor.jawa_sulsel.p'] = round(100 * V['kh.lapor.jawa_sulsel'] / V['karhutla.kej'], 1)
V['kh.turun.p'] = round(100 * (V['kh.hot.akhir'] - V['kh.hot.puncak']) / V['kh.hot.puncak'], 1)
V['kh.turun.p.abs'] = abs(V['kh.turun.p'])
# gunung api PVMBG 1 Nov 2026 06.00 WIB (masukan/wa-pvmbg-011126.txt)
V.update({'ga.awas': 0, 'ga.siaga': 3, 'ga.waspada': 24, 'ga.normal': 42})

# ---------- OMC 16-27 Okt (README omc: baris harian bertanggal, tanpa agregat dan "beda sumber") ----------
V['omc.sortie'] = 150
V['omc.nacl'] = 106000
V['omc.dryice'] = 53600
V['omc.prov'] = 9
V['omc.merauke.nacl'] = 13000
V['omc.merauke.sortie'] = 13
V['omc.lampung.nacl'] = 2000
V['tnwk.personel'] = 350
V['tnwk.ha'] = 10.2

# ---------- Pembanding September 2026 (logbook yang sama; arsip logbook lokal hanya 2026) ----------
sep = [dict(k, kel=KEL[k['jenis']]) for k in D['kejadian'] if k['tanggal'].startswith('2026-09') and k['jenis'] in KEL]
NS = jumlah(sep)
for c in ('kej', 'md_hilang', 'luka', 'tdm', 'rumah'):
    V['sep.' + c] = NS[c]
    V['c26.' + c] = N[c]
    V['ch.' + c] = round(100 * (N[c] - NS[c]) / NS[c], 1) if NS[c] else 0
    V['ch.' + c + '.abs'] = abs(V['ch.' + c])
V['n.fasum.lain'] = N['fasum'] - N['jembatan']
# angka surat lama (untuk catatan)
V['surat.kej'] = 259
V['surat.karhutla'] = 194

# ---------- Prediksi ----------
KA = J('kalender_ancaman.json')
cnt = collections.Counter()
kab_tinggi = collections.defaultdict(list)
for kode, v in KA['kab'].items():
    for j in ('banjir', 'longsor'):
        if j in v:
            for bi, bn in ((10, 'nov'), (11, 'des')):
                p = v[j]['bulan'][bi]['p']
                if p is not None and p >= 0.5:
                    cnt[(j, bn)] += 1
                    kab_tinggi[(j, bn)].append(kode)
for (j, bn), n in cnt.items():
    V[f'pr.{j}.{bn}'] = n
V['pr.nkab'] = KA['n_kab']
json.dump({f'{j}|{bn}': v for (j, bn), v in kab_tinggi.items()}, open(LB + 'prediksi_kab.json', 'w', encoding='utf-8'))
O = J('iklim_outlook.json')
V['iklim.roni'] = O['keadaan_sekarang']['roni']['nilai']
V['iklim.dmi'] = O['keadaan_sekarang']['dmi']
pk_ = next(p for p in O['prakiraan'] if p['musim'] == 'OND')
for w, x in pk_['wilayah'].items():
    if x.get('tampil'):
        V[f'iklim.ond.{w}'] = x['anom_pct']
print(json.dumps({k: v for k, v in V.items() if k.startswith('iklim')}, ensure_ascii=False))
tulis('iklim_ond.csv', ['wilayah', 'anomali'], [[w, x['anom_pct']] for w, x in pk_['wilayah'].items() if x.get('tampil')])

json.dump(V, open(LB + 'nilai.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- Program kerja (kegiatan.json, kurasi riset web) ----------
KG = json.load(open(os.path.dirname(M[:-1]) + '/kegiatan.json', encoding='utf-8'))
V.update(KG['angka'])
kg = sorted(KG['kegiatan'], key=lambda k: k['tgl'])
PEL = ['Kepala BNPB', 'Pusdatinkom', 'Satgas operasi']
JEN = ['Operasi', 'Informasi publik', 'Kunjungan dan peninjauan', 'Rapat koordinasi', 'Kelembagaan dan kebijakan', 'Bantuan peralatan dan logistik', 'Rehabilitasi dan pemulihan']
mx = collections.Counter((k['jenis'], k['pelaksana']) for k in kg)
tulis('pk_matriks.csv', ['jenis', 'kepala', 'pusdatin', 'ops', 'jumlah'], [[j] + [mx[(j, p)] for p in PEL] + [sum(mx[(j, p)] for p in PEL)] for j in JEN])
V['pk.n'] = len(kg)
V['pk.kepala'] = sum(k['pelaksana'] == 'Kepala BNPB' for k in kg)
V['pk.pusdatin'] = sum(k['pelaksana'] == 'Pusdatinkom' for k in kg)
V['pk.ops'] = sum(k['pelaksana'] == 'Satgas operasi' for k in kg)
V['pk.operasi'] = sum(k['jenis'] == 'Operasi' for k in kg)
V['pk.kepala.baru'] = sum(k['pelaksana'] == 'Kepala BNPB' and k['tgl'] > '2026-10-15' for k in kg)   # sejak dilantik, tanpa pelantikan
tgl = lambda t: f"{int(t[8:])} {BL[int(t[5:7])]}"
tulis('pk_kepala.csv', ['tanggal', 'kegiatan', 'lokasi'], [[tgl(k['tgl']), k['kegiatan'], k['lokasi']] for k in kg if k['pelaksana'] == 'Kepala BNPB'])
tulis('pk_lain.csv', ['jenis', 'tanggal', 'kegiatan', 'lokasi'], [[k['jenis'], tgl(k['tgl']), k['kegiatan'], k['lokasi']]
      for k in sorted([k for k in kg if k['pelaksana'] != 'Kepala BNPB'], key=lambda k: (JEN.index(k['jenis']), k['tgl']))])
json.dump(V, open(LB + 'nilai.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


# ---------- CSV tambahan untuk spek ----------
C25 = {c: V['sep.' + c] for c in ('kej', 'md_hilang', 'luka', 'tdm', 'rumah')}
NM = {'kej': 'Kejadian bencana', 'md_hilang': 'Meninggal dan hilang, jiwa', 'luka': 'Luka-luka, jiwa', 'tdm': 'Terdampak dan mengungsi, jiwa', 'rumah': 'Rumah rusak, unit'}
tulis('banding.csv', ['indikator', 'y2025', 'y2026', 'ubah'], [[NM[c], C25[c], N[c], V['ch.' + c]] for c in C25])
STL = {'belum': 'Belum surut', 'selesai': 'Sudah surut', 'tanpa': 'Belum dilaporkan'}
bj = sorted(KABS['banjir'], key=lambda r: (r['prov'] != 'Aceh', r['prov'] != 'Sumatera Utara', r['prov'], -r['tdm']))
pil_prov = [r for r in bj if r['prov'] == 'Sumatera Utara'][:6] + [r for r in bj if r['prov'] == 'Aceh'][:5]
pil_prov.sort(key=lambda r: (r['prov'] != 'Sumatera Utara', -r['tdm']))
lain = [r for r in bj if r['prov'] not in ('Aceh', 'Sumatera Utara')]
tulis('banjir_kab.csv', ['prov', 'kab', 'kej', 'tdm', 'st'], [[r['prov'], r['kab'], r['kej'], r['tdm'], STL[r['status']]] for r in pil_prov + sorted(lain, key=lambda r: -r['tdm'])[:3]])
V['banjir.tabel.n'] = len(pil_prov) + min(3, len(lain))
ck = sorted([('Cuaca ekstrem', r) for r in KABS['cuaca']] + [('Kekeringan', r) for r in KABS['kekeringan']], key=lambda t: (-t[1]['tdm'], -t[1]['rumah']))[:12]
tulis('cuaca_kab.csv', ['jenis', 'kab', 'tdm', 'rumah'], [[j, r['kab'], r['tdm'], r['rumah']] for j, r in ck])
gl = sorted([('Gempa bumi', r) for r in KABS['gempa'] if r['tdm'] or r['rumah']] + [('Erupsi', r) for r in KABS['erupsi']], key=lambda t: -(t[1]['tdm'] + 10 * t[1]['rumah']))
tulis('geologi_kab.csv', ['jenis', 'kab', 'tdm', 'rumah'], [[j, r['kab'], r['tdm'], r['rumah']] for j, r in gl])
tulis('riwayat_ck.csv', ['bulan', 'cuaca', 'kekeringan'], [[lab(b), rb[b]['cuaca'], rb[b]['kekeringan']] for b in bulan])
WIL = {'aceh_sumut': 'Aceh dan Sumatera Utara', 'sumatra_tengah_selatan': 'Sumatera bagian tengah dan selatan', 'jawa': 'Jawa',
       'kalbar_kalteng': 'Kalimantan Barat dan Tengah', 'kaltim_kaltara': 'Kalimantan Timur dan Utara', 'sulawesi': 'Sulawesi',
       'bali_nt': 'Bali dan Nusa Tenggara', 'maluku': 'Maluku', 'papua': 'Papua', 'nasional': 'Indonesia'}
tulis('iklim_ond_tampil.csv', ['wilayah', 'kurang'], sorted([[WIL.get(w, w), round(-x['anom_pct'], 1)] for w, x in pk_['wilayah'].items() if x.get('tampil') and x['anom_pct'] < 0], key=lambda r: -r[1]))
V['iklim.jawa.kurang'] = round(-pk_['wilayah']['jawa']['anom_pct'], 1)
json.dump(V, open(LB + 'nilai.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(V, open(LB + 'nilai.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- registri token ----------
SUMBER = {
    'n.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'karhutla.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'banjir.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026',
    'longsor.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'cuaca.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'kekeringan.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026',
    'gempa.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'erupsi.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'prov': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026',
    'riwayat.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'kh.': 'GIS BNPB, hotspot NASA FIRMS, 1 s.d. 31 Okt 2026',
    'omc.': 'Posko OMC BNPB, rekap harian 16 s.d. 27 Okt 2026', 'tnwk.': 'Surat Kepala BNPB kepada Presiden, 2 Nov 2026',
    'sep.': 'Logbook harian Pusdalops BNPB, September 2026', 'c26.': 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026', 'ch.': 'Logbook harian Pusdalops BNPB, September dan Oktober 2026',
    'rs.': 'Siaran pers dan laporan situasi harian BNPB, Oktober 2026', 'pk.': 'Siaran pers BNPB dan media nasional, Oktober 2026, diolah',
    'surat.': 'Surat Kepala BNPB kepada Presiden, 2 Nov 2026', 'ga.': 'PVMBG Badan Geologi, 1 Nov 2026 06.00 WIB',
    'kh.lapor': 'Logbook harian Pusdalops BNPB; GIS BNPB', 'pr.': 'GIS BNPB, kalender ancaman dari laporan Pusdalops 2014 s.d. 2025',
    'iklim.': 'GIS BNPB, prakiraan musiman dari CHIRPS, RONI NOAA, dan DMI', 'logbook.': 'Logbook harian Pusdalops BNPB',
}
SAT = {'awas': 'gunung api', 'siaga': 'gunung api', 'waspada': 'gunung api', 'normal': 'gunung api', 'kej': 'kejadian', 'luas': 'ha', 'hot': 'titik', 'titik': 'titik', 'persen': 'persen', 'p': 'persen', 'nacl': 'kg', 'dryice': 'kg',
       'sortie': 'sorti', 'prov': 'provinsi', 'kab': 'kab/kota', 'personel': 'orang', 'ha': 'ha'}
A = {}
for k, v in V.items():
    if not isinstance(v, (int, float)):
        continue
    src = next((s for p, s in sorted(SUMBER.items(), key=lambda x: -len(x[0])) if k.startswith(p)), 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026')
    ujung = k.split('.')[-1]
    sat = SAT.get(ujung, 'persen' if k.startswith(('ch.', 'iklim.ond')) else '')
    kyk = 'estimasi-model' if k.startswith(('kh.luas', 'kh.belum', 'kh.p')) and ('luas' in k or 'belum' in k) or k.startswith(('iklim.', 'pr.')) else 'resmi'
    if k.startswith(('kh.hot', 'kh.p')) and 'titik' in k or k.startswith('kh.hot') or k == 'kh.top6.persen':
        kyk = 'terverifikasi'
    if k.startswith(('omc.', 'pr.', 'iklim.roni', 'iklim.dmi', 'rs.', 'pk.')):
        kyk = 'terverifikasi'
    A[k] = {'berkas': 'lb/nilai.json', 'jalur': f'[{k}]', 'satuan': sat, 'keyakinan': kyk, 'sumber': src}
json.dump({'angka': A}, open(P + 'data/angka.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(A), 'token;', json.dumps({k: V[k] for k in list(V)[:60]}, ensure_ascii=False))
