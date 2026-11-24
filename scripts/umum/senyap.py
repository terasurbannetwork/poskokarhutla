"""Daerah senyap lintas bencana (KI-53): sinyal kuat per kab TANPA laporan -> daftar "layak ditanyakan", BUKAN vonis.

Inti murni (dipakai scripts/data/senyap.py untuk karhutla, dan di sini untuk banjir/longsor/kekeringan):
  tanpa_laporan(lap, jenis, kab, awal)   lap = {(jenis, kab): [(mulai, akhir)]}; senyap bila tak ada laporan yang berakhir >= awal - RENGGANG.
  layak_ditanyakan(sinyal, lap)          sinyal = [{jenis, kab, sejak 'YYYY-MM-DD', ...}] -> yang tanpa laporan.
  sinyal_status(status, ...)             status.json banjir: level >= LEVEL_MIN hari ke-0/1 per kab.
  sinyal_kering(hth, ...)                kekeringan_hth.json: hari tanpa hujan berturut-turut >= HTH_MIN per kab.
Pemuat laporan (hanya `jalan`): logbook Pusdalops (data/pusdalops/logbook_kejadian.csv), DIBI (public/data/dibi_kejadian.json),
dan untuk kekeringan juga SK status darurat (public/data/status_darurat.json). Hanya agregat per kab; tanpa identitas pelapor.
Kab-minggu yang sumber laporannya belum menjangkau tanggal sinyal TIDAK dinilai (artefak, bukan senyap).

  python3 -I scripts/umum/senyap.py uji
  python3 -I scripts/umum/senyap.py jalan [acuan YYYY-MM-DD]   (tulis public/data/senyap/{banjir,longsor,kekeringan}.json)
"""
import csv
import datetime as dt
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
D = dt.date.fromisoformat
RENGGANG, LEVEL_MIN, HTH_MIN, BASI_HARI = 2, 2, 61, 3
RENGGANG_JENIS = {"kekeringan": 30}   # kekeringan berjalan berminggu: laporan/SK dalam 30 hari terakhir menutup sinyal; lainnya RENGGANG
LABEL = {"banjir": "banjir", "longsor": "longsor", "kekeringan": "kekeringan"}


def tanpa_laporan(lap, jenis, kab, awal, renggang=RENGGANG):
    return not any(b >= awal - dt.timedelta(days=renggang) for _, b in lap.get((jenis, kab), []))


def layak_ditanyakan(sinyal, lap, renggang=RENGGANG):
    return [s for s in sinyal if tanpa_laporan(lap, s["jenis"], s["kab"], D(s["sejak"]), renggang)]


def sinyal_status(status, jenis_arr=(("banjir", "b"), ("longsor", "l"))):
    """status.json -> {(jenis, 'prov|kab'): (level maks, hari pertama level >= LEVEL_MIN, n kec)} untuk hari ke-0 dan ke-1."""
    hari, o = status["hari"], {}
    for kk, v in status["kec"].items():
        kab = "|".join(kk.split("|")[:2])
        for jenis, kunci in jenis_arr:
            arr = v[kunci]
            idx = [i for i in range(min(2, len(arr))) if arr[i] >= LEVEL_MIN]
            if not idx:
                continue
            lv, sejak, n = o.get((jenis, kab), (0, hari[idx[0]], 0))
            o[(jenis, kab)] = (max(lv, max(arr[:2])), min(sejak, hari[idx[0]]), n + 1)
    return o


def sinyal_kering(hth, hth_min=HTH_MIN):
    """kekeringan_hth.json -> [{jenis, kab, sejak (hari data), nilai (hari tanpa hujan), penduduk_pct}] untuk kab dengan maks >= hth_min."""
    return [{"jenis": "kekeringan", "kab": k, "sejak": hth["hari"], "nilai": v["maks"], "pop": v.get("pop")}
            for k, v in hth["kab"].items() if (v.get("maks") or 0) >= hth_min]


