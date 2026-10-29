"""Firespot titik per provinsi pada batas waktu tertentu, dengan aturan website (scripts/data/harian.py): cluster ST-DBSCAN dari titik VIIRS
(S-NPP, NOAA-20, NOAA-21) berkeyakinan sedang/tinggi 7 hari terakhir, tanpa gunung api dan sumber panas industri; tiap cluster dinilai
harian.firespot() (pola SIPANTAU Kemenhut: "ya" atau "mungkin"). Firespot titik hari d = titik S-NPP/NOAA-20 berkeyakinan sedang/tinggi
pada hari d (WIB) sebelum batas yang termasuk cluster "ya". S-NPP/NOAA-20 = sensor VIIRS dalam hitungan hotspot, jadi firespot <= hotspot.
Pakai sebagai modul: muat(raw_dir) lalu hitung(titik, kini, hari)."""
import csv, datetime as dt, glob, os, sys
from collections import Counter
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))   # akar repo: tiga tingkat di atas berkas ini
sys.path.insert(0, os.path.join(REPO, 'scripts', 'data'))
import harian as H, titik_palsu as TP
from wilayah import Wilayah
UTC, WIB = dt.timezone.utc, H.WIB
SAT = {'N': 'N', 'N20': 'N20', 'N21': 'N21', 'Terra': 'M', 'Aqua': 'M'}


def muat(raw):
    """CSV FIRMS (bentuk normalkan.py) -> titik bentuk harian.hotspot(): dedup, hanya Indonesia, tanpa sel industri."""
    w = Wilayah(); sel_ind, _ = TP.sel_industri(); titik, lihat = [], set()
    for fn in sorted(glob.glob(os.path.join(raw, '*.csv'))):
        for r in csv.DictReader(open(fn)):
            s = SAT.get(r['satellite'])
            if not s: continue
            conf = r.get('confidence', '')
            kc = (0 if not conf.isdigit() or int(conf) < 30 else 1 if int(conf) < 80 else 2) if s == 'M' else {'l': 0, 'n': 1, 'h': 2}.get(conf, 1)
            j = r['acq_time'].zfill(4); t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00")
            lat, lon = round(float(r['latitude']), 4), round(float(r['longitude']), 4)
            if (lat, lon, t, s) in lihat: continue
            lihat.add((lat, lon, t, s))
            if TP.palsu(lat, lon, sel_ind): continue
            adm = w.cari(lon, lat)
            if not adm: continue
            titik.append({'lat': lat, 'lon': lon, 't': t, 's': s, 'c': kc, 'adm': adm,
                          'px': max(float(r.get('scan') or .4), float(r.get('track') or .4))})
    titik.sort(key=lambda p: p['t'])
    return titik


def kluster(titik, kini, data_s_d=None):
    """Cluster aktif pada `kini` (datetime UTC); titik sesudah data_s_d (bawaan = kini) tidak dipakai. -> daftar (pts, firespot, aktif)."""
    batas = data_s_d or kini
    viirs = [p for p in titik if p['s'] != 'M' and p['c'] >= 1 and kini - dt.timedelta(days=H.JENDELA_HARI) <= p['t'] <= batas
             and not H.A.gunung_api(p['lat'], p['lon'])]
    label, _ = H.dbscan(viirs)
    g = {}
    for p, l in zip(viirs, label): g.setdefault(l, []).append(p)
    out = []
    for pts in g.values():
        pola, fs = H.firespot(pts)
        out.append((pts, fs, max(p['t'] for p in pts) >= kini - dt.timedelta(hours=H.AKTIF_JAM)))
    return out


def hitung(titik, kini, hari, sensor=('N', 'N20')):
    """Firespot titik per provinsi pada hari `hari` (date WIB), dengan cluster yang dinilai pada `kini`. -> (Counter prov, daftar titik)."""
    ya = [p for pts, fs, _ in kluster(titik, kini) if fs == 'ya' for p in pts]
    pilih = [p for p in ya if p['s'] in sensor and H.tgl(p['t']) == hari and p['t'] < kini]
    return Counter(p['adm'][0] for p in pilih), pilih
