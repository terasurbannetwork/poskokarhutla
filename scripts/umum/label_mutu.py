"""Mutu label kejadian per kab-bulan (KI-16). Python stdlib saja.

Aturan DITIRU (bukan diimpor; berkas aslinya beku/milik modul lain) dari:
  scripts/kekeringan/label.py + ujilabel.py + RISET-LABEL.md  cakupan sumber, "tak teramati" bukan negatif,
                                                               persistensi tanpa bocor (pertama_dicatat)
  scripts/banjir/genangan/petabencana.py                       saring laporan latihan (kata kunci, pelapor berulang)
Hanya pembanding.py (KI-10) yang dimuat.

Baris sumber = dict {sumber, kab "pp|Nama", tgl "YYYY-MM-DD" (kejadian), dicatat "YYYY-MM-DD"|None (pertama dicatat),
                     target bool, teks?, pelapor?, lon?, lat?}. Baris bukan-target tetap dihitung untuk CAKUPAN.

  cakupan(rows)          {(kab,bulan): [sumber]}: sumber pernah menerbitkan APA PUN untuk kab itu di bulan itu.
                         Kab-bulan di luar itu = "tak_teramati": tidak pernah dihitung negatif.
  saring_latihan(rows)   buang kata latihan/simulasi/uji coba dan pelapor yang sama di koordinat sama (simpan yang pertama).
  bangun_label(rows)     {kab: {bulan: (y, tahu)}}, hanya bulan teramati. y = ada baris target bertanggal kejadian di bulan itu.
                         tahu = ada baris target kejadian bulan itu yang SUDAH dicatat paling lambat akhir bulan itu
                         (dicatat kosong = tidak dianggap tahu). Persistensi memakai tahu, bukan y: tanpa bocor.
  kab_layak(label, latih, uji)  per kab: layak bila cakupan >= 80% bulan DAN CSI persistensi <= CSI klimatologi + 0,05.
Ambang 0,05 / 80% / alarm klimatologi >= 0,5 = BAWAAN SEMENTARA (KEPUTUSAN Q7), dilaporkan bersama angka mentahnya.

  python3 -I scripts/umum/label_mutu.py uji
  python3 -I scripts/umum/label_mutu.py jalan longsor|cuaca     (tulis public/data/label_mutu/<bahaya>.json)
"""
import csv
import datetime as dt
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
AMBANG = {"status": "BAWAAN SEMENTARA (KEPUTUSAN-KEMAMPUAN Q7, belum disetujui pemilik)",
          "selisih_csi": 0.05, "cakupan_min": 0.8, "alarm_klimatologi_min": 0.5}
LATIH, UJI = ("2016-01", "2021-12"), ("2022-01", "2025-12")
# ditiru dari petabencana.RE_KATA (tanpa kata khas PetaBencana: hkb/hkn/112challange) + negasi sosialisasi
RE_KATA = re.compile(r"\b(simulasi|latihan|pelatihan|uji\s*coba|percobaan|sosialisasi|gladi|drill|testing|re-?test|training|pelatih|tes|test)\b", re.I)
RE_NEGASI_SOS = re.compile(r"\b(belum|tidak|tanpa|kurang)\b[^.\n]{0,15}\bsosialisasi\b", re.I)


