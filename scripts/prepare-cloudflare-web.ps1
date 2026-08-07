param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$ApiOrigin,

    [string]$OutputDirectory = "..\artifacts\cloudflare-web"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "wwwroot"
$destination = Join-Path $projectRoot $OutputDirectory

if (Test-Path $destination) {
    throw "La carpeta de salida ya existe: $destination. Indica otra con -OutputDirectory."
}

New-Item -ItemType Directory -Path $destination | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse

$configPath = Join-Path $destination "js\config.js"
$apiBase = "$($ApiOrigin.TrimEnd('/'))/api"
$override = "window.MINDCARE_API_BASE = `"$apiBase`";`r`n`r`n"
$config = Get-Content -Path $configPath -Raw
Set-Content -Path $configPath -Value ($override + $config) -Encoding utf8

Write-Host "Frontend listo para Cloudflare Pages: $destination" -ForegroundColor Green
Write-Host "API configurada: $apiBase" -ForegroundColor Cyan
