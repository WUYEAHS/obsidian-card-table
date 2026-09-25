# ASCII only - PowerShell 5.1 reads .ps1 as ANSI, so no literal CJK in here.
#
# Board DOM probe (1.6.3). Answers the "where is that button / did the editor mount" questions
# without writing a new one-off eval every time. Read-only: no file writes, no saved settings.
#
#   .\tools\probe.ps1 state              # filter / settings-mode / detail / archive / editing state
#   .\tools\probe.ps1 reset              # back to the plain board (run this when you are done!)
#   .\tools\probe.ps1 head               # every block header: class, icon, left edge, size
#   .\tools\probe.ps1 card "text"        # the card containing <text>: strip, pin, chips, buttons
#   .\tools\probe.ps1 edit "text"        # click its edit button, report the editor, then close it
#   .\tools\probe.ps1 hit                # tap-target size per button class + corner hit-test (1.7.6)
#   .\tools\probe.ps1 overflow          # elements that do not fit themselves (what check4 reports)
#   .\tools\probe.ps1 sel ".tk-plan"     # rect + common computed styles for a selector
#
# The argument may contain CJK: it is escaped to \uXXXX before it goes through the CLI.
# WARNING leaving settings-mode / archive / editing on pollutes measure.ps1 - always finish with reset.
param(
  [Parameter(Position = 0)][string]$Cmd = "state",
  [Parameter(Position = 1)][string]$Arg = "",
  [string]$Note = "ZZ-css-fixture.md"
)
$o = Join-Path $env:LOCALAPPDATA "Programs\Obsidian\Obsidian.com"
$p = $PSScriptRoot
$js = (Join-Path $p "probe.js").Replace('\', '/')

function Esc($s) {
  if (-not $s) { return "" }
  ($s.ToCharArray() | ForEach-Object { '\u{0:x4}' -f [int]$_ }) -join ''
}
$q = (Esc $Cmd) + '|' + (Esc $Arg) + '|' + (Esc $Note)   # 007c = |

& $o eval code="window.__pq='$q'; eval(require('fs').readFileSync('$js','utf8'))" 2>&1 | Out-Null
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 400
  $r = ((& $o eval code="window.__p" 2>&1) -join "`n") -replace '^=> ', ''
  if ($r -ne 'running') { break }
}
$r
