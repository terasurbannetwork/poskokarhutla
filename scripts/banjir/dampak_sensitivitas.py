"""Analisis tambahan model_dampak (30 Okt 2026), BUKAN vonis baru: params dan fungsi evaluasi model_dampak yang sama (beku).
  python3 dampak_sensitivitas.py sens      # skill besaran KK/rumah vs B0 per label & subset, + varian fitur hari i-1..i
  python3 dampak_sensitivitas.py skenario  # skenario.json bersih + bagian 5 RISET-DAMPAK.md
  python3 dampak_sensitivitas.py uji
Berkas ini sengaja terpisah dari model_dampak.py supaya sidik PRAREG+kode+params tetap cocok."""
import copy, json, math, os, sys, tempfile
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_dampak as md

N_MIN, MAKS_NIVEL = 10, ("kab+kelas", "kab", "prov+kelas", "prov")


def sumber_kk(dd):
    """penanda per kejadian di dd['ev'] (urutan sama dengan md.muat): 1 = KK dari laporan (logbook/berita), 0 = DIBI menderita/3,5"""
    kidx = {k: i for i, k in enumerate(dd["kabs"])}
    lab = json.load(open(os.path.join(md.RAW, "label20/label.json")))["kejadian"]
    out = []
    for e in lab:
        k = kidx.get(e["kab_kode"])
        i = md.hari(e["mulai"])
        if k is None or not (0 <= i < dd["N"]) or not dd["valid"][k, i]:
            continue
        out.append(1 if e.get("kk") else 0)
    assert len(out) == len(dd["ev"]["ki"]), (len(out), len(dd["ev"]["ki"]))
    return np.array(out, dtype=bool)


def jendela_lalu(dd):
    """salinan dd dengan fitur E/D kejadian dari hari i-1..i saja (tanpa i+1 yang sesudah onset)"""
    d2 = dict(dd)
    e = {a: v.copy() for a, v in dd["ev"].items()}
    for j, (k, i) in enumerate(zip(e["ki"], e["idx"])):
        w = slice(max(0, i - 1), i + 1)
        e["lE"][j] = math.log1p(np.nanmax(dd["E"][k, w]))
        e["D"][j] = float(dd["D"][k, w].max())
    d2["ev"] = e
    return d2


def subset(dd, tgt, m):
    d2 = dict(dd)
    e = dict(dd["ev"])
    e[tgt] = np.where(m, dd["ev"][tgt], np.nan)
    d2["ev"] = e
    return d2


def baris_sens(nama, dd, P, tgt, m=None):
    d = dd if m is None else subset(dd, tgt, m)
    r = md.nilai_mag(d, P, tgt, md.TEST[0], md.TEST[1], B=md.B_UJI)
    if r.get("n", 0) < 5:
        return [nama, tgt, r.get("n", 0), "-", "-", "-"]
    return [nama, tgt, r["n"], f"{r['mae_B1']:.3f}", f"{r['mae_B0']:.3f}", md.f3(r["skill"])]


def sens():
    P = md.muat_params()
    tmp = tempfile.mkdtemp()
    os.makedirs(tmp + "/label20")
    lama = os.environ.get("LABEL_LAMA")
    rows = []
    raw0 = md.RAW
    for tag, jalur in (("label bersih", None), ("label lama", lama)):
        if tag == "label lama" and not jalur:
            continue
        if jalur:
            os.symlink(jalur, tmp + "/label20/label.json")
            md.RAW = tmp
        dd = md.muat()
        src = sumber_kk(dd)
        md.RAW = raw0
        rows.append(baris_sens(f"{tag}, semua", dd, P, "kk"))
        rows.append(baris_sens(f"{tag}, semua", dd, P, "rumah"))
        rows.append(baris_sens(f"{tag}, KK laporan", dd, P, "kk", src))
        rows.append(baris_sens(f"{tag}, KK DIBI/3,5", dd, P, "kk", ~src))
        if not jalur:
            d2 = jendela_lalu(dd)
            rows.append(baris_sens("label bersih, fitur i-1..i, semua", d2, P, "kk"))
            rows.append(baris_sens("label bersih, fitur i-1..i, KK laporan", d2, P, "kk", src))
            rows.append(baris_sens("label bersih, fitur i-1..i, KK DIBI/3,5", d2, P, "kk", ~src))
            rows.append(baris_sens("label bersih, fitur i-1..i, semua", d2, P, "rumah"))
    t = md.tabel(["varian", "target", "n", "MAE B1", "MAE B0", "skill vs B0 [CI95]"], rows)
    print(t)
    return t


def sebaran(dd, kab_i, a3):
    """tinggi/lama empiris hanya dari kab itu sendiri atau provinsinya dengan n >= 10; selain itu None"""
    e = dd["ev"]
    kl = np.array([md.kelas_hujan(x) for x in e["a3"]])
    pv = dd["prov"][e["ki"]] == dd["prov"][kab_i]
    out = {}
    for nm in ("ked", "dur"):
        ada = ~np.isnan(e[nm])
        out[nm] = {"n": int((ada & (e["ki"] == kab_i)).sum()), "catatan": "data tidak cukup"}
        for nivel, m in (("kab+kelas", ada & (e["ki"] == kab_i) & (kl == md.kelas_hujan(a3))), ("kab", ada & (e["ki"] == kab_i)),
                         ("prov+kelas", ada & pv & (kl == md.kelas_hujan(a3))), ("prov", ada & pv)):
            if m.sum() >= N_MIN:
                v = e[nm][m]
                out[nm] = {"n": int(m.sum()), "nivel": nivel, "p10": float(np.percentile(v, 10)), "p50": float(np.percentile(v, 50)), "p90": float(np.percentile(v, 90))}
                break
    return out


