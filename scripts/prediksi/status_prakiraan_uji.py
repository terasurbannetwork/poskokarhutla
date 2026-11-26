"""Uji balik status prakiraan BNJ, LSR, CEX lewat gerbang bersama (DP-07) + arsip harian status (D36).

Unit = (terbit t, tenggang d, kab) dengan tanggal sasaran s = t + d; blok bootstrap = s. Alarm A = status >= 2 (Siaga); >= 1 (Waspada)
dilaporkan terpisah. Kejadian y = ada kejadian jenis itu di kab itu pada s-1..s+1 (prediksi-kejadian K3). Label DIBI dan logbook Pusdalops dinilai
TERPISAH, tidak dirata-rata. Pembanding: persistensi (kejadian hari t-1) dan klimatologi (kab x bulan, dari hari <= min(t)-2 saja), keduanya
pada jumlah alarm SAMA (scripts/umum/pembanding.samakan_alarm, imbang dipecah deterministik dan dilaporkan). Selang 95% bootstrap blok per tanggal sasaran.
Retrospektif = status direkonstruksi dari arsip prakiraan beku (hanya komponen P, tanpa R BMKG dan tanpa hari 0): informasi, TIDAK menentukan boleh_tampil.
boleh_tampil hanya dari status_arsip (prospektif): selisih > 0, batas bawah > 0, >= 30 hari sasaran dan >= 30 kejadian, vonis 'lolos'.
Keluaran: public/data/gerbang/status_prakiraan.json. Arsip: public/prediksi/data/status_arsip/YYYY-MM.jsonl (append-only, putaran pertama >= 07.00 WIB).
Pakai: python3 -I scripts/prediksi/status_prakiraan_uji.py | cek.   Python 3.9 lokal.
"""
import datetime as dt, glob, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, AB)
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import gerbang as G, pembanding as PB   # noqa: E402
import status_prakiraan as SP           # noqa: E402

ARSIP_STATUS = os.path.join(AKAR, "public/prediksi/data/status_arsip")
ARSIP_PRAKIRAAN = os.path.join(AKAR, "public/prediksi/data/arsip")
KELUAR = os.path.join(AKAR, "public/data/gerbang/status_prakiraan.json")
LOGBOOK = os.path.join(AKAR, "public/data/logbook_kejadian.json")
WIB = SP.WIB
HARI_MIN = N_MIN = 30
JENIS_LB = {"BNJ": {"banjir", "banjir_bandang", "banjir_longsor"}, "LSR": {"longsor", "banjir_longsor"}, "CEX": {"cuaca"}}


def tambah(t, n):
    return (dt.date.fromisoformat(t) + dt.timedelta(days=n)).isoformat()


# ---------- arsip harian status (P19) ----------
def arsipkan(out, kini, folder=ARSIP_STATUS):
    """Satu baris per tanggal WIB, hanya dari putaran pertama >= 07.00 WIB; jalan ulang tak menambah, baris lama tak berubah. -> True bila menulis."""
    w = kini.astimezone(WIB)
    if w.strftime("%H:%M") < SP._json(SP.KRITERIA)["arsip_mulai_wib"]:
        return False
    tgl, p = w.date().isoformat(), os.path.join(folder, w.strftime("%Y-%m") + ".jsonl")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            for b in f:
                if json.loads(b)["t"] == tgl:     # baris rusak = ValueError: berhenti, tak ditimpa
                    return False
    os.makedirs(folder, exist_ok=True)
    kab = {i: {k: v["hari"] for k, v in d.items()} for i, d in out["kab"].items()}
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps({"t": tgl, "dibuat": out["dibuat"], "umpan_bmkg": out["sumber"]["umpan_bmkg"], "kab": kab}, ensure_ascii=False, separators=(",", ":")) + "\n")
    return True


def baca_status_arsip(folder=ARSIP_STATUS):
    for p in sorted(glob.glob(os.path.join(folder, "*.jsonl"))):
        with open(p, encoding="utf-8") as f:
            for b in f:
                yield json.loads(b)


# ---------- sumber status ----------
def status_retro(kr, kelas, folder=ARSIP_PRAKIRAAN):
    """Arsip prakiraan beku -> {kode: [(t, d, kab, S)]}, d 1..3; baris pertama per (t, kode); E tanpa data = dilewati."""
    out, lihat = {k: [] for k in kr["bahaya"]}, set()
    for p in sorted(glob.glob(os.path.join(folder, "*.jsonl"))):
        with open(p, encoding="utf-8") as f:
            for b in f:
                r = json.loads(b)
                k = r["k"]
                if k not in out or (r["t"], k) in lihat:
                    continue
                lihat.add((r["t"], k))
                for kab, rs in r["kab"].items():
                    K = SP.ambil_K(kelas, kab, kr["kelas_kab"][k])
                    for n in (1, 2, 3):
                        E = SP.level_sel(k, r["kol"], rs[n - 1] if len(rs) >= n else None)
                        S = SP.tabel(kr, k, K, E, None)
                        if S is not None and r["hari"][n - 1] == tambah(r["t"], n):
                            out[k].append((r["t"], n, kab, S))
    return out


