"""Tangga Peringatan: per kab/kota, pernyataan resmi BMKG dan prediksi kita dari musim sampai jam -> public/prediksi/data/tangga.json.

Aturan lengkap: data/kajian-bnpb/tangga/ALGORITMA.md. Ringkas: tiap anak tangga = pernyataan berlabel (lembaga, terbit, cakupan);
peringkat tk 0..3 hanya untuk sinyal "menguat" / "belum selaras" (hanya dari BMKG); label resmi tidak diubah; tidak pernah "aman".
Pakai:  python3 tangga.py        tulis tangga.json + satu baris arsip hari ini (gagal-lunak, keluar 0)
        python3 tangga.py uji    self-check tanpa jaringan
"""
import datetime as dt, json, os, re, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI)
import dasar as D  # noqa: E402

AKAR = D.AKAR
BANJIR = os.path.join(AKAR, "public", "banjir", "data")
UDARA = os.path.join(AKAR, "public", "udara", "data")
KELUAR = os.path.join(D.DATA, "tangga.json")
ARSIP = os.path.join(D.DATA, "tangga_arsip")

SKALA = [("musim", "Musim"), ("bulan", "Bulan"), ("dasarian", "Dasarian"), ("h10", "10 hari"), ("sepekan", "Sepekan"), ("h3", "3 hari"), ("jam", "Jam")]
ORDE = [s for s, _ in SKALA]
BASI_SPI_HARI = 45   # SPI terbit bulanan; dihitung dari tanggal update PDF
BASI_JAM = {"jam": 4, "harian": 48, "iklim": 14 * 24, "musim": 240 * 24}
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
BLN_PENUH = {n.lower(): i + 1 for i, n in enumerate(["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"])}
LEVEL = ["Normal", "Waspada", "Siaga", "Awas"]
ISPU = ["Baik/Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"]
GANDA = "entri ganda bertentangan"
KEKERINGAN = {"1": (1, "Waspada"), "2": (2, "Siaga"), "3": (3, "Awas")}
SEVERITY = {"Minor": 1, "Moderate": 2, "Severe": 3, "Extreme": 3}


# ---------- umum ----------
def waktu(s):
    """ISO (boleh 'Z', tanpa detik) -> datetime sadar zona, atau None."""
    try:
        d = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00").replace(" ", "T"))
    except (TypeError, ValueError):
        return None
    return d if d.tzinfo else d.replace(tzinfo=D.WIB)


def segar(s, jam, kini):
    d = waktu(s)
    return d is not None and (kini - d) <= dt.timedelta(hours=jam)


def tgl(s):
    try:
        d = dt.date.fromisoformat(str(s)[:10])
    except ValueError:
        return str(s)
    return f"{d.day} {BLN[d.month - 1]}"


def idn(x, n=1):
    return f"{x:.{n}f}".replace(".", ",")


def item(a, j, tk, t, x, s, c, p=None, u=None):
    d = {"a": a, "j": j, "tk": tk, "t": t, "x": x, "s": s, "c": c}
    if p:
        d["p"] = p
    if u:
        d["u"] = u
    return d


def rentang(periode):
    """'bulan November 2026' / 'Dasarian II November 2026' -> (awal, akhir) date, atau None."""
    m = re.search(r"(?:(Dasarian)\s+(III|II|I)\s+)?([A-Za-z]+)\s+(\d{4})", periode or "")
    if not m or m.group(3).lower() not in BLN_PENUH:
        return None
    bl, th = BLN_PENUH[m.group(3).lower()], int(m.group(4))
    akhir_bln = (dt.date(th + (bl == 12), bl % 12 + 1, 1) - dt.timedelta(days=1)).day
    if m.group(1):
        a, b = {"I": (1, 10), "II": (11, 20), "III": (21, akhir_bln)}[m.group(2)]
        return dt.date(th, bl, a), dt.date(th, bl, b)
    return dt.date(th, bl, 1), dt.date(th, bl, akhir_bln)


class Himpunan:
    """Penampung pernyataan menurut cakupan: nasional / provinsi / kab, lalu skala."""

    def __init__(self):
        self.nas, self.prov, self.kab = {}, {}, {}
        self.sumber, self.gagal, self.tak_cocok, self.ok = {}, [], {}, {}

    def taruh(self, tingkat, kunci, skala, it):
        if tingkat == "nas":
            self.nas.setdefault(skala, []).append(it)
        else:
            tgt = self.prov if tingkat == "prov" else self.kab
            tgt.setdefault(kunci, {}).setdefault(skala, []).append(it)

    def src(self, sid, **kw):
        self.sumber[sid] = kw

    def tandai(self, skala, a="kb"):
        """Sumber RESMI untuk skala ini termuat dan segar, untuk ancaman a (k, b, atau kb)."""
        for x in a:
            self.ok[(skala, x)] = True

    def lewat(self, ket):
        self.gagal.append(ket)

    def tc(self, sumber, n=1):
        self.tak_cocok[sumber] = self.tak_cocok.get(sumber, 0) + n


# ---------- pembaca sumber (masing-masing gagal-lunak) ----------
def muat_iklim(H, m, cari, kini):
    arsip = m.get("iklim_arsip")
    if not arsip:
        H.lewat("iklim_bmkg_arsip.json: tidak ada atau tidak terbaca")
        return
    hari = kini.date()
    # musim
    ps = sorted((v for v in (arsip.get("artikel") or {}).values() if v.get("hub") == "prediksi-musim" and isinstance(v.get("fakta"), dict)), key=lambda v: v.get("tanggal") or "", reverse=True)
    if ps and segar(ps[0].get("tanggal"), BASI_JAM["musim"], kini):
        v, f = ps[0], ps[0]["fakta"]
        topik = {"awal_dibanding": "awal musim", "puncak_bulan": "puncak musim", "panjang": "panjang musim", "akumulasi": "curah hujan musim"}
        bagian = []
        for k, nama in topik.items():
            z = [e for e in (f.get("zom") or []) if e.get("topik") == k and e.get("label")]
            if z:
                e = max(z, key=lambda e: e.get("persen") or 0)
                bagian.append(f"{nama.capitalize()}: {e['label']} ({e['zom']} ZOM, {idn(e['persen'])}% luas daratan)")
        enso = f"ENSO {f['enso_fase']}. " if f.get("enso_fase") else ""
        H.src("musim", lembaga="BMKG", nama=v.get("judul"), terbit=str(v.get("tanggal"))[:10], diambil=v.get("diambil"), cakupan="nasional", url=v.get("url"), jenis="resmi")
        H.taruh("nas", None, "musim", item("kb", "musim", None, "Prediksi musim", f"{enso}{'. '.join(bagian) or 'rincian ZOM tidak terbaca'}. Pemetaan ZOM ke kabupaten belum ada.", "musim", "nas"))
        H.tandai("musim", "kb")
    else:
        H.lewat("prediksi musim: tidak ada atau lebih tua dari 240 hari")
    # bulan dan dasarian: gabung pch (curah) + psh (sifat) per periode
    narasi = arsip.get("narasi") or {}
    grup = {}
    for n in narasi.values():
        pr = n.get("produk") or ""
        if pr[:3] not in ("pch", "psh") or pr[4:] not in ("bln", "das"):
            continue
        r = rentang(n.get("periode"))
        if r and r[1] >= hari:
            g = grup.setdefault((pr[4:], r), {"periode": n["periode"], "diambil": n.get("diambil")})
            peta = g.setdefault(pr[:3], {})
            for w in n.get("wilayah") or []:
                for x in w.get("kab") or []:
                    i = cari(x.get("prov"), x.get("nama"))
                    if i:
                        baru = (w.get("kategori"), w.get("rentang"))
                        if i in peta and peta[i][0] != baru[0]:
                            H.tc("iklim_ganda")   # entri ganda BMKG bertentangan: tanpa kategori dan tanpa peringkat, tercatat
                            peta[i] = (GANDA, None)
                        elif i not in peta:
                            peta[i] = baru
                    else:
                        H.tc("iklim")
    for jenis, skala, sid in (("bln", "bulan", "iklim_bln"), ("das", "dasarian", "iklim_das")):
        ada = sorted((k for k in grup if k[0] == jenis), key=lambda k: k[1][0])[:2]
        if not ada:
            H.lewat(f"{skala}: tidak ada periode yang belum berakhir")
            continue
        if not all(segar(grup[k]["diambil"], BASI_JAM["iklim"], kini) for k in ada):
            H.lewat(f"{skala}: diambil lebih dari 14 hari lalu")
            continue
        H.src(sid, lembaga="BMKG", nama="Prediksi curah hujan dan sifat hujan " + ("bulanan" if jenis == "bln" else "dasarian"), terbit=None, diambil=grup[ada[0]]["diambil"], cakupan="kabupaten", url="https://www.bmkg.go.id/iklim/prediksi-hujan", jenis="resmi")
        for k in ada:
            g = grup[k]
            for i in set(g.get("pch", {})) | set(g.get("psh", {})):
                cur, sif = g.get("pch", {}).get(i), g.get("psh", {}).get(i)
                # sifat dan curah = selisih dari normal / kelas curah, BUKAN peringatan: tanpa peringkat, tidak ikut sinyal (ALGORITMA 3)
                def kat(z, nama):
                    return "" if not z else f"{nama}: {GANDA}" if z[0] == GANDA else f"{nama} {z[0]} ({z[1]})"
                t = GANDA.capitalize() if sif and sif[0] == GANDA else sif[0] if sif else "sifat hujan tidak disebut"
                x = "; ".join(p for p in (kat(cur, "Curah hujan"), kat(sif, "sifat hujan")) if p) + "."
                H.taruh("kab", i, skala, item("kb", "iklim", None, t, x, sid, "kab", p=g["periode"]))
        H.tandai(skala, "kb")
    muat_spi(H, arsip, cari, kini)


