"""Operasi modifikasi cuaca resmi BMKG -> public/udara/data/omc_bmkg.json.

Sumber: https://www.bmkg.go.id/cuaca/modifikasi-cuaca. Halaman Nuxt membawa <script id="__NUXT_DATA__"> berisi
{message, last_updated, data:[{tahun, periode, periode_awal, periode_akhir, jenis_kegiatan, operator, bahan_semai, provinsi, user}]}.
Baris disimpan APA ADANYA (+ kode BPS provinsi). Sumber TIDAK memuat sortie atau kg: jangan dikarang dari tempat lain.
Berkas selalu dibangun dari sumber resmi; `perubahan` hanya mencatat selisih antar putaran (baris ditambah / hilang / berubah).
Gagal ambil atau halaman aneh: berkas lama dibiarkan, keluar 0 (gagal-lunak).
Pakai: python3 scripts/omc/bmkg_omc.py | ... uji
"""
import collections, datetime as dt, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../cuaca"))
from bmkg_kab10 import nuxt_semua, unduh  # noqa: E402  (UA peramban penuh + coba-ulang ada di sana)
from dasar import AKAR, PROVINSI, WIB, baca, simpan  # noqa: E402

URL = "https://www.bmkg.go.id/cuaca/modifikasi-cuaca"
BERKAS = os.path.join(AKAR, "public/udara/data/omc_bmkg.json")
KARHUTLA = "Pembasahan Gambut/Penanganan Karhutla"
# Hitungan per jenis yang dilihat pemilik pada 10 Nov 2026 (354 baris). Selisih = sumber bertambah/berubah, bukan galat.
ACUAN = {"acuan_tanggal": "2026-11-10", "n": 354, "jenis": {KARHUTLA: 145, "Pengurangan CH - Bencana": 102, "Pengisian Waduk": 40, "Acara Kenegaraan": 34, "Penanganan Polusi Udara": 12}}
MAKS_PERUBAHAN = 60      # putaran yang disimpan
MAKS_BARIS_PUTARAN = 200  # baris per kategori per putaran (hitungan tetap eksak)
KUNCI_BARIS = ("tahun", "periode", "periode_awal", "periode_akhir", "jenis_kegiatan", "operator", "bahan_semai", "provinsi", "user")
ALIAS_PROV = {"kepulauanbangkabelitung": "19", "bangkabelitung": "19", "dkijakarta": "31", "diyogyakarta": "34", "daerahistimewayogyakarta": "34"}


def _norm(s):
    return re.sub(r"[^a-z]", "", (s or "").lower().replace("kep.", "kepulauan"))


_PROV = {_norm(n): k for k, n in PROVINSI.items()}


def kode_provinsi(nama):
    """Nama provinsi -> kode BPS 2 digit, atau None bila tak dikenal."""
    n = _norm(nama)
    return _PROV.get(n) or ALIAS_PROV.get(n)


def urai(html):
    """HTML -> (last_updated, [baris mentah]). Gagal keras bila bentuk halaman berubah."""
    for v in nuxt_semua(html):
        if isinstance(v, dict) and {"last_updated", "data"} <= set(v) and isinstance(v["data"], list):
            baris = v["data"]
            assert baris and all(isinstance(b, dict) and {"periode_awal", "periode_akhir", "jenis_kegiatan", "provinsi"} <= set(b) for b in baris), "kolom baris berubah"
            return v["last_updated"], baris
    raise ValueError("objek OMC tidak ada di __NUXT_DATA__")


def _kunci(b):
    return json.dumps({k: b.get(k) for k in KUNCI_BARIS}, sort_keys=True, ensure_ascii=False)


