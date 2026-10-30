# discover_regions_round2.ps1  — READ-ONLY. Pinpoints which Customer field
# holds our delivery region and which table is the dropdown source.
# Run on MASTER (mamora): .\discover_regions_round2.ps1   (asks phalix_writer pw)

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

# A) known customers resolved against BOTH region tables.
#    valid-region: 8022=المندره , 6509/10297/10867/20592=جليم
#    needs-region: 23138 18589 5570 20584 11161
Q "customers vs both region fields" @"
SELECT c.cust_code,
       c.cust_region_id,    rg.r_name_ar          AS Regions_name,
       c.cust_dc_region_id, dc.dc_region_name_ar  AS DC_name, dc.dc_delivery_cost AS DC_cost,
       c.cust_p_branch_id
  FROM Customer c
  LEFT JOIN Regions rg              ON rg.r_id  = c.cust_region_id
  LEFT JOIN Delivery_cost_region dc ON dc.dc_id = c.cust_dc_region_id
 WHERE c.cust_code IN ('8022','6509','10297','10867','20592','23138','18589','5570','20584','11161')
 ORDER BY c.cust_code
"@

# B) the delivery-cost region list (likely our dropdown source) + counts
Q "Delivery_cost_region (full)" "SELECT dc_id, dc_region_name_ar, dc_delivery_cost FROM Delivery_cost_region ORDER BY dc_region_name_ar"
Q "Regions count" "SELECT COUNT(*) AS regions_rows FROM Regions"
Q "Regions sample (by name)" "SELECT TOP 120 r_id, r_name_ar, r_parent FROM Regions ORDER BY r_name_ar"

$cn.Close()
L ""; L "done. send the whole output."
