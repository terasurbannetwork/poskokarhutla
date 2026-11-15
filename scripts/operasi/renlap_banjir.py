#!/usr/bin/env python3
"""Renlap udara PANTAU BANJIR: rute helikopter ke kecamatan yang dilaporkan banjir belum surut (pemilik 15 Nov 2026:
"buat renlap udara untuk pantau titik banjir di Sumut dan Aceh untuk pantau yang belum surut ... ke kecamatan tersebut").

Target = titik tengah kecamatan (bukan lokasi genangan persis; batas desa belum ada di repo). Nama kecamatan diambil berurutan dari:
  1. butir WA Koordalops terakhir kab/kota itu,  2. logbook Pusdalops (data/raw/dalops/banjir.json),
  3. bila keduanya kosong: kecamatan dengan status prakiraan tertinggi di kab/kota itu (ditandai "dari prakiraan sistem").
Base = bandara terdekat dari daftar BASE (koordinat bandara publik; base heli banjir belum ada di seed 0103). Rute per base urut
tetangga terdekat. Usulan lokasi untuk dilihat, bukan perintah terbang.

  python3 scripts/operasi/renlap_banjir.py uji
  python3 scripts/operasi/renlap_banjir.py daftar [--prov ...] [--tanggal ...]   (daftar titik saja: CSV, KML, TXT)
  python3 scripts/operasi/renlap_banjir.py peta [--prov ...] [--tanggal ...]     (PDF peta titik: ikhtisar + per kab/kota)
  python3 scripts/operasi/renlap_banjir.py buat --prov Aceh "Sumatera Utara" [--tanggal YYYY-MM-DD] [--kecepatan 200] [--keluar DIR]
Keluaran: PDF per base + gabungan, KML, GPX, TXT siap WA, JSON (bawaan data/laporan-bnpb/paparan/renlap-udara-banjir-<tanggal>/).
"""
import argparse
import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[1]
sys.path.insert(0, str(SINI)); sys.path.insert(0, str(AKAR / 'data/laporan-bnpb/generator')); sys.path.insert(0, str(AKAR / 'scripts/banjir'))
import renlap as R  # noqa: E402
import renlap_pdf as RP  # noqa: E402

# bandara publik (ICAO, koordinat aerodrome); tanpa VOR tercatat -> kolom radial dikosongkan
BASE = [
    {'id': 'BTJ', 'nama': 'Sultan Iskandar Muda', 'icao': 'WITT', 'lat': 5.5236, 'lon': 95.4206},
    {'id': 'MEQ', 'nama': 'Cut Nyak Dhien', 'icao': 'WITC', 'lat': 4.0500, 'lon': 96.2490},
    {'id': 'KNO', 'nama': 'Kualanamu', 'icao': 'WIMM', 'lat': 3.6422, 'lon': 98.8853},
]
LEVEL = {0: 'Normal', 1: 'Waspada', 2: 'Siaga', 3: 'Awas'}
WARNA = {0: ('#eef0f3', '#6b7280'), 1: ('#fdf3e7', '#9a5b1e'), 2: ('#e8894a', '#ffffff'), 3: ('#8f3f07', '#ffffff')}


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip()).lower()


def kecamatan_kab(kode, kab, geo):
    """{nama_kecil: nama} kecamatan satu kab/kota dari batas kecamatan."""
    return {norm(f['properties']['kec']): f['properties']['kec'] for f in geo if f['properties']['kab'] == kab}


def nama_kecamatan(o, kode, kec_kab, kej):
    """-> (daftar nama kecamatan, sumber). Hanya nama yang benar-benar kecamatan kab/kota ini (logbook kadang mencampur kab tetangga)."""
    teks = ' '.join((o.get('butir') or {}).values()) + ' ' + (o.get('kondisi') or '')
    wa = [nm for k, nm in kec_kab.items() if re.search(r'\b' + re.escape(k) + r'\b', teks.lower())]
    if wa:
        return sorted(wa), 'WA Koordalops'
    # logbook: semua kejadian provinsi ini (logbook pernah mencatat kecamatan Gayo Lues di bawah Aceh Tenggara); nama dicocokkan
    # ke kecamatan kab/kota ini saja, toleran salah ketik kecil ("Deleng Pokhkison" = "Deleng Pokhkisen")
    from difflib import get_close_matches
    lb = {norm(c) for e in kej if any(k.startswith(f'{kode}|') for k in e.get('kab_kode', [])) for c in (e.get('kec') or [])}
    cocok = {(get_close_matches(k, list(kec_kab), 1, .85) or [None])[0] for k in lb}
    lb = sorted(kec_kab[k] for k in cocok if k)
    return (lb, 'logbook Pusdalops') if lb else ([], '')


