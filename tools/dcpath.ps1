param(
  [Parameter(Mandatory=$true)][string]$File,
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$Depth = 0,
  [int]$Max = 300
)
# dcpath.ps1 -- resolve a Design-artifact element path (e.g. 1/2/2/1/0/0) to the markup.
# ASCII ONLY: PowerShell 5.1 reads .ps1 as ANSI, non-ASCII breaks the parser.
# Usage: .\tools\dcpath.ps1 -File <x.dc.html> -Path 1/0/0/3/1 [-Depth 2]

# Only real HTML void elements. SVG leaves are written with explicit closing tags here.
$void = @('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr')

$html = [IO.File]::ReadAllText((Resolve-Path $File), [Text.Encoding]::UTF8)
$start = $html.IndexOf('<x-dc>')
if ($start -lt 0) { throw "no <x-dc> in file" }
$body = $html.Substring($start + 6)
$hs = $body.IndexOf('<helmet>'); $he = $body.IndexOf('</helmet>')
if ($hs -ge 0 -and $he -gt $hs) { $body = $body.Remove($hs, $he - $hs + 9) }

$rx = [regex]'<(/?)([a-zA-Z][-a-zA-Z0-9]*)((?:"[^"]*"|''[^'']*''|[^>"''])*?)(/?)>'
$root = [pscustomobject]@{ tag='#root'; start=0; fin=$body.Length; kids=New-Object System.Collections.ArrayList }
$stack = New-Object System.Collections.Stack
$stack.Push($root) | Out-Null
foreach ($m in $rx.Matches($body)) {
  $close = $m.Groups[1].Value -eq '/'
  $tag = $m.Groups[2].Value.ToLower()
  $self = ($m.Groups[4].Value -eq '/') -or ($void -contains $tag)
  if ($close) {
    if ($stack.Count -gt 1) { $n = $stack.Pop(); $n.fin = $m.Index + $m.Length }
  } else {
    $node = [pscustomobject]@{ tag=$tag; start=$m.Index; fin=$m.Index + $m.Length; kids=New-Object System.Collections.ArrayList }
    $parent = $stack.Peek()
    [void]$parent.kids.Add($node)
    if (-not $self) { $stack.Push($node) | Out-Null }
  }
}

function Show($node, $label, $d) {
  $len = [Math]::Min($node.fin - $node.start, $Max)
  $txt = $body.Substring($node.start, $len) -replace '\s+', ' '
  Write-Output ("{0} <{1}> {2}" -f $label, $node.tag, $txt)
  if ($d -gt 0) {
    for ($i = 0; $i -lt $node.kids.Count; $i++) { Show $node.kids[$i] ("$label/$i") ($d - 1) }
  }
}

$cur = $root
$trail = @()
# The artifact numbers the root artboard div as "1" (helmet counts as 0); our tree has it at 0.
$segs = $Path.Trim('/').Split('/')
if ($segs[0] -eq '1') { $segs[0] = '0' }
foreach ($s in $segs) {
  $i = [int]$s
  if ($i -ge $cur.kids.Count) { throw ("path stops at " + ($trail -join '/') + " : only " + $cur.kids.Count + " children") }
  $cur = $cur.kids[$i]
  $trail += $s
}
Show $cur $Path $Depth
