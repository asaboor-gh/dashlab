param(
    [switch]$DryRun,      # simulate everything without changing
    [string]$GitBranch = "main"
)

$versionFile = "dashlab/_version.py"

if ($DryRun) {
    Write-Host "`n=== DRY RUN: Nothing will be changed ===`n" -ForegroundColor Green
}

# Read current version from _version.py
$currentVersionLine = Get-Content $versionFile | Where-Object { $_ -match '__version__' }
if (-not $currentVersionLine) {
    Write-Error "Could not find __version__ in $versionFile"
    exit 1
}

$match = [regex]::Match($currentVersionLine, '__version__\s*=\s*"(.+)"')

if (-not $match.Success) {
    Write-Error "Failed to parse version from line: $currentVersionLine"
    exit 1
}

$currentVersion = $match.Groups[1].Value
Write-Host "Current version: $currentVersion"

# suggest new version
$parts = $currentVersion.Split('.')
$defaultPatch = [int]$parts[-1] + 1
$defaultVersion = "$($parts[0]).$($parts[1]).$defaultPatch"

$newVersion = Read-Host "Enter new version (press ↲ to use $defaultVersion)"
if (-not $newVersion) { $newVersion = $defaultVersion } else { $newVersion = $newVersion.Trim() }

Write-Host "Bumping version to: $newVersion"

# Update version in _version.py
if (-not $DryRun) {
    if (-not $newVersion -match '^\d+\.\d+\.\d+$') {
        Write-Error "Invalid version format: $newVersion. Expected format: X.Y.Z"
        exit 1
    }
    (Get-Content $versionFile) -replace '__version__\s*=\s*".+"', "__version__ = `"$newVersion`"" |
        Set-Content $versionFile
} else {
    Write-Host "Would update $versionFile to version $newVersion"
}

# Clean old builds
foreach ($dir in @("dist", "build")) {
    if (Test-Path $dir) {
        if (-not $DryRun) { Remove-Item $dir -Recurse -Force }
        else { Write-Host "Would remove $dir" }
    }
}

Get-ChildItem -Recurse -Directory -Filter "*.egg-info" | ForEach-Object {
    if (-not $DryRun) { Remove-Item $_.FullName -Recurse -Force }
    else { Write-Host "Would remove $($_.FullName)" }
}

# Build package
if (-not $DryRun) { 
    python -m build --wheel --sdist --verbose 
} else { 
    Write-Host "Would run python -m build --wheel --sdist --verbose" 
}

# Upload to PyPI
$uploadSucceeded = $false
if (-not $DryRun) {
    twine upload dist/*
    if ($LASTEXITCODE -eq 0) { 
        $uploadSucceeded = $true 
    }
    else {
        Write-Host "`n❌ PyPI upload failed with exit code $LASTEXITCODE"
        exit 1
    }
} else { Write-Host "Would upload with twine"; $uploadSucceeded = $true }

# Git commit & optional tag only if upload succeeded
if ($uploadSucceeded) {

    # Prompt for commit message
    $defaultCommitMsg = "Release v$newVersion"
    $commitMsg = Read-Host "Enter commit message (press ↲ to use '$defaultCommitMsg')"
    if (-not $commitMsg) { $commitMsg = $defaultCommitMsg }

    if (-not $DryRun) {
        git add .
        git commit -m "$commitMsg"

        # Optional tag
        $tagAnswer = Read-Host "Tag release v$newVersion ? (y/N, press ↲ to skip)"
        if ($tagAnswer -match '^(?i)y(?:es)?$') {
            git tag "v$newVersion"
            git push origin "v$newVersion"
            Write-Host "Tagged release v$newVersion"
        }

        git push origin $GitBranch
    } else {
        Write-Host "Would add all changes and commit with message: '$commitMsg'"
        Write-Host "Would ask to tag release v$newVersion"
        Write-Host "Would push branch $GitBranch"
    }
}

if ($DryRun) {
    Write-Host "`n=== DRY RUN COMPLETE: No changes were made ===" -ForegroundColor Green
} else {
    Write-Host "`n✅ Publish complete!"
}
