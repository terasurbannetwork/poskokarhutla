"""Perakit muatan ringkas per bencana: public/data/ringkas/<id>.json (paritas-bencana DESAIN-TEKNIS 6.1, PB-19).

Hanya membaca berkas yang sudah ada di public/ (tanpa jaringan). Angka antarsumber tidak dijumlah,
nilai tak diketahui = null, tanpa nama orang atau koordinat. stdlib saja.

Sumber kesegaran per bencana (kunci waktu: "diperbarui" bila ada, selain itu "dibuat"; ambang jam dari bencana.json):
  karhutla   titik=data/meta.json, presiden=data/presiden/semua.json, berita, dampak (himawari /api dilewati)
  banjir     banjir=banjir/data/wilayah_hari.json (GANTI dari meta.json yang tak ditulis ulang)
  pesisir    abrasi, rob, pasut, gelombang (berkas banjir/ dan pesisir/ apa adanya)
  cuaca      cuaca=banjir/data/cuaca_sepekan.json (GANTI dari cuaca_meta.json), berita_cuaca (/api nowcast dilewati)
  gempa      gempa_laporan=gempa/data/laporan.json (TAMBAH, harian dari gempa.yml; /api/gempa/terbaru dilewati), berita_gempa
  udara      kualitas=udara/data/prakiraan.json, berita_udara
  gunungapi  gunungapi=banjir/data/gunungapi_status.json, berita_gunungapi
  kekeringan kekeringan=kekeringan/data/gdo.json (GANTI dari kekeringan_meta.json; lintas.yml harian), berita_kekeringan
  longsor    nowcast=longsor/data/nowcast.json (TAMBAH; lintas.yml harian)
Berkas statis (model_guncangan, vs30, batimetri, emsc_arsip, ...) bukan tanda basi dan tidak dipakai.

Pakai:  python3 scripts/umum/pb_ringkas.py buat   tulis satu berkas per bencana di public/bencana.json
        python3 -I scripts/umum/pb_ringkas.py uji self-check
"""
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bencana as _b  # noqa: E402

BATAS = 100 * 1024
# blok laporan_berkala ditunda: DESAIN-TEKNIS laporan-berkala belum menetapkan nama kunci (LB-01); jangan dikarang
BERKALA = {"status": "ditunda", "alasan": "nama kunci angka belum ditetapkan di data/kajian-bnpb/laporan-berkala (LB-01)"}


