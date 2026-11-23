"""Tiga dataset publik DIBI BNPB (Superset, tanpa login; tidak resmi) yang belum dipakai pipeline lain:
  public/data/dibi_status_darurat.json  dasbor 83, dataset 131 monitoring_keadaan_darurat (SK status darurat per wilayah)
  public/data/dibi_posko.json           dataset 156 v_posko_pengungsian_4superset (posko per desa, koordinat, jumlah)
  public/data/dibi_rambu.json           dasbor 52, dataset 74 IDRIP 2023 (rekap rambu per kab/kec/jenis)
Akses: POST /api/v1/chart/data dengan datasource id + form_data{slice_id, dashboardId}. Dataset 131 dan 74 hanya terbuka bila
slice_id = chart yang memang ada di dasbornya (437 dan 198); dataset 156 menerima dasbor 75.

KEAMANAN: instans DIBI pernah dibobol (chart "HACKED BY UNKNOWN1337", dataset "fuck_panel_..."). Semua teks disaring: baris yang memuat
pola perusakan, tag/skrip, atau data pribadi (nomor HP, NIK) DITOLAK dan dihitung di `ditolak`. Teks hanya disimpan sebagai data.
tautan SK hanya http(s) ke go.id atau bnpb; selain itu null (tautan_ditolak dihitung).

Pakai:  python3 scripts/umum/dibi_lain.py   |   python3 scripts/umum/dibi_lain.py uji
"""
import datetime as dt, importlib.util, json, os, re, sys
from collections import Counter
from urllib.parse import urlparse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DATA = os.path.join(AKAR, "public/data")
DIBI = "https://dibi.bnpb.go.id/api/v1/chart/data"
SUMBER = "DIBI BNPB (dibi.bnpb.go.id, Superset publik)"


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


RUSAK = re.compile(r"hack|deface|defac|1337|fuck|panel|<|>|javascript:|vbscript:|data:text|onerror|onload|base64|union\s+select|\bdrop\s+table", re.I)
PRIBADI = re.compile(r"(?<!\d)(?:\+?62|0)8\d{8,11}(?!\d)|(?<!\d)\d{16}(?!\d)")


def bersih(v):
    """Teks -> teks rapi; ValueError('rusak'|'pribadi') bila memuat pola perusakan atau data pribadi."""
    t = re.sub(r"\s+", " ", str(v if v is not None else "")).strip()
    if RUSAK.search(t):
        raise ValueError("rusak", t)
    if PRIBADI.search(t.replace(" ", "").replace("-", "")):
        raise ValueError("pribadi", PRIBADI.sub("[disamarkan]", t))
    return t


def _alasan(e, r):
    a = e.args if isinstance(e, ValueError) and e.args and e.args[0] in ("rusak", "pribadi") else ()
    return (a[0], a[1]) if len(a) > 1 else ("nilai_tak_valid", json.dumps(r, ensure_ascii=False))


def tautan(v):
    """Sel tautan_surat (bisa '<a href=...>') -> URL http(s) go.id/bnpb, selain itu None."""
    m = re.search(r"""href=["']([^"']+)["']""", str(v or "")) or re.search(r"(https?://\S+)", str(v or ""))
    if not m:
        return None
    u = m.group(1).strip()
    if re.search(r"hack|deface|1337|fuck|script|panel", u, re.I):
        return None
    p = urlparse(u)
    h = (p.hostname or "").lower()
    ok = p.scheme in ("http", "https") and (h == "go.id" or h.endswith(".go.id")) and not re.search(r"[\s<>\"']", u)
    return u if ok else None


