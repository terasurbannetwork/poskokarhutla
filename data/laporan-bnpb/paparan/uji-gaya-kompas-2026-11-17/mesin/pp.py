# Render PPTX lewat PowerPoint ke PNG 1920x1080 per slide (+ opsional PDF dan salinan bersemat huruf).
import os, sys, subprocess, tempfile, shutil

def render(pptx, keluar_dir, pdf=None, sematan=None):
    pptx = os.path.abspath(pptx); keluar_dir = os.path.abspath(keluar_dir); os.makedirs(keluar_dir, exist_ok=True)
    k = tempfile.mkdtemp(prefix='kompas-pp-')
    masuk = os.path.join(k, 'masuk.pptx'); shutil.copyfile(pptx, masuk)
    ps = ("$ErrorActionPreference='Stop'; $a=New-Object -ComObject PowerPoint.Application; "
          "try { $p=$a.Presentations.Open($env:IN, $true, $false, $false); $i=1; "
          "foreach ($s in $p.Slides) { $s.Export(($env:OUTD + '\\s' + $i + '.png'), 'PNG', 1920, 1080); $i++ }; "
          "if ($env:PDF) { $p.SaveAs($env:PDF, 32) }; if ($env:SEM) { $p.SaveAs($env:SEM, 24, -1) }; $p.Close() } finally { $a.Quit() }")
    env = {**os.environ, 'IN': masuk, 'OUTD': keluar_dir, 'PDF': pdf and os.path.abspath(pdf) + '.tmp.pdf' or '', 'SEM': sematan and os.path.join(k, 'sem.pptx') or ''}
    r = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', ps], capture_output=True, text=True, env=env)
    if r.returncode: sys.exit('PowerPoint gagal: ' + r.stdout + r.stderr[-500:])
    if pdf: shutil.move(env['PDF'], pdf)
    if sematan: shutil.copyfile(env['SEM'], sematan)
    shutil.rmtree(k, ignore_errors=True)

if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], *(sys.argv[3:5] + [None, None])[:2])
