"""Laporan kejadian otomatis (pola "Makalah" emisi.app): satu halaman ringkas per kab/kota yang menembus Siaga di sebuah modul.

Pakai:  python3 scripts/umum/laporan_kejadian.py <modul...>   modul: banjir, cuaca, udara, kekeringan, gempa, longsor, pesisir, gunungapi (bawaan: semua yang sumbernya ada)
        python3 scripts/umum/laporan_kejadian.py uji          self-check luring

Mesinnya mesin laporan harian (scripts/umum/laporan.py, kontrak v1) dengan medan `fokus` = kode kab: halaman /kejadian.html
menggambar dengan public/inti/laporan.js yang sama. Tidak ada angka baru: semua diambil dari berkas modul yang sudah terbit.

Pemicu: kab/kota dengan metrik pemicu modul > 0 pada hari lengkap atau hari berjalan sesudahnya
(banjir: kecamatan Siaga/Awas banjir atau longsor; cuaca: kecamatan Siaga/Awas; udara: PM2,5 rata-rata 24 jam sangat tidak sehat ke atas).
Isi: kronologi (seri kab dari laporan modul), asal (banjir: hulu.json per sub-DAS; udara: asal.json lintasan mundur),
model vs alat ukur (uji balik yang sudah ada), dampak jiwa (metrik jiwa modul), dan bagian Batasan.
PB-23 (F-10, KEPUTUSAN-PARITAS Q23 BAWAAN SEMENTARA): gempa, longsor, pesisir, gunungapi ikut. Pemicu "kejadian besar" mengikuti
ambang aktivasi Pusdalops di logbook; ambang itu TIDAK ditemukan sebagai angka di repo, jadi dipakai bawaan di bawah (bukan ambang baru dari
pemilik): gempa M 5 atau lebih di kab; longsor 1 kecamatan "tinggi" di nowcast (hipotesis: uji balik GAGAL); pesisir kejadian rob pada hari
terakhir data; gunung api Level III atau IV di arsip PVMBG. Bagian tanpa sumber di repo dikosongkan dengan alasan, bukan dikarang.
Karhutla belum masuk (sumbernya bukan kab/kota Siaga). Batasan per modul baru ada di BATASAN_MODUL.

Keluaran modul lama: <dir>/kejadian/<modul>-<kode>.json + <dir>/kejadian/index-<modul>.json.
Keluaran modul baru: public/data/laporan_kejadian/<modul>-<kode>.json + index-<modul>.json (tanpa subfolder kejadian). Laporan yang pemicunya berhenti tetap disimpan
SIMPAN_HARI hari sesudah hari terakhir Siaga (arsip), lalu dihapus.
"""
import datetime as dt
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
_s = importlib.util.spec_from_file_location("umum_laporan", os.path.join(AKAR, "scripts/umum/laporan.py"))
LAP = importlib.util.module_from_spec(_s)
_s.loader.exec_module(LAP)

SIMPAN_HARI = 14
MAKS_KRONOLOGI = 14
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
MODUL = {
    "banjir": {"nama": "Banjir dan Longsor", "laporan": "public/banjir/data/laporan.json", "dir": "public/banjir/data", "pemicu": ["banjir_sa", "longsor_sa"],
               "jiwa": "penduduk", "jiwa_ket": "Penduduk kecamatan berstatus Siaga/Awas (WorldPop), bukan jumlah yang tergenang.",
               "sumber": [{"nama": "HydroBASINS v1c", "url": "https://www.hydrosheds.org/products/hydrobasins", "catatan": "batas sub-DAS hulu"},
                          {"nama": "Hansen Global Forest Change v1.13", "url": "https://glad.earthengine.app/view/global-forest-change", "catatan": "hutan hilang 2001 s.d. 2025"},
                          {"nama": "DIBI BNPB", "url": "https://dibi.bnpb.go.id", "catatan": "kejadian untuk uji balik status"}]},
    "cuaca": {"nama": "Cuaca Ekstrem", "laporan": "public/banjir/data/cuaca_laporan.json", "dir": "public/banjir/data", "pemicu": ["kec"],
              "jiwa": None, "jiwa_ket": "Modul cuaca belum menghitung jiwa terpapar per kab/kota.", "sumber": []},
    "udara": {"nama": "Kualitas Udara", "laporan": "public/udara/data/laporan.json", "dir": "public/udara/data", "pemicu": ["kota_siaga"],
              "jiwa": "jiwa_tidak_sehat", "jiwa_judul": "Penduduk kab/kota pada hari udara tidak sehat", "jiwa_ket": "Penduduk kab/kota (WorldPop) pada hari PM2,5 rata-rata 24 jam di atas batas tidak sehat.",
              "sumber": []},   # laporan udara sudah menyebut CAMS, FIRMS, METAR, WorldPop
}
# kalimat pemicu per modul (kab, indeks hari) -> teks; angka dari seri kab laporan modul
_kec = lambda kab, i, k: (kab.get(k) or [None] * (i + 1))[i] or 0
MODUL["banjir"]["kata"] = lambda kab, i: "; ".join(f"{_kec(kab, i, k):g} kecamatan Siaga/Awas {j}" for k, j in (("banjir_sa", "banjir"), ("longsor_sa", "longsor")) if _kec(kab, i, k))
MODUL["cuaca"]["kata"] = lambda kab, i: f"{_kec(kab, i, 'kec'):g} kecamatan Siaga/Awas cuaca ekstrem"
MODUL["udara"]["kata"] = lambda kab, i: (f"PM2,5 rata-rata 24 jam {kab['pm_jiwa'][i]:g} µg/m³ (model CAMS di titik kota), sangat tidak sehat ke atas" if (kab.get("pm_jiwa") or [None] * (i + 1))[i] is not None
                                         else "PM2,5 sangat tidak sehat ke atas")
# kekeringan: status per kab adalah potret hari ini (kekeringan_wilayah.json, gabungan SPI-3 + kelembapan tanah), tidak ada arsip status harian
MODUL["kekeringan"] = {"nama": "Kekeringan", "laporan": "public/data/kekeringan_laporan.json", "dir": "public/data", "pemicu": [],
                       "jiwa": "jiwa31", "jiwa_judul": "Penduduk di HTH 31 hari atau lebih",
                       "jiwa_ket": "Penduduk di sel dengan hari tanpa hujan 31 hari atau lebih (stok harian, WorldPop), bukan jumlah yang kekurangan air.",
                       "sumber": [{"nama": "DIBI BNPB", "url": "https://dibi.bnpb.go.id", "catatan": "kejadian kekeringan untuk uji balik"}]}
_WIL = {}


def _status_kering(kab):
    """(level, rekaman wilayah) kab hari ini dari kekeringan_wilayah.json; kunci 'prov|nama' sama dengan nama kab laporan kekeringan"""
    if "kab" not in _WIL:
        _WIL["kab"] = (_baca("public/data/kekeringan_wilayah.json") or {}).get("kab", {})
    r = _WIL["kab"].get(f"{kab['prov']}|{kab['nama']}")
    return ((r or {}).get("lv") or 0), r


MODUL["kekeringan"]["status"] = _status_kering
MODUL["kekeringan"]["kata"] = lambda kab, i, r=None: (f"Status {NL[(r or {}).get('lv') or 0]} (SPI-3 dan kelembapan tanah)"
                                                      + (f", {rb(r['jiwa'][1])} jiwa di wilayah Siaga atau lebih" if r and r.get("jiwa") else ""))
NL = {0: "Normal", 1: "Waspada", 2: "Siaga", 3: "Awas"}
BATASAN_UMUM = ["Laporan ini dirakit otomatis dari data modul yang sudah terbit; tidak ada angka yang ditambahkan tangan.",
                "Status Siaga adalah keluaran model Centurisk97, bukan penetapan status darurat oleh BNPB/BPBD."]


def _baca(rel):
    if rel in _FIX:
        return _FIX[rel]
    p = os.path.join(AKAR, rel)
    try:
        return json.load(open(p, encoding="utf-8"))
    except (OSError, ValueError):
        return None


def rb(n):
    """pemisah ribuan titik (format Indonesia), hanya pada angkanya: koma kalimat tidak ikut berubah"""
    return format(n, ",").replace(",", ".")


_MODE = {"tahun": False, "ribuan": False}   # diatur bangun() per modul; hanya modul PB-23 yang menyalakan


