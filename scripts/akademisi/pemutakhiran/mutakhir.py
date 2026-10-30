#!/usr/bin/env python3
"""Pemutakhiran bulanan Direktori Jaringan Kebencanaan (PRD lembaga §6.16, tiket L51). Jalankan: python3 -I mutakhir.py --kerja <folder>
DATA TIDAK PERNAH MASUK REPO: skrip ini hanya kode. Unduh/unggah R2 dikerjakan workflow (direktori-bulanan.yml), bukan skrip ini.

Masukan di <folder>: lembaga.json (wajib), berita.json (boleh tak ada). Keluaran di <folder>/keluar/: lembaga.json, berita.json,
pemutakhiran/<yyyy-mm>.json. Langkah: (b) cek situs hidup -> status_situs, (c) rayap ulang kontak + medsos bila diperiksa > 180 hari atau
situs pindah domain (diperiksa baru ditulis saat rayap SELESAI, jadi jam 180 hari milik kontak), (e) logo yang belum ada,
(d) berita baru sejak bulan lalu, (f) gabung lewat lembaga_gabung.mjs (kontak hanya ditambah: nomor lama tidak dihapus, hanya dilaporkan
'tak ditemukan'), (g) laporan. --tambahan <panen.json>... memasukkan lembaga baru lewat penggabung yang sama.
--tanpa-jaringan: lewati langkah (b)-(e) (uji pipa). --tanpa-berita: lewati (d). --batas N: hanya N lembaga pertama (uji). --menit: anggaran waktu total (default 100)."""
import argparse, collections, concurrent.futures as cf, copy, datetime, json, os, subprocess, sys, time

AKAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AKAR)  # python3 -I tidak menaruh folder skrip di sys.path
import inti, rayap, berita  # noqa: E402

MJS = os.path.join(AKAR, "..", "lembaga_gabung.mjs")


def baca(p, bawaan=None):
    if not os.path.exists(p): return bawaan
    d = json.load(open(p, encoding="utf-8"))
    return d.get("lembaga", d) if isinstance(d, dict) else d


def tulis(p, d):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, separators=(",", ":"))


def sejak_bulan_lalu(kini):
    return (kini.replace(day=1) - datetime.timedelta(days=1)).replace(day=1).isoformat()


