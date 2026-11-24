#!/usr/bin/env python3
"""Grafik, peta, dan diagram handout Sespimti Polri (18 Nov 2026).

Angka dihitung dari data repo, bukan diketik: DIBI (data/kajian-bnpb/data/dibi), prediksi BMKG dan model
(public/prediksi/data/tangga.json), batas kab (data/kajian-bnpb/data/air-jawa/peta_kab.geojson).
Keluaran: gambar/*.png dan angka.json (dibaca bangun.py).
Pakai: py grafik.py
"""
import csv, json, re
from collections import defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyBboxPatch, Polygon, FancyArrowPatch, Circle, Wedge
import numpy as np

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[3]
GBR = SINI / "gambar"; GBR.mkdir(exist_ok=True)
DIBI = AKAR / "data/kajian-bnpb/data/dibi"

import os
for d in (Path("C:/Windows/Fonts"), Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/Windows/Fonts"):
    for f in ("Roboto-Regular.ttf", "Roboto-Bold.ttf", "Roboto-Medium.ttf"):
        if (d / f).exists(): font_manager.fontManager.addfont(str(d / f))
plt.rcParams.update({"font.family": "Roboto", "font.size": 9, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#8A94A0", "axes.labelcolor": "#2E3440", "xtick.color": "#2E3440", "ytick.color": "#2E3440"})

NAVY, BIRU, BIRU_MUDA, ORANYE, MERAH, HIJAU, ABU, ABU_MUDA, TINTA = "#051C2C", "#2F86D1", "#DCEBF8", "#D9600B", "#C8102E", "#2E8B57", "#8A94A0", "#EEF1F4", "#1A1A1A"
KRIS_W = [BIRU, ORANYE, HIJAU, MERAH]


def rb(x):  # ribuan gaya Indonesia
    return f"{x:,.0f}".replace(",", ".")


def simpan(fig, nama):
    fig.savefig(GBR / f"{nama}.png", dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)


ANGKA = {}

# ---------------------------------------------------------------- data DIBI nasional
nas = defaultdict(lambda: defaultdict(float)); jenis25 = {}
for r in csv.DictReader(open(DIBI / "rekap_nasional_tahunan.csv", encoding="utf-8")):
    if r["cakupan"] != "bencana" or r["klasifikasi"] != "alam": continue
    th = int(r["tahun"])
    seri_ok = (th < 2024 and r["seri"] == "pra2024") or (th >= 2024 and r["seri"] == "juklak2023")
    if not seri_ok: continue
    for c in ("kejadian", "meninggal", "hilang", "mengungsi", "rumah_rusak"):
        nas[th][c] += float(r[c] or 0)
    if th == 2025:
        jenis25[r["kategori_dibi"]] = {c: float(r[c] or 0) for c in ("kejadian", "meninggal", "hilang", "mengungsi")}
ANGKA["nasional"] = {th: {k: round(v) for k, v in d.items()} for th, d in sorted(nas.items()) if th >= 2016}
ANGKA["jenis2025"] = {k: {a: round(b) for a, b in v.items()} for k, v in jenis25.items()}

# G2: nasional 2025 per jenis
NAMA_J = {"Banjir": "Banjir", "Kebakaran hutan dan lahan": "Karhutla", "Cuaca ekstrem": "Cuaca ekstrem", "Longsor": "Tanah longsor",
          "Gelombang pasang / Abrasi": "Gelombang/abrasi", "Kekeringan": "Kekeringan", "Gempabumi": "Gempa bumi", "Erupsi gunung api": "Erupsi", "Tsunami": "Tsunami"}
urut = sorted(jenis25, key=lambda k: jenis25[k]["kejadian"])
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.2, 3.4), gridspec_kw={"wspace": 0.55})
y = np.arange(len(urut))
a1.barh(y, [jenis25[k]["kejadian"] for k in urut], color=[BIRU if k != "Banjir" else NAVY for k in urut], height=.65)
a1.set_yticks(y, [NAMA_J.get(k, k) for k in urut]); a1.set_title("Kejadian", loc="left", fontweight="bold", color=NAVY)
for i, k in enumerate(urut): a1.text(jenis25[k]["kejadian"] + 30, i, rb(round(jenis25[k]["kejadian"])), va="center", fontsize=8)
a1.set_xlim(0, 2800); a1.tick_params(axis="x", labelsize=7)
mh = {k: jenis25[k]["meninggal"] + jenis25[k]["hilang"] for k in urut}
a2.barh(y, [mh[k] for k in urut], color=[MERAH if k == "Banjir" else ORANYE for k in urut], height=.65)
a2.set_yticks(y, [NAMA_J.get(k, k) for k in urut]); a2.set_title("Meninggal dan hilang (jiwa)", loc="left", fontweight="bold", color=NAVY)
for i, k in enumerate(urut): a2.text(mh[k] + 20, i, rb(mh[k]), va="center", fontsize=8)
a2.set_xlim(0, 1900); a2.tick_params(axis="x", labelsize=7)
simpan(fig, "g02_nasional_jenis_2025")

# G3: tren nasional 2016-2025
th = [t for t in sorted(nas) if 2016 <= t <= 2025]
fig, ax = plt.subplots(figsize=(7.2, 3.0))
mhv = [nas[t]["meninggal"] + nas[t]["hilang"] for t in th]
ax.bar(th, mhv, color=[MERAH if t == 2025 else BIRU for t in th], width=.6)
for t, v in zip(th, mhv): ax.text(t, v + 25, rb(v), ha="center", fontsize=8, color=TINTA)
ax.set_ylabel("Meninggal dan hilang (jiwa)"); ax.set_xticks(th, [str(t) for t in th])
ax.axvline(2023.5, color=ABU, ls="--", lw=.8); ax.text(2023.55, max(mhv) * .92, "seri data baru\n(juklak 2023)", fontsize=7, color=ABU)
ax2 = ax.twinx(); mg = [nas[t]["mengungsi"] / 1e6 for t in th]
ax2.plot(th, mg, color=ORANYE, marker="o", lw=1.6); ax2.set_ylabel("Mengungsi (juta jiwa)", color=ORANYE)
ax2.spines["right"].set_visible(True); ax2.spines["top"].set_visible(False); ax2.tick_params(axis="y", colors=ORANYE)
ax2.set_ylim(0, max(mg) * 1.25)
simpan(fig, "g03_tren_nasional")

# ---------------------------------------------------------------- Jawa Barat
jb_prov = defaultdict(lambda: defaultdict(float))
for r in csv.DictReader(open(DIBI / "rekap_provinsi_tahunan.csv", encoding="utf-8")):
    if r["kode_prov"] != "32" or r["cakupan"] != "bencana" or r["klasifikasi"] != "alam": continue
    t = int(r["tahun"])
    if t < 2024 or r["seri"] != "juklak2023": continue
    if r["kategori_dibi"] not in ("Banjir", "Longsor"): continue
    for c in ("kejadian", "meninggal", "hilang", "mengungsi", "rumah_rusak", "rumah_terendam"):
        jb_prov[(t, r["kategori_dibi"])][c] += float(r[c] or 0)
ANGKA["jabar_prov"] = {f"{t}-{j}": {k: round(v) for k, v in d.items()} for (t, j), d in sorted(jb_prov.items())}

BANJIR_J = {"banjir", "banjir_bandang", "banjir_dan_longsor"}
kab = defaultdict(lambda: defaultdict(float)); namakab = {}
for r in csv.DictReader(open(DIBI / "jawa_kab_hidromet.csv", encoding="utf-8")):
    if r["kode_prov"] != "32" or r["cakupan"] != "bencana" or r["jenis_hidromet"] not in BANJIR_J: continue
    t = int(r["tahun"])
    if t < 2024: continue
    namakab[r["kode_kab_bps"]] = r["kab"]
    for c in ("kejadian", "meninggal", "hilang", "mengungsi", "rumah_terendam"):
        kab[(r["kode_kab_bps"], t)][c] += float(r[c] or 0)
tot = {k: sum(kab[(k, t)]["kejadian"] for t in (2024, 2025, 2026)) for k in namakab}
top = sorted(tot, key=lambda k: -tot[k])[:10]
ANGKA["jabar_kab_top"] = [{"kode": k, "kab": namakab[k], **{str(t): {c: round(kab[(k, t)][c]) for c in ("kejadian", "mengungsi", "rumah_terendam")} for t in (2024, 2025, 2026)}} for k in top]

# G5: Jabar banjir per tahun, tiga ukuran
fig, axs = plt.subplots(1, 3, figsize=(7.2, 2.6), gridspec_kw={"wspace": .45})
tt = [2024, 2025, 2026]; lab = ["2024", "2025", "2026*"]
for ax, (c, judul, warna) in zip(axs, [("kejadian", "Kejadian banjir", NAVY), ("mengungsi", "Mengungsi (jiwa)", ORANYE), ("rumah_terendam", "Rumah terendam", BIRU)]):
    v = [jb_prov[(t, "Banjir")][c] for t in tt]
    ax.bar(lab, v, color=[warna, warna, ABU], width=.6)
    for i, x in enumerate(v): ax.text(i, x * 1.02, rb(x), ha="center", va="bottom", fontsize=8)
    ax.set_title(judul, loc="left", fontweight="bold", color=NAVY, fontsize=9); ax.set_yticks([]); ax.spines["left"].set_visible(False)
    ax.set_ylim(0, max(v) * 1.2)
fig.text(0.01, -0.04, "* 2026 sementara, data DIBI sampai 23 Oktober 2026.", fontsize=7, color=ABU)
simpan(fig, "g05_jabar_tahunan")

# G7: kab teratas, kejadian bertumpuk per tahun
fig, ax = plt.subplots(figsize=(7.2, 3.3))
yy = np.arange(len(top))[::-1]; kiri = np.zeros(len(top))
for t, w in zip(tt, [BIRU_MUDA, BIRU, NAVY]):
    v = np.array([kab[(k, t)]["kejadian"] for k in top])
    ax.barh(yy, v, left=kiri, color=w, height=.65, label=str(t) + ("*" if t == 2026 else ""), edgecolor="white", lw=.5)
    kiri += v
for i, k in enumerate(top): ax.text(kiri[i] + .5, yy[i], rb(kiri[i]), va="center", fontsize=8)
ax.set_yticks(yy, [("Kab. " if not namakab[k].startswith("Kota") else "") + namakab[k] for k in top])
ax.set_xlabel("Jumlah kejadian banjir 2024 sampai 2026 (DIBI)"); ax.legend(frameon=False, loc="lower right", fontsize=8)
simpan(fig, "g07_jabar_kab_teratas")

# ---------------------------------------------------------------- peta Jabar
geo = json.load(open(AKAR / "data/kajian-bnpb/data/air-jawa/peta_kab.geojson", encoding="utf-8"))
fjb = [f for f in geo["features"] if f["properties"]["prov_kode"] == "32"]


def cincin(f):
    g = f["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    for p in polys: yield np.array(p[0])


def pusat(f):
    best = max(cincin(f), key=len)
    return best[:, 0].mean(), best[:, 1].mean()


def peta(ax, warna_fn, label_fn=None):
    for f in fjb:
        for ring in cincin(f):
            ax.add_patch(Polygon(ring, closed=True, fc=warna_fn(f["properties"]["kode"]), ec="white", lw=.6))
    if label_fn:
        for f in fjb:
            k = f["properties"]["kode"]; s = label_fn(k)
            if s:
                x, y = pusat(f); gelap = warna_fn(k) in (NAVY, "#3E78C0", ORANYE, MERAH)
                ax.text(x, y, s, ha="center", va="center", fontsize=6.6, color="white" if gelap else TINTA, fontweight="bold", linespacing=1.15)
    ax.set_xlim(106.35, 108.85); ax.set_ylim(-7.85, -5.9); ax.set_aspect("equal"); ax.axis("off")


def kotak_legenda(ax, item, judul):
    from matplotlib.patches import Patch
    ax.legend([Patch(fc=w, ec="#C9D1DA") for w, _ in item], [t for _, t in item], title=judul, loc="upper left", bbox_to_anchor=(0, 0.02),
              ncol=len(item), frameon=False, fontsize=7, title_fontsize=7.5, handlelength=1.2, columnspacing=1.0, alignment="left")


SINGKAT = {"Kota Bogor": "", "Kota Sukabumi": "", "Kota Bandung": "", "Kota Cirebon": "", "Kota Bekasi": "",
           "Kota Depok": "", "Kota Cimahi": "", "Kota Tasikmalaya": "", "Kota Banjar": "", "Bandung Barat": "Bandung\nBarat"}
nm = {f["properties"]["kode"]: f["properties"]["nama"] for f in fjb}
singkat = lambda k: SINGKAT.get(nm[k], nm[k])

# G6: peta kejadian banjir 2024-2026
kelas = [(0, 5, "#E6EEF7"), (5, 15, "#A9C4E4"), (15, 30, "#5C8FCB"), (30, 999, NAVY)]
def w_kej(k):
    v = tot.get(k, 0)
    for lo, hi, w in kelas:
        if lo <= v < hi: return w
fig, ax = plt.subplots(figsize=(7.2, 5.0))
peta(ax, w_kej, lambda k: (singkat(k) + (f"\n{rb(tot.get(k,0))}" if tot.get(k, 0) >= 15 else "")) if singkat(k) else "")
for f in fjb:  # teks putih di kelas gelap
    pass
kotak_legenda(ax, [(w, f"{lo} sampai {hi - 1}" if hi < 999 else f"{lo} atau lebih") for lo, hi, w in kelas], "Kejadian banjir 2024 sampai 2026")
simpan(fig, "g06_peta_jabar_kejadian")

# ---------------------------------------------------------------- prediksi
tg = json.load(open(AKAR / "public/prediksi/data/tangga.json", encoding="utf-8"))
ANGKA["tangga_dibuat"] = tg["dibuat"]
ANGKA["musim"] = tg["nasional"]["musim"][0]["x"]
bln = {}; h3 = {}; lsr = {}
for k in nm:
    e = tg["kab"].get(k, {})
    for b in e.get("bulan", []):
        if "Desember" in (b.get("p") or ""):
            m = re.search(r"Curah hujan (\w+(?: \w+)?) \(", b["x"]); bln[k] = (m.group(1) if m else "", b["t"])
        if "November" in (b.get("p") or ""):
            bln.setdefault(k + "nov", (b["t"],))
    for h in e.get("h3", []):
        if h["j"] == "banjir": h3[k] = (h["t"], h["x"])
        if h["j"] == "longsor": lsr[k] = (h["t"], h["x"])
ANGKA["bmkg_des"] = {nm[k]: {"curah": bln[k][0], "sifat": bln[k][1]} for k in nm if k in bln}
ANGKA["bmkg_nov_sifat"] = {nm[k]: bln[k + "nov"][0] for k in nm if k + "nov" in bln}
ANGKA["model_banjir"] = {nm[k]: h3[k][0] for k in nm if k in h3}
ANGKA["model_banjir_x"] = {nm[k]: h3[k][1] for k in nm if k in h3}
ANGKA["model_longsor"] = {nm[k]: lsr[k][0] for k in nm if k in lsr}
ANGKA["sepekan_jabar"] = [s["x"] for s in tg["prov"]["32"]["sepekan"] if s["j"] == "hujan"]

W_CURAH = {"Rendah": "#F3E9D2", "Menengah": "#A9C4E4", "Tinggi": "#3E78C0", "Sangat Tinggi": NAVY}
W_LEVEL = {"Aturan belum terpenuhi": "#EEF1F4", "Normal": "#E6EEF7", "Waspada": "#F6D27A", "Siaga": ORANYE, "Awas": MERAH}
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 3.6), gridspec_kw={"wspace": .04})
peta(a1, lambda k: W_CURAH.get(bln.get(k, ("",))[0], ABU_MUDA), lambda k: singkat(k) if bln.get(k, ("",))[0] == "Sangat Tinggi" else "")
a1.set_title("BMKG: curah hujan Desember 2026", fontsize=8.5, fontweight="bold", color=NAVY, loc="left")
kotak_legenda(a1, [(W_CURAH[x], x) for x in ("Rendah", "Menengah", "Tinggi", "Sangat Tinggi")], "Kelas curah hujan")
peta(a2, lambda k: W_LEVEL.get(h3.get(k, ("Normal",))[0], ABU_MUDA), lambda k: singkat(k) if h3.get(k, ("",))[0] == "Siaga" and nm[k] in ("Sukabumi", "Cianjur", "Kuningan") else "")
a2.set_title("Model Centurisk97: banjir 19 Nov (belum teruji)", fontsize=8.5, fontweight="bold", color=NAVY, loc="left")
kotak_legenda(a2, [(W_LEVEL["Aturan belum terpenuhi"], "Normal"), (W_LEVEL["Waspada"], "Waspada"), (W_LEVEL["Siaga"], "Siaga")], "Level banjir")
simpan(fig, "g08_peta_jabar_prediksi")