def tgl_id(t):
    """'30 September 2026' -> date atau None."""
    m = re.match(r"\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", str(t or ""))
    try:
        return dt.date(int(m.group(3)), BLN_PENUH[m.group(2).lower()], int(m.group(1))) if m else None
    except (KeyError, ValueError):
        return None


def muat_spi(H, arsip, cari, kini):
    """SPI 1 dan 3 bulan per kabupaten (PDF BMKG yang sudah diurai). Kategori SPI BUKAN peringatan: tk null, tidak ikut sinyal (ALGORITMA 3).
    Satu item per kabupaten per sumber; kesegaran = tanggal update PDF (batas BASI_SPI_HARI), bukan waktu tarik."""
    terbaru = {}
    for v in (arsip.get("spi_pdf") or {}).values():
        if isinstance(v, dict) and isinstance(v.get("baris"), list) and v.get("spi_bulan") in (1, 3):
            if str(v.get("bulan_berkas")) > str(terbaru.get(v["spi_bulan"], {}).get("bulan_berkas", "")):
                terbaru[v["spi_bulan"]] = v
    if not terbaru:
        H.lewat("SPI (spi_pdf): tidak ada")
        return
    for n, v in sorted(terbaru.items()):
        up = tgl_id(v.get("update"))
        if up is None or (kini.date() - up).days > BASI_SPI_HARI:
            H.lewat(f"SPI {n} bulan: tanggal update PDF {v.get('update')!r} tidak terbaca atau lebih dari {BASI_SPI_HARI} hari")
            continue
        sid = f"spi{n}"
        H.src(sid, lembaga="BMKG", nama=f"Standardized Precipitation Index {n} bulan", terbit=None, update=v.get("update"), diambil=v.get("diambil"), cakupan="kabupaten", url=v.get("url"), jenis="resmi")
        per = {}
        for b in v["baris"]:
            i = cari(b.get("prov"), b.get("nama"))
            if not i:
                H.tc("spi")
                continue
            per.setdefault(i, [])
            tt = str(b.get("tingkat", "")).capitalize()
            if tt not in per[i]:
                per[i].append(tt)
        for i, tl in per.items():
            lab = tl[0] if len(tl) == 1 else "Terbagi: " + ", ".join(x.lower() if j else x for j, x in enumerate(tl))
            H.taruh("kab", i, "bulan", item("k", "spi", None, lab, f"SPI {n} bulan, berkas {v.get('bulan_berkas')}: " + (tl[0].lower() if len(tl) == 1 else "terbagi " + ", ".join(x.lower() for x in tl) + " (proporsi tidak ada di PDF)") + ". Kategori indeks, bukan peringatan.", sid, "kab", p=f"SPI {n} bulan"))
        H.tandai("bulan", "k")


def muat_kekeringan(H, m, cari, kini):
    d = m.get("peringatan_bmkg")
    if not d:
        H.lewat("peringatan_bmkg.json: tidak ada")
        return
    try:
        awal = dt.date(int(d["tahun"]), int(d["bulan"]), {1: 1, 2: 11, 3: 21}[int(d["dasarian"])])
        akhir = rentang("Dasarian " + ["I", "II", "III"][int(d["dasarian"]) - 1] + f" {list(BLN_PENUH)[int(d['bulan']) - 1]} {d['tahun']}")[1]
    except (KeyError, TypeError, ValueError):
        H.lewat("peringatan_bmkg.json: dasarian tidak terbaca")
        return
    if akhir < kini.date() or not segar(d.get("diambil"), BASI_JAM["harian"], kini):
        H.lewat(f"peringatan kekeringan {d.get('rentang')}: masa berlaku lewat atau berkas basi")
        return
    H.src("kekeringan", lembaga="BMKG", nama=d.get("judul"), terbit=d.get("tanggal"), diambil=d.get("diambil"), cakupan="kecamatan", url=d.get("url"), jenis="resmi")
    per = {}
    for pv, tingkat in (d.get("data") or {}).items():
        for lv, kabs in tingkat.items():
            if lv not in KEKERINGAN:
                continue
            for nk, kecs in kabs.items():
                i = cari(pv.title(), re.sub(r"^(KABUPATEN|KAB\.?)\s+", "", nk.strip(), flags=re.I).title())
                if not i:
                    H.tc("kekeringan")
                    continue
                per.setdefault(i, {}).setdefault(lv, set()).update(kecs)
    for i, lv in per.items():
        top = max(lv, key=int)
        tk, nama = KEKERINGAN[top]
        rinci = ", ".join(f"{len(lv[k])} kecamatan {KEKERINGAN[k][1]}" for k in sorted(lv, key=int, reverse=True))
        usai = akhir == kini.date()   # berakhir hari ini: tampil, tetapi tidak ikut sinyal (bukan pernyataan untuk dasarian berikutnya)
        H.taruh("kab", i, "dasarian", item("k", "kekeringan", None if usai else tk, nama, f"Peringatan dini kekeringan meteorologis dasarian {d.get('rentang')}: {rinci}." + (" Masa berlaku berakhir hari ini." if usai else ""), "kekeringan", "kec", p=d.get("rentang")))
    H.tandai("dasarian", "k")


