"""Riwayat kejadian bencana hidrometeorologi BNPB (data.bnpb.go.id, CKAN datastore, tanpa kunci) -> public/banjir/data/kejadian.json

Yang tersedia di datastore (Okt 2026) dan dipakai:
  - Kompilasi per tahun (2024, 2025, dan tahun berikutnya bila terbit dengan pola nama sama): per provinsi DAN per
    kabupaten/kota, dirinci per jenis bencana: kejadian, meninggal, terdampak, mengungsi, rumah rusak.
    (Kabupaten per jenis baru ada untuk 2024.)
  - Seri 2010-2024 per provinsi dan per kabupaten: jumlah kejadian SEMUA jenis bencana (tidak dirinci jenis) -> jenis "semua".
  - Seri nasional 2010-2024 per jenis (kejadian + dampak) -> "nasional".
Yang TIDAK dipakai: berkas tahunan 2000-2023 per kabupaten (stat_by_wil_XX_YYYY) tidak dirinci jenis, kolomnya tanpa
label, dan unduhan berkasnya diblokir tantangan Cloudflare; sebagian lain hanya tautan Google Drive.

DIBI BNPB (dibi.bnpb.go.id, Apache Superset): baris kejadian per kabupaten dengan tanggal, 2008-sekarang. Diambil lewat
permintaan yang sama dengan dasbor publik 1 (tamu, tanpa login/token): POST /api/v1/chart/data dengan form_data
{"slice_id": 1, "dashboardId": 1}. Tidak resmi: bila Superset diubah, akses bisa hilang dan bagian DIBI dilewati.
  - Kolom dikelompokkan + SUM (bukan baris mentah: Superset menggabungkan baris kembar, jumlahnya hilang diam-diam).
  - Jenis DIBI -> kunci: lihat DIBI_JENIS. "Banjir dan Tanah Longsor" dihitung di banjir DAN longsor.
  - DIBI 2024 tidak lengkap (bandang, rob, puting beliung 0) dan DIBI mencatat per kabupaten, jadi satu kejadian lintas
    kabupaten bisa terhitung beberapa kali. Karena itu tahun yang sudah ada di kompilasi CKAN (prov 2024-2025, kab 2024)
    TIDAK ditimpa DIBI untuk jenis yang ada di CKAN; bandang dan rob selalu dari DIBI.
  - terdampak = "menderita"; rumah_rusak = rusak berat + sedang + ringan (rumah terendam tidak dihitung).

Nama kabupaten dicocokkan ke properti "kab" public/geo/kabupaten/*.json (lihat kunci_nama).

Pakai:  python3 scripts/data/kejadian.py        |  python3 scripts/data/kejadian.py uji
"""
import datetime as dt, difflib, json, os, re, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, ambil, simpan
from wilayah import AKAR, PROVINSI

API = "https://data.bnpb.go.id/api/3/action/"
JENIS = {"BANJIR": "banjir", "TANAH LONGSOR": "longsor", "KEKERINGAN": "kering", "CUACA EKSTREM": "cuaca",
         "CUACA EKSTRIM": "cuaca", "GELOMBANG PASANG DAN ABRASI": "gelombang"}
METRIK = [("kejadian", r"Jumlah Kejadian Bencana"), ("meninggal", r"Korban Meninggal"), ("terdampak", r"Korban Terdampak"),
          ("mengungsi", r"Korban Mengungsi"), ("rumah_rusak", r"Jumlah Rumah Rusak")]


