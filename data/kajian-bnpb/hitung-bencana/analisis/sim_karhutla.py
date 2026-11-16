"""Simulasi "apa itu satu kejadian karhutla": gabung ruang-waktu titik panas VIIRS.

Pakai:  python sim_karhutla.py [berkas_cache.npz]
Keluaran: hasil/sim_karhutla.json (semua angka dipakai riset/SIM-KARHUTLA.md).
Data: lihat sim_data.py (arsip FIRMS VIIRS 15 Okt - 11 Nov 2026) dan public/data/hotspot.json + kluster.json (5-12 Okt 2026).
Kejadian = komponen terhubung (single-linkage, transitif): dua deteksi sekawan bila jarak <= D km dan selisih waktu <= W jam.
Luas = PROKSI: jumlah piksel ~375 m unik x 14,0625 ha; BUKAN luas terbakar.
"""
import collections, datetime as dt, json, math, os, sys
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

AQ = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQ)
import sim_data as SD
from wilayah import PROVINSI
import titik_unik as TU

HA_PX = 0.375 * 0.375 * 100  # 14,0625 ha per piksel 375 m
GRID_D = (0.5, 1.0, 2.0)
GRID_W = (6, 24, 72)
EPOCH = SD.EPOCH


def tgl(t):  # jam sejak 1 Okt 00:00 UTC -> 'dd-mm' WIB
    return (EPOCH + dt.timedelta(hours=float(t) + 7)).strftime("%d-%m")


def hav(la1, lo1, la2, lo2):
    p1, p2 = np.radians(la1), np.radians(la2)
    h = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * np.arcsin(np.sqrt(h))


def pasangan(lat, lon, r_km):
    """semua pasangan (i<j) dengan jarak haversine <= r_km. i<j berarti t_i <= t_j (data urut waktu)."""
    x = (lon - 100) * 111.195 * math.cos(math.radians(3))
    y = lat * 111.195
    p = cKDTree(np.c_[x, y]).query_pairs(r_km * 1.04, output_type="ndarray")
    i, j = p[:, 0].astype(np.int32), p[:, 1].astype(np.int32)
    d = hav(lat[i], lon[i], lat[j], lon[j])
    k = d <= r_km
    return i[k], j[k], d[k]


def komponen(n, i, j):
    g = coo_matrix((np.ones(len(i), dtype=np.int8), (i, j)), shape=(n, n))
    return connected_components(g, directed=False)


def agg(label, k, vals, fn):
    o = np.full(k, np.inf if fn is np.minimum else -np.inf)
    fn.at(o, label, vals)
    return o


