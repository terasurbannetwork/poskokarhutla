"""Prioritas pembasahan per Kesatuan Hidrologis Gambut (KHG) -> public/data/khg_prioritas.json

Terinspirasi paparan Rakor BNPB Kalteng 19 Okt 2026. Per KHG dihitung berapa titik panas yang jatuh DI DALAM poligonnya
(titik 7 hari, 30 hari, musim berjalan), berapa kompleks api aktif, panjang kanal OSM, dan kab/kota yang dilintasi.
Hanya KHG dengan titik musim > 0 yang terbit, urut titik 7 hari lalu titik musim.

Poligon: public/data/lahan/khg.geojson (BRGM PRIMS, scripts/scrape/khg.py). Lisensi PRIMS melarang mengubah isi poligon;
di sini poligon hanya dibaca untuk menghitung titik di dalamnya (point-in-polygon), tidak ditulis ulang.

Titik panas (sama dengan angka utama, titik_unik.py: lokasi unik ~375 m per hari kalender WIB dari M, N, N20, N21, keyakinan sedang/tinggi
saja (kolom "hitung" hotspot.json), titik palsu industri sudah dibuang):
  7 hari    = semua baris public/data/hotspot.json (jendela 7 x 24 jam dari `acuan`)
  30 hari / musim = penghitung harian per KHG di public/data/khg_hari.json ({tanggal WIB: {kode KHG: n}}), dibawa antar-jalan
  lewat cache public/data (seperti harian30.json). Hari yang tertutup jendela 7 hari ditimpa dari hotspot.json; hari yang lebih tua
  diisi mundur dari FIRMS area API (maks MAKS_REQ permintaan per jalan, mulai 1 Januari) sehingga musim terkejar dalam beberapa jalan.
  `musim_lengkap` false = masih ada hari sejak 1 Januari yang belum terisi (angka musim batas bawah).

S-NPP berhenti (FS.SNPP_AKHIR, 1 Nov 2026 13:00 UTC): isi_mundur tidak lagi meminta VIIRS_SNPP_NRT dan tidak menuntutnya (firms_sumber.wajib); hotspot.json (7 hari)
tetap memuat deteksi S-NPP lama yang masih di jendela (harian.snpp_warisan), jadi hari-hari itu tidak bolong. Galat isi mundur apa pun = dilewati (main), bukan fatal.

Pakai:  python3 scripts/data/khg_prioritas.py        # tulis khg_prioritas.json (butuh hotspot.json, operasi.json; FIRMS_MAP_KEY untuk isi mundur)
        python3 scripts/data/khg_prioritas.py --uji  # self-check tanpa jaringan
"""
import csv, datetime as dt, io, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
import firms_sumber as FS  # noqa: E402
from firms_sumber import FAMILI, csv_sah, kelas_yakin, muat_ketersediaan, nasional_harian, penuh, sumber_hari, unduh  # noqa: E402
from wilayah import AKAR, PROVINSI, Poligon, Wilayah, _cincin, _di_dalam  # noqa: E402
import titik_unik as TU  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
MAKS_REQ = int(os.environ.get("KHG_MAKS_REQ", 45))       # permintaan FIRMS per jalan untuk isi mundur (3 sensor x 5 hari = 3 permintaan -> ~75 hari per jalan)
LANGKAH_KAB = 0.04  # derajat (~4,4 km): jarak contoh untuk mencari kab/kota yang dilintasi KHG
KAB_MAKS = 6


def tgl_dari_hotspot(h, tgl):
    """'MM-DD' + acuan -> 'YYYY-MM-DD' (tahun acuan WIB; mundur setahun bila melampaui tanggal acuan)."""
    a = dt.datetime.fromisoformat(h["acuan"]).astimezone(WIB).date()
    m, d = int(tgl[:2]), int(tgl[3:])
    y = a.year - 1 if (m, d) > (a.month, a.day) else a.year
    return f"{y}-{m:02d}-{d:02d}"


