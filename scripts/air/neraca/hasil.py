"""NA-07 Ringkasan hasil untuk penulis buku/deck -> data/kajian-bnpb/neraca-air/HASIL.md (dari public/data/neraca_air/*.json, tanpa angka tulis tangan).
Pakai: python3 hasil.py | python3 hasil.py uji"""
import json, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
SUMBER = os.path.join(AKAR, "public/data/neraca_air")
KELUAR = os.path.join(AKAR, "data/kajian-bnpb/neraca-air/HASIL.md")
KEM = (5, 6, 7, 8, 9)   # indeks bulan Jun-Okt


def f(x, d=0):
    return f"{x:,.{d}f}".replace(",", "#").replace(".", ",").replace("#", ".")


def tabel(judul, baris, kolom):
    s = f"\n### {judul}\n\n| " + " | ".join(kolom) + " |\n| " + " | ".join("---" for _ in kolom) + " |\n"
    return s + "\n".join("| " + " | ".join(str(c) for c in b) + " |" for b in baris) + "\n"


def jumlah(kab, sk, nama, bln=range(12)):
    return sum(sum(v["skenario"][sk][nama][m] for m in bln) for v in kab.values() if v["skenario"][sk][nama] is not None)


def bangun(kab, rk, keb, meta):
    pr = lambda k: {"31": "DKI", "32": "Jabar", "33": "Jateng", "34": "DIY", "35": "Jatim", "36": "Banten"}[rk[k]["prov"]]
    pend = lambda k: keb["kab"][k]["pend_2025"]
    nama = lambda k: rk[k]["nama"] + (" †" if rk[k]["bendera"]["industri_kosong"] else "") + (" ‡" if rk[k]["bendera"]["kota_kecil"] else "")
    qpct = lambda k: 100 * rk[k]["qin_tahunan"] / (rk[k]["R_tahunan"] + rk[k]["qin_tahunan"]) if rk[k]["R_tahunan"] + rk[k]["qin_tahunan"] > 0 else 0.0
    va = json.load(open(os.path.join(AKAR, "data/kajian-bnpb/neraca-air/mentah/validasi_hitung.json")))
    jr = [v["Jratunseluna (Serang-Lusi-Juwana)"] for y, v in va["awal"]["kering"].items() if y != "1997"]
    jr = [a / b for a, b in jr]
    L = []
    L.append("# HASIL: Neraca air Jawa per kab/kota (v1, estimasi-model)\n")
    L.append("> LABEL: **estimasi-model**. Angka di sini keluaran model bak Thornthwaite-Mather + routing antar-kab (RANCANGAN.md), "
             "divalidasi di VALIDASI.md. Dihasilkan otomatis oleh `scripts/air/neraca/hasil.py` dari `public/data/neraca_air/`; jangan disunting tangan. "
             "Satuan juta m3 (Mm3) kecuali disebut. N = air tersedia (limpasan lokal + aliran masuk dari kab hulu) dikurangi kebutuhan konsumtif "
             "(irigasi dikurangi aliran balik 30%, domestik, ternak, industri); negatif = kekurangan. Kemarau = Juni-Oktober. "
             "Tanda: † = kab tanpa data industri (DIY, Jatim, Kep. Seribu; kebutuhan industrinya tidak dihitung); ‡ = kota/kab kecil (luas < rerata sub-DAS, air terutama kiriman hulu).\n")
    L.append(f"Iklim: {meta['sumber_iklim']['p']}; ET0: {meta['sumber_iklim']['et0']}. Kebutuhan 2025, proyeksi 2030. "
             f"Parameter bak: {meta['parameter']}.\n")
    R = jumlah(kab, "klim", "R")
    P = jumlah(kab, "klim", "P")
    E = jumlah(kab, "klim", "ETa")
    tot = {n: jumlah(kab, "klim", n) for n in ("domestik", "irigasi", "irigasi_sni", "ternak", "industri", "konsumtif", "konsumtif_2030", "total")}
    Rk = jumlah(kab, "klim", "R", KEM)
    Ck = jumlah(kab, "klim", "konsumtif", KEM)
    Ck30 = jumlah(kab, "klim", "konsumtif_2030", KEM)
    n_ind = sum(1 for k in rk if not rk[k]["bendera"]["industri_kosong"])
    L.append(tabel("Total Pulau Jawa (klimatologi 1991-2025, 119 kab/kota)", [
        ["Hujan P", f(P), "Mm3/th"], ["Evapotranspirasi aktual ETa", f(E), "Mm3/th"], ["Limpasan lokal R (air terbarukan)", f(R), "Mm3/th"],
        ["Kebutuhan kotor 2025 (domestik+irigasi+ternak+industri)", f(tot["total"]), "Mm3/th"],
        ["- domestik", f(tot["domestik"]), "Mm3/th"], ["- irigasi (gaya KP-01, kebutuhan potensial)", f(tot["irigasi"]), "Mm3/th"],
        ["- ternak (tanpa ayam ras dan kuda)", f(tot["ternak"]), "Mm3/th"], [f"- industri (hanya {n_ind} dari 119 kab ber-data)", f(tot["industri"]), "Mm3/th"],
        ["Kebutuhan konsumtif 2025", f(tot["konsumtif"]), "Mm3/th"],
        ["Kebutuhan konsumtif 2030 (hanya pertumbuhan penduduk domestik)", f(tot["konsumtif_2030"]), f"Mm3/th (+{f(100 * (tot['konsumtif_2030'] / tot['konsumtif'] - 1), 1)}%)"],
        ["Konsumtif / R, tahunan 2025", f(100 * tot["konsumtif"] / R, 1), "%"],
        ["R Jun-Okt (rerata 35 tahun)", f(Rk), "Mm3"], ["Konsumtif Jun-Okt 2025", f(Ck), "Mm3"], ["Konsumtif / R, Jun-Okt 2025", f(100 * Ck / Rk, 1), "%"],
        ["Konsumtif / R, Jun-Okt 2030", f(100 * Ck30 / Rk, 1), "%"]], ["Besaran", "Nilai", "Satuan"]))
    L.append(f"\nIrigasi gaya KP-01 (pola tanam, penyiapan lahan, hujan efektif, efisiensi 65%; asumsi-kebijakan) = {f(tot['irigasi'])} Mm3/th, "
             f"sekitar {f(100 * tot['irigasi'] / tot['irigasi_sni'], 0)}% dari pembanding SNI 1 L/det/ha x luas irigasi permukaan ({f(tot['irigasi_sni'])} Mm3/th). "
             "Ini kebutuhan potensial, bukan air yang benar-benar dipasok.\n")
    sk_rows = []
    for sk in ("klim", "1997", "2015", "2019", "2023"):
        Rs = jumlah(kab, sk, "R", KEM)
        Cs = jumlah(kab, sk, "konsumtif", KEM)
        Ns = {k: sum(v["skenario"][sk]["N"][m] for m in KEM) for k, v in kab.items()}
        sk_rows.append(["klimatologi" if sk == "klim" else sk, f(jumlah(kab, sk, "P", KEM)), f(Rs), f(Cs), f(100 * Cs / Rs, 1), sum(1 for x in Ns.values() if x < 0),
                        f(sum(x for x in Ns.values() if x < 0))])
    L.append(tabel("Efek skenario tahun (Jun-Okt, kebutuhan 2025)", sk_rows, ["Skenario", "P Jun-Okt (Mm3)", "R Jun-Okt (Mm3)", "Konsumtif Jun-Okt (Mm3)", "Konsumtif/R (%)",
                                                                                "Jumlah kab N<0", "Jumlah N negatif (Mm3)"]))
    L.append("\nArah bias skenario tahun kering bergantung tahun (VALIDASI.md, bagian kemarau ekstrem): 1997 MELEBIH-LEBIHKAN kekurangan (model memadamkan aliran muara di sebagian sungai), "
             "sedangkan 2019 dan 2023 MEREMEHKANNYA di sejumlah muara (mis. Jratunseluna model " + f"{min(jr):.1f}-{max(jr):.1f}x" + " GloFAS). Skenario kering dibaca sebagai indikasi, bukan batas atas atau bawah.\n")

    def baris(k, v):
        return [nama(k), pr(k), f(pend(k) / 1e3), f(v, 1), f(rk[k]["N_tahunan"], 1), f(rk[k]["N_kemarau"], 1), f(rk[k]["N80_kemarau"], 1), f(rk[k]["N_kemarau_skenario"]["1997"], 1),
                f(rk[k]["N2030_tahunan"], 1), rk[k]["bulan_defisit"], rk[k]["ddl"]["status"]]
    kol = ["Kab/kota", "Prov", "Penduduk 2025 (ribu)", "Kunci (Mm3)", "N tahunan", "N Jun-Okt rerata", "N Jun-Okt N80", "N Jun-Okt 1997", "N 2030 tahunan", "Bulan defisit (N<0)", "Status DDL"]
    d_th = [k for k in rk if rk[k]["N_tahunan"] < 0]
    ur = sorted(rk, key=lambda k: rk[k]["N_tahunan"])
    L.append(tabel(f"15 kab/kota dengan N tahunan terendah (hanya {len(d_th)} yang negatif; kekurangan nyata ada di ukuran Jun-Okt di bawah)", [baris(k, rk[k]["N_tahunan"]) for k in ur[:15]], kol))
    d_80 = [k for k in rk if rk[k]["N80_kemarau"] < 0]
    uk = sorted(rk, key=lambda k: rk[k]["N80_kemarau"])
    L.append(tabel(f"15 kab/kota paling defisit Jun-Okt, diurut N80 = persentil ke-20 dari total Jun-Okt tiap tahun (35 nilai; kab dengan N80<0 kekurangan di 20% tahun atau lebih): {len(d_80)} kab negatif", [baris(k, rk[k]["N80_kemarau"]) for k in uk[:15]], kol))
    L.append(tabel("15 kab/kota paling defisit Jun-Okt skenario 1997 (kemarau El Nino terkuat; bias model 1997: melebih-lebihkan)", [baris(k, rk[k]["N_kemarau_skenario"]["1997"]) for k in sorted(rk, key=lambda k: rk[k]["N_kemarau_skenario"]["1997"])[:15]], kol))
    us = sorted(rk, key=lambda k: -(rk[k]["R_tahunan"] - rk[k]["C_tahunan"]))
    L.append(tabel("10 kab/kota dengan surplus LOKAL terbesar (R lokal dikurangi konsumtif, tahunan; air kiriman hulu tidak dihitung)",
                   [[nama(k), pr(k), f(rk[k]["R_tahunan"]), f(rk[k]["C_tahunan"]), f(rk[k]["R_tahunan"] - rk[k]["C_tahunan"]), f(rk[k]["qin_tahunan"]), f(qpct(k), 0) + "%", f(rk[k]["N_tahunan"])] for k in us[:10]],
                   ["Kab/kota", "Prov", "R lokal", "Konsumtif", "R - konsumtif", "Aliran masuk dari hulu", "Pecahan Qin di A", "N tahunan (termasuk air lewat)"]))
    L.append("\nN termasuk air kiriman hulu yang hanya lewat; N TIDAK aditif antar kab (hitung ganda). Peringkat surplus di atas memakai R lokal dikurangi konsumtif.\n")
    d_km = [k for k in rk if rk[k]["N_kemarau"] < 0]
    d_97 = [k for k in rk if rk[k]["N_kemarau_skenario"]["1997"] < 0]
    d_30 = [k for k in rk if rk[k]["N2030_tahunan"] < 0]
    L.append(tabel("Jumlah kab/kota dengan N < 0", [["tahunan 2025", len(d_th)], ["tahunan 2030", len(d_30)], ["Jun-Okt rerata 35 tahun 2025", len(d_km)],
                                                   ["Jun-Okt N80 2025 (persentil ke-20 total tahunan)", len(d_80)], ["Jun-Okt skenario 1997", len(d_97)]], ["Ukuran", "Jumlah dari 119"]))
    ddl = [k for k in rk if rk[k]["ddl"]["status"] == "defisit"]
    pend_def = sum(pend(k) for k in ddl)
    pend_tot = sum(pend(k) for k in rk)
    ddl_pos = sum(1 for k in ddl if rk[k]["N_tahunan"] > 0)
    L.append(f"\nDDL, metode gaya Permen LH 17/2009 (SA = limpasan lokal model tanpa aliran masuk, DA = penduduk x 1.600 m3/kapita/th); BUKAN status resmi: {len(ddl)} dari 119 kab/kota berstatus defisit, "
             f"berpenduduk {f(pend_def / 1e6, 1)} juta dari {f(pend_tot / 1e6, 1)} juta (WorldPop 2026 diskala BPS). Dari {len(ddl)} kab itu, {ddl_pos} punya N tahunan POSITIF (air kiriman hulu menutup); "
             "SA bukan 10xCxRxA resmi.\n")
    ch = sorted(rk, key=lambda k: rk[k]["N2030_tahunan"] - rk[k]["N_tahunan"])
    L.append(tabel("10 kab/kota dengan penurunan N terbesar 2025 -> 2030 (tahunan; proyeksi 2030 HANYA pertumbuhan penduduk domestik, BPS proyeksi SP2010; irigasi, ternak, industri tetap 2025)",
                   [[nama(k), pr(k), f(rk[k]["N_tahunan"], 1), f(rk[k]["N2030_tahunan"], 1), f(rk[k]["N2030_tahunan"] - rk[k]["N_tahunan"], 1)] for k in ch[:10]],
                   ["Kab/kota", "Prov", "N 2025", "N 2030", "Selisih (Mm3/th)"]))
    pv = {}
    for k in rk:
        p = pr(k)
        d = pv.setdefault(p, [0, 0.0, 0.0, 0])
        d[0] += 1
        d[1] += jumlah({k: kab[k]}, "klim", "R")
        d[2] += jumlah({k: kab[k]}, "klim", "konsumtif")
        d[3] += rk[k]["bendera"]["industri_kosong"]
    L.append(tabel("Per provinsi (klimatologi, kebutuhan 2025)", [[p, v[0], f(v[1]), f(v[2]), f(100 * v[2] / v[1], 1), sum(1 for k in rk if pr(k) == p and rk[k]["N_kemarau"] < 0),
                                                                   sum(1 for k in rk if pr(k) == p and rk[k]["N80_kemarau"] < 0), f"{v[3]} dari {v[0]} (†)" if v[3] else "0"] for p, v in sorted(pv.items())],
                   ["Prov", "Jumlah kab/kota", "R lokal (Mm3/th)", "Konsumtif (Mm3/th)", "Konsumtif/R (%)", "Kab N Jun-Okt rerata < 0", "Kab N80 Jun-Okt < 0", "Kab tanpa data industri"]))
    mu = va["awal"]["muara"]
    ra = sorted(v["rasio"] for v in mu.values())
    rd = sorted(v["rasio_kemarau"] for v in mu.values())
    md = lambda x: x[len(x) // 2 - 1] / 2 + x[len(x) // 2] / 2
    kr = {y: sorted(v[n][0] / v[n][1] for n in v) for y, v in va["awal"]["kering"].items()}
    L.append("\n## Bendera data yang wajib disebut penulis\n")
    L.append(f"- Validasi (VALIDASI.md): aliran tahunan 12 muara vs GloFAS: median rasio {md(ra):.2f} (rentang {ra[0]:.2f}-{ra[-1]:.2f}); aliran Jun-Okt TIDAK LOLOS (median {md(rd):.2f}, rentang {rd[0]:.2f}-{rd[-1]:.2f}); "
             "tahun kemarau ekstrem median rasio model/GloFAS " + ", ".join(f"{y} {md(v):.2f}" for y, v in kr.items()) + ". Kalibrasi dan validasi memakai GloFAS yang sama (dalam-sampel).\n")
    L.append(f"- Industri kosong (null) untuk {sum(1 for k in rk if rk[k]['bendera']['industri_kosong'])} kab (DIY, Jatim, Kepulauan Seribu; tanda †): kebutuhan industri mereka tidak dihitung; angka mereka batas bawah kebutuhan.\n"
             "- Industri hanya industri besar-sedang (tahun 2021-2022 menurut provinsi); mikro-kecil tidak termasuk. Koefisien 500 L/pekerja/hari sumber sekunder.\n"
             "- Ternak: sapi, kerbau, kambing, domba, babi 2024 BPS/Kementan; unggas hanya ayam buras + itik (ayam ras tidak tersedia di tabel BPS kab), kuda tidak dihitung.\n"
             f"- Kab ditandai `hilir_waduk`: {sum(1 for k in rk if rk[k]['bendera']['hilir_waduk'])}; kota/kab kecil (‡, luas < rerata sub-DAS, air terutama kiriman hulu): {sum(1 for k in rk if rk[k]['bendera']['kota_kecil'])}.\n"
             "- Model tidak punya air tanah multi-tahun, PDAM, atau transfer selain Tarum Barat; waduk disederhanakan.\n")
    L.append("\n## Klaim aman / perlu catatan (untuk penulis buku dan deck)\n")
    L.append("**Aman dikutip (dengan label estimasi-model):**\n"
             f"- Limpasan total Jawa rerata sekitar {f(R / 1000, 0)} miliar m3/th, dekat dengan BPS 2020 (175,6 miliar; selisih {f(100 * (va['awal']['total']['R_rata'] / 175558 - 1), 1)}% setelah diskala ke luas BPS, dan untuk tahun 2020 saja {f(100 * (va['awal']['total']['R_2020'] / 175558 - 1), 1)}%); keduanya angka model, bukan pengukuran.\n"
             f"- Aliran tahunan sungai besar cocok dengan GloFAS di 12 muara: rasio {ra[0]:.2f}-{ra[-1]:.2f} (median {md(ra):.2f}), tetapi kalibrasi dan validasi memakai GloFAS yang sama.\n"
             f"- Kebutuhan konsumtif tahunan sekitar {f(100 * tot['konsumtif'] / R, 0)}% dari limpasan; di Jun-Okt rasio itu {f(100 * Ck / Rk, 0)}% (rerata 35 tahun); provinsi dengan kab N80<0 terbanyak: " + ", ".join(f"{p} ({n})" for p, n in sorted(((p, sum(1 for k in rk if pr(k) == p and rk[k]["N80_kemarau"] < 0)) for p in pv), key=lambda x: -x[1])[:3]) + ".\n"
             f"- Kab N tahunan negatif hanya {len(d_th)} (kota-kota pantai kecil); kekurangan terutama persoalan musim kemarau.\n\n"
             "**Perlu catatan wajib:**\n"
             f"- Konsumtif/R Jun-Okt {f(100 * jumlah(kab, '1997', 'konsumtif', KEM) / jumlah(kab, '1997', 'R', KEM), 0)}% pada 1997 (kebutuhan potensial lawan limpasan model; bias 1997 melebih-lebihkan, jangan dikutip sebagai fakta).\n"
             "- Angka Jun-Okt per kab = indikasi urutan, bukan nilai pasti: aliran Jun-Okt di muara tidak lolos validasi (median 1,34 dari GloFAS) dan bias skenario kering bergantung tahun.\n"
             f"- Jangan menyebut \"{len(d_80)} kab defisit kemarau\" tanpa menyebut definisinya (N80 = persentil ke-20 total Jun-Okt, kekurangan di 20% tahun atau lebih) dan bahwa kebutuhan irigasi adalah kebutuhan potensial.\n"
             "- Jangan menjumlahkan N antar kab, jangan menyebut kab hilir DAS besar \"surplus\" dari N tahunan (air lewat); pakai R lokal - konsumtif.\n"
             "- Proyeksi 2030 hanya pertumbuhan penduduk domestik (BPS proyeksi SP2010, bukan SUPAS 2025); jangan dibaca sebagai proyeksi iklim atau irigasi.\n"
             "- DDL = metode gaya Permen LH 17/2009, bukan status resmi daerah.\n"
             "- Kab † (DIY, Jatim, Kep. Seribu) tanpa industri; tabel provinsi untuk Jatim dan DIY meremehkan kebutuhan.\n"
             "- Tidak ada validasi lawan pos duga; GloFAS dan BPS 2020 sama-sama model.\n")
    return "\n".join(L)


def uji():
    assert f(1234567.891, 1) == "1.234.567,9" and f(0.5, 1) == "0,5"
    assert tabel("t", [[1, 2]], ["a", "b"]).count("|") == 9
    kab = {"A": {"skenario": {"klim": {"R": [1.0] * 12, "x": None}}}}
    assert jumlah(kab, "klim", "R") == 12 and jumlah(kab, "klim", "R", KEM) == 5 and jumlah(kab, "klim", "x") == 0
    print("ok hasil")


def main():
    kab = json.load(open(os.path.join(SUMBER, "kab.json")))
    rk = json.load(open(os.path.join(SUMBER, "ringkas.json")))
    keb = json.load(open(os.path.join(DIR, "kebutuhan.json")))
    assert len(kab["kab"]) == 119 and set(kab["kab"]) == set(rk["kab"]), "HASIL hanya untuk 119 kab lengkap"
    open(KELUAR, "w").write(bangun(kab["kab"], rk["kab"], keb, kab["meta"]))
    print(f"tulis {KELUAR}", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
