"""Nilai prakiraan PM2,5 kota terhadap stasiun terukur setelah harinya lewat -> public/udara/data/nilai_prakiraan.json (+ arsip stasiun_harian.json)

Log prakiraan : prakiraan.py sudah menulis prakiraan_arsip.json (append-only: r24 hari+1 dan hari+2 per kab/kota, kunci = hari WIB jalan pertama
                di hari itu). Berkas ini TIDAK menggandakannya; ia hanya menambah sisi pengamatan yang dulu tidak ada.
Pengamatan    : stasiun_harian.json, append-only, {stasiun: {nama, lat, lon, sumber, h: {hari WIB: PM2,5 rata-rata 24 jam}}}, simpan 90 hari.
                ISPU (ispu.json): a_pm25 = rata-rata 24 jam berjalan berstempel AKHIR periode, jadi bacaan dalam 2 jam dari 00:00 WIB
                (17:00 UTC) = rata-rata hari WIB yang baru usai. BMKG (bmkg_pm25.json): rata-rata per jam, hari WIB penuh dengan >= 18 jam.
                Hari yang sudah tercatat tidak pernah ditimpa.
Pasangan      : (kota, hari jalan D, lead 1 atau 2) dengan >= 1 stasiun dalam 25 km yang punya pengamatan hari D+lead. Obs = rata-rata stasiun.
                Persistensi = pengamatan terakhir yang sudah diketahui saat jalan (hari D-1, stasiun yang sama) dibawa ke depan.
Skor          : kategori ISPU tepat, meleset <= 1 kategori, median rasio prakiraan/obs, dan persistensi pada himpunan pasangan yang SAMA
                (model dinilai ulang pada himpunan itu, supaya perbandingan adil). Per lead; skor HANYA keluar bila n >= 20 pasangan,
                di bawah itu hanya hitungan. Pasangan satu kota antar hari saling bergantung: n_kota dan n_hari ikut dicatat.
Pola          : verify.py HazeWatch (MIT; STATION_KM 25, MIN_PAIRS 20, persistensi sebagai pembanding wajib).
Pakai         : python3 scripts/udara/nilai_prakiraan.py [uji]   (dirantai di jalan.py sesudah bmkg_pm25 dan ispu)
"""
import datetime as dt
import os
import random
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import prakiraan

KM = 25.0
MATCH_JAM = 2
MIN_PASANG = 20
MIN_HARI = 20      # hari jalan berbeda; pasangan satu hari saling bergantung (cuaca sama), jadi n pasangan saja tak cukup
BOOT, BENIH = 1000, 20261124
SIMPAN_HARI = 90
BATAS_ISPU = [15.5, 55.4, 150.4, 250.4]   # P.14/2020: baik, sedang, tidak sehat, sangat tidak sehat, berbahaya
BERKAS_HARIAN = "stasiun_harian.json"


def kat(v):
    return sum(v > b for b in BATAS_ISPU)


# ---------- arsip pengamatan ----------
def tambah_ispu(arsip, ispu):
    """Bacaan ISPU dalam MATCH_JAM dari akhir hari WIB (17:00 UTC) jadi rata-rata hari itu. Mengembalikan jumlah hari baru."""
    baru = 0
    for s in ispu.get("stasiun", []):
        t = alat.dari_iso(s["t"])
        akhir = t.replace(hour=17, minute=0, second=0, microsecond=0)
        akhir = min((akhir + dt.timedelta(days=k) for k in (-1, 0, 1)), key=lambda a: abs(a - t))
        if abs((t - akhir).total_seconds()) > MATCH_JAM * 3600:
            continue
        hari = akhir.date().isoformat()   # 17:00 UTC tanggal X = 00:00 WIB X+1 = akhir hari WIB X
        a = arsip.setdefault("ispu:" + s["id"], {"nama": s["nama"], "lat": s["lat"], "lon": s["lon"], "sumber": "ispu", "h": {}})
        if hari not in a["h"]:
            a["h"][hari] = s["pm25"]
            baru += 1
    return baru


def tambah_bmkg(arsip, bmkg):
    """Deret per jam BMKG (WIB) -> rata-rata hari WIB yang sudah usai dan punya >= 18 jam nilai."""
    baru = 0
    for s in bmkg.get("stasiun", []):
        t0 = dt.datetime.fromisoformat(s["t0"])
        akhir = dt.datetime.fromisoformat(s["t"])
        per_hari = {}
        for k, v in enumerate(s["deret"]):
            if v is not None:
                per_hari.setdefault((t0 + dt.timedelta(hours=k)).date().isoformat(), []).append(v)
        for hari, v in per_hari.items():
            if len(v) >= 18 and hari < akhir.date().isoformat():
                a = arsip.setdefault("bmkg:" + s["nama"], {"nama": s["nama"], "lat": s["lat"], "lon": s["lon"], "sumber": "bmkg", "h": {}})
                if hari not in a["h"]:
                    a["h"][hari] = round(sum(v) / len(v), 1)
                    baru += 1
    return baru


