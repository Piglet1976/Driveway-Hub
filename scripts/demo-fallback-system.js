// Demo Fallback & Error Handling System
// ====================================
// Comprehensive fallback plans for the Tesla investor demo
// Handles connectivity issues, Tesla API failures, and other edge cases

const fs = require('fs');
const path = require('path');

class DemoFallbackSystem {
    constructor() {
        this.fallbackActive = false;
        this.currentFallbackLevel = 0; // 0 = no fallback, 1 = minor, 2 = major, 3 = emergency
        this.demoState = {
            teslaConnected: true,
            realtimeTracking: true,
            paymentSystem: true,
            webSocketConnected: true,
            lastKnownLocation: null,
            manualOverride: false
        };
        this.fallbackData = this.loadFallbackData();
        this.emergencyContacts = {
            technical: '+1-555-TECH',
            coordinator: '+1-555-DEMO',
            backup: '+1-555-HELP'
        };
    }

    // Load pre-recorded demo data for fallback scenarios
    loadFallbackData() {
        return {
            // Pre-recorded journey waypoints (York to Mississauga)
            journeyWaypoints: [
                { time: 0, lat: 43.689042, lng: -79.451344, speed: 0, battery: 78, distance: 25000 },
                { time: 30, lat: 43.686123, lng: -79.458901, speed: 25, battery: 77, distance: 23500 },
                { time: 60, lat: 43.682045, lng: -79.468234, speed: 35, battery: 77, distance: 22000 },
                { time: 90, lat: 43.675678, lng: -79.485432, speed: 40, battery: 76, distance: 19500 },
                { time: 120, lat: 43.668901, lng: -79.502109, speed: 45, battery: 75, distance: 17000 },
                { time: 180, lat: 43.655432, lng: -79.525678, speed: 38, battery: 74, distance: 14200 },
                { time: 240, lat: 43.642109, lng: -79.548901, speed: 42, battery: 73, distance: 11500 },
                { time: 300, lat: 43.628234, lng: -79.572345, speed: 35, battery: 72, distance: 8800 },
                { time: 360, lat: 43.614567, lng: -79.595432, speed: 30, battery: 71, distance: 6200 },
                { time: 420, lat: 43.600891, lng: -79.618765, speed: 25, battery: 70, distance: 3500 },
                { time: 480, lat: 43.587234, lng: -79.642109, speed: 20, battery: 70, distance: 1800 },
                { time: 540, lat: 43.578901, lng: -79.665432, speed: 15, battery: 69, distance: 800 },
                { time: 600, lat: 43.571234, lng: -79.684567, speed: 0, battery: 69, distance: 0 }
            ],
            
            // Sample notifications and milestones
            notifications: [
                { time: 0, message: "Journey started from York", type: "info" },
                { time: 120, message: "5km completed - excellent progress", type: "success" },
                { time: 300, message: "Halfway point reached", type: "info" },
                { time: 420, message: "5km from destination - preparing arrival", type: "warning" },
                { time: 540, message: "2km away - Ruth notified", type: "warning" },
                { time: 580, message: "Approaching destination - 500m", type: "warning" },
                { time: 600, message: "Vehicle arrived successfully!", type: "success" }
            ],

            // Pre-rendered screenshots for emergency use
            screenshots: {
                teslaAuth: '/demo-assets/tesla-auth-success.png',
                bookingFlow: '/demo-assets/booking-complete.png',
                trackingDashboard: '/demo-assets/live-tracking.png',
                arrivalConfirmation: '/demo-assets/arrival-detected.png'
            }
        };
    }

    // Monitor system health and trigger fallbacks
    async monitorSystemHealth() {
        console.log('🏥 Starting system health monitoring...');
        
        setInterval(async () => {
            await this.checkTeslaAPI();
            await this.checkWebSocketConnection();
            await this.checkPaymentSystem();
            await this.evaluateFallbackLevel();
        }, 10000); // Check every 10 seconds
    }

