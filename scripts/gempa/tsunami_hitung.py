"""TS-10: pembungkus mesin tsunami (GeoClaw 5.14.0) dengan satu antarmuka masukan dan satu keluaran.

BUKAN peringatan, BUKAN prakiraan. Mesin hanya menghitung; status resmi tsunami tetap BMKG/PTWC.

Masukan  : satu spesifikasi (dict, lihat SPEK di bawah) + nama folder kerja data/raw/tsunami/run/<nama>.
Keluaran : satu dict (juga ditulis ke keluaran.json di folder kerja): versi mesin, hash masukan,
           waktu dan memori nyata, fgmax (tinggi maks, kedalaman maks, waktu tiba, elevasi dasar per sel),
           ringkasan (d_maks_darat, runup = elevasi air tertinggi di sel darat yang pernah basah, tiba_pertama), gauges.
Mesin dapat diganti tanpa mengubah bentuk keluaran. Fungsi hitung() butuh numpy lewat venv; modul ini sendiri
HANYA stdlib saat diimpor (skrip lain di repo tidak jadi bergantung numpy). GeoClaw dijalankan sebagai
subproses dengan python venv; `uji` meluncurkan ulang dirinya dengan python venv.

SPEK (semua satuan SI; koordinat 1 = kartesian meter, 2 = lintang-bujur):
  koordinat, kotak [x1,x2,y1,y2], sel [nx,ny] (grid kasar), tfinal (detik),
  topo [[jenis, berkas],..], dtopo [[jenis, berkas],..] (dari tsunami_sumber.py), qinit_eta [berkas,..],
  qinit_f90 (teks Fortran qinit kustom, opsional) dan qinit_data (teks berkas data untuknya),
  amr {tingkat, rasio [..], gelombang_tol}, manning (0 = tanpa gesekan), muka_laut, dry_tol,
  regioes [[minlevel,maxlevel,t1,t2,x1,x2,y1,y2],..],
  fgmax {x1,x2,y1,y2,dx, tstart, dt_check, min_level}, gauges [[id,x,y,t1,t2],..].

Pakai:  python3 -I scripts/gempa/tsunami_hitung.py uji        (verifikasi: air tenang, massa, BP01 analitik; ~15 menit)
        python3 -I scripts/gempa/tsunami_hitung.py uji lab    (+ BP04 laboratorium, run-up lawan data lab; ~30 menit)
Hasil BP04 24 Nov 2026 di luar toleransi (tak pecah 12% lawan 5%, pecah 54% lawan 10%): lihat RISET.md 4.2; tidak digugurkan dari mode `lab`.
"""
import hashlib, json, math, os, resource, shutil, subprocess, sys, time

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
RAW = os.path.join(AKAR, "data/raw/tsunami")
CLAW = os.path.join(RAW, "clawpack-src")
VENV = os.path.join(RAW, "venv")
RUN = os.path.join(RAW, "run")
NTHMP = os.path.join(RAW, "nthmp")  # git clone --depth 1 https://github.com/rjleveque/nthmp-benchmark-problems
VERSI_MESIN = "geoclaw-5.14.0"
SKEMA = 1

# Toleransi dari NOAA Tech Memo OAR PMEL-135 (Synolakis dkk. 2007), https://nctr.pmel.noaa.gov/benchmark/SP_3053.pdf,
# diverifikasi pemeriksa validasi-model 24 Nov 2026 (sebelumnya ditulis dari ingatan, TOL_LAB 10% untuk tak pecah ternyata salah).
TOL_ANALITIK = 0.05        # bagian 2.2: run-up maks dalam 5% dari solusi analitik
TOL_LAB_TAKPECAH = 0.05    # bagian 2.3: gelombang tak pecah, dalam 5% dari terukur
TOL_LAB_PECAH = 0.10       # Appendix A3.1: gelombang pecah, dalam 10% dari terukur (plus konsisten memprediksi variasi run-up)
# Massa, bagian 2.1: volume awal dalam 5% dari volume akhir (gelombang sudah terpantul ke lepas pantai). Riwayat jujur:
# ambang internal 1e-6 dari total air gagal (3,3e-5), lalu diganti 1e-3 dari volume gelombang SESUDAH hasil terlihat;
# keduanya ambang kita sendiri, kini diganti kriteria NOAA. Nilai terukur 3,3e-4 dilaporkan apa adanya.
# Batas uji ini: tanpa AMR dan berhenti di 60 tau tanpa memeriksa pantulan penuh (lihat RISET 4.2).
TOL_MASSA = 0.05
# K10: galat BP04 tak pecah tanpa gesekan tercatat 12,2% (2D, 24-25 Nov 2026); gerbang menjaga agar tidak memburuk.
BATAS_K10 = 0.13

