"""#44 Arsip OpenAQ di AWS Open Data: PM2,5 per jam stasiun Indonesia multi-tahun -> data/raw/udara/openaq_arsip/<locationid>.json

Sumber : s3://openaq-data-archive (publik, tanpa kunci) lewat HTTPS: records/csv.gz/locationid=<id>/year=<y>/month=<m>/location-<id>-<yyyymmdd>.csv.gz
         Daftar lokasi Indonesia dari API v3 (/locations?iso=ID&parameters_id=2, butuh OPENAQ_KEY dari env atau .env; hanya variabel itu yang dibaca, tidak pernah ditulis).
Format : {"id","nama","penyedia","lat","lon","bulan_selesai":[...],"h":{"YYYY-MM-DDTHH" (UTC): ug/m3}}; nilai di luar 0..1000 dibuang.
         Stempel waktu arsip = penutup periode (jam 01:00 pada berkas tanggal itu); dipakai apa adanya lalu diubah ke UTC.
Sopan  : 16 utas (S3 publik), jeda kecil per permintaan; lanjutan otomatis (bulan yang sudah selesai dilewati; bulan berjalan selalu diunduh ulang).
Syarat : data OpenAQ berlisensi per penyedia; tampilkan atribusi "OpenAQ" dan penyedia. Mentah tidak di-commit (data/raw ignored).
Pakai  : python3 scripts/udara/openaq_arsip.py [mulai YYYY-MM]  |  uji
"""
import concurrent.futures as cf, datetime as dt, csv, gzip, io, json, os, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

S3 = "https://openaq-data-archive.s3.amazonaws.com/"
API = "https://api.openaq.org/v3/"
FOLDER = os.path.join(alat.RAW, "openaq_arsip")
MULAI_DEFAULT = "2022-08"   # CAMS Open-Meteo historis mulai 2022-07-29


def kunci_env():
    k = os.environ.get("OPENAQ_KEY")
    if k:
        return k
    for akar in (alat.AKAR, os.path.normpath(os.path.join(alat.AKAR, "..", "..", ".."))):   # worktree -> checkout utama
        p = os.path.join(akar, ".env")
        for b in open(p) if os.path.exists(p) else []:
            if b.startswith("OPENAQ_KEY="):
                return b.split("=", 1)[1].strip().strip("\"'")
    return None


def _get(url, headers=None, n=4):
    for i in range(n):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": alat.UA, **(headers or {})}), timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == n - 1:
                raise RuntimeError(f"GET gagal ({type(e).__name__}) {url.split('?')[0]}") from None
            time.sleep(2 ** (i + 1))


def lokasi_indonesia(kunci):
    """-> daftar lokasi PM2,5 Indonesia (dict ringkas). Memfilter yang 'indoor' dan tanpa riwayat."""
    out, hal = [], 1
    while True:
        d = json.loads(_get(API + "locations?" + urllib.parse.urlencode({"iso": "ID", "parameters_id": 2, "limit": 1000, "page": hal}), {"X-API-Key": kunci}))
        out += d["results"]
        if len(d["results"]) < 1000:
            break
        hal += 1
        time.sleep(1.1)
    hasil = []
    for L in out:
        c, a, z = L.get("coordinates") or {}, (L.get("datetimeFirst") or {}).get("utc"), (L.get("datetimeLast") or {}).get("utc")
        if not a or not z or c.get("latitude") is None or re.search(r"indoor", L.get("name") or "", re.I):
            continue
        hasil.append({"id": L["id"], "nama": L.get("name"), "penyedia": (L.get("provider") or {}).get("name"), "lat": c["latitude"], "lon": c["longitude"], "awal": a[:7], "akhir": z[:7]})
    return hasil


def bulan_antara(a, b):
    y, m = int(a[:4]), int(a[5:7])
    while f"{y:04d}-{m:02d}" <= b:
        yield f"{y:04d}-{m:02d}"
        m += 1
        if m > 12:
            y, m = y + 1, 1


