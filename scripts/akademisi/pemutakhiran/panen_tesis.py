"""Panen bulanan tesis, skripsi, dan disertasi kebencanaan dari repositori kampus lewat OAI-PMH (dijalankan direktori-bulanan.yml).

python3 -I scripts/akademisi/pemutakhiran/panen_tesis.py --panen <folder panen> --menit 15 [--hari 60]
python3 -I scripts/akademisi/pemutakhiran/panen_tesis.py --cek

Hanya rekaman yang berubah dalam --hari terakhir (argumen OAI `from`), lalu digabung ke <panen>/tesis_kebencanaan.json tanpa dobel
(kunci url, atau judul bila url kosong). Saringan di sini longgar (judul kebencanaan dan jenis karya akhir); saringan ketat dan
pencocokan kampus ada di tesisKampus (scripts/akademisi/sambung_panen.mjs). Repositori yang menolak (403/429) dilewati.
Panen awal penuh 1 Nov 2026 mencakup 17 kampus; daftar REPO di bawah hanya yang membuka OAI-PMH tanpa penolakan.
Sopan: UA jujur, satu pekerja per host, jeda 1 detik, batas waktu per host. Gagal = berkas lama dibiarkan.
"""
import argparse, concurrent.futures as cf, datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

UA = {"User-Agent": "Centurisk97-direktori/1.0 (panen tesis kebencanaan OAI-PMH; centurisk97.id)"}
REPO = {
    "Universitas Islam Negeri Sunan Kalijaga": "https://digilib.uin-suka.ac.id/cgi/oai2",
    "Universitas Andalas": "http://scholar.unand.ac.id/cgi/oai2",
    "Universitas Bengkulu": "http://repository.unib.ac.id/cgi/oai2",
    "Universitas Hasanuddin": "https://repository.unhas.ac.id/cgi/oai2",
    "Universitas Sumatera Utara": "https://repositori.usu.ac.id/oai/request",
    "Universitas Tadulako": "http://repository.untad.ac.id/cgi/oai2",
}
YA = re.compile(r"bencana|banjir|longsor|gempa|tsunami|erupsi|gunung ?api|lahar|kebakaran hutan|karhutla|mitigasi|kesiapsiagaan|evakuasi|tanggap darurat|pengungsi|rawan|abrasi|disaster|flood|landslide|earthquake|volcan|wildfire|hazard", re.I)
AKHIR = re.compile(r"thesis|tesis|skripsi|disertasi|dissertation", re.I)
JENJANG = [(re.compile(r"disertasi|doctoral|phd", re.I), "S3"), (re.compile(r"\btesis\b|masters|magister", re.I), "S2"), (re.compile(r"skripsi|undergraduate|bachelor|sarjana", re.I), "S1")]
RUMPUN = [("banjir", r"banjir|flood|genangan"), ("longsor", r"longsor|landslide|gerakan tanah"), ("gempa", r"gempa|earthquake|seismi"), ("tsunami", r"tsunami"),
          ("gunung api", r"gunung ?api|erupsi|lahar|volcan"), ("karhutla", r"kebakaran hutan|karhutla|wildfire|kebakaran lahan"), ("pesisir", r"abrasi|pesisir")]
NS = {"o": "http://www.openarchives.org/OAI/2.0/", "dc": "http://purl.org/dc/elements/1.1/", "od": "http://www.openarchives.org/OAI/2.0/oai_dc/"}


def baca_xml(b):
    """Repositori kampus sering mengirim XML cacat: xmlns:xsi dobel, karakter kendali, '&' telanjang, byte UTF-8 rusak."""
    b = re.sub(rb'(<[^>]*?xmlns:xsi="[^"]*"[^>]*?)\s+xmlns:xsi="[^"]*"', rb"\1", b)
    b = re.sub(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]", b"", b)
    b = re.sub(rb"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", b"&amp;", b)
    try:
        return ET.fromstring(b)
    except ET.ParseError:
        t = re.sub("[^\x09\x0a\x0d\x20-퟿-�\U00010000-\U0010ffff]", "", b.decode("utf-8", "replace"))
        return ET.fromstring(re.sub(r"^<\?xml[^>]*\?>", "", t.lstrip()))


