"""Kalender ancaman daerah (Silang Sumber F6) -> public/data/kalender_ancaman.json

Per kabupaten (kunci IRBI 4 digit), per bahaya (banjir, longsor, karhutla, kekeringan), 12 bulan.
DUA KOLOM TERPISAH, TIDAK ADA SKOR GABUNGAN (keputusan Q7):
  laju  : kalender_risiko.json (logbook Pusdalops tahun penuh): p = ada/dari (tahun yang bulan itu punya kejadian / jumlah tahun penuh),
          selalu dengan pembilang (ada) dan penyebut (dari); n = jumlah kejadian; kecil = total setahun < 5 -> p DIBUang (null), ada/dari/n tetap.
          Tambahan 'terkini' (hitungan mentah, bukan persen): kejadian DIBI (dibi_kejadian.json, ~setahun) dan logbook 2026 (logbook_kejadian.json) per bulan.
          Kekeringan tak ada di kalender_risiko: hanya 'terkini'.
  bmkg  : narasi prakiraan BMKG (arsip iklim_bmkg_arsip.json) -> label resmi curah hujan + sifat hujan per bulan dan dasarian ke depan,
          dicocokkan ke kabupaten lewat NAMA (nama_wilayah.nk), bukan kode internal narasi. Bulan tanpa narasi: null ("tidak disebut").
          Ditaruh sekali per kabupaten (sama untuk semua bahaya), bukan diulang di tiap bahaya.
Bukan prediksi Centurisk97 dan bukan uji balik: dua sumber ditampilkan berdampingan.

Pakai:  python3 scripts/umum/kalender_ancaman.py   |   python3 scripts/umum/kalender_ancaman.py uji
"""
import datetime as dt, json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
from nama_wilayah import nk  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/kalender_ancaman.json")
WIB = dt.timezone(dt.timedelta(hours=7))
BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"]
BAHAYA = ["banjir", "longsor", "karhutla", "kekeringan"]
DIBI_JENIS = {  # jenis DIBI -> bahaya (satu jenis boleh ke dua bahaya)
    "Banjir": ["banjir"], "Banjir Bandang": ["banjir"], "Banjir Genangan": ["banjir"], "Banjir Rob": ["banjir"], "Banjir Lahar (Lahar)": ["banjir"],
    "Banjir dan Tanah Longsor": ["banjir", "longsor"], "Tanah Longsor": ["longsor"], "Gerakan Tanah": ["longsor"],
    "Kebakaran Hutan dan Lahan": ["karhutla"], "Kebakaran Lahan": ["karhutla"], "Kebakaran Hutan": ["karhutla"], "Kebakaran Lahan Gambut": ["karhutla"],
    "Kekeringan": ["kekeringan"], "Kekeringan Pertanian": ["kekeringan"]}
LOG_JENIS = {"banjir": ["banjir"], "banjir_bandang": ["banjir"], "rob": ["banjir"], "banjir_longsor": ["banjir", "longsor"], "longsor": ["longsor"],
             "karhutla": ["karhutla"], "kekeringan": ["kekeringan"]}


def baca(rel):
    p = os.path.join(AKAR, rel)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def kunci(nama):
    """(kota?, nama ternormalisasi) lewat nama_wilayah.nk; kota/kab dibedakan di sini karena nk membuangnya."""
    n = (nama or "").lower().strip()
    return (bool(re.match(r"^kota\b", n)), nk(nama)[1])


class Peta:
    """Kabupaten IRBI dari kode.json: cari lewat kode Kemendagri (+cek nama) atau lewat (provinsi, nama)."""

    def __init__(self, kode, prov_nama):
        self.kode, self.prov_nama = kode, prov_nama
        self.kem, self.nama, self.glob = {}, {}, {}
        for k, v in kode.items():
            self.kem[v.get("kemendagri")] = k
            self.nama.setdefault((v["prov"],) + kunci(v["nama"]), k)
            self.nama.setdefault((v["prov"], None, kunci(v["nama"])[1]), k)
            self.glob.setdefault(kunci(v["nama"]), []).append(k)

    def lewat_nama(self, prov, nama):
        kp = self.prov_nama.get(re.sub(r"[^a-z]", "", (prov or "").lower()))
        k = kunci(nama)
        hit = kp and (self.nama.get((kp,) + k) or self.nama.get((kp, None, k[1])))
        g = self.glob.get(k, [])  # provinsi tak dikenal (pemekaran Papua dst.): nama unik se-Indonesia
        return hit or (g[0] if len(g) == 1 and k[1] else None)

    def lewat_kemendagri(self, kem, nama):
        k = self.kem.get(kem)
        if k and kunci(self.kode[k]["nama"])[1] == kunci(nama)[1]:
            return k
        return None