MAKEFILE = """CLAWMAKE = $(CLAW)/clawutil/src/Makefile.common
CLAW_PKG = geoclaw
EXE = xgeoclaw
SETRUN_FILE = setrun.py
OUTDIR = _output
GEOLIB = $(CLAW)/geoclaw/src/2d/shallow
include $(GEOLIB)/Makefile.geoclaw
EXCLUDE_MODULES =
EXCLUDE_SOURCES =
MODULES =
SOURCES = %s \\
  $(CLAW)/riemann/src/rpn2_geoclaw.f \\
  $(CLAW)/riemann/src/rpt2_geoclaw.f \\
  $(CLAW)/riemann/src/geoclaw_riemann_utils.f
include $(CLAWMAKE)
"""

SETRUN = '''import json, os
def setrun(claw_pkg="geoclaw"):
    from clawpack.clawutil import data
    from clawpack.geoclaw import fgmax_tools
    S = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "spec.json")))
    rd = data.ClawRunData("geoclaw", 2)
    c = rd.clawdata
    c.num_dim = 2
    c.lower[:] = [S["kotak"][0], S["kotak"][2]]
    c.upper[:] = [S["kotak"][1], S["kotak"][3]]
    c.num_cells[:] = S["sel"]
    c.num_eqn = 3; c.num_aux = 1; c.capa_index = 0
    c.t0 = 0.0; c.output_style = 1; c.num_output_times = 1; c.tfinal = S["tfinal"]; c.output_t0 = True
    c.output_format = "ascii"; c.output_q_components = "all"; c.output_aux_components = "none"
    c.output_aux_onlyonce = True; c.verbosity = 0
    c.dt_variable = True; c.dt_initial = 1e-3; c.dt_max = 1e99
    c.cfl_desired = S.get("cfl", 0.75); c.cfl_max = 1.0; c.steps_max = 500000
    c.order = 2; c.dimensional_split = "unsplit"; c.transverse_waves = 2; c.num_waves = 3
    c.limiter = ["mc", "mc", "mc"]; c.use_fwaves = True; c.source_split = "godunov"; c.num_ghost = 2
    c.bc_lower[:] = ["extrap", "extrap"]; c.bc_upper[:] = ["extrap", "extrap"]; c.checkpt_style = 0
    a = rd.amrdata; A = S["amr"]
    a.amr_levels_max = A["tingkat"]
    r = A.get("rasio") or [2]  # GeoClaw menolak daftar kosong walau tingkat 1
    a.refinement_ratios_x = r; a.refinement_ratios_y = r; a.refinement_ratios_t = r
    a.aux_type = ["center"] * max(1, A["tingkat"] - 1)
    a.flag_richardson = False; a.flag2refine = True; a.regrid_interval = 3; a.regrid_buffer_width = 2
    a.clustering_cutoff = 0.7
    for reg in S.get("regioes", []):
        rd.regiondata.regions.append(reg)
    for g in S.get("gauges", []):
        rd.gaugedata.gauges.append(g)
    g = rd.geo_data
    g.gravity = 9.81; g.coordinate_system = S["koordinat"]; g.earth_radius = 6367.5e3
    g.coriolis_forcing = False; g.sea_level = S["muka_laut"]; g.dry_tolerance = S["dry_tol"]
    g.friction_forcing = S["manning"] > 0; g.manning_coefficient = S["manning"]; g.friction_depth = 1e6
    rd.refinement_data.wave_tolerance = A["gelombang_tol"]
    rd.refinement_data.variable_dt_refinement_ratios = True
    rd.topo_data.topofiles.extend(S["topo"])
    rd.dtopo_data.dtopofiles.extend(S.get("dtopo", []))
    if S.get("qinit_eta"):
        rd.qinit_data.qinit_type = 1
        rd.qinit_data.qinitfiles = [[f] for f in S["qinit_eta"]]
    else:
        rd.qinit_data.qinit_type = 0
    F = S.get("fgmax")
    if F:
        rd.fgmax_data.num_fgmax_val = 1
        fg = fgmax_tools.FGmaxGrid()
        fg.point_style = 2
        fg.x1, fg.x2, fg.y1, fg.y2, fg.dx = F["x1"], F["x2"], F["y1"], F["y2"], F["dx"]
        fg.tstart_max = F.get("tstart", 0.0); fg.tend_max = 1e10; fg.dt_check = F.get("dt_check", 1.0)
        fg.min_level_check = F["min_level"]; fg.arrival_tol = F.get("arrival_tol", 1e-2); fg.interp_method = 0
        rd.fgmax_data.fgmax_grids.append(fg)
    return rd
if __name__ == "__main__":
    setrun().write()
'''


