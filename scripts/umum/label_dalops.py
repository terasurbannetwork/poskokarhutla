"""Label kejadian harian per kab/kota dari laporan harian Pusdalops/Dirdalops (KI-79, keputusan pemilik K8). Python stdlib saja.

Satu pembaca bersama untuk karhutla, banjir, longsor, cuaca (puting beliung, cuaca ekstrem), kekeringan, rob. DIBI = label KEDUA,
disimpan di berkas terpisah dan TIDAK dijumlah dengan Dalops.

Rekaman: {kab (kode IRBI resmi, public/data/kemitraan/kode.json), tanggal (tgl kejadian, tanggal kalender WIB), jenis,
          sumber "dalops"|"dibi", tanggal_lapor (pertama dicatat; None bila sumber tak membawanya)}.
Sumber Dalops: data/pusdalops/logbook_kejadian.csv (kolom jenis, subjenis, tgl_kejadian, pertama_dicatat, kab_kode). Kunci 'PP|Nama' dicocokkan
ke kunci_nama kode.json; tak cocok = daftar `tak_cocok` berhitung, tidak pernah ditebak. Tanpa nama orang, tanpa nomor telepon (kolom itu tak dibaca).
Rob: logbook tak punya jenis rob; PROKSI = jenis gelombang_pasang + cuaca bersubjenis gelombang_tinggi/abrasi, ditambah sumber rob_label.py
(rekap Pusdalops xlsx + logbook arsip) bila berkasnya ada di mesin ini. Berlabel proksi di keluaran.

Cakupan lewat label_mutu (KI-16): kab-bulan yang tak pernah diterbitkan APA PUN oleh Dalops = "tak_teramati", bukan negatif, bukan 0.
Skor: `skor_dua` melaporkan tanpa toleransi DAN toleransi +-1 hari berdampingan.
Keluaran lokal: data/raw/label/ (data/raw/* di-gitignore; tidak untuk public/).

  python3 -I scripts/umum/label_dalops.py uji
  python3 -I scripts/umum/label_dalops.py jalan [bahaya ...]      (tulis data/raw/label/dalops_<bahaya>.json dan dibi_<bahaya>.json)
"""
import csv
import datetime as dt
import importlib.util
import json
import os
import re
import sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
CSV = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
DIBI = os.path.join(AKAR, "public/data/dibi_kejadian.json")
KODE = os.path.join(AKAR, "public/data/kemitraan/kode.json")
KELUAR = os.path.join(AKAR, "data/raw/label")
BAHAYA = ("karhutla", "banjir", "longsor", "cuaca", "kekeringan", "rob")
DIBI_JENIS = {
    "karhutla": ("Kebakaran Hutan dan Lahan", "Kebakaran Lahan", "Kebakaran Hutan", "Kebakaran Lahan Gambut"),
    "banjir": ("Banjir", "Banjir Bandang", "Banjir Genangan", "Banjir dan Tanah Longsor"),
    "longsor": ("Tanah Longsor", "Gerakan Tanah", "Banjir dan Tanah Longsor"),
    "cuaca": ("Cuaca Ekstrem", "Puting Beliung", "Angin Kencang", "Angin Topan"),
    "kekeringan": ("Kekeringan", "Kekeringan Pertanian"),
    "rob": ("Banjir Rob", "Gelombang Pasang / Abrasi", "Gelombang Pasang", "Abrasi Pantai"),
}
LAUT = {"gelombang_tinggi", "abrasi"}


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


LM = _muat("label_mutu_ld", os.path.join(AB, "label_mutu.py"))   # cakupan, bangun_label, kab_layak, bulan_dari, _kunci
P = LM._pembanding()                                             # kontingensi


def peta_kode(jalur=KODE):
    """-> ({kunci_nama: kode IRBI}, {kemendagri 'PP.KK': kode IRBI}). Satu-satunya sumber kode kab; tak ada kode karangan."""
    d = json.load(open(jalur, encoding="utf-8"))
    return ({v["kunci_nama"]: k for k, v in d.items() if v.get("kunci_nama")},
            {v["kemendagri"]: k for k, v in d.items() if v.get("kemendagri")})


