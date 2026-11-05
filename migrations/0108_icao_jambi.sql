-- Base Sultan Thaha (Jambi) tercatat dengan ICAO lama WIPA di seed 0103; ICAO yang berlaku WIJJ
-- (dipakai feed METAR BMKG/NOAA dan udara.json). Idempoten: hanya mengubah baris yang masih WIPA.
UPDATE op_base SET icao = 'WIJJ' WHERE id = 'DJB' AND icao = 'WIPA';
