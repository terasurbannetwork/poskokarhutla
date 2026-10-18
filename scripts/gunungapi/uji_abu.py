"""Uji balik model abu (abu.py) terhadap arah awan abu yang TERTULIS di VONA PVMBG (MAGMA, arsip per gunung).

Yang diukur: selisih sudut antara arah gerak awan abu pada VONA ("Ash cloud moving to northeast") dan arah titik tengah
partikel model pada jam ke-2 setelah letusan (pelepasan 1 jam, tinggi kolom = tinggi di VONA, angin = prakiraan ECMWF IFS
0,25 historis dari Open-Meteo historical-forecast-api). Arah VONA hanya 8 mata angin (resolusi 45 derajat), jadi selisih
< 22,5 derajat sudah "tepat" dan 45 derajat "tetangga".
Yang TIDAK bisa diukur: tumpang tindih jangkauan. VONA tidak memuat luas/jarak awan; arsip advisory VAAC Darwin tidak
ditemukan (bom.gov.au/aviation/volcanic-ash hanya menampilkan advisory aktif: darwin-va-advisory.shtml, tanpa arsip; jalur
/aviation/data/volcanic-ash/ = 404). Jadi tidak ada angka jangkauan dan tidak ada yang dikarang.
Sampel: halaman arsip VONA disebar rata di sepanjang arsip (bukan seluruhnya) lalu diambil maksimal 8 kejadian per gunung yang
menulis arah DAN tinggi kolom, sejak Maret 2023. Kejadian 2023 gugur: angin tekanan historis ECMWF kosong (null) di Open-Meteo
sebelum sekitar awal 2024 (7 dari 36 gugur); periode efektif Apr 2024 - Okt 2026. Hasil ditulis ke abu_gunungapi.json kunci `uji_balik`.

Pakai:  python3 scripts/gunungapi/uji_abu.py        (jaringan; ~5-10 menit, cache di scripts/gunungapi/contoh/)
        python3 scripts/gunungapi/uji_abu.py uji    (self-check murni)
"""
import datetime as dt, json, math, os, re, statistics, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abu

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh", "vona_cache.json")
DETAIL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh", "uji_balik_detail.json")
ANGIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh", "angin_historis.json")  # angin historis yang dipakai: uji bisa diulang luring
JAM_NILAI = 3   # jam penilaian, ditetapkan SEBELUM melihat hasil: akhir pelepasan 3 jam (parameter produksi), bukan hasil pemilihan
KODE = {"Semeru": "SMR", "Merapi": "MER", "Ruang": "RUA", "Lewotobi Laki-laki": "LWK", "Marapi": "MAR", "Ibu": "IBU"}
MATA = {"north": 0, "northeast": 45, "east": 90, "southeast": 135, "south": 180, "southwest": 225, "west": 270, "northwest": 315}
AWAL = dt.datetime(2023, 3, 1, tzinfo=dt.timezone.utc)
HAL_PER_GUNUNG, MAKS_KEJADIAN = 14, 8
HIST = "https://historical-forecast-api.open-meteo.com/v1/forecast"


def selisih(a, b):
    return abs((a - b + 180) % 360 - 180)


def urai_vona(h, nama):
    """Kejadian dengan arah DAN tinggi di atas puncak dari satu halaman daftar VONA."""
    out = []
    for m in re.finditer(r'<small>(\d{4}-\d\d-\d\d \d\d:\d\d):\d\d UTC</small>.*?timeline-text">(.*?)</p>', h, re.S):
        t = re.sub(r"\s+", " ", m.group(2))
        d = re.search(r"moving to ([a-z]+)", t)
        k = re.search(r"\((\d+) M\) above summit", t)
        if d and k and d.group(1) in MATA:
            out.append({"gunung": nama, "waktu": m.group(1).replace(" ", "T") + ":00Z", "kolom_m": int(k.group(1)), "arah_vona": d.group(1)})
    return out


def ambil(url):
    for k in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": abu.UA}), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            time.sleep(3 * (k + 1))
    return ""


def kumpul_vona():
    cache = abu.baca(CACHE, {})
    for nama, kode in KODE.items():
        if nama in cache:
            continue
        h1 = ambil(f"https://magma.esdm.go.id/v1/vona?code={kode}")
        tot = max([int(x) for x in re.findall(r"page=(\d+)", h1)] or [1])
        hal = sorted({max(1, round(1 + i * (tot - 1) / (HAL_PER_GUNUNG - 1))) for i in range(HAL_PER_GUNUNG)})
        ev, ok = [], 0
        for p in hal:
            h = h1 if p == 1 else ambil(f"https://magma.esdm.go.id/v1/vona?code={kode}&page={p}")
            ok += bool(h)
            ev += urai_vona(h, nama)
            time.sleep(.4)
        print(f"  VONA {nama}: {tot} halaman, {len(hal)} dibaca ({ok} berhasil), {len(ev)} kejadian beraraah+tinggi", file=sys.stderr)
        cache[nama] = ev
        abu.simpan(CACHE, cache)
    return cache


