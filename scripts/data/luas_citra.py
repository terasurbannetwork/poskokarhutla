"""Luas terbakar TERUKUR per insiden dari Sentinel-2 (dNBR), setelah api tak terdeteksi (Fase 3.5 RANCANGAN-API-PADAM.md) -> public/data/luas_citra.json

Insiden (insiden.json, status `tak_terdeteksi`) yang sudah >= N_HARI hari tak terdeteksi dan belum punya hasil dinilai: satu adegan Sentinel-2 L2A PRA (bersih, sebelum `awal`)
dan satu PASCA (bersih, sesudah `terakhir`) lewat Earth Search; NBR dibaca dengan pembaca COG citra.py dan penghitung piksel konsesi_citra_jelas.sampel (80 x 80 piksel per kotak,
awan/bayangan/air dibuang dan diperlebar 1 piksel). dNBR = NBR_pra - NBR_pasca; piksel terbakar bila dNBR > 0,27 (Key & Benson 2006) DAN NBR_pasca < 0,2 (aturan sama dengan
konsesi_citra_jelas.py; gambut terbakar tetap ber-NBR positif, jadi NBR mutlak saja tidak dipakai).
Hanya piksel dalam topeng insiden dihitung: di dalam cincin `garis` atau <= TOPENG_KM dari simpul garis / titik `api` / `pusat`, supaya api tetangga di kotak yang sama tidak ikut.
`luas_ha` = piksel terbakar valid x luas piksel, BATAS BAWAH karena piksel berawan tidak dihitung; `cakupan_pct` = porsi piksel topeng yang valid di kedua adegan. Cakupan < CAKUPAN_MIN: luas_ha = null.
dNBR 0,27 mengukur bekas bakar permukaan; bara gambut di bawah tanah tak selalu mengubah NBR. Terukur dari citra, bukan verifikasi lapangan.

Keluaran per id insiden: {luas_ha, dnbr_ambang, adegan_pra, adegan_pasca, tgl_pra, tgl_pasca, awan_pct (adegan pasca), cakupan_pct, piksel_ha, dihitung}.
Anggaran: MAKS_INSIDEN per jalan dan MAKS_DETIK; sisanya diteruskan jalan berikutnya (hasil tersimpan). Insiden yang tak ketemu adegan bersih dicoba lagi sampai
UMUR_MAKS hari sejak tak terdeteksi, lalu dicatat `luas_ha: null, alasan`.
Pakai:  python3 scripts/data/luas_citra.py         # sesudah insiden.py
        python3 scripts/data/luas_citra.py uji     # self-check (tanpa jaringan)
"""
import datetime as dt, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402

DATA = os.environ.get("LUAS_CITRA_DATA") or os.path.join(AKAR, "public/data")
N_HARI = 7             # tak terdeteksi minimal sekian hari sebelum dinilai (awan/asap menutup, bara bisa tampak lagi)
UMUR_MAKS = 14         # = insiden.SIMPAN_HARI: rekaman insiden hilang sesudahnya
MAKS_INSIDEN = int(os.environ.get("LUAS_CITRA_MAKS", 10))
MAKS_DETIK = int(os.environ.get("LUAS_CITRA_DETIK", 420))
DNBR = 0.27
NBR_PASCA_MAKS = 0.2
AWAN_PRA, AWAN_PASCA = 40, 30     # % awan kotak yang dianggap cukup bersih
CAKUPAN_MIN = 60                  # % piksel topeng valid agar luas dilaporkan
TOPENG_KM = 1.2
CARI_PRA_HARI, CARI_PASCA_HARI = 45, 25
KOTAK_MIN, KOTAK_MAKS = 4.0, 16.0
N = 80


# ---- murni (diuji) ----
def kotak_km(garis, api, pusat, luas_ha=None):
    """sisi kotak (km): rentang titik insiden x 1,4 + 2 km topeng, dibatasi KOTAK_MIN..KOTAK_MAKS. garis: [[lon,lat]...] per cincin, api: [[lon,lat]]."""
    pts = [p for g in (garis or []) for p in g] + list(api or []) + [[pusat[1], pusat[0]]]
    lat0 = pusat[0]
    w = (max(p[0] for p in pts) - min(p[0] for p in pts)) * 111.32 * math.cos(math.radians(lat0))
    h = (max(p[1] for p in pts) - min(p[1] for p in pts)) * 110.574
    return round(min(KOTAK_MAKS, max(KOTAK_MIN, max(w, h) * 1.4 + 2 * TOPENG_KM)), 2)


