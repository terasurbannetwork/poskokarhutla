"""Risiko cuaca ekstrem menurut InaRISK BNPB -> public/banjir/data/cuaca_risiko_bnpb.json (dijalankan TANGAN, bulanan, bukan di CI).

  python3 scripts/cuaca/risiko_bnpb.py --bangun   # ~1.030 panggilan berjeda, bisa dilanjutkan (cache data/raw/inarisk, gitignored)
  python3 scripts/cuaca/risiko_bnpb.py uji        # self-check tanpa jaringan (fixture di scripts/cuaca/fixture)

Sumber (docs/multi-bencana/SUMBER-BNPB.md, lisensi tidak tertulis: sebut "Sumber: InaRISK BNPB", jangan klaim terbuka):
  /apiv4/data-irbi-full                 NDJSON, indeks risiko (IRBI) per kab per tahun 2015-2025; kolom cuaca_ekstrem, abrasi, status
  /apiv4/get-infra-risk/{kab}/{bahaya}  sarana & penduduk per kelas aman/rendah/sedang/tinggi
Hasil curl nyata (18 Okt 2026):
  * kab yang belum dihitung server dibalas {"status":"pending"} (240 dari 514 pada panggilan pertama): tidak disimpan; jalankan --bangun lagi sampai infra_gagal 0.
  * nama bahaya yang benar: "cuaca-ekstrim" dan "gelombang-ekstrim-dan-abrasi" (ejaan "ekstrim", tanda minus).
  * ALL/{bahaya} BUKAN jumlah nasional (penduduk kelas tinggi cuaca = 303 rb, padahal Makassar saja 550 rb): dipakai jumlah per kab.
  * gelombang-ekstrim-dan-abrasi mengembalikan nol di kab pesisir yang dicoba; bila nol di SEMUA kab, bagiannya dibuang.
  * Skala indeks 2025 BERBEDA dari 2015-2024 (median cuaca 9,8 -> 16,0; maks 20,4 -> 36): selisih 2015 vs 2025 tidak sebanding,
    jadi perubahan dihitung 2015 -> 2024 (skala sama); 2025 dipakai untuk peringkat saja.
Pemetaan kode: pcode IRBI = kode kab/kota Kepmendagri 2025 empat digit = kolom "kode" scripts/udara/kota.json (514 cocok semua);
  dua digit pertama = kode provinsi (namaProv layar). Nama diambil dari kota.json, jadi layar tak perlu tabel kode.
"""
import json, os, sys, time, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KELUAR = os.path.join(AKAR, "public", "banjir", "data", "cuaca_risiko_bnpb.json")
CACHE = os.path.join(AKAR, "data", "raw", "inarisk")
FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture")
BASE = "https://inarisk.bnpb.go.id/apiv4/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
TAHUN = list(range(2015, 2026))
BAHAYA = {"cuaca": "cuaca-ekstrim", "gelombang": "gelombang-ekstrim-dan-abrasi"}
KELAS = ("aman", "rendah", "sedang", "tinggi")
# jenis sarana yang disimpan -> kunci di respons (faskes = rs + puskesmas)
SARANA = {"penduduk": ("penduduk",), "sekolah": ("sekolah",), "faskes": ("rs", "puskesmas"), "bandara": ("bandara",), "pelabuhan": ("pelabuhan",)}
JEDA = 0.7


def ambil(url, coba=3):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"}), timeout=90) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            if i == coba - 1:
                raise
            print(f"ulang {url}: {e}", file=sys.stderr)
            time.sleep(10 * (i + 1))


def angka(v, maks=100):
    """Indeks 0..maks atau None; bool, teks, negatif, NaN, atau di atas batas = ditolak."""
    return round(v, 1) if isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= maks else None


def urai_irbi(baris):
    """NDJSON IRBI -> ({kode: {tahun: [cuaca, abrasi]}}, {kode: status 2025}, jumlah baris ditolak).
    Ditolak: bukan JSON, bukan type=row, pcode bukan 4 digit, tahun di luar 2015-2025, kedua indeks tak sah."""
    out, st, tolak = {}, {}, 0
    for b in baris:
        b = b.strip()
        if not b:
            continue
        try:
            o = json.loads(b)
        except ValueError:
            tolak += 1
            continue
        if not isinstance(o, dict) or o.get("type") != "row":
            continue   # baris meta bukan data
        d = o.get("data")
        k = d.get("pcode") if isinstance(d, dict) else None
        if not (isinstance(k, str) and len(k) == 4 and k.isdigit()) or d.get("tahun") not in TAHUN:
            tolak += 1
            continue
        c, a = angka(d.get("cuaca_ekstrem")), angka(d.get("abrasi"))
        if c is None and a is None:
            tolak += 1
            continue
        out.setdefault(k, {})[d["tahun"]] = [c, a]
        if d["tahun"] == 2025 and d.get("status") in ("Sedang", "Tinggi"):
            st[k] = d["status"][0].lower()   # "s"edang / "t"inggi: status IRBI TOTAL semua bahaya, bukan cuaca saja
    return out, st, tolak


