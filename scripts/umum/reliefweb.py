"""#37: ReliefWeb -> kebutuhan kemanusiaan (hunian, pangan, air, kesehatan, sanitasi, pendidikan, uang tunai) per laporan Indonesia.
-> public/data/reliefweb.json   (INDEKS frekuensi kebutuhan; bukan model: label durasi tanggap darurat < 30 -> indeks, aturan #37)

Akses (diperiksa 29 Okt 2026):
  API v2 https://api.reliefweb.int/v2/reports?appname=...  -> 403 "not an approved appname" tanpa appname disetujui. v1 sudah 410.
  Kunci: env RELIEFWEB_APPNAME (belum ada => jalur API MENUNGGU KUNCI).
  Umpan RSS publik https://reliefweb.int/country/idn/rss.xml tetap terbuka (redirect 301; ~20 laporan terbaru) -> dipakai sebagai jalur cadangan
  dan DIAKUMULASI ke data/raw/reliefweb/arsip.json tiap jalan (riwayat tumbuh harian, ber-id tautan).
Rumus: kebutuhan k pada laporan r = ada kata kunci (leksikon bahasa Inggris, batas kata) di judul+deskripsi;
       frekuensi_k = laporan berkebutuhan k / laporan; indeks harian = jumlah laporan 30 hari terakhir.
Syarat pakai ReliefWeb: atribusi ke tiap sumber laporan (disimpan: sumber_laporan) dan ke ReliefWeb; tidak ada konten penuh disalin (hanya judul+tautan).
Pakai: python3 scripts/umum/reliefweb.py   |   python3 scripts/umum/reliefweb.py uji
"""
import datetime as dt, email.utils, html, importlib.util, json, os, re, sys, xml.etree.ElementTree as ET

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
ARSIP = os.path.join(AKAR, "data/raw/reliefweb/arsip.json")
RSS = "https://reliefweb.int/updates/rss.xml?legacy-river=country%2Fidn"  # tujuan redirect dari /country/idn/rss.xml (301 tanpa isi untuk UA kita)
LEKSIKON = {"hunian": r"shelter|housing|tents?|displaced|evacuat", "pangan": r"food|nutrition|hunger|rice", "air": r"water|wash|drinking",
            "sanitasi": r"sanitation|hygiene|latrine", "kesehatan": r"health|medical|hospital|disease|ispa|respiratory",
            "pendidikan": r"school|education|learning", "tunai": r"cash|livelihood|assistance voucher"}
JENIS = {"kebakaran hutan": r"forest and land fire|haze|wildfire", "banjir": r"flood", "gempa": r"earthquake", "gunung api": r"volcan|eruption",
         "longsor": r"landslide", "tsunami": r"tsunami", "kekeringan": r"drought"}


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def tandai(teks, leks):
    return [k for k, p in leks.items() if re.search(r"\b(" + p + r")", teks, re.I)]


def urai_rss(xml):
    out = []
    for it in ET.fromstring(xml).iter("item"):
        desk = html.unescape(it.findtext("description") or "")
        sumber = re.search(r'tag source">Source: ([^<]+)', desk)
        teks = re.sub(r"<[^>]+>", " ", desk)
        tgl = email.utils.parsedate_to_datetime(it.findtext("pubDate")).date().isoformat()
        out.append({"tautan": it.findtext("link"), "judul": (it.findtext("title") or "").strip(), "tanggal": tgl,
                    "sumber_laporan": sumber.group(1).strip() if sumber else None,
                    "kebutuhan": tandai(it.findtext("title") + " " + teks, LEKSIKON), "jenis": tandai(it.findtext("title") + " " + teks, JENIS)})
    return out


def dari_api(appname):
    J = _mod("jaring")
    body = json.dumps({"filter": {"field": "country.iso3", "value": "IDN"}, "limit": 100, "sort": ["date.created:desc"],
                       "fields": {"include": ["title", "date.created", "source.name", "body", "url_alias"]}}).encode()
    d = J.ambil(f"https://api.reliefweb.int/v2/reports?appname={appname}", data=body, kepala={"Content-Type": "application/json"}, jeda_host=1)
    out = []
    for x in d["data"]:
        f = x["fields"]; teks = f["title"] + " " + (f.get("body") or "")
        out.append({"tautan": f.get("url_alias") or x["href"], "judul": f["title"], "tanggal": f["date"]["created"][:10],
                    "sumber_laporan": (f.get("source") or [{}])[0].get("name"), "kebutuhan": tandai(teks, LEKSIKON), "jenis": tandai(teks, JENIS)})
    return out


def ringkas(arsip, hari_ini):
    n = len(arsip)
    frek = {k: round(sum(k in r["kebutuhan"] for r in arsip) / n, 3) if n else None for k in LEKSIKON}
    batas = (hari_ini - dt.timedelta(days=30)).isoformat()
    return {"laporan": n, "laporan_30_hari": sum(r["tanggal"] >= batas for r in arsip), "frekuensi_kebutuhan": frek}


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    app = os.environ.get("RELIEFWEB_APPNAME")
    arsip = json.load(open(ARSIP)) if os.path.exists(ARSIP) else {}
    status = "MENUNGGU KUNCI (RELIEFWEB_APPNAME); jalur cadangan RSS publik"
    try:
        baru = dari_api(app) if app else urai_rss(J.ambil(RSS, mentah=True, jeda_host=1))
        if app:
            status = "API v2"
    except Exception as e:
        baru, status = [], f"gagal: {e}"
    for r in baru:
        arsip[r["tautan"]] = r
    os.makedirs(os.path.dirname(ARSIP), exist_ok=True)
    json.dump(arsip, open(ARSIP, "w"), separators=(",", ":"))
    daftar = sorted(arsip.values(), key=lambda r: r["tanggal"], reverse=True)[:300]
    simp(os.path.join(AKAR, "public/data/reliefweb.json"), {
        "sumber": "ReliefWeb (OCHA) laporan Indonesia", "atribusi": "ReliefWeb, https://reliefweb.int; hak cipta tiap laporan pada sumber_laporan",
        "akses": status, "jenis_keluaran": "INDEKS (label durasi tanggap darurat tak tersedia; tidak ada model)",
        "catatan": "Kebutuhan = kata kunci Inggris di judul/deskripsi; frekuensi bukan ukuran kebutuhan riil. Riwayat tumbuh dari akumulasi RSS (~20 laporan/jalan) "
                   "sampai RELIEFWEB_APPNAME disetujui.",
        "ringkasan": ringkas(daftar, dt.date.today()), "laporan": [{k: r[k] for k in ("tanggal", "judul", "tautan", "sumber_laporan", "kebutuhan", "jenis")} for r in daftar]})
    print(f"reliefweb: {len(baru)} baru, arsip {len(arsip)}; {status}")


def uji():
    x = """<rss><channel><item><title>Flood update</title><link>http://a/1</link><pubDate>Tue, 27 Oct 2026 04:32:31 +0000</pubDate>
    <description>&lt;div class="tag source"&gt;Source: BNPB&lt;/div&gt;&lt;p&gt;Urgent need for shelter and clean water; schools closed&lt;/p&gt;</description></item></channel></rss>"""
    r = urai_rss(x)[0]
    assert r["tanggal"] == "2026-10-27" and r["sumber_laporan"] == "BNPB" and r["jenis"] == ["banjir"], r
    assert set(r["kebutuhan"]) == {"hunian", "air", "pendidikan"}, r["kebutuhan"]
    assert ringkas([r], dt.date(2026, 10, 29))["frekuensi_kebutuhan"]["air"] == 1.0
    print("uji reliefweb: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
