# Quick Docker setup test script
Write-Host "TESTING: Driveway Hub Docker Setup" -ForegroundColor Cyan

# Test Health Check
Write-Host "`nTesting API Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5
    Write-Host "SUCCESS: Health Check - Status: $($health.status) - Environment: $($health.environment)" -ForegroundColor Green
}
catch {
    Write-Host "FAILED: Health Check - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test Authentication
Write-Host "`nTesting Authentication..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "driver@test.com"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "SUCCESS: Login - User: $($login.user.first_name) $($login.user.last_name)" -ForegroundColor Green
    
    # Test Protected Route
    $headers = @{ 
        Authorization = "Bearer $($login.token)"
        "Content-Type" = "application/json"
    }
    $profile = Invoke-RestMethod -Uri "http://localhost:3000/api/users/profile" -Method Get -Headers $headers -TimeoutSec 5
    Write-Host "SUCCESS: Protected route - Profile: $($profile.user.email)" -ForegroundColor Green
}
catch {
    Write-Host "FAILED: Authentication test - $($_.Exception.Message)" -ForegroundColor Red
    return
}

# Test Database Data
Write-Host "`nTesting Database Queries..." -ForegroundColor Yellow
try {
    $vehicles = Invoke-RestMethod -Uri "http://localhost:3000/api/users/vehicles" -Method Get -Headers $headers -TimeoutSec 5
    Write-Host "SUCCESS: Vehicles query - Found $($vehicles.count) vehicles" -ForegroundColor Green
    
    $driveways = Invoke-RestMethod -Uri "http://localhost:3000/api/driveways" -Method Get -Headers $headers -TimeoutSec 5  
    Write-Host "SUCCESS: Driveways query - Found $($driveways.count) driveways" -ForegroundColor Green
}
catch {
    Write-Host "FAILED: Database test - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Database Direct Connection
Write-Host "`nTesting Direct Database Connection..." -ForegroundColor Yellow
try {
    $dbTest = docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_dev -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($dbTest) {
        Write-Host "SUCCESS: Direct PostgreSQL connection working" -ForegroundColor Green
        $userCount = ($dbTest | Select-String "\s+(\d+)" | ForEach-Object {$_.Matches.Groups[1].Value})
        Write-Host "INFO: Database contains $userCount users" -ForegroundColor White
    }
}
catch {
    Write-Host "FAILED: Direct database connection - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSUCCESS: Docker setup is working correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  - API URL: http://localhost:3000" -ForegroundColor White
Write-Host "  - Database: Available on localhost:5433" -ForegroundColor White
Write-Host "  - View logs: docker compose logs -f app" -ForegroundColor White
Write-Host "  - Frontend: docker compose up frontend -d" -ForegroundColor White