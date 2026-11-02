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
         "prov", "prov_kode", "kabkota", "kab_kode", "n_kec", "n_desa",
         "rumah", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "ha", "subjenis"]
# kolom korban (md, hilang, luka, mengungsi, kk, jiwa) TIDAK terbit: pengurai bisa menjumlah angka lintas baris dan satu
# bencana bisa tercatat ganda; korban resmi dari DIBI. Rumah dan ha tetap (dipakai uji_logbook.py dan uji karhutla).


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# pengode wilayah yang sama dengan laphar_riwayat.json (scripts/umum)
K = _muat("umum_kejadian", "scripts/umum/kejadian.py")
L = _muat("umum_laphar", "scripts/umum/laphar_arsip.py")
SC = _muat("subjenis_cuaca", "scripts/data/subjenis_cuaca.py")  # subjenis cuaca dari teks laporan (teksnya sendiri tak terbit)


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
    k = dict(k, kab_kode=kode_kab(k), subjenis=SC.subjenis(k) if k["jenis"] == "cuaca" else [])
    return {c: ("; ".join(k[c]) if isinstance(k[c], list) else k.get(c)) for c in KOLOM}   # kode_dibi/jenis_resmi: arsip sebelum 1 Nov 2026 tak punya


def main():
    # 20??-*/ = tambahan bulan untuk tahun yang sudah diurai (mis. 2013-tambahan dari RTF), ikut tahun 4 angka depannya
    berkas = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl"))
                    + glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??-*/kejadian.jsonl")))
    rows = [baris(json.loads(l)) for f in berkas for l in open(f, encoding="utf-8")]
    ids = [r["id_kejadian"] for r in rows]
    assert len(ids) == len(set(ids)), "id_kejadian bentrok antar tahun"
    out = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as o:
        w = csv.DictWriter(o, KOLOM)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} kejadian dari {len(berkas)} folder arsip -> {os.path.relpath(out, AKAR)}")
    rekap(rows, berkas)


HARI_BULAN_MIN = 25  # minimal hari tercatat per bulan agar satu tahun masuk tahun dasar kalender


def rekap(rows, berkas):
    import collections
    import datetime as dt
    hari = collections.Counter()
    for f in berkas:
        hari[os.path.basename(os.path.dirname(f))[:4]] += json.load(open(os.path.join(os.path.dirname(f), "ringkasan.json")))["n_berkas"]
    hari = dict(hari)
    jenis = sorted({r["jenis"] for r in rows})
    # tahun dasar kalender = tahun yang TIAP bulannya punya >= 25 hari logbook tercatat (2013 Feb 16 hari, 2021 Des 19 hari,
    # 2022-2023 celah piket -> tidak masuk). Layar membaca tahun_penuh dari berkas ini, jangan tulis rentang tahun tetap.
    hari_bulan = collections.defaultdict(lambda: [0] * 12)
    for f in berkas:
        for l in open(os.path.join(os.path.dirname(f), "logbook.jsonl"), encoding="utf-8"):
            t = json.loads(l)["tgl_logbook"]
            hari_bulan[t[:4]][int(t[5:7]) - 1] += 1
    penuh = sorted(y for y in hari if y in hari_bulan and min(hari_bulan[y]) >= HARI_BULAN_MIN)
    kab = collections.defaultdict(lambda: {"bulan": collections.defaultdict(lambda: [0] * 12),
                                           "tahun": collections.defaultdict(dict),
                                           "ada": collections.defaultdict(lambda: [set() for _ in range(12)]),
                                           "bulan_penuh": collections.defaultdict(lambda: [0] * 12)})
    # angka korban TIDAK direkap: satu bencana bisa pecah jadi beberapa kejadian (Lombok 2018 tiga kali) dan ada salah urai
    # (28.390 "hilang" banjir Magelang 2011). Korban resmi tetap dari DIBI; di sini hanya hitungan kejadian.
    nas = collections.defaultdict(lambda: collections.defaultdict(int))
    koreksi = collections.defaultdict(lambda: collections.Counter())   # per tahun pertama_dicatat: baris yang tgl_kejadian-nya dikoreksi
    for r in rows:
        tgl = r["tgl_kejadian"] or r["pertama_dicatat"]
        try:
            sel = (dt.date.fromisoformat(r["pertama_dicatat"]) - dt.date.fromisoformat(tgl)).days
        except ValueError:  # tanggal mustahil (30 Feb dst): dibiarkan seperti semula
            sel = 0
        if abs(sel) > 300:
            # salah ketik tahun: tgl < catat ("02 Januari 2023" dicatat 2 Jan 2024) atau tgl > catat ("2104-01-02"): pakai tanggal catat
            koreksi[r["pertama_dicatat"][:4]]["tgl_lebih_awal" if sel > 0 else "tgl_lebih_akhir"] += 1
            tgl = r["pertama_dicatat"]
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
    # cadangan: episode laporan harian PDF (laphar_riwayat.json) untuk tahun yang belum punya logbook; hanya hitungan
    arsip = ", ".join(sorted(hari))
    lp = os.path.join(AKAR, "public/data/laphar_riwayat.json")
    sumber_lh, catatan_lh = "", ""
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
        pakai = sorted({e["mulai"][:4] for e in lh["episode"]} - set(hari))
        for y in pakai:
            hari[y] = lh["cakupan"]["hari"]
        if pakai:
            sumber_lh = f"; laporan harian {lh['cakupan']['mulai']} s.d. {lh['cakupan']['sampai']} (episode laphar_riwayat.json)"
            catatan_lh = (f" {', '.join(pakai)} dari laporan harian PDF, bukan logbook: satu episode kab x jenis dihitung "
                          "satu kejadian, kejadian lanjutan tahun sebelumnya ikut terhitung pada 1 Januari; "
                          "jangan dibandingkan langsung dengan tahun logbook.")
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "sumber": "Logbook harian Pusdalops BNPB, arsip " + arsip + sumber_lh,
           "catatan": "Hitungan kejadian unik (update digabung). Satu kejadian lintas kab dihitung di tiap kab. "
                      "Tahun tidak lengkap: bandingkan per hari tercatat. Tanpa angka korban (lihat DIBI). "
                      "Kebakaran permukiman 2022 hanya 121 kejadian dalam 272 hari, jauh di bawah 2014-2020; "
                      "kemungkinan cara pencatatannya berubah (belum dipastikan)." + catatan_lh,
           "hari_tercatat": hari, "hari_bulan": dict(sorted(hari_bulan.items())), "koreksi_tahun": {y: dict(c) for y, c in sorted(koreksi.items())}, "tahun_penuh": penuh, "jenis": jenis, "nasional": nas,
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
