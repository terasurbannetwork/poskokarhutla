"""Daftar harian untuk Pusdalops: kab bertitik panas tinggi tetapi BELUM ada laporan BPBD di logbook -> public/data/karhutla_belum_lapor.json

Dasar: uji_logbook_karhutla.py (kab-minggu >=30 titik, ~85% tanpa kejadian logbook). Ini bukan bukti titik palsu atau api tak ada:
logbook hanya merekam yang dilaporkan BPBD ke Pusdalops. Daftar ini = "mana yang layak ditanyakan", bukan vonis.

Aturan (ubah lewat konstanta):
  - Titik = baris arsip public/data/titik_hari/<hari>.json (lokasi unik ~375 m/hari WIB, tanpa sumber panas tetap) dengan keyakinan >= YAKIN_MIN
    (1 = sedang/tinggi; arsip sendiri menyimpan keyakinan rendah juga sejak 28 Okt). Dihitung per (kode prov, nama kab).
  - Jendela = JENDELA hari berakhir di hari arsip terakhir (AKHIR). Masuk daftar bila titik jendela >= AMBANG DAN tak ada kejadian
    logbook karhutla ber-kab_kode di kab itu yang rentang harinya [mulai|terlihat awal .. max(terlihat akhir, surut)] beririsan dengan
    [awal jendela .. AKHIR + RENGGANG]. RENGGANG = hari toleransi lag laporan (laporan harian terbit sehari-dua kemudian).
  - Laporan tingkat provinsi (tanpa kab_kode) tidak menutup kab mana pun.
  - Urut: titik jendela turun. "terakhir_lapor" = tanggal akhir kejadian logbook terbaru kab itu (kapan pun) atau null.
Pakai: python3 scripts/data/belum_lapor.py        python3 scripts/data/belum_lapor.py uji
"""
import collections, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402
from uji_logbook_karhutla import norm  # noqa: E402

AMBANG, JENDELA, RENGGANG, YAKIN_MIN = 30, 7, 3, 0  # 0 = ikut definisi rumah titik_unik.KEYAKINAN_MIN sejak 28 Okt 2026
ARSIP = os.path.join(AKAR, "public/data/titik_hari")
LOGBOOK = os.path.join(AKAR, "public/data/logbook_kejadian.json")
KELUAR = os.path.join(AKAR, "public/data/karhutla_belum_lapor.json")
D = dt.date.fromisoformat


def rentang(e):
    a = D(e["mulai"] if e.get("mulai") else e["terlihat"][0])
    b = max([D(e["terlihat"][1])] + ([D(e["surut"])] if e.get("surut") else []))
    return a, max(a, b)


def susun(titik, kejadian, akhir):
    """titik {(prov, kab_norm): {hari ISO: n}} -> (daftar kab belum lapor, nama prov {kode: nama}). Murni; diuji di `uji`."""
    awal = akhir - dt.timedelta(days=JENDELA - 1)
    batas = akhir + dt.timedelta(days=RENGGANG)
    lap, terakhir, namaprov = collections.defaultdict(list), {}, {}
    for e in kejadian:
        if e.get("jenis") != "karhutla" or not e.get("kab_kode"):
            continue
        k = (e["kab_kode"][:2], norm(e["kab"]))
        a, b = rentang(e)
        namaprov.setdefault(k[0], e["prov"])
        lap[k].append((a, b))
        terakhir[k] = max(terakhir.get(k, b), b)
    out = []
    for k, hari in titik.items():
        n7 = sum(n for h, n in hari.items() if awal <= D(h) <= akhir)
        if n7 < AMBANG or any(a <= batas and b >= awal for a, b in lap.get(k, [])):
            continue
        out.append({"prov_kode": k[0], "kab": k[1], "titik_7h": n7, "titik_hari_ini": hari.get(akhir.isoformat(), 0),
                    "terakhir_lapor": terakhir[k].isoformat() if k in terakhir else None})
    out.sort(key=lambda r: (-r["titik_7h"], r["kab"]))
    return out, namaprov