def _env():
    e = dict(os.environ)
    e.update(CLAW=CLAW, FC="gfortran", PYTHONPATH=CLAW, CLAW_PYTHON=os.path.join(VENV, "bin/python"),
             PATH=os.path.join(VENV, "bin") + os.pathsep + e.get("PATH", ""))
    return e


def _sh(cmd, cwd, log):
    with open(log, "w") as f:
        r = subprocess.run(cmd, cwd=cwd, env=_env(), stdout=f, stderr=subprocess.STDOUT)
    if r.returncode:
        raise RuntimeError("gagal: %s (lihat %s)" % (" ".join(cmd), log))


def _exe(f90):
    """Bangun xgeoclaw sekali per isi qinit kustom (cache); kembalikan jalurnya."""
    h = hashlib.sha256((f90 or "").encode()).hexdigest()[:12]
    d = os.path.join(RUN, "_exe_" + h)
    if not os.path.exists(os.path.join(d, "xgeoclaw")):
        os.makedirs(d, exist_ok=True)
        if f90:
            open(os.path.join(d, "qinit.f90"), "w").write(f90)
        open(os.path.join(d, "Makefile"), "w").write(MAKEFILE % ("./qinit.f90 \\" if f90 else "\\"))
        open(os.path.join(d, "setrun.py"), "w").write(SETRUN)
        _sh(["make", "-j4", ".exe"], d, os.path.join(d, "build.log"))
    return os.path.join(d, "xgeoclaw"), d


def hash_masukan(spec):
    return hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()


def hitung(spec, nama):
    """Jalankan satu spesifikasi; kembalikan dict keluaran tunggal. Butuh python venv (numpy, clawpack)."""
    exe, dexe = _exe(spec.get("qinit_f90"))
    d = os.path.join(RUN, nama)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    shutil.copy(os.path.join(dexe, "Makefile"), d)
    open(os.path.join(d, "setrun.py"), "w").write(SETRUN)
    shutil.copy(exe, d)
    if spec.get("qinit_f90"):
        open(os.path.join(d, "soliter.data"), "w").write(spec.get("qinit_data", ""))
    json.dump(spec, open(os.path.join(d, "spec.json"), "w"), indent=1)
    t0 = time.time()
    r0 = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
    _sh(["make", "data"], d, os.path.join(d, "data.log"))
    _sh(["make", "output"], d, os.path.join(d, "run.log"))
    detik = time.time() - t0
    if "Missing" in open(os.path.join(d, "run.log")).read():
        raise RuntimeError("masukan hilang, lihat %s/run.log" % d)
    # ru_maxrss anak = maks sepanjang proses; macOS satuan byte, Linux KiB
    mb = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / (1024 * 1024 if sys.platform == "darwin" else 1024)
    out = _baca(spec, d)
    out.update(skema=SKEMA, mesin=VERSI_MESIN, hash_masukan=hash_masukan(spec), nama=nama,
               waktu_detik=round(detik, 2), memori_mb_puncak=round(mb, 1))
    json.dump(out, open(os.path.join(d, "keluaran.json"), "w"))
    return out