DIBI = "https://dibi.bnpb.go.id/api/v1/chart/data"
DIBI_JENIS = {  # nama DIBI (tanpa spasi tepi) -> kunci
    "Banjir": ["banjir"], "Banjir Genangan": ["banjir"], "Banjir dan Tanah Longsor": ["banjir", "longsor"],
    "Banjir Bandang": ["bandang"], "Tanah Longsor": ["longsor"], "Gerakan Tanah": ["longsor"],
    "Cuaca Ekstrem": ["cuaca"], "Puting Beliung": ["cuaca"], "Angin Kencang": ["cuaca"], "Angin Topan": ["cuaca"],
    "Kekeringan": ["kering"], "Kekeringan Pertanian": ["kering"],
    "Gelombang Pasang / Abrasi": ["gelombang"], "Gelombang Pasang": ["gelombang"], "Abrasi Pantai": ["gelombang"],
    "Banjir Rob": ["rob"],
}
DIBI_ANGKA = ["jumlah_kejadian", "meninggal", "menderita", "mengungsi", "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan"]
TAHUN_DAFTAR = 3  # kejadian_dibi: baris kejadian 3 tahun terakhir


def angka(v):
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return 0


def kunci_nama(s):
    """Nama kabupaten -> kunci banding: huruf besar, tanpa 'KABUPATEN'/'KAB.'/'ADMINISTRASI'/'DAN', tanpa tanda baca
    dan spasi. Awalan KOTA dipertahankan supaya Kota Sukabumi != Sukabumi."""
    s = re.sub(r"\bKEP\b", "KEPULAUAN", s.upper().replace(".", " "))
    s = re.sub(r"\b(KABUPATEN|KAB|ADMINISTRASI|ADM|DAN)\b", " ", s)
    kota = bool(re.match(r"\s*KOTA\b", s))
    s = re.sub(r"\bKOTA\b", " ", s)
    return ("KOTA " if kota else "") + re.sub(r"[^A-Z0-9]", "", s)


def judul(s):
    """'KABUPATEN ACEH BARAT' -> 'Aceh Barat'; 'KOTA BANDA ACEH' -> 'Kota Banda Aceh' (dipakai bila tak ada padanan peta)."""
    s = re.sub(r"^\s*(KABUPATEN|KAB\.?)\s+", "", s.strip(), flags=re.I)
    return " ".join(w.capitalize() for w in s.split())


class Pencocok:
    """Nama kab BNPB + kode provinsi -> (kode_prov, nama 'kab' di peta). Cari di provinsi itu dulu, lalu di semua
    provinsi (kode BNPB lama untuk provinsi pemekaran Papua), lalu fuzzy >= 0,85 di provinsi itu."""

    def __init__(self, peta=None):
        if peta is None:
            peta = {k: [f["properties"]["kab"] for f in json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{k}.json")))["features"]]
                    for k in PROVINSI}
        self.prov = {k: {kunci_nama(n): n for n in v} for k, v in peta.items()}
        self.semua = {}
        for k, v in self.prov.items():
            for kn, n in v.items():
                self.semua.setdefault(kn, []).append((k, n))
        self.gagal = set()

    def cari(self, nama, kode_prov):
        kn = kunci_nama(nama)
        di = self.prov.get(kode_prov, {})
        if kn in di:
            return kode_prov, di[kn]
        if len(self.semua.get(kn, [])) == 1:
            return self.semua[kn][0]
        mirip = difflib.get_close_matches(kn, list(di), n=1, cutoff=0.85)
        if mirip:
            return kode_prov, di[mirip[0]]
        self.gagal.add(f"{kode_prov}|{nama}")
        return kode_prov, judul(nama)


def baris(rid):
    """Semua baris datastore satu sumber daya."""
    out, a = [], 0
    while True:
        r = ambil(f"{API}datastore_search?resource_id={rid}&limit=1000&offset={a}")["result"]
        out += r["records"]
        a += 1000
        if a >= r.get("total", 0):
            return out


def sumber_daya():
    """Cari sumber daya datastore lewat nama, bukan id tetap (BNPB kadang mengunggah ulang)."""
    paket = {"data-bencana-indonesia"}
    for q in ("kompilasi data kejadian dampak bencana", "jumlah kejadian bencana menurut provinsi"):
        for p in ambil(f"{API}package_search?q={urllib.parse.quote(q)}&rows=50")["result"]["results"]:
            if p["name"].startswith(("kompilasi", "data-bencana")):
                paket.add(p["name"])
    res = {}
    for nama in sorted(paket):
        for r in ambil(f"{API}package_show?id={nama}")["result"]["resources"]:
            if r.get("datastore_active"):
                res.setdefault(r["name"].strip(), r["id"])
        time.sleep(0.5)
    return res


def klasifikasi(nama):
    """Nama sumber daya -> (metrik, tingkat, tahun) | None. tahun=None berarti seri 2010-2024."""
    met = next((m for m, pola in METRIK if re.search(pola, nama, re.I)), None)
    tingkat = "prov" if re.search(r"Menurut Provinsi", nama, re.I) else "kab" if re.search(r"Menurut Kabupaten", nama, re.I) \
        else "nasional" if re.search(r"Akibat Bencana Tahun 2010|Menurut Jenis Bencana Tahun 2010", nama, re.I) else None
    if not met or not tingkat or re.search(r"per 100", nama, re.I):
        return None
    if re.search(r"2010-20\d\d", nama):
        return met, tingkat, None
    th = re.search(r"\b(20\d\d)\b", nama)
    return (met, tingkat, int(th.group(1))) if th else None


def superset(kolom, metrik, saring, batas=50000):
    """Satu kueri lewat konteks dasbor publik DIBI -> daftar baris."""
    badan = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
             "queries": [{"columns": kolom, "metrics": [{"expressionType": "SQL", "sqlExpression": e, "label": l} for l, e in metrik],
                          "filters": saring, "row_limit": batas, "orderby": []}],
             "result_format": "json", "result_type": "full"}
    r = ambil(DIBI, json.dumps(badan).encode(), kepala={"Content-Type": "application/json"}, batas_waktu=300)
    return r["result"][0]["data"]


