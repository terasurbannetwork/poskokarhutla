#!/usr/bin/env python3
"""Indeks dokumen repo untuk layar staf /bnpb/katalog-dokumen.

Keluaran data/bnpb/katalog_dokumen.js (modul ESM, dibundel Worker, sengaja di luar public/ supaya hanya keluar lewat rute staf).
Sumber daftar = git ls-tree HEAD, jadi tiap entri bisa dibuka di GitHub. Berkas jadi (PDF, PPTX, DOCX, XLSX) + Markdown rujukan;
catatan agent, QA, naskah per bab, dan skill tidak masuk. Salinan persis (blob sama) digabung, format berbeda satu judul jadi satu entri.
Tanggal: dari nama berkas atau folder bila ada, kalau tidak dari commit terakhir yang menyentuhnya.
Clone dangkal di Actions tidak punya riwayat: di sana tanggal diambil dari indeks ter-commit, berkas baru tanpa tanggal di nama dibiarkan kosong.

Jalankan: python3 scripts/bnpb/katalog_dokumen.py        (tulis indeks)
          python3 scripts/bnpb/katalog_dokumen.py --cek  (periksa aturan tanpa menulis)
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
KELUAR = AKAR / "data/bnpb/katalog_dokumen.js"
JADI = {"pdf", "pptx", "docx", "xlsx"}
KECUALI = re.compile(r"^(\.[^/]+/|node_modules/|tests/|graphify-out/|public/(?!panduan/)|docs/superpowers/|data/kajian-bnpb/(qa|naskah|skill)/)")
KECUALI_NAMA = {"AGENTS.md", "CLAUDE.md", "SKILL.md", "_gabung.md"}
# Markdown di folder laporan harian/satelit dan rapor/QA/README deck = catatan kerja pembuat deck, bukan dokumen rujukan
CATATAN_KERJA = re.compile(r"^data/(laporan-bnpb/(harian|satelit)-|(laporan|kegiatan)-bnpb/(.*/)?(rapor|qa-|README))", re.I)
SALINAN_NYASAR = re.compile(r" 2\.[^./]+$")   # berkas "* 2.*": salinan sinkronisasi, jangan dipakai (AGENTS.md §9)
BLOB_KOSONG = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
KATEGORI = [
    ("harian", "Laphar Bencana"), ("satelit", "Laphar Karhutla"), ("laporan", "Laporan lain"), ("kegiatan", "Kegiatan dan paparan"),
    ("kajian", "Kajian Grand Design"), ("rancangan", "Rancangan sistem"), ("riset", "Riset dan pustaka"),
    ("sistem", "Dokumentasi sistem"), ("teknis", "Catatan teknis"), ("lain", "Lain-lain"),
]
PENANDA_VERSI = [
    re.compile(r"\s*\((rev\d+(?: alt\d+)?|terbaru|isi|generator|uji mesin|alternatif[^)]*)\)\s*$", re.I),
    re.compile(r"\s+-\s+(hari utuh [^-]+|s\.d\. [^-]+)$", re.I),
    re.compile(r"\s+(revisi)$", re.I),
    re.compile(r"[- ](draf)$", re.I),
]
JAM_VERSI = re.compile(r"\s+((?:[01]\d|2[0-3])[0-5]\d)$")   # "Laporan 021126 1102": salinan per jam, hanya sah bila nama memuat tanggal ddmmyy
TANGGAL_6 = re.compile(r"(?<!\d)\d{6}(?!\d)")
FOLDER_VERSI = re.compile(r"/(Revisi (\d+)|uji-mesin|dua-versi)$")   # Revisi N = aturan folder revisi laporan harian (AGENTS.md 3.6)
VARIAN = {"isi", "generator", "uji mesin", "draf"}   # keluaran antara atau uji mesin deck, bukan versi yang dibagikan
VARIAN_AWAL = ("alternatif", "hari utuh", "s.d.")
RANCANGAN = re.compile(r"^data/kajian-bnpb/(pipa|kampus|lapangan|kedeputian|bangun)/")
RISET = re.compile(r"^(data/kajian-bnpb/|data/riset/|docs/riset/|research_notes/|reports/)")


def git(*a):
    return subprocess.run(["git", "-c", "core.quotepath=off", *a], cwd=AKAR, check=True, capture_output=True).stdout


def masuk(p):
    n = p.rsplit("/", 1)[-1]
    ext = n.rsplit(".", 1)[-1].lower() if "." in n else ""
    if ext == "md" and CATATAN_KERJA.match(p): return False
    return (ext in JADI or ext == "md") and not KECUALI.match(p) and "/qa/" not in p and ".gagal." not in n and n not in KECUALI_NAMA and not SALINAN_NYASAR.search(n)


def kategori(p):
    if p.startswith("data/laporan-bnpb/harian-"): return "harian"
    if p.startswith("data/laporan-bnpb/satelit-"): return "satelit"
    if p.startswith("data/laporan-bnpb/"): return "laporan"
    if p.startswith("data/kegiatan-bnpb/"): return "kegiatan"
    if p.startswith("data/kajian-bnpb/keluaran/"): return "kajian"
    if RANCANGAN.match(p): return "rancangan"
    if RISET.match(p): return "riset"
    if p.startswith("docs/"): return "sistem"
    if p.startswith("scripts/"): return "teknis"
    return "lain"


def tgl_ddmmyy(s):
    for d, m, y in re.findall(r"(?<!\d)(\d{2})(\d{2})(2[4-9])(?!\d)", s):
        if 1 <= int(d) <= 31 and 1 <= int(m) <= 12:
            return f"20{y}-{m}-{d}"
    return None


def tanggal_nama(p):
    nama, folder = p.rsplit("/", 1)[-1], p.rsplit("/", 1)[0] if "/" in p else ""
    iso = re.search(r"(?<!\d)(20\d{2}-\d{2}-\d{2})(?!\d)", nama)
    if iso: return iso.group(1)
    if t := tgl_ddmmyy(nama): return t
    iso = re.search(r"(?<!\d)(20\d{2}-\d{2}-\d{2})(?!\d)", folder)
    return iso.group(1) if iso else tgl_ddmmyy(folder)


def judul_rapi(stem):
    if " " in stem or stem.upper() == stem: return stem
    t = re.sub(r"[-_]+", " ", stem).strip()
    return t[:1].upper() + t[1:] if t else stem


def judul_md(p, cadangan):
    try:
        with open(AKAR / p, encoding="utf-8", errors="replace") as f:
            m = re.search(r"^#\s+(.+?)\s*#*\s*$", f.read(4096), re.M)
    except OSError:
        return cadangan
    if not m: return cadangan
    t = re.sub(r"[*_`]+", "", re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", m.group(1))).strip().replace("Pantau Bencana", "Centurisk97")
    return t[:160] or cadangan


def urai_versi(stem):
    """'Paparan X (rev3 alt2) (isi)' -> ('Paparan X', ['rev3 alt2', 'isi'])."""
    tanda = []
    while True:
        m = next((x for r in PENANDA_VERSI if (x := r.search(stem))), None)
        if m:
            tanda.insert(0, m.group(1).lower() if re.match(r"rev|terbaru|isi|generator|uji|draf", m.group(1), re.I) else m.group(1))
        elif TANGGAL_6.search(stem) and (m := JAM_VERSI.search(stem)):
            tanda.insert(0, f"pukul {m.group(1)[:2]}.{m.group(1)[2:]}")
        else:
            return stem, tanda
        stem = stem[:m.start()]


def urai_folder(folder):
    """'.../Revisi 4' -> ('...', ['rev4']): subfolder versi digabung ke folder hari induknya."""
    m = FOLDER_VERSI.search(folder)
    if not m: return folder, []
    return folder[:m.start()], [f"rev{m.group(2)}"] if m.group(2) else ["uji mesin"] if m.group(1) == "uji-mesin" else []


def varian(t):
    return t in VARIAN or t.startswith(VARIAN_AWAL)


def peringkat(tanda):
    """Terbesar = versi utama: keluaran antara kalah, lalu (terbaru), revisi tertinggi, versi pokok di atas alternatifnya.
    Nama tanpa jam di atas salinan berjam: berkas tanpa jam adalah edisi terakhir (021126 polos = edisi 16.39), yang berjam salinan sebelum ditimpa."""
    teks = " ".join(tanda)
    rev, alt, jam = re.search(r"rev(\d+)", teks), re.search(r"alt(\d+)", teks), re.search(r"pukul (\d\d)\.(\d\d)", teks)
    nomor = int(rev.group(1)) if rev else 2 if "revisi" in tanda else 1
    return (not any(varian(t) for t in tanda), "terbaru" in tanda, nomor, -int(alt.group(1)) if alt else 0, int(jam.group(1) + jam.group(2)) if jam else 2400)


def label_versi(tanda):
    pokok = " ".join(t for t in tanda if not varian(t)) or "versi awal"
    lain = [t for t in tanda if varian(t)]
    return f"{pokok} ({' '.join(lain)})" if lain else pokok


def gabung_versi(dok):
    """Revisi satu paparan (folder sama atau subfolder versinya, nama sama tanpa penanda versi) jadi satu entri: versi utama, sisanya di 'v'."""
    kelompok = {}
    for e in dok:
        dasar, tanda = urai_versi(e.pop("s"))
        induk, dari_folder = urai_folder(e["d"])
        kelompok.setdefault((induk, dasar), []).append((dari_folder + [t for t in tanda if t not in dari_folder], e))
    hasil = []
    for (induk, _), anggota in kelompok.items():
        anggota.sort(key=lambda x: peringkat(x[0]), reverse=True)
        tanda, utama = anggota[0]
        if len(anggota) > 1:
            utama["j"], utama["d"] = urai_versi(utama["j"])[0], induk
            if tanda: utama["r"] = label_versi(tanda)   # versi tanpa penanda tidak perlu pil "versi awal"
            sisa = sorted(anggota[1:], key=lambda x: (peringkat(x[0])[1:], peringkat(x[0])[0]), reverse=True)
            utama["v"] = [{"l": label_versi(t), "t": e["t"], "b": e["b"]} for t, e in sisa]
        hasil.append(utama)
    return hasil


def berkas_entri(e):
    return e["b"] + [b for v in e.get("v", []) for b in v["b"]]


def indeks_lama():
    try:
        d = json.loads(re.sub(r"^export default |;\s*$", "", KELUAR.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return {}
    hasil = {}
    for e in d.get("dok", []):
        for x in [e, *e.get("v", [])]:
            if x.get("t"): hasil.update((b[1], x["t"]) for b in x["b"])
    return hasil


def tanggal_git(perlu):
    """Sapu riwayat dari yang terbaru, berhenti begitu semua ketemu: commit pertama yang menyebut berkas = perubahan terakhirnya."""
    sisa, hasil, kini = set(perlu), {}, None
    if not sisa: return hasil
    with subprocess.Popen(["git", "-c", "core.quotepath=off", "log", "--no-renames", "--name-only", "--format=%x00%cs"], cwd=AKAR,
                          stdout=subprocess.PIPE, encoding="utf-8", errors="replace") as pr:
        for b in pr.stdout:
            b = b.rstrip("\n")
            if b.startswith("\0"): kini = b[1:]
            elif b in sisa:
                hasil[b] = kini
                sisa.discard(b)
                if not sisa:
                    pr.terminate()
                    break
    return hasil


def calon():
    """(path, blob) yang masuk katalog; salinan persis dibuang, yang di data/laporan-bnpb kalah dari salinan di tempat lain."""
    baris = [x.split("\t", 1) for x in git("ls-tree", "-r", "-z", "HEAD").decode("utf-8").split("\0") if x]
    semua = [(p, m.split()[2]) for m, p in baris if m.split()[1] == "blob" and masuk(p) and m.split()[2] != BLOB_KOSONG]
    semua.sort(key=lambda x: (x[0].startswith("data/laporan-bnpb/"), len(x[0]), x[0]))
    lihat, hasil = set(), []
    for p, blob in semua:
        if blob not in lihat:
            lihat.add(blob)
            hasil.append(p)
    return hasil


def bangun():
    dangkal = git("rev-parse", "--is-shallow-repository").decode().strip() == "true"
    lama, grup = indeks_lama() if dangkal else {}, {}
    for p in calon():
        folder, nama = p.rsplit("/", 1) if "/" in p else ("", p)
        stem, ext = nama.rsplit(".", 1)
        grup.setdefault((folder, stem), []).append((ext.lower(), p))
    tanpa_nama = {p for bs in grup.values() for _, p in bs if not tanggal_nama(p) and p not in lama}
    dari_git = {} if dangkal else tanggal_git(tanpa_nama)   # clone dangkal mencatat semua berkas pada satu commit: lebih baik kosong daripada tanggal palsu
    dok = []
    for (folder, stem), bs in grup.items():
        bs.sort(key=lambda b: (b[0] == "md", b[0]))
        p0 = bs[0][1]
        md = next((p for e, p in bs if e == "md"), None) if bs[0][0] == "md" else None
        tgl = max(filter(None, (tanggal_nama(p) or lama.get(p) or dari_git.get(p) for _, p in bs)), default=None)
        berkas = []
        for e, p in bs:
            try: uk = os.path.getsize(AKAR / p)
            except OSError: uk = None
            berkas.append([e, p, uk])
        cadangan = judul_rapi(stem)
        if folder == "data/kajian-bnpb/keluaran" and "deck" not in stem and " " not in stem:   # air.pdf, neraca-air.docx: nama pendek tanpa konteks
            cadangan = "Naskah kajian " + cadangan.lower()
        dok.append({"j": judul_md(md, cadangan) if md else cadangan, "k": kategori(p0), "d": folder, "t": tgl, "b": berkas, "s": stem})
    dok = gabung_versi(dok)
    dok.sort(key=lambda e: (-int((e["t"] or "0").replace("-", "")), e["j"].lower()))
    return {"v": 1, "per": git("log", "-1", "--format=%cs").decode().strip(), "kategori": KATEGORI, "dok": dok}


def periksa(d):
    assert tgl_ddmmyy("Paparan UGM 061126") == "2026-11-06" and tgl_ddmmyy("kode 991326") is None, "tanggal ddmmyy"
    assert tanggal_nama("data/laporan-bnpb/harian-2026-11-05/naskah.md") == "2026-11-05", "tanggal folder"
    assert not masuk(".claude/ilmu-agent/x.md") and not masuk("data/kajian-bnpb/qa/a.pdf") and not masuk("data/kajian-bnpb/naskah/air/b.md"), "cakupan"
    assert not masuk("Paparan 2.pdf") and not masuk("AGENTS.md") and not masuk("public/data/a.md"), "cakupan nama"
    assert not masuk("data/kegiatan-bnpb/a/rapor-r1.md") and not masuk("data/laporan-bnpb/harian-2026-11-05/README.md") and not masuk("data/kajian-bnpb/keluaran/qa/a.md"), "catatan kerja"
    assert not masuk("data/laporan-bnpb/harian-2026-11-05/Laporan 051126.gagal.pptx"), "keluaran gagal"
    assert masuk("data/kegiatan-bnpb/a/rapor.pdf") and masuk("data/kegiatan-bnpb/mou/PANDUAN-MOU-BNPB.md"), "catatan kerja, yang tetap masuk"
    assert masuk("public/panduan/sop.pdf") and masuk("docs/bnpb/A.md") and not masuk("docs/a.png"), "cakupan jenis"
    k = {a for a, _ in d["kategori"]}
    assert urai_versi("Paparan X 041126 (rev3 alt2) (isi)") == ("Paparan X 041126", ["rev3 alt2", "isi"]), "urai versi"
    uji = [{"j": s, "d": "a", "t": None, "b": [["pdf", s, 1]], "s": s} for s in ("P (rev2)", "P", "P (rev12)", "P (rev12) (isi)", "Q (rev2)")]
    g = {e["j"]: e for e in gabung_versi(uji)}
    assert g["P"]["r"] == "rev12" and g["P"]["b"][0][1] == "P (rev12)" and [v["l"] for v in g["P"]["v"]] == ["rev12 (isi)", "rev2", "versi awal"], "gabung versi"
    assert "v" not in g["Q (rev2)"], "satu versi tetap apa adanya"
    assert urai_versi("Laporan 021126 1102") == ("Laporan 021126", ["pukul 11.02"]) and urai_versi("Grand Design 2026 2030")[1] == [], "jam hanya bila ada tanggal"
    assert urai_versi("Laporan 021126 (uji mesin) 1403") == ("Laporan 021126", ["uji mesin", "pukul 14.03"]), "uji mesin berjam"
    assert urai_versi("Laporan 301026 - s.d. 17.00 WIB") == ("Laporan 301026", ["s.d. 17.00 WIB"]) and urai_versi("Rute 021126 revisi") == ("Rute 021126", ["revisi"]), "penanda lain"
    uji2 = [{"j": s, "d": d, "t": None, "b": [["pdf", d + "/" + s, 1]], "s": s} for d, s in (("a", "L 021126 1102"), ("a", "L 021126"), ("a", "L 021126 1639"), ("b/Revisi 3", "M 081126"), ("b/Revisi 4", "M 081126"), ("b", "M 081126 (isi)"))]
    g2 = {e["j"]: e for e in gabung_versi(uji2)}
    assert "r" not in g2["L 021126"] and [v["l"] for v in g2["L 021126"]["v"]] == ["pukul 16.39", "pukul 11.02"], "polos di atas salinan berjam"
    assert g2["M 081126"]["r"] == "rev4" and g2["M 081126"]["d"] == "b" and len(g2) == 2, "folder Revisi N digabung ke induknya"
    jalur = [b[1] for e in d["dok"] for b in berkas_entri(e)]
    assert len(d["dok"]) > 100, "indeks terlalu sedikit"
    assert len(jalur) == len(set(jalur)), "jalur kembar"
    assert all(masuk(p) for p in jalur), "jalur di luar cakupan"
    assert all(e["k"] in k and e["j"] and e["b"] for e in d["dok"]), "entri tidak lengkap"
    assert all(e["t"] is None or re.fullmatch(r"20\d{2}-\d{2}-\d{2}", e["t"]) for e in d["dok"]), "format tanggal"


def teks(d):
    return "export default " + json.dumps(d, ensure_ascii=False, separators=(",", ":")) + ";\n"


def main():
    d = bangun()
    periksa(d)
    if "--cek" in sys.argv:
        print(f"ok: {len(d['dok'])} dokumen, {sum(len(berkas_entri(e)) for e in d['dok'])} berkas, {sum(1 for e in d['dok'] if e.get('v'))} punya versi lain")
        return
    sementara = KELUAR.with_suffix(".tmp")   # ganti atomik: gagal di tengah tidak merusak modul yang diimpor Worker
    sementara.write_text(teks(d), encoding="utf-8", newline="\n")
    os.replace(sementara, KELUAR)
    print(f"{KELUAR.relative_to(AKAR)}: {len(d['dok'])} dokumen, {KELUAR.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
