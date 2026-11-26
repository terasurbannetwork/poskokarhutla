"""HUK-2 Pelacak amanat pengaturan turunan (DESAIN-TEKNIS sec 6.27; ALGORITMA sec 2.4; tiket RU-076).

Langkah jalan.py (harian). Masukan: data/hukum/seed.sql (dokumen, segmen pasal, hasil hukum.py urai; dibaca sekali ke SQLite memori) dan
public/data/bnpb/hukum/katalog.json (status berlaku efektif = JDIH BERLAKU dan tidak ada di konflik, sama dengan HUK-1 dan SPB-1).
Amanat = kalimat delegasi per pasal (hukum.amanat) pada dokumen berlaku efektif; dokumen yang dicabut menurut teks tidak menghasilkan amanat.
Bukti pemenuhan oleh dokumen LEBIH BARU yang berlaku efektif, salah satu dari:
  a. merujuk pasalnya: ada kutipan ke dokumen induk dan "Pasal N" disebut tepat sebelum kutipan itu (lebih ketat dari relasi tingkat dokumen)
  b. judulnya mirip topik amanat: skor BM25 sederhana (judul sesudah kata "tentang", tanpa kata umum peraturan) paling sedikit AMANAT_BM25_MIN
Hasil selalu "kandidat pemenuhan menurut mesin" sampai staf menandai lewat usulan_amanat (menunggu pemasangan berkas itu di Worker).
Tidak semua kalimat delegasi adalah peraturan turunan: sebagian menunjuk keputusan tunggal (mis. pengangkatan); topik ditampilkan agar staf menilai.
Catatan tambahan: Perban 6/2025 Pasal 106 (lingkup Inspektorat II) menyebut "Pusat Pengendalian Operasi"; ditampilkan bila Perban 11/2025 tidak mengubahnya.

  python3 -I scripts/bnpb/unit/huk2.py --cek
"""
import importlib.util
import json
import math
import os
import re
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import huk1  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
SEED = os.path.join(AKAR, "data", "hukum", "seed.sql")
AMANAT_BM25_MIN = 8.0   # asumsi; dipilih di --cek: contoh wajib Perban 4/2025 skor di bawahnya, kandidat jelas (mis. Perban 6/2025 Pasal 140) di atasnya
JENDELA_RUJUK = 120     # huruf sebelum kutipan induk tempat "Pasal N" dicari
STOP = set("peraturan badan nasional penanggulangan bencana tentang nomor tahun dan atau yang dengan untuk pada dari dalam atas oleh kepala bnpb republik indonesia pelaksanaan petunjuk teknis".split())
SEGMEN_DIBACA = ("menimbang", "mengingat", "menetapkan", "pasal", "lain")
DDL = ("CREATE TABLE hukum_dok(id,slug,tipe,jenis,singkatan,nomor,tahun,judul,status,subjek,tgl_tetap,tgl_undang,url,pdf,halaman,mutu,diperbarui,resmi,sumber);"
       "CREATE TABLE hukum_segmen(id,dok,urut,jenis,label,bab,halaman,teks);CREATE TABLE hukum_relasi(dari,ke,jenis,terdaftar,ke_judul);CREATE TABLE hukum_fts(rowid,teks,label,judul);")
_H = []


def hukum():
    if not _H:
        s = importlib.util.spec_from_file_location("hukum_huk2", os.path.join(AKAR, "scripts", "bnpb", "hukum.py"))
        m = importlib.util.module_from_spec(s)
        s.loader.exec_module(m)
        _H.append(m)
    return _H[0]


def muat_seed(path=SEED):
    """-> (dok {id: {judul, tgl, status}}, segmen [{dok, jenis, label, teks}]) tanpa lampiran dan penjelasan."""
    c = sqlite3.connect(":memory:")
    c.executescript(DDL)
    with open(path, encoding="utf-8") as f:
        c.executescript(f.read())
    dok = {r[0]: {"judul": r[1], "tgl": r[2], "status": r[3]} for r in c.execute("SELECT id, judul, tgl_tetap, status FROM hukum_dok")}
    ph = ",".join("?" * len(SEGMEN_DIBACA))
    seg = [{"dok": r[0], "jenis": r[1], "label": r[2], "teks": r[3]} for r in c.execute(f"SELECT dok, jenis, label, teks FROM hukum_segmen WHERE jenis IN ({ph}) ORDER BY id", SEGMEN_DIBACA)]
    c.close()
    return dok, seg


def efektif(kat):
    konflik = {k["dok"] for k in kat.get("konflik") or []}
    return {d["id"] for d in kat["dok"] if d.get("status") == "BERLAKU" and d["id"] not in konflik}


