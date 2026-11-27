"""RRP-2 Panen angka pemulihan dari berita (DESAIN-TEKNIS sec 6.22; tiket RU-104).

Langkah jalan.py (harian). Masukan: arsip berita repo (data/raw/dalops/berita_arsip/*.json dan data/raw/berita/arsip.json; kunci `artikel`,
bukan berkas git, di Actions lewat cache) dan leksikon scripts/berita/pemulihan.py (usulan(artikel), semua medan berstatus hipotesis sampai
fixture 30 artikel memuat >= 5 kejadian positif per medan). Keluaran unit/usulan_pemulihan.json: satu berkas dua kegunaan,
`kartu` (tab RRP-2) dan `baris` (format usulan MB-7 yang dibaca public/bnpb/unit/ketuk.js, id = sha1(jenis, url, kunci)[:16]).

Aturan:
  - tiap usulan berlabel `sekunder` dengan URL dan tanggal berita; kutipan, dasar angka (per_penerima, total, tak_jelas, jumlah) dan status ekstraksi dibawa;
  - angka rupiah beda dasar tidak pernah dijumlah; kartu hanya menghitung baris;
  - artikel tanpa tepat satu kab/kota (kunci "prov|nama" di arsip yang cocok dengan wilayah.json) tidak dijadikan usulan, hanya dihitung;
  - usulan satu (kab, medan, angka) dari beberapa media = satu baris, berita terbaru;
  - isi.terima = badan POST /api/pusdalops/pemulihan/terima (src/pemulihan.js) hanya untuk huntara dan huntap (tracker memegang jumlah unit,
    bukan rupiah); medan rupiah tidak diteruskan ke tracker, staf hanya menandai.
  - tanpa arsip sama sekali: angka kartu belum ada data (None), bukan 0.

  python3 -I scripts/bnpb/unit/rrp2.py --cek
"""
import glob
import importlib.util
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import terima  # noqa: E402

AKAR = rapor.AKAR
LEKSIKON = os.path.join(AKAR, "scripts", "berita", "pemulihan.py")
WILAYAH = os.path.join(AKAR, "public", "data", "bnpb", "wilayah.json")
SUMBER_WORKER = os.path.join(AKAR, "src", "pemulihan.js")
FIXTURE = os.path.join(AKAR, "tests", "bnpb", "fixtures", "pemulihan_30.json")
JENDELA_HARI = 120    # asumsi: berita lebih tua dari ini tidak diusulkan
MAKS_BARIS = 300
MAKS_URL = 500        # batas rute terima
MAKS_UNIT = 10 ** 7   # MAKS_ANGKA src/pemulihan.js
RELEVAN = re.compile(r"huntara|huntap|hunian\s+(?:sementara|tetap)|dana\s+tunggu|\bDTH\b|stimulan", re.I)   # saringan murah sebelum leksikon
MEDAN = {"huntara_unit": ("huntara", "Hunian sementara"), "huntap_unit": ("huntap", "Hunian tetap"),
         "dth_nilai": (None, "Dana tunggu hunian"), "stimulan_rp": (None, "Stimulan rumah")}
DASAR = {"jumlah": "jumlah unit", "per_penerima": "per penerima", "total": "total", "tak_jelas": "dasar tidak jelas"}
JUDUL_BERKAS = "usulan_pemulihan"
_L = []
BULAN = ("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des")
# gelar atau jabatan yang diikuti nama berhuruf kapital: nama orang berita tidak disimpan (KEAMANAN-PRIVASI)
_NAMA = re.compile(r"\b(?:Bupati|Wali\s?[Kk]ota|Gubernur|Bapak|Ibu|Pak|Bu|Kepala(?:\s+\w+)?|Camat|Kades|Kepala\s+Desa)\s+(?:[A-Z][\w'.-]*)(?:\s+[A-Z][\w'.-]*)*(?:,\s*(?:S|M|H|Dr|Ir)\.?[\w.,]*)*")


def tgl_id(iso):
    return f"{int(iso[8:10])} {BULAN[int(iso[5:7]) - 1]} {iso[:4]}"


