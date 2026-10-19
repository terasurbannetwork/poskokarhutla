"""Peluang abu gunung api melewati bandara/kota, 3 hari ke depan -> public/banjir/data/abu_peluang.json (kontrak peluang/1).

SKENARIO, bukan ramalan letusan: tiap gunung level >= II diandaikan meletus SEKARANG. Model dispersi = abu.py (tidak
diubah, diimpor); yang ditambah hanya ansambelnya. Tidak menggantikan advisory VAAC Darwin / VONA PVMBG.

Anggota per gunung = (sumber angin lapisan tekanan) x (tinggi kolom 0,5x/1x/2x kolom abu.py) x (durasi lepas 2/3/6 jam):
  - 3 model deterministik Open-Meteo: ECMWF IFS 0,25, GFS, ICON  -> 3 x 3 x 3 = 27 anggota;
  - gunung level >= ENS_LEVEL_MIN juga memakai 51 anggota ENSEMBLE ECMWF IFS (ensemble-api.open-meteo.com/v1/ensemble punya
    wind_speed/direction/geopotential_height lapisan tekanan; GFS ensemble di endpoint itu KOSONG untuk lapisan tekanan, diuji 19 Okt).
    Tiap anggota ensemble dipasangkan ke SATU kombinasi (tinggi, durasi) bergiliran (indeks mod 9), supaya biaya tak 9x lipat.
  Bobot tiap anggota SAMA (tidak dicocokkan ke alat ukur: tidak ada alat ukur abu yang terbuka).

Besaran = konsentrasi abu puncak (mg/m3) pada sel kisi 0,1 derajat mana pun yang pusatnya dalam 25 km titik, partikel <= FL350,
maksimum atas jam-jam dalam jendela 24 jam. Dipilih ini (bukan jarak jejak) karena dari satu besaran yang sama lahir tiga
ambang yang naik: 0,2 / 2 / 4 mg/m3 (rendah / sedang / tinggi menurut kelas kontaminasi abu EASA-CAA; 2 mg/m3 = ambang abu.py).
Konsentrasi = massa sel / (luas sel x 2 km tebal awan); massa = MER Mastin x durasi (semua ASUMSI abu.py). Ini beban RELATIF
model, bukan konsentrasi terukur. Hari = jendela 24 jam sejak waktu skenario (t = tanggal WIB awal jendela).
Pasangan gunung-titik yang tak satu anggota pun mencapai 0,2 mg/m3 dibuang (bukan ditulis nol).

Pakai:  python3 scripts/gunungapi/peluang_abu.py          (jalan sungguhan; butuh jaringan, simpan angin ke data/raw)
        python3 scripts/gunungapi/peluang_abu.py ulang    (dari angin tersimpan, tanpa jaringan)
        python3 scripts/gunungapi/peluang_abu.py uji      (self-check luring)
"""
import datetime as dt
import importlib.util
import json
import math
import os
import re
import sys
import time
import urllib.parse

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


abu = _muat("abu_gn", "scripts/gunungapi/abu.py")
P = _muat("peluang_umum", "scripts/umum/peluang.py")

KELUAR = os.path.join(AKAR, "public/banjir/data/abu_peluang.json")
CACHE = os.path.join(AKAR, "data/raw/gunungapi/angin_ansambel.json")
KOTA = os.path.join(AKAR, "scripts/udara/kota.json")
ENSEMBLE = "https://ensemble-api.open-meteo.com/v1/ensemble"
MODEL = (("ecmwf_ifs025", "ECMWF IFS"), ("gfs_seamless", "GFS"), ("icon_seamless", "ICON"))
FAKTOR_KOLOM = (0.5, 1.0, 2.0)
DURASI = (2, 3, 6)
KOMBO = [(f, d) for f in FAKTOR_KOLOM for d in DURASI]
ENS_LEVEL_MIN = 3
N_ANGGOTA_ENS = 51          # kontrol + 50
AMBANG = [(0.2, "rendah", "Abu 0,2 mg/m3 atau lebih (kontaminasi rendah)"),
          (2.0, "sedang", "Abu 2 mg/m3 atau lebih (kontaminasi sedang)"),
          (4.0, "tinggi", "Abu 4 mg/m3 atau lebih (kontaminasi tinggi)")]
