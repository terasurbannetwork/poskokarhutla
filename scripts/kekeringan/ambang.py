"""Penyetelan ambang status kekeringan terhadap kejadian kering DIBI -> bagian `setel` di public/data/kekeringan_ujibalik.json (dipanggil ujibalik.bangun).

Protokol (ditulis sebelum angka kandidat dilihat; rinci di scripts/kekeringan/RISET-AMBANG.md):
  satuan    kabupaten-bulan seperti ujibalik `kejadian`; alarm kab = >= 30% penduduk di kecamatan yang selnya beralarm (status.py); diagnosis serentak.
  pembagian LATIH Okt 2023 - Des 2024 untuk MEMILIH aturan; UJI Jan 2025 - bulan SPI terakhir, dihitung SEKALI untuk aturan terpilih dan pembanding saja.
  kandidat  7 keluarga x ambang t in {-0,5, -1, -1,5} = 21 konfigurasi, tidak ada yang lain:
              A s3<=t | B s6<=t | C s3<=t DAN s6<=t | D s3<=t ATAU s6<=t | E s3<=t DAN klim<100 mm | F C DAN klim<100 mm | G hujan bulan itu <60 mm DAN s3<=t
            s3/s6 = SPI-3/6 (spi.spi_seri, baku 1991-2020 seperti status.py), klim = rerata hujan bulan itu 1991-2020 di sel (bukan bulan basah Schmidt-Ferguson).
            HTH, persentil tanah, ambang per pulau, dan batas 30% tidak disetel (alasan di RISET-AMBANG.md).
  memilih   CSI tertinggi di LATIH; seri -> urutan daftar.
  layak     di UJI: POD >= 0,5, FAR <= 0,8, CSI >= 2 x CSI acak (ujibalik.KRITERIA_LAYAK) DAN batas bawah selang bootstrap 95% CSI > CSI acak.
  selang    2.000 ulangan, bulan dicuplik ulang dengan pengembalian, benih tetap.
  pembanding aturan sekarang (A, t=-1) dan alarm acak (laju alarm & laju kejadian sama).
  akibat    hanya bila layak status.py memakai aturan terpilih; bila tidak, status tidak berubah dan hasil tampil di Metode.

Pakai:  python3 scripts/kekeringan/ambang.py uji
"""
import calendar, os, random, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
import spi as SPI
import ujibalik as UB

LATIH = ("2023-10", "2024-12")
UJI_AWAL = "2025-01"
AMBANG_T = (-.5, -1.0, -1.5)
KELUARGA = {"A": "SPI-3 <= t", "B": "SPI-6 <= t", "C": "SPI-3 <= t dan SPI-6 <= t", "D": "SPI-3 <= t atau SPI-6 <= t",
            "E": "SPI-3 <= t di musim kemarau setempat (rerata hujan bulan itu 1991-2020 < 100 mm)",
            "F": "SPI-3 <= t dan SPI-6 <= t di musim kemarau setempat", "G": "hujan bulan itu < 60 mm dan SPI-3 <= t"}
MUSIM_MM, KERING_MM, BATAS_WIL = 100, 60, .30
SEKARANG = ("A", -1.0)
ULANG, BENIH = 2000, 20261019


def kode(kel, t):
    return f"{kel}{t:+.1f}".replace(".", ",")


def bulan_antara(a, b):
    y, m = int(a[:4]), int(a[5:])
    out = []
    while f"{y}-{m:02d}" <= b:
        out.append((y, m))
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out


def fitur(pow_sel, bulan):
    """{sel: {(y, m): (s3, s6, hujan_mm, klim_mm)}}"""
    out = {}
    for k, seri in pow_sel.items():
        klim = {}
        for m in range(1, 13):
            v = [seri[f"{y}{m:02d}"] * calendar.monthrange(y, m)[1] for y in range(SPI.DASAR[0], SPI.DASAR[1] + 1) if seri.get(f"{y}{m:02d}") is not None]
            klim[m] = sum(v) / len(v) if v else None
        d = {}
        for y, m in bulan:
            v = seri.get(f"{y}{m:02d}")
            d[(y, m)] = (SPI.spi_seri(seri, y, m, 3), SPI.spi_seri(seri, y, m, 6), None if v is None else v * calendar.monthrange(y, m)[1], klim[m])
        out[k] = d
    return out


def alarm_sel(kel, t, f):
    """True/False, atau None bila sel tak bernilai (s3 kosong; untuk musim/hujan juga bila bahannya kosong). s6 kosong = tidak menguatkan."""
    s3, s6, h, k = f
    if kel == "B":
        return None if s6 is None else s6 <= t
    if s3 is None:
        return None
    a3, a6 = s3 <= t, s6 is not None and s6 <= t
    if kel == "A":
        return a3
    if kel == "C":
        return a3 and a6
    if kel == "D":
        return a3 or a6
    if kel in "EF":
        if k is None:
            return None
        return a3 and (kel == "E" or a6) and k < MUSIM_MM
    if kel == "G":
        return None if h is None else a3 and h < KERING_MM
    raise ValueError(kel)