def token(judul):
    t = judul.lower()
    t = t.split("tentang", 1)[1] if "tentang" in t else t
    return [w for w in re.findall(r"[a-z]{3,}", t) if w not in STOP]


class Bm25:
    def __init__(self, judul_per_dok, k1=1.2, b=0.75):
        self.d = {i: token(j) for i, j in judul_per_dok.items()}
        n = len(self.d)
        df = {}
        for t in self.d.values():
            for w in set(t):
                df[w] = df.get(w, 0) + 1
        self.idf = {w: math.log(1 + (n - c + 0.5) / (c + 0.5)) for w, c in df.items()}
        self.avg = (sum(map(len, self.d.values())) / n) if n else 1
        self.k1, self.b = k1, b

    def skor(self, topik, id_dok):
        d = self.d[id_dok]
        if not d:
            return 0.0
        tf = {}
        for w in d:
            tf[w] = tf.get(w, 0) + 1
        return sum(self.idf.get(w, 0) * tf[w] * (self.k1 + 1) / (tf[w] + self.k1 * (1 - self.b + self.b * len(d) / self.avg)) for w in set(token(topik)) if w in tf)


def rujukan_pasal(segmen, ada):
    """{(dok pengutip, dok induk): [teks sebelum kutipan, ...]}; hanya induk di himpunan `ada`. Satu kutipan satu jendela."""
    H = hukum()
    out = {}
    for sg in segmen:
        if sg["dok"] not in ada:
            continue
        t = sg["teks"]
        for m in H.RX_SITASI.finditer(t):
            induk = H.kunci_sitasi(m)
            if induk in ada and induk != sg["dok"]:
                out.setdefault((sg["dok"], induk), []).append(t[max(0, m.start() - JENDELA_RUJUK):m.start()])
    return out


def nomor_pasal(pasal):
    return pasal.split()[-1]


def pemenuh(a, dok, ef, rujuk, bm):
    """-> {"jenis": "rujuk"|"judul"|None, "dok": id, "skor": float|None}. Hanya dokumen efektif dengan tgl_tetap lebih baru dari induk."""
    induk = dok[a["dok"]]["tgl"]
    if not induk:
        return {"jenis": None, "dok": None, "skor": None, "alasan": "induk tanpa tanggal ditetapkan"}
    baru = sorted(i for i in ef if i != a["dok"] and dok[i]["tgl"] and dok[i]["tgl"] > induk)
    rx = re.compile(rf"\bPasal\s+{re.escape(nomor_pasal(a['pasal']))}\b", re.I)
    for i in baru:
        if any(rx.search(w) for w in rujuk.get((i, a["dok"]), [])):
            return {"jenis": "rujuk", "dok": i, "skor": None}
    terbaik = max(((bm.skor(a["topik"], i), i) for i in baru), default=(0.0, None))
    if terbaik[1] and terbaik[0] >= AMANAT_BM25_MIN:
        return {"jenis": "judul", "dok": terbaik[1], "skor": round(terbaik[0], 1)}
    return {"jenis": None, "dok": None, "skor": round(terbaik[0], 1) if terbaik[1] else None}


def susun(dok, segmen, kat, hari_ini):
    """-> daftar amanat berstatus: [{dok, pasal, ayat, topik, pola, usia_hari, pemenuh}] urut usia menurun."""
    H = hukum()
    ef = efektif(kat)
    seg_ef = [s for s in segmen if s["dok"] in ef]
    am = H.amanat(seg_ef)   # amanat() hanya menerima segmen pasal; dokumen tak efektif sudah tersaring di atas
    ada = {i for i in ef}
    rujuk = rujukan_pasal([s for s in segmen if s["jenis"] != "lampiran"], ada)
    bm = Bm25({i: dok[i]["judul"] for i in ef})
    out = []
    for a in am:
        tg = dok[a["dok"]]["tgl"]
        usia = (hari_ini - date.fromisoformat(tg[:10])).days if tg else None
        out.append({**{k: a[k] for k in ("dok", "pasal", "ayat", "topik", "pola")}, "usia_hari": usia, "pemenuh": pemenuh(a, dok, ef, rujuk, bm)})
    out.sort(key=lambda x: (-(x["usia_hari"] if x["usia_hari"] is not None else -1), x["dok"], int(re.sub(r"\D", "", x["pasal"]) or 0), x["ayat"] or 0))
    return out