# ---------------------------------------------------------------- diagram
def kotak(ax, x, y, w, h, teks, fc="white", ec=NAVY, tc=TINTA, fs=8.5, bold=False, lw=1.2):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.012,rounding_size=0.025", fc=fc, ec=ec, lw=lw))
    ax.text(x + w / 2, y + h / 2, teks, ha="center", va="center", fontsize=fs, color=tc, fontweight="bold" if bold else "normal", wrap=True)


def panah(ax, a, b, w=ABU, lw=1.3, style="-|>"):
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle=style, mutation_scale=11, color=w, lw=lw))


def kanvas(w=7.2, h=3.0):
    fig, ax = plt.subplots(figsize=(w, h)); ax.set_xlim(-0.02, 1.02); ax.set_ylim(-0.06, 1.02); ax.axis("off"); return fig, ax

# G1: tali KRIS
fig, ax = plt.subplots(figsize=(7.2, 2.4)); ax.axis("off")
x = np.linspace(0, 10, 900)
lepas = x < 3.2
for i, w in enumerate(KRIS_W):
    fase = i * np.pi / 2
    amp = np.where(x < 3.2, 0, np.minimum((x - 3.2) / 1.2, 1) * .32)
    ylep = 1.35 - i * .9
    yy = np.where(x < 3.2, ylep, 0)
    pil = amp * np.sin(2.4 * x + fase)
    trans = np.clip((x - 3.2) / 1.2, 0, 1)
    ycur = (1 - trans) * ylep + trans * pil
    depan = np.cos(2.4 * x + fase) > 0
    ax.plot(x, ycur, color=w, lw=7, solid_capstyle="round", alpha=.55, zorder=1)
    ax.plot(np.where(depan | (x < 4.4), x, np.nan), np.where(depan | (x < 4.4), ycur, np.nan), color=w, lw=7, solid_capstyle="round", zorder=3)
