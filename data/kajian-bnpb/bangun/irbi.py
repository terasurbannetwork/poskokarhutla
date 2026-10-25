#!/usr/bin/env python3
"""Paket `irbi`: terbitkan IRBI BNPB (InaRISK apiv4/data-irbi-full) per kab/kota 2015-2025 untuk dua kajian Kepala BNPB.

Jalankan dari akar repo:  python3 data/kajian-bnpb/bangun/irbi.py
Menulis ke direktori sementara, menjalankan self-check assert, lalu memindah hasilnya ke data/kajian-bnpb/data/irbi/
(gagal = keluar non-nol dan keluaran lama tidak tersentuh). Python 3 stdlib saja. Silsilah: data/kajian-bnpb/data/irbi/README.md.

Masukan:
  data/raw/inarisk/irbi.ndjson                       dump IRBI lengkap, ditarik 18 Okt 2026 (gitignored; opsional)
  data/kajian-bnpb/riset/mentah/irbi.ndjson          salinan riset 23 Okt 2026 (dilacak git; dipakai bila yang di atas tidak ada)
  scripts/udara/kota.json                            kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025) -> nama peta
  public/geo/kabupaten/*.json                        nama kab/kota peta (properti `kab`)
  public/banjir/data/meta.json                       nama provinsi (`provinsi`)
  public/data/penduduk.json                          WorldPop R2025A 2026 per kecamatan -> bobot kab
  data/raw/hukum/teks/perban-nomor-5-tahun-2025.json RENSTRA BNPB 2025-2029 (Tabel 1.1, Tabel 1.6, hlm. 52), gitignored:
  data/raw/hukum/teks/perban-nomor-1-tahun-2025.json RENAS PB 2025-2029 hlm. 18-19         tarik dengan scripts/bnpb/hukum.py semua
"""
import csv, glob, hashlib, json, math, os, re, shutil, statistics as S, tempfile
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
SRC = P("data/raw/inarisk/irbi.ndjson")
SALINAN = P("data/kajian-bnpb/riset/mentah/irbi.ndjson")
OUT = P("data/kajian-bnpb/data/irbi")
RENSTRA = P("data/raw/hukum/teks/perban-nomor-5-tahun-2025.json")
RENAS = P("data/raw/hukum/teks/perban-nomor-1-tahun-2025.json")