def tarik(ds, dash, sl, kolom, metrik=(), batas=50000):
    ambil = _muat("umum_jaring", "scripts/umum/jaring.py").ambil
    b = {"datasource": {"id": ds, "type": "table"}, "form_data": {"slice_id": sl, "dashboardId": dash},
         "queries": [{"columns": kolom, "metrics": [{"expressionType": "SQL", "sqlExpression": e, "label": l} for l, e in metrik],
                      "filters": [], "row_limit": batas, "orderby": []}], "result_format": "json", "result_type": "full"}
    r = ambil(DIBI, json.dumps(b).encode(), kepala={"Content-Type": "application/json"}, batas=300)["result"][0]["data"]
    if len(r) >= batas:
        raise RuntimeError(f"dataset {ds}: batas {batas} baris tercapai, data terpotong")
    return r


class Tolak:
    """Hitung baris ditolak per alasan + contoh (dipotong)."""

    def __init__(s):
        s.n, s.contoh = Counter(), []

    def tambah(s, alasan, isi):
        s.n[alasan] += 1
        if len(s.contoh) < 5:
            s.contoh.append({"alasan": alasan, "isi": str(isi)[:80]})

    def ringkas(s):
        return {"jumlah": sum(s.n.values()), "per_alasan": dict(s.n), "contoh": s.contoh}


def status(s):
    t = str(s or "").lower()
    return "Transisi Darurat ke Pemulihan" if "transisi" in t else "Tanggap Darurat" if "tanggap" in t else "Siaga Darurat" if "siaga" in t else None


def tgl(ms):
    try:
        return dt.datetime.fromtimestamp(float(ms) / 1000, dt.timezone.utc).date().isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def jenis_daftar(v):
    try:
        x = json.loads(v) if isinstance(v, str) and v.strip().startswith("[") else v
    except ValueError:
        x = v
    return [bersih(i) for i in (x if isinstance(x, list) else [x]) if i]


def susun_status(rows, tolak):
    out, n_tautan = [], 0
    for r in rows:
        try:
            st, mulai = status(r.get("status_keadaan_darurat")), tgl(r.get("tgl_mulai"))
            o = {"nomor": bersih(r.get("nomor_sk_status_keadaan_darurat")), "status": st, "jenis": jenis_daftar(r.get("jenis_bencana")),
                 "klasifikasi": bersih(r.get("klasifikasi_bencana")), "skala": "kabupaten" if str(r.get("skala_bencana") or "").lower().startswith("kab") else "provinsi",
                 "prov_kode": bersih(r.get("id_prov"))[:2], "prov": bersih(r.get("provinsi")), "kab_kode": bersih(r.get("id_kab")) or None,
                 "kab": bersih(r.get("kabupaten")), "mulai": mulai, "berakhir": tgl(r.get("tgl_berakhir")),
                 "keterangan": bersih(r.get("keterangan_status")), "aktif": str(r.get("status_aktif") or "").strip().upper() == "AKTIF"}
            asal = str(r.get("tautan_surat") or "")
            if RUSAK.search(re.sub(r"<a\s+href=[\"'][^\"']*[\"'][^>]*>[^<]*</a>", "", asal, flags=re.I)):
                raise ValueError("rusak", asal)   # sisa selain tautan baku <a href> memuat tag/skrip
        except ValueError as e:
            tolak.tambah(e.args[0], e.args[1] if len(e.args) > 1 else json.dumps(r, ensure_ascii=False))
            continue
        if mulai and mulai > (dt.date.today() + dt.timedelta(days=366)).isoformat():
            tolak.tambah("tanggal_tak_wajar", f"{o['nomor']} mulai {mulai}")   # salah ketik tahun di sumber
            continue
        if not st or not mulai:
            tolak.tambah("tanpa_status_atau_mulai", json.dumps({k: r.get(k) for k in ("nomor_sk_status_keadaan_darurat", "status_keadaan_darurat")}, ensure_ascii=False))
            continue
        o["tautan"] = tautan(asal)
        n_tautan += bool(asal.strip()) and o["tautan"] is None
        o["kab_bps"] = o["kab_kode"].replace(".", "") if o["kab_kode"] else None
        out.append(o)
    out.sort(key=lambda x: (x["mulai"], x["nomor"]), reverse=True)
    return out, n_tautan


