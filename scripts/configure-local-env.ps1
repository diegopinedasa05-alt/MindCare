$ErrorActionPreference = "Stop"

$localEnv =
    Join-Path $PSScriptRoot "mindcare-env.local.ps1"

function New-Secret {
    param([int] $ByteLength = 48)

    $bytes = New-Object byte[] $ByteLength
    $rng =
        [System.Security.Cryptography.RandomNumberGenerator]::Create()

    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }

    [Convert]::ToBase64String($bytes)
}

function ConvertTo-PlainText {
    param([SecureString] $Value)

    $credential =
        New-Object System.Net.NetworkCredential("", $Value)

    $credential.Password
}

Write-Host "Configuracion local de MindCare" -ForegroundColor Cyan
Write-Host "Pega la cadena DATABASE_URL de Neon. No se mostrara mientras escribes." -ForegroundColor Yellow

$databaseUrlSecure =
    Read-Host "DATABASE_URL" -AsSecureString

$databaseUrl =
    ConvertTo-PlainText $databaseUrlSecure

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    Write-Host "DATABASE_URL no puede estar vacio." -ForegroundColor Red
    exit 1
}

if ($databaseUrl -notmatch "^postgres(ql)?://") {
    Write-Host "La cadena debe iniciar con postgresql:// o postgres://" -ForegroundColor Red
    exit 1
}

if ($databaseUrl -notmatch "sslmode=require") {
    Write-Host "Advertencia: Neon normalmente requiere sslmode=require." -ForegroundColor Yellow
}

$jwtKey =
    New-Secret

$setupKey =
    New-Secret

$content = @"
# Archivo local privado generado por scripts\configure-local-env.ps1.
# No subas este archivo a GitHub.

`$env:DATABASE_URL = "$databaseUrl"
`$env:JWT_KEY = "$jwtKey"
`$env:MINDCARE_SETUP_KEY = "$setupKey"
`$env:ASPNETCORE_ENVIRONMENT = "Development"
"@

Set-Content -LiteralPath $localEnv -Value $content -Encoding UTF8

Write-Host "Archivo creado: scripts\mindcare-env.local.ps1" -ForegroundColor Green
Write-Host "Tambien se generaron JWT_KEY y MINDCARE_SETUP_KEY privadas." -ForegroundColor Green
Write-Host "Siguiente paso: .\scripts\run-local.ps1" -ForegroundColor Cyan
