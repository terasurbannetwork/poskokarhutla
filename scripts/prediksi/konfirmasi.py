"""Fase 2: konfirmasi lapangan dari worker (GET /api/prediksi/konfirmasi) -> public/prediksi/data/amatan/konfirmasi.json.

Env: PIPA_TOKEN (wajib; kosong = lewati), PIPA_URL (bawaan https://centurisk97.id). Kegagalan apa pun = lewati dengan satu baris log,
tidak pernah menggagalkan jalan harian. Snapshot tanpa kolom catatan (bisa memuat catatan pribadi), digabung append-only per
(kab id, tanggal, kode, sumber); baris baru ditambah, baris lama tak dihapus (satu-satunya perubahan: 0 -> 1, positif mengalahkan nol).
kab dinormalkan ke id 514 kab lewat dasar.pencari (prov bila ada, selain itu nama unik nasional) atau id 4 digit; tak cocok dihitung, tidak ditebak.
Aturan pemakaian (RANCANGAN.md fase 2) ada di nilai.py: regu = label BNJ/LSR, warga positif lemah, groundcheck hanya audit.
Pakai: python3 scripts/prediksi/konfirmasi.py [uji]
"""
import json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D  # noqa: E402

URL_BAWAAN = "https://centurisk97.id"
SUMBER = ("regu", "warga", "groundcheck")


def log(*a):
    print("konfirmasi:", *a, file=sys.stderr)


def jalur(data=None):
    return os.path.join(data or D.DATA, "amatan", "konfirmasi.json")


def tarik(kini, env=None, buka=urllib.request.urlopen):
    """-> daftar baris mentah, atau None bila dilewati."""
    env = os.environ if env is None else env
    token = (env.get("PIPA_TOKEN") or "").strip()
    if not token:
        log("PIPA_TOKEN kosong; dilewati")
        return None
    url = f"{(env.get('PIPA_URL') or URL_BAWAAN).rstrip('/')}/api/prediksi/konfirmasi?sejak={D.geser(kini, -60)}"
    try:
        with buka(urllib.request.Request(url, headers={"Authorization": "Bearer " + token}), timeout=30) as r:
            j = json.load(r)
        if j.get("terpotong"):
            log("respons terpotong (batas 5000 baris); sisanya menyusul di jalan berikut")
        return j["konfirmasi"]
    except Exception as x:   # HTTPError 401/503, jaringan, JSON rusak: semuanya "lewati"
        log("dilewati:", getattr(x, "code", None) or type(x).__name__, x)
        return None


def normal(rows, daftar):
    """-> (baris [kab id, tanggal, kode, sumber, terjadi, nilai], jumlah tak cocok). Tanpa catatan."""
    cari, ids, out, tak = D.pencari(daftar), {k["id"] for k in daftar}, [], 0
    for r in rows:
        kab = str(r.get("kab") or "").strip()
        i = kab if kab in ids else cari(r.get("prov"), kab) or (cari(None, kab) if r.get("prov") else None)
        if not i or r.get("sumber") not in SUMBER or r.get("terjadi") not in (0, 1) or not r.get("tanggal") or not r.get("kode"):
            tak += 1
            continue
        out.append([i, r["tanggal"], r["kode"], r["sumber"], r["terjadi"], r.get("nilai")])
    return out, tak


def gabung(lama, baru):
    """Append-only per (kab, tanggal, kode, sumber); hanya 0 -> 1 yang boleh mengubah baris lama."""
    idx = {tuple(x[:4]): x for x in lama}
    for x in baru:
        k = tuple(x[:4])
        if k not in idx:
            idx[k] = list(x)
            lama.append(idx[k])
        elif x[4] == 1 and idx[k][4] == 0:
            idx[k][4] = 1
    return lama


def perbarui(kini, data=None, env=None, buka=urllib.request.urlopen, daftar=None):
    """Tarik + gabung + simpan. -> snapshot, atau None bila dilewati (berkas lama tak disentuh)."""
    mentah = tarik(kini, env, buka)
    if mentah is None:
        return None
    baru, tak = normal(mentah, daftar or D.kab())
    s = D.baca(jalur(data), {"rows": []})
    s = {"dibuat": kini, "kol": ["kab", "tanggal", "kode", "sumber", "terjadi", "nilai"], "rows": gabung(s.get("rows", []), baru), "tak_cocok": tak}
    D.simpan(jalur(data), s)
    log(f"{len(mentah)} baris, {len(baru)} cocok, {tak} kab tak cocok (tidak ditebak)")
    return s


def muat(data=None):
    return (D.baca(jalur(data), {"rows": []}) or {"rows": []})


def uji():
    import io, tempfile, urllib.error
    daftar = D.kab()
    k0 = daftar[0]
    # tanpa token: lewati, tak ada berkas
    with tempfile.TemporaryDirectory() as tmp:
        assert perbarui("2026-11-02", tmp, {}, daftar=daftar) is None and not os.path.exists(jalur(tmp))
        for galat in (urllib.error.HTTPError("u", 401, "x", {}, None), urllib.error.HTTPError("u", 503, "x", {}, None), OSError("jaringan")):
            def buka(*a, **k):
                raise galat
            assert perbarui("2026-11-02", tmp, {"PIPA_TOKEN": "t"}, buka, daftar) is None
        # respons nyata: nama tak dikenal tidak ditebak, catatan tak disimpan
        dipanggil = []

        class R(io.StringIO):
            __enter__ = lambda s: s
            __exit__ = lambda s, *a: None
        isi = {"konfirmasi": [{"kab": k0["nama"].lower(), "tanggal": "2026-10-30", "kode": "BNJ", "terjadi": 0, "nilai": None, "catatan": "rahasia", "sumber": "regu"},
                              {"kab": "negeri antah berantah", "tanggal": "2026-10-30", "kode": "BNJ", "terjadi": 1, "sumber": "regu"},
                              {"kab": k0["id"], "tanggal": "2026-10-30", "kode": "API", "terjadi": 1, "sumber": "groundcheck"}]}

        def buka2(rq, timeout=0):
            dipanggil.append(rq)
            return R(json.dumps(isi))
        s = perbarui("2026-11-02", tmp, {"PIPA_TOKEN": "t", "PIPA_URL": "http://x/"}, buka2, daftar)
        assert s["tak_cocok"] == 1 and len(s["rows"]) == 2 and "rahasia" not in open(jalur(tmp)).read(), s
        assert dipanggil[0].full_url == "http://x/api/prediksi/konfirmasi?sejak=2026-09-03", dipanggil[0].full_url
        assert dipanggil[0].get_header("Authorization") == "Bearer t"
        # gabung: baris lama tetap, 0 -> 1 naik, 1 tak turun
        isi["konfirmasi"][0]["terjadi"] = 1
        s = perbarui("2026-11-03", tmp, {"PIPA_TOKEN": "t"}, buka2, daftar)
        assert len(s["rows"]) == 2 and s["rows"][0][4] == 1
        isi["konfirmasi"][0]["terjadi"] = 0
        assert perbarui("2026-11-04", tmp, {"PIPA_TOKEN": "t"}, buka2, daftar)["rows"][0][4] == 1
    print("konfirmasi.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:2] == ["uji"] else sys.exit(__doc__)