def muat_titik():
    ix = json.load(open(os.path.join(ARSIP, "indeks.json")))
    ada = sorted(ix["arsip"])
    akhir = D(ada[-1])
    titik, nama = collections.defaultdict(collections.Counter), {}
    for d in ada:
        if D(d) < akhir - dt.timedelta(days=JENDELA - 1):
            continue
        j = json.load(open(os.path.join(ARSIP, d + ".json")))
        for b in j["baris"]:
            if b[5] < YAKIN_MIN:
                continue
            pr, kab, _ = j["wilayah"][b[6]].split("|")
            k = (pr, norm(kab))
            titik[k][d] += 1
            nama[k] = kab
    return titik, nama, akhir


def main():
    titik, nama, akhir = muat_titik()
    kej = json.load(open(LOGBOOK))["kejadian"]
    daftar, namaprov = susun(titik, kej, akhir)
    for r in daftar:
        r["prov"] = namaprov.get(r["prov_kode"], r["prov_kode"])
        r["kab"] = nama[(r["prov_kode"], r["kab"])]
    awal = akhir - dt.timedelta(days=JENDELA - 1)
    json.dump({"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
               "jendela": {"dari": awal.isoformat(), "sampai": akhir.isoformat(), "toleransi_lapor_sampai": (akhir + dt.timedelta(days=RENGGANG)).isoformat()},
               "ambang": {"titik_7h": AMBANG, "keyakinan_min": YAKIN_MIN},
               "catatan": f"Kab dengan >= {AMBANG} titik unik (375 m, keyakinan sedang/tinggi, tanpa industri) dalam {JENDELA} hari dan tanpa kejadian logbook "
                          f"karhutla ber-kab di jendela + {RENGGANG} hari toleransi lag. Logbook hanya memuat yang dilaporkan BPBD; ini daftar tanya, bukan vonis. "
                          "Nama kab dicocokkan teks; laporan tingkat provinsi tidak menutup kab.",
               "kab": daftar}, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(daftar)} kab belum lapor (jendela {awal}..{akhir}) -> {KELUAR}")
    for r in daftar[:10]:
        print(r["titik_7h"], r["titik_hari_ini"], r["prov"], r["kab"], r["terakhir_lapor"])


def uji():
    A = D("2026-10-20")
    def seri(n_per_hari, hari_ke=range(7)):
        return {(A - dt.timedelta(days=i)).isoformat(): n_per_hari for i in hari_ke}
    titik = {("61", "a"): seri(10),            # 70 -> masuk, peringkat 1
             ("61", "b"): seri(5),             # 35 -> masuk, peringkat 2
             ("61", "c"): seri(4),             # 28 < ambang
             ("61", "d"): seri(10),            # ada laporan di jendela -> keluar
             ("61", "e"): seri(10),            # laporan tepat di batas toleransi -> keluar
             ("61", "f"): seri(10),            # laporan setelah toleransi -> tetap masuk
             ("61", "g"): seri(10),            # laporan sebelum jendela -> masuk, terakhir_lapor terisi
             ("61", "h"): seri(10, range(7, 12)),  # titik di luar jendela -> 0
             ("61", "i"): seri(10)}            # laporan provinsi saja -> masuk
    mk = lambda k, m, s, j="karhutla", kode=None: {"jenis": j, "kab": k, "prov": "Kalbar", "kab_kode": kode or "61.01", "mulai": m, "terlihat": [m, s], "surut": s}
    kej = [mk("D", "2026-10-18", "2026-10-19"), mk("E", "2026-10-23", "2026-10-23"), mk("F", "2026-10-24", "2026-10-25"),
           mk("G", "2026-10-01", "2026-10-05"), mk("B", "2026-10-10", "2026-10-11", j="banjir"),
           {"jenis": "karhutla", "kab": "", "prov": "Kalbar", "kab_kode": None, "mulai": "2026-10-19", "terlihat": ["2026-10-19", "2026-10-19"]}]
    out, np_ = susun(titik, kej, A)
    assert [r["kab"] for r in out] == ["a", "f", "g", "i", "b"], [r["kab"] for r in out]  # 70,70,70,70 urut nama, lalu b=35
    r = {x["kab"]: x for x in out}
    assert r["a"]["titik_7h"] == 70 and r["a"]["titik_hari_ini"] == 10 and r["a"]["terakhir_lapor"] is None
    assert r["g"]["terakhir_lapor"] == "2026-10-05" and r["b"]["titik_7h"] == 35
    assert "c" not in r and "d" not in r and "e" not in r and "h" not in r and np_ == {"61": "Kalbar"}
    print("uji belum_lapor: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