def pip(x, y, r):
    d, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            d = not d
        j = i
    return d


def topeng(lat, lon, km, garis, api, pusat, n=N):
    """list bool n*n (baris dari utara): piksel milik insiden. Piksel (y, x) berpusat di (utara km/2 - (y+.5)km/n, timur (x+.5)km/n - km/2) dari (lat, lon)."""
    kx = 111.32 * math.cos(math.radians(lat))
    ky = 110.574
    titik = [(p[1], p[0]) for g in (garis or []) for p in g] + [(p[1], p[0]) for p in (api or [])] + [tuple(pusat)]
    out = []
    for y in range(n):
        la = lat + (km / 2 - (y + .5) * km / n) / ky
        for x in range(n):
            lo = lon + ((x + .5) * km / n - km / 2) / kx
            ok = any(pip(lo, la, g) for g in (garis or []) if len(g) >= 3) or any(math.hypot((lo - b) * kx, (la - a) * ky) <= TOPENG_KM for a, b in titik)
            out.append(ok)
    return out


def luas(nbr_pra, nbr_pasca, mask, sisi_km, n=N):
    """-> (luas_ha, cakupan_pct, n_bakar). Piksel valid = topeng, NBR pra dan pasca tidak None."""
    ha = (sisi_km * 1000 / n) ** 2 / 1e4
    ada = [i for i, m in enumerate(mask) if m]
    sah = [i for i in ada if nbr_pra[i] is not None and nbr_pasca[i] is not None]
    nb = sum(1 for i in sah if nbr_pra[i] - nbr_pasca[i] > DNBR and nbr_pasca[i] < NBR_PASCA_MAKS)
    cak = 100 * len(sah) / len(ada) if ada else 0
    return (round(nb * ha, 1) if cak >= CAKUPAN_MIN else None), round(cak), nb


def pilih(adegan, awan_maks, pasca):
    """adegan: [(tgl 'YYYY-MM-DD', awan_pct, id)] -> yang dicoba berurutan. Pra: terbaru dulu (NBR paling dekat sebelum api). Pasca: terdahulu dulu (bekas bakar paling jelas, sebelum tumbuh lagi)."""
    return sorted([a for a in adegan if a[1] <= awan_maks], key=lambda a: a[0], reverse=not pasca)


def kandidat(ins, kini):
    """id insiden yang layak dinilai: tak_terdeteksi >= N_HARI dan <= UMUR_MAKS hari, punya awal dan terakhir."""
    out = []
    for i, r in ins.items():
        if not isinstance(r, dict) or r.get("status") != "tak_terdeteksi" or not r.get("tak_terdeteksi") or not r.get("awal") or not r.get("terakhir"):
            continue
        umur = (kini - dt.datetime.fromisoformat(r["tak_terdeteksi"].replace("Z", "+00:00"))).total_seconds() / 86400
        if N_HARI <= umur <= UMUR_MAKS + 1:
            out.append(i)
    return sorted(out, key=lambda i: ins[i]["tak_terdeteksi"])


# ---- jaringan ----
def adegan_antara(C, lat, lon, km, dari, sampai):
    q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, km), "limit": 60, "datetime": f"{dari}T00:00:00Z/{sampai}T23:59:59Z",
         "query": {"eo:cloud_cover": {"lt": 70}}, "sortby": [{"field": "properties.datetime", "direction": "asc"}]}
    ada, hasil = set(), []
    for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]:
        tgl = it["properties"]["datetime"][:10]
        if tgl not in ada:    # satu adegan per tanggal (tepi dua tile)
            ada.add(tgl)
            hasil.append((tgl, it["properties"].get("eo:cloud_cover", 100), it))
    return hasil


def baca_nbr(J, it, lat, lon, km, awan_maks):
    """-> (nbr, awan_pct) atau None bila terlalu berawan/kosong."""
    v = J.sampel(it, lat, lon, km)
    return (v[0], v[2]) if v and v[2] <= awan_maks else None