def susun_posko(rows, tolak):
    kolom = ["kab", "kec", "desa", "lokasi", "terpusat", "mandiri", "jumlah", "lat", "lng", "sumber", "sumber_tgl", "desa_akurat", "id_desa_sdi"]
    out = []
    for r in rows:
        try:
            lat, lng = r.get("lat"), r.get("lng")
            lat = round(float(lat), 5) if lat is not None else None
            lng = round(float(lng), 5) if lng is not None else None
            if lat is not None and not (-12 <= lat <= 7 and 94 <= lng <= 142):
                lat = lng = None   # di luar kotak Indonesia: titik salah ketik
            out.append([bersih(r.get("kab")), bersih(r.get("kec")), bersih(r.get("desa")), bersih(r.get("lokasi")),
                        int(r["jumlah_terpusat"]) if r.get("jumlah_terpusat") is not None else None,
                        int(r["jumlah_mandiri"]) if r.get("jumlah_mandiri") is not None else None,
                        int(r["jumlah"]) if r.get("jumlah") is not None else None, lat, lng, bersih(r.get("sumber")),
                        str(r.get("sumber_tgl") or "")[:10] or None, bool(r.get("is_desa_akurat")), bersih(r.get("id_desa_sdi")) or None])
        except (ValueError, TypeError) as e:
            tolak.tambah(*_alasan(e, r))
    out.sort(key=lambda x: (x[0], x[1], x[2], x[3]))
    return kolom, out


def kelas_rambu(t):
    """Ejaan jenis rambu yang beragam (huruf besar/kecil, nomor urut, salah ketik) -> satu kelas; tak dikenal dibiarkan apa adanya."""
    k = re.sub(r"[\s\-]*\d+$", "", t.lower()).strip()
    if "kumpul" in k or "titk" in k:
        return "Rambu Titik Kumpul"
    if "kiri" in k:
        return "Rambu Evakuasi Arah Kiri"
    if "kanan" in k or "evkuasi" in k:
        return "Rambu Evakuasi Arah Kanan"
    if "peringatan" in k or "ancaman" in k or "rawan" in k:
        return "Rambu Peringatan Ancaman/Bahaya"
    return t


def susun_rambu(rows, tolak):
    jenis, per = [], Counter()
    for r in rows:
        try:
            k = [bersih(r.get(c)) for c in ("provinsi", "kota", "kecamatan", "jenis_rambu")]
            k[3] = kelas_rambu(k[3])
            n = int(r["jumlah"])
        except (ValueError, TypeError, KeyError) as e:
            tolak.tambah(*_alasan(e, r))
            continue
        if k[3] not in jenis:
            jenis.append(k[3])
        per[(k[0], k[1], k[2], jenis.index(k[3]))] += n
    baris = [[*k, v] for k, v in sorted(per.items())]
    return jenis, baris


def tulis(nama, meta, tolak, tambahan):
    simpan = _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan
    d = {"sumber": SUMBER, "tanggal_tarik": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date().isoformat(), **meta,
         "ditolak": tolak.ringkas(), **tambahan}
    jalur = os.path.join(DATA, nama)
    simpan(jalur, d)
    print(f"{nama}: {os.path.getsize(jalur)} B, ditolak {d['ditolak']['jumlah']} {d['ditolak']['per_alasan']}")
    return d


