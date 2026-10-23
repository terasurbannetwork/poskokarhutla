"""Gerbang "harus menang lawan pembanding sederhana" untuk keluaran model karhutla -> public/data/gerbang_model.json.

Audit metode 21 Okt 2026 (§4.4 #3, #4, #11): persistensi ("luas/sel besok = hari ini") unggul di IoU dan galat luas atas model, tetapi keluaran model
tetap tampil di layar. Gerbang ini membandingkan TIAP keluaran dengan pembanding sederhana memakai hasil uji balik yang SUDAH ADA (tidak melatih ulang,
tidak mengunduh apa pun) dan menulis boleh_tampil per keluaran. Pembaca (sim_data.js, sebaran_model.js, insight_sebaran.js, jejak.py; src/ews.js lewat
jejak_api.json) GAGAL-TERTUTUP: berkas ini hilang/rusak/kunci tak ada = sembunyikan.

Keluaran (kunci tingkat atas), masing-masing {metrik, arah, pembanding, n, skor_model, skor_pembanding, selisih, selang95, boleh_tampil, alasan, sumber_berkas, rincian}:
  model_sel    peta peluang sel GBDT. Metrik: IoU sel terbakar 24 jam, 123 kasus uji balik, vs persistensi (hanya sel awal yang dianggap terbakar).
  mesin_fisika luas 72 jam mesin fisika Simulasi (port simfisika.py, model_lain.sim). Metrik: galat luas |ln((1+prediksi)/(1+teramati))| vs persistensi (luas awal tetap).
  jejak_api    jejak 72 jam (jejak.py, dibaca src/ews.js). Mesin SAMA dengan model_sel, jadi bukti TIDAK LANGSUNG: IoU 72 jam kasus uji balik vs persistensi.
               Jejak memotong peluang sel >= 5%, uji balik memakai p >= tau: belum ada uji balik khusus jejak.
  lolos        peluang membesar >= 10 sel dalam 72 jam. Metrik: Brier skill terhadap laju dasar (klimatologi) pada uji balik historis tanpa bocoran
               (prospektif_historis.json, kelompok_tampil). Selang: TIDAK ADA di berkas itu (hanya agregat) -> boleh_tampil false "belum ada selang"
               sampai ada selang per titik. WAJIB juga vonis prospektif = "lolos" (prospektif.json, kriteria pra-registrasi 23 Okt 2026).

ATURAN (tetap, jangan dilonggarkan): boleh_tampil hanya bila selisih > 0 (positif = model lebih baik, metrik "rendah lebih baik" dibalik) DAN batas bawah selang
95% bootstrap berpasangan (atas kasus, 2000 ulangan, biji 7) > 0. Tanpa selang = false, alasan "belum ada selang".
Catatan jujur: persistensi diturunkan dari sel awal dan luas awal tiap kasus (sebaran_kasus.json: sel.awal, sel.obs per hari = sel BARU harian); rata-rata IoU
persistensinya cocok dengan ringkasan.iou_persistensi_* (dicek di uji). Pembanding "tanpa sel baru" tidak punya F1 sel baru yang bermakna, jadi F1 sel baru
tidak dipakai sebagai alasan menampilkan peta peluang; ia dilaporkan di rincian saja.

Pakai:  python3 scripts/sebaran/gerbang.py  (tulis public/data/gerbang_model.json)  |  ... uji   Stdlib saja.
Jalankan ulang setiap kali sebaran_kasus.json / model_sebaran.json / prospektif.json berubah (CI: sesudah prospektif.py di titik.yml, milik mekanik-mesin).
"""
import json, math, os, random, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "..", ".."))
PUBLIK = os.path.join(AKAR, "public", "data")
NAMA = "gerbang_model.json"
JALUR = os.path.join(PUBLIK, NAMA)
KUNCI = ("model_sel", "mesin_fisika", "jejak_api", "lolos")
HA_SEL = 375 * 375 / 1e4
HORIZON = (24, 48, 72)
BOOT_B, BOOT_BIJI = 2000, 7