def target(prov_list, tanggal, n_hari=6):
    import situasi_banjir as S
    from bahaya import kecamatan
    from wilayah import PROVINSI
    st, dibuat = S.status_n_hari(n_hari)
    if st['hari'][0] < tanggal <= st['hari'][-1]:
        i = st['hari'].index(tanggal); st['hari'] = st['hari'][i:]
        for v in st['kec'].values(): v['b'], v['h3d'] = v['b'][i:], v['h3d'][i:]
    K = kecamatan()
    lb_path = AKAR / 'data/raw/dalops/banjir.json'
    kej = json.loads(lb_path.read_text())['kejadian'] if lb_path.exists() else []
    kode_dari = {v.lower(): k for k, v in PROVINSI.items()}
    out, wa_akhir = [], []
    for prov in prov_list:
        kode = kode_dari[prov.lower()]
        geo = json.loads((AKAR / f'public/geo/kecamatan/{kode}.json').read_text())['features']
        lap, wa0, wa1 = S.sudah_banjir(kode, tanggal)
        wa_akhir.append(wa1)
        for o in lap:
            if o['status'] != 'Belum surut':
                continue
            kec_kab = kecamatan_kab(kode, o['kab'], geo)
            nama, sumber = nama_kecamatan(o, kode, kec_kab, kej)
            if not nama:   # cadangan: kecamatan berstatus tertinggi di kab/kota ini
                cal = sorted(((max(v['b']), max(v['h3d']), k.split('|')[2]) for k, v in st['kec'].items() if k.startswith(f'{kode}|{o["kab"]}|')), reverse=True)
                nama, sumber = [c[2] for c in cal[:2]], 'prakiraan sistem'
            for nm in nama:
                k = f'{kode}|{o["kab"]}|{nm}'
                if k not in K:
                    continue
                v = st['kec'].get(k, {'b': [0] * len(st['hari']), 'h3d': [0] * len(st['hari'])})
                cincin = [f['geometry'] for f in geo if f['properties']['kab'] == o['kab'] and f['properties']['kec'] == nm]
                out.append(dict(prov=PROVINSI[kode], kode_prov=kode, kab=o['kab'], kec=nm, lat=K[k]['lat'], lon=K[k]['lon'], sumber_nama=sumber,
                                kondisi=S.rapi(o.get('kondisi')), akhir=o['akhir'], kk=o.get('kk'), ungsi=o.get('ungsi'),
                                darurat=S.status_darurat((o.get('butir') or {}).get('Penetapan status')), hari=st['hari'], lv=v['b'],
                                h3=max(v['h3d']) if v['h3d'] else 0, geom=cincin))
    return out, dibuat, max(w for w in wa_akhir if w)


def bagi_base(cp):
    rute = {b['id']: dict(b, patroli=[]) for b in BASE}
    for c in cp:
        b = min(BASE, key=lambda b: R.jarak_nm(b['lat'], b['lon'], c['lat'], c['lon']))
        rute[b['id']]['patroli'].append(c)
    for b in rute.values():   # urut tetangga terdekat dari base
        sisa, pos, urut = list(b['patroli']), (b['lat'], b['lon']), []
        while sisa:
            n = min(sisa, key=lambda c: R.jarak_nm(pos[0], pos[1], c['lat'], c['lon']))
            sisa.remove(n); urut.append(n); pos = (n['lat'], n['lon'])
        for i, c in enumerate(urut, 1):
            c.update(urut=i, tempat=f"Kec. {c['kec']}, {c['kab']}")
        b['patroli'] = urut
    return [b for b in rute.values() if b['patroli']]


# ---------------------------------------------------------------- PDF
def pil(lv, teks=None):
    isi, tg = WARNA[lv]
    return f'<span class="pil" style="background:{isi};color:{tg}">{html.escape(teks or LEVEL[lv])}</span>'


def kaki(meta):
    return (f'<div class="kaki">Sumber: laporan Dit. Koordalops BNPB s.d. {meta["wa"]}, logbook Pusdalops BNPB, status banjir Centurisk97 (ECMWF IFS, GloFAS, InaRISK) '
            f'{meta["per"]}. Target = titik tengah kecamatan yang dilaporkan banjir belum surut, bukan lokasi genangan persis. Citra Esri World Imagery. '
            f'Waktu tempuh = jarak garis lurus pada {RP.ang(meta["v"])} km/jam tanpa angin, ditambah orbit {RP.ORBIT_MNT} menit tiap CP. Haluan sejati. '
            f'Koordinat base dari data bandara publik. Usulan lokasi untuk dilihat, bukan perintah terbang: keputusan terbang pada PIC dan komando.</div>')


