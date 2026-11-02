"""Panen bulanan proyek internasional kebencanaan di Indonesia (dijalankan direktori-bulanan.yml).

python3 -I scripts/akademisi/pemutakhiran/panen_proyek.py --panen <folder panen> --menit 20
python3 -I scripts/akademisi/pemutakhiran/panen_proyek.py --cek

Sumber: Bank Dunia (search.worldbank.org/api/v2/projects), lalu data IATI lewat d-portal.org untuk ADB (XM-DAC-46004), JICA (XM-DAC-701-8),
dan donor lain (sektor 74010, 74020, 73010, 72010). Digabung ke <panen>/proyek_internasional.json berdasarkan id: baris baru ditambah,
status/mulai/selesai/nilai baris lama diperbarui bila berubah. Saringan relevansi: tema Disaster Bank Dunia atau kata kebencanaan di judul.
Lokasi provinsi hanya dicari untuk baris baru. Sumber yang 403/429 atau gagal dilewati; hasil kosong = berkas lama dibiarkan.
Dedupe dan pencocokan ke pendanaan dilakukan sambung_panen.mjs. Batasan: IATI tanpa organisasi pelaksana, nilai dalam mata uang
pelaporan (nilai_usd null kecuali ADB), kab selalu null, ADB lewat IATI tidak lengkap (adb.org menolak 403).
Sopan: UA jujur, jeda 1,2 detik per permintaan d-portal, batas waktu --menit.
"""
import argparse, datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = {"User-Agent": "Centurisk97-direktori/1.0 (panen proyek kebencanaan; centurisk97.id)"}
WB = "https://search.worldbank.org/api/v2/projects?format=json&countrycode_exact=ID&rows=1000&os=0&fl=id,project_name,status,boardapprovaldate,closingdate,totalcommamt,totalamt,impagency,borrower,theme_list,sector,url"
DP = "https://d-portal.org/q.json?from=act,country&limit=5000&country_code=ID&"
ST = {1: "Pipeline", 2: "Aktif", 3: "Penyelesaian", 4: "Selesai", 5: "Dibatalkan"}
PROV = [("aceh", "11"), ("nias", "12"), ("sumatera utara|north sumatra", "12"), ("sumatera barat|west sumatra|padang", "13"), ("riau", "14"), ("jambi", "15"), ("sumatera selatan|south sumatra", "16"),
        ("lampung", "18"), ("jakarta", "31"), ("jawa barat|west java|bandung", "32"), ("jawa tengah|central java|semarang", "33"), ("yogyakarta|merapi|progo", "34"),
        ("jawa timur|east java|surabaya|semeru", "35"), ("banten", "36"), ("bali", "51"), ("lombok|nusa tenggara barat|\\bntb\\b", "52"), ("nusa tenggara timur|\\bntt\\b|flores|kupang", "53"),
        ("kalimantan barat|west kalimantan", "61"), ("kalimantan tengah|central kalimantan", "62"), ("kalimantan selatan", "63"), ("kalimantan timur|east kalimantan", "64"),
        ("sulawesi tengah|central sulawesi|palu|sigi|donggala", "72"), ("sulawesi selatan|south sulawesi|makassar|bawakaraeng|jeneberang", "73"), ("sulawesi utara|north sulawesi", "71"),
        ("maluku", "81"), ("papua", "94")]
DR = re.compile(r"disaster|flood and drought", re.I)
STR = re.compile(r"disaster|flood|earthquake|tsunami|volcan|reconstruction|resilien|emergency|landslide|cyclone|seismic|\bfire", re.I)
NOT = re.compile(r"covid|influenza|irrigation|coral|fleet|financial sector|fiscal|electrification|nutrition|social assistance|health", re.I)
DROP = {"P175218", "P169548", "P173391", "P174902"}      # lolos saringan tapi bukan kebencanaan (ditinjau manual)
KA = re.compile(r"flood management|disaster|emergency assistance|tsunami", re.I)
KI = re.compile(r"disaster|flood|earthquake|quake|tsunami|volcan|eruption|resilien|\bDRR\b|\bDRM\b|preparedness|landslide|cyclone|BNPB|BPBD|merapi|lombok|palu|sinabung|reconstruct|early warning|emergency response|haze|kebakaran|karhutla", re.I)
XI = re.compile(r"covid|corona|polio|vaccin|immuniz|cholera|dengue|influenza|HIV|refugee|nutrition|workshop|exercise|medical|search and rescue|pulse lab|climate resilient (agri|rice)|\bwater and sanitation", re.I)
JK = {"201905005": "Disaster Resilience Promotion and Management Program Loan (III)", "202312810": "Volcano Disaster Prevention Sector Loan"}
JWEB = [("Urgent Disaster Reduction Project for Mt. Merapi/Progo River Basin and Mt. Bawakaraeng", "activity08", "16.436 miliar yen, perjanjian 31 Mar 2005", "2005-03-31",
         "Directorate General of Water Resources, Ministry of Public Works", ["34", "73"]),
        ("Aceh Reconstruction Project", "activity09", "11.593 miliar yen, perjanjian 29 Mar 2007", "2007-03-29",
         "Rehabilitation and Reconstruction Agency for Aceh and Nias (BRR)", ["11"])]


class Berhenti(Exception):
    pass


def json_dari(u):
    time.sleep(1.2)
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90) as f:
            return json.load(f)
    except urllib.error.HTTPError as e:
        if e.code in (403, 429):
            raise Berhenti(f"HTTP {e.code} dari {urllib.parse.urlparse(u).netloc}")
        raise


def provs(t):
    return sorted({c for p, c in PROV if re.search(p, t, re.I)})


def tgl(s):
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)", s or "")
    if m:
        return m.group(0)
    m = re.match(r"(\d+)/(\d+)/(\d{4})", s or "")
    return f"{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}" if m else None


def hari(n):
    return (datetime.date(1970, 1, 1) + datetime.timedelta(days=n)).isoformat() if n else None


def walk(t, o):
    for x in t or []:
        o.append(x)
        for k in ("theme2", "theme3"):
            if x.get(k):
                walk(x[k], o)


def bank_dunia(projects):
    out = []
    for v in projects.values():
        if v["id"] in DROP:
            continue
        ap, cl = tgl(v.get("boardapprovaldate")), tgl(v.get("closingdate"))
        if (ap or cl or "0")[:4] < "2010" and (cl or "0")[:4] < "2010":
            continue
        th = []; walk(v.get("theme_list"), th)
        byn = {}
        for x in th:
            if DR.search(x["name"]):
                byn[x["name"]] = max(byn.get(x["name"], 0), int(x.get("percent") or 0))
        pct, t = max(byn.values(), default=0), v["project_name"]
        if not ((pct >= 20 and not NOT.search(t)) or (STR.search(t) and not NOT.search(t))):
            continue
        try:
            nilai = int(str(v.get("totalcommamt") or v.get("totalamt") or "0").replace(",", ""))
        except ValueError:
            nilai = 0
        sp = lambda k: [x.strip() for x in str(v.get(k) or "").split(";") if x.strip()]
        out.append({"id": v["id"], "sumber": "Bank Dunia", "judul": t, "status": v.get("status"), "mulai": ap, "selesai": cl, "nilai_usd": nilai or None,
                    "pemberi": "World Bank", "pelaksana": sp("impagency"), "mitra_pemerintah": sp("borrower"),
                    "tema": sorted(byn) + [s["Name"] for s in (v.get("sector") or []) if s.get("Name")][:3],
                    "lokasi": [{"prov": p, "kab": None} for p in provs(t)], "sumber_url": v["url"]})
    return out


def dasar(x, sumber, pemberi, url, id=None):
    return {"id": id or x["aid"], "sumber": sumber, "judul": re.sub(r"&#38;", "&", x["title"]), "status": ST.get(x["status_code"]), "mulai": hari(x["day_start"]),
            "selesai": hari(x["day_end"]), "nilai_usd": None, "pemberi": pemberi, "pelaksana": [], "mitra_pemerintah": [], "tema": ["Bencana"], "lokasi": [], "sumber_url": url}


def adb(rows):
    grp = {}
    for x in rows:
        if KA.search(x["title"]) and "COVID-19: Emergency" not in x["title"]:
            grp.setdefault("-".join(x["aid"].split("-")[3:5]), []).append(x)
    out = []
    for num, g in grp.items():
        r = dasar(g[0], "ADB", "Asian Development Bank", f"https://www.adb.org/projects/{num}/main", "ADB-" + num)
        r["nilai_usd"] = sum(int(y["commitment"] or 0) for y in g) or None
        r["id_iati"] = [y["aid"] for y in g]
        r["mulai"] = min(hari(y["day_start"]) or "9999" for y in g)
        r["selesai"] = max(hari(y["day_end"]) or "" for y in g) or None
        r["sumber_url_iati"] = "https://d-portal.org/ctrack.html#view=act&aid=" + g[0]["aid"]
        out.append(r)
    return out


def jica(rows):
    out = []
    for x in rows:
        k = x["aid"].rsplit("-", 1)[1]
        if k in JK:
            x = dict(x, title=JK[k] + " (" + x["title"] + ")")
            r = dasar(x, "JICA", "Japan International Cooperation Agency (JICA)", "https://d-portal.org/ctrack.html#view=act&aid=" + x["aid"], "JICA-" + k)
            r["id_iati"] = [x["aid"]]; r["catatan"] = "nilai dalam yen (commitment IATI " + str(x["commitment"]) + " USD-setara pelaporan)"
            out.append(r)
    for t, s, cat, mulai, ex, ps in JWEB:    # dua proyek lama dari halaman web JICA, tidak ada di IATI
        out.append({"id": "JICA-web-" + s, "sumber": "JICA", "judul": t, "status": None, "mulai": mulai, "selesai": None, "nilai_usd": None,
                    "pemberi": "Japan International Cooperation Agency (JICA)", "pelaksana": [ex], "mitra_pemerintah": [ex], "tema": ["Bencana"],
                    "lokasi": [{"prov": p, "kab": None} for p in ps], "sumber_url": f"https://www.jica.go.jp/indonesia/english/activities/{s}.html", "catatan": cat})
    return out


def iati(rows):
    out = []
    for x in rows:
        rep = x["reporting"]
        if x["reporting_ref"] in ("XM-DAC-46004", "XM-DAC-701-8", "XI-IATI-WB", "44000") or re.search("World Bank|Asian Development|JICA", rep):
            continue
        if not KI.search(x["title"]) or XI.search(x["title"]) or (x["day_end"] or x["day_start"] or 99999) < 14610:
            continue
        r = dasar(x, "IATI", rep, "https://d-portal.org/ctrack.html#view=act&aid=" + urllib.parse.quote(x["aid"]))
        r["nilai_asli"] = {"komitmen": x.get("commitment"), "pembelanjaan": x.get("spend"), "catatan": "mata uang pelaporan tidak dikonversi ke USD; lihat commitment_eur/gbp"}
        r["nilai_eur"] = x.get("commitment_eur") or None; r["nilai_gbp"] = x.get("commitment_gbp") or None; r["id_iati"] = [x["aid"]]
        out.append(r)
    return out


def lokasi(r):
    for aid in r.get("id_iati", [])[:1]:
        names = [x["location_name"] or "" for x in json_dari("https://d-portal.org/q.json?from=location&limit=50&aid=" + urllib.parse.quote(aid))["rows"]]
        r["lokasi"] = [{"prov": p, "kab": None} for p in (provs(" ".join(names)) or provs(r["judul"]))]


def gabung(lama, baru):
    per = {r["id"]: i for i, r in enumerate(lama)}; hasil = json.loads(json.dumps(lama)); tambah = []
    dobel = {(r.get("pemberi"), r["judul"]) for r in lama}      # berkas lama sudah dededupe; jangan hidupkan lagi
    for r in baru:
        if r["id"] not in per and (r["pemberi"], r["judul"]) in dobel:
            continue
        if r["id"] in per:
            o = hasil[per[r["id"]]]
            for k in ("status", "mulai", "selesai", "nilai_usd", "nilai_eur", "nilai_gbp", "nilai_asli"):
                if r.get(k) not in (None, "") and r.get(k) != o.get(k):
                    o[k] = r[k]
        else:
            hasil.append(r); tambah.append(r); dobel.add((r["pemberi"], r["judul"]))
    return hasil, tambah


def panen(lama, menit):
    t0, baru = time.time(), []
    sumber = [("Bank Dunia", lambda: bank_dunia(json_dari(WB)["projects"])),
              ("ADB", lambda: adb(json_dari(DP + "reporting_ref=XM-DAC-46004")["rows"])),
              ("JICA", lambda: jica(json_dari(DP + "reporting_ref=XM-DAC-701-8")["rows"])),
              ("IATI", lambda: iati({x["aid"]: x for s in ("74010", "74020", "73010", "72010") for x in json_dari(DP + "sector_code=" + s)["rows"]}.values()))]
    for nama, f in sumber:
        try:
            b = f(); print(f"{nama}: {len(b)} proyek lolos saringan"); baru += b
        except Berhenti as e:
            print(f"{nama}: berhenti ({e})")
        except Exception as e:
            print(f"{nama}: gagal ({str(e)[:80]}), dilewati")
    ada = {r["id"] for r in lama}
    for r in baru:
        if r["id"] not in ada and not r["lokasi"] and r.get("id_iati") and time.time() - t0 < menit * 60:
            try:
                lokasi(r)
            except Exception as e:
                print(f"lokasi {r['id']}: {str(e)[:60]}")
    return baru


def cek():
    p = {"P1": {"id": "P1", "project_name": "Indonesia: National Urban Flood Resilience Project", "totalcommamt": "400,000,000", "boardapprovaldate": "2022-12-19T00:00:00Z",
                "closingdate": "1/31/2028 12:00:00 AM", "url": "u1", "status": "Active", "impagency": "A; B", "borrower": "Republic of Indonesia",
                "sector": [{"Name": "Sub-National Government"}], "theme_list": [{"name": "Environment", "percent": "88", "theme2": [{"name": "Disaster Risk Management", "percent": "50"}]}]},
         "P2": {"id": "P2", "project_name": "Indonesia Supporting Health Project", "totalcommamt": "0", "boardapprovaldate": "2024-11-27T00:00:00Z", "closingdate": "1/31/2027 12:00:00 AM",
                "url": "u2", "status": "Active", "theme_list": []},
         "P175218": {"id": "P175218", "project_name": "Flood x", "boardapprovaldate": "2022-01-01T00:00:00Z", "url": "u3", "theme_list": []}}
    w = bank_dunia(p)
    assert [r["id"] for r in w] == ["P1"] and w[0]["nilai_usd"] == 400000000 and w[0]["selesai"] == "2028-01-31" and w[0]["pelaksana"] == ["A", "B"] and w[0]["tema"][0] == "Disaster Risk Management", w
    a = {"aid": "XM-DAC-46004-35182-043-LN3440", "title": "Flood Management in Selected River Basins Sector Project", "status_code": 3, "day_start": 17107, "day_end": 20404, "commitment": 100}
    b = adb([a, dict(a, aid="XM-DAC-46004-35182-043-LN3441", commitment=8), dict(a, aid="XM-DAC-46004-1-2-X", title="Capital Market")])
    assert len(b) == 1 and b[0]["id"] == "ADB-35182-043" and b[0]["nilai_usd"] == 108 and b[0]["status"] == "Penyelesaian" and len(b[0]["id_iati"]) == 2, b
    j = jica([{"aid": "XM-DAC-701-8-201905005", "title": "x", "status_code": 2, "day_start": 1, "day_end": 2, "commitment": 5}])
    assert [r["id"] for r in j] == ["JICA-201905005", "JICA-web-activity08", "JICA-web-activity09"]
    i = iati([{"aid": "AU-5-INI422-ID", "reporting": "Australian Aid", "reporting_ref": "AU", "title": "Facility for Disaster Reduction", "status_code": 4, "day_start": 17000, "day_end": 18000, "commitment": 9},
              {"aid": "Z", "reporting": "X", "reporting_ref": "Z", "title": "Covid disaster", "status_code": 2, "day_start": 17000, "day_end": 18000},
              {"aid": "Y", "reporting": "Asian Development Bank", "reporting_ref": "Q", "title": "Disaster", "status_code": 2, "day_start": 17000, "day_end": 18000}])
    assert [r["id"] for r in i] == ["AU-5-INI422-ID"] and i[0]["nilai_asli"]["komitmen"] == 9
    assert provs("Banjir Aceh dan Lombok") == ["11", "52"]
    lama = [{"id": "P1", "status": "Active", "selesai": "2027-01-01", "judul": "lama"}]
    h, t = gabung(lama, [dict(w[0], status="Closed"), b[0]])
    assert len(h) == 2 and [r["id"] for r in t] == ["ADB-35182-043"] and h[0]["status"] == "Closed" and h[0]["selesai"] == "2028-01-31" and h[0]["judul"] == "lama", h
    print("panen_proyek: cek lulus")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--panen"); ap.add_argument("--menit", type=float, default=20); ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    if a.cek:
        cek(); sys.exit(0)
    p = os.path.join(a.panen, "proyek_internasional.json")
    if not os.path.exists(p):
        print("proyek_internasional.json lama tidak ada: tidak menulis apa pun"); sys.exit(0)
    d = json.load(open(p)); lama = d["baris"]
    baru = panen(lama, a.menit)
    if not baru:
        print("hasil kosong: berkas lama dibiarkan"); sys.exit(0)
    hasil, tambah = gabung(lama, baru)
    if hasil != lama:
        d.update({"dibuat": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "baris": hasil})
        json.dump(d, open(p, "w"), ensure_ascii=False, indent=1)
    print(f"proyek_internasional: {len(lama)} lama, {len(tambah)} baru, {len(baru)} dibaca")
