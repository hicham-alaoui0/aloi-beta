# Install Aloi for the current user. No administrator rights needed.
#
#   From the web:    irm https://hicham-alaoui0.github.io/aloi-beta/install.ps1 | iex
#   From a file:     powershell -ExecutionPolicy Bypass -File install.ps1 -Source C:\path\to\aloi-windows-x64.zip
#
# It unpacks the program to %LOCALAPPDATA%\Programs\Aloi and adds that folder to your PATH,
# so that typing `aloi` in any new terminal starts it. Your settings live in ~\.aloi and are
# left alone by installs and updates.

param(
    # A .zip on this machine or at a URL. The default is the latest release on GitHub.
    [string]$Source = $(if ($env:ALOI_DOWNLOAD_URL) { $env:ALOI_DOWNLOAD_URL } else { "https://github.com/hicham-alaoui0/aloi-beta/releases/latest/download/aloi-windows-x64.zip" })
)

# Everything runs in its own scope, so nothing here changes the terminal it is pasted into.
& {
    param([string]$Source)
    $ErrorActionPreference = "Stop"
    $ProgressPreference = "SilentlyContinue"  # the progress bar makes downloads many times slower
    $target = Join-Path $env:LOCALAPPDATA "Programs\Aloi"
    $work = Join-Path ([IO.Path]::GetTempPath()) ("aloi-install-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $work | Out-Null

    try {
        if ($Source -match "^https?://") {
            if ($Source -match "YOUR-HOST") { throw "No download address is set. Pass -Source with the path or URL of the Aloi zip." }
            Write-Host "Downloading Aloi..."
            $zip = Join-Path $work "aloi.zip"
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $Source -OutFile $zip -UseBasicParsing
        } else {
            $zip = (Resolve-Path $Source).Path
        }

        Write-Host "Unpacking..."
        Expand-Archive -Path $zip -DestinationPath $work -Force
        $unpacked = Join-Path $work "aloi"
        if (-not (Test-Path (Join-Path $unpacked "aloi.exe"))) { throw "This archive does not contain Aloi." }

        if (Get-Process -Name aloi -ErrorAction SilentlyContinue) { throw "Aloi is running. Close it (type /exit) and run the installer again." }
        if (Test-Path $target) { Remove-Item $target -Recurse -Force }
        New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
        Move-Item $unpacked $target

        # Add the folder to this user's PATH, once.
        $path = [string][Environment]::GetEnvironmentVariable("Path", "User")
        if (($path -split ";") -notcontains $target) {
            [Environment]::SetEnvironmentVariable("Path", (($path.TrimEnd(";") + ";" + $target).TrimStart(";")), "User")
        }
        if (($env:Path -split ";") -notcontains $target) { $env:Path += ";$target" }

        $version = & (Join-Path $target "aloi.exe") --version
        Write-Host ""
        Write-Host "Installed $version in $target" -ForegroundColor Green
        Write-Host "Type  aloi  to start. Terminals that were already open need reopening first."
    } finally {
        Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
    }
} $Source