def hitung_terkini(peta, dibi, log):
    """-> {kab: {bahaya: {'dibi': [12], 'logbook': [12]}}}, jumlah baris dibuang (kode+nama tak cocok), bulan tercakup."""
    out, buang = {}, {"dibi": 0, "logbook": 0}

    def tambah(kab, bahaya, sumber, bln, n):
        h = out.setdefault(kab, {}).setdefault(bahaya, {"dibi": [0] * 12, "logbook": [0] * 12})
        h[sumber][bln] += n

    for r in (dibi or {}).get("kejadian", []):
        bs = DIBI_JENIS.get(r.get("jenis"))
        if not bs:
            continue
        k = peta.lewat_kemendagri(r.get("kab_kode"), r.get("kab")) or peta.lewat_nama(r.get("prov"), r.get("kab"))
        if not k:
            buang["dibi"] += 1
            continue
        for b in bs:
            tambah(k, b, "dibi", int(r["tanggal"][5:7]) - 1, r.get("kejadian") or 1)
    for r in (log or {}).get("kejadian", []):
        bs = LOG_JENIS.get(r.get("jenis"))
        if not bs:
            continue
        tgl = r.get("mulai") or (r.get("terlihat") or [None])[0]
        if not tgl:
            continue
        k = peta.lewat_kemendagri(r.get("kab_kode"), r.get("kab")) or peta.lewat_nama(r.get("prov"), r.get("kab"))
        if not k:
            buang["logbook"] += 1
            continue
        for b in bs:
            tambah(k, b, "logbook", int(tgl[5:7]) - 1, 1)
    return out, buang


def bulan_cakup(blok):
    """Bulan 1..12 yang tercakup rentang dari..sampai (set indeks 0..11); rentang >12 bulan tercakup semua."""
    if not blok or not blok.get("dari") or not blok.get("sampai"):
        return set()
    a, b = dt.date.fromisoformat(blok["dari"]), dt.date.fromisoformat(blok["sampai"])
    s, d = set(), a
    while d <= b and len(s) < 12:
        s.add(d.month - 1)
        d += dt.timedelta(days=1)
    return s


def tingkat(narasi_arsip, peta):
    """Narasi BMKG terbaru -> {kab: {'bulan': {i: {...}}, 'dasarian': [...]}}; plus daftar nama tak cocok."""
    out, tak, ambil = {}, [], None
    # urut menurut waktu ambil (lalu kunci, demi deterministik): edisi lebih baru menimpa yang lama untuk (tahun, bulan) yang sama
    for key, v in sorted((narasi_arsip or {}).items(), key=lambda kv: (kv[1].get("diambil") or "", kv[0])):
        jenis = {"pch": "curah", "psh": "sifat"}.get(key.split("|")[0].split("_")[0])
        if not jenis or not v.get("wilayah"):
            continue
        dasarian = key.split("|")[0].endswith("_das")
        per = v.get("periode") or ""
        m = re.search(r"(?:bulan|Dasarian \w+) (\w+) (\d{4})", per)
        if not m or m.group(1).lower() not in BULAN:
            continue
        bi = BULAN.index(m.group(1).lower())
        thn, dm = int(m.group(2)), v.get("diambil")
        ambil = max(ambil or "", dm or "") or ambil
        for w in v["wilayah"]:
            lab = w["kategori"] + (" (" + w["rentang"] + ")" if w.get("rentang") else "")
            for kb in w["kab"]:
                k = peta.lewat_nama(kb.get("prov"), kb.get("nama"))
                if not k:
                    tak.append("%s: %s" % (kb.get("prov"), kb.get("nama")))
                    continue
                e = out.setdefault(k, {"bulan": {}, "dasarian": {}})
                if dasarian:
                    x = e["dasarian"].setdefault(per, {"periode": per, "bulan": bi + 1, "tahun": thn})
                    x[jenis], x["diambil"] = lab, dm
                else:
                    x = e["bulan"].setdefault((thn, bi), {"periode": per})
                    x[jenis], x["diambil"] = lab, dm
    return out, sorted(set(tak)), ambil


