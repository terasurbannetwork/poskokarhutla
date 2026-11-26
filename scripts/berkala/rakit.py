"""Laporan Berkala BNPB: perakit (LB-03, DESAIN-TEKNIS 1-2, ALUR 1). Membaca data kita sendiri, menormalkan, memanggil hitung.py.

  python3 -I scripts/berkala/rakit.py --potong [--tanggal YYYY-MM-DD] [--timpa]  (--lokal DIR | --wrangler BIN) [--sumber S]
  python3 -I scripts/berkala/rakit.py --periode bulanan --kode 2026-10            (--lokal DIR | --wrangler BIN) [--sumber S]
  python3 -I scripts/berkala/rakit.py uji                                          # tanpa jaringan

Sumber data (--sumber): folder public/ atau https://centurisk97.id (bawaan: folder public/ repo bila --lokal, situs produksi bila
--wrangler). Jaringan hanya ke situs kita sendiri dan R2 kita sendiri (lewat gudang.py); tidak memanen DIBI, tidak ada buku kejadian kedua.
R2 (bucket poskokarhutla-foto, put/get dari scripts/siklus/gudang.py):
  baca  dalops/banjir.json (privat), siklus/bersih/dibi/<YYYY>.jsonl.gz + laporan.json (lapis Siklus, tahun lalu Q3), berkala/potong/*
  tulis berkala/potong/<tanggal>.json (tidak ditimpa tanpa --timpa), berkala/<periode>/<kode>/angka/<tarik>.json dan terbaru.json.
  Tidak pernah menulis berkala/.../beku/ (versi beku milik rute Bekukan) dan tidak pernah ke public/data (Q22).
Log hanya mencetak status dan jumlah hari tiap sumber, tidak pernah isi dalops atau angka laporan.

Normalisasi ke bentuk baris dibi_kejadian.json (masukan hitung.py):
  * prov_kode dikode ulang dari NAMA provinsi ke kode Kemendagri 38 provinsi (dibi_kejadian.json memakai kode induk sebelum pemekaran
    2022: Papua, Papua Selatan, Papua Tengah, Papua Pegunungan semuanya 94; Papua Barat Daya 91). Sama dengan kode peta_karhutla.json.
  * lapis Siklus: kab4 Kemendagri -> PP.KK, kolom dampak yang tidak ada di riwayat penuh tetap None (tidak diketahui, bukan 0),
    bencana = None (riwayat penuh tidak membawa tanda di bawah ambang, jadi angka resmi tahun lalu tidak diketahui), kejadian pecahan dibiarkan.
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import gzip
import importlib.util
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIB = dt.timezone(dt.timedelta(hours=7))
PRODUKSI = "https://centurisk97.id"


def _muat(nama, rel):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    md = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(md)
    return md


H = _muat("berkala_hitung", "scripts/berkala/hitung.py")
G = _muat("siklus_gudang", "scripts/siklus/gudang.py")
W = _muat("data_wilayah", "scripts/data/wilayah.py")

BERKAS = {"dibi": "data/dibi_kejadian.json", "karhutla": "data/peta_karhutla.json", "gunungapi": "banjir/data/gunungapi_status.json",
          "perubahan_level": "gunungapi/data/perubahan_level.json", "gempa": "gempa/data/inatews_detail_{bulan}.json",
          "riwayat": "data/logbook_riwayat.json", "iklim": "data/iklim_outlook.json"}
R2_DALOPS = "dalops/banjir.json"
R2_SIKLUS = "siklus/bersih/dibi/{tahun}.jsonl.gz"
R2_SIKLUS_LAPORAN = "siklus/bersih/dibi/laporan.json"
KUNCI_SAH = re.compile(r"^berkala/(potong/\d{4}-\d{2}-\d{2}\.json|(harian|mingguan|bulanan|tahunan)/[0-9W-]+/angka/(\d{4}-\d{2}-\d{2}|terbaru)\.json)$")


# ------------------------------------------------------------------ sumber
class Sumber:
    """folder public/ atau URL situs kita; None bila berkas tidak ada (404), galat lain dilempar."""
    def __init__(self, akar):
        self.akar = akar

    def baca(self, rel):
        if self.akar.startswith("https://"):
            req = urllib.request.Request(self.akar.rstrip("/") + "/" + rel, headers={"User-Agent": "centurisk97-berkala"})
            try:
                with urllib.request.urlopen(req, timeout=90) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return None
                raise
        p = os.path.join(self.akar, rel)
        return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None


def r2_json(be, kunci):
    b = be.get(kunci)
    return json.loads(b) if b else None


def tulis(be, kunci, isi):
    if not KUNCI_SAH.match(kunci) or "/beku/" in kunci:
        raise ValueError(f"kunci tulis di luar berkala/potong atau berkala/<periode>/<kode>/angka: {kunci}")
    with tempfile.TemporaryDirectory() as d:
        j = os.path.join(d, "o.json")
        with open(j, "w", encoding="utf-8") as f:
            json.dump(isi, f, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        be.put(kunci, j)


# ------------------------------------------------------------------ normalisasi wilayah
ALIAS_PROV = {"Kepulauan Bangka Belitung": "19", "Daerah Istimewa Yogyakarta": "34", "DKI Jakarta": "31"}
KODE_PROV = {v: k for k, v in W.PROVINSI.items()} | ALIAS_PROV


def kode_prov(nama, kode):
    return KODE_PROV.get((nama or "").strip(), kode)


def nama_kab(s):
    """'Kab. Nagan Raya', 'Nagan Raya', 'Kota Adm. Jakarta Selatan', 'Kota Jakarta Selatan' -> kunci banding."""
    t = re.sub(r"[^a-z0-9 ]", " ", (s or "").lower())
    t = [w for w in t.split() if w not in ("kab", "kabupaten", "adm", "administrasi")]
    return " ".join(t)


def normal_dibi(d):
    """dibi_kejadian.json -> masukan dibi hitung.py; prov_kode dari nama provinsi. tarik = 'dibuat' berkas."""
    ubah, rs = 0, []
    for r in d["kejadian"]:
        k = kode_prov(r.get("prov"), r.get("prov_kode"))
        ubah += k != r.get("prov_kode")
        rs.append(dict(r, prov_kode=k, dibi_prov_kode=r.get("prov_kode")))
    return {"tarik": str(d.get("dibuat"))[:10], "dari": d.get("dari"), "sampai": d.get("sampai"), "kejadian": rs}, ubah


KOLOM_BERSIH = {"kej": "kejadian", "md": "meninggal", "hil": "hilang", "luka": "luka", "terdampak": "terdampak", "mengungsi": "mengungsi",
                "rb": "rr_berat", "rs": "rr_sedang", "rr": "rr_ringan", "terendam": "terendam", "f_pendidikan": "f_pendidikan",
                "f_kantor": "f_kantor", "jembatan": "jembatan", "f_umum": "f_umum"}


def normal_bersih(baris):
    """baris lapis bersih Siklus -> bentuk dibi_kejadian. Semua kolom dampak hadir sebagai kunci; None tetap None."""
    out = []
    for b in baris:
        k4 = b.get("kab4")
        p = k4[:2] if k4 else None
        r = {"tanggal": b["tgl"], "jenis": b["jenis"], "prov_kode": p, "prov": W.PROVINSI.get(p), "kab_kode": f"{k4[:2]}.{k4[2:]}" if k4 else None,
             "kab": None, "bencana": None, "asal": "siklus_bersih"}
        for a, z in KOLOM_BERSIH.items():
            r[z] = b.get(a)
        r["kejadian"] = b.get("kej") or 0
        out.append(r)
    return out


def baca_siklus(be, a, b):
    """lapis bersih untuk tahun-tahun rentang a..b; (masukan dibi_lalu, status)."""
    rs = []
    for th in range(a.year, b.year + 1):
        isi = be.get(R2_SIKLUS.format(tahun=th))
        if not isi:
            return None, "belum_ada"
        rs += [json.loads(x) for x in gzip.decompress(isi).decode("utf-8").splitlines() if x.strip()]
    lap = r2_json(be, R2_SIKLUS_LAPORAN) or {}
    tarik = lap.get("diambil")
    sampai = min(dt.date(b.year, 12, 31).isoformat(), tarik or "9999")
    return {"tarik": tarik, "asal": "siklus_bersih", "dari": dt.date(a.year, 1, 1).isoformat(), "sampai": sampai,
            "kejadian": normal_bersih(rs)}, "ok"


# ------------------------------------------------------------------ karhutla
def karhutla_hari(pk, hari):
    """peta_karhutla.json -> {prov: {nama, hot, luas, belum, padam}} untuk satu hari, None bila hari tidak ada di berkas."""
    try:
        i = pk["hari"].index(hari)
    except (KeyError, ValueError):
        return None
    return {k: {"nama": p.get("nama"), **{x: p[x][i] for x in ("hot", "luas", "belum", "padam") if x in p}} for k, p in pk["prov"].items()}


def potongan_banyak(be, hari):
    """baca berkala/potong/<hari>.json paralel (gudang.Wrangler satu proses per objek)."""
    with cf.ThreadPoolExecutor(G.PARALEL) as ex:
        return dict(zip(hari, ex.map(lambda h: r2_json(be, f"berkala/potong/{h}.json"), hari)))


# ------------------------------------------------------------------ dalops banjir (status surut)
def surut_dalops(dl, hari):
    """status per kab dalops pada hari itu: {"<prov>|<kab>": {prov, kab, surut, kondisi, tgl, asal}}. Riwayat <= hari dipakai bila ada;
    kejadian tanpa riwayat memakai keadaan terakhirnya ('terakhir' sesudah hari = tarikan kini, asal ditandai)."""
    out = {}
    for e in (dl or {}).get("kejadian", []):
        if (e.get("mulai") or "9999") > hari:
            continue
        rw = [x for x in e.get("riwayat") or [] if x.get("tgl") and x["tgl"] <= hari]
        if rw:
            s, kond, t, asal = rw[-1].get("surut"), rw[-1].get("kondisi"), rw[-1]["tgl"], "riwayat"
        else:
            t = e.get("terakhir") or e.get("mulai")
            s, kond, asal = e.get("surut"), e.get("kondisi"), "terakhir" if t <= hari else "tarikan_kini"
        for nama, kk in zip(e.get("kab") or [], e.get("kab_kode") or []):
            k = f"{kode_prov(e.get('prov'), e.get('prov_kode'))}|{nama_kab(nama)}"
            if k not in out or (out[k]["tgl"] or "") <= (t or ""):
                out[k] = {"surut": s is True, "kondisi": kond, "tgl": t, "asal": asal}
    return out


def ke_kode_dibi(surut, dibi_baris):
    """kunci '<prov>|<nama kab>' -> kab_kode DIBI (PP.KK) lewat nama; (peta, tak cocok)."""
    idx = {f"{r['prov_kode']}|{nama_kab(r.get('kab'))}": r["kab_kode"] for r in dibi_baris if r.get("kab")}
    out, tak = {}, 0
    for k, v in surut.items():
        if k in idx:
            out[idx[k]] = v
        else:
            tak += 1
    return out, tak


# ------------------------------------------------------------------ gunung api
def level_kini(gs):
    return {g["nama"]: int(g["level"]) for g in (gs or {}).get("gunung", []) if g.get("level")}


def level_pada(gs, pl, tanggal):
    """level per gunung pada tanggal: level kini (gunungapi_status.json) dengan perubahan sesudah tanggal dibatalkan (perubahan_level.json
    dan daftar perubahan berkas status). None bila tanggal sesudah berkas status dibuat."""
    lv = level_kini(gs)
    if not lv:
        return None
    dibuat = str(gs.get("dibuat"))[:10]
    if tanggal > dibuat:
        return None
    ch = [(x["tanggal"], x["gunung"], x["dari"]) for x in (pl or {}).get("baris", []) if x.get("jenis") == "perubahan"]
    ch += [(x["tgl"], x["nama"], x["dari"]) for x in gs.get("perubahan", [])]
    for t, g, dari in sorted(set(ch), reverse=True):
        if tanggal < t <= dibuat and g in lv:
            lv[g] = int(dari)
    return lv


# ------------------------------------------------------------------ gempa
def gempa_peristiwa(src, a, b):
    """kejadian ber-buletin BMKG (dirasakan atau M5+) di inatews_detail_<bulan>.json, a .. b+1 hari; prov dari kab yang memuat titik
    (di laut: kab terdekat, scripts/umum/kejadian.py kab_di)."""
    kj = _muat("umum_kejadian", "scripts/umum/kejadian.py")
    out, bulan, d = [], set(), a
    while d <= b + dt.timedelta(days=1):
        bulan.add(d.isoformat()[:7])
        d += dt.timedelta(days=1)
    ada = 0
    for bl in sorted(bulan):
        f = src.baca(BERKAS["gempa"].format(bulan=bl))
        if f is None:
            continue
        ada += 1
        for i, e in (f.get("kejadian") or {}).items():
            tg = dt.datetime.fromtimestamp(e["t"], WIB).date()
            if a <= tg <= b + dt.timedelta(days=1) and e.get("lat") is not None:
                k = kj.kab_di(AKAR, e["lat"], e["lon"])
                if k:
                    out.append({"id": i, "tanggal": tg.isoformat(), "prov_kode": k[:2], "mag": e.get("m")})
    return out, ada


# ------------------------------------------------------------------ potongan harian (D10)
def potong(src, be, tanggal, timpa=False):
    kunci = f"berkala/potong/{tanggal}.json"
    if not timpa and be.get(kunci):
        return {"kunci": kunci, "status": "sudah_ada"}
    st, o = {}, {"v": 1, "tanggal": tanggal, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes")}
    try:
        pk = src.baca(BERKAS["karhutla"])
        o["karhutla"] = karhutla_hari(pk, tanggal) if pk else None
        st["karhutla"] = "ok" if o["karhutla"] else "belum_ada"
    except Exception as e:
        o["karhutla"], st["karhutla"] = None, f"gagal: {type(e).__name__}"
    try:
        dl = r2_json(be, R2_DALOPS)
        o["surut"] = surut_dalops(dl, tanggal) if dl else None
        o["surut_tarik"] = str((dl or {}).get("dibuat"))[:10] if dl else None
        st["surut"] = "ok" if dl else "belum_ada"
    except Exception as e:
        o["surut"], st["surut"] = None, f"gagal: {type(e).__name__}"
    try:
        gs = src.baca(BERKAS["gunungapi"])
        o["gunungapi"] = {"tanggal": str(gs.get("dibuat"))[:10], "level": level_kini(gs)} if gs else None
        st["gunungapi"] = "ok" if o["gunungapi"] and o["gunungapi"]["level"] else "belum_ada"
    except Exception as e:
        o["gunungapi"], st["gunungapi"] = None, f"gagal: {type(e).__name__}"
    o["status"] = st
    tulis(be, kunci, o)
    return {"kunci": kunci, "status": st}


# ------------------------------------------------------------------ rakit periode
def kumpul(periode, kode, src, be, hari_ini):
    """masukan hitung.py + catatan metode + status sumber yang gagal dibaca."""
    a, b = H.rentang(periode, kode)
    catatan, gagal, m = [], {}, {}
    d = src.baca(BERKAS["dibi"])
    if d is None:
        raise RuntimeError("dibi_kejadian.json tidak terbaca")
    m["dibi"], ubah = normal_dibi(d)
    if ubah:
        catatan.append(f"Kode provinsi DIBI dikode ulang dari nama provinsi ke kode Kemendagri 38 provinsi ({ubah} baris), karena berkas DIBI memakai "
                       "kode induk sebelum pemekaran Papua 2022; tanpa itu Papua, Papua Selatan, Papua Tengah, dan Papua Pegunungan terhitung satu provinsi.")
    tl_a, tl_b = H.rentang(periode, H.tahun_lalu(periode, kode))
    if not H.tercakup(m["dibi"], tl_a, tl_b):
        try:
            m["dibi_lalu"], s = baca_siklus(be, tl_a, tl_b)
            if s != "ok":
                m.pop("dibi_lalu")
            else:
                catatan.append("Pembanding tahun lalu dari lapis bersih Siklus (riwayat penuh DIBI): tanda di bawah ambang tidak ada, jadi angka resmi "
                               "tahun lalu tidak diketahui dan hanya angka semua laporan yang dibandingkan; dampak yang tidak tercatat riwayat penuh tidak diketahui.")
        except Exception as e:
            gagal["dibi_tahun_lalu"] = type(e).__name__
    # karhutla: berkas terbaru dulu, potongan R2 untuk hari yang sudah keluar dari berkas (pergantian tahun)
    hari = H._hari(min(dt.date(a.year, 1, 1), H.rentang(periode, H.geser(periode, kode, -1))[0]), b)
    try:
        pk = src.baca(BERKAS["karhutla"]) or {}
        kh = {h: x for h in hari if (x := karhutla_hari(pk, h)) is not None} if pk else {}
        sisa = [h for h in hari if h not in kh]
        dari_potong = {h: p["karhutla"] for h, p in potongan_banyak(be, sisa).items() if p and p.get("karhutla")} if sisa else {}
        kh |= dari_potong
        m["karhutla"] = {"tarik": str(pk.get("dibuat"))[:10] if pk else None, "asal": "peta_karhutla" + ("+potong" if dari_potong else ""), "hari": kh}
        celah = sorted(set(pk.get("celah") or []) & set(H._hari(a, b)))
        if celah:
            catatan.append(f"{len(celah)} hari bertanda celah satelit di peta karhutla (lintasan hilang di FIRMS, hotspot hari itu terlalu rendah, tidak dikoreksi): "
                           + ", ".join(H.tgl(x) for x in celah) + ".")
    except Exception as e:
        gagal["karhutla"] = type(e).__name__
    # status surut: potongan harian; bila belum ada sama sekali, satu tarikan dalops kini (ALGORITMA 5.3, bulan pertama)
    try:
        ph = potongan_banyak(be, H._hari(a, b))
        sh = {h: p["surut"] for h, p in ph.items() if p and p.get("surut") is not None}
        asal, tarik = "potong", max((ph[h].get("surut_tarik") or "" for h in sh), default=None)
        if not sh:
            dl = r2_json(be, R2_DALOPS)
            if dl:
                sh, asal, tarik = {b.isoformat(): surut_dalops(dl, b.isoformat())}, "tarikan_kini", str(dl.get("dibuat"))[:10]
                catatan.append(f"Status surut dari satu tarikan logbook Pusdalops ({H.tgl(tarik)}), bukan potongan harian: dalops hanya menyimpan "
                               "kejadian banjir yang mulai dalam 30 hari terakhir, jadi kab yang banjirnya lebih lama tertulis belum dilaporkan, dan "
                               "keadaan kejadian yang masih berjalan sesudah akhir periode adalah keadaan pada tanggal tarik.")
        if sh:
            tak = 0
            for h in list(sh):
                sh[h], t = ke_kode_dibi(sh[h], m["dibi"]["kejadian"])
                tak = max(tak, t)
            m["surut"] = {"tarik": tarik, "asal": asal, "hari": sh, "tak_cocok": tak}
    except Exception as e:
        gagal["dalops_banjir"] = type(e).__name__
    # gunung api pada tanggal 1 sesudah periode (ALGORITMA 7.3)
    t = (b + dt.timedelta(days=1)).isoformat()
    try:
        p = r2_json(be, f"berkala/potong/{t}.json")
        if p and p.get("gunungapi") and p["gunungapi"].get("level"):
            m["gunungapi"] = {"tanggal": t, "level": p["gunungapi"]["level"]}
        else:
            gs, pl = src.baca(BERKAS["gunungapi"]), src.baca(BERKAS["perubahan_level"])
            lv = level_pada(gs, pl, t) if gs else None
            if lv:
                m["gunungapi"] = {"tanggal": t, "level": lv}
                catatan.append(f"Status gunung api per {H.tgl(t)} dihitung mundur dari status MAGMA {H.tgl(str(gs['dibuat'])[:10])} dengan membatalkan "
                               "perubahan level sesudah tanggal itu (perubahan_level.json); belum ada potongan harian tanggal itu.")
    except Exception as e:
        gagal["gunungapi"] = type(e).__name__
    try:
        ev, n = gempa_peristiwa(src, a, b)
        if n:
            m["gempa"] = {"tarik": hari_ini.isoformat(), "peristiwa": ev}
            catatan.append("Peristiwa gempa dari kejadian berbuletin BMKG InaTEWS (dirasakan atau M5 ke atas); provinsi = kab yang memuat pusat gempa, "
                           "di laut kab terdekat.")
    except Exception as e:
        gagal["gempa"] = type(e).__name__
    catatan.append("Data erupsi per peristiwa belum diarsipkan, jadi tiap laporan DIBI erupsi dihitung satu peristiwa.")
    # Bab 4.4 dan 7.1 (LB-04): hanya keluaran yang sudah terbit dibaca, tanpa model baru (D8, K6)
    if periode == "bulanan":
        for k in ("riwayat", "iklim"):
            try:
                x = src.baca(BERKAS[k])
                if x:
                    m[k] = x
            except Exception as e:
                gagal["peluang" if k == "riwayat" else "prakiraan_hujan"] = type(e).__name__
        if m.get("iklim"):
            catatan.append(f"Hujan tiga bulan ke depan dan indeks ENSO dari iklim_outlook.json terbitan {H.tgl(str(m['iklim'].get('dibuat'))[:10])}: "
                           "pendorong musim depan = persistensi nilai RONI dan DMI terakhir, bukan prakiraan; wilayah yang hubungannya tidak lulus "
                           "uji balik leave-one-out berlabel hipotesis, wilayah yang rentangnya tidak lebih sempit dari iklim biasa tidak ditampilkan.")
        if m.get("riwayat"):
            catatan.append("Peluang banjir dan longsor dua bulan berikutnya dihitung dari frekuensi kejadian di logbook Pusdalops per kab/kota "
                           "(tahun penuh saja); aturan ini belum diuji balik, jadi berlabel hipotesis.")
    return m, catatan, gagal


def rakit(periode, kode, src, be, hari_ini=None, dirakit=None):
    hari_ini = hari_ini or dt.datetime.now(WIB).date()
    H.periksa_selesai(periode, kode, hari_ini)
    m, catatan, gagal = kumpul(periode, kode, src, be, hari_ini)
    out = H.berkas_angka(periode, kode, m, hari_ini=hari_ini, dirakit=dirakit)
    out["lampiran"]["metode"]["catatan"] += catatan
    for k, v in gagal.items():
        out["sumber"].setdefault(k, {"tarik": None})
        out["sumber"][k].update(status="gagal", galat=v)
    if m.get("surut"):
        out["sumber"]["dalops_banjir"]["tak_cocok"] = m["surut"]["tak_cocok"]
    tarik = hari_ini.isoformat()
    for k in (f"berkala/{periode}/{kode}/angka/{tarik}.json", f"berkala/{periode}/{kode}/angka/terbaru.json"):
        tulis(be, k, out)
    return out


def ringkas_log(out):
    return {"periode": out["periode"], "kode": out["kode"],
            "sumber": {k: {x: v[x] for x in ("status", "hari", "hari_rentang", "asal") if x in v} for k, v in out["sumber"].items()}}


# ------------------------------------------------------------------ uji (tanpa jaringan)
def uji():
    n = 0

    def ok(c, pesan):
        nonlocal n
        assert c, pesan
        n += 1

    with tempfile.TemporaryDirectory() as d:
        pub, r2 = os.path.join(d, "public"), os.path.join(d, "r2")
        be = G.Lokal(r2)

        def simpan(rel, o, di=pub):
            p = os.path.join(di, rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            if rel.endswith(".gz"):
                open(p, "wb").write(gzip.compress("\n".join(json.dumps(x) for x in o).encode()))
            else:
                json.dump(o, open(p, "w"))

        R = lambda t, j, pk, pn, kk, kn, n=1, **x: {"tanggal": t, "jenis": j, "prov_kode": pk, "prov": pn, "kab_kode": kk, "kab": kn, "kejadian": n, **x}
        dibi = [R("2026-10-03", "Banjir", "94", "Papua Selatan", "94.01", "Merauke"), R("2026-10-04", "Banjir", "94", "Papua", "94.71", "Kota Jayapura"),
                R("2026-10-05", "Banjir", "11", "Aceh", "11.08", "Nagan Raya", terdampak=40), R("2026-10-06", "Banjir", "11", "Aceh", "11.09", "Aceh Barat", bencana=0),
                R("2026-10-07", "Kebakaran Hutan dan Lahan", "14", "Riau", "14.71", "Kota Pekanbaru"),
                R("2026-10-08", "Gempabumi", "32", "Jawa Barat", "32.02", "Sukabumi", rr_ringan=3),
                R("2026-09-10", "Banjir", "11", "Aceh", "11.08", "Nagan Raya")]
        simpan(BERKAS["dibi"], {"dibuat": "2026-11-11T10:00+07:00", "dari": "2025-11-12", "sampai": "2026-11-11", "kejadian": dibi})
        hari = H._hari(dt.date(2026, 1, 1), dt.date(2026, 11, 8))
        simpan(BERKAS["karhutla"], {"dibuat": "2026-11-09T19:00+07:00", "hari": hari, "celah": ["2026-10-02"],
                                    "prov": {"14": {"nama": "Riau", "hot": [5] * len(hari), "luas": [1.5] * len(hari), "belum": [0.25] * len(hari), "padam": [0] * len(hari)}}})
        simpan(BERKAS["gunungapi"], {"dibuat": "2026-11-10T15:00+07:00", "gunung": [{"nama": "Semeru", "level": 3}, {"nama": "Gamkonora", "level": 2}, {"nama": "Dieng", "level": 1}],
                                     "perubahan": [{"nama": "Gamkonora", "dari": 1, "ke": 2, "tgl": "2026-11-10"}]})
        simpan(BERKAS["perubahan_level"], {"baris": [{"gunung": "Dieng", "tanggal": "2026-11-05", "jenis": "perubahan", "dari": 2, "ke": 1},
                                                     {"gunung": "Semeru", "tanggal": "2026-10-20", "jenis": "perubahan", "dari": 2, "ke": 3}]})
        t0 = int(dt.datetime(2026, 10, 8, 3, tzinfo=dt.timezone.utc).timestamp())
        simpan(BERKAS["gempa"].format(bulan="2026-10"), {"kejadian": {"e1": {"t": t0, "lat": -7.0, "lon": 106.9, "m": 5.1}}})
        simpan(R2_DALOPS, {"dibuat": "2026-11-11T07:00+07:00", "kejadian": [
            {"prov": "Aceh", "prov_kode": "11", "kab": ["Kab. Nagan Raya"], "kab_kode": ["11|Nagan Raya"], "mulai": "2026-10-04", "terakhir": "2026-10-20", "surut": True,
             "riwayat": [{"tgl": "2026-10-10", "surut": False}, {"tgl": "2026-10-20", "surut": True}]},
            {"prov": "Papua Selatan", "prov_kode": "93", "kab": ["Kab. Merauke"], "kab_kode": ["93|Merauke"], "mulai": "2026-10-03", "terakhir": "2026-11-05", "surut": False, "riwayat": []},
            {"prov": "Atlantis", "prov_kode": "99", "kab": ["Kab. Antah"], "kab_kode": ["99|Antah"], "mulai": "2026-10-03", "terakhir": "2026-10-04", "surut": False, "riwayat": []}]}, r2)
        lalu = [{"tgl": "2025-10-05", "jenis": "Banjir", "kab4": "1108", "kej": 0.5, "md": 1, "hil": 0, "luka": 0, "rb": 0, "rs": 0, "rr": 0},
                {"tgl": "2025-10-05", "jenis": "Banjir", "kab4": "1109", "kej": 0.5, "md": 0, "hil": 0, "luka": 0, "rb": 0, "rs": 0, "rr": 0},
                {"tgl": "2025-10-09", "jenis": "Wabah Penyakit", "kab4": "3201", "kej": 1}]
        simpan(R2_SIKLUS.format(tahun=2025), lalu, r2)
        simpan(R2_SIKLUS_LAPORAN, {"diambil": "2026-11-10"}, r2)
        ada = lambda nov, des: [0] * 10 + [nov, des]
        simpan(BERKAS["riwayat"], {"dibuat": "2026-11-01T11:44:52+00:00", "tahun_penuh": ["2014", "2015", "2016", "2017", "2018", "2019", "2020", "2024", "2025"],
                                   "kab": {"11|Aceh Barat": {"tahun_ada": {"banjir": ada(5, 4), "longsor": ada(0, 6)}}, "12|Nias": {"tahun_ada": {"banjir": ada(4, 9)}}}})
        simpan(BERKAS["iklim"], {"dibuat": "2026-11-09T07:10+07:00", "wilayah": {"jawa": {"nama": "Jawa"}},
                                 "keadaan_sekarang": {"roni": {"musim": "ASO", "tahun": 2026, "nilai": 1.97}}, "fit": {"OND": {"jawa": {"lulus": True}}},
                                 "prakiraan": [{"musim": "OND", "tahun": 2026, "bulan_tengah": "2026-11", "pendorong": {"roni": 1.97, "dmi": 0.6},
                                                "wilayah": {"jawa": {"anom_pct": -49.3, "p10": -88.0, "p90": -10.6, "tampil": True}}}]})
        src = Sumber(pub)

        # normalisasi
        nd, ubah = normal_dibi(src.baca(BERKAS["dibi"]))
        ok(ubah == 2 and {r["kab"]: r["prov_kode"] for r in nd["kejadian"]}["Merauke"] == "93" and nd["tarik"] == "2026-11-11", "prov dikode ulang dari nama, tarik = dibuat")
        nb = normal_bersih(lalu)
        ok(nb[0]["kab_kode"] == "11.08" and nb[0]["terdampak"] is None and nb[0]["bencana"] is None and nb[0]["kejadian"] == 0.5, "lapis Siklus: None tetap None")
        ok(nama_kab("Kota Adm. Jakarta Selatan") == nama_kab("Kota Jakarta Selatan") != nama_kab("Jakarta Selatan"), "nama kab")
        lv = level_pada(src.baca(BERKAS["gunungapi"]), src.baca(BERKAS["perubahan_level"]), "2026-11-01")
        ok(lv == {"Semeru": 3, "Gamkonora": 1, "Dieng": 2}, f"level mundur {lv}")
        ok(level_pada(src.baca(BERKAS["gunungapi"]), None, "2026-11-20") is None, "tanggal sesudah status = None")

        # bulan berjalan ditolak, tidak menulis
        try:
            rakit("bulanan", "2026-11", src, be, hari_ini=dt.date(2026, 11, 25))
            ok(False, "H13 rakit")
        except H.KodeSalah:
            ok(not os.path.exists(os.path.join(r2, "berkala", "bulanan")), "H13 rakit")

        out = rakit("bulanan", "2026-10", src, be, hari_ini=dt.date(2026, 11, 12), dirakit="2026-11-12T03:10:00Z")
        b1 = out["bab1"]
        ok(b1["alam"]["kejadian"] == 6 and b1["resmi"]["alam"]["kejadian"] == 5 and b1["alam"]["prov"] == 5, f"Q28 dan provinsi Papua terpisah (tanpa kode ulang 4) {b1['alam']}")
        ok(out["sumber"]["dibi"]["tarik"] == "2026-11-11", "tarik dibi")
        tl = b1["tahun_lalu"]
        ok(tl["asal"] == "siklus_bersih" and tl["kejadian"]["alam"] == 1 and tl["kejadian"]["alam_resmi"] is None and tl["kejadian"]["epidemi"] == 1, f"tahun lalu {tl['kejadian']}")
        ok(tl["banding"]["kejadian_resmi"]["arah"] is None and tl["banding"]["terdampak_mengungsi"]["arah"] is None, "banding tidak dari None")
        b2 = out["bab2"]
        ok(out["sumber"]["karhutla"]["status"] == "ok" and b2["hot"] == 155 and b2["belum"] == 0.3, f"karhutla {b2.get('hot')}")
        ok(b2["sebelumnya"]["hot"] == 150 and b2["per_bulan"][0]["hot"] == 155, "sebelumnya dan per bulan")
        st = {k["kode"]: k["surut"] for k in out["bab3"]["banjir"]["kab"]}
        ok(st == {"11.08": "sudah", "94.01": "belum", "94.71": "belum_dilaporkan", "11.09": "belum_dilaporkan"}, f"surut {st}")
        ok(out["sumber"]["dalops_banjir"]["tak_cocok"] == 1 and out["sumber"]["dalops_banjir"]["asal"] == "tarikan_kini", "dalops tak cocok dihitung")
        ok(out["bab5"]["gunungapi"]["per_level"] == {"1": 1, "2": 1, "3": 1, "4": 0} and out["bab5"]["peristiwa"]["gempa"] == 1
           and out["bab5"]["gempa"][0]["asal"] == "data", f"geologi {out['bab5']['peristiwa']}")
        ok(any("celah" in c for c in out["lampiran"]["metode"]["catatan"]) and any("Papua" in c for c in out["lampiran"]["metode"]["catatan"]), "catatan metode")
        b7 = out["bab7"]
        ok(b7["peluang"]["bulan"][0]["gabung_n"] == 1 and b7["peluang"]["bulan"][1]["gabung_n"] == 2 and b7["enso"]["nilai"] == 1.97
           and out["bab4"]["hujan"]["wilayah"][0]["anom_pct"] == -49.3 and out["sumber"]["prakiraan_hujan"]["terbit"] == "2026-11-09"
           and out["sumber"]["peluang"]["status"] == "ok", f"LB-04 {b7}")
        ok({u["kode"] for u in out["usulan_temuan"]} >= {"T6", "T7"} and any("iklim_outlook" in c for c in out["lampiran"]["metode"]["catatan"]), "T6 T7 dan catatan LB-04")
        ok(be.get("berkala/bulanan/2026-10/angka/2026-11-12.json") and be.get("berkala/bulanan/2026-10/angka/terbaru.json"), "tulis R2")
        for k in ("berkala/bulanan/2026-10/beku/v1.json", "berkala/../dalops/banjir.json", "public/data/x.json"):
            try:
                tulis(be, k, {})
                ok(False, f"kunci {k}")
            except ValueError:
                ok(True, "kunci")

        # potongan: tidak ditimpa; hari yang keluar dari berkas dibaca dari potongan
        p = potong(src, be, "2026-11-08")
        ok(p["status"]["karhutla"] == "ok" and p["status"]["surut"] == "ok", f"potong {p}")
        ok(potong(src, be, "2026-11-08")["status"] == "sudah_ada", "potongan tidak ditimpa")
        simpan(BERKAS["karhutla"], {"dibuat": "2027-01-02T19:00+07:00", "hari": ["2027-01-01"], "prov": {"14": {"nama": "Riau", "hot": [9], "luas": [0], "belum": [0], "padam": [0]}}})
        pk = potongan_banyak(be, ["2026-11-08", "2026-11-09"])
        ok(pk["2026-11-08"]["karhutla"]["14"]["hot"] == 5 and pk["2026-11-09"] is None, "potongan dibaca")
        m, _, _ = kumpul("bulanan", "2026-11", src, be, dt.date(2027, 1, 5))
        ok(m["karhutla"]["hari"]["2026-11-08"]["14"]["hot"] == 5 and "2026-11-09" not in m["karhutla"]["hari"] and m["karhutla"]["asal"] == "peta_karhutla+potong", "lintas tahun dari potongan")
    print(f"rakit.py uji: {n} pemeriksaan lulus")


def main(a):
    if a[:1] == ["uji"]:
        return uji()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--potong", action="store_true")
    ap.add_argument("--tanggal")
    ap.add_argument("--timpa", action="store_true")
    ap.add_argument("--periode", choices=H.PERIODE)
    ap.add_argument("--kode")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--lokal")
    g.add_argument("--wrangler")
    ap.add_argument("--bucket", default=G.BUCKET)
    ap.add_argument("--sumber")
    x = ap.parse_args(a)
    be = G.Lokal(x.lokal) if x.lokal else G.Wrangler(x.wrangler, x.bucket)
    src = Sumber(x.sumber or (os.path.join(AKAR, "public") if x.lokal else PRODUKSI))
    if x.potong:
        t = x.tanggal or (dt.datetime.now(WIB).date() - dt.timedelta(days=1)).isoformat()
        dt.date.fromisoformat(t)
        print(json.dumps(potong(src, be, t, x.timpa), ensure_ascii=False))
    if x.periode:
        if not x.kode:
            ap.error("--periode butuh --kode")
        print(json.dumps(ringkas_log(rakit(x.periode, x.kode, src, be)), ensure_ascii=False))
    if not (x.potong or x.periode):
        ap.error("pilih --potong dan/atau --periode")


if __name__ == "__main__":
    main(sys.argv[1:])