def halaman_base(b, titik, leg, meta, kerja, cache):
    ey = f"BNPB, RENCANA LAPANGAN UDARA PANTAU BANJIR, BASE {b['nama'].upper()} ({b['id']})"
    cp = titik[1:-1]
    semua = [(t['lat'], t['lon']) for t in titik]
    la0, la1 = min(p[0] for p in semua), max(p[0] for p in semua)
    lo0, lo1 = min(p[1] for p in semua), max(p[1] for p in semua)
    W, H = 1100, 1060
    z = 12
    while z > 4:
        (ax, ay), (bx, by) = RP.gpx(la1, lo0, z), RP.gpx(la0, lo1, z)
        if (bx - ax) * 1.25 <= W and (by - ay) * 1.25 <= H:
            break
        z -= 1
    clat, clon = (la0 + la1) / 2, (lo0 + lo1) / 2
    P = RP.bingkai(clat, clon, z, W, H, cache, kerja / f"{b['id']}_banjir_rute.jpg")
    s = RP.svg_rute(P, titik, W, H)
    s += RP.penanda(P, titik[0], 15, base=True, label=f"Base {b['nama']}")
    for c in cp:
        s += RP.penanda(P, c, 13, label=c['kec'], ukuran=18)
    mpp = RP.m_per_px(clat, z)
    bar = next(k for k in (5, 10, 20, 25, 50, 100) if k * 1000 / mpp >= W * .12)
    s += RP.skala(W, H, mpp, bar) + RP.utara(W) + ['</svg>']
    total_km, total_mnt = titik[-1]['kum_km'], titik[-1]['kum_mnt']
    baris = []
    for t in titik:
        isb = t['kode'] == b['id']
        st_ = '–' if isb else pil(max(t['lv'] or [0]))
        baris.append(f'<tr><td><span class="bul{" b" if isb else ""}">{"B" if isb else t["urut"]}</span></td>'
                     f'<td><b>{t["kode"]}</b> {html.escape(t.get("tempat") or "")}</td>'
                     f'<td class="n"><a href="{RP.gmaps(t["lat"], t["lon"])}">{t["lat"]:.4f}, {t["lon"]:.4f}</a></td>'
                     f'<td class="n">{st_}</td><td class="n">{RP.ang(t["kum_km"])} km</td><td class="n">+{RP.ang(t["kum_mnt"])} mnt</td></tr>')
    n_kab = len({c['kab'] for c in cp})
    kpi = (f'<div class="kpi"><div class="o"><b>{RP.ang(len(cp))} kecamatan</b><span>banjir belum surut di {RP.ang(n_kab)} kab/kota</span></div>'
           f'<div><b>{RP.ang(sum(1 for c in cp if max(c["lv"] or [0]) >= 2))} kecamatan</b><span>berstatus Siaga atau Awas pada prakiraan {len(cp[0]["hari"])} hari</span></div>'
           f'<div><b>± {RP.ang(total_km)} km</b><span>loop base, semua CP, kembali ke base ({RP.ang(total_km / R.NM_KM)} NM)</span></div>'
           f'<div class="o"><b>± {RP.ang(total_mnt)} menit</b><span>pada {RP.ang(meta["v"])} km/jam, termasuk orbit {RP.ORBIT_MNT} menit tiap CP</span></div></div>')
    h1 = (f'<section class="hal">{RP.kepala(ey, "Rencana rute udara pantau banjir dari " + b["nama"], meta)}{kpi}'
          f'<div class="dua"><div><div class="peta" style="height:118mm"><img src="{b["id"]}_banjir_rute.jpg">{"".join(s)}</div>'
          f'<div class="leg"><span><i style="background:#e8590c"></i>Check point (titik tengah kecamatan)</span><span><i style="background:#0b2545"></i>Base</span>'
          f'<span style="color:#0284c7">— Rute dan arah terbang</span></div></div>'
          f'<div class="kartu"><h3>Urutan check point, klik koordinat untuk Google Maps</h3><table><thead><tr><th></th><th>Titik</th><th class="n">Koordinat</th>'
          f'<th class="n">Prakiraan</th><th class="n">Jarak tempuh</th><th class="n">Waktu</th></tr></thead><tbody>{"".join(baris)}</tbody></table>'
          f'<p class="fnd">Prakiraan = status banjir tertinggi kecamatan itu pada {len(cp[0]["hari"])} hari ke depan. Jarak dan waktu kumulatif sejak lepas landas.</p></div></div>{kaki(meta)}</section>')
    lb = ''.join(f'<tr><td>{x["no"]}</td><td style="white-space:nowrap"><b>{x["dari"]}</b> ke <b>{x["ke"]}</b></td><td class="mono">{R.dms(x["lat"], x["lon"])}</td>'
                 f'<td class="n"><a href="{RP.gmaps(x["lat"], x["lon"])}">{x["lat"]:.4f}, {x["lon"]:.4f}</a></td>'
                 f'<td class="n"><b>{round(x["haluan"]) % 360 or 360:03d}°</b></td><td class="n">{RP.ang(x["km"], 1)} km</td><td class="n">{RP.ang(x["nm"], 1)} NM</td>'
                 f'<td class="n">{"&lt; 1" if x["mnt"] < 1 else RP.ang(x["mnt"])} mnt</td></tr>' for x in leg)
    lb += (f'<tr><td></td><td><b>Total</b></td><td></td><td></td><td></td><td class="n"><b>{RP.ang(sum(x["km"] for x in leg))} km</b></td>'
           f'<td class="n"><b>{RP.ang(sum(x["nm"] for x in leg))} NM</b></td><td class="n"><b>{RP.ang(sum(x["mnt"] for x in leg))} mnt</b></td></tr>')
    alasan = ''.join(f'<li><b>{c["kode"]}</b> {html.escape(c["kec"])}, {html.escape(c["kab"])}: nama kecamatan dari {c["sumber_nama"]}; '
                     f'{html.escape(c["kondisi"])}</li>' for c in cp)
    h2 = (f'<section class="hal">{RP.kepala(ey, "Flight plan pantau banjir: leg, haluan, dan jarak", meta)}'
          f'<div class="dua" style="grid-template-columns:170mm 1fr"><div class="kartu"><h3>Tabel leg untuk pilot</h3><table><thead><tr><th>Leg</th><th>Dari ke</th>'
          f'<th>Koordinat tujuan (DMS)</th><th class="n">Google Maps</th><th class="n">Haluan sejati</th><th class="n">Jarak</th><th class="n">NM</th>'
          f'<th class="n">Waktu</th></tr></thead><tbody>{lb}</tbody></table><p class="fnd">Waktu leg pada {RP.ang(meta["v"])} km/jam tanpa angin, belum termasuk orbit '
          f'{RP.ORBIT_MNT} menit di tiap CP.</p></div>'
          f'<div style="display:grid;gap:4mm;align-content:start"><div class="kartu"><h3>Kenapa check point ini</h3><ul>{alasan}</ul></div>'
          f'<div class="kartu"><h3>Yang perlu diputuskan</h3><ol><li>Base dan jenis helikopter; hitungan memakai {RP.ang(meta["v"])} km/jam.</li>'
          f'<li>Urutan CP boleh diubah komando; jarak dan waktu dihitung ulang.</li>'
          f'<li>Cuaca dan awan rendah di pegunungan Gayo dan Alas; ketinggian dan izin wilayah udara ditetapkan pilot.</li></ol></div></div></div>{kaki(meta)}</section>')
    return h1 + h2