nama = ["Kolaborasi", "Responsif", "Integratif", "Sinkronisasi"]
for i, (n, w) in enumerate(zip(nama, KRIS_W)):
    ax.text(-0.15, 1.35 - i * .9, n, ha="right", va="center", fontsize=9.5, fontweight="bold", color=w)
ax.text(1.6, 1.85, "Untai terpisah: mudah putus", ha="center", fontsize=8, color=ABU)
ax.text(7.2, 1.0, "Dipilin menjadi satu tali: sanggup menarik beban berat", ha="center", fontsize=8, color=ABU)
ax.set_xlim(-2.3, 10.3); ax.set_ylim(-1.6, 2.1)
simpan(fig, "g01_tali_kris")

# G4: rantai eskalasi
fig, ax = kanvas(7.4, 1.9)
langkah = ["Hujan ekstrem\nberhari-hari", "Jalan dan jembatan\nputus", "Listrik dan sinyal\npadam", "Logistik tidak\nmasuk", "Gangguan keamanan\ndi pengungsian"]
warna = ["#DCE8F5", "#B9D0EA", "#F6D27A", "#F0A35E", "#E26B5C"]
w = .17; g = (1 - 5 * w) / 4
for i, (t, c) in enumerate(zip(langkah, warna)):
    x0 = i * (w + g); kotak(ax, x0, .25, w, .5, t, fc=c, ec=c, fs=8, bold=True)
    if i < 4: panah(ax, (x0 + w + .004, .5), (x0 + w + g - .004, .5))
