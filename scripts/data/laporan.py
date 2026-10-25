"""Laporan harian karhutla untuk Presiden -> public/data/laporan.json

Titik panas dan luas terdampak per hari, per kab/kota, per provinsi, dengan arsip bergulir 90 hari.
Kontrak skema: lihat kunci-kunci di build(); halaman laporan membaca berkas ini.

Definisi angka:
  titik  = LOKASI UNIK ~375 m (titik_unik.py: M, N, N20, N21, keyakinan sedang/tinggi; keputusan pemilik 25 Okt 2026), satu sel sekali per
           hari laporan = jendela 24 jam s.d. 16.00 WIB (lihat 'Hari laporan'); BUKAN sama dengan wilayah.json harian (hari kalender).
           Hari arsip sebelum 25 Okt 2026 memakai definisi lama (titik mentah M+N+N20) dan tidak dihitung ulang.
  luas   = PERKIRAAN luas terbakar = titik VIIRS S-NPP (N) keyakinan >= 1 hari itu x HA_TITIK (4,3 ha)
  baru   = sama dengan luas (tiap deteksi harian menyumbang luas baru); kumulatif = jumlah luas harian
  dampak = luas TERDAMPAK = sel kisi 375 m (1 piksel VIIRS) yang memuat titik VIIRS S-NPP/NOAA-20 keyakinan >= 1 hari itu
           x 14,06 ha, minimal sama dengan luas. Area di dalam piksel yang menyala: memuat api, asap panas, dan lahan belum
           terbakar di piksel yang sama, jadi selalu >= luas terbakar. Harian saja: sel yang sama terdampak berhari-hari, jadi
           tidak dijumlahkan jadi kumulatif. Hari arsip sebelum kolom ini ada = None.
  Kalibrasi HA_TITIK: luas terbakar resmi per tahun (seri Bakom/BNPB = SiPongi KLHK 2015-2025) dibagi titik VIIRS S-NPP
  tahun yang sama (sejarah.json): median 4,30 ha/titik, kuartil 3,22-4,59, min-maks 2,15-6,54. Uji balik tinggalkan-satu-tahun
  (rasio median tahun lain) pada seri 2015-2025: 6 dari 11 tahun meleset <= 15%; terburuk +101% (2017) dan -35% (2021).
  Uji luar-contoh: SiPongi Jan-Jul 2026 202.011 ha vs perkiraan 189.376 ha (-6%).
  Angka resmi 2025 di infografis Bakom (343.432) beda 4,7% dari luas_resmi.json (359.619); median tidak berubah.
  Bias yang belum diukur: sejarah.json membuang titik gunung api/sumber panas tetap/lepas pantai, hotspot.json NRT tidak
  (kolom type tidak ada di NRT) -> luas harian condong sedikit ke atas. Kalibrasi nasional tahunan: tidak diuji per hari
  atau per wilayah, jadi angka harian/provinsi bersifat indikatif (dibulatkan ke 1 ha supaya kab/kota kecil tidak jadi nol). Satu piksel VIIRS 375 m = 14,06 ha; 4,3 ha ~ 31% piksel.
  Rumus lama (sel kisi x 14,06 ha) membesar-besarkan 3-4x; arsip luas_v < 2 dikonversi sekali (lihat konversi_arsip).
Hari laporan (keputusan pemilik 21 Okt 2026): hari D = deteksi dengan waktu akuisisi di (D-1 16.00 WIB, D 16.00 WIB].
  Waktu akuisisi = acuan + kolom jam hotspot.json (dibulatkan ke menit). Hari D "lengkap" bila waktu hitung >= D 16.00 WIB.
  Hari yang sudah ditutup tetap dihitung ulang di jalan berikutnya: latensi FIRMS NRT ~3 jam, jadi lintasan siang Sumatra bisa
  masuk setelah 16.00; jendelanya tetap ditentukan waktu akuisisi, bukan waktu tiba.
  Hari arsip yang lebih tua dari jendela hotspot.json tetap memakai definisi lama (hari kalender WIB, tutup 21.00): data mentahnya
  tidak ada di CI untuk dihitung ulang. Hari pada perbatasan (21 Okt 2026) bisa bercampur dua definisi.

Pakai:  python3 scripts/data/laporan.py  |  ... uji
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import titik_unik as TU  # noqa: E402

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
HA_TITIK, HA_RENDAH, HA_TINGGI = 4.30, 3.22, 4.59   # ha per titik S-NPP; lihat docstring
HA_PIKSEL, SEL = 14.06, 0.375 / 111.32   # 1 piksel VIIRS 375 m; sel kisi dalam derajat lintang
LUAS_V = 2
ARSIP_HARI = 90
TUTUP_JAM = 16   # jam WIB penutup hari laporan
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def baca(nama, dasar=None):
    try:
        with open(os.path.join(dasar or DATA, nama)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def tanggal(mmdd, akhir):
    """'MM-DD' -> date; tahun dari hari akhir, mundur setahun bila melampaui hari akhir (pergantian tahun)."""
    m, d = map(int, mmdd.split("-"))
    t = dt.date(akhir.year, m, d)
    return t if t <= akhir else dt.date(akhir.year - 1, m, d)


def hari_lap(waktu):
    """Waktu akuisisi (aware) -> hari laporan: (D-1 TUTUP_JAM, D TUTUP_JAM] WIB; tepat 16.00 masih hari D. Menit dibulatkan
    karena kolom jam hotspot.json hanya 0,01 jam."""
    w = (waktu.astimezone(WIB) + dt.timedelta(seconds=30)).replace(second=0, microsecond=0)
    return (w + dt.timedelta(hours=24 - TUTUP_JAM, minutes=-1)).date()


def hari_status(dibuat, hari_akhir):
    """(hari_lengkap, hari_berjalan) menurut aturan TUTUP_JAM WIB."""
    tutup = dt.datetime.combine(hari_akhir, dt.time(TUTUP_JAM), WIB)
    if dibuat >= tutup:
        return hari_akhir, None
    return hari_akhir - dt.timedelta(days=1), hari_akhir


def hitung(hs):
    """Titik panas -> t[hari][kunci] = lokasi unik (titik_unik.py) per hari laporan, s[hari][kunci] = titik S-NPP keyakinan >= 1,
    c[hari][kunci] = set sel kisi 375 m bertitik VIIRS (N, N20) keyakinan >= 1. Kunci: (), (prov,), (prov,kab).
    Lokasi unik dihitung ulang per HARI LAPORAN (jendela s.d. 16.00 WIB), bukan dari kolom "hitung" hotspot.json (hari kalender)."""
    acuan = dt.datetime.fromisoformat(hs["acuan"]).astimezone(WIB)
    akhir = hari_lap(acuan)
    tabel = [tuple(w.split("|")[:2]) for w in hs["wilayah"]]
    t, s, c, lihat = {}, {}, {}, set()
    for lat, lon, j, sen, _f, yak, w, tg, *_ in sorted(hs["baris"], key=lambda r: r[2] if isinstance(r[2], (int, float)) else -1e9):
        # tanpa jam yang bisa dipakai: tanggal kalender lama (tg)
        d = hari_lap(acuan + dt.timedelta(hours=j)) if isinstance(j, (int, float)) else tanggal(tg, akhir)
        prov, kab = tabel[w]
        if TU.dihitung(sen, yak) and (d, TU.sel(lat, lon)) not in lihat:
            lihat.add((d, TU.sel(lat, lon)))
            for k in ((), (prov,), (prov, kab)):
                a = t.setdefault(d, {})
                a[k] = a.get(k, 0) + 1
        if sen == "N" and yak >= 1:
            for k in ((), (prov,), (prov, kab)):
                a = s.setdefault(d, {})
                a[k] = a.get(k, 0) + 1
        if sen in ("N", "N20") and yak >= 1:
            sel = (math.floor(lat / SEL), math.floor(lon * math.cos(math.radians(lat)) / SEL))
            for k in ((), (prov,), (prov, kab)):
                c.setdefault(d, {}).setdefault(k, set()).add(sel)
    return acuan, akhir, t, s, c


def seri(t, s, c=None):
    """-> hari terurut, {kunci: {'titik':[], 'luas':[], 'baru':[], 'dampak':[]}}, konteks {hari:int}."""
    c = c or {}
    hari = sorted(set(t) | set(s) | set(c))
    kunci = {k for d in hari for k in list(t.get(d, {})) + list(s.get(d, {})) + list(c.get(d, {}))}
    out = {k: {"titik": [], "luas": [], "baru": [], "dampak": []} for k in kunci}
    for d in hari:
        for k in kunci:
            ha = round(s.get(d, {}).get(k, 0) * HA_TITIK)
            out[k]["titik"].append(t.get(d, {}).get(k, 0))
            out[k]["luas"].append(ha)
            out[k]["baru"].append(ha)
            out[k]["dampak"].append(max(ha, round(len(c.get(d, {}).get(k, ())) * HA_PIKSEL)))
    return hari, out, {d.isoformat(): i for i, d in enumerate(hari)}


def gabung(arsip, hari, out, konteks, tertua):
    """Gabung seri baru dengan arsip lama -> (hari_iso, {kunci_str: seri}, konteks). Aturan: lihat docstring modul/skema."""
    baru_h = [d.isoformat() for d in hari]
    lama_h = (arsip or {}).get("hari") or []
    lama_ctx = (arsip or {}).get("_konteks") or {}
    # tanggal tertua jendela terpotong (FIRMS hanya sebagian hari itu): tanpa versi arsip, tidak dilaporkan
    semua = sorted((set(baru_h) - ({tertua} - set(lama_h))) | set(lama_h))
    if not semua:
        return [], {}, {}
    a, b = dt.date.fromisoformat(semua[0]), dt.date.fromisoformat(semua[-1])
    semua = [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)][-ARSIP_HARI:]
    lama = arsip_seri(arsip)
    ctx = {}
    for d in semua:
        ctx[d] = max(konteks.get(d, -1) if d in baru_h else -1, lama_ctx.get(d, -1))
    hasil = {}
    for k in set(out) | set(lama):
        n, o = out.get(k), lama.get(k)
        r = {"titik": [], "luas": [], "baru": [], "dampak": []}
        for d in semua:
            ada_l = o is not None and d in lama_h
            ada_b = n is not None and d in baru_h
            pakai_lama = ada_l and (not ada_b or d == tertua or d not in baru_h)
            for f in ("titik", "luas"):
                r[f].append(o[f][lama_h.index(d)] if pakai_lama else (n[f][baru_h.index(d)] if ada_b else 0))
            # dampak: arsip sebelum kolom ini ada = None (tidak diketahui), bukan 0
            od = (o.get("dampak") or [None] * len(lama_h))[lama_h.index(d)] if ada_l else None
            r["dampak"].append(od if pakai_lama else (n["dampak"][baru_h.index(d)] if ada_b else (0 if not ada_l else od)))
            if ada_b and konteks.get(d, -1) >= lama_ctx.get(d, -1) or not ada_l:
                r["baru"].append(n["baru"][baru_h.index(d)] if ada_b else 0)
            else:
                r["baru"].append(o["baru"][lama_h.index(d)])
        hasil[k] = r
    return semua, hasil, {d: ctx[d] for d in semua if ctx[d] >= 0}


def arsip_seri(arsip):
    """Arsip lama -> {kunci: seri} dengan kunci sama seperti hitung()."""
    if not arsip:
        return {}
    o = {}
    n = arsip.get("nasional")
    if n:
        o[()] = {f: n.get(f) for f in ("titik", "luas", "baru", "dampak")}
    for p, v in (arsip.get("prov") or {}).items():
        o[(p,)] = {f: v.get(f) for f in ("titik", "luas", "baru", "dampak")}
    for v in arsip.get("kab") or []:
        o[(v["prov"], v["nama"])] = {f: v.get(f) for f in ("titik", "luas", "baru", "dampak")}
    return o


def isi_celah(t, s, ambang=0.15):
    """Porsi titik S-NPP terhadap titik sensor utama (median antarhari). Hari dengan porsi < ambang = celah data S-NPP di
    FIRMS (mis. 13 Okt 2026: 123 titik S-NPP dari 9.029): s hari itu ditaksir titik x porsi, supaya luas tidak anjlok palsu."""
    pr = sorted(s.get(d, {}).get((), 0) / t[d][()] for d in t if t[d].get((), 0) > 0)
    porsi = pr[len(pr) // 2] if pr else 0.4
    taksir = []
    for d in t:
        n = t[d].get((), 0)
        if n and s.get(d, {}).get((), 0) / n < ambang:
            s[d] = {k: v * porsi for k, v in t[d].items()}
            taksir.append(d.isoformat() if hasattr(d, "isoformat") else str(d))
    return porsi, taksir


def konversi_arsip(arsip, porsi):
    """Arsip rumus lama (luas_v < 2: sel x 14,06 ha) -> perkiraan baru. Titik S-NPP hari arsip tidak tersimpan, jadi ditaksir
    titik x porsi S-NPP (porsi nasional di jendela hotspot.json). ponytail: taksiran sekali jalan; hari-hari ini keluar dari
    arsip 90 hari, tidak perlu simpan titik S-NPP per hari di skema."""
    if not arsip or arsip.get("luas_v") == LUAS_V:
        return arsip
    a = json.loads(json.dumps(arsip))
    for v in [a.get("nasional")] + list((a.get("prov") or {}).values()) + list(a.get("kab") or []):
        if v:
            v["luas"] = [round(x * porsi * HA_TITIK) for x in v["titik"]]
            v["baru"] = list(v["luas"])
    return a


def isi_mundur(arsip, h30, porsi):
    """Hari sebelum arsip tertua sampai tanggal 1 bulannya diisi dari harian30.json (titik sensor utama yang sama, per hari WIB);
    luas = titik x porsi S-NPP x HA_TITIK, ditandai taksiran. Arsip lama (belum dikonversi) tetap diserahkan ke konversi_arsip."""
    if not arsip or not arsip.get("hari") or not h30:
        return arsip
    awal = arsip["hari"][0]
    hs = [d for d in h30["hari"] if d[:8] + "01" <= d < awal and d >= awal[:8] + "01"]
    if not hs:
        return arsip
    ix = [h30["hari"].index(d) for d in hs]
    ser = lambda arr: (lambda tt: {"titik": tt, "luas": [round(x * porsi * HA_TITIK) for x in tt], "baru": [round(x * porsi * HA_TITIK) for x in tt]})([arr[i] for i in ix])
    a = json.loads(json.dumps(arsip))
    def sambung(lama, baru):  # baru: seri isi mundur, lama: seri arsip (boleh None)
        n = len(arsip["hari"])
        lama = lama or {"titik": [0] * n, "luas": [0] * n, "baru": [0] * n}
        return {**{f: baru[f] + lama[f] for f in ("titik", "luas", "baru")}, "dampak": [None] * len(hs) + (lama.get("dampak") or [None] * n)}
    nas = [sum(v[i] for v in h30["prov"].values()) for i in range(len(h30["hari"]))]
    a["nasional"] = {**sambung(a.get("nasional"), ser(nas)), "kab": [sum(1 for v in h30["kab"].values() if v[i] > 0) for i in ix] + (a.get("nasional") or {}).get("kab", [0] * len(arsip["hari"]))}
    for p, v in h30["prov"].items():
        a.setdefault("prov", {})[p] = {**(a["prov"].get(p) or {}), **sambung(a["prov"].get(p), ser(v))}
    kab = {(k["prov"], k["nama"]): k for k in a.get("kab") or []}
    for k, v in h30["kab"].items():
        pk = tuple(k.split("|", 1))
        kab[pk] = {**(kab.get(pk) or {"prov": pk[0], "nama": pk[1]}), **sambung(kab.get(pk), ser(v))}
    for k, v in kab.items():
        if len(v["titik"]) == len(arsip["hari"]):   # kab tanpa riwayat harian30: nol di depan
            v.update({f: [0] * len(hs) + v[f] for f in ("titik", "luas", "baru")}, dampak=[None] * len(hs) + (v.get("dampak") or [None] * len(arsip["hari"])))
    a["kab"] = list(kab.values())
    a["hari"] = hs + arsip["hari"]
    a["luas_taksir"] = sorted(set(hs) | set(arsip.get("luas_taksir") or []))
    a["_isi_mundur"] = hs
    return a


def titik_semua(tt, hari_iso, titik_nas, tahun):
    """Titik semua satelit per bulan sejak 1 Jan: titik_tahun.json untuk hari sebelum arsip harian, baris harian sesudahnya
    (jadi Grand total = titik sebelum arsip + jumlah baris harian). None bila ada hari yang tidak tertutup keduanya."""
    if not tt or tt.get("tahun") != tahun or not hari_iso:
        return None
    awal, bln = dt.date(int(tahun), 1, 1), [0] * 12
    for i, n in enumerate(tt["harian"]):
        d = awal + dt.timedelta(days=i)
        if d.isoformat() < hari_iso[0]:
            bln[d.month - 1] += n
    if max(awal.isoformat(), hari_iso[0]) > (dt.date.fromisoformat(tt["sd"]) + dt.timedelta(days=1)).isoformat():
        return None   # celah antara titik_tahun.json dan arsip harian
    for d, n in zip(hari_iso, titik_nas):
        if d.startswith(tahun):
            bln[int(d[5:7]) - 1] += n
    return bln


def tahun_berjalan(sejarah, hari_iso, luas_nas, tahun, tt=None, titik_nas=()):
    """Perkiraan luas terbakar sejak 1 Jan: titik S-NPP sejarah.json (s.d. sehari sebelum dibuat) x HA_TITIK + luas harian
    laporan sesudahnya. None bila sejarah tidak memuat tahun ini."""
    if not sejarah or tahun not in sejarah.get("tahun", []):
        return None
    batas = (dt.date.fromisoformat(sejarah["dibuat"][:10]) - dt.timedelta(days=1)).isoformat()
    bln = [sum((v.get(tahun) or [0] * 12)[m] for v in sejarah["prov"].values()) * HA_TITIK for m in range(12)]
    for d, l in zip(hari_iso, luas_nas):   # hari sesudah batas sejarah: dari luas harian laporan
        if batas < d and d.startswith(tahun):
            bln[int(d[5:7]) - 1] += l
    ha = sum(bln)
    akhir = hari_iso[-1] if hari_iso else batas
    nama = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Okt–Des"]
    # triwulan yang sudah dimulai; bulan_kosong = bulan tanpa titik di sejarah.json (celah S-NPP 28 Apr-2 Jun 2026 sudah diisi NOAA-20)
    aktif = lambda q: sum(1 for v in sejarah["prov"].values() if sum((v.get(tahun) or [0] * 12)[3 * q:3 * q + 3]) > 0)
    # titik semua satelit (sama dengan baris harian); prov_aktif dari titik_tahun.json bila ada
    sm = titik_semua(tt, hari_iso, titik_nas, tahun)
    if sm:
        aktif = lambda q: sum(1 for v in tt["prov"].values() if sum(v[3 * q:3 * q + 3]) > 0)
    tw = [{"nama": nama[q], "ha": round(sum(bln[3 * q:3 * q + 3])), "titik_snpp": round(sum(bln[3 * q:3 * q + 3]) / HA_TITIK),
           **({"titik": sum(sm[3 * q:3 * q + 3])} if sm else {}), "prov_aktif": aktif(q), "bulan_kosong": [BULAN[m] for m in range(3 * q, 3 * q + 3) if bln[m] == 0 and m < int(akhir[5:7]) - 1]}
          for q in range(4) if 3 * q < int(akhir[5:7])]
    return {"ha": round(ha), **({"titik": sum(sm)} if sm else {}), "rendah": round(ha / HA_TITIK * HA_RENDAH), "tinggi": round(ha / HA_TITIK * HA_TINGGI),
            "ha_titik": HA_TITIK, "ha_titik_rendah": HA_RENDAH, "ha_titik_tinggi": HA_TINGGI, "sd": akhir, "triwulan": tw}


def kompleks(kl):
    """kluster.json -> {kunci: [jumlah, luas, level, fwi_maks]} untuk (prov,) dan (prov,kab)."""
    r = {}
    for f in (kl or {}).get("features") or []:
        q = f["properties"]
        for k in ((q["prov"],), (q["prov"], q["kab"])):
            x = r.setdefault(k, [0, 0.0, 0, None])
            x[0] += 1
            x[1] += q.get("luas") or 0
            x[2] = max(x[2], q.get("level") or 0)
            if q.get("fwi") is not None:
                x[3] = q["fwi"] if x[3] is None else max(x[3], q["fwi"])
    return r


SIPONGI_MULAI = {"93": "2023", "94": "2023", "95": "2023", "96": "2023"}   # provinsi pemekaran: SiPongi mengisi 0,0 sebelum ada; Papua lama utuh di kode 91
GABUNG = {"64": ["64", "65"], "91": ["91", "93", "94", "95"], "92": ["92", "96"]}   # GWIS: kunci "64", "91+93+94+95", "92+96"


def luas_banding(sejarah, sat, resmi, tb, hari_iso, prov, tahun):
    """Tiga sumber luas terbakar berdampingan per tahun (2018-tahun berjalan), nasional dan per provinsi. Hilang = None, bukan 0.
    perkiraan = titik S-NPP sejarah.json x HA_TITIK (tahun berjalan: tahun_berjalan + luas harian laporan per provinsi);
    gwis = luas_satelit.json (nilai gabungan tersimpan di kode pertama grup, anggota lain None); sipongi = luas_resmi.json."""
    ths = [str(y) for y in range(2018, int(tahun) + 1)]
    jml = lambda d: None if not d or all(v is None for v in d.values()) else round(sum(v for v in d.values() if v is not None))
    # perkiraan
    pk, pk_p, sd_pk = {}, {}, {}
    sj = sejarah or {}
    batas = (dt.date.fromisoformat(sj["dibuat"][:10]) - dt.timedelta(days=1)).isoformat() if sj.get("dibuat") else None
    for y in ths:
        if y not in sj.get("tahun", []):
            continue
        for p, v in sj["prov"].items():
            if y in v:
                pk_p.setdefault(p, {})[y] = round(sum(v[y]) * HA_TITIK)
        if y != tahun:
            pk[y] = round(sum(sum(v.get(y) or [0]) for v in sj["prov"].values()) * HA_TITIK)
    if tb:
        pk[tahun], sd_pk[tahun] = tb["ha"], tb["sd"]
        for p, v in prov.items():   # harian laporan sesudah batas sejarah.json
            tambah = sum(l for d, l in zip(hari_iso, v["luas"]) if batas and batas < d and d.startswith(tahun))
            if tahun in pk_p.get(p, {}) or tambah:
                pk_p.setdefault(p, {})[tahun] = round(pk_p.get(p, {}).get(tahun, 0) + tambah)
    # gwis
    gw, gw_p, sd_gw = {}, {}, dict((sat or {}).get("sampai") or {})
    for k, arr in ((sat or {}).get("ha") or {}).items():
        lead = k.split("+")[0]
        for i, y in enumerate(sat["tahun"]):
            if y in ths:
                gw_p.setdefault(lead, {})[y] = arr[i]
    for y in ths:
        if sat and y in sat["tahun"]:
            gw[y] = round(sum(v[y] for v in gw_p.values() if y in v))
    # sipongi
    sp, sp_p = {}, {}
    for p, arr in ((resmi or {}).get("ha") or {}).items():
        for i, y in enumerate(resmi["tahun"]):
            if y in ths:
                sp_p.setdefault(p, {})[y] = None if y < SIPONGI_MULAI.get(p, "0") else arr[i]
    for y in ths:
        if resmi and y in resmi["tahun"]:
            sp[y] = round(sum(v[y] for v in sp_p.values() if v.get(y) is not None))
    isi = lambda d: {y: d.get(y) for y in ths}   # tahun tanpa data = None
    kodep = sorted(set(pk_p) | set(gw_p) | set(sp_p))
    return {
        "tahun": ths,
        "sumber": [
            {"kode": "perkiraan", "nama": "Perkiraan satelit (titik VIIRS S-NPP × 4,3 ha)",
             "metode": "Titik VIIRS S-NPP keyakinan sedang/tinggi per tahun × 4,3 ha per titik (median ha resmi per titik 2015–2025). Tahun berjalan: sejarah.json + perkiraan harian laporan. Bukan pengukuran citra; kuartil 3,2–4,6 ha per titik. 37 hari (11 Mar–2 Jun 2026) tanpa data S-NPP diisi NOAA-20 x 0,978. Faktor 4,3 ha dikalibrasi dari SiPongi 2015–2025, jadi perbandingan dengan SiPongi TIDAK independen; pembanding independen adalah GWIS.",
             "ha": isi(pk), "sd": sd_pk},
            {"kode": "gwis", "nama": "GWIS MODIS MCD64A1 (EU JRC)",
             "metode": "Luas bekas bakar dari citra MODIS MCD64A1 C6.1 (resolusi 500 m), GWIS Country Profile per provinsi (GADM 3.6). 2025 terisi s.d. November; Desember belum diproses GWIS. Tahun berjalan belum dirilis (None).",
             "catatan": "Kaltara (65) dihitung di Kaltim (64); Papua lama (91+93+94+95) dan Papua Barat lama (92+96) tak dipisah: nilai gabungan ada di kode pertama grup (64, 91, 92), anggota lain None. Lihat 'gabung'.",
             "ha": isi(gw), "sd": {y: v for y, v in sd_gw.items() if y in ths}},
            {"kode": "sipongi", "nama": "KLHK SiPongi (indikasi luas)",
             "metode": "Indikasi luas kebakaran per provinsi dari titik panas + verifikasi KLHK (bukan citra). 2026 baru s.d. Juli. Provinsi pemekaran Papua (93–96) None sebelum 2023 (SiPongi mengisi 0,0); Papua lama utuh di kode 91.",
             "ha": isi(sp), "sd": {y: v for y, v in ((resmi or {}).get("sampai") or {}).items() if y in ths}},
        ],
        "gabung": GABUNG,
        "prov": {p: {"perkiraan": isi(pk_p.get(p, {})), "gwis": isi(gw_p.get(p, {})), "sipongi": isi(sp_p.get(p, {}))} for p in kodep},
    }


def build(hs, kl, meta, luas_resmi, operasi, arsip, sekarang=None, sejarah=None, h30=None, titik_tahun=None, luas_sat=None):
    acuan, akhir, t, s, c = hitung(hs)
    porsi, taksir = isi_celah(t, s)
    hari, out, konteks = seri(t, s, c)
    arsip = isi_mundur(konversi_arsip(arsip, porsi), h30, porsi)
    dibuat = sekarang or (dt.datetime.fromisoformat(meta["dibuat"]) if meta and meta.get("dibuat") else dt.datetime.now(WIB))
    if dibuat.tzinfo is None:
        dibuat = dibuat.replace(tzinfo=WIB)
    lengkap, berjalan = hari_status(dibuat, akhir)
    hari_iso, ser, ctx = gabung(arsip, hari, out, konteks, hari[0].isoformat() if hari else None)
    kp = kompleks(kl)
    nama_prov = (meta or {}).get("provinsi") or {}
    tahun = str(akhir.year)

    def nol():
        return {"titik": [0] * len(hari_iso), "luas": [0] * len(hari_iso), "baru": [0] * len(hari_iso), "dampak": [0] * len(hari_iso)}

    nas = dict(ser.get((), nol()))
    kabs = [k for k in ser if len(k) == 2]
    nas["kab"] = [sum(1 for k in kabs if ser[k]["titik"][i] > 0) for i in range(len(hari_iso))]
    prov = {}
    for k in sorted(k for k in ser if len(k) == 1):
        v = kp.get(k, [0, 0, 0, None])
        if sum(ser[k]["titik"]) == 0 and sum(ser[k]["luas"]) == 0 and not v[0]:
            continue
        p = k[0]
        ha, sd = None, None
        if luas_resmi and tahun in luas_resmi.get("tahun", []) and p in luas_resmi.get("ha", {}):
            ha, sd = luas_resmi["ha"][p][luas_resmi["tahun"].index(tahun)], luas_resmi.get("sampai", {}).get(tahun)
        prov[p] = {"nama": nama_prov.get(p, p), **ser[k], "kompleks": v[0], "luas_kompleks": round(v[1]), "level": v[2],
                   "sipongi_ha": ha, "sipongi_sd": sd,
                   "padam_ha": ((operasi or {}).get("dipadamkan_ha") or {}).get(p)}
    kab = []
    for k in sorted(kabs, key=lambda k: -sum(ser[k]["titik"])):
        v = kp.get(k, [0, 0, 0, None])
        if sum(ser[k]["titik"]) == 0 and sum(ser[k]["luas"]) == 0 and not v[0]:
            continue
        kab.append({"prov": k[0], "nama": k[1], **ser[k], "kompleks": v[0], "luas_kompleks": round(v[1]), "level": v[2], "fwi_maks": None if v[3] is None else round(v[3])})
    per = dt.date.fromisoformat(operasi["per"]) if operasi and operasi.get("per") else None
    bn = f"Rekap BNPB operasi karhutla {akhir.year} s.d. {per.day} {BULAN[per.month - 1]} {per.year}, belum diverifikasi ke dokumen resmi BNPB" if per else None
    tb = tahun_berjalan(sejarah, hari_iso, nas["luas"], tahun, titik_tahun, nas["titik"])
    return {
        "dibuat": dibuat.astimezone(WIB).isoformat(timespec="minutes"),
        "cutoff": acuan.isoformat(timespec="minutes"),
        "hari_lengkap": lengkap.isoformat(),
        "hari_berjalan": berjalan.isoformat() if berjalan else None,
        "bnpb_sd": per.isoformat() if per else None,
        "awal_arsip": hari_iso[0] if hari_iso else None,
        "jadwal": {"tutup": "16.00 WIB", "pembaruan": "tiap 3 jam"},
        "luas_v": LUAS_V,
        "luas_taksir": sorted(set(taksir) | set(d for d in hari_iso if d in ((arsip or {}).get("luas_taksir") or []))
                              | (set(hari_iso) - {x.isoformat() for x in hari} if (arsip or {}).get("luas_v") != LUAS_V else set())),
        "tahun_berjalan": tb,
        "luas_banding": luas_banding(sejarah, luas_sat, luas_resmi, tb, hari_iso, prov, tahun),
        "sumber": {
            "titik": "NASA FIRMS NRT: MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20",
            "dampak": "Luas terdampak: sel 375 m (1 piksel VIIRS, 14,06 ha) yang memuat titik VIIRS S-NPP/NOAA-20 keyakinan sedang/tinggi hari itu; memuat lahan belum terbakar di piksel yang sama, jadi selalu lebih luas dari luas terbakar; harian, tidak dijumlahkan",
            "luas": "Perkiraan: titik VIIRS S-NPP (NASA FIRMS) × 4,3 ha, dikalibrasi ke luas terbakar resmi tahunan 2015–2025 (SiPongi KLHK); kuartil 3,2–4,6 ha per titik; uji balik tahunan meleset sampai +101%/−35%; angka harian dan per wilayah indikatif; bukan pengukuran citra",
            "kompleks": "Kejadian api: titik VIIRS yang berdekatan (1,5 km, 7 hari); status dihitung dari aturan Centurisk97",
            "wilayah": "Badan Informasi Geospasial (BIG), batas wilayah administrasi edisi Juni 2026",
            "sipongi": "KLHK SiPongi, indikasi luas kebakaran per provinsi",
            "bnpb": bn,
            "fwi": "Fire Weather Index (FWI) Kanada dari cuaca Open-Meteo (ERA5 dan prakiraan), nilai tertinggi kejadian api di wilayah itu",
        },
        "hari": hari_iso,
        "nasional": nas,
        "prov": prov,
        "kab": kab,
        "_konteks": ctx,
    }


def main():
    hs = baca("hotspot.json")
    if not hs:
        sys.exit("hotspot.json tidak ada")
    lap = build(hs, baca("kluster.json"), baca("meta.json"), baca("luas_resmi.json"), baca("operasi_resmi.json"), baca("laporan.json"),
                sejarah=baca("sejarah.json"), h30=baca("harian30.json"), titik_tahun=baca("titik_tahun.json"), luas_sat=baca("luas_satelit.json"))
    jalur = os.path.join(DATA, "laporan.json")
    with open(jalur, "w") as f:
        json.dump(lap, f, ensure_ascii=False, separators=(",", ":"))
    n = lap["nasional"]
    gagal = None   # kurva musim memakai hari arsip yang sama; laporan.json tetap ditulis, tapi keluar != 0 supaya CI menampilkan peringatan
    try:
        import musim_harian
        m = musim_harian.perbarui(lap)
        if m is None:
            gagal = "musim_harian.json dasar tidak ada (tidak ada di repo/cache)"
        else:
            print(f"musim_harian.json: {os.path.getsize(musim_harian.JALUR)} byte, sd {m['sd']}")
    except Exception as e:
        gagal = repr(e)
    print(f"laporan.json: {os.path.getsize(jalur)} byte, {len(lap['hari'])} hari, {len(lap['prov'])} prov, {len(lap['kab'])} kab, lengkap {lap['hari_lengkap']}")
    try:   # panel presiden dibangun dari berkas yang baru ditulis; gagalnya tidak menahan laporan
        import presiden
        presiden.main()
    except Exception as e:
        print(f"peringatan: panel presiden gagal: {e!r}", file=sys.stderr)
    if gagal:
        sys.exit(f"musim_harian.json TIDAK diperbarui: {gagal}")


def uji():
    # (b) perkiraan luas pada data sintetis: 3 hari, jendela terpotong
    acuan = "2026-01-02T08:30:00+00:00"  # 15.30 WIB 2 Jan = masih hari laporan 2 Jan; deteksi 10.00 WIB tiap hari; 12-31 membuktikan pergantian tahun
    L = lambda la, lo: (la, lo)
    JAM = {"12-31": -53.5, "01-01": -29.5, "01-02": -5.5}   # jam relatif acuan untuk 10.00 WIB tiap hari
    b = lambda p, sen, yak, w, tg: [p[0], p[1], JAM[tg], sen, 1.0, yak, w, tg]
    hs = {"acuan": acuan, "sensor_utama": ["M", "N", "N20", "N21"], "wilayah": ["14|A|x", "14|B|y"],
          "baris": [b(L(0.5, 101.5), "N", 1, 0, "12-31"), b(L(0.5, 101.5), "N", 1, 0, "12-31"),  # 2 titik S-NPP = 2 x 4,3 ha, tapi SATU lokasi
                    b(L(0.5, 101.52), "N21", 2, 0, "12-31"),                                    # N21 di sel lain (~2,2 km): lokasi kedua, bukan luas
                    b(L(0.5, 101.5), "N", 1, 0, "01-01"),
                    b(L(0.7, 101.7), "M", 2, 1, "01-02"), b(L(0.8, 101.8), "N", 0, 1, "01-02"),  # M: titik tanpa luas; yak 0: bukan titik, bukan luas
                    b(L(0.9, 101.9), "N20", 1, 1, "01-02"), b(L(0.9, 101.9), "N21", 1, 1, "01-02")]}  # N21 sel sama dengan N20: dobel, sekali
    acu, akhir, t, s, c = hitung(hs)
    assert akhir == dt.date(2026, 1, 2) and dt.date(2025, 12, 31) in t, (akhir, list(t))
    hari, o, ctx = seri(t, s, c)
    # dampak: 12-31 dua titik S-NPP satu piksel -> 1 sel x 14,06; 01-02 N20 satu sel, N yak 0 tidak dihitung
    assert o[()]["dampak"] == [14, 14, 14], o[()]["dampak"]
    assert all(d >= l for d, l in zip(o[()]["dampak"], o[()]["luas"]))
    assert [d.isoformat() for d in hari] == ["2025-12-31", "2026-01-01", "2026-01-02"]
    assert o[()]["titik"] == [2, 1, 2], o[()]   # N yak 0 (keyakinan rendah) DITOLAK
    assert o[()]["luas"] == [9, 4, 0], o[()]["luas"]  # 2 / 1 / 0 titik S-NPP keyakinan >= 1, x 4,3 ha
    assert o[()]["baru"] == o[()]["luas"], o[()]["baru"]
    # celah S-NPP: hari tanpa titik S-NPP padahal sensor lain mencatat -> ditaksir titik x porsi median
    tc, sc = {1: {(): 10}, 2: {(): 10}, 3: {(): 10}}, {1: {(): 5}, 2: {(): 5}, 3: {(): 0}}
    assert isi_celah(tc, sc) == (0.5, ["3"]) and sc[3][()] == 5.0, sc
    assert o[("14", "A")]["titik"] == [2, 1, 0] and o[("14", "B")]["titik"] == [0, 0, 2]
    # arsip: tanggal tertua memakai arsip; konteks menahan baru lama bila lebih kaya
    meta = {"dibuat": "2026-01-02T21:45+07:00", "provinsi": {"14": "Riau"}}
    arsip = {"hari": ["2025-12-30", "2025-12-31"], "nasional": {"titik": [5, 9], "luas": [70, 99], "baru": [70, 56]}, "prov": {}, "kab": [],
             "_konteks": {"2025-12-30": 3, "2025-12-31": 3}}
    lap = build(hs, None, meta, None, None, arsip)
    assert lap["hari"] == ["2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02"], lap["hari"]
    n = lap["nasional"]
    # porsi median S-NPP = 1 (2/2, 1/1, 0/3); 01-02 tanpa S-NPP = celah -> 3 x 1 x 4,3. Arsip lama dikonversi titik x 1 x 4,3
    assert n["titik"] == [5, 9, 1, 2] and n["luas"] == [22, 39, 4, 9], n  # tertua jendela (12-31) dari arsip
    assert n["baru"] == n["luas"], n
    assert n["dampak"][:2] == [None, None] and n["dampak"][2:] == [14, 14], n["dampak"]   # arsip tanpa kolom dampak = None
    assert lap["luas_v"] == LUAS_V and konversi_arsip(lap, 0.1) is lap  # arsip baru tidak dikonversi ulang
    assert lap["awal_arsip"] == "2025-12-30" and n["kab"][2] == 1 and lap["prov"]["14"]["nama"] == "Riau"
    # arsip kosong: semua dari jendela
    lap0 = build(hs, None, meta, None, None, None)
    assert lap0["hari"] == ["2026-01-01", "2026-01-02"] and lap0["nasional"]["titik"] == [1, 2], lap0["nasional"]  # tertua terpotong dibuang
    # tahun berjalan: sejarah s.d. sehari sebelum dibuat + luas harian sesudahnya
    sj = {"tahun": ["2026"], "dibuat": "2026-01-02", "prov": {"14": {"2026": [10000] + [0] * 11}}}
    tb = tahun_berjalan(sj, ["2025-12-31", "2026-01-01", "2026-01-02"], [9, 4, 7], "2026")
    assert tb["ha"] == round(10000 * HA_TITIK + 7) and tb["rendah"] < tb["ha"] < tb["tinggi"], tb
    assert tb["triwulan"] == [{"nama": "Jan–Mar", "ha": tb["ha"], "titik_snpp": 10002, "prov_aktif": 1, "bulan_kosong": []}], tb["triwulan"]
    assert tahun_berjalan(None, [], [], "2026") is None
    # titik semua satelit: titik_tahun.json sebelum arsip harian (02-01 dst.), baris harian sesudahnya; celah -> None
    tt = {"tahun": "2026", "sd": "2026-01-02", "harian": [3, 4], "prov": {"14": [7] + [0] * 11}}
    tb = tahun_berjalan(sj, ["2026-01-02", "2026-01-03"], [4, 7], "2026", tt, [5, 6])
    assert tb["titik"] == 3 + 5 + 6 and tb["triwulan"][0]["titik"] == 14 and tb["triwulan"][0]["prov_aktif"] == 1, tb
    assert "titik" not in tahun_berjalan(sj, ["2026-01-05"], [4], "2026", tt, [5])
    # (c) hari lengkap / berjalan di sekitar 16:00 WIB
    d = dt.date(2026, 10, 12)
    ja = lambda h, m: dt.datetime(2026, 10, 12, h, m, tzinfo=WIB)
    assert hari_status(ja(15, 59), d) == (dt.date(2026, 10, 11), d)
    assert hari_status(ja(16, 0), d) == (d, None)
    assert hari_status(ja(21, 45), d) == (d, None)
    assert hari_status(ja(3, 0) + dt.timedelta(days=1), d) == (d, None)  # data basi tetap menutup hari akhir
    assert tanggal("12-31", dt.date(2026, 1, 2)) == dt.date(2025, 12, 31) and tanggal("01-02", dt.date(2026, 1, 2)) == dt.date(2026, 1, 2)
    # batas 16.00 WIB: 15.59 -> D, 16.00 -> D (batas atas masuk), 16.01 -> D+1; pergantian tahun; acuan setelah 16.00 = hari berjalan D+1
    ac = dt.datetime(2026, 1, 1, 17, 0, tzinfo=WIB)
    jm = lambda t: round((t - ac).total_seconds() / 3600, 2)
    wk = lambda *a: dt.datetime(*a, tzinfo=WIB)
    sel_ke = iter(range(100))   # tiap baris di sel sendiri: yang diuji batas jendela, bukan lokasi unik
    bb = lambda t, tg: [0.5 + next(sel_ke) * 0.01, 101.5, jm(t), "M", 1.0, 1, 0, tg]
    hb = {"acuan": ac.isoformat(), "wilayah": ["14|A|x"], "baris": [
        bb(wk(2025, 12, 31, 15, 59), "12-31"), bb(wk(2025, 12, 31, 16, 0), "12-31"), bb(wk(2025, 12, 31, 16, 1), "12-31"),
        bb(wk(2026, 1, 1, 15, 59), "01-01"), bb(wk(2026, 1, 1, 16, 1), "01-01"), bb(wk(2025, 12, 31, 0, 5), "12-31")]}
    _, akh, tb_, _, _ = hitung(hb)
    assert akh == dt.date(2026, 1, 2), akh
    assert {k: v[()] for k, v in tb_.items()} == {dt.date(2025, 12, 31): 3, dt.date(2026, 1, 1): 2, dt.date(2026, 1, 2): 1}, tb_
    hb["baris"].append([0.9, 101.5, None, "M", 1.0, 1, 0, "12-31"])   # tanpa jam: jatuh ke tanggal kalender tg
    assert hitung(hb)[2][dt.date(2025, 12, 31)][()] == 4
    hb["baris"].append([0.9, 101.5, None, "N21", 1.0, 2, 0, "12-31"])   # sel yang sama, hari laporan sama: tidak menambah
    assert hitung(hb)[2][dt.date(2025, 12, 31)][()] == 4
    # (a) tidak lagi dibandingkan dengan wilayah.json harian: itu hari kalender, laporan memakai jendela s.d. 16.00 WIB.
    #     Gantinya: jumlah titik semua hari laporan == jumlah pasangan (hari laporan, sel) berbeda di hotspot.json (tak ada lokasi hilang/ganda)
    hl = baca("hotspot.json")
    if hl:
        acu_l, akh_l, tt, _, _ = hitung(hl)
        n = len({(hari_lap(acu_l + dt.timedelta(hours=r[2])) if isinstance(r[2], (int, float)) else tanggal(r[7], akh_l), TU.sel(r[0], r[1]))
                 for r in hl["baris"] if TU.dihitung(r[3], r[5])})
        assert sum(v.get((), 0) for v in tt.values()) == n, (sum(v.get((), 0) for v in tt.values()), n)
    # luas_banding: sumber tanpa data suatu tahun = None (bukan 0); GWIS digabung di kode pertama grup
    sj2 = {"tahun": ["2025", "2026"], "dibuat": "2026-01-02", "prov": {"14": {"2025": [100] + [0] * 11, "2026": [10] + [0] * 11}}}
    tb2 = tahun_berjalan(sj2, ["2026-01-02"], [7], "2026")
    sat = {"tahun": ["2025"], "sampai": {"2025": "2025-11"}, "ha": {"14": [50], "64": [30], "91+93+94+95": [0]}}
    res = {"tahun": ["2025", "2026"], "sampai": {"2026": "2026-07"}, "ha": {"14": [80.0, 5.0], "65": [0.0, 1.0]}}
    lb = luas_banding(sj2, sat, res, tb2, ["2026-01-02"], {"14": {"luas": [7]}}, "2026")
    src = {x["kode"]: x for x in lb["sumber"]}
    assert lb["tahun"][0] == "2018" and lb["tahun"][-1] == "2026"
    assert src["gwis"]["ha"]["2026"] is None and src["gwis"]["ha"]["2025"] == 80 and src["gwis"]["ha"]["2018"] is None, src["gwis"]["ha"]
    assert src["perkiraan"]["ha"]["2018"] is None and src["perkiraan"]["ha"]["2025"] == round(100 * HA_TITIK), src["perkiraan"]["ha"]
    assert src["perkiraan"]["ha"]["2026"] == tb2["ha"] and src["perkiraan"]["sd"]["2026"] == tb2["sd"]
    assert src["sipongi"]["ha"]["2026"] == 6 and src["sipongi"]["sd"] == {"2026": "2026-07"} and src["sipongi"]["ha"]["2019"] is None
    assert lb["prov"]["91"]["gwis"]["2025"] == 0 and lb["prov"]["65"]["gwis"]["2025"] is None and lb["prov"]["14"]["gwis"]["2026"] is None
    assert lb["prov"]["14"]["perkiraan"]["2026"] == round(10 * HA_TITIK + 7), lb["prov"]["14"]["perkiraan"]
    for x in lb["sumber"]:   # 0 hanya bila sumbernya memang memuat tahun itu
        for y, v in x["ha"].items():
            assert v != 0 or (y in {"gwis": ["2025"], "sipongi": ["2025", "2026"], "perkiraan": ["2025", "2026"]}[x["kode"]]), f"{x['kode']} {y}: 0 untuk data hilang"
    assert lb["prov"]["14"]["sipongi"]["2025"] == 80.0
    res2 = {"tahun": ["2022", "2023"], "ha": {"93": [0.0, 150.0], "91": [0.0, 9.0], "96": [0.0, 5.0]}}
    lb2 = luas_banding(sj2, None, res2, None, [], {}, "2026")
    assert lb2["prov"]["93"]["sipongi"]["2022"] is None and lb2["prov"]["96"]["sipongi"]["2022"] is None, "pemekaran 2022 harus None, bukan 0,0"
    assert lb2["prov"]["93"]["sipongi"]["2023"] == 150.0 and lb2["prov"]["91"]["sipongi"]["2022"] == 0.0   # 0 asli provinsi lama tetap 0
    r = baca("laporan.json")
    if r and r.get("luas_banding"):
        for k in SIPONGI_MULAI:
            for y, v in r["luas_banding"]["prov"].get(k, {}).get("sipongi", {}).items():
                assert (v is None) == (y < SIPONGI_MULAI[k]), f"sipongi {k} {y}: {v}"   # berkas nyata: tahun di luar cakupan sumber tidak boleh 0
        rb = {x["kode"]: x for x in r["luas_banding"]["sumber"]}
        lsat, lres = baca("luas_satelit.json"), baca("luas_resmi.json")
        for y, v in rb["gwis"]["ha"].items():
            assert (v is None) == (y not in lsat["tahun"]), f"gwis {y}: {v}, tahun GWIS {lsat['tahun'][-1]}"
        for y, v in rb["sipongi"]["ha"].items():
            assert (v is None) == (y not in lres["tahun"]), f"sipongi {y}: {v}"
    import musim_harian
    musim_harian.uji()
    print("laporan uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
