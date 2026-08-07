param(
    [switch]$Lan,
    [switch]$ApplyMigrations
)

$ErrorActionPreference = "Stop"

$root =
    Split-Path -Parent $PSScriptRoot

$localEnv =
    Join-Path $PSScriptRoot "mindcare-env.local.ps1"

if (-not (Test-Path $localEnv)) {
    Write-Host "Falta scripts\mindcare-env.local.ps1" -ForegroundColor Yellow
    Write-Host "Copia scripts\mindcare-env.example.ps1 como scripts\mindcare-env.local.ps1 y coloca tu cadena PostgreSQL." -ForegroundColor Yellow
    exit 1
}

. $localEnv

$connectionString =
    [Environment]::GetEnvironmentVariable("ConnectionStrings__DefaultConnection")

$databaseUrl =
    [Environment]::GetEnvironmentVariable("DATABASE_URL")

if ([string]::IsNullOrWhiteSpace($connectionString) -and [string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "Falta configurar PostgreSQL." -ForegroundColor Red
    Write-Host "En scripts\mindcare-env.local.ps1 pega tu cadena de Neon en `$env:DATABASE_URL." -ForegroundColor Yellow
    Write-Host "Ejemplo: postgresql://neondb_owner:PASSWORD@HOST/neondb?sslmode=require" -ForegroundColor Yellow
    exit 1
}

if ($connectionString -match "TU_" -or $databaseUrl -match "TU_") {
    Write-Host "La configuracion todavia contiene valores de ejemplo como TU_HOST o TU_PASSWORD." -ForegroundColor Red
    Write-Host "Reemplaza esos valores por la cadena real de Neon antes de ejecutar la app." -ForegroundColor Yellow
    exit 1
}

Set-Location $root

$profile = if ($Lan) { "lan" } else { "http" }

dotnet build

if ($ApplyMigrations) {
    dotnet ef database update
}

dotnet run --launch-profile $profile
