"""TS-10 diagnostik: pantai 1:19,85 (NTHMP BP01/BP04) dengan GeoClaw 1D classic, SWE (eq 0) lawan Boussinesq SGN (eq 2).

HANYA diagnostik penyelidikan BP04 (RISET 4.2); bukan mesin skenario (itu tsunami_hitung.py, 2D, SWE). 1D classic ikut
Clawpack 5.14 tanpa PETSc (penyelesai tridiagonal bawaan); butuh submodul `classic` dan venv GeoClaw (tanpa scipy).
Pakai (python venv, cwd data/raw/tsunami/run):  python -I scripts/gempa/tsunami_lab1d.py '[["nama",0.0185,{"eq":2,"mode":"sgn"}]]'
mode: nthmp (sech^2 gam=sqrt(3H/4d), u linier, seperti deskripsi BP04), swe_exact (u nirlinier), sgn (soliter SGN eksak).
Run-up = elevasi muka air sel basah terjauh (B+h, muka laut 0) maksimum sepanjang waktu, basah = h > 2 dry_tol.
"""
import json, math, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tsunami_hitung as T

EX = os.path.join(T.CLAW, "geoclaw/examples/1d_classic/bouss_wavetank_usace")
QINIT = """subroutine qinit(meqn,mbc,mx,xlower,dx,q,maux,aux)
    use geoclaw_module, only: sea_level
    use grid_module, only: xcell
    implicit none
    integer, intent(in) :: meqn,mbc,mx,maux
    real(kind=8), intent(in) :: xlower,dx
    real(kind=8), intent(in) :: aux(maux,1-mbc:mx+mbc)
    real(kind=8), intent(inout) :: q(meqn,1-mbc:mx+mbc)
    integer :: i
    real(kind=8) :: H, dd, x0, kap, mode, eta, u, c
    open(unit=77, file='soliter.data', status='old')
    read(77,*) H, dd, x0, kap, mode
    close(77)
    do i=1,mx
        eta = 0.d0
        if (abs(kap*(xcell(i)-x0)/dd) < 30.d0) eta = H / cosh(kap*(xcell(i)-x0)/dd)**2
        q(1,i) = max(0.d0, eta - aux(1,i))
        c = sqrt(9.81d0*(dd+H))
        u = sqrt(9.81d0/dd)*eta
        if (mode > 0.5d0) u = c*eta/(dd+eta)
        q(2,i) = q(1,i)*u
    enddo
end subroutine qinit
"""


def jalan(nama, H_d, eq=0, mode="nthmp", dx_d=1 / 40., minh_d=0.05, dry_d=1e-3, manning=0.0, tau_akhir=90., d=1.0, cfl=0.25):
    D = os.path.join(T.RUN, nama)
    shutil.rmtree(D, ignore_errors=True)
    os.makedirs(D)
    cot = T.COT
    gam = math.sqrt(3 * H_d / 4) if mode in ("nthmp", "swe_exact") else math.sqrt(3 * H_d / (4 * (H_d + 1)))
    L = d * math.acosh(math.sqrt(20)) / gam
    x0 = -(cot * d + L)  # pantai di x=0, daratan x>0
    xl, xr = x0 - 2 * L - 5 * d, 22 * d  # daratan sampai z = 1,1 d; 8 d (z 0,4 d) membuat run-up H/d 0,3 menabrak dinding ujung
    mx = int(round((xr - xl) / (dx_d * d)))
    dx = (xr - xl) / mx
    with open(os.path.join(D, "celledges.data"), "w") as f:
        f.write("%i   # number of cell edges\n" % (mx + 1))
        for i in range(mx + 1):
            x = xl + i * dx
            f.write("%15.8f %15.8f\n" % (x, max(-d, x / cot)))
    open(os.path.join(D, "qinit.f90"), "w").write(QINIT)
    open(os.path.join(D, "setprob.f90"), "w").write("subroutine setprob\nend subroutine setprob\n")
    open(os.path.join(D, "soliter.data"), "w").write("%.15g %.15g %.15g %.15g %d\n" % (H_d * d, d, x0, gam, 0 if mode == "nthmp" else 1))
    mk = open(os.path.join(EX, "Makefile")).read()
    mk = mk.replace("FFLAGS = -llapack -lblas -O2", "FFLAGS = -O2").replace("  #$(BOUSSLIB)/lapack_tridiag.f \\", "  $(BOUSSLIB)/lapack_tridiag.f \\")
    open(os.path.join(D, "Makefile"), "w").write(mk.replace("EXE = xgeo ", "EXE = xgeo1d "))
    sr = open(os.path.join(EX, "setrun.py")).read()
    tau = math.sqrt(d / 9.81)

    def R(a, b):
        nonlocal sr
        assert a in sr, a
        sr = sr.replace(a, b)
    R("from clawpack.geoclaw.nonuniform_grid_tools import make_mapc2p", "import numpy as np")  # modul asli butuh scipy
    R("mapc2p, mx_edge, xp_edge = make_mapc2p(fname_celledges)",
      "_L = open(fname_celledges).read().splitlines(); mx_edge = int(_L[0].split()[0]); xp_edge = np.array([float(l.split()[0]) for l in _L[1:1+mx_edge]])")
    R("monitor_runup = False", "monitor_runup = True")
    R("bouss_equations = 2 ", "bouss_equations = %d " % eq)
    R("bouss_min_depth = 0.06", "bouss_min_depth = %.8g" % (minh_d * d))
    R("clawdata.num_output_times = 50", "clawdata.num_output_times = 4")
    R("clawdata.tfinal = 25.", "clawdata.tfinal = %.8g" % (tau_akhir * tau))
    R("clawdata.cfl_desired = 0.25", "clawdata.cfl_desired = %.3g" % cfl)
    R("clawdata.steps_max = 50000", "clawdata.steps_max = 5000000")
    R("geo_data.dry_tolerance = 1.e-6", "geo_data.dry_tolerance = %.8g" % (dry_d * d))
    R("geo_data.manning_coefficient =.025", "geo_data.manning_coefficient = %.8g" % manning)
    R("geo_data.friction_forcing = True", "geo_data.friction_forcing = %s" % (manning > 0))
    R("xp_gauges = {5:0., 7:4.36, 8:5.825}", "xp_gauges = {}")
    open(os.path.join(D, "setrun.py"), "w").write(sr)
    T._sh(["make", "-j2", ".exe"], D, os.path.join(D, "build.log"))
    T._sh(["make", "data"], D, os.path.join(D, "data.log"))
    T._sh(["make", "output"], D, os.path.join(D, "run.log"))
    best, bt = -9.0, None
    for ln in open(os.path.join(D, "_output", "runup.txt")):
        if ln.strip().startswith("#") or not ln.strip():
            continue
        v = [float(x) for x in ln.split()]
        if v[4] > best:
            best, bt = v[4], v[0]
    res = {"nama": nama, "H_d": H_d, "eq": eq, "mode": mode, "dx_d": dx_d, "minh_d": minh_d, "dry_d": dry_d, "manning": manning, "d": d,
           "R_d": best / d, "t_tau": bt / tau, "law": T.hukum_synolakis(H_d)}
    json.dump(res, open(os.path.join(T.RUN, nama + ".exp.json"), "w"))
    return res


if __name__ == "__main__":
    for n, H, kw in json.loads(sys.argv[1]):
        try:
            print(json.dumps(jalan(n, H, **kw)), flush=True)
        except Exception as e:
            print(json.dumps({"nama": n, "err": str(e)}), flush=True)