def halaman_cp(b, titik, i, meta, kerja, cache):
    c, sebelum, sesudah = titik[i], titik[i - 1], titik[i + 1]
    pts = [p for g in c['geom'] for q in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']) for p in q[0]]
    la0, la1 = min(p[1] for p in pts), max(p[1] for p in pts)
    lo0, lo1 = min(p[0] for p in pts), max(p[0] for p in pts)
    W = 1000
    z = 14
    while z > 8:
        (ax, ay), (bx, by) = RP.gpx(la1, lo0, z), RP.gpx(la0, lo1, z)
        if (bx - ax) * 1.1 <= W and (by - ay) * 1.1 <= W:
            break
        z -= 1
    clat, clon = (la0 + la1) / 2, (lo0 + lo1) / 2
    P = RP.bingkai(clat, clon, z, W, W, cache, kerja / f"{b['id']}_{c['kode']}_banjir.jpg")
    s = RP.svg_rute(P, titik, W, W, tebal=4)
    for g in c['geom']:   # batas kecamatan
        for q in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
            d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in (P(p[1], p[0]) for p in q[0]))
            s.append(f'<polygon points="{d}" fill="#38bdf8" fill-opacity=".12" stroke="#fff" stroke-width="3" stroke-dasharray="10 6"/>')
    for t in titik[1:-1]:
        s += RP.penanda(P, t, 17 if t is c else 13)
    mpp = RP.m_per_px(clat, z)
    bar = next(k for k in (1, 2, 5, 10, 20) if k * 1000 / mpp >= W * .12)
    s += RP.skala(W, W, mpp, bar) + RP.utara(W) + ['</svg>']
    hari = ''.join(f'<td class="n">{pil(lv, LEVEL[lv][0]) if lv else "–"}</td>' for lv in c['lv'])
    kep = ''.join(f'<th class="n">{RP.BULAN and h[8:]}/{h[5:7]}</th>' for h in c['hari'])
    hal = lambda a, b_: R.baringan(a['lat'], a['lon'], b_['lat'], b_['lon'])
    jk = lambda a, b_: RP.km((a['lat'], a['lon']), (b_['lat'], b_['lon']))
    kanan = pil(max(c['lv'] or [0]), 'Prakiraan ' + LEVEL[max(c['lv'] or [0])]) + f'<span class="pil abu">+{RP.ang(c["kum_mnt"])} menit dari base</span>'
    info = (f'<tr><td>Kab/kota</td><td><b>{html.escape(c["kab"])}</b>, {html.escape(c["prov"])}</td></tr>'
            f'<tr><td>Kondisi terakhir</td><td>{html.escape(c["kondisi"])} ({date.fromisoformat(c["akhir"]).day} {RP.BULAN[int(c["akhir"][5:7]) - 1]})</td></tr>'
            f'<tr><td>KK terdampak</td><td>{RP.ang(c["kk"]) if c["kk"] else "–"} (kab/kota)</td></tr>'
            f'<tr><td>Mengungsi</td><td>{RP.ang(c["ungsi"]) + " jiwa" if c["ungsi"] else "–"}</td></tr>'
            f'<tr><td>Status darurat</td><td>{html.escape(c["darurat"])}</td></tr>'
            f'<tr><td>Nama kecamatan dari</td><td>{c["sumber_nama"]}</td></tr>')
    return (f'<section class="hal"><div class="kepala"><div class="nocp"><span class="bul">{c["urut"]}</span><div><div class="ey">Check point {c["urut"]} dari {len(titik) - 2}, '
            f'rute udara pantau banjir base {html.escape(b["nama"])}</div><h1>{html.escape(c["tempat"])}</h1></div></div><div class="per">{kanan}</div></div>'
            f'<div class="dua cp"><div><div class="peta" style="height:150mm;width:150mm"><img src="{b["id"]}_{c["kode"]}_banjir.jpg">{"".join(s)}</div>'
            f'<div class="leg"><span style="color:#0284c7">- - Batas Kec. {html.escape(c["kec"])}</span><span><i style="background:#e8590c"></i>Check point</span>'
            f'<span style="color:#0284c7">— Rute dan arah terbang</span></div></div>'
            f'<div><div class="kartu"><h3>Koordinat check point, klik untuk Google Maps</h3><div class="besar"><a href="{RP.gmaps(c["lat"], c["lon"])}">{c["lat"]:.4f}, {c["lon"]:.4f}</a></div>'
            f'<span class="mono b">{R.dms(c["lat"], c["lon"])}</span><a class="tbl" href="{RP.gmaps(c["lat"], c["lon"])}">Buka di Google Maps</a></div>'
            f'<div class="mini"><div>Masuk dari {sebelum["kode"]}<br><b>{round(hal(sebelum, c)) % 360 or 360:03d}°</b>, {RP.ang(jk(sebelum, c), 1)} km</div>'
            f'<div>Lanjut ke {sesudah["kode"]}<br><b>{round(hal(c, sesudah)) % 360 or 360:03d}°</b>, {RP.ang(jk(c, sesudah), 1)} km</div></div>'
            f'<div class="kartu"><h3>Laporan Koordalops</h3><table><tbody>{info}</tbody></table></div>'
            f'<div class="kartu"><h3>Prakiraan status banjir kecamatan ini</h3><table><thead><tr>{kep}</tr></thead><tbody><tr>{hari}</tr></tbody></table>'
            f'<p class="fnd">Hujan tiga hari tertinggi {RP.ang(c["h3"])} mm. A Awas, S Siaga, W Waspada.</p></div></div></div>{kaki(meta)}</section>')