ax.text(0, .08, "Bencana alam", fontsize=8, color=ABU); ax.text(1, .08, "Krisis sosial", fontsize=8, color=MERAH, ha="right", fontweight="bold")
simpan(fig, "g04_rantai_eskalasi")

# G9: dari peringatan ke tindakan
fig, ax = kanvas(7.4, 2.3)
isi = [("Peringatan dini", "BMKG, PVMBG,\nBNPB, sistem pantau"), ("Penilaian risiko", "Wilayah dan warga\nyang terancam"), ("Penugasan", "Siapa, ke mana,\nkapan, membawa apa"),
       ("Tindakan", "Evakuasi, pengamanan,\npenempatan logistik"), ("Umpan balik", "Laporan lapangan\nke posko")]
w = .17; g = (1 - 5 * w) / 4
for i, (j, s) in enumerate(isi):
    x0 = i * (w + g); utama = i == 2
    kotak(ax, x0, .32, w, .5, "", fc=BIRU if utama else "white", ec=BIRU)
    ax.text(x0 + w / 2, .68, j, ha="center", fontsize=8.8, fontweight="bold", color="white" if utama else NAVY)
    ax.text(x0 + w / 2, .47, s, ha="center", va="center", fontsize=7.3, color="white" if utama else TINTA)
    if i < 4: panah(ax, (x0 + w + .004, .57), (x0 + w + g - .004, .57))