def pilih(ev):
    ev = sorted((e for e in ev if dt.datetime.fromisoformat(e["waktu"].replace("Z", "+00:00")) >= AWAL), key=lambda e: e["waktu"])
    uniq, hari = [], set()
    for e in ev:  # satu per hari supaya tidak satu episode mendominasi
        if e["waktu"][:10] not in hari:
            hari.add(e["waktu"][:10])
            uniq.append(e)
    if len(uniq) <= MAKS_KEJADIAN:
        return uniq
    return [uniq[round(i * (len(uniq) - 1) / (MAKS_KEJADIAN - 1))] for i in range(MAKS_KEJADIAN)]


def angin_historis(g, e, cache):
    """Angin 12 jam mulai jam letusan: dari cache luring bila ada, selain itu Open-Meteo historical-forecast-api (lalu disimpan). (angin|None, alasan)."""
    kunci = f"{g['nama']}|{e['waktu']}"
    if kunci in cache:
        return cache[kunci], ""
    t = dt.datetime.fromisoformat(e["waktu"].replace("Z", "+00:00"))
    url = abu.url_angin([(g["lat"], g["lon"])], HIST, {"start_date": t.date().isoformat(), "end_date": (t.date() + dt.timedelta(days=1)).isoformat()})
    try:
        r = abu.ambil_json(url, coba=2)
    except RuntimeError as ex:
        return None, str(ex)
    r = r[0] if isinstance(r, list) else r
    tm = r["hourly"]["time"]
    kini = t.strftime("%Y-%m-%dT%H:00")
    a = abu.angin_dari_respon(r, tm.index(kini), 12) if kini in tm else None
    if not a:
        return None, "angin historis kosong"
    cache[kunci] = a
    abu.simpan(ANGIN, cache)
    return a, ""


def model_arah(g, e, cache):
    """((arah sebaran mentah, arah berambang|None), "") atau (None, alasan); parameter produksi, jam penilaian JAM_NILAI."""
    a, alasan = angin_historis(g, e, cache)
    if not a:
        return None, alasan
    h = abu.jalankan(g["lat"], g["lon"], g.get("tinggi") or 0, e["kolom_m"], a, durasi_jam=abu.DURASI_LEPAS_JAM, jam=JAM_NILAI, n=abu.N_PRODUKSI, seed=1)
    jb = abu.jejak(h, JAM_NILAI)
    return (abu.jejak_tipis(h, JAM_NILAI)["arah_deg"], None if jb["di_bawah_ambang"] else jb["arah_deg"]), ""


def p_binomial(k, n, p=0.25):
    """P(X >= k) bila setiap kejadian 'dalam 45 derajat' hanya kebetulan (peluang p = 90/360 untuk arah acak seragam)."""
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k, n + 1))


def ringkas(baris, periode, catatan):
    s = [selisih(b["model_deg"], MATA[b["arah_vona"]]) for b in baris]
    k = sum(x <= 45 for x in s)
    return {"n": len(s), "median_selisih_deg": round(statistics.median(s), 1), "persen_dalam_45deg": round(100 * k / len(s)),
            "acak_persen": 25, "p_binomial": float(f"{p_binomial(k, len(s)):.3g}"),
            "periode": periode, "sumber": "VONA PVMBG (magma.esdm.go.id/v1/vona) vs Open-Meteo historical-forecast-api (ECMWF IFS 0,25)", "catatan": catatan}


