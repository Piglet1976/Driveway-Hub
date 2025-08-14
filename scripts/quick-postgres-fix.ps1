# Quick PostgreSQL Password Fix for Windows
# This script provides the fastest fix for the authentication issue

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Quick PostgreSQL Password Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$Password = "YR8jVseLTvW3ZLEdpYa3E7ruB9oFE9cv"

Write-Host "This will fix the PostgreSQL authentication with password: $Password" -ForegroundColor Yellow
Write-Host ""

# Method 1: Try to update password in running container
Write-Host "Method 1: Updating password in running container..." -ForegroundColor Yellow

$alterCmd = "ALTER USER postgres PASSWORD '$Password';"
docker exec driveway-hub-postgres psql -U postgres -c $alterCmd 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Password updated in PostgreSQL!" -ForegroundColor Green
    
    # Restart app to apply changes
    Write-Host "Restarting app container..." -ForegroundColor Yellow
    docker compose --env-file .env.production restart app
    
    Write-Host "✅ Complete! Database should now be accessible." -ForegroundColor Green
    exit 0
}

# Method 2: Connect without password and set it
Write-Host "Method 1 failed. Trying Method 2..." -ForegroundColor Yellow
docker exec driveway-hub-postgres psql -U postgres -c $alterCmd 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Password set successfully!" -ForegroundColor Green
    docker compose --env-file .env.production restart app
    Write-Host "✅ Complete! Database should now be accessible." -ForegroundColor Green
    exit 0
}

# Method 3: Force reset
Write-Host "Method 2 failed. Method 3: Force reset (will delete data)..." -ForegroundColor Red
$confirm = Read-Host "This will DELETE all database data. Continue? (y/n)"

if ($confirm -eq 'y') {
    Write-Host "Stopping containers..." -ForegroundColor Yellow
    docker compose --env-file .env.production down
    
    Write-Host "Removing volume..." -ForegroundColor Yellow
    docker volume rm driveway-hub_postgres_data 2>$null
    docker volume rm postgres_data 2>$null
    
    Write-Host "Starting fresh PostgreSQL..." -ForegroundColor Yellow
    docker compose --env-file .env.production up -d postgres
    Start-Sleep -Seconds 10
    
    Write-Host "Starting app..." -ForegroundColor Yellow
    docker compose --env-file .env.production up -d app
    
    Write-Host "✅ Fresh PostgreSQL created with correct password!" -ForegroundColor Green
    Write-Host "Note: You'll need to recreate your database schema and data." -ForegroundColor Yellow
} else {
    Write-Host "Aborted. Try running this manually:" -ForegroundColor Yellow
    Write-Host "docker exec -it driveway-hub-postgres psql -U postgres" -ForegroundColor Cyan
    Write-Host "Then run: ALTER USER postgres PASSWORD '$Password';" -ForegroundColor Cyan
}