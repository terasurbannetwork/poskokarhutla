#!/usr/bin/env python3
"""Ubah laporan WA BPBD (teks bebas) menjadi isian kontrak POST /api/logbook/kejadian.

Tanpa LLM: memakai ulang pengurai arsip logbook (scripts/data/logbook_pusdalops.py) dan
menambah pemetaan teks kendala/kebutuhan ke kode kontrak. Hasil WAJIB diperiksa staf;
`kosong` menyebut medan wajib yang tak terbaca.

    python3 scripts/wa/urai_laporan.py < laporan.txt
"""
from __future__ import annotations

import datetime
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
import logbook_pusdalops as lb  # noqa: E402

# ponytail: kata kunci tangan, bukan model; naikkan lewat contoh koreksi staf bila F1 kurang.
KENDALA = {
    "akses": r"akses|jalan|medan|sulit (?:di)?jangkau|terputus|jembatan|macet|terisolir|terisolasi",
    "logistik": r"logistik|bbm|bahan bakar|perbekalan",
    "sinyal": r"sinyal|jaringan|komunikasi|telekomunikasi",
    "air": r"sumber air|kekurangan air|air terbatas|minim air|sulit air|air (?:sulit|susah)",
    "personel": r"personel|personil|\bsdm\b|tenaga terbatas|petugas terbatas|kekurangan (?:tenaga|petugas)",
    "alat_berat": r"alat berat|ekskavator|excavator|beko|backhoe",
    "gambut": r"gambut",
    "cuaca": r"cuaca|hujan|badai|kabut|gelombang|petir",
    "data": r"\bdata\b|pendataan|informasi (?:belum|terbatas)",
    "dana": r"\bdana\b|anggaran|biaya|\bbtt\b",
    "malam": r"malam|gelap|penerangan",
    "sosial": r"menolak|penolakan|konflik|sosial",
    "listrik": r"listrik|\bpln\b|mati lampu",
    "angin": r"angin|puting beliung",
}
KEBUTUHAN = {
    "makanan": r"makanan|sembako|beras|\bnasi\b|dapur umum|bahan pokok|makan siap",
    "tenda": r"tenda|shelter|hunian|terpal",
    "sandang": r"sandang|pakaian|selimut|kasur|matras|alas tidur|family kit|kidsware",
    "air_bersih": r"air bersih|air minum|air mineral|sanitasi|tangki air|water tank|\bmck\b|toilet",
    "obat": r"obat|medis|kesehatan|masker",
    "perahu": r"perahu|sampan|rubber boat|\bboat\b|kapal",
    "material": r"material|semen|karung|sandbag|bambu|kayu|genset",
    "alat_berat": r"alat berat|ekskavator|excavator|beko|backhoe|dozer",
    "pompa": r"pompa|alkon|selang",
    "dana": r"\bdana\b|anggaran|biaya|\bbtt\b",
}
KENDALA = {k: re.compile(p, re.I) for k, p in KENDALA.items()}
KEBUTUHAN = {k: re.compile(p, re.I) for k, p in KEBUTUHAN.items()}
WAJIB = ("jenis", "prov", "kab", "mulai")
RE_LOK = re.compile(r"^\s*(?:lokasi\b|prov|kab|kota\b|kec(?:amatan)?\b|desa\b|kel\b)", re.I)
# "Desa A, Kec. B, Kab. C, Prov. D" satu baris -> satu penanda per baris
RE_PECAH = re.compile(r"\s*[,;]\s*(?=(?:Kec(?:amatan)?|Desa|Ds|Kel(?:urahan)?|Kab(?:upaten)?|Kota|Prov(?:insi)?)\.?\s+[A-Za-z])")


def kode(teks: str, tabel: dict) -> list:
    return [k for k, p in tabel.items() if p.search(teks or "")]


def urai(teks: str, tahun=None) -> dict:
    """teks bebas -> {"isian": {medan kontrak}, "kosong": [medan wajib tak terbaca]}."""
    tahun = str(tahun or datetime.date.today().year)
    t = lb.bersih(teks.replace("\r", "")).replace(" ", " ")
    t = "\n".join(RE_PECAH.sub("\n", l) for l in t.split("\n"))
    ket = lb.urai_ket(t)
    kepala = ket["catatan"]  # semua sebelum label pertama (Kronologi/Kendala/...)
    baris = kepala.split("\n")
    i_lok = next((i for i, l in enumerate(baris) if RE_LOK.match(l)), len(baris))
    w = lb.urai_waktu("\n".join(baris[:i_lok]), tahun)
    jt = w["jenis_teks"] or ""
    jenis = lb.jenis_dari(jt) if jt else "lainnya"
    if jenis == "lainnya":
        jenis = lb.jenis_dari(kepala[:400])
    lok = lb.urai_lokasi(kepala)
    dam = lb.urai_dampak(kepala)
    mulai = w["tgl_kejadian"]
    if mulai and w["jam_kejadian"]:
        mulai += "T" + w["jam_kejadian"]
    isian = {
        "jenis": jenis if jenis != "lainnya" else None,
        "prov": (lok["prov"] or [None])[0],
        "kab": (lok["kabkota"] or [None])[0],
        "kec": (lok["kecamatan"] or [None])[0],
        "desa": (lok["desa"] or [None])[0],
        "mulai": mulai,
        "md": dam["md"], "hilang": dam["hilang"], "luka": dam["luka"],
        "mengungsi_jiwa": dam["mengungsi"], "mengungsi_kk": dam["kk"],
        "rumah_rb": dam["rumah_rb"], "rumah_rs": dam["rumah_rs"],
        "rumah_rr": dam["rumah_rr"], "rumah_terendam": dam["rumah_terendam"],
        "luas_ha": dam["ha"],
        "kendala": kode(ket["kendala"], KENDALA),
        "kebutuhan": kode(ket["kebutuhan"], KEBUTUHAN),
        "catatan": "\n".join(x for x in (ket["kronologi"], ket["upaya"], ket["kondisi"]) if x),
        "sumber_instansi": (re.search(r"^\s*sumber(?: informasi)?\s*:\s*(.+)$", t, re.I | re.M) or [None, None])[1],
    }
    return {"isian": isian, "kosong": [m for m in WAJIB if not isian.get(m)]}


if __name__ == "__main__":
    print(json.dumps(urai(sys.stdin.read()), ensure_ascii=False, indent=2))