# ---------------- pembaca gagal-tertutup (dipakai jejak.py; sisi JS: public/sebaran_model.js gerbangBoleh) ----------------
def boleh(kunci, jalur=JALUR):
    """(boleh_tampil, alasan). Berkas hilang/rusak, kunci tak ada, atau boleh_tampil bukan True persis = (False, alasan)."""
    try:
        d = json.load(open(jalur, encoding="utf-8"))
        g = d[kunci]
        b = g.get("boleh_tampil")
    except (OSError, ValueError, KeyError, AttributeError, TypeError) as e:
        return False, f"gerbang tidak terbaca ({type(e).__name__}): disembunyikan"
    if b is not True:
        return False, str(g.get("alasan") or "boleh_tampil bukan true")
    return True, str(g.get("alasan") or "")


# ---------------- statistik ----------------
def selang_berpasangan(selisih, b=BOOT_B, biji=BOOT_BIJI):
    """(rata-rata, bawah95, atas95) bootstrap persentil atas daftar selisih per kasus. None bila kosong."""
    s = [x for x in selisih if x is not None]
    if not s:
        return None
    rnd, m, v = random.Random(biji), len(s), []
    for _ in range(b):
        v.append(sum(s[rnd.randrange(m)] for _ in range(m)) / m)
    v.sort()
    return sum(s) / m, v[int(.025 * b)], v[int(.975 * b)]


def bss(p, y):
    n = len(y)
    r = sum(y) / n
    klim = r * (1 - r)
    return 1 - (sum((a - c) ** 2 for a, c in zip(p, y)) / n) / klim if klim > 0 else None


def selang_bss(p, y, b=BOOT_B, biji=BOOT_BIJI):
    rnd, n, v = random.Random(biji), len(y), []
    for _ in range(b):
        ix = [rnd.randrange(n) for _ in range(n)]
        t = bss([p[i] for i in ix], [y[i] for i in ix])
        if t is not None:
            v.append(t)
    v.sort()
    return bss(p, y), v[int(.025 * len(v))], v[int(.975 * len(v))]


def putusan(selisih, selang):
    """(boleh_tampil, alasan) menurut ATURAN di docstring."""
    if selisih is None or selisih <= 0:
        return False, f"selisih {selisih if selisih is None else round(selisih, 4)} <= 0: pembanding sederhana menang atau seri"
    if selang is None:
        return False, "belum ada selang"
    if selang[0] <= 0:
        return False, f"batas bawah selang 95% {round(selang[0], 4)} <= 0: belum terbukti mengalahkan pembanding"
    return True, f"selisih {round(selisih, 4)} > 0 dan batas bawah selang 95% {round(selang[0], 4)} > 0"


def r4(x):
    return None if x is None else round(x, 4)


def entri(metrik, arah, pembanding, model, pemb, sumber, catatan=None, rincian=None):
    """model, pemb = daftar skor per kasus (sejajar). arah 'tinggi' atau 'rendah' (lebih baik). selisih positif = model lebih baik."""
    n = len(model)
    tanda = 1 if arah == "tinggi" else -1
    d = [tanda * (a - c) for a, c in zip(model, pemb)]
    sl = selang_berpasangan(d)
    ok, alasan = putusan(sl[0] if sl else None, (sl[1], sl[2]) if sl else None)
    e = {"metrik": metrik, "arah": f"{arah} lebih baik", "pembanding": pembanding, "n": n, "skor_model": r4(sum(model) / n), "skor_pembanding": r4(sum(pemb) / n),
         "selisih": r4(sl[0]) if sl else None, "selang95": [r4(sl[1]), r4(sl[2])] if sl else None, "boleh_tampil": ok, "alasan": alasan, "sumber_berkas": sumber}
    if catatan:
        e["catatan"] = catatan
    if rincian:
        e["rincian"] = rincian
    return e


# ---------------- pembanding persistensi dari kasus uji balik ----------------
def persistensi(kasus):
    """Per kasus: n sel awal, jumlah sel terbakar kumulatif per horizon (awal + baru), IoU & luas persistensi (hanya sel awal)."""
    out = []
    for c in kasus:
        a = len(c["sel"]["awal"])
        kum, t = [], a
        for dh in c["sel"]["obs"]:
            t += len(dh)
            kum.append(t)
        out.append({"a": a, "obs_sel": kum, "iou": [a / k for k in kum], "luas": [a * HA_SEL] * 3, "obs_ha": [k * HA_SEL for k in kum]})
    return out