def tabulasi(kel, t, fit, peta, obs, bulan):
    """{(y, m): (tepat, terlewat, palsu, tak_ada)} per bulan."""
    out = {}
    for y, m in bulan:
        per = {}
        for _, kab, jiwa, sel in peta:
            a = alarm_sel(kel, t, fit[sel][(y, m)]) if sel in fit else None
            if a is None:
                continue
            w = per.setdefault(kab, [0, 0])
            w[0] += jiwa * a
            w[1] += jiwa
        ym = f"{y}-{m:02d}"
        h = mm = f = n = 0
        for kab, (ja, jt) in per.items():
            o, al = (kab, ym) in obs, jt > 0 and ja / jt >= BATAS_WIL
            h, mm, f, n = h + (o and al), mm + (o and not al), f + (al and not o), n + (not o and not al)
        out[(y, m)] = (h, mm, f, n)
    return out


def jumlah(tab, bulan):
    s = [0, 0, 0, 0]
    for b in bulan:
        for i, x in enumerate(tab[b]):
            s[i] += x
    return s


def selang(tab, bulan, ulang=ULANG, benih=BENIH):
    """Selang 95% POD/FAR/CSI dengan bulan dicuplik ulang (pengembalian)."""
    rng = random.Random(benih)
    nilai = {"pod": [], "far": [], "csi": []}
    for _ in range(ulang):
        h, m, f, _n = jumlah(tab, [rng.choice(bulan) for _ in bulan])
        if h + m:
            nilai["pod"].append(h / (h + m))
        if h + f:
            nilai["far"].append(f / (h + f))
        if h + m + f:
            nilai["csi"].append(h / (h + m + f))
    q = lambda v: [round(v[int(.025 * (len(v) - 1))], 3), round(v[int(.975 * (len(v) - 1))], 3)] if v else None
    return {k: q(sorted(v)) for k, v in nilai.items()}


def vonis(skor, ci):
    k = UB.KRITERIA_LAYAK
    f = lambda x: "tak ada" if x is None else f"{x:.2f}".replace(".", ",")
    gagal = []
    if skor["pod"] is None or skor["pod"] < k["pod_min"]:
        gagal.append(f"POD {f(skor['pod'])} < {f(k['pod_min'])}")
    if skor["far"] is None or skor["far"] > k["far_maks"]:
        gagal.append(f"FAR {f(skor['far'])} > {f(k['far_maks'])}")
    if skor["csi"] is None or skor["csi_acak"] is None or skor["csi"] < k["csi_lipat_acak"] * skor["csi_acak"]:
        gagal.append(f"CSI {f(skor['csi'])} kurang dari {f(k['csi_lipat_acak'])}x alarm acak ({f(skor['csi_acak'])})")
    if not ci.get("csi") or skor["csi_acak"] is None or ci["csi"][0] <= skor["csi_acak"]:
        gagal.append(f"batas bawah selang CSI {f(ci['csi'][0] if ci.get('csi') else None)} tidak di atas alarm acak")
    layak = not gagal
    return {"layak": layak, "hipotesis": not layak, "alasan": "Lolos kriteria di periode uji." if layak else "Belum layak di periode uji: " + "; ".join(gagal) + "."}


def setel(pow_sel, peta, obs, bulan_akhir):
    latih = bulan_antara(*LATIH)
    uji = bulan_antara(UJI_AWAL, bulan_akhir)
    if not uji:
        raise ValueError("periode uji kosong")
    fit = fitur(pow_sel, latih + uji)
    kand = []
    for kel in KELUARGA:
        for t in AMBANG_T:
            tab = tabulasi(kel, t, fit, peta, obs, latih)
            kand.append({"kode": kode(kel, t), "keluarga": kel, "t": t, "latih": UB.skor_kontingensi(*jumlah(tab, latih))})
    # memilih HANYA dari skor latih; max() mengambil yang pertama bila seri (urutan daftar)
    pilih = max(kand, key=lambda c: c["latih"]["csi"] if c["latih"]["csi"] is not None else -1)
    hasil = {}
    for nama, (kel, t) in (("terpilih", (pilih["keluarga"], pilih["t"])), ("sekarang", SEKARANG)):
        tab = tabulasi(kel, t, fit, peta, obs, uji)
        s = UB.skor_kontingensi(*jumlah(tab, uji))
        hasil[nama] = {"kode": kode(kel, t), "latih": next(c["latih"] for c in kand if c["kode"] == kode(kel, t)), "uji": s, "uji_selang95": selang(tab, uji)}
    return {"protokol": "scripts/kekeringan/RISET-AMBANG.md", "latih": [LATIH[0], LATIH[1]], "uji": [UJI_AWAL, bulan_akhir], "kandidat_n": len(kand),
            "keluarga": KELUARGA, "ambang_t": list(AMBANG_T), "batas_wilayah": BATAS_WIL, "pemilihan": "CSI tertinggi di periode latih; skor uji hanya untuk terpilih dan aturan sekarang",
            "kriteria_layak": {**UB.KRITERIA_LAYAK, "csi_bawah_selang_di_atas_acak": True}, "bootstrap": {"ulang": ULANG, "cuplik": "bulan", "benih": BENIH},
            "kandidat": kand, "terpilih": pilih["kode"], "hasil": hasil, "vonis": vonis(hasil["terpilih"]["uji"], hasil["terpilih"]["uji_selang95"])}


