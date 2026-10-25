# Remove Aloi for the current user.
#
#   .\uninstall.ps1            removes the program; your settings, portfolio and watchlist stay
#   .\uninstall.ps1 -Purge     also removes ~\.aloi (the saved API key stays in Credential Manager;
#                              remove "aloi" there if you want it gone too)

param([switch]$Purge)

$ErrorActionPreference = "Stop"
$target = Join-Path $env:LOCALAPPDATA "Programs\Aloi"

if (Get-Process -Name aloi -ErrorAction SilentlyContinue) { throw "Aloi is running. Close it (type /exit) first." }
if (Test-Path $target) { Remove-Item $target -Recurse -Force }

$path = [Environment]::GetEnvironmentVariable("Path", "User")
$kept = ($path -split ";") | Where-Object { $_ -and $_ -ne $target }
[Environment]::SetEnvironmentVariable("Path", ($kept -join ";"), "User")

if ($Purge) {
    $state = Join-Path $HOME ".aloi"
    if (Test-Path $state) { Remove-Item $state -Recurse -Force }
}
Write-Host "Aloi is removed." -ForegroundColor Green
