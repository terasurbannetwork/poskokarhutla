"""WIL-1 Meja Wilayah: siapa yang diurus hari ini, per direktorat penanganan darurat wilayah (DESAIN-TEKNIS sec 6.14; tiket RU-079).

Langkah jalan.py (harian). Masukan (semua berkas repo, tanpa jaringan): public/data/status_darurat.json, saran_status.json,
laphar_riwayat.json, public/prediksi/data/prediksi.json, public/data/bnpb/dit_wilayah.json (RU-078), wilayah.json.
Lima tipe antrean, tertinggi dulu (riset/3 W1):
  1 kejadian berjalan dengan korban meninggal atau pengungsi 1.000 jiwa atau lebih, laporan harian belum mencatat pendampingan
  2 SK status darurat berakhir dalam 2 hari dan kejadian di kab itu masih berjalan
  3 saran Tanggap Darurat tanpa SK lebih dari 3 hari (Perban 4/2020 Pasal 4, Jam Aturan dsp_laporan_kejadian)
  4 SK berakhir, DSP cair, SPJ belum (data DSP ada di meja D1, belum dibaca pipeline: tipe belum bisa dihitung)
  5 prakiraan waspada 1 sampai 3 hari di kab yang memegang SK Siaga Darurat aktif
Tipe yang sumbernya basi atau medannya belum ada tidak dihitung 0: tampil "belum ada data" berikut alasannya.
Ambang 1.000 jiwa, 2 hari, dan batas basi sumber adalah asumsi (ALGORITMA 10.20); prakiraan /prediksi belum teruji, jadi tipe 5 hipotesis.
Dalam satu tipe: tenggat terdekat, lalu pengungsi terbanyak, lalu kode wilayah (urutan sama dengan wil1.js).

  python3 -I scripts/bnpb/unit/wil1.py --cek
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
sys.path.insert(0, os.path.join(AKAR, "scripts", "data"))
import padanan_kab_dibi as PAD  # noqa: E402

D = os.path.join(AKAR, "public", "data")
BERKAS = {"sk": os.path.join(D, "status_darurat.json"), "saran": os.path.join(D, "saran_status.json"),
          "laphar": os.path.join(D, "laphar_riwayat.json"), "prediksi": os.path.join(AKAR, "public", "prediksi", "data", "prediksi.json"),
          "dit": os.path.join(D, "bnpb", "dit_wilayah.json"), "kab": os.path.join(D, "bnpb", "wilayah.json")}
AMBANG_JIWA = 1000        # asumsi (riset/3 W1)
AMBANG_SISA_HARI = 2      # asumsi (riset/3 W1)
BASI_HARI = {"sk": 7, "saran": 7, "laphar": 3, "prediksi": 2}   # asumsi: umur sumber paling tua yang masih dipakai
TIPE = {1: "Belum didampingi", 2: "Surat keputusan hampir habis", 3: "Saran tanpa surat keputusan", 4: "Pertanggungjawaban Dana Siap Pakai", 5: "Besok berisiko"}
JENIS = {"banjir": "Banjir", "banjir_bandang": "Banjir bandang", "longsor": "Tanah longsor", "karhutla": "Kebakaran hutan dan lahan", "kekeringan": "Kekeringan",
         "cuaca": "Cuaca ekstrem", "gempabumi": "Gempa bumi", "gempa": "Gempa bumi", "gunungapi": "Gunung api", "kebakaran_permukiman": "Kebakaran permukiman",
         "gelombang": "Gelombang pasang", "gelombang_pasang": "Gelombang pasang", "rob": "Rob", "erupsi": "Erupsi gunung api", "tsunami": "Tsunami"}
_KUNCI = []
JENIS_SK = [("karhutla", r"kebakaran|karhutla|asap"), ("banjir", r"banjir"), ("longsor", r"longsor|gerakan tanah"), ("kekeringan", r"kekeringan"),
            ("cuaca", r"cuaca|angin|puting|gelombang"), ("gempa", r"gempa|tsunami"), ("gunung api", r"gunung|erupsi")]
JENIS_BAHAYA = {"karhutla": "karhutla", "banjir": "banjir", "banjir_bandang": "banjir", "rob": "banjir", "longsor": "longsor", "kekeringan": "kekeringan", "cuaca": "cuaca",
                "gelombang": "cuaca", "gelombang_pasang": "cuaca", "gempabumi": "gempa", "gempa": "gempa", "tsunami": "gempa", "gunungapi": "gunung api", "erupsi": "gunung api"}


def jenis_sk(teks):
    """Jenis bencana pada teks bebas jenis SK; "lainnya" bila tak dikenal (tidak pernah dicocokkan)."""
    t = (teks or "").lower()
    return next((k for k, p in JENIS_SK if re.search(p, t)), "lainnya")


def jenis_bahaya(j):
    return JENIS_BAHAYA.get(j, "lainnya")


def kunci_nama(s):
    if not _KUNCI:
        _KUNCI.append(PAD._banjir("kejadian").kunci_nama)
    return _KUNCI[0](s or "")


def idn(n):
    return f"{int(n):,}".replace(",", ".")


def tgl_idn(iso):
    b = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    d = date.fromisoformat(iso)
    return f"{d.day} {b[d.month - 1]} {d.year}"


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def hari_wib(sekarang=None):
    return (sekarang or datetime.now(timezone.utc)).astimezone(timezone(timedelta(hours=7))).date()


def umur(iso, hari_ini):
    """Hari antara tanggal iso (10 huruf pertama) dan hari ini; None bila bukan tanggal."""
    try:
        return (hari_ini - date.fromisoformat(str(iso)[:10])).days
    except ValueError:
        return None


def peta_dit(dit):
    """{kode provinsi: id direktorat}; tiap provinsi tepat satu direktorat (dijaga tests/bnpb/unit_wil1.test.mjs)."""
    out = {}
    for d in dit["direktorat"]:
        for p in d["provinsi"]:
            if p["kode"]:
                assert p["kode"] not in out, f"provinsi {p['kode']} di dua direktorat"
                out[p["kode"]] = d["id"]
    return out


def nama_prov(dit):
    return {p["kode"]: p["provinsi"] for d in dit["direktorat"] for p in d["provinsi"] if p["kode"]}


def indeks_kab(kab):
    """{(prov, kunci_nama): kode Kemendagri} dan {kode: (prov, nama)}."""
    a = {(k["prov"], kunci_nama(k["nama"])): k["kode"] for k in kab["kab"]}
    b = {k["kode"]: (k["prov"], k["nama"]) for k in kab["kab"]}
    return a, b


def label_jenis(j):
    return JENIS.get(j) or str(j or "kejadian").replace("_", " ").capitalize()


def _item(tipe, dit_id, prov, nama_kab, kode, jenis, alasan, sumber, tenggat=None, jiwa=None):
    return {"tipe": tipe, "dit": dit_id, "prov": prov, "kab": nama_kab, "kab_kode": kode, "jenis": jenis, "alasan": alasan,
            "sumber": sumber, "tenggat": tenggat, "jiwa": jiwa}


def urut_kunci(x):
    """Tenggat terdekat dulu (kosong terakhir), lalu pengungsi terbanyak, lalu kode wilayah, lalu nama."""
    return (x["tenggat"] is None, x["tenggat"] or "", -(x["jiwa"] or 0), x["kab_kode"] or x["prov"] or "", x["kab"] or "")


def bangun_antrean(s, hari_ini, presisi_lolos=False):
    """-> ({tipe: {tersedia, alasan, butir[]}}, ringkasan sumber). s = berkas yang sudah dimuat; hari_ini = date WIB."""
    pdit, npro = peta_dit(s["dit"]), nama_prov(s["dit"])
    kunci_kab, kode_kab = indeks_kab(s["kab"])
    lap, sk, saran, pred = s["laphar"], s["sk"], s["saran"], s["prediksi"]
    umur_s = {"sk": umur(sk.get("dibuat"), hari_ini), "saran": umur(saran.get("dibuat"), hari_ini),
              "laphar": umur((lap.get("cakupan") or {}).get("sampai"), hari_ini), "prediksi": umur(pred.get("dibuat"), hari_ini)}
    segar = {k: v is not None and 0 <= v <= BASI_HARI[k] for k, v in umur_s.items()}
    tipe = {i: {"tersedia": False, "alasan": None, "butir": [], "hipotesis": i == 1 and not presisi_lolos} for i in TIPE}

    def kab_kode_dari(prov, nama):
        return kunci_kab.get((prov, kunci_nama(nama)))

    def basi_teks(k, nama):
        return f"{nama} terakhir {('berumur ' + str(umur_s[k]) + ' hari') if umur_s[k] is not None else 'tanpa tanggal'}, lebih tua dari batas {BASI_HARI[k]} hari"

    # episode berjalan (laporan harian) dan SK aktif
    ep_jalan = []
    if segar["laphar"]:
        for e in lap.get("episode") or []:
            if e.get("status") == "berjalan":
                ep_jalan.append(e)
    sk_aktif = []
    if segar["sk"]:
        for x in sk.get("sk") or []:
            m, b = x.get("mulai"), x.get("berakhir")
            if m and b and not x.get("tanggal_janggal") and m[:10] <= hari_ini.isoformat() <= b[:10]:
                sk_aktif.append(x)

    # tipe 1
    t = tipe[1]
    if not segar["laphar"]:
        t["alasan"] = basi_teks("laphar", "laporan harian (laphar_riwayat)")
    elif not any("pendampingan" in e for e in lap.get("episode") or []):
        t["alasan"] = "arsip laporan harian belum menyimpan medan pendampingan BNPB per kejadian"
    else:
        t["tersedia"] = True
        for e in ep_jalan:
            p = e.get("pendampingan")
            pk = e.get("puncak") or {}
            md, ung = pk.get("md") or 0, pk.get("mengungsi_jiwa") or 0
            if not isinstance(p, dict) or p.get("isi") is not False or not (md > 0 or ung >= AMBANG_JIWA):
                continue
            prov, nama = e.get("prov"), (e.get("kab") or "").split("|", 1)[-1] if e.get("kab") else None
            kode = kab_kode_dari(prov, nama) if nama else None
            tempat = nama or f"Provinsi {npro.get(prov, prov)}"
            dampak = ", ".join(x for x in (f"{idn(md)} jiwa meninggal pada puncak" if md > 0 else "", f"{idn(ung)} jiwa mengungsi pada puncak" if ung >= AMBANG_JIWA else "") if x)
            t["butir"].append(_item(1, pdit.get(prov), prov, nama, kode, label_jenis(e.get("jenis")),
                                    f"{label_jenis(e.get('jenis'))} di {tempat}: {dampak}; medan pendampingan di laporan harian kosong atau berisi kata tolak.", ["laphar_riwayat"], None, ung or None))

    # tipe 2
    t = tipe[2]
    if not (segar["laphar"] and segar["sk"]):
        t["alasan"] = basi_teks("laphar" if not segar["laphar"] else "sk", "laporan harian" if not segar["laphar"] else "daftar surat keputusan status darurat")
    else:
        t["tersedia"] = True
        jalan = {}
        for e in ep_jalan:
            if e.get("kab"):
                p, n = e["kab"].split("|", 1)
                jalan.setdefault((p, kunci_nama(n), jenis_bahaya(e.get("jenis"))), []).append(e)
        for x in sk_aktif:
            sisa = (date.fromisoformat(x["berakhir"][:10]) - hari_ini).days
            if x.get("skala") != "kabupaten" or sisa > AMBANG_SISA_HARI:
                continue
            jn = jenis_sk(x.get("jenis"))
            eps = jalan.get((x.get("prov_kode"), kunci_nama(x.get("kab")), jn)) if jn != "lainnya" else None   # jenis harus sama; jenis SK tak dikenal tidak dicocokkan
            if not eps:
                continue
            e = max(eps, key=lambda z: (z.get("puncak") or {}).get("mengungsi_jiwa") or 0)
            ung = (e.get("puncak") or {}).get("mengungsi_jiwa") or None
            kode = kab_kode_dari(x["prov_kode"], x["kab"])
            t["butir"].append(_item(2, pdit.get(x["prov_kode"]), x["prov_kode"], x["kab"], kode, label_jenis(e.get("jenis")),
                                    f"Surat keputusan {x.get('status') or 'status darurat'} berakhir {tgl_idn(x['berakhir'][:10])} (sisa {sisa} hari), {label_jenis(e.get('jenis')).lower()} di {x['kab']} masih berjalan menurut laporan harian.",
                                    ["status_darurat", "laphar_riwayat"], x["berakhir"][:10], ung))

    # tipe 3
    t = tipe[3]
    batas = jam.nilai("dsp_laporan_kejadian")
    if not segar["saran"]:
        t["alasan"] = basi_teks("saran", "berkas saran status (saran_status)")
    else:
        t["tersedia"] = True
        ada_sk = set()   # (kab, jenis) yang sudah punya SK kabupaten: aktif hari ini atau dimulai sesudah sinyal
        if segar["sk"]:
            for x in sk.get("sk") or []:
                k = kab_kode_dari(x.get("prov_kode"), x.get("kab")) if x.get("skala") == "kabupaten" else None
                if k:
                    ada_sk.add((k, jenis_sk(x.get("jenis")), (x.get("mulai") or "")[:10], (x.get("berakhir") or "9999-12-31")[:10]))
        for kode, daftar in (saran.get("kab") or {}).items():
            for r in daftar:
                if r.get("saran") != "Tanggap Darurat" or r.get("sk") or r.get("basi"):
                    continue
                u = umur(r.get("tanggal_sinyal"), hari_ini)
                if u is None or u <= batas or kode not in kode_kab:
                    continue
                jn = jenis_bahaya(r.get("jenis"))
                if any(k == kode and j == jn and (m >= r["tanggal_sinyal"][:10] or m <= hari_ini.isoformat() <= b) for k, j, m, b in ada_sk):
                    continue   # sudah ada SK kabupaten berjenis sama sejak sinyal atau yang masih berlaku: bukan saran tanpa SK
                prov, nama = kode_kab[kode]
                tenggat = (date.fromisoformat(r["tanggal_sinyal"][:10]) + timedelta(days=batas)).isoformat()
                t["butir"].append(_item(3, pdit.get(prov), prov, nama, kode, label_jenis(r.get("jenis")),
                                        f"Saran Tanggap Darurat {label_jenis(r.get('jenis')).lower()} di {nama} sejak {tgl_idn(r['tanggal_sinyal'][:10])} ({u} hari) belum punya surat keputusan.",
                                        ["saran_status"], tenggat, None))

    # tipe 4
    tipe[4]["alasan"] = "data Dana Siap Pakai yang cair dan pertanggungjawabannya ada di meja Dana Siap Pakai, belum dibaca pipeline ini"

    # tipe 5
    t = tipe[5]
    if not (segar["prediksi"] and segar["sk"]):
        t["alasan"] = basi_teks("prediksi" if not segar["prediksi"] else "sk", "prakiraan /prediksi" if not segar["prediksi"] else "daftar surat keputusan status darurat")
    else:
        t["tersedia"] = True
        siaga = {}
        for x in sk_aktif:
            if x.get("skala") == "kabupaten" and "siaga" in (x.get("status") or "").lower():
                k = kab_kode_dari(x["prov_kode"], x["kab"])
                if k:
                    siaga[k] = x
        lihat = set()
        for w in pred.get("waspada") or []:
            k, n = w.get("kab"), w.get("tenggang")
            if k not in siaga or k not in kode_kab or n not in (1, 2, 3) or (k, w.get("aturan"), n) in lihat:
                continue
            lihat.add((k, w.get("aturan"), n))
            prov, nama = kode_kab[k]
            tg = (hari_ini + timedelta(days=n)).isoformat()
            t["butir"].append(_item(5, pdit.get(prov), prov, nama, k, str(w.get("aturan") or ""),
                                    f"Prakiraan {str(w.get('maka') or 'waspada').lower()} dalam {n} hari di {nama}, yang memegang surat keputusan {siaga[k].get('status')} aktif.",
                                    ["prediksi", "status_darurat"], tg, (w.get("dampak") or {}).get("jiwa")))
    for t in tipe.values():
        t["butir"].sort(key=urut_kunci)
    return tipe, umur_s


def bangun(s, hari_ini, dibuat, presisi_lolos=False):
    tipe, umur_s = bangun_antrean(s, hari_ini, presisi_lolos)
    dits = [d["id"] for d in s["dit"]["direktorat"]]
    per = {d: [] for d in dits}
    tanpa = 0
    for i in sorted(tipe):
        for b in tipe[i]["butir"]:
            if b["dit"] in per:
                per[b["dit"]].append(b)
            else:
                tanpa += 1
    hit = lambda d, i: sum(b["dit"] == d for b in tipe[i]["butir"]) if tipe[i]["tersedia"] else None  # noqa: E731
    baris = [{"tipe": f"{i} {TIPE[i]}", **{d: hit(d, i) for d in dits},
              "ket": ("dihitung, hipotesis sampai kata kunci pendampingan lolos uji" if tipe[i]["hipotesis"] else "dihitung") if tipe[i]["tersedia"] else "belum ada data: " + tipe[i]["alasan"]} for i in sorted(tipe)]
    jml = sum(len(tipe[i]["butir"]) for i in tipe if tipe[i]["tersedia"])
    n_tersedia = sum(tipe[i]["tersedia"] for i in tipe)
    nama_d = {d["id"]: d["direktorat"].replace("Direktorat Penanganan Darurat ", "") for d in s["dit"]["direktorat"]}
    kolom = [{"k": "tipe", "label": "Antrean"}] + [{"k": d, "label": nama_d[d], "angka": True, "title": "butir antrean untuk provinsi di bawah direktorat ini (Perban 11/2025 Pasal 74, 77, 79A)"} for d in dits] + \
            [{"k": "ket", "label": "Keterangan", "title": "tipe tanpa sumber segar atau tanpa medannya tidak dihitung nol"}]
    k1 = rapor.kartu(
        id="wil1-ringkas", sistem="WIL-1", pil="Meja Wilayah", ikon="orang", judul="Antrean hari ini",
        angka=[{"k": "butir", "label": "Butir antrean dari tipe yang dihitung", "nilai": jml if n_tersedia else None,
                "title": "jumlah butir di tipe yang sumbernya segar; tipe lain belum ada data"},
               {"k": "tipe", "label": "Tipe antrean yang bisa dihitung hari ini", "nilai": n_tersedia, "title": "dari 5 tipe"}],
        kolom=kolom, baris=baris,
        rumus="butir antrean = kejadian atau surat keputusan atau saran atau prakiraan yang memenuhi syarat tipe, dikelompokkan menurut direktorat pemilik provinsinya",
        sumber=["status_darurat", "saran_status", "laphar_riwayat", "prediksi", "dit_wilayah"], label=["resmi", "hitungan_kita"],
        aturan=["dsp_laporan_kejadian"],
        asumsi=["Asumsi: ambang 1.000 jiwa dan 2 hari", "Asumsi: batas basi sumber"] + (["Asumsi: tipe 1 hipotesis sampai kata kunci lolos uji"] if tipe[1]["hipotesis"] else []))
    src = [{"nama": "Daftar surat keputusan status keadaan darurat", "url": "repo:public/data/status_darurat.json", "diambil": hari_ini.isoformat(), "lisensi": "data.bnpb.go.id, Pusdalops BNPB"},
           {"nama": "Laporan harian terurai", "url": "repo:public/data/laphar_riwayat.json", "diambil": hari_ini.isoformat(), "lisensi": "arsip Laporan Harian BNPB"},
           {"nama": "Saran status keadaan darurat (hitungan kita)", "url": "repo:public/data/saran_status.json", "diambil": hari_ini.isoformat(), "lisensi": "hitungan Centurisk97"},
           {"nama": "Prakiraan /prediksi (belum teruji)", "url": "repo:public/prediksi/data/prediksi.json", "diambil": hari_ini.isoformat(), "lisensi": "hitungan Centurisk97"},
           {"nama": "Pembagian provinsi Perban 11/2025", "url": "repo:public/data/bnpb/dit_wilayah.json", "diambil": hari_ini.isoformat(), "lisensi": "peraturan, domain publik"}]
    b = rapor.berkas([k1], src)
    b["data"] = {"hari": hari_ini.isoformat(), "dibuat": dibuat, "umur_sumber_hari": umur_s,
                 "tipe": {str(i): {"nama": TIPE[i], "tersedia": tipe[i]["tersedia"], "alasan": tipe[i]["alasan"], "hipotesis": tipe[i]["hipotesis"]} for i in sorted(tipe)},
                 "direktorat": {d: {"nama": nama_d[d], "butir": per[d]} for d in dits}, "tanpa_direktorat": tanpa}
    return b


def jalan(sekarang=None):
    import kpod1   # impor malas: kpod1 mengimpor modul ini
    s = {k: _json(p) for k, p in BERKAS.items()}
    sek = sekarang or datetime.now(timezone.utc)
    u = kpod1.ukur(kpod1._muat_klasifikasi(), _json(kpod1.FIXTURE)["entri"])
    lolos = u["presisi"] is not None and u["recall"] is not None and u["presisi"] >= kpod1.MIN_PRESISI and u["recall"] >= kpod1.MIN_RECALL
    return {"meja_wilayah": bangun(s, hari_wib(sek), sek.strftime("%Y-%m-%dT%H:%M:%SZ"), lolos)}


def _mini():
    dit = {"direktorat": [{"id": "wil1", "direktorat": "Direktorat Penanganan Darurat Wilayah I", "provinsi": [{"kode": "11", "provinsi": "Aceh"}]},
                          {"id": "wil2", "direktorat": "Direktorat Penanganan Darurat Wilayah II", "provinsi": [{"kode": "12", "provinsi": "Sumatera Utara"}, {"kode": None, "provinsi": "Daerah Ibu Kota Nusantara"}]},
                          {"id": "wil3", "direktorat": "Direktorat Penanganan Darurat Wilayah III", "provinsi": [{"kode": "13", "provinsi": "Sumatera Barat"}]}]}
    kab = {"kab": [{"kode": "1116", "prov": "11", "nama": "Aceh Tamiang"}, {"kode": "1201", "prov": "12", "nama": "Tapanuli Tengah"},
                   {"kode": "1301", "prov": "13", "nama": "Solok"}, {"kode": "1202", "prov": "12", "nama": "Nias"}]}
    ep = lambda i, p, k, jenis, ung, md, pend: {"id": i, "jenis": jenis, "prov": p, "kab": f"{p}|{k}", "tingkat": "kab", "status": "berjalan", "puncak": {"mengungsi_jiwa": ung, "md": md}, **({"pendampingan": pend} if pend is not None else {})}  # noqa: E731
    laphar = {"cakupan": {"sampai": "2026-11-25"}, "episode": [
        ep("e1", "11", "Aceh Tamiang", "banjir", 90379, 101, {"isi": False, "kelas": []}),    # tipe 1
        ep("e2", "12", "Tapanuli Tengah", "banjir", 500, 0, {"isi": False, "kelas": []}),    # di bawah ambang
        ep("e3", "13", "Solok", "banjir", 2000, 0, {"isi": True, "kelas": ["personel"]}),    # didampingi
        ep("e4", "12", "Nias", "longsor", 300, 2, {"isi": False, "kelas": []})]}              # md > 0
    sk = {"dibuat": "2026-11-25T10:00+07:00", "sk": [
        {"skala": "kabupaten", "prov_kode": "11", "kab": "Aceh Tamiang", "status": "Tanggap Darurat", "jenis": "Banjir", "mulai": "2026-11-01", "berakhir": "2026-11-28", "tanggal_janggal": False},
        {"skala": "kabupaten", "prov_kode": "13", "kab": "Solok", "status": "Siaga Darurat", "jenis": "Banjir", "mulai": "2026-11-10", "berakhir": "2026-12-10", "tanggal_janggal": False},
        {"skala": "kabupaten", "prov_kode": "12", "kab": "Nias", "status": "Tanggap Darurat", "jenis": "Banjir", "mulai": "2026-10-01", "berakhir": None, "tanggal_janggal": False}]}
    saran = {"dibuat": "2026-11-25T10:00+07:00", "kab": {"1201": [{"jenis": "banjir", "saran": "Tanggap Darurat", "sk": None, "basi": False, "tanggal_sinyal": "2026-11-20"}],
                                                          "1116": [{"jenis": "banjir", "saran": "Tanggap Darurat", "sk": None, "basi": False, "tanggal_sinyal": "2026-11-24"}],
                                                          "1301": [{"jenis": "banjir", "saran": "Siaga Darurat", "sk": None, "basi": False, "tanggal_sinyal": "2026-11-01"}]}}
    pred = {"dibuat": "2026-11-26T04:00+07:00", "waspada": [{"kab": "1301", "tenggang": 2, "aturan": "banjir", "maka": "Waspada banjir", "dampak": {"jiwa": 10}},
                                                        {"kab": "1116", "tenggang": 1, "aturan": "banjir", "maka": "Waspada banjir"},
                                                        {"kab": "1301", "tenggang": 4, "aturan": "asap", "maka": "x"}]}
    return {"dit": dit, "kab": kab, "laphar": laphar, "sk": sk, "saran": saran, "prediksi": pred}


def cek():
    s = _mini()
    h = date(2026, 11, 26)
    tp, _ = bangun_antrean(s, h)
    tp1 = [b["kab"] for b in tp[1]["butir"]]
    assert tp[1]["tersedia"] and tp1 == ["Aceh Tamiang", "Nias"], tp1                       # e2 di bawah 1.000 dan md 0; e3 didampingi
    assert tp[1]["butir"][0]["dit"] == "wil1" and tp[1]["butir"][1]["dit"] == "wil2" and tp[1]["butir"][0]["jiwa"] == 90379
    assert [b["kab"] for b in tp[2]["butir"]] == ["Aceh Tamiang"] and tp[2]["butir"][0]["tenggat"] == "2026-11-28", tp[2]["butir"]   # sisa 2 hari; Nias berakhir kosong tidak dihitung
    assert [b["kab_kode"] for b in tp[3]["butir"]] == ["1201"], tp[3]["butir"]                 # 6 hari > 3; 1116 baru 2 hari; 1301 bukan Tanggap
    assert tp[3]["butir"][0]["tenggat"] == "2026-11-23"
    assert not tp[4]["tersedia"] and tp[4]["butir"] == []
    assert [(b["kab_kode"], b["tenggat"]) for b in tp[5]["butir"]] == [("1301", "2026-11-28")], tp[5]["butir"]   # 1116 tanpa SK Siaga; tenggang 4 ditolak
    for i in tp:
        for b in tp[i]["butir"]:
            assert b["sumber"], "butir tanpa sumber"
            assert b["alasan"].endswith(".") and "·" not in b["alasan"]
    # tipe 2 mencocokkan jenis: SK karhutla tidak berpasangan dengan episode banjir di kab yang sama
    s2j = _mini(); s2j["sk"]["sk"][0]["jenis"] = "Asap Akibat Kebakaran Hutan Dan Lahan"
    assert bangun_antrean(s2j, h)[0][2]["butir"] == [], "jenis SK dan episode harus sama"
    # tipe 3 dilewati bila kab itu sudah punya SK berjenis sama sejak sinyal (atau masih berlaku)
    s3j = _mini(); s3j["sk"]["sk"].append({"skala": "kabupaten", "prov_kode": "12", "kab": "Tapanuli Tengah", "status": "Tanggap Darurat", "jenis": "Banjir", "mulai": "2026-11-22", "berakhir": "2026-12-05", "tanggal_janggal": False})
    assert bangun_antrean(s3j, h)[0][3]["butir"] == [], "saran yang sudah punya SK sejenis bukan saran tanpa SK"
    s3k = _mini(); s3k["sk"]["sk"].append({"skala": "kabupaten", "prov_kode": "12", "kab": "Tapanuli Tengah", "status": "Siaga Darurat", "jenis": "Kekeringan", "mulai": "2026-11-22", "berakhir": "2026-12-05", "tanggal_janggal": False})
    assert [b["kab_kode"] for b in bangun_antrean(s3k, h)[0][3]["butir"]] == ["1201"], "SK berjenis lain tidak menggugurkan saran"
    assert tp[1]["hipotesis"] and not bangun_antrean(s, h, True)[0][1]["hipotesis"] and "kata tolak" in tp[1]["butir"][0]["alasan"] and "pada puncak" in tp[1]["butir"][0]["alasan"]
    # sumber basi atau medan hilang -> tidak dihitung, bukan nol
    s2 = _mini(); s2["laphar"]["cakupan"]["sampai"] = "2026-11-10"
    t2, _ = bangun_antrean(s2, h)
    assert not t2[1]["tersedia"] and not t2[2]["tersedia"] and t2[1]["butir"] == [] and "lebih tua" in t2[1]["alasan"], t2[1]
    s3 = _mini()
    for e in s3["laphar"]["episode"]:
        e.pop("pendampingan")
    t3, _ = bangun_antrean(s3, h)
    assert not t3[1]["tersedia"] and "pendampingan" in t3[1]["alasan"] and t3[2]["tersedia"]
    s4 = _mini(); s4["prediksi"]["dibuat"] = "2026-11-20T04:00+07:00"
    assert not bangun_antrean(s4, h)[0][5]["tersedia"]
    # urutan dalam tipe: tenggat terdekat, pengungsi terbanyak, kode
    a = [{"tenggat": "2026-11-28", "jiwa": 5, "kab_kode": "1201", "kab": "A", "prov": "12"}, {"tenggat": None, "jiwa": 9, "kab_kode": "1101", "kab": "B", "prov": "11"},
         {"tenggat": "2026-11-27", "jiwa": 1, "kab_kode": "1301", "kab": "C", "prov": "13"}, {"tenggat": "2026-11-28", "jiwa": 50, "kab_kode": "1202", "kab": "D", "prov": "12"},
         {"tenggat": "2026-11-28", "jiwa": 5, "kab_kode": "1101", "kab": "E", "prov": "11"}]
    assert [x["kab"] for x in sorted(a, key=urut_kunci)] == ["C", "D", "E", "A", "B"]
    b = bangun(s, h, "2026-11-26T01:00:00Z")
    rapor.periksa_berkas({"dibuat": "2026-11-26T01:00:00Z", "basi_jam": 48, **b})
    assert b["data"]["direktorat"]["wil1"]["butir"] and b["data"]["tanpa_direktorat"] == 0
    r = {x["tipe"][0]: x for x in b["kartu"][0]["baris"]}
    assert r["4"]["wil1"] is None and r["1"]["wil1"] == 1 and r["1"]["wil2"] == 1, r
    assert r["1"]["wil3"] == 0, "tipe tersedia tanpa butir = 0 yang dihitung"
    # data nyata
    nyata = jalan(datetime(2026, 11, 26, 3, 0, tzinfo=timezone.utc))["meja_wilayah"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T03:00:00Z", "basi_jam": 48, **nyata})
    teks = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in teks and not re.search(r"\baman\b", teks, re.I)
    tipe_ok = [i for i, v in nyata["data"]["tipe"].items() if v["tersedia"]]
    jml = sum(len(v["butir"]) for v in nyata["data"]["direktorat"].values()) + nyata["data"]["tanpa_direktorat"]
    print(f"wil1.py --cek: lulus (tipe dihitung: {','.join(tipe_ok) or 'tidak ada'}; {jml} butir; umur sumber hari {nyata['data']['umur_sumber_hari']})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