def baris_dibi(r, cocok):
    """Satu baris kelompok DIBI -> (kode_prov, nama_kab, tanggal, nilai) atau None bila jenis bukan hidrometeorologi."""
    if not DIBI_JENIS.get(str(r["jenis_bencana"]).strip()):
        return None
    kode = str(angka(r.get("id_kab_bps")))[:2] if r.get("id_kab_bps") else \
        next((k for k, n in PROVINSI.items() if kunci_nama(n) == kunci_nama(str(r.get("provinsi")))), "")
    p, n = cocok.cari(str(r.get("kabupaten") or ""), kode)
    tgl = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date().isoformat() if r.get("dt") else f"{r['tahun']}-01-01"
    nilai = {"kejadian": angka(r["jumlah_kejadian"]), "meninggal": angka(r["meninggal"]), "terdampak": angka(r["menderita"]),
             "mengungsi": angka(r["mengungsi"]),
             "rumah_rusak": angka(r["rumah_rusak_berat"]) + angka(r["rumah_rusak_sedang"]) + angka(r["rumah_rusak_ringan"])}
    return p, n, tgl, nilai


def dibi(cocok):
    """-> [(kunci_jenis_list, prov, kab, tanggal, nilai)] semua kejadian hidrometeorologi DIBI."""
    nama = [r["jenis_bencana"] for r in superset(["jenis_bencana"], [("n", "COUNT(*)")], [], 1000)]
    pilih = [n for n in nama if str(n).strip() in DIBI_JENIS]
    data = []
    for j in pilih:  # satu jenis per kueri: total semua jenis ~50 rb baris = batas baris Superset
        bagian = superset(["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"],
                          [(k, f"SUM({k})") for k in DIBI_ANGKA], [{"col": "jenis_bencana", "op": "==", "val": j}])
        if len(bagian) >= 50000:
            raise RuntimeError(f"DIBI {j}: batas 50.000 baris tercapai, data terpotong")
        data += bagian
        time.sleep(1)
    out = []
    for r in data:
        b = baris_dibi(r, cocok)
        if b:
            out.append((DIBI_JENIS[str(r["jenis_bencana"]).strip()], *b))
    return out


