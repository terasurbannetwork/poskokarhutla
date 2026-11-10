"""Prakiraan Cuaca Indonesia Sepekan (BMKG) -> public/banjir/data/cuaca_sepekan.json (terbaru) + cuaca_sepekan_arsip.json (append-only per slug).

Daftar: https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan (__NUXT_DATA__, 12 artikel terbaru; ?page=2 sama, jadi arsip dimulai dari 12).
Detail: .../potensi-hujan-sepekan/{slug} (__NUXT_DATA__ -> {title, date, author, excerpt, content HTML}). Hanya slug yang belum diarsip diambil, jeda 2 detik.
Teks saja (HTML dibersihkan, iframe/PDF dibuang). Bagian yang tak terbaca = null dan tercatat di `gagal` artikel itu. Daftar provinsi -> kode BPS
lewat factsheet.daftar_prov; nama yang tak cocok masuk `tak_dikenal`. Label tingkat disimpan persis seperti tertulis.
Pakai: python3 scripts/cuaca/sepekan.py | ... uji
"""
import datetime as dt, html as H, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, WIB, baca, simpan
from factsheet import BULAN, NAMA, POLA_PROV, daftar_prov
from bmkg_kab10 import nuxt_semua, unduh

DAFTAR = "https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan"
TERBARU = os.path.join(KELUAR, "cuaca_sepekan.json")
ARSIP = os.path.join(KELUAR, "cuaca_sepekan_arsip.json")
JEDA = 2.0
TGL = r"(\d{1,2})(?:\s+([A-Za-z]+))?\s*[–—-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})"


def teks_html(h):
    h = re.sub(r"(?is)<(iframe|script|style).*?</\1>", "", h)
    h = re.sub(r"(?i)<br\s*/?>", "\n", h)
    h = re.sub(r"(?i)</p>|</h\d>|</ul>", "\n\n", h)
    h = re.sub(r"(?i)<li[^>]*>", "\n- ", h)
    h = H.unescape(re.sub(r"<[^>]+>", "", h)).replace("\xa0", " ")
    h = re.sub(r"[ \t]+", " ", h)
    return re.sub(r"\n{3,}", "\n\n", re.sub(r" ?\n ?", "\n", h)).strip()


def periode(s):
    m = re.search(TGL, s or "")
    if not m or not BULAN.get(m.group(4)):
        return None
    mb = BULAN[m.group(4)]
    ab = BULAN.get(m.group(2)) if m.group(2) else mb
    if not ab:
        return None
    th = int(m.group(5))
    try:
        return {"dari": dt.date(th - (1 if ab > mb else 0), ab, int(m.group(1))).isoformat(), "sampai": dt.date(th, mb, int(m.group(3))).isoformat()}
    except ValueError:
        return None


def prov_dan_sisa(t):
    bagian = [x.strip() for x in re.split(r",|\bdan\b", t.rstrip(". ")) if x.strip()]
    return daftar_prov(t), [b for b in bagian if not POLA_PROV.search(b)]


def pengamatan(t):
    """'<Provinsi> [sebesar|(] N mm/hari' -> [{kode_prov, prov, mm}] dalam urutan tulis."""
    out = []
    for m in POLA_PROV.finditer(t):
        s = re.match(r"\s*(?:sebesar\s+|\(\s*)?(\d+(?:[.,]\d+)?)\s*mm/hari", t[m.end():])
        if s:
            out.append({"kode_prov": NAMA[m.group(0)], "prov": m.group(0), "mm": float(s.group(1).replace(",", "."))})
    return out


def blok_periode(t):
    out = []
    ms = list(re.finditer(r"(?m)^\s*Periode\s+" + TGL, t))
    for i, m in enumerate(ms):
        b = t[m.start(): ms[i + 1].start() if i + 1 < len(ms) else len(t)]
        b = re.split(r"(?m)^\s*Imbauan\s*$", b)[0]
        sed = re.search(r"intensitas sedang yang terjadi di (.*?)\.\s*(?:\n|$)", b, re.S)
        tk = []
        for l in re.finditer(r"(?m)^- ([^:\n]+?):\s*(.*?)\s*$", b):
            kode, tak = prov_dan_sisa(l.group(2))
            tk.append({"label": l.group(1).strip(), "tingkat": l.group(1).split()[0], "teks": l.group(2).strip(), "kode_prov": kode, "tak_dikenal": tak})
        e = {"periode": periode(m.group(0)), "sedang_kode_prov": None, "sedang_tak_dikenal": None, "tingkat": tk}
        if sed:
            e["sedang_kode_prov"], e["sedang_tak_dikenal"] = prov_dan_sisa(re.sub(r"\s+", " ", sed.group(1)))
        out.append(e)
    return out