def kml(rute, nama):
    pm = []
    for b in rute:
        pm.append(f'<Placemark><name>Base {html.escape(b["nama"])}</name><Point><coordinates>{b["lon"]},{b["lat"]},0</coordinates></Point></Placemark>')
        for c in b['patroli']:
            pm.append(f'<Placemark><name>{b["id"]} CP{c["urut"]} {html.escape(c["kec"])}</name><description>{html.escape(c["kab"])}: {html.escape(c["kondisi"])}</description>'
                      f'<Point><coordinates>{c["lon"]},{c["lat"]},0</coordinates></Point></Placemark>')
        jalur = ' '.join(f'{p["lon"]},{p["lat"]},0' for p in [b] + b['patroli'] + [b])
        pm.append(f'<Placemark><name>Rute {b["id"]}</name><LineString><coordinates>{jalur}</coordinates></LineString></Placemark>')
    return f'<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{html.escape(nama)}</name>{"".join(pm)}</Document></kml>'


def gpx_teks(rute, nama):
    wpt, rte = [], []
    for b in rute:
        wpt.append(f'<wpt lat="{b["lat"]}" lon="{b["lon"]}"><name>{b["id"]}</name></wpt>')
        pts = ''.join(f'<rtept lat="{p["lat"]}" lon="{p["lon"]}"><name>{b["id"] if p is b else b["id"] + "-CP" + str(p["urut"])}</name></rtept>' for p in [b] + b['patroli'] + [b])
        for c in b['patroli']:
            wpt.append(f'<wpt lat="{c["lat"]}" lon="{c["lon"]}"><name>{b["id"]}-CP{c["urut"]}</name><desc>{html.escape(c["kec"])}, {html.escape(c["kab"])}</desc></wpt>')
        rte.append(f'<rte><name>{b["id"]} pantau banjir</name>{pts}</rte>')
    return f'<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Centurisk97" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>{html.escape(nama)}</name></metadata>{"".join(wpt)}{"".join(rte)}</gpx>'


def teks_wa(rute, tanggal):
    t = [f'*Renlap udara pantau banjir {tanggal}* (usulan, bukan perintah terbang)']
    for b in rute:
        t.append(f'\n*Base {b["nama"]} ({b["icao"]})*')
        for c in b['patroli']:
            t.append(f'CP{c["urut"]} Kec. {c["kec"]}, {c["kab"]}: {c["lat"]:.4f}, {c["lon"]:.4f} {RP.gmaps(c["lat"], c["lon"])}')
    return '\n'.join(t)


