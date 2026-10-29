"""data.json + teks.py -> dossier.html: 2 halaman ringkasan potret + 3 halaman lanskap per lokasi (5 selang pendek, 5 selang panjang)."""
import json, math, os, re
from datetime import datetime, timedelta, timezone
from html import escape as e
from analisis import proyeksi, arah, OUT
from kumpul import km, GENERIK, HERE
from teks import TEKS, UMUM, KIT, UJI, DALAM_PANJANG, teks_panjang
import teks_renlap
from lampiran import halaman_lampiran, ALAT

WIB = timezone(timedelta(hours=7))
CSS_RENLAP = ".pk{position:absolute;left:9mm;right:9mm;bottom:2.2mm;font-size:5.6pt;color:#64748b;line-height:1.2}"
D = json.load(open(f"{OUT}/data.json"))
R = D["ringkas"]
BLN = {"Jan": "Jan", "Feb": "Feb", "Mar": "Mar", "Apr": "Apr", "May": "Mei", "Jun": "Jun", "Jul": "Jul", "Aug": "Agu", "Sep": "Sep",
       "Oct": "Okt", "Nov": "Nov", "Dec": "Des"}


def ang(x, n=0):
    if x is None:
        return "–"
    return f"{x:,.{n}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def wib(iso, f="%d %b %H.%M"):
    if not iso:
        return "–"
    s = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(WIB).strftime(f)
    for a, b in BLN.items():
        s = s.replace(a, b)
    return s + " WIB"


def tgl_id(d):
    t = datetime.fromisoformat(d)
    return f"{t.day} {BLN[t.strftime('%b')]} {t.year}"


def koor(p):
    return f'<a href="https://www.google.com/maps?q={p[0]:.5f},{p[1]:.5f}">{p[0]:.4f}, {p[1]:.4f}</a>'


PERAN = {"K9321": "UJI JALAN KAKI JAUH"}
SENSOR = {"N": "S-NPP", "N20": "NOAA-20", "N21": "NOAA-21", "M": "MODIS"}
ACUAN = wib(R["acuan"], "%d %b %Y, %H.%M")
HARI = R.get("hari_fwi", "2026-10-26")                  # tanggal baris FWI yang dipakai kartu cuaca
DARI = len(D["situs"])
teks_renlap.HARI_FWI[0] = HARI
GN2 = "gambut indikatif PIPPIB" if teks_renlap.MOR else "peta gambut resmi"
GN = teks_renlap.G_NAMA if GENERIK else "peta gambut resmi"
if GENERIK:
    UMUM = teks_renlap.umum(D)                           # teks umum renlap: tanpa jadwal dan nama lokasi pilot Kalteng
    # RENLAP_EKSTRA = berkas JSON {judul, uji:{id:teks}, putus:[...], gagasan, cek_gambut}: penimpa tulisan tangan per dossier (mis. pilot provinsi lain)
    EKSTRA = json.load(open(os.environ["RENLAP_EKSTRA"])) if os.environ.get("RENLAP_EKSTRA") else {}
    for _k in ("putus", "gagasan", "cek_gambut", "panjang"):
        if _k in EKSTRA:
            UMUM[_k] = EKSTRA[_k]
    if "judul" in EKSTRA:
        R["judul"] = EKSTRA["judul"]
else:
    EKSTRA = {}


def target(s):
    return s["titik"]["target"] if s["target"] else s["titik"]["kompleks"]


# ---------------- gambar peta ----------------
def path(m, ln):
    return "M" + " L".join(f"{x},{y}" for x, y in (proyeksi(m, la, lo) for la, lo in ln))


def tautan(p, isi):
    """bungkus elemen SVG dengan tautan Google Maps ke koordinat p (lat, lon); ikut jadi tautan di PDF"""
    return f'<a href="https://www.google.com/maps?q={p[0]:.5f},{p[1]:.5f}" target="_blank">{isi}</a>'


def penanda(x, y, warna, label, bentuk="o", r=11):
    if bentuk == "o":
        f = f'<circle cx="{x}" cy="{y}" r="{r}" fill="{warna}" stroke="#fff" stroke-width="2.5"/>'
    else:
        f = f'<rect x="{x-r}" y="{y-r}" width="{2*r}" height="{2*r}" rx="3" fill="{warna}" stroke="#fff" stroke-width="2.5"/>'
    return f + f'<text x="{x}" y="{y + r*0.38:.1f}" class="nomor" style="font-size:{r*1.05:.0f}px">{label}</text>'


def label(x, y, t, dx=14, dy=-12, anchor="start", kls="lbl"):
    return f'<text x="{x+dx}" y="{y+dy}" class="{kls}" text-anchor="{anchor}">{e(t)}</text>'


def kompas(x, y, r):
    return (f'<g transform="translate({x},{y})"><circle r="{r}" fill="#fff" opacity=".92"/><path d="M0,{-r*.75} L{r*.35},{r*.35} L0,{r*.12} L{-r*.35},{r*.35} Z" fill="#111"/>'
            f'<text y="{-r-4}" class="utara" text-anchor="middle">U</text></g>')


def skala(m, x, y, meter=None):
    if meter is None or meter / m["m_per_px"] < 55:   # pilih panjang yang terbaca: ± 15% lebar peta
        meter = min([20, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000], key=lambda v: abs(v / m["m_per_px"] - 0.15 * m["w"]))
    spx = meter / m["m_per_px"]
    t = f"{meter // 1000} km" if meter >= 1000 else f"{meter} m"
    return (f'<g transform="translate({x},{y})"><rect x="-8" y="-22" width="{spx+50}" height="36" rx="5" fill="#fff" opacity=".92"/>'
            f'<rect x="0" y="0" width="{spx/2}" height="6" fill="#111"/><rect x="{spx/2}" y="0" width="{spx/2}" height="6" fill="#fff" stroke="#111" stroke-width="1"/>'
            f'<text x="0" y="-6" class="skala">0</text><text x="{spx}" y="-6" class="skala" text-anchor="middle">{t}</text></g>')



