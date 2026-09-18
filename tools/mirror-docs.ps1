# Card Table: mirror repo docs into the vault so they can be read (and commented on) in Obsidian.
# Target: the vault folder that holds "Main navigator.md", subfolder "Repo mirror". Read-only copies.
# Mirrors README (en, zh-TW), CHANGELOG, CLAUDE.md, docs/roadmap.md, .claude/skills/*/SKILL.md, .claude/agents/*.md.
# Tandem comments already in a mirror are kept. Files whose content did not change are not rewritten.
# ASCII only (PowerShell 5.1 reads .ps1 as ANSI). Needs Obsidian open and the obsidian CLI.
# Usage: .\tools\mirror-docs.ps1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$rp = ($repo -replace '\\', '/')
obsidian eval code="window.__ctRepo='$rp'; eval(require('fs').readFileSync('$rp/tools/mirror-docs.js','utf8'))" | Out-Null
$res = ''
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep 1
  $res = obsidian eval code="window.__ctMirror" | Out-String
  if ($res -notmatch 'running') { break }
}
Write-Host $res
if ($res -notmatch 'DONE') { exit 1 }