def pangkas(arsip):
    semua = [h for a in arsip.values() for h in a["h"]]
    if not semua:
        return arsip
    batas = (dt.date.fromisoformat(max(semua)) - dt.timedelta(days=SIMPAN_HARI)).isoformat()
    return {k: dict(a, h={h: v for h, v in sorted(a["h"].items()) if h >= batas}) for k, a in sorted(arsip.items())
            if any(h >= batas for h in a["h"])}


# ---------- penilai ----------
def pasangan(arsip_pr, kota, stasiun):
    """arsip_pr {tgl: {kode: [h+1, h+2]}}, kota [{kode, lat, lon}], stasiun arsip pengamatan -> daftar pasangan."""
    dekat = {}
    for k in kota:
        dekat[k["kode"]] = [sid for sid, s in stasiun.items() if alat.jarak_km(k["lat"], k["lon"], s["lat"], s["lon"]) <= KM]
    out = []
    for tgl, isi in arsip_pr.items():
        d = dt.date.fromisoformat(tgl)
        kemarin = (d - dt.timedelta(days=1)).isoformat()
        for kode, fc in isi.items():
            sts = dekat.get(kode)
            if not sts:
                continue
            for lead in (1, 2):
                f = fc[lead - 1]
                hari = (d + dt.timedelta(days=lead)).isoformat()
                o = [stasiun[s]["h"][hari] for s in sts if hari in stasiun[s]["h"]]
                if f is None or not o:
                    continue
                pers = [stasiun[s]["h"][kemarin] for s in sts if hari in stasiun[s]["h"] and kemarin in stasiun[s]["h"]]
                out.append({"tgl": tgl, "kode": kode, "lead": lead, "fc": f, "obs": sum(o) / len(o), "n_st": len(o),
                            "pers": sum(pers) / len(pers) if pers else None})
    return out


def skor(ps):
    """pasangan satu lead -> ringkasan; skor null di bawah MIN_PASANG."""
    n = len(ps)
    out = {"n": n, "n_kota": len({p["kode"] for p in ps}), "n_hari_jalan": len({p["tgl"] for p in ps}),
           "n_stasiun_rata": round(statistics.mean(p["n_st"] for p in ps), 1) if ps else None}
    if n < MIN_PASANG or out["n_hari_jalan"] < MIN_HARI:
        return dict(out, skor=None, alasan=f"baru {n} pasangan dari {out['n_hari_jalan']} hari jalan, skor dan vonis keluar sesudah >= {MIN_PASANG} pasangan DAN >= {MIN_HARI} hari jalan")
    tepat = lambda a, b: kat(a) == kat(b)
    sk = {"tepat": round(sum(tepat(p["fc"], p["obs"]) for p in ps) / n, 3),
          "meleset_paling_banyak_1": round(sum(abs(kat(p["fc"]) - kat(p["obs"])) <= 1 for p in ps) / n, 3),
          "rasio_median": round(statistics.median(p["fc"] / max(p["obs"], 1) for p in ps), 2)}
    pp = [p for p in ps if p["pers"] is not None]
    if len(pp) >= MIN_PASANG and len({p["tgl"] for p in pp}) >= MIN_HARI:
        mt = sum(tepat(p["fc"], p["obs"]) for p in pp) / len(pp)
        pt = sum(tepat(p["pers"], p["obs"]) for p in pp) / len(pp)
        per, rng, diff = {}, random.Random(BENIH), []
        for p in pp:
            per.setdefault(p["tgl"], []).append(tepat(p["fc"], p["obs"]) - tepat(p["pers"], p["obs"]))
        hari = sorted(per)
        for _ in range(BOOT):
            v = [x for h in (rng.choice(hari) for _ in hari) for x in per[h]]
            diff.append(sum(v) / len(v))
        diff.sort()
        ci = [round(diff[int(.025 * (BOOT - 1))], 3), round(diff[int(.975 * (BOOT - 1))], 3)]
        sk["persistensi"] = {"n": len(pp), "tepat_model": round(mt, 3), "tepat_persistensi": round(pt, 3),
                             "meleset_paling_banyak_1_model": round(sum(abs(kat(p["fc"]) - kat(p["obs"])) <= 1 for p in pp) / len(pp), 3),
                             "meleset_paling_banyak_1_persistensi": round(sum(abs(kat(p["pers"]) - kat(p["obs"])) <= 1 for p in pp) / len(pp), 3),
                             "selisih_tepat": round(mt - pt, 3), "ci95_selisih": ci, "ci_metode": f"bootstrap per hari jalan, {BOOT} ulangan, benih {BENIH}",
                             "vonis": "model_menang" if ci[0] > 0 else "persistensi_menang" if ci[1] < 0 else "belum_dapat_dibedakan"}
    else:
        sk["persistensi"] = None
    return dict(out, skor=sk)