def muat_h10(H, m, cari, kini):
    d = m.get("kab10")
    if not d or not isinstance(d.get("kab"), dict):
        H.lewat("cuaca_bmkg_kab10.json: tidak ada")
        return
    if not segar(d.get("dibuat"), BASI_JAM["harian"], kini):
        H.lewat("cuaca_bmkg_kab10.json: lebih dari 48 jam")
        return
    H.src("h10", lembaga="BMKG", nama="Prakiraan cuaca 10 hari per kab/kota", terbit=None, diambil=d.get("dibuat"), cakupan="kabupaten", url="https://www.bmkg.go.id/cuaca/prakiraan-cuaca", jenis="resmi")
    daftar = {k["id"]: k for k in m["kab_daftar"]}
    for kode, v in d["kab"].items():
        i = kode.replace(".", "")
        if i not in daftar or D.kunci(daftar[i]["nama"]) != D.kunci(v.get("nama", "")):
            i = cari(v.get("prov"), v.get("nama", "")) if "/" not in kode else None
        if not i:
            H.tc("kab10")
            continue
        hr = v.get("hari") or []
        if not hr:
            continue
        kond = [h.get("kondisi") or "" for h in hr]
        n = len(kond)
        nh = sum(1 for x in kond if "Hujan" in x)
        nk = sum(1 for x in kond if "Hujan" not in x and "Petir" not in x)
        urut = ["Sangat Lebat", "Lebat", "Hujan Petir", "Hujan Sedang", "Hujan Ringan"]   # hanya urutan tampil kondisi terberat; BUKAN peringkat (tk null, Q10)
        tb = next((x for u in urut for x in kond if u in x), None)
        hari_tb = next((h["tgl"] for h in hr if h.get("kondisi") == tb), None) if tb else None
        p = f"{tgl(hr[0]['tgl'])} sampai {tgl(hr[-1]['tgl'])}"
        H.taruh("kab", i, "h10", item("b", "hujan", None, tb or "Tanpa hujan", f"{nh} dari {n} hari berkondisi hujan" + (f"; kondisi terberat {tb} ({tgl(hari_tb)})." if tb else "."), "h10", "kab", p=p))
        H.taruh("kab", i, "h10", item("k", "hujan", None, f"Tanpa hujan {nk} dari {n} hari", "Prakiraan kondisi harian BMKG, bukan peringatan kekeringan.", "h10", "kab", p=p))
    H.tandai("h10", "kb")


def muat_sepekan(H, m, kini):
    art = (m.get("sepekan") or {}).get("artikel")
    if art and isinstance(art.get("prakiraan"), list) and art.get("periode"):
        akhir = dt.date.fromisoformat(art["periode"]["sampai"])
        if akhir >= kini.date():
            H.src("sepekan", lembaga="BMKG", nama=art.get("judul"), terbit=str(art.get("terbit"))[:10], diambil=(m["sepekan"]).get("dibuat"), cakupan="provinsi", url=None, jenis="resmi")
            per = {}
            for w in art["prakiraan"]:
                p = w.get("periode") or {}
                ket = f"{tgl(p.get('dari'))} sampai {tgl(p.get('sampai'))}"
                for t in w.get("tingkat") or []:
                    if t.get("tingkat") in ("Awas", "Siaga"):
                        for kp in t.get("kode_prov") or []:
                            per.setdefault(kp, []).append((3 if t["tingkat"] == "Awas" else 2, t["label"], ket))
                for kp in w.get("sedang_kode_prov") or []:
                    per.setdefault(kp, []).append((None, "Hujan sedang", ket))
            for kp, lst in per.items():
                tk, label, _ = max(lst, key=lambda e: -1 if e[0] is None else e[0])
                x = "Prakiraan sepekan BMKG: " + "; ".join(f"{k}, {e}" for (_, e, k) in lst) + "."
                H.taruh("prov", kp, "sepekan", item("b", "hujan", tk, label, x, "sepekan", "prov", p=f"{tgl(art['periode']['dari'])} sampai {tgl(art['periode']['sampai'])}"))
            H.tandai("sepekan", "b")
        else:
            H.lewat("prakiraan sepekan BMKG: periode sudah lewat")
    else:
        H.lewat("cuaca_sepekan.json: tidak ada atau bentuk berubah")
    k = m.get("karhutla_bmkg")
    if not k or not segar(k.get("diambil"), BASI_JAM["harian"], kini) or (k.get("berlaku_sampai") or "0") < kini.date().isoformat():
        H.lewat("karhutla_bmkg.json: tidak ada, basi, atau masa berlaku lewat")
        return
    H.src("karhutla", lembaga="BMKG", nama="Factsheet monitoring dan potensi karhutla", terbit=k.get("tanggal"), diambil=k.get("diambil"), cakupan="provinsi", url=k.get("url"), jenis="resmi")
    p = f"{tgl(k.get('berlaku_dari'))} sampai {tgl(k.get('berlaku_sampai'))}"
    for kp in ((k.get("rekomendasi") or {}).get("perhatian_khusus") or {}).get("kode_prov") or []:
        H.taruh("prov", kp, "sepekan", item("k", "karhutla", 2, "Perhatian khusus", "Factsheet karhutla BMKG: provinsi ini termasuk perhatian khusus karhutla.", "karhutla", "prov", p=p))
    for pulau, v in ((k.get("potensi_fwi") or {}).get("per_pulau") or {}).items():
        for kp in (v.get("risiko_tertinggi") or {}).get("kode_prov") or []:   # relatif per pulau, bukan tingkat mutlak: tk null
            H.taruh("prov", kp, "sepekan", item("k", "fwi", None, "Tertinggi di pulau ini", f"Factsheet karhutla BMKG: risiko FWI tertinggi di Pulau {pulau} (urutan relatif di pulau itu, bukan tingkat mutlak).", "karhutla", "prov", p=p))
    for kp in ((k.get("asap") or {}).get("provinsi_berasap") or {}).get("kode_prov") or []:   # pengamatan, bukan prakiraan tingkat: tk null
        H.taruh("prov", kp, "sepekan", item("k", "asap", None, "Asap terpantau", "Factsheet karhutla BMKG: provinsi ini termasuk provinsi berasap pada pengamatan.", "karhutla", "prov", p=p))
    H.tandai("sepekan", "k")


def muat_h3_bmkg(H, m, kini):
    f = m.get("factsheet")
    if not f or not segar(f.get("diambil"), BASI_JAM["harian"], kini) or (f.get("berlaku_sampai") or "0") < kini.date().isoformat():
        H.lewat("cuaca_factsheet.json: tidak ada, basi, atau masa berlaku lewat")
        return
    H.src("factsheet", lembaga="BMKG", nama="Ikhtisar cuaca harian (ensemble 3 hari)", terbit=f.get("tanggal"), diambil=f.get("diambil"), cakupan="provinsi", url=None, jenis="resmi")
    for e in f.get("ensemble_3hari") or []:
        if e.get("ada_wilayah"):
            for kp in e.get("kode_prov") or []:
                H.taruh("prov", kp, "h3", item("b", "hujan lebat", 2, f"Peluang ensemble >{e['peluang_persen']}%", f"{tgl(e['tanggal'])}: peluang ensemble lebih dari {e['peluang_persen']}% untuk hujan lebih dari {e['ambang_mm']} mm.", "factsheet", "prov", p=tgl(e["tanggal"])))
    H.tandai("h3", "b")