def _baca(akar, jalur):
    try:
        with open(os.path.join(akar, "public", jalur.lstrip("/")), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _waktu(s):
    try:
        t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def _iso(t):
    return t.astimezone(timezone.utc).isoformat(timespec="seconds")


def _stempel(d):
    # diperbarui = kesegaran sebenarnya; dibuat bisa tanggal kalibrasi tetap (mis. dart.json)
    return _waktu(d.get("diperbarui") or d.get("dibuat")) if isinstance(d, dict) else None


# Ambang umur bacaan (jam) untuk sumber di luar sumber_status. Status ALGORITMA paritas-bencana 7.1:
# segar <= ambang, basi <= 3 x ambang, mati lebih dari itu. Angka dari sumber mati ditulis null.
# Batas logbook dan peringatan: ALGORITMA 7.2 [BAWAAN SEMENTARA] (logbook 3 hari, peringatan lantai per jam 6 jam).
LOGBOOK_AMBANG_JAM = 72
PERINGATAN_AMBANG_JAM = 6
# registri menunjuk berkas yang tak ditulis ulang workflow-nya: ganti jalur (ambang tetap) atau tambah sumber statis-baca
GANTI = {("banjir", "banjir"): "/banjir/data/wilayah_hari.json",
         ("cuaca", "cuaca"): "/banjir/data/cuaca_sepekan.json",
         ("kekeringan", "kekeringan"): "/kekeringan/data/gdo.json"}
TAMBAH = {"gempa": [["gempa_laporan", "/gempa/data/laporan.json", 30]],
          "longsor": [["nowcast", "/longsor/data/nowcast.json", 30]]}
URUT = ("segar", "basi", "mati")


def _status(umur, ambang_jam):
    """umur menit -> segar (<= 1x batas), basi (<= 3x), mati (> 3x atau tak ada stempel). ALGORITMA 7.1."""
    if umur is None:
        return "mati"
    if ambang_jam is None:
        return "tanpa_ambang"
    return "segar" if umur <= ambang_jam * 60 else "basi" if umur <= 3 * ambang_jam * 60 else "mati"


# kunci angka -> (sumber, satuan, arti); arti titik_meta jujur: meta.json tak menyebut periode
ARTI = {
    "titik_meta": ("titik", "titik", "jumlah titik di berkas meta.json terakhir (periode tidak dinyatakan berkas)"),
    "kluster_meta": ("titik", "kluster", "jumlah kluster di berkas meta.json terakhir (periode tidak dinyatakan berkas)"),
    "gunung_level_3_dan_4": ("gunungapi", "gunung", "gunung api berstatus level 3 (Siaga) atau 4 (Awas) pada laporan MAGMA terakhir"),
    "kejadian_30h": ("logbook", "kejadian", "kejadian dilaporkan BPBD ke Pusdalops yang mulai dalam 30 hari terakhir; bukan sensus"),
    "peringatan_aktif": ("peringatan", "peringatan", "peringatan nowcast BMKG berstatus aktif"),
}


def _tanpa_data(t):
    # ALGORITMA 7.1: sumber mati tidak pernah diam dan tidak pernah 0; tanggal = stempel data terakhir (WIB)
    if not t:
        return "data tidak tersedia"
    return "data tidak tersedia sejak " + t.astimezone(timezone(timedelta(hours=7))).strftime("%d-%m-%Y %H.%M WIB")


def rakit(b, akar=AKAR, kini=None):
    kini = kini or datetime.now(timezone.utc)
    sumber, berkas, terburuk, terbaru = [], {}, 0, None

    def catat(id_, d, ambang_jam, hitung):
        nonlocal terburuk, terbaru
        t = _stempel(d)
        umur = round((kini - t).total_seconds() / 60) if t else None
        st = _status(umur, ambang_jam)
        x = {"id": id_, "waktu": _iso(t) if t else None, "umur_menit": umur, "batas_jam": ambang_jam, "status_sumber": st}
        if st == "mati":
            x["keterangan"] = _tanpa_data(t)
        sumber.append(x)
        berkas[id_] = (d, t, st)
        if hitung and st in URUT:  # "basi" bencana = status terburuk sumber berambang yang dipakainya
            terburuk = max(terburuk, URUT.index(st))
        if hitung and t and (terbaru is None or t > terbaru):
            terbaru = t

    for id_, jalur, ambang_jam in b["sumber_status"] + TAMBAH.get(b["id"], []):
        jalur = GANTI.get((b["id"], id_), jalur)
        if jalur.startswith("/api/"):
            continue  # ponytail: sumber hidup lewat Worker tidak dibaca di pipeline; tambah bila ada salinan statis
        catat(id_, _baca(akar, jalur), ambang_jam, True)
    # logbook dan peringatan: masuk daftar sumber tapi tidak menentukan basi bencana (hanya angka dari keduanya)
    catat("logbook", _baca(akar, "/data/logbook_kejadian.json"), LOGBOOK_AMBANG_JAM, False)
    catat("peringatan", _baca(akar, "/data/peringatan.json"), PERINGATAN_AMBANG_JAM, False)

    nilai = {k: None for k in ("kejadian_30h", "peringatan_aktif")}
    d, _, _ = berkas.get("titik", (None, None, None))
    if b["id"] == "karhutla" and d:
        nilai["titik_meta"], nilai["kluster_meta"] = d.get("jumlah_titik"), d.get("jumlah_kluster")
    d, _, _ = berkas.get("gunungapi", (None, None, None))
    if b["id"] == "gunungapi" and d and isinstance(d.get("jumlah_level"), dict):
        nilai["gunung_level_3_dan_4"] = d["jumlah_level"].get("3", 0) + d["jumlah_level"].get("4", 0)
    lb = berkas["logbook"][0]
    if lb:  # laporan Pusdalops, bukan sensus
        batas = (kini - timedelta(days=30)).date().isoformat()
        nilai["kejadian_30h"] = sum(1 for k in lb.get("kejadian", [])
                                    if _b.JENIS_LOGBOOK_KE_BENCANA.get(k.get("jenis")) == b["id"] and str(k.get("mulai") or "") >= batas)
    pr = berkas["peringatan"][0]
    if b["id"] == "cuaca" and pr:
        nilai["peringatan_aktif"] = sum(1 for x in pr.get("nowcast", []) if x.get("aktif"))
    angka, meta = {}, {}
    for k, v in nilai.items():
        sid, satuan, arti = ARTI[k]
        _, t, st = berkas.get(sid, (None, None, "mati"))
        angka[k] = None if st == "mati" else v  # sumber mati: angka tidak ditampilkan
        meta[k] = {"sumber": sid, "waktu": _iso(t) if t else None, "satuan": satuan, "arti": arti, "status_sumber": st}
        if st == "mati":
            meta[k]["keterangan"] = _tanpa_data(t)
    # dibuat = waktu rakit berkas ini; data_sampai = waktu data terbaru dari sumber yang dipakai (bisa jauh lebih tua)
    return {"versi": 1, "bencana": b["id"], "dibuat": _iso(kini), "data_sampai": _iso(terbaru) if terbaru else None,
            "sumber": sumber, "tingkat": {"nasional": None, "wilayah": []}, "angka": angka, "angka_meta": meta,
            "prospektif": {"n": None, "hit": None, "far": None, "hipotesis": None},
            "laporan_berkala": BERKALA, "status": URUT[terburuk] if sumber else "mati", "basi": terburuk > 0}


def tulis(jalur, o):
    s = json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    assert len(s.encode()) <= BATAS, f"{jalur} melebihi 100 KB"
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "w", encoding="utf-8") as f:
        f.write(s + "\n")
    return len(s.encode()) + 1


