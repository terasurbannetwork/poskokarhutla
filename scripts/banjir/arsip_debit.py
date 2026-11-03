"""Arsip harian masukan operasional model campuran (PRAREG-CAMPUR.md §3.2 q_q2/q_ant_mx/q_ant_mn/dq, §3.4 persistensi, §4.3 P2)
-> data/banjir/arsip_debit/YYYY-MM.jsonl (append-only, dilacak git, TIDAK dilayani situs; letak sama dengan arsip_kab2).

Dua jenis baris, per hari terbit d (hari WIB):
  debit  satu baris per sel sampel (104 sel arsip_kab2): debit GloFAS harian e-7..e+3 (Flood API, timezone=Asia/Jakarta), titik `g`
         yang diminta, `waktu` ambil UTC, `sumber`. Sel yang gagal diambil -> baris `debit_gagal` (tidak menghalangi ulangan).
  label  SATU baris per hari: kab_kode yang punya kejadian pada e-1 = d-1 menurut logbook/DIBI yang TERLIHAT saat ini
         (uji_logbook.label_dari dengan akhir = e-1, jadi tidak memuat tanggal >= d), dibekukan dengan `waktu` ambil dan
         `dibuat`/`sampai` tiap sumber (kesegaran snapshot, bahan "label e-1 tersedia tepat waktu?" PRAREG-CAMPUR §3.4.2).
Baris lama tidak pernah diubah; ulang jalan hari yang sama tidak menggandakan (kunci jenis+terbit[+sel]).
Titik debit: data/banjir/arsip_debit/titik.json (salinan terlacak titik terpilih model_kab_debit, mode `salin-titik`) bila ada,
selain itu pusat sel sampel (API menyesuaikan ke kisi 0,05 derajat; titik terpilih model_kab_debit untuk Q2 latih bisa beda,
maka `salin-titik` WAJIB dijalankan sekali dari berkas titik.json asli sebelum Q2 dipasangkan; kolom `g` = titik yang diminta).
Kuota Open-Meteo: ~104 bobot per hari (11 hari < 14 hari -> 1 bobot per lokasi), 1-3 panggilan.
Pakai:  python3 scripts/banjir/arsip_debit.py   |   ... salin-titik   |   ... uji
"""
import datetime as dt, json, os, shutil, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, MENTAH, WIB, KuotaHabis, ambil as unduh, per_lokasi

ARSIP = os.path.join(AKAR, "data/banjir/arsip_debit")
SAMPEL = os.path.join(AKAR, "data/banjir/kab2_ops/sampel.json")      # sama dengan arsip_kab2 (prediksi_kab2.SAMPEL)
TITIK = os.path.join(ARSIP, "titik.json")
TITIK_RAW = os.path.join(MENTAH, "model_kab_debit/titik.json")
LB, DIBI = (os.path.join(AKAR, f"public/data/{n}.json") for n in ("logbook_kejadian", "dibi_kejadian"))
API = "https://flood-api.open-meteo.com/v1/flood"
SUMBER = "Open-Meteo Flood API, model bawaan (GloFAS v4 seamless), timezone=Asia/Jakarta"
MUNDUR, MAJU, BAGI = 7, 3, 50          # e-7..e+3; sel per panggilan


def jendela(terbit):
    return [(terbit + dt.timedelta(i)).isoformat() for i in range(-MUNDUR, MAJU + 1)]


def daftar_sel(titik=None):
    """-> [(sel (lat, lon), titik debit (lat, lon))] urut. titik.json: {"titik": [{sel, lat, lon}]}; selain itu titik = sel."""
    s = json.load(open(SAMPEL))
    sel = sorted({(round(c[0], 3), round(c[1], 3)) for v in s["sk"].values() for c in v})
    p = {tuple(t["sel"]): (t["lat"], t["lon"]) for t in (titik or {}).get("titik", []) if t.get("g")}
    return [(x, p.get(x, x)) for x in sel]