def muat_h3_kita(H, m, kini):
    d = m.get("prediksi")
    if not d or not segar(d.get("dibuat"), BASI_JAM["harian"], kini):
        H.lewat("prediksi.json: tidak ada atau lebih dari 48 jam")
        return
    H.src("kita", lembaga="Centurisk97", nama="Prediksi model Centurisk97 (/prediksi)", terbit=None, diambil=d.get("dibuat"), cakupan="kabupaten", url=None, jenis="kita")
    kode = d.get("kode") or {}
    hari = (kode.get("BNJ") or kode.get("HJN") or {}).get("hari") or []

    def vonis(kd, kol, n):
        """Vonis rapor hanya untuk tenggang yang sama dengan hari yang dikutip (n = indeks hari 0..2)."""
        v = ((kode.get(kd) or {}).get("vonis") or {}).get(f"{kol}|{n + 1}")
        return v[0] if v else None

    trig = {(w["kab"], w["aturan"]) for w in d.get("waspada") or []}
    for k in d.get("kab") or []:
        i = k["id"]
        for kd, nama in (("BNJ", "banjir"), ("LSR", "longsor")):
            r = k.get(kd) or []
            lv = [(x[0], n) for n, x in enumerate(r) if x and x[0] is not None]
            if not lv:
                continue
            tk, n = max(lv)
            ps = r[n][1] if len(r[n]) > 1 else None
            ket = f"Prediksi model: {nama} level {LEVEL[tk]}" + (f" pada {tgl(hari[n])}" if n < len(hari) else "") + (f", peluang Siaga {D_persen(ps)}" if ps is not None else "") + "."
            H.taruh("kab", i, "h3", item("b", nama, tk, LEVEL[tk] if tk else "Aturan belum terpenuhi", ket, "kita", "kab", u=vonis(kd, "ps", n) or "belum teruji"))
        api = [(x[0], n) for n, x in enumerate(k.get("API") or []) if x and x[0] is not None]
        if api:
            p, n = max(api)
            aturan = (i, "karhutla") in trig
            H.taruh("kab", i, "h3", item("k", "karhutla", 1 if aturan else 0, "Waspada" if aturan else "Aturan belum terpenuhi", f"Prediksi model: peluang titik panas {D_persen(p)}" + (f" pada {tgl(hari[n])}" if n < len(hari) else "") + f"; aturan karhutla {'terpenuhi' if aturan else 'belum terpenuhi'}.", "kita", "kab", u=vonis("API", "p", n) or "belum teruji"))
        asp = [(x[1], n, x[0]) for n, x in enumerate(k.get("ASP") or []) if x and x[1] is not None]
        if asp:
            kat, n, pm = max(asp)
            kat = min(max(int(kat), 0), 3)
            H.taruh("kab", i, "h3", item("k", "asap", kat, ISPU[kat], f"Prediksi model: PM2,5 sampai {idn(pm, 0) if pm is not None else '-'} ug/m3" + (f" pada {tgl(hari[n])}" if n < len(hari) else "") + ", kategori ISPU.", "kita", "kab", u=vonis("ASP", "pm", n) or "belum teruji"))


def D_persen(p):
    return "kurang dari 5%" if p < 0.05 else "lebih dari 95%" if p > 0.95 else f"{round(p * 20) * 5}%"


def muat_jam(H, m, cari, kini):
    p = m.get("peringatan")
    if p and segar(p.get("dibuat"), BASI_JAM["jam"], kini):
        H.src("nowcast", lembaga="BMKG", nama="Peringatan dini cuaca (nowcast)", terbit=None, diambil=p.get("dibuat"), cakupan="kecamatan", url="https://www.bmkg.go.id/alerts/nowcast/id", jenis="resmi")
        per = {}
        for a in p.get("nowcast") or []:
            sl = waktu(a.get("selesai"))
            if sl is None or sl < kini:
                continue
            for kp in a.get("prov") or []:
                per.setdefault(kp, []).append(a)
        for kp, lst in per.items():
            tk = max(SEVERITY.get(a.get("severity"), 0) for a in lst)
            ev = sorted({a.get("event") or "peringatan" for a in lst})
            wil = ", ".join(sorted({(a.get("wilayah") or "").title() for a in lst if a.get("wilayah")})[:3])
            H.taruh("prov", kp, "jam", item("b", "hujan lebat", tk, "; ".join(ev), f"{len(lst)} peringatan dini aktif" + (f", antara lain kecamatan {wil}" if wil else "") + ".", "nowcast", "prov"))
        H.tandai("jam", "b")
    else:
        H.lewat("peringatan.json (nowcast): tidak ada atau lebih dari 4 jam")
    pt = m.get("petir")
    if pt and segar(pt.get("diambil"), BASI_JAM["jam"], kini):
        H.src("petir", lembaga="BMKG", nama="Petir realtime (jendela sekitar 30 menit)", terbit=None, diambil=pt.get("diambil"), cakupan="kabupaten", url=pt.get("url"), jenis="analisis")
        for x in pt.get("kabupaten") or []:
            i = cari(x.get("kode_prov"), x.get("kab"))
            if not i:
                H.tc("petir")
            elif x.get("n"):
                H.taruh("kab", i, "jam", item("b", "petir", None, "pengamatan", f"{x['n']} sambaran petir terekam dalam sekitar 30 menit terakhir.", "petir", "kab"))
    else:
        H.lewat("cuaca_petir.json: tidak ada atau lebih dari 4 jam")
    aw = m.get("awan")
    if aw and segar(aw.get("dibuat"), BASI_JAM["jam"], kini):
        H.src("awan", lembaga="Centurisk97", nama="Analisis awan dingin Himawari-9", terbit=None, diambil=aw.get("dibuat"), cakupan="kabupaten", url=None, jenis="analisis")
        for kid, v in (aw.get("kab") or {}).items():
            i = cari(kid[:2], v.get("kab"))
            if not i:
                H.tc("awan")
            elif v.get("persen_dingin"):
                H.taruh("kab", i, "jam", item("b", "awan", None, "analisis", f"Awan dingin menutupi {idn(v['persen_dingin'])}% titik contoh, puncak perkiraan kasar {idn(v.get('tinggi_puncak_km_perkiraan') or 0)} km. Analisis kita, bukan peringatan.", "awan", "kab"))
    else:
        H.lewat("awan_himawari.json: tidak ada atau lebih dari 4 jam")


# ---------- sinyal ----------
KELAS_C = {"nas": "nas", "prov": "prov", "kab": "kab", "kec": "kab"}   # kecamatan diringkas ke kabupaten
HALUS = {"nas": 0, "prov": 1, "kab": 2}


def sinyal(r, c=None):
    """r = peringkat tk per skala (urutan ORDE; hanya peringatan resmi), None = tanpa tingkat; c = kelas cakupan penentu tiap skala (nas/prov/kab).
    searah (d): tidak menurun, skala terdekat >= 1, paling sedikit dua skala >= 1.
    menguat (m): searah DAN naik tegas (terdekat > terjauh) DAN semua skala bertingkat bercakupan sama; selain itu searah (cakupan beda atau datar).
    belum selaras (s): selisih >= 2 HANYA antar skala bercakupan sama. -> {m, d, s, r, c, par?}"""
    c = list(c) if c else [None] * len(r)
    v = [(i, x) for i, x in enumerate(r) if x is not None]
    nilai = [x for _, x in v]
    naik = len(v) >= 2 and all(a <= b for a, b in zip(nilai, nilai[1:])) and nilai[-1] >= 1 and sum(1 for x in nilai if x >= 1) >= 2
    m = naik and nilai[-1] > nilai[0] and len({c[i] for i, _ in v}) == 1
    par = None
    for a in range(len(v)):
        for b in range(a + 1, len(v)):
            if c[v[a][0]] != c[v[b][0]]:
                continue
            sel = abs(v[a][1] - v[b][1])
            if sel >= 2 and (par is None or sel > par[0]):
                par = (sel, v[a][0], v[b][0])
    out = {"m": bool(m), "d": bool(naik and not m), "s": par is not None, "r": list(r), "c": c}
    if par:
        out["par"] = [par[1], par[2]]
    return out


