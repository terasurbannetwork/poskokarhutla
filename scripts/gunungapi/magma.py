"""Gunung api Indonesia dari MAGMA Indonesia (PVMBG, Badan Geologi ESDM): level resmi, radius rekomendasi, letusan terbaru.

Diperiksa live 16 Okt 2026 (tidak ada API terbuka; yang ada halaman HTML publik):
  /v1/gunung-api/tingkat-aktivitas   daftar gunung per level (I Normal .. IV Awas) + tautan laporan bertanda tangan
  /v1/gunung-api/laporan/<id>?sig=   laporan harian: koordinat, ketinggian, rekomendasi (radius km)
  /v1/gunung-api/informasi-letusan   daftar letusan terbaru (waktu, gunung, ketinggian kolom abu)
Smithsonian GVP menjawab 403 dari luar peramban dan GDACS hanya memuat gunung berstatus kejadian (sedikit, banyak di luar negeri),
jadi dua-duanya tidak dipakai di sini. KRB (peta kawasan rawan bencana) hanya berupa unduhan gambar tanpa lisensi jelas: dibuang.

Keluaran: public/banjir/data/gunungapi_status.json. Katalog koordinat statis: public/gunungapi/data/gunung.json (di-commit; gunung baru
ditambahkan otomatis dari laporan hariannya). Level I Normal tidak punya cincin radius (laporannya tidak diambil).
Tambahan 10 Nov 2026: endpoint JSON bersesi (GET /v1 -> cookie + csrf + URL /v1/json/var?signature; POST ga_code=KODE) memberi kegempaan 24 jam,
visual, klimatologi, rekomendasi, VONA; grafik 90 hari dari /v1/json/highcharts (URL bertanda tangan dibaca dari halaman laporan, id laporan di body).
Signature dan token dibaca ulang tiap jalan, TIDAK ditulis ke repo. Jeda antar permintaan >= 1 detik. JSON gagal: jalur HTML lama tetap jalan dan kegagalan dicatat di status.json_gagal.
Keluaran permanen (append-only, di-commit workflow, di luar cache): public/gunungapi/data/kegempaan.json, catatan/<KODE>.jsonl, perubahan_level.json.

Pemakaian:  python3 scripts/gunungapi/magma.py [uji | cepat]     cepat = hanya level, letusan, VONA (tanpa grafik, tanpa rantai abu/laporan)
"""
import datetime as dt, html, http.cookiejar, json, math, os, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASIS = "https://magma.esdm.go.id"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
KELUAR = os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")
KATALOG = os.path.join(AKAR, "public/gunungapi/data/gunung.json")
KEGEMPAAN = os.path.join(AKAR, "public/gunungapi/data/kegempaan.json")
CATATAN = os.path.join(AKAR, "public/gunungapi/data/catatan")
PERUBAHAN = os.path.join(AKAR, "public/gunungapi/data/perubahan_level.json")
WIB = dt.timezone(dt.timedelta(hours=7))
JEDA = 1.1   # detik antar permintaan ke MAGMA
# jenis gempa: kunci -> (nama MAGMA, label); urutan = urutan larik harian di kegempaan.json
JENIS = [("letusan", "Letusan/Erupsi"), ("hembusan", "Hembusan"), ("harmonik", "Harmonik"), ("tremor_menerus", "Tremor Menerus"), ("tremor_non_harmonik", "Tremor Non-Harmonik"),
         ("low_frequency", "Low Frequency"), ("hybrid", "Hybrid/Fase Banyak"), ("vulkanik_dangkal", "Vulkanik Dangkal"), ("vulkanik_dalam", "Vulkanik Dalam"), ("tektonik_lokal", "Tektonik Lokal"), ("tektonik_jauh", "Tektonik Jauh")]
KUNCI_JENIS = {re.sub(r"[^a-z]", "", n.lower()): k for k, n in JENIS}
ARAH_EN = {"north": "utara", "northeast": "timur laut", "east": "timur", "southeast": "tenggara", "south": "selatan", "southwest": "barat daya", "west": "barat", "northwest": "barat laut"}
ZONA = {"WIB": 7, "WITA": 8, "WIT": 9}
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}


MAKS_HTML = 5_000_000


def ambil(jalur, coba=3):
    url = jalur if jalur.startswith("http") else BASIS + jalur
    if urllib.parse.urlparse(url).hostname != urllib.parse.urlparse(BASIS).hostname:
        raise RuntimeError(f"tolak host di luar MAGMA: {url[:80]}")   # href hasil scrape tidak boleh membawa runner ke host lain
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "id"})
            with urllib.request.build_opener(TolakRedirectLuar).open(req, timeout=40) as r:
                isi = r.read(MAKS_HTML + 1)
                if len(isi) > MAKS_HTML:
                    raise RuntimeError("halaman melebihi 5 MB")
                return isi.decode("utf-8", "replace")
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{jalur[:80]}: {e}")
            time.sleep(5 * (i + 1))


