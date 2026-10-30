"""Ekspor dossier ke web /uji-pilot: src/uji_pilot_data.js (data, hanya dikirim API bertoken) + gambar ke public/pipa/uji_pilot/img/."""
import json, os, re, shutil
from PIL import Image
import cetak as C          # memakai fungsi gambar dan teks yang sama dengan PDF
from teks import TEKS, KIT
from lampiran import ALAT, FOTO, GAMBAR

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../.."))
if C.GENERIK:     # renlap: keluaran ke OUT/keluaran/{data.json,img/}; alamat gambar di data.json = RENLAP_IMG_PREFIX (bawaan "img/", relatif ke data.json)
    KELUAR = f"{C.OUT}/keluaran"
    IMG = f"{KELUAR}/img"
    WEB = os.environ.get("RENLAP_IMG_PREFIX", "img/")
else:
    IMG = f"{REPO}/public/pipa/uji_pilot/img"
    WEB = "/pipa/uji_pilot/img/"
os.makedirs(IMG, exist_ok=True)
dipakai = set()


def gambar_ke_web(html):
    """ganti href img/... ke /pipa/uji_pilot/img/... dan salin berkasnya (dikecilkan, JPEG 82)"""
    def ganti(m):
        p = m.group(2)
        nama = os.path.basename(p)
        if nama not in dipakai:
            im = Image.open(os.path.join(C.OUT, p)).convert("RGB")
            im.thumbnail((1400, 1400))
            im.save(f"{IMG}/{nama.rsplit('.', 1)[0]}.jpg", quality=82, optimize=True)
            dipakai.add(nama)
        return f'{m.group(1)}="{WEB}{nama.rsplit(".", 1)[0]}.jpg"'
    return re.sub(r'(href|src)="(img/[^"]+)"', ganti, html)


WARNA_KELAS = {}


def tanpa_style(html):
    """CSP halaman tanpa 'unsafe-inline': style="..." di SVG jadi atribut presentasi, di HTML (latar ikon) jadi kelas bg-<hex>"""
    def ubah(m):
        tag, isi = m.group(1), m.group(2)
        dekl = [d.split(":", 1) for d in isi.split(";") if ":" in d]
        if tag in ("text", "path", "circle", "rect", "g", "line"):
            return " ".join(f'{k.strip()}="{v.strip().replace("px", "")}"' for k, v in dekl)
        kel = []
        for k, v in dekl:
            if k.strip() == "background":
                h = v.strip().lstrip("#"); WARNA_KELAS[h] = v.strip(); kel.append("bg-" + h)
        return f'data-bg="{" ".join(kel)}"'
    html = re.sub(r'<(\w+)([^>]*?)\sstyle="([^"]*)"', lambda m: f"<{m.group(1)}{m.group(2)} " + ubah(type("M", (), {"group": lambda s, i: (m.group(1), m.group(3))[i - 1]})()), html)
    # gabungkan data-bg ke class
    html = re.sub(r'class="([^"]*)"([^>]*?) data-bg="([^"]*)"', r'class="\1 \3"\2', html)
    html = re.sub(r' data-bg="([^"]*)"', r' class="\1"', html)
    assert ' style="' not in html, html[html.index(' style="') - 80:html.index(' style="') + 80]
    return html


def polos(html):
    return re.sub(r"<[^>]+>", "", html).replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").strip()


