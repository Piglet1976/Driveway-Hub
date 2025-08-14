// Tesla Vehicle Tracking System for Demo
// =======================================
// Real-time tracking during Ruth's journey from Etobicoke to York

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const CONFIG = {
    API_BASE: 'https://161.35.176.111/api',
    WS_BASE: 'wss://161.35.176.111/ws',
    TESLA_API: 'https://fleet-api.prd.na.tesla.com/api/1',
    POLLING_INTERVAL: 30000, // 30 seconds
    ARRIVAL_THRESHOLD: 100, // meters from destination
    DEMO_ROUTE: {
        start: {
            address: '7 Savona Dr, Etobicoke, ON M8W 4T9',
            lat: 43.6045,
            lng: -79.5408
        },
        end: {
            address: '372 McRoberts Ave, York, ON M6E 4R2',
            lat: 43.689042,
            lng: -79.451344
        }
    }
};

class TeslaTrackingDemo {
    constructor(userToken, vehicleId, bookingId) {
        this.userToken = userToken;
        this.vehicleId = vehicleId;
        this.bookingId = bookingId;
        this.tracking = false;
        this.ws = null;
        this.trackingInterval = null;
        this.journeyData = {
            startTime: null,
            endTime: null,
            waypoints: [],
            totalDistance: 0,
            averageSpeed: 0,
            batteryUsed: 0,
            notifications: []
        };
    }