def tgl(h):
    d = dt.date.fromisoformat(h)
    return f"{d.day} {BLN[d.month - 1]}" + (f" {d.year}" if _MODE["tahun"] else "")


def _r(v):
    """angka bulat >= 1.000 di sel tabel modul PB-23: pemisah ribuan titik"""
    return rb(v) if _MODE["ribuan"] and isinstance(v, int) and not isinstance(v, bool) and abs(v) >= 1000 else v


def norm(n):
    return re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", str(n).lower()).strip()


# ---------------------------------------------------------------------------------------------------------------
# PB-23 (F-10): gempa, longsor, pesisir, gunungapi. Tanpa angka baru: semua dari berkas yang sudah terbit di repo.
# Kode kab modul baru = IRBI (public/data/kemitraan/kode.json, kunci nama "prov|nama"); gempa memakai kode laporan gempa sendiri.
# ---------------------------------------------------------------------------------------------------------------
KELUAR_PB = "public/data/laporan_kejadian"
LAMA_SERI = 14
ROMAWI = {1: "I", 2: "II", 3: "III", 4: "IV"}
_REK = {}    # modul -> {kode kab: rekaman rinci}; rekaman tidak ikut ke keluaran
_INFO = {}   # modul -> {"tak_terpetakan": n, "alasan": str|None}; diisi muat_*
_FIX = {}    # hanya uji(): berkas palsu per jalur relatif
BATASAN_MODUL = {
    "gempa": ["Laporan ini dirakit otomatis dari katalog gempa yang sudah terbit (USGS, BMKG); tidak ada angka yang ditambahkan tangan.",
              "Gempa adalah pengamatan, bukan keluaran model; laporan ini tidak menghitung jiwa terpapar atau kerusakan per kab/kota.",
              "Ambang M 5 atau lebih belum dikaji terhadap ambang aktivasi Pusdalops."],
    "longsor": ["Laporan ini dirakit otomatis dari nowcast longsor yang sudah terbit; tidak ada angka yang ditambahkan tangan.",
                "Model longsor belum lolos uji balik (hipotesis): keluarannya petunjuk untuk dicek, bukan penetapan status oleh BNPB/BPBD.",
                "Kecamatan yang tidak tercantum di nowcast tidak berarti tanpa risiko; sebagian kecamatan tanpa nilai kerentanan."],
    "pesisir": ["Laporan ini dirakit otomatis dari rekap kejadian rob (Pusdalops, logbook, DIBI) yang sudah terbit; tidak ada angka yang ditambahkan tangan.",
                "Rob dicatat per tanggal laporan dan kabupaten/kota, bukan per luas genangan; tidak ada prakiraan pasang di laporan ini.",
                "Garis pantai abrasi belum dikoreksi pasang surut; ditampilkan sebagai konteks, bukan pemicu."],
    "gunungapi": ["Laporan ini dirakit otomatis dari arsip level aktivitas gunung api PVMBG yang sudah terbit; tidak ada angka yang ditambahkan tangan.",
                  "Level adalah penetapan PVMBG, Badan Geologi, bukan keluaran model Centurisk97; level yang tampil adalah laporan terakhir di arsip Pusdalops BNPB dan bisa sudah berubah.",
                  "Kab/kota dipilih dari pusat wilayah terdekat dengan gunung di provinsi yang sama, bukan batas administrasi kawah; hanya gunung yang punya riwayat level di arsip yang dinilai."],
}


def _baca_pb(rel):
    return _FIX[rel] if rel in _FIX else _baca(rel)


def _hari(akhir, n=LAMA_SERI):
    d = dt.date.fromisoformat(akhir)
    return [(d - dt.timedelta(days=n - 1 - j)).isoformat() for j in range(n)]


def _peta_kode():
    """({(prov, nama huruf kecil): kode IRBI}, kode.json)"""
    k = _baca_pb("public/data/kemitraan/kode.json") or {}
    return {tuple(r["kunci_nama"].lower().split("|", 1)): kd for kd, r in k.items()}, k


def _agregat(metrik, kab, n):
    def f(rows):
        o = {}
        for m in metrik:
            s = []
            for j in range(n):
                v = [r[m["k"]][j] for r in rows if r[m["k"]][j] is not None]
                s.append(None if not v else (sum(v) if m["agregat"] == "jumlah" else max(v)))
            o[m["k"]] = s
        return o
    return f(kab), {p: f([r for r in kab if r["prov"] == p]) for p in sorted({r["prov"] for r in kab})}


def _potret(modul, judul, akhir, metrik, kab, cutoff, dibuat, sumber):
    """laporan kontrak v1 dari satu potret sumber: 14 hari berakhir di `akhir`"""
    nas, prov = _agregat(metrik, kab, LAMA_SERI)
    return LAP.susun(modul, judul, _hari(akhir), metrik, nas, prov, kab, cutoff=cutoff, hari_lengkap=akhir, sumber=sumber, dibuat=dibuat)


def _tgl_penuh(iso):
    d = dt.date.fromisoformat(iso)
    return f"{d.day} {BLN[d.month - 1]} {d.year}"


def _seri(akhir, nilai):
    """nilai hanya pada hari terakhir"""
    return [None] * (LAMA_SERI - 1) + [nilai]


# ---- gempa: laporan.json per kab sudah ada; pemicu M 5 atau lebih ----
def _kata_gempa(kab, i):
    n, mx = _kec(kab, i, "m5"), (kab.get("mmaks") or [None] * (i + 1))[i]
    return f"{n:g} gempa M 5 atau lebih" + (f", M terbesar {mx:g}".replace(".", ",") if mx is not None else "")


def _rinci_gempa(kab):
    L = _baca_pb(MODUL["gempa"]["laporan"]) or {}
    t = next((x for x in L.get("tambahan", []) if x.get("id") == "m5"), None)
    if not t:
        return None, "Daftar gempa M 5 atau lebih belum tersedia di laporan gempa."
    wil = t["kolom"].index("Wilayah")
    n = norm(kab["nama"])
    baris = [r for r in t["baris"] if n and n in str(r[wil]).lower()]
    if not baris:
        return None, f"Tidak ada gempa M 5 atau lebih yang menyebut {kab['nama']} di daftar terbaru laporan gempa."
    return {"id": "rinci", "judul": f"Gempa M 5 atau lebih yang menyebut {kab['nama']}", "kolom": t["kolom"], "baris": baris,
            "catatan": "Dicocokkan dari nama wilayah di daftar gempa terbaru laporan gempa (nama kab/kota ada di keterangan lokasi); bukan penentuan episenter per kab."}, None


MODUL["gempa"] = {"nama": "Gempa Bumi", "laporan": "public/gempa/data/laporan.json", "dir": "public/gempa/data", "keluar": KELUAR_PB, "pemicu": ["m5"],
                  "jiwa": None, "jiwa_ket": "Jiwa terpapar gempa per kab/kota belum dihitung di laporan gempa.", "sumber": [], "kata": _kata_gempa, "ribuan": True,
                  "rinci": _rinci_gempa, "ket_judul": "Rincian belum tersedia",
                  "tanpa_ukur": "Gempa adalah pengamatan katalog, bukan keluaran model; tidak ada uji balik yang berlaku untuk laporan ini."}


# ---- longsor: nowcast per kecamatan dikelompokkan ke kab; model gagal uji balik = hipotesis ----
def _hip_longsor():
    U = _baca_pb("public/longsor/data/uji_balik.json") or {}
    if U.get("vonis") == "LOLOS":
        return None
    a = U.get("auc") or {}
    d2 = lambda x: f"{x:.2f}".replace(".", ",")
    return ("Hipotesis: model longsor tidak lolos uji balik" + (f" (luas di bawah kurva model {d2(a['model'])}, klimatologi {d2(a['klim'])})" if a.get("model") and a.get("klim") else "")
            + "; tampil sebagai petunjuk, bukan status.")