def label_bmkg(e):
    def teks(d):
        p = []
        if d.get("curah"):
            p.append("curah hujan " + d["curah"])
        if d.get("sifat"):
            p.append("sifat hujan " + d["sifat"])
        return "; ".join(p)
    res = []
    for i in range(12):
        ada = sorted(k for k in (e["bulan"] if e else {}) if k[1] == i)  # (tahun, bulan): tahun terbaru menang
        d = e["bulan"][ada[-1]] if ada else None
        res.append({"label": teks(d), "lembaga": "BMKG", "periode": d["periode"], "diambil": d.get("diambil"),
                    "dasarian": [{"periode": x["periode"], "label": teks(x)} for x in sorted((e or {}).get("dasarian", {}).values(), key=lambda x: x["periode"])
                                 if x["bulan"] == i + 1 and (not ada or x["tahun"] == ada[-1][0])]} if d and teks(d) else None)
    return res


def bulan_laju(h, tahun, terkini, cakup):
    """12 baris laju untuk satu bahaya. h = blok kalender_risiko (atau None); tahun = n_tahun penuh."""
    baris = []
    for i in range(12):
        r = {"p": None, "ada": None, "dari": None, "n": None, "kecil": None}
        if h:
            r["ada"], r["dari"], r["n"] = h["ada"][i], tahun, h["n"][i]
            # kecil: total setahun < 5 (aturan lama) ATAU sel ini ada <= 2 tahun atau n < 3 -> p tidak ditulis
            r["kecil"] = bool(h["kecil"]) or h["ada"][i] <= 2 or h["n"][i] < 3
            r["p"] = None if r["kecil"] else round(h["ada"][i] / tahun, 2)
        t = terkini or {}
        r["terkini"] = {s: (t[s][i] if (s in t and i in cakup[s]) else None) for s in ("dibi", "logbook")}
        baris.append(r)
    return baris


def bangun(risiko, terkini, bm, ambil, cakup):
    tahun = risiko["n_tahun"]
    kabs = {}
    for k in sorted(set(risiko["kab"]) | set(terkini) | set(bm)):
        e = {}
        for b in BAHAYA:
            h = risiko["kab"].get(k, {}).get(b)
            t = terkini.get(k, {}).get(b)
            if h or t:
                e[b] = {"bulan": bulan_laju(h, tahun, t, cakup)}
        if k in bm:
            e["bmkg"] = label_bmkg(bm[k])
        if e:
            kabs[k] = e
    return kabs