def kunci(k):
    """'35|Kab. Bojonegoro' -> '35|bojonegoro' (logbook, DIBI, status memakai penulisan nama berbeda)."""
    p, _, n = str(k).partition("|")
    return p + "|" + re.sub(r"^(kabupaten|kab\.)\s*", "", n.strip(), flags=re.I).lower()


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def muat_laporan(hari_ini):
    """-> (lap {(jenis, kunci kab): [(mulai, akhir)]}, sampai 'YYYY-MM-DD' = tanggal terakhir yang dijangkau SEMUA sumber laporan, rincian)."""
    sd = _muat("umum_status_darurat", "scripts/umum/status_darurat.py")
    lap, tg_lb, ri = {}, [], {"logbook": 0, "dibi": 0, "sk": 0}

    def tambah(j, kab, a, b):
        lap.setdefault((j, kunci(kab)), []).append((a, b))

    with open(os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            t = r["tgl_kejadian"]
            if not re.match(r"^20\d\d-\d\d-\d\d$", t) or t > hari_ini:   # tanggal salah ketik (9202-...) dibuang
                continue
            tg_lb.append(t)
            for k in r["kab_kode"].split(";"):
                if "|" in k and r["jenis"] in LABEL:
                    tambah(r["jenis"], k, D(t), D(t))
                    ri["logbook"] += 1
    db = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json"), encoding="utf-8"))
    for k in db["kejadian"]:
        for j in sd.kelas_jenis(k["jenis"]) & set(LABEL):
            tambah(j, f"{k['prov_kode']}|{k['kab']}", D(k["tanggal"]), D(k["tanggal"]))
            ri["dibi"] += 1
    kode = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))
    kem = {v["kemendagri"]: v["kunci_nama"] for v in kode.values() if v.get("kemendagri") and v.get("kunci_nama")}
    for o in json.load(open(os.path.join(AKAR, "public/data/status_darurat.json"), encoding="utf-8"))["sk"]:
        if o.get("kab_kode") in kem and "kekeringan" in sd.kelas_jenis(o["jenis"]) and not o.get("tanggal_janggal"):
            tambah("kekeringan", kem[o["kab_kode"]], D(o["mulai"]), D(o["berakhir"]) if o.get("berakhir") else D(hari_ini))
            ri["sk"] += 1
    return lap, min(max(tg_lb), db["sampai"]), ri


def _baris(s, satuan, alasan):
    return {"kab": s["kab"], "jenis": s["jenis"], "kekuatan": s.get("kekuatan", "sedang"), "nilai": s["nilai"], "satuan": satuan,
            "sejak": s["sejak"], "alasan": alasan}


def bangun(status, hth, lap, lap_sampai, acuan):
    """Murni. -> {jenis: {"baris": [...], "tak_dinilai": n}}. lap berkunci kunci(kab); sinyal memakai nama aslinya."""
    segar = lambda hari: (D(acuan) - D(hari)).days <= BASI_HARI   # sinyal basi tidak dipakai
    pakai_k = segar(hth["hari"])
    sinyal = {"banjir": [], "longsor": [], "kekeringan": sinyal_kering(hth) if pakai_k else []}
    pakai = segar(status["hari"][0])
    for (j, kab), (lv, sejak, n) in (sinyal_status(status).items() if pakai else []):
        sinyal[j].append({"jenis": j, "kab": kab, "sejak": sejak, "nilai": n, "kekuatan": "kuat" if lv >= 3 else "sedang", "lv": lv})
    keluar = {}
    for j, ss in sinyal.items():
        nilai = [s for s in ss if s["sejak"] <= lap_sampai]   # sumber laporan belum menjangkau sinyal = tak dinilai
        lp = {(jj, k): v for (jj, k), v in lap.items() if jj == j}
        rg = RENGGANG_JENIS.get(j, RENGGANG)
        sen = [s for s in nilai if tanpa_laporan(lp, j, kunci(s["kab"]), D(s["sejak"]), rg)]
        if j == "kekeringan":
            rows = [_baris(s, "hari tanpa hujan", f"Hari tanpa hujan berturut-turut mencapai {s['nilai']} (ambang {HTH_MIN}); tidak ada laporan atau SK status darurat kekeringan dalam {rg} hari terakhir. Hipotesis, bukan vonis.") for s in sen]
        else:
            rows = [_baris(s, "kecamatan Siaga+", f"Prakiraan {LABEL[j]} level {'Awas' if s['lv'] >= 3 else 'Siaga'} di {s['nilai']} kecamatan; tidak ada laporan Pusdalops atau DIBI dalam {rg} hari terakhir; prakiraan belum lolos uji balik; daftar untuk ditanyakan, bukan vonis.") for s in sen]
        rows.sort(key=lambda r: (r["kekuatan"] != "kuat", -r["nilai"], r["kab"]))
        keluar[j] = {"baris": rows, "tak_dinilai": len(ss) - len(nilai), "sinyal": len(ss), "status_dipakai": pakai_k if j == "kekeringan" else pakai}
    return keluar