def galat_luas(pred_ha, obs_ha):
    return abs(math.log((1 + pred_ha) / (1 + obs_ha)))


def bangun(kasus_json, model_json, prosp_json, hist_json):
    K, M, PR, H = kasus_json["kasus"], model_json, prosp_json, hist_json
    P = persistensi(K)
    n = len(K)
    sumber_k = ["public/data/sebaran_kasus.json"]
    iou_m = [[c["iou"][h] for c in K] for h in range(3)]
    iou_p = [[q["iou"][h] for q in P] for h in range(3)]
    gl_m = [[galat_luas(c["pred_ha"][h][1], c["obs_ha"][h]) for c in K] for h in range(3)]
    gl_p = [[galat_luas(q["luas"][h], c["obs_ha"][h]) for c, q in zip(K, P)] for h in range(3)]

    def ril(model, pemb, arah):
        return {f"{h}j": {"model": r4(sum(m) / len(m)), "pembanding": r4(sum(p) / len(p)),
                          "selisih": r4(selang_berpasangan([(1 if arah == "tinggi" else -1) * (a - b) for a, b in zip(m, p)])[0]),
                          "selang95": [r4(x) for x in selang_berpasangan([(1 if arah == "tinggi" else -1) * (a - b) for a, b in zip(m, p)])[1:]]}
                for h, m, p in zip(HORIZON, model, pemb)}

    out = {"dibuat": time.strftime("%Y-%m-%d"), "versi": 1,
           "aturan": "boleh_tampil hanya bila selisih > 0 (model lebih baik dari pembanding sederhana) DAN batas bawah selang 95% bootstrap berpasangan > 0; tanpa selang = false "
                     "('belum ada selang'). lolos juga wajib vonis prospektif = 'lolos'. Pembaca gagal-tertutup: berkas hilang/rusak = sembunyikan.",
           "pembanding": "persistensi: hanya sel/luas awal kasus yang dianggap terbakar (tanpa sel baru); lolos: laju dasar himpunan yang sama (klimatologi)."}
    f1 = [c["f1"][0] for c in K]
    out["model_sel"] = entri(
        "IoU sel terbakar 24 jam (tiap kasus uji balik)", "tinggi", "persistensi (sel awal tetap)", iou_m[0], iou_p[0], sumber_k,
        catatan=f"{n} kasus, tiap kasus dari deteksi pertama, model tak pernah melihat tahun kasus, cuaca reanalisis (prakiraan sempurna, optimistis). F1 sel baru 24 jam model "
                f"{r4(sum(f1) / n)} tidak punya pembanding persistensi (persistensi tidak memprediksi sel baru), jadi tidak dipakai menghalalkan peta.",
        rincian={"iou": ril(iou_m, iou_p, "tinggi"), "galat_luas": ril(gl_m, gl_p, "rendah")})
    sim = [c["model_lain"]["sim"] for c in K]
    out["mesin_fisika"] = entri(
        "galat luas 72 jam |ln((1+prediksi)/(1+teramati))|", "rendah", "persistensi (luas awal tetap)", [galat_luas(s["ha72"], c["obs_ha"][2]) for s, c in zip(sim, K)], gl_p[2], sumber_k,
        catatan="mesin fisika = port Python simfisika.py (model_lain.sim, tanpa kalibrasi); mesin di layar Simulasi (index.html) memakai kalibrasi pertumbuhan teramati dan belum "
                "punya uji balik terpisah di berkas ini.",
        rincian={"iou": ril([[s["iou"][h] for s in sim] for h in range(3)], iou_p, "tinggi")})
    out["jejak_api"] = entri(
        "IoU sel terbakar 72 jam (bukti tidak langsung: mesin sama dengan model_sel)", "tinggi", "persistensi (sel awal tetap)", iou_m[2], iou_p[2], sumber_k,
        catatan="jejak_api.json dari jejak.py memakai model dan Monte Carlo yang sama; belum ada uji balik khusus jejak (ambang p >= 5%, kompleks aktif bukan titik baru).",
        rincian={"galat_luas_72j": ril(gl_m, gl_p, "rendah")["72j"]})
    # lolos
    kel = H.get("kelompok_tampil")
    Hk = ((H.get("mode") or {}).get("awal") or {}).get(kel) or {}
    kal = Hk.get("kalibrasi") or {}
    bs = kal.get("brier_skill")
    py = [c["p_lolos"] for c in K if c.get("p_lolos") is not None]
    yy = [1 if c["lepas"] else 0 for c in K if c.get("p_lolos") is not None]
    b123 = selang_bss(py, yy) if py and 0 < sum(yy) < len(yy) else None
    vonis = (PR or {}).get("vonis")
    ok, alasan = putusan(bs, None)
    if vonis != "lolos":
        ok, alasan = False, f"{alasan}; vonis prospektif = {vonis!r}, wajib 'lolos'"
    out["lolos"] = {
        "metrik": "Brier skill terhadap laju dasar (uji balik historis tanpa bocoran, kelompok " + str(kel) + ")", "arah": "tinggi lebih baik",
        "pembanding": "laju dasar himpunan yang sama (klimatologi, skill 0)", "n": kal.get("n"), "skor_model": r4(bs), "skor_pembanding": 0.0, "selisih": r4(bs),
        "selang95": None, "boleh_tampil": ok, "alasan": alasan, "vonis_prospektif": vonis,
        "sumber_berkas": ["public/data/prospektif_historis.json", "public/data/prospektif.json", "public/data/sebaran_kasus.json"],
        "catatan": "Selang per titik tidak tersedia di prospektif_historis.json (hanya agregat); sampai ada selang atau prospektif cukup data, peluang membesar tidak ditampilkan sebagai kemampuan teruji.",
        "rincian": {"historis": {"kelompok": kel, "dinilai": Hk.get("dinilai"), "lolos": Hk.get("lolos"), "brier_skill": bs, "ece": kal.get("ece"), "laju_dasar": kal.get("laju_dasar")},
                    "kasus_123": None if not b123 else {"brier_skill": r4(b123[0]), "selang95": [r4(b123[1]), r4(b123[2])], "n": len(py),
                                                        "catatan": "123 kasus dipilih dari api besar (laju lolos ~47%) sedangkan model dikalibrasi pada laju ~3%: populasi tidak sesuai, hanya sebagai peringatan"}}}
    return out