def hitung_titik(baris, cari, kolom):
    """-> (n_total_per_kode, {tanggal_kolom: {kode: n}}) untuk baris yang jatuh di dalam KHG. cari(lon, lat) -> kode|None."""
    total, per_hari = {}, {}
    for b in baris:
        k = cari(b[1], b[0])
        if not k:
            continue
        total[k] = total.get(k, 0) + 1
        t = kolom(b)
        per_hari.setdefault(t, {})[k] = per_hari.setdefault(t, {}).get(k, 0) + 1
    return total, per_hari


def perbarui_hari(hari, baru, batas_lengkap, akhir):
    """Tanggal batas_lengkap..akhir (akhir = tanggal WIB `acuan` hotspot) ditimpa dari hitungan baru (nol ikut tercatat);
    hari lain, termasuk SESUDAH akhir, dibiarkan (hotspot tidak tahu apa-apa tentangnya; itu urusan isi_mundur)."""
    out = dict(hari)
    d, a = dt.date.fromisoformat(batas_lengkap), dt.date.fromisoformat(akhir)
    while d <= a:
        out[d.isoformat()] = baru.get(d.isoformat(), {})
        d += dt.timedelta(days=1)
    return out


VERSI_HARI = 4     # v1 memilih SP/NRT dari umur hari: SP VIIRS berakhir 30 Jun 2026, jadi Jul-Agu hanya terisi MODIS atau kosong; v3 (25 Okt 2026): hanya keyakinan sedang/tinggi; v4 (25 Okt 2026): lokasi unik 4 satelit; semua hari diisi ulang
FAM4 = FAMILI + ("VIIRS_NOAA21",)
MIGRASI_DARI = "2000-01-01"   # hari >= ini dibuang saat versi berkas lama < VERSI_HARI (kini semua hari)
KEYAKINAN_MIN = TU.KEYAKINAN_MIN   # satu sumber: titik_unik.py
CURIGA_NAS = 300   # hari KHG kosong tetapi titik nasional (musim_harian.json) >= ini dianggap unduhan gagal, bukan nol sungguhan


def curiga(hari, awal, hari_ini, nasional, parsial=()):
    """Tanggal WIB awal..hari_ini-1 yang belum boleh dianggap selesai: belum ada, parsial, atau kosong padahal nasional >= CURIGA_NAS."""
    out, d, h0 = [], dt.date.fromisoformat(awal), dt.date.fromisoformat(hari_ini)
    while d < h0:
        t = d.isoformat()
        if t not in hari or t in parsial or (not hari[t] and nasional.get(t, 0) >= CURIGA_NAS):
            out.append(d)
        d += dt.timedelta(days=1)
    return out