def nilai(J, C, r, kini, anggaran=None):
    """Satu insiden -> dict hasil atau {luas_ha: None, alasan} bila adegan bersih tak ada (dicoba lagi sampai UMUR_MAKS)."""
    lat, lon = r["pusat"]
    garis = [[(p[0], p[1]) for p in g] for g in r.get("garis") or []]
    km = kotak_km(r.get("garis"), r.get("api"), r["pusat"])
    awal = dt.datetime.fromisoformat(r["awal"].replace("Z", "+00:00")).date()
    akhir = dt.datetime.fromisoformat(r["terakhir"].replace("Z", "+00:00")).date()
    pra = pasca = None
    pra_l = adegan_antara(C, lat, lon, km, (awal - dt.timedelta(days=CARI_PRA_HARI)).isoformat(), (awal - dt.timedelta(days=1)).isoformat())
    for tgl, _, it in pilih(pra_l, 70, False)[:4]:
        if anggaran and anggaran():
            break
        b = baca_nbr(J, it, lat, lon, km, AWAN_PRA)
        if b:
            pra = (tgl, it["id"], b[0])
            break
    pasca_l = adegan_antara(C, lat, lon, km, (akhir + dt.timedelta(days=1)).isoformat(), min(kini.date(), akhir + dt.timedelta(days=CARI_PASCA_HARI)).isoformat())
    for tgl, _, it in pilih(pasca_l, 70, True)[:4]:
        if anggaran and anggaran():
            break
        b = baca_nbr(J, it, lat, lon, km, AWAN_PASCA)
        if b:
            pasca = (tgl, it["id"], b[0], b[1])
            break
    if not (pra and pasca):
        return {"luas_ha": None, "alasan": "tidak ada adegan %s bersih" % ("pra" if not pra else "pasca")}
    m = topeng(lat, lon, km, garis, [(a[0], a[1]) for a in r.get("api") or []], r["pusat"])
    ha, cak, nb = luas(pra[2], pasca[2], m, km)
    return {"luas_ha": ha, "dnbr_ambang": DNBR, "adegan_pra": pra[1], "adegan_pasca": pasca[1], "tgl_pra": pra[0], "tgl_pasca": pasca[0], "awan_pct": pasca[3],
            "cakupan_pct": cak, "piksel_ha": round((km * 1000 / N) ** 2 / 1e4, 2), "dihitung": kini.strftime("%Y-%m-%dT%H:%MZ"),
            **({} if ha is not None else {"alasan": "cakupan piksel bersih %d%% < %d%%" % (cak, CAKUPAN_MIN)})}