def gabung_dibi(kejadian, prov, kab, tahun_ckan_prov, tahun_ckan_kab, jenis_ckan=("banjir", "longsor", "cuaca", "kering", "gelombang")):
    """Tambahkan agregat DIBI ke prov/kab, kecuali (tingkat, tahun, jenis) yang sudah diisi kompilasi CKAN. -> tahun DIBI."""
    tahun = set()
    for jenis, p, n, tgl, v in kejadian:
        y = tgl[:4]
        tahun.add(int(y))
        for j in jenis:
            if not (y in tahun_ckan_prov and j in jenis_ckan):
                tuju = prov.setdefault(p, {}).setdefault(j, {}).setdefault(y, {})
                for m, x in v.items():
                    tuju[m] = tuju.get(m, 0) + x
            if not (y in tahun_ckan_kab and j in jenis_ckan):
                tuju = kab.setdefault(f"{p}|{n}", {}).setdefault(j, {})
                tuju[y] = tuju.get(y, 0) + v["kejadian"]
    return tahun


def daftar_terbaru(kejadian, hari_ini, tahun=TAHUN_DAFTAR):
    batas = (hari_ini - dt.timedelta(days=365 * tahun)).isoformat()
    return sorted(({"tanggal": tgl, "jenis": "_".join(jenis), "prov": p, "kab": n, "meninggal": v["meninggal"],
                    "terdampak": v["terdampak"], "mengungsi": v["mengungsi"]}
                   for jenis, p, n, tgl, v in kejadian if tgl >= batas), key=lambda x: (x["tanggal"], x["prov"], x["kab"]), reverse=True)


