"""Rumus bersama sinyal sosial/infrastruktur (#35, #36, #38): z-score kokoh dan uji deteksi dini vs label kejadian.
Murni (tanpa jaringan); self-check:  python3 scripts/umum/sinyal.py"""
import random, statistics as st


def z_kokoh(seri, i, jendela=28, lantai=None):
    """z hari ke-i terhadap median/MAD `jendela` hari SEBELUMNYA (i sendiri tak ikut: bebas bocor).
    Skala = max(1,4826*MAD, sqrt(median)) agar seri hitungan kecil/datar tak meledak. None bila riwayat < 14 hari."""
    h = [x for x in seri[max(0, i - jendela):i] if x is not None]
    if len(h) < 14 or seri[i] is None:
        return None
    m = st.median(h)
    mad = st.median([abs(x - m) for x in h])
    skala = max(1.4826 * mad, (max(m, 1)) ** 0.5 if lantai is None else lantai)
    return (seri[i] - m) / skala


def deret_z(seri, jendela=28, lantai=None):
    return [z_kokoh(seri, i, jendela, lantai) for i in range(len(seri))]


def gabung(*deret):
    """Skor gabungan = rata-rata z yang ada pada hari itu (None bila tak satu pun)."""
    out = []
    for t in zip(*deret):
        v = [x for x in t if x is not None]
        out.append(sum(v) / len(v) if v else None)
    return out


def metrik(alarm, kejadian, depan=3):
    """alarm, kejadian: list bool per hari. Kejadian terdeteksi bila ada alarm di [d-depan, d];
    alarm benar bila ada kejadian di [d, d+depan]. -> POD, FAR, CSI, lead (hari, alarm pertama sebelum kejadian)."""
    n = len(alarm)
    hit, lead, ev = 0, [], 0
    for d in range(n):
        if kejadian[d]:
            ev += 1
            a = [k for k in range(max(0, d - depan), d + 1) if alarm[k]]
            if a:
                hit += 1
                lead.append(d - a[0])
    na = sum(alarm)
    benar = sum(1 for d in range(n) if alarm[d] and any(kejadian[d:d + depan + 1]))
    pod = hit / ev if ev else None
    far = 1 - benar / na if na else None
    csi = hit / (ev + (na - benar)) if ev + na - benar else None
    return {"kejadian": ev, "alarm": na, "pod": pod, "far": far, "csi": csi,
            "lead_median": st.median(lead) if lead else None, "lead_ge1": sum(1 for x in lead if x >= 1)}


def acak(alarm, kejadian, depan=3, n=1000, benih=7):
    """Pembanding: alarm acak dengan JUMLAH sama. -> rata-rata dan P95 POD, rata-rata FAR/CSI."""
    r = random.Random(benih)
    na, N = sum(alarm), len(alarm)
    pods, fars, csis = [], [], []
    for _ in range(n):
        idx = set(r.sample(range(N), min(na, N)))
        m = metrik([i in idx for i in range(N)], kejadian, depan)
        pods.append(m["pod"] or 0); fars.append(m["far"] if m["far"] is not None else 1); csis.append(m["csi"] or 0)
    pods_u = sorted(pods)
    return {"pod_rata": sum(pods) / n, "pod_p95": pods_u[int(0.95 * n) - 1], "far_rata": sum(fars) / n,
            "csi_rata": sum(csis) / n, "_pods": pods_u}


def uji_deteksi(skor, kejadian, depan=3, ambang=(1.5, 2, 2.5, 3), bagi=0.6, min_kej_uji=8):
    """Pembagian waktu: ambang dipilih di `bagi` awal (maks CSI), dinilai di sisanya. Tanpa bocor: z memakai riwayat saja.
    LOLOS bila POD uji > P95 POD acak (alarm sama banyak) DAN CSI uji > rata-rata CSI acak; TAK TERUJI bila kejadian uji < min_kej_uji."""
    n = len(skor)
    c = int(n * bagi)

    def al(k, a, b):
        return [(skor[i] is not None and skor[i] >= k) for i in range(a, b)]

    best = max(ambang, key=lambda k: (metrik(al(k, 0, c), kejadian[:c], depan)["csi"] or 0, -k))
    A, K = al(best, c, n), kejadian[c:]
    m = metrik(A, K, depan)
    if m["kejadian"] < min_kej_uji:
        return {"ambang": best, "uji": m, "vonis": "TAK TERUJI", "sebab": f"kejadian hari uji {m['kejadian']} < {min_kej_uji}"}
    a = acak(A, K, depan)
    p = sum(1 for x in a["_pods"] if x >= (m["pod"] or 0)) / len(a["_pods"])
    ok = (m["pod"] or 0) > a["pod_p95"] and (m["csi"] or 0) > a["csi_rata"]
    a.pop("_pods")
    return {"ambang": best, "uji": m, "acak": a, "p_acak": p, "vonis": "LOLOS" if ok else "GAGAL"}


def uji_tetap(skor, kejadian, k=2.0, depan=3, min_kej=8):
    """Ambang TETAP (tanpa fitting, jadi seluruh deret boleh dinilai; dipakai bila satu tahun terlalu musiman untuk pisah waktu)."""
    A = [(x is not None and x >= k) for x in skor]
    m = metrik(A, kejadian, depan)
    if m["kejadian"] < min_kej or not m["alarm"]:
        return {"ambang": k, "uji": m, "vonis": "TAK TERUJI", "sebab": f"kejadian {m['kejadian']}, alarm {m['alarm']}"}
    a = acak(A, kejadian, depan)
    p = sum(1 for x in a["_pods"] if x >= (m["pod"] or 0)) / len(a["_pods"])
    a.pop("_pods")
    ok = (m["pod"] or 0) > a["pod_p95"] and (m["csi"] or 0) > a["csi_rata"]
    return {"ambang": k, "uji": m, "acak": a, "p_acak": p, "vonis": "LOLOS" if ok else "GAGAL"}


if __name__ == "__main__":
    s = [10] * 40 + [10, 40]
    assert z_kokoh(s, 40) is not None and abs(z_kokoh(s, 40)) < 1e-9 and z_kokoh(s, 41) > 5
    assert z_kokoh(s, 5) is None
    assert gabung([1, None], [3, None]) == [2, None]
    k = [False] * 10; k[5] = True
    a = [False] * 10; a[4] = True
    m = metrik(a, k, 3)
    assert m["pod"] == 1 and m["far"] == 0 and m["lead_median"] == 1
    assert metrik([False] * 10, k, 3)["pod"] == 0
    # sinyal sempurna (alarm sehari sebelum tiap kejadian) harus LOLOS; derau acak murni jarang
    r = random.Random(1)
    kej = [r.random() < 0.1 for _ in range(300)]
    skor = [3.0 if i + 1 < 300 and kej[i + 1] else 0.0 for i in range(300)]
    assert uji_deteksi(skor, kej)["vonis"] == "LOLOS"
    salah = sum(uji_deteksi([r.gauss(0, 1) for _ in range(300)], kej)["vonis"] == "LOLOS" for _ in range(20))
    assert salah <= 3, salah
    assert uji_tetap(skor, kej)["vonis"] == "LOLOS"
    print("uji sinyal: ok")