def n_unik(label, k, pik, npik):
    kunci = np.unique(label.astype(np.int64) * npik + pik)
    return np.bincount((kunci // npik).astype(np.int64), minlength=k)


def sub_dalam_jendela(label, k, t, i, j, dt_, W, pik, npik, mode, jam=24):
    """Kelompok terpisah dalam `jam` jam pertama ('awal') atau terakhir ('akhir') tiap kejadian."""
    n = len(t)
    if mode == "awal":
        dalam = t <= agg(label, k, t, np.minimum)[label] + jam
    else:
        dalam = t >= agg(label, k, t, np.maximum)[label] - jam
    e = (dt_ <= W) & dalam[i] & dalam[j]
    _, sub = komponen(n, i[e], j[e])
    idx = np.where(dalam)[0]
    _, su2 = np.unique(sub[idx], return_inverse=True)
    ns = su2.max() + 1
    pu = n_unik(su2, ns, pik[idx], npik)
    lab_sub = np.zeros(ns, dtype=np.int64)
    lab_sub[su2] = label[idx]
    ada = np.bincount(lab_sub, minlength=k)
    bermakna = np.bincount(lab_sub[pu >= 3], minlength=k)
    return su2, idx, lab_sub, pu, ada, bermakna


def statistik_sel(P, D, W, i, j, d, dt_):
    n = len(P["t"])
    e = dt_ <= W
    k, lab = komponen(n, i[e], j[e])
    t, pik, npik = P["t"], P["pik"], P["npik"]
    jumlah = np.bincount(lab, minlength=k)
    tmin, tmax = agg(lab, k, t, np.minimum), agg(lab, k, t, np.maximum)
    dur = tmax - tmin
    px = n_unik(lab, k, pik, npik)
    nk = P["kab"].max() + 1
    uk = np.unique(lab.astype(np.int64) * nk + P["kab"])
    n_kab = np.bincount((uk // nk).astype(np.int64), minlength=k)
    npv = P["prov"].max() + 1
    up = np.unique(lab.astype(np.int64) * npv + P["prov"])
    n_prov = np.bincount((up // npv).astype(np.int64), minlength=k)
    _, _, _, _, ada, berm = sub_dalam_jendela(lab, k, t, i, j, dt_, W, pik, npik, "awal")
    # menyala lagi: pasangan dalam D, selisih waktu > W, beda kejadian, deteksi lebih awal mendahului awal kejadian yang lebih akhir
    x = (dt_ > W) & (lab[i] != lab[j])
    ii, jj = i[x], j[x]
    ok = t[ii] < tmin[lab[jj]]
    ii, jj = ii[ok], jj[ok]
    mg = np.full(k, np.inf)
    np.minimum.at(mg, lab[jj], t[jj] - t[ii])
    menyala = np.isfinite(mg)
    gaps = mg[menyala]
    st = {
        "D_km": D, "W_jam": W, "kejadian": int(k), "titik": int(n),
        "titik_per_kejadian_median": float(np.median(jumlah)), "titik_per_kejadian_p90": float(np.percentile(jumlah, 90)),
        "piksel_unik_median": float(np.median(px)), "piksel_unik_p90": float(np.percentile(px, 90)), "piksel_unik_maks": int(px.max()),
        "durasi_lebih_7hari": int((dur > 168).sum()),
        "durasi_lebih_7hari_tanpa_sentuh_tepi": int(((dur > 168) & (tmin > P["t0"] + 24) & (tmax < P["t1"] - 24)).sum()),
        "lintas_kabupaten": int((n_kab > 1).sum()), "lintas_provinsi": int((n_prov > 1).sum()),
        "penggabungan_ada_ge2_kelompok_24j_pertama": int((ada >= 2).sum()),
        "penggabungan_bermakna_ge2_kelompok_ge3px": int((berm >= 2).sum()),
        "menyala_lagi_kejadian": int(menyala.sum()),
        "menyala_lagi_jeda_ge_120j": int((gaps >= 120).sum()),
        "menyala_lagi_jeda_median_jam": float(np.median(gaps)) if len(gaps) else None,
        "kejadian_ge_50ha_proksi": int((px * HA_PX >= 50).sum()), "kejadian_ge_100ha_proksi": int((px * HA_PX >= 100).sum()),
        "kejadian_titik_tunggal": int((jumlah == 1).sum()),
    }
    return st, dict(k=k, lab=lab, tmin=tmin, tmax=tmax, px=px, n=jumlah, n_kab=n_kab, n_prov=n_prov, ada=ada, berm=berm)


def sistem_kita(P, i, j, d, dt_jam=48, eps=1.5):
    """Aturan harian.py: ST-DBSCAN minPts=1 => komponen terhubung dengan e_ij = min(1,5, max(0,6, 1,5 x max(px_i, px_j))), selisih <= 48 jam."""
    px = P["px"]
    e = np.minimum(eps, np.maximum(0.6, 1.5 * np.maximum(px[i], px[j])))
    k = (d <= e) & ((P["t"][j] - P["t"][i]) <= dt_jam)
    return komponen(len(P["t"]), i[k], j[k])


def muat_P(Z, yakin_min=1):
    m = Z["yakin"] >= yakin_min
    lat, lon = Z["lat"][m], Z["lon"][m]
    a = np.round(lat / TU.SEL).astype(np.int64) + 5000
    b = np.round(lon * np.cos(np.radians(lat)) / TU.SEL).astype(np.int64) + 1000
    uk, pik = np.unique(a * 100000 + b, return_inverse=True)
    names = Z["kab_nama"]
    provs = np.array([int(str(x).split("|")[0]) for x in names])
    kab = Z["kab"][m]
    return dict(lat=lat, lon=lon, t=Z["t"][m], px=Z["px"][m], sensor=Z["sensor"][m], pik=pik, npik=len(uk),
                kab=kab, prov=provs[kab], kab_nama=names, t0=Z["t"][m].min(), t1=Z["t"][m].max())


def nama_kab(P, idx):
    s = str(P["kab_nama"][idx]).split("|")
    return f"{s[1]} ({PROVINSI.get(s[0], s[0])})"


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    Z = SD.siap(cache)
    out = {"catatan": "Proksi, bukan luas terbakar. Titik panas bukan api; lihat riset/SIM-KARHUTLA.md untuk keterbatasan."}
    P = muat_P(Z, 1)
    n = len(P["t"])
    out["data"] = {
        "sumber": ["data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-22/firms-raw-15-22okt.tar.gz", "data/laporan-bnpb/penanganan-karhutla/2026-10/2026-10-25/firms-7hari-publik-25okt-0721.tar.gz",
                   "data/laporan-bnpb/generator/cache/raw/VIIRS_*_NRT-<tgl>.csv"],
        "rentang_utc": [(EPOCH + dt.timedelta(hours=float(Z["t"].min()))).isoformat(), (EPOCH + dt.timedelta(hours=float(Z["t"].max()))).isoformat()],
        "titik_viirs_sebelum_filter_daratan_dan_buang_kembar": int(Z["n_mentah"][0]),
        "titik_di_daratan_indonesia_semua_keyakinan": int(len(Z["t"])),
        "titik_keyakinan_rendah_l": int((Z["yakin"] == 0).sum()), "titik_nominal_n": int((Z["yakin"] == 1).sum()), "titik_tinggi_h": int((Z["yakin"] == 2).sum()),
        "titik_dipakai_nominal_tinggi": int(n), "piksel_375m_unik_dipakai": int(P["npik"]),
        "per_sensor_dipakai": {"S-NPP": int((P["sensor"] == 0).sum()), "NOAA-20": int((P["sensor"] == 1).sum()), "NOAA-21": int((P["sensor"] == 2).sum())},
        "titik_per_hari_utc": {(EPOCH + dt.timedelta(days=int(dd))).strftime("%d-%m"): int(c) for dd, c in sorted(collections.Counter((P["t"] // 24).astype(int)).items())},
        "catatan_sensor": "S-NPP berhenti didistribusikan FIRMS 1 Nov 2026 13.00 UTC (scripts/data/firms_sumber.py): sesudahnya hanya NOAA-20 dan NOAA-21.",
        "catatan_hari_parsial": "22 Okt 2026 di S1 parsial (diambil siang), dilengkapi S2; 12 Nov 2026 belum ada.",
    }

    # ---------- grid 9 sel
    sel_out, simpan, ref = [], {}, None
    for D in GRID_D:
        i, j, d = pasangan(P["lat"], P["lon"], D)
        dt_ = P["t"][j] - P["t"][i]
        print("D", D, "pasangan", len(i), file=sys.stderr)
        for W in GRID_W:
            st, ex = statistik_sel(P, D, W, i, j, d, dt_)
            sel_out.append(st)
            simpan[(D, W)] = ex
            print(D, W, st["kejadian"], file=sys.stderr)
            if (D, W) == (1.0, 24):
                ref = (i, j, d, dt_)
    out["grid_9_sel"] = sel_out

    # ---------- sel acuan D=1, W=24
    i, j, d, dt_ = ref
    ex = simpan[(1.0, 24)]
    lab, k = ex["lab"], ex["k"]
    ha = ex["px"] * HA_PX
    tot = ha.sum()
    thr = {}
    for a in (1, 10, 50, 100):
        m = ha >= a
        thr[str(a)] = {"kejadian_lolos": int(m.sum()), "persen_kejadian": round(100 * float(m.mean()), 2), "proksi_ha_tercakup": round(float(ha[m].sum()), 1),
                       "persen_proksi_luas_tercakup": round(100 * float(ha[m].sum()) / tot, 2)}
    out["ambang_luas_sel_acuan_D1_W24"] = {
        "metode": "luas proksi kejadian = jumlah piksel 375 m unik (kisi titik_unik.SEL, seluruh umur kejadian) x 14,0625 ha. Satu piksel saja sudah 14,06 ha, sehingga ambang 1 ha dan 10 ha tidak menyaring apa pun; ambang efektif pertama = 2 piksel (28,1 ha), 50 ha = 4 piksel (56,25 ha), 100 ha = 8 piksel (112,5 ha).",
        "total_kejadian": int(k), "total_proksi_ha": round(float(tot), 1), "ambang": thr,
        "distribusi_piksel_unik": {str(q): float(np.percentile(ex["px"], q)) for q in (50, 75, 90, 95, 99, 99.9)},
        "kejadian_1_piksel": int((ex["px"] == 1).sum()), "kejadian_2_3_piksel": int(((ex["px"] >= 2) & (ex["px"] <= 3)).sum()),
        "kejadian_terbesar_piksel": [int(v) for v in np.sort(ex["px"])[-5:][::-1]],
        "persen_proksi_dari_10_kejadian_terbesar": round(100 * float(np.sort(ha)[-10:].sum()) / tot, 2),
        "persen_proksi_dari_1persen_kejadian_terbesar": round(100 * float(np.sort(ha)[-max(1, k // 100):].sum()) / tot, 2),
    }
    P0 = muat_P(Z, 0)
    i0, j0, d0 = pasangan(P0["lat"], P0["lon"], 1.0)
    st0, _ = statistik_sel(P0, 1.0, 24, i0, j0, d0, P0["t"][j0] - P0["t"][i0])
    out["sensitivitas_keyakinan_rendah_ikut_D1_W24"] = {"titik": int(len(P0["t"])), "kejadian": st0["kejadian"], "kejadian_ge_50ha_proksi": st0["kejadian_ge_50ha_proksi"],
                                                        "kejadian_ge_100ha_proksi": st0["kejadian_ge_100ha_proksi"], "piksel_unik_median": st0["piksel_unik_median"], "lintas_kabupaten": st0["lintas_kabupaten"]}

    # ---------- urutan ambang vs gabung (sorites), D=1 W=24
    wib_hari = np.floor((P["t"] + 7) / 24).astype(np.int64)
    sd = wib_hari[i] == wib_hari[j]
    kh, labh = komponen(n, i[sd], j[sd])   # kelompok harian: <= 1 km, hari kalender WIB sama
    px_h = n_unik(labh, kh, P["pik"], P["npik"])
    urut = {}
    for a in (1, 10, 28.125, 50, 100):
        keep_g = px_h * HA_PX >= a
        keep_pts = keep_g[labh]
        e = (dt_ <= 24) & keep_pts[i] & keep_pts[j]
        kk, lb = komponen(n, i[e], j[e])
        n_a = len(np.unique(lb[keep_pts]))
        luas_a = n_unik(lb[keep_pts], kk, P["pik"][keep_pts], P["npik"]).sum() * HA_PX if keep_pts.any() else 0
        mb = ha >= a
        n_b = int(mb.sum())
        urut[str(a)] = {"kelompok_harian_total": int(kh), "kelompok_harian_lolos": int(keep_g.sum()),
                        "a_ambang_dulu_baru_gabung": int(n_a), "b_gabung_dulu_baru_ambang": n_b, "selisih_a_minus_b": int(n_a - n_b),
                        "selisih_persen_dari_b": round(100 * (n_a - n_b) / n_b, 2) if n_b else None,
                        "proksi_ha_a": round(float(luas_a), 1), "proksi_ha_b": round(float(ha[mb].sum()), 1)}
    out["urutan_ambang_sel_acuan_D1_W24"] = {"definisi": "kelompok harian = deteksi dalam 1 km pada hari kalender WIB yang sama (single-linkage); (a) buang kelompok harian di bawah ambang lalu gabung antarhari (D=1 km, W=24 jam); (b) gabung dulu (kejadian) lalu buang kejadian di bawah ambang. Ambang 1 dan 10 ha tidak menyaring apa pun (1 piksel = 14,06 ha).", "hasil": urut}

    # ---------- aturan sistem kita (harian.py)
    i15, j15, d15 = pasangan(P["lat"], P["lon"], 1.5)
    ks, ls = sistem_kita(P, i15, j15, d15)
    jum_s = np.bincount(ls, minlength=ks)
    px_s = n_unik(ls, ks, P["pik"], P["npik"])
    akhir = P["t1"]
    m7 = P["t"] >= akhir - 168
    idx7 = np.where(m7)[0]
    remap = -np.ones(n, dtype=np.int64)
    remap[idx7] = np.arange(len(idx7))
    s7 = m7[i15] & m7[j15]
    P7 = dict(px=P["px"][m7], t=P["t"][m7])
    ks7, ls7 = sistem_kita(P7, remap[i15[s7]], remap[j15[s7]], d15[s7])
    tm7 = agg(ls7, ks7, P7["t"], np.maximum)
    out["aturan_sistem_kita"] = {
        "parameter_harian_py": {"EPS_KM": 1.5, "MIN_PTS": 1, "JENDELA_HARI": 7, "AKTIF_JAM": 72, "AKTIF_GAMBUT_JAM": 168, "jam_st": 48,
                                "eps_adaptif": "min(1,5, max(0,6, 1,5 x piksel terbesar pasangan)) km", "sensor_dan_keyakinan": "VIIRS, nominal dan tinggi",
                                "sumber": "scripts/data/harian.py baris 36, 283-326, 510-575"},
        "diterapkan_pada_arsip_15okt_11nov_tanpa_jendela_7hari": {"kluster": int(ks), "titik_tunggal": int((jum_s == 1).sum()), "piksel_median": float(np.median(px_s)),
                                                                    "kluster_ge_50ha_proksi": int((px_s * HA_PX >= 50).sum())},
        "diterapkan_jendela_7hari_berakhir_11nov": {"kluster": int(ks7), "aktif_deteksi_terakhir_dalam_72j": int((tm7 >= akhir - 72).sum()), "aktif_dalam_168j": int((tm7 >= akhir - 168).sum())},
        "sel_acuan_D1_W24_arsip_penuh_kejadian": int(k),
    }
    h = json.load(open(os.path.join(SD.AKAR, "public/data/hotspot.json")))
    kl = json.load(open(os.path.join(SD.AKAR, "public/data/kluster.json")))
    rows = [r for r in h["baris"] if r[3] != "M" and r[5] >= 1 and r[2] >= -168]
    rows.sort(key=lambda r: r[2])
    Hh = dict(lat=np.array([r[0] for r in rows]), lon=np.array([r[1] for r in rows]), t=np.array([r[2] for r in rows]), px=np.full(len(rows), 0.4))
    ih, jh, dh = pasangan(Hh["lat"], Hh["lon"], 1.5)
    kh_, lh_ = sistem_kita(Hh, ih, jh, dh)
    tmh = agg(lh_, kh_, Hh["t"], np.maximum)
    feats = [f["properties"] for f in kl["features"]]
    luas = np.array([f.get("luas") or 0 for f in feats])
    nn = np.array([f["n"] for f in feats])
    hr = np.array([f["hari"] for f in feats])
    out["validasi_hotspot_json_5_12okt"] = {
        "berkas": "public/data/hotspot.json (acuan 2026-10-12T12:27Z, 5-12 Okt 2026) dan public/data/kluster.json",
        "titik_viirs_nominal_tinggi_7hari": len(rows),
        "kluster_json_jumlah": len(feats), "kluster_json_titik_tunggal_n1": int((nn == 1).sum()), "kluster_json_n_ge_3": int((nn >= 3).sum()), "kluster_json_hari_aktif_ge_7": int((hr >= 7).sum()),
        "rekonstruksi_aturan_sistem_px_0_4_semua": int(kh_), "rekonstruksi_aktif_72j": int((tmh >= -72).sum()), "rekonstruksi_aktif_168j": int((tmh >= -168).sum()),
        "catatan": "hotspot.json tidak menyimpan scan/track, jadi px diisi 0,4 km (eps 0,6 km): rekonstruksi memberi batas atas jumlah kluster; filter level 0 titik tunggal dan cek gunung api tidak direplikasi.",
        "luas_kluster_json_ha": {"p50": float(np.percentile(luas, 50)), "p90": float(np.percentile(luas, 90)), "p99": float(np.percentile(luas, 99)), "total": round(float(luas.sum()), 1)},
        "kluster_json_lolos_ambang_ha": {str(a): {"kluster": int((luas >= a).sum()), "persen_total_luas": round(100 * float(luas[luas >= a].sum()) / float(luas.sum()), 2)} for a in (1, 10, 50, 100)},
    }

    # ---------- contoh nyata (sel acuan D=1, W=24)
    contoh = {}
    tmin, tmax = ex["tmin"], ex["tmax"]
    dur = tmax - tmin

    def pusat(idx):
        return round(float(P["lat"][idx].mean()), 2), round(float(P["lon"][idx].mean()), 2)

    def kabs_event(idx):
        return [(nama_kab(P, kb), int(v)) for kb, v in collections.Counter(P["kab"][idx]).most_common(4)]

    order_pts = np.argsort(lab, kind="stable")
    starts = np.searchsorted(lab[order_pts], np.arange(k + 1))

    def pts_of(e):
        return order_pts[starts[e]:starts[e + 1]]

    belum_tepi = tmin > P["t0"] + 24   # contoh dipilih dari kejadian yang awalnya terlihat (bukan terpotong awal arsip 15 Okt)

    def contoh_sub(mode, cond):
        su2, idxw, lab_sub, pu, ada, berm = sub_dalam_jendela(lab, k, P["t"], i, j, dt_, 24, P["pik"], P["npik"], mode)
        cand = np.where(cond(berm, dur) & belum_tepi)[0]
        cand = cand[np.argsort(-ex["px"][cand])][:300]
        res = []
        for e in cand:
            subs = np.where((lab_sub == e) & (pu >= 3))[0]
            cen = [pusat(idxw[su2 == s]) for s in subs]
            dm = max(float(hav(a[0], a[1], b[0], b[1])) for a in cen for b in cen)
            if dm >= 2:
                res.append({"mulai_wib": tgl(tmin[e]), "selesai_wib": tgl(tmax[e]), "titik": int(ex["n"][e]), "piksel_unik": int(ex["px"][e]),
                            "proksi_ha": round(float(ex["px"][e] * HA_PX), 1), "bagian": [{"pusat_lat_lon": c, "piksel": int(pu[s])} for s, c in zip(subs, cen)],
                            "jarak_antarbagian_km": round(dm, 1), "kabupaten": kabs_event(pts_of(e))})
            if len(res) >= 3:
                break
        return res, int((cond(berm, dur) & belum_tepi).sum())

    contoh["menyatu"], contoh["menyatu_jumlah_kandidat"] = contoh_sub("awal", lambda b, du: (b >= 2) & (du > 24))
    _, _, _, _, _, berm_awal = sub_dalam_jendela(lab, k, P["t"], i, j, dt_, 24, P["pik"], P["npik"], "awal")
    contoh["terpecah"], contoh["terpecah_jumlah_kandidat"] = contoh_sub("akhir", lambda b, du: (b >= 2) & (berm_awal <= 1) & (du >= 48))
    best = []
    for e in np.where((dur >= 72) & (ex["px"] >= 10) & belum_tepi)[0]:
        idx = pts_of(e)
        t_ = P["t"][idx]
        ca, cb = pusat(idx[t_ <= tmin[e] + 24]), pusat(idx[t_ >= tmax[e] - 24])
        best.append((float(hav(ca[0], ca[1], cb[0], cb[1])), e, ca, cb))
    best.sort(reverse=True)
    contoh["berpindah"] = [{"jarak_pusat_awal_ke_akhir_km": round(v, 1), "mulai_wib": tgl(tmin[e]), "selesai_wib": tgl(tmax[e]), "pusat_awal": ca, "pusat_akhir": cb,
                            "piksel_unik": int(ex["px"][e]), "kabupaten": kabs_event(pts_of(e))} for v, e, ca, cb in best[:3]]
    contoh["berpindah_median_km_kejadian_ge72j_ge10px"] = round(float(np.median([b[0] for b in best])), 2) if best else None
    contoh["berpindah_jumlah_kejadian_dinilai"] = len(best)
    # menyala lagi: D=1, W=72, jeda >= 120 jam
    ex72 = simpan[(1.0, 72)]
    i1, j1, d1 = pasangan(P["lat"], P["lon"], 1.0)
    dt1 = P["t"][j1] - P["t"][i1]
    x = (dt1 > 72) & (ex72["lab"][i1] != ex72["lab"][j1])
    ii, jj = i1[x], j1[x]
    ok = P["t"][ii] < ex72["tmin"][ex72["lab"][jj]]
    ii, jj = ii[ok], jj[ok]
    gap = P["t"][jj] - P["t"][ii]
    pl = gap >= 120
    pairs = collections.defaultdict(list)
    for a, b, g in zip(ii[pl], jj[pl], gap[pl]):
        pairs[int(ex72["lab"][b])].append((float(g), int(a), int(b)))
    ranking = sorted(pairs, key=lambda e: -ex72["px"][e])[:3]
    contoh["menyala_lagi_D1_W72_jeda_ge_5hari"] = [
        {"lokasi_lat_lon": (round(float(P["lat"][min(pairs[e])[2]]), 2), round(float(P["lon"][min(pairs[e])[2]]), 2)), "kabupaten": nama_kab(P, P["kab"][min(pairs[e])[2]]),
         "deteksi_sebelumnya_wib": tgl(P["t"][min(pairs[e])[1]]), "menyala_lagi_wib": tgl(P["t"][min(pairs[e])[2]]), "jeda_jam": round(min(pairs[e])[0], 1),
         "piksel_unik_kejadian_kedua": int(ex72["px"][e])} for e in ranking]
    contoh["menyala_lagi_D1_W72_jumlah_kejadian_jeda_ge_5hari"] = len(pairs)
    lk = np.where(ex["n_kab"] > 1)[0]
    lk = lk[np.argsort(-ex["px"][lk])][:3]
    contoh["lintas_kabupaten"] = [{"mulai_wib": tgl(tmin[e]), "selesai_wib": tgl(tmax[e]), "piksel_unik": int(ex["px"][e]), "kabupaten": kabs_event(pts_of(e)),
                                   "lintas_provinsi": bool(ex["n_prov"][e] > 1)} for e in lk]
    contoh["lintas_kabupaten_kecil_le20px"] = int(((ex["n_kab"] > 1) & (ex["px"] <= 20)).sum())
    out["contoh_nyata_sel_acuan_D1_W24"] = contoh
    out["ringkasan_sel_acuan_D1_W24"] = {
        "kejadian_lintas_kabupaten_persen": round(100 * float((ex["n_kab"] > 1).mean()), 2),
        "kejadian_lintas_kab_dan_ge50ha": int(((ex["n_kab"] > 1) & (ha >= 50)).sum()),
        "persen_titik_dalam_kejadian_ge_100_piksel": round(100 * float(ex["n"][ex["px"] >= 100].sum()) / n, 2),
    }
    p = os.path.join(AQ, "hasil/sim_karhutla.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
    print("tulis", p)


if __name__ == "__main__":
    main()
