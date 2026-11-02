"""Saran status keadaan darurat per kabupaten -> public/data/saran_status.json

SARAN untuk dibahas di rapat koordinasi, BUKAN penetapan: yang menetapkan Bupati/Walikota, Gubernur, atau Presiden setelah kaji cepat
dan rakor (Pedoman Penetapan Status Keadaan Darurat Bencana BNPB 2016; ringkasan di data/kajian-bnpb/pustaka/6-pedoman-status-darurat.md).
Pedoman tidak punya ambang angka; ambang di sini = ambang tingkat tiap modul yang sudah ada, dipetakan ke tiga status:
  Siaga Darurat  = ancaman terpantau peringatan dini, belum terbukti mengganggu kehidupan/penghidupan (hal. 7)
  Tanggap Darurat = ancaman terjadi dan ada fakta gangguan (hal. 8)
Gempa dan tsunami TIDAK PERNAH diberi saran Siaga (mendadak, tak bisa diamati peringatan dini; hal. 7): jenis itu tak dikeluarkan sama sekali.

Sinyal (hanya JSON hasil pipeline di repo, tanpa jaringan; tiap entri memuat tanggal_sinyal, umur_hari, basi, berkas; alasan untuk publik: tanpa nama berkas dan tanpa tanggal ISO):
  karhutla    public/data/kluster.json (level kompleks, scripts/data/aturan.py STATUS) + meta.json data_terakhir
  banjir      public/banjir/data/kejadian_aktif_awal.json (level_tertinggi, ambang_level)
  longsor     public/banjir/data/status.json (l = level longsor kecamatan, hari pertama; scripts/banjir/status.py)
  kekeringan  public/data/kekeringan_wilayah.json (lv kabupaten; scripts/kekeringan/status.py; AMBANG HIPOTESIS, gagal uji balik)
  gunungapi   public/banjir/data/kejadian_gunungapi_awal.json (level PVMBG)
  cuaca       DILEWATI: peringatan CAP BMKG hanya membawa provinsi/poligon, tak ada tingkat per kabupaten.
Kenaikan ke Tanggap (termasuk karhutla; level kompleks 2 dan 3 sama-sama Siaga) hanya bila DIBI (dibi_kejadian.json) mencatat kejadian sejenis di kab itu dalam DIBI_HARI hari
terakhir cakupannya dengan dampak (korban, pengungsi, rumah rusak/terendam, fasilitas rusak): itu "fakta lapangan" pedoman.
Kunci kab = kode IRBI 4 digit (sama dengan public/data/bnpb/ikd.json), lewat crosswalk public/data/kemitraan/kode.json.

Pakai:  python3 scripts/umum/saran_status.py   |   python3 scripts/umum/saran_status.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
from nama_wilayah import nk  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/saran_status.json")
WIB = dt.timezone(dt.timedelta(hours=7))
SIAGA, TANGGAP = "Siaga Darurat", "Tanggap Darurat"
URUT = ["karhutla", "banjir", "kekeringan", "cuaca", "gunungapi", "longsor"]
DIBI_HARI = 7  # jendela "kejadian baru" pada cakupan DIBI; bukan ambang bahaya
DAMPAK = ("meninggal", "hilang", "luka", "terdampak", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan", "terendam", "f_pendidikan", "f_kantor", "jembatan", "f_umum")
ATURAN = {
    "karhutla": "Kompleks api yang aktif 24 jam terakhir berstatus 'Siaga pemadaman awal' atau 'Prioritas pemadaman' -> Siaga Darurat; naik ke Tanggap Darurat hanya bila DIBI mencatat kebakaran hutan dan lahan "
                "berdampak di kabupaten itu dalam 7 hari terakhir. Ambang karhutla belum diuji balik pada konfigurasi produksi (15 piksel, 3 satelit). OMC ditandai bila Siaga tanpa SK berlaku "
                "dan data SK mencakup tanggal sinyal (Dana Siap Pakai butuh status siaga darurat).",
    "banjir": "Kejadian banjir aktif bertingkat Siaga atau Awas -> Siaga Darurat; naik ke Tanggap Darurat bila DIBI mencatat banjir berdampak di kabupaten itu dalam 7 hari terakhir.",
    "longsor": "Status longsor kecamatan Siaga atau Awas -> Siaga Darurat; naik ke Tanggap Darurat bila DIBI mencatat longsor atau gerakan tanah berdampak dalam 7 hari terakhir.",
    "kekeringan": "AMBANG HIPOTESIS (gagal uji balik): tingkat kabupaten Siaga atau Awas (>= 30% penduduk) -> Siaga Darurat; naik ke Tanggap Darurat bila DIBI mencatat kekeringan berdampak dalam 7 hari terakhir. "
                  "OMC tidak ditandai untuk kekeringan.",
    "gunungapi": "Level PVMBG III (Siaga) -> Siaga Darurat; level IV (Awas) -> Tanggap Darurat.",
    "cuaca": "Tidak dikeluarkan: peringatan cuaca ekstrem BMKG tak membawa tingkat per kabupaten.",
}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def peta_kode(kode):
    """kode.json -> (kunci_nama 'PP|Nama' | (prov, nk) -> IRBI, kemendagri 'PP.KK' -> IRBI). Cadangan nk hanya bila unik."""
    nama, nk_idx, kem = {}, {}, {}
    for k, v in kode.items():
        if v.get("kunci_nama"):
            nama[v["kunci_nama"]] = k
        if v.get("kemendagri"):
            kem[v["kemendagri"]] = k
        a = (k[:2], str(v.get("nama", "")).lower().lstrip().startswith("kota"), nk(v.get("nama"))[1])
        nk_idx[a] = None if a in nk_idx else k
    return nama, nk_idx, kem


def cari_kab(prov, kab, nama, nk_idx):
    k = nama.get(f"{prov}|{kab}")
    return k or nk_idx.get((prov, str(kab).lower().lstrip().startswith("kota"), nk(kab)[1]))


def tgl(s):
    return str(s or "")[:10]


def dampak_dibi(dibi, kelas, kem_ke_irbi):
    """{IRBI: (tanggal terakhir, n kejadian)} untuk kejadian DIBI kelas ini berdampak dalam DIBI_HARI hari terakhir cakupan."""
    sd = _muat("umum_status_darurat", "scripts/umum/status_darurat.py")
    if not dibi:
        return {}
    batas = (dt.date.fromisoformat(dibi["sampai"]) - dt.timedelta(days=DIBI_HARI)).isoformat()
    out = {}
    for k in dibi["kejadian"]:
        if k["tanggal"] >= batas and kelas in sd.kelas_jenis(k["jenis"]) and any(k.get(c) for c in DAMPAK) and k["kab_kode"] in kem_ke_irbi:
            i = kem_ke_irbi[k["kab_kode"]]
            t, n = out.get(i, ("", 0))
            out[i] = (max(t, k["tanggal"]), n + 1)
    return out


def sinyal_karhutla(kluster, meta, nama, nk_idx):
    """-> {IRBI: (level, n, luas ha, px24)} tertinggi dari kompleks yang masih aktif <= 24 jam sebelum data_terakhir."""
    akhir = dt.datetime.fromisoformat(meta["data_terakhir"].replace("Z", "+00:00"))
    batas = (akhir - dt.timedelta(hours=24)).isoformat()
    out, tak = {}, 0
    for f in kluster["features"]:
        p = f["properties"]
        if p.get("level", 0) < 2 or (p.get("akhir") or "") < batas[:19]:
            continue
        i = cari_kab(p.get("prov"), p.get("kab"), nama, nk_idx)
        if not i:
            tak += 1
            continue
        lv, n, luas, px = out.get(i, (0, 0, 0.0, 0))
        out[i] = (max(lv, p["level"]), n + 1, luas + (p.get("luas") or 0), px + (p.get("px24") or 0))
    return out, tak


def sinyal_banjir(aktif, nama, nk_idx):
    """-> {IRBI: (level tertinggi, n_kec)}; level >= ambang_level kejadian."""
    amb, out, tak = aktif.get("ambang_level", 2), {}, 0
    for e in aktif["kejadian"]:
        if e["level_tertinggi"] < amb:
            continue
        for kk in e["kec"]:
            prov, kab, _ = kk.split("|")
            i = cari_kab(prov, kab, nama, nk_idx)
            if not i:
                tak += 1
                continue
            lv, n = out.get(i, (0, 0))
            out[i] = (max(lv, e["level_tertinggi"]), n + 1)
    return out, tak


def sinyal_longsor(status, nama, nk_idx):
    out, tak = {}, 0
    for kk, v in status["kec"].items():
        if v["l"][0] < 2:
            continue
        prov, kab, _ = kk.split("|")
        i = cari_kab(prov, kab, nama, nk_idx)
        if not i:
            tak += 1
            continue
        lv, n = out.get(i, (0, 0))
        out[i] = (max(lv, v["l"][0]), n + 1)
    return out, tak


def sinyal_kekeringan(wil, nama, nk_idx):
    out, tak = {}, 0
    for kk, v in wil["kab"].items():
        if (v.get("lv") or 0) < 2:
            continue
        prov, kab = kk.split("|", 1)
        i = cari_kab(prov, kab, nama, nk_idx)
        if not i:
            tak += 1
            continue
        out[i] = v
    return out, tak


def sinyal_gunungapi(kej, nama, nk_idx):
    """-> {IRBI: [(nama gunung, level)]} untuk kejadian aktif berlevel >= III."""
    out, tak = {}, 0
    for e in kej["kejadian"]:
        lv = (e.get("besaran") or {}).get("nilai") or 0
        if not e.get("aktif") or lv < 3:
            continue
        for kk in e.get("kab") or []:
            prov, kab = kk.split("|", 1)
            i = cari_kab(prov, kab, nama, nk_idx)
            if not i:
                tak += 1
                continue
            out.setdefault(i, []).append((e["nama"], lv))
    return out, tak


def sk_berlaku(sk, jenis, hari, sd, kem_ke_irbi):
    """{IRBI: {'nomor','status','berakhir'}} untuk SK kabupaten sedang berlaku (berakhir null dianggap masih berlaku) dan jenisnya memuat `jenis`."""
    out = {}
    for o in sk:
        i = kem_ke_irbi.get(o["kab_kode"]) if o["kab_kode"] else None
        if i and o["mulai"] <= hari and (o["berakhir"] is None or o["berakhir"] >= hari) and jenis in sd.kelas_jenis(o["jenis"]):
            out[i] = {"nomor": o["nomor"], "status": o["status"], "berakhir": o["berakhir"]}
    return out


def idn(x, desimal=0):
    """Angka format Indonesia: ribuan titik, desimal koma (1269 -> '1.269', -1.51 -> '-1,51'); None -> 'tidak ada'."""
    if x is None:
        return "tidak ada"
    t = f"{x:,.{desimal}f}"
    return t.replace(",", "\0").replace(".", ",").replace("\0", ".")


BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl_id(t):
    """'2026-10-12' -> '12 Okt 2026'."""
    d = dt.date.fromisoformat(tgl(t))
    return f"{d.day} {BULAN[d.month - 1]} {d.year}"


def tgl_wib(iso):
    """Waktu ISO (boleh UTC) -> tanggal WIB 'YYYY-MM-DD'."""
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(WIB).strftime("%Y-%m-%d")


BATAS_BASI = {"karhutla": 2}  # umur sinyal (hari) di atas ini = basi; jenis lain 3
BERKAS = {"karhutla": "public/data/kluster.json", "banjir": "public/banjir/data/kejadian_aktif_awal.json", "longsor": "public/banjir/data/status.json",
          "kekeringan": "public/data/kekeringan_wilayah.json", "gunungapi": "public/banjir/data/kejadian_gunungapi_awal.json"}
LABEL = {"karhutla": "Data kompleks api aktif dari satelit", "banjir": "Kejadian banjir aktif", "longsor": "Status longsor kecamatan",
         "kekeringan": "Kekeringan per kabupaten", "gunungapi": "Status gunung api PVMBG"}


def entri(jenis, saran, alasan, sk, tanggal_sinyal, hari, cakupan_sk):
    """omc hanya karhutla Siaga tanpa SK, DAN data SK mencakup tanggal sinyal (cakupan_sk = max mulai; SK 2026 belum termuat = omc mati).
    Kekeringan TIDAK pernah omc (ambang hipotesis) dan diberi hipotesis=true. basi ditandai, tidak dibuang."""
    umur = (dt.date.fromisoformat(hari) - dt.date.fromisoformat(tanggal_sinyal)).days
    e = {"jenis": jenis, "saran": saran, "alasan": alasan, "sk": sk,
         "omc": jenis == "karhutla" and saran == SIAGA and sk is None and cakupan_sk is not None and cakupan_sk >= tanggal_sinyal}
    if jenis == "kekeringan":
        e["hipotesis"] = True
    e.update({"tanggal_sinyal": tanggal_sinyal, "umur_hari": umur, "basi": umur > BATAS_BASI.get(jenis, 3), "berkas": BERKAS[jenis]})
    return e


def bangun(d, hari):
    """Murni: d = isi semua masukan (lihat jalan), hari = 'YYYY-MM-DD' WIB. -> dict keluaran (tanpa dibuat/catatan) + 'tak' (jumlah sinyal tak terpetakan)."""
    nama, nk_idx, kem = peta_kode(d["kode"])
    sd = _muat("umum_status_darurat", "scripts/umum/status_darurat.py")
    cakupan = max((o["mulai"] for o in d["sk"]), default=None)
    kab, tak, tg_sinyal = {}, {}, {}
    dib = d["dibi"]

    def pasang(jenis, i, saran, alasan):
        kab.setdefault(i, []).append(entri(jenis, saran, alasan, sk_berlaku(d["sk"], jenis, hari, sd, kem).get(i), tg_sinyal[jenis], hari, cakupan))

    def dampak(jenis, i, dm, akhir_ya, akhir_tidak):
        tg = dm.get(i)
        return tg, (akhir_ya.format(n=idn(tg[1]), t=tgl_id(tg[0])) if tg else akhir_tidak)

    # karhutla: level 2 dan 3 sama-sama Siaga; Tanggap hanya dengan fakta dampak (DIBI)
    s, tak["karhutla"] = sinyal_karhutla(d["kluster"], d["meta"], nama, nk_idx)
    tg_sinyal["karhutla"] = tgl_wib(d["meta"]["data_terakhir"])
    dm = dampak_dibi(dib, "karhutla", kem)
    for i, (lv, n, luas, px) in s.items():
        tg, kal = dampak("karhutla", i, dm, "; DIBI mencatat {n} kejadian kebakaran berdampak, terakhir {t}, jadi ancaman sudah mengganggu.",
                         "; belum ada kebakaran berdampak di DIBI 7 hari terakhir, jadi masih ancaman.")
        pasang("karhutla", i, TANGGAP if tg else SIAGA,
               f"{idn(n)} kompleks api aktif 24 jam terakhir berstatus {'Prioritas pemadaman' if lv == 3 else 'Siaga pemadaman awal'} atau lebih tinggi, front {idn(px)} piksel dan luas {idn(luas)} ha menurut data satelit sampai {tgl_id(tg_sinyal['karhutla'])}" + kal)
    # banjir
    s, tak["banjir"] = sinyal_banjir(d["aktif"], nama, nk_idx)
    tg_sinyal["banjir"] = tgl(d["aktif"]["hari"])
    dm = dampak_dibi(dib, "banjir", kem)
    for i, (lv, n) in s.items():
        tg, kal = dampak("banjir", i, dm, "; DIBI mencatat {n} kejadian banjir berdampak, terakhir {t}, jadi ancaman sudah mengganggu.", "; belum ada kejadian banjir berdampak di DIBI 7 hari terakhir, jadi masih ancaman.")
        pasang("banjir", i, TANGGAP if tg else SIAGA, f"{idn(n)} kecamatan berstatus {'Awas' if lv == 3 else 'Siaga'} pada kejadian banjir aktif per {tgl_id(tg_sinyal['banjir'])}" + kal)
    # longsor
    s, tak["longsor"] = sinyal_longsor(d["status"], nama, nk_idx)
    tg_sinyal["longsor"] = tgl(d["status"]["hari"][0])
    dm = dampak_dibi(dib, "longsor", kem)
    for i, (lv, n) in s.items():
        tg, kal = dampak("longsor", i, dm, "; DIBI mencatat {n} kejadian longsor berdampak, terakhir {t}.", "; belum ada longsor berdampak di DIBI 7 hari terakhir, jadi masih ancaman.")
        pasang("longsor", i, TANGGAP if tg else SIAGA, f"{idn(n)} kecamatan berstatus longsor {'Awas' if lv == 3 else 'Siaga'} per {tgl_id(tg_sinyal['longsor'])}" + kal)
    # kekeringan (ambang hipotesis)
    s, tak["kekeringan"] = sinyal_kekeringan(d["kering"], nama, nk_idx)
    tg_sinyal["kekeringan"] = tgl(d["kering_meta"]["hari_ini"])
    dm = dampak_dibi(dib, "kekeringan", kem)
    for i, v in s.items():
        tg, kal = dampak("kekeringan", i, dm, "; DIBI mencatat {n} kejadian kekeringan berdampak, terakhir {t}.", ".")
        pasang("kekeringan", i, TANGGAP if tg else SIAGA,
               f"Kekeringan tingkat {'Awas' if v['lv'] == 3 else 'Siaga'} (SPI-3 {idn(v.get('spi3'), 2)}, hujan 3 bulan {idn(v.get('mm3'))} mm) per {tgl_id(tg_sinyal['kekeringan'])}; ambang hipotesis, belum lolos uji balik" + kal)
    # gunung api
    s, tak["gunungapi"] = sinyal_gunungapi(d["gunung"], nama, nk_idx)
    tg_sinyal["gunungapi"] = tgl(d["gunung"]["hari"])
    for i, gs in s.items():
        lv = max(g[1] for g in gs)
        pasang("gunungapi", i, TANGGAP if lv >= 4 else SIAGA,
               f"Gunung api {', '.join(sorted({g[0] for g in gs}))} berlevel {'IV (Awas)' if lv >= 4 else 'III (Siaga)'} menurut PVMBG per {tgl_id(tg_sinyal['gunungapi'])}.")
    for v in kab.values():
        v.sort(key=lambda e: URUT.index(e["jenis"]))
    es = [e for v in kab.values() for e in v]
    pakai = [j for j in URUT if any(e["jenis"] == j for e in es)]
    sumber = [f"{LABEL[j]} (per {tgl_id(tg_sinyal[j])})" for j in BERKAS if j in tg_sinyal] + ["Kejadian berdampak dari DIBI BNPB", "Status keadaan darurat dari data.bnpb.go.id"]
    sumber_berkas = [BERKAS[j] for j in BERKAS if j in tg_sinyal] + ["public/data/dibi_kejadian.json", "public/data/status_darurat.json"]
    per = {j: sum(1 for e in es if e["jenis"] == j) for j in pakai}
    hip = sum(1 for e in es if e.get("hipotesis"))
    ringkas = {"kab_dengan_saran": len(kab), "per_jenis": per, "omc_kab": sum(1 for v in kab.values() if any(e["omc"] for e in v)),
               "sk_cakupan_sampai": cakupan, "hipotesis": hip, "tanpa_hipotesis": len(es) - hip, "basi": sum(e["basi"] for e in es)}
    tgs = sorted(e["tanggal_sinyal"] for e in es)
    return {"sumber": sumber, "sumber_berkas": sumber_berkas, "sinyal_dari": tgs[0] if tgs else None, "sinyal_sampai": tgs[-1] if tgs else None,
            "kab": kab, "ringkas": ringkas, "tak": tak}


def catatan(o, hari):
    mati = o["ringkas"]["sk_cakupan_sampai"] is None or o["ringkas"]["sk_cakupan_sampai"] < hari
    return ("Ini SARAN untuk dibahas di rapat koordinasi, bukan penetapan status. Yang menetapkan adalah Bupati/Walikota, Gubernur, atau Presiden setelah kaji cepat dan rapat koordinasi. "
            "Gempa bumi dan tsunami tidak pernah disarankan Siaga karena terjadi mendadak dan tidak bisa diamati peringatan dini, jadi tidak dikeluarkan. Cuaca ekstrem belum punya sinyal per kabupaten. "
            "Transisi Darurat ke Pemulihan tidak disarankan otomatis. "
            "Cek tanggal sinyal tiap saran: yang bertanda basi sudah lewat beberapa hari. Ambang kekeringan masih hipotesis dan ambang karhutla belum diuji balik pada konfigurasi produksi."
            + (" Data SK 2026 belum termuat, penanda OMC dimatikan." if mati else ""))


def catatan_teknis(o):
    t = ", ".join(f"{j} {n}" for j, n in o["tak"].items() if n)
    return ("Pedoman Penetapan Status Keadaan Darurat BNPB 2016 tidak memberi ambang angka; ambang = ambang tingkat tiap modul (karhutla scripts/data/aturan.py level kompleks 2 dan 3 sama-sama Siaga; "
            "banjir/longsor scripts/banjir/status.py level >= 2; kekeringan scripts/kekeringan/status.py lv >= 2, hipotesis FAR 97%; gunung api level PVMBG). "
            "Naik ke Tanggap hanya bila dibi_kejadian.json mencatat kejadian sejenis berdampak (kolom dampak > 0) di kab itu dalam 7 hari terakhir cakupan DIBI. "
            "sk = SK berlaku dari status_darurat.json (berakhir kosong dianggap masih berlaku, jenis cocok lewat kelas_jenis). "
            "omc true = karhutla Siaga tanpa SK berlaku DAN max(mulai) di status_darurat.json >= tanggal_sinyal; SK hanya sampai ringkas.sk_cakupan_sampai sehingga 'tanpa SK' di luar cakupan itu artefak, omc dimatikan. "
            "Kunci kab = kode IRBI lewat public/data/kemitraan/kode.json. tanggal_sinyal/umur_hari terhadap tanggal WIB saat jalan; basi bila umur > 2 hari (karhutla) atau > 3 hari (lainnya), entri tidak dibuang. "
            "Cuaca dilewati: CAP BMKG hanya membawa provinsi/poligon. Kata 'siaga'/'tanggap' dipetakan, bukan ditetapkan."
            + (f" Sinyal yang namanya tak terpetakan ke kode kabupaten dan dibuang: {t}." if t else ""))


def jalan():
    P = lambda *a: os.path.join(AKAR, *a)
    J = lambda *a: json.load(open(P(*a), encoding="utf-8"))
    d = {"kode": J("public/data/kemitraan/kode.json"), "kluster": J("public/data/kluster.json"), "meta": J("public/data/meta.json"),
         "aktif": J("public/banjir/data/kejadian_aktif_awal.json"), "status": J("public/banjir/data/status.json"),
         "kering": J("public/data/kekeringan_wilayah.json"), "kering_meta": J("public/data/kekeringan_meta.json"),
         "gunung": J("public/banjir/data/kejadian_gunungapi_awal.json"), "dibi": J("public/data/dibi_kejadian.json"), "sk": J("public/data/status_darurat.json")["sk"]}
    hari = dt.datetime.now(WIB).strftime("%Y-%m-%d")
    o = bangun(d, hari)
    _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan(KELUAR, {
        "sumber": o["sumber"], "sumber_berkas": o["sumber_berkas"], "catatan": catatan(o, hari), "catatan_teknis": catatan_teknis(o), "aturan": ATURAN,
        "sinyal_dari": o["sinyal_dari"], "sinyal_sampai": o["sinyal_sampai"], "kab": o["kab"], "ringkas": o["ringkas"]})
    print(f"saran_status: {o['ringkas']}")


def uji():
    kode = {"3514": {"kunci_nama": "35|Pasuruan", "kemendagri": "35.14", "nama": "Kab. Pasuruan"},
            "6201": {"kunci_nama": "62|Kotawaringin Barat", "kemendagri": "62.01", "nama": "Kab. Kotawaringin Barat"},
            "1807": {"kunci_nama": "18|Lampung Selatan", "kemendagri": "18.01", "nama": "Kab. Lampung Selatan"}}
    kl = lambda lv: {"features": [{"properties": {"level": lv, "akhir": "2026-10-12T10:00:00+00:00", "prov": "62", "kab": "Kotawaringin Barat", "luas": 4303, "px24": 1269}}]}
    # SK penanda cakupan: mulai 12 Okt = tanggal sinyal karhutla (data_terakhir 12 Okt WIB)
    cakup = {"nomor": "9", "kab_kode": "18.01", "mulai": "2026-10-12", "berakhir": "2026-10-13", "jenis": "Banjir", "status": SIAGA}
    sk6201 = {"nomor": "1", "kab_kode": "62.01", "mulai": "2026-10-01", "berakhir": "2026-10-20", "jenis": "Kebakaran hutan dan lahan", "status": SIAGA}
    d = {"kode": kode, "kluster": kl(2), "meta": {"data_terakhir": "2026-10-12T12:27:00+00:00"},
         "aktif": {"hari": "2026-10-19", "ambang_level": 2, "kejadian": [{"level_tertinggi": 2, "kec": ["35|Pasuruan|A", "35|Pasuruan|B"]}, {"level_tertinggi": 1, "kec": ["35|Xxx|C"]}]},
         "status": {"hari": ["2026-10-19"], "kec": {"35|Pasuruan|A": {"l": [3]}, "35|Pasuruan|B": {"l": [1]}}},
         "kering": {"kab": {"35|Pasuruan": {"lv": 2, "spi3": -1.6, "mm3": 90}, "62|Kotawaringin Barat": {"lv": 1}}}, "kering_meta": {"hari_ini": "2026-10-19"},
         "gunung": {"hari": "2026-10-19", "kejadian": [{"nama": "G. X", "aktif": True, "besaran": {"nilai": 4}, "kab": ["18|Lampung Selatan"]},
                                                         {"nama": "G. Y", "aktif": True, "besaran": {"nilai": 2}, "kab": ["35|Pasuruan"]}]},
         "dibi": {"dari": "2025-10-28", "sampai": "2026-10-28", "kejadian": [{"tanggal": "2026-10-27", "jenis": "Banjir", "kab_kode": "35.14", "terdampak": 10},
                                                                              {"tanggal": "2026-10-27", "jenis": "Gempabumi", "kab_kode": "35.14", "meninggal": 1}]},
         "sk": [sk6201, cakup]}
    H = "2026-10-19"
    kab = bangun(d, H)["kab"]
    ada = lambda k, i: {e["jenis"]: e for e in k.get(i, [])}
    # karhutla level 2 + SK berlaku -> Siaga, sk terisi, omc FALSE
    assert ada(kab, "6201")["karhutla"]["saran"] == SIAGA and ada(kab, "6201")["karhutla"]["sk"]["nomor"] == "1" and ada(kab, "6201")["karhutla"]["omc"] is False
    # tanpa SK berlaku tapi cakupan SK mencakup tanggal sinyal -> omc true; cakupan lebih lama dari sinyal -> omc FALSE (artefak); tanpa SK sama sekali -> FALSE
    o2 = bangun(dict(d, sk=[cakup]), H)
    assert ada(o2["kab"], "6201")["karhutla"]["omc"] is True and o2["ringkas"]["omc_kab"] == 1 and o2["ringkas"]["sk_cakupan_sampai"] == "2026-10-12"
    for sk in ([], [dict(cakup, mulai="2026-10-01")]):
        o3 = bangun(dict(d, sk=sk), H)
        assert ada(o3["kab"], "6201")["karhutla"]["omc"] is False and o3["ringkas"]["omc_kab"] == 0 and "Data SK 2026 belum termuat, penanda OMC dimatikan" in catatan(o3, H)
    assert "OMC dimatikan" not in catatan(o2, "2026-10-12")
    # level 3 karhutla = Siaga juga (Tanggap hanya dengan dampak DIBI)
    assert ada(bangun(dict(d, kluster=kl(3), sk=[cakup]), H)["kab"], "6201")["karhutla"]["saran"] == SIAGA
    dk = dict(d["dibi"], kejadian=d["dibi"]["kejadian"] + [{"tanggal": "2026-10-27", "jenis": "Kebakaran Hutan dan Lahan", "kab_kode": "62.01", "terdampak": 5}])
    tk = ada(bangun(dict(d, kluster=kl(3), sk=[cakup], dibi=dk), H)["kab"], "6201")["karhutla"]
    assert tk["saran"] == TANGGAP and tk["omc"] is False
    assert bangun(dict(d, sk=[dict(sk6201, berakhir="2026-10-10"), cakup]), H)["kab"]["6201"][0]["sk"] is None   # SK sudah berakhir
    # banjir Siaga + DIBI berdampak -> Tanggap; longsor level 3 tanpa dampak -> Siaga; gempa DIBI tak berpengaruh
    assert ada(kab, "3514")["banjir"]["saran"] == TANGGAP and ada(kab, "3514")["longsor"]["saran"] == SIAGA
    kr = ada(kab, "3514")["kekeringan"]
    assert kr["saran"] == SIAGA and "ambang hipotesis" in kr["alasan"] and kr["omc"] is False and kr["hipotesis"] is True and "-1,60" in kr["alasan"]
    assert ada(kab, "1807")["gunungapi"]["saran"] == TANGGAP and "3514" in kab and "gunungapi" not in ada(kab, "3514")   # G. Y level 2 tak masuk
    # umur/basi: karhutla 12 Okt vs 19 Okt = 7 hari (basi); batas karhutla 2 hari, lainnya 3 hari; tidak dibuang
    kh = ada(kab, "6201")["karhutla"]
    assert (kh["tanggal_sinyal"], kh["umur_hari"], kh["basi"]) == ("2026-10-12", 7, True) and kr["umur_hari"] == 0 and kr["basi"] is False
    assert bangun(d, "2026-10-14")["kab"]["6201"][0]["basi"] is False and bangun(d, "2026-10-15")["kab"]["6201"][0]["basi"] is True
    assert bangun(d, "2026-10-22")["kab"]["3514"][0]["basi"] is False and bangun(d, "2026-10-23")["kab"]["3514"][0]["basi"] is True
    o = bangun(d, H)
    assert (o["sinyal_dari"], o["sinyal_sampai"]) == ("2026-10-12", "2026-10-19") and o["ringkas"]["basi"] == 1
    assert o["ringkas"]["hipotesis"] == 1 and o["ringkas"]["tanpa_hipotesis"] == sum(len(v) for v in kab.values()) - 1
    for e in (e for v in kab.values() for e in v):
        assert e["omc"] is False   # satu-satunya karhutla Siaga punya SK berlaku
        assert not re.search(r"\d\.\d{1,2}(?!\d)", e["alasan"]), e["alasan"]    # titik ribuan (4.303) sah; desimal bertitik tidak
        assert not re.search(r"\.json|\d{4}-\d{2}-\d{2}", e["alasan"]), e["alasan"]   # publik: tanpa nama berkas / tanggal ISO
        assert e["berkas"].endswith(".json")
        assert e["jenis"] in URUT and e["saran"] in (SIAGA, TANGGAP, "Transisi Darurat ke Pemulihan")
        assert e["jenis"] not in ("gempa", "gempabumi", "tsunami")
    assert all(not re.search(r"\.json|scripts/|\d{4}-\d{2}-\d{2}", x) for x in o["sumber"]) and all(x.endswith(".json") for x in o["sumber_berkas"])
    assert not re.search(r"omc true|sk =|berkas pipeline|\.json", catatan(o, H)) and "Transisi Darurat ke Pemulihan tidak disarankan otomatis" in catatan(o, H)
    assert "belum diuji balik pada konfigurasi produksi (15 piksel, 3 satelit)" in ATURAN["karhutla"] and not re.search(r"\.json|scripts/", " ".join(ATURAN.values()))
    assert set(ATURAN) == set(URUT) and not any(j in ATURAN for j in ("gempa", "tsunami"))
    assert cari_kab("62", "Kotawaringin Barat", *peta_kode(kode)[:2]) == "6201" and cari_kab("62", "Kab. Kotawaringin  Barat", *peta_kode(kode)[:2]) == "6201"
    assert o["ringkas"]["kab_dengan_saran"] == 3
    assert idn(53071) == "53.071" and idn(1269) == "1.269" and idn(-1.51, 2) == "-1,51" and idn(0) == "0" and idn(1234567.5, 1) == "1.234.567,5"
    assert tgl_id("2026-10-12") == "12 Okt 2026" and tgl_wib("2026-10-12T20:00:00+00:00") == "2026-10-13"
    print("uji saran_status: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