def buat(a):
    tanggal = a.tanggal or date.today().isoformat()
    cp, dibuat, wa1 = target(a.prov, tanggal)
    if not cp:
        sys.exit('tidak ada kecamatan banjir belum surut')
    rute = bagi_base(cp)
    keluar = Path(a.keluar) if a.keluar else AKAR / f'data/laporan-bnpb/paparan/renlap-udara-banjir-{tanggal}'
    kerja = keluar / 'kerja'; cache = RP.KERJA / 'ubin'
    kerja.mkdir(parents=True, exist_ok=True); cache.mkdir(parents=True, exist_ok=True)
    meta = {'per': RP.tgl_panjang(R.waktu(dibuat)), 'wa': f'{int(wa1[8:])} {RP.BULAN[int(wa1[5:7]) - 1]} {wa1[:4]}', 'v': a.kecepatan, 'versi': 'banjir'}
    chrome, semua, hasil = RP.cari_chrome(), [], []
    d = date.fromisoformat(tanggal); tg = f'{d:%d%m%y}'

    def cetak(nama, isi):
        hf = kerja / f'{nama}.html'
        hf.write_text(f'<!doctype html><html lang="id"><head><meta charset="utf-8"><style>{RP.CSS}</style></head><body>{isi}</body></html>')
        pdf = keluar / f'Renlap Udara Pantau Banjir {nama} {tg}.pdf'
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=10000',
                        f'--print-to-pdf={pdf}', hf.as_uri()], check=True, capture_output=True, timeout=600)
        return pdf

    for b in rute:
        titik, leg = RP.susun_rute(b, a.kecepatan)
        isi = halaman_base(b, titik, leg, meta, kerja, cache) + ''.join(halaman_cp(b, titik, i, meta, kerja, cache) for i in range(1, len(titik) - 1))
        semua.append(isi)
        hasil.append(cetak(f'{b["nama"]}', isi))
        print(f'{b["id"]}: {len(titik) - 2} CP, {RP.ang(titik[-1]["kum_km"])} km, ± {RP.ang(titik[-1]["kum_mnt"])} mnt')
    if len(semua) > 1:
        hasil.append(cetak('Semua Base', ''.join(semua)))
    nama = f'Renlap Udara Pantau Banjir {tg}'
    (keluar / f'{nama}.kml').write_text(kml(rute, nama))
    (keluar / f'{nama}.gpx').write_text(gpx_teks(rute, nama))
    (keluar / f'{nama}.txt').write_text(teks_wa(rute, tanggal))
    (keluar / f'{nama}.json').write_text(json.dumps([{k: v for k, v in b.items()} | {'patroli': [{k: v for k, v in c.items() if k != 'geom'} for c in b['patroli']]} for b in rute],
                                                     ensure_ascii=False, indent=1, default=str))
    for p in hasil:
        print(p)


