# discover_customer_schema.ps1
# READ-ONLY discovery of the eplus/Genius Customer + Region schema.
# Lists all Customer columns and any region/area-like tables so we can
# identify: the customer region field, the customer code field (matching
# our cust_code), and the region-list table. Makes NO changes.
#
# Run on a branch server (e.g. mamora = localhost):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   .\discover_customer_schema.ps1
# (asks for the phalix_writer password; phalix_reader also works if you edit -User)

param(
  [string]$Server = "localhost,1433",
  [string]$User   = "phalix_writer",
  [System.Security.SecureString]$Password
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function L($m){ Write-Host $m }

if (-not $Password) { $Password = Read-Host "password for $User" -AsSecureString }
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
if ([string]::IsNullOrWhiteSpace($pw)) { L "stop: empty password"; exit 1 }

$cn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=Genius;User ID=$User;Password=$pw;Connect Timeout=20")
try { $cn.Open(); L "connected to Genius on $Server as $User" }
catch { L "connect failed: $($_.Exception.Message)"; exit 1 }

function Q($title, $sql){
  L ""; L "== $title =="
  $c = $cn.CreateCommand(); $c.CommandText = $sql
  $r = $c.ExecuteReader()
  $cols = @(); for($i=0;$i -lt $r.FieldCount;$i++){ $cols += $r.GetName($i) }
  $n = 0
  while($r.Read()){
    $line = @(); for($i=0;$i -lt $r.FieldCount;$i++){ $line += ("{0}={1}" -f $cols[$i], $r.GetValue($i)) }
    L ("  " + ($line -join "  |  ")); $n++
  }
  L ("  ($n rows)"); $r.Close()
}

# 1) ALL columns of the Customer table (spot the region + code + name + address fields)
Q "Customer columns" @"
SELECT c.colid, c.name AS col, t.name AS type, c.length
  FROM syscolumns c JOIN systypes t ON c.xusertype = t.xusertype
 WHERE c.id = OBJECT_ID('Customer')
 ORDER BY c.colid
"@

# 2) Tables that look like a region / area list
Q "region-like tables" @"
SELECT name FROM sysobjects
 WHERE xtype='U'
   AND (name LIKE '%region%' OR name LIKE '%area%' OR name LIKE '%zone%'
        OR name LIKE '%hay%'  OR name LIKE '%district%' OR name LIKE '%block%'
        OR name LIKE '%neigh%')
 ORDER BY name
"@

# 3) Columns of any table whose name contains 'region' or 'area' (the list table)
Q "columns of region/area tables" @"
SELECT o.name AS tbl, c.name AS col, t.name AS type
  FROM sysobjects o
  JOIN syscolumns c ON c.id = o.id
  JOIN systypes  t ON c.xusertype = t.xusertype
 WHERE o.xtype='U' AND (o.name LIKE '%region%' OR o.name LIKE '%area%' OR o.name LIKE '%zone%')
 ORDER BY o.name, c.colid
"@

$cn.Close()
L ""
L "done. send this whole output back so we can design the write safely."