def teks(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def angka(s):
    return float(s.replace(",", "."))


def urai_tingkat(h):
    """Halaman tingkat aktivitas -> [{nama, prov, level, laporan}]. Tiap kelompok level dibuka judul 'Level IV (Awas)' dst;
    baris gunung: 'Nama - Provinsi[, Provinsi] <a href=laporan>'."""
    out = []
    for b in re.split(r'<a href="" class="tx-inverse tx-14 tx-medium d-block">Level ', h)[1:]:
        lv = {"IV": 4, "III": 3, "II": 2, "I": 1}[b.split(" ")[0]]
        for m in re.finditer(r"<td>\s*([^<]+?)\s*<a href=\"([^\"]+)\"", b):
            nama, _, prov = html.unescape(m.group(1)).partition(" - ")
            out.append({"nama": nama.strip(), "prov": prov.strip(), "level": lv, "laporan": html.unescape(m.group(2))})
    return out


def urai_laporan(h):
    """Laporan harian -> koordinat, ketinggian, radius rekomendasi (km), jarak sektor (km), periode. Yang tak ditemukan tidak diisi."""
    t = teks(h[h.find("slim-mainpanel"):])
    o = {}
    m = re.search(r"Latitude (-?[\d.,]+)°\s*(LU|LS)?,?\s*Longitude (-?[\d.,]+)°\s*(BT|BB)?\s*dan memiliki ketinggian (-?\d+)", t)
    if m:
        lat, lon = angka(m.group(1)), angka(m.group(3))
        if m.group(2) == "LS" and lat > 0:  # MAGMA menulis tanda minus untuk selatan ('-8.108°LU'); 'LS' tanpa minus dibalik
            lat = -lat
        o.update(lat=lat, lon=lon, tinggi=int(m.group(5)))
    r = t.find("Rekomendasi", t.find("Pengamatan Kegempaan"))
    o.update(urai_rek(t[r:t.find("Copyright", r)] if r >= 0 else ""))
    m = re.search(r"Laporan Aktivitas Gunung Api - [^,]+, ([^,]+?), periode ([\d:\-]+ \w+)", teks(h))  # judul ada di <title>, sebelum slim-mainpanel
    if m:
        o["periode"] = m.group(1).strip() + ", " + m.group(2)
    return o


def urai_rek(rek):
    """Teks rekomendasi -> {radius_km, sektor_km, rekomendasi}; dipakai jalur HTML dan jalur JSON."""
    o = {}
    rad, sek = [], [angka(x) for x in re.findall(r"(?:sejauh|hingga jarak|jarak)\s+(\d+(?:[.,]\d+)?)\s*km", rek, re.I)]
    for m in re.finditer(r"radius(?:\s+radial)?\s+(\d+(?:[.,]\d+)?)\s*km(\s+untuk\s+sektor\w*)?", rek, re.I):   # 'radius 4 km untuk sektoral' (Sinabung) = jarak sektor, bukan radius
        (sek if m.group(2) else rad).append(angka(m.group(1)))
    if rad:
        o["radius_km"] = max(rad)
    if sek:
        o["sektor_km"] = max(sek)
    if rek:
        o["rekomendasi"] = re.sub(r"^(Rekomendasi\s*)+", "", rek).strip()[:2500]
    return o


def urai_kontak(rek):
    """Teks rekomendasi MAGMA -> {pusat, pos:{nama, telp[], di}} hanya dari yang tertulis di teks (tidak ada daftar pos terstruktur di MAGMA; jangan dikarang). None bila kosong."""
    if not rek:
        return None
    k = {}
    m = re.search(r"\(?022\)?[ -]?7272606", rek)
    if m:
        k["pusat"] = "(022) 7272606"
    m = re.search(r"Pos Pengamatan (Gunung ?[Aa]pi |G\. ?|Gunung )?([A-Z][\w ]{2,30}?) ((?:\(0\d{2,4}\) ?\d{5,}|0\d{9,13})(?: (?:atau|dan) (?:\(0\d{2,4}\) ?\d{5,}|0\d{9,13}))*)(?: di ([^()]+?) \(Provinsi ([^)]+)\))?", rek)
    if m:
        k["pos"] = {"nama": "Pos Pengamatan Gunungapi " + m.group(2).strip(), "telp": re.findall(r"\(0\d{2,4}\) ?\d{5,}|0\d{9,13}", m.group(3))}
        if m.group(4):
            k["pos"]["di"] = f"{m.group(4).strip()}, {m.group(5).strip()}"
    return k or None


def urai_letusan(h):
    """Daftar letusan terbaru -> [{gunung, waktu (ISO, WIB), ket, tinggi_m}] terbaru dulu."""
    out, tgl = [], None
    for b in re.split(r'<div class="timeline-item', h)[1:]:
        m = re.search(r'timeline-date">[^<]*?(\d{1,2}) (\w+) (\d{4})', b)   # judul hari lama berbunyi "Kamis, 15 Oktober 2026, 1 hari yang lalu": jangan mensyaratkan tanda tutup tepat sesudah tahun
        if m:
            tgl = (int(m.group(3)), BULAN.get(m.group(2).lower()), int(m.group(1)))
            continue
        jam = re.search(r"<small>(\d{1,2}):(\d{2}) (WIB|WITA|WIT)", b)
        nm = re.search(r'timeline-title"><a[^>]*>([^<]+)<', b)
        tx = re.search(r'timeline-text">(.*?)</p>', b, re.S)
        if not (tgl and tgl[1] and jam and nm and tx):
            continue
        w = dt.datetime(*tgl, int(jam.group(1)), int(jam.group(2)), tzinfo=dt.timezone(dt.timedelta(hours=ZONA[jam.group(3)])))
        ket = teks(tx.group(1))
        tg = re.search(r"tinggi kolom abu teramati ± ?(\d+) m", ket)
        out.append({"gunung": html.unescape(nm.group(1)).strip(), "waktu": w.astimezone(WIB).isoformat(timespec="minutes"), "ket": ket[:300],
                    **({"tinggi_m": int(tg.group(1))} if tg else {})})
    lihat, uniq = set(), []   # halaman yang digabung saling tumpang tindih; satu letusan = gunung + waktu + awal keterangan
    for x in sorted(out, key=lambda x: x["waktu"], reverse=True):
        k = (x["gunung"], x["waktu"], x["ket"][:60])
        if k not in lihat:
            lihat.add(k); uniq.append(x)
    return uniq


# ---------------------------------------------------------------- endpoint JSON bersesi
def norm(n):
    return re.sub(r"[^a-z0-9]", "", html.unescape(n).lower())


class TolakRedirectLuar(urllib.request.HTTPRedirectHandler):
    """Redirect ke host selain MAGMA ditolak (cookie dan token tidak boleh ikut ke host lain)."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(urllib.parse.urljoin(req.full_url, newurl)).hostname != urllib.parse.urlparse(BASIS).hostname:
            raise RuntimeError(f"tolak redirect ke host luar: {newurl[:80]}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


FOTO_OK = re.compile(r"^https://[a-z0-9.-]+\.esdm\.go\.id/", re.I)


class Sesi:
    """GET /v1 -> cookie sesi + meta csrf-token + URL /v1/json/var?signature + daftar markersGunungApi. Semua permintaan berjeda JEDA detik."""
    def __init__(self):
        self.op = urllib.request.build_opener(TolakRedirectLuar, urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self._t = 0.0
        h = self.get("/v1")
        m = re.search(r'name="csrf-token" content="([^"]+)"', h)
        v = re.search(r"https://magma\.esdm\.go\.id/v1/json/var\?signature=\w+", h)
        k = re.search(r"var markersGunungApi = ", h)
        if not (m and v and k):
            raise RuntimeError("halaman /v1 tak memuat csrf, URL var, atau markersGunungApi")
        self.csrf, self.url_var = m.group(1), v.group(0)
        self.marker = json.JSONDecoder().raw_decode(h, k.end())[0]   # larik tanpa ';' penutup yang pasti
        self.kode = {norm(x["ga_nama_gapi"]): x["ga_code"] for x in self.marker}
        self.vona_ada = {x["ga_code"] for x in self.marker if x.get("has_vona")}

    def _minta(self, url, data=None, csrf=None):
        if urllib.parse.urlparse(url).hostname != urllib.parse.urlparse(BASIS).hostname:
            raise RuntimeError(f"tolak host di luar MAGMA: {url[:80]}")
        sisa = self._t + JEDA - time.time()
        if sisa > 0:
            time.sleep(sisa)
        h = {"User-Agent": UA, "Accept-Language": "id"}
        if data is not None:
            h.update({"X-CSRF-TOKEN": csrf or self.csrf, "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"})
        try:
            with self.op.open(urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data is not None else None, headers=h), timeout=40) as r:
                isi = r.read(MAKS_HTML + 1)
        finally:
            self._t = time.time()
        if len(isi) > MAKS_HTML:
            raise RuntimeError("respons melebihi 5 MB")
        return isi.decode("utf-8", "replace")

    def get(self, jalur):
        return self._minta(jalur if jalur.startswith("http") else BASIS + jalur)

    def var(self, kode):
        d = json.loads(self._minta(self.url_var, {"ga_code": kode}))
        if str(d.get("success")) != "1" or not d.get("data"):
            raise RuntimeError(f"var {kode}: success={d.get('success')}")
        return d["data"]

    def grafik(self, url_laporan):
        """Halaman laporan bertanda tangan -> {categories, series} 90 hari (POST id laporan; csrf dari halaman itu)."""
        h = self.get(url_laporan)
        m, u, i = (re.search(r'name="csrf-token" content="([^"]+)"', h), re.search(r"https://magma\.esdm\.go\.id/v1/json/highcharts\?signature=\w+", h), re.search(r"\bid:\s*'(\d+)'", h))
        if not (m and u and i):
            raise RuntimeError("halaman laporan tak memuat URL highcharts")
        d = json.loads(self._minta(u.group(0), {"id": i.group(1)}, m.group(1)))
        if not d.get("categories") or not d.get("series"):
            raise RuntimeError("highcharts kosong")
        return d


def urai_gempa(deskripsi):
    """['3 kali Tremor Non-Harmonik dengan amplitudo 0.7-1.3 mm, ...', ...] -> {kunci_jenis: jumlah}. Jenis yang tak dikenal dilewati (teks mentah tetap disimpan di catatan)."""
    out = {}
    for x in deskripsi or []:
        m = re.match(r"\s*(\d+)\s+kali\s+(?:gempa\s+)?(.+?)\s+dengan\b", x, re.I)
        k = m and KUNCI_JENIS.get(re.sub(r"[^a-z]", "", m.group(2).lower()))
        if k:
            out[k] = out.get(k, 0) + int(m.group(1))
    return out


def tgl_laporan(d):
    """data.laporan.tanggal 'Laporan per 24 jam, tanggal 2026-11-09 pukul 00:00-24:00 WIB' -> '2026-11-09' (None bila tak terbaca)."""
    m = re.search(r"tanggal (\d{4}-\d{2}-\d{2})", (d.get("laporan") or {}).get("tanggal", ""))
    return m.group(1) if m else None


def periode_id(t):
    m = re.search(r"tanggal (\d{4})-(\d{2})-(\d{2}) pukul ([\d:\-]+ \w+)", t or "")
    if not m:
        return t or None
    nb = "Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split()[int(m.group(2)) - 1]
    return f"{int(m.group(3))} {nb} {m.group(1)}, periode {m.group(4)}"


def urai_vona(v):
    """data.vona (dict, atau [] bila tak ada) -> {kode, terbit (ISO WIB), tinggi_m (di atas puncak), tinggi_dpl_m, arah}. None bila tak ada VONA."""
    if not isinstance(v, dict) or not v:
        return None
    o = {}
    kode = (v.get("color_code") or "").strip().lower()
    if kode in ("green", "yellow", "orange", "red"):
        o["kode"] = kode
    m = re.match(r"(\d{4})(\d{2})(\d{2})/(\d{2})(\d{2})Z", v.get("issued") or "")
    if m:
        o["terbit"] = dt.datetime(*map(int, m.groups()), tzinfo=dt.timezone.utc).astimezone(WIB).isoformat(timespec="minutes")
    t = (v.get("vch") or "") + " " + (v.get("other_vch") or "")
    m = re.search(r"\((\d+) M\) above sea level or [\d.]+ FT \((\d+) M\) above summit", t)
    if m:
        o["tinggi_dpl_m"], o["tinggi_m"] = int(m.group(1)), int(m.group(2))
    else:
        m = re.search(r"\((\d+) M\) above summit", t)
        if m:
            o["tinggi_m"] = int(m.group(1))
    m = re.search(r"(?:moving|drifting|towards?|heading)\s+(?:to\s+|toward\s+)?(?:the\s+)?(north-?east|north-?west|south-?east|south-?west|north|south|east|west)", t, re.I)
    if m:
        o["arah"] = ARAH_EN[m.group(1).lower().replace("-", "")]
    return o if o.get("kode") and o.get("terbit") else None


def foto_sah(u):
    """Foto hanya disimpan bila https dan host berakhiran .esdm.go.id (URL dari lembaga, tetapi layar menyisipkannya sebagai <img>)."""
    return u if isinstance(u, str) and FOTO_OK.match(u) else None


def bersihkan_foto():
    """Hapus foto berhost luar dari catatan yang sudah tertulis. -> [(KODE, url)] yang dibuang."""
    out = []
    for f in sorted(os.listdir(CATATAN)) if os.path.isdir(CATATAN) else []:
        jalur, baris, ubah = os.path.join(CATATAN, f), [], False
        for b in open(jalur, encoding="utf-8"):
            x = json.loads(b)
            if x.get("foto") and not foto_sah(x["foto"]):
                out.append((f[:-6], x.pop("foto"))); ubah = True
            baris.append(json.dumps(x, ensure_ascii=False, separators=(",", ":")))
        if ubah:
            open(jalur + ".tmp", "w", encoding="utf-8").write("\n".join(baris) + "\n")
            os.replace(jalur + ".tmp", jalur)
    return out


def catat_harian(kode, d):
    """Satu baris per gunung per tanggal laporan, append-only (tanggal yang sudah ada dilewati): jumlah dan amplitudo mentah, visual, klimatologi, keterangan lain."""
    tgl = tgl_laporan(d)
    if not tgl:
        return False
    jalur = os.path.join(CATATAN, kode + ".jsonl")
    per = (d.get("laporan") or {}).get("tanggal")
    ada = set()
    try:
        for b in open(jalur, encoding="utf-8"):
            try:
                x = json.loads(b)
                ada.add((x["tgl"], x.get("laporan")))
            except (ValueError, KeyError):
                pass
    except OSError:
        pass
    if (tgl, per) in ada:   # gunung dengan laporan 6 jam punya beberapa baris sehari: kuncinya tanggal + label laporan
        return False
    vis, kli = d.get("visual") or {}, d.get("klimatologi") or {}
    baris = {"tgl": tgl, "laporan": per, "pembuat": (d.get("laporan") or {}).get("pembuat"), "gempa": [x.strip() for x in (d.get("gempa") or {}).get("deskripsi") or []],
             "visual": html.unescape(vis.get("deskripsi") or "").strip() or None, "lainnya": html.unescape(vis.get("lainnya") or "").strip() or None,
             "klimatologi": html.unescape(kli.get("deskripsi") or "").strip() or None, "foto": foto_sah(vis.get("foto"))}
    os.makedirs(CATATAN, exist_ok=True)
    with open(jalur, "a", encoding="utf-8") as f:
        f.write(json.dumps({k: v for k, v in baris.items() if v not in (None, [])}, ensure_ascii=False, separators=(",", ":")) + "\n")
    return True


def hari_selesai(tgl, label, sekarang):
    """Jumlah harian hanya dibekukan (append-only) bila harinya sudah lewat atau laporannya memang 00:00-24:00; laporan 6 jam hari ini baru sebagian."""
    return tgl < sekarang.date().isoformat() or "00:00-24:00" in (label or "")


def tambah_kegempaan(kg, nama, kode, hari):
    """hari = {tgl: {kunci: jumlah}} -> kg['gunung'][nama]['hari'][tgl] = larik menurut JENIS. Append-only: tanggal yang sudah ada TIDAK ditimpa. Mengembalikan jumlah tanggal baru."""
    g = kg.setdefault("gunung", {}).setdefault(nama, {"kode": kode, "hari": {}})
    g["kode"] = kode
    n = 0
    for t, c in hari.items():
        if t not in g["hari"]:
            g["hari"][t] = [int(c.get(k, 0)) for k, _ in JENIS]
            n += 1
    g["hari"] = dict(sorted(g["hari"].items()))
    return n


def hari_dari_grafik(gr):
    """Highcharts {categories, series:[{name, data}]} -> {tgl: {kunci: jumlah}}."""
    out = {t: {} for t in gr["categories"]}
    for s_ in gr["series"]:
        k = KUNCI_JENIS.get(re.sub(r"[^a-z]", "", s_["name"].lower()))
        if k:
            for t, n in zip(gr["categories"], s_["data"]):
                out[t][k] = n
    return out


def lap_dari_json(d):
    """JSON var -> kunci yang sama dengan urai_laporan (lat, lon, tinggi, radius_km, sektor_km, rekomendasi, periode)."""
    o = {}
    g = d.get("gunungapi") or {}
    k = g.get("koordinat")
    if k and len(k) == 2:
        o.update(lat=float(k[0]), lon=float(k[1]))
    m = re.search(r"ketinggian (-?\d+)", g.get("deskripsi") or "")
    if m:
        o["tinggi"] = int(m.group(1))
    rek = teks(re.sub(r"<br\s*/?>", " ", d.get("rekomendasi") or ""))
    o.update(urai_rek(rek))
    p = periode_id((d.get("laporan") or {}).get("tanggal"))
    if p:
        o["periode"] = p
    return o


def catat_perubahan(daftar, tgl, sumber=None):
    """Tambah baris ke perubahan_level.json (permanen, TIDAK dipotong). daftar = [{gunung, dari, ke}]; kunci (gunung, tgl, dari, ke) yang sudah ada dilewati."""
    b = baca(PERUBAHAN, {"v": 1, "sumber": "PVMBG, Badan Geologi KESDM (press release dan pembandingan harian MAGMA)", "baris": []})
    ada = {(x["gunung"], x["tanggal"], x["dari"], x["ke"]) for x in b["baris"]}
    n = 0
    for p in daftar:
        if (p["gunung"], tgl, p["dari"], p["ke"]) not in ada:
            b["baris"].append({"gunung": p["gunung"], "tanggal": tgl, "jenis": "perubahan", "dari": p["dari"], "ke": p["ke"],
                               "sumber": sumber or {"lembaga": "MAGMA Indonesia, PVMBG", "judul": "Pembandingan tingkat aktivitas harian Centurisk97", "url": BASIS + "/v1/gunung-api/tingkat-aktivitas"}})
            n += 1
    if n:
        b["baris"].sort(key=lambda x: (x["tanggal"], x["gunung"]))
        simpan(PERUBAHAN, b)
    return n


PAPARAN = os.path.join(AKAR, "public/gunungapi/data/paparan.json")
PENDUDUK_SUMBER = "WorldPop 1 km (cincin paparan)"


def penduduk_cincin(cincin, r_km):
    """Jiwa dalam radius r_km dari cincin paparan.json [{km, penduduk}] (3/5/10/15 km, WorldPop 1 km): interpolasi linear menurut r^2 (luas)
    di antara dua cincin; r < 3 km = skala r^2/9 dari cincin 3 km. None bila tak ada cincin atau r > cincin terluar (tidak diekstrapolasi).
    Menggantikan kisi WorldPop 25 km yang melebih-lebihkan sampai 760x pada radius kecil."""
    c = sorted((x["km"], x["penduduk"]) for x in cincin or [])
    if not c or r_km is None or r_km > c[-1][0]:
        return None
    if r_km <= c[0][0]:
        v = c[0][1] * r_km ** 2 / c[0][0] ** 2
    else:
        (a, pa), (b, pb) = next(((c[i], c[i + 1]) for i in range(len(c) - 1) if c[i][0] <= r_km <= c[i + 1][0]))
        v = pa + (pb - pa) * (r_km ** 2 - a ** 2) / (b ** 2 - a ** 2)
    return int(round(v, -2)) if v >= 1000 else int(round(v))


def slug(nama):
    return "-".join("".join(ch for ch in nama.lower() if ch.isalnum() or ch in " -").split())


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur))
    except (OSError, ValueError):
        return bawaan


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def riwayat_hari(riwayat, sekarang, gunung, erupsi=None):
    """riwayat tanpa baris hari ini + baris baru (level -> jumlah gunung; erupsi 24 jam hanya bila daftar MAGMA mencapai 24 jam). Simpan 365 hari."""
    hari = sekarang.date().isoformat()
    batas = (sekarang - dt.timedelta(days=365)).date().isoformat()
    baris = {"tgl": hari, "level": {str(l): sum(1 for o in gunung if o["level"] == l) for l in (1, 2, 3, 4)}}
    if erupsi is not None:
        baris["erupsi"] = erupsi
    return [r for r in riwayat if r["tgl"] >= batas and r["tgl"] != hari] + [baris]


def jalan(cepat=False):
    sekarang = dt.datetime.now(WIB)
    daftar = urai_tingkat(ambil("/v1/gunung-api/tingkat-aktivitas"))
    if len(daftar) < 40:  # halaman berubah bentuk: berkas lama dibiarkan, jangan menimpa dengan setengah data
        raise SystemExit(f"hanya {len(daftar)} gunung terurai dari MAGMA; berkas lama dibiarkan")
    kat = baca(KATALOG, {})
    lama = baca(KELUAR, {})
    lv_lama = {g["nama"]: g["level"] for g in lama.get("gunung", [])}
    # Baris riwayat hari ini ditulis SEKARANG dari daftar level (satu permintaan cepat), sebelum laporan per gunung yang lambat (13 menit):
    # job yang terbunuh di tengah (17 dan 18 Okt 2026 bolong) tetap meninggalkan catatan level hari itu. Baris akhir menimpa baris ini.
    if lama.get("gunung"):
        simpan(KELUAR, {**lama, "riwayat": riwayat_hari(lama.get("riwayat", []), sekarang, daftar)})
    sesi, gagal = None, []
    try:
        sesi = Sesi()
    except Exception as e:   # tanpa sesi JSON: seluruh jalur HTML lama tetap jalan
        gagal.append(f"sesi: {str(e)[:120]}")
        print(f"::warning title=gunungapi-json::sesi JSON MAGMA gagal ({e}); jalur HTML dipakai", file=sys.stderr)
    if not cepat and bersihkan_foto():
        print("  foto berhost luar dibuang dari catatan", file=sys.stderr)
    kg = baca(KEGEMPAAN, None) or {"v": 1, "jenis": [{"k": k, "n": n} for k, n in JENIS], "gunung": {}}
    lama_g = {g["nama"]: g for g in lama.get("gunung", [])}
    gunung = []
    for g in daftar:
        k = kat.get(g["nama"], {})
        kode = sesi.kode.get(norm(g["nama"])) if sesi else None
        lap, d = {}, None
        if cepat:   # hanya VONA baru; sisanya dibawa dari status sebelumnya selama levelnya sama
            prev = lama_g.get(g["nama"])
            if prev and prev.get("level") == g["level"]:
                lap = {x: prev[x] for x in ("radius_km", "sektor_km", "periode", "rekomendasi") if x in prev}
            if kode in sesi.vona_ada if sesi else False:
                try:
                    d = sesi.var(kode)
                except Exception as e:
                    gagal.append(f"{g['nama']}: {str(e)[:80]}")
        elif kode:
            try:
                d = sesi.var(kode)
                if g["level"] >= 2 or not k.get("lat"):
                    lap = lap_dari_json(d)
                if g["level"] >= 2:   # grafik 90 hari: hanya Level II ke atas; yang sudah ada tidak ditimpa
                    try:
                        tambah_kegempaan(kg, g["nama"], kode, {t: c for t, c in hari_dari_grafik(sesi.grafik(g["laporan"])).items() if t < sekarang.date().isoformat()})   # hari ini belum utuh
                    except Exception as e:
                        gagal.append(f"{g['nama']} grafik: {str(e)[:80]}")
                tg = tgl_laporan(d)
                if tg and hari_selesai(tg, (d.get("laporan") or {}).get("tanggal"), sekarang):
                    tambah_kegempaan(kg, g["nama"], kode, {tg: urai_gempa((d.get("gempa") or {}).get("deskripsi"))})
                catat_harian(kode, d)
            except Exception as e:
                d = None
                gagal.append(f"{g['nama']}: {str(e)[:80]}")
                print(f"  JSON {g['nama']} gagal: {e}", file=sys.stderr)
        if not cepat and not lap and (g["level"] >= 2 or not k.get("lat")):   # JSON gagal atau tak ada: laporan HTML seperti dulu
            try:
                lap = urai_laporan(ambil(g["laporan"]))
            except RuntimeError as e:
                print(f"  laporan {g['nama']} gagal: {e}", file=sys.stderr)
            time.sleep(.4)
        if lap.get("lat") is not None and not k.get("lat"):
            k = kat[g["nama"]] = {"prov": g["prov"], "lat": lap["lat"], "lon": lap["lon"], **({"tinggi": lap["tinggi"]} if "tinggi" in lap else {})}
        if k.get("lat") is None:
            continue  # tanpa koordinat tidak bisa dipetakan: dibuang (A18)
        o = {"nama": g["nama"], "prov": g["prov"], "level": g["level"], "lat": k["lat"], "lon": k["lon"], "tinggi": k.get("tinggi"), "laporan": g["laporan"].split("?")[0]}
        if kode:
            o["kode"] = kode
        if g["level"] >= 2:  # radius hanya bermakna saat ada rekomendasi pembatasan
            o.update({x: lap[x] for x in ("radius_km", "sektor_km", "periode", "rekomendasi") if x in lap})
            if urai_kontak(lap.get("rekomendasi")):
                o["kontak"] = urai_kontak(lap["rekomendasi"])
        v = urai_vona(d.get("vona")) if d else (lama_g.get(g["nama"]) or {}).get("vona")
        if v and dt.datetime.fromisoformat(v["terbit"]) >= sekarang - dt.timedelta(days=30):   # VONA lebih tua dari 30 hari bukan keadaan sekarang
            o["vona"] = v
        gunung.append(o)
    cinc = {g["id"]: g.get("cincin") for g in (baca(PAPARAN, {}) or {}).get("gunung", [])}
    for o in gunung:
        if o.get("radius_km"):  # gunung tanpa cincin paparan: null (bukan angka kisi kasar)
            o["penduduk_radius"] = penduduk_cincin(cinc.get(slug(o["nama"])), o["radius_km"])
            o["penduduk_sumber"] = PENDUDUK_SUMBER
    # perubahan level: dibandingkan dengan berkas sebelumnya; riwayat dipertahankan 90 hari
    batas = (sekarang - dt.timedelta(days=90)).date().isoformat()
    perubahan = [p for p in lama.get("perubahan", []) if p["tgl"] >= batas]
    for o in gunung:
        a = lv_lama.get(o["nama"])
        if a and a != o["level"]:
            perubahan.append({"nama": o["nama"], "dari": a, "ke": o["level"], "tgl": sekarang.date().isoformat()})
    catat_perubahan([{"gunung": x["nama"], "dari": x["dari"], "ke": x["ke"]} for x in perubahan if x["tgl"] == sekarang.date().isoformat()], sekarang.date().isoformat())
    letusan, cak = lama.get("letusan", []), lama.get("letusan_cakupan")   # gagal baca: daftar lama tampil, tapi cakupannya TIDAK diperpanjang
    h, baru = "", []
    try:
        for hal in range(1, 9):  # halaman 1 memuat ±15 letusan (Ibu bisa belasan per hari): ambil mundur sampai melewati 24 jam, paling banyak 8 halaman
            h += ambil(f"/v1/gunung-api/informasi-letusan?page={hal}")  # digabung dulu: tanggal hanya ditulis di awal tiap hari, kadang tak ikut di awal halaman berikut
            baru = urai_letusan(h)
            if not baru or dt.datetime.fromisoformat(baru[-1]["waktu"]) < sekarang - dt.timedelta(hours=24):
                break
            time.sleep(.4)
    except RuntimeError as e:   # halaman yang sudah terbaca tetap dipakai (cakupannya sampai letusan tertua yang terbaca saja)
        print(f"  letusan gagal: {e}", file=sys.stderr)
    letusan, cak = gabung_letusan(baru, lama.get("letusan", []), lama.get("letusan_cakupan"), sekarang)
    if not cepat:
        simpan(KATALOG, dict(sorted(kat.items())))
        if kg["gunung"]:
            simpan(KEGEMPAAN, kg)
    n_lv = {l: sum(1 for o in gunung if o["level"] == l) for l in (1, 2, 3, 4)}
    # riwayat harian (satu baris per tanggal WIB, diganti bila jalan lagi di hari sama): jumlah gunung per level + erupsi 24 jam; layar Tren menggambarnya setelah >= 2 hari
    r24 = sum(1 for x in letusan if dt.datetime.fromisoformat(x["waktu"]) >= sekarang - dt.timedelta(hours=24))
    lengkap = bool(cak) and dt.datetime.fromisoformat(cak["dari"]) <= sekarang - dt.timedelta(hours=24) and dt.datetime.fromisoformat(cak["sampai"]) >= sekarang - dt.timedelta(minutes=30)   # hanya bila cakupan yang TERBUKTI (bukan daftar lama) meliputi 24 jam terakhir
    riwayat = riwayat_hari(lama.get("riwayat", []), sekarang, gunung, r24 if lengkap else None)
    simpan(KELUAR, {"sumber": "MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)", "dibuat": sekarang.isoformat(timespec="seconds"),
                    "jumlah_level": {str(l): n for l, n in n_lv.items()}, "gunung": gunung, "perubahan": perubahan, "letusan": letusan, **({"letusan_cakupan": cak} if cak else {}), "riwayat": riwayat,
                    **({"json_gagal": gagal} if gagal else {}), **({"mode": "cepat"} if cepat else {})})
    print(f"{len(gunung)} gunung; level {n_lv}; letusan {len(letusan)}; perubahan {len(perubahan)}", file=sys.stderr)


def gabung_letusan(baru, lama, cak_lama, sekarang):
    """Letusan hasil baca sekarang + letusan lama (bila cakupan lama bersambung) -> (daftar maks 150, cakupan {dari, sampai}).
    Cakupan = rentang yang TERBUKTI terbaca: dari = letusan tertua halaman, sampai = sekarang. Tanpa letusan terbaca, tak ada bukti: lama dipertahankan."""
    if not baru:
        return lama, cak_lama
    dari = baru[-1]["waktu"]
    sam = sekarang.isoformat(timespec="minutes")
    if cak_lama and cak_lama["sampai"] >= dari:   # lama bersambung dengan yang baru: cakupan melebar ke belakang
        dari = min(dari, cak_lama["dari"])
        baru = baru + [x for x in lama if x["waktu"] >= dari]
    lihat, uniq = set(), []
    for x in sorted(baru, key=lambda x: x["waktu"], reverse=True):
        k = (x["gunung"], x["waktu"], x["ket"][:60])
        if k not in lihat:
            lihat.add(k); uniq.append(x)
    if len(uniq) > 150:
        uniq = uniq[:150]
        dari = max(dari, uniq[-1]["waktu"])
    return uniq, {"dari": dari, "sampai": sam}


def uji():
    h = ('<a href="" class="tx-inverse tx-14 tx-medium d-block">Level IV (Awas)</a><td>Tidak ada gunung api Level IV (Awas)</td>'
         '<a href="" class="tx-inverse tx-14 tx-medium d-block">Level III (Siaga)</a><tr><td>\n Semeru - Jawa Timur <a href="https://x/laporan/1?signature=a&amp;b=2"><i></i></a></td></tr>'
         '<a href="" class="tx-inverse tx-14 tx-medium d-block">Level I (Normal)</a><tr><td> Kerinci - Jambi, Sumatera Barat <a href="https://x/laporan/2?s=1">z</a></td></tr>')
    d = urai_tingkat(h)
    assert [(g["nama"], g["prov"], g["level"]) for g in d] == [("Semeru", "Jawa Timur", 3), ("Kerinci", "Jambi, Sumatera Barat", 1)], d
    assert d[0]["laporan"] == "https://x/laporan/1?signature=a&b=2"
    lap = ('<title>Laporan Aktivitas Gunung Api - Semeru, Jumat - 16 Oktober 2026, periode 06:00-12:00 WIB</title><div class="slim-mainpanel">Laporan Aktivitas Gunung Api - Semeru, Jumat - 16 Oktober 2026, periode 06:00-12:00 WIB '
           'Gunung Api Semeru terletak di Lumajang dengan posisi geografis di Latitude -8.108°LU, Longitude 112.92°BT dan memiliki ketinggian 3676 mdpl '
           'Pengamatan Kegempaan 25 kali Rekomendasi Rekomendasi 1. Tidak melakukan aktivitas apapun di sektor tenggara sejauh 13 km dari puncak. '
           '2. Tidak beraktivitas dalam radius 5 Km dari kawah. Copyright 2026</div>')
    r = urai_laporan(lap)
    assert (r["lat"], r["lon"], r["tinggi"], r["radius_km"], r["sektor_km"]) == (-8.108, 112.92, 3676, 5, 13), r
    assert urai_laporan("slim-mainpanel Latitude -8.5444°LU, Longitude 123.585°BT dan memiliki ketinggian -50 mdpl")["tinggi"] == -50  # gunung bawah laut
    assert r["rekomendasi"].startswith("1. Tidak") and r["periode"].startswith("Jumat - 16 Oktober 2026"), r
    ev = ('<div class="timeline-item timeline-day"><p class="timeline-date">Hari Ini, Jumat, 16 Oktober 2026</p></div>'
          '<div class="timeline-item"><small>14:43 WITA </small><p class="timeline-title"><a href="#">Ili Lewotolok</a></p>'
          '<p class="timeline-text"> Terjadi erupsi dengan tinggi kolom abu teramati ± 400 m di atas puncak. </p></div>')
    e = urai_letusan(ev)
    assert e == [{"gunung": "Ili Lewotolok", "waktu": "2026-10-16T13:43+07:00", "ket": "Terjadi erupsi dengan tinggi kolom abu teramati ± 400 m di atas puncak.", "tinggi_m": 400}], e
    dua = ('<div class="timeline-item timeline-day"><p class="timeline-date">Hari Ini, Jumat, 16 Oktober 2026</p></div>'
           '<div class="timeline-item"><small>10:00 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi A. </p></div>'
           '<div class="timeline-item timeline-day"><p class="timeline-date">Kamis, 15 Oktober 2026, 1 hari yang lalu</p></div>'
           '<div class="timeline-item"><small>23:42 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi B. </p></div>'
           '<div class="timeline-item timeline-day"><p class="timeline-date">Kamis, 15 Oktober 2026, 1 hari yang lalu</p></div>'
           '<div class="timeline-item"><small>23:42 WIB </small><p class="timeline-title"><a href="#">Semeru</a></p><p class="timeline-text"> Erupsi B. </p></div>')
    d2 = urai_letusan(dua)   # judul hari dengan akhiran "N hari yang lalu" tetap terbaca; halaman tumpang tindih tidak menggandakan
    assert [x["waktu"] for x in d2] == ["2026-10-16T10:00+07:00", "2026-10-15T23:42+07:00"], d2
    live = urai_letusan(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "contoh/informasi_letusan_20261019.html"), encoding="utf-8").read())   # halaman live 19 Okt 02.30 WIB (halaman 1-3)
    per_hari = {}
    for x in live:
        per_hari[x["waktu"][:10]] = per_hari.get(x["waktu"][:10], 0) + 1
    assert per_hari == {"2026-10-17": 15, "2026-10-18": 13, "2026-10-19": 2}, per_hari   # letusan 18 Okt ("Minggu, 18 Oktober 2026, 1 hari yang lalu") wajib terbaca
    now = dt.datetime.fromisoformat("2026-10-19T02:39+07:00")
    lamax = [{"gunung": "Semeru", "waktu": "2026-10-15T10:00+07:00", "ket": "lama"}]
    ls, ck = gabung_letusan(live, lamax, {"dari": "2026-10-14T00:00+07:00", "sampai": "2026-10-18T00:00+07:00"}, now)
    assert ck == {"dari": "2026-10-14T00:00+07:00", "sampai": "2026-10-19T02:39+07:00"} and len(ls) == 31, ck   # lama bersambung: cakupan melebar
    ls, ck = gabung_letusan(live, lamax, {"dari": "2026-10-10T00:00+07:00", "sampai": "2026-10-12T00:00+07:00"}, now)
    assert ck["dari"] == live[-1]["waktu"] and len(ls) == 30, ck   # lama terputus: dibuang, cakupan hanya yang terbukti
    assert gabung_letusan([], lamax, {"dari": "a", "sampai": "b"}, now) == (lamax, {"dari": "a", "sampai": "b"})   # gagal baca: cakupan tidak diperpanjang
    merapi = [{"km": 3, "penduduk": 40}, {"km": 5, "penduduk": 15122}, {"km": 10, "penduduk": 184363}, {"km": 15, "penduduk": 570744}]  # cincin nyata paparan.json
    assert penduduk_cincin(merapi, 3) == 40 and penduduk_cincin(merapi, 5) == 15100, "Merapi 3/5 km harus tepat cincin"   # puluhan, bukan 30.400 (kisi 25 km)
    assert penduduk_cincin(merapi, 1.5) == 10 and penduduk_cincin(merapi, 4) < 15122 and 15122 < penduduk_cincin(merapi, 7) < 184363
    assert penduduk_cincin(merapi, 4) == int(round(40 + (15122 - 40) * 7 / 16, -2)), penduduk_cincin(merapi, 4)   # interpolasi menurut r^2
    assert penduduk_cincin(merapi, 20) is None and penduduk_cincin(None, 5) is None and penduduk_cincin([], 5) is None
    rk = ("5. Untuk mengetahui informasi dapat menghubungi Pusat Vulkanologi dan Mitigasi Bencana Geologi, Badan Geologi (022) 7272606 di Bandung (Provinsi Jawa Barat) atau "
          "Pos Pengamatan Gunungapi Krakatau (0254) 651449 atau 085846324506 di Pasauran (Provinsi Banten).")
    assert urai_kontak(rk) == {"pusat": "(022) 7272606", "pos": {"nama": "Pos Pengamatan Gunungapi Krakatau", "telp": ["(0254) 651449", "085846324506"], "di": "Pasauran, Banten"}}, urai_kontak(rk)
    assert urai_kontak("hubungi Pos Pengamatan Gunung api Sinabung") is None and urai_kontak(None) is None and urai_kontak("PVMBG pada nomor telepon 022-7272606") == {"pusat": "(022) 7272606"}
    sk = dt.datetime(2026, 10, 19, 5, tzinfo=WIB)   # riwayat: baris hari ini diganti, bukan digandakan; bolong 17-18 Okt dibiarkan
    r0 = [{"tgl": "2026-10-16", "level": {"1": 1}}, {"tgl": "2026-10-19", "level": {"1": 9}}]
    r1 = riwayat_hari(r0, sk, [{"level": 3}, {"level": 1}, {"level": 1}], 4)
    assert [r["tgl"] for r in r1] == ["2026-10-16", "2026-10-19"] and r1[-1] == {"tgl": "2026-10-19", "level": {"1": 2, "2": 0, "3": 1, "4": 0}, "erupsi": 4}, r1
    assert "erupsi" not in riwayat_hari(r1, sk, [{"level": 3}])[-1]
    assert slug("Lewotobi Laki-laki") == "lewotobi-laki-laki" and slug("Anak Krakatau") == "anak-krakatau"
    # ---- endpoint JSON (contoh nyata Marapi, 9 Nov 2026) ----
    desk = ["1 kali gempa Hembusan dengan amplitudo 4.9 mm, dan lama gempa 59 detik. ", "3 kali Tremor Non-Harmonik dengan amplitudo 0.7-1.3 mm, dan lama gempa 71-93 detik. ", "1 kali gempa Vulkanik Dangkal dengan amplitudo 2.7 mm, dan lama gempa 10 detik. ",
            "1 kali gempa Tektonik Lokal dengan amplitudo 9.6 mm, S-P 9.8 detik dan lama gempa 30 detik. ", "3 kali gempa Tektonik Jauh dengan amplitudo 1.7-3.2 mm, S-P 24-42 detik dan lama gempa 45-102 detik. ", "1 kali gempa Tremor Menerus dengan amplitudo 0.5-1 mm, dominan 1 mm. "]
    assert urai_gempa(desk) == {"hembusan": 1, "tremor_non_harmonik": 3, "vulkanik_dangkal": 1, "tektonik_lokal": 1, "tektonik_jauh": 3, "tremor_menerus": 1} and urai_gempa(None) == {}
    mar = {"gunungapi": {"koordinat": [-0.381, 100.473], "deskripsi": "dan memiliki ketinggian 2891 mdpl"}, "laporan": {"tanggal": "Laporan per 24 jam, tanggal 2026-11-09 pukul 00:00-24:00 WIB", "pembuat": "X"},
           "visual": {"deskripsi": "Kabut &deg;C", "lainnya": "Nihil", "foto": "https://magma.vsi.esdm.go.id/img/ga/MAR/MAR202611092400.png"}, "klimatologi": {"deskripsi": "Berawan. "}, "gempa": {"deskripsi": desk},
           "rekomendasi": "1. Tidak beraktivitas dalam wilayah radius 3 km dari pusat erupsi.<br />\n2. Waspada lahar.", "vona": {"issued": "20261107/1734Z", "color_code": "ORANGE", "vch": "Ash-cloud is not observed.", "other_vch": ""}}
    assert tgl_laporan(mar) == "2026-11-09" and periode_id(mar["laporan"]["tanggal"]) == "9 November 2026, periode 00:00-24:00 WIB"
    lj = lap_dari_json(mar)
    assert (lj["lat"], lj["lon"], lj["tinggi"], lj["radius_km"]) == (-0.381, 100.473, 2891, 3) and "<br" not in lj["rekomendasi"] and lj["rekomendasi"].startswith("1. Tidak"), lj
    vm = urai_vona(mar["vona"])
    assert vm == {"kode": "orange", "terbit": "2026-11-08T00:34+07:00"}, vm   # tanpa awan teramati: tak ada tinggi
    vs = urai_vona({"issued": "20261110/0105Z", "color_code": "ORANGE", "vch": "Best estimate of ash-cloud top is around 14323 FT (4476 M) above sea level or 2560 FT (800 M) above summit. Ash cloud moving to the north-east.", "other_vch": ""})
    assert (vs["tinggi_m"], vs["tinggi_dpl_m"], vs["arah"]) == (800, 4476, "timur laut"), vs
    assert urai_vona([]) is None and urai_vona({"issued": "bukan", "color_code": "RED"}) is None   # gunung tanpa VONA: [] dari MAGMA
    assert foto_sah("https://magma.vsi.esdm.go.id/img/ga/MAR/x.png") and not foto_sah("https://cendana15.com/x.jpeg") and not foto_sah("http://magma.vsi.esdm.go.id/x") and not foto_sah("https://evil.com/.esdm.go.id/x") and not foto_sah(None)
    sin = urai_rek("1. Tidak melakukan aktivitas pada lokasi di dalam radius radial 3 km dari puncak G.Sinabung, serta radius 4 km untuk sektoral selatan-timur")
    assert (sin["radius_km"], sin["sektor_km"]) == (3, 4), sin
    kg = {}
    gr = {"categories": ["2026-11-08", "2026-11-09"], "series": [{"name": "Hembusan", "data": [5, 2]}, {"name": "Letusan/Erupsi", "data": [1, 0]}, {"name": "Entah", "data": [9, 9]}]}
    assert tambah_kegempaan(kg, "Marapi", "MAR", hari_dari_grafik(gr)) == 2
    assert kg["gunung"]["Marapi"]["hari"]["2026-11-08"] == [1, 5] + [0] * 9, kg
    assert tambah_kegempaan(kg, "Marapi", "MAR", {"2026-11-09": {"hembusan": 99}, "2026-11-10": {"hembusan": 3}}) == 1 and kg["gunung"]["Marapi"]["hari"]["2026-11-09"][1] == 2   # append-only: yang ada tidak ditimpa
    # ---- berkas permanen, mode cepat, semuanya di folder sementara ----
    import tempfile
    global PERUBAHAN, CATATAN, KEGEMPAAN, KATALOG, KELUAR, PAPARAN, Sesi, ambil
    simpanan = (PERUBAHAN, CATATAN, KEGEMPAAN, KATALOG, KELUAR, PAPARAN, Sesi, ambil)
    with tempfile.TemporaryDirectory() as tmp:
        PERUBAHAN, CATATAN, KEGEMPAAN, KATALOG, KELUAR, PAPARAN = (os.path.join(tmp, x) for x in ("pl.json", "catatan", "kg.json", "gunung.json", "status.json", "tidak_ada.json"))
        try:
            assert catat_perubahan([{"gunung": "Semeru", "dari": 2, "ke": 3}], "2026-11-10") == 1 and catat_perubahan([{"gunung": "Semeru", "dari": 2, "ke": 3}], "2026-11-10") == 0   # idempoten
            assert len(baca(PERUBAHAN)["baris"]) == 1
            assert catat_harian("MAR", mar) is True and catat_harian("MAR", mar) is False   # satu baris per gunung per tanggal + label laporan
            assert hari_selesai("2026-11-10", "Laporan tanggal 2026-11-10 pukul 06:00-12:00 WIB", dt.datetime(2026, 11, 10, 15, tzinfo=WIB)) is False and hari_selesai("2026-11-09", "x", dt.datetime(2026, 11, 10, 15, tzinfo=WIB)) and hari_selesai("2026-11-10", "pukul 00:00-24:00 WIB", dt.datetime(2026, 11, 10, 15, tzinfo=WIB))
            with open(os.path.join(CATATAN, "XXX.jsonl"), "w") as f:
                f.write('{"tgl":"2026-11-09","foto":"https://cendana15.com/a.jpeg","visual":"v"}\n{"tgl":"2026-11-10","foto":"https://magma.vsi.esdm.go.id/a.png"}\n')
            assert bersihkan_foto() == [("XXX", "https://cendana15.com/a.jpeg")] and bersihkan_foto() == []
            assert [("foto" in json.loads(b)) for b in open(os.path.join(CATATAN, "XXX.jsonl"))] == [False, True]
            os.remove(os.path.join(CATATAN, "XXX.jsonl"))
            sat = json.loads(open(os.path.join(CATATAN, "MAR.jsonl")).readline())
            assert sat["tgl"] == "2026-11-09" and sat["laporan"].startswith("Laporan per 24 jam") and sat["gempa"][0].startswith("1 kali gempa Hembusan") and sat["visual"] == "Kabut °C", sat
            nama = [f"Gunung{i}" for i in range(40)] + ["Semeru"]
            tingkat = "".join(f'<a href="" class="tx-inverse tx-14 tx-medium d-block">Level {r}</a>' + "".join(f'<tr><td> {n} - Jawa <a href="https://magma.esdm.go.id/v1/gunung-api/laporan/{n}?s=1">z</a></td></tr>' for n in ns)
                              for r, ns in (("III (Siaga)", ["Semeru"]), ("I (Normal)", nama[:40])))
            json.dump({n: {"prov": "Jawa", "lat": -8.1, "lon": 112.9} for n in nama}, open(KATALOG, "w"))
            panggil = []

            class Palsu:
                kode, vona_ada = {norm("Semeru"): "SMR"}, {"SMR"}
                def __init__(self): pass
                def var(self, k): panggil.append(("var", k)); return {"vona": {"issued": dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d/%H%MZ"), "color_code": "ORANGE", "vch": "Ash-cloud top 2560 FT (800 M) above summit"}}
                def grafik(self, u): panggil.append(("grafik", u)); raise AssertionError("cepat tidak boleh menarik grafik")
            Sesi = Palsu
            ambil = lambda j, coba=3: tingkat if "tingkat" in j else ""
            jalan(True)
            st = baca(KELUAR)
            sm = next(g for g in st["gunung"] if g["nama"] == "Semeru")
            assert panggil == [("var", "SMR")] and st["mode"] == "cepat" and sm["level"] == 3 and sm["kode"] == "SMR" and sm["vona"]["kode"] == "orange", (panggil, st.get("mode"), sm)
            assert not os.path.exists(KEGEMPAAN) and not os.path.exists(os.path.join(CATATAN, "SMR.jsonl")), "cepat tidak menulis kegempaan"
        finally:
            PERUBAHAN, CATATAN, KEGEMPAAN, KATALOG, KELUAR, PAPARAN, Sesi, ambil = simpanan
    print("ok")


def rantai():
    """Sesudah status tertulis: abu.py, prospektif.py (catatan append-only arah abu vs VONA, butuh abu_gunungapi.json baru), lalu laporan.py. Gagal = peringatan, berkas lama dibiarkan, exit tetap 0."""
    import subprocess
    d = os.path.dirname(os.path.abspath(__file__))
    for nama in ("abu.py", "prospektif.py", "laporan.py"):
        s = os.path.join(d, nama)
        if os.path.exists(s) and (subprocess.call([sys.executable, s, "uji"]) != 0 or subprocess.call([sys.executable, s]) != 0):
            print(f"::warning title=gunungapi::{nama} gagal; berkas lamanya dibiarkan", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["cepat"]:
        jalan(True)   # level, letusan, VONA saja; tanpa grafik dan tanpa rantai abu/laporan
    else:
        jalan()  # gagal membaca MAGMA = SystemExit, tanpa rantai
        rantai()
