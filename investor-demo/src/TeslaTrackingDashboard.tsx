// Tesla Real-Time Tracking Dashboard for Investor Demo
// ==================================================
// Live tracking of Manuel's journey from York to Mississauga
// Real-time updates via WebSocket with fallback polling

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import { Icon, LatLngTuple } from 'leaflet';
import { format } from 'date-fns';

interface VehicleLocation {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  batteryLevel: number;
  range: number;
  power: number;
  shiftState: string;
  distanceToDestination: number;
  eta: {
    minutes: number;
    time: string;
    timestamp: Date;
  };
}

interface JourneyStats {
  startTime: Date;
  distanceTraveled: number;
  averageSpeed: number;
  batteryUsed: number;
  waypointsCollected: number;
  currentSpeed: number;
}

interface TeslaTrackingDashboardProps {
  bookingId: string;
  vehicleId: string;
  userToken: string;
  isDemo?: boolean;
}

const DEMO_ROUTE = {
  start: {
    address: '372 McRoberts Ave, York, ON M6E 4R2',
    lat: 43.689042,
    lng: -79.451344,
    name: 'Start - York'
  },
  end: {
    address: '528 Bluesky Crescent, Mississauga, ON L5R 2S3',
    lat: 43.571234,
    lng: -79.684567,
    name: 'Destination - Mississauga Tesla Charging'
  }
};

