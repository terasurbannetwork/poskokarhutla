"""TMAT (tinggi muka air tanah gambut) stasiun BRGM SiPALAGA -> public/data/tmat.json  (rencana panen #45)

Pengukuran lapangan langsung, pengganti proxy ember pfvi.py. Baku: TMAT <= 40 cm di bawah permukaan (PP 57/2016 jo. PP 71/2014).
Konvensi tmat_cm sama dengan scripts/bnpb/drone.py: NEGATIF = muka air di bawah permukaan; kering = tmat_cm < -40.

JALUR AKSES (jujur, tanpa menembus apa pun):
  1. Publik: sipalaga.brg.go.id dilindungi tantangan Cloudflare (HTTP 403 "Just a moment", dicek 30 Okt 2026, juga /robots.txt, /api/*).
     Skrip mencoba per jalan dengan UA jujur; 403/tantangan = status "diblokir", TIDAK ada upaya melewati. Dicoba lagi tiap jalan.
  2. Unggahan resmi: data/tmat/*.csv (kolom id,nama,lat,lon,khg,prov,tgl,tmat_cm) dari ekspor yang diunduh pemilik secara sah
     atau dari izin BRGM. Dibaca apa adanya; baris baru digabung ke log.
Log harian kumulatif (resumable): data/raw/tmat_log.json {id: {meta, seri: {tgl: tmat_cm}}}. Keluaran tmat.json ringkas (<2 MB).

UJI KETERAMPILAN (uji_nilai): P(titik panas <=10 km dari stasiun dalam 7 hari ke depan | TMAT, hari <-40 cm, FWI) vs FWI saja, split temporal.
  Syarat data: >= SYARAT_STASIUN stasiun dan >= SYARAT_HARI hari log. Kurang = "TAK TERUJI" (log tetap jalan).
Pakai: python3 scripts/data/tmat.py [--uji]
"""
import csv, datetime as dt, glob, json, os, sys, time, urllib.request, urllib.error

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOG = os.path.join(AKAR, "data/raw/tmat_log.json")
KELUAR = os.path.join(AKAR, "public/data/tmat.json")
WIB = dt.timezone(dt.timedelta(hours=7))
UA = "pipa-data/1.0 (pemantauan karhutla publik; repo poskokarhutla)"
BASIS = "https://sipalaga.brg.go.id"
JALUR = ["/api/stations", "/api/v1/stations"]  # ponytail: jalur tebakan; sampai ada dokumen API resmi, kemungkinan tetap diblokir
BAKU_CM = -40
SYARAT_STASIUN, SYARAT_HARI = 20, 120
MAKS_SERI = 400  # hari per stasiun di log


def ambil(url, coba=4):
    """(status, isi|None). Retry 4x backoff untuk galat jaringan/5xx; 401/403/404 (tantangan) = berhenti, tidak ditembus."""
    err = None
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"}), timeout=25) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 404):
                return e.code, None
            err = e.code
        except Exception as e:
            err = type(e).__name__
        if i < coba - 1:
            time.sleep(2 ** (i + 1))
    return err, None


def dari_publik():
    """-> (baris[], status). baris = [{id,nama,lat,lon,khg,prov,tgl,tmat_cm}]."""
    status = "diblokir"
    for j in JALUR:
        s, isi = ambil(BASIS + j)
        if isi and isi.lstrip()[:1] in "[{":
            try:
                d = json.loads(isi)
                d = d.get("data", d) if isinstance(d, dict) else d
                return [b for b in (_baris(x) for x in d) if b], "publik"
            except (ValueError, AttributeError):
                status = "format_tak_dikenal"
        elif s not in (403, 401, 404):
            status = f"galat_{s}"
    return [], status


def _baris(x):
    try:
        return {"id": str(x["id"]), "nama": x.get("nama", ""), "lat": float(x["lat"]), "lon": float(x["lon"]), "khg": x.get("khg", ""),
                "prov": x.get("prov", ""), "tgl": str(x["tgl"])[:10], "tmat_cm": float(x["tmat_cm"])}
    except (KeyError, ValueError, TypeError):
        return None


def dari_csv():
    out = []
    for p in sorted(glob.glob(os.path.join(AKAR, "data/tmat/*.csv"))):
        out += [b for b in (_baris(r) for r in csv.DictReader(open(p, encoding="utf-8"))) if b]
    return out