def skenario():
    dd = md.muat()
    P = md.muat_params()
    out = md.skenario(dd, P)           # menulis skenario.json lama; ditimpa di bawah
    for i, k in enumerate(dd["kabs"]):
        for X_, h in out[k]["hujan"].items():
            h["empiris_tinggi_lama"] = sebaran(dd, i, float(X_))
            for nm_amc in md.AMC:
                r = h[nm_amc]
                r["jiwa_terdampak_setara_kk"] = r.pop("kk")
                r["rumah_terendam"] = r.pop("rumah")
    isi = {"catatan": "peluang = peluang kejadian banjir TERLAPOR mulai pada hari itu (kab-hari), debit D=median, musim netral. "
                      "jiwa_terdampak_setara_kk = DIBI menderita/3,5 (atau KK laporan) [p10,p50,p90] bila terjadi; rumah_terendam = rumah terendam [p10,p50,p90]. "
                      "Model besaran hanya sedikit lebih baik dari median historis kab dan peluang TIDAK LULUS: tayangkan hanya rentang, bukan angka tunggal. "
                      "Tinggi/lama empiris hanya bila n>=10 pada kab itu atau provinsinya; selain itu 'data tidak cukup'.", "kab": out}
    json.dump(isi, open(os.path.join(md.OUT, "skenario.json"), "w"), indent=1, ensure_ascii=False)
    k = "11.02"
    a, h = out[k], out[k]["hujan"]["200"]
    L = ["## 5. Contoh: hujan 200 mm / 3 hari di Aceh Tenggara (11.02)  [dibangun ulang 30 Okt 2026 dengan label bersih]", "",
         f"Basis: {a['n_kejadian_peluang']} kejadian terlapor (latih peluang 2016-2021), {a['n_kk']} kejadian ber-KK dan {a['n_rumah']} ber-rumah (latih <=2021). "
         "Hanya rentang p10-p90 (bukan angka tunggal); model peluang TIDAK LULUS.", ""]
    for nm in md.AMC:
        r = h[nm]
        j, ru = r["jiwa_terdampak_setara_kk"], r["rumah_terendam"]
        L.append(f"- Kondisi {nm}: peluang banjir terlapor pada hari itu {100*r['peluang']:.1f}%; bila terjadi jiwa terdampak (setara KK, DIBI/3,5) kira-kira {j[0]:.0f} sampai {j[2]:.0f} "
                 f"dan rumah terendam {ru[0]:.0f} sampai {ru[2]:.0f}; limpasan {r['limpasan_mm']} mm, kelebihan atas kapasitas {r['kelebihan_mm']} mm.")
    e = h["empiris_tinggi_lama"]
    for nm, lab in (("ked", "tinggi air (cm)"), ("dur", "lama genangan (hari)")):
        v = e[nm]
        L.append(f"- {lab}: " + (f"empiris p10/p50/p90 = {v['p10']:.0f}/{v['p50']:.0f}/{v['p90']:.0f}, berdasarkan {v['n']} kejadian (tingkat: {v['nivel']})."
                                 if "p50" in v else f"data tidak cukup (n={v['n']} di kab, belum ada n>=10 di kab/provinsi)."))
    L += ["", "Catatan: peluang per HARI-kab, bukan 'peluang banjir pada hujan itu'. Koefisien model tetap yang dibekukan (dilatih pada label sebelum pembersihan); hanya sebaran empiris tinggi/lama memakai label bersih.", ""]
    t = open(md.RISET).read()
    t = t.split("\n## 5. Contoh")[0].rstrip() + "\n\n" + "\n".join(L)
    open(md.RISET, "w").write(t)
    print("\n".join(L))


def uji():
    d = {"ev": {"ki": np.array([0] * 12), "a3": np.full(12, 100.0), "ked": np.arange(1.0, 13), "dur": np.full(12, np.nan)}, "prov": np.array([11, 11])}
    r = sebaran(d, 0, 100.0)
    assert r["ked"]["nivel"] == "kab+kelas" and r["ked"]["n"] == 12 and "p50" not in r["dur"] and r["dur"]["catatan"] == "data tidak cukup"
    d["ev"]["ki"][:3] = 1                                    # kab 0 tinggal 9: kab tak cukup, provinsi (kab 0+1) 12 cukup
    r = sebaran(d, 0, 100.0)
    assert r["ked"]["nivel"] == "prov+kelas" and r["ked"]["n"] == 12, r
    d["prov"] = np.array([11, 12])
    r = sebaran(d, 0, 100.0)
    assert "p50" not in r["ked"] and r["ked"]["n"] == 9, r   # provinsi lain: data tidak cukup
    print("uji dampak_sensitivitas: ok")


if __name__ == "__main__":
    {"sens": sens, "skenario": skenario, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