def profil_svg(s, kunci="profil", a0="Pompa", a1="Petak"):
    p = [x for x in s[kunci] if x["z"] is not None]
    if len(p) < 2:
        return "<p class='ket'>Profil elevasi tidak tersedia.</p>"
    W, Hh, ml, mb = 360, 110, 30, 18
    L = p[-1]["x_m"] or 1
    zs = [x["z"] for x in p]; z0, z1 = min(zs) - 2, max(zs) + 3
    fx = lambda x: ml + (W - ml - 10) * x / L
    fy = lambda z: 8 + (Hh - mb - 8) * (1 - (z - z0) / (z1 - z0))
    d = "M" + " L".join(f"{fx(x['x_m']):.1f},{fy(x['z']):.1f}" for x in p)
    o = [f'<svg viewBox="0 0 {W} {Hh}" class="profil"><path d="{d} L{fx(L):.1f},{Hh-mb} L{fx(0):.1f},{Hh-mb} Z" fill="#fde7d4"/>'
         f'<path d="{d}" fill="none" stroke="#c2410c" stroke-width="2"/>']
    langkah = max(1, round((z1 - z0) / 4))
    for z in range(math.ceil(z0), math.floor(z1) + 1, langkah):
        o.append(f'<line x1="{ml}" x2="{W-10}" y1="{fy(z):.1f}" y2="{fy(z):.1f}" stroke="#e5e7eb"/><text x="{ml-4}" y="{fy(z)+3:.1f}" class="ax" text-anchor="end">{z}</text>')
    st = max(10, round(L / 4 / 10) * 10)
    for xm in range(0, int(L * 0.95) + 1, st):
        o.append(f'<text x="{fx(xm):.1f}" y="{Hh-5}" class="ax" text-anchor="middle">{xm}</text>')
    langkah = alur(s)
    if kunci == "profil_jalan":
        n0, w0 = next(x["no"] for x in langkah if x.get("titik") == s["titik"]["ujung"]), "#334155"
        a0 = "Turun perahu" if s["akses"]["ujung"] == "perahu" else "Parkir"
    else:
        n0, w0 = next(x["no"] for x in langkah if x["judul"].startswith("Pasang pompa")), "#0369a1"
    n1 = next(x["no"] for x in langkah if x["judul"].startswith("Sampai"))
    for x, z, n, warna, teks, anc, dx in ((fx(0), zs[0], n0, w0, a0, "start", 11), (fx(L), zs[-1], n1, "#ea580c", a1, "end", -11)):
        o.append(f'<circle cx="{x:.1f}" cy="{fy(z):.1f}" r="7.5" fill="{warna}" stroke="#fff" stroke-width="1.5"/>'
                 f'<text x="{x:.1f}" y="{fy(z)+3.2:.1f}" text-anchor="middle" style="fill:#fff;font-size:9px;font-weight:700">{n}</text>'
                 f'<text x="{x+dx:.1f}" y="{fy(z)-9:.1f}" class="ax b" text-anchor="{anc}">{teks}</text>')
    o.append(f'<text x="2" y="9" class="ax">m dpl</text></svg>')
    return "".join(o)


# ---------------- kartu ----------------
def baris(k, v):
    return f"<tr><td>{k}</td><td>{v}</td></tr>"




def uji(s):
    if s["id"] in EKSTRA.get("uji", {}):
        return EKSTRA["uji"][s["id"]]
    if s["id"] in UJI:
        return UJI[s["id"]]
    if GENERIK and not s.get("paksa"):
        return "Uji suntik air ke bara gambut, selang pendek" if s["target"] else "Latihan pasang dan bongkar alat, tanpa api"
    h = s["hid"]
    return f'Uji selang panjang ± {ang(h["L"])} m' + (f', {h["relay"]["n_ruas"] - 1} pompa tambahan' if h.get("relay") else "")


def bagian(s):
    if EKSTRA.get("satu_daftar"):     # satu daftar prioritas: tanpa Bagian A/B, hanya jenis selang
        return "SELANG PANJANG" if s.get("paksa") else "SELANG PENDEK"
    return "BAGIAN A, SELANG PENDEK" if not s.get("paksa") else "BAGIAN B, SELANG PANJANG"


def kepala(s, sub):
    return (f'<header class="kepala"><div class="pil{" pb" if s.get("paksa") else ""}">{s["no"]}</div><div class="kj1"><div class="sup">LOKASI {s["no"]} DARI {DARI}, {bagian(s)}, HALAMAN {sub}</div>'
            f'<h1>{e(s["nama"])}</h1></div><div class="tujuan"><span>Untuk</span>{e(uji(s))}</div>'
            f'<div class="kanan">BNPB SIPPA<br><span>Data per {ACUAN}</span></div></header>')


# ---------------- sumber air dan alur perjalanan ----------------
def air(s):
    """sumber air petak: dict jenis, nama, lat, lon, d_km, garis"""
    c = s["air_calon"][0]
    nama = {"danau_kolam": "danau atau kolam", "anak_sungai": "anak sungai"}.get(c["jenis"].split(" (")[0], c["jenis"].split(" (")[0])
    return {**c, "nama": nama[0].lower() + nama[1:] if not nama.startswith("Sungai ") else nama}


def isi(s, teks):
    h = s["hid"]
    v = {"L": ang(h["L"]), "gulung": h["gulung"], "kaki_km": ang(s["kaki_target"]["km"], 1), "kaki_mnt": s["kaki_target"]["menit"],
         "air_d": ang(air(s)["d_km"] * 1000), "air_nama": air(s)["nama"], "p_lance": ang(h["penuh"]["p_ujung_bar"], 0)}
    return teks.format(**v)


JALAN = {"utama": "jalan besar", "lokal": "jalan kampung", "track": "jalan tanah (licin bila hujan)",
         "markas": "jalan kebun yang belum ada di peta"}
DERMAGA = (-2.4126, 114.4366)


def alur(s):
    """langkah perjalanan bernomor; yang punya koordinat juga jadi penanda bernomor di peta rute"""
    a, T = s["akses"], s["titik"]
    L = [{"judul": "Berangkat", "ket": f'dari {e(a["dari"]["nama"])}', "titik": T["asal"], "warna": "#0f766e"}]
    if a["menit"]["jalan"]:
        rinci = ", ".join(f"{v} menit {JALAN.get(k, k)}" for k, v in a["jalan_kelas_menit"].items() if v)
        jarak = f'{ang(a["km"]["jalan"], 1)} km, ' if a["km"]["jalan"] else ""
        tuju = "ke dermaga" if a["menit"]["perahu"] else "ke ujung jalan"
        L.append({"judul": f'Naik mobil {a["menit"]["jalan"]} menit', "ket": f"{tuju}: {jarak}{rinci}."})
    if a["menit"]["perahu"]:
        L.append({"judul": "Naik perahu di dermaga", "ket": "pindahkan alat dari mobil ke perahu", "warna": "#334155",
                  **({"titik": DERMAGA} if s["id"] == "K7357" else {})})   # lokasi dermaga hanya diketahui untuk K7357
        L.append({"judul": f'Naik perahu {a["menit"]["perahu"]} menit', "ket": f'{ang(a["km"]["perahu"], 1)} km lewat sungai dan kanal.'})
    perahu = a["ujung"] == "perahu"
    L.append({"judul": "Turun perahu" if perahu else "Parkir di ujung jalan", "ket": "turunkan alat, bagi bawaan per orang",
              "titik": T["ujung"], "warna": "#334155"})
    arh, _ = arah(T["ujung"], target(s))
    w = air(s); pompa = (w["lat"], w["lon"]); selang_m = ang(s["hid"]["L"])
    jalan = f'± {ang(s["kaki_target"]["km"], 1)} km ke arah {arh}.'
    langkah_pompa = {"judul": "Pasang pompa di tepi air", "titik": pompa, "warna": "#0369a1"}
    petak = {"judul": "Sampai di petak uji" if s["target"] else "Sampai di petak latihan", "titik": target(s), "warna": "#ea580c"}
    if km(T["ujung"], pompa) < 0.5:     # pompa dekat parkir (selang panjang): pasang dulu, lalu gelar selang sambil jalan ke petak
        langkah_pompa["ket"] = f'{w["nama"]}, {ang(km(T["ujung"], pompa) * 1000)} m dari parkir'
        L.append(langkah_pompa)
        L.append({"judul": f'Jalan kaki {s["kaki_target"]["menit"]} menit sambil menggelar selang', "ket": f'{jalan} Selang ± {selang_m} m.'})
        petak["ket"] = "sambung selang ke Y-pembagi, pasang 4 petak"
        L.append(petak)
    else:                                 # pompa dekat petak (selang pendek): jalan ke tepi air, pasang pompa, gelar selang ke petak
        L.append({"judul": f'Jalan kaki {s["kaki_target"]["menit"]} menit', "ket": jalan})
        langkah_pompa["ket"] = f'{w["nama"]}, {ang(w["d_km"] * 1000)} m dari petak'
        L.append(langkah_pompa)
        petak["ket"] = f"gelar selang ± {selang_m} m dari pompa, pasang 4 petak"
        L.append(petak)
    for i, x in enumerate(L, 1):
        x["no"] = i
    return L