def kunci_s3(lid, ym):
    """Daftar kunci berkas harian satu lokasi-bulan (ListObjectsV2, paginasi)."""
    pre = f"records/csv.gz/locationid={lid}/year={ym[:4]}/month={ym[5:7]}/"
    out, tok = [], None
    while True:
        q = {"list-type": 2, "prefix": pre, **({"continuation-token": tok} if tok else {})}
        r = ET.fromstring(_get(S3 + "?" + urllib.parse.urlencode(q)))
        ns = {"s": "http://s3.amazonaws.com/doc/2006-03-01/"}
        out += [e.text for e in r.findall("s:Contents/s:Key", ns)]
        tok = r.findtext("s:NextContinuationToken", namespaces=ns)
        if not tok:
            return out


def urai_csv(teks):
    """CSV arsip -> {'YYYY-MM-DDTHH' UTC: ug/m3} hanya parameter pm25 bernilai 0..1000."""
    out = {}
    for r in csv.DictReader(io.StringIO(teks)):
        if r.get("parameter") != "pm25":
            continue
        try:
            v = float(r["value"])
            t = dt.datetime.fromisoformat(r["datetime"]).astimezone(dt.timezone.utc)
        except (ValueError, KeyError):
            continue
        if 0 <= v <= 1000:
            out[t.strftime("%Y-%m-%dT%H")] = round(v, 2)
    return out


def _berkas(key):
    time.sleep(0.05)
    return urai_csv(gzip.decompress(_get(S3 + urllib.parse.quote(key))).decode("utf-8", "replace"))


def tarik_lokasi(L, mulai, kolam):
    jalur = os.path.join(FOLDER, f"{L['id']}.json")
    d = json.load(open(jalur)) if os.path.exists(jalur) else {"h": {}, "bulan_selesai": []}
    d.update({k: L[k] for k in ("id", "nama", "penyedia", "lat", "lon")})
    ini = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")
    for ym in bulan_antara(max(L["awal"], mulai), L["akhir"]):
        if ym in d["bulan_selesai"] and ym != ini:
            continue
        for h in kolam.map(_berkas, kunci_s3(L["id"], ym)):
            d["h"].update(h)
        if ym not in d["bulan_selesai"]:
            d["bulan_selesai"].append(ym)
        os.makedirs(FOLDER, exist_ok=True)
        json.dump(d, open(jalur + ".tmp", "w"), separators=(",", ":"))
        os.replace(jalur + ".tmp", jalur)
    return d


def jalankan(mulai=MULAI_DEFAULT, urutan=""):
    kunci = kunci_env()
    if not kunci:
        sys.exit("OPENAQ_KEY tidak ada (env atau .env)")
    daftar = [L for L in lokasi_indonesia(kunci) if L["akhir"] >= mulai]
    if urutan == "balik":   # proses kedua dari ujung lain (ponytail: berpapasan di tengah menulis berkas yang sama, aman karena lanjutan)
        daftar.reverse()
    print(f"{len(daftar)} lokasi PM2,5 Indonesia aktif sejak {mulai}")
    with cf.ThreadPoolExecutor(16) as kolam:
        for L in daftar:
            d = tarik_lokasi(L, mulai, kolam)
            print(f"  {L['id']} {str(L['nama'])[:28]:28} {L['penyedia'] or '':18} {len(d['h']):6} jam", flush=True)


def uji():
    t = ('"location_id","sensors_id","location","datetime","lat","lon","parameter","units","value"\n'
         '1,2,"X","2025-10-01T01:00:00+07:00","-6","106","pm25","u","35.5"\n'
         '1,2,"X","2025-10-01T02:00:00+07:00","-6","106","pm25","u","-9"\n'
         '1,2,"X","2025-10-01T03:00:00+07:00","-6","106","no2","u","5"\n'
         '1,2,"X","2025-10-01T04:00:00+07:00","-6","106","pm25","u","abc"\n')
    assert urai_csv(t) == {"2025-09-30T18": 35.5}, urai_csv(t)
    assert list(bulan_antara("2025-11", "2026-02")) == ["2025-11", "2025-12", "2026-01", "2026-02"]
    print("openaq_arsip uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        jalankan(*sys.argv[1:3])