def main():
    kini = dt.datetime.now(dt.timezone.utc)
    try:
        ins = json.load(open(os.path.join(DATA, "insiden.json")))["insiden"]
    except (OSError, ValueError, KeyError):
        print("luas_citra: insiden.json tak ada atau rusak, dilewati")
        return
    jalur = os.path.join(DATA, "luas_citra.json")
    try:
        lama = json.load(open(jalur))
        lama = lama if isinstance(lama, dict) else {}
    except (OSError, ValueError):
        lama = {}
    hasil = {i: v for i, v in lama.items() if isinstance(v, dict) and (not v.get("dihitung") or (kini - dt.datetime.fromisoformat(v["dihitung"].replace("Z", "+00:00"))).days <= 120)}
    # sudah punya luas = selesai; luas null (tanpa adegan) dicoba lagi selama masih dalam UMUR_MAKS
    todo = [i for i in kandidat(ins, kini) if i not in hasil or hasil[i].get("luas_ha") is None and "pasca" in str(hasil[i].get("alasan", ""))]
    todo = todo[:MAKS_INSIDEN]
    if not todo:
        print("luas_citra: tidak ada insiden baru yang layak dinilai (%d tersimpan)" % len(hasil))
        json.dump(hasil, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
        return
    import citra as C, konsesi_citra_jelas as J  # noqa: E402  (impor lambat: berat dan perlu jaringan)
    t0 = time.time()
    habis = lambda: time.time() - t0 > MAKS_DETIK
    ok = dicoba = 0
    for i in todo:
        if habis():
            break
        dicoba += 1
        try:
            hasil[i] = nilai(J, C, ins[i], kini, habis)
            ok += hasil[i]["luas_ha"] is not None
        except Exception as e:     # satu insiden gagal tidak menjatuhkan yang lain
            print("luas_citra: %s gagal (%s)" % (i, e.__class__.__name__), file=sys.stderr)
    json.dump(hasil, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
    print("luas_citra: %d/%d kandidat dicoba, %d berluas, %d tersimpan, %.0f detik" % (dicoba, len(todo), ok, len(hasil), time.time() - t0))


def uji():
    n = 10
    # topeng: cincin kotak kecil di tengah + titik api di sudut; kotak 4 km, 10 x 10 piksel (400 m)
    garis = [[(112.0 - 0.009, -3.0 - 0.009), (112.0 + 0.009, -3.0 - 0.009), (112.0 + 0.009, -3.0 + 0.009), (112.0 - 0.009, -3.0 + 0.009), (112.0 - 0.009, -3.0 - 0.009)]]
    m = topeng(-3.0, 112.0, 8.0, garis, [], (-3.0, 112.0), n)
    assert sum(m) > 0 and m[5 * n + 5] and not m[0], sum(m)
    # tanpa cincin: lingkaran 1,2 km di sekitar pusat = ~ pi 1,44 / 0,16 = 28 piksel (4 km / 10 = 0,4 km)
    m2 = topeng(-3.0, 112.0, 4.0, [], [], (-3.0, 112.0), n)
    assert 20 <= sum(m2) <= 36 and m2[4 * n + 4], sum(m2)
    # luas: 4 piksel terbakar dari 36 piksel valid; piksel 0,16 km2 = 16 ha
    pra = [0.6] * (n * n)
    pasca = [0.6] * (n * n)
    idx = [i for i, v in enumerate(m2) if v]
    for i in idx[:4]:
        pasca[i] = 0.1                 # dNBR 0,5 > 0,27 dan NBR pasca < 0,2: terbakar
    pasca[idx[4]] = 0.45               # dNBR 0,15: tidak terbakar
    pasca[idx[5]] = 0.1; pra[idx[5]] = 0.3   # dNBR 0,2 < 0,27: tidak terbakar
    ha, cak, nb = luas(pra, pasca, m2, 4.0, n)
    assert (ha, cak, nb) == (64.0, 100, 4), (ha, cak, nb)
    # awan: separuh topeng tertutup -> cakupan 50% < 60%: luas null
    pasca2 = list(pasca)
    for i in idx[: len(idx) // 2 + 1]:
        pasca2[i] = None
    ha2, cak2, _ = luas(pra, pasca2, m2, 4.0, n)
    assert ha2 is None and cak2 < CAKUPAN_MIN, (ha2, cak2)
    assert luas(pra, pasca, [False] * (n * n), 4.0, n) == (None, 0, 0)
    # kotak: titik tunggal = KOTAK_MIN; sebaran 20 km dibatasi KOTAK_MAKS
    assert kotak_km([], [], (-3.0, 112.0)) == KOTAK_MIN
    assert kotak_km([[[112.0, -3.0], [112.2, -3.1]]], [], (-3.0, 112.0)) == KOTAK_MAKS
    # pilih: pra terbaru dulu, pasca terdahulu dulu, awan berlebih dibuang
    L = [("2026-09-01", 10, "a"), ("2026-09-06", 50, "b"), ("2026-09-11", 20, "c")]
    assert [a[2] for a in pilih(L, 40, False)] == ["c", "a"] and [a[2] for a in pilih(L, 40, True)] == ["a", "c"]
    # kandidat: 7..15 hari
    kini = dt.datetime(2026, 10, 22, tzinfo=dt.timezone.utc)
    ins = {"a": {"status": "tak_terdeteksi", "tak_terdeteksi": "2026-10-10T00:00Z", "awal": "2026-10-01T00:00Z", "terakhir": "2026-10-09T00:00Z"},
           "b": {"status": "tak_terdeteksi", "tak_terdeteksi": "2026-10-20T00:00Z", "awal": "x", "terakhir": "y"},
           "c": {"status": "aktif"}, "d": {"status": "tak_terdeteksi", "tak_terdeteksi": "2026-09-01T00:00Z", "awal": "x", "terakhir": "y"}}
    assert kandidat(ins, kini) == ["a"], kandidat(ins, kini)
    print("luas_citra uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
