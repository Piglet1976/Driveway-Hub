# PowerShell script to test Driveway Hub Docker setup
# Usage: .\scripts\test-docker.ps1

param(
    [string]$Environment = "development"
)

Write-Host "🚀 Testing Driveway Hub Docker Setup - Environment: $Environment" -ForegroundColor Cyan

# Function to test if a URL is responding
function Test-UrlResponse {
    param([string]$Url, [string]$ServiceName)
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
        Write-Host "✅ $ServiceName is responding at $Url" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $ServiceName is not responding at $Url - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Step 1: Check Docker is running
Write-Host "`n🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Step 2: Stop any existing containers
Write-Host "`n🛑 Stopping existing containers..." -ForegroundColor Yellow
docker compose down

# Step 3: Start services
Write-Host "`n🚀 Starting Docker services..." -ForegroundColor Yellow
if ($Environment -eq "development") {
    docker compose --env-file .env.development up --build -d
}
else {
    docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up --build -d
}

# Step 4: Wait for services to start
Write-Host "`n⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 5: Check container status
Write-Host "`n📦 Container Status:" -ForegroundColor Yellow
docker compose ps

# Step 6: Check service health
Write-Host "`n🏥 Health Check Results:" -ForegroundColor Yellow

# Test PostgreSQL
Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Cyan
try {
    $pgResult = docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_dev -c "SELECT 'PostgreSQL Connected' as status;" 2>$null
    if ($pgResult) {
        Write-Host "✅ PostgreSQL is accessible" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ PostgreSQL connection failed" -ForegroundColor Red
}

# Test Redis
Write-Host "`nTesting Redis connection..." -ForegroundColor Cyan
try {
    $redisResult = docker exec driveway-hub-redis redis-cli ping 2>$null
    if ($redisResult -eq "PONG") {
        Write-Host "✅ Redis is responding" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Redis connection failed" -ForegroundColor Red
}

# Test API endpoints
Write-Host "`n🌐 Testing API endpoints..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

$apiTests = @(
    @{ Url = "http://localhost:3000/api/health"; Name = "Health Check" }
)

foreach ($test in $apiTests) {
    Test-UrlResponse -Url $test.Url -ServiceName $test.Name
}

# Test database connection with actual data
Write-Host "`n💾 Testing database with real data..." -ForegroundColor Cyan
try {
    $userCount = docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_dev -t -c "SELECT COUNT(*) FROM users;" 2>$null
    if ($userCount) {
        Write-Host "✅ Database has $($userCount.Trim()) users" -ForegroundColor Green
    }
    
    $drivewayCount = docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_dev -t -c "SELECT COUNT(*) FROM driveways;" 2>$null
    if ($drivewayCount) {
        Write-Host "✅ Database has $($drivewayCount.Trim()) driveways" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Database query failed" -ForegroundColor Red
}

# Test API with authentication
Write-Host "`n🔐 Testing API authentication..." -ForegroundColor Cyan
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"email":"driver@test.com"}' -ContentType "application/json" -TimeoutSec 10
    if ($loginResponse.token) {
        Write-Host "✅ Authentication endpoint working - Token received" -ForegroundColor Green
        
        # Test protected endpoint
        $headers = @{ Authorization = "Bearer $($loginResponse.token)" }
        $profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/users/profile" -Method Get -Headers $headers -TimeoutSec 10
        if ($profileResponse.user) {
            Write-Host "✅ Protected endpoint working - Profile data received" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "❌ Authentication test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Display logs if there are issues
$unhealthyContainers = docker compose ps --filter "status=unhealthy" --format "table {{.Service}}"
if ($unhealthyContainers) {
    Write-Host "`n⚠️  Unhealthy containers detected. Showing recent logs:" -ForegroundColor Yellow
    docker compose logs --tail=20
}

# Final summary
Write-Host "`n📋 Test Summary:" -ForegroundColor Cyan
Write-Host "🔗 API URL: http://localhost:3000" -ForegroundColor White
Write-Host "🎨 Frontend URL: http://localhost:3001" -ForegroundColor White
Write-Host "🗄️  Database: localhost:5433 (external)" -ForegroundColor White
Write-Host "📊 Redis: localhost:6379 (external)" -ForegroundColor White

Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
Write-Host "   • Visit http://localhost:3001 to test the frontend" -ForegroundColor White
Write-Host "   • Check logs: docker compose logs -f [service-name]" -ForegroundColor White
Write-Host "   • Stop services: docker compose down" -ForegroundColor White

Write-Host "`n🎉 Docker setup test completed!" -ForegroundColor Green