HARI_N = 3
N_PARTIKEL = 2000
BLOK_ENS = 3                # lokasi per panggilan ensemble (respons ~ 3 x 24 x 51 deret)
MAKS_JSON_ENS = 40 * 1024 * 1024


# ---------- angin ----------
def angin_ens(r, i0, jam=72):
    """Respons ensemble satu lokasi -> {nomor anggota: objek angin abu.py}. Anggota berlubang dibuang."""
    hr, out = r["hourly"], {}
    for m in range(N_ANGGOTA_ENS):
        suf = "" if m == 0 else f"_member{m:02d}"
        try:
            semu = {"hourly": {"time": hr["time"], **{f"{v}_{p}hPa": hr[f"{v}_{p}hPa{suf}"] for p in abu.HPA
                                                       for v in ("wind_speed", "wind_direction", "geopotential_height")}}}
        except KeyError:
            continue
        a = abu.angin_dari_respon(semu, i0, jam)
        if a:
            out[m] = a
    return out


def ambil(daftar, ekstra_model, ens=False):
    """Satu sumber, banyak gunung -> {nama: angin atau {m: angin}}. Berhenti (None) bila 429; blok gagal dilewati."""
    sekarang = dt.datetime.now(dt.timezone.utc)
    kini = sekarang.strftime("%Y-%m-%dT%H:00")
    ukuran = BLOK_ENS if ens else 9
    hasil = {}
    for k in range(0, len(daftar), ukuran):
        blok = daftar[k:k + ukuran]
        url = abu.url_angin([(g["lat"], g["lon"]) for g in blok], base=ENSEMBLE if ens else abu.OPENMETEO,
                            ekstra={"forecast_days": 4, "models": ekstra_model})
        try:
            if ens:
                abu.MAKS_JSON, lama = MAKS_JSON_ENS, abu.MAKS_JSON
                try:
                    res = abu.ambil_json(url)
                finally:
                    abu.MAKS_JSON = lama
            else:
                res = abu.ambil_json(url)
        except RuntimeError as e:
            print(f"  {ekstra_model} blok {k} gagal: {e}", file=sys.stderr)
            if "429" in str(e):
                return hasil, True
            continue
        res = res if isinstance(res, list) else [res]
        for g, r in zip(blok, res):
            tm = r["hourly"]["time"]
            if kini not in tm:
                continue
            a = angin_ens(r, tm.index(kini)) if ens else abu.angin_dari_respon(r, tm.index(kini), 72)
            if a:
                hasil[g["nama"]] = a
        time.sleep(1.5)
    return hasil, False


def kumpul(daftar):
    """{sumber: {nama gunung: angin}}; ensemble: {nama: {m: angin}}. Berhenti total di 429 (mengulang memperpanjang blokir)."""
    cache, stop = {}, False
    for kode, nama in MODEL:
        if stop:
            break
        cache[kode], stop = ambil(daftar, kode)
    if not stop:
        besar = [g for g in daftar if g["level"] >= ENS_LEVEL_MIN]
        if besar:
            cache["ens"], stop = ambil(besar, "ecmwf_ifs025", ens=True)
    return cache


# ---------- titik ----------
def muat_titik():
    """[(kode, nama, lat, lon, jenis)] bandara.json (OurAirports) + pusat kabupaten/kota (scripts/udara/kota.json)."""
    out = [(b["icao"], b["nama"], b["lat"], b["lon"], "bandara") for b in abu.baca(abu.BANDARA, [])]
    try:
        for kode, nama, _, lat, lon, *_ in json.load(open(KOTA))["baris"]:
            out.append((kode, nama, lat, lon, "kota"))
    except (OSError, ValueError):
        print("  kota.json tak terbaca: hanya bandara", file=sys.stderr)
    return out