def samarkan(k):
    """Potong nama orang sesudah gelar atau jabatan; kutipan tetap memuat angka dan kata kunci."""
    return re.sub(r"\s+", " ", _NAMA.sub(lambda m: m.group(0).split()[0] + " [nama dihapus]", k)).strip()


def leksikon():
    if not _L:
        s = importlib.util.spec_from_file_location("pemulihan_rrp2", LEKSIKON)
        m = importlib.util.module_from_spec(s)
        s.loader.exec_module(m)
        _L.append(m)
    return _L[0]


def arsip_berkas():
    return sorted(glob.glob(os.path.join(AKAR, "data", "raw", "dalops", "berita_arsip", "*.json"))) + [os.path.join(AKAR, "data", "raw", "berita", "arsip.json")]


def baca_arsip(berkas):
    """-> (artikel unik per url yang relevan, jumlah artikel dipindai, jumlah berkas terbaca). Berkas hilang atau rusak dilewati."""
    lihat, out, n, ada = set(), [], 0, 0
    for p in berkas:
        try:
            with open(p, encoding="utf-8") as f:
                d = json.load(f)
        except (OSError, ValueError):
            continue
        if not isinstance(d, dict) or not isinstance(d.get("artikel"), list):
            continue
        ada += 1
        for a in d["artikel"]:
            if not isinstance(a, dict):
                continue
            n += 1
            u = a.get("url_asli") or a.get("url")
            if not u or u in lihat or not RELEVAN.search(f"{a.get('judul', '')} {a.get('ringkas', '')}"):
                continue
            lihat.add(u)
            out.append(a)
    return out, n, ada


def peta_kab(wilayah):
    return {(w["prov"], w["nama"]): w["kode"] for w in wilayah["kab"]}


def _kab_tunggal(a, kab_ada):
    """Kunci "prov|nama" bila artikel menyebut tepat satu kab/kota yang dikenal wilayah.json; selain itu None."""
    ks = a.get("kab")
    if not isinstance(ks, list) or len(ks) != 1 or not isinstance(ks[0], str) or ks[0].count("|") != 1:
        return None
    p, n = ks[0].split("|")
    return ks[0] if (p, n) in kab_ada else None


def susun(artikel, kab_ada, hari):
    """-> (baris usulan MB-7, statistik). Satu (kab, medan, angka) = satu baris, berita terbaru."""
    L = leksikon()
    batas = (hari - timedelta(days=JENDELA_HARI)).isoformat()
    terpilih, tanpa_kab, lama, panjang = {}, 0, 0, 0
    for a in artikel:
        url = a.get("url_asli") or a.get("url")
        tgl = str(a.get("tgl") or "")[:10]
        if len(str(url or "")) > MAKS_URL or not re.match(r"^https?://", str(url or "")):
            panjang += 1
            continue
        us = L.usulan({"judul": a.get("judul", ""), "ringkas": a.get("ringkas", ""), "url": url, "tgl": tgl})
        if not us:
            continue
        if tgl < batas:
            lama += 1
            continue
        kab = _kab_tunggal(a, kab_ada)
        if kab is None:
            tanpa_kab += 1
            continue
        for u in us:
            kunci = f"{kab}|{u['medan']}|{u['nilai']}"
            if kunci not in terpilih or (tgl, url) > (terpilih[kunci][1]["tgl"], terpilih[kunci][1]["url"]):
                terpilih[kunci] = (kab, {**u, "url": url, "tgl": tgl})
    baris = []
    for kunci, (kab, u) in terpilih.items():
        jenis, nama = MEDAN[u["medan"]]
        isi = {"kab": kab.split("|")[1], "medan": nama, "nilai": u["nilai"], "satuan": "unit" if jenis else "rupiah", "basis": DASAR.get(u["basis"], u["basis"]), "tgl": u["tgl"], "tgl_tampil": tgl_id(u["tgl"]),
               "kutipan": samarkan(u["kutipan"])[:200], "status_angka": u["status"], "url": u["url"]}
        if jenis and u["nilai"] <= MAKS_UNIT:
            isi["terima"] = {"kab": kab, "jenis": jenis, "target": u["nilai"], "satuan": "unit", "status": "rencana"}
        baris.append({"kunci": kunci, "url": u["url"], "label": "sekunder", "keyakinan": "pola_longgar", "sumber_nama": f"Berita {u['tgl']}: {nama}, {isi['kab']}", "isi": isi,
                      "_urut": (u["tgl"], kab, u["medan"])})
    baris.sort(key=lambda b: b["_urut"], reverse=True)
    baris = baris[:MAKS_BARIS]
    for b in baris:
        del b["_urut"]
    return baris, {"tanpa_kab": tanpa_kab, "terlalu_lama": lama, "url_tak_sah": panjang}