def status_pros(kr):
    out = {k: [] for k in kr["bahaya"]}
    for r in baca_status_arsip():
        for kab, d in r["kab"].items():
            for k in out:
                for n, S in enumerate(d.get(k) or []):
                    if S is not None:
                        out[k].append((r["t"], n, kab, S))
    return out


# ---------- label ----------
def label_dibi(kode, cari):
    import nilai as N
    am, akhir = N.amatan_dibi(AKAR, cari, kode)
    ev = {}
    for t, h in am.items():
        for i in h["kab"]:
            ev.setdefault(i, set()).add(t)
    return ev, (min(am) if am else None), akhir


def label_logbook(kode, cari):
    d = SP._json(LOGBOOK)
    if not d:
        return {}, None, None
    ev = {}
    for r in d["kejadian"]:
        t = r.get("mulai") or (r.get("terlihat") or [None])[0]
        i = cari(r.get("prov"), r.get("kab")) if t and r.get("jenis") in JENIS_LB[kode] else None
        if i:
            ev.setdefault(i, set()).add(t)
    return ev, d["dari"], d["sampai"]


# ---------- baris uji + evaluasi ----------
def baris(st, ev, dari, akhir, kabs):
    """st = [(t, d, kab, S)]. Hanya sasaran dengan label lengkap (s-1 >= dari, s+1 <= akhir). -> (rows, dibuang_tanpa_label)."""
    if not st or dari is None:
        return [], len(st)
    ya = lambda i, s: int(any(tambah(s, o) in ev.get(i, ()) for o in (-1, 0, 1)))
    cut = tambah(min(t for t, _, _, _ in st), -2)
    latih, u = [], tambah(dari, 1)
    while u <= cut and tambah(u, 1) <= akhir:
        latih += [{"unit": i, "bulan": u[5:7], "y": ya(i, u)} for i in kabs]
        u = tambah(u, 1)
    rows, buang = [], 0
    for t, d, kab, S in st:
        s = tambah(t, d)
        if tambah(s, -1) < dari or tambah(s, 1) > akhir:
            buang += 1
            continue
        rows.append({"blok": s, "kab": kab, "bulan": s[5:7], "unit": kab, "S": S, "y": ya(kab, s), "pers": int(tambah(t, -1) in ev.get(kab, ())), "t": t, "d": d})
    if rows:
        kl = PB.klimatologi(latih, rows) if latih else [None] * len(rows)
        for r, k in zip(rows, kl):
            r["klim"] = k
        rows = [r for r in rows if r["klim"] is not None]
    return rows, buang


def evaluasi(rows, ambang, B=1000):
    """-> dict angka atau None. Alarm pembanding = jumlah alarm model."""
    if not rows:
        return None
    y = [r["y"] for r in rows]
    am = [r["S"] >= ambang for r in rows]
    pecah = ["%s|%s" % (r["blok"], r["kab"]) for r in rows]
    sp = PB.samakan_alarm(am, [r["pers"] for r in rows], y, pecah)
    sk = PB.samakan_alarm(am, [r["klim"] for r in rows], y, pecah)
    nk = sum(y)
    if nk == 0 or sp is None or sk is None or sp["n_alarm"] == 0:
        return {"n_baris": len(rows), "n_hari": len({r["blok"] for r in rows}), "n_kejadian": nk, "n_alarm": sum(am), "lengkap": False}
    for r, a, b in zip(rows, sp["alarm"], sk["alarm"]):
        r["a_p"], r["a_k"] = a, b
    rec = lambda rs, f: sum(1 for r in rs if r[f] and r["y"]) / sum(r["y"] for r in rs) if sum(r["y"] for r in rs) else None
    for r in rows:
        r["a_m"] = r["S"] >= ambang
    h = {f: rec(rows, f) for f in ("a_m", "a_p", "a_k")}
    kuat = "a_p" if h["a_p"] >= h["a_k"] else "a_k"      # pembanding terkuat menentukan
    fn = lambda rs: None if not sum(r["y"] for r in rs) else rec(rs, "a_m") - rec(rs, kuat)
    sel = None
    try:
        c = PB.bootstrap_blok(fn, rows, "blok", B=B)
        sel = [c["lo"], c["hi"]] if c["lo"] is not None else None
    except ValueError:
        pass
    return {"n_baris": len(rows), "n_hari": len({r["blok"] for r in rows}), "n_kejadian": nk, "n_alarm": sum(am), "lengkap": True,
            "recall": {"model": h["a_m"], "persistensi": h["a_p"], "klimatologi": h["a_k"]}, "kuat": "persistensi" if kuat == "a_p" else "klimatologi",
            "imbang_dipecah": {"persistensi": sp["imbang_dipecah"], "klimatologi": sk["imbang_dipecah"]}, "selang": sel}