def gabung(log, baris):
    for b in baris:
        s = log.setdefault(b["id"], {"seri": {}})
        s.update({k: b[k] for k in ("nama", "lat", "lon", "khg", "prov")})
        s["seri"][b["tgl"]] = b["tmat_cm"]
    for s in log.values():
        s["seri"] = dict(sorted(s["seri"].items())[-MAKS_SERI:])
    return log


def ringkas(log, hari_ini):
    """Per stasiun: terakhir, seri 30 hari, bagian hari di bawah baku; agregat per KHG dan provinsi."""
    batas = (dt.date.fromisoformat(hari_ini) - dt.timedelta(days=30)).isoformat()
    st = []
    for i, s in sorted(log.items()):
        seri = {t: v for t, v in s["seri"].items() if t > batas}
        if not seri:
            continue
        t_akhir = max(seri)
        st.append({"id": i, "nama": s.get("nama", ""), "lat": round(s["lat"], 4), "lon": round(s["lon"], 4), "khg": s.get("khg", ""), "prov": s.get("prov", ""),
                   "tgl": t_akhir, "tmat_cm": seri[t_akhir], "n_hari": len(seri), "bagian_di_bawah_baku": round(sum(v < BAKU_CM for v in seri.values()) / len(seri), 3),
                   "seri30": [[t, v] for t, v in sorted(seri.items())]})

    def agg(kunci):
        g = {}
        for s in st:
            if s[kunci]:
                g.setdefault(s[kunci], []).append(s)
        return {k: {"n_stasiun": len(v), "tmat_cm_rata": round(sum(x["tmat_cm"] for x in v) / len(v), 1),
                    "bagian_di_bawah_baku": round(sum(x["bagian_di_bawah_baku"] for x in v) / len(v), 3)} for k, v in sorted(g.items())}
    return st, agg("khg"), agg("prov")


def uji_nilai(log):
    """Gerbang data. Sampai syarat terpenuhi: TAK TERUJI. Model logistik baru ditulis setelah data cukup (spesifikasi di docstring)."""
    hari = {t for s in log.values() for t in s["seri"]}
    if len(log) < SYARAT_STASIUN or len(hari) < SYARAT_HARI:
        return {"vonis": "TAK TERUJI", "alasan": f"{len(log)} stasiun (perlu >= {SYARAT_STASIUN}), {len(hari)} hari log (perlu >= {SYARAT_HARI}); pencatatan lanjut"}
    return {"vonis": "TAK TERUJI", "alasan": "data cukup tetapi model belum ditulis; lihat docstring"}


def main():
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    baris, status = dari_publik()
    csv_ = dari_csv()
    if csv_:
        baris, status = baris + csv_, ("publik+csv" if baris else "csv")
    log = gabung(log, baris)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(log, open(LOG, "w"), separators=(",", ":"))
    hari_ini = dt.datetime.now(WIB).date().isoformat()
    st, khg, prov = ringkas(log, hari_ini)
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": "BRGM SiPALAGA (sipalaga.brg.go.id)", "akses": status,
           "baku": "TMAT <= 40 cm di bawah permukaan (PP 57/2016 jo. PP 71/2014); tmat_cm negatif = di bawah permukaan", "n_stasiun": len(st),
           "catatan": "" if st else "SiPALAGA dilindungi tantangan Cloudflare (403); tidak ditembus. Isi data/tmat/*.csv dari ekspor resmi atau izin BRGM.",
           "uji": uji_nilai(log), "stasiun": st, "per_khg": khg, "per_provinsi": prov}
    json.dump(out, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"tmat: akses={status} stasiun={len(st)} uji={out['uji']['vonis']}")


def periksa():
    log = gabung({}, [{"id": "A", "nama": "x", "lat": -2.0, "lon": 114.0, "khg": "K1", "prov": "62", "tgl": "2026-10-28", "tmat_cm": -55.0},
                      {"id": "A", "nama": "x", "lat": -2.0, "lon": 114.0, "khg": "K1", "prov": "62", "tgl": "2026-10-29", "tmat_cm": -20.0}])
    st, khg, _ = ringkas(log, "2026-10-30")
    assert st[0]["tmat_cm"] == -20.0 and st[0]["bagian_di_bawah_baku"] == 0.5 and khg["K1"]["n_stasiun"] == 1
    assert _baris({"id": 1, "lat": "x", "lon": 1, "tgl": "2026-01-01", "tmat_cm": 1}) is None
    assert uji_nilai(log)["vonis"] == "TAK TERUJI"
    print("tmat: self-check OK")


if __name__ == "__main__":
    periksa() if "--uji" in sys.argv else main()
