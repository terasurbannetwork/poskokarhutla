#!/usr/bin/env python3
"""Paket `irbi`: terbitkan IRBI BNPB (InaRISK apiv4/data-irbi-full) per kab/kota 2015-2025 untuk dua kajian Kepala BNPB.

Jalankan dari akar repo:  python3 data/kajian-bnpb/bangun/irbi.py
Menulis data/kajian-bnpb/data/irbi/*.csv + irbi.json, lalu self-check assert (gagal = keluar non-nol).
Python 3 stdlib saja. Silsilah dan keterbatasan: data/kajian-bnpb/data/irbi/README.md.

Masukan (semua di repo):
  data/raw/inarisk/irbi.ndjson                       dump IRBI lengkap (tidak dilacak git), ditarik 18 Okt 2026
  data/kajian-bnpb/riset/mentah/irbi.ndjson          salinan riset 23 Okt 2026 (dibandingkan byte-per-byte)
  scripts/udara/kota.json                            kode Kemendagri 4 digit (Kepmendagri 300.2.2-2138/2025) -> nama peta
  public/geo/kabupaten/*.json                        nama resmi kab/kota (properti `kab`)
  public/banjir/data/meta.json                       nama provinsi (`provinsi`)
  public/data/penduduk.json                          WorldPop R2025A 2026 per kecamatan -> bobot kab
  data/raw/hukum/teks/perban-nomor-5-tahun-2025.json RENSTRA BNPB 2025-2029 (Tabel 1.1 dan 1.6), angka resmi pembanding
  data/raw/hukum/teks/perban-nomor-1-tahun-2025.json RENAS PB 2025-2029 hlm. 18-19, angka resmi pembanding
"""
import csv, glob, hashlib, json, math, os, re, statistics as S, sys
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
AMBANG_BARU = 176      # hanya untuk kelas provinsi 2025 (turunan); kelas kab 2025 = kolom `status` API (resmi)
# Angka resmi pembanding. Tiap teks diverifikasi ada di korpus JDIH lokal (cek_korpus) sebelum dipakai.
RESMI_NAS = {2019: (144.02, "RENSTRA BNPB 2025-2029 hlm. 52 (baseline)"), 2020: (141.65, "RENSTRA Tabel 1.6 hlm. 52"),
             2021: (138.81, "RENSTRA Tabel 1.6 hlm. 52"), 2022: (135.56, "RENSTRA Tabel 1.6 hlm. 52"),
             2023: (132.25, "RENSTRA Tabel 1.6 hlm. 52; RENAS PB 2025-2029 hlm. 18"), 2024: (128.52, "RENSTRA Tabel 1.6 hlm. 52")}
# Urutan baris RENSTRA Tabel 1.1 (No 1..38) -> kode provinsi Kemendagri.
URUT_T11 = ["11", "51", "36", "17", "34", "31", "75", "15", "32", "33", "35", "61", "63", "62", "64", "65", "19", "21", "18", "81",
            "82", "52", "53", "91", "92", "96", "95", "93", "94", "14", "76", "73", "72", "74", "71", "13", "16", "12"]
LAB_R, LAB_T, LAB_E, LAB_A = "resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"


def sha1(path):
    return hashlib.sha1(open(path, "rb").read()).hexdigest()


def baca_irbi(path):
    """NDJSON InaRISK -> (meta, daftar baris data). Menolak berkas yang tidak lengkap."""
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


def korpus(path):
    d = json.load(open(path, encoding="utf-8"))
    return {h["n"]: h["t"] for h in d["halaman"]}


def cek_korpus(hal, potongan):
    """Pastikan tiap kutipan angka resmi benar-benar ada di teks peraturan lokal (bukan dari ingatan)."""
    teks = re.sub(r"\s+", " ", "\n".join(hal.values()))
    hilang = [p for p in potongan if p not in teks]
    assert not hilang, f"kutipan resmi tidak ditemukan di korpus: {hilang}"


def tabel_11(hal):
    """RENSTRA Tabel 1.1 (hlm. 6-8): indeks dan kelas provinsi 2019-2023 -> {(prov, tahun): (indeks, kelas)}."""
    out, nomor = {}, set()
    pola = re.compile(r"(\d+(?:\.\d+)?|-)\s+(Tinggi|Sedang|-)(?=\s|$)")
    for n in (6, 7, 8):
        for ln in hal[n].splitlines():
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