def nilai(arsip_pr, kota, stasiun, sekarang_wib, koreksi=None):
    ps = [p for p in pasangan(arsip_pr, kota, stasiun) if (dt.date.fromisoformat(p["tgl"]) + dt.timedelta(days=p["lead"])).isoformat() < sekarang_wib]
    hari = sorted({p["tgl"] for p in ps})
    return {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "jarak_stasiun_km": KM, "min_pasangan": MIN_PASANG,
            "stasiun_n": len(stasiun), "periode_jalan": [hari[0], hari[-1]] if hari else None,
            "metode": ("prakiraan r24 kota (" + (f"CAMS, koreksi stasiun: {koreksi}" if koreksi else "CAMS, status koreksi tak diketahui") + ") vs rata-rata stasiun ISPU KLH dan BMKG dalam 25 km pada hari WIB sasaran; "
                       "persistensi = pengamatan hari sebelum jalan dibawa ke depan; kategori P.14/2020"),
            "lead": {str(L): skor([p for p in ps if p["lead"] == L]) for L in (1, 2)},
            "catatan": "Pengamatan stasiun belum divalidasi; arsip pengamatan baru mulai tumbuh, jadi n kecil di awal"}


def main():
    arsip = alat.keluaran(BERKAS_HARIAN, {}).get("st", {})
    a_ispu = tambah_ispu(arsip, alat.keluaran("ispu.json", {}))
    a_bmkg = tambah_bmkg(arsip, alat.keluaran("bmkg_pm25.json", {}))
    arsip = pangkas(arsip)
    nb = alat.simpan(BERKAS_HARIAN, {"v": 1, "catatan": "append-only; h = rata-rata PM2,5 24 jam hari WIB (µg/m³)", "st": arsip})
    arsip_pr = prakiraan.arsip_dict(alat.keluaran("prakiraan_arsip.json", {}))
    hari_ini = dt.datetime.now(alat.WIB).date().isoformat()
    d = nilai(arsip_pr, alat.kota(), arsip, hari_ini, alat.keluaran("prakiraan.json", {}).get("koreksi", {}).get("status"))
    alat.simpan("nilai_prakiraan.json", d)
    alat.log(f"nilai_prakiraan: arsip stasiun {len(arsip)} ({nb // 1024} KB; +{a_ispu} hari ISPU, +{a_bmkg} hari BMKG); "
             + "; ".join(f"lead {L}: n={v['n']} skor={'ada' if v['skor'] else 'belum'}" for L, v in d["lead"].items()))