def indeks(titik, sisi=0.5):
    idx = {}
    for t in titik:
        idx.setdefault((math.floor(t[3] / sisi), math.floor(t[2] / sisi)), []).append(t)
    return idx, sisi


def dekat(idx, lon, lat):
    ix, sisi = idx
    cx, cy = math.floor(lon / sisi), math.floor(lat / sisi)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            yield from ix.get((cx + dx, cy + dy), ())


# ---------- inti ----------
def puncak_per_hari(h, idx):
    """Satu jalan model -> {kode titik: [maks konsentrasi mg/m3 per jendela 24 jam]} hanya yang >= ambang terendah."""
    w = h["massa_kg"] / h["n"]
    sisi = math.radians(abu.SEL_DEG) * abu.R_BUMI
    ky = math.radians(1) * abu.R_BUMI / 1000.0
    out = {}
    for s in h["snap"]:
        if s["jam"] < 1:
            continue
        hari = min((s["jam"] - 1) // 24, HARI_N - 1)
        cnt = {}
        for i in range(len(s["lon"])):
            if s["aktif"][i] and s["z"][i] <= abu.FL350_M:
                k = (math.floor(s["lon"][i] / abu.SEL_DEG), math.floor(s["lat"][i] / abu.SEL_DEG))
                cnt[k] = cnt.get(k, 0) + 1
        for (ci, cj), c in cnt.items():
            clat, clon = (cj + .5) * abu.SEL_DEG, (ci + .5) * abu.SEL_DEG
            luas = sisi * sisi * math.cos(math.radians(clat))
            kons = c * w * 1e6 / (luas * abu.TEBAL_AWAN_M)   # mg/m3
            if kons < AMBANG[0][0]:
                continue
            kx = ky * math.cos(math.radians(clat))
            for t in dekat(idx, clon, clat):
                if math.hypot((t[3] - clon) * kx, (t[2] - clat) * ky) <= abu.RADIUS_BANDARA_KM:
                    v = out.setdefault(t[0], [0.0] * HARI_N)
                    v[hari] = max(v[hari], kons)
    return out


def anggota_gunung(g, kol, angin_sumber):
    """[(label sumber, angin, kolom_m, durasi_jam)] untuk satu gunung. angin_sumber: {sumber: angin | {m: angin}}."""
    out = []
    for kode, nama in MODEL:
        a = angin_sumber.get(kode)
        if a:
            out += [(nama, a, kol * f, d) for f, d in KOMBO]
    ens = angin_sumber.get("ens")
    if ens:
        for m, a in sorted(ens.items()):
            f, d = KOMBO[m % len(KOMBO)]
            out.append(("ENS", a, kol * f, d))
    return out


def jalan_gunung(g, kol, angin_sumber, idx, n=N_PARTIKEL):
    """-> (jumlah anggota, {kode titik: [per anggota [per hari kons]]}, dihitung untuk titik yang pernah >= ambang terendah)."""
    ang = anggota_gunung(g, kol, angin_sumber)
    per = {}
    for k, (_, a, kolom, dur) in enumerate(ang):
        h = abu.jalankan(g["lat"], g["lon"], g.get("puncak_m") or 0, kolom, a, durasi_jam=dur, n=n, seed=k + 1)
        for kode, v in puncak_per_hari(h, idx).items():
            per.setdefault(kode, {})[k] = v
    return len(ang), {kode: [m.get(k, [0.0] * HARI_N) for k in range(len(ang))] for kode, m in per.items()}


def wilayah_gunung(g, gid, n_ang, per, titik_per_kode, tgl):
    out = {}
    for kode, anggota in per.items():
        _, nama, _, _, jenis = titik_per_kode[kode]
        nama = re.sub(r"\s*\(.*?\)", "", nama).strip()   # kontrak: nama wilayah tanpa kurung
        hari = [P.hari(tgl[d], [m[d] for m in anggota], [a[0] for a in AMBANG], desimal=2) for d in range(HARI_N)]
        tempat = f"di atas {nama}"
        out[f"{gid}|{kode}"] = {"nama": nama, "tingkat": "titik", "jenis": jenis,
                                "gunung": g["nama"], "anggota": n_ang, "hari": hari,
                                "vonis": P.vonis(hari, [a[0] for a in AMBANG], 0,
                                                 f"abu dari {g['nama']} (jika meletus sekarang) 0,2 mg/m3 atau lebih", tempat)}
    return out


def batasan(ringkas_angin):
    return [
        "SKENARIO: tiap gunung level II ke atas diandaikan meletus sekarang. Ini bukan ramalan letusan dan bukan peluang gunung meletus.",
        "Tidak menggantikan advisory VAAC Darwin (BoM) atau VONA PVMBG; keputusan terbang dan evakuasi tetap mengikuti lembaga resmi.",
        "Peluang = pecahan anggota ansambel berbobot sama: sumber angin x tinggi kolom (0,5x/1x/2x) x durasi lepas (2/3/6 jam); " + ringkas_angin,
        "Besaran adalah beban abu relatif model (sel 0,1 derajat, awan setebal 2 km, massa dari rumus Mastin), bukan konsentrasi terukur; semua asumsi abu.py berlaku.",
        "Tanpa hujan, tanpa agregasi abu, dan letusan dianggap berlangsung dengan laju tetap; rentang ketidakpastian tinggi kolom dan durasi ikut dihitung, bukan dikalibrasi.",
        "Pasangan gunung-titik yang tak satu anggota pun mencapai 0,2 mg/m3 dibuang. Hari = jendela 24 jam sejak waktu skenario (tanggal WIB awal jendela).",
    ]


def susun(daftar, kol_per_gunung, cache, titik, tgl, n=N_PARTIKEL):
    idx = indeks(titik)
    tpk = {t[0]: t for t in titik}
    wil, n_maks, jumlah, rincian = {}, 0, {}, []
    for g in daftar:
        sumber = {k: v[g["nama"]] for k, v in cache.items() if g["nama"] in v}
        if not any(sumber.get(k) for k, _ in MODEL) and not sumber.get("ens"):
            print(f"  {g['nama']}: tanpa angin sah, dibuang", file=sys.stderr)
            continue
        gid = abu.id_gunung(g["nama"])
        n_ang, per = jalan_gunung(g, kol_per_gunung[g["nama"]], sumber, idx, n)
        wil.update(wilayah_gunung(g, gid, n_ang, per, tpk, tgl))
        n_maks = max(n_maks, n_ang)
        jumlah[g["nama"]] = n_ang
        rincian.append(f"{g['nama']} {n_ang}")
        print(f"  {g['nama']}: {n_ang} anggota, {len(per)} titik tersentuh", file=sys.stderr)
    nens = sum(1 for k in jumlah if k in cache.get("ens", {}))
    ring = (f"{len(jumlah)} gunung; anggota per gunung {min(jumlah.values()) if jumlah else 0}-{n_maks}"
            f" ({nens} gunung memakai 51 anggota ensemble ECMWF)." )
    return P.berkas("gunungapi",
                    "Open-Meteo (ECMWF, GFS, ICON) + model abu.py + MAGMA PVMBG",
                    n_maks, {"label": "Beban abu relatif puncak dalam 25 km", "satuan": "mg/m3", "desimal": 2},
                    [{"k": k, "label": l, "nilai": v} for v, k, l in AMBANG], wil, batasan(ring))


def uji_balik_arah():
    """Uji balik yang ADA (arah awan vs VONA, bukan Brier peluang) dibawa apa adanya dari abu_gunungapi.json."""
    ub = abu.baca(abu.KELUAR, {}).get("uji_balik")
    if not ub:
        return None
    return {"jenis": "arah awan model vs arah VONA PVMBG (bukan Brier peluang)", "isi": ub,
            "catatan": "Menguji arah jejak satu skenario abu.py; keandalan peluang bandara/kota BELUM diuji balik."}


def tanggal(mulai_utc):
    w = dt.datetime.fromisoformat(mulai_utc.replace("Z", "+00:00")).astimezone(abu.WIB)
    return [(w + dt.timedelta(hours=24 * k)).date().isoformat() for k in range(HARI_N)]


def jalan(ulang=False):
    status = abu.baca(abu.STATUS, None)
    if not status or not status.get("gunung"):
        raise RuntimeError("gunungapi_status.json kosong")
    sekarang = dt.datetime.now(dt.timezone.utc)
    daftar = [g for g in status["gunung"] if g["level"] >= 2 and g.get("lat") is not None]
    if ulang:
        sim = abu.baca(CACHE, None)
        if not sim:
            raise RuntimeError("cache angin belum ada")
        cache, mulai = sim["angin"], sim["mulai"]
    else:
        cache = kumpul(daftar)
        mulai = sekarang.strftime("%Y-%m-%dT%H:00:00Z")
        if not any(cache.values()):
            raise RuntimeError("tidak ada angin terambil; berkas lama dibiarkan")
        abu.simpan(CACHE, {"mulai": mulai, "angin": cache})
    kol = {}
    for g in daftar:
        g["puncak_m"] = g.get("tinggi") or 0
        kol[g["nama"]] = kolom_dasar(g, status, sekarang)
    d = susun(daftar, kol, cache, muat_titik(), tanggal(mulai))
    ub = uji_balik_arah()
    if ub:
        d["uji_balik"] = ub
    g = P.periksa(d)
    if g:
        raise RuntimeError("; ".join(g[:5]))
    abu.simpan(KELUAR, d)
    print(f"{len(d['wilayah'])} pasangan; {os.path.getsize(KELUAR) // 1024} KB", file=sys.stderr)


def kolom_dasar(g, status, sekarang):
    return abu.kolom_untuk(g, status.get("letusan", []), sekarang)[0]


# ---------- uji ----------
def uji():
    a_timur = abu.angin_contoh(10.0, 0.0)
    g = {"nama": "Uji", "lat": 0.0, "lon": 100.0, "puncak_m": 0, "level": 3}
    ky = math.radians(1) * abu.R_BUMI / 1000.0
    timur = (100 + 150 / ky, 0.0)
    barat = (100 - 150 / ky, 0.0)
    jauh = (100 + 4000 / ky, 0.0)
    titik = [("T", "Titik timur", timur[1], timur[0], "bandara"), ("B", "Titik barat", barat[1], barat[0], "kota"),
             ("J", "Titik jauh", jauh[1], jauh[0], "bandara")]
    cache = {"ecmwf_ifs025": {"Uji": a_timur}, "gfs_seamless": {"Uji": a_timur}, "icon_seamless": {"Uji": a_timur}}
    tgl = ["2026-10-20", "2026-10-21", "2026-10-22"]
    d = susun([g], {"Uji": 5000}, cache, titik, tgl, n=1000)
    assert P.periksa(d) == [], P.periksa(d)
    assert d["anggota"] == 27, d["anggota"]          # 3 sumber x 3 tinggi x 3 durasi
    w = d["wilayah"]
    assert "uji|T" in w and "uji|B" not in w and "uji|J" not in w, list(w)   # angin timur: barat tak kena, 4000 km tak sampai (72 jam x 10 m/s = 2592 km)
    h = w["uji|T"]["hari"]
    assert h[0]["p"][0] > 0.2, h[0]
    assert all(b <= a for a, b in zip(h[0]["p"], h[0]["p"][1:])), "ambang lebih parah tak boleh lebih mungkin"
    assert "jika meletus sekarang" in w["uji|T"]["vonis"]
    assert h[0]["p"][2] <= h[0]["p"][0]
    # ensemble: 51 anggota ditambahkan hanya bila ada
    e = {m: a_timur for m in range(N_ANGGOTA_ENS)}
    assert len(anggota_gunung(g, 5000, {"ens": e})) == 51 and len(anggota_gunung(g, 5000, {"gfs_seamless": a_timur})) == 9
    assert tanggal("2026-10-18T19:00:00Z")[0] == "2026-10-19"
    print("peluang_abu.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    else:
        jalan(ulang=sys.argv[1:2] == ["ulang"])
