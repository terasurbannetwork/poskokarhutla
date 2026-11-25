"""Pratinjau 2 slide OMC Aceh (HTML 1600x900, bingkai deck harian). Slide 1 = desain infografis OMC; slide 2 = desain baru."""
import json, math, os, base64
D = os.path.dirname(os.path.abspath(__file__))
NAVY, ORG, TEKS, ABU, INK, T_NAVY, T_ORG, BRD = '#051C2C', '#D9600B', '#2E3440', '#6B7280', '#1A1A1A', '#E6EAF0', '#FBE7D6', '#BFC5CC'
b64 = lambda f: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
KRIS, BNPB = b64(f'{D}/m/h-ik-kris1.png'), b64(f'{D}/m/image-2-1.png')
IK = {
  'pesawat': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  'jam': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  'bahan': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
  'pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  'hujan': '<path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/>',
  'dokumen': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  'tim': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  'kalender': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
}
def ik(n, c, s=20, w=2): return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{IK[n]}</svg>'
def bulat(n, bg, c, d=40, s=None): return f'<div style="width:{d}px;height:{d}px;border-radius:50%;background:{bg};display:flex;align-items:center;justify-content:center;flex:none">{ik(n, c, s or int(d*.55))}</div>'

ARMADA = [dict(op='PT Smart Cakrawala Aviation', pes='Cessna Caravan 208B', reg='PK-SNK', per='18–24 November 2026', jam='28 jam 21 menit', j=('28', 'jam', '21', 'menit'), sorti=11, kg='10.000', base='Bandara Sultan Iskandar Muda'),
          dict(op='BMKG dan TNI AU', pes='CASA 212-200', reg='A-2103', per='21–24 November 2026', jam='4 jam 55 menit', j=('4', 'jam', '55', 'menit'), sorti=2, kg='1.600', base='Lanud Soewondo, Medan')]
SORTI = [('Cessna Caravan PK-SNK', 'Sorti 1', '07.09–10.05', '', 'Perairan timur Aceh', '11.000', '800'),
         ('Cessna Caravan PK-SNK', 'Sorti 2', '22.32–01.10', '25 Nov', 'Perairan barat Aceh', '10.000', '1.000'),
         ('CASA 212-200 A-2103', 'Sorti 1', '07.34–10.14', '', 'Perairan barat Aceh Selatan', '10.000', '800')]

def bingkai(no, judul, isi, sumber):
    tabs = ['Ringkasan', 'Rincian lokasi', 'OMC Aceh', 'Status siaga']
    t = ''.join(f'<div style="flex:1;text-align:center;font-size:14px;padding:6px 0 7px;color:{"#1A1A1A" if i == 2 else ABU};font-weight:{700 if i == 2 else 400};border-bottom:{"4px solid " + ORG if i == 2 else "1px solid #D1D5DB"}"><span style="color:{ORG if i == 2 else ABU};margin-right:6px">0{i + 1}</span>{x}</div>' for i, x in enumerate(tabs))
    return f'''<html><head><meta charset="utf-8"><style>*{{box-sizing:border-box}} body{{margin:0;width:1600px;height:900px;font-family:Roboto,Arial,sans-serif;color:{TEKS};background:#fff;position:relative;overflow:hidden}}
.panel{{background:#fff;border:1px solid {BRD};border-radius:12px}} .kp{{font-size:12.5px;font-weight:700;letter-spacing:1.6px;color:{NAVY}}} .hl{{color:{ORG}}}</style></head><body>
<div style="position:absolute;left:72px;right:72px;top:0;display:flex">{t}</div>
<div style="position:absolute;left:72px;top:62px;width:1090px;font-size:29px;font-weight:700;line-height:1.25;color:{INK}">{judul}</div>
<img src="{KRIS}" style="position:absolute;right:186px;top:66px;height:48px"><img src="{BNPB}" style="position:absolute;right:72px;top:46px;height:96px">
<div style="position:absolute;left:72px;right:72px;top:158px;border-top:1.5px solid #1A1A1A"></div>
<div style="position:absolute;left:72px;right:72px;top:168px;bottom:92px">{isi}</div>
<div style="position:absolute;left:72px;right:72px;top:848px;border-top:1.5px solid #1A1A1A"></div>
<div style="position:absolute;left:72px;right:72px;bottom:10px;height:38px;background:{NAVY};border-radius:4px;display:flex;align-items:center;color:#fff;font-size:12.5px;padding:0 20px">
<div style="width:4px;height:22px;background:#2F86D1;margin-right:12px"></div><b>Sumber:&nbsp;</b><i>{sumber}</i><div style="flex:1"></div>© 2026 Badan Nasional Penanggulangan Bencana<span style="margin-left:60px;font-weight:700">{no}</span></div>
</body></html>'''

JUDUL = f'Operasi modifikasi cuaca Aceh: <span class="hl">3 sorti</span> dan <span class="hl">2.600 kg NaCl</span> pada 24 November untuk mengurangi curah hujan di wilayah terdampak banjir'
SUMBER = 'Laporan Tim Pendampingan OMC Provinsi Aceh, 24 November 2026; infografis OMC Provinsi Aceh, pembaruan 24 November 2026'