def periksa_semua(lemb, kini, hari, habis, hitung):
    """Mengubah lemb di tempat; mengembalikan (panen_kontak, kontak_berubah, situs_mati, situs_pindah)."""
    per = collections.defaultdict(list)
    for l in lemb:
        if l.get("web"): per[inti.host_dari(l["web"] if l["web"].startswith("http") else "https://" + l["web"])].append(l)
    panen_all, kontak, mati, pindah = [], [], [], []

    def kerja(ls):
        host, hasil = rayap.Host(), []
        for l in ls:
            if habis(): hasil.append((l, None)); continue
            try:
                p = inti.perlu_rayap(l, kini)
                r = rayap.periksa(l, host, hari, p)
                pdh = inti.situs_pindah(l["web"], r["url_akhir"])
                if pdh and not p and r["kode"] == 200 and not r["tantangan"]: r = rayap.periksa(l, host, hari, True)
                hasil.append((l, (r, pdh)))
            except Exception:  # satu situs rusak tidak boleh menjatuhkan seluruh pemutakhiran
                hasil.append((l, None))
        return hasil

    with cf.ThreadPoolExecutor(16) as ex:
        for hasil in ex.map(kerja, per.values()):
            for l, x in hasil:
                if x is None: hitung["dilewati"] += 1; continue
                r, pdh = x; st = inti.status_dari(r["kode"], r["tantangan"])
                hitung["situs_" + st] += 1; l["status_situs"] = st
                if st == "mati": mati.append(l["id"])
                if pdh: hitung["situs_pindah"] += 1; pindah.append({"id": l["id"], "ke": inti.host_dari(r["url_akhir"])})
                if r["logo"] and not l.get("logo"): l["logo"] = r["logo"]; hitung["logo_baru"] += 1
                pn = r["panen"]
                if pn is None: continue
                hitung["dirayap"] += 1
                kontak += inti.perubahan_kontak(l["id"], l, pn)
                for k, v in pn["medsos"].items():
                    if k == "linkedin":
                        if not l.get("linkedin"): l["linkedin"] = v; hitung["medsos_baru"] += 1
                    elif k not in (l.get("medsos") or {}): l.setdefault("medsos", {})[k] = v; hitung["medsos_baru"] += 1
                l["diperiksa"] = hari
                panen_all.append({"id": l["id"], "nama": l["nama"], "kategori": l["kategori"], "email": pn["email"], "telepon": pn["telepon"], "wa": pn["wa"],
                                  "sumber": pn["sumber"], "diperiksa": hari})
    hitung["situs_diperiksa"] = sum(len(v) for v in per.values()) - hitung["dilewati"]
    return panen_all, kontak, mati, pindah


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kerja", required=True); ap.add_argument("--hari"); ap.add_argument("--batas", type=int, default=0)
    ap.add_argument("--menit", type=float, default=100); ap.add_argument("--tanpa-jaringan", action="store_true"); ap.add_argument("--tanpa-berita", action="store_true"); ap.add_argument("--tambahan", nargs="*", default=[])
    a = ap.parse_args()
    kini = datetime.date.fromisoformat(a.hari) if a.hari else datetime.date.today(); hari = kini.isoformat(); bulan = hari[:7]
    lemb = baca(os.path.join(a.kerja, "lembaga.json"))
    if not lemb: sys.exit("lembaga.json tidak ada atau kosong: berhenti tanpa menulis apa pun")
    awal = {l["id"] for l in lemb}
    mulai = time.monotonic()
    habis_kontak = lambda: time.monotonic() - mulai > a.menit * 36  # 60% anggaran untuk situs; sisanya berita
    habis = lambda: time.monotonic() - mulai > a.menit * 60
    hitung, panen_k, kontak, mati, pindah, baru_berita = collections.Counter(), [], [], [], [], []
    ada_berita = baca(os.path.join(a.kerja, "berita.json"), [])
    if not a.tanpa_jaringan:
        sasaran = lemb[:a.batas] if a.batas else lemb
        panen_k, kontak, mati, pindah = periksa_semua(sasaran, kini, hari, habis_kontak, hitung)
        if not a.tanpa_berita: baru_berita = berita.panen(sasaran, sejak_bulan_lalu(kini), hari, [b["id"] for b in ada_berita], habis)
    hitung["kontak_berubah"] = len(kontak); hitung["berita_baru"] = len(baru_berita)
    ant = os.path.join(a.kerja, "antara")
    tulis(os.path.join(ant, "dasar.json"), lemb); tulis(os.path.join(ant, "rayap.json"), panen_k)
    keluar = os.path.join(a.kerja, "keluar", "lembaga.json")
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    g = subprocess.run(["node", MJS, "--keluar", keluar, os.path.join(ant, "dasar.json"), os.path.join(ant, "rayap.json"), *a.tambahan], capture_output=True, text=True)
    if g.returncode: sys.exit("penggabung gagal: " + g.stderr[-500:])
    hasil = json.load(open(keluar, encoding="utf-8"))
    if len(hasil) < len(awal):
        os.remove(keluar); sys.exit(f"penggabung menghilangkan lembaga ({len(hasil)} < {len(awal)}): berkas keluar dihapus, jangan diunggah")
    baru_id = [l["id"] for l in hasil if l["id"] not in awal]; hitung["lembaga_baru"] = len(baru_id)
    if ada_berita or baru_berita: tulis(os.path.join(a.kerja, "keluar", "berita.json"), sorted(baru_berita + ada_berita, key=lambda b: b["tanggal"], reverse=True))
    rep = inti.laporan(bulan, hitung, kontak, mati, baru_id, len(baru_berita)); rep["situs_pindah"] = pindah
    tulis(os.path.join(a.kerja, "keluar", "pemutakhiran", bulan + ".json"), rep)
    ringkas = f"direktori {bulan}: " + ", ".join(f"{k} {v}" for k, v in rep["jumlah"].items())  # hanya hitungan, tidak mencetak data
    print(ringkas)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f: f.write(ringkas + "\n")


if __name__ == "__main__":
    main()
