"""Peringatan resmi BMKG -> public/banjir/data/peringatan.json (+ salinan public/data/peringatan.json untuk halaman karhutla)

- Nowcast cuaca (CAP 1.2): RSS https://www.bmkg.go.id/alerts/nowcast/id -> tiap item tertaut ke ..._alert.xml.
  Host www.bmkg.go.id menolak UA bawaan sebagian alat, jadi dikirim UA peramban biasa (bukan pembobolan: tanpa cookie,
  tanpa tantangan). signature.bmkg.go.id (di balik tantangan Cloudflare) TIDAK dipakai.
  RSS hanya memuat peringatan terbaru (umumnya berlaku 2-3 jam), jadi semua item disimpan dengan tanda `aktif`
  (expires > sekarang); peramban memfilter.
- Gelombang tinggi: https://maritim.bmkg.go.id/marine2026-data/warning/warnings.json (per provinsi, nama perairan per
  kategori). Poligon perairan ada di meta/wilmetos.min.geojson (1,6 MB) dan tidak disalin ke sini.

nowcast[]: {id, event, severity, urgency, certainty, mulai, selesai, aktif, wilayah, headline, deskripsi, prov[],
            polygon: [[[lon, lat], ...], ...] atau null, web}
gelombang[]: {wilayah, prov (kode atau null untuk 'Indonesia'), dari, sampai, zona, sedang[], tinggi[], sangat_tinggi[], ekstrem[]}
Bagian yang gagal diunduh memakai isi berkas sebelumnya dan dicatat di `gagal`. Tidak memakai kuota Open-Meteo.

Pakai:  python3 scripts/banjir/peringatan.py      |  python3 scripts/banjir/peringatan.py uji
"""
import datetime as dt, os, re, shutil, sys, time, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, ambil, baca, simpan
from wilayah import AKAR, PROVINSI, Wilayah

RSS = "https://www.bmkg.go.id/alerts/nowcast/id"
GELOMBANG = "https://maritim.bmkg.go.id/marine2026-data/warning/warnings.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
CAP = {"c": "urn:oasis:names:tc:emergency:cap:1.2"}
ALIAS = {"ntb": "52", "ntt": "53", "bangkabelitung": "19", "diyogyakarta": "34", "yogyakarta": "34", "jakarta": "31",
         "dkijakarta": "31", "kepri": "21", "kepulauanriau": "21", "babel": "19"}


def unduh(url, coba=3):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(5 * (i + 1))


def norm(s):
    s = re.sub(r"\bbagian\b.*$", "", s.lower())
    return re.sub(r"[^a-z]", "", s.replace("kep.", "kepulauan "))


def kode_prov(nama):
    n = norm(nama)
    if n in ALIAS:
        return ALIAS[n]
    return next((k for k, v in PROVINSI.items() if norm(v) == n), None)


def poligon(teks):
    """CAP 'lat,lon lat,lon ...' -> [[lon, lat], ...]"""
    out = []
    for p in teks.split():
        la, lo = p.split(",")
        out.append([round(float(lo), 3), round(float(la), 3)])
    return out


def wilayah_teks(desk, area):
    m = re.search(r"khususnya di (.+?)\.\s", desk)
    return m.group(1).strip() if m else area


def baca_cap(xml, w=None, sekarang=None):
    akar = ET.fromstring(xml)
    info = akar.find("c:info", CAP)
    g = lambda e, k: (e.findtext(f"c:{k}", default="", namespaces=CAP) or "").strip()
    area = info.find("c:area", CAP)
    desk = g(info, "description")
    polys = [poligon(p.text) for p in area.findall("c:polygon", CAP) if p.text] if area is not None else []
    area_desc = g(area, "areaDesc") if area is not None else ""
    prov = set()
    if w:
        for ring in polys:
            for lon, lat in ring[::max(1, len(ring) // 8)]:
                a = w.cari(lon, lat)
                if a:
                    prov.add(a[0])
    if kode_prov(area_desc):
        prov.add(kode_prov(area_desc))
    selesai = g(info, "expires")
    sekarang = sekarang or dt.datetime.now(WIB)
    return {"id": g(akar, "identifier"), "event": g(info, "event"), "severity": g(info, "severity"), "urgency": g(info, "urgency"),
            "certainty": g(info, "certainty"), "mulai": g(info, "effective") or g(akar, "sent"), "selesai": selesai,
            "aktif": bool(selesai) and dt.datetime.fromisoformat(selesai) > sekarang,
            "wilayah": wilayah_teks(desk, area_desc), "headline": g(info, "headline"),
            "deskripsi": re.split(r"(?<=\.)\s", desk, maxsplit=1)[0][:240], "prov": sorted(prov),
            "polygon": polys or None, "web": g(info, "web") or None}


def nowcast(w):
    rss = unduh(RSS).decode()
    tautan = list(dict.fromkeys(re.findall(r"<link>(https://[^<]+_alert\.xml)</link>", rss)))
    out = []
    for u in tautan:
        try:
            out.append({**baca_cap(unduh(u), w), "url": u})
        except Exception as e:
            print(f"  CAP {u}: {e}", file=sys.stderr)
        time.sleep(1)
    return out


def gelombang():
    out = []
    for nama, v in ambil(GELOMBANG, kepala={"User-Agent": UA}).items():
        d = v.get("data") or {}
        wr = d.get("warning") or {}
        out.append({"wilayah": nama, "prov": kode_prov(nama), "dari": d.get("valid_from"), "sampai": d.get("valid_until"),
                    "zona": d.get("time_zone"), **{k: wr.get(k, []) for k in ("sedang", "tinggi", "sangat_tinggi", "ekstrem")}})
    return out


def main():
    jalur = os.path.join(KELUAR, "peringatan.json")
    lama = baca(jalur, {})
    hasil = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "gagal": [],
             "sumber": {"nowcast": RSS, "gelombang": GELOMBANG, "lisensi": "BMKG (cantumkan sumber)"}}
    for nama, f in (("nowcast", lambda: nowcast(Wilayah())), ("gelombang", gelombang)):
        try:
            hasil[nama] = f()
        except Exception as e:
            print(f"  {nama} gagal: {e}", file=sys.stderr)
            hasil[nama] = lama.get(nama, [])
            hasil["gagal"].append(nama)
    simpan(jalur, hasil)
    shutil.copy(jalur, os.path.join(AKAR, "public/data/peringatan.json"))
    g = [x for x in hasil["gelombang"] if x["tinggi"] or x["sangat_tinggi"] or x["ekstrem"]]
    print(f"peringatan.json: nowcast {len(hasil['nowcast'])} ({sum(x['aktif'] for x in hasil['nowcast'])} aktif), "
          f"gelombang {len(hasil['gelombang'])} wilayah ({len(g)} dengan kategori tinggi+); gagal {hasil['gagal']}; "
          f"{os.path.getsize(jalur) / 1024:.0f} KB", file=sys.stderr)


def uji():
    xml = b"""<?xml version="1.0" ?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2"><identifier>X1</identifier>
<sent>2026-10-13T00:30:00+07:00</sent><info><event>Hujan Lebat dan Petir</event><urgency>Immediate</urgency>
<severity>Moderate</severity><certainty>Observed</certainty><effective>2026-10-13T01:00:00+07:00</effective>
<expires>2026-10-13T03:00:00+07:00</expires><headline>Hujan Lebat di Jambi</headline>
<description>Hujan lebat akan terjadi di sebagian wilayah Jambi, khususnya di BATIN XXIV, MANDIANGIN.
 Kondisi ini berpotensi banjir lokal.</description><area><areaDesc>Jambi</areaDesc>
<polygon>-1.9,103.1 -2.0,103.2 -2.1,103.1 -1.9,103.1</polygon></area></info></alert>"""
    r = baca_cap(xml, None, dt.datetime(2026, 10, 13, 2, tzinfo=WIB))
    assert r["id"] == "X1" and r["aktif"] and r["prov"] == ["15"] and r["wilayah"] == "BATIN XXIV, MANDIANGIN", r
    assert r["polygon"][0][0] == [103.1, -1.9] and r["deskripsi"].endswith("MANDIANGIN."), r
    assert not baca_cap(xml, None, dt.datetime(2026, 10, 13, 4, tzinfo=WIB))["aktif"]
    assert kode_prov("NTB") == "52" and kode_prov("Jawa Tengah Bagian Timur") == "33" and kode_prov("Bangka Belitung") == "19"
    assert kode_prov("Kalimantan Tengah") == "62" and kode_prov("Indonesia") is None and kode_prov("Papua Barat Daya") == "96"
    print("ok peringatan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
