
function Update-Version {
    param (
        [string]$newVersion
    )

    Write-Host "🔧 Updating version to $newVersion..."

    # Update __init__.py
    $initPath = "dashlab\__init__.py"
    if (Test-Path $initPath) {
        (Get-Content $initPath) |
            ForEach-Object { $_ -replace '__version__ = ".*"', "__version__ = `"$newVersion`"" } |
            Set-Content $initPath
    } else {
        Set-Content $initPath "__version__ = `"$newVersion`""
    }

    # Update pyproject.toml
    $pyprojectPath = "pyproject.toml"
    (Get-Content $pyprojectPath) |
        ForEach-Object { $_ -replace 'version = ".*"', "version = `"$newVersion`"" } |
        Set-Content $pyprojectPath
}

# Detect current version from pyproject.toml
$pyprojectPath = "pyproject.toml"
$currentVersion = (Get-Content $pyprojectPath | Select-String 'version = "(.+)"').Matches.Groups[1].Value

Write-Host "📦 Current version is $currentVersion"
Write-Host "➡️  Enter new version (e.g. 0.1.2):"
$newVersion = Read-Host

# Update version in files
Update-Version -newVersion $newVersion

# Clean previous build artifacts
Write-Host "🧹 Cleaning old build artifacts..."
foreach ($dir in @("dist", "build")) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir
    }
}
Get-ChildItem -Recurse -Directory -Filter *.egg-info | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
}

# Build new distributions
Write-Host "🚧 Building distributions for DashLab $newVersion..."
python -m build --wheel --sdist --verbose

# Validate metadata
Write-Host "🔍 Validating metadata..."
twine check dist/*

# Upload to PyPI
Write-Host "🚀 Uploading to PyPI..."
twine upload dist/*

Write-Host "✅ DashLab $newVersion published. Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")