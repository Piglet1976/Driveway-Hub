# Quick Secret Generation for Windows
# Use this if you need to manually generate new secrets

Write-Host "EMERGENCY SECRET GENERATION" -ForegroundColor Red
Write-Host "Generating new cryptographically secure secrets..." -ForegroundColor Yellow

# Function to generate secure random string
function Generate-SecurePassword {
    param([int]$Length = 32)
    
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    
    # Convert to base64 and clean up
    $base64 = [Convert]::ToBase64String($bytes)
    $cleaned = $base64 -replace '[+/=]', ''
    return $cleaned.Substring(0, [Math]::Min($Length, $cleaned.Length))
}

# Generate new secrets
$newDbPassword = Generate-SecurePassword -Length 32
$newRedisPassword = Generate-SecurePassword -Length 32
$newJwtSecret = Generate-SecurePassword -Length 64

Write-Host ""
Write-Host "NEW SECURE SECRETS GENERATED:" -ForegroundColor Green
Write-Host "Copy these immediately and update your .env.production file" -ForegroundColor Yellow
Write-Host ""

Write-Host "DB_PASSWORD=$newDbPassword" -ForegroundColor White
Write-Host "REDIS_PASSWORD=$newRedisPassword" -ForegroundColor White
Write-Host "JWT_SECRET=$newJwtSecret" -ForegroundColor White

Write-Host ""
Write-Host "MANUAL UPDATE STEPS:" -ForegroundColor Cyan
Write-Host "1. Edit your .env.production file"
Write-Host "2. Replace the DB_PASSWORD, REDIS_PASSWORD, and JWT_SECRET values"
Write-Host "3. Save the file and restart your Docker containers"
Write-Host "4. Test that everything works with the new secrets"

Write-Host ""
Write-Host "RESTART COMMAND:" -ForegroundColor Yellow
Write-Host "docker-compose down && docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d"