def ambil_debit(sel, terbit, waktu, fetch=unduh):
    """-> (baris debit, baris debit_gagal). Gagal per kelompok: kuota habis berhenti seluruhnya, galat lain hanya kelompok itu."""
    hari = jendela(terbit)
    ok, gagal = [], []
    for i in range(0, len(sel), BAGI):
        bag = sel[i:i + BAGI]
        url = (f"{API}?latitude={','.join(str(t[1][0]) for t in bag)}&longitude={','.join(str(t[1][1]) for t in bag)}"
               f"&daily=river_discharge&start_date={hari[0]}&end_date={hari[-1]}&timezone=Asia%2FJakarta")
        try:
            data = per_lokasi(fetch(url))
            assert len(data) == len(bag), f"{len(data)} lokasi kembali, diminta {len(bag)}"
        except (KuotaHabis, RuntimeError, AssertionError, ValueError, KeyError) as e:
            for s_, t in bag:
                gagal.append({"jenis": "debit_gagal", "terbit": terbit.isoformat(), "sel": list(s_), "waktu": waktu, "sebab": str(e)[:200]})
            if isinstance(e, KuotaHabis):
                gagal += [{"jenis": "debit_gagal", "terbit": terbit.isoformat(), "sel": list(s_), "waktu": waktu, "sebab": "kuota habis"}
                          for s_, t in sel[i + BAGI:]]
                break
            continue
        for (s_, t), d in zip(bag, data):
            d = d.get("daily", {})
            peta = dict(zip(d.get("time", []), d.get("river_discharge", [])))
            if not peta or list(peta) != hari:       # jendela tidak persis e-7..e+3: tolak, jangan geser diam-diam
                gagal.append({"jenis": "debit_gagal", "terbit": terbit.isoformat(), "sel": list(s_), "waktu": waktu,
                              "sebab": f"jendela {list(peta)[:1]}..{list(peta)[-1:]} bukan {hari[0]}..{hari[-1]}"})
                continue
            ok.append({"jenis": "debit", "terbit": terbit.isoformat(), "sel": list(s_), "g": list(t), "hari0": hari[0],
                       "q": [None if x is None else round(x, 3) for x in peta.values()], "waktu": waktu, "sumber": SUMBER})
    return ok, gagal


def baris_label(terbit, waktu, lb, dibi):
    """lb/dibi = isi berkas JSON utuh. -> satu baris label e-1 yang hanya memuat hari terbit-1."""
    import uji_logbook as UL                      # impor lambat: tarik uji_balik; hanya perlu di sini
    e1 = terbit - dt.timedelta(1)
    lab, _ = UL.label_dari(lb["kejadian"], dibi["kejadian"], akhir=e1)
    i = UL.hari_ke(e1.isoformat())
    kode = {n: sorted(k for k, h in lab[n].items() if i in h) for n in ("lb_mulai", "dibi", "gab_mulai")}
    return {"jenis": "label", "terbit": terbit.isoformat(), "e1": e1.isoformat(), "waktu": waktu, **kode,
            "sumber": {"logbook": {"dibuat": lb.get("dibuat"), "sampai": lb.get("sampai")}, "dibi": {"dibuat": dibi.get("dibuat"), "sampai": dibi.get("sampai")}},
            "catatan": "snapshot terlihat saat waktu ambil; DIBI/logbook susulan tidak masuk; hanya kejadian berhari mulai/tanggal = e1"}