def bangun(artikel, dipindai, berkas_terbaca, kab_ada, hari, dibuat):
    baris, st = susun(artikel, kab_ada, hari)
    us = terima.usulan(JUDUL_BERKAS, baris, "berita")
    tab = []
    for b in baris:
        i = b["isi"]
        satuan_unit = "terima" in i
        tab.append({"kab": i["kab"], "jenis": i["medan"], "unit": i["nilai"] if satuan_unit else None, "rupiah": None if satuan_unit else i["nilai"],
                    "dasar": i["basis"], "tgl": i["tgl_tampil"], "status": i["status_angka"]})
    ada = berkas_terbaca > 0
    kartu = rapor.kartu(
        id="rrp2-pemulihan", sistem="RRP-2", pil="Angka pemulihan", ikon="rumah", judul="Angka pemulihan dari berita",
        angka=[{"k": "usulan", "label": "Usulan dari berita", "nilai": len(baris) if ada else None, "title": "satu baris per kab/kota, jenis, dan angka; belum diputuskan staf kecuali tercatat di antrean"},
               {"k": "kab", "label": "Kab/kota disebut", "nilai": len({b["isi"]["kab"] for b in baris}) if ada else None},
               {"k": "tanpa_kab", "label": "Berita tanpa satu kab/kota pasti", "nilai": st["tanpa_kab"] if ada else None, "title": "tidak dijadikan usulan"}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "jenis", "label": "Jenis"},
               {"k": "unit", "label": "Unit disebut", "angka": True, "title": "jumlah unit hunian yang disebut berita; belum tentu sudah terbangun"},
               {"k": "rupiah", "label": "Rupiah disebut (Rp)", "angka": True, "title": "nilai rupiah menurut berita; dasar berbeda (per penerima, total) tidak dijumlahkan"},
               {"k": "dasar", "label": "Dasar angka"}, {"k": "tgl", "label": "Tanggal berita"}, {"k": "status", "label": "Status ekstraksi"}],
        baris=tab,
        rumus="angka diambil dari judul dan cuplikan berita oleh pola kata tetap (scripts/berita/pemulihan.py); satu angka per kab/kota, jenis, dan nilai; staf memutuskan di antrean",
        sumber=["arsip_berita", "leksikon_pemulihan"], label=["sekunder"],
        asumsi=["Asumsi: angka berita, hipotesis", f"Asumsi: berita {JENDELA_HARI} hari terakhir"],
        unduh="usulan_pemulihan.csv")
    src = [{"nama": "Arsip berita repo (judul dan cuplikan; hak cipta media asal, hanya tautan)", "url": "https://news.google.com/", "diambil": hari.isoformat(), "lisensi": "sekunder, bukan data resmi"},
           {"nama": "Leksikon berita pemulihan", "url": "repo:scripts/berita/pemulihan.py", "diambil": hari.isoformat(), "lisensi": "kode repo"}]
    b = rapor.berkas([kartu], src)
    b["berkas"] = JUDUL_BERKAS
    b["baris"] = us["baris"]
    b["data"] = {"hari": hari.isoformat(), "dibuat": dibuat, "dipindai": dipindai if ada else None, "berkas_arsip": berkas_terbaca, **st,
                 "koreksi": "keputusan staf ada di unit_ketuk; baris diterima meneruskan huntara dan huntap ke tracker lewat POST /api/pusdalops/pemulihan/terima"}
    return b