def jalan():
    status = {g["nama"]: g for g in abu.baca(abu.STATUS, {}).get("gunung", [])}
    cache = kumpul_vona()
    angin_c = abu.baca(ANGIN, {})
    baris, gagal = [], []
    for nama in KODE:
        g = status.get(nama)
        if not g:
            gagal.append(f"{nama}: tak ada di gunungapi_status.json")
            continue
        for e in pilih(cache.get(nama, [])):
            a, alasan = model_arah(g, e, angin_c)
            if a is None:
                gagal.append(f"{nama} {e['waktu']}: {alasan}")
                if "429" in alasan:
                    break
                continue
            baris.append({**e, "model_deg": round(a[0], 1), "selisih_deg": round(selisih(a[0], MATA[e["arah_vona"]]), 1),
                          "berambang_deg": None if a[1] is None else round(a[1], 1),
                          "selisih_berambang_deg": None if a[1] is None else round(selisih(a[1], MATA[e["arah_vona"]]), 1)})
    abu.simpan(DETAIL, {"kejadian": baris, "gagal": gagal})
    o = abu.baca(abu.KELUAR, None)
    if o is None:
        raise SystemExit("abu_gunungapi.json belum ada: jalankan abu.py dulu")
    o.pop("uji_balik_berambang", None)
    if baris:
        per = f"{min(b['waktu'] for b in baris)[:10]} s.d. {max(b['waktu'] for b in baris)[:10]}"
        dasar = ("Arah VONA 8 mata angin (resolusi 45 derajat). Tumpang tindih jangkauan tidak diukur: VONA tanpa jarak dan arsip VAAC Darwin tidak tersedia. "
                 f"Sampel disebar di arsip, maks. 8 kejadian per gunung ({', '.join(sorted({b['gunung'] for b in baris}))}). Gagal/dilewati: {len(gagal)}.")
        o["uji_balik_tipis"] = ringkas(baris, per, f"Parameter produksi (pelepasan {abu.DURASI_LEPAS_JAM} jam, n={abu.N_PRODUKSI}, seed 1), jam penilaian {JAM_NILAI} (ditetapkan di muka). Model = arah titik tengah SEBARAN MENTAH partikel (tanpa ambang). " + dasar)
        br = [{**b, "model_deg": b["berambang_deg"]} for b in baris if b["berambang_deg"] is not None]
        if br:
            o["uji_balik"] = ringkas(br, per, f"Parameter produksi (pelepasan {abu.DURASI_LEPAS_JAM} jam, n={abu.N_PRODUKSI}, seed 1), jam penilaian {JAM_NILAI} (ditetapkan di muka). Model = arah titik tengah sel di atas ambang penerbangan, sah bila >= {abu.MIN_SEL} sel. "
                                              f"Hanya {len(br)} dari {len(baris)} kejadian punya jejak sah (kolom VONA kecil, massa terlepas kecil); sisanya tidak bisa dinilai berambang. Pembanding acak: arah acak seragam dalam 45 derajat = 25%; p_binomial = P(>= k kejadian dalam 45 derajat | 25%). " + dasar)
            o.pop("uji_balik_catatan", None)
        else:
            o["uji_balik"] = None
            o["uji_balik_catatan"] = f"Tidak satu pun dari {len(baris)} kejadian VONA beraraah punya sel di atas ambang penerbangan (jejak tidak sah: < 5 sel lolos); uji berambang tak bisa dihitung. Uji sebaran mentah ada di uji_balik_tipis. " + dasar
    else:
        o["uji_balik"] = None
        o["uji_balik_catatan"] = "Tidak ada kejadian VONA beraraah yang bisa dibandingkan; yang dicoba: " + "; ".join(gagal[:5])
    abu.simpan(abu.KELUAR, o)
    print(json.dumps({"berambang": o["uji_balik"], "tipis": o.get("uji_balik_tipis")}, ensure_ascii=False), file=sys.stderr)
    for b in baris:
        print(f"  {b['gunung']:20s} {b['waktu']} vona {b['arah_vona']:10s} model {b['model_deg']:6.1f} selisih {b['selisih_deg']} | berambang {b['berambang_deg']} selisih {b['selisih_berambang_deg']}", file=sys.stderr)
    print(f"gagal: {len(gagal)}", gagal[:8], file=sys.stderr)


def uji():
    assert selisih(350, 10) == 20 and selisih(0, 180) == 180 and selisih(90, 90) == 0
    h = ('<div class="timeline-time"><small>2026-10-17 20:42:00 UTC</small></div><p class="timeline-text">Eruption with volcanic ash cloud at 2042 UTC. '
         'Best estimate of ash-cloud top is around 5840 FT (1825 M) above sea level or 1600 FT (500 M) above summit. Ash cloud moving to north. Volcanic ash is gray.</p>'
         '<div class="timeline-time"><small>2026-10-17 10:00:00 UTC</small></div><p class="timeline-text">Eruption at 1000 UTC. Ash-cloud is not observed.</p>')
    assert urai_vona(h, "Ibu") == [{"gunung": "Ibu", "waktu": "2026-10-17T20:42:00Z", "kolom_m": 500, "arah_vona": "north"}]
    ev = [{"gunung": "X", "waktu": f"2024-{m:02d}-01T00:00:00Z", "kolom_m": 500, "arah_vona": "east"} for m in range(1, 13)] * 2
    assert len(pilih(ev)) == MAKS_KEJADIAN
    r = ringkas([{"model_deg": 90, "arah_vona": "east"}, {"model_deg": 10, "arah_vona": "east"}, {"model_deg": 80, "arah_vona": "east"}], "p", "c")
    assert r["n"] == 3 and r["median_selisih_deg"] == 10 and r["persen_dalam_45deg"] == 67 and r["acak_persen"] == 25, r
    assert abs(p_binomial(0, 5) - 1) < 1e-12 and abs(p_binomial(5, 5) - 0.25 ** 5) < 1e-12 and abs(p_binomial(1, 2) - (1 - 0.75 ** 2)) < 1e-12
    assert r["p_binomial"] == float(f"{3 * .25 ** 2 * .75 + .25 ** 3:.3g}"), r  # k=2 dari 3
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