def muat_longsor():
    N, K = _baca_pb("public/longsor/data/nowcast.json"), _baca_pb("public/longsor/data/kerentanan.json")
    _INFO["longsor"] = {"tak_terpetakan": 0, "alasan": None}
    if not N or not K:
        return None
    pk, _ = _peta_kode()
    per, rek, tak = {}, {}, 0
    for kelas in ("tinggi", "sedang"):
        for i, S, t in N.get(kelas, []):
            p, kb, kc = K["kec"][i].split("|", 2)
            kd = pk.get((p, kb.lower()))
            if not kd:
                tak += 1
                continue
            per.setdefault(kd, {"prov": p, "nama": kb, "tinggi": 0, "sedang": 0})[kelas] += 1
            rek.setdefault(kd, []).append([kc, "Tinggi" if kelas == "tinggi" else "Sedang", S, t])
    _INFO["longsor"]["tak_terpetakan"] = tak
    metrik = [{"k": "kec_tinggi", "label": "Kecamatan bahaya tinggi", "satuan": "kecamatan", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
              {"k": "kec_sedang", "label": "Kecamatan bahaya sedang", "satuan": "kecamatan", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0}]
    kab = [{"prov": r["prov"], "kode": kd, "nama": r["nama"], "kec_tinggi": _seri(0, r["tinggi"]), "kec_sedang": _seri(0, r["sedang"])} for kd, r in per.items()]
    _REK["longsor"] = {kd: {"lv": 2 if per[kd]["tinggi"] else 0, "kec": sorted(rek[kd], key=lambda x: (x[1] != "Tinggi", -x[3], x[0]))} for kd in per}
    return _potret("longsor", "Laporan Harian Longsor", N["jendela_akhir"], metrik, kab, N["dibuat"], N["dibuat"],
                   [{"nama": "Open-Meteo", "url": "https://open-meteo.com/", "catatan": "hujan 7 hari teramati"},
                    {"nama": "ERA5 (Copernicus)", "url": "https://cds.climate.copernicus.eu/", "catatan": "P95 hujan 7 hari per sel"},
                    {"nama": "PVMBG Badan Geologi (MAGMA)", "url": "https://magma.esdm.go.id/", "catatan": "zona kerentanan gerakan tanah"}])


def _rinci_longsor(kab):
    r = _REK["longsor"][kab["kode"]]["kec"]
    return {"id": "rinci", "judul": f"Kecamatan di {kab['nama']} pada nowcast longsor", "kolom": ["Kecamatan", "Kelas", "Kerentanan (S)", "Hujan 7 hari / P95 (t)"],
            "baris": [[x[0], x[1], f"{x[2]:.1f}".replace(".", ","), f"{x[3]:.1f}".replace(".", ",")] for x in r[:20]], "catatan": "S dan t dari nowcast longsor; dua sumber hujan berbeda model, jadi t bukan ukuran pasti." + (f" {len(r) - 20} kecamatan lain tidak ditampilkan." if len(r) > 20 else "")}, None


def _ukur_longsor():
    U = _baca_pb("public/longsor/data/uji_balik.json")
    r = ((U or {}).get("kelas") or {}).get("tinggi")
    if not r:
        return None
    p = lambda x: "–" if x is None else f"{round(x * 100)}%"
    csi = r["tp"] / (r["tp"] + r["fp"] + r["fn"]) if r.get("tp") is not None else None
    a = U.get("auc") or {}
    d2 = lambda x: f"{x:.2f}".replace(".", ",")
    return {"id": "ukur", "judul": "Model vs catatan kejadian: kelas bahaya tinggi", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
            "baris": [["Kelas tinggi, kabupaten-hari DIBI", p(r.get("pod")), p(r.get("far")), p(csi)]],
            "catatan": ("Model lolos uji balik" if U.get("vonis") == "LOLOS" else "Model tidak lolos uji balik")
                       + (f". Luas di bawah kurva: model {d2(a['model'])}, klimatologi {d2(a['klim'])}, hujan saja {d2(a['hujan'])}" if all(a.get(k) for k in ("model", "klim", "hujan")) else "")
                       + ". Sasaran: kejadian longsor tercatat per kabupaten-hari."}


MODUL["longsor"] = {"nama": "Longsor", "muat": muat_longsor, "keluar": KELUAR_PB, "pemicu": [], "hipotesis": _hip_longsor,
                    "status": lambda kab: ((_REK["longsor"][kab["kode"]]["lv"]), _REK["longsor"][kab["kode"]]),
                    "kata": lambda kab, i, r=None: f"{_kec(kab, i, 'kec_tinggi'):g} kecamatan bahaya tinggi dan {_kec(kab, i, 'kec_sedang'):g} kecamatan bahaya sedang",
                    "jiwa": None, "jiwa_ket": "Jiwa terpapar longsor per kab/kota belum dihitung di nowcast longsor.", "sumber": [],
                    "ket_status": lambda lv, r=None: "Hipotesis bahaya tinggi (bukan status)", "ribuan": True,
                    "catatan_status": " Nowcast hanya menyimpan potret terbaru per kecamatan, jadi kapan bahaya tinggi dimulai tidak diketahui.",
                    "rinci": _rinci_longsor, "ket_judul": "Rincian belum tersedia", "tanpa_ukur": "Uji balik longsor belum dapat dibaca."}


# ---- pesisir: kejadian rob per kab dari rekap Pusdalops; abrasi sebagai konteks ----
def muat_pesisir():
    R = _baca_pb("public/pesisir/data/rob_kejadian.json")
    _INFO["pesisir"] = {"tak_terpetakan": 0, "alasan": None}
    if not R:
        return None
    akhir = R["dibuat"][:10]
    hari = _hari(akhir)
    pk, _ = _peta_kode()
    per, tak = {}, 0
    for e in R["kejadian"]:
        if e["t"] not in hari:
            continue
        p, nm = e["k"].split("|", 1)
        kd = pk.get((p, nm.lower()))
        if not kd:
            tak += 1
            continue
        per.setdefault(kd, {"prov": p, "nama": nm, "seri": [0] * LAMA_SERI})["seri"][hari.index(e["t"])] += 1
    _INFO["pesisir"]["tak_terpetakan"] = tak
    metrik = [{"k": "rob", "label": "Kejadian banjir rob", "satuan": "kejadian", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0}]
    kab = [{"prov": r["prov"], "kode": kd, "nama": r["nama"], "rob": r["seri"]} for kd, r in per.items()]
    L = _potret("pesisir", "Laporan Harian Pesisir", akhir, metrik, kab, R["dibuat"], R["dibuat"],
                [{"nama": "Pusdalops BNPB", "url": "https://bnpb.go.id", "catatan": "rekap kejadian rob dan logbook"}, {"nama": "DIBI BNPB", "url": "https://dibi.bnpb.go.id", "catatan": "kategori Banjir Rob"}])
    if not any(r["seri"][-1] for r in per.values()):
        _INFO["pesisir"]["alasan"] = (f"Tidak ada kejadian rob tercatat pada {_tgl_penuh(akhir)} (hari terakhir data); kejadian terakhir di rekap {_tgl_penuh(R['rentang'][1])}. "
                                      "Rekap rob diperbarui berkala, bukan harian, jadi kosong tidak berarti tidak ada rob.")
    return L


def _rinci_pesisir(kab):
    A = _baca_pb("public/pesisir/data/abrasi.json") or {}
    n = norm(kab["nama"])
    s = [x for x in A.get("situs", []) if norm(x["kab"]) == n and x.get("laju_median") is not None]
    if not s:
        return None, f"{kab['nama']} tidak punya situs abrasi terukur di data abrasi (baru {len(A.get('situs', []))} situs)."
    return {"id": "rinci", "judul": f"Abrasi pantai terukur di {kab['nama']}", "kolom": ["Situs", "Laju median (m/tahun)", "Transek abrasi nyata", "Transek akresi nyata"],
            "baris": [[x["nama"], x["laju_median"], x.get("abrasi_nyata"), x.get("akresi_nyata")] for x in s],
            "catatan": "Citra Landsat/Sentinel, belum dikoreksi pasang surut; konteks jangka panjang, bukan penyebab kejadian rob hari ini."}, None


MODUL["pesisir"] = {"nama": "Pesisir", "muat": muat_pesisir, "keluar": KELUAR_PB, "pemicu": ["rob"], "jiwa": None, "ribuan": True,
                    "jiwa_ket": "Jiwa terpapar rob per kab/kota belum dihitung di rekap rob.", "sumber": [],
                    "kata": lambda kab, i: f"{_kec(kab, i, 'rob'):g} kejadian banjir rob tercatat",
                    "rinci": _rinci_pesisir, "ket_judul": "Abrasi belum tersedia",
                    "tanpa_ukur": "Rekap rob adalah catatan kejadian, bukan keluaran model; tidak ada uji balik yang berlaku untuk laporan ini."}


# ---- gunung api: level PVMBG terakhir di arsip Pusdalops, dipetakan ke kab dengan pusat terdekat ----
def _jarak(g, pusat):
    return (g["lat"] - pusat[0]) ** 2 + ((g["lon"] - pusat[1]) * 0.99) ** 2    # ponytail: kosinus lintang dibulatkan, cukup untuk memilih terdekat dalam provinsi


def muat_gunungapi():
    R, G = _baca_pb("public/gunungapi/data/riwayat_level.json"), _baca_pb("public/gunungapi/data/gunung.json")
    _INFO["gunungapi"] = {"tak_terpetakan": 0, "alasan": None}
    if not R or not G or not R.get("baris"):
        return None
    P = _baca_pb("public/gunungapi/data/paparan.json") or {}
    pop = {g["nama"]: (g.get("zona") or {}).get("III", {}).get("penduduk") for g in P.get("gunung", [])}
    _, K = _peta_kode()
    pv = {v.lower(): k for k, v in LAP.PROVINSI.items()}
    akhir = max(b["tanggal"] for b in R["baris"])
    hari = _hari(akhir)
    terakhir = {}
    for b in sorted(R["baris"], key=lambda b: (b["tanggal"], b["gunung"])):
        terakhir[b["gunung"]] = b
    grup, tak = {}, []
    for nm, b in terakhir.items():
        g = G.get(nm)
        p = pv.get(str((g or {}).get("prov", "")).lower())
        cand = [(kd, r) for kd, r in K.items() if r["prov"] == p and r.get("pusat")]
        if not g or not p or not cand:
            tak.append(nm)
            continue
        kd, r = min(cand, key=lambda x: (_jarak(g, x[1]["pusat"]), x[0]))
        grup.setdefault(kd, []).append((nm, b, r))
    _INFO["gunungapi"]["tak_terpetakan"] = len(tak)
    metrik = [{"k": "level", "label": "Level aktivitas tertinggi", "satuan": "level", "utama": True, "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
              {"k": "jiwa_krb3", "label": "Penduduk di KRB III", "satuan": "jiwa", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0}]
    kab, rek = [], {}
    for kd, lst in sorted(grup.items()):
        lv, jw = [], []
        for h in hari:
            ada = [(nm, b) for nm, b, _ in lst if b["tanggal"] <= h]
            lv.append(max((b["ke"] for _, b in ada), default=None))
            pj = [pop[nm] for nm, _ in ada if pop.get(nm) is not None]
            jw.append(sum(pj) if pj else None)
        r = lst[0][2]
        kab.append({"prov": r["prov"], "kode": kd, "nama": r["nama"], "level": lv, "jiwa_krb3": jw})
        rek[kd] = {"akhir": akhir, "lv": (lv[-1] or 1) - 1, "gunung": sorted([(nm, b) for nm, b, _ in lst], key=lambda x: (-x[1]["ke"], x[0]))}
    _REK["gunungapi"] = rek
    L = _potret("gunungapi", "Laporan Harian Gunung Api", akhir, metrik, kab, f"{akhir}T00:00+07:00", f"{akhir}T00:00+07:00",
                [{"nama": "PVMBG, Badan Geologi KESDM", "url": "https://magma.esdm.go.id/", "catatan": "level aktivitas dan radius, diarsipkan Pusdalops BNPB"},
                 {"nama": "KRB Gunung Api PVMBG (edisi 2018) dan WorldPop", "url": "https://hub.worldpop.org", "catatan": "penduduk zona KRB III"}])
    if not any(r["lv"] >= 2 for r in rek.values()):
        _INFO["gunungapi"]["alasan"] = "Tidak ada gunung berlevel III (Siaga) atau IV (Awas) pada laporan terakhir di arsip level."
    return L


def _rinci_gunungapi(kab):
    r = _REK["gunungapi"][kab["kode"]]["gunung"]
    return {"id": "rinci", "judul": f"Gunung api dekat {kab['nama']} (kab/kota perkiraan)", "kolom": ["Gunung", "Level", "Laporan PVMBG", "Radius (km)"],
            "baris": [[nm, f"{ROMAWI[b['ke']]} ({NL[b['ke'] - 1]})", _tgl_penuh(b["tanggal"]), b.get("radius_km")] for nm, b in r],
            "catatan": "Level dan radius dari laporan terakhir gunung itu di arsip Pusdalops BNPB; tanggal laporan menunjukkan seberapa baru. Kab/kota dipilih dari pusat wilayah terdekat."}, None


BASI_HARI = 30


def _basi_gunung(r):
    return all((dt.date.fromisoformat(r["akhir"]) - dt.date.fromisoformat(b["tanggal"])).days > BASI_HARI for _, b in r["gunung"])


def _kata_gunungapi(kab, i, r=None):
    def satu_g(nm, b):
        if (dt.date.fromisoformat(r["akhir"]) - dt.date.fromisoformat(b["tanggal"])).days > BASI_HARI:
            return f"G. {nm}: laporan PVMBG terakhir {_tgl_penuh(b['tanggal'])} mencatat Level {ROMAWI[b['ke']]} (data basi, lebih dari {BASI_HARI} hari sebelum tanggal data {_tgl_penuh(r['akhir'])}; bukan status hari ini)"
        return f"G. {nm} Level {ROMAWI[b['ke']]} ({NL[b['ke'] - 1]}) menurut laporan PVMBG {_tgl_penuh(b['tanggal'])}"
    return "; ".join(satu_g(nm, b) for nm, b in r["gunung"]) + " (kab/kota perkiraan dari pusat wilayah terdekat)"


MODUL["gunungapi"] = {"nama": "Gunung Api", "muat": muat_gunungapi, "keluar": KELUAR_PB, "pemicu": [],
                      "status": lambda kab: (_REK["gunungapi"][kab["kode"]]["lv"], _REK["gunungapi"][kab["kode"]]),
                      "kata": _kata_gunungapi, "tahun": True, "ribuan": True, "basi": _basi_gunung,
                      "ket_status": lambda lv, r=None: "Data basi, bukan status hari ini" if r and _basi_gunung(r) else f"Level {ROMAWI[lv + 1]} menurut arsip PVMBG",
                      "catatan_status": " Level adalah laporan terakhir di arsip Pusdalops BNPB; tanggal laporan tiap gunung ada di tabel gunung api.", "sejak": lambda kab, L, i, r: "menurut laporan PVMBG terakhir (perkiraan kab/kota)",
                      "jiwa": "jiwa_krb3", "jiwa_judul": "Penduduk di KRB III gunung terdekat",
                      "jiwa_ket": "Penduduk dalam zona KRB III (WorldPop, paparan gunung api), bukan jumlah yang akan mengungsi.", "sumber": [],
                      "rinci": _rinci_gunungapi, "ket_judul": "Rincian belum tersedia",
                      "tanpa_ukur": "Level adalah penetapan PVMBG, bukan keluaran model; tidak ada uji balik yang berlaku untuk laporan ini."}


def pemicu_aktif(L, kab, spec):
    """indeks hari terakhir dengan pemicu > 0 di jendela [hari_lengkap .. akhir], atau None. Modul berstatus potret (spec["status"]):
    level >= 2 hari ini -> indeks hari_lengkap"""
    if "status" in spec:
        return (L["hari"].index(L["hari_lengkap"]) if L.get("hari_lengkap") in L["hari"] else len(L["hari"]) - 1) if spec["status"](kab)[0] >= 2 else None
    i0 = L["hari"].index(L["hari_lengkap"]) if L.get("hari_lengkap") in L["hari"] else len(L["hari"]) - 1
    for i in range(len(L["hari"]) - 1, i0 - 1, -1):
        if any((kab.get(k) or [None] * len(L["hari"]))[i] or 0 for k in spec["pemicu"]):
            return i
    return None


def runtun(L, kab, spec, i):
    """indeks awal runtun Siaga yang berakhir di i (hari tanpa data memutus runtun)"""
    a = i
    while "status" not in spec and a > 0 and any((kab.get(k) or [])[a - 1] or 0 for k in spec["pemicu"]):
        a -= 1
    return a


def kronologi(L, kab, spec, a, i):
    ms = L["metrik"]
    dari = max(0, min(a - 2, i - MAKS_KRONOLOGI + 1))
    baris = []
    for j in range(dari, len(L["hari"])):
        v = [kab.get(m["k"], [None] * len(L["hari"]))[j] for m in ms]
        if all(x is None for x in v):
            continue
        if "status" in spec:   # status harian tidak diarsipkan: hanya hari ini yang diketahui
            ket = (spec["ket_status"](*spec["status"](kab)) if "ket_status" in spec else NL[spec["status"](kab)[0]] + " (status hari ini)") if j == i else "–"
        else:
            sg = any((kab.get(k) or [])[j] or 0 for k in spec["pemicu"])
            ket = "Mulai Siaga" if j == a else "Siaga atau lebih" if sg else "Di bawah Siaga"
        if L.get("hari_lengkap") and L["hari"][j] > L["hari_lengkap"]:
            ket += " (berjalan)"
        baris.append([tgl(L["hari"][j])] + [_r(x) for x in v] + [ket])
    return {"id": "kronologi", "judul": f"Kronologi {kab['nama']}", "kolom": ["Tanggal"] + [m["label"] for m in ms] + ["Keadaan"], "baris": baris,
            "catatan": (f"Seri harian kab/kota dari laporan harian modul; hari sesudah {tgl(L['hari_lengkap'])} masih berjalan." if L.get("hari_lengkap") else "")
                       + (spec.get("catatan_status", " Status kekeringan harian belum diarsipkan, jadi kapan Siaga dimulai tidak diketahui.") if "status" in spec else "") or None}


def asal_banjir(kab):
    H = _baca("public/banjir/data/hulu.json")
    # nama persis (bukan norm): "Kota Bogor" tidak boleh menarik hulu Kab. Bogor
    d = next((x for x in (H or {}).get("daerah", []) if x["prov"] == kab["prov"] and x["kab"] == kab["nama"]), None)
    if not d:
        return None, f"Batas DAS hulu belum dihitung untuk {kab['nama']} (baru {len((H or {}).get('daerah', []))} daerah langganan banjir); telusur hulu belum tersedia."
    j = H["jendela"]
    rows = [[o["label"] + (", keluaran" if o["keluaran"] else ""),
             o["lalu_persen"], o["lalu_mm"], o["depan_persen"], o["km2"], o["konsesi_ha"] or None] for o in d["subdas"][:10]]
    jd = lambda w: f"{tgl(w[0])} s.d. {tgl(w[1])}" if w else "–"
    return ({"id": "asal", "judul": f"Asal hujan per sub-DAS hulu {d['kab']}",
             "kolom": ["Sub-DAS", f"Porsi hujan {jd(j['lalu'])} (%)", "Hujan (mm)", f"Porsi prakiraan {jd(j['depan'])} (%)", "Luas (km²)", "Konsesi (ha)"],
             "baris": rows,
             "catatan": d["vonis"] + f" DAS {rb(d['das_km2'])} km², {d['n_subdas']} sub-DAS; hutan hilang 2001 s.d. 2025 {rb(d['hutan']['hilang_ha'])} ha."
                        + " Jendela hujan adalah jendela terbaru saat laporan dibuat, bukan tanggal mulai Siaga. Konsesi per sub-DAS perkiraan scanline."},
            None)


def asal_udara(kab):
    A = _baca("public/udara/data/asal.json")
    k = (A or {}).get("kota", {}).get(kab["kode"])
    if not k:
        return None, f"Lintasan mundur asap belum tersedia untuk {kab['nama']}."
    pv = LAP.PROVINSI
    rows = [[f"Provinsi {pv.get(p, p)}", p_, "–"] for p, p_ in k.get("prov_asal", [])]   # porsi di kolom kedua: tetap terlihat di layar sempit
    rows += [[f"Kompleks api {o['id']}", o["persen"], f"{o['kab']}, {pv.get(o['prov'], o['prov'])}" + (" (gambut)" if o.get("gambut") else "")] for o in k.get("kompleks", [])]
    return {"id": "asal", "judul": f"Asal asap yang sampai di {kab['nama']}", "kolom": ["Asal", "Porsi (%)", "Lokasi"], "baris": rows,
            "catatan": k.get("kalimat")}, None


def ukur(modul):
    """model vs alat ukur: uji balik yang sudah terbit, apa adanya (termasuk yang buruk)"""
    if modul in ("banjir",):
        V = _baca("public/banjir/data/validasi.json")
        if not V:
            return None
        rows = []
        for j in ("banjir", "longsor"):
            r = (V.get(j) or {}).get("siaga")
            if r:
                ci = r.get("ci", {})
                f = lambda m: f"{round(r[m] * 100)}%" + (f" ({round(ci[m][0] * 100)}–{round(ci[m][1] * 100)}%)" if ci.get(m) else "")
                rows.append([f"Status Siaga {j}", f("pod"), f("far"), f("csi")])
        return {"id": "ukur", "judul": "Model vs catatan kejadian: ketepatan status Siaga", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": rows, "catatan": f"Uji balik {V.get('periode_uji')} terhadap kejadian DIBI BNPB per kabupaten-hari; hujan ERA5 sebagai prakiraan sempurna, jadi ini batas atas. Belum ada pos duga air yang terhubung."}
    if modul == "cuaca":
        V = _baca("public/banjir/data/cuaca_verifikasi.json")
        r = ((V or {}).get("kita") or {}).get("lead", {}).get("1")
        if not r:
            return None
        p = lambda x: "–" if x is None else f"{round(x * 100)}%"
        return {"id": "ukur", "judul": "Model vs catatan kejadian: hujan lebat 1 hari ke depan", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": [[f"Hujan ≥ {V['kita'].get('ambang_mm')} mm/hari", p(r.get("pod")), p(r.get("far")), p(r.get("csi"))]],
                "catatan": f"Pasangan provinsi-hari {tgl(V['kita']['periode'][0])} s.d. {tgl(V['kita']['periode'][1])} terhadap kejadian DIBI BNPB."}
    if modul == "kekeringan":
        U = _baca("public/data/kekeringan_ujibalik.json")
        kj = (U or {}).get("kejadian") or {}
        r = ((kj.get("aturan") or {}).get("siaga") or {}).get("semua")
        if not r:
            return None
        p = lambda x: "–" if x is None else f"{round(x * 100)}%"
        pd = kj.get("periode_data") or ["", ""]
        return {"id": "ukur", "judul": "Model vs catatan kejadian: aturan SPI-3 tingkat Siaga", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan", "Ketepatan acak"],
                "baris": [[f"SPI-3 ≤ −1,5, {rb(r['n'])} kabupaten-bulan", p(r.get("pod")), p(r.get("far")), p(r.get("csi")), p(r.get("csi_acak"))]],
                "catatan": f"Kejadian kekeringan DIBI BNPB per kabupaten-bulan {pd[0]} s.d. {pd[1]}. Yang diuji aturan SPI-3 saja; status di laporan ini menggabungkan SPI-3 dengan kelembapan tanah. Kekeringan kecil jarang tercatat DIBI, jadi peringatan tanpa kejadian tampak tinggi."}
    if modul == "longsor":
        return _ukur_longsor()
    if modul == "udara":
        P = _baca("public/udara/data/prakiraan.json")
        m = ((P or {}).get("galat") or {}).get("metar")
        if not m:
            return None
        sl = m.get("selang", {})
        f = lambda k: f"{round(m[k] * 100)}%" + (f" ({round(sl[k][0] * 100)}–{round(sl[k][1] * 100)}%)" if sl.get(k) else "")
        kor = P.get("koreksi") or {}
        return {"id": "ukur", "judul": "Model CAMS vs alat ukur: jarak pandang METAR bandara", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": [[f"Asap tebal di {m.get('n_bandara')} bandara, {m.get('n')} hari-bandara", f("hit"), f("far"), f("csi")]],
                "catatan": f"{m.get('definisi') or 'Analisis CAMS dibandingkan dengan jarak pandang METAR'}. Ambang uji lebih rendah dari ambang Siaga laporan ini. "
                           f"Rentang 95% bootstrap. Koreksi stasiun PM2,5: {kor.get('metode') or kor.get('status') or 'belum ada'}."}
    return None


def dampak(L, kab, spec, a, i):
    k = spec.get("jiwa")
    if not k or k not in kab:
        return None
    m = next(x for x in L["metrik"] if x["k"] == k)
    dari = max(0, i - MAKS_KRONOLOGI + 1) if "status" in spec else a   # stok harian: tampilkan 14 hari terakhir
    rows = [[tgl(L["hari"][j]), _r(kab[k][j])] for j in range(dari, len(L["hari"])) if kab[k][j] is not None]
    if not rows:
        return None
    return {"id": "dampak", "judul": spec.get("jiwa_judul", m["label"]) + f" di {kab['nama']}", "kolom": ["Tanggal", f"{m['label']} ({m['satuan']})"], "baris": rows, "catatan": spec["jiwa_ket"]}


def satu(modul, L, kab, i, dibuat):
    spec = MODUL[modul]
    a = runtun(L, kab, spec, i)
    kp = kab["prov"]
    ms = {m["k"]: m for m in L["metrik"]}
    lv, rek = spec["status"](kab) if "status" in spec else (2, None)
    nilai = spec["kata"](kab, i, rek) if "status" in spec else spec["kata"](kab, i)
    pv = LAP.PROVINSI.get(kp, kp)
    # a == 0: runtun sudah berjalan sejak awal seri laporan modul, awal sebenarnya tidak diketahui; status potret: hanya "per" hari ini
    sejak = spec["sejak"](kab, L, i, rek) if "sejak" in spec else f"per {tgl(L['hari'][i])}" if "status" in spec else ("sedikitnya sejak " if a == 0 else "sejak ") + tgl(L["hari"][a])
    hip = spec["hipotesis"]() if "hipotesis" in spec else None   # model tanpa uji balik lolos: tampil sebagai hipotesis, bukan status
    tingkat = "waspada" if hip else "awas" if lv >= 3 else "siaga"
    label = "Hipotesis" if hip else NL[max(lv, 2)]
    if "basi" in spec and spec["basi"](rek):   # laporan sumber terlalu tua: bukan status hari ini
        tingkat, label = "info", "Data basi"
    sorot = [{"tingkat": tingkat, "prov": kp, "judul": f"{kab['nama']}: {label} {sejak}",
              "teks": f"{nilai}." if spec.get("tahun") else f"{nilai} pada {tgl(L['hari'][i])}."}]
    if hip:
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Model belum teruji", "teks": hip})
    tb = [kronologi(L, kab, spec, a, i)]
    if modul == "banjir":
        t, ket = asal_banjir(kab)
    elif modul == "udara":
        t, ket = asal_udara(kab)
    elif modul == "kekeringan":
        t, ket = None, "Kekeringan meteorologis tidak punya sumber tunggal seperti hulu sungai atau asap; telusur asal tidak berlaku."
    elif "rinci" in spec:
        t, ket = spec["rinci"](kab)
    else:
        t, ket = None, None
    if t:
        tb.append(t)
    if ket:
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Asal tidak berlaku" if modul == "kekeringan" else spec.get("ket_judul", "Asal belum tersedia"), "teks": ket})
    dm = dampak(L, kab, spec, a, i)
    uk = ukur(modul)
    for f in (uk, dm):
        if f:
            tb.append(f)
    if not uk and spec.get("tanpa_ukur"):
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Model vs alat ukur tidak berlaku", "teks": spec["tanpa_ukur"]})
    if not dm:
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Dampak jiwa belum dihitung",
                      "teks": spec["jiwa_ket"] if not spec.get("jiwa") else "Laporan modul belum memuat jiwa terpapar untuk kab/kota ini pada hari Siaga."})
    sorot += [s for s in L.get("sorot", []) if s.get("prov") == kp and s.get("tingkat") in ("awas", "siaga")][:3]
    sorot.append({"tingkat": "info", "judul": "Batasan", "teks": " ".join(BATASAN_MODUL.get(modul, BATASAN_UMUM))})
    for x in tb:
        if x.get("catatan") is None:
            x.pop("catatan", None)
    d = LAP.susun(modul, f"Laporan Kejadian {spec['nama']}: {kab['nama']}, {pv}", L["hari"], L["metrik"], L["nasional"], {kp: L["prov"][kp]}, [kab],
                  cutoff=L["cutoff"], hari_lengkap=L["hari_lengkap"], sorot=sorot[:8], tambahan=tb, sumber=L.get("sumber", []) + [x for x in spec["sumber"] if x["nama"] not in {y.get("nama") for y in L.get("sumber", [])}], dibuat=dibuat)
    d["fokus"] = kab["kode"]
    entri = {"modul": modul, "kode": kab["kode"], "prov": kp, "prov_nama": pv, "kab": kab["nama"], "judul": d["judul"], "mulai": None if "status" in spec else L["hari"][a], "terakhir": L["hari"][i],   # status potret: awal tidak diketahui
             "nilai": nilai, "tingkat": tingkat, "url": f"/kejadian.html?b={modul}&k={kab['kode']}"}
    if spec.get("keluar"):
        entri["berkas"] = f"/data/laporan_kejadian/{modul}-{kab['kode']}.json"   # modul baru: bukan di <dir>/kejadian
    if hip:
        entri["hipotesis"] = True
    if "basi" in spec and spec["basi"](rek):
        entri["basi"] = True
    return d, entri


def bangun(modul, L, dibuat):
    """-> [(dict laporan, entri index)] untuk semua kab yang pemicunya aktif"""
    spec = MODUL[modul]
    out = []
    _MODE.update(tahun=bool(spec.get("tahun")), ribuan=bool(spec.get("ribuan")))
    try:
        for kab in L.get("kab", []):
            i = pemicu_aktif(L, kab, spec)
            if i is not None:
                out.append(satu(modul, L, kab, i, dibuat))
    finally:
        _MODE.update(tahun=False, ribuan=False)
    return out


def jalankan(modul, dibuat=None):
    spec = MODUL[modul]
    L = spec["muat"]() if "muat" in spec else _baca(spec["laporan"])
    if not L or LAP.periksa(L):
        print(f"laporan_kejadian {modul}: laporan modul tidak ada atau tidak sah, dilewati", file=sys.stderr)
        return 0
    dibuat = dibuat or dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00")
    kel = os.path.join(AKAR, spec.get("keluar") or os.path.join(spec["dir"], "kejadian"))
    os.makedirs(kel, exist_ok=True)
    # satu index per modul: banjir.yml, lintas.yml (cuaca), dan udara.yml terbit dari cache masing-masing, index bersama akan saling menimpa
    jalur_idx = os.path.join(kel, f"index-{modul}.json")
    idx = _baca(os.path.relpath(jalur_idx, AKAR)) or {"versi": "kejadian/1", "laporan": []}
    hasil = bangun(modul, L, dibuat)
    baru = {(e["modul"], e["kode"]) for _, e in hasil}
    batas = (dt.date.fromisoformat(L["hari"][-1]) - dt.timedelta(days=SIMPAN_HARI)).isoformat()
    tetap = []
    for e in idx.get("laporan", []):
        if e["modul"] != modul:
            tetap.append(e)
        elif (e["modul"], e["kode"]) not in baru:
            f = os.path.join(kel, f"{e['modul']}-{e['kode']}.json")
            if e["terakhir"] >= batas and os.path.exists(f):
                tetap.append(dict(e, aktif=False))
            elif os.path.exists(f):
                os.remove(f)
    for d, e in hasil:
        LAP.tulis(modul, d, os.path.join(kel, f"{modul}-{e['kode']}.json"))
        tetap.append(dict(e, aktif=True))
    tetap.sort(key=lambda e: (not e.get("aktif"), e["terakhir"] < L["hari"][-1], e["modul"], e["prov"], e["kab"]))
    out = {"versi": "kejadian/1", "dibuat": dibuat, "laporan": tetap}
    if spec.get("keluar"):   # modul baru: bagian kosong ditulis dengan alasannya
        info = _INFO.get(modul, {})
        out["tak_terpetakan"] = info.get("tak_terpetakan", 0)
        if not hasil:
            out["kosong"] = info.get("alasan") or f"Tidak ada kab/kota yang memenuhi pemicu pada {_tgl_penuh(L['hari_lengkap'])} (hari lengkap terakhir sumber)."
    LAP._simpan.simpan_json(jalur_idx, out) if LAP._simpan else json.dump(out, open(jalur_idx, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"laporan_kejadian {modul}: {len(hasil)} aktif, {sum(1 for e in tetap if e['modul'] == modul and not e.get('aktif'))} arsip", file=sys.stderr)
    return len(hasil)


def uji_pb(L):
    """PB-23: gempa, longsor, pesisir, gunungapi dengan sumber palsu (_FIX); tiap bagian kosong harus punya alasan"""
    import copy
    tak_aman = lambda d: not re.search(r"\baman\b", json.dumps(d, ensure_ascii=False).lower())
    kode = {"1101": {"kunci_nama": "11|Aceh Selatan", "prov": "11", "nama": "Kab. Aceh Selatan", "pusat": [3.1, 97.4]},
            "1102": {"kunci_nama": "11|Aceh Tenggara", "prov": "11", "nama": "Kab. Aceh Tenggara", "pusat": [3.5, 97.7]},
            "3508": {"kunci_nama": "35|Lumajang", "prov": "35", "nama": "Kab. Lumajang", "pusat": [-8.1, 113.2]},
            "3509": {"kunci_nama": "35|Jember", "prov": "35", "nama": "Kab. Jember", "pusat": [-8.2, 113.7]},
            "3401": {"kunci_nama": "34|Sleman", "prov": "34", "nama": "Kab. Sleman", "pusat": [-7.7, 110.4]}}
    try:
        _FIX["public/data/kemitraan/kode.json"] = kode
        # gempa: pemicu M 5 atau lebih pada hari lengkap atau sesudahnya
        msg = [{"k": "kejadian", "label": "Gempa M 4 atau lebih", "satuan": "kejadian", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
               {"k": "m5", "label": "Gempa M 5 atau lebih", "satuan": "kejadian", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
               {"k": "mmaks", "label": "M terbesar", "satuan": "M", "agregat": "maks", "arah": "netral", "desimal": 1}]
        hari = [(dt.date(2026, 11, 1) + dt.timedelta(days=j)).isoformat() for j in range(10)]
        z = [0] * 10
        kA = {"prov": "53", "kode": "5301", "nama": "Kupang", "kejadian": z[:9] + [2], "m5": z[:9] + [1], "mmaks": [None] * 9 + [5.4]}
        kB = {"prov": "53", "kode": "5302", "nama": "Sikka", "kejadian": [1] * 10, "m5": z, "mmaks": [4.1] * 10}
        nas, prv = _agregat(msg, [kA, kB], 10)
        Lg = LAP.susun("gempa", "Laporan Harian Gempa Bumi", hari, msg, nas, prv, [kA, kB], cutoff="x", hari_lengkap=hari[8], dibuat="x",
                       tambahan=[{"id": "m5", "judul": "Gempa M≥5 terbaru", "kolom": ["Waktu", "M", "Wilayah"], "baris": [["10 Nov", 5.4, "laut dekat Kupang, NTT"], ["9 Nov", 5.1, "Maluku"]]}])
        assert LAP.periksa(Lg) == [], LAP.periksa(Lg)
        _FIX["public/gempa/data/laporan.json"] = Lg
        h = bangun("gempa", Lg, "x")
        assert [e["kode"] for _, e in h] == ["5301"] and h[0][1]["nilai"] == "1 gempa M 5 atau lebih, M terbesar 5,4", h[0][1]["nilai"]
        d, e = h[0]
        assert LAP.periksa(d) == [] and e["berkas"] == "/data/laporan_kejadian/gempa-5301.json" and "hipotesis" not in e, e
        assert next(t for t in d["tambahan"] if t["id"] == "rinci")["baris"] == [["10 Nov", 5.4, "laut dekat Kupang, NTT"]]    # hanya gempa yang menyebut Kupang
        assert any(x["judul"] == "Model vs alat ukur tidak berlaku" for x in d["sorot"]) and tak_aman(d)
        # longsor: model GAGAL uji balik -> hipotesis (tingkat waspada), kecamatan di kab tak dikenal dihitung tak_terpetakan
        _FIX["public/longsor/data/kerentanan.json"] = {"kec": ["11|Aceh Selatan|Bakongan", "11|Aceh Selatan|Kluet", "99|Tak Ada|X"]}
        _FIX["public/longsor/data/nowcast.json"] = {"dibuat": "2026-11-14T16:49+07:00", "jendela_akhir": "2026-11-13", "tinggi": [[0, 0.8, 1.9], [2, 0.7, 1.1]], "sedang": [[1, 0.4, 0.9]]}
        _FIX["public/longsor/data/uji_balik.json"] = {"vonis": "GAGAL", "sasaran": "x", "auc": {"model": 0.7, "klim": 0.78, "hujan": 0.68},
                                                      "kelas": {"tinggi": {"tp": 10, "fp": 90, "fn": 100, "pod": 0.09, "far": 0.9}}}
        Ll = muat_longsor()
        assert LAP.periksa(Ll) == [] and _INFO["longsor"]["tak_terpetakan"] == 1, (LAP.periksa(Ll), _INFO)
        h = bangun("longsor", Ll, "x")
        d, e = h[0]
        assert [x["kode"] for _, x in h] == ["1101"] and e["tingkat"] == "waspada" and e["hipotesis"] is True and "Hipotesis" in d["sorot"][0]["judul"], e
        assert [t["id"] for t in d["tambahan"]] == ["kronologi", "rinci", "ukur"] and tak_aman(d)
        assert d["tambahan"][1]["baris"][0][2:] == ["0,8", "1,9"] and "0,70" in d["tambahan"][2]["catatan"] and "tidak lolos" in d["tambahan"][2]["catatan"], d["tambahan"]
        assert "tidak lolos uji balik (luas di bawah kurva model 0,70, klimatologi 0,78)" in d["sorot"][1]["teks"], d["sorot"][1]
        assert e["nilai"] == "1 kecamatan bahaya tinggi dan 1 kecamatan bahaya sedang" and "pada pada" not in json.dumps(d), e["nilai"]
        assert not [w for w in re.findall(r"\b[A-Z]{4,}\b", json.dumps([x["teks"] for x in d["sorot"]] + [t.get("catatan") for t in d["tambahan"]])) if w not in ("BNPB", "BPBD", "PVMBG")], "kata huruf kapital"
        assert d["tambahan"][0]["baris"][-1][-1] == "Hipotesis bahaya tinggi (bukan status)", d["tambahan"][0]["baris"]
        _FIX["public/longsor/data/uji_balik.json"]["vonis"] = "LOLOS"      # lolos: status biasa, bukan hipotesis
        d, e = bangun("longsor", muat_longsor(), "x")[0]
        assert e["tingkat"] == "siaga" and "hipotesis" not in e
        # pesisir: kejadian rob pada hari terakhir data memicu; rekap basi dikosongkan dengan alasan
        ab = {"situs": [{"nama": "Sayung", "kab": "Kab. Aceh Selatan", "laju_median": -17.6, "abrasi_nyata": 1, "akresi_nyata": 0}]}
        _FIX["public/pesisir/data/abrasi.json"] = ab
        _FIX["public/pesisir/data/rob_kejadian.json"] = {"dibuat": "2026-11-01T19:02+07:00", "rentang": ["2012-03-10", "2026-11-01"],
                                                         "kejadian": [{"t": "2026-11-01", "k": "11|Aceh Selatan"}, {"t": "2026-10-30", "k": "11|Aceh Selatan"}, {"t": "2026-11-01", "k": "11|Tidak Ada"}]}
        Lp = muat_pesisir()
        assert LAP.periksa(Lp) == [] and _INFO["pesisir"]["tak_terpetakan"] == 1 and _INFO["pesisir"]["alasan"] is None
        d, e = bangun("pesisir", Lp, "x")[0]
        assert e["kode"] == "1101" and next(t for t in d["tambahan"] if t["id"] == "rinci")["baris"] == [["Sayung", -17.6, 1, 0]] and tak_aman(d)
        _FIX["public/pesisir/data/rob_kejadian.json"].update(kejadian=[{"t": "2026-06-20", "k": "11|Aceh Selatan"}], rentang=["2012-03-10", "2026-06-20"])
        Lp = muat_pesisir()
        assert bangun("pesisir", Lp, "x") == [] and "20 Jun 2026" in _INFO["pesisir"]["alasan"], _INFO["pesisir"]
        # gunung api: level III atau IV memicu; kab = pusat terdekat dalam provinsi yang sama; level II tidak
        _FIX["public/gunungapi/data/riwayat_level.json"] = {"sumber": "x", "baris": [{"gunung": "Semeru", "tanggal": "2026-08-18", "ke": 3, "radius_km": 5.0},
                                                                                     {"gunung": "Merapi", "tanggal": "2026-08-20", "ke": 2, "radius_km": 3.0}]}
        _FIX["public/gunungapi/data/gunung.json"] = {"Semeru": {"prov": "Jawa Timur", "lat": -8.1, "lon": 112.9}, "Merapi": {"prov": "DI Yogyakarta", "lat": -7.54, "lon": 110.44}}
        _FIX["public/gunungapi/data/paparan.json"] = {"gunung": [{"nama": "Semeru", "zona": {"III": {"penduduk": 9304}}}]}
        Lq = muat_gunungapi()
        assert LAP.periksa(Lq) == [], LAP.periksa(Lq)
        h = bangun("gunungapi", Lq, "x")
        d, e = h[0]
        assert [x["kode"] for _, x in h] == ["3508"] and e["tingkat"] == "siaga" and "Level III (Siaga)" in e["nilai"] and "18 Agu 2026" in e["nilai"], e
        assert next(t for t in d["tambahan"] if t["id"] == "dampak")["baris"][-1][1] == "9.304" and tak_aman(d)
        _FIX["public/gunungapi/data/riwayat_level.json"]["baris"][0]["ke"] = 4
        assert bangun("gunungapi", muat_gunungapi(), "x")[0][1]["tingkat"] == "awas"
        # laporan lebih tua dari 30 hari dari tanggal data: data basi, bukan status; tanggal selalu dengan tahun; ribuan titik
        _FIX["public/gunungapi/data/riwayat_level.json"]["baris"][0]["tanggal"] = "2026-01-05"
        _FIX["public/gunungapi/data/riwayat_level.json"]["baris"][1].update(tanggal="2026-08-20", ke=3)
        _FIX["public/gunungapi/data/paparan.json"]["gunung"][0]["zona"]["III"]["penduduk"] = 12345
        d, e = next((d, e) for d, e in bangun("gunungapi", muat_gunungapi(), "x") if e["kode"] == "3508")
        assert e["basi"] is True and e["tingkat"] == "info" and "data basi" in e["nilai"] and "5 Jan 2026" in e["nilai"] and "bukan status hari ini" in e["nilai"], e
        assert d["sorot"][0]["judul"].startswith("Kab. Lumajang: Data basi") and "perkiraan" in e["nilai"], d["sorot"][0]
        kr = d["tambahan"][0]["baris"]
        assert all(re.match(r"\d+ \w+ 2026$", r[0]) for r in kr) and kr[-1][2] == "12.345" and kr[-1][-1] == "Data basi, bukan status hari ini", kr[-1]
        # BATASAN_MODUL memuat butir yang menolak klaim penetapan status; modul baru tidak memakai batasan umum
        assert all(m in BATASAN_MODUL and BATASAN_MODUL[m] for m in ("gempa", "longsor", "pesisir", "gunungapi"))
    finally:
        _FIX.clear()
        _REK.clear()
        _INFO.clear()


def uji():
    import copy
    hari = [(dt.date(2026, 10, 1) + dt.timedelta(days=j)).isoformat() for j in range(10)]
    ms = [{"k": "banjir_sa", "label": "Siaga atau awas banjir", "satuan": "kecamatan", "utama": True, "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
          {"k": "longsor_sa", "label": "Siaga atau awas longsor", "satuan": "kecamatan", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
          {"k": "penduduk", "label": "Penduduk terpapar", "satuan": "jiwa", "agregat": "maks", "arah": "naik_buruk", "desimal": 0}]
    seri = lambda *v: list(v) + [None] * (10 - len(v))
    kA = {"prov": "96", "kode": "9605", "nama": "Maybrat", "banjir_sa": seri(0, 0, 0, 0, 0, 1, 2, 2, 0, 3), "longsor_sa": [0] * 10, "penduduk": seri(0, 0, 0, 0, 0, 900, 1800, 1800, 0, 2500)}
    kB = {"prov": "96", "kode": "9601", "nama": "Sorong", "banjir_sa": [0] * 10, "longsor_sa": [0] * 10, "penduduk": [0] * 10}
    L = LAP.susun("banjir", "Laporan Harian Banjir", hari, ms, {k: [max(a, b) for a, b in zip(kA[k], kB[k])] for k in ("banjir_sa", "longsor_sa")} | {"penduduk": [a + b for a, b in zip(kA["penduduk"], kB["penduduk"])]},
                  {"96": {k: kA[k] for k in ("banjir_sa", "longsor_sa", "penduduk")}}, [kA, kB], cutoff="2026-10-10T02:30+07:00", hari_lengkap=hari[8], dibuat="x")
    kab = lambda X: next(k for k in X["kab"] if k["kode"] == "9605")   # susun mengurutkan kab menurut kode
    assert LAP.periksa(L) == [], LAP.periksa(L)
    h = bangun("banjir", L, "2026-10-10T03:00+07:00")
    assert [e["kode"] for _, e in h] == ["9605"], [e for _, e in h]                     # Sorong tanpa Siaga tidak dilaporkan
    d, e = h[0]
    assert LAP.periksa(d) == [] and d["fokus"] == "9605", LAP.periksa(d)
    assert e["mulai"] == hari[9] and e["terakhir"] == hari[9], e                      # hari 8 = 0 memutus runtun
    kr = next(t for t in d["tambahan"] if t["id"] == "kronologi")
    assert kr["baris"][-1][0] == "10 Okt" and kr["baris"][-1][-1] == "Mulai Siaga (berjalan)", kr["baris"][-1]
    assert all(not re.match(r"\d{4}-\d\d", str(r[0])) for r in kr["baris"]), "tanggal mentah ISO di kronologi"
    dm = next(t for t in d["tambahan"] if t["id"] == "dampak")
    assert dm["baris"] == [["10 Okt", 2500]], dm["baris"]
    assert d["sorot"][0]["tingkat"] == "siaga" and "Siaga sejak 10 Okt" in d["sorot"][0]["judul"]
    assert e["nilai"] == "3 kecamatan Siaga/Awas banjir", e["nilai"]
    assert any(s["judul"] == "Batasan" for s in d["sorot"])
    # runtun tanpa putus
    L2 = copy.deepcopy(L)
    kab(L2)["banjir_sa"][8] = 1
    L2["prov"]["96"]["banjir_sa"][8] = 1
    L2["nasional"]["banjir_sa"][8] = 1
    d2, e2 = bangun("banjir", L2, "x")[0]
    assert e2["mulai"] == hari[5], e2
    # pemicu di luar jendela hari_lengkap.. (Siaga lama) tidak memicu
    L3 = copy.deepcopy(L)
    kab(L3)["banjir_sa"][9] = 0
    assert bangun("banjir", L3, "x") == []
    # laporan rusak ditolak oleh mesin yang sama
    x = copy.deepcopy(d)
    x["fokus"] = "0000"
    assert any("fokus" in g for g in LAP.periksa(x))
    # status potret (kekeringan): pemicu dari level hari ini, awal tidak diketahui, kronologi tanpa status lampau
    lama = dict(_WIL)
    _WIL["kab"] = {"96|Maybrat": {"lv": 3, "jiwa": [1200, 1100, 900]}, "96|Sorong": {"lv": 1, "jiwa": [5, 0, 0]}}
    try:
        hk = bangun("kekeringan", L, "x")
        assert [e["kode"] for _, e in hk] == ["9605"], [e for _, e in hk]
        dk, ek = hk[0]
        assert LAP.periksa(dk) == [] and ek["mulai"] is None and ek["tingkat"] == "awas" and ek["terakhir"] == L["hari_lengkap"], ek
        assert ek["nilai"] == "Status Awas (SPI-3 dan kelembapan tanah), 1.100 jiwa di wilayah Siaga atau lebih", ek["nilai"]
        kr = next(t for t in dk["tambahan"] if t["id"] == "kronologi")
        hl = tgl(L["hari_lengkap"])
        assert all(r[-1].replace(" (berjalan)", "") == ("Awas (status hari ini)" if r[0] == hl else "–") for r in kr["baris"]), kr["baris"]
        assert dk["sorot"][0]["tingkat"] == "awas" and dk["sorot"][0]["judul"] == f"Maybrat: Awas per {hl}", dk["sorot"][0]
    finally:
        _WIL.clear()
        _WIL.update(lama)
    uji_pb(L)
    assert rb(4542) == "4.542" and rb(17693) == "17.693"
    assert norm("Kab. Tanjung Jabung Timur") == "tanjung jabung timur" and norm("Kota Serang") == "serang"
    print("laporan_kejadian.py uji: lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        for m in a or [m for m in MODUL if "muat" in MODUL[m] or os.path.exists(os.path.join(AKAR, MODUL[m]["laporan"]))]:
            jalankan(m)