def tulis_arsip(baris, dir_=ARSIP):
    """Tambah baris yang kuncinya belum ada: (jenis, terbit, sel) untuk debit, (jenis, terbit) untuk label; debit_gagal selalu ditambah
    kecuali sel+hari itu sudah punya baris debit ok. Berkas rusak = ValueError (tidak menulis apa pun). -> jumlah baris baru."""
    os.makedirs(dir_, exist_ok=True)
    ada, baru = {}, 0
    kunci = lambda b: (b["jenis"], b["terbit"], tuple(b["sel"]) if "sel" in b else None)
    for b in baris:
        n = os.path.join(dir_, b["terbit"][:7] + ".jsonl")
        if n not in ada:
            ada[n] = set()
            if os.path.exists(n):
                for i, t in enumerate(open(n), 1):
                    if t.strip():
                        try:
                            ada[n].add(kunci(json.loads(t)))
                        except (ValueError, KeyError, TypeError):
                            raise ValueError(f"{n} baris {i} rusak: berhenti, tidak menulis")
        k = kunci(b)
        if b["jenis"] == "debit_gagal":
            if ("debit", b["terbit"], k[2]) in ada[n]:
                continue
        elif k in ada[n]:
            continue
        with open(n, "a") as f:
            f.write(json.dumps(b, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")
        ada[n].add(k)
        baru += 1
    return baru


def sudah_ada(terbit, dir_=ARSIP):
    """-> (set sel yang sudah punya baris debit hari itu, apakah label hari itu ada)."""
    n = os.path.join(dir_, terbit.isoformat()[:7] + ".jsonl")
    sel, lab = set(), False
    if os.path.exists(n):
        for t in open(n):
            if t.strip():
                b = json.loads(t)
                if b["terbit"] == terbit.isoformat():
                    if b["jenis"] == "debit":
                        sel.add(tuple(b["sel"]))
                    lab |= b["jenis"] == "label"
    return sel, lab


def jalan(sekarang=None):
    now = sekarang or dt.datetime.now(WIB)
    terbit, waktu = now.date(), now.astimezone(dt.timezone.utc).isoformat(timespec="seconds")
    titik = json.load(open(TITIK)) if os.path.exists(TITIK) else None
    ada_sel, ada_lab = sudah_ada(terbit)
    sel = [x for x in daftar_sel(titik) if x[0] not in ada_sel]
    rc = 0
    try:
        ok, gagal = ambil_debit(sel, terbit, waktu) if sel else ([], [])
        if gagal:
            print(f"debit gagal {len(gagal)}/{len(sel)}: {gagal[0]['sebab']}", file=sys.stderr)
            rc = 1
        lab = []
        if not ada_lab:
            try:
                lab = [baris_label(terbit, waktu, json.load(open(LB)), json.load(open(DIBI)))]
            except Exception as e:                  # label gagal tidak menjatuhkan debit
                print(f"label e-1 gagal: {e}", file=sys.stderr)
                rc = 1
        baru = tulis_arsip(ok + gagal + lab)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 3
    print(f"arsip_debit {terbit}: {len(ok)} debit ok, {len(gagal)} gagal, label {'baru' if lab else 'sudah ada/gagal'}, {baru} baris ditulis")
    return rc


def salin_titik():
    if not os.path.exists(TITIK_RAW):
        return f"{TITIK_RAW} tidak ada: pakai pusat sel"
    b = open(TITIK_RAW, "rb").read()
    if os.path.exists(TITIK):
        return None if open(TITIK, "rb").read() == b else f"{TITIK} sudah ada dengan isi beda: ditolak"
    os.makedirs(ARSIP, exist_ok=True)
    shutil.copyfile(TITIK_RAW, TITIK)


# ------------------------------------------------------------------ swauji
def uji():
    global SAMPEL
    hari = jendela(dt.date(2026, 11, 3))
    assert hari[0] == "2026-10-27" and hari[-1] == "2026-11-06" and len(hari) == 11 and hari[7] == "2026-11-03"
    with tempfile.TemporaryDirectory() as t:
        SAMPEL = os.path.join(t, "s.json")
        json.dump({"sk": {"a|X": [[1.0, 2.0, .1, 0], [1.25, 2.0, .1, 0]], "b|Y": [[1.25, 2.0, .1, 0], [3.0, 4.0, .1, 0]]}}, open(SAMPEL, "w"))
        sel = daftar_sel()
        assert [s for s, _ in sel] == [(1.0, 2.0), (1.25, 2.0), (3.0, 4.0)]            # sel unik, urut
        assert daftar_sel({"titik": [{"sel": [1.0, 2.0], "lat": 1.05, "lon": 2.05, "g": [1, 2]}]})[0] == ((1.0, 2.0), (1.05, 2.05))
        terbit = dt.date(2026, 11, 3)
        waktu = "2026-11-03T00:20:00+00:00"

        def palsu(n_gagal_hari=False):
            def f(url):
                assert "timezone=Asia%2FJakarta" in url and "start_date=2026-10-27" in url and "end_date=2026-11-06" in url
                n = url.split("latitude=")[1].split("&")[0].count(",") + 1
                h = hari[1:] if n_gagal_hari else hari
                return [{"daily": {"time": h, "river_discharge": [None if i == 2 else 10.0 + i for i in range(len(h))]}}] * n
            return f
        ok, gagal = ambil_debit(sel, terbit, waktu, palsu())
        assert len(ok) == 3 and not gagal and len(ok[0]["q"]) == 11 and ok[0]["q"][2] is None and ok[0]["hari0"] == "2026-10-27"
        ok2, gagal2 = ambil_debit(sel, terbit, waktu, palsu(True))                       # jendela salah: ditolak, bukan digeser
        assert not ok2 and len(gagal2) == 3 and "bukan" in gagal2[0]["sebab"]

        def kuota(url):
            raise KuotaHabis("Daily API request limit exceeded")
        o3, g3 = ambil_debit(sel, terbit, waktu, kuota)
        assert not o3 and len(g3) == 3 and all(x["jenis"] == "debit_gagal" for x in g3)   # tidak crash

        def lump(url):
            raise RuntimeError("HTTP 500")
        o4, g4 = ambil_debit(sel, terbit, waktu, lump)
        assert not o4 and len(g4) == 3
        # label e-1: hanya hari 2026-11-02; kejadian 11-03 (hari arsip) dan 11-04 TIDAK boleh ikut, mulai logbook di e-1 masuk
        lb = {"dibuat": "x", "sampai": "2026-11-02", "kejadian": [
            {"jenis": "banjir", "mulai": "2026-11-02", "terlihat": ["2026-11-02", "2026-11-03"], "kab_kode": "32.01"},
            {"jenis": "banjir", "mulai": "2026-11-03", "terlihat": ["2026-11-03", "2026-11-03"], "kab_kode": "32.02"},
            {"jenis": "gempa", "mulai": "2026-11-02", "terlihat": ["2026-11-02", "2026-11-02"], "kab_kode": "32.09"}]}
        dibi = {"dibuat": "y", "sampai": "2026-11-02", "kejadian": [
            {"tanggal": "2026-11-02", "jenis": "Banjir", "kab_kode": "33.01", "kejadian": 1},
            {"tanggal": "2026-11-03", "jenis": "Banjir", "kab_kode": "33.02", "kejadian": 1},
            {"tanggal": "2026-11-04", "jenis": "Banjir", "kab_kode": "33.03", "kejadian": 1},
            {"tanggal": "2026-11-01", "jenis": "Banjir", "kab_kode": "33.04", "kejadian": 1}]}
        b = baris_label(terbit, waktu, lb, dibi)
        assert b["e1"] == "2026-11-02" and b["lb_mulai"] == ["32.01"] and b["dibi"] == ["33.01"] and b["gab_mulai"] == ["32.01", "33.01"], b
        semua = {k for n in ("lb_mulai", "dibi", "gab_mulai") for k in b[n]}
        assert not semua & {"32.02", "33.02", "33.03", "33.04", "32.09"}
        # arsip append-only: tak menggandakan, tak menimpa, gagal tak menutup ulangan, berkas rusak berhenti
        a = os.path.join(t, "arsip")
        assert tulis_arsip(ok + [b], a) == 4 and tulis_arsip(ok + [b], a) == 0
        n = os.path.join(a, "2026-11.jsonl")
        awal = open(n).read()
        assert tulis_arsip([{**ok[0], "q": [0] * 11}, {**b, "dibi": ["99.99"]}], a) == 0 and open(n).read() == awal     # kunci sama: tak menimpa
        assert tulis_arsip(gagal2, a) == 0                                                                                  # sel sudah ok: gagal tak ditulis
        h2 = [{**x, "terbit": "2026-11-04"} for x in ok]
        assert tulis_arsip(g4 + h2, a) == 3 and open(n).read().startswith(awal)                                          # hari lain; baris lama utuh
        assert tulis_arsip([{**g4[0], "terbit": "2026-12-01"}], a) == 1 and os.path.exists(os.path.join(a, "2026-12.jsonl"))
        assert sudah_ada(terbit, a) == ({s for s, _ in sel}, True)
        open(n, "a").write("{rusak\n")
        try:
            tulis_arsip(h2, a)
            assert False
        except ValueError:
            pass
    assert os.path.relpath(ARSIP, AKAR) == "data/banjir/arsip_debit"
    print("ok arsip_debit")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["salin-titik"]:
        sys.exit(salin_titik() or 0)
    else:
        sys.exit(jalan())
