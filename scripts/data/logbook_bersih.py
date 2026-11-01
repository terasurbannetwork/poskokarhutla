"""Versi terbit logbook Pusdalops: satu baris per kejadian, tanpa teks bebas dan tanpa nama.

Masukan : data/raw/logbook/arsip/<tahun>/kejadian.jsonl (keluaran logbook_pusdalops.py, tidak di-git)
Keluaran: data/pusdalops/logbook_kejadian.csv (di-git; aman untuk repo publik)
          public/data/logbook_riwayat.json: rekap per kab/kota x jenis x bulan dan x tahun, plus hari tercatat per
          tahun (2011-2013 dan 2022 tidak lengkap: bagi dengan hari tercatat sebelum membandingkan tahun)

Yang dibuang: jenis_teks, kronologi, kondisi, dampak_teks, status, jam (teks bebas bisa memuat nama/telepon).
Pakai: python3 scripts/data/logbook_bersih.py
"""
import csv
import glob
import importlib.util
import json
import os

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KOLOM = ["id_kejadian", "jenis", "tgl_kejadian", "pertama_dicatat", "terakhir_dicatat", "n_laporan", "hari_dilaporkan",
         "prov", "prov_kode", "kabkota", "kab_kode", "n_kec", "n_desa", "md", "hilang", "luka", "mengungsi", "kk", "jiwa",
         "rumah", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "ha"]


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# pengode wilayah yang sama dengan laphar_riwayat.json (scripts/umum)
K = _muat("umum_kejadian", "scripts/umum/kejadian.py")
L = _muat("umum_laphar", "scripts/umum/laphar_arsip.py")


# salah ketik dan nama lama di arsip 2011-2022 -> nama di public/geo/kabupaten
ALIAS_KAB = {"Kab. Lima Puluh": "Kab. Lima Puluh Kota", "Kab. Limapuluh": "Kab. Lima Puluh Kota",
             "Kab. Maluku Tenggara Barat": "Kab. Kepulauan Tanimbar", "Kab. Bireun": "Kab. Bireuen",
             "Kab. Kutai Kertanegara": "Kab. Kutai Kartanegara", "Kab. Mamuju Utara": "Kab. Pasangkayu",
             "Kab. Siau Tagulandang Biaro": "Kab. Kepulauan Siau Tagulandang Biaro", "Kab. Sangihe": "Kab. Kepulauan Sangihe",
             "Kab. Grobongan": "Kab. Grobogan", "Kab. Toba Samosir": "Kab. Toba", "Kota Makasar": "Kota Makassar",
             "Kab. Purwerejo": "Kab. Purworejo", "Kab. Puworejo": "Kab. Purworejo"}


def _bersih(s):
    s = s[4:] if s.startswith("Kab.") else s
    return "".join(c for c in s.lower() if c.isalnum())


def nama_unik(n):
    """provinsi kosong atau kode provinsi lama (Papua Barat 92 -> Papua Barat Daya 96): pakai nama bila tunggal se-Indonesia."""
    calon = [g for g in K.kab_geo(AKAR) if _bersih(g[3:]) == _bersih(n)]
    return calon[0] if len(calon) == 1 else ""


def kode_kab(k):
    """kode kab/kota per nama; provinsi dicoba satu per satu (kejadian bisa lintas provinsi), lalu tanpa provinsi."""
    out = []
    for n in k["kabkota"]:
        n = ALIAS_KAB.get(n, n)
        kode = next((c for p in (k["prov_kode"] or []) if (c := L.kab_dari(lambda a, b: K.cari_kab(AKAR, a, b), n, p))), "") \
            or nama_unik(n)
        if kode and kode not in out:
            out.append(kode)
    return out


def baris(k):
    k = dict(k, kab_kode=kode_kab(k))
    return {c: ("; ".join(k[c]) if isinstance(k[c], list) else k[c]) for c in KOLOM}


def main():
    berkas = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl")))
    rows = [baris(json.loads(l)) for f in berkas for l in open(f, encoding="utf-8")]
    ids = [r["id_kejadian"] for r in rows]
    assert len(ids) == len(set(ids)), "id_kejadian bentrok antar tahun"
    out = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as o:
        w = csv.DictWriter(o, KOLOM)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} kejadian dari {len(berkas)} tahun -> {os.path.relpath(out, AKAR)}")
    rekap(rows, berkas)


