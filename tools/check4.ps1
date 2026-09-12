# ASCII only - PowerShell 5.1 reads .ps1 as ANSI, so no literal CJK in here.
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

foreach ($lang in @("zh-TW", "en")) {
  SetLang $lang
  foreach ($w in @(1280, 420)) {
    SetW $w
    $r = & $o eval code="$check" 2>&1
    "==================== $lang @ ${w}px ===================="
    ($r -join "`n") -replace '^=> ', ''
  }
}
& $o dev:cdp method=Emulation.clearDeviceMetricsOverride 2>&1 | Out-Null
SetLang "zh-TW"
"(language restored to zh-TW)"