def _pembanding():
    s = importlib.util.spec_from_file_location("pembanding_lm", os.path.join(os.path.dirname(os.path.abspath(__file__)), "pembanding.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def bulan_dari(tgl):
    return tgl[:7] if isinstance(tgl, str) and re.match(r"^\d{4}-\d{2}-\d{2}", tgl) else None


def deret(a, b):
    """['YYYY-MM'] dari a sampai b inklusif."""
    y, m, y2, m2 = int(a[:4]), int(a[5:]), int(b[:4]), int(b[5:])
    out = []
    while (y, m) <= (y2, m2):
        out.append(f"{y}-{m:02d}")
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out


def sebelum(ym):
    y, m = int(ym[:4]), int(ym[5:])
    return f"{y}-{m - 1:02d}" if m > 1 else f"{y - 1}-12"


def cakupan(rows):
    out = {}
    for r in rows:
        b = bulan_dari(r.get("tgl"))
        if b and r.get("kab"):
            s = out.setdefault((r["kab"], b), set())
            s.add(r["sumber"])
    return {k: sorted(v) for k, v in out.items()}


def saring_latihan(rows):
    """-> (bersih, {"masuk","kata","berulang","lolos"})."""
    rk, bersih, lihat = {"masuk": len(rows), "kata": 0, "berulang": 0}, [], set()
    for r in sorted(rows, key=lambda x: x.get("tgl") or ""):
        t = r.get("teks") or ""
        kata = {k.lower() for k in RE_KATA.findall(t)}
        if kata == {"sosialisasi"} and RE_NEGASI_SOS.search(t):
            kata = set()
        if kata:
            rk["kata"] += 1
            continue
        if r.get("pelapor") and r.get("lon") is not None and r.get("lat") is not None:
            k = (r["pelapor"], round(r["lon"], 4), round(r["lat"], 4))
            if k in lihat:
                rk["berulang"] += 1
                continue
            lihat.add(k)
        bersih.append(r)
    rk["lolos"] = len(bersih)
    return bersih, rk


def bangun_label(rows):
    cak = cakupan(rows)
    lab = {}
    for (kab, b) in cak:
        lab.setdefault(kab, {})[b] = [0, 0]
    for r in rows:
        b = bulan_dari(r.get("tgl"))
        if not (r.get("target") and b and r.get("kab")):
            continue
        c = lab[r["kab"]][b]
        c[0] = 1
        d = bulan_dari(r.get("dicatat"))
        if d and d <= b:
            c[1] = 1
    return {k: {b: tuple(v) for b, v in sorted(m.items())} for k, m in lab.items()}


def _nilai(kab_label, latih, uji, P):
    """Persistensi tanpa bocor vs klimatologi untuk satu kab. -> (kontingensi pers, kontingensi klim, n_uji)."""
    rl = [{"unit": 0, "bulan": int(b[5:]), "y": kab_label[b][0]} for b in kab_label if latih[0] <= b <= latih[1]]
    ub = [b for b in kab_label if uji[0] <= b <= uji[1] and sebelum(b) in kab_label]
    y = [kab_label[b][0] for b in ub]
    pers = [bool(kab_label[sebelum(b)][1]) for b in ub]
    prob = P.klimatologi(rl, [{"unit": 0, "bulan": int(b[5:])} for b in ub]) if ub else []
    klim = [p >= AMBANG["alarm_klimatologi_min"] for p in prob]
    return P.kontingensi(pers, y), P.kontingensi(klim, y), len(ub)


def kab_layak(label, latih=LATIH, uji=UJI):
    """-> list per kab {kab, layak, alasan[], cakupan, n_uji, persistensi{tp,fp,fn,tn,csi}, klimatologi{...}}."""
    P = _pembanding()
    jendela = len(deret(latih[0], uji[1]))
    hasil = []
    for kab in sorted(label):
        kl = label[kab]
        cak = sum(1 for b in kl if latih[0] <= b <= uji[1]) / jendela
        kp, kk, n = _nilai(kl, latih, uji, P)
        alasan = []
        if cak < AMBANG["cakupan_min"]:
            alasan.append(f"cakupan {cak:.0%} < {AMBANG['cakupan_min']:.0%} bulan")
        if kp["csi"] is None or kk["csi"] is None:
            alasan.append("CSI tak terdefinisi (tanpa kejadian dan tanpa alarm di uji)")
        elif kp["csi"] > kk["csi"] + AMBANG["selisih_csi"]:
            alasan.append(f"persistensi {kp['csi']:.3f} > klimatologi {kk['csi']:.3f} + {AMBANG['selisih_csi']}")
        sk = lambda k: {x: k[x] for x in ("tp", "fp", "fn", "tn", "csi")}
        hasil.append({"kab": kab, "layak": not alasan, "alasan": alasan, "cakupan": round(cak, 3), "n_uji": n,
                      "persistensi": sk(kp), "klimatologi": sk(kk)})
    return hasil


# ---------- pemuat sumber (hanya dipakai `jalan`) ----------
def _kunci(prov, nama):
    n = re.sub(r"^(kabupaten|kab\.)\s*", "", (nama or "").strip(), flags=re.I)
    return f"{prov}|{n}"


def _logbook(target):
    rows, buang = [], 0
    with open(os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            t = r["tgl_kejadian"]
            if not (bulan_dari(t) and "2011" <= t[:4] <= str(dt.date.today().year)):
                buang += 1
                continue
            for k in r["kab_kode"].split(";"):
                if "|" in k:
                    rows.append({"sumber": "logbook", "kab": k.strip(), "tgl": t, "dicatat": r["pertama_dicatat"] or None, "target": r["jenis"] in target})
    return rows, buang


def _dibi_longsor():
    d = json.load(open(os.path.join(AKAR, "public/longsor/data/kejadian.json"), encoding="utf-8"))
    return [{"sumber": "dibi", "kab": d["kab"][i], "tgl": t, "dicatat": None, "target": True} for t, i, n, g in d["dibi"]]


def _dibi_cuaca():
    d = json.load(open(os.path.join(AKAR, "public/data/dibi_kejadian.json"), encoding="utf-8"))
    return [{"sumber": "dibi", "kab": _kunci(r["prov_kode"], r["kab"]), "tgl": r["tanggal"], "dicatat": None,
             "target": r["jenis"] in ("Cuaca Ekstrem", "Angin Kencang")} for r in d["kejadian"] if r.get("bencana", 1)]


BAHAYA = {"longsor": ({"longsor"}, _dibi_longsor), "cuaca": ({"cuaca"}, _dibi_cuaca)}


def jalan(bahaya):
    target, dibi = BAHAYA[bahaya]
    lb, buang = _logbook(target)
    db = dibi()
    rows, rk = saring_latihan(lb + db)
    hasil = kab_layak(bangun_label(rows))
    per = {s: sum(1 for r in rows if r["sumber"] == s and LATIH[0] <= r["tgl"][:7] <= UJI[1]) for s in ("logbook", "dibi")}
    positif = {s: sum(1 for r in rows if r["sumber"] == s and r["target"] and LATIH[0] <= r["tgl"][:7] <= UJI[1]) for s in per}
    layak = [h["kab"] for h in hasil if h["layak"]]
    alasan = {}
    for h in hasil:
        for a in h["alasan"]:
            k = re.sub(r"[\d.,]+%?", "#", a)
            alasan[k] = alasan.get(k, 0) + 1
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "bahaya": bahaya, "periode": {"latih": LATIH, "uji": UJI}, "ambang": AMBANG,
           "aturan": "CSI persistensi tanpa bocor (tahu = dicatat paling lambat akhir bulan) tidak lebih baik daripada klimatologi kab x bulan-kalender (dilatih di periode latih saja) + selisih; cakupan >= batas. Kab-bulan tanpa sumber = tak teramati, bukan negatif.",
           "catatan": "DIBI tanpa tanggal dicatat dianggap tidak dikenal untuk persistensi (konservatif). Saring latihan tidak membuang apa pun bila sumber tak membawa teks/pelapor. Hanya agregat per kab.",
           "sumber": {"baris_per_sumber_di_jendela": per, "baris_target_di_jendela": positif, "tanggal_logbook_dibuang": buang, "saring_latihan": rk},
           "ringkas": {"kab_dinilai": len(hasil), "kab_layak": len(layak), "alasan_tak_layak": alasan},
           "kab_layak": layak,
           "kolom_kab": ["kab", "cakupan", "n_uji", "pers_tp", "pers_fp", "pers_fn", "pers_csi", "klim_tp", "klim_fp", "klim_fn", "klim_csi", "layak"],
           "kab": [[h["kab"], h["cakupan"], h["n_uji"], h["persistensi"]["tp"], h["persistensi"]["fp"], h["persistensi"]["fn"],
                    None if h["persistensi"]["csi"] is None else round(h["persistensi"]["csi"], 3),
                    h["klimatologi"]["tp"], h["klimatologi"]["fp"], h["klimatologi"]["fn"],
                    None if h["klimatologi"]["csi"] is None else round(h["klimatologi"]["csi"], 3), int(h["layak"])] for h in hasil if h["n_uji"] or h["cakupan"] >= 0.5]}
    p = os.path.join(AKAR, f"public/data/label_mutu/{bahaya}.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(bahaya, out["ringkas"], os.path.getsize(p), "byte")


# ---------- uji ----------
def uji():
    def tolak(f, *a):
        try:
            f(*a)
        except (ValueError, AssertionError):
            return
        raise AssertionError("harus ditolak")

    L = lambda kab, tgl, dicatat=None, target=True, sumber="logbook", **k: dict(sumber=sumber, kab=kab, tgl=tgl, dicatat=dicatat, target=target, **k)
    # cakupan: baris bukan-target tetap menutup bulan; bulan tanpa sumber = tak teramati
    rows = [L("A|x", "2020-03-05", "2020-03-06"), L("A|x", "2020-05-01", target=False)]
    assert cakupan(rows) == {("A|x", "2020-03"): ["logbook"], ("A|x", "2020-05"): ["logbook"]}
    lab = bangun_label(rows)
    assert lab["A|x"] == {"2020-03": (1, 1), "2020-05": (0, 0)} and "2020-04" not in lab["A|x"]   # April tak teramati, bukan negatif
    # saring latihan: kata, negasi sosialisasi, pelapor+koordinat berulang (yang pertama dipertahankan)
    rr = [L("A|x", "2020-01-01", teks="SIMULASI longsor"), L("A|x", "2020-01-02", teks="belum ada sosialisasi, tanah turun"),
          L("A|x", "2020-01-03", teks="Sosialisasi desa tangguh"), L("A|x", "2020-01-04", teks="longsor", pelapor="p", lon=106.1, lat=-6.1),
          L("A|x", "2020-01-05", teks="longsor", pelapor="p", lon=106.1, lat=-6.1), L("A|x", "2020-01-06", teks="longsor", pelapor="p", lon=107.0, lat=-6.1)]
    b, rk = saring_latihan(rr)
    assert [r["tgl"][-2:] for r in b] == ["02", "04", "06"] and rk["kata"] == 2 and rk["berulang"] == 1, (rk, b)
    # kebocoran: kejadian Maret baru DICATAT April. Dengan tgl-catat persistensi April tak tahu; memakai tgl kejadian akan tahu
    bocor = [L("B|y", "2021-03-10", "2021-04-02"), L("B|y", "2021-04-12", "2021-04-12")]
    lb = bangun_label(bocor)["B|y"]
    assert lb["2021-03"] == (1, 0) and lb["2021-04"] == (1, 1)
    P = _pembanding()
    pers = lambda l, b: bool(l[sebelum(b)][1])
    assert pers(lb, "2021-04") is False                      # tanpa bocor: tak ada alarm April
    assert bool(lb["2021-03"][0]) is True                    # andai y dipakai: alarm April = benar -> CSI palsu naik
    # kab_layak: kab C (cakupan penuh, kejadian acak lemah) layak; kab D hanya terlapor 2 bulan -> ditolak cakupan
    sem = []
    for b in deret("2016-01", "2025-12"):
        y = (int(b[:4]) * 7 + int(b[5:]) * 3) % 5 == 0
        sem.append(L("C|c", b + "-15", b + "-20", target=y))
    sem += [L("D|d", "2023-01-10", "2023-01-10"), L("D|d", "2023-02-10", "2023-02-10")]
    h = {x["kab"]: x for x in kab_layak(bangun_label(sem))}
    assert h["D|d"]["layak"] is False and any("cakupan" in a for a in h["D|d"]["alasan"]), h["D|d"]
    assert h["C|c"]["cakupan"] == 1.0 and h["C|c"]["n_uji"] == 48, h["C|c"]
    # persistensi unggul: latih tanpa kejadian (klimatologi diam), uji punya rangkaian Mar-Mei 2022 yang dicatat tepat waktu -> pers tp2 fp1 fn1 csi .5 > 0 + .05
    ber = [L("E|e", b + "-15", b + "-16", target=b in ("2022-03", "2022-04", "2022-05")) for b in deret("2016-01", "2025-12")]
    e = {x["kab"]: x for x in kab_layak(bangun_label(ber))}["E|e"]
    assert (e["persistensi"]["tp"], e["persistensi"]["fp"], e["persistensi"]["fn"]) == (2, 1, 1) and e["klimatologi"]["csi"] == 0, e
    assert e["layak"] is False and any("persistensi" in a for a in e["alasan"]), e
    # CSI tak terdefinisi (tanpa kejadian) -> tak layak, bukan layak
    nol = {x["kab"]: x for x in kab_layak(bangun_label([L("F|f", b + "-15", b + "-16", target=False) for b in deret("2016-01", "2025-12")]))}["F|f"]
    assert nol["layak"] is False and any("tak terdefinisi" in a for a in nol["alasan"])
    # dicatat kosong tidak dianggap tahu
    assert bangun_label([L("G|g", "2020-02-02", None)])["G|g"]["2020-02"] == (1, 0)
    tolak(P.persistensi, {"A": {1: 1}}, 0)
    print("ok label_mutu")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["jalan"] and len(a) == 2 and a[1] in BAHAYA:
        jalan(a[1])
    else:
        sys.exit("pakai: uji | jalan longsor|cuaca")