def catatan_inspektorat(dok, segmen):
    """Pasal 106 Perban 6/2025 menyebut 'Pusat Pengendalian Operasi' dan Perban 11/2025 tidak memuat perubahan Pasal 106 -> catatan; selain itu None."""
    p = next((s for s in segmen if s["dok"] == "perban-6-2025" and s["label"] == "Pasal 106"), None)
    if not p or "Pusat Pengendalian Operasi" not in p["teks"] or "perban-11-2025" not in dok:
        return None
    ubah = any(s["dok"] == "perban-11-2025" and s["jenis"] == "pasal" and re.search(r"\bPasal\s+106\b", s["teks"] + " " + s["label"]) for s in segmen)
    return None if ubah else "Perban 6/2025 Pasal 106 masih menyebut Pusat Pengendalian Operasi dalam lingkup Inspektorat II; Perban 11/2025 tidak mengubah pasal itu."


def bangun(dok, segmen, kat, hari_ini, dibuat):
    am = susun(dok, segmen, kat, hari_ini)
    punya = [a for a in am if a["pemenuh"]["jenis"]]
    d_kat = {d["id"]: d for d in kat["dok"]}
    n = len(am)

    def tautan_dok(i):
        return huk1.tautan(i) if i in d_kat else None
    NAMA_P = {"rujuk": "dokumen lebih baru merujuk pasal ini", "judul": "judul dokumen lebih baru mirip topik"}

    def baris(a):
        p = a["pemenuh"]
        pas = a["pasal"] + (f" ayat ({a['ayat']})" if a["ayat"] else "")
        return {"peraturan": huk1.singkat(d_kat[a["dok"]]) if a["dok"] in d_kat else a["dok"], "peraturan_url": tautan_dok(a["dok"]), "pasal": pas, "topik": a["topik"],
                "usia": a["usia_hari"], "status": (f"kandidat pemenuhan: {huk1.singkat(d_kat[p['dok']])} ({NAMA_P[p['jenis']]})" if p["jenis"] else "belum ditemukan pemenuhnya")}
    k1 = rapor.kartu(
        id="huk2-amanat", sistem="HUK-2", pil="Amanat turunan", ikon="timbang", judul="Amanat pengaturan turunan",
        angka=[{"k": "amanat", "label": "Kalimat delegasi pada peraturan berlaku efektif", "nilai": n if n else None, "title": "pola: ditetapkan oleh Kepala, diatur dengan Peraturan Badan, diatur lebih lanjut, tercantum dalam Keputusan"},
               {"k": "kandidat", "label": "Punya kandidat pemenuhan menurut mesin", "nilai": len(punya) if n else None, "title": f"belum ditandai staf; dokumen lebih baru yang merujuk pasalnya atau berjudul mirip. Hipotesis: jumlah ini berasal dari satu titik setel ambang kemiripan judul ({AMANAT_BM25_MIN:g}) yang belum diuji"},
               {"k": "belum", "label": "Belum ditemukan pemenuhnya", "nilai": (n - len(punya)) if n else None, "title": "dalam korpus JDIH lokal; bisa terbit dengan judul lain atau belum terurai"}],
        kolom=[{"k": "peraturan", "label": "Peraturan", "tautan": "peraturan_url"}, {"k": "pasal", "label": "Pasal"}, {"k": "topik", "label": "Topik amanat", "title": "frasa sebelum kata kerja delegasi, paling banyak 12 kata"},
               {"k": "usia", "label": "Usia, hari", "angka": True, "title": "hari sejak tanggal ditetapkan peraturan induk"}, {"k": "status", "label": "Status menurut mesin"}],
        baris=[baris(a) for a in am],
        rumus="amanat = kalimat delegasi per pasal; kandidat pemenuhan = dokumen lebih baru yang merujuk pasalnya atau judulnya mirip topik; tanda staf menyusul",
        sumber=["hukum_seed", "katalog_hukum"], label=["hitungan_kita"], asumsi=["Asumsi: ambang kemiripan judul 8", "Asumsi: kandidat dari satu titik setel, hipotesis"],
        tautan=[["/bnpb/hukum", "Buka pustaka hukum"]], unduh="amanat_turunan.csv")
    kartu = [k1]
    cat = catatan_inspektorat(dok, segmen)
    if cat:
        kartu.append(rapor.kartu(id="huk2-inspektorat", sistem="HUK-2", pil="Amanat turunan", ikon="kaca", judul="Catatan lingkup Inspektorat II",
                                 angka=[], kolom=[{"k": "catatan", "label": "Catatan"}], baris=[{"catatan": cat}], rumus="Pasal 106 Perban 6/2025 dibaca dari teks; perubahan dicari di pasal Perban 11/2025",
                                 sumber=["hukum_seed"], label=["resmi", "hitungan_kita"]))
    src = [{"nama": "Teks peraturan BNPB (data/hukum/seed.sql, dari jdih.bnpb.go.id)", "url": "repo:data/hukum/seed.sql", "diambil": hari_ini.isoformat(), "lisensi": "dokumen publik JDIH BNPB"},
           {"nama": "Katalog JDIH BNPB (hukum.py)", "url": "repo:public/data/bnpb/hukum/katalog.json", "diambil": kat["dibangun"][:10], "lisensi": "dokumen publik JDIH BNPB"}]
    b = rapor.berkas(kartu, src)
    b["data"] = {"hari": hari_ini.isoformat(), "dibuat": dibuat, "amanat": n, "kandidat": len(punya), "bm25_min": AMANAT_BM25_MIN,
                 "koreksi": "tanda terpenuhi oleh staf menunggu pemasangan usulan_amanat di Worker (DATA_UNIT)"}
    return b, am