def uji():
    # kategori: batas atas masuk kategori bawahnya
    assert [kat(v) for v in (15.5, 15.6, 55.4, 55.5, 150.4, 250.5)] == [0, 1, 1, 2, 2, 4]
    # ISPU: bacaan 18:00Z = 1 jam sesudah 17:00Z -> hari WIB tanggal itu; 06:00Z jauh -> dibuang; 16:00Z (-1 jam) -> tanggal itu juga
    ar = {}
    ispu = {"stasiun": [{"id": "A", "nama": "A", "lat": 0, "lon": 0, "t": "2026-11-10T18:00Z", "pm25": 40},
                        {"id": "B", "nama": "B", "lat": 0, "lon": 0, "t": "2026-11-11T06:00Z", "pm25": 99},
                        {"id": "C", "nama": "C", "lat": 0, "lon": 0, "t": "2026-11-10T16:00Z", "pm25": 20},
                        {"id": "D", "nama": "D", "lat": 0, "lon": 0, "t": "2026-11-10T14:59Z", "pm25": 20}]}
    assert tambah_ispu(ar, ispu) == 2 and ar["ispu:A"]["h"] == {"2026-11-10": 40} and ar["ispu:C"]["h"] == {"2026-11-10": 20}
    ispu["stasiun"][0]["pm25"] = 999   # append-only: hari yang sudah ada tidak ditimpa
    assert tambah_ispu(ar, ispu) == 0 and ar["ispu:A"]["h"]["2026-11-10"] == 40
    # BMKG: 10 Nov penuh 24 jam rata 30; 11 Nov baru sampai jam 10 (hari berjalan) -> tidak dicatat; 9 Nov hanya 17 jam -> tidak
    t0 = dt.datetime(2026, 11, 9, 0, tzinfo=alat.WIB)
    deret = [10.0] * 17 + [None] * 7 + [30.0] * 24 + [50.0] * 11
    bm = {"stasiun": [{"nama": "Bx", "lat": 0, "lon": 0, "t0": t0.isoformat(), "t": (t0 + dt.timedelta(hours=len(deret) - 1)).isoformat(), "deret": deret}]}
    ar2 = {}
    assert tambah_bmkg(ar2, bm) == 1 and ar2["bmkg:Bx"]["h"] == {"2026-11-10": 30.0}, ar2
    # pangkas: hari lebih tua dari 90 hari dibuang, stasiun tanpa hari tersisa ikut hilang
    p = pangkas({"x": {"h": {"2026-01-01": 1, "2026-11-10": 2}}, "y": {"h": {"2026-01-01": 3}}})
    assert list(p) == ["x"] and p["x"]["h"] == {"2026-11-10": 2}, p
    # pasangan + skor: kota K, stasiun S dalam 25 km, S2 di luar
    kota = [{"kode": "K", "lat": 0.0, "lon": 0.0}, {"kode": "J", "lat": 0.0, "lon": 5.0}]
    st = {"s1": {"lat": 0.1, "lon": 0.0, "h": {}}, "s2": {"lat": 0.0, "lon": 1.0, "h": {"2026-11-12": 999}}}
    arsip_pr, hari0 = {}, dt.date(2026, 11, 1)
    for i in range(30):   # 30 hari jalan; obs 40 tiap hari; prakiraan tepat (50) lead 1, meleset 2 kategori (200) lead 2
        d = hari0 + dt.timedelta(days=i)
        arsip_pr[d.isoformat()] = {"K": [50, 200], "J": [50, 50]}
        for L in (-1, 0, 1, 2):
            st["s1"]["h"][(d + dt.timedelta(days=L)).isoformat()] = 40
    ps = pasangan(arsip_pr, kota, st)
    assert {p["kode"] for p in ps} == {"K"} and len(ps) == 60 and all(p["n_st"] == 1 for p in ps)   # J tanpa stasiun, s2 di luar 25 km
    hasil = nilai(arsip_pr, kota, st, "2026-12-30")
    l1, l2 = hasil["lead"]["1"]["skor"], hasil["lead"]["2"]["skor"]
    assert l1["tepat"] == 1.0 and l2["tepat"] == 0.0 and l2["meleset_paling_banyak_1"] == 0.0 and l1["rasio_median"] == 1.25, (l1, l2)
    assert l1["persistensi"]["vonis"] == "belum_dapat_dibedakan" and l1["persistensi"]["tepat_persistensi"] == 1.0
    sedikit = nilai({k: v for k, v in list(arsip_pr.items())[:5]}, kota, st, "2026-12-30")   # 5 jalan x 1 kota = 5 pasangan < 20
    assert sedikit["lead"]["1"]["skor"] is None and sedikit["lead"]["1"]["n"] == 5 and "baru 5" in sedikit["lead"]["1"]["alasan"]
    assert nilai(dict(list(arsip_pr.items())[:19]), kota, st, "2026-12-30")["lead"]["1"]["skor"] is None   # 19 hari jalan (38 pasangan): belum cukup hari
    assert "koreksi stasiun: terkoreksi" in nilai(arsip_pr, kota, st, "2026-12-30", "terkoreksi")["metode"]
    # hari sasaran yang belum lewat tidak dinilai
    assert nilai(arsip_pr, kota, st, "2026-11-03")["lead"]["1"]["n"] == 1
    # persistensi menang: prakiraan selalu kategori 'baik' sedangkan obs hari sasaran 40 (sedang) tetapi kemarin 40 juga -> model kalah
    arsip_k = {(hari0 + dt.timedelta(days=i)).isoformat(): {"K": [5, 5]} for i in range(30)}
    v = nilai(arsip_k, kota, st, "2026-12-30")["lead"]["1"]["skor"]["persistensi"]
    assert v["vonis"] == "persistensi_menang" and v["tepat_model"] == 0.0, v
    print("nilai_prakiraan uji: lulus")


if __name__ == "__main__":
    uji()
    if sys.argv[1:] != ["uji"]:
        main()
