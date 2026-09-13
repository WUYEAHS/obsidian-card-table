# ASCII only - PowerShell 5.1 reads .ps1 as ANSI, so no literal CJK in here.
#
# Scans the board for overflow / clipped text / out-of-bounds elements in
# zh-TW and en, at desktop width and at two real phone BOARD widths.
#
# Why the phone runs are not simply "viewport = 390":
#   desktop Obsidian keeps the left ribbon and pane chrome even in a narrow
#   window, so a 420px viewport only leaves ~306px for the board - narrower than
#   any real phone (a phone has no ribbon; the board is the whole screen).
#   So we measure that overhead once (check.js reports it as "ovh") and set the
#   viewport to target + overhead. The narrow layout switches on the VIEWPORT
#   (max-width: 700px), and 390 + overhead is still well under 700.
$o = Join-Path $env:LOCALAPPDATA "Programs\Obsidian\Obsidian.com"
$p = $PSScriptRoot
$check = [System.IO.File]::ReadAllText((Join-Path $p "check.js"))

function SetLang($lang) {
  $js = "(async()=>{const p=app.plugins.plugins['card-table']; p[String.fromCharCode(35373,23450)]" +
        "[String.fromCharCode(35486,35328)]='$lang'; await p[String.fromCharCode(23384,35373,23450)](); return 1})()"
  & $o eval code="$js" 2>&1 | Out-Null
  & $o plugin:reload id=card-table 2>&1 | Out-Null
  Start-Sleep -Milliseconds 1900
}
function SetW($w) {
  $prm = '{\"width\":' + $w + ',\"height\":900,\"deviceScaleFactor\":1,\"mobile\":false}'
  & $o dev:cdp method=Emulation.setDeviceMetricsOverride params=$prm 2>&1 | Out-Null
  Start-Sleep -Milliseconds 1400
}
function RunCheck() {
  $r = & $o eval code="$check" 2>&1
  return (($r -join "`n") -replace '^=> ', '')
}

foreach ($lang in @("zh-TW", "en")) {
  SetLang $lang

  SetW 1280
  "==================== $lang @ desktop 1280px ===================="
  RunCheck

  # measure the chrome around the board once per language.
  # CDP widths are DEVICE px; Obsidian's zoom (e.g. 120%) makes CSS px smaller,
  # so zoom = device width / innerWidth, and everything CSS-sized gets multiplied back.
  SetW 500
  $ovh = 44; $zoom = 1.0
  try {
    $m = RunCheck | ConvertFrom-Json
    $ovh = [int]$m.ovh
    if ([double]$m.inner -gt 0) { $zoom = 500.0 / [double]$m.inner }
  } catch {}

  # 390 = iPhone, 360 = the narrowest common Android phone
  foreach ($board in @(390, 360)) {
    $vw = [int][math]::Round(($board + $ovh) * $zoom)
    SetW $vw
    "==================== $lang @ phone board ${board}px (device viewport $vw, zoom $([math]::Round($zoom, 2))) ===================="
    RunCheck
  }
}
& $o dev:cdp method=Emulation.clearDeviceMetricsOverride 2>&1 | Out-Null
SetLang "zh-TW"
"(language restored to zh-TW)"
