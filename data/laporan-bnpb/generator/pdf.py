"""PPTX -> PDF. Pakai LibreOffice (soffice) bila ada; di Windows tanpa soffice, pakai PowerPoint lewat COM.

    python pdf.py "Laporan Kejadian Bencana Harian 291026.pptx"      # PDF di folder yang sama
"""
import os, shutil, subprocess, sys


def soffice():
    for p in (shutil.which('soffice'), r'C:\Program Files\LibreOffice\program\soffice.exe',
              '/Applications/LibreOffice.app/Contents/MacOS/soffice'):
        if p and os.path.exists(p): return p


def ke_pdf(pptx, outdir=None):
    pptx = os.path.abspath(pptx); outdir = os.path.abspath(outdir or os.path.dirname(pptx))
    pdf = os.path.join(outdir, os.path.splitext(os.path.basename(pptx))[0] + '.pdf')
    so = soffice()
    if so:
        subprocess.run([so, '--headless', '--convert-to', 'pdf', '--outdir', outdir, pptx], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif os.name == 'nt':
        # 32 = ppSaveAsPDF; WithWindow=0 supaya PowerPoint tidak muncul. Path lewat env, bukan disisipkan ke skrip.
        # Simpan ke berkas sementara dulu: PDF lama yang sedang terbuka di penampil membuat SaveAs gagal (30 Okt).
        import tempfile, time
        sem = os.path.join(tempfile.gettempdir(), f'laporan-{os.getpid()}.pdf')
        ps = ("$ErrorActionPreference='Stop'; $a=New-Object -ComObject PowerPoint.Application; "
              "try { $p=$a.Presentations.Open($env:PPTX_IN, $true, $false, $false); $p.SaveAs($env:PDF_OUT, 32); $p.Close() } "
              "finally { $a.Quit() }")
        subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], check=True,
                       env={**os.environ, 'PPTX_IN': pptx, 'PDF_OUT': sem})
        try: shutil.copyfile(sem, pdf)
        except PermissionError:   # PDF lama terbuka di penampil: simpan dengan akhiran jam, jangan gagal
            pdf = pdf[:-4] + time.strftime(' %H%M') + '.pdf'; shutil.copyfile(sem, pdf)
            print('PDF utama sedang terbuka di aplikasi lain; disimpan sebagai', pdf)
        os.remove(sem)
    else:
        sys.exit('PDF: soffice tidak ada (pasang LibreOffice) dan ini bukan Windows dengan PowerPoint')
    if not os.path.exists(pdf): sys.exit(f'PDF tidak terbentuk: {pdf}')
    return pdf


if __name__ == '__main__':
    print(ke_pdf(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
