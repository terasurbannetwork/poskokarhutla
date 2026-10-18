"""Sumber resmi BNPB untuk kekeringan (data.bnpb.go.id CKAN + InaRISK apiv4, tanpa login; peta sumber: docs/multi-bencana/SUMBER-BNPB.md).

  public/data/kekeringan_resmi.json  SK status keadaan darurat 2025 (resource 5599c3f4...) yang menyebut kekeringan. `tipe`: "khusus" = judul SK menyebut kekeringan,
                                     "multi" = SK hidrometeorologi umum yang daftar bencananya memuat kekeringan. Label "BNPB"; tampil terpisah dan didahulukan dari
                                     "Deteksi Pantau Bencana". Satu-satunya dataset SK di CKAN (dicek 18 Okt 2026) hanya tahun 2025, jadi `aktif` hampir pasti kosong.
  public/data/kekeringan_bnpb.json   sawah/lahan: seri ha rusak akibat kekeringan per tahun (nasional, 2010-2024; resource cda5f236... dan 1e489e0a...);
                                     irbi: indeks risiko kekeringan per kab 2015-2025 (InaRISK /data-irbi-full). Dibaca bukti.py dan dampak.py.
IRBI: 2025 dihitung dengan metode baru (skala berbeda: 12 -> 7), jadi `arah` hanya memakai 2015-2024 dan v25 berdiri sendiri. Lisensi InaRISK tak tertulis: sebut "Sumber: InaRISK BNPB".
get-infra-risk/{kab}/kekeringan dilewati: ~3,7 dtk per panggilan x 514 kab = ~32 menit, lisensi tak tertulis, belum ada layar yang memakainya.
Pakai:  python3 scripts/kekeringan/resmi.py   |   python3 scripts/kekeringan/resmi.py uji
"""
import datetime as dt, json, os, sys, time, urllib.parse, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan

AKAR = os.path.normpath(os.path.join(AB, "../.."))
RESMI, BNPB = (os.path.join(AKAR, f"public/data/kekeringan_{n}.json") for n in ("resmi", "bnpb"))
WIB = dt.timezone(dt.timedelta(hours=7))
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
CKAN = "https://data.bnpb.go.id/api/3/action/datastore_search?resource_id={}&limit=2000"
INA = "https://inarisk.bnpb.go.id/apiv4"
R_SK, R_SAWAH, R_LAHAN = "5599c3f4-71f2-4f8b-9846-304fca0fdc8a", "cda5f236-01f8-4b1f-945d-192806480fac", "1e489e0a-77a1-4ac5-9511-ce436aee0132"
STATUS = {"Siaga Darurat", "Tanggap Darurat", "Transisi Darurat ke Pemulihan"}
UMUR_IRBI_HARI = 25   # IRBI tahunan: tarik ulang paling sering sebulan sekali