# Ejaan logbook yang beda dengan kode.json, dicek satu per satu ke nama baku di provinsi yang sama (25 Nov 2026).
ALIAS = {
    "72|Toli Toli": "72|Toli-Toli",
    "71|Kepulauan Siau Tagulandang Biaro": "71|Kep. Siau Tagulandang Biaro",
    "73|Pangkajene Kepulauan": "73|Pangkajene dan Kepulauan",
    "17|Muko Muko": "17|Mukomuko",
    "73|Kota Pare Pare": "73|Kota Parepare",
    "12|Kota Padang Sidempuan": "12|Kota Padangsidimpuan",
    "12|Kota Tanjung Balai": "12|Kota Tanjungbalai",
    "75|Pahuwato": "75|Pohuwato",
}


def cocok_kab(kunci, nama_ke_kode):
    """'PP|Nama' (logbook) -> kode IRBI atau None. Varian: apa adanya, tanpa awalan 'Kab.'/'Kabupaten' (label_mutu._kunci)."""
    kunci = (kunci or "").strip()
    if "|" not in kunci:
        return None
    kunci = ALIAS.get(kunci, kunci)
    prov, n = kunci.split("|", 1)
    for k in (kunci, LM._kunci(prov, n)):
        if k in nama_ke_kode:
            return nama_ke_kode[k]
    return None


def bahaya_baris(jenis, subjenis):
    """jenis/subjenis logbook -> himpunan bahaya yang dilabeli baris itu."""
    subs = {s.strip() for s in (subjenis or "").split(";") if s.strip()}
    if jenis in BAHAYA and jenis not in ("cuaca", "rob"):
        return {jenis}
    if jenis == "gelombang_pasang":
        return {"rob"}
    if jenis == "cuaca":
        if subs and subs <= LAUT:
            return {"rob"}
        return {"cuaca", "rob"} if subs & LAUT else {"cuaca"}
    return set()


def tanggal_sah(t, hari_ini=None):
    """'YYYY-MM-DD' nyata, 2011..hari ini. Tanggal salah ketik (9202-xx, 2030) dibuang."""
    try:
        d = dt.date.fromisoformat(t[:10])
    except (TypeError, ValueError):
        return False
    return 2011 <= d.year and d <= (hari_ini or dt.date.today())


