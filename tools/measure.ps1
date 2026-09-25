# ASCII only - PowerShell 5.1 reads .ps1 as ANSI, so no literal CJK in here.
#
# UI measurement (1.6.3, after the first UI/UX critic run): measures the numeric rules in the
# card-table-ui-rules skill (three lines 5 / 9 / 18, header height, ellipsis right edges, WYSIWYG x+y,
# chip contrast in dark AND light, send button colour, zh/en dictionary keys). Tolerance 1px.
# check4.ps1 finds clipping / overflow; this one finds misalignment. Run both after layout changes.
#
# Needs Obsidian open and VISIBLE (hidden windows slow timers down). Read-only: no file writes, no saved settings.
param([switch]$En)
$o = Join-Path $env:LOCALAPPDATA "Programs\Obsidian\Obsidian.com"
$p = $PSScriptRoot

$fxSrc = (Join-Path $p "fixture-css.md").Replace('\', '/')
$fxJs = (Join-Path $p "fixture.js").Replace('\', '/')
& $o eval code="window.__fxSrc='$fxSrc'; eval(require('fs').readFileSync('$fxJs','utf8'))" 2>&1 | Out-Null
Start-Sleep -Milliseconds 1200

function SetLang($lang) {
  $js = "(async()=>{const p=app.plugins.plugins['card-table']; p[String.fromCharCode(35373,23450)]" +
        "[String.fromCharCode(35486,35328)]='$lang'; await p[String.fromCharCode(23384,35373,23450)](); return 1})()"
  & $o eval code="$js" 2>&1 | Out-Null
  & $o plugin:reload id=card-table 2>&1 | Out-Null
  Start-Sleep -Milliseconds 1900
}

$m = (Join-Path $p "measure.js").Replace('\', '/')
# CR-1.7.6-02: the numbers below are 100% numbers. Board size / icon size (--tk-<board>x / --tk-<icon>x,
# CJK names built with fromCharCode) are forced to 1 for the run and restored with the plugin's own setter at the end.
$base = "['--tk-'+String.fromCharCode(26495,20493),'--tk-'+String.fromCharCode(22294,20493)].forEach(k=>document.body.style.setProperty(k,'1')); 1"
$restore = "app.plugins.plugins['card-table'][String.fromCharCode(22871,40670,25802)](); 1"
$langs = @("zh-TW"); if ($En) { $langs += "en" }
foreach ($lang in $langs) {
  if ($En) { SetLang $lang }
  & $o eval code="$base" 2>&1 | Out-Null
  Start-Sleep -Milliseconds 600
  "==================== $lang ===================="
  & $o eval code="eval(require('fs').readFileSync('$m','utf8'))" 2>&1 | Out-Null
  # the script is async (opens the editor, toggles themes); poll window.__m
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    $r = ((& $o eval code="window.__m" 2>&1) -join "`n") -replace '^=> ', ''
    if ($r -ne 'running') { break }
  }
  $r
}
& $o eval code="$restore" 2>&1 | Out-Null
if ($En) { SetLang "zh-TW"; "(language restored to zh-TW)" }
