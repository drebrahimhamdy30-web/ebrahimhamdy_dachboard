# discover_delivery_addr.ps1  — READ-ONLY (system catalog only).
# Finds the "التوصيل المنزلي" delivery-address table: any table (besides Customer)
# that has a region-id column, plus address/delivery-named tables, with their columns.
# Run on MASTER:  .\discover_delivery_addr.ps1   (phalix_writer pw; catalog is readable by it)

param(
  [string]$Server = "localhost,1433",
  [string]$User   = "phalix_writer",
  [System.Security.SecureString]$Password
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function L($m){ Write-Host $m }
if (-not $Password) { $Password = Read-Host "password for $User" -AsSecureString }
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
if ([string]::IsNullOrWhiteSpace($pw)) { L "stop: empty password"; exit 1 }
$cn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=Genius;User ID=$User;Password=$pw;Connect Timeout=20")
try { $cn.Open(); L "connected to Genius on $Server" } catch { L "connect failed: $($_.Exception.Message)"; exit 1 }
function Q($title, $sql){
  L ""; L "== $title =="
  $c = $cn.CreateCommand(); $c.CommandText = $sql; $r = $c.ExecuteReader()
  $cols=@(); for($i=0;$i -lt $r.FieldCount;$i++){ $cols += $r.GetName($i) }
  $n=0; while($r.Read()){ $line=@(); for($i=0;$i -lt $r.FieldCount;$i++){ $line += ("{0}={1}" -f $cols[$i], $r.GetValue($i)) }; L ("  "+($line -join "  |  ")); $n++ }
  L ("  ($n rows)"); $r.Close()
}

# (1) Every table (besides Customer) that references a region id -> the delivery-address table is here. Show all its columns.
Q "tables with a region-id column (+ their columns)" @"
SELECT o.name AS tbl, c.name AS col, t.name AS type, c.length
  FROM sysobjects o
  JOIN syscolumns c ON c.id = o.id
  JOIN systypes  t ON c.xusertype = t.xusertype
 WHERE o.xtype='U' AND o.name <> 'Customer'
   AND o.id IN (SELECT id FROM syscolumns WHERE name LIKE '%dc_region%' OR name LIKE '%region_id%')
 ORDER BY o.name, c.colid
"@

# (2) tables named like delivery / address / home
Q "delivery/address-named tables" @"
SELECT name FROM sysobjects
 WHERE xtype='U' AND (name LIKE '%deliver%' OR name LIKE '%addr%' OR name LIKE '%home%' OR name LIKE '%cust_del%')
 ORDER BY name
"@

$cn.Close()
L ""; L "done. send the whole output."