# ---------------- slide 1: desain infografis (dua kartu armada, tiga angka besar, base di kaki)
def kartu1(a):
    baris = [('jam', 'Durasi terbang', f'<span style="font-size:54px">{a["j"][0]}</span><span style="font-size:22px;margin:0 10px 0 4px">{a["j"][1]}</span><span style="font-size:54px">{a["j"][2]}</span><span style="font-size:22px;margin-left:4px">{a["j"][3]}</span>'),
             ('pesawat', 'Jumlah penerbangan', f'<span style="font-size:54px">{a["sorti"]}</span><span style="font-size:22px;margin-left:8px">sorti</span>'),
             ('bahan', 'Total bahan semai', f'<span style="font-size:54px">{a["kg"]}</span><span style="font-size:22px;margin-left:8px">kg NaCl</span>')]
    r = ''.join(f'''<div style="display:flex;align-items:center;gap:22px;padding:22px 0;{"border-top:1px solid #E5E7EB" if i else ""}">{bulat(n, T_ORG, ORG, 84, 44)}
      <div><div style="font-size:15px;color:{ABU};font-weight:500;letter-spacing:.3px">{l}</div><div style="font-weight:700;color:{ORG};line-height:1.05;margin-top:2px">{v}</div></div></div>''' for i, (n, l, v) in enumerate(baris))
    return f'''<div class="panel" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
  <div style="background:{T_NAVY};padding:18px 26px;display:flex;align-items:center;gap:18px">{bulat('pesawat', NAVY, '#fff', 58, 32)}
    <div><div style="font-size:22px;font-weight:700;color:{NAVY}">{a["pes"]} <span style="color:{ABU};font-weight:500">({a["reg"]})</span></div>
    <div style="font-size:15px;color:{TEKS};margin-top:3px">{a["op"]}</div></div>
    <div style="flex:1"></div><div style="display:flex;align-items:center;gap:7px;background:#fff;border-radius:20px;padding:6px 14px;font-size:14px;font-weight:700;color:{NAVY}">{ik('kalender', NAVY, 16)}{a["per"]}</div></div>
  <div style="padding:4px 34px;flex:1;display:flex;flex-direction:column;justify-content:center">{r}</div>
  <div style="border-top:1px solid #E5E7EB;padding:13px 26px;display:flex;align-items:center;gap:10px;font-size:16px;color:{NAVY};font-weight:700">{ik('pin', ORG, 20)}Base {a["base"]}</div></div>'''
tot = [('pesawat', '13', 'sorti'), ('jam', '33 jam 16 menit', 'jam terbang'), ('bahan', '11.600', 'kg NaCl')]
tot_h = ''.join(f'<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:14px">{bulat(n, "#fff", ORG, 46, 24)}<span style="font-size:30px;font-weight:700;color:{ORG}">{v}</span><span style="font-size:16px;color:{TEKS}">{l}</span></div>' for n, v, l in tot)
s1 = bingkai(3, JUDUL, f'''<div style="display:flex;flex-direction:column;gap:14px;height:100%"><div style="display:flex;gap:18px;flex:1;min-height:0">{kartu1(ARMADA[0])}{kartu1(ARMADA[1])}</div>
<div style="background:{T_ORG};border-radius:12px;height:78px;display:flex;align-items:center;padding:0 24px"><div style="font-size:13px;font-weight:700;letter-spacing:1.5px;color:{ORG};width:170px">JUMLAH DUA ARMADA</div>{tot_h}</div></div>''', SUMBER)

# ---------------- slide 2: desain baru (kartu ringkas, tabel sorti 24 Nov, peta posko dan wilayah semai)
def peta(W, H):
    lon0, lon1, lat0, lat1 = 94.7, 99.4, 2.75, 6.05; k = math.cos(math.radians(4)); sx = W / ((lon1 - lon0) * k); sy = H / (lat1 - lat0); s = min(sx, sy)
    ox = (W - (lon1 - lon0) * k * s) / 2; oy = (H - (lat1 - lat0) * s) / 2
    P = lambda lo, la: (ox + (lo - lon0) * k * s, oy + (lat1 - la) * s)
    def jalur(g):
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        return ''.join('M' + 'L'.join(f'{P(*c)[0]:.1f},{P(*c)[1]:.1f}' for c in ring) + 'Z' for poly in polys for ring in poly[:1])
    o = f'<rect width="{W}" height="{H}" fill="#EEF4FA"/>'
    for f, fill in (('12.json', '#F3F4F6'), ('11.json', '#FFFFFF')):
        for ft in json.load(open(f'{D}/{f}', encoding='utf-8'))['features']:
            o += f'<path d="{jalur(ft["geometry"])}" fill="{fill}" stroke="{"#C4CAD2" if f == "11.json" else "#DADDE2"}" stroke-width="{0.9 if f == "11.json" else 0.6}"/>'
    # wilayah semai (perkiraan dari nama perairan di laporan, bukan koordinat lintasan)
    for lo, la, no in ((98.45, 5.4, 1), (95.25, 4.55, 2), (96.6, 3.2, 3)):
        x, y = P(lo, la)
        o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="27" fill="{ORG}" fill-opacity=".13" stroke="{ORG}" stroke-width="1.4" stroke-dasharray="4 3"/>'
        o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="12" fill="{ORG}"/><text x="{x:.1f}" y="{y + 4.5:.1f}" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">{no}</text>'
    for lo, la, nama, al in ((95.42, 5.52, ('Posko Bandara', 'Sultan Iskandar Muda'), 'start'), (98.67, 3.56, ('Posko Lanud', 'Soewondo, Medan'), 'end')):
        x, y = P(lo, la)
        o += f'<rect x="{x - 11:.1f}" y="{y - 11:.1f}" width="22" height="22" rx="4" fill="{NAVY}" transform="rotate(45 {x:.1f} {y:.1f})"/>'
        o += f'<g transform="translate({x - 7:.1f},{y - 7:.1f}) scale(.583)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{IK["pesawat"]}</g>'
    x, y = P(97.0, 4.45); o += f'<text x="{x:.1f}" y="{y:.1f}" font-size="15" font-weight="700" letter-spacing="3" fill="#9AA3AE" text-anchor="middle">ACEH</text>'
    x, y = P(98.95, 3.0); o += f'<text x="{x:.1f}" y="{y:.1f}" font-size="12" letter-spacing="2" fill="#B0B7C0" text-anchor="middle">SUMUT</text>'
    x, y = P(95.2, 3.4); o += f'<text x="{x:.1f}" y="{y:.1f}" font-size="12" font-style="italic" fill="#8FA9C4" text-anchor="middle">Samudra Hindia</text>'
    x, y = P(98.75, 5.85); o += f'<text x="{x:.1f}" y="{y:.1f}" font-size="12" font-style="italic" fill="#8FA9C4" text-anchor="start">Selat Malaka</text>'
    return f'<svg width="{W}" height="{H}" style="display:block;border-radius:8px;flex:none">{o}</svg>'