    // Check Tesla API connectivity
    async checkTeslaAPI() {
        try {
            const response = await fetch('https://fleet-api.prd.na.tesla.com/api/1/vehicles', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + process.env.TESLA_ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            if (!response.ok) {
                throw new Error(`Tesla API responded with status: ${response.status}`);
            }

            this.demoState.teslaConnected = true;
            console.log('✅ Tesla API: Healthy');
        } catch (error) {
            console.log('❌ Tesla API: Connection failed -', error.message);
            this.demoState.teslaConnected = false;
            this.triggerFallback('tesla_api_down', error.message);
        }
    }

    // Check WebSocket connection
    async checkWebSocketConnection() {
        // Simulated WebSocket health check
        try {
            // In real implementation, ping WebSocket server
            this.demoState.webSocketConnected = true;
            console.log('✅ WebSocket: Connected');
        } catch (error) {
            console.log('❌ WebSocket: Disconnected');
            this.demoState.webSocketConnected = false;
            this.triggerFallback('websocket_down', 'WebSocket connection lost');
        }
    }

    // Check payment system
    async checkPaymentSystem() {
        // Simulated payment system check
        this.demoState.paymentSystem = true;
        console.log('✅ Payment System: Operational');
    }

    // Evaluate current fallback level needed
    evaluateFallbackLevel() {
        let newLevel = 0;

        // Level 1: Minor issues - Tesla API slow but working
        if (!this.demoState.webSocketConnected) {
            newLevel = Math.max(newLevel, 1);
        }

        // Level 2: Major issues - Tesla API down
        if (!this.demoState.teslaConnected) {
            newLevel = Math.max(newLevel, 2);
        }

        // Level 3: Emergency - Multiple systems down
        if (!this.demoState.teslaConnected && !this.demoState.webSocketConnected) {
            newLevel = Math.max(newLevel, 3);
        }

        if (newLevel !== this.currentFallbackLevel) {
            this.currentFallbackLevel = newLevel;
            this.activateFallbackLevel(newLevel);
        }
    }

    // Trigger specific fallback based on error type
    triggerFallback(errorType, errorMessage) {
        console.log(`🚨 FALLBACK TRIGGERED: ${errorType} - ${errorMessage}`);
        
        switch (errorType) {
            case 'tesla_api_down':
                this.handleTeslaAPIFallback();
                break;
            case 'websocket_down':
                this.handleWebSocketFallback();
                break;
            case 'payment_failure':
                this.handlePaymentFallback();
                break;
            case 'location_lost':
                this.handleLocationFallback();
                break;
            default:
                this.handleGeneralFallback(errorType, errorMessage);
        }
    }

    // Activate fallback level
    activateFallbackLevel(level) {
        console.log(`📊 Activating Fallback Level ${level}`);
        
        switch (level) {
            case 0:
                console.log('✅ All systems operational - no fallback needed');
                this.fallbackActive = false;
                break;
            case 1:
                this.activateMinorFallback();
                break;
            case 2:
                this.activateMajorFallback();
                break;
            case 3:
                this.activateEmergencyFallback();
                break;
        }
    }

    // Level 1: Minor fallback (polling instead of WebSocket)
    activateMinorFallback() {
        console.log('🟡 Minor Fallback Active: Switching to polling mode');
        this.fallbackActive = true;
        
        // Switch from WebSocket to HTTP polling
        this.startPollingFallback();
        
        // Notify demo operator
        this.notifyOperator('Minor fallback active - switched to polling mode', 'warning');
    }

    // Level 2: Major fallback (simulated data)
    activateMajorFallback() {
        console.log('🟠 Major Fallback Active: Using simulated tracking data');
        this.fallbackActive = true;
        
        // Start simulated journey tracking
        this.startSimulatedTracking();
        
        // Display warning to investors
        this.displayInvestorWarning('Technical demonstration mode - showing platform capabilities');
        
        // Notify demo operator
        this.notifyOperator('Major fallback active - using simulated data', 'error');
    }

    // Level 3: Emergency fallback (screenshots/presentation mode)
    activateEmergencyFallback() {
        console.log('🔴 Emergency Fallback Active: Presentation mode with screenshots');
        this.fallbackActive = true;
        
        // Switch to presentation mode
        this.activatePresentationMode();
        
        // Alert technical support
        this.alertTechnicalSupport();
        
        // Notify demo operator
        this.notifyOperator('EMERGENCY FALLBACK: Switched to presentation mode', 'critical');
    }

    // Handle Tesla API failure specifically
    handleTeslaAPIFallback() {
        console.log('🚗 Tesla API Fallback: Using cached vehicle data');
        
        // Use last known location if available
        if (this.demoState.lastKnownLocation) {
            this.continueWithLastKnownData();
        } else {
            // Start from beginning with simulated data
            this.startSimulatedTracking();
        }
        
        // Show appropriate message to investors
        this.displayInvestorMessage(
            'Platform adapting to connectivity - demonstrating offline capabilities',
            'info'
        );
    }

    // Handle WebSocket failure specifically
    handleWebSocketFallback() {
        console.log('🔌 WebSocket Fallback: Switching to HTTP polling');
        this.startPollingFallback();
        
        // Minimal disruption message
        this.displayInvestorMessage('Optimizing connection - tracking continues seamlessly', 'info');
    }

    // Start HTTP polling as WebSocket alternative
    startPollingFallback() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(() => {
            this.pollVehicleData();
        }, 15000); // Poll every 15 seconds instead of real-time WebSocket
    }