def tk_a(e, a):
    """Peringkat item e untuk ancaman a; item 'kb' iklim membawa [kering, basah]."""
    if a not in e["a"]:
        return None
    return e["tk"][0 if a == "k" else 1] if isinstance(e["tk"], list) else e["tk"]


def peringkat(H, prov, i):
    """-> ({a: [tk per skala dari BMKG]}, {a: [kelas cakupan penentu]}, {a: tk kita}) untuk kab i. Iklim: hanya periode terdekat yang belum berakhir (ALGORITMA 2)."""
    res, cak = {"k": [], "b": []}, {"k": [], "b": []}
    kita = {"k": None, "b": None}
    for sk in ORDE:
        pool = list(H.nas.get(sk, [])) + list(H.prov.get(prov, {}).get(sk, [])) + list(H.kab.get(i, {}).get(sk, []))
        ik = [e for e in pool if e["j"] == "iklim"]
        if ik:
            awal = min(rentang(e["p"])[0] for e in ik)
            pool = [e for e in pool if e["j"] != "iklim" or rentang(e["p"])[0] == awal]
        for a in ("k", "b"):
            tks = [(tk_a(e, a), HALUS[KELAS_C[e["c"]]], KELAS_C[e["c"]]) for e in pool if H.sumber[e["s"]]["jenis"] == "resmi"]
            tks = [x for x in tks if x[0] is not None]
            top = max(tks) if tks else None   # tk tertinggi; seri: cakupan lebih halus
            res[a].append(top[0] if top else None)
            cak[a].append(top[2] if top else None)
            if sk == "h3":
                kt = [x for x in (tk_a(e, a) for e in pool if H.sumber[e["s"]]["jenis"] == "kita") if x is not None]
                kita[a] = max(kt) if kt else None
    return res, cak, kita


def susun(m, kini):
    """m = masukan termuat (lihat MASUKAN) -> tangga dict. Murni: tidak membaca berkas, tidak menulis."""
    H = Himpunan()
    kab_daftar = m["kab_daftar"]
    cari = D.pencari(kab_daftar)
    for fn, args in ((muat_iklim, (H, m, cari, kini)), (muat_kekeringan, (H, m, cari, kini)), (muat_h10, (H, m, cari, kini)), (muat_sepekan, (H, m, kini)),
                     (muat_h3_bmkg, (H, m, kini)), (muat_h3_kita, (H, m, kini)), (muat_jam, (H, m, cari, kini))):
        try:
            fn(*args)
        except Exception as e:  # gagal-lunak: satu sumber rusak tidak menjatuhkan tangga lain
            H.lewat(f"{fn.__name__}: {type(e).__name__}: {e}")
    prov_kab = {k["id"]: k["prov"] for k in kab_daftar}
    kab_out, cak = {}, {s: {"kab": 0, "prov": 0, "nas": 0, "kosong": 0} for s in ORDE}
    menguat, searah, selaras = {"k": 0, "b": 0}, {"k": 0, "b": 0}, {"k": 0, "b": 0}
    for k in kab_daftar:
        i, p = k["id"], k["prov"]
        e = {s: H.kab[i][s] for s in ORDE if i in H.kab and s in H.kab[i]}
        res, cc, kita = peringkat(H, p, i)
        sg = {a: sinyal(res[a], cc[a]) for a in ("k", "b")}
        for a in ("k", "b"):
            menguat[a] += sg[a]["m"]
            searah[a] += sg[a]["d"]
            selaras[a] += sg[a]["s"]
        e["sg"], e["kita"] = sg, kita
        for s in ORDE:
            if s in e:
                cak[s]["kab"] += 1
            elif s in H.prov.get(p, {}):
                cak[s]["prov"] += 1
            elif s in H.nas:
                cak[s]["nas"] += 1
            else:
                cak[s]["kosong"] += 1
        kab_out[i] = e
    skala = [{"id": s, "nama": n, "ok": {a: bool(H.ok.get((s, a))) for a in ("k", "b")}, "gagal": [g for g in H.gagal if g.lower().startswith(tuple(PREFIKS.get(s, ())))]} for s, n in SKALA]
    return {"versi": 1, "dibuat": kini.isoformat(timespec="seconds"), "hari": kini.date().isoformat(), "skala": skala, "sumber": H.sumber, "nasional": H.nas,
            "prov": H.prov, "kab": kab_out,
            "ringkas": {"n_kab": len(kab_out), "cakupan": cak, "menguat": menguat, "searah": searah, "belum_selaras": selaras, "tak_cocok": H.tak_cocok},
            "catatan": ["Peringkat 0 sampai 3 hanya untuk sinyal; label resmi tidak diubah. Sinyal hanya dari BMKG; prediksi kita terpisah.",
                        "Pernyataan yang hanya sampai provinsi atau nasional ditandai cakupannya dan tidak diklaim sebagai kabupaten.",
                        "Anak tangga musim: pemetaan ZOM ke kabupaten belum ada, tampil tingkat nasional."],
            "gagal": H.gagal}


PREFIKS = {"musim": ("prediksi musim", "iklim_bmkg_arsip"), "bulan": ("bulan", "iklim_bmkg_arsip"), "dasarian": ("dasarian", "peringatan kekeringan", "peringatan_bmkg", "iklim_bmkg_arsip"),
           "h10": ("cuaca_bmkg_kab10",), "sepekan": ("prakiraan sepekan", "cuaca_sepekan", "karhutla_bmkg"), "h3": ("cuaca_factsheet", "prediksi.json"),
           "jam": ("peringatan.json", "cuaca_petir", "awan_himawari")}


# ---------- berkas ----------
MASUKAN = {"iklim_arsip": os.path.join(BANJIR, "iklim_bmkg_arsip.json"), "peringatan_bmkg": os.path.join(BANJIR, "peringatan_bmkg.json"),
           "kab10": os.path.join(BANJIR, "cuaca_bmkg_kab10.json"), "sepekan": os.path.join(BANJIR, "cuaca_sepekan.json"),
           "karhutla_bmkg": os.path.join(BANJIR, "karhutla_bmkg.json"), "factsheet": os.path.join(BANJIR, "cuaca_factsheet.json"),
           "peringatan": os.path.join(BANJIR, "peringatan.json"), "petir": os.path.join(BANJIR, "cuaca_petir.json"),
           "awan": os.path.join(UDARA, "awan_himawari.json"), "prediksi": os.path.join(D.DATA, "prediksi.json")}


LIVE_REL = {"peringatan": "banjir/data/peringatan.json", "petir": "banjir/data/cuaca_petir.json", "awan": "udara/data/awan_himawari.json"}
JAM_KUNCI = {"peringatan": "dibuat", "petir": "diambil", "awan": "dibuat"}


