param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOriginal = Get-Location
$taskApi = $env:VITE_API
$taskPages = $env:GITHUB_PAGES
try {
    if (-not $env:JAVA_HOME) {
        $taskJava = Join-Path $env:USERPROFILE '.jdks\openjdk-21.0.2'
        if (Test-Path -LiteralPath $taskJava) { $env:JAVA_HOME = $taskJava }
    }
    if ($env:JAVA_HOME) { $env:Path = "$env:JAVA_HOME\bin;$env:Path" }
    $taskMaven = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if (-not $taskMaven) {
        $taskMaven = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2\wrapper\dists') -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    }
    if (-not $taskMaven) { throw 'Instale Maven ou inclua mvn.cmd no PATH.' }
    $taskMavenPath = if ($taskMaven.Source) { $taskMaven.Source } else { $taskMaven.FullName }
    Set-Location (Join-Path $taskRoot 'frontend')
    $env:VITE_API = 'http'
    Remove-Item Env:GITHUB_PAGES -ErrorAction SilentlyContinue
    if (-not $SkipInstall) { & npm.cmd ci --prefer-offline; if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências da interface.' } }
    & npm.cmd run lint; if ($LASTEXITCODE -ne 0) { throw 'Lint da interface falhou.' }
    & npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Build da interface falhou.' }
    Set-Location (Join-Path $taskRoot 'backend')
    & $taskMavenPath -B -ntp clean verify
    if ($LASTEXITCODE -ne 0) { throw 'Verificação do backend falhou. O executável não foi validado.' }
    Write-Host 'Executável: backend/target/plataforma-testes-0.1.0-SNAPSHOT.jar'
    Write-Host 'Inicie de backend: java -jar target/plataforma-testes-0.1.0-SNAPSHOT.jar'
} finally {
    $env:VITE_API = $taskApi
    $env:GITHUB_PAGES = $taskPages
    Set-Location $taskOriginal
}
