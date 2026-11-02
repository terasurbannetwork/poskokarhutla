// Mengemas nilai emas lewat payload.h firmware; keluaran hex dibandingkan dengan sensor/payload.py oleh uji.
#include <stdio.h>
#include "../../sensor/firmware/lib/bnpb_sensor/payload.h"
static void cetak(const bs::W& w) { for (int i = 0; i < w.n; i++) printf("%02x", w.b[i]); printf("\n"); }
int main() {
  bs::W w;
  w = bs::W(); bs::packTma(w, 513, 3.98f, 123.4f, -5.5f, 9); cetak(w);
  w = bs::W(); bs::packHujan(w, 7, 4.2f, 1.6f, 12.4f, 61); cetak(w);
  w = bs::W(); bs::packLongsor(w, 65535, 3.7f, 42.5f, -0.8f, -1.25f, 3.5f, 77, 1); cetak(w);
  w = bs::W(); bs::packGambut(w, 3, 3.3f, -45.5f, 36); cetak(w);
  w = bs::W(); bs::packGambut(w, 4, 3.3f, NAN, 255); cetak(w);
  w = bs::W(); bs::packGas(w, 10, 4.0f, NAN, 12.5f, NAN); cetak(w);
  w = bs::W(); bs::packGas(w, 9, 4.0f, 12.3f, 187.5f, 230.0f); cetak(w);
  return 0;
}