def menit_total(s):
    a = s["akses"]
    return a["menit"]["jalan"] + a["menit"]["perahu"] + s["kaki_target"]["menit"]


# ---------------- peta lapangan ----------------
ADA = {}


def garis_air(m, s, kls="airsumber"):
    w = air(s)
    if not w.get("garis") or len(w["garis"]) < 2:
        return ""
    d = path(m, [(y, x) for x, y in w["garis"]])
    return f'<path d="{d}" class="{kls}-tepi"/><path d="{d}" class="{kls}"/>'


def selang(a, tp, tebal=1.0):
    """satu jalur selang pompa -> petak, oranye bertepi gelap, panah arah air"""
    d = f"M{a[0]},{a[1]} L{tp[0]},{tp[1]}"
    return (f'<path d="{d}" class="selang-tepi" style="stroke-width:{9*tebal}"/><path d="{d}" class="selang" style="stroke-width:{5*tebal}" marker-mid="url(#panah)"/>'
            + "".join(f'<path d="M{a[0]+(tp[0]-a[0])*f},{a[1]+(tp[1]-a[1])*f} L{a[0]+(tp[0]-a[0])*(f+.001)},{a[1]+(tp[1]-a[1])*(f+.001)}" '
                      f'class="selang" style="stroke-width:{5*tebal}" marker-end="url(#panah)"/>' for f in (0.35, 0.7)))


PANAH = ('<defs><marker id="panah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">'
         '<path d="M0,0 L10,5 L0,10 Z" fill="#fff"/></marker></defs>')


def peta_detail(s):
    m = s["peta"]["detail"]; T = s["titik"]; W, Hh = m["w"], m["h"]
    tg = target(s); w = air(s); airt = (w["lat"], w["lon"])
    ada = ADA.setdefault(s["id"], {"petak", "air", "ujung", "selang", "kaki"})
    dalam = lambda p: 0 <= p[0] <= W and 0 <= p[1] <= Hh
    o = [f'<svg viewBox="0 0 {W} {Hh}" class="petasvg">{PANAH}<image href="{m["img"]}" x="0" y="0" width="{W}" height="{Hh}"/>']
    ga = garis_air(m, s)
    if ga:
        ada.add("sumberair"); o.append(ga)
    for c in s["kluster"]:
        g = c["geom"]
        if g["type"] not in ("Polygon", "MultiPolygon"):
            continue
        r = g["coordinates"][0] if g["type"] == "Polygon" else g["coordinates"][0][0]
        if any(dalam(proyeksi(m, y, x)) for x, y in r):
            ada.add("kluster")
            o.append(f'<path d="{path(m, [(y, x) for x, y in r])} Z" class="kluster"/>')
    for i in s["infra"]:
        p = proyeksi(m, i["lat"], i["lon"])
        if dalam(p) and i["d_target"] <= 1.5:
            ada.add("sbo")
            o.append(tautan((i["lat"], i["lon"]), f'<rect x="{p[0]-3}" y="{p[1]-3}" width="6" height="6" class="sbo"/>'))
    for t in sorted(s["titik48"], key=lambda t: t["jam"]):
        p = proyeksi(m, t["lat"], t["lon"])
        if dalam(p):
            k = "api24" if t["jam"] >= -24 else "api48"
            ada.add(k)
            o.append(tautan((t["lat"], t["lon"]), f'<circle cx="{p[0]}" cy="{p[1]}" r="6.5" class="{k}"/>'))
    u, tp, a = (proyeksi(m, *x) for x in (T["ujung"], tg, airt))
    o.append(f'<path d="M{u[0]},{u[1]} L{tp[0]},{tp[1]}" class="kaki-tepi"/><path d="M{u[0]},{u[1]} L{tp[0]},{tp[1]}" class="kaki"/>')
    o.append(selang(a, tp, 1.0))
    kiri = u[0] > tp[0]
    dekat = math.hypot(u[0] - tp[0], u[1] - tp[1]) < 220
    # penanda bernomor = nomor langkah di alur perjalanan
    L = alur(s)
    no = {x["judul"].split()[0]: x["no"] for x in L}
    n_parkir = next(x["no"] for x in L if x.get("titik") == T["ujung"])
    n_kaki = next(x["no"] for x in L if x["judul"].startswith("Jalan kaki"))
    n_petak = next(x["no"] for x in L if x["judul"].startswith("Sampai"))
    n_pompa = next(x["no"] for x in L if x["judul"].startswith("Pasang pompa"))
    for x in L[:n_parkir - 1]:                       # berangkat atau dermaga bila masuk bingkai
        if x.get("titik"):
            p = proyeksi(m, *x["titik"])
            if dalam(p):
                o.append(tautan(x["titik"], penanda(*p, x["warna"], x["no"], "o", 13) + label(*p, x["judul"], 16, -12)))
    mx, my = (u[0] + tp[0]) / 2, (u[1] + tp[1]) / 2
    o.append(f'<circle cx="{mx}" cy="{my}" r="12" fill="#fff" stroke="#64748b" stroke-width="2" stroke-dasharray="4 3"/>'
             f'<text x="{mx}" y="{my + 4.5}" class="nomor" style="fill:#334155;font-size:13px">{n_kaki}</text>')
    # pompa terlalu dekat petak: geser penanda ke sisi air dan tarik garis penunjuk ke titik asli
    pa = a
    if math.hypot(a[0] - tp[0], a[1] - tp[1]) < 40:
        g = [proyeksi(m, y, x) for x, y in (w.get("garis") or [])]
        if len(g) >= 2:                               # geser di sepanjang garis air supaya pompa tetap tampak di tepi air
            i = min(range(len(g) - 1), key=lambda j: math.hypot((g[j][0] + g[j + 1][0]) / 2 - a[0], (g[j][1] + g[j + 1][1]) / 2 - a[1]))
            dx, dy = g[i + 1][0] - g[i][0], g[i + 1][1] - g[i][1]
        else:
            dx, dy = a[0] - tp[0], a[1] - tp[1]
        d = math.hypot(dx, dy) or 1
        dx, dy = dx / d, dy / d
        if (dx * (u[0] - tp[0]) + dy * (u[1] - tp[1])) > 0:   # ke arah yang menjauhi jalur jalan kaki
            dx, dy = -dx, -dy
        pa = (round(a[0] + dx * 50, 1), round(a[1] + dy * 50, 1))
        o.append(f'<path d="M{a[0]},{a[1]} L{pa[0]},{pa[1]}" stroke="#fff" stroke-width="1.6"/>')
    dekat_parkir = False
    if math.hypot(pa[0] - u[0], pa[1] - u[1]) < 40:     # pompa di dekat parkir (selang panjang): geser ke sisi lain
        vx, vy = tp[0] - u[0], tp[1] - u[1]
        d = math.hypot(vx, vy) or 1
        px_, py_ = -vy / d, vx / d                   # tegak lurus jalur; pilih sisi bawah, jauh dari label parkir (kiri atas)
        if py_ < 0 or (abs(py_) < 0.2 and px_ < 0):
            px_, py_ = -px_, -py_
        q = (round(u[0] + px_ * 46, 1), round(u[1] + py_ * 46, 1))
        o.append(f'<path d="M{a[0]},{a[1]} L{q[0]},{q[1]}" stroke="#fff" stroke-width="1.6"/>')
        pa = q
        dekat_parkir = True
    perahu = s["akses"]["ujung"] == "perahu"
    lu = ((18, -14, "start") if kiri else (-18, -14, "end")) if dekat else (-16, -14, "end")
    if lu[2] == "start" and u[0] > W - 190:         # label tidak boleh terpotong tepi peta
        lu = (-18, -14, "end")
    elif lu[2] == "end" and u[0] < 190:
        lu = (18, -14, "start")
    o.append(tautan(T["ujung"], penanda(*u, "#334155", n_parkir, "o", 13)
             + label(*u, "Turun perahu" if perahu else "Parkir mobil", *lu)))
    # label petak: sisi bawaan; bila penanda lain (pompa, parkir, kaki) menutupinya, pindah ke sisi lawan, lalu ke bawah
    def _tutup(arah):
        return any(0 < (q[0] - tp[0]) * arah < 190 and abs(q[1] - tp[1]) < 40 for q in (pa, u, (mx, my)))
    arah0 = -1 if kiri else 1
    if not _tutup(arah0):
        lp = ((-20, -14, "end") if kiri else (20, -14, "start")) if dekat else ((-20, -12, "end") if kiri else (18, -12, "start"))
    elif not _tutup(-arah0):
        lp = (-20, -14, "end") if arah0 > 0 else (20, -14, "start")
    else:
        lp = (0, 38, "middle")
    o.append(tautan(tg, penanda(*tp, "#ea580c", n_petak, "o", 14)
             + label(*tp, "Petak uji" if s["target"] else "Petak latihan", *lp)))
    o.append(tautan(airt, penanda(*pa, "#0369a1", n_pompa, "o", 12)
             + label(*pa, "Pompa", *((16, 18, "start") if dekat_parkir
                                      else (0, 30, "middle")), kls="lbl kecil")))
    o.append(skala(m, 22, Hh - 22, 1000 if W * m["m_per_px"] > 4500 else 500))
    o.append(kompas(W - 34, 44, 22) + "</svg>")
    return "".join(o)