ax.annotate("", xy=(0.085, .3), xytext=(.915, .3), arrowprops=dict(arrowstyle="-|>", color=ABU, lw=1, connectionstyle="arc3,rad=-0.25"))
ax.text(.5, .02, "Titik yang paling sering macet: peringatan sudah diterima, tetapi tidak berujung penugasan.", ha="center", fontsize=8, color=MERAH)
simpan(fig, "g09_peringatan_ke_tindakan")

# G10: komando berjenjang
fig, ax = kanvas(7.2, 3.6)
jenjang = [("Nasional", "Presiden menetapkan status\nBNPB mengoordinasikan", .70), ("Provinsi", "Gubernur menetapkan status\nBPBD provinsi", .40), ("Kabupaten/kota", "Bupati/wali kota menetapkan status\nBPBD kabupaten/kota", .10)]
for nmj, s, y0 in jenjang:
    kotak(ax, .02, y0, .17, .2, nmj, fc=NAVY, ec=NAVY, tc="white", bold=True, fs=9)
    kotak(ax, .21, y0, .33, .2, s, fc=BIRU_MUDA, ec=BIRU_MUDA, fs=8)
for y0, y1 in ((.30, .40), (.60, .70)):
    panah(ax, (.105, y0 + .005), (.105, y1 - .005), w=ORANYE, lw=1.6)
