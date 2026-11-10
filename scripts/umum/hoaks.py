"""Hoaks bencana: RSS TurnBackHoax.id (MAFINDO) disaring kata kunci bencana dan label [SALAH]/[HOAKS]/dst.
-> public/data/hoaks_bencana.json   (judul, tautan, tanggal, kategori; BUKAN isi artikel). Berkas itu sendiri jadi arsip bergulir (maks 300 entri).
Umpan hanya memuat 10 butir terbaru tanpa tanggal terbit: tanggal diambil dari datePublished halaman artikel (butir baru saja), cadangan = tanggal lihat.
INDEKS jumlah klaim hoaks bencana per hari/jenis; pemakai: sinyal_sosial (pembanding lonjakan), bukan model.
Pakai: python3 scripts/umum/hoaks.py   |   python3 scripts/umum/hoaks.py uji
"""
import datetime as dt, html, importlib.util, json, os, re, sys, xml.etree.ElementTree as ET

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/hoaks_bencana.json")
RSS = "https://turnbackhoax.id/feed/"
MAKS = 300
KATEGORI = r"SALAH|HOAKS|HOAX|DISINFORMASI|MISINFORMASI|PENIPUAN|FITNAH|WASPADA|KLARIFIKASI"
JENIS = {"gempa": r"gempa", "tsunami": r"tsunami", "banjir": r"banjir", "longsor": r"longsor", "karhutla": r"karhutla|kebakaran (hutan|lahan)|kabut asap",
         "gunung api": r"gunung (api|merapi|semeru|ruang|lewotobi)|erupsi", "cuaca": r"cuaca|badai|angin (kencang|puting)|el nino|la nina|hujan es", "bencana": r"bencana|bnpb|bpbd|bmkg|pengungsi|korban jiwa|evakuasi"}


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def urai(xml):
    """-> butir bencana berkategori. Judul dibaca dari <title>; deskripsi (isi artikel) dibuang."""
    out = []
    for it in ET.fromstring(xml).iter("item"):
        judul = html.unescape(it.findtext("title") or "").strip()
        k = re.match(r"\[(" + KATEGORI + r")[^\]]*\]", judul, re.I)
        jenis = [j for j, p in JENIS.items() if re.search(r"\b(" + p + r")", judul, re.I)]
        if k and jenis and (it.findtext("link") or "").startswith("https://"):
            out.append({"judul": re.sub(r"^\[[^\]]*\]\s*", "", judul), "tautan": it.findtext("link"), "kategori": k.group(1).upper(), "jenis": jenis})
    return out


def tanggal_artikel(J, tautan, cadangan):
    try:
        m = re.search(rb'datePublished"\s*:\s*"(\d{4}-\d\d-\d\d)', J.ambil(tautan, mentah=True, jeda_host=1, coba=2))
        return m.group(1).decode() if m else cadangan
    except Exception:
        return cadangan


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    lama = json.load(open(OUT, encoding="utf-8"))["butir"] if os.path.exists(OUT) else []
    ada = {b["tautan"] for b in lama}
    hari = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date().isoformat()
    try:
        baru, status = urai(J.ambil(RSS, mentah=True, jeda_host=1)), "ok"
    except Exception as e:
        baru, status = [], f"gagal: {e}"
    baru = [b for b in baru if b["tautan"] not in ada]
    for b in baru:
        b["tanggal"] = tanggal_artikel(J, b["tautan"], hari)
    butir = sorted(lama + baru, key=lambda b: b["tanggal"], reverse=True)[:MAKS]
    simp(OUT, {"sumber": "TurnBackHoax.id (MAFINDO)", "atribusi": "MAFINDO, Masyarakat Anti Hoax Indonesia, https://turnbackhoax.id; hak cipta artikel pada penulisnya, hanya judul dan tautan disimpan",
               "lisensi": "Situs sumber tidak mencantumkan lisensi terbuka; hanya judul dan tautan, tanpa isi artikel", "jenis_keluaran": "INDEKS (hitungan klaim hoaks bencana, bukan model)",
               "akses": status, "catatan": "Umpan RSS hanya 10 butir terbaru; riwayat tumbuh dari akumulasi tiap jalan, jadi mulai kosong. Tanggal dari halaman artikel.",
               "ringkasan": {"butir": len(butir), "30_hari": sum(b["tanggal"] >= (dt.date.fromisoformat(hari) - dt.timedelta(days=30)).isoformat() for b in butir)}, "butir": butir})
    print(f"hoaks: {len(baru)} baru, total {len(butir)}; {status}")


def uji():
    x = """<rss><channel>
    <item><title>[SALAH] Video Banjir Bandang di Cianjur Hari Ini</title><link>https://a/1</link><description>isi panjang</description></item>
    <item><title>[HOAKS] Gempa Besar Megathrust Jawa Besok, BMKG Bantah</title><link>https://a/2</link></item>
    <item><title>[SALAH] Kapolri Copot Kapolda</title><link>http://a/3</link></item>
    <item><title>Banjir di Jakarta tanpa label</title><link>http://a/4</link></item></channel></rss>"""
    r = urai(x)
    assert [b["tautan"] for b in r] == ["https://a/1", "https://a/2"], r
    assert r[0]["jenis"] == ["banjir"] and r[1]["kategori"] == "HOAKS" and "gempa" in r[1]["jenis"] and "description" not in r[0], r
    print("uji hoaks: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