def main():
    mulai = time.time()
    cocok = Pencocok()
    prov, kab, nasional, tahun, dipakai, cakupan = {}, {}, {}, set(), set(), {}
    seri_kab = {}  # seri 2010-2024 kab dijumlah terpisah lalu menimpa "semua": sumbernya beda dengan tabel per jenis
    for nama, rid in sorted(sumber_daya().items()):
        k = klasifikasi(nama)
        if not k or k in dipakai:
            continue
        met, tingkat, th = k
        if tingkat == "kab" and met != "kejadian":
            continue  # skema kab hanya jumlah kejadian
        try:
            rows = baris(rid)
        except Exception as e:
            print(f"  lewati {nama}: {e}", file=sys.stderr)
            continue
        dipakai.add(k)
        cakupan.setdefault(f"{tingkat}:{met}", []).append(th or "2010-2024")
        print(f"  {nama} ({len(rows)} baris)", file=sys.stderr)
        for r in rows:
            if tingkat == "nasional":  # baris = jenis, kolom = tahun
                j = JENIS.get(str(r.get("JENIS BENCANA", "")).strip().upper())
                if not j:
                    continue
                for c, v in r.items():
                    if re.fullmatch(r"20\d\d(\.0)?", c):
                        tahun.add(int(float(c)))
                        nasional.setdefault(j, {}).setdefault(str(int(float(c))), {})[met] = angka(v)
                continue
            kode_k = r.get("Kode Wilayah Provinsi") if tingkat == "prov" else r.get("Kode Wilayah Kabupaten / Kota")
            if kode_k in (None, ""):
                continue  # baris jumlah INDONESIA
            kode_k = str(angka(kode_k))
            if tingkat == "prov":
                kunci, wadah = kode_k, prov
            else:
                p, n = cocok.cari(str(r.get("Nama Kabupaten/Kota", "")), kode_k[:2])
                kunci, wadah = f"{p}|{n}", kab
            if th is None:  # seri 2010-2024, semua jenis
                for c, v in r.items():
                    if re.fullmatch(r"20\d\d(\.0)?", c):
                        y = str(int(float(c)))
                        tahun.add(int(y))
                        if tingkat == "prov":
                            wadah.setdefault(kunci, {}).setdefault("semua", {}).setdefault(y, {})[met] = angka(v)
                        else:
                            tuju = seri_kab.setdefault(kunci, {})
                            tuju[y] = tuju.get(y, 0) + angka(v)
                continue
            tahun.add(th)
            y, total = str(th), 0
            for c, v in r.items():
                total += angka(v) if c.upper() in JENIS or c.upper() in ("ERUPSI GUNUNG API", "GEMPABUMI", "KEBAKARAN HUTAN DAN LAHAN", "TSUNAMI") else 0
                j = JENIS.get(c.strip().upper())
                if not j:
                    continue
                tuju = wadah.setdefault(kunci, {}).setdefault(j, {})
                if tingkat == "prov":
                    tuju.setdefault(y, {})[met] = angka(v)
                else:
                    tuju[y] = tuju.get(y, 0) + angka(v)
            semua = wadah.setdefault(kunci, {}).setdefault("semua", {})
            if tingkat == "prov":
                semua.setdefault(y, {}).setdefault(met, total)
            else:
                semua.setdefault(y, total)
        time.sleep(0.5)
    for kunci, v in seri_kab.items():
        kab.setdefault(kunci, {}).setdefault("semua", {}).update(v)

    terbaru, sumber_dibi = [], ""
    try:
        kej = dibi(cocok)
        th_dibi = gabung_dibi(kej, prov, kab, {str(y) for y in cakupan.get("prov:kejadian", []) if isinstance(y, int)},
                              {str(y) for y in cakupan.get("kab:kejadian", []) if isinstance(y, int)})
        tahun |= th_dibi
        terbaru = daftar_terbaru(kej, dt.datetime.now(WIB).date())
        cakupan["dibi:prov+kab per jenis"] = [f"{min(th_dibi)}-{max(th_dibi)}"]
        sumber_dibi = "; DIBI BNPB (dibi.bnpb.go.id, dasbor publik Superset)"
        print(f"  DIBI: {len(kej)} kejadian, {min(th_dibi)}-{max(th_dibi)}, {len(terbaru)} dalam {TAHUN_DAFTAR} tahun terakhir", file=sys.stderr)
    except Exception as e:
        print(f"  DIBI dilewati: {e}", file=sys.stderr)
    simpan(os.path.join(KELUAR, "kejadian.json"), {
        "sumber": "BNPB, data.bnpb.go.id (Kompilasi Data Kejadian dan Dampak Bencana; Data Bencana Indonesia 2010-2024)" + sumber_dibi,
        "tahun": sorted(tahun),
        "cakupan": {k: sorted(map(str, v)) for k, v in cakupan.items()},
        "catatan": "Per jenis: tahun kompilasi CKAN (prov 2024-2025, kab 2024) dari CKAN; tahun lain dari DIBI (2008-, dicatat per "
                   "kabupaten, bisa menghitung satu kejadian lintas kabupaten lebih dari sekali; DIBI 2024 tidak lengkap). "
                   "bandang dan rob hanya dari DIBI (2018-) dan mungkin juga sudah termasuk di 'banjir' CKAN. "
                   "'semua' = seluruh jenis bencana (CKAN), termasuk gempa, erupsi, karhutla.",
        "nasional": nasional, "prov": prov, "kab": kab, "kejadian_dibi": terbaru,
        "kab_tak_cocok": sorted(cocok.gagal)})
    print(f"kejadian.json: {len(prov)} provinsi, {len(kab)} kab, tahun {min(tahun)}-{max(tahun)}, "
          f"{len(cocok.gagal)} nama kab tak cocok, {time.time() - mulai:.0f} dtk", file=sys.stderr)
    for k, v in sorted(cakupan.items()):
        print(f"  {k}: {sorted(map(str, v))}", file=sys.stderr)