ax.text(.045, .355, "minta\ndukungan", fontsize=6.8, color=ORANYE, va="center", ha="right")
ax.text(.045, .655, "minta\ndukungan", fontsize=6.8, color=ORANYE, va="center", ha="right")
kotak(ax, .60, .10, .38, .80, "", fc="white", ec=NAVY)
ax.text(.79, .84, "Komando tanggap darurat", ha="center", fontsize=9, fontweight="bold", color=NAVY)
ax.text(.79, .77, "satu lokasi, satu posko, satu komandan", ha="center", fontsize=7.5, color=ABU)
kotak(ax, .66, .58, .26, .12, "Komandan", fc=NAVY, ec=NAVY, tc="white", bold=True)
unsur = [("Polri", .675), ("TNI", .79), ("Basarnas", .905)]
for u, x0 in unsur:
    kotak(ax, x0 - .045, .36, .09, .1, u, fc=BIRU_MUDA if u != "Polri" else ORANYE, ec="none", tc=TINTA if u != "Polri" else "white", bold=True, fs=8)
    panah(ax, (.79, .58), (x0, .465), w=ABU, lw=.9)
kotak(ax, .63, .16, .32, .13, "K/L, BPBD, relawan,\ndunia usaha", fc=ABU_MUDA, ec="none", fs=7.8)
panah(ax, (.79, .36), (.79, .295), w=ABU, lw=.9)
panah(ax, (.545, .5), (.595, .5), w=NAVY, lw=1.4)
ax.text(.57, .53, "status\nditetapkan", fontsize=6.8, ha="center", color=NAVY)
simpan(fig, "g10_komando_berjenjang")