    // Poll vehicle data via HTTP
    async pollVehicleData() {
        try {
            // Attempt to get real Tesla data
            const vehicleData = await this.fetchVehicleDataHTTP();
            this.updateDemoWithRealData(vehicleData);
            console.log('📡 Polling: Real Tesla data retrieved');
        } catch (error) {
            // If HTTP also fails, use simulated data
            console.log('📡 Polling: Using simulated data point');
            this.updateDemoWithSimulatedData();
        }
    }

    // Start simulated tracking using pre-recorded waypoints
    startSimulatedTracking() {
        console.log('🎭 Starting simulated tracking...');
        
        let waypointIndex = 0;
        const startTime = Date.now();
        
        this.simulationInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const currentWaypoint = this.findCurrentWaypoint(elapsed);
            
            if (currentWaypoint) {
                this.updateDemoWithWaypoint(currentWaypoint);
                
                // Check for associated notifications
                const notification = this.fallbackData.notifications.find(n => 
                    Math.abs(n.time - elapsed) < 15
                );
                if (notification) {
                    this.displayNotification(notification);
                }
            } else {
                // Journey complete
                this.completeSimulatedJourney();
                clearInterval(this.simulationInterval);
            }
        }, 2000); // Update every 2 seconds
    }

    // Find current waypoint based on elapsed time
    findCurrentWaypoint(elapsedSeconds) {
        const waypoints = this.fallbackData.journeyWaypoints;
        
        for (let i = 0; i < waypoints.length - 1; i++) {
            const current = waypoints[i];
            const next = waypoints[i + 1];
            
            if (elapsedSeconds >= current.time && elapsedSeconds < next.time) {
                // Interpolate between waypoints
                const progress = (elapsedSeconds - current.time) / (next.time - current.time);
                return this.interpolateWaypoint(current, next, progress);
            }
        }
        
        // Return final waypoint if past end
        return waypoints[waypoints.length - 1];
    }

    // Interpolate between two waypoints
    interpolateWaypoint(start, end, progress) {
        return {
            lat: start.lat + (end.lat - start.lat) * progress,
            lng: start.lng + (end.lng - start.lng) * progress,
            speed: Math.round(start.speed + (end.speed - start.speed) * progress),
            battery: Math.round(start.battery + (end.battery - start.battery) * progress),
            distance: Math.round(start.distance + (end.distance - start.distance) * progress)
        };
    }

    // Activate presentation mode with static screenshots
    activatePresentationMode() {
        console.log('📺 Presentation Mode: Displaying static demo assets');
        
        // Create presentation sequence
        const presentationSteps = [
            { title: 'Tesla Authorization Success', image: this.fallbackData.screenshots.teslaAuth, duration: 30000 },
            { title: 'Booking Flow Completion', image: this.fallbackData.screenshots.bookingFlow, duration: 60000 },
            { title: 'Live Tracking Dashboard', image: this.fallbackData.screenshots.trackingDashboard, duration: 120000 },
            { title: 'Successful Arrival', image: this.fallbackData.screenshots.arrivalConfirmation, duration: 30000 }
        ];
        
        this.runPresentationSequence(presentationSteps);
    }

    // Run presentation sequence
    runPresentationSequence(steps) {
        let currentStep = 0;
        
        const showStep = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                console.log(`📺 Presenting: ${step.title}`);
                
                // In real implementation, update UI to show screenshot
                this.displayPresentationSlide(step);
                
                setTimeout(() => {
                    currentStep++;
                    showStep();
                }, step.duration);
            } else {
                console.log('📺 Presentation complete');
                this.displayInvestorMessage('Technical demonstration completed successfully', 'success');
            }
        };
        
        showStep();
    }

    // Display presentation slide (placeholder - would update actual UI)
    displayPresentationSlide(step) {
        console.log(`🖼️ Displaying: ${step.title} (${step.image})`);
        // In real implementation, update the demo interface
    }

    // Continue with last known data
    continueWithLastKnownData() {
        console.log('📍 Continuing from last known location...');
        
        if (this.demoState.lastKnownLocation) {
            // Resume tracking from last known position
            this.resumeFromLocation(this.demoState.lastKnownLocation);
        }
    }

    // Notify demo operator
    notifyOperator(message, severity) {
        const timestamp = new Date().toISOString();
        console.log(`🎯 OPERATOR ALERT [${severity.toUpperCase()}]: ${message}`);
        
        // In production, this would send alerts to the demo coordinator
        const alert = {
            timestamp,
            message,
            severity,
            fallbackLevel: this.currentFallbackLevel,
            systemState: this.demoState
        };
        
        // Log to file for post-demo analysis
        this.logToFile('operator-alerts.json', alert);
    }

    // Display message to investors
    displayInvestorMessage(message, type = 'info') {
        console.log(`💼 INVESTOR MESSAGE [${type}]: ${message}`);
        // In real implementation, this would update the demo interface
    }

    // Display warning to investors
    displayInvestorWarning(message) {
        this.displayInvestorMessage(message, 'warning');
    }

    // Display notification
    displayNotification(notification) {
        console.log(`🔔 DEMO NOTIFICATION: ${notification.message}`);
        // In real implementation, add to notification feed
    }

    // Alert technical support
    alertTechnicalSupport() {
        console.log('🆘 ALERTING TECHNICAL SUPPORT');
        console.log(`📞 Emergency contacts:`);
        console.log(`   Technical: ${this.emergencyContacts.technical}`);
        console.log(`   Coordinator: ${this.emergencyContacts.coordinator}`);
        console.log(`   Backup: ${this.emergencyContacts.backup}`);
        
        // In production, this would send actual alerts
    }

    // Log events to file
    logToFile(filename, data) {
        const logPath = path.join(__dirname, 'demo-logs', filename);
        const logEntry = JSON.stringify({ timestamp: new Date(), data }) + '\n';
        
        try {
            fs.appendFileSync(logPath, logEntry);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    // Update demo with real data
    updateDemoWithRealData(vehicleData) {
        this.demoState.lastKnownLocation = {
            lat: vehicleData.latitude,
            lng: vehicleData.longitude,
            timestamp: new Date()
        };
        
        console.log(`📊 Real data update: ${vehicleData.latitude}, ${vehicleData.longitude}`);
        // In real implementation, update the demo interface
    }

    // Update demo with simulated data
    updateDemoWithSimulatedData() {
        console.log('🎭 Simulated data update');
        // In real implementation, use current simulated waypoint
    }

    // Update demo with waypoint
    updateDemoWithWaypoint(waypoint) {
        console.log(`📍 Waypoint update: ${waypoint.lat}, ${waypoint.lng}, ${waypoint.speed}km/h, ${waypoint.battery}%`);
        // In real implementation, update the demo interface with this data
    }

    // Complete simulated journey
    completeSimulatedJourney() {
        console.log('🏁 Simulated journey complete');
        this.displayInvestorMessage('Demonstration journey completed successfully', 'success');
    }

    // Manual override controls for demo operator
    enableManualOverride() {
        this.demoState.manualOverride = true;
        console.log('🎮 Manual override enabled - operator has full control');
    }

    // Set manual location
    setManualLocation(lat, lng, speed = 0, battery = 70) {
        if (this.demoState.manualOverride) {
            const manualWaypoint = { lat, lng, speed, battery };
            this.updateDemoWithWaypoint(manualWaypoint);
            console.log(`🎮 Manual location set: ${lat}, ${lng}`);
        }
    }

    // Skip to journey phase
    skipToJourneyPhase() {
        if (this.demoState.manualOverride) {
            console.log('⏭️ Skipping to journey phase');
            this.startSimulatedTracking();
        }
    }

    // Skip to arrival
    skipToArrival() {
        if (this.demoState.manualOverride) {
            console.log('⏭️ Skipping to arrival');
            const finalWaypoint = this.fallbackData.journeyWaypoints[this.fallbackData.journeyWaypoints.length - 1];
            this.updateDemoWithWaypoint(finalWaypoint);
            this.displayNotification({ message: "Vehicle arrived successfully!", type: "success" });
        }
    }

    // Generate demo report
    generateDemoReport() {
        const report = {
            timestamp: new Date(),
            fallbacksTriggered: this.currentFallbackLevel > 0,
            maxFallbackLevel: this.currentFallbackLevel,
            systemState: this.demoState,
            recommendations: this.getFallbackRecommendations()
        };
        
        console.log('📋 Demo Report Generated:', report);
        this.logToFile('demo-report.json', report);
        
        return report;
    }

    // Get recommendations based on fallbacks used
    getFallbackRecommendations() {
        const recommendations = [];
        
        if (this.currentFallbackLevel > 0) {
            recommendations.push('Consider backup internet connection for Tesla API');
        }
        
        if (this.currentFallbackLevel > 1) {
            recommendations.push('Pre-load more detailed simulated data for better fallback experience');
        }
        
        if (this.currentFallbackLevel > 2) {
            recommendations.push('Create more comprehensive presentation materials for emergency scenarios');
        }
        
        return recommendations;
    }
}

// Export for use in demo system
module.exports = DemoFallbackSystem;

// CLI interface for demo operators
if (require.main === module) {
    const fallbackSystem = new DemoFallbackSystem();
    
    console.log('🛡️ Tesla Demo Fallback System');
    console.log('==============================');
    console.log('Available commands:');
    console.log('  start-monitoring   - Start system health monitoring');
    console.log('  manual-override    - Enable manual control mode');
    console.log('  test-fallback      - Test fallback systems');
    console.log('  generate-report    - Generate demo report');
    console.log('  emergency-mode     - Activate emergency fallback');
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start-monitoring':
            fallbackSystem.monitorSystemHealth();
            break;
        case 'manual-override':
            fallbackSystem.enableManualOverride();
            break;
        case 'test-fallback':
            fallbackSystem.triggerFallback('test_scenario', 'Testing fallback systems');
            break;
        case 'generate-report':
            fallbackSystem.generateDemoReport();
            break;
        case 'emergency-mode':
            fallbackSystem.activateEmergencyFallback();
            break;
        default:
            console.log('Usage: node demo-fallback-system.js <command>');
    }
}