def jalan(sekarang=None):
    sek = sekarang or datetime.now(timezone.utc)
    hari = (sek + timedelta(hours=7)).date()
    with open(WILAYAH, encoding="utf-8") as f:
        kab_ada = peta_kab(json.load(f))
    artikel, n, ada = baca_arsip(arsip_berkas())
    return {JUDUL_BERKAS: bangun(artikel, n, ada, kab_ada, hari, sek.strftime("%Y-%m-%dT%H:%M:%SZ"))}


def cek():
    from datetime import date
    hari = date(2026, 11, 26)
    kab = {("11", "Aceh Utara"), ("11", "Aceh Tamiang"), ("94", "Nabire")}

    def art(judul, url, tgl, kabs=("11|Aceh Utara",)):
        return {"judul": judul, "ringkas": "", "url": url, "tgl": tgl, "kab": list(kabs)}
    A = [art("Pemerintah Bangun 120 unit huntap untuk penyintas", "https://a.id/1", "2026-11-20T10:00+07:00"),
         art("Sebanyak 120 unit huntap disiapkan Pemkab", "https://b.id/2", "2026-11-24T10:00+07:00"),              # sama (kab, medan, angka): berita terbaru menang
         art("BNPB siapkan 40 unit huntara di Aceh Tamiang", "https://a.id/3", "2026-11-22T08:00+07:00", ("11|Aceh Tamiang",)),
         art("Dana tunggu hunian Rp 600.000 per KK disalurkan", "https://a.id/4", "2026-11-23T08:00+07:00"),
         art("Bangun 50 unit huntap", "https://a.id/5", "2026-11-23T08:00+07:00", ("11|Aceh Utara", "11|Aceh Tamiang")),   # dua kab: tidak ditebak
         art("Bangun 60 unit huntap", "https://a.id/6", "2026-11-23T08:00+07:00", ()),                              # tanpa kab
         art("Bangun 70 unit huntap", "https://a.id/7", "2026-11-23T08:00+07:00", ("99|Tidak Ada",)),               # kab di luar wilayah.json
         art("Bangun 80 unit huntap", "https://a.id/8", "2026-05-01T08:00+07:00"),                                  # lewat jendela
         art("Bangun 90 unit huntap", "https://a.id/" + "x" * 500, "2026-11-23T08:00+07:00"),                        # url melebihi batas rute
         art("Cuaca cerah hari ini", "https://a.id/9", "2026-11-23T08:00+07:00")]                                   # tidak relevan
    baris, st = susun([a for a in A if RELEVAN.search(a["judul"])], kab, hari)
    kunci = sorted(b["kunci"] for b in baris)
    assert kunci == ["11|Aceh Tamiang|huntara_unit|40", "11|Aceh Utara|dth_nilai|600000", "11|Aceh Utara|huntap_unit|120"], kunci
    h = {b["kunci"]: b for b in baris}
    assert h["11|Aceh Utara|huntap_unit|120"]["url"] == "https://b.id/2", "duplikat harus memilih berita terbaru"
    assert st == {"tanpa_kab": 3, "terlalu_lama": 1, "url_tak_sah": 1}, st
    for b in baris:
        assert b["label"] == "sekunder" and b["url"].startswith("https://") and re.match(r"^\d{4}-\d{2}-\d{2}$", b["isi"]["tgl"]), b
        assert b["isi"]["status_angka"] == "hipotesis" and b["isi"]["kutipan"], b   # TERUJI kosong: semua medan hipotesis
    tm = h["11|Aceh Utara|huntap_unit|120"]["isi"]["terima"]
    assert tm == {"kab": "11|Aceh Utara", "jenis": "huntap", "target": 120, "satuan": "unit", "status": "rencana"}, tm
    assert "terima" not in h["11|Aceh Utara|dth_nilai|600000"]["isi"], "rupiah tidak diteruskan ke tracker"
    assert h["11|Aceh Utara|dth_nilai|600000"]["isi"]["basis"] == "per penerima"
    # kontrak rute terima: jenis sah menurut src/pemulihan.js, kab berbentuk prov|nama, usulan_id 16 heks
    js = open(SUMBER_WORKER, encoding="utf-8").read()
    jenis_sah = set(re.findall(r'"(\w+)"', re.search(r"JENIS_PEMULIHAN = \[([^\]]*)\]", js).group(1)))
    us = terima.usulan(JUDUL_BERKAS, baris, "berita")["baris"]
    assert len({u["id"] for u in us}) == len(us) and all(re.fullmatch(r"[0-9a-f]{16}", u["id"]) for u in us)
    for u in us:
        t = u["isi"].get("terima")
        assert u["label"] == "sekunder" and u["sumber"]["url"] and u["isi"]["url"] == u["sumber"]["url"]
        if t:
            assert t["jenis"] in jenis_sah and re.fullmatch(r"\d{2}\|[^|]{2,60}", t["kab"]) and 0 < t["target"] <= MAKS_UNIT, t
    # tanpa arsip: belum ada data, bukan nol
    kosong = bangun([], 0, 0, kab, hari, "2026-11-26T00:00:00Z")
    assert [a["nilai"] for a in kosong["kartu"][0]["angka"]] == [None, None, None] and kosong["baris"] == [], kosong["kartu"][0]["angka"]
    # arsip ada tetapi tidak ada yang cocok: nol sungguhan
    nol = bangun([], 50, 1, kab, hari, "2026-11-26T00:00:00Z")
    assert nol["kartu"][0]["angka"][0]["nilai"] == 0
    # skema berkas dan larangan teks
    b = bangun([a for a in A if RELEVAN.search(a["judul"])], len(A), 1, kab, hari, "2026-11-26T00:00:00Z")
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    assert len(b["kartu"][0]["baris"]) == 3 and [x["isi"]["tgl"] for x in b["baris"]] == sorted((x["isi"]["tgl"] for x in b["baris"]), reverse=True), "urut berita terbaru dulu"
    assert b["kartu"][0]["baris"][0]["tgl"] == tgl_id(b["baris"][0]["isi"]["tgl"]) and not re.search(r"\d{4}-\d{2}", json.dumps(b["kartu"], ensure_ascii=False)), "tanggal tampil bukan ISO"
    assert tgl_id("2026-11-04") == "4 Nov 2026" and {x["isi"]["satuan"] for x in b["baris"]} == {"unit", "rupiah"}
    k = samarkan("Bupati Aceh Utara Ismail A Jalil menyerahkan 120 unit huntap, kata Camat Budi Santoso dan Pak Haji")
    assert "Ismail" not in k and "Budi" not in k and "120 unit huntap" in k and "Bupati [nama dihapus]" in k, k
    s = json.dumps(b["kartu"], ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    # penerima MB-7 menolak label di luar daftar
    try:
        terima.usulan(JUDUL_BERKAS, [{**baris[0], "label": "tebakan"}], "berita")
    except ValueError:
        pass
    else:
        raise AssertionError("label tak sah lolos")
    # fixture 30 artikel berlabel tangan: tiap baris yang keluar membawa kutipan teks sumber; angka tahun dan nomor telepon tak pernah jadi usulan
    fx = json.load(open(FIXTURE, encoding="utf-8"))["artikel"]
    semua = [{**a, "kab": ["11|Aceh Utara"], "tgl": "2026-11-20"} for a in fx if a.get("url")]
    bf, _ = susun(semua, kab, hari)
    assert all(x["isi"]["kutipan"] and x["isi"]["status_angka"] == "hipotesis" for x in bf)
    # data nyata: jalan() lolos skema
    nyata = jalan()[JUDUL_BERKAS]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **nyata})
    assert all(u["label"] == "sekunder" and u["sumber"]["url"] for u in nyata["baris"])
    return f"RRP-2 ok ({len(nyata['baris'])} usulan dari {nyata['data']['dipindai']} artikel arsip)"


if __name__ == "__main__":
    if "--cek" in sys.argv:
        print(cek())
    else:
        print(json.dumps(jalan()[JUDUL_BERKAS]["data"], ensure_ascii=False, indent=1))