H = ["banjir", "longsor", "kekeringan", "cuaca_ekstrem", "abrasi", "gempabumi", "tsunami", "karlahut", "gunungapi"]
TAHUN = list(range(2015, 2026))
LAMA = list(range(2015, 2025))           # satu skala; 2025 skala baru (dibuktikan di bukti_skala)
PULAU = {"SUM": ("Sumatra", ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"]),
         "JAW": ("Jawa", ["31", "32", "33", "34", "35", "36"]),
         "BNT": ("Bali–Nusa Tenggara", ["51", "52", "53"]),
         "KAL": ("Kalimantan", ["61", "62", "63", "64", "65"]),
         "SUL": ("Sulawesi", ["71", "72", "73", "74", "75", "76"]),
         "MAL": ("Maluku", ["81", "82"]),
         "PAP": ("Papua", ["91", "92", "93", "94", "95", "96"])}
PULAU_PROV = {p: k for k, (_, ps) in PULAU.items() for p in ps}
ALIAS_KAB = {("75", "Pahuwato"): ("75", "Pohuwato")}   # ejaan ganda di peta (kec Lemito); sama dengan scripts/gempa/riwayat.py:36
AMBANG_LAMA = 144      # Tinggi bila total > 144 (skala 2015-2024): disimpulkan dari kelas resmi RENSTRA Tabel 1.1 + 168 kab RENAS 2023
AMBANG_BARU = 176      # hanya untuk kelas provinsi 2025 (turunan); dari batas teramati kolom `status` API 2025 (175,68 / 176,14)
# Angka resmi pembanding. Tiap teks diverifikasi ada di halaman korpus JDIH lokal (cek_korpus) sebelum dipakai.
RESMI_NAS = {2019: (144.02, "RENSTRA BNPB 2025-2029 hlm. 52 (baseline)"), 2020: (141.65, "RENSTRA Tabel 1.6 hlm. 52"),
             2021: (138.81, "RENSTRA Tabel 1.6 hlm. 52"), 2022: (135.56, "RENSTRA Tabel 1.6 hlm. 52"),
             2023: (132.25, "RENSTRA Tabel 1.6 hlm. 52; RENAS PB 2025-2029 hlm. 18"), 2024: (128.52, "RENSTRA Tabel 1.6 hlm. 52")}
# Urutan baris RENSTRA Tabel 1.1 (No 1..38) -> kode provinsi Kemendagri.
URUT_T11 = ["11", "51", "36", "17", "34", "31", "75", "15", "32", "33", "35", "61", "63", "62", "64", "65", "19", "21", "18", "81",
            "82", "52", "53", "91", "92", "96", "95", "93", "94", "14", "76", "73", "72", "74", "71", "13", "16", "12"]
PAPUA_BARU = {"91", "92", "93", "94", "95", "96"}   # batas 2025; RENSTRA 2019-2022 memakai susunan 34 provinsi
GRUP_LAMA = {"91": ["91", "93", "94", "95"], "92": ["92", "96"]}
# Sekunder: Katadata Databoks, "Indeks Risiko Bencana di 38 Provinsi Indonesia Tahun 2024" (terbit 16 Des 2025, mengutip BNPB),
# dibuka 23 Okt 2026. Teks halaman: di atas 144 poin = tinggi (8 tinggi, 30 sedang).
URL_KD38 = "https://databoks.katadata.co.id/lingkungan/statistik/69410380c2ad1/indeks-risiko-bencana-di-38-provinsi-indonesia-tahun-2024"
KATADATA_2024 = {"11": 144.29, "12": 139.84, "13": 142.55, "14": 137.69, "15": 138.02, "16": 131.05, "17": 144.08, "18": 130.1,
                 "19": 143.42, "21": 109.24, "31": 59.29, "32": 114.15, "33": 99.61, "34": 102.83, "35": 113.7, "36": 128.64,
                 "51": 111.28, "52": 113.64, "53": 131.85, "61": 131.66, "62": 117.48, "63": 122.11, "64": 136.11, "65": 131.84,
                 "71": 125.91, "72": 137.25, "73": 140.76, "74": 151.77, "75": 116.02, "76": 155.69, "81": 161.5, "82": 145.09,
                 "91": 137.43, "92": 145.76, "93": 138.2, "94": 116.49, "95": 102.05, "96": 148.44}
KATADATA_2024_KELAS = (8, 30)
URL_BALI = "https://databoks.katadata.co.id/en/environment/statistics/69410dda44ead/disaster-risk-index-in-bali-for-2024"
# Label: empat label baku kajian; tambahan setelah titik koma (konvensi data/kajian-bnpb/data/angka.json).
LAB_R = "resmi"
LAB_S = "terverifikasi; sekunder"
LAB_T = "terverifikasi"
LAB_A = "asumsi-kebijakan"
LAB_D = "asumsi-kebijakan; turunan"
LAB_B = "asumsi-kebijakan; turunan, batas 2025 bukan angka terbit"
LAB_P = "asumsi-kebijakan; analisis penyusun atas data resmi"
DEF_LABEL = {
    LAB_R: "nilai API InaRISK / dokumen BNPB, atau dihitung ulang dan cocok (<= 0,01) dengan angka terbit BNPB untuk sel itu",
    LAB_T: "sumber primer non-pemerintah yang dibuka (WorldPop untuk bobot penduduk)",
    LAB_S: "cocok dengan media sekunder yang mengutip BNPB (Katadata Databoks); dokumen BNPB-nya tidak dibuka",
    LAB_A: "pilihan penyusun: bobot penduduk WorldPop 2026, pengelompokan pulau, rerata per bahaya (null dikeluarkan), ambang kelas turunan",
    LAB_D: "dihitung penyusun dari data resmi dengan metode yang mereproduksi angka BNPB di sel lain, tetapi sel ini tidak punya atau tidak cocok dengan angka terbit",
    LAB_B: "Papua dan Papua Barat 2015-2022, serta empat provinsi DOB 2022 (93-96) 2015-2022: dihitung dengan batas 2025; bukan angka terbit dan tidak sebanding dengan RENSTRA (susunan 34 provinsi)",
    LAB_P: "statistik deskriptif data resmi; kesimpulannya (mis. skala 2025 berubah) tafsiran penyusun, tidak dikonfirmasi dokumen BNPB",
}


def sha1(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


def baca_irbi(path):
    """NDJSON InaRISK -> (baris meta utuh, daftar baris data). Menolak berkas yang tidak lengkap."""
    baris = [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]
    meta = [b for b in baris if b.get("type") == "meta"]
    rows = [b["data"] for b in baris if b.get("type") == "row"]
    assert len(meta) == 1 and meta[0]["data"]["pagination"]["total_data"] == len(rows), "jumlah baris tidak sama dengan pagination.total_data"
    return meta[0], rows


def rerata(xs, ws=None):
    if not xs:
        return None
    if ws is None:
        return sum(xs) / len(xs)
    tw = sum(ws)
    return sum(x * w for x, w in zip(xs, ws)) / tw if tw else None


def peringkat(xs):
    """Peringkat rata-rata untuk nilai kembar (untuk Spearman)."""
    urut = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and xs[urut[j + 1]] == xs[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = peringkat(a), peringkat(b)
    ma, mb = S.mean(ra), S.mean(rb)
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
    return num / den


def r4(x):
    return None if x is None else round(x, 4)


def fid(x, d=2):
    """Format angka gaya naskah: koma desimal, minus tipografis (dipakai untuk mencocokkan README)."""
    return f"{x:.{d}f}".replace(".", ",").replace("-", "−")


def cocok_angka(hitung, terbit):
    """'ya' bila sama setelah dibulatkan 2 desimal, 'ya (beda pembulatan <= 0,01)' bila selisih <= 0,01, selain itu None."""
    if round(hitung, 2) == terbit:
        return "ya"
    if abs(hitung - terbit) <= 0.0101:
        return "ya (beda pembulatan <= 0,01)"
    return None


def korpus(path, mentah=False):
    assert os.path.exists(path), f"korpus JDIH {os.path.relpath(path, ROOT)} tidak ada (gitignored); tarik: python3 scripts/bnpb/hukum.py semua"
    d = json.load(open(path, encoding="utf-8"))
    return {h["n"]: h["t"] if mentah else re.sub(r"\s+", " ", h["t"]) for h in d["halaman"]}


def cek_korpus(hal, pasangan):
    """Pastikan tiap kutipan angka resmi ada di HALAMAN yang dirujuk (bukan dari ingatan, bukan sembarang halaman)."""
    hilang = [(n, s) for n, s in pasangan if s not in hal.get(n, "")]
    assert not hilang, f"kutipan resmi tidak ditemukan di halaman korpus: {hilang}"


def tabel_11(hal_mentah):
    """RENSTRA Tabel 1.1 (hlm. 6-8): indeks dan kelas provinsi 2019-2023 -> {(prov, tahun): (indeks, kelas)}."""
    out, nomor = {}, set()
    pola = re.compile(r"(\d+(?:\.\d+)?|-)\s+(Tinggi|Sedang|-)(?=\s|$)")
    for n in (6, 7, 8):
        for ln in hal_mentah[n].splitlines():
            m = re.match(r"^\s*(\d{1,2})\s+(.*)$", ln)
            if not m:
                continue
            pasang = pola.findall(m.group(2))
            if len(pasang) != 5:
                continue
            no = int(m.group(1))
            assert 1 <= no <= 38 and no not in nomor, f"baris Tabel 1.1 ganda/tak sah: {ln!r}"
            nomor.add(no)
            for th, (v, k) in zip(range(2019, 2024), pasang):
                if v != "-":
                    out[(URUT_T11[no - 1], th)] = (float(v), k)
    assert nomor == set(range(1, 39)), f"Tabel 1.1 tidak lengkap: hilang {sorted(set(range(1, 39)) - nomor)}"
    return out


def tulis_csv(ke, nama, kolom, baris):
    for b in baris:
        assert len(b) == len(kolom), (nama, b)
        for v in b:
            assert not (isinstance(v, float) and not math.isfinite(v)), f"NaN/inf di {nama}: {b}"
    with open(os.path.join(ke, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(kolom)
        w.writerows([["" if v is None else v for v in b] for b in baris])
    return {"kolom": kolom, "baris": baris}


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix=".irbi-", dir=os.path.dirname(OUT))
    try:
        bangun(tmp)
        for f in sorted(os.listdir(tmp)):
            os.replace(os.path.join(tmp, f), os.path.join(OUT, f))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("self-check hijau")


def bangun(TMP):
    src = SRC if os.path.exists(SRC) else SALINAN
    meta, rows = baca_irbi(src)
    sha_src = sha1(src)
    selisih = {"utama": os.path.relpath(src, ROOT), "sha1_utama": sha_src, "baris_utama": len(rows)}
    if src != SALINAN and os.path.exists(SALINAN):
        _, rows2 = baca_irbi(SALINAN)
        a = {(r["pcode"], r["tahun"]): r for r in rows}
        b = {(r["pcode"], r["tahun"]): r for r in rows2}
        beda = sorted(k for k in a.keys() | b.keys() if a.get(k) != b.get(k))
        selisih.update({"salinan": os.path.relpath(SALINAN, ROOT), "sha1_salinan": sha1(SALINAN), "baris_salinan": len(rows2),
                        "baris_berbeda": len(beda), "contoh_beda": [list(k) for k in beda[:10]],
                        "vonis": "identik byte-per-byte" if sha1(SALINAN) == sha_src else f"{len(beda)} baris berbeda"})
    else:
        selisih["vonis"] = "hanya salinan riset (data/raw/inarisk/irbi.ndjson tidak ada)"

    # --- wilayah: kode Kemendagri -> nama peta, nama Kepmendagri, provinsi, pulau, penduduk ---
    kota = json.load(open(P("scripts/udara/kota.json"), encoding="utf-8"))
    ki = {c: i for i, c in enumerate(kota["kolom"])}
    geo = Counter()
    for f in sorted(glob.glob(P("public/geo/kabupaten/*.json"))):
        pv = os.path.basename(f)[:2]
        for ft in json.load(open(f, encoding="utf-8"))["features"]:
            geo[ALIAS_KAB.get((pv, ft["properties"]["kab"]), (pv, ft["properties"]["kab"]))] += 1
    wil = {}
    for b in kota["baris"]:
        kode, prov, nama_peta = b[ki["kode"]], b[ki["prov"]], b[ki["kab"]]
        assert (prov, nama_peta) in geo, f"nama {nama_peta} ({kode}) tidak ada di public/geo/kabupaten/{prov}.json"
        wil[kode] = {"nama": nama_peta, "nama_kepmendagri": b[ki["nama"]].strip(), "prov": prov}
    kode_dari_nama = {(w["prov"], w["nama"]): k for k, w in wil.items()}
    assert len(kode_dari_nama) == len(wil) == 514
    assert len({w["nama_kepmendagri"] for w in wil.values()}) == 514, "nama Kepmendagri ganda"
    prov_nama = json.load(open(P("public/banjir/data/meta.json"), encoding="utf-8"))["provinsi"]
    pend = json.load(open(P("public/data/penduduk.json"), encoding="utf-8"))
    pop = Counter()
    for key, v in pend["kec"].items():
        pv, kab = key.split("|")[:2]
        pop[kode_dari_nama[ALIAS_KAB.get((pv, kab), (pv, kab))]] += v
    assert sum(pop.values()) == sum(pend["kec"].values()) and len(pop) == 514 and min(pop.values()) > 0

    # --- IRBI per kab per tahun ---
    D = {(r["pcode"], r["tahun"]): r for r in rows}
    assert len(D) == len(rows) == 5654, "kunci (pcode, tahun) ganda atau jumlah baris bukan 5.654"
    kodes = sorted({r["pcode"] for r in rows})
    assert kodes == sorted(wil), "kode IRBI tidak sama dengan 514 kode Kemendagri"
    assert all(Counter(r["pcode"] for r in rows)[k] == 11 for k in kodes) and sorted({r["tahun"] for r in rows}) == TAHUN
    jawa = [k for k in kodes if k[:2] in PULAU["JAW"][1]]
    assert len(jawa) == 119, f"kab/kota Jawa {len(jawa)}, harus 119"
    assert set(prov_nama) == set(PULAU_PROV) and len(PULAU_PROV) == 38

    def ber_fix(r):          # basis ber-fix_values (16 kab DOB kosong 2015-2020): mereproduksi IRB nasional 144,02 dan 141,65;
        return r["fix_values"] is not None   # angka provinsi Kaltim 2019-2020 di RENSTRA justru memakai semua kab (rekonsiliasi provinsi)

    def kelas(r):
        if r["tahun"] == 2025:
            return r["status"], "kolom status API (resmi)"
        if not ber_fix(r):
            return None, "tidak dinilai (fix_values kosong)"
        return ("Tinggi" if r["total"] > AMBANG_LAMA else "Sedang"), "ambang total > 144 (turunan)"

    K1 = ["kode", "nama", "nama_kepmendagri", "prov_kode", "prov_nama", "pulau", "tahun", "skala"] + H + \
         ["total", "fix_values", "ori_value", "ber_fix_values", "jumlah_kolom_bahaya", "status_resmi", "kelas_total", "sumber_kelas",
          "pembanding", "pembanding_label"]
    B1 = []
    for k in kodes:
        w = wil[k]
        for y in TAHUN:
            r = D[(k, y)]
            kl, sk = kelas(r)
            B1.append([k, w["nama"], w["nama_kepmendagri"], w["prov"], prov_nama[w["prov"]], PULAU[PULAU_PROV[w["prov"]]][0], y,
                       "baru_2025" if y == 2025 else "lama_2015_2024"] + [r[h] for h in H] +
                      [r["total"], r["fix_values"], r["ori_value"], int(ber_fix(r)), r4(sum(r[h] or 0 for h in H)), r["status"], kl, sk,
                       r["pembanding"], r["pembanding_label"]])
    T = {"irbi_kab_2015_2025.csv": tulis_csv(TMP, "irbi_kab_2015_2025.csv", K1, B1)}

    K2 = ["kode", "nama", "nama_kepmendagri", "prov_kode", "prov_nama", "pulau", "penduduk_2026"] + H + \
         ["total", "status_total_resmi", "n_bahaya_bernilai", "pembanding", "pembanding_label"]
    B2 = []
    for k in kodes:
        w, r = wil[k], D[(k, 2025)]
        B2.append([k, w["nama"], w["nama_kepmendagri"], w["prov"], prov_nama[w["prov"]], PULAU[PULAU_PROV[w["prov"]]][0], pop[k]] +
                  [r[h] for h in H] + [r["total"], r["status"], sum(r[h] is not None for h in H), r["pembanding"], r["pembanding_label"]])
    T["irbi_kab_2025.csv"] = tulis_csv(TMP, "irbi_kab_2025.csv", K2, B2)

    # --- agregasi provinsi / pulau / nasional ---
    def agregat(kab, y):
        rs = [D[(k, y)] for k in kab if ber_fix(D[(k, y)])]
        out = {"n_kab": len(kab), "n_kab_basis": len(rs), "penduduk_basis_2026": sum(pop[r["pcode"]] for r in rs),
               "total_sederhana": r4(rerata([r["total"] for r in rs])),
               "total_berbobot": r4(rerata([r["total"] for r in rs], [pop[r["pcode"]] for r in rs])),
               "n_tinggi": sum(kelas(r)[0] == "Tinggi" for r in rs), "n_sedang": sum(kelas(r)[0] == "Sedang" for r in rs)}
        for h in H:
            v = [r for r in rs if r[h] is not None]
            out[h + "_sederhana"] = r4(rerata([r[h] for r in v]))
            out[h + "_berbobot"] = r4(rerata([r[h] for r in v], [pop[r["pcode"]] for r in v]))
            out[h + "_n_kab"] = len(v)
        return out

    t11 = tabel_11(korpus(RENSTRA, mentah=True))

    def label_prov(p, y, v):
        """Label per sel `total_sederhana` provinsi: resmi hanya bila sel itu sendiri cocok dengan angka terbit."""
        if y == 2025:
            return LAB_D, "belum ada indeks provinsi 2025 terbit; skala baru, metode provinsi 2025 tidak terdokumentasi"
        if p in PAPUA_BARU and y <= 2022:
            if p in GRUP_LAMA:
                return LAB_B, "batas 2025; angka terbit 2019-2022 memakai susunan 34 provinsi (lihat irbi_rekonsiliasi_provinsi.csv)"
            return LAB_B, "provinsi dibentuk 2022; nilai = rerata kab yang kini masuk provinsi ini, bukan angka terbit"
        if (p, y) in t11:
            terbit = t11[(p, y)][0]
            if cocok_angka(v, terbit):
                return LAB_R, f"cocok RENSTRA Tabel 1.1 ({terbit})"
            return LAB_D, f"tidak cocok RENSTRA Tabel 1.1 (terbit {terbit}); lihat irbi_rekonsiliasi_provinsi.csv"
        if y == 2024:
            terbit = KATADATA_2024[p]
            if cocok_angka(v, terbit):
                return LAB_S, f"cocok Katadata 2024 ({terbit}; media mengutip BNPB)"
            return LAB_D, f"tidak cocok Katadata 2024 (terbit {terbit})"
        return LAB_D, "tidak ada angka terbit pembanding untuk tahun ini"

    def label_nas(y, v):
        if y in RESMI_NAS:
            if cocok_angka(v, RESMI_NAS[y][0]):
                return LAB_R, f"cocok {RESMI_NAS[y][1]} ({RESMI_NAS[y][0]})"
            return LAB_D, f"tidak cocok {RESMI_NAS[y][1]} ({RESMI_NAS[y][0]})"
        if y == 2025:
            return LAB_D, "belum ada IRB nasional 2025 terbit yang dicocokkan; skala baru"
        return LAB_D, "tidak ada angka terbit pembanding untuk tahun ini"

    KA = ["n_kab", "n_kab_basis", "penduduk_basis_2026", "total_sederhana", "total_berbobot", "n_tinggi", "n_sedang"] + \
         [h + s for h in H for s in ("_sederhana", "_berbobot", "_n_kab")]
    KL = ["label_total_sederhana", "catatan_total_sederhana", "label_total_berbobot", "label_bahaya"]
    per_prov = defaultdict(list)
    for k in kodes:
        per_prov[wil[k]["prov"]].append(k)
    AG, LP = {}, {}
    B3 = []
    for p in sorted(per_prov):
        for y in TAHUN:
            a = AG[("prov", p, y)] = agregat(per_prov[p], y)
            lab, cat = LP[(p, y)] = label_prov(p, y, a["total_sederhana"])
            B3.append([p, prov_nama[p], PULAU[PULAU_PROV[p]][0], y, "baru_2025" if y == 2025 else "lama_2015_2024"] + [a[c] for c in KA] +
                      [lab, cat, LAB_A, LAB_A])
    T["irbi_agregat_provinsi.csv"] = tulis_csv(TMP, "irbi_agregat_provinsi.csv", ["prov_kode", "prov_nama", "pulau", "tahun", "skala"] + KA + KL, B3)
    B4 = []
    for pk, (pn, ps) in list(PULAU.items()) + [("ID", ("Indonesia", sorted(PULAU_PROV)))]:
        kab = [k for k in kodes if k[:2] in ps]
        for y in TAHUN:
            a = AG[("pulau", pk, y)] = agregat(kab, y)
            lab, cat = label_nas(y, a["total_sederhana"]) if pk == "ID" else (LAB_A, "pengelompokan pulau pilihan penyusun; BNPB tidak menerbitkan indeks per pulau")
            B4.append([pk, pn, y, "baru_2025" if y == 2025 else "lama_2015_2024"] + [a[c] for c in KA] + [lab, cat, LAB_A, LAB_A])
    T["irbi_agregat_pulau.csv"] = tulis_csv(TMP, "irbi_agregat_pulau.csv", ["pulau_kode", "pulau_nama", "tahun", "skala"] + KA + KL, B4)

    # --- tren 2015-2024 (skala sama) ---
    def tren_baris(tingkat, kode, nama, metode, seri, label, resmi_th, sek_th, cat):
        v19, v24, v15 = seri[2019], seri[2024], seri[2015]
        return [tingkat, kode, nama, metode] + [seri[y] for y in LAMA] + \
               [r4(v24 - v19), r4((v24 / v19 - 1) * 100), r4(((v24 / v19) ** (1 / 5) - 1) * 100), r4(v24 - v15), r4((v24 / v15 - 1) * 100),
                sum(seri[y] < seri[y - 1] for y in LAMA[1:])] + [label, ";".join(map(str, resmi_th)), ";".join(map(str, sek_th)), cat]
    KT = ["tingkat", "kode", "nama", "metode"] + [f"y{y}" for y in LAMA] + \
         ["delta_2019_2024", "persen_2019_2024", "laju_tahunan_persen_2019_2024", "delta_2015_2024", "persen_2015_2024", "n_tahun_turun",
          "label", "tahun_cocok_resmi", "tahun_cocok_sekunder", "catatan"]
    B5, papua_tren = [], {}
    for metode, kol in (("rerata_sederhana", "total_sederhana"), ("berbobot_penduduk_2026", "total_berbobot")):
        sd = metode == "rerata_sederhana"
        seri = {y: AG[("pulau", "ID", y)][kol] for y in LAMA}
        th_r = [y for y in LAMA if sd and label_nas(y, seri[y])[0] == LAB_R]
        B5.append(tren_baris("nasional", "ID", "Indonesia", metode, seri, LAB_D if sd else LAB_A, th_r, [],
                             "nilai tahun di tahun_cocok_resmi = angka terbit RENSTRA; tahun lain, selisih, persen, dan laju dihitung penyusun"
                             if sd else "bobot penduduk 2026 pilihan penyusun; BNPB tidak menerbitkan rerata berbobot"))
        for pk, (pn, _) in PULAU.items():
            B5.append(tren_baris("pulau", pk, pn, metode, {y: AG[("pulau", pk, y)][kol] for y in LAMA}, LAB_A, [], [],
                                 "pengelompokan pulau pilihan penyusun; BNPB tidak menerbitkan indeks per pulau"))
        for p in sorted(per_prov):
            seri = {y: AG[("prov", p, y)][kol] for y in LAMA}
            th_r = [y for y in LAMA if sd and LP[(p, y)][0] == LAB_R]
            th_s = [y for y in LAMA if sd and LP[(p, y)][0] == LAB_S]
            cat = "nilai tahun di tahun_cocok_resmi/sekunder = angka terbit; tahun lain, selisih, persen, dan laju dihitung penyusun" if sd else \
                  "bobot penduduk 2026 pilihan penyusun"
            if p in PAPUA_BARU:
                cat += "; 2015-2022 dihitung dengan batas 2025, tidak dapat dibandingkan dengan RENSTRA (susunan 34 provinsi)"
                if p in GRUP_LAMA and sd:
                    pr_ini = (seri[2024] / seri[2019] - 1) * 100
                    pr_terbit = (KATADATA_2024[p] / t11[(p, 2019)][0] - 1) * 100
                    papua_tren[p] = (seri[2019], t11[(p, 2019)][0], pr_ini, pr_terbit)
                    cat += (f"; 2019 di sini {seri[2019]:.2f}, terbit (34 provinsi) {t11[(p, 2019)][0]}; persen 2019-2024 di sini {pr_ini:+.2f}%, "
                            f"seri terbit RENSTRA 2019 -> Katadata 2024 {pr_terbit:+.2f}%" + (" (arah berlawanan)" if pr_ini * pr_terbit < 0 else ""))
            B5.append(tren_baris("provinsi", p, prov_nama[p], metode, seri, LAB_D if sd else LAB_A, th_r, th_s, cat))
    T["irbi_tren_2015_2024.csv"] = tulis_csv(TMP, "irbi_tren_2015_2024.csv", KT, B5)

    # --- bukti perubahan skala 2025 ---
    KB = ["bahaya", "tahun", "n_bernilai", "min", "median", "maks", "n_nilai_unik", "porsi_bilangan_bulat"]
    B6, info_bahaya = [], {}
    for h in H + ["total"]:
        for y in TAHUN:
            v = [D[(k, y)][h] for k in kodes if D[(k, y)][h] is not None and ber_fix(D[(k, y)])]
            info_bahaya[(h, y)] = v
            B6.append([h, y, len(v), r4(min(v)), r4(S.median(v)), r4(max(v)), len({round(x, 6) for x in v}),
                       r4(sum(float(x).is_integer() for x in v) / len(v))])
    T["irbi_bukti_skala_bahaya.csv"] = tulis_csv(TMP, "irbi_bukti_skala_bahaya.csv", KB, B6)
    KY = ["tahun", "n_kab_basis", "rerata_total", "perubahan_dari_tahun_lalu", "porsi_kab_naik", "median_perubahan_kab",
          "spearman_dengan_tahun_lalu", "porsi_total_sama_jumlah_bahaya", "maks_total"]
    B7 = []
    for y in TAHUN:
        rs = [D[(k, y)] for k in kodes if ber_fix(D[(k, y)])]
        row = [y, len(rs), AG[("pulau", "ID", y)]["total_sederhana"]]
        if y > 2015:
            pas = [(D[(k, y - 1)]["total"], D[(k, y)]["total"]) for k in kodes if ber_fix(D[(k, y)]) and ber_fix(D[(k, y - 1)])]
            row += [r4(AG[("pulau", "ID", y)]["total_sederhana"] - AG[("pulau", "ID", y - 1)]["total_sederhana"]),
                    r4(sum(b > a for a, b in pas) / len(pas)), r4(S.median(b - a for a, b in pas)),
                    r4(spearman([a for a, _ in pas], [b for _, b in pas]))]
        else:
            row += [None, None, None, None]
        row += [r4(sum(abs(sum(r[h] or 0 for h in H) - r["total"]) < 0.05 for r in rs) / len(rs)), r4(max(r["total"] for r in rs))]
        B7.append(row)
    T["irbi_bukti_skala_tahunan.csv"] = tulis_csv(TMP, "irbi_bukti_skala_tahunan.csv", KY, B7)
    th = {b[0]: dict(zip(KY, b)) for b in B7}
    lama_naik = max(th[y]["porsi_kab_naik"] for y in LAMA[1:])
    lama_rho = min(th[y]["spearman_dengan_tahun_lalu"] for y in LAMA[1:])
    lama_unik = min(b[6] for b in B6 if b[1] in LAMA and b[1] >= 2021 and b[0] != "total" and b[0] not in ("gunungapi",))
    baru_unik = max(b[6] for b in B6 if b[1] == 2025 and b[0] != "total")
    r25 = [D[(k, 2025)] for k in kodes]
    p_t24 = spearman([r["pembanding"] for r in r25], [D[(r["pcode"], 2024)]["total"] for r in r25])
    p_t25 = spearman([r["pembanding"] for r in r25], [r["total"] for r in r25])
    lonjak = {pk: AG[("pulau", pk, 2025)]["total_sederhana"] - AG[("pulau", pk, 2024)]["total_sederhana"] for pk in PULAU}
    bukti = {
        "label": LAB_P,
        "kesimpulan": "Skala IRBI 2025 berbeda dari 2015-2024; 2025 tidak boleh dibandingkan langsung dengan seri lama. "
                      "Kesimpulan ini analisis penyusun atas data resmi, tidak dikonfirmasi dokumen BNPB.",
        "butir": [
            f"Nilai per bahaya 2025 semuanya bilangan bulat (porsi 1,0) dengan paling banyak {baru_unik} nilai unik per bahaya; 2021-2024 kontinu (paling sedikit {lama_unik} nilai unik per bahaya, kecuali gunungapi yang hanya {len(info_bahaya[('gunungapi', 2024)])} kab).",
            "Batas atas per bahaya berubah: " + "; ".join(f"{h} {r4(max(info_bahaya[(h, 2024)]))} -> {r4(max(info_bahaya[(h, 2025)]))}" for h in H) + ".",
            f"Total = jumlah kolom bahaya pada {r4(th[2024]['porsi_total_sama_jumlah_bahaya'] * 100)}% kab 2024 dan {r4(th[2025]['porsi_total_sama_jumlah_bahaya'] * 100)}% kab 2025 (2015: {r4(th[2015]['porsi_total_sama_jumlah_bahaya'] * 100)}%).",
            f"Rerata nasional turun tiap tahun 2016-2024 (selisih {r4(min(th[y]['perubahan_dari_tahun_lalu'] for y in LAMA[1:]))} s.d. {r4(max(th[y]['perubahan_dari_tahun_lalu'] for y in LAMA[1:]))}), lalu melompat {th[2025]['perubahan_dari_tahun_lalu']:+} poin pada 2025.",
            f"Porsi kab yang totalnya naik: paling tinggi {r4(lama_naik * 100)}% per tahun 2016-2024, lalu {r4(th[2025]['porsi_kab_naik'] * 100)}% pada 2025.",
            f"Korelasi peringkat (Spearman) dengan tahun sebelumnya: paling rendah {r4(lama_rho)} pada 2016-2024, lalu {th[2025]['spearman_dengan_tahun_lalu']} pada 2024->2025.",
            f"Maksimum total: {th[2024]['maks_total']} (2024) -> {th[2025]['maks_total']} (2025); kolom `status` dan `pembanding` hanya terisi pada 2025.",
            "Lompatan 2024->2025 (rerata sederhana) berbeda arah per pulau (" +
            "; ".join(f"{pn} {lonjak[pk]:+.2f}" for pk, (pn, _) in PULAU.items()) +
            "); karena skala berubah (butir 1-6), selisih ini tidak boleh dibaca sebagai perubahan risiko.",
            "Cakupan kab bernilai berubah: " + "; ".join(f"{h} {len(info_bahaya[(h, 2024)])} -> {len(info_bahaya[(h, 2025)])}" for h in H if len(info_bahaya[(h, 2024)]) != len(info_bahaya[(h, 2025)])) + ".",
        ],
        "pembanding_2025": {"label": sorted({r["pembanding_label"] for r in r25}), "spearman_vs_total_2024": r4(p_t24), "spearman_vs_total_2025": r4(p_t25),
                            "catatan": "Makna kolom `pembanding` (label SEB_60) tidak terdokumentasi di sumber; disimpan apa adanya, tidak ditafsirkan."},
    }

    # --- hitungan kelas per tahun ---
    KK = ["tingkat", "tahun", "ambang", "n_dinilai", "n_tinggi", "n_sedang", "n_rendah", "n_tinggi_semua_total", "sumber_kelas", "label"]
    B8 = []
    for y in TAHUN:
        rs = [D[(k, y)] for k in kodes if ber_fix(D[(k, y)])]
        cnt = Counter(kelas(r)[0] for r in rs)
        semua = sum(1 for k in kodes if (D[(k, y)]["status"] == "Tinggi" if y == 2025 else D[(k, y)]["total"] > AMBANG_LAMA))
        if y == 2025:
            B8.append(["kab", y, "kolom status API", len(rs), cnt["Tinggi"], cnt["Sedang"], cnt["Rendah"], semua, "kolom `status` InaRISK (resmi)", LAB_R])
        else:
            B8.append(["kab", y, "> 144", len(rs), cnt["Tinggi"], cnt["Sedang"], 0, semua,
                       "ambang > 144 disimpulkan dari kelas resmi provinsi RENSTRA Tabel 1.1; non-Tinggi = Sedang (RENAS 2023: 168 + 346 = 514)",
                       LAB_R if y == 2023 else LAB_A])
    for y in TAHUN:
        amb = AMBANG_BARU if y == 2025 else AMBANG_LAMA
        v = [AG[("prov", p, y)]["total_sederhana"] for p in sorted(per_prov) if AG[("prov", p, y)]["total_sederhana"] is not None]
        tg = sum(x > amb for x in v)
        B8.append(["provinsi", y, f"> {amb} pada rerata sederhana kab", len(v), tg, len(v) - tg, 0, None,
                   "turunan: rerata kab per provinsi (38 provinsi kini) dibanding ambang" +
                   ("; metode provinsi 2025 tidak terdokumentasi" if y == 2025 else "; cocok RENAS hlm. 19 (13/25)" if y == 2023 else
                    f"; cocok Katadata 2024 ({KATADATA_2024_KELAS[0]}/{KATADATA_2024_KELAS[1]}, sekunder)" if y == 2024 else ""),
                   LAB_R if y == 2023 else LAB_S if y == 2024 else LAB_A])
    T["irbi_hitung_kelas.csv"] = tulis_csv(TMP, "irbi_hitung_kelas.csv", KK, B8)

    # --- rekonsiliasi dengan angka terbit ---
    hal5, hal1 = korpus(RENSTRA), korpus(RENAS)
    cek_korpus(hal5, [(52, "baseline tahun 2019 sebesar 144,02"), (52, "Tabel 1.6. Capaian Indikator Kinerja Sasaran Strategis 1 Tahun 2020-2024"),
                      (52, "2020 141,14 141,65"), (52, "2021 138,26 138,81"), (52, "2022 135,38 135,56"), (52, "2023 132,50 132,25"),
                      (52, "2024 129,62 128,52"), (52, "mengalami penurunan sebesar 10,76% atau sebesar 15,5 poin")])
    cek_korpus(hal1, [(18, "nasional tahun 2023 memiliki nilai sebesar 132,25"),
                      (19, "terdapat 168 kabupaten/kota yang berada pada risiko bencana tinggi"),
                      (19, "346 kabupaten/kota berada pada risiko bencana sedang"),
                      (19, "terdapat 13 (tiga belas) provinsi yang berada pada risiko bencana tinggi"),
                      (19, "Sebanyak 25 provinsi berada pada kelas risiko"),
                      (19, "yaitu Sulawesi Barat, Maluku, dan Kepulauan Bangka Belitung"),
                      (19, "adalah Daerah Khusus Ibukota Jakarta, Papua Pegunungan, dan Daerah Istimewa Yogyakarta")])
    KR = ["butir", "tahun", "nilai_terbit", "sumber_terbit", "label_sumber", "nilai_hitung", "cara_hitung", "selisih", "cocok", "catatan"]
    B9 = []

    def rek(butir, y, terbit, sumber, label, hitung, cara, cocok, cat="", selisih=None):
        if selisih is None and isinstance(terbit, (int, float)) and isinstance(hitung, (int, float)):
            selisih = r4(hitung - terbit)
        B9.append([butir, y, terbit, sumber, label, hitung, cara, selisih, cocok if isinstance(cocok, str) else ("ya" if cocok else "tidak"), cat])

    for y, (v, s) in RESMI_NAS.items():
        h = AG[("pulau", "ID", y)]["total_sederhana"]
        n = AG[("pulau", "ID", y)]["n_kab_basis"]
        rek("IRB rata-rata nasional", y, v, s, LAB_R, round(h, 2), f"rerata total {n} kab ber-fix_values", round(h, 2) == v)
        if n != 514:
            naif = r4(S.mean(D[(k, y)]["total"] for k in kodes))
            rek("IRB rata-rata nasional (cara naif)", y, v, s, LAB_R, round(naif, 2), "rerata total 514 kab termasuk 3 kab bernilai 0", round(naif, 2) == v,
                "Selisih yang dicatat riset A §1.2; hilang bila 16 kab tanpa fix_values (DOB) dikeluarkan")
    n19, n24 = AG[("pulau", "ID", 2019)]["total_sederhana"], AG[("pulau", "ID", 2024)]["total_sederhana"]
    turun_pct, turun_poin = round((1 - n24 / n19) * 100, 2), round(n19 - n24, 1)
    rek("Penurunan IRB nasional 2019-2024", "2019-2024", "10,76% / 15,5 poin", "RENSTRA BNPB 2025-2029 hlm. 52", LAB_R,
        f"{turun_pct}% / {turun_poin} poin", "(2019 - 2024) / 2019 dari rerata ber-fix_values", turun_pct == 10.76 and turun_poin == 15.5, selisih="")
    t23 = sum(D[(k, 2023)]["total"] > AMBANG_LAMA for k in kodes)
    rek("Kab/kota kelas Tinggi", 2023, 168, "RENAS PB 2025-2029 hlm. 19", LAB_R, t23, "hitung total > 144", t23 == 168,
        "Ambang disimpulkan; kab 7108 bernilai tepat 144 dihitung Sedang (dengan >= jadi 169). Uji konsistensi, bukan uji bebas")
    rek("Kab/kota kelas Sedang", 2023, 346, "RENAS PB 2025-2029 hlm. 19", LAB_R, 514 - t23, "514 - Tinggi", 514 - t23 == 346, "BNPB tidak memakai kelas Rendah untuk kab/kota")
    t25 = sum(r["status"] == "Tinggi" for r in r25)
    s25 = sum(r["status"] == "Sedang" for r in r25)
    for nm, nilai in (("Tinggi", t25), ("Sedang", s25)):
        rek(f"Kab/kota kelas {nm}", 2025, nilai, "kolom `status` API-IRBI", LAB_R, "", "dibaca dari kolom status API", "bukan uji",
            "Riset A §1.2 menghitung dari kolom yang sama, jadi tidak ada pembanding bebas", selisih="")
    tmin = min(r["total"] for r in r25 if r["status"] == "Tinggi")
    smax = max(r["total"] for r in r25 if r["status"] == "Sedang")
    rek("Batas kelas Tinggi 2025 (teramati)", 2025, "", "kolom `status` API-IRBI", LAB_R, f"Sedang maks {r4(smax)}; Tinggi min {r4(tmin)}",
        "dibaca dari kolom status dan total API", "bukan uji",
        f"Ambang ~{AMBANG_BARU} disimpulkan dari batas teramati, bukan dikutip. Skripsi 2026 yang disebut riset A §1.1 tidak bisa dilacak "
        f"(tanpa judul, penulis, URL), jadi tidak dipakai. Kab total < 14,67 pada 2025: {sum(r['total'] < 14.67 for r in r25)}", selisih="")
    assert smax < AMBANG_BARU < tmin, "ambang provinsi 2025 tidak lagi di antara batas kelas kab teramati"
    p23 = {p: AG[("prov", p, 2023)]["total_sederhana"] for p in sorted(per_prov)}
    rek("Provinsi kelas Tinggi", 2023, 13, "RENAS PB 2025-2029 hlm. 19", LAB_R, sum(x > 144 for x in p23.values()), "rerata kab per provinsi > 144",
        sum(x > 144 for x in p23.values()) == 13)
    rek("Provinsi kelas Sedang", 2023, 25, "RENAS PB 2025-2029 hlm. 19", LAB_R, sum(x <= 144 for x in p23.values()), "rerata kab per provinsi <= 144",
        sum(x <= 144 for x in p23.values()) == 25)
    urut_p23 = sorted(p23, key=lambda p: -p23[p])
    atas3, bawah3 = ["76", "81", "19"], ["31", "95", "34"]          # urutan teks RENAS hlm. 19
    rek("Tiga provinsi indeks tertinggi", 2023, "; ".join(prov_nama[p] for p in atas3), "RENAS PB 2025-2029 hlm. 19", LAB_R,
        "; ".join(f"{prov_nama[p]} {p23[p]:.2f}" for p in urut_p23[:3]), "urut rerata kab per provinsi 2023 turun", set(atas3) == set(urut_p23[:3]),
        "dibanding sebagai himpunan", selisih="")
    bawah_h = urut_p23[::-1][:4]
    rek("Tiga provinsi indeks terendah", 2023, "; ".join(prov_nama[p] for p in bawah3), "RENAS PB 2025-2029 hlm. 19", LAB_R,
        "; ".join(f"{prov_nama[p]} {p23[p]:.2f}" for p in bawah_h[:3]), "urut rerata kab per provinsi 2023 naik", set(bawah3) == set(bawah_h[:3]),
        f"Konflik antardokumen resmi: RENSTRA Tabel 1.1 ({prov_nama['21']} {t11[('21', 2023)][0]}, {prov_nama['34']} {t11[('34', 2023)][0]}) dan API "
        f"menempatkan {prov_nama['21']} di bawah {prov_nama['34']}; teks RENAS menyebut {prov_nama['34']}. Kedua versi disimpan", selisih="")

    def cari(nama_bagian):
        hit = [k for k in kodes if nama_bagian.lower() == wil[k]["nama"].lower()]
        assert len(hit) == 1, (nama_bagian, hit)
        return hit[0]
    atas_resmi = ["Mandailing Natal", "Halmahera Selatan", "Nias Utara", "Nias", "Maluku Barat Daya"]
    bawah_resmi = ["Kota Administrasi Jakarta Selatan", "Kota Surakarta", "Sigi", "Administrasi Kepulauan Seribu", "Mamberamo Tengah"]
    urut23 = sorted(kodes, key=lambda k: -D[(k, 2023)]["total"])
    atas_h = [wil[k]["nama"] for k in urut23[:5]]
    bawah_h5 = [wil[k]["nama"] for k in urut23[-5:]][::-1]
    atas_ok = {cari(n) for n in atas_resmi} == set(urut23[:5])
    bawah_ok = {cari(n) for n in bawah_resmi} == set(urut23[-5:])
    rek("Lima kab/kota indeks tertinggi", 2023, "; ".join(atas_resmi), "RENAS PB 2025-2029 hlm. 19", LAB_R, "; ".join(atas_h), "urut total 2023 turun",
        atas_ok, "dibanding sebagai himpunan", selisih="")
    rek("Lima kab/kota indeks terendah", 2023, "; ".join(bawah_resmi), "RENAS PB 2025-2029 hlm. 19", LAB_R, "; ".join(bawah_h5), "urut total 2023 naik",
        bawah_ok, "dibanding sebagai himpunan", selisih="")

    # Provinsi 2019-2023 (RENSTRA Tabel 1.1): 2019-2022 memakai susunan 34 provinsi (Papua dan Papua Barat sebelum pemekaran 2022).
    # Diuji dua basis: ber-fix_values (basis agregat paket ini) dan semua kab. Sel cocok bila salah satunya cocok.
    sel = {}
    for (p, y), (v, kl) in sorted(t11.items()):
        grup = GRUP_LAMA.get(p, [p]) if y <= 2022 else [p]
        kab = [k for k in kodes if k[:2] in grup]
        a_fix = agregat(kab, y)["total_sederhana"]
        a_all = S.mean(D[(k, y)]["total"] for k in kab)
        c_fix, c_all = cocok_angka(a_fix, v), cocok_angka(a_all, v)
        dob = [k for k in kab if not ber_fix(D[(k, y)])]
        basis = ("keduanya" if not dob else "ber-fix_values") if c_fix else ("semua kab" if c_all else "")
        sel[(p, y)] = {"v": v, "kl": kl, "grup": grup, "a_fix": a_fix, "a_all": a_all, "cocok": c_fix or c_all or "tidak", "basis": basis, "dob": dob}

    def meleset(q, yy):
        return sel[(q, yy)]["cocok"] == "tidak"
    KP = ["prov_kode", "prov_nama", "tahun", "indeks_terbit", "kelas_terbit", "indeks_hitung_ber_fix_values", "indeks_hitung_semua_kab",
          "kelas_hitung", "selisih_ber_fix_values", "cocok", "basis_cocok", "dugaan_sebab", "susunan", "kelas_terbit_konsisten_ambang_144"]
    B10 = []
    for (p, y), c in sel.items():
        v, a_fix, a_all = c["v"], c["a_fix"], c["a_all"]
        sebab = ["pembulatan"] if c["cocok"].startswith("ya (") else []
        if c["cocok"] == "tidak":
            kembar = [f"{prov_nama[q]} {yy}" for (q, yy), d in sel.items() if d["v"] == v and q != p and not meleset(q, yy)]
            if kembar:
                sebab.append("nilai terbit sama dengan sel lain di Tabel 1.1 yang cocok dengan hitungannya (" + ", ".join(kembar) + "): dugaan salah salin di RENSTRA")
            hitung2 = {round(a_fix, 2), round(a_all, 2)}
            tukar = [((q, yy), d) for (q, yy), d in sel.items() if d["v"] in hitung2 and q != p and meleset(q, yy)]
            for (q, yy), d in tukar:
                silang = v in {round(d["a_fix"], 2), round(d["a_all"], 2)}
                sebab.append(f"nilai hitung sama dengan nilai terbit {prov_nama[q]} {yy}, yang juga meleset dari hitungannya sendiri"
                             + (" (saling silang)" if silang else " (tidak saling silang)") + ": dugaan baris tertukar di RENSTRA")
            if any(abs(abs(a_fix - v) - d) < 0.006 for d in (0.1, 1.0, 10.0)):
                sebab.append(f"selisih ~{round(abs(a_fix - v), 1)}: dugaan salah ketik satu digit")
            if c["dob"]:
                sebab.append(f"provinsi memuat {len(c['dob'])} kab DOB tanpa fix_values ({' '.join(c['dob'])}); basis ber-fix_values {a_fix:.2f} "
                             f"dan semua kab {a_all:.2f} sama-sama tidak cocok: dugaan versi data lain untuk kab itu")
            if not sebab:
                sebab.append("tidak diketahui; data API mungkin dimutakhirkan setelah buku terbit")
        a_k = a_all if c["basis"] == "semua kab" else a_fix
        B10.append([p, prov_nama[p], y, v, c["kl"], round(a_fix, 2), round(a_all, 2), "Tinggi" if a_k > 144 else "Sedang", round(a_fix - v, 2),
                    c["cocok"], c["basis"], "; ".join(sebab), "34 provinsi" if len(c["grup"]) > 1 else "sesuai kode",
                    "ya" if (c["kl"] == "Tinggi") == (v > 144) else "tidak"])
    T["irbi_rekonsiliasi_provinsi.csv"] = tulis_csv(TMP, "irbi_rekonsiliasi_provinsi.csv", KP, B10)
    n_ok = sum(b[9].startswith("ya") for b in B10)
    n_persis = sum(b[9] == "ya" for b in B10)
    n_bulat = n_ok - n_persis
    n_semua = sum(b[10] == "semua kab" for b in B10)
    n_kons = sum(b[13] == "ya" for b in B10)
    rek("Indeks provinsi 2019-2023 (RENSTRA Tabel 1.1)", "2019-2023", len(B10), "RENSTRA BNPB 2025-2029 Tabel 1.1 hlm. 6-8", LAB_R, n_ok,
        "rerata sederhana kab per provinsi (basis ber-fix_values atau semua kab), dibulatkan 2 desimal", n_ok == len(B10),
        f"{n_ok} dari {len(B10)} sel cocok ({n_persis} persis, {n_bulat} beda pembulatan); {n_semua} sel hanya cocok dengan basis semua kab "
        f"(Kaltim 2019-2020). Sisanya berdugaan sebab di irbi_rekonsiliasi_provinsi.csv. Kelas terbit konsisten dengan ambang > 144 pada "
        f"{n_kons} dari {len(B10)} sel", selisih=n_ok - len(B10))
    v24 = {p: AG[("prov", p, 2024)]["total_sederhana"] for p in sorted(per_prov)}
    n_kd = sum(bool(cocok_angka(v24[p], KATADATA_2024[p])) for p in v24)
    rek("Indeks 38 provinsi", 2024, len(KATADATA_2024), f"{URL_KD38} (terbit 16 Des 2025, diakses 23 Okt 2026; media mengutip BNPB)", LAB_S, n_kd,
        "rerata sederhana kab ber-fix_values per provinsi, dibulatkan 2 desimal", n_kd == len(KATADATA_2024), selisih=n_kd - len(KATADATA_2024))
    kd_t = sum(x > AMBANG_LAMA for x in v24.values())
    rek("Provinsi kelas Tinggi / Sedang", 2024, f"{KATADATA_2024_KELAS[0]} / {KATADATA_2024_KELAS[1]}", f"{URL_KD38} (sekunder)", LAB_S,
        f"{kd_t} / {38 - kd_t}", "rerata kab per provinsi > 144", (kd_t, 38 - kd_t) == KATADATA_2024_KELAS,
        "Sumber yang sama menyatakan di atas 144 poin = tinggi: dukungan bebas (sekunder) untuk ambang 144", selisih="")
    # Kab/kota Bali 2024: Katadata Databoks (mengutip BNPB), dibuka 23 Okt 2026 [sekunder]
    bali = {"Jembrana": 133.06, "Klungkung": 124.33, "Gianyar": 122.96, "Tabanan": 122.13, "Bangli": 117.37, "Karangasem": 110.78,
            "Badung": 94.74, "Kota Denpasar": 90.13, "Buleleng": 86.02}
    n_bali = sum(round(D[(cari(n), 2024)]["total"], 2) == v for n, v in bali.items())
    rek("Indeks 9 kab/kota Bali", 2024, len(bali), f"{URL_BALI} (diakses 23 Okt 2026; media mengutip BNPB)", LAB_S,
        n_bali, "total 2024 per kab dibulatkan 2 desimal", n_bali == len(bali), "Sumber yang sama menyebut semua kab Bali < 144 = sedang (dukungan bebas untuk ambang 144)",
        selisih=n_bali - len(bali))
    T["irbi_rekonsiliasi.csv"] = tulis_csv(TMP, "irbi_rekonsiliasi.csv", KR, B9)

    # --- angka yang dikutip README: dibangkitkan di sini, lalu diwajibkan ada verbatim di README (bawah) ---
    porsi = {y: th[y]["porsi_total_sama_jumlah_bahaya"] * 100 for y in (2015, 2024, 2025)}
    d_lama = [th[y]["perubahan_dari_tahun_lalu"] for y in LAMA[1:]]
    jawa25 = Counter(D[(k, 2025)]["status"] for k in jawa)
    jawa_t = [k for k in jawa if D[(k, 2025)]["status"] == "Tinggi"]
    n_dob = sum(1 for k in kodes if not ber_fix(D[(k, 2019)]))
    sebab_n = Counter()
    for b in B10:
        for s in b[11].split("; "):
            sebab_n["dob" if "kab DOB" in s else "salin" if "salah salin" in s else "tukar" if "tertukar" in s else
                    "ketik" if "salah ketik" in s else "?" if s.startswith("tidak diketahui") else ""] += 1
    readme_wajib = [
        f"{n_ok} dari {len(B10)} sel cocok ({n_persis} persis, {n_bulat} beda pembulatan 0,01)",
        f"{len(B10) - n_ok} sel provinsi yang tidak cocok",
        f"{sebab_n['dob']} sel 2019–2020 di provinsi yang memuat kab DOB",
        f"tiga sel 2023 tanpa sebab yang terlihat" if sebab_n["?"] == 3 else f"{sebab_n['?']} sel tanpa sebab",
        f"{n_kd} dari {len(KATADATA_2024)} provinsi",
        f"{n_bali} dari {len(bali)} kab/kota",
        f"{kd_t} Tinggi / {38 - kd_t} Sedang",
        f"{n_dob} kab/kota (DOB",
        f"{AG[('pulau', 'ID', 2019)]['n_kab_basis']} kab ber-`fix_values`",
        f"({fid(S.mean(D[(k, 2019)]['total'] for k in kodes))} dan {fid(S.mean(D[(k, 2020)]['total'] for k in kodes))})",
        f"total {sum(pop.values()):,} jiwa".replace(",", "."),
        f"Sedang tertinggi {fid(smax)}, Tinggi terendah {fid(tmin)}",
        f"Tinggi {t25}, Sedang {s25}",
        f"paling banyak {baru_unik} nilai unik per bahaya",
        f"paling sedikit {lama_unik} nilai unik per bahaya",
        "Batas atas per bahaya: " + "; ".join(
            f"{h.replace('_', ' ')} {fid(max(info_bahaya[(h, 2024)]), 2).rstrip('0').rstrip(',')} → {fid(max(info_bahaya[(h, 2025)]), 2).rstrip('0').rstrip(',')}"
            + (" (tetap)" if max(info_bahaya[(h, 2024)]) == max(info_bahaya[(h, 2025)]) else "") for h in H) + ".",
        f"pada {fid(porsi[2015], 0)}% kab 2015, {fid(porsi[2024], 0)}% kab 2024, dan **{fid(porsi[2025], 0)}% kab 2025**",
        f"({fid(min(d_lama))} s.d. {fid(max(d_lama))} poin), lalu **naik +{fid(th[2025]['perubahan_dari_tahun_lalu'])}**",
        f"paling tinggi {fid(lama_naik * 100, 1)}% per tahun 2016–2024, lalu **{fid(th[2025]['porsi_kab_naik'] * 100, 1)}%**",
        f"paling rendah {fid(lama_rho)} (2016–2024), lalu **{fid(th[2025]['spearman_dengan_tahun_lalu'], 3)}**",
        f"Maksimum total {fid(th[2024]['maks_total'], 1)} → {fid(th[2025]['maks_total'])}",
        "(" + ", ".join(f"{PULAU[pk][0]} {'+' if lonjak[pk] > 0 else ''}{fid(lonjak[pk])}" for pk in PULAU) + ")",
        f"Jawa 2025: {jawa25['Sedang']} Sedang, {jawa25['Tinggi']} Tinggi ({wil[jawa_t[0]]['nama']} {jawa_t[0]})" if len(jawa_t) == 1 else "Jawa 2025",
        f"Spearman dengan total 2024 {fid(p_t24)}, dengan total 2025 {fid(p_t25)}",
        f"rerata nasional 2025 {fid(AG[('pulau', 'ID', 2025)]['total_sederhana'])}",
    ] + [f"{prov_nama[p]} 2019 di sini {fid(a)}, terbit (34 provinsi) {fid(b)}; persen 2019–2024 di sini {'+' if c > 0 else ''}{fid(c)}%, "
         f"seri terbit {'+' if d > 0 else ''}{fid(d)}%" for p, (a, b, c, d) in sorted(papua_tren.items())]

    # --- irbi.json: cermin semua tabel + ringkasan ---
    meta_out = {"paket": "irbi", "dibuat_oleh": "data/kajian-bnpb/bangun/irbi.py",
                "sumber": "InaRISK BNPB, Indeks Risiko Bencana Indonesia (IRBI), https://inarisk.bnpb.go.id/apiv4/data-irbi-full; lisensi tidak tertulis, tulis 'Sumber: InaRISK BNPB'",
                "penarik": "scripts/cuaca/risiko_bnpb.py (fungsi ambil, BASE + 'data-irbi-full'); lihat README §1",
                "tanggal_tarik": {"data/raw/inarisk/irbi.ndjson": "2026-10-18", "data/kajian-bnpb/riset/mentah/irbi.ndjson": "2026-10-23"},
                "meta_api": meta, "selisih_berkas": selisih, "label": DEF_LABEL,
                "sekunder": {"katadata_38_provinsi_2024": {"url": URL_KD38, "terbit": "2025-12-16", "diakses": "2026-10-23", "nilai": KATADATA_2024,
                                                           "kelas": {"tinggi": KATADATA_2024_KELAS[0], "sedang": KATADATA_2024_KELAS[1], "ambang": "> 144"}},
                             "katadata_bali_2024": {"url": URL_BALI, "diakses": "2026-10-23", "nilai": bali}},
                "bukti_skala_2025": bukti, "angka_readme": readme_wajib}
    json.dump({"meta": meta_out, "tabel": T}, open(os.path.join(TMP, "irbi.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # --- self-check: invarian (keluaran masih di direktori sementara; gagal = OUT lama tidak tersentuh) ---
    assert len(B1) == 5654 and len(B2) == 514 and len(B3) == 38 * 11 and len(B4) == 8 * 11 and len(B5) == 2 * (1 + 7 + 38)
    assert sum(AG[("pulau", pk, 2025)]["n_kab"] for pk in PULAU) == 514 and AG[("pulau", "JAW", 2025)]["n_kab"] == 119
    # kesamaan per baris dengan sumber, dibaca ulang dari CSV yang ditulis (bukan dari list di memori)
    kol_api = H + ["total", "fix_values", "ori_value"]
    for nama, kol_k in (("irbi_kab_2015_2025.csv", kol_api), ("irbi_kab_2025.csv", H + ["total"])):
        n = 0
        for b in csv.DictReader(open(os.path.join(TMP, nama), encoding="utf-8")):
            r = D[(b["kode"], int(b.get("tahun") or 2025))]
            for c in kol_k:
                assert (b[c] == "" and r[c] is None) or (r[c] is not None and float(b[c]) == r[c]), (nama, b["kode"], b.get("tahun"), c, b[c], r[c])
            assert (b.get("status_resmi", b.get("status_total_resmi")) or None) == r["status"], (nama, b["kode"])
            assert b["nama_kepmendagri"] == b["nama_kepmendagri"].strip()
            n += 1
        assert n == (5654 if "2015" in nama else 514), (nama, n)
    for (lv, kd, y), a in AG.items():
        kab = per_prov[kd] if lv == "prov" else [k for k in kodes if k[:2] in (PULAU[kd][1] if kd != "ID" else PULAU_PROV)]
        v = [D[(k, y)]["total"] for k in kab if ber_fix(D[(k, y)])]
        assert min(v) - 1e-9 <= a["total_berbobot"] <= max(v) + 1e-9 and min(v) - 1e-9 <= a["total_sederhana"] <= max(v) + 1e-9, (lv, kd, y)
    # rekonsiliasi: angka terbit yang harus tetap tereproduksi
    rk = {(b[0], b[1]): b for b in B9}
    for y in RESMI_NAS:
        assert rk[("IRB rata-rata nasional", y)][8] == "ya", rk[("IRB rata-rata nasional", y)]
    for kunci in [("Kab/kota kelas Tinggi", 2023), ("Kab/kota kelas Sedang", 2023), ("Provinsi kelas Tinggi", 2023), ("Provinsi kelas Sedang", 2023),
                  ("Penurunan IRB nasional 2019-2024", "2019-2024"), ("Tiga provinsi indeks tertinggi", 2023), ("Lima kab/kota indeks tertinggi", 2023),
                  ("Lima kab/kota indeks terendah", 2023), ("Indeks 38 provinsi", 2024), ("Provinsi kelas Tinggi / Sedang", 2024),
                  ("Indeks 9 kab/kota Bali", 2024)]:
        assert rk[kunci][8] == "ya", f"rekonsiliasi {kunci} tidak lagi cocok: {rk[kunci]}"
    assert n_bali == 9 and n_kd == 38 and atas_ok and bawah_ok
    assert set(bawah_h[:3]) == {"31", "95", "21"} and p23["21"] < p23["34"], "konflik RENAS/RENSTRA tiga provinsi terendah 2023 berubah; tulis ulang catatannya"
    assert n_ok >= 150 and n_semua == 2 and {(b[0], b[2]) for b in B10 if b[10] == "semua kab"} == {("64", 2019), ("64", 2020)}, (n_ok, n_semua)
    assert n_kons == len(B10) == 174
    assert not any("tertukar" in b[11] for b in B10 if b[0] == "82"), "heuristik tukar kembali memberi sebab palsu untuk Maluku Utara"
    # label per sel: resmi/sekunder hanya bila sel itu sendiri cocok angka terbit; Papua lama dan DOB 2022 tidak pernah resmi
    for b in B3:
        p, y, v, lab = b[0], b[3], b[5 + KA.index("total_sederhana")], b[5 + len(KA)]
        if lab == LAB_R:
            assert (p, y) in t11 and cocok_angka(v, t11[(p, y)][0]) and not (p in PAPUA_BARU and y <= 2022), (p, y)
        if lab == LAB_S:
            assert y == 2024 and cocok_angka(v, KATADATA_2024[p]), (p, y)
        if p in PAPUA_BARU and y <= 2022:
            assert lab == LAB_B, (p, y, lab)
    assert sum(b[5 + len(KA)] == LAB_R for b in B3) == sum(1 for (p, y) in LP if LP[(p, y)][0] == LAB_R) == \
        sum(1 for (p, y), c in sel.items() if c["cocok"] != "tidak" and c["basis"] != "semua kab" and not (p in PAPUA_BARU and y <= 2022))
    assert all(b[4 + len(KA)] == (LAB_R if 2019 <= b[2] <= 2024 else LAB_D) for b in B4 if b[0] == "ID")
    assert th[2025]["porsi_kab_naik"] > 2 * lama_naik and th[2025]["spearman_dengan_tahun_lalu"] < lama_rho, "bukti perubahan skala 2025 tidak lagi berlaku"
    assert all(float(r[h]).is_integer() for r in r25 for h in H if r[h] is not None), "nilai per bahaya 2025 tidak lagi bilangan bulat"
    assert papua_tren["91"][2] < 0 < papua_tren["91"][3], "arah tren Papua (batas 2025 vs seri terbit) berubah; perbarui README"
    for f in os.listdir(TMP):
        if f.endswith(".csv"):
            teks = open(os.path.join(TMP, f), encoding="utf-8").read().lower()
            assert not re.search(r"(^|,)(nan|inf|-inf|none|null)(,|$)", teks, re.M), f"nilai kosong tak sah di {f}"
    readme = open(os.path.join(OUT, "README.md"), encoding="utf-8").read()
    hilang = [s for s in readme_wajib if s not in readme]
    assert not hilang, "angka README tidak sama dengan keluaran; tulis ulang README dengan teks ini:\n  " + "\n  ".join(hilang)

    print(f"irbi: {len(rows)} baris, {len(kodes)} kab ({len(jawa)} Jawa); sumber {selisih['utama']}; salinan riset: {selisih.get('vonis')}")
    for b in B9:
        print(f"  [{b[8]:9}] {b[0]} {b[1]}: terbit {b[2]} | hitung {b[5]}")
    print(f"  provinsi Tabel 1.1: {n_ok}/{len(B10)} cocok ({n_semua} lewat basis semua kab); kelas konsisten ambang 144: {n_kons}/{len(B10)}")
    for s in bukti["butir"]:
        print("  skala:", s)


if __name__ == "__main__":
    main()