def jalan():
    gagal = 0
    try:
        rows = tarik(131, 83, 437, ["status_keadaan_darurat", "jenis_bencana", "klasifikasi_bencana", "skala_bencana", "id_prov", "provinsi", "id_kab",
                                    "kabupaten", "tgl_mulai", "tgl_berakhir", "keterangan_status", "tautan_surat", "nomor_sk_status_keadaan_darurat", "status_aktif"])
        t = Tolak()
        sk, n_tautan = susun_status(rows, t)
        tulis("dibi_status_darurat.json", {"catatan": f"SK status keadaan darurat dari dasbor Monitoring Status Darurat DIBI (dataset 131). {len(rows)} baris mentah. "
              f"Tautan SK hanya bila go.id atau bnpb; {n_tautan} tautan ditolak (umumnya Google Drive) jadi null. kab_kode = kode Kemendagri bertitik, kab_bps tanpa titik; "
              "skala provinsi: kab_kode null. Tanggal dalam UTC dari epoch DIBI. Bukan sumber resmi: SK CKAN dan Drive Pusdalops menang di status_darurat.json.",
              "n": len(sk), "tautan_ditolak": n_tautan}, t, {"sk": sk})
    except Exception as e:   # gagal-lunak: berkas lama dibiarkan
        gagal += 1
        print(f"dibi_lain status_darurat GAGAL: {e}", file=sys.stderr)
    try:
        t = Tolak()
        kolom, baris = susun_posko(tarik(156, 75, 1, ["kab", "kec", "desa", "lokasi", "jumlah_terpusat", "jumlah_mandiri", "jumlah", "lat", "lng",
                                                      "sumber", "sumber_tgl", "is_desa_akurat", "id_desa_sdi"]), t)
        tulis("dibi_posko.json", {"catatan": "Posko pengungsian per desa dari dataset DIBI v_posko_pengungsian_4superset (156). Tanpa nama orang, NIK, atau nomor HP: "
              "kolom sumber hanya nama instansi pelapor, baris yang memuat nomor HP/NIK ditolak. Koordinat di luar Indonesia di-null-kan. "
              "jumlah = jiwa pengungsi (terpusat + mandiri).", "n": len(baris)}, t, {"kolom": kolom, "posko": baris})
    except Exception as e:
        gagal += 1
        print(f"dibi_lain posko GAGAL: {e}", file=sys.stderr)
    try:
        t = Tolak()
        jenis, baris = susun_rambu(tarik(74, 52, 198, ["provinsi", "kota", "kecamatan", "jenis_rambu"], [("jumlah", "COUNT(*)")]), t)
        tulis("dibi_rambu.json", {"catatan": "Rekap rambu IDRIP 2023 (dasbor 52, dataset 74) per provinsi, kab/kota, kecamatan, jenis rambu. baris = [provinsi, kab, kec, indeks jenis, jumlah]. "
              "Nama kab/kota apa adanya dari DIBI (tanpa kode). jenis dirapikan dari ejaan beragam ke empat kelas (kumpul, kiri, kanan, peringatan); lainnya apa adanya.", "n": sum(b[-1] for b in baris)}, t, {"jenis": jenis, "kolom": ["provinsi", "kab", "kec", "jenis", "jumlah"], "rambu": baris})
    except Exception as e:
        gagal += 1
        print(f"dibi_lain rambu GAGAL: {e}", file=sys.stderr)
    sys.exit(1 if gagal else 0)