def tarik_live(rel, ambil=None):
    """Salinan segar dari situs live (env LIVE, sama dengan langkah tarik di prediksi.yml). Gagal = None, tanpa galat."""
    base = os.environ.get("LIVE", "").rstrip("/")
    if not base:
        return None
    try:
        import urllib.request
        with urllib.request.urlopen(f"{base}/{rel}", timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:  # noqa: BLE001  gagal-lunak
        return None


def muat():
    m = {k: D.baca(j) for k, j in MASUKAN.items()}
    kini = dt.datetime.now(D.WIB)
    for k, rel in LIVE_REL.items():   # sumber jam: salinan git sering basi; ganti dengan yang live bila lokal basi
        if not (m.get(k) and segar(m[k].get(JAM_KUNCI[k]), BASI_JAM["jam"], kini)):
            baru = tarik_live(rel)
            if baru:
                m[k] = baru
    m["kab_daftar"] = D.kab()
    return m


def baris_arsip(t, tangga):
    kab = {}
    for i, e in tangga["kab"].items():
        r = [e["sg"]["k"]["r"], e["sg"]["b"]["r"]]
        if any(x is not None for rr in r for x in rr):
            kab[i] = r
    return {"t": t, "dibuat": tangga["dibuat"], "skala": ORDE, "kab": kab} if kab else None


def tambah_arsip(baris, folder=ARSIP):
    """Satu baris per tanggal; baris yang ada tidak diubah. -> True bila ditulis."""
    jalur = os.path.join(folder, baris["t"][:7] + ".jsonl")
    lama = D.baris_arsip(jalur)
    if any(json.loads(b)["t"] == baris["t"] for b in lama):
        return False
    os.makedirs(folder, exist_ok=True)
    with open(jalur, "a") as f:
        f.write(json.dumps(baris, ensure_ascii=False, separators=(",", ":")) + "\n")
    galat = D.periksa_arsip(lama, D.baris_arsip(jalur))
    if galat:
        print(f"tangga: {galat} sesudah menulis {jalur}", file=sys.stderr)
        sys.exit(3)
    return True


def jalankan():
    kini = dt.datetime.now(D.WIB)
    try:
        t = susun(muat(), kini)
    except Exception as e:  # gagal-lunak
        print(f"tangga: gagal ({type(e).__name__}: {e}); tangga.json lama dipertahankan", file=sys.stderr)
        return 0
    ada = any(e for v in t["kab"].values() for s, e in v.items() if s in ORDE)
    if not ada and os.path.exists(KELUAR):
        print("tangga: tidak ada satu pun pernyataan; tangga.json lama dipertahankan", file=sys.stderr)
    else:
        D.simpan(KELUAR, t)
        b = baris_arsip(t["hari"], t)
        if b:
            print("tangga: arsip " + ("ditambah" if tambah_arsip(b) else "hari ini sudah ada"))
    r = t["ringkas"]
    print(f"tangga: {r['n_kab']} kab; menguat kering {r['menguat']['k']} basah {r['menguat']['b']}; searah kering {r['searah']['k']} basah {r['searah']['b']}; belum selaras kering {r['belum_selaras']['k']} basah {r['belum_selaras']['b']}")
    for s in t["skala"]:
        c = r["cakupan"][s["id"]]
        print(f"  {s['id']:9} ok={s['ok']!s:5} kab {c['kab']} prov {c['prov']} nas {c['nas']} kosong {c['kosong']}")
    for g in t["gagal"]:
        print(f"  dilewati: {g}")
    return 0


# ---------- uji ----------
def uji():
    kini = dt.datetime(2026, 11, 10, 12, 0, tzinfo=D.WIB)
    # periode
    assert rentang("bulan November 2026") == (dt.date(2026, 11, 1), dt.date(2026, 11, 30))
    assert rentang("Dasarian III Desember 2026") == (dt.date(2026, 12, 21), dt.date(2026, 12, 31))
    assert rentang("Dasarian II November 2026") == (dt.date(2026, 11, 11), dt.date(2026, 11, 20)) and rentang("xx") is None
    # sinyal: aturan terbuka (ALGORITMA 4). menguat = naik tegas DAN cakupan sama; selain itu searah
    K = ["kab"] * 7
    g = sinyal([None, 0, 1, None, 2, None, 2], K)
    assert g["m"] is True and g["d"] is False, g
    g = sinyal([None, 1, None, None, None, None, 1], K)
    assert g["m"] is False and g["d"] is True, "datar = searah, bukan menguat"
    g = sinyal([None, 1, None, None, None, None, 2], [None, "prov", None, None, None, None, "kab"])
    assert g["m"] is False and g["d"] is True, "cakupan beda = searah, bukan menguat"
    assert sinyal([None, 1, None, None, None, None, 2], K)["m"] is True
    assert sinyal([None, None, None, None, None, None, 2], K)["d"] is False and sinyal([None, None, None, None, None, None, 2], K)["m"] is False, "satu skala saja"
    assert sinyal([None, 2, None, None, None, None, 1], K)["m"] is False and sinyal([None, 2, None, None, None, None, 1], K)["d"] is False, "menurun mendekat"
    assert sinyal([None, 0, 0, None, 0, None, 0], K)["m"] is False, "semua nol"
    s_ = sinyal([None, 0, None, None, 2, None, None], K)
    assert s_["s"] is True and s_["par"] == [1, 4] and s_["m"] is False, s_
    assert sinyal([None, 1, None, None, 2, None, None], K)["s"] is False, "selisih 1 selaras"
    assert sinyal([None] * 7) == {"m": False, "d": False, "s": False, "r": [None] * 7, "c": [None] * 7}
    # belum selaras hanya antar skala bercakupan sama: provinsi (2) vs kabupaten (null) bukan pertentangan
    assert sinyal([None, 0, None, None, 2, None, None], [None, "kab", None, None, "prov", None, None])["s"] is False
    assert sinyal([None, 0, None, None, 2, None, None], [None, "prov", None, None, "prov", None, None])["s"] is True
    # fixture kecil: 3 kab, dua provinsi
    kab = [{"id": "1101", "nama": "Kab. Aceh Selatan", "prov": "11", "pn": "Aceh", "geo": "11|Aceh Selatan"},
           {"id": "1102", "nama": "Kab. Aceh Tenggara", "prov": "11", "pn": "Aceh", "geo": "11|Aceh Tenggara"},
           {"id": "3204", "nama": "Kab. Bandung", "prov": "32", "pn": "Jawa Barat", "geo": "32|Bandung"}]

    def wil(kat, rng, *ks):
        return {"kategori": kat, "rentang": rng, "kab": [{"prov": p, "nama": n, "kode": "x"} for p, n in ks]}

    def narasi(pr, periode, *w):
        return {"produk": pr, "periode": periode, "wilayah": list(w), "diambil": "2026-11-10T10:00+07:00"}
    iklim = {"artikel": {"m": {"hub": "prediksi-musim", "judul": "Prediksi Musim Hujan 2026/2027", "tanggal": "2026-10-02 09:11:18", "diambil": "2026-11-10T10:00+07:00",
                               "fakta": {"enso_fase": "El Nino Sangat Kuat", "zom": [{"topik": "awal_dibanding", "label": "MUNDUR", "zom": 529, "persen": 61.08}]}}},
             "narasi": {"a": narasi("pch_bln", "bulan November 2026", wil("Rendah", "0-100 mm per bulan", ("Aceh", "Aceh Selatan"))),
                        "b": narasi("psh_bln", "bulan November 2026", wil("Bawah Normal", "kurang dari 85%", ("Aceh", "Aceh Selatan")), wil("Atas Normal", "115% hingga 150%", ("Jawa Barat", "Bandung"))),
                        "c": narasi("psh_bln", "bulan Oktober 2026", wil("Bawah Normal", "x", ("Aceh", "Aceh Selatan"))),
                        "d": narasi("psh_das", "Dasarian II November 2026", wil("Bawah Normal", "x", ("Aceh", "Aceh Selatan"))),
                        "e": narasi("psh_bln", "bulan Desember 2026", wil("Normal", "85% hingga 115%", ("Aceh", "Aceh Tenggara"), ("Aceh", "Kab Fiktif")), wil("Bawah Normal", "x", ("Aceh", "Aceh Tenggara")), wil("Jauh di Atas Normal", "lebih dari 150%", ("Jawa Barat", "Bandung")))}}
    iklim["spi_pdf"] = {"a": {"spi_bulan": 1, "bulan_berkas": "202610", "update": "30 September 2026", "url": "u", "diambil": "2026-11-10T10:00+07:00", "baris": [{"tingkat": "SANGAT KERING", "prov": "Aceh", "nama": "Aceh Selatan"}, {"tingkat": "KERING", "prov": "Aceh", "nama": "Aceh Selatan"}, {"tingkat": "KERING", "prov": "Aceh", "nama": "Kab Fiktif"}]},
                         "b": {"spi_bulan": 1, "bulan_berkas": "202609", "diambil": "2026-11-10T10:00+07:00", "baris": [{"tingkat": "KERING", "prov": "Aceh", "nama": "Aceh Tenggara"}]}}
    kek = {"tahun": 2026, "bulan": 11, "dasarian": 1, "tanggal": "2026-11-01", "rentang": "1-10 November 2026", "diambil": "2026-11-10T09:00+07:00", "judul": "x", "url": None,
           "data": {"ACEH": {"1": {"KABUPATEN ACEH SELATAN": ["A", "B"]}, "3": {"KABUPATEN ACEH SELATAN": ["C"]}}}}
    seminggu = {"dibuat": "2026-11-10T08:00+07:00", "artikel": {"judul": "Sepekan", "terbit": "2026-11-10 07:47:23", "periode": {"dari": "2026-11-10", "sampai": "2026-11-16"},
                                                               "prakiraan": [{"periode": {"dari": "2026-11-10", "sampai": "2026-11-12"}, "sedang_kode_prov": ["32"], "tingkat": [{"tingkat": "Siaga", "label": "Siaga (hujan lebat)", "kode_prov": ["11"]}]}]}}
    karh = {"tanggal": "2026-11-10", "berlaku_dari": "2026-11-10", "berlaku_sampai": "2026-11-16", "diambil": "2026-11-10T09:00+07:00", "url": None,
            "rekomendasi": {"perhatian_khusus": {"kode_prov": ["32"]}}, "potensi_fwi": {"per_pulau": {"Jawa": {"risiko_tertinggi": {"kode_prov": ["32"]}}}}, "asap": {"provinsi_berasap": {"kode_prov": ["11"]}}}
    fs = {"diambil": "2026-11-10T09:00+07:00", "tanggal": "2026-11-10", "berlaku_sampai": "2026-11-12", "ensemble_3hari": [{"tanggal": "2026-11-11", "peluang_persen": 60, "ambang_mm": 50, "ada_wilayah": True, "kode_prov": ["11"]}]}
    hari10 = [{"tgl": f"2026-11-{10 + n}", "kondisi": "Hujan Ringan" if n else "Hujan Petir"} for n in range(10)]
    k10 = {"dibuat": "2026-11-10T09:00+07:00", "kab": {"11.01": {"nama": "Aceh Selatan", "prov": "11", "hari": hari10}, "32.04": {"nama": "Bandung", "prov": "32", "hari": [{"tgl": "2026-11-10", "kondisi": "Cerah"}]},
                                                   "71.05/71.10": {"nama": "X/Y", "prov": "71", "hari": hari10}}}
    nc = {"dibuat": "2026-11-10T09:00+07:00", "nowcast": [{"event": "Hujan Lebat", "severity": "Moderate", "selesai": "2026-11-10T15:00:00+07:00", "wilayah": "KOTA FIKTIF", "prov": ["11"]},
                                                          {"event": "Petir", "severity": "Severe", "selesai": "2026-11-10T08:00:00+07:00", "wilayah": "SUDAH LEWAT", "prov": ["32"]}]}
    kita = {"dibuat": "2026-11-10T08:00+07:00", "kode": {"BNJ": {"hari": ["2026-11-11", "2026-11-12", "2026-11-13"], "vonis": {"ps|1": ["belum teruji", 0, 0, False], "ps|2": ["mengalahkan baseline", 90, 0.1, False]}}, "API": {}, "ASP": {}},
            "waspada": [{"kab": "1101", "tenggang": 2, "aturan": "karhutla"}],
            "kab": [{"id": "1101", "BNJ": [[0, 0.01], [2, 0.4], [1, 0.1]], "API": [[0.2, 0], [0.6, 0], [0.1, 0]], "ASP": [[30, 1], [40, 2], None]}, {"id": "1102"}, {"id": "3204"}]}
    m = {"iklim_arsip": iklim, "peringatan_bmkg": kek, "kab10": k10, "sepekan": seminggu, "karhutla_bmkg": karh, "factsheet": fs, "peringatan": nc, "petir": None, "awan": None, "prediksi": kita, "kab_daftar": kab}
    t = susun(m, kini)
    k1, k2, k3 = t["kab"]["1101"], t["kab"]["1102"], t["kab"]["3204"]
    # musim: nasional saja
    assert t["nasional"]["musim"][0]["c"] == "nas" and t["nasional"]["musim"][0]["tk"] is None and "MUNDUR" in t["nasional"]["musim"][0]["x"] and "musim" not in k1
    # bulan: periode Oktober sudah lewat dibuang; sifat/curah tanpa peringkat (bukan peringatan)
    ik1 = [e for e in k1["bulan"] if e["j"] == "iklim"]
    assert len(ik1) == 1 and ik1[0]["tk"] is None and ik1[0]["a"] == "kb" and ik1[0]["t"] == "Bawah Normal", ik1
    # SPI: berkas terbaru per spi_bulan, kategori apa adanya, tanpa peringkat, tanggal update apa adanya; tak cocok dihitung
    spi = [e for e in k1["bulan"] if e["j"] == "spi"]
    assert len(spi) == 1 and spi[0]["t"] == "Terbagi: Sangat kering, kering" and "proporsi tidak ada" in spi[0]["x"] and spi[0]["tk"] is None and spi[0]["a"] == "k" and t["sumber"]["spi1"]["update"] == "30 September 2026" and t["sumber"]["spi1"]["terbit"] is None
    assert not [e for e in k2["bulan"] if e["j"] == "spi"], "berkas 202609 lebih lama dari 202610: tidak dipakai"
    assert t["ringkas"]["tak_cocok"]["spi"] == 1 and t["ringkas"]["tak_cocok"]["iklim_ganda"] == 1
    g2 = [e for e in k2["bulan"] if e["j"] == "iklim"]
    assert [e["tk"] for e in g2] == [None] and g2[0]["t"] == "Entri ganda bertentangan" and "bertentangan" in g2[0]["x"], "entri ganda bertentangan: tanpa kategori dan tanpa peringkat"
    assert k1["sg"]["k"]["r"][ORDE.index("bulan")] is None and k1["sg"]["b"]["r"][ORDE.index("bulan")] is None, "iklim dan SPI tidak ikut peringkat"
    ok = {s["id"]: s["ok"] for s in t["skala"]}
    assert ok["sepekan"] == {"k": True, "b": True} and ok["h3"] == {"k": False, "b": True} and ok["jam"] == {"k": False, "b": True} and ok["musim"] == {"k": True, "b": True}
    assert [e["tk"] for e in k3["bulan"]] == [None, None] and [e["t"] for e in k3["bulan"]] == ["Atas Normal", "Jauh di Atas Normal"] and k3["sg"]["b"]["r"][ORDE.index("bulan")] is None, "Atas Normal tidak disejajarkan dengan peringatan resmi"
    # kab tanpa pernyataan bulan Nov tetap punya pernyataan Des
    assert {e["p"] for e in k2["bulan"]} == {"bulan Desember 2026"} and t["ringkas"]["tak_cocok"]["iklim"] == 1
    # dasarian: kekeringan berakhir hari ini (10 Nov) tampil tetapi tanpa peringkat; sehari sebelumnya Awas = 3 (tingkat tertinggi)
    ds = [e for e in k1["dasarian"] if e["j"] == "kekeringan"]
    assert ds and ds[0]["tk"] is None and ds[0]["t"] == "Awas" and ds[0]["c"] == "kec" and "2 kecamatan Waspada" in ds[0]["x"] and "berakhir hari ini" in ds[0]["x"], k1["dasarian"]
    ds9 = [e for e in susun(m, kini - dt.timedelta(days=1))["kab"]["1101"]["dasarian"] if e["j"] == "kekeringan"]
    assert ds9[0]["tk"] == 3 and "berakhir" not in ds9[0]["x"]
    # 10 hari: id Kepmendagri bertitik, entri gabungan dilewati dan dihitung
    h10 = {e["a"]: e for e in k1["h10"]}
    assert h10["b"]["tk"] is None and h10["b"]["t"] == "Hujan Petir" and h10["k"]["tk"] is None and t["ringkas"]["tak_cocok"]["kab10"] == 1
    assert {e["a"]: e["tk"] for e in k3["h10"]} == {"b": None, "k": None} and "Tanpa hujan 1 dari 1" in [e for e in k3["h10"] if e["a"] == "k"][0]["t"]
    # provinsi tidak diklaim kab: pernyataan sepekan/h3/jam ada di prov, TIDAK di entri kab
    assert "sepekan" not in k1 and t["prov"]["11"]["sepekan"][0]["c"] == "prov" and t["prov"]["11"]["h3"][0]["c"] == "prov" and "jam" not in k1
    assert {e["j"]: e["tk"] for e in t["prov"]["11"]["sepekan"]} == {"hujan": 2, "asap": None}, "asap terpantau tanpa peringkat"
    assert {e["j"]: e["tk"] for e in t["prov"]["32"]["sepekan"]} == {"hujan": None, "karhutla": 2, "fwi": None}, "FWI relatif per pulau dan hujan sedang tanpa peringkat"
    assert [e["tk"] for e in t["prov"]["11"]["jam"]] == [2] and "jam" not in t["prov"]["32"], "nowcast yang sudah selesai tidak tampil"
    # prediksi kita: terpisah dari sinyal
    kt = {(e["j"]): e for e in k1["h3"]}
    assert kt["banjir"]["tk"] == 2 and kt["banjir"]["t"] == "Siaga" and kt["banjir"]["u"] == "mengalahkan baseline" and "12 Nov" in kt["banjir"]["x"], kt["banjir"]
    assert kt["asap"]["u"] == "belum teruji" and kt["karhutla"]["u"] == "belum teruji"
    assert kt["karhutla"]["tk"] == 1 and kt["asap"]["tk"] == 2 and k1["kita"] == {"k": 2, "b": 2}
    sg = k1["sg"]["b"]["r"]
    assert sg[ORDE.index("h3")] == 2 and sg[ORDE.index("h10")] is None and sg[ORDE.index("sepekan")] == 2, "kita (h3) tidak ikut sinyal; h3 = ensemble BMKG provinsi"
    # menguat basah Aceh Selatan: bulan 0, h10 2, sepekan 2, h3 2, jam 2 -> tidak menurun, >=2 skala >=1
    assert k1["sg"]["b"]["m"] is False and k1["sg"]["b"]["d"] is True and k1["sg"]["b"]["s"] is False, k1["sg"]["b"]   # 2,2,2 pada provinsi: searah, datar
    assert k1["sg"]["b"]["c"][ORDE.index("sepekan")] == "prov" and k1["sg"]["b"]["c"][ORDE.index("h10")] is None
    assert not any("aman" in json.dumps(v, ensure_ascii=False).lower().replace("kemarau", "") for v in (t["kab"], t["prov"], t["nasional"])), "tidak pernah menulis aman"
    # SPI: kesegaran memakai tanggal update PDF, bukan waktu tarik
    lama = dict(m, iklim_arsip=dict(iklim, spi_pdf={"a": dict(iklim["spi_pdf"]["a"], update="1 Agustus 2026")}))
    tl = susun(lama, kini)
    assert not [e for e in tl["kab"]["1101"]["bulan"] if e["j"] == "spi"] and any("SPI 1 bulan" in g for g in tl["gagal"])
    # petir menyala tidak membuat ok jam menyala bila nowcast gagal
    tp = susun(dict(m, peringatan=None, petir={"diambil": "2026-11-10T11:00+07:00", "kabupaten": [{"kode_prov": "11", "kab": "Aceh Selatan", "n": 5}]}), kini)
    assert [s for s in tp["skala"] if s["id"] == "jam"][0]["ok"] == {"k": False, "b": False} and tp["kab"]["1101"]["jam"][0]["j"] == "petir"
    # sumber hilang: tidak menggagalkan, anak tangga ditandai
    m2 = dict(m, kab10=None, iklim_arsip=None, prediksi=None)
    t2 = susun(m2, kini)
    assert t2["ringkas"]["n_kab"] == 3 and not any([s for s in t2["skala"] if s["id"] == "h10"][0]["ok"].values()) and any("kab10" in g for g in t2["gagal"]), t2["gagal"]
    # basi: nowcast 6 jam lalu dibuang
    m3 = dict(m, peringatan=dict(nc, dibuat="2026-11-10T05:00+07:00"))
    assert "jam" not in susun(m3, kini)["prov"].get("11", {}) and any("peringatan.json" in g for g in susun(m3, kini)["gagal"])
    # masukan rusak (bentuk berubah) tidak melempar
    t4 = susun(dict(m, kab10={"dibuat": "2026-11-10T09:00+07:00", "kab": "rusak"}, sepekan={"artikel": {"prakiraan": 5}}), kini)
    assert t4["ringkas"]["n_kab"] == 3
    # arsip append-only
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        b = baris_arsip("2026-11-10", t)
        assert b and set(b["kab"]) == {"1101", "1102", "3204"} and len(b["kab"]["1101"]) == 2 and len(b["kab"]["1101"][0]) == 7
        assert tambah_arsip(b, tmp) is True and tambah_arsip(dict(b, dibuat="lain"), tmp) is False, "hari sama tidak menimpa"
        assert len(D.baris_arsip(os.path.join(tmp, "2026-11.jsonl"))) == 1
        assert baris_arsip("2026-11-10", t2) is not None
    os.environ.pop("LIVE", None)
    assert tarik_live("banjir/data/peringatan.json") is None, "tanpa LIVE tidak ada jaringan"
    print("tangga: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:]:
        sys.exit(__doc__)
    else:
        sys.exit(jalankan())