def jalan():
    risiko = baca("public/prediksi/data/kalender_risiko.json")
    kode = baca("public/data/kemitraan/kode.json")
    if not risiko or not kode:
        sys.exit("masukan wajib hilang: kalender_risiko.json atau kemitraan/kode.json")
    dibi, log = baca("public/data/dibi_kejadian.json"), baca("public/data/logbook_kejadian.json")
    arsip = baca("public/banjir/data/iklim_bmkg_arsip.json")
    prov_nama = {}
    for r in (dibi or {}).get("kejadian", []):
        prov_nama[re.sub(r"[^a-z]", "", r["prov"].lower())] = r["prov_kode"]
    for r in (log or {}).get("kejadian", []):
        if r.get("kab_kode") and r.get("prov"):
            prov_nama.setdefault(re.sub(r"[^a-z]", "", r["prov"].lower()), r["kab_kode"][:2])
    peta = Peta(kode, prov_nama)
    terkini, buang = hitung_terkini(peta, dibi, log)
    bm, tak, ambil = tingkat((arsip or {}).get("narasi"), peta)
    cakup = {"dibi": bulan_cakup(dibi), "logbook": bulan_cakup(log)}
    kabs = bangun(risiko, terkini, bm, ambil, cakup)
    catatan = [
        "Dua kolom terpisah, tanpa skor gabungan: laju kejadian (logbook tahun penuh, dengan pembilang dan penyebut) dan prakiraan resmi BMKG (label apa adanya). Bukan prediksi Centurisk97.",
        "Laju: p = tahun yang bulan itu punya kejadian / %d tahun penuh. Tahun yang dipakai: %s (2014-2020, 2024, 2025). Tahun yang dibuang: 2021-2023, karena tahun penuh di logbook_riwayat.json mensyaratkan tiap bulan punya >= 25 hari tercatat dan tahun itu tidak memenuhinya, dan 2026 (belum selesai). 2021-2023 adalah masa La Nina beruntun dan 2023 El Nino kuat, sehingga kalender ini tidak memuat tahun-tahun basah dan kering ekstrem itu." % (risiko["n_tahun"], ", ".join(risiko["tahun_penuh"])),
        "Angka adalah kejadian yang DILAPORKAN ke Pusdalops BNPB, bukan semua kejadian; intensitas pencatatan berubah antar tahun, sehingga p bulan tertentu ikut dipengaruhi kebiasaan lapor.",
        "kecil=true (p tidak ditulis; ada, dari, n tetap tampil) bila total kejadian bahaya itu di kab itu setahun < 5, atau sel bulan itu ada <= 2 tahun, atau n < 3.",
        "terkini = hitungan kejadian mentah (bukan persen): DIBI %s s.d. %s dan logbook %s s.d. %s. Keduanya tumpang tindih sebagian dan TIDAK dijumlah; null = bulan itu di luar rentang. Oktober DIBI memuat dua potong (akhir 2025 dan 2026)."
        % ((dibi or {}).get("dari"), (dibi or {}).get("sampai"), (log or {}).get("dari"), (log or {}).get("sampai")),
        "Kekeringan tidak ada di kalender_risiko, jadi hanya 'terkini'. Cuaca ekstrem tidak dimasukkan (bukan lingkup tiket).",
        "bmkg: null = tidak disebut dalam narasi BMKG yang diarsipkan (hanya bulan ke depan). Dicocokkan lewat nama kabupaten dan provinsi; %d nama narasi tidak cocok." % len(tak),
        "Baris DIBI/logbook yang kode dan namanya tak cocok kabupaten mana pun dibuang: DIBI %d, logbook %d." % (buang["dibi"], buang["logbook"])]
    return {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"), "versi": 1,
            "sumber": {"laju": "public/prediksi/data/kalender_risiko.json (dibuat %s)" % risiko.get("dibuat"), "dibi": "public/data/dibi_kejadian.json",
                       "logbook": "public/data/logbook_kejadian.json", "bmkg": "public/banjir/data/iklim_bmkg_arsip.json (narasi, diambil %s)" % ambil},
            "kecil_di_bawah": risiko.get("kecil_di_bawah", 5), "n_kab": len(kabs), "kab": kabs, "tak_cocok_bmkg": tak, "catatan": catatan}


def simpan(d, jalur=KELUAR):
    tmp = jalur + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, jalur)


def simpan_per_kab(d, folder=None):
    """public/data/kalender_ancaman/<kab4>.json = metadata + satu entri kab; berkas kab yang sudah tak ada dihapus. -> (jumlah, terbesar_byte)"""
    folder = folder or KELUAR[:-5]
    os.makedirs(folder, exist_ok=True)
    meta = {k: d[k] for k in ("dibuat", "versi", "sumber", "kecil_di_bawah", "catatan")}
    for kab, e in d["kab"].items():
        simpan(dict(meta, kab_kode=kab, data=e), os.path.join(folder, kab + ".json"))
    for f in os.listdir(folder):
        if f.endswith(".json") and f[:-5] not in d["kab"]:
            os.remove(os.path.join(folder, f))
    return len(d["kab"]), max(os.path.getsize(os.path.join(folder, f)) for f in os.listdir(folder))