SIMBOL = [("petak", '<i class="lg o" style="background:#ea580c"></i>', "Petak uji"),
          ("air", '<i class="lg o" style="background:#0369a1"></i>', "Pompa di tepi air"),
          ("selang", '<i class="lg ln selang"></i>', "Selang (satu jalur)"),
          ("sumberair", '<i class="lg ln sa"></i>', "Sumber air"),
          ("ujung", '<i class="lg o" style="background:#334155"></i>', "Parkir mobil atau turun perahu"),
          ("kaki", '<i class="lg ln kaki"></i>', "Jalan kaki"),
          ("api24", '<i class="lg o api24"></i>', "Titik api 24 jam"),
          ("api48", '<i class="lg o api48"></i>', "Titik api 24–48 jam"),
          ("kluster", '<i class="lg ar kl"></i>', "Batas area kebakaran"),
          ("sbo", '<i class="lg sq"></i>', "Sumur bor atau sekat kanal BRGM")]
WARNA = [("#ff8a1f", "Oranye terang", "api atau bara"), ("#9d1d4f", "Merah tua sampai ungu", "bekas terbakar"),
         ("#2fbf4a", "Hijau", "tumbuhan"), ("#bfeff5", "Putih kebiruan", "awan atau asap"), ("#1e293b", "Gelap", "air atau bayangan")]


def legenda(s):
    ada = ADA.get(s["id"], set())
    return '<div class="legenda">' + "".join(f"<span>{ikon}{e('Petak latihan' if k == 'petak' and not s['target'] else nm)}</span>" for k, ikon, nm in SIMBOL if k in ada) + "</div>"


def keterangan(s):
    m = s["peta"]["detail"]
    jam = datetime.fromisoformat(f'{m["tgl"]}T{m["jam_utc"]}:00+00:00').astimezone(WIB)
    warna = "".join(f'<span><i class="sw" style="background:{c}"></i><b>{a}</b> = {b}</span>' for c, a, b in WARNA)
    if m.get("esri"):      # tidak ada adegan Sentinel-2 yang terbaca: Esri warna asli, tanggal pengambilan tidak diketahui
        blok = ""
        citra = (f'<li><b>Citra:</b> Esri World Imagery, warna asli, tanggal pengambilan tidak diketahui (bukan citra terbaru; Sentinel-2 tidak terbaca). '
                 f'Kotak {ang(m["km"],1)} × {ang(m["km"],1)} km.</li>')
    else:
        blok = f'<div class="warna"><span class="jdl">Warna citra</span>{warna}</div>'
        citra = f'<li><b>Citra:</b> {m["satelit"]}, {tgl_id(m["tgl"])} pukul {jam:%H.%M} WIB. Kotak {ang(m["km"],1)} × {ang(m["km"],1)} km.</li>'
    return (f'<div class="ket2">{blok}'
            f'<ul>{citra}'
            f'<li><b>Titik api:</b> satelit NASA FIRMS sampai {ACUAN}.</li>'
            f'<li><b>Klik</b> penanda atau titik api untuk membuka lokasinya di Google Maps.</li>'
            f'<li>Garis selang dan jalan kaki hanya menunjukkan arah; di lapangan ikuti tanggul atau setapak.</li></ul></div>')


def kartu_alur(s, ringkas=True):
    li = []
    for x in alur(s):
        tk = f'<a class="koor" href="https://www.google.com/maps?q={x["titik"][0]:.5f},{x["titik"][1]:.5f}">{x["titik"][0]:.4f}, {x["titik"][1]:.4f}</a>' if x.get("titik") else ""
        nomor = f'<i class="no" style="background:{x["warna"]}">{x["no"]}</i>' if x.get("titik") else f'<i class="no garis">{x["no"]}</i>'
        li.append(f'<li>{nomor}<div><b>{x["judul"]}</b> {x["ket"]}{"<br>" + tk if tk else ""}</div></li>')
    return f'<ol class="alur{" ringkas" if ringkas else ""}">{"".join(li)}</ol>'


def baris_kartu(k, v):
    return f"<tr><td>{k}</td><td>{v}</td></tr>"