# G11: tangga prioritas keputusan
fig, ax = kanvas(7.0, 2.9)
anak = [("1", "Selamatkan jiwa", "Pencarian, pertolongan, evakuasi, layanan kesehatan darurat"), ("2", "Buka akses", "Jalan, jembatan, jalur udara dan laut, jalur logistik"),
        ("3", "Pulihkan layanan dasar", "Air bersih, listrik, komunikasi, rumah sakit"), ("4", "Lindungi harta dan ketertiban", "Pengamanan permukiman kosong, gudang, distribusi")]
for i, (n, j, s) in enumerate(anak):
    x0 = .02 + i * .13; y0 = .05 + i * .21
    kotak(ax, x0, y0, .96 - i * .13, .17, "", fc=[MERAH, ORANYE, BIRU, NAVY][i], ec="none")
    ax.text(x0 + .025, y0 + .085, n, fontsize=15, fontweight="bold", color="white", va="center")
    ax.text(x0 + .065, y0 + .112, j, fontsize=9.5, fontweight="bold", color="white", va="center")
    ax.text(x0 + .065, y0 + .05, s, fontsize=7.6, color="white", va="center")
ax.text(.98, -.045, "urutan dikerjakan dari bawah ke atas", fontsize=7, color=ABU, ha="right")
simpan(fig, "g11_tangga_prioritas")

# G12: matriks urgensi dan dampak
fig, ax = plt.subplots(figsize=(5.6, 4.0))
ax.set_xlim(0, 2); ax.set_ylim(0, 2); ax.set_xticks([]); ax.set_yticks([])
isi4 = {(1, 1): ("Kerjakan sekarang", "Warga terjebak banjir, korban luka\ndi lokasi terisolasi", MERAH),
        (0, 1): ("Jadwalkan segera", "Jalur logistik cadangan, tenda\nuntuk pengungsi yang terus bertambah", ORANYE),
        (1, 0): ("Delegasikan", "Pertanyaan media, permintaan data\ndari instansi lain", BIRU),
        (0, 0): ("Tunda", "Rapat seremonial, laporan\nyang tidak dipakai untuk keputusan", ABU)}
for (cx, cy), (j, s, w) in isi4.items():
    ax.add_patch(plt.Rectangle((cx, cy), 1, 1, fc=w, alpha=.14, ec="white", lw=3))
    ax.text(cx + .5, cy + .66, j, ha="center", fontsize=10, fontweight="bold", color=w)
    ax.text(cx + .5, cy + .38, s, ha="center", va="center", fontsize=7.6, color=TINTA)
ax.set_xlabel("Urgensi (waktu tersisa sebelum dampak membesar)  \u2192", fontsize=8.5)
ax.set_ylabel("Dampak terhadap jiwa dan layanan dasar  \u2192", fontsize=8.5)
simpan(fig, "g12_matriks_urgensi")

# G13: siklus BNPB-Polri
fig, ax = plt.subplots(figsize=(6.6, 4.4)); ax.set_xlim(-1.75, 1.75); ax.set_ylim(-1.25, 1.25); ax.set_aspect("equal"); ax.axis("off")
fase = [("Pencegahan dan mitigasi", "Peta risiko bersama\nPatroli wilayah rawan\nPenegakan aturan tata ruang", 90, BIRU),
        ("Kesiapsiagaan", "Latihan gabungan\nPeringatan dini lewat\nBhabinkamtibmas", 0, ORANYE),
        ("Tanggap darurat", "Masuk struktur komando\nOperasi kemanusiaan\nAmankan logistik", 270, MERAH),
        ("Pascabencana", "Identifikasi korban (DVI)\nAmankan rehab-rekon\nAwasi penyaluran bantuan", 180, HIJAU)]
