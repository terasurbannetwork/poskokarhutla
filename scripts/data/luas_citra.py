"""PERKIRAAN luas terbakar dari citra per insiden dari Sentinel-2 (dNBR), setelah api tak terdeteksi (Fase 3.5 RANCANGAN-API-PADAM.md) -> public/data/luas_citra.json

Insiden (insiden.json, status `tak_terdeteksi`) yang sudah >= N_HARI hari tak terdeteksi dan belum punya hasil dinilai: satu adegan Sentinel-2 L2A PRA (bersih, sebelum `awal`)
dan satu PASCA (bersih, sesudah `terakhir`) lewat Earth Search; NBR dibaca dengan pembaca COG citra.py dan penghitung piksel konsesi_citra_jelas.sampel (80 x 80 piksel per kotak,
awan/bayangan/air dibuang dan diperlebar 1 piksel). dNBR = NBR_pra - NBR_pasca; piksel terbakar bila dNBR > 0,27 (Key & Benson 2006) DAN NBR_pasca < 0,2 (aturan sama dengan
konsesi_citra_jelas.py; gambut terbakar tetap ber-NBR positif, jadi NBR mutlak saja tidak dipakai).
Hanya piksel dalam topeng insiden dihitung: di dalam cincin `garis` atau <= TOPENG_KM dari simpul garis / titik `api` / `pusat`, supaya api tetangga di kotak yang sama tidak ikut.
`luas_ha` = piksel terbakar valid x luas piksel, BATAS BAWAH karena piksel berawan tidak dihitung; `cakupan_pct` = porsi piksel topeng yang valid di kedua adegan. Cakupan < CAKUPAN_MIN
pada satu adegan pasca: dicoba adegan pasca lain (sampai 4); tetap rendah: luas_ha = null. `rentang_ha` = [terbakar - akar(terbakar), (terbakar + akar(terbakar)) / cakupan] x luas piksel
(ketidakpastian cacah piksel, kasar; BUKAN galat klasifikasi dNBR).
KONTROL LATAR: aturan dNBR yang sama dijalankan pada cincin 2 sampai 4 km dari titik/simpul insiden (kotak lebih besar, KOTAK_LATAR_MAKS, piksel kasar), dinormalkan ke luas topeng insiden:
`latar_ha` = luas "terbakar" yang akan tampak pada lahan sekitar karena musim/fenologi/awan tipis. luas_ha < 2 x latar_ha -> `luas_ha: null, luas_mentah_ha, alasan` (sinyal tak dibedakan dari latar).
Ring kurang valid (< LATAR_CAKUPAN_MIN %): latar_ha null, luas tetap dilaporkan dengan `tanpa_kontrol: true`.
dNBR 0,27 mengukur bekas bakar permukaan; bara gambut di bawah tanah tak selalu mengubah NBR. PERKIRAAN CITRA, bukan hasil ukur dan bukan verifikasi lapangan; kata "terukur" baru boleh dipakai
setelah dibandingkan dengan luas_lapangan_ha pada >= 20 insiden (aturan ini juga ditulis di `_catatan` berkas keluaran).

Keluaran per id insiden: {luas_ha, rentang_ha, latar_ha, dnbr_ambang, adegan_pra, adegan_pasca, tgl_pra, tgl_pasca, awan_pct (adegan pasca), cakupan_pct, piksel_ha, dihitung, status_nilai}. Kunci "_catatan" bukan insiden.
Anggaran: MAKS_INSIDEN per jalan dan MAKS_DETIK; insiden yang terpotong anggaran/galat jaringan TIDAK disimpan (dicoba lagi jalan berikut). Insiden tanpa adegan pasca bersih dicoba lagi
sampai UMUR_MAKS hari sejak tak terdeteksi; tanpa adegan pra bersih (pencarian lengkap) disimpan tetap.
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
RING_KM = (2.0, 4.0)              # cincin kontrol latar: jarak dari titik/simpul insiden
KOTAK_LATAR_MAKS = 30.0
LATAR_CAKUPAN_MIN = 30            # % piksel cincin valid agar latar dipakai
LATAR_RASIO = 2.0                 # luas_ha harus >= sekian x latar_ha
UJI_MIN_BANDING = 20              # insiden pembanding luas_lapangan_ha sebelum kata "terukur"
CATATAN = ("Semua luas_ha di berkas ini PERKIRAAN CITRA (dNBR Sentinel-2), bukan hasil ukur. Kata 'terukur' baru boleh dipakai setelah dibandingkan dengan luas_lapangan_ha pada >= %d insiden "
           "(selisih median dan sebaran dilaporkan). luas_ha null bila < %.0f x latar_ha (cincin kontrol 2-4 km) atau cakupan piksel < %d%%. rentang_ha = ketidakpastian cacah piksel saja."
           % (UJI_MIN_BANDING, LATAR_RASIO, CAKUPAN_MIN))
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


def rentang(nb, ha_px, cak_pct):
    """[bawah, atas] ha: cacah terbakar +- akar(cacah); atas diekstrapolasi ke piksel yang tak valid (cak_pct < 100)."""
    if not cak_pct:
        return None
    r = math.sqrt(nb)
    return [round(max(0, nb - r) * ha_px, 1), round((nb + r) / (cak_pct / 100) * ha_px, 1)]


def cincin(lat, lon, km, garis, api, pusat, n=N):
    """list bool n*n: piksel 2..4 km dari titik/simpul insiden dan di luar cincin `garis`. Geometri piksel sama dengan topeng()."""
    kx, ky = 111.32 * math.cos(math.radians(lat)), 110.574
    titik = [(p[1], p[0]) for g in (garis or []) for p in g] + [(p[1], p[0]) for p in (api or [])] + [tuple(pusat)]
    out = []
    for y in range(n):
        la = lat + (km / 2 - (y + .5) * km / n) / ky
        for x in range(n):
            lo = lon + ((x + .5) * km / n - km / 2) / kx
            d = min(math.hypot((lo - b) * kx, (la - a) * ky) for a, b in titik)
            out.append(RING_KM[0] <= d <= RING_KM[1] and not any(pip(lo, la, g) for g in (garis or []) if len(g) >= 3))
    return out


def latar(nbr_pra, nbr_pasca, ring, luas_topeng_ha, n=N):
    """-> latar_ha (luas 'terbakar' yang akan tampak pada lahan seluas topeng insiden) atau None bila cincin kurang valid."""
    sah = [i for i, m in enumerate(ring) if m and nbr_pra[i] is not None and nbr_pasca[i] is not None]
    ada = sum(ring)
    if not ada or 100 * len(sah) / ada < LATAR_CAKUPAN_MIN or not sah:
        return None
    nb = sum(1 for i in sah if nbr_pra[i] - nbr_pasca[i] > DNBR and nbr_pasca[i] < NBR_PASCA_MAKS)
    return round(nb / len(sah) * luas_topeng_ha, 1)


def timbang(ha, lat_ha):
    """-> (luas_ha, lemah). Sinyal di bawah LATAR_RASIO x latar tak dibedakan dari latar -> luas null."""
    if ha is None or lat_ha is None or ha == 0 or ha >= LATAR_RASIO * lat_ha:
        return ha, False
    return None, True


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
    """Satu insiden -> dict hasil, atau None bila terpotong anggaran/galat jaringan (JANGAN disimpan: dicoba lagi).
    {luas_ha: None, alasan} bila adegan bersih tak ada atau sinyal tak melewati latar."""
    lat, lon = r["pusat"]
    garis = [[(p[0], p[1]) for p in g] for g in r.get("garis") or []]
    api = [(a[0], a[1]) for a in r.get("api") or []]
    km = kotak_km(r.get("garis"), r.get("api"), r["pusat"])
    awal = dt.datetime.fromisoformat(r["awal"].replace("Z", "+00:00")).date()
    akhir = dt.datetime.fromisoformat(r["terakhir"].replace("Z", "+00:00")).date()
    habis = lambda: bool(anggaran and anggaran())
    pra = None
    try:
        pra_l = adegan_antara(C, lat, lon, km, (awal - dt.timedelta(days=CARI_PRA_HARI)).isoformat(), (awal - dt.timedelta(days=1)).isoformat())
        for tgl, _, it in pilih(pra_l, 70, False)[:4]:
            if habis():
                return None
            b = baca_nbr(J, it, lat, lon, km, AWAN_PRA)
            if b:
                pra = (tgl, it, b[0])
                break
        if not pra:
            return {"luas_ha": None, "alasan": "tidak ada adegan pra bersih (<= %d%% awan) dalam %d hari sebelum awal" % (AWAN_PRA, CARI_PRA_HARI)}
        pasca_l = adegan_antara(C, lat, lon, km, (akhir + dt.timedelta(days=1)).isoformat(), min(kini.date(), akhir + dt.timedelta(days=CARI_PASCA_HARI)).isoformat())
        m = topeng(lat, lon, km, garis, api, r["pusat"])
        terbaik = None                      # (cakupan, tgl, item, nbr, awan, ha, nb)
        for tgl, _, it in pilih(pasca_l, 70, True)[:4]:
            if habis():
                return None
            b = baca_nbr(J, it, lat, lon, km, AWAN_PASCA)
            if not b:
                continue
            ha, cak, nb = luas(pra[2], b[0], m, km)
            if not terbaik or cak > terbaik[0]:
                terbaik = (cak, tgl, it, b[0], b[1], ha, nb)
            if ha is not None:              # cakupan cukup; kalau kurang, coba adegan pasca berikut
                break
        if not terbaik:
            return {"luas_ha": None, "alasan": "tidak ada adegan pasca bersih (<= %d%% awan) %d hari sesudah terakhir; dicoba lagi sampai insiden kedaluwarsa" % (AWAN_PASCA, CARI_PASCA_HARI)}
        cak, tgl, it, nbr_pasca, awan, ha, nb = terbaik
        px = (km * 1000 / N) ** 2 / 1e4
        out = {"adegan_pra": pra[1]["id"], "adegan_pasca": it["id"], "tgl_pra": pra[0], "tgl_pasca": tgl, "dnbr_ambang": DNBR, "awan_pct": awan, "cakupan_pct": cak, "piksel_ha": round(px, 2),
               "dihitung": kini.strftime("%Y-%m-%dT%H:%MZ"), "status_nilai": "perkiraan_citra"}
        if ha is None:
            return {"luas_ha": None, **out, "alasan": "cakupan piksel bersih %d%% < %d%% pada adegan pasca terbaik" % (cak, CAKUPAN_MIN)}
        # kontrol latar: aturan sama pada cincin 2-4 km (kotak lebih besar, piksel kasar), dinormalkan ke luas topeng
        lat_ha = None
        kb = round(min(KOTAK_LATAR_MAKS, km + 2 * RING_KM[1]), 2)
        if habis():
            return None
        vp, vs = J.sampel(pra[1], lat, lon, kb), J.sampel(it, lat, lon, kb)
        if vp and vs:
            lat_ha = latar(vp[0], vs[0], cincin(lat, lon, kb, garis, api, r["pusat"]), sum(m) * px)
        ha_f, lemah = timbang(ha, lat_ha)
        out.update({"luas_ha": ha_f, "rentang_ha": rentang(nb, px, cak), "latar_ha": lat_ha})
        if lemah:
            out.update({"luas_mentah_ha": ha, "alasan": "luas %.1f ha < %.0f x latar %.1f ha (cincin 2-4 km): tak dibedakan dari latar" % (ha, LATAR_RASIO, lat_ha)})
        elif lat_ha is None:
            out["tanpa_kontrol"] = True
        return out
    except (OSError, TimeoutError):          # waktu habis / jaringan: bukan hasil, jangan disimpan
        return None


def simpan(hasil, jalur):
    json.dump({"_catatan": CATATAN, **hasil}, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))


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
    hasil = {i: v for i, v in lama.items() if i != "_catatan" and isinstance(v, dict) and (not v.get("dihitung") or (kini - dt.datetime.fromisoformat(v["dihitung"].replace("Z", "+00:00"))).days <= 120)}
    # sudah punya hasil = selesai; hanya "tidak ada adegan pasca bersih" dicoba lagi selama masih dalam UMUR_MAKS (adegan baru datang tiap ~5 hari)
    todo = [i for i in kandidat(ins, kini) if i not in hasil or hasil[i].get("luas_ha") is None and "adegan pasca" in str(hasil[i].get("alasan", ""))]
    todo = todo[:MAKS_INSIDEN]
    if not todo:
        print("luas_citra: tidak ada insiden baru yang layak dinilai (%d tersimpan)" % len(hasil))
        simpan(hasil, jalur)
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
            h = nilai(J, C, ins[i], kini, habis)
            if h is None:
                print("luas_citra: %s terpotong anggaran/waktu habis, dicoba lagi jalan berikut" % i)
                continue
            hasil[i] = h
            ok += h["luas_ha"] is not None
        except Exception as e:     # satu insiden gagal tidak menjatuhkan yang lain
            print("luas_citra: %s gagal (%s)" % (i, e.__class__.__name__), file=sys.stderr)
    simpan(hasil, jalur)
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
    # 3a: kontrol latar. cincin 2-4 km di luar topeng; latar dinormalkan ke luas topeng
    kb, nb_ = 20.0, 80
    rg = cincin(-3.0, 112.0, kb, [], [], (-3.0, 112.0), nb_)
    assert sum(rg) > 0 and not rg[40 * nb_ + 40] and not rg[0], sum(rg)
    sat = [0.6] * (nb_ * nb_)
    assert latar(sat, sat, rg, 100.0, nb_) == 0.0
    pas = [0.1 if x else 0.6 for x in rg]               # seluruh cincin 'terbakar' -> latar = seluruh luas topeng
    assert latar(sat, pas, rg, 100.0, nb_) == 100.0
    assert latar(sat, [None] * (nb_ * nb_), rg, 100.0, nb_) is None           # cincin tak valid -> tanpa latar
    assert timbang(150.0, 80.0) == (None, True) and timbang(160.0, 80.0) == (160.0, False) and timbang(50.0, None) == (50.0, False) and timbang(0.0, 5.0) == (0.0, False)
    # 3c: rentang
    assert rentang(100, 16.0, 100) == [1440.0, 1760.0] and rentang(0, 16.0, 100) == [0.0, 0.0] and rentang(4, 16.0, 50) == [32.0, 192.0] and rentang(4, 16.0, 0) is None
    # 3b/3c: nilai() dengan J/C palsu. anggaran habis -> None (tak disimpan); pasca pertama berawan cakupan rendah -> adegan kedua dipakai; waktu habis -> None
    class FC:
        STAC = "x"
        @staticmethod
        def kotak(lat, lon, km): return [0, 0, 1, 1]
        @staticmethod
        def ambil(u, data=None):
            q = json.loads(data)["datetime"][:10]
            sebelum = q < "2026-10-02"
            it = [{"id": "p1", "properties": {"datetime": "2026-09-20T00:00:00Z", "eo:cloud_cover": 5}}] if sebelum else \
                 [{"id": "a1", "properties": {"datetime": "2026-10-11T00:00:00Z", "eo:cloud_cover": 5}}, {"id": "a2", "properties": {"datetime": "2026-10-16T00:00:00Z", "eo:cloud_cover": 5}}]
            return json.dumps({"features": it})
    class FJ:
        mode = "ok"
        @staticmethod
        def sampel(it, lat, lon, km):
            if FJ.mode == "waktu": raise TimeoutError()
            nn = N * N
            if it["id"] == "p1": return ([0.6] * nn, [], 5, 0, 0)
            if it["id"] == "a1": return ([None] * (nn - 10) + [0.1] * 10, [], 5, 0, 0)    # cakupan ~0
            return ([0.1 if km < 10 else 0.6] * nn, [], 5, 0, 0)                          # a2: seluruh topeng 'terbakar'; kotak latar bersih
    r = {"pusat": [-3.0, 112.0], "api": [[112.0, -3.0]], "awal": "2026-10-02T00:00Z", "terakhir": "2026-10-09T00:00Z"}
    o = nilai(FJ, FC, r, kini)
    assert o["adegan_pasca"] == "a2" and o["luas_ha"] and o["latar_ha"] == 0.0 and o["rentang_ha"][0] < o["luas_ha"] < o["rentang_ha"][1] and o["status_nilai"] == "perkiraan_citra", o
    assert nilai(FJ, FC, r, kini, anggaran=lambda: True) is None                  # 3b: anggaran habis di tengah = tidak disimpan
    FJ.mode = "waktu"
    assert nilai(FJ, FC, r, kini) is None                                         # 3b: waktu habis = tidak disimpan
    class FC2(FC):
        @staticmethod
        def ambil(u, data=None): return json.dumps({"features": []})
    FJ.mode = "ok"
    o2 = nilai(FJ, FC2, r, kini)
    assert o2["luas_ha"] is None and "pra" in o2["alasan"] and "anggaran" not in o2["alasan"], o2
    # latar tinggi -> luas dinullkan dengan luas_mentah_ha
    class FJ2(FJ):
        @staticmethod
        def sampel(it, lat, lon, km):
            nn = N * N
            return ([0.6] * nn, [], 5, 0, 0) if it["id"] == "p1" else ([0.1] * nn, [], 5, 0, 0)    # latar sama 'terbakar' dengan topeng
    o3 = nilai(FJ2, FC, r, kini)
    assert o3["luas_ha"] is None and o3["luas_mentah_ha"] > 0 and "latar" in o3["alasan"], o3
    assert "perkiraan" in CATATAN.lower() and "20" in CATATAN and "terukur" in CATATAN
    print("luas_citra uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