def uji():
    assert kode("A", -1.0) == "A-1,0" and kode("G", -.5) == "G-0,5" and len(bulan_antara("2023-10", "2024-12")) == 15
    assert alarm_sel("A", -1, (-1.2, None, 10, 50)) is True and alarm_sel("C", -1, (-1.2, None, 10, 50)) is False and alarm_sel("D", -1, (0, -1.1, 10, 50)) is True
    assert alarm_sel("E", -1, (-1.2, None, 10, 150)) is False and alarm_sel("E", -1, (-1.2, None, 10, 90)) is True and alarm_sel("G", -1, (-1.2, None, 70, 90)) is False
    assert alarm_sel("A", -1, (None, -2, 0, 0)) is None and alarm_sel("B", -1, (None, -2, 0, 0)) is True and alarm_sel("G", -1, (-2, None, None, 0)) is None
    # sintetis: 4 sel, satu kab per sel. Sel 0 & 1 kering parah di Jun-Sep tiap tahun (musim kemarau: klim kecil); sel 2 kering di musim hujan; sel 3 normal.
    # Kejadian hanya di sel 0 & 1 bulan Jul-Agu -> keluarga musim (E/F/G) harus menang di latih; uji LAYAK dan selang deterministik.
    def seri(kemarau, kering_basah):
        d = {}
        for y in range(1991, 2027):
            for m in range(1, 13):
                if (y, m) > (2026, 8):
                    continue
                base = (.8 if 6 <= m <= 9 else 8.0) if kemarau else 8.0
                v = base * (1 + ((y * 7 + m * 3) % 5 - 2) * .05)
                if y >= 2023 and ((kemarau and 6 <= m <= 9) or (kering_basah and m in (1, 2, 12))):
                    v *= .1
                d[f"{y}{m:02d}"] = v
        return d
    pw = {"0.25,0.25": seri(True, False), "0.25,1.25": seri(True, False), "0.25,2.25": seri(False, True), "0.25,3.25": seri(False, False)}
    peta = [("11", f"11|K{i}", 1000, f"0.25,{i}.25") for i in range(4)]
    obs = {(f"11|K{i}", f"{y}-{m:02d}"): 1 for i in (0, 1) for y in (2023, 2024, 2025, 2026) for m in (7, 8) if (y, m) >= (2023, 10)}
    s = setel(pw, peta, obs, "2026-08")
    assert s["kandidat_n"] == 21 and s["terpilih"][0] in "EFG", s["terpilih"]
    u = s["hasil"]["terpilih"]["uji"]
    assert u["pod"] == 1.0 and u["far"] <= .8 and s["vonis"]["layak"] is True, (u, s["vonis"])
    assert s["hasil"]["sekarang"]["kode"] == "A-1,0" and setel(pw, peta, obs, "2026-08")["hasil"]["terpilih"]["uji_selang95"] == s["hasil"]["terpilih"]["uji_selang95"]
    assert all("uji" not in c for c in s["kandidat"])                                       # skor uji kandidat lain tidak dihitung
    # pemilihan buta terhadap uji: kejadian uji dipindah ke sel 2 bulan Jan -> terpilih tetap sama, vonis jatuh
    obs2 = {k: v for k, v in obs.items() if k[1] < "2025-01"}
    obs2.update({("11|K2", f"{y}-01"): 1 for y in (2025, 2026)})
    s2 = setel(pw, peta, obs2, "2026-08")
    assert s2["terpilih"] == s["terpilih"] and s2["vonis"]["layak"] is False and "Belum layak" in s2["vonis"]["alasan"]
    # tanpa kejadian uji: POD tak ada -> tidak layak, tanpa galat
    s3 = setel(pw, peta, {k: v for k, v in obs.items() if k[1] < "2025-01"}, "2026-08")
    assert s3["vonis"]["layak"] is False
    try:
        setel(pw, peta, obs, "2024-12")
        raise SystemExit("periode uji kosong harus ditolak")
    except ValueError:
        pass
    print("ok ambang")


if __name__ == "__main__":
    uji()