def rekap(rows, berkas):
    import collections
    import datetime as dt
    hari = {os.path.basename(os.path.dirname(f)): json.load(open(os.path.join(os.path.dirname(f), "ringkasan.json")))["n_berkas"]
            for f in berkas}
    jenis = sorted({r["jenis"] for r in rows})
    # tahun dasar kalender = runtun penuh 2014-2020; tahun penuh lain (2024) hanya masuk "tahun"/"bulan", supaya label
    # "N dari 7 tahun, 2014-2020" di layar dan uji balik tetap sah. Menambah tahun dasar = ganti label layar sekaligus.
    penuh = sorted(y for y, h in hari.items() if h >= 365 and "2014" <= y <= "2020")
    kab = collections.defaultdict(lambda: {"bulan": collections.defaultdict(lambda: [0] * 12),
                                           "tahun": collections.defaultdict(dict),
                                           "ada": collections.defaultdict(lambda: [set() for _ in range(12)]),
                                           "bulan_penuh": collections.defaultdict(lambda: [0] * 12)})
    # angka korban TIDAK direkap: satu bencana bisa pecah jadi beberapa kejadian (Lombok 2018 tiga kali) dan ada salah urai
    # (28.390 "hilang" banjir Magelang 2011). Korban resmi tetap dari DIBI; di sini hanya hitungan kejadian.
    nas = collections.defaultdict(lambda: collections.defaultdict(int))
    for r in rows:
        tgl = r["tgl_kejadian"] or r["pertama_dicatat"]
        if tgl < r["pertama_dicatat"] and (dt.date.fromisoformat(r["pertama_dicatat"]) - dt.date.fromisoformat(tgl)).days > 300:
            tgl = r["pertama_dicatat"]  # salah ketik tahun di Januari ("02 Januari 2023" dicatat 2 Jan 2024): pakai tanggal catat
        y, m = tgl[:4], int(tgl[5:7])
        if y not in hari:  # update atas kejadian tahun sebelumnya: masuk tahun logbook-nya
            y = r["pertama_dicatat"][:4]
        nas[y][r["jenis"]] += 1
        for kk in filter(None, (r["kab_kode"] or "").split("; ")):
            kab[kk]["bulan"][r["jenis"]][m - 1] += 1
            t = kab[kk]["tahun"][y]
            t[r["jenis"]] = t.get(r["jenis"], 0) + 1
            if y in penuh:
                kab[kk]["ada"][r["jenis"]][m - 1].add(y)
                kab[kk]["bulan_penuh"][r["jenis"]][m - 1] += 1
    # 2026: episode laporan harian PDF (laphar_riwayat.json), satu episode = satu kejadian kab x jenis; hanya hitungan
    arsip = ", ".join(sorted(hari))
    lp = os.path.join(AKAR, "public/data/laphar_riwayat.json")
    sumber_lh = ""
    if os.path.exists(lp):
        lh = json.load(open(lp, encoding="utf-8"))
        for e in lh["episode"]:
            y, m = e["mulai"][:4], int(e["mulai"][5:7])
            if y in hari:  # tahun yang sudah ada di logbook tidak ditimpa
                continue
            nas[y][e["jenis"]] += 1
            if e["tingkat"] == "kab":
                kab[e["kab"]]["bulan"][e["jenis"]][m - 1] += 1
                t = kab[e["kab"]]["tahun"][y]
                t[e["jenis"]] = t.get(e["jenis"], 0) + 1
        for y in {e["mulai"][:4] for e in lh["episode"]} - set(hari):
            hari[y] = lh["cakupan"]["hari"]
        sumber_lh = f"; laporan harian {lh['cakupan']['mulai']} s.d. {lh['cakupan']['sampai']} (episode laphar_riwayat.json)"
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "sumber": "Logbook harian Pusdalops BNPB, arsip " + arsip + sumber_lh,
           "catatan": "Hitungan kejadian unik (update digabung). Satu kejadian lintas kab dihitung di tiap kab. "
                      "Tahun tidak lengkap: bandingkan per hari tercatat. Tanpa angka korban (lihat DIBI). "
                      "Kebakaran permukiman 2022 hanya 121 kejadian dalam 272 hari, jauh di bawah 2014-2020; "
                      "kemungkinan cara pencatatannya berubah (belum dipastikan). "
                      "2026 dari laporan harian PDF (Pusdalops Jan-Feb, Koordalops mulai Mar), bukan logbook: "
                      "satu episode kab x jenis dihitung satu kejadian, kejadian lanjutan dari 2025 ikut terhitung "
                      "pada 1 Januari; jangan dibandingkan langsung dengan tahun logbook.",
           "hari_tercatat": hari, "tahun_penuh": penuh, "jenis": jenis, "nasional": nas,
           # tahun_ada[jenis][bulan] = berapa tahun penuh (dari tahun_penuh) yang punya >= 1 kejadian di bulan itu
           # bulan = semua tahun 2011-2022; bulan_penuh = hanya tahun_penuh (pakai ini bila label menyebut 2014-2020)
           "kab": {k: {"bulan": v["bulan"], "bulan_penuh": v["bulan_penuh"], "tahun": v["tahun"],
                       "tahun_ada": {j: [len(b) for b in bs] for j, bs in v["ada"].items()}} for k, v in sorted(kab.items())}}
    p = os.path.join(AKAR, "public/data/logbook_riwayat.json")
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(p + ".tmp", p)
    print(f"rekap {len(kab)} kab/kota -> public/data/logbook_riwayat.json")


if __name__ == "__main__":
    main()
