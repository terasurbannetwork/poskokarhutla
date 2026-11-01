#!/usr/bin/env python3
"""Ubah laporan WA BPBD (teks bebas) menjadi isian kontrak POST /api/logbook/kejadian.

Tanpa LLM: memakai ulang pengurai arsip logbook (scripts/data/logbook_pusdalops.py) dan
menambah pemetaan teks kendala/kebutuhan ke kode kontrak. Kunci `isian` TETAP (kontrak lama);
nama, kode DIBI, status, kriteria menonjol (Lapjol) dan ambang Laphar mengikuti panduan resmi Pusdalops
BNPB lewat `panduan_resmi.json` (kunci `resmi`, `menonjol`, `masuk_laphar`). Hasil WAJIB diperiksa staf;
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
PANDUAN = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "panduan_resmi.json"), encoding="utf8"))
RE_STATUS = re.compile(r"(perpanjangan[^\n.;,]{0,25}?)?\b(siaga|tanggap|transisi)\s+darurat", re.I)
STATUS_BAKU = {"siaga": "Siaga Darurat", "tanggap": "Tanggap Darurat", "transisi": "Transisi Darurat ke Pemulihan"}
KENDALA = {k: re.compile(p, re.I) for k, p in KENDALA.items()}
KEBUTUHAN = {k: re.compile(p, re.I) for k, p in KEBUTUHAN.items()}
WAJIB = ("jenis", "prov", "kab", "mulai")
RE_LOK = re.compile(r"^\s*(?:lokasi\b|prov|kab|kota\b|kec(?:amatan)?\b|desa\b|kel\b)", re.I)
# "Desa A, Kec. B, Kab. C, Prov. D" satu baris -> satu penanda per baris
RE_PECAH = re.compile(r"\s*[,;]\s*(?=(?:Kec(?:amatan)?|Desa|Ds|Kel(?:urahan)?|Kab(?:upaten)?|Kota|Prov(?:insi)?)\.?\s+[A-Za-z])")


def kode(teks: str, tabel: dict) -> list:
    return [k for k, p in tabel.items() if p.search(teks or "")]


def jenis_resmi(kunci, teks: str):
    """kunci jenis internal + teks -> entri jenis panduan (Logbook h2) atau None. Cuaca dan gempabumi dibelah per teks."""
    t = (teks or "").lower()
    if kunci == "cuaca":
        kode = "103" if re.search(r"gelombang|abrasi|banjir rob", t) and not re.search(r"puting beliung|angin", t) else "104"
    elif kunci == "gempabumi":
        kode = "108" if "tsunami" in t and "gempa" not in t else "107"
    elif kunci in (None, "lainnya"):  # nama kejadian resmi yang tak ditangkap pola internal (hujan es, awan panas, wabah, ...)
        kode = next((x["kode"] for x in PANDUAN["jenis"] if any(n in t for n in x["nama_kejadian"])), None)
    elif kunci in lb.KODE_JENIS:  # gelombang_pasang, tsunami, wabah punya kunci sendiri di pengurai arsip
        kode = lb.KODE_JENIS[kunci]
    else:
        kode = next((j["kode"] for j in PANDUAN["jenis"] if j["kunci"] == kunci), None)
    return next((j for j in PANDUAN["jenis"] if j["kode"] == kode), None)


def menonjol(j, i: dict, terdampak_jiwa=None) -> dict:
    """Kriteria Lapjol (panduan_resmi.json). j = entri jenis. -> {"ya": bool, "alasan": [teks]}. Tanpa LLM."""
    k = (j or {}).get("menonjol")
    if not k:
        return {"ya": False, "alasan": []}
    n = lambda v: v or 0
    kk, orang = n(i["mengungsi_kk"]), max(n(i["mengungsi_jiwa"]), n(terdampak_jiwa))
    rusak = n(i["rumah_rb"]) + n(i["rumah_rs"]) + n(i["rumah_rr"])
    sebab = []
    if "ha_saja" in k:
        if n(i["luas_ha"]) >= k["ha_saja"]:
            sebab.append(f"{i['luas_ha']:g} ha terbakar, ambang {k['ha_saja']} ha")
    else:
        if "kk" in k and kk >= k["kk"]:
            sebab.append(f"{kk} KK terdampak/mengungsi, ambang {k['kk']} KK")
        if "orang" in k and orang >= k["orang"]:
            sebab.append(f"{orang} orang terdampak/mengungsi, ambang {k['orang']} orang")
        md_hl = n(i["md"]) + (n(i["hilang"]) if k.get("korban") == "md_hilang" else 0)
        if k.get("korban") and md_hl:
            sebab.append(f"ada korban {'MD/hilang' if k['korban'] == 'md_hilang' else 'MD'}")
        if "rumah_rusak" in k and rusak >= k["rumah_rusak"]:
            sebab.append(f"{rusak} rumah rusak, ambang {k['rumah_rusak']}")
        if "ha" in k and n(i["luas_ha"]) >= k["ha"]:
            sebab.append(f"{i['luas_ha']:g} ha lahan terdampak, ambang {k['ha']} ha")
        if k.get("ada_dampak") and (n(terdampak_jiwa) or any(n(i[m]) for m in (
                "md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"))):
            sebab.append("ada data akibat terhadap manusia/kerusakan")
    return {"ya": bool(sebab), "alasan": [f"{x} ({k['hal']})" for x in sebab]}


def masuk_laphar(i: dict, terdampak_jiwa, status) -> dict:
    """Ambang kejadian masuk Laporan Harian (Laphar h2 G.2)."""
    n = lambda v: v or 0
    a = PANDUAN["ambang_laphar"]["salah_satu"]
    s = []
    if n(i["md"]) >= a["md"]:
        s.append("ada yang meninggal")
    if max(n(i["luka"]), n(i["mengungsi_jiwa"]), n(terdampak_jiwa)) >= a["orang_terdampak_luka_mengungsi"]:
        s.append("50 orang atau lebih terdampak/luka/mengungsi")
    if n(i["rumah_rb"]) + n(i["rumah_rs"]) + n(i["rumah_rr"]) >= a["unit_rusak_rumah_atau_fasilitas_publik"]:
        s.append("5 unit atau lebih rumah rusak")
    if n(i["luas_ha"]) >= a["ha"]:
        s.append("1 ha atau lebih lahan")
    if status:
        s.append("ada penetapan status darurat")
    return {"ya": bool(s), "alasan": [f"{x} ({PANDUAN['ambang_laphar']['hal']})" for x in s]}


def urai(teks: str, tahun=None) -> dict:
    """teks bebas -> {"isian": {medan kontrak}, "kosong": [medan wajib tak terbaca]}."""
    tahun = str(tahun or datetime.date.today().year)
    t = lb.bersih(teks.replace("\r", "")).replace(" ", " ")
    t = re.sub(r"^[ \t]*lokasi[ \t]*:[ \t]*", "", t, flags=re.I | re.M)  # "Lokasi: Desa A, Kec. B": penanda pertama kini di awal baris
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
    j = jenis_resmi(jenis, kepala)
    nama = next((x for x in sorted(j["nama_kejadian"], key=len, reverse=True) if x in kepala.lower()), None) if j else None
    st = RE_STATUS.search(t)
    status = {"tingkat": STATUS_BAKU[st[2].lower()], "perpanjangan": bool(st[1])} if st else None
    resmi = {
        "kode_dibi": j["kode"] if j else None,
        "jenis_bencana": j["nama"] if j else None,
        "nama_kejadian": nama.capitalize() if nama else (j["nama"] if j else None),
        "dampak": {"meninggal": isian["md"], "hilang": isian["hilang"], "luka_sakit": isian["luka"],
                   "kk_terdampak_atau_mengungsi": isian["mengungsi_kk"], "mengungsi_orang": isian["mengungsi_jiwa"],
                   "terdampak_orang": dam["jiwa"], "rumah_rb": isian["rumah_rb"], "rumah_rs": isian["rumah_rs"],
                   "rumah_rr": isian["rumah_rr"], "rumah_terdampak": isian["rumah_terendam"], "lahan_ha": isian["luas_ha"]},
        "status_darurat": status,
    }
    return {"prov_kode": (lok["prov_kode"] or [None])[0], "isian": isian, "kosong": [m for m in WAJIB if not isian.get(m)], "resmi": resmi,
            "menonjol": menonjol(j, isian, dam["jiwa"]), "masuk_laphar": masuk_laphar(isian, dam["jiwa"], status)}


if __name__ == "__main__":
    print(json.dumps(urai(sys.stdin.read()), ensure_ascii=False, indent=2))
