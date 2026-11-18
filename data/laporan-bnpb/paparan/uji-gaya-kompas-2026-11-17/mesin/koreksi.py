# Bandingkan klon (PowerPoint) dengan rujukan, perbarui koreksi.json per gaya: skala ukuran / jarak huruf, geser x, geser garis dasar.
# python koreksi.py <folder png klon> <gaya_mentah.json>
import json, sys
from pathlib import Path
import ukur
SINI = Path(__file__).parent
PETA = {  # (hal, elemen ukur) -> (kunci gaya, jangkar_x)
 (1, 'judul1'): ('c_j0', 1), (1, 'judul2'): ('c_j1', 1), (1, 'judul3'): ('c_j2', 1), (1, 'sub'): ('c_sub', 1), (1, 'label'): ('c_label', 1),
 (1, 'tanggal'): ('c_tgl', 1), (1, 'label_kaki'): ('c_kaki', 0), (1, 'pil1'): ('c_pil', 0),
 (3, 'label'): ('label', 1), (3, 'nomor'): ('nomor', 0), (3, 'segmen'): ('seg', 0), (3, 'bnpb'): ('bnpb', 1),
 (3, 'judul1'): ('j1', 1), (3, 'judul2'): ('j2', 1), (3, 'sub'): ('sub', 1), (3, 'pil_teks'): ('pil_t', 0), (3, 'kick_foto'): ('fk', 1),
 (3, 'judul_foto'): ('fj', 1), (3, 'teks_foto'): ('ft', 1), (3, 'kick_k1'): ('k1_kick', 1), (3, 'angka_k1'): ('k1_a', 1), (3, 'satuan_k1'): ('k1_s', 0),
 (3, 'sub_k1'): ('k1_sub', 1), (3, 'angka2_k1'): ('k1_a2', 1), (3, 'teks2_k1'): ('k1_t2', 0), (3, 'kick_k2'): ('k2_kick', 1), (3, 'angka_k2'): ('k2_a', 1),
 (3, 'satuan_k2'): ('k2_s', 0), (3, 'sub_k2'): ('k2_sub', 1), (3, 'angka2_k2'): ('k2_a2', 1), (3, 'teks2_k2'): ('k2_t2', 0), (3, 'pola'): ('pola', 1),
 (3, 'nama1'): ('nama', 1), (3, 'desk1'): ('desk', 1), (3, 'nama3'): ('nama3', 1), (3, 'persen3'): ('persen', 1), (3, 'catatan'): ('cat', 1),
 (3, 'sumber1'): ('sumber', 1),
 (5, 'sub'): ('e_sub', 1), (5, 'kick_foto'): ('e_fk', 1), (5, 'angka_foto'): ('e_a', 1), (5, 'satuan_foto'): ('e_s', 0), (5, 'teks_foto'): ('e_ft', 1),
 (5, 'pil_foto_teks'): ('e_pil', 0), (5, 'no1'): ('e_no', 1), (5, 'nama1'): ('e_nama', 1), (5, 'desk1'): ('e_desk', 1), (5, 'tag_teks'): ('e_tag', 0),
 (5, 'tl_atas'): ('e_tla', 0),
}
klon = sys.argv[1]; G = json.load(open(sys.argv[2]))
KF = SINI / 'koreksi.json'; kor = json.load(open(KF)) if KF.exists() else {}
TEKS = json.load(open(SINI / 'teks_kal.json', encoding='utf8'))
for hal, s in ((1, 1), (3, 2), (5, 3)):
    a = ukur.ukur(str(SINI / f'asli/p0{hal}.jpeg'), hal); b = ukur.ukur(f'{klon}/s{s}.png', hal)
    for (h, el), (kunci, jangkar) in PETA.items():
        if h != hal or not a.get(el) or not b.get(el): continue
        r, m = a[el], b[el]
        g = G[kunci[:-1]][int(kunci[-1])] if kunci.startswith('c_j') else G[kunci]
        c = kor.setdefault(kunci, {'skala': 1.0, 'dk': 0.0, 'dx': 0.0, 'dy': 0.0})
        wr, wm = r[2] - r[0], m[2] - m[0]; hr, hm = r[3] - r[1], m[3] - m[1]
        n = len(TEKS.get(kunci, 'xxx'))
        if n <= 2:
            if hm > 3: c['skala'] *= 1 + (hr / hm - 1) * 0.9
        elif abs(g['k']) > 0:
            c['dk'] += (wr - wm) / ((n - 1) * g['px']) * 0.9
        elif wm > 3:
            c['skala'] *= 1 + (wr / wm - 1) * 0.9
        c['jangkar'] = jangkar; c['dx'] += float(r[0] - m[0]) * 0.9
        c['dy'] += float((r[3] - m[3]) + (r[1] - m[1])) / 2 * 0.9
json.dump(kor, open(KF, 'w'), indent=1)
print('koreksi diperbarui:', len(kor), 'gaya')