def tulis_csv(nama, kolom, baris):
    for b in baris:
        assert len(b) == len(kolom), (nama, b)
        for v in b:
            assert not (isinstance(v, float) and not math.isfinite(v)), f"NaN/inf di {nama}: {b}"
    with open(os.path.join(OUT, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(kolom)
        w.writerows([["" if v is None else v for v in b] for b in baris])
    return {"kolom": kolom, "baris": baris}


def main():
    os.makedirs(OUT, exist_ok=True)
    meta, rows = baca_irbi(SRC)
    sha_src = sha1(SRC)
    selisih = {"utama": os.path.relpath(SRC, ROOT), "sha1_utama": sha_src, "baris_utama": len(rows)}
    if os.path.exists(SALINAN):
        _, rows2 = baca_irbi(SALINAN)
        a = {(r["pcode"], r["tahun"]): r for r in rows}
        b = {(r["pcode"], r["tahun"]): r for r in rows2}
        beda = sorted(k for k in a.keys() | b.keys() if a.get(k) != b.get(k))
        selisih.update({"salinan": os.path.relpath(SALINAN, ROOT), "sha1_salinan": sha1(SALINAN), "baris_salinan": len(rows2),
                        "baris_berbeda": len(beda), "contoh_beda": [list(k) for k in beda[:10]],
                        "vonis": "identik byte-per-byte" if sha1(SALINAN) == sha_src else f"{len(beda)} baris berbeda"})

    # --- wilayah: kode Kemendagri -> nama peta resmi, provinsi, pulau, penduduk ---
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
        wil[kode] = {"nama": nama_peta, "nama_kepmendagri": b[ki["nama"]], "prov": prov}
    kode_dari_nama = {(w["prov"], w["nama"]): k for k, w in wil.items()}
    assert len(kode_dari_nama) == len(wil) == 514
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

    def basis(r):            # basis resmi BNPB: baris ber-fix_values (16 kab DOB kosong 2015-2020); terbukti reproduksi 144,02 dan 141,65
        return r["fix_values"] is not None

    def kelas(r):
        if r["tahun"] == 2025:
            return r["status"], "kolom status API (resmi)"
        if not basis(r):
            return None, "tidak dinilai (fix_values kosong)"
        return ("Tinggi" if r["total"] > AMBANG_LAMA else "Sedang"), "ambang total > 144 (turunan)"

    K1 = ["kode", "nama", "nama_kepmendagri", "prov_kode", "prov_nama", "pulau", "tahun", "skala"] + H + \
         ["total", "fix_values", "ori_value", "basis_resmi", "jumlah_kolom_bahaya", "status_resmi", "kelas_total", "sumber_kelas",
          "pembanding", "pembanding_label"]
    B1 = []
    for k in kodes:
        w = wil[k]
        for y in TAHUN:
            r = D[(k, y)]
            kl, sk = kelas(r)
            B1.append([k, w["nama"], w["nama_kepmendagri"], w["prov"], prov_nama[w["prov"]], PULAU[PULAU_PROV[w["prov"]]][0], y,
                       "baru_2025" if y == 2025 else "lama_2015_2024"] + [r[h] for h in H] +
                      [r["total"], r["fix_values"], r["ori_value"], int(basis(r)), r4(sum(r[h] or 0 for h in H)), r["status"], kl, sk,
                       r["pembanding"], r["pembanding_label"]])
    T = {"irbi_kab_2015_2025.csv": tulis_csv("irbi_kab_2015_2025.csv", K1, B1)}

    K2 = ["kode", "nama", "nama_kepmendagri", "prov_kode", "prov_nama", "pulau", "penduduk_2026"] + H + \
         ["total", "status_total_resmi", "n_bahaya_bernilai", "pembanding", "pembanding_label"]
    B2 = []
    for k in kodes:
        w, r = wil[k], D[(k, 2025)]
        B2.append([k, w["nama"], w["nama_kepmendagri"], w["prov"], prov_nama[w["prov"]], PULAU[PULAU_PROV[w["prov"]]][0], pop[k]] +
                  [r[h] for h in H] + [r["total"], r["status"], sum(r[h] is not None for h in H), r["pembanding"], r["pembanding_label"]])
    T["irbi_kab_2025.csv"] = tulis_csv("irbi_kab_2025.csv", K2, B2)

    # --- agregasi provinsi / pulau / nasional ---
    def agregat(kab, y):
        rs = [D[(k, y)] for k in kab if basis(D[(k, y)])]
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

    KA = ["n_kab", "n_kab_basis", "penduduk_basis_2026", "total_sederhana", "total_berbobot", "n_tinggi", "n_sedang"] + \
         [h + s for h in H for s in ("_sederhana", "_berbobot", "_n_kab")]
    per_prov = defaultdict(list)
    for k in kodes:
        per_prov[wil[k]["prov"]].append(k)
    AG = {}
    B3 = []
    for p in sorted(per_prov):
        for y in TAHUN:
            a = AG[("prov", p, y)] = agregat(per_prov[p], y)
            lab_s = LAB_R if y < 2025 else LAB_A
            B3.append([p, prov_nama[p], PULAU[PULAU_PROV[p]][0], y, "baru_2025" if y == 2025 else "lama_2015_2024"] + [a[c] for c in KA] + [lab_s, LAB_A])
    T["irbi_agregat_provinsi.csv"] = tulis_csv("irbi_agregat_provinsi.csv", ["prov_kode", "prov_nama", "pulau", "tahun", "skala"] + KA +
                                               ["label_sederhana", "label_berbobot"], B3)
    B4 = []
    for pk, (pn, ps) in list(PULAU.items()) + [("ID", ("Indonesia", sorted(PULAU_PROV)))]:
        kab = [k for k in kodes if k[:2] in ps]
        for y in TAHUN:
            a = AG[("pulau", pk, y)] = agregat(kab, y)
            lab_s = LAB_R if (pk == "ID" and y < 2025) else LAB_A
            B4.append([pk, pn, y, "baru_2025" if y == 2025 else "lama_2015_2024"] + [a[c] for c in KA] + [lab_s, LAB_A])
    T["irbi_agregat_pulau.csv"] = tulis_csv("irbi_agregat_pulau.csv", ["pulau_kode", "pulau_nama", "tahun", "skala"] + KA +
                                            ["label_sederhana", "label_berbobot"], B4)

    # --- tren 2015-2024 (skala sama) ---
    def tren_baris(tingkat, kode, nama, metode, seri):
        v19, v24, v15 = seri[2019], seri[2024], seri[2015]
        return [tingkat, kode, nama, metode] + [seri[y] for y in LAMA] + \
               [r4(v24 - v19), r4((v24 / v19 - 1) * 100), r4(((v24 / v19) ** (1 / 5) - 1) * 100), r4(v24 - v15), r4((v24 / v15 - 1) * 100),
                sum(seri[y] < seri[y - 1] for y in LAMA[1:])]
    KT = ["tingkat", "kode", "nama", "metode"] + [f"y{y}" for y in LAMA] + \
         ["delta_2019_2024", "persen_2019_2024", "laju_tahunan_persen_2019_2024", "delta_2015_2024", "persen_2015_2024", "n_tahun_turun"]
    B5 = []
    for metode, kol in (("rerata_sederhana", "total_sederhana"), ("berbobot_penduduk_2026", "total_berbobot")):
        B5.append(tren_baris("nasional", "ID", "Indonesia", metode, {y: AG[("pulau", "ID", y)][kol] for y in LAMA}))
        for pk, (pn, _) in PULAU.items():
            B5.append(tren_baris("pulau", pk, pn, metode, {y: AG[("pulau", pk, y)][kol] for y in LAMA}))
        for p in sorted(per_prov):
            B5.append(tren_baris("provinsi", p, prov_nama[p], metode, {y: AG[("prov", p, y)][kol] for y in LAMA}))
    T["irbi_tren_2015_2024.csv"] = tulis_csv("irbi_tren_2015_2024.csv", KT, B5)

    # --- bukti perubahan skala 2025 ---
    KB = ["bahaya", "tahun", "n_bernilai", "min", "median", "maks", "n_nilai_unik", "porsi_bilangan_bulat"]
    B6, info_bahaya = [], {}
    for h in H + ["total"]:
        for y in TAHUN:
            v = [D[(k, y)][h] for k in kodes if D[(k, y)][h] is not None and basis(D[(k, y)])]
            info_bahaya[(h, y)] = v
            B6.append([h, y, len(v), r4(min(v)), r4(S.median(v)), r4(max(v)), len({round(x, 6) for x in v}),
                       r4(sum(float(x).is_integer() for x in v) / len(v))])
    T["irbi_bukti_skala_bahaya.csv"] = tulis_csv("irbi_bukti_skala_bahaya.csv", KB, B6)
    KY = ["tahun", "n_kab_basis", "rerata_total", "perubahan_dari_tahun_lalu", "porsi_kab_naik", "median_perubahan_kab",
          "spearman_dengan_tahun_lalu", "porsi_total_sama_jumlah_bahaya", "maks_total"]
    B7 = []
    for y in TAHUN:
        rs = [D[(k, y)] for k in kodes if basis(D[(k, y)])]
        row = [y, len(rs), AG[("pulau", "ID", y)]["total_sederhana"]]
        if y > 2015:
            pas = [(D[(k, y - 1)]["total"], D[(k, y)]["total"]) for k in kodes if basis(D[(k, y)]) and basis(D[(k, y - 1)])]
            row += [r4(AG[("pulau", "ID", y)]["total_sederhana"] - AG[("pulau", "ID", y - 1)]["total_sederhana"]),
                    r4(sum(b > a for a, b in pas) / len(pas)), r4(S.median(b - a for a, b in pas)),
                    r4(spearman([a for a, _ in pas], [b for _, b in pas]))]
        else:
            row += [None, None, None, None]
        row += [r4(sum(abs(sum(r[h] or 0 for h in H) - r["total"]) < 0.05 for r in rs) / len(rs)), r4(max(r["total"] for r in rs))]
        B7.append(row)
    T["irbi_bukti_skala_tahunan.csv"] = tulis_csv("irbi_bukti_skala_tahunan.csv", KY, B7)
    th = {b[0]: dict(zip(KY, b)) for b in B7}
    lama_naik = max(th[y]["porsi_kab_naik"] for y in LAMA[1:])
    lama_rho = min(th[y]["spearman_dengan_tahun_lalu"] for y in LAMA[1:])
    lama_unik = min(b[6] for b in B6 if b[1] in LAMA and b[1] >= 2021 and b[0] != "total" and b[0] not in ("gunungapi",))
    baru_unik = max(b[6] for b in B6 if b[1] == 2025 and b[0] != "total")
    r25 = [D[(k, 2025)] for k in kodes]
    p_t24 = spearman([r["pembanding"] for r in r25], [D[(r["pcode"], 2024)]["total"] for r in r25])
    p_t25 = spearman([r["pembanding"] for r in r25], [r["total"] for r in r25])
    bukti = {
        "kesimpulan": "Skala IRBI 2025 berbeda dari 2015-2024; 2025 tidak boleh dibandingkan langsung dengan seri lama.",
        "butir": [
            f"Nilai per bahaya 2025 semuanya bilangan bulat (porsi 1,0) dengan paling banyak {baru_unik} nilai unik per bahaya; 2021-2024 kontinu (paling sedikit {lama_unik} nilai unik per bahaya, kecuali gunungapi yang hanya {len(info_bahaya[('gunungapi', 2024)])} kab).",
            "Batas atas per bahaya berubah: " + "; ".join(f"{h} {r4(max(info_bahaya[(h, 2024)]))} -> {r4(max(info_bahaya[(h, 2025)]))}" for h in H) + ".",
            f"Total = jumlah kolom bahaya pada {r4(th[2024]['porsi_total_sama_jumlah_bahaya'] * 100)}% kab 2024 dan {r4(th[2025]['porsi_total_sama_jumlah_bahaya'] * 100)}% kab 2025 (2015: {r4(th[2015]['porsi_total_sama_jumlah_bahaya'] * 100)}%).",
            f"Rerata nasional turun tiap tahun 2016-2024 (selisih {r4(min(th[y]['perubahan_dari_tahun_lalu'] for y in LAMA[1:]))} s.d. {r4(max(th[y]['perubahan_dari_tahun_lalu'] for y in LAMA[1:]))}), lalu melompat {th[2025]['perubahan_dari_tahun_lalu']:+} poin pada 2025.",
            f"Porsi kab yang totalnya naik: paling tinggi {r4(lama_naik * 100)}% per tahun 2016-2024, lalu {r4(th[2025]['porsi_kab_naik'] * 100)}% pada 2025.",
            f"Korelasi peringkat (Spearman) dengan tahun sebelumnya: paling rendah {r4(lama_rho)} pada 2016-2024, lalu {th[2025]['spearman_dengan_tahun_lalu']} pada 2024->2025.",
            f"Maksimum total: {th[2024]['maks_total']} (2024) -> {th[2025]['maks_total']} (2025); kolom `status` dan `pembanding` hanya terisi pada 2025.",
            "Lompatan 2024->2025 (rerata sederhana) berbeda arah per pulau, jadi bukan geseran skala seragam dan tidak boleh dibaca sebagai perubahan risiko: " +
            "; ".join(f"{pn} {AG[('pulau', pk, 2025)]['total_sederhana'] - AG[('pulau', pk, 2024)]['total_sederhana']:+.2f}" for pk, (pn, _) in PULAU.items()) + ".",
            "Cakupan kab bernilai berubah: " + "; ".join(f"{h} {len(info_bahaya[(h, 2024)])} -> {len(info_bahaya[(h, 2025)])}" for h in H if len(info_bahaya[(h, 2024)]) != len(info_bahaya[(h, 2025)])) + ".",
        ],
        "pembanding_2025": {"label": sorted({r["pembanding_label"] for r in r25}), "spearman_vs_total_2024": r4(p_t24), "spearman_vs_total_2025": r4(p_t25),
                            "catatan": "Makna kolom `pembanding` (label SEB_60) tidak terdokumentasi di sumber; disimpan apa adanya, tidak ditafsirkan."},
    }

    # --- hitungan kelas per tahun ---
    t11 = tabel_11(korpus(RENSTRA))
    KK = ["tingkat", "tahun", "ambang", "n_dinilai", "n_tinggi", "n_sedang", "n_rendah", "n_tinggi_semua_total", "sumber_kelas", "label"]
    B8 = []
    for y in TAHUN:
        rs = [D[(k, y)] for k in kodes if basis(D[(k, y)])]
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
                   "turunan: rerata kab per provinsi (38 provinsi kini) dibanding ambang" + ("; metode provinsi 2025 tidak terdokumentasi" if y == 2025 else ""),
                   LAB_R if y == 2023 else LAB_A])
    T["irbi_hitung_kelas.csv"] = tulis_csv("irbi_hitung_kelas.csv", KK, B8)

    # --- rekonsiliasi dengan angka resmi ---
    hal5, hal1 = korpus(RENSTRA), korpus(RENAS)
    cek_korpus(hal5, ["baseline tahun 2019 sebesar 144,02", "141,65", "138,81", "135,56", "132,25", "128,52"])
    cek_korpus(hal1, ["nasional tahun 2023 memiliki nilai sebesar 132,25", "terdapat 168 kabupaten/kota yang berada pada risiko bencana tinggi",
                      "346 kabupaten/kota berada pada risiko bencana sedang", "terdapat 13 (tiga belas) provinsi yang berada pada risiko bencana tinggi",
                      "Sebanyak 25 provinsi berada pada kelas risiko"])
    KR = ["butir", "tahun", "nilai_resmi", "sumber_resmi", "nilai_hitung", "cara_hitung", "selisih", "cocok", "catatan"]
    B9 = []

    def rek(butir, y, resmi, sumber, hitung, cara, cocok, cat="", selisih=None):
        if selisih is None and isinstance(resmi, (int, float)) and isinstance(hitung, (int, float)):
            selisih = r4(hitung - resmi)
        B9.append([butir, y, resmi, sumber, hitung, cara, selisih, "ya" if cocok else "tidak", cat])

    for y, (v, s) in RESMI_NAS.items():
        h = AG[("pulau", "ID", y)]["total_sederhana"]
        n = AG[("pulau", "ID", y)]["n_kab_basis"]
        rek("IRB rata-rata nasional", y, v, s, round(h, 2), f"rerata total {n} kab ber-fix_values", round(h, 2) == v)
        if n != 514:
            naif = r4(S.mean(D[(k, y)]["total"] for k in kodes))
            rek("IRB rata-rata nasional (cara naif)", y, v, s, round(naif, 2), "rerata total 514 kab termasuk 3 kab bernilai 0", round(naif, 2) == v,
                "Selisih yang dicatat riset A §1.2; hilang bila 16 kab tanpa fix_values (DOB) dikeluarkan")
    t23 = sum(D[(k, 2023)]["total"] > AMBANG_LAMA for k in kodes)
    rek("Kab/kota kelas Tinggi", 2023, 168, "RENAS PB 2025-2029 hlm. 19", t23, "hitung total > 144", t23 == 168,
        "Ambang disimpulkan; kab 7108 bernilai tepat 144 dihitung Sedang (dengan >= jadi 169). Uji konsistensi, bukan uji bebas")
    rek("Kab/kota kelas Sedang", 2023, 346, "RENAS PB 2025-2029 hlm. 19", 514 - t23, "514 - Tinggi", 514 - t23 == 346, "BNPB tidak memakai kelas Rendah untuk kab/kota")
    t25 = sum(r["status"] == "Tinggi" for r in r25)
    rek("Kab/kota kelas Tinggi", 2025, 169, "riset A §1.2 (kolom status API-IRBI)", t25, "hitung status == Tinggi", t25 == 169)
    rek("Kab/kota kelas Sedang", 2025, 345, "riset A §1.2 (kolom status API-IRBI)", sum(r["status"] == "Sedang" for r in r25), "hitung status == Sedang",
        sum(r["status"] == "Sedang" for r in r25) == 345)
    tmin = min(r["total"] for r in r25 if r["status"] == "Tinggi")
    smax = max(r["total"] for r in r25 if r["status"] == "Sedang")
    rek("Batas kelas Tinggi 2025", 2025, "~176 (skripsi 2026 mengutip BNPB: rendah < 14,67; sedang 14,67-176; tinggi > 176)", "riset A §1.1 [SEKUNDER]",
        f"Sedang maks {r4(smax)}; Tinggi min {r4(tmin)}", "dari kolom status", smax < 176 < tmin,
        f"Kab total < 14,67 pada 2025: {sum(r['total'] < 14.67 for r in r25)} (jadi kelas Rendah kosong)")
    p23 = [AG[("prov", p, 2023)]["total_sederhana"] for p in sorted(per_prov)]
    rek("Provinsi kelas Tinggi", 2023, 13, "RENAS PB 2025-2029 hlm. 19", sum(x > 144 for x in p23), "rerata kab per provinsi > 144", sum(x > 144 for x in p23) == 13)
    rek("Provinsi kelas Sedang", 2023, 25, "RENAS PB 2025-2029 hlm. 19", sum(x <= 144 for x in p23), "rerata kab per provinsi <= 144", sum(x <= 144 for x in p23) == 25)

    def cari(nama_bagian):
        hit = [k for k in kodes if nama_bagian.lower() == wil[k]["nama"].lower()]
        assert len(hit) == 1, (nama_bagian, hit)
        return hit[0]
    atas_resmi = ["Mandailing Natal", "Halmahera Selatan", "Nias Utara", "Nias", "Maluku Barat Daya"]
    bawah_resmi = ["Kota Administrasi Jakarta Selatan", "Kota Surakarta", "Sigi", "Administrasi Kepulauan Seribu", "Mamberamo Tengah"]
    urut23 = sorted(kodes, key=lambda k: -D[(k, 2023)]["total"])
    atas_h = [wil[k]["nama"] for k in urut23[:5]]
    bawah_h = [wil[k]["nama"] for k in urut23[-5:]][::-1]
    rek("Lima kab/kota indeks tertinggi", 2023, "; ".join(atas_resmi), "RENAS PB 2025-2029 hlm. 19", "; ".join(atas_h), "urut total 2023 turun",
        {cari(n) for n in atas_resmi} == set(urut23[:5]), "dibanding sebagai himpunan", selisih="")
    rek("Lima kab/kota indeks terendah", 2023, "; ".join(bawah_resmi), "RENAS PB 2025-2029 hlm. 19", "; ".join(bawah_h), "urut total 2023 naik",
        {cari(n) for n in bawah_resmi} == set(urut23[-5:]), "dibanding sebagai himpunan", selisih="")
    # Provinsi 2019-2023 (RENSTRA Tabel 1.1): 2019-2022 memakai susunan 34 provinsi (Papua dan Papua Barat sebelum pemekaran 2022).
    GRUP_LAMA = {"91": ["91", "93", "94", "95"], "92": ["92", "96"]}
    KP = ["prov_kode", "prov_nama", "tahun", "indeks_resmi", "kelas_resmi", "indeks_hitung", "kelas_hitung", "selisih", "cocok", "dugaan_sebab",
          "susunan", "kelas_resmi_konsisten_ambang_144"]
    B10 = []
    for (p, y), (v, kl) in sorted(t11.items()):
        grup = GRUP_LAMA.get(p, [p]) if y <= 2022 else [p]
        kab = [k for k in kodes if k[:2] in grup]
        a = agregat(kab, y)["total_sederhana"]
        sebab = []
        if round(a, 2) == v:
            cocok = "ya"
        elif abs(a - v) <= 0.0101:
            cocok, sebab = "ya (beda pembulatan <= 0,01)", ["pembulatan"]
        else:
            cocok = "tidak"
            kembar = [f"{prov_nama[q]} {yy}" for (q, yy), (vv, _) in t11.items() if vv == v and (q, yy) != (p, y) and q != p]
            if kembar:
                sebab.append("nilai resmi sama dengan sel lain di Tabel 1.1 (" + ", ".join(kembar) + "): dugaan salah salin di RENSTRA")
            tukar = [f"{prov_nama[q]} {yy}" for (q, yy), (vv, _) in t11.items() if vv == round(a, 2) and q != p]
            if tukar:
                sebab.append("nilai hitung sama dengan nilai resmi " + ", ".join(tukar) + ": dugaan baris tertukar di RENSTRA")
            if any(abs(abs(a - v) - d) < 0.006 for d in (0.1, 1.0, 10.0)):
                sebab.append(f"selisih ~{round(abs(a - v), 1)}: dugaan salah ketik satu digit")
            dob = [k for k in kab if not basis(D[(k, y)])]
            if dob:
                sebab.append(f"provinsi memuat {len(dob)} kab DOB tanpa fix_values ({' '.join(dob)}); angka buku memakai versi data lain")
            if not sebab:
                sebab.append("tidak diketahui; data API mungkin dimutakhirkan setelah buku terbit")
        B10.append([p, prov_nama[p], y, v, kl, round(a, 2), "Tinggi" if a > 144 else "Sedang", round(a - v, 2), cocok, "; ".join(sebab),
                    "34 provinsi" if len(grup) > 1 else "sesuai kode", "ya" if (kl == "Tinggi") == (v > 144) else "tidak"])
    T["irbi_rekonsiliasi_provinsi.csv"] = tulis_csv("irbi_rekonsiliasi_provinsi.csv", KP, B10)
    n_ok = sum(b[8].startswith("ya") for b in B10)
    n_kons = sum(b[11] == "ya" for b in B10)
    rek("Indeks provinsi 2019-2023 (RENSTRA Tabel 1.1)", "2019-2023", len(B10), "RENSTRA BNPB 2025-2029 Tabel 1.1 hlm. 6-8", n_ok,
        "rerata sederhana kab ber-fix_values per provinsi, dibulatkan 2 desimal", n_ok == len(B10),
        f"{n_ok} dari {len(B10)} sel cocok ({sum(b[8] == 'ya' for b in B10)} persis, {sum(b[8] != 'ya' and b[8].startswith('ya') for b in B10)} beda pembulatan); "
        f"sisanya berdugaan sebab di irbi_rekonsiliasi_provinsi.csv. Kelas resmi konsisten dengan ambang > 144 pada {n_kons} dari {len(B10)} sel", selisih=n_ok - len(B10))
    # Kab/kota Bali 2024: Katadata Databoks (mengutip BNPB), dibuka 23 Okt 2026 [sekunder]
    bali = {"Jembrana": 133.06, "Klungkung": 124.33, "Gianyar": 122.96, "Tabanan": 122.13, "Bangli": 117.37, "Karangasem": 110.78,
            "Badung": 94.74, "Kota Denpasar": 90.13, "Buleleng": 86.02}
    n_bali = sum(round(D[(cari(n), 2024)]["total"], 2) == v for n, v in bali.items())
    rek("Indeks 9 kab/kota Bali", 2024, len(bali), "https://databoks.katadata.co.id/en/environment/statistics/69410dda44ead/disaster-risk-index-in-bali-for-2024 (diakses 23 Okt 2026; media mengutip BNPB, sekunder)",
        n_bali, "total 2024 per kab dibulatkan 2 desimal", n_bali == len(bali), "Sumber yang sama menyebut semua kab Bali < 144 = sedang (dukungan bebas untuk ambang 144)",
        selisih=n_bali - len(bali))
    T["irbi_rekonsiliasi.csv"] = tulis_csv("irbi_rekonsiliasi.csv", KR, B9)

    # --- irbi.json: cermin semua tabel + ringkasan ---
    meta_out = {"paket": "irbi", "dibuat_oleh": "data/kajian-bnpb/bangun/irbi.py",
                "sumber": "InaRISK BNPB, Indeks Risiko Bencana Indonesia (IRBI), https://inarisk.bnpb.go.id/apiv4/data-irbi-full; lisensi tidak tertulis, tulis 'Sumber: InaRISK BNPB'",
                "tanggal_tarik": {"data/raw/inarisk/irbi.ndjson": "2026-10-18", "data/kajian-bnpb/riset/mentah/irbi.ndjson": "2026-10-23"},
                "meta_api": meta["data"], "selisih_berkas": selisih, "label": {"resmi": "nilai API InaRISK / dokumen BNPB, atau dihitung ulang dengan metode BNPB dan cocok dengan angka terbit",
                "asumsi-kebijakan": "pilihan penyusun: bobot penduduk WorldPop 2026, pengelompokan pulau, ambang kelas turunan"},
                "bukti_skala_2025": bukti}
    json.dump({"meta": meta_out, "tabel": T}, open(os.path.join(OUT, "irbi.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # --- self-check: invarian ---
    assert len(B1) == 5654 and len(B2) == 514 and len(B3) == 38 * 11 and len(B4) == 8 * 11
    assert sum(AG[("pulau", pk, 2025)]["n_kab"] for pk in PULAU) == 514 and AG[("pulau", "JAW", 2025)]["n_kab"] == 119
    tot_src = sum(r["total"] for r in rows)
    tot_out = sum(b[K1.index("total")] for b in B1)
    assert abs(tot_src - tot_out) < 1e-6, f"jumlah total keluaran {tot_out} != sumber {tot_src}"
    for h in H:
        assert sum((b[K1.index(h)] or 0) for b in B1) == sum((r[h] or 0) for r in rows), f"kolom {h} tidak sama dengan sumber"
    for (lv, kd, y), a in AG.items():
        kab = per_prov[kd] if lv == "prov" else [k for k in kodes if k[:2] in (PULAU[kd][1] if kd != "ID" else PULAU_PROV)]
        v = [D[(k, y)]["total"] for k in kab if basis(D[(k, y)])]
        assert min(v) - 1e-9 <= a["total_berbobot"] <= max(v) + 1e-9 and min(v) - 1e-9 <= a["total_sederhana"] <= max(v) + 1e-9, (lv, kd, y)
    assert all(b[7] == "ya" for b in B9 if b[0] in ("IRB rata-rata nasional", "Kab/kota kelas Tinggi", "Kab/kota kelas Sedang")), \
        [b for b in B9 if b[7] != "ya" and b[0].startswith(("IRB rata-rata nasional", "Kab/kota"))]
    assert th[2025]["porsi_kab_naik"] > 2 * lama_naik and th[2025]["spearman_dengan_tahun_lalu"] < lama_rho, "bukti perubahan skala 2025 tidak lagi berlaku"
    assert all(float(r[h]).is_integer() for r in r25 for h in H if r[h] is not None), "nilai per bahaya 2025 tidak lagi bilangan bulat"
    for f in os.listdir(OUT):
        if f.endswith(".csv"):
            teks = open(os.path.join(OUT, f), encoding="utf-8").read().lower()
            assert not re.search(r"(^|,)(nan|inf|-inf|none|null)(,|$)", teks, re.M), f"nilai kosong tak sah di {f}"

    print(f"irbi: {len(rows)} baris, {len(kodes)} kab ({len(jawa)} Jawa); salinan riset: {selisih.get('vonis')}")
    for b in B9:
        print(f"  [{b[7]:5}] {b[0]} {b[1]}: resmi {b[2]} | hitung {b[4]}")
    print(f"  provinsi Tabel 1.1: {n_ok}/{len(B10)} cocok; kelas konsisten ambang 144: {n_kons}/{len(B10)}")
    for s in bukti["butir"]:
        print("  skala:", s)
    print("self-check hijau")


if __name__ == "__main__":
    main()
