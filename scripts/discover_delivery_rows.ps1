# discover_delivery_rows.ps1  — READ-ONLY. Confirms the write design for
# Customer_Delivery.cd_region_id: the Customer id/code columns, real delivery
# rows for known customers (incl. a 2-address one), and whether "needs region"
# == cd_region_id=0, and whether some needy customers have NO delivery row.
# Run on MASTER:  .\discover_delivery_rows.ps1   (asks phalix_reader pw)

param(
  [string]$Server = "localhost,1433",
  [string]$User   = "phalix_reader",
  [System.Security.SecureString]$Password
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function L($m){ Write-Host $m }
if (-not $Password) { $Password = Read-Host "password for $User" -AsSecureString }
$pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
if ([string]::IsNullOrWhiteSpace($pw)) { L "stop: empty password"; exit 1 }
$cn = New-Object System.Data.SqlClient.SqlConnection("Server=$Server;Database=Genius;User ID=$User;Password=$pw;Connect Timeout=20")
try { $cn.Open(); L "connected to Genius on $Server as $User" } catch { L "connect failed: $($_.Exception.Message)"; exit 1 }
function Q($title, $sql){
  L ""; L "== $title =="
  try {
    $c = $cn.CreateCommand(); $c.CommandText = $sql; $r = $c.ExecuteReader()
    $cols=@(); for($i=0;$i -lt $r.FieldCount;$i++){ $cols += $r.GetName($i) }
    $n=0; while($r.Read()){ $line=@(); for($i=0;$i -lt $r.FieldCount;$i++){ $line += ("{0}={1}" -f $cols[$i], $r.GetValue($i)) }; L ("  "+($line -join "  |  ")); $n++ }
    L ("  ($n rows)"); $r.Close()
  } catch { L ("  ERROR: "+$_.Exception.Message) }
}

# A) Customer id/code/name/branch columns (to learn the PK the FK points at)
Q "Customer id/code columns" @"
SELECT c.colid, c.name AS col, t.name AS type
  FROM syscolumns c JOIN systypes t ON c.xusertype=t.xusertype
 WHERE c.id = OBJECT_ID('Customer')
   AND (c.name LIKE 'cust_id' OR c.name LIKE 'cust_code' OR c.name LIKE 'cust_name%'
        OR c.name LIKE 'cust_p_branch%' OR c.name = 'id')
 ORDER BY c.colid
"@

# B) delivery rows for known customers (join on cust_id); LEFT JOIN so customers
#    WITHOUT any delivery row still appear (cd_id = NULL).
Q "delivery rows for known customers (cust_id join)" @"
SELECT c.cust_code, c.cust_name_ar,
       cd.cd_id, cd.cd_cust_id, cd.cd_region_id, dc.dc_region_name_ar AS region,
       cd.cd_address
  FROM Customer c
  LEFT JOIN Customer_Delivery   cd ON cd.cd_cust_id = c.cust_id
  LEFT JOIN Delivery_cost_region dc ON dc.dc_id       = cd.cd_region_id
 WHERE c.cust_code IN ('6509','8022','23138','18589','5570','20584','11161','10297','10867','20592')
 ORDER BY c.cust_code, cd.cd_id
"@

# C) how common is cd_region_id=0 / NULL overall (the "needs region" signal)
Q "Customer_Delivery region-id distribution" @"
SELECT CASE WHEN cd_region_id IS NULL THEN 'NULL'
            WHEN cd_region_id=0 THEN '0'
            ELSE 'set' END AS region_state,
       COUNT(*) AS rows
  FROM Customer_Delivery
 GROUP BY CASE WHEN cd_region_id IS NULL THEN 'NULL'
               WHEN cd_region_id=0 THEN '0' ELSE 'set' END
"@

# D) a few delivery rows that currently have NO region (our screen's real targets)
Q "sample rows needing a region (region_id 0/NULL)" @"
SELECT TOP 15 c.cust_code, c.cust_name_ar, cd.cd_id, cd.cd_region_id, cd.cd_address
  FROM Customer_Delivery cd JOIN Customer c ON c.cust_id = cd.cd_cust_id
 WHERE cd.cd_region_id IS NULL OR cd.cd_region_id = 0
 ORDER BY cd.cd_id DESC
"@

$cn.Close()
L ""; L "done. send the whole output."
