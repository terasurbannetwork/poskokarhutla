"""Bangun ulang deck pembaruan 231026 dengan mesin utama bangun/pptx/deck.py. Kait yang dulu ditambal di berkas ini
(judul_sampul_maks_baris, horizon_label, skenario label_jenis dan kemungkinan_keyakinan, kebijakan legenda, rekomendasi
sumber, metadata dokumen, label KEMUNGKINAN DALAM LIMA TAHUN) kini bagian dari deck.py; spek memakai kunci yang sama.
Laporan QA deck (Buku Pegangan S39) ditulis ke keluaran/qa/.
Pemakaian: python bangun-update.py <spek.json> <keluar.pptx>"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'bangun' / 'pptx'))
from deck import DeckGalat, main  # noqa: E402

try:
    main([sys.argv[1], sys.argv[2], '--pdf'])
except DeckGalat as e:
    sys.exit(f'DeckGalat: {e}')