def kartu2(a):
    st = [('pesawat', str(a['sorti']), 'sorti'), ('jam', f"{a['j'][0]} jam {a['j'][2]} menit", 'jam terbang'), ('bahan', a['kg'], 'kg NaCl')]
    sel = ''.join(f'''<div style="width:{[84, 224, 142][i]}px;flex:none;box-sizing:border-box;display:flex;align-items:center;gap:8px;{"border-left:1px solid #E5E7EB;padding-left:12px" if i else ""}">{bulat(n, T_ORG, ORG, 36, 20)}
      <div><div style="font-size:{22 if i != 1 else 20}px;font-weight:700;color:{ORG};line-height:1.05;white-space:nowrap">{v}</div><div style="font-size:12.5px;color:{ABU}">{l}</div></div></div>''' for i, (n, v, l) in enumerate(st))
    return f'''<div class="panel" style="padding:16px 26px 16px 20px;display:flex;align-items:center;gap:16px">
  {bulat('pesawat', NAVY, '#fff', 46, 26)}<div style="flex:1;min-width:0;margin-right:14px">
    <div style="font-size:17px;font-weight:700;color:{NAVY};white-space:nowrap">{a["pes"]} <span style="color:{ABU};font-weight:500">{a["reg"]}</span></div><div style="font-size:13px;color:{TEKS};margin-top:1px;white-space:nowrap">{a["op"]}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
    <span style="display:flex;align-items:center;gap:6px;background:{T_NAVY};border-radius:14px;padding:4px 11px;font-size:12.5px;font-weight:700;color:{NAVY};white-space:nowrap">{ik('pin', NAVY, 14)}{a["base"]}</span>
    <span style="display:flex;align-items:center;gap:6px;background:{T_NAVY};border-radius:14px;padding:4px 11px;font-size:12.5px;font-weight:700;color:{NAVY};white-space:nowrap">{ik('kalender', NAVY, 14)}{a["per"].replace(' November 2026', ' Nov')}</span></div></div>
  <div style="display:flex;flex:none">{sel}</div></div>'''

def kartu2_lama(a):
    st = [('pesawat', str(a['sorti']), 'sorti'), ('jam', a['jam'].replace(' menit', ' mnt'), 'jam terbang'), ('bahan', a['kg'], 'kg NaCl')]
    sel = ''.join(f'''<div style="flex:1;display:flex;align-items:center;gap:10px;{"border-left:1px solid #E5E7EB;padding-left:14px" if i else ""}">{bulat(n, T_ORG, ORG, 40, 22)}
      <div><div style="font-size:{27 if i != 1 else 22}px;font-weight:700;color:{ORG};line-height:1.05;white-space:nowrap">{v}</div><div style="font-size:12.5px;color:{ABU}">{l}</div></div></div>''' for i, (n, v, l) in enumerate(st))
    return f'''<div class="panel" style="flex:1;padding:16px 20px">
  <div style="display:flex;align-items:center;gap:12px">{bulat('pesawat', NAVY, '#fff', 42, 24)}<div style="flex:1;min-width:0">
    <div style="font-size:17px;font-weight:700;color:{NAVY};white-space:nowrap">{a["pes"]} <span style="color:{ABU};font-weight:500">{a["reg"]}</span></div>
    <div style="font-size:13px;color:{TEKS}">{a["op"]}</div></div></div>
  <div style="display:flex;gap:8px;margin:12px 0 14px;flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:6px;background:{T_NAVY};border-radius:14px;padding:4px 11px;font-size:12.5px;font-weight:700;color:{NAVY}">{ik('pin', NAVY, 14)}{a["base"]}</span>
    <span style="display:flex;align-items:center;gap:6px;background:{T_NAVY};border-radius:14px;padding:4px 11px;font-size:12.5px;font-weight:700;color:{NAVY}">{ik('kalender', NAVY, 14)}{a["per"]}</span></div>
  <div style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:{ABU};margin-bottom:8px">KUMULATIF SELAMA OPERASI</div>
  <div style="display:flex">{sel}</div></div>'''

kol = ['ARMADA', 'SORTI', 'WILAYAH SEMAI', 'KETINGGIAN (KAKI)', 'NaCl (KG)']   # 25 Nov atasan: kolom jam engine "Hilangkan"
lb = ['25%', '12%', '33%', '16%', '14%']
th = ''.join(f'<th style="width:{w};font-size:11.5px;letter-spacing:.8px;padding:8px 6px;font-weight:700">{k}</th>' for k, w in zip(kol, lb))
tr = ''
for i, (arm, so, jam, cat, wil, tg, kg) in enumerate(SORTI):
    sel_arm = '' if i and SORTI[i - 1][0] == arm else f'<td rowspan="{sum(1 for x in SORTI if x[0] == arm)}" style="font-weight:700;color:{NAVY};padding-left:12px;border-bottom:1px solid #E5E7EB">{arm}</td>'
    no = {'Perairan timur Aceh': 1, 'Perairan barat Aceh': 2, 'Perairan barat Aceh Selatan': 3}[wil]
    tr += f'''<tr style="height:62px">{sel_arm}<td style="text-align:center">{so}</td>
      <td><span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:{ORG};color:#fff;font-size:11.5px;font-weight:700;align-items:center;justify-content:center;margin-right:8px">{no}</span>{wil}</td>
      <td style="text-align:center">{tg}</td><td style="text-align:center;font-weight:700">{kg}</td></tr>'''