def baca_dalops(jalur=CSV, nama_ke_kode=None, hari_ini=None):
    """-> (baris [{bahaya:set, kab, tgl, lapor}], statistik). Semua jenis ikut (untuk cakupan); baris bukan-6-bahaya bahaya=set()."""
    nama_ke_kode = nama_ke_kode or peta_kode()[0]
    out, tak, buang, n = [], {}, 0, 0
    with open(jalur, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            n += 1
            if not tanggal_sah(r["tgl_kejadian"], hari_ini):
                buang += 1
                continue
            lapor = r["pertama_dicatat"] if tanggal_sah(r["pertama_dicatat"], hari_ini) else None
            for k in (r["kab_kode"] or "").split(";"):
                k = k.strip()
                if not k:
                    continue
                kode = cocok_kab(k, nama_ke_kode)
                if not kode:
                    tak[k] = tak.get(k, 0) + 1
                    continue
                out.append({"bahaya": bahaya_baris(r["jenis"], r["subjenis"]), "kab": kode, "tgl": r["tgl_kejadian"][:10], "lapor": lapor})
    return out, {"baris_csv": n, "tanggal_dibuang": buang, "tak_cocok": dict(sorted(tak.items(), key=lambda x: -x[1])),
                 "tak_cocok_n": sum(tak.values())}


def rob_tambahan(nama_ke_kode):
    """Sumber rob_label.py (rekap xlsx + logbook arsip) bila ada di mesin ini; -> [(tgl, kode IRBI)]. Kosong bila berkas tak ada."""
    p = os.path.join(AKAR, "scripts/pesisir/rob_label.py")
    if not (os.path.exists(os.path.join(AKAR, "data/raw/pusdalops-drive")) or os.path.isdir(os.path.join(AKAR, "data/raw/logbook/arsip"))):
        return []
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    RL = _muat("rob_label_ld", p)
    import logbook_bersih as LB
    from wilayah import PROVINSI
    out = [t for t in RL.dari_pusdalops(LB.kode_kab, PROVINSI)[0] + RL.dari_logbook(LB.kode_kab)]
    return [(t[0], nama_ke_kode[t[1]]) for t in out if t[1] in nama_ke_kode]


def rekaman(baris, bahaya, sumber="dalops"):
    """Baris -> rekaman unik (kab, tanggal, jenis); tanggal_lapor = yang paling awal."""
    g = {}
    for b in baris:
        if bahaya in b["bahaya"]:
            k = (b["kab"], b["tgl"])
            if k not in g or (b["lapor"] and (g[k] is None or b["lapor"] < g[k])):
                g[k] = b["lapor"]
    return [{"kab": k, "tanggal": t, "jenis": bahaya, "sumber": sumber, "tanggal_lapor": g[(k, t)]} for k, t in sorted(g)]


def cakupan_label(baris, bahaya):
    """Lewat label_mutu: {kab: {bulan: (y, tahu)}} hanya kab-bulan yang Dalops pernah menerbitkan APA PUN. Selain itu tak teramati."""
    rows = [{"sumber": "dalops", "kab": b["kab"], "tgl": b["tgl"], "dicatat": b["lapor"], "target": bahaya in b["bahaya"]} for b in baris]
    return LM.bangun_label(rows)


def status(cov, kejadian_set, kab, tanggal):
    """'ada' | 'tidak' | 'tak_teramati'. Tak teramati TIDAK pernah menjadi 'tidak' (apalagi 0)."""
    if (kab, tanggal) in kejadian_set:
        return "ada"
    return "tidak" if tanggal[:7] in cov.get(kab, {}) else "tak_teramati"


def _geser(tanggal, i):
    return (dt.date.fromisoformat(tanggal) + dt.timedelta(days=i)).isoformat()


def skor(kasus, kejadian, cov, toleransi=0):
    """kasus [(kab, tanggal, alarm bool)]; kejadian = rekaman. y = ada kejadian di kab itu dalam +-toleransi hari.
    Kasus di kab-bulan tak teramati (dan tanpa kejadian) DIBUANG dan dihitung, bukan negatif. -> kontingensi + n_kasus + n_tak_teramati."""
    ada = {(r["kab"], r["tanggal"]) for r in kejadian}
    pred, y, tak = [], [], 0
    for kab, t, alarm in kasus:
        yy = any((kab, _geser(t, i)) in ada for i in range(-toleransi, toleransi + 1))
        if not yy and t[:7] not in cov.get(kab, {}):
            tak += 1
            continue
        pred.append(bool(alarm))
        y.append(yy)
    return dict(P.kontingensi(pred, y), n_kasus=len(y), n_tak_teramati=tak, toleransi_hari=toleransi)


def skor_dua(kasus, kejadian, cov):
    """Dua-duanya dilaporkan bersama (K8)."""
    return {"tanpa_toleransi": skor(kasus, kejadian, cov, 0), "toleransi_1_hari": skor(kasus, kejadian, cov, 1)}


def muat_dibi(bahaya, jalur=DIBI, kemendagri_ke_kode=None):
    """DIBI = label kedua, rekaman sama dengan sumber 'dibi'. Kab dari kode kemendagri ke kode IRBI; tak cocok dihitung. -> (rekaman, tak_cocok)."""
    kemendagri_ke_kode = kemendagri_ke_kode or peta_kode()[1]
    jenis, g, tak = set(DIBI_JENIS[bahaya]), set(), {}
    for r in json.load(open(jalur, encoding="utf-8"))["kejadian"]:
        if r["jenis"] not in jenis or not r.get("bencana", 1) or not tanggal_sah(r["tanggal"]):
            continue
        kode = kemendagri_ke_kode.get(r.get("kab_kode"))
        if kode:
            g.add((kode, r["tanggal"][:10]))
        else:
            tak[r.get("kab") or "?"] = tak.get(r.get("kab") or "?", 0) + 1
    return [{"kab": k, "tanggal": t, "jenis": bahaya, "sumber": "dibi", "tanggal_lapor": None} for k, t in sorted(g)], tak


def ringkas(rek, tak=None):
    t = sorted(r["tanggal"] for r in rek)
    return {"kejadian": len(rek), "kab": len({r["kab"] for r in rek}), "dari": t[0] if t else None, "sampai": t[-1] if t else None,
            "tak_cocok": sum((tak or {}).values())}


def jalan(pilih=BAHAYA):
    n2k, k2k = peta_kode()
    baris, st = baca_dalops(nama_ke_kode=n2k)
    tambah = rob_tambahan(n2k) if "rob" in pilih else []
    baris += [{"bahaya": {"rob"}, "kab": k, "tgl": t, "lapor": None} for t, k in tambah]
    os.makedirs(KELUAR, exist_ok=True)
    wib = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes")
    print(f"dalops: {st['baris_csv']} baris csv, {st['tanggal_dibuang']} tanggal dibuang, {st['tak_cocok_n']} kab tak cocok ({len(st['tak_cocok'])} nama)")
    for h in pilih:
        rek = rekaman(baris, h)
        cov = cakupan_label(baris, h)
        layak = sum(1 for x in LM.kab_layak(cov) if x["layak"])
        db, dtak = muat_dibi(h, kemendagri_ke_kode=k2k)
        meta = {"dibuat": wib, "bahaya": h, "proksi": h == "rob", "aturan": __doc__.split("Rekaman:")[0].strip(),
                "cakupan": {"kab_dengan_bulan_teramati": len(cov), "kab_bulan_teramati": sum(len(v) for v in cov.values()), "kab_layak_label_mutu": layak,
                            "catatan": "kab-bulan di luar ini = tak teramati, bukan negatif"},
                "tak_cocok": {"dalops": st["tak_cocok"]}}
        with open(os.path.join(KELUAR, f"dalops_{h}.json"), "w", encoding="utf-8") as f:
            json.dump(dict(meta, ringkas=ringkas(rek, st["tak_cocok"]), kejadian=rek, teramati={k: sorted(v) for k, v in cov.items()}), f, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(KELUAR, f"dibi_{h}.json"), "w", encoding="utf-8") as f:
            json.dump({"dibuat": wib, "bahaya": h, "ringkas": ringkas(db, dtak), "tak_cocok": dtak, "kejadian": db}, f, ensure_ascii=False, separators=(",", ":"))
        r, d = ringkas(rek), ringkas(db, dtak)
        print(f"{h:11s} dalops: {r['kejadian']} kejadian, {r['kab']} kab, {r['dari']}..{r['sampai']}, kab-layak {layak} | dibi: {d['kejadian']} kejadian, {d['kab']} kab, "
              f"{d['dari']}..{d['sampai']}, tak_cocok {d['tak_cocok']}" + (f" | +{len(tambah)} baris rob_label" if h == "rob" and tambah else ""))
    print("tak_cocok dalops teratas:", list(st["tak_cocok"].items())[:8])
    print("keluar:", KELUAR)


# ---------- uji ----------
def uji():
    def tolak(f, *a):
        try:
            f(*a)
        except (ValueError, KeyError, AssertionError):
            return
        raise AssertionError("harus ditolak")

    # Tiap alias harus menunjuk nama baku yang ada di kode.json dan provinsinya sama.
    nk = peta_kode()[0]
    for asal, baku in ALIAS.items():
        assert asal.split("|")[0] == baku.split("|")[0], f"alias {asal} pindah provinsi ke {baku}"
        assert cocok_kab(asal, nk), f"alias {asal} -> {baku} tidak ada di kode.json"

    import tempfile
    n2k = {"33|Blora": "3316", "33|Kota Magelang": "3371", "32|Bogor": "3201"}
    hi = dt.date(2026, 11, 25)
    isi = ("id_kejadian,jenis,tgl_kejadian,pertama_dicatat,kabkota,kab_kode,subjenis\n"
           "a,banjir,2024-03-10,2024-03-12,Kab. Blora,33|Blora,\n"
           "b,cuaca,2024-03-11,2024-03-11,Kab. Blora; Kab. Bogor,33|Blora; 32|Bogor,puting_beliung; angin_kencang\n"
           "c,cuaca,2024-04-02,2024-04-02,Kab. Blora,33|Blora,gelombang_tinggi; abrasi\n"
           "d,longsor,2024-03-15,2024-03-15,Kab. Hantu,33|Hantu,\n"
           "e,banjir,9202-01-01,2024-01-01,Kab. Blora,33|Blora,\n"
           "f,banjir,2024-03-10,2024-03-10,Kab. Blora,33|Blora,\n"
           "g,gempabumi,2024-05-05,,Kab. Bogor,32|Bogor,\n"
           "h,karhutla,2024-06-01,2024-06-02,Kab. Blora,Kab. Blora,\n"
           "i,gelombang_pasang,2024-07-01,2024-07-01,Kota Magelang,33|Kota Magelang,\n")
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "l.csv")
        open(p, "w", encoding="utf-8").write(isi)
        baris, st = baca_dalops(p, n2k, hi)
    # parsing: tanggal salah dibuang; kab tak dikenal masuk tak_cocok berhitung (tak ada kode karangan)
    assert st["tanggal_dibuang"] == 1 and st["tak_cocok"] == {"33|Hantu": 1, "Kab. Blora": 1}, st
    assert {b["kab"] for b in baris} <= set(n2k.values())
    # dedup kab-hari-jenis: dua baris banjir 10 Mar -> satu, tanggal_lapor paling awal
    bj = rekaman(baris, "banjir")
    assert bj == [{"kab": "3316", "tanggal": "2024-03-10", "jenis": "banjir", "sumber": "dalops", "tanggal_lapor": "2024-03-10"}], bj
    # dua tanggal dibawa: kejadian vs lapor
    assert rekaman([{"bahaya": {"banjir"}, "kab": "k", "tgl": "2024-03-10", "lapor": "2024-03-12"}], "banjir")[0]["tanggal_lapor"] == "2024-03-12"
    # pemetaan bahaya: puting beliung -> cuaca; gelombang/abrasi saja -> rob (proksi), bukan cuaca
    assert [r["kab"] for r in rekaman(baris, "cuaca")] == ["3201", "3316"] and [r["tanggal"] for r in rekaman(baris, "rob")] == ["2024-04-02", "2024-07-01"]
    assert rekaman(baris, "kekeringan") == [] and bahaya_baris("lainnya", "") == set() and bahaya_baris("gempabumi", "") == set()
    # cakupan: Blora teramati Mar, Apr, Jun; Bogor Mar, Mei; Mei di Blora = tak teramati, BUKAN 0
    cov = cakupan_label(baris, "banjir")
    assert set(cov["3316"]) == {"2024-03", "2024-04"} and "2024-05" not in cov["3316"] and set(cov["3201"]) == {"2024-03", "2024-05"}, cov
    ada = {(r["kab"], r["tanggal"]) for r in bj}
    assert status(cov, ada, "3316", "2024-03-10") == "ada" and status(cov, ada, "3316", "2024-03-20") == "tidak"
    assert status(cov, ada, "3316", "2024-05-10") == "tak_teramati" and status(cov, ada, "9999", "2024-03-10") == "tak_teramati"
    # skor: alarm sehari lebih awal = salah tanpa toleransi, benar dengan toleransi 1; kab-bulan tak teramati dibuang, tidak jadi tn
    kasus = [("3316", "2024-03-09", True), ("3316", "2024-03-10", False), ("3316", "2024-03-20", False), ("3316", "2024-05-10", False)]
    s = skor_dua(kasus, bj, cov)
    a, b = s["tanpa_toleransi"], s["toleransi_1_hari"]
    assert (a["tp"], a["fp"], a["fn"], a["tn"], a["n_tak_teramati"]) == (0, 1, 1, 1, 1), a
    assert (b["tp"], b["fp"], b["fn"], b["tn"], b["n_tak_teramati"]) == (1, 0, 1, 1, 1), b
    assert a["n_kasus"] == b["n_kasus"] == 3
    # tanggal sah
    assert tanggal_sah("2024-02-29", hi) and not tanggal_sah("9202-01-01", hi) and not tanggal_sah("2026-12-01", hi) and not tanggal_sah(None, hi) and not tanggal_sah("2024-13-40", hi)
    # kab tak dikenal ditolak
    assert cocok_kab("33|Blora", n2k) == "3316" and cocok_kab("33|Kab. Blora", n2k) == "3316" and cocok_kab("99|Antah", n2k) is None and cocok_kab("tanpa-bar", n2k) is None
    tolak(DIBI_JENIS.__getitem__, "gempa")
    # DIBI terpisah (bukan Dalops), bencana=0 dan kab tak dikenal tak jadi kode
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "d.json")
        json.dump({"kejadian": [{"tanggal": "2025-11-23", "jenis": "Banjir", "kab_kode": "33.16", "kab": "Blora", "bencana": 1},
                                {"tanggal": "2025-11-24", "jenis": "Banjir", "kab_kode": "33.16", "kab": "Blora", "bencana": 0},
                                {"tanggal": "2025-11-25", "jenis": "Banjir", "kab_kode": "99.99", "kab": "Hantu", "bencana": 1}]}, open(p, "w"))
        rb, tk = muat_dibi("banjir", p, {"33.16": "3316"})
    assert rb == [{"kab": "3316", "tanggal": "2025-11-23", "jenis": "banjir", "sumber": "dibi", "tanggal_lapor": None}] and tk == {"Hantu": 1}, (rb, tk)
    # kode nyata: kunci_nama tunggal, tak ada kode ganda
    n, k = peta_kode()
    assert len(set(n.values())) == len(n) and n["32|Bogor"] == "3201"
    print("ok label_dalops")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["jalan"] and all(x in BAHAYA for x in a[1:]):
        jalan(tuple(a[1:]) or BAHAYA)
    else:
        sys.exit("pakai: uji | jalan [karhutla banjir longsor cuaca kekeringan rob]")