def sidebar(s):
    k, t = s["kel"], TEKS[s["id"]]
    aktif = [c for c in s["kluster"] if c.get("n24")]
    ca = aktif[0] if aktif else (s["kluster"][0] if s["kluster"] else None)
    terdekat = min([x["d_km"] for x in s["titik48"]], default=None)
    h = ['<div class="kartu"><div class="kj">Api di sekitar lokasi (5 km)</div>',
         f'<div class="kpi3"><div><b class="oranye">{len(s["titik24"])}</b><span>titik api 24 jam</span></div>'
         f'<div><b>{len(s["titik48"])}</b><span>titik api 48 jam</span></div>'
         f'<div><b>{ang(terdekat, 1)}</b><span>km titik api terdekat</span></div></div><table>']
    if not s["target"]:
        h.append(baris_kartu("Petak", "<b>Petak latihan</b>; tidak ada bara gambut yang layak diuji di dekat sini"))
    if ca:
        h.append(baris_kartu("Kebakaran terdekat", f'{ang(ca["d_km"],1)} km, Kec. {e(ca.get("kec") or "–")}, sudah {ca.get("hari") or "–"} hari'
                             + (f', ± {ang(ca.get("luas"))} ha' if ca.get("luas") else "")))
        if ca.get("tanggung"):
            h.append(baris_kartu("Kawasan", e(", ".join(reversed(ca["tanggung"])))))
    h.append("</table></div>")
    wx = next((d for d in s["fwi_sel"]["hari"] if d["tgl"] == HARI), None)
    h.append('<div class="kartu"><div class="kj">Cuaca dan kekeringan hari ini</div><table>')
    if wx:
        h.append(baris_kartu("Kekeringan gambut (DC)", f'<b class="oranye">{ang(wx["dc"])}</b>{", sangat kering (di atas 350)" if wx["dc"] > 350 else ""}'))
        h.append(baris_kartu("Suhu, kelembapan, angin", f'{ang(wx["t"],1)} °C, {wx["rh"]}%, {ang(wx["ws"],1)} km/jam'))
    h.append("</table>")
    cu = s["cuaca"]
    if cu:
        h.append('<table class="ramal"><tr><td>Prakiraan</td>' + "".join(f"<td>{int(d[8:10])}/{int(d[5:7])}</td>" for d in cu["time"]) + "</tr>")
        h.append('<tr><td>Hujan, mm</td>' + "".join(f"<td>{ang(x,0)}</td>" for x in cu["precipitation_sum"]) + "</tr>")
        h.append('<tr><td>Peluang, %</td>' + "".join(f"<td>{x}</td>" for x in cu["precipitation_probability_max"]) + "</tr></table>")
    h.append("</div>")
    h.append('<div class="kartu"><div class="kj">Lahan dan riwayat</div><table>')
    h.append(baris_kartu("Gambut", f'<b>Ya</b>, di {GN}; kedalaman: {t["dalam"]}' if s.get("gambut_prims", True)
                         else f'<b>Tidak tercatat</b> di ' + (GN if GENERIK else 'peta gambut resmi 1:250.000') + '; ' + (t["dalam"].split("; ", 1)[1] if t["dalam"].startswith("Tidak tercatat") and "; " in t["dalam"] else f'kedalaman: {t["dalam"]}')))
    h.append(baris_kartu("Tahun ada api", f'<b>{k["kekerapan_sel22"]}</b> dari 14 tahun (2012–2025)' if k["kekerapan_sel22"] is not None else "Belum ada data riwayat tahunan di wilayah ini"))
    h.append(baris_kartu("Desa", f'{e(s["desa"]["desa"])}, Kec. {e(s["desa"]["kecamatan"])}'))
    h.append(baris_kartu("Kesatuan hidrologis gambut", e(s["khg"]["nama_khg"].replace("KHG ", ""))))
    h.append("</table></div>")
    h.append(f'<div class="kartu"><div class="kj">Alur perjalanan (klik koordinat)</div>{kartu_alur(s)}</div>')
    return "".join(h)


def halaman_peta(s):
    return (f'<section class="hal lanskap">{kepala(s, "1 DARI 3, PETA LAPANGAN")}<div class="isi-peta"><div class="kiri">'
            f'<div class="bingkai">{peta_detail(s)}</div>{legenda(s)}{keterangan(s)}</div>'
            f'<div class="kanan-kol">{sidebar(s)}</div></div></section>')


