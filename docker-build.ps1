# Docker Build Helper Script
# Reads .env file and passes environment variables as build args

Write-Host "🐳 Starting Docker Build with environment variables..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your environment variables." -ForegroundColor Yellow
    exit 1
}

# Read .env file and build args string
Write-Host "📄 Reading .env file..." -ForegroundColor Yellow
$buildArgs = @()

Get-Content .env | ForEach-Object {
    $line = $_.Trim()
    
    # Skip comments and empty lines
    if ($line -and -not $line.StartsWith("#")) {
        # Split on first = only
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            
            # Add to build args
            $buildArgs += "--build-arg"
            $buildArgs += "$key=$value"
            
            Write-Host "  ✓ $key" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
Write-Host "   Image: comp-act-diary:latest" -ForegroundColor Gray
Write-Host ""

# Execute docker build with all build args
$command = "docker build -t comp-act-diary:latest " + ($buildArgs -join ' ') + " ."

# Execute
Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Docker build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Image info:" -ForegroundColor Yellow
    docker images comp-act-diary:latest
    Write-Host ""
    Write-Host "🚀 To run the container:" -ForegroundColor Cyan
    Write-Host "   docker run -p 3000:3000 --env-file .env comp-act-diary:latest" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    exit 1
}