def uji():
    for x in ("HACKED BY UNKNOWN1337", "fuck_panel_179", "<script>alert(1)</script>", "javascript:x", "Hubungi 081234567890", "NIK 3201234567890001"):
        try:
            bersih(x)
            raise AssertionError(x)
        except ValueError:
            pass
    assert bersih("  Kab.  Ende ") == "Kab. Ende" and bersih(None) == ""
    assert tautan('<a href="https://bnpb.go.id/x.pdf" target="_blank">k</a>') == "https://bnpb.go.id/x.pdf"
    assert tautan("https://drive.google.com/file/d/1/view") is None and tautan("http://evil.com/bnpb.go.id") is None
    assert tautan("https://x.go.id.evil.com/a") is None and tautan("javascript:alert(1)") is None and tautan("") is None
    assert tautan("https://dibi.bnpb.go.id/a") == "https://dibi.bnpb.go.id/a" and tautan("https://www.bnpb.id/a") is None and tautan("https://x.go.id/hacked") is None
    assert [kelas_rambu(x) for x in ("RAMBU TEMPAT KUMPUL", "Rambu Evakuasi Arah Kiri -4", "Arah Evakuasi kanan", "Rambu Peringatan Tsunami", "Lain")] == [
        "Rambu Titik Kumpul", "Rambu Evakuasi Arah Kiri", "Rambu Evakuasi Arah Kanan", "Rambu Peringatan Ancaman/Bahaya", "Lain"]
    assert tgl(1767225600000.0) == "2026-01-01" and tgl(None) is None
    assert jenis_daftar('["Banjir", "Cuaca ekstrem"]') == ["Banjir", "Cuaca ekstrem"]
    base = {"status_keadaan_darurat": "Tanggap Darurat", "jenis_bencana": '["Banjir"]', "klasifikasi_bencana": "Hidro", "skala_bencana": "kabupaten",
            "id_prov": "13", "provinsi": "Sumatera Barat", "id_kab": "13.77", "kabupaten": "Kota Pariaman", "tgl_mulai": 1767225600000.0, "tgl_berakhir": None,
            "keterangan_status": "x", "tautan_surat": '<a href="https://drive.google.com/f">d</a>', "nomor_sk_status_keadaan_darurat": "01/2026", "status_aktif": "AKTIF"}
    t = Tolak()
    sk, nt = susun_status([base, dict(base, kabupaten="HACKED BY UNKNOWN1337"), dict(base, tautan_surat="<script>x</script>"),
                           dict(base, status_keadaan_darurat="?"), dict(base, tgl_mulai=None, nomor_sk_status_keadaan_darurat="2"),
                           dict(base, tgl_mulai=1861920000000.0, nomor_sk_status_keadaan_darurat="3")], t)
    assert len(sk) == 1 and sk[0]["kab_bps"] == "1377" and sk[0]["tautan"] is None and nt == 1 and sk[0]["aktif"] is True
    assert t.ringkas()["jumlah"] == 5 and t.n["rusak"] == 2 and t.n["tanpa_status_atau_mulai"] == 2 and t.n["tanggal_tak_wajar"] == 1 and "UNKNOWN1337" in json.dumps(t.contoh)
    t = Tolak()
    _, p = susun_posko([{"kab": "KAB. ENDE", "kec": "A", "desa": "B", "lokasi": "POS 1", "jumlah": 4, "jumlah_terpusat": 4, "jumlah_mandiri": None, "lat": -8.6, "lng": 121.7,
                         "sumber": "BPBD", "sumber_tgl": "2026-08-24 09:00:00+08", "is_desa_akurat": True, "id_desa_sdi": "1"},
                        {"kab": "K", "kec": "A", "desa": "B", "lokasi": "kontak 081234567890", "jumlah": 1, "lat": 0, "lng": 100, "sumber": "x"},
                        {"kab": "K", "kec": "A", "desa": "B", "lokasi": "POS 2", "jumlah": 1, "lat": 50, "lng": 10, "sumber": "x"}], t)
    assert len(p) == 2 and t.n["pribadi"] == 1 and {x[3]: x[7:9] for x in p} == {"POS 1": [-8.6, 121.7], "POS 2": [None, None]}
    t = Tolak()
    j, b = susun_rambu([{"provinsi": "A", "kota": "B", "kecamatan": "C", "jenis_rambu": "R1", "jumlah": 3}, {"provinsi": "A", "kota": "B", "kecamatan": "C", "jenis_rambu": "R2", "jumlah": 1},
                        {"provinsi": "A", "kota": "B", "kecamatan": "C", "jenis_rambu": "fuck_panel", "jumlah": 1}], t)
    assert j == ["R1", "R2"] and b == [["A", "B", "C", 0, 3], ["A", "B", "C", 1, 1]] and t.n["rusak"] == 1
    print("uji dibi_lain: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