def selisih(lama, baru):
    """Multiset baris lama vs baru -> (ditambah, hilang, berubah). Berubah = tepat satu hilang + satu ditambah dengan (periode_awal, jenis, provinsi) sama."""
    c = collections.Counter(_kunci(b) for b in baru)
    c.subtract(collections.Counter(_kunci(b) for b in lama))
    tambah = [json.loads(k) for k, n in c.items() for _ in range(max(n, 0))]
    hilang = [json.loads(k) for k, n in c.items() for _ in range(max(-n, 0))]
    kunci = lambda b: (b["periode_awal"], b["jenis_kegiatan"], b["provinsi"])  # noqa: E731
    gt, gh = collections.defaultdict(list), collections.defaultdict(list)
    for t in tambah:
        gt[kunci(t)].append(t)
    for h in hilang:
        gh[kunci(h)].append(h)
    ubah, sisa, baru_sisa = [], [], []
    for k in set(gt) | set(gh):  # dipasangkan hanya bila tak ambigu: tepat satu hilang dan satu tambah di kunci yang sama
        if len(gt[k]) == 1 and len(gh[k]) == 1:
            h, t = gh[k][0], gt[k][0]
            ubah.append({"sebelum": h, "sesudah": t, "kolom_beda": [c for c in KUNCI_BARIS if h.get(c) != t.get(c)]})
        else:
            sisa += gh[k]
            baru_sisa += gt[k]
    tambah = baru_sisa
    return tambah, sisa, ubah


def ringkas(baris):
    jenis = collections.Counter(b["jenis_kegiatan"] for b in baris)
    tahun = collections.Counter(str(b["tahun"]) for b in baris)
    per_jt = collections.defaultdict(collections.Counter)
    for b in baris:
        per_jt[b["jenis_kegiatan"]][str(b["tahun"])] += 1
    return {"per_jenis": dict(jenis.most_common()), "per_tahun": dict(sorted(tahun.items())),
            "per_jenis_tahun": {j: dict(sorted(t.items())) for j, t in per_jt.items()}}


def cek_konsistensi(baris):
    jenis = collections.Counter(b["jenis_kegiatan"] for b in baris)
    rinci = {j: {"acuan": n, "sumber": jenis.get(j, 0), "sama": jenis.get(j, 0) == n} for j, n in ACUAN["jenis"].items()}
    return {"acuan_tanggal": ACUAN["acuan_tanggal"], "n_acuan": ACUAN["n"], "n_sumber": len(baris), "semua_sama": len(baris) == ACUAN["n"] and all(r["sama"] for r in rinci.values()),
            "jenis": rinci, "catatan": "Selisih berarti BMKG menambah/mengubah baris sejak acuan; lihat `perubahan`, bukan tanda galat."}


def aktif(baris, tgl):
    """Baris yang periodenya memuat tgl (ISO)."""
    return [b for b in baris if b["periode_awal"] and b["periode_akhir"] and b["periode_awal"] <= tgl <= b["periode_akhir"]]


def bangun(html, lama, sekarang):
    """HTML + berkas lama + waktu WIB -> isi berkas baru."""
    last, mentah = urai(html)
    if lama and lama.get("baris") and len(mentah) < len(lama["baris"]) / 2:
        raise ValueError(f"baris turun drastis {len(lama['baris'])} -> {len(mentah)}: berkas lama dibiarkan")
    baris = [{**b, "kode_prov": kode_provinsi(b["provinsi"])} for b in mentah]
    tak_dikenal = sorted({b["provinsi"] for b in baris if not b["kode_prov"]})
    tgl = sekarang.date().isoformat()
    perubahan = list((lama or {}).get("perubahan", []))
    if lama and lama.get("baris"):
        t, h, u = selisih([{k: b.get(k) for k in KUNCI_BARIS} for b in lama["baris"]], mentah)
        if t or h or u:
            perubahan.append({"diambil": sekarang.isoformat(timespec="minutes"), "last_updated_sebelum": lama.get("last_updated"), "last_updated": last,
                              "n_ditambah": len(t), "n_hilang": len(h), "n_berubah": len(u),
                              "ditambah": t[:MAKS_BARIS_PUTARAN], "hilang": h[:MAKS_BARIS_PUTARAN], "berubah": u[:MAKS_BARIS_PUTARAN]})
    ak = aktif(baris, tgl)
    return {"sumber": "BMKG, Modifikasi Cuaca (www.bmkg.go.id/cuaca/modifikasi-cuaca)", "url": URL, "diambil": sekarang.isoformat(timespec="minutes"),
            "last_updated": last, "n": len(baris), "ringkasan": ringkas(baris), "cek_konsistensi": cek_konsistensi(baris),
            "aktif_hari_ini": {"tanggal_wib": tgl, "n": len(ak), "n_karhutla": sum(b["jenis_kegiatan"] == KARHUTLA for b in ak), "baris": ak},
            "provinsi_tak_dikenal": tak_dikenal,
            "catatan": "Sumber tidak memuat sortie, kg, atau hasil hujan; hanya periode, jenis, operator, bahan, provinsi, pengguna. Baris disimpan apa adanya.",
            "perubahan": perubahan[-MAKS_PERUBAHAN:], "baris": baris}