def urai_infra(o):
    """Respons get-infra-risk -> {jenis: [aman, rendah, sedang, tinggi]} atau None bila bentuknya salah/tak masuk akal."""
    if not isinstance(o, dict) or o.get("success") is False:
        return None
    hasil = {}
    for j, kunci in SARANA.items():
        t = [0, 0, 0, 0]
        for kk in kunci:
            v = o.get(kk)
            if not isinstance(v, dict):
                return None
            for i, kl in enumerate(KELAS):
                n = v.get(kl)
                if not isinstance(n, int) or isinstance(n, bool) or n < 0:
                    return None
                t[i] += n
        hasil[j] = t
    return hasil


def seri(per_tahun, ke):
    return [(per_tahun.get(y) or [None, None])[ke] for y in TAHUN]


def susun(irbi, status, infra, kota, tolak=0, dibuat=""):
    """Gabung. infra = {"cuaca": {kode: urai_infra}, "gelombang": {...}}. kota = {kode: nama}."""
    out = {"dibuat": dibuat, "sumber": "InaRISK BNPB (inarisk.bnpb.go.id, IRBI dan infra-risk); lisensi tidak tertulis, bukan klaim data terbuka",
           "arti": "Indeks risiko adalah penilaian potensi (bahaya x kerentanan / kapasitas) menurut BNPB, BUKAN catatan kejadian.",
           "tahun": TAHUN, "skala": {"2015-2024": "skala lama, maks 20,4", "2025": "skala baru, maks 36; tidak sebanding dengan tahun lama"},
           "ditolak_baris": tolak}
    for h, ke, nm in (("cuaca", 0, "cuaca_ekstrem"), ("gelombang", 1, "abrasi")):
        R = []
        for k in sorted(irbi):
            s = seri(irbi[k], ke)
            if k in kota and s[-1] is not None and s[0] is not None:
                R.append([k, kota[k], k[:2], s, status.get(k)])
        if R:
            out["indeks_" + h] = {"kolom": ["kode", "nama", "prov", "seri_2015_2025", "status_irbi_total_2025"], "baris": R, "kolom_bahaya": nm}
    cak = {}
    for h in ("cuaca", "gelombang"):
        P = {k: v for k, v in (infra.get(h) or {}).items() if v and k in kota}
        cak[h] = {"kab_terbaca": len(P)}
        if not any(sum(x) for v in P.values() for x in v.values()):
            continue   # semua nol atau tak terbaca: dibuang, bukan nol palsu
        nas = {j: [sum(v[j][i] for v in P.values()) for i in range(4)] for j in SARANA}
        top = sorted(([k, kota[k]] + [v[j][3] for j in SARANA] for k, v in P.items() if any(v[j][3] for j in SARANA)), key=lambda r: -r[2])
        out["sarana_" + h] = {"jenis": list(SARANA), "kelas": list(KELAS), "nasional": nas, "kolom_kab": ["kode", "nama"] + [j + "_tinggi" for j in SARANA], "kab_tinggi": top}
    cak["indeks_kab"] = len(kota)
    out["cakupan"] = cak
    return out