def ambil(url, teks=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        b = r.read()
    return b.decode() if teks else json.loads(b)


def ckan(rid):
    d = ambil(CKAN.format(rid))
    if not d.get("success"):
        raise RuntimeError(f"CKAN {rid}: {d}")
    return d["result"]["records"]


def sk_kekeringan(rec, hari):
    """rec = records resource SK -> (daftar SK kekeringan urut mulai terbaru, jumlah baris dibuang). Baris tanpa kunci wajib atau status/tanggal tak sah dibuang dan dihitung."""
    if not isinstance(rec, list) or (rec and any(k not in rec[0] for k in ("jenis_bencana_sk", "jenis_bencana", "status_keadaan_darurat", "tgl_mulai", "tgl_berakhir"))):
        raise ValueError("bentuk resource SK tak dikenal")
    out, buang = [], 0
    for x in rec:
        sk, js = (x.get("jenis_bencana_sk") or ""), (x.get("jenis_bencana") or "")
        if "kering" not in (sk + " " + js).lower():
            continue
        try:
            a, b = dt.date.fromisoformat(x["tgl_mulai"][:10]), dt.date.fromisoformat(x["tgl_berakhir"][:10])
        except (TypeError, ValueError, KeyError):
            buang += 1
            continue
        if x.get("status_keadaan_darurat") not in STATUS or b < a:
            buang += 1
            continue
        out.append({"nomor": x.get("nomor_sk_status_keadaan_darurat"), "prov": x.get("provinsi"), "kab": x.get("kabupaten") or None, "id_kab": x.get("id_kab") or None,
                    "jenis": sk, "tipe": "khusus" if "kering" in sk.lower() else "multi", "status": x["status_keadaan_darurat"], "ket": x.get("keterangan_status"),
                    "mulai": a.isoformat(), "akhir": b.isoformat(), "aktif": a <= hari <= b, "surat": x.get("tautan_surat")})
    out.sort(key=lambda r: (r["mulai"], r["nomor"] or ""), reverse=True)
    return out, buang


def seri_kering(rec):
    """records ha-rusak per jenis bencana -> {'2010': ha, ...} baris KEKERINGAN; tahun tanpa nilai dibuang, nilai negatif ditolak."""
    for x in rec:
        if str(x.get("JENIS BENCANA", "")).strip().upper() == "KEKERINGAN":
            out = {}
            for k, v in x.items():
                if k.endswith(".0") and k[:4].isdigit() and v is not None:
                    if v < 0:
                        raise ValueError(f"luas negatif {k}={v}")
                    out[k[:4]] = round(v, 1)
            return dict(sorted(out.items()))
    return {}


def irbi(baris, nama):
    """baris = NDJSON InaRISK (list str), nama = {pcode: nama kab} -> ({pcode: {...}}, ambang tinggi). Menolak tahun/nilai tak sah."""
    seri = {}
    for l in baris:
        r = json.loads(l)
        if r.get("type") != "row":
            continue
        d = r["data"]
        if not 2015 <= d["tahun"] <= 2030 or (d["kekeringan"] is not None and d["kekeringan"] < 0):
            raise ValueError(f"IRBI tak sah: {d['pcode']} {d['tahun']} {d['kekeringan']}")
        seri.setdefault(d["pcode"], {})[d["tahun"]] = d["kekeringan"]
    v25 = sorted(s[2025] for s in seri.values() if s.get(2025) is not None)
    ambang = v25[len(v25) * 2 // 3] if v25 else None
    out = {}
    for p, s in seri.items():
        lama = [s.get(y) for y in range(2015, 2025)]
        if any(v is None for v in lama) or s.get(2025) is None or p not in nama:
            continue
        a, b = sum(lama[:3]) / 3, sum(lama[-3:]) / 3
        out[p] = {"nama": nama[p], "seri": [round(v, 1) for v in lama], "v25": round(s[2025], 1), "tinggi": s[2025] >= ambang,
                  "arah": "naik" if b > a * 1.05 else "turun" if b < a * .95 else "tetap"}
    return out, ambang


def tarik_irbi():
    nama = {}
    for p in ambil(INA + "/provinsi"):
        for k in ambil(f"{INA}/kabupaten/{p['id_provinsi']}"):
            nama[k["id_kabupaten"]] = k["nama_kabupaten"]
        time.sleep(.3)
    return irbi(ambil(INA + "/data-irbi-full", teks=True).splitlines(), nama)


def tulis():
    hari = dt.datetime.now(WIB).date()
    now = dt.datetime.now(WIB).isoformat(timespec="minutes")
    rec = ckan(R_SK)
    sk, buang = sk_kekeringan(rec, hari)
    simpan(RESMI, {"label": "BNPB", "sumber": "data.bnpb.go.id, Data Status Keadaan Darurat Bencana 2025", "diambil": now, "tahun_data": 2025, "n_sk_total": len(rec),
                   "n": len(sk), "n_aktif": sum(r["aktif"] for r in sk), "dibuang": buang, "sk": sk})
    lama = baca(BNPB, {}) or {}
    out = {"label": "BNPB", "diambil": now, "sumber": {"sawah": "BNPB, Luas sawah rusak per jenis bencana 2010-2024 (data.bnpb.go.id)", "lahan": "BNPB, Luas lahan/kebun/hutan rusak 2010-2024 (data.bnpb.go.id)",
                                                       "irbi": "InaRISK BNPB, Indeks Risiko Bencana Indonesia (IRBI)"}}
    for kunci, rid in (("sawah", R_SAWAH), ("lahan", R_LAHAN)):
        try:
            s = seri_kering(ckan(rid))
        except Exception as e:
            print(f"  {kunci}: {e}", file=sys.stderr)
            s = lama.get(kunci)
        if s:
            out[kunci] = s
    segar = lama.get("irbi") and (hari - dt.date.fromisoformat(lama["diambil_irbi"])).days < UMUR_IRBI_HARI
    if segar:
        out.update({k: lama[k] for k in ("irbi", "irbi_ambang_tinggi", "diambil_irbi")})
    else:
        try:
            ir, amb = tarik_irbi()
            out.update({"irbi": ir, "irbi_ambang_tinggi": amb, "diambil_irbi": hari.isoformat()})
        except Exception as e:
            print(f"::warning title=irbi::IRBI gagal ({e}); pakai yang lama", file=sys.stderr)
            out.update({k: lama[k] for k in ("irbi", "irbi_ambang_tinggi", "diambil_irbi") if k in lama})
    out["irbi_catatan"] = "2015-2024 satu metode (arah = rerata 2022-24 vs 2015-17, +-5%); v25 metode baru, skala tak sebanding. Skor 1-26 pada v25; tinggi = sepertiga teratas."
    simpan(BNPB, out)
    print(f"resmi kekeringan: {len(sk)} SK ({sum(r['tipe'] == 'khusus' for r in sk)} khusus, {sum(r['aktif'] for r in sk)} aktif, {buang} dibuang); "
          f"sawah {len(out.get('sawah', {}))} th, lahan {len(out.get('lahan', {}))} th, irbi {len(out.get('irbi', {}))} kab")


def uji():
    H = dt.date(2025, 9, 1)
    base = {"nomor_sk_status_keadaan_darurat": "1", "provinsi": "P", "kabupaten": "K", "id_kab": "12.12", "jenis_bencana_sk": "Kekeringan", "jenis_bencana": "Kekeringan",
            "status_keadaan_darurat": "Siaga Darurat", "keterangan_status": "x", "tgl_mulai": "2025-08-01T00:00:00", "tgl_berakhir": "2025-09-30T00:00:00", "tautan_surat": "u"}
    rec = [base, {**base, "nomor_sk_status_keadaan_darurat": "2", "jenis_bencana_sk": "Hidrometeorologi", "jenis_bencana": "Banjir,Kekeringan", "tgl_berakhir": "2025-08-15T00:00:00"},
           {**base, "jenis_bencana_sk": "Banjir", "jenis_bencana": "Banjir"}, {**base, "status_keadaan_darurat": "Aman"}, {**base, "tgl_berakhir": "2025-07-01T00:00:00"},
           {**base, "tgl_mulai": None}]
    sk, buang = sk_kekeringan(rec, H)
    assert [r["nomor"] for r in sk] == ["2", "1"] and buang == 3 and sk[1]["aktif"] and not sk[0]["aktif"] and sk[1]["tipe"] == "khusus" and sk[0]["tipe"] == "multi", (sk, buang)   # mulai sama: nomor menurun
    try:
        sk_kekeringan([{"x": 1}], H)
        raise SystemExit("bentuk salah harus ditolak")
    except ValueError:
        pass
    assert seri_kering([{"JENIS BENCANA": "BANJIR", "2010.0": 5}, {"JENIS BENCANA": "KEKERINGAN", "2010.0": 20856.04, "2016.0": None, "2019.0": 0}]) == {"2010": 20856.0, "2019": 0}
    try:
        seri_kering([{"JENIS BENCANA": "KEKERINGAN", "2010.0": -3}])
        raise SystemExit("negatif harus ditolak")
    except ValueError:
        pass

    def b(p, th, v):
        return json.dumps({"type": "row", "data": {"pcode": p, "tahun": th, "kekeringan": v}})
    baris = [json.dumps({"type": "meta"})] + [b("1101", y, 12) for y in range(2015, 2025)] + [b("1101", 2025, 20)] + \
            [b("1102", y, 10 if y < 2018 else 14) for y in range(2015, 2025)] + [b("1102", 2025, 5)] + [b("9999", y, 1) for y in range(2015, 2026)]
    r, amb = irbi(baris, {"1101": "A", "1102": "B"})
    assert set(r) == {"1101", "1102"} and r["1101"]["arah"] == "tetap" and r["1102"]["arah"] == "naik" and r["1101"]["tinggi"] and not r["1102"]["tinggi"], (r, amb)
    for salah in (b("1101", 1999, 3), b("1101", 2020, -1)):
        try:
            irbi([salah], {})
            raise SystemExit("IRBI salah harus ditolak")
        except ValueError:
            pass
    print("resmi kekeringan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tulis()
