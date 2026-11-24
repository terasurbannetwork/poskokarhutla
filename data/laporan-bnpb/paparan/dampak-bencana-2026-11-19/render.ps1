param($pptx, $out)
$ErrorActionPreference='Stop'
$a = New-Object -ComObject PowerPoint.Application
$p = $a.Presentations.Open($pptx, $true, $false, $false)
$i = 1
foreach ($s in $p.Slides) { $s.Export("$out\s$i.png", "PNG", 1920, 1080); $i++ }
$p.SaveAs(($pptx -replace '\.pptx$', '.pdf'), 32)
$p.Close()