    // Initialize WebSocket for real-time updates
    async initWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${CONFIG.WS_BASE}/tracking`, {
                headers: {
                    'Authorization': `Bearer ${this.userToken}`
                }
            });

            this.ws.on('open', () => {
                console.log('✅ WebSocket connected for real-time tracking');
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    bookingId: this.bookingId,
                    vehicleId: this.vehicleId
                }));
                resolve();
            });

            this.ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.handleRealtimeUpdate(message);
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('WebSocket connection closed');
                if (this.tracking) {
                    setTimeout(() => this.initWebSocket(), 5000); // Reconnect
                }
            });
        });
    }

    // Start tracking the vehicle
    async startTracking() {
        console.log('\n🚗 STARTING TESLA TRACKING DEMO');
        console.log('================================');
        console.log(`Route: ${CONFIG.DEMO_ROUTE.start.address}`);
        console.log(`   to: ${CONFIG.DEMO_ROUTE.end.address}`);
        console.log('Distance: ~15km');
        console.log('================================\n');

        this.tracking = true;
        this.journeyData.startTime = new Date();

        // Initialize WebSocket
        await this.initWebSocket();

        // Send initial navigation command to Tesla
        await this.sendNavigationToTesla();

        // Start polling for location updates
        this.trackingInterval = setInterval(() => {
            this.pollVehicleLocation();
        }, CONFIG.POLLING_INTERVAL);

        // Initial poll
        await this.pollVehicleLocation();

        // Send start notification
        await this.sendNotification('journey_started', {
            message: 'Ruth has started her journey to your parking spot',
            estimatedArrival: this.calculateETA()
        });
    }

    // Send navigation destination to Tesla
    async sendNavigationToTesla() {
        try {
            const response = await axios.post(
                `${CONFIG.API_BASE}/tesla/vehicle/${this.vehicleId}/navigate`,
                {
                    address: CONFIG.DEMO_ROUTE.end.address,
                    latitude: CONFIG.DEMO_ROUTE.end.lat,
                    longitude: CONFIG.DEMO_ROUTE.end.lng
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success) {
                console.log('✅ Navigation sent to Tesla successfully');
                this.journeyData.notifications.push({
                    time: new Date(),
                    type: 'navigation_sent',
                    message: 'Destination sent to vehicle navigation system'
                });
            }
        } catch (error) {
            console.error('❌ Failed to send navigation:', error.message);
        }
    }

    // Poll vehicle location from Tesla API
    async pollVehicleLocation() {
        try {
            const response = await axios.get(
                `${CONFIG.API_BASE}/tesla/vehicle/${this.vehicleId}/drive_state`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`
                    }
                }
            );

            const driveState = response.data;
            const location = {
                timestamp: new Date(),
                latitude: driveState.latitude,
                longitude: driveState.longitude,
                speed: driveState.speed || 0,
                heading: driveState.heading,
                power: driveState.power,
                shiftState: driveState.shift_state,
                batteryLevel: driveState.battery_level,
                range: driveState.battery_range
            };

            // Add waypoint
            this.journeyData.waypoints.push(location);

            // Calculate distance from destination
            const distanceToDestination = this.calculateDistance(
                location.latitude,
                location.longitude,
                CONFIG.DEMO_ROUTE.end.lat,
                CONFIG.DEMO_ROUTE.end.lng
            );

            // Update console display
            this.displayProgress(location, distanceToDestination);

            // Check for arrival
            if (distanceToDestination < CONFIG.ARRIVAL_THRESHOLD) {
                await this.handleArrival();
            }

            // Check for milestones
            await this.checkMilestones(distanceToDestination);

            // Broadcast to WebSocket subscribers
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'location_update',
                    data: {
                        ...location,
                        distanceToDestination,
                        eta: this.calculateETA(distanceToDestination, location.speed)
                    }
                }));
            }

        } catch (error) {
            console.error('❌ Failed to poll vehicle location:', error.message);
        }
    }

    // Display current progress
    displayProgress(location, distanceToDestination) {
        console.clear();
        console.log('\n🚗 TESLA TRACKING - LIVE DEMO');
        console.log('═══════════════════════════════════════');
        console.log(`📍 Current Location:`);
        console.log(`   Lat: ${location.latitude.toFixed(6)}°`);
        console.log(`   Lng: ${location.longitude.toFixed(6)}°`);
        console.log(`\n🚦 Vehicle Status:`);
        console.log(`   Speed: ${location.speed || 0} km/h`);
        console.log(`   Heading: ${location.heading}°`);
        console.log(`   Gear: ${location.shiftState || 'P'}`);
        console.log(`   Battery: ${location.batteryLevel}%`);
        console.log(`   Range: ${location.range} km`);
        console.log(`\n📏 Distance to Destination:`);
        console.log(`   ${(distanceToDestination / 1000).toFixed(2)} km`);
        console.log(`\n⏱️ Journey Time:`);
        console.log(`   ${this.getElapsedTime()}`);
        console.log(`\n📊 Waypoints Recorded: ${this.journeyData.waypoints.length}`);
        console.log('═══════════════════════════════════════\n');
    }

    // Check for journey milestones
    async checkMilestones(distanceToDestination) {
        const kmToDestination = distanceToDestination / 1000;

        // 5km milestone
        if (kmToDestination <= 5 && !this.journeyData.notifications.find(n => n.type === '5km')) {
            await this.sendNotification('5km', {
                message: 'Ruth is 5km away from your parking spot',
                eta: this.calculateETA(distanceToDestination)
            });
        }

        // 2km milestone
        if (kmToDestination <= 2 && !this.journeyData.notifications.find(n => n.type === '2km')) {
            await this.sendNotification('2km', {
                message: 'Ruth is 2km away - arriving soon!',
                eta: this.calculateETA(distanceToDestination)
            });
        }

        // 500m milestone
        if (distanceToDestination <= 500 && !this.journeyData.notifications.find(n => n.type === '500m')) {
            await this.sendNotification('500m', {
                message: 'Ruth is approaching your location - 500m away',
                preparation: 'Please ensure the driveway is accessible'
            });
        }
    }

    // Handle vehicle arrival
    async handleArrival() {
        if (!this.tracking) return;

        console.log('\n🎉 VEHICLE HAS ARRIVED!');
        console.log('═══════════════════════════════════════');

        this.tracking = false;
        this.journeyData.endTime = new Date();

        // Stop tracking
        clearInterval(this.trackingInterval);

        // Calculate journey statistics
        const stats = this.calculateJourneyStats();

        console.log(`✅ Journey Complete!`);
        console.log(`📍 Final Location: ${CONFIG.DEMO_ROUTE.end.address}`);
        console.log(`⏱️ Total Time: ${stats.totalTime}`);
        console.log(`📏 Distance Traveled: ${stats.distance} km`);
        console.log(`🚗 Average Speed: ${stats.avgSpeed} km/h`);
        console.log(`🔋 Battery Used: ${stats.batteryUsed}%`);
        console.log(`📊 Data Points Collected: ${this.journeyData.waypoints.length}`);
        console.log('═══════════════════════════════════════\n');

        // Send arrival notification
        await this.sendNotification('arrived', {
            message: 'Ruth has arrived at your parking spot!',
            journeyStats: stats
        });

        // Update booking status
        await this.updateBookingStatus('active');

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }

        // Save journey data
        await this.saveJourneyData();
    }

    // Send notification
    async sendNotification(type, data) {
        try {
            const notification = {
                type,
                timestamp: new Date(),
                bookingId: this.bookingId,
                ...data
            };

            // Send to API
            await axios.post(
                `${CONFIG.API_BASE}/notifications`,
                notification,
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Store in journey data
            this.journeyData.notifications.push(notification);

            console.log(`📬 Notification sent: ${type}`);
        } catch (error) {
            console.error('Failed to send notification:', error.message);
        }
    }

    // Update booking status
    async updateBookingStatus(status) {
        try {
            await axios.patch(
                `${CONFIG.API_BASE}/bookings/${this.bookingId}`,
                {
                    booking_status: status,
                    arrival_detected_at: new Date(),
                    tesla_navigation_sent: true
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`✅ Booking status updated to: ${status}`);
        } catch (error) {
            console.error('Failed to update booking:', error.message);
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    // Calculate ETA
    calculateETA(distanceMeters = 15000, speedKmh = 40) {
        if (!speedKmh || speedKmh === 0) speedKmh = 40; // Default city speed
        const hours = (distanceMeters / 1000) / speedKmh;
        const minutes = Math.round(hours * 60);
        const eta = new Date(Date.now() + minutes * 60000);
        return {
            minutes,
            time: eta.toLocaleTimeString(),
            timestamp: eta
        };
    }

    // Get elapsed time
    getElapsedTime() {
        if (!this.journeyData.startTime) return '00:00';
        const elapsed = Date.now() - this.journeyData.startTime.getTime();
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Calculate journey statistics
    calculateJourneyStats() {
        const waypoints = this.journeyData.waypoints;
        if (waypoints.length < 2) return {};

        let totalDistance = 0;
        let totalSpeed = 0;
        let speedCount = 0;

        for (let i = 1; i < waypoints.length; i++) {
            const dist = this.calculateDistance(
                waypoints[i - 1].latitude,
                waypoints[i - 1].longitude,
                waypoints[i].latitude,
                waypoints[i].longitude
            );
            totalDistance += dist;

            if (waypoints[i].speed > 0) {
                totalSpeed += waypoints[i].speed;
                speedCount++;
            }
        }

        const batteryUsed = waypoints[0].batteryLevel - waypoints[waypoints.length - 1].batteryLevel;
        const totalTime = this.journeyData.endTime - this.journeyData.startTime;
        const totalMinutes = Math.floor(totalTime / 60000);

        return {
            distance: (totalDistance / 1000).toFixed(2),
            totalTime: `${totalMinutes} minutes`,
            avgSpeed: speedCount > 0 ? (totalSpeed / speedCount).toFixed(1) : 0,
            batteryUsed: Math.abs(batteryUsed).toFixed(1),
            waypoints: waypoints.length
        };
    }

    // Save journey data for analysis
    async saveJourneyData() {
        try {
            await axios.post(
                `${CONFIG.API_BASE}/journey-data`,
                {
                    bookingId: this.bookingId,
                    vehicleId: this.vehicleId,
                    journeyData: this.journeyData
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log('✅ Journey data saved for analysis');
        } catch (error) {
            console.error('Failed to save journey data:', error.message);
        }
    }

    // Handle real-time updates from WebSocket
    handleRealtimeUpdate(message) {
        switch (message.type) {
            case 'location_update':
                // Handle location updates from other sources
                break;
            case 'command':
                // Handle remote commands
                if (message.command === 'stop_tracking') {
                    this.stopTracking();
                }
                break;
            case 'notification':
                console.log(`📬 Notification: ${message.data.message}`);
                break;
        }
    }

    // Stop tracking
    stopTracking() {
        console.log('\n⏹️ Stopping tracking...');
        this.tracking = false;
        clearInterval(this.trackingInterval);
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Demo execution script
async function runDemo() {
    console.log('\n🚀 TESLA TRACKING DEMO SYSTEM');
    console.log('═══════════════════════════════════════');
    console.log('This demo will track Ruth\'s Tesla in real-time');
    console.log('as she drives from Etobicoke to York, Toronto');
    console.log('═══════════════════════════════════════\n');

    // These would be obtained from the authentication process
    const USER_TOKEN = process.env.DEMO_USER_TOKEN || 'demo_token';
    const VEHICLE_ID = process.env.DEMO_VEHICLE_ID || '1234567890';
    const BOOKING_ID = process.env.DEMO_BOOKING_ID || 'DH-DEMO01';

    // Create tracking instance
    const tracker = new TeslaTrackingDemo(USER_TOKEN, VEHICLE_ID, BOOKING_ID);

    // Start tracking
    await tracker.startTracking();

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n\n⏹️ Demo interrupted by user');
        tracker.stopTracking();
        process.exit(0);
    });
}

// Export for use in other modules
module.exports = TeslaTrackingDemo;

// Run if executed directly
if (require.main === module) {
    runDemo().catch(error => {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    });
}