def main():
    def baca(n):
        try:
            return json.load(open(os.path.join(PUBLIK, n), encoding="utf-8"))
        except (OSError, ValueError):
            return {}
    K, M, PR, H = baca("sebaran_kasus.json"), baca("model_sebaran.json"), baca("prospektif.json"), baca("prospektif_historis.json")
    if not K.get("kasus"):
        sys.exit("sebaran_kasus.json tidak terbaca: gerbang tidak ditulis (pembaca akan menyembunyikan)")
    out = bangun(K, M, PR, H)
    tmp = JALUR + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    os.replace(tmp, JALUR)
    for k in KUNCI:
        print(f"{k:13s} boleh_tampil={out[k]['boleh_tampil']!s:5s} model={out[k]['skor_model']} pembanding={out[k]['skor_pembanding']} selisih={out[k]['selisih']} selang={out[k]['selang95']} | {out[k]['alasan']}")


def uji():
    # putusan: aturan tetap
    assert putusan(.1, (.02, .2))[0] is True
    assert putusan(.1, (-.01, .2)) [0] is False and putusan(.1, (0.0, .2))[0] is False
    assert putusan(-.1, (-.2, -.01))[0] is False and putusan(0.0, (0.0, 0.0))[0] is False and putusan(None, None)[0] is False
    assert putusan(.1, None) == (False, "belum ada selang")
    # bootstrap berpasangan: selalu menang -> selang di atas 0; seri/kalah -> tidak; deterministik
    rnd = random.Random(1)
    skor_p = [rnd.random() for _ in range(80)]
    menang = entri("m", "tinggi", "p", [x + .05 + rnd.random() * .02 for x in skor_p], skor_p, [])
    assert menang["boleh_tampil"] and menang["selang95"][0] > 0 and menang["selisih"] > 0, menang
    kalah = entri("m", "tinggi", "p", [x - .05 for x in skor_p], skor_p, [])
    assert not kalah["boleh_tampil"] and kalah["selisih"] < 0
    acak = entri("m", "tinggi", "p", [x + rnd.gauss(0, .3) for x in skor_p], skor_p, [])
    assert not acak["boleh_tampil"] and acak["selang95"][0] <= 0 <= acak["selang95"][1], acak       # selisih ~0 dengan noise: selang melewati 0
    rendah = entri("galat", "rendah", "p", [x - .2 for x in skor_p], skor_p, [])                       # galat lebih kecil = menang
    assert rendah["boleh_tampil"] and rendah["selisih"] > 0 and rendah["skor_model"] < rendah["skor_pembanding"], rendah
    assert entri("m", "tinggi", "p", [1.0, 2.0], [1.0, 2.0], [])["boleh_tampil"] is False              # seri
    assert selang_berpasangan([.1, .2, .3]) == selang_berpasangan([.1, .2, .3]) and selang_berpasangan([]) is None
    # persistensi dari kasus: 1 sel awal, sel baru harian 3/2/4 -> IoU 1/4, 1/6, 1/10
    kz = {"sel": {"awal": [7], "obs": [[1, 2, 3], [4, 5], [6, 8, 9, 10]]}}
    q = persistensi([kz])[0]
    assert [round(x, 4) for x in q["iou"]] == [.25, round(1 / 6, 4), .1] and q["obs_sel"] == [4, 6, 10] and abs(q["luas"][0] - HA_SEL) < 1e-9
    # bangun() sintetis: model kalah dari persistensi -> semua gagal; vonis prospektif menahan lolos meski BSS positif
    kasus = [{"sel": {"awal": [i], "obs": [[1], [2], [3]]}, "iou": [.3, .1, .05], "f1": [.4] * 3, "pred_ha": [[20, 30, 40]] * 3, "obs_ha": [28.1, 42.2, 56.2],
              "model_lain": {"sim": {"iou": [.1] * 3, "ha72": 5000}}, "p_lolos": .6 if i % 2 else .4, "lepas": i % 2} for i in range(30)]
    hist = {"kelompok_tampil": "2024-2026", "mode": {"awal": {"2024-2026": {"dinilai": 100, "lolos": 5, "kalibrasi": {"brier_skill": .36, "n": 100, "ece": .001, "laju_dasar": .05}}}}}
    g = bangun({"kasus": kasus}, {}, {"vonis": "lolos"}, hist)
    assert not g["model_sel"]["boleh_tampil"] and not g["mesin_fisika"]["boleh_tampil"] and not g["jejak_api"]["boleh_tampil"]
    assert g["lolos"]["boleh_tampil"] is False and g["lolos"]["alasan"] == "belum ada selang" and g["lolos"]["selang95"] is None
    g2 = bangun({"kasus": kasus}, {}, {"vonis": "belum_cukup_data"}, hist)
    assert g2["lolos"]["boleh_tampil"] is False and "belum_cukup_data" in g2["lolos"]["alasan"]
    assert all(k in g[x] for x in KUNCI for k in ("metrik", "skor_model", "skor_pembanding", "selisih", "selang95", "boleh_tampil", "alasan", "sumber_berkas"))
    # data nyata di repo: IoU persistensi cocok dengan ringkasan (membuktikan pembanding diturunkan benar) dan keluaran punya semua kunci
    jk = os.path.join(PUBLIK, "sebaran_kasus.json")
    if os.path.exists(jk):
        kj = json.load(open(jk))
        P = persistensi(kj["kasus"])
        for h, l in enumerate(("24", "48", "72")):
            m = sum(q["iou"][h] for q in P) / len(P)
            assert abs(m - kj["ringkasan"]["iou_persistensi_" + l][0]) < 2e-3, (l, m, kj["ringkasan"]["iou_persistensi_" + l])
        g3 = bangun(kj, {}, {}, {})
        assert set(KUNCI) <= set(g3) and g3["lolos"]["boleh_tampil"] is False
        assert abs(g3["model_sel"]["skor_model"] - kj["ringkasan"]["iou_24"][0]) < 2e-3
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main()