def uji():
    assert kunci_nama("KABUPATEN ACEH BARAT") == kunci_nama("Aceh Barat") == "ACEHBARAT"
    assert kunci_nama("KOTA SUKABUMI") != kunci_nama("SUKABUMI")
    assert kunci_nama("Kota Administrasi Jakarta Barat") == kunci_nama("KOTA ADM. JAKARTA BARAT") == "KOTA JAKARTABARAT"
    assert kunci_nama("ADM. KEP. SERIBU") == kunci_nama("Administrasi Kepulauan Seribu")
    assert kunci_nama("TOLI-TOLI") == kunci_nama("Tolitoli")
    assert kunci_nama("PANGKAJENE DAN KEPULAUAN") == kunci_nama("Pangkajene Kepulauan")
    assert judul("KABUPATEN ACEH BARAT") == "Aceh Barat" and judul("KOTA BANDA ACEH") == "Kota Banda Aceh"
    c = Pencocok({"32": ["Sukabumi", "Kota Sukabumi"], "94": ["Mimika"], "91": ["Jayapura"]})
    assert c.cari("KOTA SUKABUMI", "32") == ("32", "Kota Sukabumi")
    assert c.cari("SUKABUMI", "32") == ("32", "Sukabumi")
    assert c.cari("MIMIKA", "91") == ("94", "Mimika")  # kode lama Papua -> provinsi pemekaran
    assert c.cari("SUKABUMY", "32") == ("32", "Sukabumi")  # fuzzy
    assert c.cari("ANTAH BERANTAH", "32") == ("32", "Antah Berantah") and c.gagal == {"32|ANTAH BERANTAH"}
    assert klasifikasi("Jumlah Kejadian Bencana Menurut Provinsi 2025.xlsx") == ("kejadian", "prov", 2025)
    assert klasifikasi("Jumlah Kejadian Bencana Menurut Kabupaten Tahun 2010-2024") == ("kejadian", "kab", None)
    assert klasifikasi("Jumlah Korban Terdampak Akibat Bencana Tahun 2010-2024") == ("terdampak", "nasional", None)
    assert klasifikasi("Jumlah Korban Mengungsi per 100.000 Orang Akibat Bencana Menurut Provinsi 2025.xlsx") is None
    assert klasifikasi("Jumlah Kantor yang Rusak Akibat Bencana Menurut Provinsi 2024.xlsx") is None
    assert angka("0.0") == 0 and angka(None) == 0 and angka(12) == 12
    c = Pencocok({"33": ["Demak", "Kota Tegal"], "94": ["Mimika"]})
    r = {"dt": 1755950400520.0, "tahun": 2025, "provinsi": "Jawa Tengah", "kabupaten": "Kota Tegal", "id_kab_bps": 3376,
         "jenis_bencana": "Banjir Rob ", "jumlah_kejadian": 2.0, "meninggal": 1, "menderita": 10, "mengungsi": 3,
         "rumah_rusak_berat": 1, "rumah_rusak_sedang": 2, "rumah_rusak_ringan": 3}
    assert baris_dibi(r, c) == ("33", "Kota Tegal", "2025-08-23", {"kejadian": 2, "meninggal": 1, "terdampak": 10, "mengungsi": 3, "rumah_rusak": 6})
    assert baris_dibi({**r, "jenis_bencana": "Gempabumi"}, c) is None
    assert baris_dibi({**r, "id_kab_bps": 9109, "kabupaten": "Mimika"}, c)[:2] == ("94", "Mimika")  # kode BPS lama Papua
    v = {"kejadian": 1, "meninggal": 0, "terdampak": 5, "mengungsi": 0, "rumah_rusak": 0}
    kej = [(["banjir", "longsor"], "33", "Demak", "2023-02-01", v), (["banjir"], "33", "Demak", "2024-02-01", v),
           (["rob"], "33", "Demak", "2024-03-01", v)]
    prov = {"33": {"banjir": {"2024": {"kejadian": 99}}}}
    kab = {}
    assert gabung_dibi(kej, prov, kab, {"2024"}, {"2024"}) == {2023, 2024}
    assert prov["33"]["banjir"]["2024"] == {"kejadian": 99}           # CKAN tidak ditimpa
    assert prov["33"]["banjir"]["2023"]["terdampak"] == 5 and prov["33"]["longsor"]["2023"]["kejadian"] == 1
    assert kab["33|Demak"]["rob"] == {"2024": 1} and "2024" not in kab["33|Demak"]["banjir"]
    t = daftar_terbaru(kej, dt.date(2026, 10, 13))
    assert [x["tanggal"] for x in t] == ["2024-03-01", "2024-02-01"] and t[0]["jenis"] == "rob"
    print("ok kejadian")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