def buat(akar=AKAR, kini=None):
    for b in _b.baca(os.path.join(akar, "public/bencana.json"))["bencana"]:
        j = os.path.join(akar, "public/data/ringkas", b["id"] + ".json")
        print(f"{b['id']}: {tulis(j, rakit(b, akar, kini))} byte")


def uji():
    kini = datetime(2026, 11, 15, 12, tzinfo=timezone.utc)
    reg = _b.baca()["bencana"]
    assert reg and reg[0]["id"] == "karhutla"
    with tempfile.TemporaryDirectory() as tmp:
        for b in reg:
            o = rakit(b, AKAR, kini)
            s = json.dumps(o, ensure_ascii=False).lower()
            assert list(o)[:3] == ["versi", "bencana", "dibuat"] and o["bencana"] == b["id"]
            for k in ("sumber", "tingkat", "angka", "prospektif", "basi", "laporan_berkala"):
                assert k in o, (b["id"], k)
            assert o["laporan_berkala"]["status"] == "ditunda", b["id"]
            assert isinstance(o["basi"], bool)
            assert "aman" not in s, b["id"]
            assert '"lat"' not in s and '"lon"' not in s, "koordinat"
            assert all(v is None or isinstance(v, (int, float)) for v in o["angka"].values()), b["id"]
            assert set(o["angka_meta"]) <= set(o["angka"])
            assert tulis(os.path.join(tmp, b["id"] + ".json"), o) <= BATAS
        # sumber tak ada -> null dan basi, bukan 0
        o = rakit(reg[0], os.path.join(tmp, "kosong"), kini)
        assert o["basi"] is True and all(v is None for v in o["angka"].values())
        # kini jauh sesudah data: angka null, basi, meta tetap menyebut sumber
        o = rakit(reg[0], AKAR, kini + timedelta(days=400))
        assert o["basi"] and o["status"] == "mati" and all(v is None for v in o["angka"].values())
        assert o["angka_meta"]["titik_meta"]["sumber"] == "titik" and o["angka_meta"]["titik_meta"]["waktu"]
    # batas ALGORITMA 7.1: tepat 1x segar, tepat 3x basi, lewat 3x mati; tanpa stempel mati
    assert [_status(m, 2) for m in (0, 120, 121, 360, 361, None)] == ["segar", "segar", "basi", "basi", "mati", "mati"]
    assert _status(5, None) == "tanpa_ambang"
    o = rakit(reg[0], AKAR, kini + timedelta(days=400))
    m = o["angka_meta"]["titik_meta"]
    assert m["status_sumber"] == "mati" and m["keterangan"].startswith("data tidak tersedia sejak "), m
    assert all(x.get("keterangan", "").startswith("data tidak tersedia") for x in o["sumber"] if x["status_sumber"] == "mati")
    with tempfile.TemporaryDirectory() as tmp:
        o = rakit(reg[0], tmp, kini)  # berkas hilang: mati, tanpa tanggal karangan
        assert all(x["keterangan"] == "data tidak tersedia" and x["waktu"] is None for x in o["sumber"]), o["sumber"]
    print("pb_ringkas uji: ok,", len(reg), "bencana")


if __name__ == "__main__":
    {"buat": buat, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
