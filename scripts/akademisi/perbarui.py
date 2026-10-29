#!/usr/bin/env python3
"""Pembaruan bulanan direktori pakar /akademisi (R2 poskokarhutla-foto, akademisi/induk.json).

DATA TIDAK PERNAH MASUK REPO: skrip ini hanya kode. Induk diunduh dari R2, diperbarui, diunggah lagi.

Yang dikerjakan
  (a) Pakar lama: h-index, jumlah karya, sitasi, dan topik disegarkan dari OpenAlex per id (batch 100).
      Nama, kampus, rumpun, ORCID, kolom SINTA (foto, idSinta, prodi, subjek, status, logo) dan kolom ke-16
      TIDAK disentuh: kolom SINTA dipanen lewat peramban dan tidak bisa diulang di CI.
      Id yang hilang di OpenAlex (digabung/dihapus) TIDAK dibuang: barisnya tetap dan dilaporkan.
  (b) Pakar baru: penulis OpenAlex dengan institusi terakhir berkode negara ID (last_known_institutions.country_code:ID),
      karya >= 3, dan punya topik di DAFTAR TOPIK BENCANA di bawah (disusun dari topik yang paling sering muncul pada
      pakar yang sudah ada; nama dipetakan ke id topik OpenAlex saat jalan). Kolom SINTA kosong.
      Rumpun baru = rumpun mayoritas tiap topik pada induk yang ada (kebetulan data lama adalah satu-satunya
      rujukan pemetaan topik ke rumpun; dokumen RENCANA tidak memuatnya). Topik tak dikenal -> "manajemen bencana".
      Saringan asli (kata kunci judul/abstrak per kabupaten) tidak ada di repo, jadi ini pendekatan terdekat.
  ponytail: kandidat diurut sitasi, dipindai sampai --maks-kandidat (30000); pakar baru berkutipan sangat rendah di
  luar batas itu tidak terlihat. Naikkan batas bila perlu.

Keluaran: induk.json baru (diperbarui, baru_bulan_ini), akademisi/baru/YYYY-MM.json, cadangan induk lama di
akademisi/cadangan/induk-YYYY-MM-DD.json. --dry-run menulis ke folder lokal saja (tanpa unggah).
Env: OPENALEX_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (wrangler). Uji offline: uji_perbarui.py.
"""
import argparse, collections, datetime, json, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.parse, urllib.request

UA = "Centurisk97-BNPB-direktori/1.0 (mailto:terasurbannetwork@gmail.com)"
BUCKET = "poskokarhutla-foto"
API = "https://api.openalex.org"
JEDA = 0.22  # <= 5 req/dtk
TOPIK_BENCANA = [
    "Disaster Management and Resilience", "Disaster Response and Management", "Earthquake and Disaster Impact Studies",
    "Flood Risk Assessment and Management", "Urban Stormwater Management Solutions", "Hydrology and Drought Analysis",
    "Hydrology and Watershed Management Studies", "Hydrological Forecasting Using AI", "Landslides and related hazards",
    "earthquake and tectonic studies", "Seismology and Earthquake Studies", "Earthquake and Tsunami Effects",
    "Earthquake Detection and Analysis", "Seismic Performance and Analysis", "Seismic Waves and Analysis",
    "Seismic Imaging and Inversion Techniques", "Seismic and Structural Analysis of Tall Buildings",
    "Coastal Management and Development", "Coastal and Marine Dynamics", "Coastal wetland ecosystem dynamics",
    "Soil erosion and sediment transport", "Hydrology and Sediment Transport Processes", "Peatlands and Wetlands Ecology",
    "Fire effects on ecosystems", "Climate variability and models", "Tropical and Extratropical Cyclones Research",
    "Infrastructure Resilience and Vulnerability Analysis", "Climate Change and Health Impacts",
]


def tunggu(state={"t": 0.0}):
    d = JEDA - (time.time() - state["t"])
    if d > 0:
        time.sleep(d)
    state["t"] = time.time()


def ambil(path, params, kunci, coba=5):
    p = dict(params)
    if kunci:
        p["api_key"] = kunci
    url = API + path + "?" + urllib.parse.urlencode(p, safe=":,|")
    for i in range(coba):
        tunggu()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or i == coba - 1:
                raise
        except (urllib.error.URLError, TimeoutError):
            if i == coba - 1:
                raise
        time.sleep(2 ** i * 2)


def pendek(i):
    return (i or "").rsplit("/", 1)[-1]


def segarkan(ids, kunci):
    """id -> {h, karya, sitasi, topik, nama, orcid, kampus} untuk id yang masih ada di OpenAlex."""
    hasil = {}
    for i in range(0, len(ids), 100):
        d = ambil("/authors", {"filter": "ids.openalex:" + "|".join(ids[i:i + 100]), "per_page": 100, "select": SEL}, kunci)
        for a in d["results"]:
            hasil[pendek(a["id"])] = ringkas(a)
    return hasil


SEL = "id,display_name,orcid,works_count,cited_by_count,summary_stats,topics,last_known_institutions"


def ringkas(a):
    inst = (a.get("last_known_institutions") or [{}])
    return {"h": (a.get("summary_stats") or {}).get("h_index") or 0, "karya": a.get("works_count") or 0,
            "sitasi": a.get("cited_by_count") or 0, "nama": a.get("display_name") or "",
            "orcid": pendek(a.get("orcid")), "kampus": (inst[0] or {}).get("display_name") or "Afiliasi belum diketahui",
            "topik": [t["display_name"] for t in (a.get("topics") or [])[:4]]}


def peta_topik(induk):
    """topik -> {rumpun: porsi}, dari mayoritas pada pakar yang ada."""
    c = collections.defaultdict(collections.Counter)
    for o in induk["orang"]:
        for t in o[8]:
            for r in o[3]:
                c[t][r] += 1
    return {t: {r: n / sum(k.values()) for r, n in k.items()} for t, k in c.items()}


def rumpun_untuk(topik, peta):
    s = collections.Counter()
    for t in topik:
        for r, p in (peta.get(t) or {}).items():
            s[r] += p
    if not s:
        return ["manajemen bencana"]
    atas = s.most_common(1)[0][1]
    return [r for r, v in s.most_common(3) if v >= 0.6 * atas]


def id_topik(kunci):
    ada, cur = {}, "*"
    while cur:
        d = ambil("/topics", {"per_page": 200, "cursor": cur, "select": "id,display_name"}, kunci)
        for t in d["results"]:
            ada[t["display_name"].lower()] = pendek(t["id"])
        cur = d["meta"].get("next_cursor") if d["results"] else None
    return [ada[n.lower()] for n in TOPIK_BENCANA if n.lower() in ada]


def kandidat(topik_id, kunci, maks):
    f = "last_known_institutions.country_code:ID,works_count:>2,topics.id:" + "|".join(topik_id)
    cur, hasil = "*", []
    while cur and len(hasil) < maks:
        d = ambil("/authors", {"filter": f, "per_page": 200, "cursor": cur, "sort": "cited_by_count:desc", "select": SEL}, kunci)
        hasil += [(pendek(a["id"]), ringkas(a)) for a in d["results"]]
        cur = d["meta"].get("next_cursor") if d["results"] else None
    return hasil[:maks]


def gabung(induk, segar, ditanya, calon, bulan, hari):
    """Murni, tanpa jaringan. Mengembalikan (induk baru, laporan bulanan). Baris lama dimutasi di salinan."""
    baru_induk = json.loads(json.dumps(induk))
    peta = peta_topik(induk)
    ada = {o[0] for o in baru_induk["orang"]}
    naik, hilang = [], []
    for o in baru_induk["orang"]:
        if o[0] not in ditanya:
            continue
        s = segar.get(o[0])
        if s is None:
            hilang.append(o[0]); continue
        if s["h"] > o[4]:
            naik.append({"id": o[0], "h_lama": o[4], "h_baru": s["h"]})
        o[4], o[5], o[6] = s["h"], s["karya"], s["sitasi"]
        if s["topik"]:
            o[8] = s["topik"]
    baru = []
    for i, s in calon:
        if i in ada:
            continue
        ada.add(i); baru.append(i)
        baru_induk["orang"].append([i, s["nama"], s["kampus"], rumpun_untuk(s["topik"], peta), s["h"], s["karya"], s["sitasi"],
                                    s["orcid"], s["topik"], "", "", "", "", "", ""])
    naik.sort(key=lambda x: x["h_lama"] - x["h_baru"])
    naik = naik[:50]
    baru_induk["diperbarui"] = hari
    baru_induk["baru_bulan_ini"] = baru
    return baru_induk, {"bulan": bulan, "baru": baru, "naik": naik, "hilang_di_openalex": hilang}


def r2(aksi, key, berkas):
    perintah = ["npx", "--yes", "wrangler@4.42.0", "r2", "object", aksi, f"{BUCKET}/{key}", "--remote"]
    perintah += ["--file", berkas] + (["--content-type", "application/json"] if aksi == "put" else [])
    subprocess.run(perintah, check=True, stdout=subprocess.DEVNULL)


def tulis(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--batas", type=int, default=0, help="uji: hanya N pakar lama dan N kandidat")
    ap.add_argument("--masuk", help="induk.json lokal (lewati unduhan R2)")
    ap.add_argument("--keluar", help="folder keluaran dry-run (default: folder sementara)")
    ap.add_argument("--maks-kandidat", type=int, default=30000)
    a = ap.parse_args()
    kunci = os.environ.get("OPENALEX_KEY", "")
    hari = datetime.date.today().isoformat(); bulan = hari[:7]
    dirk = a.keluar or tempfile.mkdtemp(prefix="akademisi-")
    os.makedirs(dirk, exist_ok=True)
    asal = a.masuk or os.path.join(dirk, "induk-lama.json")
    if not a.masuk:
        r2("get", "akademisi/induk.json", asal)
    induk = json.load(open(asal, encoding="utf-8"))
    ids = [o[0] for o in induk["orang"]]
    if a.batas:
        ids = ids[:a.batas]
    segar = segarkan(ids, kunci)
    tid = id_topik(kunci)
    calon = kandidat(tid, kunci, a.batas or a.maks_kandidat)
    baru_induk, lap = gabung(induk, segar, set(ids), calon, bulan, hari)
    f_induk, f_lap, f_cad = (os.path.join(dirk, n) for n in ("induk.json", f"baru-{bulan}.json", f"induk-{hari}.json"))
    tulis(f_induk, baru_induk); tulis(f_lap, lap)
    if not a.dry_run:
        shutil.copy(asal, f_cad)
        r2("put", f"akademisi/cadangan/induk-{hari}.json", f_cad)
        r2("put", f"akademisi/baru/{bulan}.json", f_lap)
        r2("put", "akademisi/induk.json", f_induk)
    ringkasan = f"akademisi {bulan}: ditanya {len(ids)}, topik {len(tid)}/{len(TOPIK_BENCANA)}, kandidat {len(calon)}, baru {len(lap['baru'])}, naik {len(lap['naik'])}, hilang {len(lap['hilang_di_openalex'])}, total {len(baru_induk['orang'])}, {'dry-run' if a.dry_run else 'diunggah'}"
    print(ringkasan)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
            f.write(ringkasan + "\n")


if __name__ == "__main__":
    main()
