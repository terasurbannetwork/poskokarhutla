"""Arsip kejadian beku (SK-024; DT 5.2.1, ALGORITMA F1.2, F1.7): bersih/{dibi,logbook} -> kejadian/arsip/<YYYY>/<prov>.json dan k<kab4>.json.

ID sama dengan pasang.py (satu skema, `susun`), jadi arsip dan D1 tidak punya pembeda. `selisih` hanya bila dua sumber melapor; tanpa kunci `total`;
baris tanpa wilayah hanya di `tanpa_wilayah` (tidak punya kab4, tidak ada di k<kab4>.json, tidak bisa dipromosikan). Jenis tak dibandingkan tinggal di bersih.
Keluaran ke data/raw/siklus (git-ignored) atau --keluar; tidak mengunggah (gudang.py yang mengunggah).
Pakai: python3 -I scripts/siklus/arsip_kejadian.py bangun [--bersih DIR] [--keluar DIR] | uji
"""
import collections, datetime as dt, hashlib, importlib.util, json, os, re, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
KOLOM = ["id", "jenis", "kab4", "mulai", "akhir", "nama", "sumber", "dampak"]


def _muat(nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


P = _muat("pasang")
SUMBER = ("dibi", "logbook")
REGISTRI = os.path.join(P.AKAR, "public/bencana.json")
KUNCI_JENIS = {"pesisir": "gelombang"}   # id bencana -> kunci jenis bersama (kunci_kejadian.JENIS); selain ini sama dengan id
SUDAH_ADA = ("K", "G")                   # karhutla (sel:i:j) dan gempa punya jalur sendiri di pasang.py


def awalan_bencana(registri=REGISTRI, tanpa=SUDAH_ADA):
    """PB-25 (F-12): {awalan: id bencana} dari bencana.json kejadian.awalan, tanpa daftar tulisan tangan. Bencana yang belum terdaftar tidak muncul."""
    return {b["kejadian"]["awalan"]: b["id"] for b in json.load(open(registri, encoding="utf-8"))["bencana"] if b["kejadian"]["awalan"] not in tanpa}


def jenis_dari_kode(kode, peta=None):
    """Kode kejadian per bencana (`B0012`) -> kunci jenis Buku Besar, atau None (awalan tak dikenal). Tidak ada buku kejadian kedua: hanya kunci jenis."""
    peta = peta or awalan_bencana()
    m = re.match(r"^([A-Z])\d{4,}$", str(kode))
    b = peta.get(m.group(1)) if m else None
    return KUNCI_JENIS.get(b, b)


def sha_sumber(bersih, tahun):
    """Sidik berkas bersih tahun-1, tahun, tahun+1 (pemasangan hanya menjangkau 3 hari, yaitu tahun tetangga)."""
    h = hashlib.sha256()
    for s in SUMBER:
        for t in (tahun - 1, tahun, tahun + 1):
            f = os.path.join(bersih, s, "%d.jsonl.gz" % t)
            if os.path.exists(f):
                h.update(("%s/%d:" % (s, t)).encode())
                h.update(open(f, "rb").read())
    return h.hexdigest()


def baris(g):
    """gugus atau rekaman lepas -> baris arsip."""
    if "entri" in g:
        jenis, kab, mulai, akhir, entri = g["jenis"], g["kab"], g["mulai"], g["akhir"], g["entri"]
        kab4 = kab[0]
    else:
        jenis, kab4, mulai, akhir, entri = g["jenis"], None, g["tgl"], g.get("akhir"), {g["sumber"]: g}
    ju = "+".join(sorted(jenis))
    nama = ("%s %s %s" % (ju.replace("_", " "), P.NAMA_KAB.get(kab4, "wilayah belum terpetakan") if kab4 else "wilayah belum terpetakan", mulai))[:160]
    return [g["id"], ju, kab4, mulai, akhir, nama, sorted(entri), P.dampak(entri)]


def bangun_arsip(per_sumber, bersih_dir=None, lama=None, alias=None, sisa=None):
    """-> {jalur relatif: isi dict}. Jalur: kejadian/arsip/<YYYY>/<prov>.json, k<kab4>.json.
    lama {(sumber, kode): KJ-} menjaga ID antar jalan, alias (dict) diisi; sisa (dict) menerima pemetaan baru."""
    gugus, lepas = P.susun(per_sumber, lama=lama, alias=alias)
    if sisa is not None:
        sisa.update(P.pemetaan(gugus, lepas))
    per = collections.defaultdict(lambda: {"prov": collections.defaultdict(list), "kab": collections.defaultdict(list), "lepas": []})
    for g in gugus:
        b, th = baris(g), int(g["mulai"][:4])
        per[th]["prov"][g["kab"][0][:2]].append(b)
        for k in g["kab"]:
            per[th]["kab"][k].append(b)
    for r in lepas:
        per[int(r["tgl"][:4])]["lepas"].append(baris(r))
    keluar = {}
    for th, d in sorted(per.items()):
        sha = sha_sumber(bersih_dir, th) if bersih_dir else None
        urut = lambda rs: sorted(rs, key=lambda b: (b[3], b[0]))
        dasar = lambda jenis, rs: {"v": 1, "jenis": jenis, "tahun": th, "beku": True, "sha256_sumber": sha, "n": len(rs), "kolom": KOLOM, "baris": urut(rs)}
        for prov, rs in sorted(d["prov"].items()):
            keluar["kejadian/arsip/%d/%s.json" % (th, prov)] = dasar("kejadian_arsip", rs)
        for kab, rs in sorted(d["kab"].items()):
            keluar["kejadian/arsip/%d/k%s.json" % (th, kab)] = dasar("kejadian_arsip_kab", rs)
        if d["lepas"]:
            nl = keluar.setdefault("kejadian/arsip/%d/tanpa_wilayah.json" % th, dasar("kejadian_arsip", []))
            nl["tanpa_wilayah"] = urut(d["lepas"])
            nl["n"] = len(d["lepas"])
    return keluar

TAHUN_KASUS, TOP_KASUS = 10, 10
URUT_DAMPAK = ("terdampak", "mengungsi", "meninggal")   # ALGORITMA PB 5.2 butir 2; diurut menurut DIBI saja (satu sumber, tanpa dijumlah)
TIDAK_ADA = "tidak ada arsip"


def kasus_historis(keluar, tahun_akhir, tanda_staf=()):
    """PB-52 (F-26, Q23): {jenis: [kasus]} dari baris arsip hasil bangun_arsip, 10 tahun terakhir, sepuluh teratas per jenis.
    Kandidat = kejadian yang tercatat di Logbook Pusdalops (aktivasi = dilaporkan ke Pusdalops; TIDAK ada ambang angka di repo dan tidak dibuat baru,
    lihat scripts/umum/laporan_kejadian.py) ditambah id di tanda_staf (belum ada sumbernya: kosong). Diurut menurut DIBI (terdampak, mengungsi, meninggal);
    baris tanpa angka DIBI dihitung di `tanpa_dampak_dibi`, tidak dianggap 0. Sinyal dan peringatan: 'tidak ada arsip' (arsipnya belum ada), bukan dugaan."""
    per, tanpa = collections.defaultdict(list), collections.Counter()
    for rel, isi in keluar.items():
        if isi.get("jenis") != "kejadian_arsip" or not isi["tahun"] > tahun_akhir - TAHUN_KASUS:
            continue
        for r in isi["baris"]:
            b = dict(zip(KOLOM, r))
            if not b["kab4"] or not ("logbook" in b["sumber"] or b["id"] in tanda_staf):
                continue
            dibi = b["dampak"].get("dibi", {})
            kunci = tuple(dibi[k]["n"] if k in dibi else None for k in URUT_DAMPAK)
            for j in b["jenis"].split("+"):
                if all(v is None for v in kunci):
                    tanpa[j] += 1
                else:
                    per[j].append((kunci, b))
    hasil = {}
    for j, rs in sorted(per.items()):
        rs.sort(key=lambda x: (tuple(-1 if v is None else v for v in x[0]), x[1]["mulai"], x[1]["id"]), reverse=True)
        hasil[j] = [{"id": b["id"], "jenis": b["jenis"], "kab4": b["kab4"], "mulai": b["mulai"], "akhir": b["akhir"], "sumber": b["sumber"], "dampak": b["dampak"],
                     "sinyal": TIDAK_ADA, "peringatan": TIDAK_ADA} for _, b in rs[:TOP_KASUS]]
    return {"v": 1, "jenis": "kasus_historis", "tahun_akhir": tahun_akhir, "tahun_awal": tahun_akhir - TAHUN_KASUS + 1, "top": TOP_KASUS,
            "aturan": "kandidat = tercatat di Logbook Pusdalops; tanpa ambang angka baru (Q23)", "tanda_staf": len(tanda_staf), "tanda_staf_catatan": "" if tanda_staf else "belum ada sumber",
            "tanpa_dampak_dibi": dict(sorted(tanpa.items())), "kasus": hasil}


def tulis(keluar, dasar):
    """Hanya berkas baru atau berubah ditulis; JSON kanonik (kunci terurut) supaya sidik stabil antar jalan."""
    baru = 0
    for rel, isi in keluar.items():
        j = os.path.join(dasar, "siklus", "saji", *rel.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        b = json.dumps(isi, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        if not os.path.exists(j) or open(j, "rb").read() != b:
            open(j, "wb").write(b)
            baru += 1
    return baru


def _uji():
    R = lambda s, jn, kab, t, **n: {"sumber": s, "kode": P._kode(jn, kab, t), "jenis": jn, "kab": list(kab), "tgl": t, "nilai": n, "akhir": None}
    masuk = lambda: {"dibi": [R("dibi", ("banjir",), ("3201",), "2019-02-12", meninggal=2, hilang=0),
                              R("dibi", ("banjir",), ("3217",), "2019-03-01", meninggal=1)],
                     "logbook": [R("logbook", ("banjir",), ("3201",), "2019-02-13", meninggal=1, luka=None),
                                 R("logbook", ("banjir",), (), "2019-04-01", meninggal=4)]}
    a = bangun_arsip(masuk())
    # id stabil antar jalan dan sama dengan pasang.py untuk kunci yang sama; urutan masuk tidak berpengaruh
    b = bangun_arsip({k: list(reversed(v)) for k, v in reversed(list(masuk().items()))})
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
    p = a["kejadian/arsip/2019/32.json"]
    assert p["beku"] is True and p["kolom"] == KOLOM and p["n"] == 2 and p["jenis"] == "kejadian_arsip"
    satu = next(r for r in p["baris"] if r[3] == "2019-02-12")
    assert satu[0] == P.id_kj("banjir|3201|2019-02-12") and satu[6] == ["dibi", "logbook"]
    assert satu[7]["selisih"] == {"meninggal": 1} and "luka" not in satu[7]["logbook"], "selisih hanya bila dua sumber melapor"
    lain = next(r for r in p["baris"] if r[3] == "2019-03-01")
    assert "selisih" not in lain[7] and lain[6] == ["dibi"]
    assert "total" not in json.dumps(a) and "jumlah_gabungan" not in json.dumps(a)
    # tanpa wilayah: di tanpa_wilayah, bukan di prov atau k<kab4>.json
    tw = a["kejadian/arsip/2019/tanpa_wilayah.json"]
    assert len(tw["tanpa_wilayah"]) == 1 and tw["tanpa_wilayah"][0][2] is None and tw["baris"] == []
    dalam = json.dumps([v for k, v in a.items() if "tanpa_wilayah" not in k])
    assert tw["tanpa_wilayah"][0][0] not in dalam
    k = a["kejadian/arsip/2019/k3201.json"]
    assert k["jenis"] == "kejadian_arsip_kab" and [r[0] for r in k["baris"]] == [satu[0]]
    # tabrakan ID: dua pendiri berkunci sama (jarak > jendela tidak, tapi sama hari dan kab dari dua DIBI beda jenis-kunci bukan tabrakan);
    # dua rekaman logbook tanggal sama kab sama tetap dijumlah (satuan), sehingga tabrakan dibuktikan lewat pasang.id_bebas
    assert P.id_bebas("banjir|3201|2019-02-12", {satu[0]}) == P.id_kj("banjir|3201|2019-02-12", 2)
    # pemetaan antar jalan: menambah sumber belakangan tidak mengubah ID yang sudah ada
    pm, al = {}, {}
    bangun_arsip({"logbook": [R("logbook", ("banjir",), ("3201",), "2019-02-14")]}, sisa=pm)
    id_lama = next(iter(pm.values()))
    pm2 = {}
    c = bangun_arsip({"dibi": masuk()["dibi"][:1], "logbook": [R("logbook", ("banjir",), ("3201",), "2019-02-14")]}, lama=pm, alias=al, sisa=pm2)
    assert set(pm2.values()) == {id_lama} and al == {} and c["kejadian/arsip/2019/32.json"]["baris"][0][0] == id_lama
    # tulis deterministik dan hanya yang berubah
    with tempfile.TemporaryDirectory() as d:
        assert tulis(a, d) == len(a) and tulis(a, d) == 0
        assert os.path.exists(os.path.join(d, "siklus/saji/kejadian/arsip/2019/32.json"))
        # sidik sumber memakai tahun tetangga
        for s in SUMBER:
            os.makedirs(os.path.join(d, s))
        open(os.path.join(d, "dibi", "2019.jsonl.gz"), "wb").write(b"x")
        h1 = sha_sumber(d, 2019)
        open(os.path.join(d, "dibi", "2020.jsonl.gz"), "wb").write(b"y")
        assert sha_sumber(d, 2019) != h1 and sha_sumber(d, 2021) != sha_sumber(d, 2030)
    # kunci terlarang ditolak saji (kontrak bersama)
    S = _muat("saji")
    assert S.periksa_berkas("siklus/saji/kejadian/arsip/2019/32.json", json.dumps(p).encode()) == []
    assert S.periksa_berkas("siklus/saji/kejadian/arsip/2019/32.json", json.dumps({"total": 1}).encode())
    # PB-25: awalan dari registri, bukan daftar tulisan tangan
    pa = awalan_bencana()
    assert {"B", "P", "C", "U", "V", "D"} <= set(pa) and not set(pa) & set(SUDAH_ADA), pa
    assert jenis_dari_kode("B0012", pa) == "banjir" and jenis_dari_kode("P0003", pa) == "gelombang"
    assert jenis_dari_kode("K0001", pa) is None and jenis_dari_kode("Z0001", pa) is None and jenis_dari_kode("KJ-2019-AAAA", pa) is None
    # PB-52: kasus historis
    kh = bangun_arsip({"dibi": [R("dibi", ("banjir",), ("3201",), "2019-02-12", terdampak=500, meninggal=2), R("dibi", ("banjir",), ("3217",), "2019-03-01", terdampak=9000),
                                R("dibi", ("banjir",), ("3301",), "2012-01-01", terdampak=99999), R("dibi", ("banjir",), ("3302",), "2019-05-01", meninggal=1)],
                       "logbook": [R("logbook", ("banjir",), ("3201",), "2019-02-13", meninggal=1), R("logbook", ("banjir",), ("3301",), "2012-01-01"),
                                   R("logbook", ("banjir",), ("3302",), "2019-05-01"), R("logbook", ("banjir",), ("3303",), "2019-06-01", meninggal=3)]})
    ks = kasus_historis(kh, 2026)
    assert [k["kab4"] for k in ks["kasus"]["banjir"]] == ["3201", "3302"], ks      # 3217 tanpa Logbook, 3301 di luar 10 tahun, 3303 tanpa DIBI
    assert ks["tanpa_dampak_dibi"] == {"banjir": 1} and ks["kasus"]["banjir"][0]["sinyal"] == TIDAK_ADA and "total" not in json.dumps(ks)
    assert [k["kab4"] for k in kasus_historis(kh, 2026, {P.id_kj("banjir|3217|2019-03-01")})["kasus"]["banjir"]] == ["3217", "3201", "3302"]
    print("arsip_kejadian: uji hijau")


def _opsi(a, nama, bawaan):
    return a[a.index(nama) + 1] if nama in a else bawaan


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["bangun"]:
        bd = _opsi(a, "--bersih", P.BERSIH_BAWAAN)
        per, tak = {}, 0
        for s in SUMBER:
            per[s], t = P.baca_bersih(bd, s)
            tak += t
        dasar = _opsi(a, "--keluar", os.path.join(P.AKAR, "data/raw/siklus"))
        # pemetaan dan alias di <keluar>/pemetaan/ (saudara siklus/, jadi tidak ikut diunggah gudang.py)
        pdir = os.path.join(dasar, "pemetaan")
        fm, fa = os.path.join(pdir, "kj_pemetaan.json"), os.path.join(pdir, "alias.json")
        lama = {tuple(k.split("|", 1)): v for k, v in json.load(open(fm))["pemetaan"].items()} if os.path.exists(fm) else {}
        alias_lama = json.load(open(fa))["alias"] if os.path.exists(fa) else {}
        alias, baru = dict(alias_lama), {}
        out = bangun_arsip(per, bd, lama=lama, alias=alias, sisa=baru)
        alias = {k: v for k, v in alias.items() if k != v and k not in set(baru.values())}   # ID yang hidup lagi bukan alias
        os.makedirs(pdir, exist_ok=True)
        json.dump({"v": 1, "pemetaan": {"%s|%s" % k: v for k, v in sorted(baru.items())}}, open(fm, "w"), sort_keys=True, separators=(",", ":"))
        json.dump({"v": 1, "alias": dict(sorted(alias.items()))}, open(fa, "w"), sort_keys=True, indent=1)
        out["kejadian/arsip/kasus.json"] = kasus_historis(out, dt.date.today().year)
        n = tulis(out, dasar)
        tahun = collections.Counter(r.split("/")[2] for r in out if not r.endswith("/kasus.json"))
        print(json.dumps({"alias": len(alias), "berkas": len(out), "ditulis": n, "jenis_tak_dibandingkan": tak, "berkas_per_tahun": dict(sorted(tahun.items()))}, indent=1))
    else:
        sys.exit("pakai: arsip_kejadian.py bangun [--bersih DIR] [--keluar DIR] | uji")