def paragraf_setelah(t, kepala, berhenti):
    m = re.search(r"(?m)^\s*" + kepala + r"[^\n]*$", t)
    if not m:
        return None
    sisa = t[m.end():]
    b = re.search(r"(?m)^\s*(?:" + berhenti + r")", sisa)
    return re.sub(r"\n+", " ", sisa[:b.start()] if b else sisa).strip() or None


def urai(item, detail):
    """item = entri daftar {date,title,slug}; detail = {title,date,author,content}. Bagian tak terbaca null + `gagal`."""
    t = teks_html(detail["content"])
    gagal = {}

    def ambil(nama, fn):
        try:
            v = fn()
            if v in (None, [], ""):
                raise ValueError("tak ditemukan")
            return v
        except Exception as x:
            gagal[nama] = f"{type(x).__name__} {x}"
    ob = re.search(r"periode\s+" + TGL, t)
    a = {"slug": item["slug"], "judul": re.sub(r"\s+", " ", detail.get("title") or item["title"]), "terbit": detail.get("date") or item["date"], "penulis": detail.get("author"),
         "periode": ambil("periode", lambda: periode(item["title"])),
         "pengamatan_periode": ambil("pengamatan_periode", lambda: periode(ob.group(0)) if ob else None),
         "pengamatan_mm_hari": ambil("pengamatan_mm_hari", lambda: pengamatan(t)),
         "dinamika_atmosfer": ambil("dinamika_atmosfer", lambda: paragraf_setelah(t, r"Dinamika Atmosfer", r"Potensi Hujan Sepekan|Periode\s")),
         "prakiraan": ambil("prakiraan", lambda: blok_periode(t)),
         "imbauan": ambil("imbauan", lambda: paragraf_setelah(t, r"Imbauan", r"Catatan:|Jakarta,"))}
    pb = re.search(r"pembaruan tanggal (\d{1,2}) ([A-Za-z]+) (\d{4}),? (\d{1,2})[.:](\d{2}) WIB", t)
    a["diperbarui"] = ambil("diperbarui", lambda: dt.datetime(int(pb.group(3)), BULAN[pb.group(2)], int(pb.group(1)), int(pb.group(4)), int(pb.group(5))).isoformat() + "+07:00" if pb else None)
    a["gagal"] = gagal
    return a


def main():
    sekarang = dt.datetime.now(WIB).isoformat(timespec="minutes")
    arsip = baca(ARSIP) or {"versi": 1, "sumber": "BMKG potensi-hujan-sepekan; entri tidak diubah sesudah terbit", "artikel": {}}
    daftar = [x for x in nuxt_semua(unduh(DAFTAR)) if isinstance(x, list) and x and all(isinstance(i, dict) and "slug" in i for i in x)]
    if not daftar:
        raise RuntimeError("daftar artikel tak terbaca: berkas lama dibiarkan")
    baru, gagal = 0, []
    for it in max(daftar, key=len):
        if it["slug"] in arsip["artikel"]:
            continue
        time.sleep(JEDA)
        try:
            d = next(v for v in nuxt_semua(unduh(f"{DAFTAR}/{it['slug']}")) if isinstance(v, dict) and "content" in v)
            arsip["artikel"][it["slug"]] = urai(it, d)
            baru += 1
        except Exception as x:
            gagal.append(it["slug"])
            print(f"sepekan {it['slug'][:60]}: {type(x).__name__} {x}", file=sys.stderr)
    if baru:
        simpan(ARSIP, arsip)
    if not arsip["artikel"]:
        raise RuntimeError("arsip kosong")
    terbaru = max(arsip["artikel"].values(), key=lambda a: a["terbit"])
    simpan(TERBARU, {"dibuat": sekarang, "sumber": "BMKG Prakiraan Cuaca Indonesia Sepekan (www.bmkg.go.id)", "n_arsip": len(arsip["artikel"]), "slug_gagal": gagal, "artikel": terbaru})
    print(f"sepekan: {baru} artikel baru, arsip {len(arsip['artikel'])}, gagal {len(gagal)}, terbaru '{terbaru['terbit']}'", file=sys.stderr)