tr += f'<tr style="height:48px;background:{T_ORG};color:{ORG};font-weight:700"><td style="padding-left:12px;border-radius:8px 0 0 8px">Jumlah 24 November</td><td style="text-align:center">3 sorti</td><td></td><td></td><td style="text-align:center;border-radius:0 8px 8px 0">2.600</td></tr>'
tabel = f'''<div class="panel" style="padding:14px 18px 12px;flex:1">
 <div class="kp" style="margin-bottom:10px">PENERBANGAN 24 NOVEMBER 2026</div>
 <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:14.5px;color:{TEKS}">
 <tr style="background:{NAVY};color:#fff">{th.replace('<th style="width:25%', '<th style="border-radius:6px 0 0 6px;width:25%').replace('<th style="width:14%', '<th style="border-radius:0 6px 6px 0;width:14%')}</tr>
 {tr.replace('<td style="text-align:center">', '<td style="text-align:center;border-bottom:1px solid #E5E7EB">', 0)}</table></div>'''
info = [('hujan', 'Radar cuaca 24 November', 'Hujan ringan hingga lebat masih terjadi di sejumlah wilayah Aceh; semai diarahkan untuk mengurangi curah hujan.')]
info_h = ''.join(f'''<div style="display:flex;gap:10px;align-items:flex-start;{"border-top:1px solid #E5E7EB;padding-top:7px;margin-top:7px" if i else ""}">{bulat(n, T_NAVY, NAVY, 32, 18)}
  <div><div style="font-size:13.5px;font-weight:700;color:{NAVY}">{t}</div><div style="font-size:12.5px;color:{TEKS};line-height:1.35;text-align:{"left" if "<br>" in d else "justify"}">{d}</div></div></div>''' for i, (n, t, d) in enumerate(info))
leg = f'''<div style="display:flex;gap:18px;font-size:12px;color:{TEKS};margin-top:8px;align-items:center">
  <span style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;background:{NAVY};transform:rotate(45deg);border-radius:3px;display:flex;align-items:center;justify-content:center"><span style="transform:rotate(-45deg);display:flex">{ik('pesawat', '#fff', 10)}</span></span>posko OMC</span>
  <span style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;border-radius:50%;background:{ORG};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">1</span>wilayah semai 24 Nov (perkiraan dari nama perairan)</span></div>'''
