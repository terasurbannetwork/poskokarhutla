# Perbarui daftar isi dan bidang di DOCX lewat Microsoft Word (COM), lalu simpan. powershell -File perbarui_word.ps1 <berkas.docx>
param([string]$Berkas)
$w = $null
try {
  $w = New-Object -ComObject Word.Application
  $w.Visible = $false
  $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Berkas)
  foreach ($t in $d.TablesOfContents) { $t.Update() }
  $d.Fields.Update() | Out-Null
  $d.Repaginate()
  "Word: $($d.ComputeStatistics(2)) halaman, daftar isi diperbarui"
  $d.Save()
  $d.Close()
} catch { "Word gagal: $_" } finally { if ($w) { $w.Quit() } }