def _baca(spec, d):
    sys.path.insert(0, CLAW)
    from clawpack.geoclaw import fgmax_tools
    out = {"fgmax": None, "ringkasan": None, "gauges": []}
    F = spec.get("fgmax")
    if F:
        fg = fgmax_tools.FGmaxGrid()
        fg.read_fgmax_grids_data(1, os.path.join(d, "_output", "fgmax_grids.data"))
        fg.read_output(outdir=os.path.join(d, "_output"), verbose=False)
        import numpy as np
        h, B, X, Y, tiba = [np.ma.filled(np.ma.asarray(v, dtype=float), np.nan).ravel()
                            for v in (fg.h, fg.B, fg.X, fg.Y, fg.arrival_time)]  # sel tak pernah basah = masked
        basah = [i for i in range(len(h)) if h[i] > spec["dry_tol"] and not (h[i] != h[i])]
        darat = [i for i in basah if B[i] > spec["muka_laut"]]
        ru = max(darat, key=lambda i: (B[i], h[i])) if darat else None  # ujung genangan: sel darat basah tertinggi (definisi lab)
        em = max(darat, key=lambda i: B[i] + h[i]) if darat else None  # elevasi muka air maks di darat (definisi lama sampai 25 Nov 2026)
        tb = [float(tiba[i]) for i in basah if tiba[i] == tiba[i] and tiba[i] > 0]
        out["fgmax"] = {"x": [float(v) for v in X], "y": [float(v) for v in Y], "B": [float(v) for v in B],
                        "h_maks": [float(v) if v == v else None for v in h],
                        "tiba_s": [float(v) if v == v and v > 0 else None for v in tiba]}
        out["ringkasan"] = {"d_maks_darat": float(max(h[i] for i in darat)) if darat else None,  # kedalaman genangan, bukan kedalaman laut
                            "runup": float(B[ru] + h[ru]) if ru is not None else None,  # elevasi ujung genangan (B + h di sel terjauh)
                            "elevasi_air_maks": float(B[em] + h[em]) if em is not None else None,  # puncak muka air di darat, BUKAN run-up
                            "runup_x": float(X[ru]) if ru is not None else None,
                            "tiba_pertama_s": min(tb) if tb else None,
                            "sel_darat_basah": len(darat), "sel_darat_total": sum(1 for b in B if b > spec["muka_laut"])}
    for g in spec.get("gauges", []):
        p = os.path.join(d, "_output", "gauge%05d.txt" % g[0])
        if os.path.exists(p):
            seri = []
            for ln in open(p):
                if ln.startswith("#") or not ln.strip():
                    continue
                v = ln.split()  # level, t, h, hu, hv, eta
                seri.append([float(v[1]), float(v[5])])
            out["gauges"].append({"id": g[0], "x": g[1], "y": g[2], "t_eta": seri})
    return out


def massa(nama, bingkai=1):
    """Jumlah h*dx*dy dari satu bingkai (hanya untuk run tanpa AMR). Python venv."""
    sys.path.insert(0, CLAW)
    from clawpack.pyclaw import Solution
    s = Solution(bingkai, path=os.path.join(RUN, nama, "_output"), file_format="ascii", read_aux=False)
    p = s.state.patch
    return float(s.state.q[0].sum() * p.delta[0] * p.delta[1])


