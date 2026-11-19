# КТ84-А · Публикуване на проверения оригинален ГИС архив.
# PowerShell 3+ / Windows 8+. Requires local Git checkout and git push access.
# Usage:
# powershell -ExecutionPolicy Bypass -File .\kt80\tools\Publish-KT84-GIS.ps1 -ArchivePath "C:\...\V26_HOSTED_GIS_SHARDS_READY_2026-10-27.zip" -RepoPath "C:\...\TPU-Plovdiv-WOW-2.0"
# Add -Publish only after verifying the printed report and on the isolated branch.
param(
 [Parameter(Mandatory=$true)][string]$ArchivePath,
 [Parameter(Mandatory=$true)][string]$RepoPath,
 [switch]$Publish
)
$ErrorActionPreference='Stop'
$expectedSHA='157ac2f9024d2e3ff12ca2bffbd5fc65606ecb93545796cb04870adb9bd49289'
$branch='kt83-vt01-automatic-route-p1'
$ArchivePath=[IO.Path]::GetFullPath($ArchivePath)
$RepoPath=[IO.Path]::GetFullPath($RepoPath)
if(!(Test-Path -LiteralPath $ArchivePath -PathType Leaf)){throw "Липсва избраният архив: $ArchivePath"}
if(!(Test-Path -LiteralPath (Join-Path $RepoPath '.git'))){throw "Не е открито локално Git хранилище: $RepoPath"}
$sha=[Security.Cryptography.SHA256]::Create()
$stream=[IO.File]::OpenRead($ArchivePath)
try{$digest=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose();$sha.Dispose()}
if($digest -ne $expectedSHA){throw "Контролната сума на ГИС архива не съвпада с проверения източник. Получена: $digest"}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($ArchivePath)
try{
 $all=@($zip.Entries | Where-Object {$_.Name -ne ''})
 $shards=@($all | Where-Object {$_.FullName -match '^(parcels|parcelgeom|overlays|overlapgeom)_\d{2}\.json\.gz$'})
 if($all.Count -ne 259 -or $shards.Count -ne 258){throw 'Невалиден набор: очакват се manifest.json и 258 пространствени сегмента.'}
 if(-not ($all | Where-Object {$_.FullName -eq 'manifest.json'})){throw 'Липсва manifest.json'}
 if(@($shards | Select-Object -ExpandProperty FullName -Unique).Count -ne 258){throw 'Дублирани ГИС сегменти.'}
 foreach($entry in $all){if($entry.FullName -match '\.\.|^/|^[A-Za-z]:'){throw "Небезопасен път в ZIP: $($entry.FullName)"}}
 $manifestEntry=$all | Where-Object {$_.FullName -eq 'manifest.json'} | Select-Object -First 1
 $reader=New-Object IO.StreamReader($manifestEntry.Open())
 try{$manifest=$reader.ReadToEnd() | ConvertFrom-Json}finally{$reader.Dispose()}
 if($manifest.status -ne 'PASS_COUNT_BY_PREFIX' -or $manifest.shards -ne 258 -or $manifest.parcel_geometry -ne 917418 -or $manifest.overlap_records_expected -ne 181154){throw 'Невалидни контролни стойности в манифеста.'}
}finally{$zip.Dispose()}
Write-Host 'КТ84-А: контролна сума SHA256 — ПОТВЪРДЕНА.'
Write-Host 'ГИС набор: 258 сегмента / 917418 геометрии / 181154 пресичания.'
Write-Host ('Целеви клон: '+$branch)
if(-not $Publish){
 Write-Host 'РЕЖИМ ПРОВЕРКА: Нищо не е променено или публикувано.'
 Write-Host 'За публикуване стартирайте отново с параметъра -Publish.'
 exit 0
}
Push-Location $RepoPath
$tmp=Join-Path ([IO.Path]::GetTempPath()) ('kt84-gis-'+[Guid]::NewGuid().ToString('N'))
try{
 $current=(& git branch --show-current).Trim()
 if($LASTEXITCODE -ne 0 -or $current -ne $branch){throw "Публикуване е допустимо само в изолирания клон $branch. Текущ: $current"}
 $changes=(& git status --porcelain)
 if($LASTEXITCODE -ne 0 -or @($changes).Count -ne 0){throw 'Хранилището има незаписани промени. Публикуването е спряно за защита на работата.'}
 [IO.Compression.ZipFile]::ExtractToDirectory($ArchivePath,$tmp)
 $destination=Join-Path $RepoPath 'v26-test\gis-data'
 if(!(Test-Path -LiteralPath $destination)){[void](New-Item -ItemType Directory -Path $destination -Force)}
 Copy-Item -Path (Join-Path $tmp '*') -Destination $destination -Force
 & git add -- v26-test/gis-data
 if($LASTEXITCODE -ne 0){throw 'Неуспешно добавяне на ГИС сегментите.'}
 & git commit -m 'KT84-A: restore verified 258-part GIS geometry and overlay archive'
 if($LASTEXITCODE -ne 0){throw 'Git commit не е извършен; проверете статуса на файловете.'}
 & git push origin $branch
 if($LASTEXITCODE -ne 0){throw 'Git push е неуспешен. Локалният commit е запазен; не повтаряйте на сляпо.'}
 Write-Host 'ПУБЛИКУВАНО: пълният оригинален ГИС набор е изпратен в изолирания клон.'
}finally{
 if(Test-Path -LiteralPath $tmp){Remove-Item -LiteralPath $tmp -Recurse -Force}
 Pop-Location
}