def usulan(am, d_kat):
    from terima import usulan as buat
    baris = []
    for a in am:
        kunci = f"{a['dok']}|{a['pasal']}|{a['ayat'] or 0}"
        baris.append({"kunci": kunci, "url": huk1.tautan(a["dok"]), "label": "hitungan_kita", "keyakinan": "pola_longgar",
                      "sumber_nama": (d_kat[a["dok"]]["judul"] if a["dok"] in d_kat else a["dok"])[:200],
                      "isi": {"pasal": a["pasal"] + (f" ayat ({a['ayat']})" if a["ayat"] else ""), "topik": a["topik"], "status": "terpenuhi" if a["pemenuh"]["jenis"] else "belum",
                              "url": huk1.tautan(a["dok"])}})
    return buat("amanat", baris, "hukum")


def jalan(sekarang=None):
    sek = sekarang or datetime.now(timezone.utc)
    hari = (sek.astimezone(timezone(timedelta(hours=7)))).date()
    kat = json.load(open(huk1.KATALOG, encoding="utf-8"))
    dok, seg = muat_seed()
    b, am = bangun(dok, seg, kat, hari, sek.strftime("%Y-%m-%dT%H:%M:%SZ"))
    return {"amanat": b, "usulan_amanat": usulan(am, {d["id"]: d for d in kat["dok"]})}