def entri(ev_, nama, prospektif):
    """Evaluasi -> entri gerbang. prospektif=False: boleh_tampil selalu false (informasi)."""
    if not ev_ or not ev_.get("lengkap"):
        n = (ev_ or {}).get("n_hari", 0)
        e = G.kosong("kejadian tertangkap pada jumlah alarm sama", "belum teruji: %s" % ("tidak ada kejadian, alarm, atau label untuk dinilai" if ev_ else "tidak ada pasangan berlabel"),
                     pembanding="persistensi dan klimatologi")
        e["n"] = n
        e["belum_teruji"] = True
        return e
    cukup = ev_["n_hari"] >= HARI_MIN and ev_["n_kejadian"] >= N_MIN
    rc = ev_["recall"]
    pb = rc[ev_["kuat"]]
    sel = ev_["selang"]
    vonis = "belum_cukup_data" if not cukup else None
    if vonis is None:
        ok, _ = G.putusan(rc["model"] - pb, tuple(sel) if sel else None)
        vonis = "lolos" if ok else "gagal"
    e = G.entri_ringkas("kejadian tertangkap pada jumlah alarm sama (recall)", "tinggi", "%s (pembanding terkuat dari persistensi dan klimatologi)" % ev_["kuat"],
                        ev_["n_hari"], rc["model"], pb, sel, vonis=vonis, prospektif=True, n_kejadian=ev_["n_kejadian"], n_alarm=ev_["n_alarm"],
                        recall_persistensi=rc["persistensi"], recall_klimatologi=rc["klimatologi"], imbang_dipecah=ev_["imbang_dipecah"])
    if not cukup:
        e["boleh_tampil"] = False
        e["alasan"] = "belum teruji: %d hari sasaran dan %d kejadian (perlu >= %d dan >= %d); %s" % (ev_["n_hari"], ev_["n_kejadian"], HARI_MIN, N_MIN, e["alasan"])
        e["belum_teruji"] = True
    if not prospektif:
        e["boleh_tampil"] = False
        e["alasan"] = "retrospektif dari arsip prakiraan (hanya komponen P): informasi, bukan dasar boleh_tampil; " + e["alasan"]
    return e


def jalankan(keluar=KELUAR, kini=None):
    kr = SP._json(SP.KRITERIA)
    kelas = SP._json(SP.KELAS)
    kabs_json = SP._json(SP.PREDIKSI)["kab"]
    dasar = SP._muat("sp_dasar", "scripts/prediksi/dasar.py")
    cari, ids = dasar.pencari(kabs_json), [k["id"] for k in kabs_json]
    retro, pros = status_retro(kr, kelas), status_pros(kr)
    A = kr["alarm"]
    ke, rinci = {}, {}
    for k in kr["bahaya"]:
        for lab, fl in (("dibi", label_dibi), ("logbook", label_logbook)):
            ev, dari, akhir = fl(k, cari)
            r = {}
            for nm, st, pros_ in (("retrospektif", retro[k], False), ("prospektif", pros[k], True)):
                rows, buang = baris(st, ev, dari, akhir, ids)
                r[nm] = {"siaga": entri(evaluasi(rows, A["utama"]), nm, pros_), "waspada": entri(evaluasi(rows, A["terpisah"]), nm, pros_),
                         "baris_tanpa_label": buang, "label_sampai": akhir}
            e = r["prospektif"]["siaga"]
            e["retrospektif"] = {"siaga": r["retrospektif"]["siaga"], "waspada": r["retrospektif"]["waspada"], "label_sampai": akhir,
                                 "baris_tanpa_label": r["retrospektif"]["baris_tanpa_label"]}
            e["waspada"] = r["prospektif"]["waspada"]
            ke["%s_%s" % (k, lab)] = e
            rinci[k + "_" + lab] = r
    kini = kini or dt.datetime.now(dt.timezone.utc)
    per = {k: bool(ke[k + "_dibi"]["boleh_tampil"]) for k in kr["bahaya"]}
    out = {"dibuat": kini.astimezone(WIB).isoformat(timespec="seconds"), "versi": 1, "boleh_tampil": all(per.values()), "boleh_per_bahaya": per,
           "catatan": "boleh_tampil per bahaya ditentukan label DIBI prospektif; logbook dinilai terpisah, tidak dirata-rata. Retrospektif (arsip prakiraan, tanpa R BMKG dan hari 0) hanya informasi.",
           "keluaran": ke}
    teks = json.dumps(out, ensure_ascii=False, indent=1)
    assert len(teks.encode("utf-8")) < G.BATAS_BYTE
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    with open(keluar + ".tmp", "w", encoding="utf-8") as f:
        f.write(teks)
    os.replace(keluar + ".tmp", keluar)
    return out


