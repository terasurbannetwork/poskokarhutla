"""Saring cache SiRUP jadi daftar kajian/riset kebencanaan + swakelola tipe II/III."""
import collections, csv, json, os, re
D = os.path.dirname(os.path.abspath(__file__))
K = re.compile(r"kajian|studi|riset|peneliti|karhutla|kebakaran hutan|kebakaran lahan|gambut|risiko bencana|kontinjensi|peringatan dini|jitupasna|r3p|indeks|pemetaan|sistem informasi|aplikasi|dashboard|tenaga ahli|konsultan|evaluasi|analisis|naskah akademik|rencana penanggulangan|destana|desa tangguh|peduli api|pendampingan", re.I)
BENCANA = re.compile(r"bencana|karhutla|kebakaran|gambut|banjir|longsor|kekeringan|asap", re.I)
BUANG = re.compile(r"perjalanan|uang harian|transport|narasumber|honor|konsumsi|makan|alat tulis|bbm|sewa|pajak|patwal|paket meeting", re.I)
rows = []
for f in sorted(os.listdir(f"{D}/cache")):
    for r in json.load(open(f"{D}/cache/{f}")):
        teks = r["paket"] + " " + (r.get("kegiatan") or "")
        tipe = r.get("tipe")
        bpbd = bool(re.search(r"bencana|bpbd", r["satuanKerja"], re.I)) or r["klpd"] == "BNPB"
        ok = K.search(teks) and (bpbd or BENCANA.search(teks))
        if r["jalur"] == "swakelola" and tipe == 3: ok = True
        if not ok or BUANG.search(r["paket"]) or r["pagu"] < 25e6: continue
        jalur = "Penyedia" if r["jalur"] == "penyedia" else f"Swakelola tipe {tipe}"
        rows.append([r["klpd"], jalur, r.get("jenisPengadaan", ""), r.get("metode", ""), r["tahun"], r["pagu"],
                     r["satuanKerja"].strip(), r["paket"].strip(), (r.get("kegiatan") or "").strip(),
                     f"https://sirup.inaproc.id/sirup/home/detailPaket{'Penyedia' if r['jalur'] == 'penyedia' else 'Swakelola'}Public2017/{r['id']}"])
rows.sort(key=lambda x: (x[0] != "BNPB", x[0], x[1], -x[5]))
with open(f"{D}/sirup-kajian-bnpb-bpbd-2024-2026.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["klpd", "jalur", "jenis", "metode", "tahun", "pagu_rp", "satker", "paket", "kegiatan", "tautan_sirup"]); w.writerows(rows)
print("baris:", len(rows))
semua = [r for f in os.listdir(f"{D}/cache") for r in json.load(open(f"{D}/cache/{f}")) if r["jalur"] == "swakelola"]
print("tipe swakelola per KLPD:", sorted(collections.Counter((r["klpd"], r.get("tipe")) for r in semua).items()))