const TeslaTrackingDashboard: React.FC<TeslaTrackingDashboardProps> = ({
  bookingId,
  vehicleId,
  userToken,
  isDemo = false
}) => {
  // State management
  const [vehicleLocation, setVehicleLocation] = useState<VehicleLocation | null>(null);
  const [journeyPath, setJourneyPath] = useState<LatLngTuple[]>([]);
  const [journeyStats, setJourneyStats] = useState<JourneyStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [trackingActive, setTrackingActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Vehicle icon
  const vehicleIcon = new Icon({
    iconUrl: '/icons/tesla-icon.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Initialize WebSocket connection
  useEffect(() => {
    initializeWebSocket();
    startPollingFallback();

    return () => {
      cleanupConnections();
    };
  }, [bookingId, vehicleId, userToken]);

  const initializeWebSocket = () => {
    try {
      const wsUrl = `wss://161.35.176.111/ws/tracking`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        setIsConnected(true);

        // Subscribe to tracking updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          bookingId,
          vehicleId
        }));

        addNotification('Real-time tracking connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
        addNotification('Connection error - switching to backup tracking');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        setIsConnected(false);
        
        if (trackingActive) {
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            initializeWebSocket();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'location_update':
        updateVehicleLocation(message.data);
        break;
      case 'journey_started':
        setTrackingActive(true);
        addNotification(`Journey started from ${DEMO_ROUTE.start.name}`);
        break;
      case 'milestone':
        addNotification(message.message);
        break;
      case 'arrived':
        handleArrival(message.data);
        break;
      case 'error':
        console.error('Tracking error:', message.error);
        addNotification(`Error: ${message.error}`);
        break;
    }
  };

  const updateVehicleLocation = (locationData: any) => {
    const location: VehicleLocation = {
      timestamp: new Date(locationData.timestamp),
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      speed: locationData.speed || 0,
      heading: locationData.heading || 0,
      batteryLevel: locationData.batteryLevel || 0,
      range: locationData.range || 0,
      power: locationData.power || 0,
      shiftState: locationData.shiftState || 'P',
      distanceToDestination: locationData.distanceToDestination || 0,
      eta: locationData.eta || { minutes: 0, time: '', timestamp: new Date() }
    };

    setVehicleLocation(location);

    // Add to journey path
    const newPoint: LatLngTuple = [location.latitude, location.longitude];
    setJourneyPath(prev => [...prev, newPoint]);

    // Update journey stats
    updateJourneyStats(location);

    // Center map on vehicle if this is the first update
    if (mapRef.current && journeyPath.length === 0) {
      mapRef.current.setView([location.latitude, location.longitude], 13);
    }
  };

  const updateJourneyStats = (location: VehicleLocation) => {
    setJourneyStats(prev => {
      if (!prev) {
        return {
          startTime: location.timestamp,
          distanceTraveled: 0,
          averageSpeed: location.speed,
          batteryUsed: 0,
          waypointsCollected: 1,
          currentSpeed: location.speed
        };
      }

      const waypointsCollected = prev.waypointsCollected + 1;
      const avgSpeed = ((prev.averageSpeed * (waypointsCollected - 1)) + location.speed) / waypointsCollected;

      return {
        ...prev,
        averageSpeed: avgSpeed,
        waypointsCollected,
        currentSpeed: location.speed,
        batteryUsed: Math.max(0, prev.batteryUsed) // Will calculate properly with battery history
      };
    });
  };

  const handleArrival = (arrivalData: any) => {
    setTrackingActive(false);
    addNotification(`🎉 Vehicle arrived at destination!`);
    addNotification(`Journey completed in ${arrivalData.totalTime || 'unknown'} time`);
    
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const startPollingFallback = () => {
    // Fallback polling every 30 seconds if WebSocket fails
    pollingIntervalRef.current = setInterval(() => {
      if (!isConnected && trackingActive) {
        fetchVehicleLocation();
      }
    }, 30000);
  };

  const fetchVehicleLocation = async () => {
    try {
      const response = await fetch(`/api/tesla/vehicle/${vehicleId}/drive_state`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        updateVehicleLocation(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch vehicle location:', error);
    }
  };

  const cleanupConnections = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };

  const addNotification = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setNotifications(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatDistance = (meters: number) => {
    if (meters > 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <div className="h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Tesla Live Tracking Demo</h1>
            <p className="text-gray-300">York → Mississauga | 25km Journey</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${getConnectionStatusColor()}`}>
              <div className="w-3 h-3 rounded-full bg-current mr-2"></div>
              <span className="capitalize">{connectionStatus}</span>
            </div>
            {lastUpdate && (
              <p className="text-gray-400">
                Last update: {format(lastUpdate, 'HH:mm:ss')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          <MapContainer
            center={[43.630, -79.570]}
            zoom={11}
            className="h-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Start marker */}
            <Marker position={[DEMO_ROUTE.start.lat, DEMO_ROUTE.start.lng]}>
              <Popup>
                <strong>{DEMO_ROUTE.start.name}</strong><br />
                {DEMO_ROUTE.start.address}
              </Popup>
            </Marker>

            {/* Destination marker */}
            <Marker position={[DEMO_ROUTE.end.lat, DEMO_ROUTE.end.lng]}>
              <Popup>
                <strong>{DEMO_ROUTE.end.name}</strong><br />
                {DEMO_ROUTE.end.address}<br />
                Tesla Wall Connector (48A)
              </Popup>
            </Marker>

            {/* Vehicle marker */}
            {vehicleLocation && (
              <>
                <Marker 
                  position={[vehicleLocation.latitude, vehicleLocation.longitude]}
                  icon={vehicleIcon}
                >
                  <Popup>
                    <strong>Manuel's Tesla Model 3</strong><br />
                    Speed: {vehicleLocation.speed} km/h<br />
                    Battery: {vehicleLocation.batteryLevel}%<br />
                    Range: {vehicleLocation.range} km<br />
                    Updated: {format(vehicleLocation.timestamp, 'HH:mm:ss')}
                  </Popup>
                </Marker>
                
                {/* Accuracy circle */}
                <Circle
                  center={[vehicleLocation.latitude, vehicleLocation.longitude]}
                  radius={50}
                  color="blue"
                  fillColor="blue"
                  fillOpacity={0.1}
                />
              </>
            )}

            {/* Journey path */}
            {journeyPath.length > 1 && (
              <Polyline
                positions={journeyPath}
                color="red"
                weight={3}
                opacity={0.7}
              />
            )}
          </MapContainer>

          {/* Floating stats overlay */}
          {vehicleLocation && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-80 p-4 rounded-lg">
              <h3 className="text-lg font-bold text-green-400 mb-2">Live Vehicle Data</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-300">Speed</p>
                  <p className="text-white text-xl">{vehicleLocation.speed} km/h</p>
                </div>
                <div>
                  <p className="text-gray-300">Battery</p>
                  <p className="text-white text-xl">{vehicleLocation.batteryLevel}%</p>
                </div>
                <div>
                  <p className="text-gray-300">Distance to Goal</p>
                  <p className="text-white text-xl">{formatDistance(vehicleLocation.distanceToDestination)}</p>
                </div>
                <div>
                  <p className="text-gray-300">ETA</p>
                  <p className="text-white text-xl">{vehicleLocation.eta.minutes}min</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          {/* Journey Stats */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-green-400 mb-3">Journey Progress</h3>
            {journeyStats ? (
              <div className="space-y-3">
                <div>
                  <p className="text-gray-300 text-sm">Duration</p>
                  <p className="text-white">
                    {journeyStats.startTime ? 
                      format(Date.now() - journeyStats.startTime.getTime(), 'mm:ss') : 
                      '00:00'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Average Speed</p>
                  <p className="text-white">{journeyStats.averageSpeed.toFixed(1)} km/h</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Data Points</p>
                  <p className="text-white">{journeyStats.waypointsCollected}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Current Speed</p>
                  <p className="text-white text-lg font-bold">{journeyStats.currentSpeed} km/h</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">Waiting for journey to start...</p>
            )}
          </div>

          {/* Live Notifications */}
          <div className="p-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">Live Updates</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                    {notification}
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No updates yet...</p>
              )}
            </div>
          </div>

          {/* Route Information */}
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-lg font-bold text-purple-400 mb-3">Route Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-green-400 font-semibold">START</p>
                <p className="text-gray-300">{DEMO_ROUTE.start.address}</p>
              </div>
              <div>
                <p className="text-red-400 font-semibold">DESTINATION</p>
                <p className="text-gray-300">{DEMO_ROUTE.end.address}</p>
                <p className="text-blue-300">Tesla Wall Connector (48A/11.5kW)</p>
              </div>
              <div>
                <p className="text-yellow-400 font-semibold">DISTANCE</p>
                <p className="text-gray-300">~25 kilometers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeslaTrackingDashboard;