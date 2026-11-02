#!/usr/bin/env python3
"""Label kejadian banjir rob dari tiga sumber, untuk menguji modul Gelombang Pasang & Abrasi.
Sumber: (p) rekap Pusdalops BNPB banjir rob 2023-2024 (xlsx, tidak di-git), (l) logbook Pusdalops (jenis 'Banjir Rob'),
(d) DIBI lewat public/banjir/data/rob.json. Keluaran HANYA tanggal + kabupaten (kode repo 'PP|Nama'); tanpa korban, tanpa nama orang.
Python stdlib saja (xlsx dibaca lewat zipfile). Pakai: python3 scripts/pesisir/rob_label.py  |  ... uji
"""
import collections, datetime as dt, glob, json, os, re, sys, xml.etree.ElementTree as ET, zipfile

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
XLSX = os.path.join(AKAR, "data/raw/pusdalops-drive/2025/REKAPITULASI KEJADIAN BENCANA BANJIR ROB 2023-2024.xlsx")
KELUAR = os.path.join(AKAR, "public/pesisir/data/rob_kejadian.json")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}
BULAN.update({"pebruari": 2, "nopember": 11, "agu": 8, "agt": 8})
RE_TGL = re.compile(r"(\d{1,2})\s+([A-Za-z]+)\s+(20\d\d)")
alnum = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())


def baca_xlsx(jalur):
    """{nama_lembar: [baris = list sel teks]}."""
    z = zipfile.ZipFile(jalur)
    tag = lambda e: e.tag.split("}")[1]
    ss = [("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))) for si in ET.fromstring(z.read("xl/sharedStrings.xml"))]
    rel = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    hasil = {}
    for s in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", NS):
        rid = s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        rows = []
        for r in ET.fromstring(z.read("xl/" + rel[rid].lstrip("/").replace("xl/", ""))).iter("{%s}row" % NS["m"]):
            baris = {}
            for c in r:
                k = 0
                for ch in re.match(r"[A-Z]+", c.get("r")).group():
                    k = k * 26 + ord(ch) - 64
                v = c.find("m:v", NS)
                if c.get("t") == "s" and v is not None:
                    baris[k - 1] = ss[int(v.text)]
                elif c.get("t") == "inlineStr":
                    baris[k - 1] = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                elif v is not None:
                    baris[k - 1] = v.text
            rows.append([baris.get(i, "") for i in range(max(baris, default=-1) + 1)])
        hasil[s.get("name")] = rows
    return hasil


def tanggal(teks):
    """Tanggal PERTAMA dalam sel waktu ('Jumat, 07 Juli 2023 Pkl...' ; tanggal 'Update' sesudahnya diabaikan); None bila tak terbaca."""
    for d, b, y in RE_TGL.findall(teks or ""):
        if b.lower() in BULAN:
            try:
                return dt.date(int(y), BULAN[b.lower()], int(d)).isoformat()
            except ValueError:
                return None
    return None


def kode_prov(nama, PROV):
    a = alnum(re.sub(r"^prov(insi)?\.?\s*", "", nama.strip(), flags=re.I))
    a = a.replace("kep", "kepulauan") if a.startswith("kep") and not a.startswith("kepulauan") else a
    for k, v in PROV.items():
        b = alnum(v).replace("kep", "kepulauan") if alnum(v).startswith("kep") and not alnum(v).startswith("kepulauan") else alnum(v)
        if a and (a == b or a == alnum(v)):
            return k
    return ""


def lokasi(teks, PROV):
    """Sel 'Provinsi/Kabupaten' -> [(kode_prov, nama_kab)]. Baris berawalan Kab/Kota = kabupaten, lainnya provinsi."""
    out, prov = [], ""
    for ln in (teks or "").split("\n"):
        ln = ln.strip()
        if not ln:
            continue
        if re.match(r"(kab|kota)\b", ln, re.I):
            nm = re.sub(r"^kab\.?\s*", "Kab. ", ln, flags=re.I) if re.match(r"kab", ln, re.I) else re.sub(r"^kota\s+", "Kota ", ln, flags=re.I)
            out.append((prov, re.sub(r"\s+", " ", nm).strip()))
        else:
            prov = kode_prov(ln, PROV)
    return out


def dari_pusdalops(KK, PROV, jalur=XLSX):
    """-> (daftar (tgl, kode, nama_kab, kode_prov), jumlah_gagal)."""
    out, gagal, jenis = [], [], collections.Counter()
    if not os.path.exists(jalur):
        return out, gagal, jenis
    for nama, rows in baca_xlsx(jalur).items():
        for r in rows:
            r = r + [""] * 5
            if not re.fullmatch(r"\d+(\.0)?", str(r[0]).strip()):
                continue
            jenis[r[3].strip().lower()] += 1
            t, L = tanggal(r[4]), lokasi(r[1], PROV)
            if not t or not L:
                gagal.append((nama, str(r[0]), bool(t), len(L)))
                continue
            for pk, kab in L:
                kode = KK({"kabkota": [kab], "prov_kode": [pk] if pk else []})
                if kode:
                    out.append((t, kode[0], kab, pk))
                else:
                    gagal.append((nama, str(r[0]), True, kab))
    return out, gagal, jenis


def dari_logbook(KK):
    out = []
    for f in sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl")) + glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??-*/kejadian.jsonl"))):
        for ln in open(f, encoding="utf-8"):
            k = json.loads(ln)
            if re.search(r"\brob\b", k.get("jenis_teks") or "", re.I) and k.get("tgl_kejadian"):
                for kode in KK(k):
                    out.append((k["tgl_kejadian"], kode, "", ""))
    return out


def dari_dibi(KK, PROV):
    p = os.path.join(AKAR, "public/banjir/data/rob.json")
    out = []
    if os.path.exists(p):
        ind = {v: k for k, v in PROV.items()}
        for k in json.load(open(p))["kejadian"]:
            for kode in KK({"kabkota": [k["kab"]], "prov_kode": [ind[k["prov"]]] if k["prov"] in ind else []}):
                out.append((k["tanggal"], kode, "", ""))
    return out


def gabung(sumber):
    """sumber {'p': [...], 'l': [...], 'd': [...]} -> {(tgl, kode): huruf sumber terurut}. Per kab, tanggal yang jatuh dalam
    1 hari dari baris yang dipertahankan (yang paling awal) digabung ke baris itu; bukan rantai, jadi episode panjang tetap banyak baris."""
    per = collections.defaultdict(lambda: collections.defaultdict(set))
    for s, daftar in sumber.items():
        for t, kode, *_ in daftar:
            per[kode][t].add(s)
    ev = {}
    for kode, hari in per.items():
        simpan = None
        for t in sorted(hari):
            if simpan and (dt.date.fromisoformat(t) - dt.date.fromisoformat(simpan)).days <= 1:
                ev[(simpan, kode)] |= hari[t]
            else:
                simpan = t
                ev[(t, kode)] = set(hari[t])
    return {k: "".join(sorted(v)) for k, v in ev.items()}


SYN, REF = 29.530588853, dt.datetime(2000, 1, 6, 18, 14)  # bulan baru rata-rata; galat fase ~ setengah hari


def jarak_fase(t):
    """hari ke bulan baru/purnama terdekat (fase rata-rata, pukul 12 WIB)."""
    f = ((dt.datetime.fromisoformat(t) + dt.timedelta(hours=5) - REF).total_seconds() / 86400) % (SYN / 2)
    return min(f, SYN / 2 - f)


def fase(tanggal_unik, n_acak=5000, batas=2.0):
    """Porsi tanggal laporan dalam `batas` hari dari bulan baru/purnama; pembanding = tanggal unik DIACAK DI DALAM BULAN KALENDER
    yang sama (gerombol kejadian tetap utuh sebagai tanggal-tanggal unik). p = peluang acak >= teramati (satu sisi)."""
    import random
    rng = random.Random(1)
    oleh = collections.defaultdict(list)
    for t in tanggal_unik:
        oleh[t[:7]].append(t)
    hari_bulan = {}
    for ym in oleh:
        y, m = int(ym[:4]), int(ym[5:])
        n = (dt.date(y + (m == 12), m % 12 + 1, 1) - dt.date(y, m, 1)).days
        hari_bulan[ym] = [(dt.date(y, m, 1) + dt.timedelta(days=i)).isoformat() for i in range(n)]
    dekat = lambda t: jarak_fase(t) <= batas
    obs = sum(dekat(t) for t in tanggal_unik)
    sim = [sum(dekat(t) for ym, L in oleh.items() for t in rng.sample(hari_bulan[ym], len(L))) for _ in range(n_acak)]
    harap = sum(sim) / n_acak
    return {"n_tanggal_unik": len(tanggal_unik), "porsi_dalam_2_hari": round(obs / len(tanggal_unik), 3), "porsi_acak": round(harap / len(tanggal_unik), 3),
            "p_satu_sisi": round((1 + sum(x >= obs for x in sim)) / (n_acak + 1), 4), "n_acak": n_acak,
            "metode": "tanggal laporan unik diacak di dalam bulan kalender yang sama (gerombol tetap utuh); fase bulan rata-rata, galat ~setengah hari, perigee tidak dihitung",
            "catatan": "Sinyal lemah dan ditentukan beberapa episode (Des 2021, Jun 2020). Tanggal = tanggal laporan, bukan puncak genangan. Tidak untuk ditampilkan sebagai temuan."}


def bangun():
    import logbook_bersih as LB
    from wilayah import PROVINSI as PROV
    KK = LB.kode_kab
    p, gagal, jenis = dari_pusdalops(KK, PROV)
    sumber = {"p": p, "l": dari_logbook(KK), "d": dari_dibi(KK, PROV)}
    ev = gabung(sumber)
    nama = {}
    for s in sumber.values():
        for t, kode, nm, _ in s:
            nama.setdefault(kode, kode.split("|")[1])
    kab = {}
    for (t, kode), s in ev.items():
        c = kab.setdefault(kode, {"kode": kode, "prov": PROV.get(kode.split("|")[0], ""), "nama": nama[kode], "n": 0, "bulan": [0] * 12, "tahun": {}})
        c["n"] += 1
        c["bulan"][int(t[5:7]) - 1] += 1
        c["tahun"][t[:4]] = c["tahun"].get(t[:4], 0) + 1
    daftar = sorted(({"t": t, "k": k, "s": s} for (t, k), s in ev.items()), key=lambda e: (e["t"], e["k"]))
    ringkas = {s: len(v) for s, v in sumber.items()}
    return {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "sumber": {"p": "Rekapitulasi kejadian banjir rob 2023-2024, Pusdalops BNPB", "l": "Logbook Pusdalops BNPB, jenis Banjir Rob",
                       "d": "DIBI BNPB, kategori Banjir Rob (lewat arsip rob Centurisk97)"},
            "n_mentah": ringkas, "n_kejadian": len(daftar), "n_kab": len(kab), "rentang": [daftar[0]["t"], daftar[-1]["t"]],
            "catatan": ["Satu kejadian = satu tanggal laporan x satu kabupaten/kota; laporan kembar antarsumber digabung (kolom s memuat huruf sumbernya).",
                        "Tanggal = tanggal kejadian pertama di laporan, bukan puncak genangan. Tanpa korban dan tanpa nama orang.",
                        "Tahun tanpa catatan bukan berarti tanpa rob: sumbernya laporan BPBD, dan logbook belum penuh tiap tahun."],
            "kab": sorted(kab.values(), key=lambda c: -c["n"]), "kejadian": daftar,
            "fase": fase(sorted({e["t"] for e in daftar})),
            "_gagal": gagal, "_jenis": dict(jenis)}


def uji():
    assert tanggal("Jumat, 07 Juli 2023\nPkl. 13.00 WIB\n\nUpdate : \nMinggu, 09 Juli 2023") == "2023-07-07"
    assert tanggal("Rabu. 18 Januari 2023") == "2023-01-18" and tanggal("tanpa tanggal") is None and tanggal("31 Februari 2023") is None
    assert tanggal("Selasa, 28 Mei 2024\n\nUpdate : \nRabu, 29 Mei 2024") == "2024-05-28"
    P = {"33": "Jawa Tengah", "19": "Kep. Bangka Belitung", "21": "Kepulauan Riau"}
    assert lokasi("Prov. Jawa Tengah\nKab. Demak\n", P) == [("33", "Kab. Demak")]
    assert lokasi("Kep Bangka Belitung \nKota Pangkalpinang", P) == [("19", "Kota Pangkalpinang")]
    assert lokasi("Prov. Jawa Tengah\nKota Tegal\nKab.Brebes", P) == [("33", "Kota Tegal"), ("33", "Kab. Brebes")]
    assert lokasi("Kepulauan Riau\nKab. Bintan", P) == [("21", "Kab. Bintan")]
    assert gabung({"p": [("2023-05-12", "33|Demak")], "l": [("2023-05-12", "33|Demak"), ("2023-05-13", "33|Demak"), ("2023-05-14", "33|Demak")]}) == {("2023-05-12", "33|Demak"): "lp", ("2023-05-14", "33|Demak"): "l"}
    assert gabung({"d": [("2023-05-12", "33|Demak")], "l": [("2023-05-13", "33|Tegal"), ("2023-05-13", "33|Demak")]}) == {("2023-05-12", "33|Demak"): "dl", ("2023-05-13", "33|Tegal"): "l"}
    assert jarak_fase("2000-01-06") < 1 and jarak_fase("2000-01-21") < 1.5
    if os.path.exists(XLSX):
        r = baca_xlsx(XLSX)
        assert set(r) == {"Banjir Rob 2023", "Banjir Rob 2024"} and len(r["Banjir Rob 2023"]) > 100
    print("uji rob_label: lolos")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        d = bangun()
        g, j = d.pop("_gagal"), d.pop("_jenis")
        os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
        json.dump(d, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"{d['n_kejadian']} kejadian, {d['n_kab']} kab, mentah {d['n_mentah']}, rentang {d['rentang']}; gagal parse {len(g)}: {g[:12]}; jenis pusdalops {j}")