def main():
    try:
        sekarang = dt.datetime.now(WIB)
        simpan(BERKAS, bangun(unduh(URL), baca(BERKAS, None), sekarang))
        print(f"bmkg_omc: tersimpan {BERKAS}", file=sys.stderr)
    except Exception as x:  # gagal-lunak: sumber resmi tak terjangkau tidak boleh menjatuhkan rantai
        print(f"bmkg_omc: GAGAL {type(x).__name__} {x}; berkas lama dibiarkan", file=sys.stderr)


def uji():
    fx = os.path.join(AKAR, "scripts/omc/fixture/omc_bmkg_nuxt.html")
    html = open(fx, encoding="utf-8").read()  # cuplikan NUXT nyata (354 baris) diambil 10 Nov 2026
    now = dt.datetime(2026, 11, 10, 17, 0, tzinfo=WIB)
    d = bangun(html, None, now)
    assert d["n"] == 354 and d["last_updated"].startswith("2026-11-10"), (d["n"], d["last_updated"])
    r = d["ringkasan"]["per_jenis"]
    assert (r[KARHUTLA], r["Pengurangan CH - Bencana"], r["Pengisian Waduk"], r["Acara Kenegaraan"], r["Penanganan Polusi Udara"]) == (145, 102, 40, 34, 12)
    assert d["cek_konsistensi"]["semua_sama"] and not d["provinsi_tak_dikenal"], d["provinsi_tak_dikenal"]
    assert min(d["ringkasan"]["per_tahun"]) == "2014" and max(d["ringkasan"]["per_tahun"]) == "2026"
    assert all(b["kode_prov"] for b in d["baris"]) and d["perubahan"] == []
    assert d["aktif_hari_ini"]["n"] == len(aktif(d["baris"], "2026-11-10")) > 0
    assert all(b["periode_awal"] <= "2026-11-10" <= b["periode_akhir"] for b in d["aktif_hari_ini"]["baris"])
    assert kode_provinsi("Kepulauan Bangka Belitung") == "19" and kode_provinsi("Kep. Bangka Belitung") == "19" and kode_provinsi("Papua Selatan") == "93" and kode_provinsi("Planet") is None
    # putaran 2: satu baris hilang, satu berubah (user), satu baru
    lama = json.loads(json.dumps(d))
    mentah = [{k: b[k] for k in KUNCI_BARIS} for b in d["baris"]]
    dihapus = mentah.pop(0)
    mentah[0] = {**mentah[0], "user": "UJI"}
    mentah.append({**dihapus, "periode_awal": "2099-01-01", "periode_akhir": "2099-01-02"})
    t, h, u = selisih([{k: b[k] for k in KUNCI_BARIS} for b in lama["baris"]], mentah)
    assert (len(t), len(h), len(u)) == (1, 1, 1) and u[0]["kolom_beda"] == ["user"], (len(t), len(h), len(u))
    # sumber turun drastis ditolak, berkas lama dipertahankan oleh main()
    kecil = html  # bentuk sama tetapi lama berisi dua kali lipat baris
    besar = {"baris": lama["baris"] * 3}
    try:
        bangun(kecil, besar, now)
        assert False
    except ValueError as x:
        assert "turun drastis" in str(x)
    try:
        urai("<html></html>")
        assert False
    except (AttributeError, ValueError):
        pass
    print("uji bmkg_omc ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