def bangun():
    kota = {r[0]: r[1] for r in json.load(open(os.path.join(AKAR, "scripts", "udara", "kota.json")))["baris"]}
    os.makedirs(CACHE, exist_ok=True)
    jin = os.path.join(CACHE, "irbi.ndjson")
    if not os.path.exists(jin):
        open(jin, "w").write(ambil(BASE + "data-irbi-full"))
    irbi, status, tolak = urai_irbi(open(jin).read().splitlines())
    print(f"irbi: {len(irbi)} kab, ditolak {tolak}", file=sys.stderr)
    infra = {h: {} for h in BAHAYA}
    gagal = 0

    def satu(hk):   # satu panggilan server ~5 dtk (dihitung per kab): 4 jalur paralel, masing-masing berjeda
        h, k = hk
        jc = os.path.join(CACHE, f"{h}_{k}.json")
        if os.path.exists(jc):
            return hk, json.load(open(jc))
        try:
            o = json.loads(ambil(f"{BASE}get-infra-risk/{k}/{BAHAYA[h]}"))
        except Exception as e:
            print(f"gagal {h} {k}: {e}", file=sys.stderr)
            return hk, None
        if isinstance(o, dict) and o.get("status") == "pending":   # server menghitung dulu (dibalas {status:pending}); jangan simpan, ulangi jalankan --bangun
            time.sleep(JEDA)
            return hk, None
        json.dump(o, open(jc, "w"))
        time.sleep(JEDA)
        return hk, o
    from concurrent.futures import ThreadPoolExecutor   # ponytail: 4 jalur, turunkan bila server membalas 429
    with ThreadPoolExecutor(4) as ex:
        for n, (hk, o) in enumerate(ex.map(satu, [(h, k) for h in BAHAYA for k in sorted(kota)])):
            u = urai_infra(o) if o else None
            if u:
                infra[hk[0]][hk[1]] = u
            else:
                gagal += 1
            if n % 100 == 99:
                print(f"{n + 1}/{2 * len(kota)}", file=sys.stderr)
    out = susun(irbi, status, infra, kota, tolak, time.strftime("%Y-%m-%dT%H:%M+07:00", time.gmtime(time.time() + 7 * 3600)))
    out["cakupan"]["infra_gagal"] = gagal
    s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    assert len(s) <= 300_000, len(s)
    tmp = KELUAR + ".tmp"
    open(tmp, "w").write(s)
    os.replace(tmp, KELUAR)
    print(f"{KELUAR}: {len(s) / 1024:.0f} KB, cakupan {out['cakupan']}", file=sys.stderr)


def uji():
    irbi, st, tolak = urai_irbi(open(os.path.join(FIX, "irbi_cuplikan.ndjson")).read().splitlines())
    assert sorted(irbi) == ["3171", "3273", "7371"] and all(len(v) == 11 for v in irbi.values()) and tolak == 0, (sorted(irbi), tolak)
    assert irbi["3171"][2025][0] == 16 and irbi["3171"][2024][0] == 3.8, irbi["3171"]   # nilai nyata Jakarta Pusat; tepi skala 2024/2025
    assert st["3171"] == "s" and len(st) == 3, st
    rusak = ['bukan json', '{"type":"row","data":{"pcode":"31","tahun":2025,"cuaca_ekstrem":5}}', '{"type":"row","data":{"pcode":"3171","tahun":2030,"cuaca_ekstrem":5}}',
             '{"type":"row","data":{"pcode":"3171","tahun":2025,"cuaca_ekstrem":-4,"abrasi":"x"}}', '{"type":"row","data":{"pcode":"3171","tahun":2025,"cuaca_ekstrem":999}}',
             '{"type":"row","data":{"pcode":"3171","tahun":2025,"cuaca_ekstrem":true}}', '{"type":"meta"}', '']
    o, _, t = urai_irbi(rusak)
    assert o == {} and t == 6, (o, t)
    u = urai_infra(json.load(open(os.path.join(FIX, "infra_cuaca_7371.json"))))
    assert u["penduduk"] == [4434, 0, 0, 549724] and u["sekolah"][3] == 1320 and u["pelabuhan"] == [1, 0, 0, 1], u
    assert u["faskes"][3] == sum(json.load(open(os.path.join(FIX, "infra_cuaca_7371.json")))[k]["tinggi"] for k in ("rs", "puskesmas"))
    assert urai_infra({"success": False, "message": "x"}) is None and urai_infra({"penduduk": {}}) is None
    assert urai_infra({**{k: {"aman": 0, "rendah": 0, "sedang": 0, "tinggi": -1} for k in ("penduduk", "sekolah", "rs", "puskesmas", "bandara", "pelabuhan")}}) is None
    nol = {j: [0, 0, 0, 0] for j in SARANA}
    kota = {"3171": "Kota Jakarta Pusat", "7371": "Kota Makassar", "3273": "Kota Bandung"}
    r = susun(irbi, st, {"cuaca": {"7371": u, "3171": nol}, "gelombang": {"7371": nol}}, kota, 0, "x")
    assert "sarana_gelombang" not in r and [x[0] for x in r["sarana_cuaca"]["kab_tinggi"]] == ["7371"], r.get("sarana_gelombang")
    assert r["sarana_cuaca"]["nasional"]["penduduk"][3] == 549724 and len(r["indeks_cuaca"]["baris"]) == 3
    print("ok risiko_bnpb")


if __name__ == "__main__":
    if "--bangun" in sys.argv:
        bangun()
    elif "uji" in sys.argv:
        uji()
    else:
        print(__doc__)
