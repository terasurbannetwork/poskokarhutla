#!/bin/sh
# Tarik data situs centurisk97.id dan FIRMS 7 hari publik ke sumber/. Jalankan sesudah cut-off.
set -e
cd "$(dirname "$0")/sumber"
for f in harian30 peta_karhutla peta_karhutla_kab peta_karhutla_wil kluster operasi kendala kumulatif khg_prioritas udara_kualitas; do
  curl -sf -o web/$f.json https://centurisk97.id/data/$f.json
done
B=https://firms.modaps.eosdis.nasa.gov/data/active_fire
for p in suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2 noaa-20-viirs-c2/csv/J1_VIIRS_C2 noaa-21-viirs-c2/csv/J2_VIIRS_C2 modis-c6.1/csv/MODIS_C6_1; do
  curl -sf -o firms/$(basename $p)_SouthEast_Asia_7d.csv $B/${p}_SouthEast_Asia_7d.csv
done
date '+ditarik %Y-%m-%d %H:%M %Z' > ditarik.txt; cat ditarik.txt