def jalan():
    J = lambda p: json.load(open(os.path.join(AKAR, p), encoding="utf-8"))
    status, hth = J("public/banjir/data/status.json"), J("public/data/kekeringan_hth.json")
    acuan = sys.argv[2] if len(sys.argv) > 2 else dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%d")
    lap, sampai, ri = muat_laporan(acuan)
    o = bangun(status, hth, lap, sampai, acuan)
    os.makedirs(os.path.join(AKAR, "public/data/senyap"), exist_ok=True)
    kata = {"banjir": "Prakiraan banjir Siaga atau Awas", "longsor": "Prakiraan longsor Siaga atau Awas", "kekeringan": f"Hari tanpa hujan berturut-turut >= {HTH_MIN}"}
    for j, v in o.items():
        out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "acuan": acuan, "jenis": j,
               "sumber": {"sinyal": kata[j], "laporan": "Logbook Pusdalops, DIBI" + (", SK status darurat" if j == "kekeringan" else ""), "laporan_sampai": sampai,
                          "sinyal_dari": status["hari"][0] if j != "kekeringan" else hth["hari"], "sinyal_dipakai": v["status_dipakai"],
                          "sinyal_total": v["sinyal"], "tak_dinilai": v["tak_dinilai"]},
               "batasan": f"Tanpa laporan = tanpa catatan di logbook Pusdalops atau DIBI{' atau SK status darurat' if j == 'kekeringan' else ''} sejak sinyal dikurangi {RENGGANG_JENIS.get(j, RENGGANG)} hari (keduanya terbit dengan jeda). Sinyal yang lebih baru "
                          "dari catatan terakhir sumber tidak dinilai. Laporan warga/BPBD di D1 tidak terjangkau dari pipeline. Daftar tanya, bukan vonis."
                          + (" Ambang kekeringan hipotesis, belum lolos uji balik." if j == "kekeringan" else " Prakiraan belum lolos uji balik; daftar untuk ditanyakan, bukan vonis."),
               "ambang": {"level_min": LEVEL_MIN} if j != "kekeringan" else {"hth_min": HTH_MIN}, "baris": v["baris"]}
        p = os.path.join(AKAR, f"public/data/senyap/{j}.json")
        json.dump(out, open(p + ".tmp", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        os.replace(p + ".tmp", p)
        print(j, f"sinyal={v['sinyal']} senyap={len(v['baris'])} tak_dinilai={v['tak_dinilai']}", os.path.getsize(p), "byte")
    print("laporan", ri, "sampai", sampai, "acuan", acuan)


def uji():
    A = D("2026-10-20")
    lap = {("banjir", "32|x"): [(D("2026-10-19"), D("2026-10-19"))]}
    assert tanpa_laporan(lap, "banjir", "32|y", A) and not tanpa_laporan(lap, "banjir", "32|x", A)
    assert tanpa_laporan(lap, "banjir", "32|x", D("2026-10-25")) and tanpa_laporan(lap, "longsor", "32|x", A)   # laporan lama / jenis lain
    assert [s["kab"] for s in layak_ditanyakan([{"jenis": "banjir", "kab": "32|x", "sejak": "2026-10-20"}, {"jenis": "banjir", "kab": "32|y", "sejak": "2026-10-20"}], lap)] == ["32|y"]
    assert kunci("35|Kab. Bojonegoro") == "35|bojonegoro" and kunci("32|Kota Bogor") == "32|kota bogor"
    st = {"hari": ["2026-10-20", "2026-10-21", "2026-10-22"],
          "kec": {"32|X|k1": {"b": [0, 2, 3], "l": [1, 1, 0]}, "32|X|k2": {"b": [3, 0, 0], "l": [0, 0, 0]}, "32|Y|k3": {"b": [0, 0, 3], "l": [2, 2, 0]}}}
    assert sinyal_status(st) == {("banjir", "32|X"): (3, "2026-10-20", 2), ("longsor", "32|Y"): (2, "2026-10-20", 1)}
    hth = {"hari": "2026-10-20", "kab": {"32|Indramayu": {"maks": 62, "pop": 40.0}, "35|Kediri": {"maks": 60}, "35|Blitar": {}}}
    assert [s["kab"] for s in sinyal_kering(hth)] == ["32|Indramayu"]
    L = {("banjir", kunci("32|X")): [(D("2026-10-20"), D("2026-10-20"))], ("kekeringan", "32|indramayu"): [(D("2026-10-01"), D("2026-12-31"))]}
    o = bangun(st, hth, L, "2026-10-25", "2026-10-21")
    assert o["banjir"]["baris"] == [] and [r["kab"] for r in o["longsor"]["baris"]] == ["32|Y"] and o["kekeringan"]["baris"] == []   # SK berlaku menutup kekeringan
    o = bangun(st, dict(hth, kab={"35|Kediri": {"maks": 70}}), {}, "2026-10-25", "2026-10-21")
    assert [r["kab"] for r in o["kekeringan"]["baris"]] == ["35|Kediri"] and "Hipotesis" in o["kekeringan"]["baris"][0]["alasan"]
    # sumber laporan hanya sampai 10-19, sinyal 10-20: tak dinilai, bukan senyap
    o = bangun(st, hth, {}, "2026-10-19", "2026-10-21")
    assert all(not v["baris"] and v["tak_dinilai"] == v["sinyal"] for v in o.values()) and o["banjir"]["sinyal"] == 1
    # status basi (> BASI_HARI) tidak dipakai
    assert bangun(st, hth, {}, "2026-11-30", "2026-11-30")["banjir"]["sinyal"] == 0 and bangun(st, hth, {}, "2026-11-30", "2026-11-30")["kekeringan"]["sinyal"] == 0
    for v in bangun(st, hth, {}, "2026-11-30", "2026-10-21").values():
        for r in v["baris"]:
            assert "aman" not in r["alasan"].lower()
    # banjir/longsor: label belum lolos uji balik di alasan dan batasan
    a = bangun(st, hth, {}, "2026-10-25", "2026-10-21")["longsor"]["baris"][0]["alasan"]
    assert "belum lolos uji balik" in a and "bukan vonis" in a and "2 hari" in a, a
    # kekeringan: jendela 30 hari. SK/laporan 10 hari lalu menutup; 40 hari lalu tidak; teks menyebut jendela
    for lalu, senyap in ((10, False), (40, True)):
        Lk = {("kekeringan", "32|indramayu"): [(D("2026-09-01"), D("2026-10-21") - dt.timedelta(days=lalu))]}
        b = bangun(st, hth, Lk, "2026-10-25", "2026-10-21")["kekeringan"]["baris"]
        assert bool(b) == senyap, (lalu, b)
        if b:
            assert "30 hari terakhir" in b[0]["alasan"] and "belum ada" not in b[0]["alasan"]
    # banjir tetap 2 hari: laporan 10 hari lalu tidak menutup
    Lb = {("banjir", kunci("32|X")): [(D("2026-10-10"), D("2026-10-10"))]}
    assert [r["kab"] for r in bangun(st, hth, Lb, "2026-10-25", "2026-10-21")["banjir"]["baris"]] == ["32|X"]
    print("uji senyap umum: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["jalan"]:
        jalan()
    else:
        sys.exit("pakai: uji | jalan")