# ---------------------------------------------------------------- tolok ukur
QINIT_SOLITER = """subroutine qinit(meqn,mbc,mx,my,xlower,ylower,dx,dy,q,maux,aux)
    ! gelombang soliter NTHMP BP01/BP04: eta = H sech^2(gam (x-X1)/d), menuju pantai.
    ! eksak=0: u = -sqrt(g/d) eta (deskripsi NTHMP, linier); eksak=1: u = -c eta/(d+eta), c = sqrt(g(d+H)) (soliter SWE nirlinier)
    use geoclaw_module, only: grav
    implicit none
    integer, intent(in) :: meqn,mbc,mx,my,maux
    real(kind=8), intent(in) :: xlower,ylower,dx,dy
    real(kind=8), intent(inout) :: q(meqn,1-mbc:mx+mbc,1-mbc:my+mbc)
    real(kind=8), intent(inout) :: aux(maux,1-mbc:mx+mbc,1-mbc:my+mbc)
    real(kind=8) :: H, dd, X1, gam, x, eta, eksak, cc, uu
    integer :: i, j
    open(unit=77, file='soliter.data', status='old')
    read(77,*) H, dd, X1, gam, eksak
    close(77)
    cc = sqrt(grav*(dd+H))
    do i=1-mbc,mx+mbc
        x = xlower + (i - 0.5d0)*dx
        eta = 0.d0
        if (abs(gam*(x-X1)/dd) < 30.d0) eta = H / cosh(gam*(x-X1)/dd)**2
        do j=1-mbc,my+mbc
            if (aux(1,i,j) < 0.d0) then
                q(1,i,j) = max(0.d0, eta - aux(1,i,j))
                uu = -sqrt(grav/dd) * eta
                if (eksak > 0.5d0) uu = -cc * eta / (dd + eta)
                q(2,i,j) = uu * q(1,i,j)
            else
                q(1,i,j) = 0.d0
                q(2,i,j) = 0.d0
            endif
            q(3,i,j) = 0.d0
        enddo
    enddo
end subroutine qinit
"""

COT = 19.85  # pantai 1:19,85 (NTHMP BP01/BP04)


def spek_lereng(H_d, d=1.0, tau_akhir=60.0, tingkat=2, soliter=True, kasar=10, eksak=False, dry_d=1e-3, manning=0.0, fino_penuh=False, cfl=0.75):
    """Spesifikasi pantai miring cot=19,85: kedalaman datar d, soliter H/d (None = air tenang). Bernilai skala d
    (tanpa gesekan; dengan manning > 0 hasil bergantung d, pakai d lab). eksak: kondisi awal soliter nirlinier; dry_d: ambang basah dalam d;
    fino_penuh: tingkat halus di seluruh domain (bawaan hanya -14d..pantai, jadi pecahnya gelombang di grid kasar)."""
    g = 9.81
    tau = math.sqrt(d / g)
    X0 = d * COT
    gam = math.sqrt(3 * H_d / 4) if H_d else 0.5
    L = d * math.acosh(math.sqrt(20)) / gam
    X1 = X0 + L
    xl = -20 * d
    xr = X1 + 2 * L + 5 * d
    dxk = d / kasar
    nx = int(round((xr - xl) / dxk))
    xr = xl + nx * dxk
    rasio = [4, 2][:tingkat - 1]
    dxf = dxk / math.prod(rasio) if rasio else dxk
    ny = 4  # GeoClaw menolak < 4 sel di tingkat dasar
    spec = {"koordinat": 1, "kotak": [xl, xr, 0.0, ny * dxk], "sel": [nx, ny], "tfinal": tau_akhir * tau,
            "topo": [[2, "lereng.topotype2"]], "dtopo": [], "qinit_eta": [],
            "amr": {"tingkat": tingkat, "rasio": rasio, "gelombang_tol": (H_d or 0.02) * d / 10},
            "manning": manning, "muka_laut": 0.0, "dry_tol": dry_d * d, "tanpa_dispersi": True, "cfl": cfl,
            "regioes": [[tingkat, tingkat, 0.0, 1e10, xl if fino_penuh else -14 * d, xr if fino_penuh else X0, 0.0, ny * dxk]] if tingkat > 1 else [],
            "fgmax": {"x1": xl + dxf / 2, "x2": X0 + 0.0, "y1": dxk * 1.5 + 0.0, "y2": dxk * 1.5, "dx": dxf,
                      "tstart": 0.0, "dt_check": tau / 4, "min_level": tingkat},
            "gauges": [[1, 0.25 * d, dxk * 1.5, 0.0, 1e10], [2, 9.95 * d, dxk * 1.5, 0.0, 1e10]],
            "tau": tau, "d": d, "H_d": H_d}
    # sel fgmax harus tepat pusat sel terhalus: x1 = xl+dxf/2 + k*dxf, y1 = pusat sel baris kedua terhalus
    spec["fgmax"]["x2"] = xl + dxf / 2 + math.floor((X0 - xl - dxf / 2) / dxf) * dxf
    # dua baris sel terhalus: GeoClaw 5.14 mengisi fgmax NaN bila hanya satu baris (ny=1), dicoba 24 Nov 2026
    spec["fgmax"]["y1"] = dxf * (math.floor(1.5 * dxk / dxf)) + dxf / 2
    spec["fgmax"]["y2"] = spec["fgmax"]["y1"] + dxf
    if soliter and H_d:
        spec["qinit_f90"] = QINIT_SOLITER
        spec["qinit_data"] = "%.15g %.15g %.15g %.15g %d\n" % (H_d * d, d, X1, gam, 1 if eksak else 0)
    return spec


def tulis_topo_lereng(d, spek, berkas):
    """Berkas topotype 2 untuk z = max(-d, -x/cot) (x menjauh dari pantai, pantai di x=0)."""
    sys.path.insert(0, CLAW)
    import numpy as np
    from clawpack.geoclaw.topotools import Topography
    xl, xr, yl, yu = spek["kotak"]
    dxk = (xr - xl) / spek["sel"][0]
    tp = Topography(topo_func=lambda x, y: np.maximum(-d, -x / COT) + 0 * y)
    dt = dxk / 4  # topotype 2 butuh dx == dy
    tp.x = xl - 2 * dxk + dt * np.arange(int(round((xr - xl + 4 * dxk) / dt)) + 1)
    tp.y = yl - 2 * dxk + dt * np.arange(int(round((yu - yl + 4 * dxk) / dt)) + 1)
    tp.write(berkas, topo_type=2, Z_format="%22.15e")


def jalankan_lereng(nama, H_d, **kw):
    spec = spek_lereng(H_d, **kw)
    d0 = os.path.join(RUN, "_topo")
    os.makedirs(d0, exist_ok=True)
    topo = os.path.join(d0, "lereng_%s.topotype2" % nama)
    tulis_topo_lereng(spec["d"], spec, topo)
    spec["topo"] = [[2, topo]]
    return spec, hitung(spec, nama)


def runup_ambang(out, ambang):
    """Run-up = elevasi ujung genangan (B + h di sel darat basah tertinggi) bila basah berarti h_maks > ambang (m)."""
    f = out["fgmax"]
    v = [(b, b + h) for b, h in zip(f["B"], f["h_maks"]) if h is not None and h > ambang and b > 0]
    return max(v)[1] if v else None  # ujung genangan: B tertinggi, lalu B + h di sana


def hukum_synolakis(H_d):
    """Synolakis 1987: R/d = 2,831 sqrt(cot beta) (H/d)^(5/4), gelombang soliter tak pecah (H/d < 0,045 di pantai ini)."""
    return 2.831 * math.sqrt(COT) * H_d ** 1.25


def profil_analitik_maks():
    """Elevasi tertinggi sel basah pada berkas analitik NTHMP BP01 (H/d=0,019), tau=sqrt(d/g)."""
    p = os.path.join(NTHMP, "BP01-DmitryN-Single_wave_on_simple_beach", "canonical_profiles.txt")
    best = 0.0
    for ln in open(p).read().splitlines()[5:]:
        v = ln.split()
        for s in v[1:]:
            if s != "NaN":
                best = max(best, float(s))
    return best


def runup_lab(H_d, lebar):
    p = os.path.join(NTHMP, "BP04-JosephZ-Single_wave_on_simple_beach", "Lab_runup.txt")
    r = [float(l.split()[1]) for l in open(p) if l.strip() and not l.startswith("#") and abs(float(l.split()[0]) - H_d) <= lebar]
    return (sum(r) / len(r), len(r)) if r else (None, 0)


def rms_ts(spec, hasil):
    """Galat RMS ternormalisasi (terhadap H) gauge x/d=9,95 lawan deret waktu analitik BP01; hanya dilaporkan."""
    p = os.path.join(NTHMP, "BP01-DmitryN-Single_wave_on_simple_beach", "canonical_ts.txt")
    ref = []
    for ln in open(p).read().splitlines():
        v = ln.split()
        try:
            if len(v) >= 4 and v[3] != "NaN":
                ref.append((float(v[2]), float(v[3])))  # kolom 3-4: t/tau dan eta/d di x/d=9,95
        except ValueError:
            pass  # baris judul
    g = [x for x in hasil["gauges"] if x["id"] == 2][0]["t_eta"]
    tau, d = spec["tau"], spec["d"]
    mod = [(t / tau, e / d) for t, e in g]

    def interp(t):
        for (t1, e1), (t2, e2) in zip(mod, mod[1:]):
            if t1 <= t <= t2:
                return e1 + (e2 - e1) * (t - t1) / (t2 - t1) if t2 > t1 else e1
        return None
    dif = [(interp(t) - e) for t, e in ref if interp(t) is not None]
    return math.sqrt(sum(x * x for x in dif) / len(dif)) / spec["H_d"] if dif else None


def uji_tolok_ukur(lab=False):
    sys.path.insert(0, CLAW)
    if not os.path.isdir(NTHMP):
        raise SystemExit("rujukan NTHMP tidak ada: git clone --depth 1 https://github.com/rjleveque/nthmp-benchmark-problems.git " + NTHMP)
    lap = {}
    gagal = []

    # 1. air tenang: sel darat tetap kering, massa terjaga (tanpa AMR)
    sp, o = jalankan_lereng("uji_tenang", None, tingkat=1, tau_akhir=20.0)
    # tenang: tidak ada gelombang jadi tidak ada sel basah di darat
    lap["tenang"] = {"sel_darat_basah": o["ringkasan"]["sel_darat_basah"]}
    if o["ringkasan"]["sel_darat_basah"]:
        gagal.append("air tenang membasahi %d sel darat" % o["ringkasan"]["sel_darat_basah"])

    # 2. massa soliter tanpa AMR (kasar d/10)
    sp, o = jalankan_lereng("uji_massa", 0.019, tingkat=1, kasar=10)
    m0, m1 = massa("uji_massa", 0), massa("uji_massa", 1)
    vgel = 2 * 0.019 * sp["d"] / math.sqrt(3 * 0.019 / 4) * (sp["kotak"][3] - sp["kotak"][2])
    rel = abs(m1 - m0) / vgel
    lap["massa"] = {"awal": m0, "akhir": m1, "relatif_total": abs(m1 - m0) / m0, "relatif_volume_gelombang": rel, "batas": TOL_MASSA}
    if rel > TOL_MASSA:
        gagal.append("massa berubah %.2e dari volume gelombang > %.0e" % (rel, TOL_MASSA))

    # 3. BP01 analitik, H/d = 0,019
    sp, o = jalankan_lereng("bp01", 0.019)
    R = o["ringkasan"]["runup"] / sp["d"]
    Rhk, Rpr = hukum_synolakis(0.019), profil_analitik_maks()
    gal = abs(R - Rhk) / Rhk
    lap["bp01"] = {"H_d": 0.019, "runup_model_d": R, "runup_hukum_synolakis_d": Rhk, "maks_profil_nthmp_d": Rpr,
                   "galat_relatif_hukum": gal, "galat_relatif_profil": abs(R - Rpr) / Rpr, "toleransi": TOL_ANALITIK,
                   "rms_gauge_9.95_per_H": rms_ts(sp, o), "waktu_detik": o["waktu_detik"], "memori_mb": o["memori_mb_puncak"]}
    if gal > TOL_ANALITIK:
        gagal.append("BP01 run-up %.4f vs analitik %.4f galat %.1f%%" % (R, Rhk, 100 * gal))

    if not lab:
        return lap, gagal

    # 4. BP04 laboratorium: tak pecah H/d=0,0185 dan pecah H/d=0,3 (d=1 m; SWE skala-bebas)
    for kunci, H, lebar, tol in (("bp04_tak_pecah", 0.0185, 0.001, TOL_LAB_TAKPECAH), ("bp04_pecah", 0.3, 0.012, TOL_LAB_PECAH)):
        sp, o = jalankan_lereng(kunci, H)
        R = o["ringkasan"]["runup"] / sp["d"]
        rata_lab, n = runup_lab(H, lebar)
        gal = abs(R - rata_lab) / rata_lab if rata_lab else None
        lap[kunci] = {"H_d": H, "runup_model_d": R, "runup_lab_rerata_d": rata_lab, "n_titik_lab": n, "jendela_H_d": lebar,
                      "galat_relatif": gal, "toleransi": tol, "waktu_detik": o["waktu_detik"], "memori_mb": o["memori_mb_puncak"]}
        if kunci == "bp04_pecah":   # K9 (pemilik 25 Nov 2026): gelombang pecah di luar cakupan validasi; dilaporkan, bukan gerbang
            lap[kunci]["cakupan"] = "di luar cakupan (K9): mesin tanpa model pecah"
            continue
        if gal is None:
            gagal.append("%s tanpa data lab" % kunci)
        elif gal > tol:
            # K10 (pemilik 25 Nov 2026): galat tak pecah lawan lab diterima sebagai batas mesin tanpa disipasi, dilaporkan
            # terbuka; TIDAK disebut lulus 5%. Gerbang tetap gagal bila galat melampaui batas tertulis 12,2% + sedikit ruang.
            lap[kunci]["status"] = "tidak lulus 5%%; diterima sebagai batas mesin (K10), galat %.1f%%" % (100 * gal)
            if gal > BATAS_K10:
                gagal.append("%s run-up %.4f vs lab %s galat %.1f%% melampaui batas tertulis K10 %.0f%%" % (kunci, R, rata_lab, 100 * gal, 100 * BATAS_K10))
    return lap, gagal


def uji():
    py = os.path.join(VENV, "bin/python")
    if os.path.realpath(sys.executable) != os.path.realpath(py) and "TS_UJI_VENV" not in os.environ:
        if not os.path.exists(py):
            raise SystemExit("venv GeoClaw tidak ada: " + VENV)
        os.environ["TS_UJI_VENV"] = "1"
        os.execv(py, [py, "-I", os.path.abspath(__file__)] + sys.argv[1:])
    # spek selalu jujur: hash berubah bila masukan berubah
    a = {"x": 1, "y": [2]}
    assert hash_masukan(a) == hash_masukan({"y": [2], "x": 1})
    s = spek_lereng(0.019)
    assert s["sel"][0] > 0 and s["fgmax"]["min_level"] == 2 and abs(hukum_synolakis(0.019) - 0.0888) < 1e-3
    lap, gagal = uji_tolok_ukur(lab="lab" in sys.argv)
    print(json.dumps(lap, indent=1))
    json.dump(lap, open(os.path.join(RUN, "uji_tolok_ukur.json"), "w"), indent=1)
    if gagal:
        print("GAGAL:\n  " + "\n  ".join(gagal))
        sys.exit(1)
    if "lab" in sys.argv:
        print("uji tsunami_hitung: lulus dengan batas tertulis. BP04 tak pecah TIDAK lulus 5% (galat lihat status, diterima K10); BP04 pecah di luar cakupan (K9)")
    else:
        print("uji tsunami_hitung: verifikasi analitik lulus. BP04 lab tidak dijalankan di mode ini; tak pecah +12,2% lawan lab diterima sebagai batas mesin (K10), bukan lulus 5%")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        print(__doc__)
