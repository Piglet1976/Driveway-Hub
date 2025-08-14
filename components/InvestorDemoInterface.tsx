// Investor Demo Live Interface
// ===========================
// Master dashboard for investor presentations showing all components
// Real-time updates, metrics, and professional visualization

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface LiveMetrics {
  activeBookings: number;
  realTimeTracking: boolean;
  teslaIntegrationStatus: 'connected' | 'authenticating' | 'error';
  currentJourneyProgress: number;
  estimatedRevenue: number;
  batteryLevel: number;
  speed: number;
  distanceRemaining: number;
  eta: string;
}

interface DemoEvent {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'Tesla' | 'Booking' | 'Payment' | 'System';
  message: string;
  details?: any;
}

const InvestorDemoInterface: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    activeBookings: 1,
    realTimeTracking: true,
    teslaIntegrationStatus: 'connected',
    currentJourneyProgress: 0,
    estimatedRevenue: 67.79,
    batteryLevel: 78,
    speed: 0,
    distanceRemaining: 25000,
    eta: '11:40 AM'
  });

  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [demoPhase, setDemoPhase] = useState<'setup' | 'booking' | 'journey' | 'arrival' | 'complete'>('setup');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  const eventStreamRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLive) {
      startDemoSimulation();
    } else {
      stopDemoSimulation();
    }

    return () => {
      if (eventStreamRef.current) {
        clearInterval(eventStreamRef.current);
      }
    };
  }, [isLive]);

  const startDemoSimulation = () => {
    setStartTime(new Date());
    addEvent('System', 'info', 'Live demo started', { phase: 'setup' });
    
    // Simulate real demo events
    eventStreamRef.current = setInterval(() => {
      simulateDemoProgress();
    }, 2000);
  };

  const stopDemoSimulation = () => {
    if (eventStreamRef.current) {
      clearInterval(eventStreamRef.current);
    }
    addEvent('System', 'info', 'Demo simulation paused');
  };

  const simulateDemoProgress = () => {
    const currentTime = Date.now();
    const elapsed = startTime ? (currentTime - startTime.getTime()) / 1000 : 0;

    // Progress through demo phases
    if (elapsed < 30) {
      setDemoPhase('setup');
      simulateSetupPhase(elapsed);
    } else if (elapsed < 120) {
      setDemoPhase('booking');
      simulateBookingPhase(elapsed - 30);
    } else if (elapsed < 600) {
      setDemoPhase('journey');
      simulateJourneyPhase(elapsed - 120);
    } else if (elapsed < 660) {
      setDemoPhase('arrival');
      simulateArrivalPhase(elapsed - 600);
    } else {
      setDemoPhase('complete');
      simulateCompletePhase();
    }
  };

  const simulateSetupPhase = (elapsed: number) => {
    if (elapsed === 0) {
      addEvent('Tesla', 'info', 'Ruth authorizing Tesla vehicle...');
    } else if (elapsed > 10 && elapsed < 12) {
      addEvent('Tesla', 'success', 'Tesla OAuth completed successfully');
      setMetrics(prev => ({ ...prev, teslaIntegrationStatus: 'connected' }));
    } else if (elapsed > 20 && elapsed < 22) {
      addEvent('System', 'info', 'Platform ready for live tracking');
    }
  };

  const simulateBookingPhase = (elapsed: number) => {
    if (elapsed === 0) {
      addEvent('Booking', 'info', 'Manuel searching for Tesla charging...');
    } else if (elapsed > 15 && elapsed < 17) {
      addEvent('Booking', 'info', 'Premium Tesla spot found in Mississauga');
    } else if (elapsed > 30 && elapsed < 32) {
      addEvent('Booking', 'success', 'Booking confirmed - DH-DEMO-' + Date.now().toString().slice(-6));
      addEvent('Tesla', 'info', 'Navigation sent to Tesla vehicle');
    } else if (elapsed > 45 && elapsed < 47) {
      addEvent('Payment', 'success', 'Payment processed - $67.79');
    }
  };

  const simulateJourneyPhase = (elapsed: number) => {
    const journeyProgress = Math.min((elapsed / 480) * 100, 100); // 8 minutes = full journey
    const speed = 35 + Math.random() * 20; // 35-55 km/h
    const batteryDrain = Math.max(78 - (journeyProgress / 100) * 8, 70);
    const distanceRemaining = Math.max(25000 - (journeyProgress / 100) * 25000, 0);

    setMetrics(prev => ({
      ...prev,
      currentJourneyProgress: journeyProgress,
      speed: Math.round(speed),
      batteryLevel: Math.round(batteryDrain),
      distanceRemaining: Math.round(distanceRemaining)
    }));

    // Journey milestones
    if (journeyProgress > 20 && journeyProgress < 25 && !events.some(e => e.message.includes('5km'))) {
      addEvent('Tesla', 'info', 'Vehicle tracking: 5km completed');
    } else if (journeyProgress > 50 && journeyProgress < 55 && !events.some(e => e.message.includes('Halfway'))) {
      addEvent('Tesla', 'info', 'Halfway point reached - 12.5km');
    } else if (journeyProgress > 80 && journeyProgress < 85 && !events.some(e => e.message.includes('5km from'))) {
      addEvent('Tesla', 'warning', '5km from destination - preparing arrival');
    } else if (journeyProgress > 95 && journeyProgress < 98 && !events.some(e => e.message.includes('Approaching'))) {
      addEvent('Tesla', 'warning', 'Approaching destination - 500m away');
    }
  };

  const simulateArrivalPhase = (elapsed: number) => {
    if (elapsed === 0) {
      addEvent('Tesla', 'success', '🎉 Vehicle arrived at destination!');
      addEvent('System', 'success', 'Automatic arrival detection successful');
      setMetrics(prev => ({
        ...prev,
        currentJourneyProgress: 100,
        speed: 0,
        distanceRemaining: 0
      }));
    } else if (elapsed > 10 && elapsed < 12) {
      addEvent('Payment', 'success', 'Charging session initiated');
    } else if (elapsed > 20 && elapsed < 22) {
      addEvent('System', 'success', 'Host notification sent');
    }
  };

  const simulateCompletePhase = () => {
    if (!events.some(e => e.message.includes('Demo complete'))) {
      addEvent('System', 'success', 'Demo complete - All systems operational');
    }
  };

  const addEvent = (category: DemoEvent['category'], type: DemoEvent['type'], message: string, details?: any) => {
    const newEvent: DemoEvent = {
      timestamp: new Date(),
      type,
      category,
      message,
      details
    };
    
    setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'setup': return 'bg-blue-500';
      case 'booking': return 'bg-yellow-500';
      case 'journey': return 'bg-green-500';
      case 'arrival': return 'bg-purple-500';
      case 'complete': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Driveway Hub - Live Demo</h1>
            <p className="text-gray-300">Tesla Integration & Real-Time Tracking Platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-6 py-2 rounded-md font-semibold transition-colors ${
                isLive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLive ? '⏹️ Stop Demo' : '▶️ Start Live Demo'}
            </button>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getPhaseColor(demoPhase)} text-white`}>
              Phase: {demoPhase.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Left Panel - Metrics */}
        <div className="w-1/3 bg-gray-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-green-400 mb-4">Live Metrics</h2>
          
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{metrics.activeBookings}</div>
              <div className="text-gray-300 text-sm">Active Bookings</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-400">${metrics.estimatedRevenue}</div>
              <div className="text-gray-300 text-sm">Transaction Value</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className={`text-2xl font-bold ${metrics.teslaIntegrationStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                {metrics.teslaIntegrationStatus === 'connected' ? '✅' : '⚠️'}
              </div>
              <div className="text-gray-300 text-sm">Tesla Status</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{metrics.currentJourneyProgress.toFixed(1)}%</div>
              <div className="text-gray-300 text-sm">Journey Progress</div>
            </div>
          </div>

          {/* Journey Progress */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Journey Status</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Progress</span>
                  <span className="text-white">{metrics.currentJourneyProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${metrics.currentJourneyProgress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-400">Speed</div>
                  <div className="text-white font-bold">{metrics.speed} km/h</div>
                </div>
                <div>
                  <div className="text-gray-400">Battery</div>
                  <div className="text-white font-bold">{metrics.batteryLevel}%</div>
                </div>
                <div>
                  <div className="text-gray-400">ETA</div>
                  <div className="text-white font-bold">{metrics.eta}</div>
                </div>
              </div>
              
              <div>
                <div className="text-gray-400 text-sm">Distance Remaining</div>
                <div className="text-white font-bold">
                  {metrics.distanceRemaining > 1000 
                    ? `${(metrics.distanceRemaining / 1000).toFixed(1)} km`
                    : `${metrics.distanceRemaining} m`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Demo Route */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Demo Route</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-gray-300">York, ON - 372 McRoberts Ave</span>
              </div>
              <div className="ml-5 border-l-2 border-gray-600 h-4"></div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                <span className="text-gray-300">Mississauga, ON - 528 Bluesky Crescent</span>
              </div>
              <div className="ml-5 text-blue-300 text-xs">Tesla Wall Connector (48A)</div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Platform</span>
                <span className="text-green-400">✅ Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Tesla API</span>
                <span className="text-green-400">✅ Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Real-time Tracking</span>
                <span className="text-green-400">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Payment Processing</span>
                <span className="text-green-400">✅ Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Visual Display */}
        <div className="flex-1 bg-gray-900 p-6 flex flex-col">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Live Journey Visualization</h2>
            <p className="text-gray-400">Manuel's Tesla Journey - York to Mississauga</p>
          </div>

          {/* Large Journey Display */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl">
              {/* Route Visualization */}
              <div className="relative bg-gray-800 rounded-lg p-8 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-2xl mb-2">
                      🏠
                    </div>
                    <div className="text-white font-semibold">START</div>
                    <div className="text-gray-400 text-sm">York</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-2xl mb-2">
                      ⚡
                    </div>
                    <div className="text-white font-semibold">DESTINATION</div>
                    <div className="text-gray-400 text-sm">Mississauga</div>
                  </div>
                </div>
                
                {/* Progress Line */}
                <div className="relative">
                  <div className="w-full h-2 bg-gray-600 rounded-full">
                    <div 
                      className="h-2 bg-gradient-to-r from-green-400 to-red-500 rounded-full transition-all duration-1000"
                      style={{ width: `${metrics.currentJourneyProgress}%` }}
                    ></div>
                  </div>
                  
                  {/* Tesla Icon */}
                  <div 
                    className="absolute -top-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xl transform -translate-x-4 transition-all duration-1000"
                    style={{ left: `${metrics.currentJourneyProgress}%` }}
                  >
                    🚗
                  </div>
                </div>
                
                <div className="flex justify-between mt-4 text-sm text-gray-400">
                  <span>0 km</span>
                  <span>12.5 km</span>
                  <span>25 km</span>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-400">{metrics.speed}</div>
                    <div className="text-gray-300">km/h</div>
                    <div className="text-gray-500 text-sm">Current Speed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-400">{metrics.batteryLevel}%</div>
                    <div className="text-gray-300">Battery</div>
                    <div className="text-gray-500 text-sm">Remaining Charge</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-400">
                      {metrics.distanceRemaining > 1000 
                        ? `${(metrics.distanceRemaining / 1000).toFixed(1)}`
                        : `${Math.round(metrics.distanceRemaining)}`
                      }
                    </div>
                    <div className="text-gray-300">
                      {metrics.distanceRemaining > 1000 ? 'km' : 'm'}
                    </div>
                    <div className="text-gray-500 text-sm">To Destination</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Event Log */}
        <div className="w-1/3 bg-gray-800 border-l border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-yellow-400">Live Event Stream</h2>
            <p className="text-gray-400 text-sm">Real-time system updates</p>
          </div>
          
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {events.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-4">⏱️</div>
                <p>Waiting for demo to start...</p>
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getEventTypeColor(event.type)}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{event.category}</span>
                    <span className="text-xs opacity-75">
                      {format(event.timestamp, 'HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-sm">{event.message}</p>
                  {event.details && (
                    <pre className="text-xs opacity-75 mt-1 overflow-hidden">
                      {JSON.stringify(event.details, null, 2).slice(0, 100)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-gray-800 p-2 border-t border-gray-700">
        <div className="flex justify-between items-center text-sm">
          <div className="flex space-x-6">
            <span className="text-gray-400">
              Demo Started: {startTime ? format(startTime, 'HH:mm:ss') : 'Not started'}
            </span>
            <span className="text-gray-400">
              Events: {events.length}
            </span>
            <span className="text-gray-400">
              Phase: {demoPhase}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-gray-400">
              {isLive ? 'LIVE' : 'PAUSED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorDemoInterface;