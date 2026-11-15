#!/usr/bin/env python3
"""Penulis keluaran renlap yang dipakai semua bencana: teks WA, KML, GPX, dan PDF (lewat Chrome tanpa kepala).
Diekstrak dari scripts/operasi/renlap.py (teks, _alasan) dan renlap_pdf.py (cari_chrome, dokumen/ke_pdf) tanpa mengubah isinya;
KML dan GPX baru (karhutla belum punya), pola dari renlap_banjir.py. Python stdlib saja. PB-13.

  python3 -I scripts/umum/renlap_keluaran.py uji
"""
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime

BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
_LARANG = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")  # karakter kontrol yang haram di XML 1.0


def xml(s):
    """Pembersih teks untuk KML/GPX: buang karakter kontrol, escape & < > " '. Hasilnya aman di elemen dan atribut,
    termasuk bila nama memuat ']]>' (tanda CDATA tak pernah dipakai, jadi tak ada yang bisa ditutup paksa)."""
    s = _LARANG.sub("", str(s if s is not None else ""))
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


def _alasan(c):
    a, o = c["alasan"], []
    if a.get("hipotesis"):  # skor generik (renlap.py skor_generik): fitur yang ada, yang kosong disebut, label hipotesis
        o += ["%s %s" % (f.replace("_", " "), str(v).replace(".", ",")) for f, v in a.items() if f not in ("tanpa_data", "hipotesis")]
        if a.get("tanpa_data"):
            o.append("tanpa data: " + ", ".join(f.replace("_", " ") for f in a["tanpa_data"]))
        o.append("skor hipotesis, belum diuji balik")
    elif "titik_baru" in a:
        o.append("%d titik baru lintasan terakhir" % a["titik_baru"] if a["titik_baru"] else "tanpa titik baru")
        if a["menahun_hari"] > 1:
            o.append("menahun %d hari" % a["menahun_hari"])
        if a.get("gambut"):
            o.append("gambut")
        if "ffmc" in a and not a.get("ffmc_basi"):
            o.append("FFMC %s" % a["ffmc"])
        if "permukiman_km" in a:
            o.append("permukiman %s km" % a["permukiman_km"])
        o.append("belum ada temuan 48 jam" if a.get("belum_ditangani") else "sudah ada temuan 48 jam")
        if a.get("clear_lalu_titik_baru"):
            o.append("sempat clear, ada titik baru")
    else:
        o.append("temuan %s%s%s" % (a["temuan"], " oleh " + a["oleh"] if a.get("oleh") else "",
                                    ", laporan menyebut " + a["lokasi_laporan"] if a.get("lokasi_laporan") else ""))
        if a.get("luas_klaim_ha"):
            o.append("klaim %s ha" % a["luas_klaim_ha"])
        o.append("jarak sumber air: tidak tersedia")
    return "; ".join(o)


def teks(r):
    t = datetime.fromisoformat(r["tanggal"])
    judul = "%d %s %d" % (t.day, BULAN[t.month - 1], t.year)
    out = []
    for b in r["base"]:
        L = ["USULAN TARGET, Base %s %s, operasi %s (versi %s)" % (b["id"], b["nama"], judul, r["versi"]),
             "Usulan lokasi untuk dilihat, bukan perintah terbang. Keputusan terbang pada PIC dan komando.", ""]
        for judul2, kunci in (("TARGET PATROLI (berurut dari base)", "patroli"), ("TARGET WATER BOMBING (FS terkonfirmasi)", "wb")):
            L.append(judul2)
            if not b[kunci]:
                L.append("  tidak ada usulan")
            for c in b[kunci]:
                L += ["%d. %s" % (c["urut"], c["tempat"] or "(nama wilayah tidak tersedia)"), "   " + c["dms"], "   " + c["rd"],
                      "   Alasan: " + _alasan(c)]
                if "terakhir" in c:
                    L.append("   Titik panas terakhir: %s WIB, %s" % (c["terakhir"]["jam_wib"], c["terakhir"]["satelit"]))
                u = c["udara"]
                L.append("   Udara pagi (06-10 WIB): " + ("PM2,5 prakiraan maks %s ug/m3 (%s); jarak pandang tidak tersedia" % (u["pm25_maks"], u["kab"])
                                                       if isinstance(u, dict) else "tidak tersedia"))
            if kunci == "patroli" and b.get("di_luar_rute"):
                L.append("  Titik panas di luar radius pandang semua target: %d titik di %d sel" % (b["di_luar_rute"]["titik"], b["di_luar_rute"]["sel"]))
            L.append("")
        L.append("Kaki: radial = baringan benar dikurangi deklinasi timur %s derajat (PERKIRAAN tetap, bukan WMM); jelajah %d Nm. Titik panas: %s. FFMC: %s. Skor hipotesis."
                 % (b["deklinasi_timur"], b["radius_nm"], r["sumber"]["titik_panas"], r["sumber"]["ffmc"]))
        out.append("\n".join(L))
    return ("\n\n" + "=" * 40 + "\n\n").join(out) + "\n"


def _k(v):
    """koordinat wajib angka (bukan bool/teks): mencegah sisipan XML lewat lat/lon dari masukan JSON"""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise ValueError("koordinat harus angka: %r" % (v,))
    return repr(float(v))


CATATAN = "Usulan lokasi untuk dilihat, bukan perintah terbang. Skor hipotesis."


def _rute(b):
    return [b] + list(b.get("patroli") or []) + list(b.get("wb") or []) + [b]


def kml(base, nama):
    """base = daftar {id, nama, lat, lon, patroli:[{urut, lat, lon, tempat}], wb:[...]} (bentuk keluaran susun)."""
    pm = []
    for b in base:
        pm.append("<Placemark><name>Base %s</name><Point><coordinates>%s,%s,0</coordinates></Point></Placemark>" % (xml(b["nama"]), _k(b["lon"]), _k(b["lat"])))
        for jenis, awal in (("patroli", "CP"), ("wb", "WB")):
            for c in b.get(jenis) or []:
                pm.append("<Placemark><name>%s</name><description>%s</description><Point><coordinates>%s,%s,0</coordinates></Point></Placemark>"
                          % (xml("%s %s%s" % (b["id"], awal, c["urut"])), xml(c.get("tempat") or ""), _k(c["lon"]), _k(c["lat"])))
        jalur = " ".join("%s,%s,0" % (_k(p["lon"]), _k(p["lat"])) for p in _rute(b))
        pm.append("<Placemark><name>%s</name><LineString><coordinates>%s</coordinates></LineString></Placemark>" % (xml("Rute " + b["id"]), jalur))
    return ('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>%s</name><description>%s</description>%s</Document></kml>'
            % (xml(nama), xml(CATATAN), "".join(pm)))


def gpx(base, nama):
    wpt, rte = [], []
    for b in base:
        wpt.append('<wpt lat="%s" lon="%s"><name>%s</name></wpt>' % (_k(b["lat"]), _k(b["lon"]), xml(b["id"])))
        for jenis, awal in (("patroli", "CP"), ("wb", "WB")):
            for c in b.get(jenis) or []:
                wpt.append('<wpt lat="%s" lon="%s"><name>%s</name><desc>%s</desc></wpt>'
                           % (_k(c["lat"]), _k(c["lon"]), xml("%s-%s%s" % (b["id"], awal, c["urut"])), xml(c.get("tempat") or "")))
        pts = "".join('<rtept lat="%s" lon="%s"><name>%s</name></rtept>'
                      % (_k(p["lat"]), _k(p["lon"]), xml(b["id"] if p is b else "%s-%s%s" % (b["id"], "WB" if p in (b.get("wb") or []) else "CP", p["urut"])))
                      for p in _rute(b))
        rte.append("<rte><name>%s</name>%s</rte>" % (xml(b["id"] + " renlap"), pts))
    return ('<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Centurisk97" xmlns="http://www.topografix.com/GPX/1/1">'
            "<metadata><name>%s</name><desc>%s</desc></metadata>%s%s</gpx>" % (xml(nama), xml(CATATAN), "".join(wpt), "".join(rte)))


def cari_chrome():
    for c in (os.environ.get("CHROME"), "google-chrome", "google-chrome-stable", "chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if c and (shutil.which(c) or os.path.exists(c)):
            return shutil.which(c) or c
    raise RuntimeError("Chrome tidak ditemukan (set CHROME)")


def dokumen(judul, isi, css):
    """HTML satu berkas siap cetak (judul di-escape oleh pemanggil)."""
    return f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{judul}</title><style>{css}</style></head><body>{isi}</body></html>'


def ke_pdf(chrome, berkas_html, pdf):
    subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=10000",
                    f"--print-to-pdf={pdf}", berkas_html.as_uri()], check=True, capture_output=True, timeout=600)


def uji():
    assert xml('a]]>b&<"\'\x07') == "a]]&gt;b&amp;&lt;&quot;&apos;"
    from xml.etree import ElementTree as ET
    base = [{"id": "X]]>", "nama": 'Pangkalan <&"]]>', "lat": -1.5, "lon": 110.25,
             "patroli": [{"urut": 1, "lat": -1.6, "lon": 110.3, "tempat": "Desa ]]> & <b>"}],
             "wb": [{"urut": 1, "lat": -1.7, "lon": 110.4, "tempat": None}]}]
    k, g = ET.fromstring(kml(base, "n]]>&")), ET.fromstring(gpx(base, "n]]>&"))
    assert len(k.findall(".//{*}Placemark")) == 4 and len(g.findall(".//{*}wpt")) == 3 and len(g.findall(".//{*}rtept")) == 4
    assert k.find(".//{*}Document/{*}name").text == "n]]>&" and "WB1" in ET.tostring(g, encoding="unicode")
    assert "bukan perintah terbang" in k.find(".//{*}Document/{*}description").text and "hipotesis" in g.find(".//{*}metadata/{*}desc").text
    for jahat in ('1"><x/>', True, None):  # koordinat bukan angka ditolak, tidak disisipkan ke XML
        try:
            gpx([dict(base[0], lat=jahat)], "n")
            raise AssertionError(jahat)
        except ValueError:
            pass
    t = _alasan({"alasan": {"tingkat": 1, "baru": 0.5, "tanpa_data": ["paparan"], "hipotesis": True}})
    assert t == "tingkat 1; baru 0,5; tanpa data: paparan; skor hipotesis, belum diuji balik", t
    d = dokumen("J", "<p>i</p>", "p{}")
    assert d.startswith("<!doctype html>") and d.endswith("</body></html>")
    print("renlap_keluaran: lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