def uji():
    kode = {"1101": {"prov": "11", "nama": "Kab. Aceh Selatan", "kemendagri": "11.01"},
            "3171": {"prov": "31", "nama": "Kota Adm. Jakarta Selatan", "kemendagri": "31.74"},
            "3201": {"prov": "32", "nama": "Kab. Bogor", "kemendagri": "32.01"},
            "3271": {"prov": "32", "nama": "Kota Bogor", "kemendagri": "32.71"}}
    peta = Peta(kode, {"aceh": "11", "jawabarat": "32", "dkijakarta": "31"})
    assert peta.lewat_kemendagri("11.01", "Aceh Selatan") == "1101" and peta.lewat_kemendagri("11.01", "Pidie") is None
    assert peta.lewat_nama("Jawa Barat", "Kota Bogor") == "3271" and peta.lewat_nama("Jawa Barat", "Bogor") == "3201"
    assert peta.lewat_nama("DKI Jakarta", "Kota Adm. Jakarta Selatan") == "3171"
    dibi = {"dari": "2025-10-28", "sampai": "2026-10-28", "kejadian": [
        {"tanggal": "2026-03-05", "jenis": "Banjir dan Tanah Longsor", "kab_kode": "11.01", "kab": "Aceh Selatan", "prov": "Aceh", "kejadian": 2},
        {"tanggal": "2026-03-06", "jenis": "Gempabumi", "kab_kode": "11.01", "kab": "Aceh Selatan", "prov": "Aceh", "kejadian": 9},
        {"tanggal": "2026-04-01", "jenis": "Banjir", "kab_kode": "99.99", "kab": "Tidak Ada", "prov": "Aceh", "kejadian": 1}]}
    log = {"dari": "2026-01-01", "sampai": "2026-10-29", "kejadian": [{"jenis": "kekeringan", "mulai": None, "terlihat": ["2026-10-29"], "kab_kode": "11.01", "kab": "Kab. Aceh Selatan", "prov": "Aceh"}]}
    t, buang = hitung_terkini(peta, dibi, log)
    assert t["1101"]["banjir"]["dibi"][2] == 2 and t["1101"]["longsor"]["dibi"][2] == 2 and "gempa" not in t["1101"] and buang["dibi"] == 1
    assert t["1101"]["kekeringan"]["logbook"][9] == 1
    cakup = {"dibi": bulan_cakup(dibi), "logbook": bulan_cakup(log)}
    assert cakup["dibi"] == set(range(12)) and cakup["logbook"] == set(range(10))
    arsip = {"pch_bln|X|Maret 2027": {"periode": "bulan Maret 2027", "diambil": "2026-11-10", "wilayah": [{"kategori": "Tinggi", "rentang": "300-500 mm", "kab": [{"prov": "Aceh", "nama": "Aceh Selatan", "kode": "9999"}, {"prov": "Aceh", "nama": "Antah", "kode": "1"}]}]},
             "psh_bln|X|Maret 2027": {"periode": "bulan Maret 2027", "diambil": "2026-11-10", "wilayah": [{"kategori": "Atas Normal", "rentang": "", "kab": [{"prov": "Aceh", "nama": "Kab. Aceh Selatan"}]}]},
             "psh_das|X|Dasarian II Maret 2027": {"periode": "Dasarian II Maret 2027", "diambil": "2026-11-10", "wilayah": [{"kategori": "Normal", "rentang": "", "kab": [{"prov": "Aceh", "nama": "Aceh Selatan"}]}]}}
    bm, tak, ambil = tingkat(arsip, peta)
    assert tak == ["Aceh: Antah"] and ambil == "2026-11-10"
    lb = label_bmkg(bm["1101"])
    assert lb[2]["label"] == "curah hujan Tinggi (300-500 mm); sifat hujan Atas Normal" and lb[0] is None and lb[2]["dasarian"][0]["label"] == "sifat hujan Normal"
    risiko = {"n_tahun": 9, "tahun_penuh": ["2024"], "kab": {"1101": {"banjir": {"ada": [3] + [0] * 11, "n": [4] + [0] * 11, "kecil": False},
                                                                          "longsor": {"ada": [1] + [0] * 11, "n": [1] + [0] * 11, "kecil": True}}}}
    kab = bangun(risiko, t, bm, ambil, cakup)["1101"]
    b0 = kab["banjir"]["bulan"][0]
    assert (b0["p"], b0["ada"], b0["dari"], b0["n"]) == (0.33, 3, 9, 4) and kab["longsor"]["bulan"][0]["p"] is None and kab["longsor"]["bulan"][0]["ada"] == 1
    assert kab["banjir"]["bulan"][2]["terkini"] == {"dibi": 2, "logbook": 0} and kab["banjir"]["bulan"][11]["terkini"]["logbook"] is None
    k = kab["kekeringan"]["bulan"][5]
    assert k["p"] is None and k["n"] is None and k["terkini"] == {"dibi": 0, "logbook": 0}
    assert "skor" not in json.dumps(kab)
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        dd = {"dibuat": "x", "versi": 1, "sumber": {}, "kecil_di_bawah": 5, "catatan": [], "kab": {"1101": kab, "1102": {}}}
        open(os.path.join(tmp, "9999.json"), "w").write("{}")
        assert simpan_per_kab(dd, tmp)[0] == 2 and sorted(os.listdir(tmp)) == ["1101.json", "1102.json"]
        assert json.load(open(os.path.join(tmp, "1101.json")))["data"] == kab
    print("uji kalender_ancaman: hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        d = jalan()
        simpan(d)
        n, besar = simpan_per_kab(d)
        print("kalender_ancaman.json: %d kab, bmkg tak cocok %d; per kab %d berkas, terbesar %d B" % (d["n_kab"], len(d["tak_cocok_bmkg"]), n, besar))