import datetime as _dt
HJ = json.load(open('D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/harian/2026-11/2026-11-25/kerja-251126/omc_imerg.json', encoding='utf-8'))['model']   # 25 Nov: hujan satelit IMERG (pengganti model ECMWF)
def jendela(m):
    on, off = _dt.datetime.fromisoformat(m['on']), _dt.datetime.fromisoformat(m['off'])
    ta, tb = on.replace(minute=0), off.replace(minute=0) + _dt.timedelta(hours=1)   # jam berlabel j = hujan (j-1, j]
    slot = [ta - _dt.timedelta(hours=2) + _dt.timedelta(hours=k) for k in range(int((tb - ta).total_seconds() // 3600) + 9)]
    nilai = {_dt.datetime.fromisoformat(j): v for j, v in m['seri']}
    w = {'sebelum': [t for t in slot if t <= ta], 'selama': [t for t in slot if ta < t < tb], 'sesudah': [t for t in slot if t >= tb]}
    rata = {k: (sum(nilai[t] for t in ts if t in nilai) / sum(1 for t in ts if t in nilai)) if any(t in nilai for t in ts) else None for k, ts in w.items()}
    lengkap = {k: all(t in nilai for t in ts) for k, ts in w.items()}
    return slot, nilai, w, rata, lengkap
def grafik(m, W=268, H=54):
    slot, nilai, w, rata, lengkap = jendela(m)
    n = len(slot); bw = W / n; mx = max(4, max(nilai.values() or [0]))
    i0 = slot.index(w['selama'][0]); i1 = slot.index(w['selama'][-1]) + 1
    o = f'<rect x="{i0 * bw:.1f}" y="0" width="{(i1 - i0) * bw:.1f}" height="{H}" fill="{T_ORG}"/>'
    o += f'<text x="{(i0 + i1) / 2 * bw:.1f}" y="11" font-size="10" font-weight="700" fill="{ORG}" text-anchor="middle">semai</text>'
    hilang = [i for i, t in enumerate(slot) if t not in nilai]
    if hilang:
        h0 = hilang[0]; o += f'<rect x="{h0 * bw:.1f}" y="14" width="{(n - h0) * bw:.1f}" height="{H - 14}" fill="#F1F2F4"/>'
        o += f'<text x="{(h0 + n) / 2 * bw:.1f}" y="{H - 8}" font-size="9.5" font-style="italic" fill="{ABU}" text-anchor="middle">belum terbit</text>'
    for i, t in enumerate(slot):
        if t in nilai:
            h = nilai[t] / mx * (H - 18); o += f'<rect x="{i * bw + 2:.1f}" y="{H - h:.1f}" width="{bw - 4:.1f}" height="{max(h, .8):.1f}" rx="1.5" fill="#2F86D1"/>'
    o += f'<line x1="0" y1="{H}" x2="{W}" y2="{H}" stroke="#9AA3AE" stroke-width="1"/>'
    for i, t in enumerate(slot):
        if (t.hour - 1) % 3 == 0: o += f'<text x="{i * bw + bw / 2:.1f}" y="{H + 12}" font-size="9.5" fill="{ABU}" text-anchor="middle">{(t - _dt.timedelta(hours=1)).hour:02d}</text>'
    return f'<svg width="{W}" height="{H + 14}" style="display:block;overflow:visible">{o}</svg>', rata, lengkap
def f1(v): return f'{v:.1f}'.replace('.', ',')
HJ_ALL = json.load(open('D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/harian/2026-11/2026-11-25/kerja-251126/omc_imerg.json', encoding='utf-8'))
VAR = os.environ.get('VARIAN', 'A')
CARA = 'OMC menabur garam ke awan di atas laut supaya hujan jatuh di laut lebih dulu, sebelum awan sampai ke daratan.'
def rata_jendela(seri, m):
    on, off = _dt.datetime.fromisoformat(m['on']), _dt.datetime.fromisoformat(m['off'])
    ta, tb = on.replace(minute=0), off.replace(minute=0) + _dt.timedelta(hours=1)
    nilai = {_dt.datetime.fromisoformat(j): v for j, v in seri}
    w = {'sebelum': [ta - _dt.timedelta(hours=k) for k in range(3)], 'saat': [t for t in nilai if ta < t < tb] or [ta + _dt.timedelta(hours=1)],
         'sesudah': [tb + _dt.timedelta(hours=k) for k in range(6)]}
    w['saat'] = [ta + _dt.timedelta(hours=k + 1) for k in range(int((tb - ta).total_seconds() // 3600) - 1)]
    return {k: ((sum(nilai[t] for t in ts if t in nilai) / sum(1 for t in ts if t in nilai)) if any(t in nilai for t in ts) else None, all(t in nilai for t in ts)) for k, ts in w.items()}
def sel_angka(r, k, warna):
    v, lengkap = r[k]
    if v is None: return f'<div style="width:62px;text-align:center;font-size:10px;font-style:italic;color:{ABU};white-space:nowrap">belum terbit</div>'
    return f'<div style="width:62px;text-align:center;font-size:14px;font-weight:700;color:{warna}">{f1(v)}{"*" if not lengkap else ""}</div>'
def panel_A():
    kepala = f'''<div style="display:flex;align-items:center;margin:4px 0 2px"><div style="flex:1"></div>{''.join(f'<div style="width:62px;text-align:center;font-size:10.5px;color:{ABU};font-weight:700">{t}</div>' for t in ('sebelum', 'saat semai', 'sesudah'))}</div>'''
    baris = ''
    for m in HJ:
        rl, rd = rata_jendela(m['seri'], m), rata_jendela(m['seri_darat'], m)
        baris += f'''<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #E5E7EB">
  <span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:{ORG};color:#fff;font-size:11.5px;font-weight:700;align-items:center;justify-content:center;flex:none">{m["no"]}</span>
  <div style="flex:1;min-width:0">
   <div style="display:flex;align-items:center"><div style="flex:1;font-size:12px;color:{TEKS}">Laut: <b style="color:{NAVY}">{m["wilayah"]}</b></div>{''.join(sel_angka(rl, k, NAVY) for k in ('sebelum', 'saat', 'sesudah'))}</div>
   <div style="display:flex;align-items:center;margin-top:2px"><div style="flex:1;font-size:12px;color:{TEKS}">Darat banjir: <b style="color:{NAVY}">{m["darat"]}</b></div>{''.join(sel_angka(rd, k, '#2F86D1') for k in ('sebelum', 'saat', 'sesudah'))}</div>
  </div></div>'''
    return f'''<div style="border-top:1px solid #D1D5DB;margin:8px 0 6px"></div>
 <div class="kp">HUJAN SEBELUM, SAAT, DAN SESUDAH SEMAI (MM/JAM)</div>
 <div style="font-size:11.5px;color:{TEKS};line-height:1.35;margin:4px 0 2px">{CARA} Jadi hujan di laut boleh naik; yang diharapkan turun adalah hujan di darat.</div>
 {kepala}{baris}
 <div style="font-size:10px;color:{ABU};font-style:italic;margin-top:4px">Satelit NASA GPM IMERG, rata-rata 3 jam sebelum dan 6 jam sesudah; * sebagian jam belum terbit.<br>Perubahan hujan belum bisa dipastikan sebagai efek OMC.</div>'''
# 25 Nov pemilik ("info genangannya standarisasi"): satu pola, tinggi air dari Kondisi Mutakhir WA Koordalops 24-25 Nov
STATUS = {'Kota Subulussalam': 'Belum surut, 10–40 cm', 'Aceh Singkil': 'Belum surut, 5–40 cm',
          'Gayo Lues': 'Belum surut', 'Aceh Barat Daya': 'Belum surut'}   # tinggi genangan hanya bila disebut WA
def kesimpulan(kab):
    """Dihitung dari seri IMERG yang sama (jam berlabel j = hujan (j-1, j] WIB)."""
    J = lambda s_, d, h: dict((j, v) for j, v in s_).get(f'2026-11-{d}T{h:02d}:00')
    pagi = max(v for s_ in kab.values() for h in (8, 9, 10, 11) for v in [J(s_, 24, h)] if v is not None)
    k_m, j_m, v_m = max(((k, j, v) for k, s_ in kab.items() for j, v in s_), key=lambda t: t[2])
    jm = _dt.datetime.fromisoformat(j_m) - _dt.timedelta(hours=1)
    sblm = max(v for s_ in kab.values() for h in (22, 23) for v in [J(s_, 24, h)] if v is not None)
    saat = [v for s_ in kab.values() for d, h in ((25, 0), (25, 1)) for v in [J(s_, d, h)] if v is not None]
    # 25 Nov pemilik: "kesimpulan persingkat lagi"
    t = [f'Semai pagi: hampir tidak hujan.' if pagi < 1 else f'Semai pagi: hujan ringan.',
         f'Sore: hujan sedang, tertinggi {f1(v_m)} mm/jam di {k_m}.' if v_m >= 5 else f'Sore: hujan ringan.']
    if saat: t.append(f'Semai malam: hujan mereda ke di bawah {f1(next(b for b in (0.5, 1, 2, 5, 10) if max(saat) < b))} mm/jam.' if max(saat) < sblm else 'Semai malam: hujan tidak mereda.')
    return f'''<div style="margin-top:6px;background:{T_NAVY};border-radius:8px;padding:7px 10px;font-size:11.5px;line-height:1.4;color:{NAVY}"><b>Kesimpulan:</b> {' '.join(t)}</div>'''
def panel_B():
    kab = HJ_ALL['kab']; W, H = 268, 30
    slot = [_dt.datetime(2026, 11, 24, 1) + _dt.timedelta(hours=k) for k in range(26)]
    mx = max(v for s_ in kab.values() for _, v in s_); bw = W / len(slot)
    pita = [(_dt.datetime(2026, 11, 24, 7, 9), _dt.datetime(2026, 11, 24, 10, 14), 'semai pagi'), (_dt.datetime(2026, 11, 24, 22, 32), _dt.datetime(2026, 11, 25, 1, 10), 'semai malam')]
    xp = lambda t: (t - slot[0] + _dt.timedelta(hours=1)).total_seconds() / 3600 * bw
    baris = ''
    for n, (k, s_) in enumerate(kab.items()):
        nil = {_dt.datetime.fromisoformat(j): v for j, v in s_}
        o = f'<defs><pattern id="arsir{n}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#F3F4F6"/><line x1="0" y1="0" x2="0" y2="4" stroke="#6B7280" stroke-width="1.4"/></pattern></defs>'
        o += ''.join(f'<rect x="{xp(a):.1f}" y="0" width="{xp(b) - xp(a):.1f}" height="{H}" fill="{T_ORG}"/>' for a, b, _ in pita)
        if n == 0: o += ''.join(f'<text x="{(xp(a) + xp(b)) / 2:.1f}" y="-3" font-size="9.5" font-weight="700" fill="{ORG}" text-anchor="middle">{t}</text>' for a, b, t in pita)
        for i, t in enumerate(slot):
            if t in nil:
                v_ = nil[t]; h = v_ / mx * (H - 2); wr = '#A9CBEA' if v_ < 1 else '#2F86D1' if v_ < 5 else ORG
                o += f'<rect x="{i * bw + 1.2:.1f}" y="{H - h:.1f}" width="{bw - 2.4:.1f}" height="{max(h, .7):.1f}" rx="1" fill="{wr}"/>'
                if v_ >= 5: o += f'<text x="{i * bw + bw / 2:.1f}" y="{H - h - 2:.1f}" font-size="9" font-weight="700" fill="{ORG}" text-anchor="middle">{f1(v_)}</text>'
            else: o += f'<rect x="{i * bw + 1.2:.1f}" y="{H - 4}" width="{bw - 2.4:.1f}" height="4" fill="#FFFFFF" stroke="#6B7280" stroke-width=".7" stroke-dasharray="1.5 1"/>'
        o += f'<line x1="0" y1="{H}" x2="{W}" y2="{H}" stroke="#9AA3AE" stroke-width="1"/>'
        if n == len(kab) - 1:
            o += ''.join(f'<text x="{i * bw + bw / 2:.1f}" y="{H + 11}" font-size="9" fill="{ABU}" text-anchor="middle">{(t - _dt.timedelta(hours=1)).hour:02d}</text>' for i, t in enumerate(slot) if (t.hour - 1) % 3 == 0)
        mk = max(nil.values()); jm = max(nil, key=nil.get)
        baris += f'''<div style="display:flex;align-items:flex-end;gap:10px;padding:{13 if n == 0 else 4}px 0 {13 if n == len(kab) - 1 else 3}px;{"border-top:1px solid #E5E7EB" if n else ""}">
  <div style="width:150px;flex:none"><div style="font-size:12.5px;font-weight:700;color:{NAVY}">{k}</div><div style="font-size:10.5px;color:{TEKS}">{STATUS[k]}</div></div>
  <svg width="{W}" height="{H}" style="display:block;overflow:visible;flex:none">{o}</svg>
  <div style="width:52px;text-align:right;flex:none"><div style="font-size:13px;font-weight:700;color:{ORG if mk >= 5 else '#2F86D1'}">{f1(mk)}</div><div style="font-size:9.5px;color:{ORG if mk >= 5 else ABU};font-weight:{700 if mk >= 5 else 400}">{'sedang' if mk >= 5 else 'ringan' if mk >= 1 else 'hampir tidak'}</div><div style="font-size:9px;color:{ABU}">{(jm - _dt.timedelta(hours=1)).hour:02d}.00</div></div></div>'''
    return f'''<div style="border-top:1px solid #D1D5DB;margin:8px 0 6px"></div>
 <div class="kp">HUJAN DI KABUPATEN BANJIR, 24 NOVEMBER (MM/JAM)</div>
 <div style="font-size:11.5px;color:{TEKS};line-height:1.35;margin:4px 0 2px">{CARA}</div>
 {baris}
 <div style="font-size:10px;color:{TEKS};margin-top:4px;text-align:center;white-space:nowrap">{''.join(f'<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px"><span style="width:10px;height:10px;border-radius:2px;background:{c}"></span>{t}</span>' for c, t in (('#A9CBEA', 'hampir tidak hujan (< 1 mm/jam)'), ('#2F86D1', 'ringan (1–5 mm/jam)'), (ORG, 'sedang ke atas (≥ 5 mm/jam)')))}</div>
 <div style="background:#F1F2F4;border-radius:8px;padding:7px 10px;margin-top:8px;font-size:10.5px;line-height:1.45;color:{TEKS}"><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="display:inline-flex;width:14px;height:14px;border-radius:50%;border:1.3px solid {NAVY};color:{NAVY};font-size:9.5px;font-weight:700;font-style:italic;font-family:Georgia,serif;align-items:center;justify-content:center">i</span><span style="font-size:10.5px;font-weight:700;letter-spacing:1px;color:{NAVY}">KETERANGAN</span></div><div style="display:flex;gap:6px"><span style="width:58px;flex:none;font-weight:700;color:{NAVY}">Hujan</span><span>satelit NASA GPM IMERG, per jam WIB; kotak putus-putus = data belum terbit</span></div><div style="display:flex;gap:6px"><span style="width:58px;flex:none;font-weight:700;color:{NAVY}">Kondisi</span><span>Laporan Harian Koordalops, 24 Nov 07.00 sampai 25 Nov 07.00 WIB</span></div></div>'''
# versi C (pemilik 25 Nov: "tanpa chart rumit, biar orang awam beban kognitifnya rendah"): kata kategori hujan per jam BMKG, bukan grafik
# versi C (pemilik 25 Nov: "tanpa chart rumit, biar orang awam beban kognitifnya rendah"; "bagusin lagi"): kategori hujan per jam BMKG
# (sangat ringan < 1, ringan 1-5, sedang 5-10, lebat 10-20, sangat lebat > 20 mm/jam), pil berikon awan, kolom semai berpita oranye muda
KATEGORI = [(1, 'Sangat ringan', '#F1F2F4', '#4B5563', 0), (5, 'Ringan', '#DCEBF8', '#1F5F99', 1), (10, 'Sedang', ORG, '#FFFFFF', 3),
            (20, 'Lebat', '#C8102E', '#FFFFFF', 3), (1e9, 'Sangat lebat', '#051C2C', '#FFFFFF', 3)]
def kat(v):
    return next(k for k in KATEGORI if v < k[0])
def awan(tetes, c, s=15):
    t = {0: '', 1: '<path d="M12 17v3"/>', 3: '<path d="M8 17v3"/><path d="M12 18v3"/><path d="M16 17v3"/>'}[tetes]
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none">'
            f'<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/>{t}</svg>')
def panel_C():
    kab = HJ_ALL['kab']
    W = [('Sebelum semai', '04.00–07.00', (5, 6, 7)), ('Semai pagi', '07.00–10.00', (8, 9, 10)),
         ('Siang–malam', '10.00–22.00', tuple(range(11, 23))), ('Semai malam', '22.30–01.00', (23, 24, 25))]
    def nilai(s_, jam):
        d = dict(s_); v = [d.get((_dt.datetime(2026, 11, 24) + _dt.timedelta(hours=h)).strftime('%Y-%m-%dT%H:%M')) for h in jam]
        v = [x for x in v if x is not None]; return max(v) if v else None
    pita = lambda t: T_ORG if t.startswith('Semai') else 'transparent'
    th = ''.join(f'<th style="background:{pita(t)};border-radius:8px 8px 0 0;padding:6px 4px 5px;font-weight:400;line-height:1.25">'
                 f'<div style="font-size:11px;font-weight:700;color:{ORG if t.startswith("Semai") else NAVY};white-space:nowrap">{t}</div><div style="font-size:10px;color:{ABU}">{w}</div></th>' for t, w, _ in W)
    tr = ''
    for n, (k, s_) in enumerate(kab.items()):
        akhir = n == len(kab) - 1; td = ''
        for t, w, jam in W:
            v = nilai(s_, jam)
            if v is None:
                isi = f'<div style="height:26px;border-radius:13px;border:1px dashed #9AA3AE;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-style:italic;color:{ABU}">belum terbit</div>'
            else:
                _, nm, bg, fg, tt = kat(v)
                isi = (f'<div style="height:26px;border-radius:13px;background:{bg};color:{fg};display:flex;align-items:center;justify-content:center;gap:3px;font-size:10.5px;font-weight:700;white-space:nowrap;letter-spacing:-.1px">'
                       f'{awan(tt, fg, 13) if tt else ""}{nm}</div>')   # 25 Nov pemilik: "sangat ringan terlalu sesak" -> tanpa ikon
            td += f'<td style="background:{pita(t)};padding:6px 4px;{"border-radius:0 0 8px 8px;" if akhir else ""}">{isi}</td>'
        tr += (f'<tr><td style="padding:6px 0;{"" if akhir else "border-bottom:1px solid #E5E7EB;"}"><div style="font-size:12.5px;font-weight:700;color:{NAVY}">{k}</div>'
               f'<div style="font-size:10.5px;color:{TEKS};white-space:nowrap">{STATUS[k]}</div></td>{td}</tr>')
    leg = ''.join(f'<span style="display:inline-flex;align-items:center;gap:5px;margin:0 7px"><span style="display:inline-flex;align-items:center;gap:3px;height:16px;padding:0 6px;border-radius:8px;background:{bg};color:{fg};font-size:9.5px;font-weight:700">{awan(tt, fg, 11) if tt else ""}{nm}</span>{a}</span>'
                  for (b_, nm, bg, fg, tt), a in zip(KATEGORI[:3], ('< 1 mm/jam', '1–5 mm/jam', '5–10 mm/jam')))
    return f'''<div style="border-top:1px solid #D1D5DB;margin:8px 0 6px"></div>
 <div class="kp">HUJAN DI KABUPATEN BANJIR, 24 NOVEMBER</div>
 <div style="font-size:11.5px;color:{TEKS};line-height:1.35;margin:4px 0 6px">{CARA}</div>
 <table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:136px"><col><col><col><col></colgroup>
 <tr><th></th>{th}</tr>{tr}</table>
 <div style="font-size:10px;color:{TEKS};margin-top:7px;white-space:nowrap;text-align:center">{leg}</div>
 <div style="background:#F1F2F4;border-radius:8px;padding:7px 10px;margin-top:8px;font-size:10.5px;line-height:1.45;color:{TEKS}"><div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="display:inline-flex;width:14px;height:14px;border-radius:50%;border:1.3px solid {NAVY};color:{NAVY};font-size:9.5px;font-weight:700;font-style:italic;font-family:Georgia,serif;align-items:center;justify-content:center">i</span><span style="font-size:10.5px;font-weight:700;letter-spacing:1px;color:{NAVY}">KETERANGAN</span></div><div style="display:flex;gap:6px"><span style="width:58px;flex:none;font-weight:700;color:{NAVY}">Hujan</span><span>satelit NASA GPM IMERG; nilai tertinggi per jam dalam tiap waktu</span></div><div style="display:flex;gap:6px"><span style="width:58px;flex:none;font-weight:700;color:{NAVY}">Kondisi</span><span>Laporan Harian Koordalops, 24 Nov 07.00 sampai 25 Nov 07.00 WIB</span></div></div>'''
def hujan_kanan():
    if VAR == 'C': return panel_C()
    return panel_A() if VAR == 'A' else panel_B()
def hujan_kanan_lama():
    bar = ''
    for m in HJ:
        sv, rata, lengkap = grafik(m, W=186, H=44)
        nil = lambda k: (f'<div style="font-size:14px;font-weight:700;line-height:1.1;color:{ORG if k == "selama" else NAVY}">{f1(rata[k])}{"*" if not lengkap[k] else ""}</div>' if rata[k] is not None
                         else f'<div style="font-size:9.5px;font-style:italic;line-height:1.7;color:{ABU};white-space:nowrap">belum terbit</div>')
        angka = ''.join(f'<div style="width:56px;text-align:center">{nil(k)}<div style="font-size:10px;color:{ABU}">{k}</div></div>' for k in ('sebelum', 'selama', 'sesudah'))
        bar += f'''<div style="display:flex;align-items:center;gap:10px;padding:5px 0;{"border-top:1px solid #E5E7EB" if m["no"] > 1 else ""}">
  <span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:{ORG};color:#fff;font-size:11.5px;font-weight:700;align-items:center;justify-content:center;flex:none">{m["no"]}</span>
  <div style="width:92px;font-size:12px;font-weight:700;color:{NAVY};line-height:1.2;flex:none">{m["wilayah"].replace("Perairan ", "Perairan<br>")}</div>{sv}<div style="display:flex;flex:none">{angka}</div></div>'''
    return f'''<div style="border-top:1px solid #D1D5DB;margin:8px 0 6px"></div>
 <div class="kp">HUJAN DI WILAYAH SEMAI (MM/JAM)</div>
 <div style="font-size:10.5px;color:{ABU};font-style:italic;margin:2px 0 3px">Satelit NASA GPM IMERG, rata-rata wilayah semai, 3 jam sebelum sampai 6 jam sesudah<br>* sebagian jam belum terbit; perubahan hujan belum bisa dipastikan sebagai efek OMC</div>{bar}'''
kanan = f'''<div class="panel" style="width:520px;padding:14px 18px;display:flex;flex-direction:column">
 <div class="kp">POSKO DAN WILAYAH SEMAI</div>
 <div style="display:flex;gap:8px;margin:9px 0 9px">
  <div style="flex:1;background:{T_NAVY};border-radius:8px;padding:7px 8px 7px 7px;display:flex;align-items:center;gap:6px"><div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex:none"><div style="width:19px;height:19px;background:{NAVY};border-radius:4px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(-45deg);display:flex">{ik('pesawat', '#fff', 13)}</div></div></div><div style="flex:1;line-height:1.3"><div style="font-size:12.5px;font-weight:700;color:{NAVY};line-height:1.25">Bandara Sultan Iskandar Muda</div><div style="font-size:11.5px;line-height:1.3;margin-top:2px;white-space:nowrap;letter-spacing:-.1px">Kabupaten Aceh Besar, Aceh</div></div></div>
  <div style="flex:1;background:{T_NAVY};border-radius:8px;padding:7px 8px 7px 7px;display:flex;align-items:center;gap:6px"><div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex:none"><div style="width:19px;height:19px;background:{NAVY};border-radius:4px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center"><div style="transform:rotate(-45deg);display:flex">{ik('pesawat', '#fff', 13)}</div></div></div><div style="flex:1;line-height:1.3"><div style="font-size:12.5px;font-weight:700;color:{NAVY};line-height:1.25">Lanud Soewondo</div><div style="font-size:11.5px;line-height:1.3;margin-top:2px;white-space:nowrap;letter-spacing:-.1px">Kota Medan, Sumatera Utara</div></div></div></div>
 {peta(482, 128 if VAR == 'C' else 146)}{leg}{hujan_kanan()}
 </div>'''
ISI2 = f'''<div style="display:flex;gap:16px;height:100%"><div style="flex:1;display:flex;flex-direction:column;gap:12px;min-width:0">
  <div style="display:flex;justify-content:space-between;align-items:center"><div class="kp">ARMADA, KUMULATIF SELAMA OPERASI</div></div>{kartu2(ARMADA[0])}{kartu2(ARMADA[1])}{tabel}</div>{kanan}</div>'''
s2 = bingkai(3, JUDUL, ISI2, SUMBER)
# isi saja untuk deck: zona isi mesin deck 11.094.415 x 4.572.000 EMU (rasio 2,4266) = 1456 x 640 px, sama dengan pratinjau (zona isi 1.280.160 sampai 6.156.960 EMU)
konten = bingkai(3, JUDUL, ISI2, SUMBER).split('<body>')[0] + f'<body style="width:1456px;height:640px"><div style="position:absolute;left:0;top:0;width:1456px;height:640px">{ISI2}</div></body></html>'
for n, h in (('slide1', s1), ('slide2', s2), ('konten', konten)): open(f'{D}/{n}.html', 'w', encoding='utf-8').write(h)
print('ok')
