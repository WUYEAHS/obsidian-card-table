# Card Table: sync the three plugin files, reload, run format + board + editor tests.
# ASCII only (PowerShell 5.1 reads .ps1 as ANSI).
# Usage: .\tools\run-tests.ps1 [-SkipBoard] [-FromRepo]
# Default (since 1.6.1): the VAULT copy is the one being edited (it syncs to the phone),
#   so main.js / manifest.json / styles.css are copied vault -> repo before testing.
# -FromRepo: the old direction, repo -> vault (e.g. after git checkout).
# The plugin folder is asked from Obsidian (app.plugins.manifests['card-table'].dir):
# Obsidian finds plugins by manifest id, so the folder name can be anything.
param(
  [switch]$SkipBoard,
  [switch]$FromRepo
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$base = (obsidian eval code="app.vault.adapter.basePath") -replace '^=> ', ''
$rel = (obsidian eval code="(app.plugins.manifests['card-table']||{}).dir||''") -replace '^=> ', ''
if (-not $base -or -not $rel) { Write-Host 'FAIL cannot find the card-table plugin folder (is Obsidian open?)'; exit 1 }
$plug = Join-Path $base ($rel -replace '/', '\')
if (-not (Test-Path $plug -PathType Container)) { Write-Host "FAIL plugin folder is not a directory: $plug"; exit 1 }
$item = Get-Item $plug -Force
$sameFile = $false
try { $sameFile = (Resolve-Path (Join-Path $plug 'main.js')).Path -eq (Resolve-Path (Join-Path $repo 'main.js')).Path } catch {}
if (-not $item.LinkType -and -not $sameFile) {
  foreach ($n in 'main.js', 'manifest.json', 'styles.css') {
    if ($FromRepo) { Copy-Item (Join-Path $repo $n) (Join-Path $plug $n) -Force }
    else { Copy-Item (Join-Path $plug $n) (Join-Path $repo $n) -Force }
  }
  if ($FromRepo) { Write-Host "copied repo -> $plug (data.json untouched)" }
  else { Write-Host "copied $plug -> repo (data.json not copied)" }
}
foreach ($n in 'main.js', 'manifest.json', 'styles.css') {
  $a = (Get-FileHash (Join-Path $repo $n)).Hash
  $b = (Get-FileHash (Join-Path $plug $n)).Hash
  if ($a -ne $b) { Write-Host "FAIL deployed $n differs from the repo"; exit 1 }
}
$rp = ($repo -replace '\\', '/')
$syntax = obsidian eval code="try{new Function(require('fs').readFileSync('$rp/main.js','utf8'));'syntax ok'}catch(e){'SYNTAX ERROR '+e.message}"
Write-Host $syntax
if ($syntax -notmatch 'syntax ok') { exit 1 }
obsidian plugin:reload id=card-table | Out-Host
$ver = obsidian eval code="app.plugins.plugins['card-table'].manifest.version"
$want = (Get-Content (Join-Path $repo 'manifest.json') -Raw | ConvertFrom-Json).version
Write-Host "loaded $ver, repo $want"
if ($ver -notmatch [regex]::Escape($want)) { Write-Host 'FAIL version mismatch'; exit 1 }
# 1.7.4: every layout number is tuned for Obsidian's DEFAULT theme. A community theme made A2 / M13
# and the Canvas frame test fail for four versions and we called them "known failures". Stop here instead.
$theme = obsidian eval code="app.customCss.theme || '(default)'"
Write-Host "theme: $theme"
if ($theme -notmatch '\(default\)') { Write-Host 'FAIL not the default theme - switch to the default theme before testing'; exit 1 }
# 1.7.5-P2 (owner 09-25): tests and measurements run at Obsidian zoom 100%. At 120% the board tab is narrow,
# Canvas zooms out past the point where it renders node content, and the 4 Canvas tests read 0 cards.
# Set it here (measure / check4 run after this and keep it); Ctrl+= in Obsidian goes back to your own zoom.
$zoom = obsidian eval code="(()=>{const w=require('electron').webFrame;const z=w.getZoomFactor();if(Math.abs(z-1)>0.01)w.setZoomFactor(1);return z})()"
Write-Host "zoom: $zoom -> 1"

# 1.6.5: bring Obsidian to the front BEFORE measuring. A covered window throttles timers and
# board/editor tests fail for no reason (cost us ~5 wasted runs in 1.6.5). Do not remove.
try {
  $ob = Get-Process obsidian -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle }
  if ($ob) { (New-Object -ComObject WScript.Shell).AppActivate($ob[0].Id) | Out-Null; Start-Sleep -Milliseconds 900 }
} catch {}
$vis = obsidian eval code="document.visibilityState + ' / focused=' + document.hasFocus()"
Write-Host "obsidian window: $vis"
if ($vis -match 'hidden') { Write-Host 'WARNING Obsidian is minimized or covered: timers are throttled, the editor/board tests may time out. Keep it visible.' }
$fails = 0
$fmt = obsidian eval code="eval(require('fs').readFileSync('$rp/tools/format-test.js','utf8'))" | Out-String
$fmtFail = ([regex]::Matches($fmt, 'FAIL')).Count
$fmtOk = ([regex]::Matches($fmt, '(?m)^(=> )?ok ')).Count
Write-Host "format-test: $fmtOk ok, $fmtFail fail"
if ($fmtFail) { Write-Host $fmt; $fails += $fmtFail }

if (-not $SkipBoard) {
  obsidian eval code="eval(require('fs').readFileSync('$rp/tools/board-test.js','utf8'))" | Out-Null
  $res = ''
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep 3
    $res = obsidian eval code="window.__ctBoardTest" | Out-String
    if ($res -notmatch 'running') { break }
  }
  $bFail = ([regex]::Matches($res, 'FAIL')).Count
  $bOk = ([regex]::Matches($res, '(?m)^(=> )?ok ')).Count
  Write-Host "board-test: $bOk ok, $bFail fail"
  if ($bFail -or $res -notmatch 'DONE') { Write-Host $res; $fails += [Math]::Max(1, $bFail) }
  obsidian eval code="eval(require('fs').readFileSync('$rp/tools/editor-test.js','utf8'))" | Out-Null
  $res = ''
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep 2
    $res = obsidian eval code="window.__ctEditorTest" | Out-String
    if ($res -notmatch 'running') { break }
  }
  if ($res -match 'running') {
    $diag = obsidian eval code="'stuck at step: ' + window.__ctEditorStep + ' | ' + (window.__ctEditorOut || []).join(' / ')" | Out-String
    Write-Host "editor-test did not finish: $diag"
  }
  $eFail = ([regex]::Matches($res, 'FAIL')).Count
  $eOk = ([regex]::Matches($res, '(?m)^(=> )?ok ')).Count
  Write-Host "editor-test: $eOk ok, $eFail fail"
  if ($eFail -or $res -notmatch 'DONE') { Write-Host $res; $fails += [Math]::Max(1, $eFail) }
}
if ($fails) { Write-Host "TESTS FAILED ($fails)"; exit 1 }
Write-Host 'ALL TESTS PASSED'
