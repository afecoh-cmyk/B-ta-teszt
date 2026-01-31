param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("Export", "Import")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$DataJson # Csak Export esetén szükséges
)

$dbPath = "c:\Users\Feco\Desktop\csempe projekt\data\db.json"

if ($Action -eq "Export") {
    if (-not $DataJson) {
        Write-Error "Az Export művelethez szükség van a DataJson paraméterre."
        exit 1
    }
    
    try {
        $DataJson | Out-File -FilePath $dbPath -Encoding utf8
        Write-Host "Adatok sikeresen kimentve: $dbPath"
    } catch {
        Write-Error "Hiba a mentés során: $($_.Exception.Message)"
        exit 1
    }
}
elseif ($Action -eq "Import") {
    if (Test-Path $dbPath) {
        try {
            $content = Get-Content -Path $dbPath -Raw -Encoding utf8
            Write-Output $content
        } catch {
            Write-Error "Hiba a beolvasás során: $($_.Exception.Message)"
            exit 1
        }
    } else {
        Write-Error "A db.json fájl nem található: $dbPath"
        exit 1
    }
}
