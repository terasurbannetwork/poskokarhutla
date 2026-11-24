# QA: bangun ke folder uji, ubah ke PDF, buat lembar kontak semua halaman + pemeriksaan otomatis.
import re, subprocess, sys, tempfile, shutil
from pathlib import Path
import fitz
SP = Path(__file__).parent
UJI, CEK = Path(tempfile.gettempdir()) / "ammdm_uji", Path(tempfile.gettempdir()) / "ammdm_cek"
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
for d in (UJI, CEK): shutil.rmtree(d, ignore_errors=True)
subprocess.run([sys.executable, "-W", "ignore", str(SP / "bangun_desain.py"), str(UJI)], check=True, capture_output=True)
docs = [UJI / "Naskah Lengkap Kepala BNPB AMMDM ke-14.docx"] + sorted((UJI / "Per acara").glob("*.docx"))
subprocess.run([SOFFICE, "-env:UserInstallation=" + (Path(tempfile.gettempdir()) / "lo_ammdm").as_uri(), "--headless",
                "--convert-to", "pdf", "--outdir", str(CEK)] + [str(d) for d in docs], check=True, capture_output=True, timeout=600)
masalah = []
for pdf in sorted(CEK.glob("*.pdf")):
    d = fitz.open(pdf)
    huruf = {s["font"].split("-")[0] for p in d for b in p.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()}
    if huruf - {"Roboto"}: masalah.append(f"{pdf.name}: huruf lain {huruf}")
    for i, p in enumerate(d):
        t = p.get_text()
        isi = [l for l in t.splitlines() if l.strip() and "Graha BNPB" not in l and "Badan Nasional Penanggulangan Bencana" not in l
               and "Naskah Sambutan dan Pernyataan Kepala BNPB, AMMDM" not in l and not re.fullmatch(r"\d+", l.strip())]
        if i > 0 and len(isi) < 3: masalah.append(f"{pdf.name} hlm indeks {i}: hampir kosong ({len(isi)} baris)")
        ys = [bl["bbox"][3] for bl in p.get_text("dict")["blocks"] if bl.get("lines") and 70 < bl["bbox"][1] < p.rect.height - 60]
        awal = next((" ".join(s["text"] for s in bl["lines"][0]["spans"]) for bl in p.get_text("dict")["blocks"]
                     if bl.get("lines") and 70 < bl["bbox"][1] < p.rect.height - 60), "")
        judul = re.match(r"\s*(TERJEMAHAN|ACARA \d|JADWAL|\d\.\d)", awal)
        if i > 0 and ys and not judul and (max(ys) - 70) / (p.rect.height - 130) < 0.30:
            masalah.append(f"{pdf.name} hlm {i + 1}: halaman sisa (terisi {int((max(ys) - 70) / (p.rect.height - 130) * 100)}%)")
        if "{" in t or "((" in t: masalah.append(f"{pdf.name} hlm indeks {i}: token mentah")
        if i > 0 or "Per acara" in str(pdf) or not pdf.name.startswith("Naskah Lengkap"):
            kepala = {round(l["bbox"][1]) for b in p.get_text("dict")["blocks"] for l in b.get("lines", [])
                      if l["bbox"][1] < 70 and any(s["text"].strip() for s in l["spans"])}
            if len(kepala) != 2: masalah.append(f"{pdf.name} hlm indeks {i}: header {len(kepala)} baris")
    # lembar kontak
    n = len(d); kol = 6; bar = (n + kol - 1) // kol; w, h = 140, 198
    lem = fitz.open(); pg = lem.new_page(width=kol * w, height=bar * h)
    for i in range(n):
        r = fitz.Rect((i % kol) * w, (i // kol) * h, (i % kol + 1) * w, (i // kol + 1) * h)
        pg.show_pdf_page(r + (3, 3, -3, -3), d, i)
    pg.get_pixmap(dpi=110).save(str(CEK / (pdf.stem + "_kontak.png")))
    print(f"{pdf.name}: {n} hlm")
print("MASALAH:" if masalah else "Tidak ada masalah otomatis.")
for m in masalah: print(" -", m)