def baris(rec, kampus, dasar, hari_ini):
    m = rec.find(".//od:dc", NS)
    if m is None:
        return None
    g = lambda t: [e.text.strip() for e in m.findall("dc:" + t, NS) if e.text and e.text.strip()]
    judul = re.sub(r"\s+", " ", (g("title") or [""])[0]).strip(); tipe = " ".join(g("type"))
    if not YA.search(judul) or not AKHIR.search(tipe + " " + " ".join(g("description"))[:400]):
        return None
    th = next((int(y) for d in g("date") for y in re.findall(r"\b(19[89]\d|20[0-3]\d)\b", d)), None)
    return {"judul": judul, "penulis": (g("creator") or [None])[0], "pembimbing": g("contributor")[:3], "tahun": th,
            "jenjang": next((j for r, j in JENJANG if r.search(tipe)), None), "kampus": kampus, "prodi": None,
            "url": next((i for i in g("identifier") if i.startswith("http")), None),
            "rumpun": [k for k, r in RUMPUN if re.search(r, judul, re.I)], "wilayah_teks": [], "sumber_url": dasar, "diperiksa": hari_ini}


def panen(kampus, dasar, dari, menit):
    t0, out, tok = time.time(), [], None
    q = {"verb": "ListRecords", "metadataPrefix": "oai_dc", "from": dari}
    while time.time() - t0 < menit * 60:
        url = dasar + "?" + urllib.parse.urlencode({"verb": "ListRecords", "resumptionToken": tok} if tok else q)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                x = baca_xml(r.read())
        except urllib.error.HTTPError as e:
            print(f"{kampus}: HTTP {e.code}, dilewati"); break
        except Exception as e:
            print(f"{kampus}: berhenti ({str(e)[:80]})"); break
        er = x.find("o:error", NS)
        if er is not None:
            break   # noRecordsMatch = tidak ada yang baru
        out += [b for b in (baris(r, kampus, dasar, datetime.date.today().isoformat()) for r in x.iterfind(".//o:record", NS)) if b]
        t = x.find(".//o:resumptionToken", NS); tok = t.text.strip() if t is not None and t.text and t.text.strip() else None
        if not tok:
            break
        time.sleep(1)
    print(f"{kampus}: {len(out)} tesis kebencanaan baru atau berubah")
    return out


def gabung(lama, baru):
    kunci = lambda r: r.get("url") or r["judul"]
    ada, hasil = {kunci(r) for r in lama}, list(lama)
    for r in baru:
        if kunci(r) not in ada:
            ada.add(kunci(r)); hasil.append(r)
    return hasil


def cek():
    x = baca_xml(b'<?xml version="1.0"?><OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="a" xmlns:xsi="a"><ListRecords><record><metadata>'
                 b'<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">'
                 b'<dc:title>Mitigasi banjir &amp; longsor\nKota Padang</dc:title><dc:type>Thesis</dc:type><dc:date>2024-02-01</dc:date>'
                 b'<dc:identifier>http://x/1</dc:identifier><dc:creator>A & B</dc:creator></oai_dc:dc></metadata></record></ListRecords></OAI-PMH>')
    b = [baris(r, "K", "u", "2026-11-01") for r in x.iterfind(".//o:record", NS)]
    assert b[0]["judul"] == "Mitigasi banjir & longsor Kota Padang" and b[0]["tahun"] == 2024 and b[0]["rumpun"] == ["banjir", "longsor"], b
    assert len(gabung([{"judul": "a", "url": "u1"}], [{"judul": "a", "url": "u1"}, {"judul": "b", "url": None}])) == 2
    print("panen_tesis: cek lulus")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--panen"); ap.add_argument("--menit", type=float, default=15); ap.add_argument("--hari", type=int, default=60); ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    if a.cek:
        cek(); sys.exit(0)
    dari = (datetime.date.today() - datetime.timedelta(days=a.hari)).isoformat()
    with cf.ThreadPoolExecutor(len(REPO)) as ex:
        baru = [r for f in [ex.submit(panen, k, u, dari, a.menit) for k, u in REPO.items()] for r in f.result()]
    p = os.path.join(a.panen, "tesis_kebencanaan.json")
    if not os.path.exists(p):
        print("tesis_kebencanaan.json lama tidak ada: tidak menulis apa pun"); sys.exit(0)
    lama = json.load(open(p))["baris"]; hasil = gabung(lama, baru)
    if len(hasil) > len(lama):
        json.dump({"baris": hasil}, open(p, "w"), ensure_ascii=False)
    print(f"tesis_kebencanaan: {len(lama)} lama, {len(hasil) - len(lama)} baru")