lokasi = []
for s in C.D["situs"]:
    t = TEKS[s["id"]]; a = s["akses"]; T = s["titik"]; w = C.air(s); k = s["kel"]
    aktif = [c for c in s["kluster"] if c.get("n24")]
    ca = aktif[0] if aktif else (s["kluster"][0] if s["kluster"] else None)
    wx = next((d for d in s["fwi_sel"]["hari"] if d["tgl"] == C.HARI), None)
    C.ADA.pop(s["id"], None)
    detail = C.peta_detail(s)
    rute_svg, rute_leg = C.peta_rute(s)
    m = s["peta"]["detail"]
    jam = C.datetime.fromisoformat(f'{m["tgl"]}T{m["jam_utc"]}:00+00:00').astimezone(C.WIB)
    alur = [{"no": x["no"], "judul": x["judul"], "ket": polos(x["ket"]), "titik": x.get("titik"), "warna": x.get("warna")} for x in C.alur(s)]
    lokasi.append({
        "no": s["no"], "id": s["id"], "nama": s["nama"], "bagian": "panjang" if s.get("paksa") else "pendek",
        "uji": C.uji(s), "status": t["status"], "peran": polos(C.isi(s, t["peran"])), "dalam": polos(t["dalam"]),
        "desa": s["desa"]["desa"], "kec": s["desa"]["kecamatan"], "kab": k["kab"], "khg": s["khg"]["nama_khg"].replace("KHG ", ""),
        "petak": list(C.target(s)), "pompa": [w["lat"], w["lon"]], "parkir": list(T["ujung"]), "berangkat": list(T["asal"]),
        "dari": a["dari"]["nama"], "ujung": a["ujung"], "menit_total": C.menit_total(s), "kaki_km": s["kaki_target"]["km"],
        "air": {"nama": w["nama"], "m": round(w["d_km"] * 1000)},
        "selang": {"m": s["hid"]["L"], "gulung": s["hid"]["gulung"], "relay": (s["hid"]["relay"]["n_ruas"] - 1) if s["hid"].get("relay") else 0},
        "ada_api": bool(s["target"]), "alur": alur,
        "api": {"n24": len(s["titik24"]), "n48": len(s["titik48"]), "terdekat_km": min([x["d_km"] for x in s["titik48"]], default=None),
                "kebakaran": ({"km": ca["d_km"], "kec": ca.get("kec"), "hari": ca.get("hari"), "ha": ca.get("luas"),
                               "kawasan": ", ".join(reversed(ca["tanggung"])) if ca.get("tanggung") else None} if ca else None)},
        "cuaca": ({"dc": wx["dc"], "t": wx["t"], "rh": wx["rh"], "ws": wx["ws"], "hujan": wx["hujan"]} if wx else None),
        "ramalan": ({"tgl": s["cuaca"]["time"], "hujan": s["cuaca"]["precipitation_sum"], "peluang": s["cuaca"]["precipitation_probability_max"]} if s["cuaca"] else None),
        "tahun_api": k["kekerapan_sel22"],
        "citra": ({"satelit": m["satelit"], "tgl": "tanggal pengambilan tidak diketahui", "jam": "", "km": m["km"]} if m.get("esri")
                  else {"satelit": m["satelit"], "tgl": C.tgl_id(m["tgl"]), "jam": jam.strftime("%H.%M"), "km": m["km"]}),
        "svg": {k_: tanpa_style(v_) for k_, v_ in {"detail": gambar_ke_web(detail), "rute": gambar_ke_web("".join(rute_svg)), "tata": gambar_ke_web(C.peta_tata(s)),
                "profil": C.profil_svg(s), "profil_jalan": C.profil_svg(s, "profil_jalan")}.items()},
        "head": C.teks_head(s),
        "legenda": tanpa_style(C.legenda(s)), "legenda_rute": tanpa_style(rute_leg),
        "pompa_html": C.isi(s, t["pompa"]), "hid_html": C.tabel_hid(s), "topo": t["topo"],
        "rute_catatan": C.isi(s, t["rute_catatan"]),
        "sulit": [C.isi(s, x) for x in t["sulit"]], "mudah": [C.isi(s, x) for x in t["mudah"]], "tips": [C.isi(s, x) for x in t["tips"]],
        "kit": [[b, C.isi(s, j), c] for b, j, c in KIT],
    })

alat = []
for kk, nama, fungsi, spek, jumlah in ALAT:
    f = FOTO.get(kk)
    item = {"kunci": kk, "nama": nama, "fungsi": fungsi, "spek": spek, "jumlah": jumlah}
    if f:
        nm = os.path.basename(f["file"])
        im = Image.open(os.path.join(C.OUT, f["file"])).convert("RGB"); im.thumbnail((700, 700))
        im.save(f"{IMG}/{nm}", quality=82, optimize=True)
        item["foto"] = WEB + nm
        item["kredit"] = {"artis": f["artis"] if not f["artis"].startswith("No machine") else "lihat halaman Commons", "lisensi": f["lisensi"], "halaman": f["halaman"]}
    else:
        item["svg"] = GAMBAR[kk]
    alat.append(item)

UMUM = C.UMUM
data = {"acuan": C.ACUAN, "kalteng": C.R["kalteng48"], "kab": C.R["kab"][:2], "gagasan": UMUM["gagasan"], "panjang": UMUM["panjang"],
        "cek_gambut": UMUM["cek_gambut"], "putus": UMUM["putus"], "uji": UMUM["uji"], "selamat": UMUM["selamat"],
        "kerja": UMUM["kerja"], "warna": C.WARNA, "lokasi": lokasi, "alat": [{**a, "svg": tanpa_style(a["svg"])} if "svg" in a else a for a in alat]}
if C.GENERIK:
    if C.KUNJ:
        data["kunjungan"] = C.KUNJ     # rencana kunjungan lengkap dengan tautan Google Maps (keputusan SIPPA 64)
    teks = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("titik api", "titik panas").replace("Titik api", "Titik panas")
    open(f"{KELUAR}/data.json", "w").write(teks)
    print("data.json", len(teks) // 1024, "KB; gambar", len(os.listdir(IMG)), "berkas")
    raise SystemExit(0)
js = ("/* DIBANGKITKAN dari dossier pilot SIPPA Kalteng (scripts/data/sippa/pilot/ekspor_web.py). Jangan disunting tangan.\n"
      "   Hanya dikirim lewat GET /api/uji-pilot dengan token yang cocok (src/uji_pilot.js, keputusan SIPPA 59). */\n"
      "export const DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
open(f"{REPO}/src/uji_pilot_data.js", "w").write(js)
for c_, _, _ in C.WARNA:
    WARNA_KELAS[c_[1:]] = c_
# kelas warna latar ikon legenda (dipakai public/pipa/uji_pilot.css lewat berkas terpisah yang ikut dibangkitkan)
open(f"{REPO}/public/pipa/uji_pilot_warna.css", "w").write("/* DIBANGKITKAN ekspor_web.py: warna latar ikon legenda (CSP tanpa style inline) */\n"
    + "".join(f".bg-{h}{{background:{v}}}\n" for h, v in sorted(WARNA_KELAS.items())))
tot = sum(os.path.getsize(os.path.join(IMG, f)) for f in os.listdir(IMG))
print("data", len(js) // 1024, "KB; gambar", len(os.listdir(IMG)), "berkas", tot // 1024, "KB")
