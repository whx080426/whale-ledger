$ErrorActionPreference = 'Stop'

# ---------- 路径 ----------
$Root = $PSScriptRoot
$SdkRoot =
    if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT }
    elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME }
    else { 'D:\android-sdk' }

$JavaBin =
    if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin' } else { '' }

$Python =
    if ($env:PYTHON) { $env:PYTHON } else { 'python' }

$Build = Join-Path $Root 'build'

# ---------- 签名（口令只从环境变量读，绝不写进仓库） ----------
$Keystore =
    if ($env:WHALE_KEYSTORE) { $env:WHALE_KEYSTORE }
    else { Join-Path $Root 'whale-release.jks' }
$StorePass = $env:WHALE_KEY_PASS
$Alias =
    if ($env:WHALE_KEY_ALIAS) { $env:WHALE_KEY_ALIAS } else { 'whale' }

if (-not (Test-Path $Keystore)) {
    throw "找不到签名文件：$Keystore`n用 WHALE_KEYSTORE 指定路径，或把它放到 android/ 下（已被 .gitignore 忽略）"
}
if (-not $StorePass) {
    throw '请先设置环境变量 WHALE_KEY_PASS（keystore 口令）'
}

# 取路径里出现的最大版本号，用来挑最新的一套 build-tools
function Get-PathVersion([string]$path) {
    $best = 0.0
    foreach ($m in [regex]::Matches($path, '(\d+)(?:\.(\d+))?')) {
        $major = [double]$m.Groups[1].Value
        $minor = if ($m.Groups[2].Success) { [double]$m.Groups[2].Value / 100 } else { 0 }
        if ($major + $minor -gt $best) { $best = $major + $minor }
    }
    return $best
}

function Find-Tool([string]$Name) {
    $hits = Get-ChildItem $SdkRoot -Recurse -Filter $Name -File -ErrorAction SilentlyContinue
    if (-not $hits) { throw "在 $SdkRoot 下找不到 $Name，检查 ANDROID_SDK_ROOT" }
    return ($hits | Sort-Object @{ Expression = { Get-PathVersion $_.FullName } } -Descending |
        Select-Object -First 1).FullName
}

$aapt2 = Find-Tool 'aapt2.exe'
$zipalign = Find-Tool 'zipalign.exe'
$apksigner = Find-Tool 'apksigner.bat'
$d8 = Find-Tool 'd8.bat'
$androidJar = Find-Tool 'android.jar'

$env:Path = "$JavaBin;" + (Split-Path $aapt2) + ';' + (Split-Path $d8) + ';' + $env:Path

# ---------- 版本号：以 AndroidManifest.xml 为准 ----------
[xml]$manifest = Get-Content (Join-Path $Root 'AndroidManifest.xml') -Encoding UTF8
$Version = $manifest.manifest.versionName
$VersionCode = [int]$manifest.manifest.versionCode

Write-Host "版本 $Version ($VersionCode)"
Write-Host "aapt2     : $aapt2"
Write-Host "d8        : $d8"
Write-Host "android.jar: $androidJar"

Write-Host '--- 1/7 clear ---'
if (Test-Path $Build) { Remove-Item $Build -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Build | Out-Null

Write-Host '--- 2/7 aapt2 compile ---'
& $aapt2 compile --dir (Join-Path $Root 'res') -o (Join-Path $Build 'res.zip')
if ($LASTEXITCODE -ne 0) { throw 'aapt2 compile failed' }

Write-Host '--- 3/7 aapt2 link ---'
& $aapt2 link `
    -o (Join-Path $Build 'base.apk') `
    -I $androidJar `
    --manifest (Join-Path $Root 'AndroidManifest.xml') `
    -R (Join-Path $Build 'res.zip') `
    -A (Join-Path $Root 'assets') `
    --min-sdk-version 24 `
    --target-sdk-version 34 `
    --version-code $VersionCode `
    --version-name $Version `
    --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw 'aapt2 link failed' }

Write-Host '--- 4/7 javac ---'
New-Item -ItemType Directory -Force -Path (Join-Path $Build 'classes') | Out-Null
& javac -encoding UTF-8 --release 11 -nowarn `
    -classpath $androidJar `
    -d (Join-Path $Build 'classes') `
    (Join-Path $Root 'java\com\whale\ledger\MainActivity.java')
if ($LASTEXITCODE -ne 0) { throw 'javac failed' }

Write-Host '--- 5/7 d8 ---'
New-Item -ItemType Directory -Force -Path (Join-Path $Build 'dex') | Out-Null
$classes = Get-ChildItem (Join-Path $Build 'classes') -Recurse -Filter *.class | ForEach-Object { $_.FullName }
& $d8 --lib $androidJar --min-api 24 --output (Join-Path $Build 'dex') @classes
if ($LASTEXITCODE -ne 0) { throw 'd8 failed' }

Write-Host '--- 6/7 repack + align ---'
$withDex = Join-Path $Build 'with-dex.apk'
& $Python (Join-Path $Root 'repack.py') (Join-Path $Build 'base.apk') (Join-Path $Build 'dex\classes.dex') $withDex
if ($LASTEXITCODE -ne 0) { throw 'repack failed' }

& $zipalign -p -f 4 $withDex (Join-Path $Build 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'zipalign failed' }

Write-Host '--- 7/7 sign ---'
$out = Join-Path $Build ("whale-ledger-$Version.apk")
& $apksigner sign `
    --ks $Keystore --ks-key-alias $Alias `
    --ks-pass "pass:$StorePass" --key-pass "pass:$StorePass" `
    --out $out (Join-Path $Build 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'apksigner failed' }

Write-Host '--- verify ---'
& $apksigner verify --print-certs $out

Write-Host ("APK: {0}  ({1} KB)" -f $out, [math]::Round((Get-Item $out).Length / 1KB, 1))
