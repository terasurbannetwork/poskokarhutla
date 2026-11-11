"""Spek deck padat: 3 slide padat + lampiran, dari spek utama yang sudah dibangkitkan."""
import json
PJ = 'C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/proyek-banjir0811/'
RP = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/banjir-bang-ghozi-2026-11-08/'
S = json.load(open(PJ + 'spek/banjir-081126.json', encoding='utf-8')); n = json.load(open(RP + 'lampiran-hal.json'))['n']
isi = PJ + 'data/lap/slide3-isi.pptx'; dasar = 7 + n + 1
sum_ = ['Laporan Dit. Koordalops BNPB, 1 s.d. 8 Nov 2026; GIS BNPB, 8 Nov 2026 22.06 WIB; BPBD Aceh, BPBD Sumut', 'Gudang UPT Padang (DSP); Poslog BNPB Kualanamu, 25 Okt 2026; Rekap PDW I dan III, 8 Nov 2026', 'Laporan Dit. Koordalops BNPB, 8 Nov 2026 07.00 WIB; PVMBG, 8 Nov 2026 06.00 WIB; GIS BNPB, 8 Nov 2026 22.06 WIB']
utama = [{'jenis': 'impor', 'pptx': isi, 'halaman': dasar + i, 'sumber': sum_[i], 'logo_kampus': 'foto/kris-header.png'} for i in range(3)]
lamp = [s for s in S['slide'] if s.get('jenis') == 'impor' and 7 <= s.get('halaman', 0) < 7 + n] + [s for s in S['slide'] if s.get('pesan') == 'Lampiran persediaan']
for s in lamp: s.pop('bagian', None)
S['slide'] = utama + lamp; S.pop('bagian', None)
json.dump(S, open(PJ + 'spek/padat-081126.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print(len(S['slide']), dasar)