def cek():
    H = hukum()
    kat = json.load(open(huk1.KATALOG, encoding="utf-8"))
    dok, seg = muat_seed()
    hari = date(2026, 11, 26)
    am = susun(dok, seg, kat, hari)
    ada = {(a["dok"], a["pasal"], a["ayat"]) for a in am}
    for w in (("perban-4-2025", "Pasal 38", None), ("perban-4-2025", "Pasal 41", 2), ("perban-4-2025", "Pasal 52", 2), ("perban-4-2025", "Pasal 53", 3)):
        assert w in ada, f"contoh wajib {w} tidak terdeteksi sebagai amanat"
    # ambang BM25 dipilih agar contoh wajib tidak dinyatakan terpenuhi tanpa bukti, sedangkan kandidat jelas lolos
    for a in am:
        if a["dok"] == "perban-4-2025" and (a["pasal"], a["ayat"]) in (("Pasal 38", None), ("Pasal 41", 2), ("Pasal 52", 2), ("Pasal 53", 3)):
            assert a["pemenuh"]["jenis"] is None, ("contoh wajib dianggap terpenuhi", a)
    jelas = [a for a in am if a["dok"] == "perban-6-2025" and a["pasal"] == "Pasal 140"]
    assert jelas and jelas[0]["pemenuh"]["jenis"] in ("rujuk", "judul") and jelas[0]["pemenuh"]["dok"] == "perban-11-2025", jelas
    # dokumen tidak berlaku menurut teks tidak menghasilkan amanat: cabut satu dokumen lewat konflik
    kat2 = json.loads(json.dumps(kat))
    kat2.setdefault("konflik", []).append({"dok": "perban-4-2025", "status_jdih": "BERLAKU", "status_teks": "DICABUT", "dicabut_oleh": ["perban-1-2026"]})
    assert not [a for a in susun(dok, seg, kat2, hari) if a["dok"] == "perban-4-2025"], "amanat dari dokumen yang dicabut menurut teks tidak ditolak"
    kat3 = json.loads(json.dumps(kat))
    for d in kat3["dok"]:
        if d["id"] == "perban-4-2025":
            d["status"] = "TIDAK BERLAKU"
    assert not [a for a in susun(dok, seg, kat3, hari) if a["dok"] == "perban-4-2025"], "amanat dari dokumen TIDAK BERLAKU tidak ditolak"
    # pasal yang dirujuk dokumen lebih baru dibuktikan pada kutipan, bukan hanya pada relasi dokumen
    dok_u = {"perban-1-2025": {"judul": "Peraturan X tentang Aaa", "tgl": "2025-01-01", "status": "BERLAKU"}, "perban-2-2026": {"judul": "Peraturan Y tentang Bbb", "tgl": "2026-01-01", "status": "BERLAKU"},
             "perban-3-2024": {"judul": "Peraturan Z tentang Ccc", "tgl": "2024-01-01", "status": "BERLAKU"}}
    seg_u = [{"dok": "perban-1-2025", "jenis": "pasal", "label": "Pasal 9", "teks": "Tata cara penyaluran dana ditetapkan oleh Kepala BNPB."},
             {"dok": "perban-2-2026", "jenis": "menimbang", "label": "Menimbang", "teks": "bahwa untuk melaksanakan Pasal 9 Peraturan Badan Nasional Penanggulangan Bencana Nomor 1 Tahun 2025 tentang X perlu"},
             {"dok": "perban-3-2024", "jenis": "pasal", "label": "Pasal 1", "teks": "Kurikulum pelatihan ditetapkan oleh Kepala BNPB."}]
    kat_u = {"dok": [{"id": i, "status": "BERLAKU"} for i in dok_u], "konflik": [], "dibangun": "2026-11-26T00:00:00Z"}
    ef_u = efektif(kat_u)
    a_u = H.amanat([s for s in seg_u if s["jenis"] == "pasal"])
    rj = rujukan_pasal(seg_u, ef_u)
    assert ("perban-2-2026", "perban-1-2025") in rj, rj
    bm = Bm25({i: d["judul"] for i, d in dok_u.items()})
    assert bm.skor("tentang Aaa", "perban-1-2025") > 0 and bm.skor("Aaa", "perban-2-2026") == 0
    # rujuk memerlukan kutipan ke induk dengan Pasal yang sama sebelumnya; tanpa kutipan tidak ada bukti
    p = pemenuh(a_u[0], dok_u, ef_u, rj, bm)
    assert p == {"jenis": "rujuk", "dok": "perban-2-2026", "skor": None}, p
    assert pemenuh(a_u[0], dok_u, ef_u, {}, bm)["jenis"] is None, "tanpa kutipan ke induk tidak ada bukti"
    rj2 = {("perban-2-2026", "perban-1-2025"): ["bahwa untuk melaksanakan Pasal 9 "]}
    assert pemenuh(a_u[0], dok_u, ef_u, rj2, bm) == {"jenis": "rujuk", "dok": "perban-2-2026", "skor": None}
    assert pemenuh(a_u[0], dok_u, ef_u, {("perban-2-2026", "perban-1-2025"): ["melaksanakan Pasal 19 "]}, bm)["jenis"] is None, "Pasal 19 bukan Pasal 9"
    assert pemenuh(a_u[0], dok_u, ef_u, {("perban-3-2024", "perban-1-2025"): ["melaksanakan Pasal 9 "]}, bm)["jenis"] is None, "dokumen lebih lama tidak boleh jadi pemenuh"
    # catatan Inspektorat II dari teks nyata; hilang bila Perban 11/2025 mengubah Pasal 106
    cat = catatan_inspektorat(dok, seg)
    assert cat and "Pasal 106" in cat, cat
    assert catatan_inspektorat(dok, seg + [{"dok": "perban-11-2025", "jenis": "pasal", "label": "Pasal 106", "teks": "Inspektorat II mempunyai tugas lain."}]) is None
    # berkas penuh: skema, tautan hanya jalur lokal, usulan ber-id 16 heks, tanpa titik tengah
    b, am2 = bangun(dok, seg, kat, hari, "2026-11-26T00:00:00Z")
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **b})
    d_kat = {d["id"]: d for d in kat["dok"]}
    us = usulan(am2, d_kat)
    assert len(us["baris"]) == len(am2) and all(re.fullmatch(r"[0-9a-f]{16}", x["id"]) for x in us["baris"]) and us["berkas"] == "amanat"
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    k = {x["k"]: x["nilai"] for x in b["kartu"][0]["angka"]}
    print(f"huk2.py --cek: lulus ({k['amanat']} amanat pada peraturan berlaku efektif; {k['kandidat']} berkandidat pemenuh, {k['belum']} belum ditemukan; contoh wajib Perban 4/2025 terdeteksi; "
          f"catatan Inspektorat II {'ada' if len(b['kartu']) > 1 else 'tidak ada'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