def daftar(a):
    """Daftar koordinat kecamatan banjir belum surut saja, tanpa base dan rute (pemilik 15 Nov 2026: "list longlat yg banjir dlu aja")."""
    import csv
    tanggal = a.tanggal or date.today().isoformat()
    cp, dibuat, wa1 = target(a.prov, tanggal)
    keluar = Path(a.keluar) if a.keluar else AKAR / f'data/laporan-bnpb/paparan/renlap-udara-banjir-{tanggal}'
    keluar.mkdir(parents=True, exist_ok=True)
    nama = f'Titik Banjir Belum Surut {date.fromisoformat(tanggal):%d%m%y}'
    cp.sort(key=lambda c: (c['prov'], c['kab'], c['kec']))
    with open(keluar / f'{nama}.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['no', 'provinsi', 'kab_kota', 'kecamatan', 'lat', 'lon', 'dms', 'google_maps', 'kondisi_terakhir', 'tgl_laporan', 'prakiraan_tertinggi', 'nama_kecamatan_dari'])
        for i, c in enumerate(cp, 1):
            w.writerow([i, c['prov'], c['kab'], c['kec'], f"{c['lat']:.5f}", f"{c['lon']:.5f}", R.dms(c['lat'], c['lon']), RP.gmaps(c['lat'], c['lon']),
                        c['kondisi'], c['akhir'], LEVEL[max(c['lv'] or [0])], c['sumber_nama']])
    pm = ''.join(f'<Placemark><name>{html.escape(c["kec"])}, {html.escape(c["kab"])}</name><description>{html.escape(c["kondisi"])}</description>'
                 f'<Point><coordinates>{c["lon"]},{c["lat"]},0</coordinates></Point></Placemark>' for c in cp)
    (keluar / f'{nama}.kml').write_text(f'<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{nama}</name>{pm}</Document></kml>')
    t, kab0 = [f'*{nama}* (titik tengah kecamatan, Koordalops s.d. {wa1})'], None
    for c in cp:
        if c['kab'] != kab0:
            t.append(f"\n*{c['kab']}, {c['prov']}*"); kab0 = c['kab']
        t.append(f"Kec. {c['kec']}: {c['lat']:.4f}, {c['lon']:.4f} {RP.gmaps(c['lat'], c['lon'])}")
    (keluar / f'{nama}.txt').write_text('\n'.join(t))
    for c in cp:
        print(f"{c['prov']}|{c['kab']}|{c['kec']}|{c['lat']:.4f}|{c['lon']:.4f}|{c['sumber_nama']}|{LEVEL[max(c['lv'] or [0])]}")
    print(keluar)


def peta_pdf(a):
    """PDF peta titik banjir belum surut: 1 halaman ikhtisar (semua titik bernomor + daftar), lalu 1 halaman per kab/kota
    (citra satelit, batas kecamatan, titik, koordinat klik). Tanpa base dan rute."""
    tanggal = a.tanggal or date.today().isoformat()
    cp, dibuat, wa1 = target(a.prov, tanggal)
    cp.sort(key=lambda c: (c['prov'], -c['lat'], c['kab'], c['kec']))
    for i, c in enumerate(cp, 1):
        c.update(urut=i, kode=str(i))
    keluar = Path(a.keluar) if a.keluar else AKAR / f'data/laporan-bnpb/paparan/renlap-udara-banjir-{tanggal}'
    kerja = keluar / 'kerja'; cache = RP.KERJA / 'ubin'
    kerja.mkdir(parents=True, exist_ok=True); cache.mkdir(parents=True, exist_ok=True)
    tg = f'{date.fromisoformat(tanggal):%d%m%y}'
    meta = {'per': RP.tgl_panjang(R.waktu(dibuat)), 'wa': f'{int(wa1[8:])} {RP.BULAN[int(wa1[5:7]) - 1]} {wa1[:4]}'}
    kaki_ = (f'<div class="kaki">Sumber: laporan Dit. Koordalops BNPB s.d. {meta["wa"]}, logbook Pusdalops BNPB, status banjir Centurisk97 (ECMWF IFS, GloFAS, InaRISK) '
             f'{meta["per"]}. Titik = titik tengah kecamatan yang dilaporkan banjir belum surut, bukan lokasi genangan persis. Bertanda * = nama kecamatan belum dilaporkan, '
             f'diambil dari kecamatan berstatus prakiraan tertinggi. Citra Esri World Imagery.</div>')
    ey = 'BNPB, PANTAUAN UDARA BANJIR, TITIK KECAMATAN BELUM SURUT'

    def peta(titik, W, H, nama, zmaks, geom=False):
        la = [t['lat'] for t in titik]; lo = [t['lon'] for t in titik]
        if geom:
            pts = [p for t in titik for g in t['geom'] for q in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']) for p in q[0]]
            la += [p[1] for p in pts]; lo += [p[0] for p in pts]
        la0, la1, lo0, lo1 = min(la), max(la), min(lo), max(lo)
        z = zmaks
        while z > 4:
            (ax, ay), (bx, by) = RP.gpx(la1, lo0, z), RP.gpx(la0, lo1, z)
            if (bx - ax) * 1.15 <= W and (by - ay) * 1.15 <= H:
                break
            z -= 1
        clat, clon = (la0 + la1) / 2, (lo0 + lo1) / 2
        P = RP.bingkai(clat, clon, z, W, H, cache, kerja / f'{nama}.jpg')
        s = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">']
        if geom:
            for t in titik:
                for g in t['geom']:
                    for q in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']):
                        d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in (P(p[1], p[0]) for p in q[0]))
                        s.append(f'<polygon points="{d}" fill="#38bdf8" fill-opacity=".14" stroke="#fff" stroke-width="2.5" stroke-dasharray="9 6"/>')
        for t in titik:
            s += RP.penanda(P, t, 15 if geom else 12, label=t['kec'] if geom else None, ukuran=19)
        mpp = RP.m_per_px(clat, z)
        bar = next(k for k in (1, 2, 5, 10, 20, 25, 50, 100) if k * 1000 / mpp >= W * .12)
        return s + RP.skala(W, H, mpp, bar) + RP.utara(W) + ['</svg>']

    def baris(t, ringkas=False):
        bintang = '*' if t['sumber_nama'] == 'prakiraan sistem' else ''
        kab_ = f' <span style="color:#6b7280">{html.escape(t["kab"])}</span>' if ringkas else f'<br><span style="color:#6b7280">{html.escape(t["kab"])}</span>'
        return (f'<tr><td><span class="bul">{t["urut"]}</span></td><td><b>{html.escape(t["kec"])}{bintang}</b>{kab_}</td>'
                f'<td class="n"><a href="{RP.gmaps(t["lat"], t["lon"])}">{t["lat"]:.4f}, {t["lon"]:.4f}</a></td><td class="n">{pil(max(t["lv"] or [0]))}</td></tr>')

    isi = []
    s = peta(cp, 1100, 1060, 'ikhtisar', 10)
    kab = list(dict.fromkeys(c['kab'] for c in cp))
    tabel = lambda xs, ringkas=False: (f'<table class="{"rk" if ringkas else ""}"><thead><tr><th></th><th>Kecamatan</th><th class="n">Koordinat</th><th class="n">Prakiraan</th></tr></thead>'
                                       f'<tbody>{"".join(baris(t, ringkas) for t in xs)}</tbody></table>')
    h = (len(cp) + 1) // 2
    kpi = (f'<div class="kpi"><div class="o"><b>{RP.ang(len(cp))} kecamatan</b><span>banjir belum surut</span></div><div><b>{RP.ang(len(kab))} kab/kota</b><span>Aceh dan Sumatera Utara</span></div>'
           f'<div><b>{RP.ang(sum(1 for c in cp if max(c["lv"] or [0]) >= 2))} kecamatan</b><span>Siaga atau Awas pada prakiraan</span></div>'
           f'<div class="o"><b>{RP.ang(sum(1 for c in cp if c["sumber_nama"] == "prakiraan sistem"))} titik</b><span>nama kecamatan belum dilaporkan (*)</span></div></div>')
    isi.append(f'<section class="hal">{RP.kepala(ey, "Titik banjir belum surut di Aceh dan Sumatera Utara", meta)}{kpi}'
               f'<div class="dua"><div><div class="peta" style="height:118mm"><img src="ikhtisar.jpg">{"".join(s)}</div>'
               f'<div class="leg"><span><i style="background:#e8590c"></i>Titik tengah kecamatan, nomor sesuai daftar</span></div></div>'
               f'<div class="kartu" style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-size:.74em"><div>{tabel(cp[:h], True)}</div><div>{tabel(cp[h:], True)}</div></div></div>{kaki_}</section>')
    for k in kab:
        xs = [c for c in cp if c['kab'] == k]
        s = peta(xs, 1000, 1000, f'kab_{xs[0]["urut"]}', 14, geom=True)
        o = xs[0]
        info = (f'<tr><td>Kondisi terakhir</td><td>{html.escape(o["kondisi"])} ({date.fromisoformat(o["akhir"]).day} {RP.BULAN[int(o["akhir"][5:7]) - 1]})</td></tr>'
                f'<tr><td>KK terdampak</td><td>{RP.ang(o["kk"]) if o["kk"] else "–"}</td></tr><tr><td>Mengungsi</td><td>{RP.ang(o["ungsi"]) + " jiwa" if o["ungsi"] else "–"}</td></tr>'
                f'<tr><td>Status darurat</td><td>{html.escape(o["darurat"])}</td></tr><tr><td>Nama kecamatan dari</td><td>{o["sumber_nama"]}</td></tr>')
        isi.append(f'<section class="hal"><div class="kepala"><div><div class="ey">{ey}</div><h1>{html.escape(k)}, {html.escape(o["prov"])}</h1></div>'
                   f'<div class="per"><span class="pil abu">{RP.ang(len(xs))} kecamatan</span></div></div>'
                   f'<div class="dua cp"><div><div class="peta" style="height:150mm;width:150mm"><img src="kab_{xs[0]["urut"]}.jpg">{"".join(s)}</div>'
                   f'<div class="leg"><span style="color:#0284c7">- - Batas kecamatan</span><span><i style="background:#e8590c"></i>Titik tengah kecamatan</span></div></div>'
                   f'<div><div class="kartu"><h3>Koordinat, klik untuk Google Maps</h3>{tabel(xs)}</div>'
                   f'<div class="kartu"><h3>Laporan Koordalops</h3><table><tbody>{info}</tbody></table></div></div></div>{kaki_}</section>')
    hf = kerja / 'peta.html'
    css = RP.CSS + '.rk td{padding:1.2mm 1.5mm!important;line-height:1.15}.rk .bul{width:5mm;height:5mm;font-size:.85em}.rk .pil{padding:.3mm 2mm}'
    hf.write_text(f'<!doctype html><html lang="id"><head><meta charset="utf-8"><style>{css}</style></head><body>{"".join(isi)}</body></html>')
    pdf = keluar / f'Peta Titik Banjir Belum Surut {tg}.pdf'
    subprocess.run([RP.cari_chrome(), '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000',
                    f'--print-to-pdf={pdf}', hf.as_uri()], check=True, capture_output=True, timeout=900)
    print(pdf)


def uji():
    kec_kab = {'meureudu': 'Meureudu', 'bandar dua': 'Bandar Dua', 'blangkejeren': 'Blangkejeren'}
    kej = [{'kab_kode': ['11|Pidie Jaya'], 'kec': ['Meureudu', 'Bandar dua', 'Lawe Alas']}]
    assert nama_kecamatan({'kab': 'Pidie Jaya', 'butir': {}, 'kondisi': ''}, '11', kec_kab, kej) == (['Bandar Dua', 'Meureudu'], 'logbook Pusdalops')
    kej2 = [{'kab_kode': ['11|Aceh Tenggara'], 'kec': ['Blangkejeren', 'Deleng Pokhkison']}]
    assert nama_kecamatan({'kab': 'Gayo Lues', 'butir': {}, 'kondisi': ''}, '11', {'blangkejeren': 'Blangkejeren'}, kej2) == (['Blangkejeren'], 'logbook Pusdalops')
    assert nama_kecamatan({'kab': 'Aceh Tenggara', 'butir': {}, 'kondisi': ''}, '11', {'deleng pokhkisen': 'Deleng Pokhkisen'}, kej2) == (['Deleng Pokhkisen'], 'logbook Pusdalops')
    assert nama_kecamatan({'kab': 'Pidie Jaya', 'butir': {'Kerusakan': 'jalan di Kecamatan Blangkejeren'}, 'kondisi': ''}, '11', kec_kab, kej) == (['Blangkejeren'], 'WA Koordalops')
    r = bagi_base([{'lat': 3.6, 'lon': 98.9, 'kec': 'A', 'kab': 'X'}, {'lat': 5.4, 'lon': 95.5, 'kec': 'B', 'kab': 'Y'}])
    assert {b['id'] for b in r} == {'KNO', 'BTJ'} and all(c['urut'] == 1 for b in r for c in b['patroli'])
    print('lulus')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'uji':
        uji(); sys.exit()
    ap = argparse.ArgumentParser()
    ap.add_argument('perintah', choices=['buat', 'daftar', 'peta'])
    ap.add_argument('--prov', nargs='+', default=['Aceh', 'Sumatera Utara'])
    ap.add_argument('--tanggal', default='')
    ap.add_argument('--kecepatan', type=float, default=200.0, help='km/jam jelajah helikopter')
    ap.add_argument('--keluar', default='')
    a = ap.parse_args()
    {'daftar': daftar, 'peta': peta_pdf, 'buat': buat}[a.perintah](a)