CONTOH = """<p><strong>Waspada</strong></p>
<p>Berdasarkan hasil pengamatan pada periode 5&#8211;7 November 2026, hujan lebat tercatat, tertinggi di Bengkulu sebesar 150 mm/hari, Aceh 140 mm/hari, dan Jawa Timur (300 mm/hari).</p>
<p><strong>Dinamika Atmosfer Sepekan ke Depan</strong></p>
<p>MJO fase 2 mendukung awan hujan.</p>
<p><strong>Potensi Hujan Sepekan ke Depan</strong><br />
<strong>Periode 10 &#8211; 12 November 2026</strong></p>
<p>Perlu diwaspadai adanya peningkatan hujan dengan intensitas sedang yang terjadi di Riau, Kep. Riau, Yogyakarta, dan Papua Selatan.</p>
<ul>
<li>Awas (hujan sangat lebat &#8211; ekstrem): Sumatera Utara.</li>
<li>Siaga (hujan lebat): Aceh, Sumatera Barat, dan Papua Barat Daya.</li>
<li>Angin Kencang: Kep. Riau dan Wilayah Aneh.</li>
</ul>
<p>Periode 13 &#8211; 16 November 2026</p>
<p>Peningkatan hujan dengan intensitas sedang yang terjadi di Aceh dan Jambi.</p>
<ul><li>Siaga (hujan lebat): Papua Pegunungan.</li></ul>
<p><strong>Imbauan</strong></p>
<p>Masyarakat diimbau waspada.</p>
<p>Catatan:<br />Informasi ini telah melalui proses penyuntingan dan pembaruan tanggal 9 November 2026, 16.00 WIB.</p>
<p><iframe src="x"></iframe></p>"""


def uji():
    a = urai({"slug": "s", "title": "Prakiraan Cuaca Indonesia Sepekan Periode 30 Oktober – 5 November 2026: X", "date": "2026-11-10 07:47:23"}, {"content": CONTOH, "author": "A", "date": "2026-11-10 07:47:23"})
    assert a["periode"] == {"dari": "2026-10-30", "sampai": "2026-11-05"}, a["periode"]
    assert a["pengamatan_periode"] == {"dari": "2026-11-05", "sampai": "2026-11-07"}, a["pengamatan_periode"]
    assert [(x["kode_prov"], x["mm"]) for x in a["pengamatan_mm_hari"]] == [("17", 150.0), ("11", 140.0), ("35", 300.0)], a["pengamatan_mm_hari"]
    assert a["dinamika_atmosfer"] == "MJO fase 2 mendukung awan hujan.", a["dinamika_atmosfer"]
    p = a["prakiraan"]
    assert [x["periode"] for x in p] == [{"dari": "2026-11-10", "sampai": "2026-11-12"}, {"dari": "2026-11-13", "sampai": "2026-11-16"}], p
    assert p[0]["sedang_kode_prov"] == ["14", "21", "34", "93"], p[0]
    assert [(t["label"], t["tingkat"], t["kode_prov"]) for t in p[0]["tingkat"]] == [("Awas (hujan sangat lebat – ekstrem)", "Awas", ["12"]), ("Siaga (hujan lebat)", "Siaga", ["11", "13", "96"]), ("Angin Kencang", "Angin", ["21"])], p[0]["tingkat"]
    assert p[0]["tingkat"][2]["tak_dikenal"] == ["Wilayah Aneh"]
    assert p[1]["tingkat"][0]["kode_prov"] == ["95"] and p[1]["sedang_kode_prov"] == ["11", "15"], p[1]
    assert a["imbauan"] == "Masyarakat diimbau waspada." and a["diperbarui"] == "2026-11-09T16:00:00+07:00" and a["gagal"] == {}, a["gagal"]
    k = urai({"slug": "t", "title": "Judul tanpa periode", "date": "2026-10-01 00:00:00"}, {"content": "<p>Isi lain.</p>"})
    assert k["periode"] is None and k["prakiraan"] is None and "prakiraan" in k["gagal"] and k["imbauan"] is None
    print("uji sepekan ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