# ---------------- halaman 2: perjalanan dan persiapan ----------------
def peta_rute(s):
    m = s["peta"]["rute"]; W, Hh = m["w"], m["h"]
    dalam = lambda p: 0 <= p[0] <= W and 0 <= p[1] <= Hh
    o = [f'<svg viewBox="0 0 {W} {Hh}" class="petasvg">{PANAH}<image href="{m["img"]}" x="0" y="0" width="{W}" height="{Hh}"/>']
    rute = [(y, x) for x, y in s["akses"]["rute"]][:-1]           # titik terakhir rute model = kompleks lama
    if s["akses"]["ujung"] == "perahu":
        rute = rute + [s["titik"]["ujung"]]
    o.append(f'<path d="{path(m, rute)}" class="rute-tepi"/><path d="{path(m, rute)}" class="rute"/>')
    u, tp = proyeksi(m, *s["titik"]["ujung"]), proyeksi(m, *target(s))
    o.append(f'<path d="M{u[0]},{u[1]} L{tp[0]},{tp[1]}" class="kaki-tepi"/><path d="M{u[0]},{u[1]} L{tp[0]},{tp[1]}" class="kaki"/>')
    for t in s["titik48"]:
        p = proyeksi(m, t["lat"], t["lon"])
        if dalam(p):
            o.append(tautan((t["lat"], t["lon"]), f'<circle cx="{p[0]}" cy="{p[1]}" r="4" class="{"api24" if t["jam"] >= -24 else "api48"}"/>'))
    L = alur(s)
    def bulat_garis(x, y, n):
        return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="11" fill="#fff" stroke="#64748b" stroke-width="2" stroke-dasharray="4 3"/>'
                f'<text x="{x:.1f}" y="{y + 4:.1f}" class="nomor" style="fill:#334155;font-size:12px">{n}</text>')
    # langkah tanpa titik (naik mobil, naik perahu, jalan kaki): nomor di tengah ruas yang dilalui
    ruas = {}
    pts = [proyeksi(m, *q) for q in rute]
    if len(pts) > 1:
        ruas["mobil"] = pts[len(pts) // 2]
    ruas["kaki"] = ((u[0] + tp[0]) / 2, (u[1] + tp[1]) / 2)
    for x in L:
        if x.get("titik"):
            continue
        if x["judul"].startswith("Jalan kaki"):
            o.append(bulat_garis(*ruas["kaki"], x["no"]))
        elif "mobil" in ruas and x["judul"].startswith(("Naik mobil", "Naik perahu")):
            k = 0.3 if x["judul"].startswith("Naik mobil") else 0.75
            q = pts[min(len(pts) - 1, int(len(pts) * k))]
            o.append(bulat_garis(*q, x["no"]))
    titik = [x for x in L if x.get("titik")]
    for x in titik:
        p = proyeksi(m, *x["titik"])
        if x["judul"].startswith("Pasang pompa") and math.hypot(p[0] - tp[0], p[1] - tp[1]) < 30:
            q = (p[0] + 34, p[1] + 26)                 # menumpuk dengan petak: geser, tarik garis penunjuk
            o.append(f'<path d="M{p[0]},{p[1]} L{q[0]},{q[1]}" stroke="#fff" stroke-width="2"/>')
            p = q
        o.append(tautan(x["titik"], penanda(*p, x["warna"], x["no"], "o", 13)))
    o.append(skala(m, 20, Hh - 20, 5000 if W * m["m_per_px"] > 30000 else 2000 if W * m["m_per_px"] > 9000 else 1000))
    o.append(kompas(W - 30, 38, 19) + "</svg>")
    leg = "".join(f'<span><i class="no" style="background:{x["warna"]}">{x["no"]}</i>{x["judul"]}</span>' if x.get("titik")
                  else f'<span><i class="no garis">{x["no"]}</i>{x["judul"]}</span>' for x in L)
    leg += '<span><i class="lg ln rt"></i>Rute mobil atau perahu</span><span><i class="lg ln kaki"></i>Jalan kaki</span><span><i class="lg o api24"></i>Titik api</span>'
    return o, leg


def tabel_kit(s):
    rows = "".join(f"<tr><td>{e(b)}</td><td>{isi(s, j)}</td><td>{e(c)}</td></tr>" for b, j, c in KIT)
    return f'<table class="kit"><tr><th>Barang</th><th>Jumlah</th><th>Catatan</th></tr>{rows}</table>'


def halaman_jalan(s):
    t = TEKS[s["id"]]
    o, leg = peta_rute(s)
    daftar = lambda xs: "<ul>" + "".join(f"<li>{isi(s, x)}</li>" for x in xs) + "</ul>"
    pj = [x["z"] for x in s["profil_jalan"] if x["z"] is not None]
    catat = '<p class="catat">' + isi(s, t["rute_catatan"]) + "</p>" if t["rute_catatan"] else ""
    return (f'<section class="hal lanskap">{kepala(s, "2 DARI 3, PERJALANAN DAN PERSIAPAN")}<div class="isi-jalan">'
            f'<div class="kol"><div class="kartu"><div class="kj">Peta rute</div><div class="bingkai">{"".join(o)}</div>'
            f'<div class="legenda">{leg}</div></div>'
            f'<div class="kartu"><div class="kj">Naik-turun jalur jalan kaki</div>{profil_svg(s, "profil_jalan")}'
            f'<div class="ket">{"Naik-turun ± " + ang(max(pj) - min(pj), 0) + " m. " if pj else ""}Data ketinggian ikut menghitung tinggi pohon, jadi angka nyata bisa lebih kecil. Head pompa ada di halaman pemasangan.</div></div></div>'
            f'<div class="kol"><div class="kartu"><div class="kj">Alur perjalanan, ± {menit_total(s)} menit sampai petak</div>{kartu_alur(s, False)}'
            f'{catat}</div>'
            f'<div class="kartu"><div class="kj">Tips lokasi ini</div>{daftar(t["tips"])}</div></div>'
            f'<div class="kol"><div class="kartu"><div class="kj">Barang yang dibawa</div>{tabel_kit(s)}<p class="ket">Gambar dan spesifikasi tiap barang ada di lampiran di akhir dossier.</p></div></div>'
            f'</div></section>')


# ---------------- halaman 3: pemasangan dan uji ----------------
def peta_tata(s):
    """tata letak: sumber air, pompa, satu jalur selang, Y-pembagi, 4 petak"""
    m = s["peta"]["inset"]; W, Hh = m["w"], m["h"]
    w = air(s); airt = (w["lat"], w["lon"]); tg = target(s)
    a, tp = proyeksi(m, *airt), proyeksi(m, *tg)
    o = [f'<svg viewBox="0 0 {W} {Hh}" class="tatasvg">{PANAH}<image href="{m["img"]}" x="0" y="0" width="{W}" height="{Hh}"/>'
         f'<rect width="{W}" height="{Hh}" fill="#000" opacity=".22"/>']
    o.append(garis_air(m, s, "airsumber besar"))
    dx, dy = tp[0] - a[0], tp[1] - a[1]
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    s10 = max(10 / m["m_per_px"], 26)
    # Y-pembagi di titik petak; 4 petak di depannya menjauhi pompa supaya tidak menumpuk
    yx, yy = (tp[0], tp[1]) if L > 60 else (a[0] + ux * 60, a[1] + uy * 60)
    o.append(selang(a, (yx, yy), 1.1))
    relay = s["hid"].get("relay")
    if relay:
        for k in range(1, relay["n_ruas"]):
            rx, ry = a[0] + (yx - a[0]) * k / relay["n_ruas"], a[1] + (yy - a[1]) * k / relay["n_ruas"]
            o.append(penanda(rx, ry, "#b45309", "+", "s", 11) + (label(rx, ry, "Pompa tambahan", 16, -16, kls="lbl kecil") if k == 1 else ""))
    for lb, fa, fb in (("L1", 0.9, -0.75), ("L2", 2.2, -0.75), ("K1", 0.9, 0.75), ("K2", 2.2, 0.75)):
        cx = yx + ux * fa * s10 * 1.25 + nx * fb * s10 * 1.25
        cy = yy + uy * fa * s10 * 1.25 + ny * fb * s10 * 1.25
        o.append(f'<path d="M{yx:.1f},{yy:.1f} L{cx:.1f},{cy:.1f}" class="cabang"/>')
        o.append(f'<rect x="{cx - s10/2:.1f}" y="{cy - s10/2:.1f}" width="{s10:.1f}" height="{s10:.1f}" class="{"petakL" if lb[0] == "L" else "petakK"}"/>'
                 f'<text x="{cx:.1f}" y="{cy + 5:.1f}" class="nomor" style="font-size:14px">{lb}</text>')
    o.append(f'<circle cx="{yx:.1f}" cy="{yy:.1f}" r="7" fill="#fff" stroke="#f97316" stroke-width="3"/>')
    o.append(tautan(airt, penanda(*a, "#0369a1", "P", "s", 13)))
    px_, ancp = a[0] - ux * 22, "end" if ux > 0 else "start"
    if (ancp == "end" and px_ < 85) or (ancp == "start" and px_ > W - 85):       # label tidak boleh terpotong tepi peta
        px_, ancp = a[0] + ux * 22, "start" if ancp == "end" else "end"
    o.append(label(px_, a[1] - uy * 22, "Pompa", 0, 5, ancp))
    o.append(label(min(max(a[0] - nx * 58, 100), W - 100), a[1] - ny * 58, w["nama"].capitalize() + ", sumber air", 0, 5, "middle", "lbl kecil biru"))
    mx, my = (a[0] + yx) / 2, (a[1] + yy) / 2
    if L >= 100:
        o.append(label(mx, my, f"selang ± {ang(s['hid']['L'])} m", -nx * 26, -ny * 26 + 4, "middle", "lbl kecil"))
    # titik api digambar paling atas supaya tidak tertutup petak; label pada titik terdekat petak
    api = [(t, proyeksi(m, t["lat"], t["lon"])) for t in s["titik48"]]
    api = [(t, p) for t, p in api if 0 <= p[0] <= W and 0 <= p[1] <= Hh]
    for t, p in api:
        o.append(tautan((t["lat"], t["lon"]), f'<circle cx="{p[0]}" cy="{p[1]}" r="10" class="{"api24" if t["jam"] >= -24 else "api48"}" style="stroke-width:2.5"/>'))
    if api:
        t, p = min(api, key=lambda x: math.hypot(x[1][0] - tp[0], x[1][1] - tp[1]))
        o.append(label(*p, "Titik api", nx * 34, ny * 34 + 5, "middle"))
    o.append(skala(m, 18, Hh - 18, 20 if W * m["m_per_px"] < 150 else 50 if W * m["m_per_px"] < 400 else 100))
    o.append(kompas(W - 30, 38, 19) + "</svg>")
    return "".join(o)


def teks_head(s):
    """rincian head dari kalkulator SIPPA: naik, gesekan, sisa di lance, total"""
    h = s["hid"]; x = h["relay"]["ruas"] if h.get("relay") else h["penuh"]
    ruas = f' per ruas (ada {h["relay"]["n_ruas"]} ruas)' if h.get("relay") else ""
    return (f'Beda tinggi pompa ke petak menurut data ± {ang(h["dz"], 1)} m (paling tinggi {ang(h["dz_maks_profil"], 1)} m); hitungan memakai {ang(h["dz_hitung"], 1)} m. '
            f'Total head pompa{ruas} ± <b>{ang(x["tdh_m"], 0)} m</b> ({ang(x["p_pompa_bar"], 1)} bar): naik {ang(h["dz_hitung"] / (h["relay"]["n_ruas"] if h.get("relay") else 1), 1)} m, '
            f'gesekan selang {ang(x["hf_m"], 0)} m, isap 3,5 m, sisa tekanan di lance 3 bar. '
            'Data ketinggian ikut menghitung tinggi pohon; ukur beda tinggi dengan GPS saat survei.')


def tabel_hid(s):
    h = s["hid"]
    def baris(nama, x):
        layak = {"KONDISIONAL": "Layak", "HOLD": "Pas-pasan"}.get(x["vonis"], "Tidak layak")
        return (f'<tr><td>{nama}</td><td>{ang(x["p_pompa_bar"],1)} bar</td><td>{ang(x["p_ujung_bar"],1)} bar</td>'
                f'<td>{ang(x["t_tiba_menit"],0) if x["t_tiba_menit"] >= 1 else "&lt; 1"} menit</td><td>{ang(x["bbm_l_jam"],1)} L</td>'
                f'<td class="{ {"Layak": "ok", "Pas-pasan": "pas"}.get(layak, "tidak") }">{layak}</td></tr>')
    rows = [baris("2 lance + 1 nozzle (alat minimum)", h["minimum"]), baris("8 lance (uji penuh)", h["penuh"])]
    if h.get("relay"):
        rows.append(baris(f'8 lance + {h["relay"]["n_ruas"]-1} pompa tambahan', h["relay"]["ruas"]))
    return ('<table class="hid"><tr><th>Pilihan pasang</th><th>Tekanan di pompa</th><th>Sisa tekanan di lance</th><th>Air sampai</th>'
            f'<th>Bensin per jam</th><th>Hasil hitung</th></tr>{"".join(rows)}</table>')


def halaman_pasang(s):
    t = TEKS[s["id"]]
    daftar = lambda xs: "<ul>" + "".join(f"<li>{isi(s, x)}</li>" for x in xs) + "</ul>"
    kerja = "".join(f'<tr><td class="n">{i}</td><td><b>{a}</b></td><td>{b}</td></tr>' for i, (a, b) in enumerate(UMUM["kerja"], 1))
    leg = ('<div class="legenda"><span><i class="lg sqr" style="background:#0369a1"></i>Pompa</span><span><i class="lg ln selang"></i>Selang</span>'
           '<span><i class="lg ln sa"></i>Sumber air</span><span><i class="lg o" style="background:#fff;border:2px solid #f97316"></i>Y-pembagi</span>'
           '<span><i class="lg ar pl"></i>Petak lance L1, L2</span><span><i class="lg ar pk"></i>Petak semprot biasa K1, K2</span><span><i class="lg o api24"></i>Titik api</span></div>'
           '<div class="ket">Titik api dari satelit bisa meleset sampai ± 375 m. Di lapangan, cari tanah yang berasap di sekitar petak dan pasang petak di situ.</div>')
    return (f'<section class="hal lanskap">{kepala(s, "3 DARI 3, PEMASANGAN DAN UJI")}<div class="isi-pasang">'
            f'<div class="kol"><div class="kartu"><div class="kj">Tata letak pompa, selang, dan petak</div><div class="bingkai">{peta_tata(s)}</div>{leg}'
            f'</div></div>'
            f'<div class="kol"><div class="kartu"><div class="kj">Cara pasang</div><p class="sorot">{isi(s, t["pompa"])}</p>{tabel_hid(s)}'
            f'<div class="ket">Hitungan kalkulator SIPPA untuk pompa 1.000–1.300 liter/menit dan selang 2,5 inci. Panjang selang sudah ditambah 20% untuk belokan dan 60 m cabang ke petak. {t["topo"]}</div></div>'
            f'<div class="kartu"><div class="kj">Urutan kerja</div><table class="kerja">{kerja}</table></div></div>'
            f'<div class="kol"><div class="kartu"><div class="kj">Topografi pompa ke petak (head)</div>{profil_svg(s)}<div class="ket">{teks_head(s)}</div></div>'
            f'<div class="kartu"><div class="kj">Tantangan</div>{daftar(t["sulit"])}</div>'
            f'<div class="kartu"><div class="kj">Yang memudahkan</div>{daftar(t["mudah"])}</div></div>'
            f'</div></section>')


def baris_ringkas(s):
    a, t = s["akses"], TEKS[s["id"]]
    w = air(s)
    return (f'<tr><td class="no">{s["no"]}</td><td><b>{e(s["nama"])}</b><br><span class="abu">Kompleks {s["id"]}</span>'
            f'<div class="kk"><span>{"Petak uji" if s["target"] else "Petak latihan"}</span>{koor(target(s))}<span>Pompa</span>{koor((w["lat"], w["lon"]))}'
            f'<span>{"Turun perahu" if a["ujung"] == "perahu" else "Parkir"}</span>{koor(s["titik"]["ujung"])}</div></td>'
            f'<td>{t["dalam"]}</td>'
            f'<td class="angka"><b class="oranye">{len(s["titik48"])}</b><br><span class="abu">{len(s["titik24"])} dalam 24 jam</span></td>'
            f'<td>{e(w["nama"])}, {ang(w["d_km"]*1000)} m dari petak<br><span class="abu">selang {ang(s["hid"]["L"])} m, {s["hid"]["gulung"]} gulung'
            f'{", " + str(s["hid"]["relay"]["n_ruas"] - 1) + " pompa tambahan" if s["hid"].get("relay") else ""}</span></td>'
            f'<td><b>± {menit_total(s)} menit</b> dari {e(a["dari"]["nama"])}, jalan kaki {ang(s["kaki_target"]["km"],1)} km</td>'
            f'<td><b>{e(uji(s))}</b><br>{isi(s, t["peran"])}</td></tr>')


KOLOM = ('<colgroup><col style="width:5mm"><col style="width:47mm"><col style="width:30mm"><col style="width:13mm"><col style="width:26mm"><col style="width:23mm"><col></colgroup>'
         '<tr><th></th><th>Lokasi, klik koordinat untuk Google Maps</th><th>Gambut dan kedalaman</th><th>Titik api 5 km, 48 jam</th>'
         '<th>Sumber air dan selang</th><th>Waktu sampai petak</th><th>Untuk uji apa</th></tr>')

SUMBER = ('<div class="sumber">Sumber: titik api NASA FIRMS (VIIRS S-NPP, NOAA-20, NOAA-21, MODIS) lewat Centurisk97, acuan {acuan}, dihitung sebagai lokasi unik per hari WIB. '
          + ('Gambut: peta indikatif moratorium PIPPIB (KLHK) di PRIMS BRGM; kanal' if teks_renlap.MOR else 'Gambut: peta 1:250.000 Kementan BBSDLP di PRIMS BRGM; kanal') + ', sumur bor, sekat kanal: PRIMS BRGM; batas desa: BIG RBI lewat PRIMS. '
          + 'Air, jalan, dan rute: OpenStreetMap dan model akses SIPPA (perkiraan, belum diukur). Citra: Sentinel-2 L2A (Copernicus), Esri World Imagery. '
          'Cuaca: indeks FWI Centurisk97 dan prakiraan Open-Meteo. Kedalaman gambut: penelitian per kawasan, wajib dibor. Tidak memuat nama pemegang izin.</div>')


def halaman_ringkas():
    S = D["situs"]
    A = [s for s in S if not s.get("paksa")]; B = [s for s in S if s.get("paksa")]
    kab = ", ".join(f"{n.replace('Kota Palangkaraya','Palangka Raya')} {ang(v)}" for n, v in R["kab"][:2])
    tabelA = ('<h2 class="bag">Bagian A: selang pendek, pompa dekat api</h2><table class="utama">' + KOLOM
              + "".join(baris_ringkas(s) for s in A) + "</table>") if A else ""
    if EKSTRA.get("satu_daftar"):   # EKSTRA {"satu_daftar": judul}: semua lokasi satu tabel urut prioritas, selang pendek dan panjang digabung
        tabelA = f'<h2 class="bag">{EKSTRA["satu_daftar"]}</h2><table class="utama">{KOLOM}{"".join(baris_ringkas(s) for s in S)}</table>'
    satu = (f'<section class="hal potret"><header class="kepala1"><div class="sup">BNPB SIPPA, SISTEM PIPA PORTABEL KARHUTLA DAN BANJIR</div>'
            f'<div class="baris1"><h1>{R.get("judul", "Pilot Kalimantan Tengah: 10 lokasi uji")}</h1><div class="kanan">Kondisi per {ACUAN}<br>Dossier tim lapangan, {2 + 3 * len(S) + (len(ALAT) + 7) // 8} halaman</div></div></header>'
            f'<div class="kpi4"><div><b class="oranye">{ang(R["kalteng48"])}</b><span>titik api {R["wilayah"] + " " + R["tgl_label"] if GENERIK else "Kalteng 25–26 Okt"}</span></div>'
            f'<div><b class="kecilb">{kab}</b><span>kabupaten terbanyak</span></div><div><b>{R.get("n_gambut", 10)} dari {len(S)}</b><span>lokasi di dalam {GN2}</span></div>'
            f'<div><b>{len(A)} + {len(B)}</b><span>lokasi selang pendek dan selang panjang</span></div></div>'
            f'<p class="gagasan">{UMUM["gagasan"]}</p>'
            f'{tabelA}'
            f'<div class="dua1"><div class="kartu"><div class="kj">Cek gambut</div>{UMUM["cek_gambut"]}</div>'
            f'<div class="kartu"><div class="kj">Yang perlu diputuskan</div><ol class="rapat">{"".join(f"<li>{x}</li>" for x in UMUM["putus"])}</ol></div></div>'
            f'{SUMBER.format(acuan=ACUAN)}</section>')
    if B and EKSTRA.get("satu_daftar"):   # tabel sudah di halaman 1; halaman 2 hanya cara kerja selang panjang
        Ls = [s["hid"]["L"] for s in B]
        judul2 = "Cara uji dan keselamatan"
        isi2 = f'<p class="gagasan">{UMUM["panjang"].replace("RENTANG", f"{ang(min(Ls) / 1000, 1)}–{ang(max(Ls) / 1000, 1)} km")}</p>'
    elif B:
        Ls = [s["hid"]["L"] for s in B]
        rentang = f"{ang(min(Ls) / 1000, 1)}–{ang(max(Ls) / 1000, 1)} km"
        judul2 = "Bagian B: selang panjang, pompa di tepi jalan"
        isi2 = (f'<p class="gagasan">{UMUM["panjang"].replace("RENTANG", rentang)}</p>'
                f'<table class="utama">{KOLOM}{"".join(baris_ringkas(s) for s in B)}</table>')
    else:                   # renlap tanpa lokasi selang panjang
        judul2, isi2 = "Cara uji dan keselamatan", ""
    dua = (f'<section class="hal potret"><header class="kepala1"><div class="sup">BNPB SIPPA, {"RENCANA LAPANGAN" if GENERIK else "PILOT KALIMANTAN TENGAH"}</div>'
           f'<div class="baris1"><h1>{judul2}</h1><div class="kanan">Kondisi per {ACUAN}</div></div></header>{isi2}'
           f'<div class="dua1"><div class="kartu"><div class="kj">Cara menguji efektivitas, semua lokasi</div><ol class="rapat">{"".join(f"<li>{x}</li>" for x in UMUM["uji"])}</ol></div>'
           f'<div class="kartu"><div class="kj">Keselamatan, semua lokasi</div><ul class="rapat">{"".join(f"<li>{x}</li>" for x in UMUM["selamat"])}</ul></div></div>'
           f'{SUMBER.format(acuan=ACUAN)}</section>')
    return satu + dua


if GENERIK and os.environ.get("RENLAP_TANPA_TEKS_TANGAN"):   # tolak teks tulisan tangan pilot (isinya bertanggal 26 Okt): semua lokasi dari templat
    TEKS.clear(); DALAM_PANJANG.clear()
for s in D["situs"]:
    if s["id"] not in TEKS:
        TEKS[s["id"]] = teks_panjang(s["id"], s) if s["id"] in DALAM_PANJANG else teks_renlap.teks_otomatis(s)

html = (f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>SIPPA: dossier lapangan</title>'
        f'<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>{open(f"{HERE}/gaya.css").read()}{CSS_RENLAP if GENERIK else ""}</style></head><body>'
        + halaman_ringkas() + "".join(halaman_peta(s) + halaman_jalan(s) + halaman_pasang(s) for s in D["situs"]) + halaman_lampiran(ACUAN) + "</body></html>")
if GENERIK:      # halaman lanskap diberi baris sumber dan kondisi; istilah satelit "titik panas", bukan "titik api"
    pk = f'<div class="pk">{teks_renlap.SUMBER_PENDEK} Kondisi per {ACUAN}. BNPB SIPPA.</div>'
    html = re.sub(r'(<section class="hal lanskap">.*?)</section>', lambda m: m.group(1) + pk + "</section>", html, flags=re.S)
    html = html.replace("titik api", "titik panas").replace("Titik api", "Titik panas")
open(f"{OUT}/dossier.html", "w").write(html)
print("ok", len(html))