def isi_mundur(hari, perlu, kunci, ambil, bbox, cari, saring=None, maks_req=MAKS_REQ, parsial=None, ket=None):
    """Isi tanggal WIB `perlu` (list date) dari FIRMS (tanggal WIB D = UTC D-1 17:00 .. D 17:00, jadi butuh hari UTC D-1 dan D).
    Sumber per hari dipilih dari ketersediaan FIRMS; balasan bukan CSV = blok gagal. Hari baru ditandai selesai bila SEMUA famili
    sensor sukses untuk hari UTC D-1 dan D."""
    if not perlu:
        return 0
    ket = ket or muat_ketersediaan(kunci, ambil, FAM4)
    sasaran = sorted(perlu)[:(maks_req // len(FAM4)) * 5 - 1]
    baris, ok = unduh(sasaran[0] - dt.timedelta(days=1), sasaran[-1], kunci, ambil, bbox, ket, famili=FAM4)
    lihat, hitung = set(), {}
    for src, r in baris:
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
        lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
        if (lat, lon, t, src) in lihat:
            continue
        lihat.add((lat, lon, t, src))
        if saring and saring(lat, lon):
            continue
        if kelas_yakin(r.get("confidence", ""), src.startswith("MODIS")) < KEYAKINAN_MIN:
            continue   # di bawah ambang titik_unik.py
        tg = t.astimezone(WIB).date().isoformat()
        if (tg, TU.sel(lat, lon)) in lihat:
            continue   # lokasi yang sama hari itu sudah dihitung (satelit/lintasan lain): titik_unik.py
        lihat.add((tg, TU.sel(lat, lon)))
        k = cari(lon, lat)
        if k:
            hitung.setdefault(tg, {})[k] = hitung.setdefault(tg, {}).get(k, 0) + 1
    selesai = [d for d in sasaran if penuh(ok, d, FAM4)]
    for d in selesai:
        hari[d.isoformat()] = hitung.get(d.isoformat(), {})
        if parsial is not None:
            parsial.discard(d.isoformat())
    return len(selesai)


def jumlah(hari, dari, sampai):
    out = {}
    for t, v in hari.items():
        if dari <= t <= sampai:
            for k, n in v.items():
                out[k] = out.get(k, 0) + n
    return out


def kab_dilintasi(geom, wilayah):
    """Kab/kota (nama, kode prov) dari titik contoh tiap LANGKAH_KAB derajat di dalam poligon (+ satu titik tiap cincin)."""
    c = {}
    for r in _cincin(geom):
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        pts = [(r[0][0], r[0][1]), ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)]
        x = math.ceil(min(xs) / LANGKAH_KAB) * LANGKAH_KAB
        while x <= max(xs):
            y = math.ceil(min(ys) / LANGKAH_KAB) * LANGKAH_KAB
            while y <= max(ys):
                pts.append((x, y))
                y += LANGKAH_KAB
            x += LANGKAH_KAB
        for x, y in pts:
            if _di_dalam(x, y, r) or (x, y) == pts[0]:
                a = wilayah.cari(x, y)
                if a:
                    c[(a[0], a[1])] = c.get((a[0], a[1]), 0) + 1
    return c


def rakit(khg, titik7, titik30, musim, kompleks, kanal, geom_oleh_kode, wilayah, musim_lengkap):
    """khg: daftar properti {kode,nama,ha}; semua hitungan = {kode: n}. -> daftar baris terurut."""
    out = []
    for p in khg:
        k = p["kode"]
        if not musim.get(k):
            continue
        c = kab_dilintasi(geom_oleh_kode[k], wilayah)
        prov = {}
        for (pv, _), n in c.items():
            prov[pv] = prov.get(pv, 0) + n
        pv = max(prov, key=prov.get) if prov else None
        out.append({"kode": k, "nama": p["nama"], "prov": pv, "prov_nama": PROVINSI.get(pv),
                    "kab": [kb for (_, kb), _ in sorted(c.items(), key=lambda x: -x[1])[:KAB_MAKS]],
                    "luas_ha": p["ha"], "titik_7h": titik7.get(k, 0), "titik_30h": titik30.get(k, 0), "titik_musim": musim[k],
                    "kompleks_aktif": kompleks.get(k, 0), "kanal_km": round(kanal.get(k, 0.0), 1)})
    out.sort(key=lambda r: (-r["titik_7h"], -r["titik_musim"], r["kode"]))
    return out


def main():
    t0 = time.time()
    geo = json.load(open(os.path.join(DATA, "lahan/khg.geojson")))
    props = [f["properties"] for f in geo["features"]]
    geom = {f["properties"]["kode"]: f["geometry"] for f in geo["features"]}
    pol = Poligon(os.path.join(DATA, "lahan/khg.geojson"))
    def cari(lon, lat):
        p = pol.cari(lon, lat)
        return p["kode"] if p else None

    h = json.load(open(os.path.join(DATA, "hotspot.json")))
    if "hitung" in h["kolom"]:   # 1 = deteksi yang dihitung (lokasi unik per hari, harian.py)
        ih = h["kolom"].index("hitung")
        baris = [b for b in h["baris"] if b[ih]]
    else:   # berkas lama (harian.py gagal sesudah 25 Okt 2026): sensor_utama + keyakinan_min seperti dulu
        ks, kk = h["kolom"].index("sensor"), h["kolom"].index("keyakinan")
        baris = [b for b in h["baris"] if b[ks] in h["sensor_utama"] and b[kk] >= h.get("keyakinan_min", KEYAKINAN_MIN)]
    acuan = dt.datetime.fromisoformat(h["acuan"])
    hari_ini = dt.datetime.now(WIB).date().isoformat()
    ki = h["kolom"].index("tgl_wib")
    _, baru = hitung_titik(baris, cari, lambda b: tgl_dari_hotspot(h, b[ki]))
    akhir_acuan = acuan.astimezone(WIB).date()
    batas_lengkap = ((acuan - dt.timedelta(days=7)).astimezone(WIB).date() + dt.timedelta(days=1)).isoformat()

    jalur = os.path.join(DATA, "khg_hari.json")
    simpan = json.load(open(jalur)) if os.path.exists(jalur) else {}
    lama, parsial = simpan.get("hari", {}), set(simpan.get("parsial", []))
    if simpan.get("versi", 1) < VERSI_HARI and simpan:   # berkas dari pemilihan sumber lama (SP kosong dianggap nol / VIIRS hilang): buang hari terdampak
        lama = {t: v for t, v in lama.items() if t < MIGRASI_DARI}
        print(f"khg_prioritas: migrasi khg_hari v{simpan.get('versi', 1)} -> v{VERSI_HARI}: hari >= {MIGRASI_DARI} diisi ulang", file=sys.stderr)
    hari = perbarui_hari(lama, baru, batas_lengkap, akhir_acuan.isoformat())
    # hari acuan baru terisi sebagian (jam acuan), hari sebelumnya di jendela sudah penuh
    parsial = {t for t in parsial if not (batas_lengkap <= t < akhir_acuan.isoformat())} | {akhir_acuan.isoformat()}
    awal = f"{hari_ini[:4]}-01-01"
    nas = nasional_harian(os.path.join(DATA, "musim_harian.json"))
    if os.environ.get("FIRMS_MAP_KEY") or os.path.exists(os.path.join(AKAR, ".env")):
        try:
            import harian, titik_palsu as TP
            sel, _ = TP.sel_industri()
            kunci = harian.kunci()
            if not kunci:
                raise RuntimeError("FIRMS_MAP_KEY kosong")
            perlu = curiga(hari, awal, hari_ini, nas, parsial)
            n = isi_mundur(hari, perlu, kunci, harian.ambil, harian.BBOX, cari,
                           (lambda la, lo: TP.palsu(la, lo, sel)) if sel else None, parsial=parsial)
            print(f"khg_prioritas: isi mundur {n} hari", file=sys.stderr)
        except (Exception, SystemExit) as e:   # kunci hilang / FIRMS mati: jalan terus dengan hari yang ada
            print("khg_prioritas: isi mundur dilewati:", e, file=sys.stderr)
    hari = {t: v for t, v in hari.items() if t >= f"{int(hari_ini[:4]) - 1}-12-01"}   # simpan 1 Des tahun lalu s.d. kini (30 hari awal Januari)
    json.dump({"versi": VERSI_HARI, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "parsial": sorted(parsial), "hari": dict(sorted(hari.items()))},
              open(jalur, "w"), separators=(",", ":"))
    h0 = dt.date.fromisoformat(hari_ini)
    kemarin = (h0 - dt.timedelta(days=1)).isoformat()   # hari ini selalu parsial: tidak ikut hitungan apa pun
    d0 = dt.date.fromisoformat(awal)
    curiga_sisa = curiga(hari, awal, hari_ini, nas, parsial)
    lengkap = not curiga_sisa
    tgl_awal_ada = min((t for t in hari if t >= awal), default=None)
    j7 = [(h0 - dt.timedelta(days=7)).isoformat(), kemarin]
    titik7 = jumlah(hari, *j7)
    t30 = jumlah(hari, (h0 - dt.timedelta(days=30)).isoformat(), kemarin)
    musim = jumlah(hari, awal, kemarin)

    op = json.load(open(os.path.join(DATA, "operasi.json")))
    kompleks = {}
    for k in op["kompleks"]:
        if (k.get("ini") or 0) > 0:
            kode = cari(k["lon"], k["lat"])
            if kode:
                kompleks[kode] = kompleks.get(kode, 0) + 1
    kanal = {}
    kn = json.load(open(os.path.join(DATA, "kanal.json")))
    for la, lo, km in kn["grid"]:
        kode = cari(lo, la)
        if kode:
            kanal[kode] = kanal.get(kode, 0.0) + km

    baris_khg = rakit(props, titik7, t30, musim, kompleks, kanal, geom, Wilayah(), lengkap)
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "per": hari_ini, "hari_curiga": len(curiga_sisa), "jendela_7h": j7, "jendela_30h": [(h0 - dt.timedelta(days=30)).isoformat(), kemarin],
           "musim_tahun": int(hari_ini[:4]), "musim_lengkap": lengkap, "musim_data_dari": tgl_awal_ada,
           "sumber": "Poligon KHG: BRGM PRIMS (https://prims.brgm.go.id, lapisan prims:khg), pemakaian nonkomersial dengan tautan ke wali data; titik panas: NASA FIRMS (MODIS, VIIRS S-NPP sampai 1 Nov 2026, NOAA-20, NOAA-21); kanal: OpenStreetMap (ODbL); cluster: operasi.json",
           "catatan": ("Poligon KHG tidak diubah isinya, hanya disederhanakan untuk tampilan (Douglas-Peucker, toleransi 0,002 derajat, galat sampai +-220 m di tepi), jadi titik dekat tepi bisa masuk/keluar KHG secara keliru; lisensi PRIMS nonkomersial. "
                       "Titik dihitung di dalam poligon (point-in-polygon, cincin luar), lokasi unik per hari WIB (titik_unik.py: M, N, N20, N21; sedang/tinggi), titik industri/PLTU sudah dibuang. "
                       f"titik_7h = jumlah titik harian WIB pada jendela_7h {j7[0]} s.d. {j7[1]} (7 hari penuh terakhir; hari ini yang belum selesai tidak dihitung); titik_30h dan titik_musim dari khg_hari.json sampai {kemarin}. "
                       + ("" if lengkap else f"Musim BELUM lengkap: {len(curiga_sisa)} hari belum terisi/parsial/curiga (kosong padahal nasional >= {CURIGA_NAS}; contoh {curiga_sisa[0]}): titik_musim dan titik_30h batas bawah, terisi penuh bertahap tiap jalan harian. ")
                       + f"kompleks_aktif = cluster operasi.json (per {op.get('per')}, titik tengah) dengan deteksi hari itu > 0 yang jatuh di KHG. "
                       "kanal_km = jumlah panjang kanal/parit OSM pada sel 0,02 derajat yang titik tengahnya di KHG (perkiraan kasar, +-2 km per sel). "
                       "kab = kab/kota yang dilintasi menurut titik contoh tiap 4,4 km (maks 6, urut luas contoh), prov = yang terbanyak. "
                       "Hanya KHG dengan titik_musim > 0; urut titik_7h lalu titik_musim. Prioritas pembasahan = di mana titik, cluster, dan kanal bertemu."),
           "khg": baris_khg}
    p = os.path.join(DATA, "khg_prioritas.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"khg_prioritas.json {len(baris_khg)} KHG, {os.path.getsize(p) / 1e3:.0f} KB, khg_hari {os.path.getsize(jalur) / 1e3:.0f} KB, {time.time() - t0:.1f} dtk")


def uji_snpp_berhenti():
    """isi_mundur saat S-NPP berhenti: (a) CSV kepala saja, (b) galat, (c) baris NRT hilang dari data_availability; sebelum dan sesudah FS.SNPP_AKHIR."""
    D = dt.date.fromisoformat
    HDR = "latitude,longitude,acq_date,acq_time,confidence\n"
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-06-30\n{f}_NRT,2026-07-01,2026-12-31\n" for f in FAM4)
    avail_c = avail.replace("VIIRS_SNPP_NRT", "X")
    def pabrik(mode, a=avail):
        urls = []
        def ambil(u):
            if "data_availability" in u:
                return a
            urls.append(u)
            if "VIIRS_SNPP" in u:
                if mode == "a":
                    return HDR
                if mode == "b":
                    raise RuntimeError("HTTP Error 400: Bad Request")
            tg = D(u.split("/")[-1])
            return HDR + "".join(f"-2.5,100.5,{tg + dt.timedelta(days=n)},0100,90\n" for n in range(int(u.split("/")[-2])))
        return ambil, urls
    snpp = lambda urls: [u for u in urls if "VIIRS_SNPP" in u]
    cari = lambda lo, la: "A"
    err = io.StringIO()
    import contextlib
    try:
        FS._SEKARANG = FS.SESUDAH
        # sesudah batas, menurut TANGGAL DATA: hari UTC <= 1 Nov tetap diminta NRT S-NPP (WIB 2 Nov butuh UTC 1 Nov), hari sesudahnya tidak
        for mode, a in (("0", avail), ("a", avail), ("b", avail), ("0", avail_c), ("b", avail_c)):
            ambil, urls = pabrik(mode, a)
            hari = {}
            with contextlib.redirect_stderr(err):
                n = isi_mundur(hari, [D("2026-11-02"), D("2026-11-03")], "K", ambil, "b", cari)
            gagal = mode == "b" and a is avail   # galat: WIB 2 Nov belum selesai (dicoba lagi), WIB 3 Nov tak menunggu S-NPP
            harap = {"2026-11-03": {"A": 1}} if gagal else {"2026-11-02": {"A": 1}, "2026-11-03": {"A": 1}}
            assert n == len(harap) and hari == harap, (mode, n, hari)
            assert [u.split("/")[-4:] for u in snpp(urls)] == ([] if a is avail_c else [["VIIRS_SNPP_NRT", "b", "1", "2026-11-01"]]), (mode, snpp(urls))
        FS._SEKARANG = FS.PRA
        ambil, urls = pabrik("b")
        hari = {}
        with contextlib.redirect_stderr(err):
            n = isi_mundur(hari, [D("2026-10-28"), D("2026-10-29")], "K", ambil, "b", cari)
        assert n == 0 and not hari and any("NOAA20" in u for u in urls), "sebelum batas S-NPP galat: hari tidak ditandai selesai, tanpa pengecualian"
        ambil, urls = pabrik("a")
        hari = {}
        with contextlib.redirect_stderr(err):
            n = isi_mundur(hari, [D("2026-10-28"), D("2026-10-29")], "K", ambil, "b", cari)
        assert n == 2 and snpp(urls), "sebelum batas S-NPP kepala saja: nol titik S-NPP, hari selesai"
        ambil, _ = pabrik("0", avail_c)
        try:
            isi_mundur({}, [D("2026-10-28")], "K", ambil, "b", cari); raise SystemExit("(c) sebelum batas harus RuntimeError (ditangkap main)")
        except RuntimeError:
            pass
    finally:
        FS._SEKARANG = None


def uji():
    FS._SEKARANG = FS.PRA   # hermetis: jam dibekukan sebelum SNPP_AKHIR (lihat uji_snpp_berhenti untuk sesudahnya)
    # tanggal hotspot: tahun dari acuan, mundur setahun bila melampaui
    h = {"acuan": "2026-01-03T05:00:00+00:00"}
    assert tgl_dari_hotspot(h, "01-02") == "2026-01-02" and tgl_dari_hotspot(h, "12-30") == "2025-12-30"
    # point-in-polygon + hitung per hari lewat Poligon sungguhan (berkas sementara)
    import tempfile
    sq = lambda x, y, s: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]]
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"kode": "A", "nama": "KHG A", "ha": 100}, "geometry": {"type": "MultiPolygon", "coordinates": [sq(100, -3, 1)]}},
        {"type": "Feature", "properties": {"kode": "B", "nama": "KHG B", "ha": 50}, "geometry": {"type": "MultiPolygon", "coordinates": [sq(110, -2, 1)]}}]}
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "k.geojson")
        json.dump(fc, open(p, "w"))
        pol = Poligon(p)
        cari = lambda lon, lat: (pol.cari(lon, lat) or {}).get("kode")
        assert cari(100.5, -2.5) == "A" and cari(110.5, -1.5) == "B" and cari(105, 0) is None
        # batas bbox: titik di bbox tapi di luar cincin tidak dihitung
        tri = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [0, 1], [0, 0]]]}
        assert _di_dalam(0.2, 0.2, tri["coordinates"][0]) and not _di_dalam(0.9, 0.9, tri["coordinates"][0])
    baris = [[-2.5, 100.5, -1, "N", 1, 1, 0, "01-02"], [-2.4, 100.4, -1, "N", 1, 1, 0, "01-02"], [-1.5, 110.5, -1, "M", 1, 1, 0, "01-03"], [0, 105, 0, "N", 1, 1, 0, "01-03"]]
    tot, ph = hitung_titik(baris, cari, lambda b: "2026-" + b[7])
    assert tot == {"A": 2, "B": 1} and ph == {"2026-01-02": {"A": 2}, "2026-01-03": {"B": 1}}, (tot, ph)
    # gabung hari: >= batas ditimpa (termasuk jadi kosong), < batas dipertahankan
    lama = {"2026-01-01": {"A": 9}, "2026-01-02": {"A": 99}, "2026-01-03": {"A": 7}}
    g = perbarui_hari(lama, ph, "2026-01-02", "2026-01-03")
    assert g == {"2026-01-01": {"A": 9}, "2026-01-02": {"A": 2}, "2026-01-03": {"B": 1}}, g
    # hari SESUDAH acuan tidak boleh ditandai selesai (nol palsu) maupun dihapus; hari dalam jendela tanpa titik jadi {} sungguhan
    g2 = perbarui_hari({"2026-01-05": {"A": 5}}, {}, "2026-01-02", "2026-01-03")
    assert "2026-01-04" not in g2 and g2["2026-01-05"] == {"A": 5} and g2["2026-01-02"] == {} and g2["2026-01-03"] == {}, g2
    D = dt.date.fromisoformat
    HDR = "latitude,longitude,acq_date,acq_time,confidence\n"
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-01-02\n{f}_NRT,2026-01-03,2026-12-31\n" for f in FAM4)
    dipanggil = []
    def ambil_ok(url, isi=HDR):
        dipanggil.append(url)
        return avail if "data_availability" in url else isi
    # hari parsial diunduh ulang
    hp, pars = {"2026-01-02": {"A": 1}}, {"2026-01-02"}
    isi_mundur(hp, [D("2026-01-02")], "K", ambil_ok, "b", lambda lo, la: None, parsial=pars)
    assert not pars and hp["2026-01-02"] == {}, (pars, hp)
    # sumber dipilih dari ketersediaan, BUKAN dari umur: 01-03 UTC hanya ada di NRT (SP-nya kosong), 01-01/01-02 di SP
    ket = muat_ketersediaan("K", ambil_ok)
    assert sumber_hari("MODIS", D("2026-01-02"), ket) == "MODIS_SP" and sumber_hari("MODIS", D("2026-01-03"), ket) == "MODIS_NRT" and sumber_hari("MODIS", D("2025-01-01"), ket) == "MODIS_SP"
    assert sumber_hari("MODIS", D("2027-01-01"), ket) is None
    # isi mundur dengan FIRMS palsu: titik di A, titik palsu disaring, duplikat dalam satu sensor dibuang
    csv_ = HDR + "-2.5,100.5,2026-01-02,0100,90\n-2.5,100.5,2026-01-02,0100,90\n-2.5,100.6,2026-01-02,2000,90\n-2.4,100.4,2026-01-03,0300,90\n-2.5,100.7,2026-01-02,0200,l\n-2.5,100.8,2026-01-02,0200,l\n"   # dua baris terakhir keyakinan rendah (l; MODIS < 30 diuji di firms_sumber.kelas_yakin): DITOLAK
    dipanggil.clear()
    hari = {}
    n = isi_mundur(hari, [D("2026-01-02"), D("2026-01-03")], "KEY", lambda u: ambil_ok(u, csv_), "94,-11.5,141.5,6.5", cari, lambda la, lo: abs(lo - 100.4) < 1e-6)
    pakai = [u.split("/")[-4] for u in dipanggil if "area/csv" in u]
    assert n == 2 and sorted(pakai) == sorted([f + "_SP" for f in FAM4] * 1 + [f + "_NRT" for f in FAM4]) , (n, pakai)
    # 01-02 WIB = UTC 01-01 17:00 .. 01-02 17:00; 2000 UTC => 01-03 WIB. 4 famili x (SP + NRT) menjawab csv_ yang sama = SATU lokasi per hari
    assert hari["2026-01-02"] == {"A": 1} and hari["2026-01-03"] == {"A": 1}, hari
    # gagal unduh ATAU balasan galat (200 berisi teks) = tidak ada hari yang ditandai selesai, termasuk balasan header saja yang salah-sumber tidak lolos
    for galat in (lambda u: avail if "data_availability" in u else (_ for _ in ()).throw(RuntimeError("mati")),
                  lambda u: avail if "data_availability" in u else "Invalid MAP_KEY."):
        hari2 = {}
        assert isi_mundur(hari2, [D("2026-01-02")], "KEY", galat, "b", cari) == 0 and not hari2
    # hari kosong di antara hari berisi dengan nasional > 1000 WAJIB dianggap curiga (bug 2-27 Agustus: SP kosong diterima sebagai nol)
    hh = {"2026-08-01": {"A": 20}, "2026-08-02": {}, "2026-08-03": {}, "2026-08-04": {"A": 9}, "2026-08-05": {}}
    nas = {"2026-08-02": 3842, "2026-08-03": 1500, "2026-08-05": 50}
    assert [d.isoformat() for d in curiga(hh, "2026-08-01", "2026-08-06", nas)] == ["2026-08-02", "2026-08-03"]
    assert curiga(hh, "2026-08-01", "2026-08-06", nas, {"2026-08-05"})[-1].isoformat() == "2026-08-05"
    assert [d.isoformat() for d in curiga({}, "2026-08-01", "2026-08-03", {})] == ["2026-08-01", "2026-08-02"]   # belum ada = curiga
    s = jumlah({"2026-01-01": {"A": 1}, "2026-01-05": {"A": 2, "B": 1}, "2026-02-01": {"A": 4}}, "2026-01-01", "2026-01-31")
    assert s == {"A": 3, "B": 1}, s
    # rakit: hanya musim > 0, urut 7h lalu musim
    class W:
        def cari(self, lon, lat):
            return ("62", "Kapuas", "X")
    gm = {"A": fc["features"][0]["geometry"], "B": fc["features"][1]["geometry"], "C": fc["features"][0]["geometry"]}
    khg = [{"kode": k, "nama": "KHG " + k, "ha": 1} for k in "ABC"]
    r = rakit(khg, {"A": 1, "B": 5}, {}, {"A": 10, "B": 2}, {"B": 1}, {"B": 3.14}, gm, W(), True)
    assert [x["kode"] for x in r] == ["B", "A"] and r[0]["kab"] == ["Kapuas"] and r[0]["prov"] == "62" and r[0]["kanal_km"] == 3.1 and r[0]["kompleks_aktif"] == 1, r
    uji_snpp_berhenti()
    print("khg_prioritas: uji lolos")


if __name__ == "__main__":
    if "--uji" in sys.argv[1:] or "uji" in sys.argv[1:]:
        uji()
    else:
        main()