for i, (j, s, sud, w) in enumerate(fase):
    ax.add_patch(Wedge((0, 0), .55, sud - 42, sud + 42, width=.18, fc=w, ec="white"))
    r = np.deg2rad(sud); x, y = 1.08 * np.cos(r), .92 * np.sin(r)
    ax.text(x, y + .16, j, ha="center", va="center", fontsize=9.5, fontweight="bold", color=w)
    ax.text(x, y - .12, s, ha="center", va="center", fontsize=7.4, color=TINTA, linespacing=1.35)
ax.text(0, .06, "BNPB", ha="center", fontsize=10, fontweight="bold", color=NAVY)
ax.text(0, -.1, "+ Polri", ha="center", fontsize=10, fontweight="bold", color=NAVY)
for a0 in (45, 135, 225, 315):
    r = np.deg2rad(a0); ax.add_patch(FancyArrowPatch((.46 * np.cos(r + .2), .46 * np.sin(r + .2)), (.46 * np.cos(r - .2), .46 * np.sin(r - .2)), arrowstyle="-|>", mutation_scale=9, color=ABU, connectionstyle="arc3,rad=-0.3"))
simpan(fig, "g13_siklus_bnpb_polri")

# G14: alur data Centurisk97
fig, ax = kanvas(7.4, 2.9)
sumber = ["Satelit titik panas\n(FIRMS, Himawari)", "BMKG: cuaca,\ngempa, peringatan", "PVMBG: status\ngunung api", "DIBI dan laporan\nPusdalops BPBD"]
for i, s in enumerate(sumber):
    kotak(ax, .0, .78 - i * .225, .22, .17, s, fc=BIRU_MUDA, ec="none", fs=7.4)
    panah(ax, (.225, .865 - i * .225), (.37, .52), w=ABU, lw=.9)
kotak(ax, .375, .3, .25, .42, "", fc=NAVY, ec=NAVY)
ax.text(.5, .6, "Centurisk97", ha="center", fontsize=11, fontweight="bold", color="white")
ax.text(.5, .44, "gabung, periksa, petakan\ndiperbarui otomatis", ha="center", va="center", fontsize=7.6, color="white")
kel = ["Peta terpadu semua\njenis bencana", "Tanda wilayah\nberisiko lebih awal", "Laporan harian\notomatis", "Data per desa untuk\npatroli dan evakuasi"]
for i, s in enumerate(kel):
    kotak(ax, .78, .78 - i * .225, .22, .17, s, fc="white", ec=BIRU, fs=7.4)
    panah(ax, (.63, .52), (.775, .865 - i * .225), w=BIRU, lw=.9)
simpan(fig, "g14_alur_centurisk97")

# G15: lini masa skenario latihan
fig, ax = kanvas(7.4, 2.5)
ax.plot([.04, .96], [.62, .62], color=NAVY, lw=2)
tahap = [(.1, "Jam 0", "Hujan lebat 2 hari. Sungai meluap\ndi 3 kabupaten. Jembatan provinsi putus."),
         (.5, "Jam 6", "15.000 warga mengungsi di 40 titik.\nSinyal padam di 1 kecamatan.\nVideo lama 'bendungan jebol' beredar."),
         (.88, "Jam 24", "Logistik menumpuk di 1 titik,\n3 titik belum tersentuh.\nWarga menghadang truk bantuan.")]
for x0, j, s in tahap:
    ax.add_patch(Circle((x0, .62), .022, fc=ORANYE, ec="white", lw=1.5, zorder=3))
    ax.text(x0, .76, j, ha="center", fontsize=10, fontweight="bold", color=NAVY)
    ax.text(x0, .36, s, ha="center", va="center", fontsize=7.5, color=TINTA, linespacing=1.4)
ax.text(.5, .02, "Skenario latihan, angka rekaan untuk diskusi kelompok.", ha="center", fontsize=7, color=ABU)
simpan(fig, "g15_lini_masa_latihan")

json.dump(ANGKA, open(SINI / "angka.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("selesai", sorted(p.name for p in GBR.glob("*.png")))
print(json.dumps({k: ANGKA[k] for k in ("jabar_prov", "bmkg_des", "model_banjir", "model_longsor", "sepekan_jabar", "musim")}, ensure_ascii=False)[:3500])
