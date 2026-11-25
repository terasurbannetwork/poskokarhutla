"""Hujan sebelum dan sesudah semai OMC Aceh 24 Nov 2026 (pemilik 25 Nov: pilih "Hujan sebelum-sesudah" untuk pertanyaan atasan "dampak OMC nya gimana").
Dua sumber tanpa kunci (mesin ini tanpa token Earthdata/IMERG maupun akun GSMaP):
  1. Hujan per jam model ECMWF IFS 0,25 derajat (Open-Meteo historical-forecast-api) di kisi 3x3 titik (+-0,25 derajat) sekitar pusat tiap wilayah semai,
     dirata-rata. Ini PERKIRAAN MODEL, bukan pengukuran.
  2. METAR bandara Aceh (aviationweather.gov): pengamatan cuaca per jam (hujan atau tidak), bukan jumlah hujan.
Jendela: 3 jam sebelum engine on, dan 6 jam sesudah engine off (WIB). Pusat wilayah semai = perkiraan dari nama perairan di laporan (sama dengan peta slide).
Keluaran: kerja-251126/omc_hujan.json. Pakai: python omc_hujan.py"""
import datetime as dt, json, os, urllib.request

S = os.path.dirname(os.path.abspath(__file__))
WIB = dt.timezone(dt.timedelta(hours=7))
SORTI = [  # no, armada, wilayah, pusat (lon, lat) seperti peta, engine on, engine off (WIB)
    (1, 'Cessna Caravan PK-SNK sorti 1', 'Perairan timur Aceh', (98.45, 5.4), '2026-11-24T07:09', '2026-11-24T10:05'),
    (2, 'Cessna Caravan PK-SNK sorti 2', 'Perairan barat Aceh', (95.25, 4.55), '2026-11-24T22:32', '2026-11-25T01:10'),
    (3, 'CASA 212-200 A-2103 sorti 1', 'Perairan barat Aceh Selatan', (96.6, 3.2), '2026-11-24T07:34', '2026-11-24T10:14')]
SEBELUM, SESUDAH = 3, 6
METAR = ['WITT', 'WITC', 'WITM', 'WITN', 'WITK', 'WIMM']   # Banda Aceh, Meulaboh, Lhokseumawe, Nagan Raya, Takengon, Kualanamu


def ambil(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read())


def model():
    pts = [(lo + dx, la + dy) for _, _, _, (lo, la), _, _ in SORTI for dx in (-.25, 0, .25) for dy in (-.25, 0, .25)]
    url = ('https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=' + ','.join(f'{la:.2f}' for _, la in pts)
           + '&longitude=' + ','.join(f'{lo:.2f}' for lo, _ in pts) + '&hourly=precipitation&models=ecmwf_ifs025'
           + '&start_date=2026-11-23&end_date=2026-11-25&timezone=Asia%2FJakarta')
    r = ambil(url); r = r if isinstance(r, list) else [r]
    out = []
    for i, (no, arm, wil, c, on, off) in enumerate(SORTI):
        blok = r[i * 9:(i + 1) * 9]; jam = blok[0]['hourly']['time']
        rata = [sum((b['hourly']['precipitation'][k] or 0) for b in blok) / 9 for k in range(len(jam))]
        t_on, t_off = dt.datetime.fromisoformat(on), dt.datetime.fromisoformat(off)
        a, b = t_on.replace(minute=0) - dt.timedelta(hours=SEBELUM), t_off.replace(minute=0) + dt.timedelta(hours=1)
        seri = [(j, v) for j, v in zip(jam, rata) if a - dt.timedelta(hours=2) <= dt.datetime.fromisoformat(j) < b + dt.timedelta(hours=SESUDAH + 2)]
        # jam model = jumlah hujan jam SEBELUMNYA (Open-Meteo): nilai berlabel j = hujan (j-1, j]
        sbl = sum(v for j, v in zip(jam, rata) if a < dt.datetime.fromisoformat(j) <= t_on.replace(minute=0))
        ssd = sum(v for j, v in zip(jam, rata) if b <= dt.datetime.fromisoformat(j) <= b + dt.timedelta(hours=SESUDAH - 1))
        sl = sum(v for j, v in zip(jam, rata) if t_on.replace(minute=0) < dt.datetime.fromisoformat(j) < b)
        out.append({'no': no, 'armada': arm, 'wilayah': wil, 'pusat': c, 'on': on, 'off': off, 'sebelum_mm': round(sbl, 2), 'selama_mm': round(sl, 2),
                    'sesudah_mm': round(ssd, 2), 'seri': [[j, round(v, 2)] for j, v in seri]})
    return out


def metar():
    try: r = ambil('https://aviationweather.gov/api/data/metar?ids=' + ','.join(METAR) + '&hours=48&format=json')
    except Exception as e: return {'galat': str(e)}
    o = {}
    for m in r:
        t = dt.datetime.fromtimestamp(m['obsTime'], dt.timezone.utc).astimezone(WIB)
        o.setdefault(m['icaoId'], []).append([t.isoformat(timespec='minutes'), m.get('wxString') or '', m.get('precip'), m.get('rawOb')])
    return {k: sorted(v) for k, v in o.items()}


if __name__ == '__main__':
    hasil = {'dibuat': dt.datetime.now(WIB).isoformat(timespec='minutes'), 'model': model(), 'metar': metar(),
             'catatan': 'model ECMWF IFS 0,25 derajat (Open-Meteo), rata-rata 9 titik; bukan pengukuran. METAR = pengamatan bandara.'}
    os.makedirs(os.path.join(S, 'kerja-251126'), exist_ok=True)
    json.dump(hasil, open(os.path.join(S, 'kerja-251126', 'omc_hujan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for m in hasil['model']: print(m['no'], m['wilayah'], 'sebelum', m['sebelum_mm'], 'selama', m['selama_mm'], 'sesudah', m['sesudah_mm'])
    for k, v in (hasil['metar'].items() if isinstance(hasil['metar'], dict) else []):
        if k != 'galat': print(k, len(v), 'laporan; hujan:', [(t[11:16] + ' ' + t[8:10], w) for t, w, _, _ in v if any(z in w for z in ('RA', 'TS', 'DZ', 'SH'))][:12])
    print(hasil['metar'].get('galat', ''))