# ---------- cek (P19, P20) ----------
def cek():
    kr = SP._json(SP.KRITERIA)
    kab = {"1101": {"BNJ": {"hari": [1, 2, 0, None]}, "LSR": {"hari": [None] * 4}}}
    out = {"dibuat": "2026-11-26T08:00:00+07:00", "sumber": {"umpan_bmkg": "segar"}, "kab": kab}
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "2026-11.jsonl")
        pagi = dt.datetime(2026, 11, 25, 23, 0, tzinfo=dt.timezone.utc)     # 06.00 WIB: belum jam arsip
        assert arsipkan(out, pagi, d) is False and not os.path.exists(p)
        t1 = dt.datetime(2026, 11, 26, 0, 30, tzinfo=dt.timezone.utc)       # 07.30 WIB
        assert arsipkan(out, t1, d) is True
        b1 = open(p, "rb").read()
        out2 = dict(out, kab={"1101": {"BNJ": {"hari": [3, 3, 3, 3]}}})
        assert arsipkan(out2, t1 + dt.timedelta(hours=5), d) is False and open(p, "rb").read() == b1     # P19: jalan ulang hari sama
        assert arsipkan(out2, t1 + dt.timedelta(days=1), d) is True
        b2 = open(p, "rb").read()
        assert b2.startswith(b1) and b2.count(b"\n") == 2                                                # baris lama tak berubah
        assert [r["t"] for r in baca_status_arsip(d)] == ["2026-11-26", "2026-11-27"]
    # P20: gerbang. Model sempurna lawan pembanding acak, 40 hari: boleh; selang menyentuh nol, n kecil, atau retrospektif: tidak
    import random
    rnd = random.Random(3)
    def sintetik(hari, bagus):
        rs = []
        for b in range(hari):
            for k in range(40):
                y = int(rnd.random() < .2)
                rs.append({"blok": "b%02d" % b, "kab": "k%d" % k, "S": (2 if y else 0) if bagus else int(rnd.random() < .2) * 2, "y": y,
                           "pers": int(rnd.random() < .2), "klim": rnd.random() * .3})
        return rs
    e = entri(evaluasi(sintetik(40, True), 2), "x", True)
    assert e["boleh_tampil"] is True and e["vonis_prospektif"] == "lolos" and e["selang95"][0] > 0, e
    assert entri(evaluasi(sintetik(40, True), 2), "x", False)["boleh_tampil"] is False        # retrospektif tak menentukan
    e = entri(evaluasi(sintetik(40, False), 2), "x", True)
    assert e["boleh_tampil"] is False and e["vonis_prospektif"] != "lolos"                      # model acak: selang menyentuh nol
    e = entri(evaluasi(sintetik(5, True), 2), "x", True)
    assert e["boleh_tampil"] is False and e.get("belum_teruji") and e["vonis_prospektif"] == "belum_cukup_data"
    assert entri(None, "x", True)["boleh_tampil"] is False and entri(evaluasi([], 2), "x", True)["n"] == 0
    # sebelum label: sasaran di luar jendela label dibuang, tak diisi 0
    rows, buang = baris([("2026-11-01", 1, "k0", 2)], {}, "2026-01-01", "2026-10-29", ["k0"])
    assert rows == [] and buang == 1
    print("status_prakiraan_uji: cek hijau (P19, P20)")


if __name__ == "__main__":
    if sys.argv[1:2] == ["cek"]:
        cek()
    else:
        o = jalankan()
        for k, e in o["keluaran"].items():
            print(k, {x: e.get(x) for x in ("n", "n_kejadian", "n_alarm", "skor_model", "skor_pembanding", "selisih", "selang95", "vonis_prospektif", "boleh_tampil")},
                  "| retro:", {x: e["retrospektif"]["siaga"].get(x) for x in ("n", "n_kejadian", "n_alarm", "skor_model", "skor_pembanding", "selisih", "selang95")})
        print("boleh_per_bahaya", o["boleh_per_bahaya"])
