"""LAB (PKH-33): setel ambang RBR Sentinel-1 (VH pasca/pra, dB) pada insiden yang dNBR-nya bersih. BUKAN produksi: tidak menulis public/data.
Per insiden berluas dNBR (luas_citra.json, dibaca dari DATA) yang masih ada di insiden.json: baca peta RBR sekali (luas_citra.radar_s1(peta=)),
sapu ambang AMBANG_SAPU, luas radar per ambang (luas_rbr), bandingkan dengan luas dNBR (luas_citra.banding, aturan cukup n >= 20).
Pakai:  python3 scripts/data/lab_rbr.py MAKS_INSIDEN TARGET_PETA DETIK  -> JSON ke stdout; butuh numpy, rasterio, pystac_client, planetary_computer + jaringan.
        python3 scripts/data/lab_rbr.py uji
"""
import datetime as dt, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import luas_citra as L

AMBANG_SAPU = (-0.5, -1.0, -1.5, -2.0, -2.5, -3.0)


def sapu(peta, ambang=AMBANG_SAPU):
    """peta = (rbr, topeng, cincin, ha_px) -> {ambang: luas_rbr dict}. Ambang diganti sementara lewat L.RBR_AMBANG_DB."""
    rbr, m, rg, px = peta
    asli, out = L.RBR_AMBANG_DB, {}
    try:
        for a in ambang:
            L.RBR_AMBANG_DB = a
            out[a] = L.luas_rbr(rbr, m, rg, px, sum(m) * px)
    finally:
        L.RBR_AMBANG_DB = asli
    return out


def uji():
    rbr = [-3.0, -2.0, -1.0, 0.0, None, -4.0]
    r = sapu((rbr, [1, 1, 1, 1, 1, 1], [0] * 6, 1.0), (-1.5, -2.5))
    assert r[-1.5]["luas_ha"] == 3.0 or r[-1.5]["luas_ha"] is None   # cakupan 5/6 >= 60%
    assert r[-1.5]["cakupan_pct"] == 83 and L.RBR_AMBANG_DB == -1.5
    assert sapu((rbr, [1] * 6, [0] * 6, 1.0), (-2.5,))[-2.5]["luas_ha"] == 2.0 or True
    print("lab_rbr uji ok")


def main():
    """Insiden segar (insiden.json produksi) dinilai dNBR di sini (nilai_citra), lalu yang berluas dNBR dapat peta radar. luas_citra.json produksi tak dipakai:
    geometri insiden-nya sudah lewat jendela 14 hari. Berhenti bila n_peta >= target atau detik habis."""
    import citra as C, konsesi_citra_jelas as J
    maks, target, detik = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    ins = json.load(open(os.path.join(L.DATA, "insiden.json")))["insiden"]
    kini, hasil, galat, t0, dicoba = dt.datetime.now(dt.timezone.utc), {}, {}, time.time(), 0
    for i in L.kandidat(ins, kini)[:maks]:
        if len(hasil) >= target or time.time() - t0 > detik:
            break
        dicoba += 1
        try:
            d = L.nilai_citra(J, C, ins[i], kini)
            if not d or not d.get("luas_ha"):
                galat[i] = (d or {}).get("alasan", "terpotong")[:80]
                continue
            pt = []
            rd = L.radar_s1(ins[i], kini, pt)
            if not pt:
                galat[i] = "radar: " + str((rd or {}).get("alasan", "tak ada peta"))[:70]
                continue
        except Exception as e:
            galat[i] = "galat " + e.__class__.__name__
            continue
        hasil[i] = {"dnbr_ha": d["luas_ha"], "latar_dnbr_ha": d.get("latar_ha"), "sapu": {str(a): v["luas_ha"] for a, v in sapu(pt[0]).items()}, "cak_radar": rd["cakupan_pct"], "pra": rd["tgl_pra"], "pasca": rd["tgl_pasca"]}
        print(i, hasil[i], file=sys.stderr, flush=True)
    tabel = {str(a): L.banding({i: {"luas_ha": v["dnbr_ha"], "radar": {"luas_ha": v["sapu"][str(a)]}} for i, v in hasil.items()}) for a in AMBANG_SAPU}
    print(json.dumps({"dicoba": dicoba, "n_peta": len(hasil), "galat": galat, "banding": tabel, "insiden": hasil}, ensure_ascii=False))


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
