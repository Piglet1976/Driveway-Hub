import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vin: string;
  tesla_vin: string;
  length: number;
  width: number;
  height: number;
  // Battery and charging data
  battery_level: number;
  battery_range: number;
  max_range: number;
  is_charging: boolean;
  charge_port_open: boolean;
  charging_rate: number | null;
  time_to_full_charge: string | null;
  charge_limit_soc: number;
  needs_charging: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface Driveway {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  hourly_rate: number;
  daily_rate: number;
  available: boolean;
  has_ev_charging: boolean;
  charging_connector_type: string | null;
  charging_rate_kw: number | null;
  estimated_charge_time: string | null;
  charge_cost_per_kwh: number | null;
  host_name: string;
}

interface BookingResponse {
  booking_id: string;
  booking_reference: string;
  total_amount: number;
  platform_fee: number;
  host_payout: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://driveway-hub.app";

// Tesla Vehicle Silhouette Component
const TeslaVehicleIcon: React.FC<{ model: string; className?: string }> = ({ model, className = "" }) => {
  if (model.includes('Model 3') || model.includes('Model S')) {
    return (
      <svg className={className} width="40" height="20" viewBox="0 0 100 50" fill="currentColor">
        <path d="M10 35 Q15 25 25 25 L75 25 Q85 25 90 35 L90 40 Q85 45 75 45 L25 45 Q15 45 10 40 Z"/>
        <circle cx="25" cy="42" r="3"/>
        <circle cx="75" cy="42" r="3"/>
        <path d="M20 25 L80 25 Q82 20 75 20 L25 20 Q18 20 20 25"/>
      </svg>
    );
  } else if (model.includes('Model Y') || model.includes('Model X')) {
    return (
      <svg className={className} width="40" height="24" viewBox="0 0 100 60" fill="currentColor">
        <path d="M10 40 Q15 28 25 28 L75 28 Q85 28 90 40 L90 45 Q85 50 75 50 L25 50 Q15 50 10 45 Z"/>
        <circle cx="25" cy="47" r="3"/>
        <circle cx="75" cy="47" r="3"/>
        <path d="M18 28 L82 28 Q85 15 75 15 L25 15 Q15 15 18 28"/>
        <path d="M30 15 L70 15 Q72 10 68 10 L32 10 Q28 10 30 15"/>
      </svg>
    );
  }
  
  return <span style={{ fontSize: '24px' }}>🚗</span>;
};

// Tesla Charging Port Icon
const TeslaChargingIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L13.09 8.26L22 9L13.09 15.74L12 22L10.91 15.74L2 9L10.91 8.26L12 2Z"/>
  </svg>
);

// Tesla Logo Component
const TeslaLogo: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 100 100" fill="currentColor">
    <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z"/>
    <path d="M35 40 L50 45 L65 40 L65 50 L50 55 L35 50 Z"/>
  </svg>
);

// Battery Status Component
const BatteryIndicator: React.FC<{ batteryLevel: number; isCharging: boolean }> = ({ batteryLevel, isCharging }) => {
  const getBatteryColor = () => {
    if (batteryLevel >= 70) return '#059669'; // Green
    if (batteryLevel >= 25) return '#F59E0B'; // Yellow
    return '#DC2626'; // Red
  };

  const getBatteryIcon = () => {
    if (isCharging) return '⚡';
    if (batteryLevel >= 70) return '🔋';
    if (batteryLevel >= 25) return '🔋';
    return '🪫';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '16px' }}>{getBatteryIcon()}</span>
      <div style={{ 
        width: '60px', 
        height: '12px', 
        backgroundColor: '#E5E7EB', 
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid #D1D5DB'
      }}>
        <div 
          className="battery-fill"
          style={{
            height: '100%',
            backgroundColor: getBatteryColor(),
            '--battery-width': `${batteryLevel}%`
          } as React.CSSProperties & { '--battery-width': string }}
        />
      </div>
      <span style={{ 
        fontSize: '14px', 
        fontWeight: '600',
        color: getBatteryColor()
      }}>
        {batteryLevel}%
      </span>
    </div>
  );
};

// Charging Recommendation Component
const ChargingRecommendation: React.FC<{ vehicle: Vehicle; driveway?: Driveway }> = ({ vehicle, driveway }) => {
  if (!vehicle.needs_charging) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#059669',
        marginTop: '4px'
      }}>
        <span>✅</span>
        <span>Good to go - {vehicle.battery_range} miles remaining</span>
      </div>
    );
  }

  if (driveway?.has_ev_charging) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: '#DC2626',
        marginTop: '4px'
      }}>
        <span>⚡</span>
        <span>Perfect for charging - {driveway.estimated_charge_time}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: '#F59E0B',
      marginTop: '4px'
    }}>
      <span>⚠️</span>
      <span>Charging recommended - {vehicle.battery_range} miles remaining</span>
    </div>
  );
};

function App() {
  const [step, setStep] = useState<'login' | 'search' | 'select' | 'book' | 'confirm'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [driveways, setDriveways] = useState<Driveway[]>([]);
  const [selectedDriveway, setSelectedDriveway] = useState<Driveway | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inject CSS animations on component mount
  useEffect(() => {
    const animationStyles = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes checkmarkDraw {
        0% {
          stroke-dasharray: 0 100;
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        100% {
          stroke-dasharray: 100 0;
          opacity: 1;
        }
      }

      @keyframes successPulse {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes carDrive {
        0% {
          transform: translateX(-20px);
          opacity: 0;
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes batteryFill {
        0% {
          width: 0%;
        }
        100% {
          width: var(--battery-width);
        }
      }

      @keyframes buttonPress {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(0.95);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes greenReveal {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .page-transition {
        animation: fadeInUp 0.6s ease-out;
      }

      .card-entrance {
        animation: fadeIn 0.4s ease-out;
      }

      .slide-in {
        animation: slideInRight 0.5s ease-out;
      }

      .success-checkmark {
        animation: successPulse 0.6s ease-out;
      }

      .checkmark-path {
        animation: checkmarkDraw 0.8s ease-out 0.2s both;
      }

      .car-animation {
        animation: carDrive 0.8s ease-out;
      }

      .battery-fill {
        animation: batteryFill 1.5s ease-out;
      }

      .green-reveal {
        animation: greenReveal 0.5s ease-out;
      }

      .button-hover:hover {
        transform: scale(1.02) !important;
        box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3) !important;
        transition: all 0.2s ease !important;
      }

      .button-hover:active {
        animation: buttonPress 0.1s ease-out;
      }

      .driveway-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      .driveway-card:hover {
        transform: translateY(-3px) !important;
        box-shadow: 0 12px 20px -5px rgba(220, 38, 38, 0.2) !important;
        border-color: #dc2626 !important;
      }

      input, select {
        transition: all 0.2s ease !important;
      }

      input:focus, select:focus {
        border-color: #dc2626 !important;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
        transform: scale(1.01) !important;
      }

      .vehicle-card {
        transition: all 0.3s ease !important;
      }

      .vehicle-card:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1) !important;
      }

      .success-item {
        animation: greenReveal 0.6s ease-out;
        animation-fill-mode: both;
      }

      .success-item:nth-child(1) { animation-delay: 0.2s; }
      .success-item:nth-child(2) { animation-delay: 0.4s; }
      .success-item:nth-child(3) { animation-delay: 0.6s; }
    `;

    // Check if styles are already injected
    if (!document.getElementById('driveway-hub-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'driveway-hub-animations';
      styleSheet.textContent = animationStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('driveway_hub_token', data.token);
      setStep('search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!token) return;
    
    try {
      const [vehiclesData, drivewaysData] = await Promise.all([
        apiCall('/api/users/vehicles'),
        apiCall('/api/driveways')
      ]);
      
      setVehicles(vehiclesData.vehicles);
      setDriveways(drivewaysData.driveways);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('driveway_hub_token');
    if (storedToken) {
      setToken(storedToken);
      // Don't auto-advance to search, let user click login
    }
  }, []);

  useEffect(() => {
    if (token && step === 'search') {
      loadData();
    }
  }, [token, step]);

  const handleDrivewaySelect = (driveway: Driveway) => {
    setSelectedDriveway(driveway);
    setStep('book');
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0; // Prevent negative or zero duration
    return Math.ceil(diffMs / (1000 * 60 * 60));
  };

  const calculateTotal = () => {
    if (!selectedDriveway) return { subtotal: 0, platformFee: 0, total: 0 };
    const hours = calculateHours();
    const subtotal = hours * selectedDriveway.hourly_rate;
    const platformFee = subtotal * 0.15;
    return { subtotal, platformFee, total: subtotal + platformFee };
  };

  const handleBookingSubmit = async () => {
    if (!selectedDriveway || !selectedVehicle || !startTime || !endTime) {
      setError('Please fill in all fields');
      return;
    }
    // SECURITY: Basic date validation
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start < now) {
      setError('Start time cannot be in the past');
      return;
    }
    
    if (end <= start) {
      setError('End time must be after start time');
      return;
    }


    setLoading(true);
    setError(null);

    try {
      const bookingData = await apiCall('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          driveway_id: selectedDriveway.id,
          vehicle_id: selectedVehicle.id,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      setBooking(bookingData.booking);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const resetBooking = () => {
    setStep('search');
    setSelectedDriveway(null);
    setSelectedVehicle(null);
    setStartTime('');
    setEndTime('');
    setBooking(null);
    setError(null);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)', // Tesla black gradient
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', // Tesla-style font
      color: '#ffffff'
    },
    pageTransition: {
      animation: 'fadeInUp 0.6s ease-out',
      animationFillMode: 'both'
    },
    card: {
      backgroundColor: '#1a1a1a', // Tesla dark card
      borderRadius: '16px', // More rounded like Tesla
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      padding: '2rem',
      transition: 'all 0.3s ease',
      border: '1px solid #333333'
    },
    cardLight: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      padding: '2rem',
      transition: 'all 0.3s ease',
      border: '1px solid #e5e7eb'
    },
    cardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)'
    },
    button: {
      backgroundColor: '#3B82F6',
      color: 'white',
      padding: '14px 28px', // Tesla-style padding
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      transform: 'scale(1)',
      letterSpacing: '0.025em' // Tesla-style letter spacing
    },
    teslaButton: {
      backgroundColor: '#dc2626', // Tesla red
      color: 'white',
      padding: '14px 28px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      transform: 'scale(1)',
      letterSpacing: '0.025em'
    },
    buttonHover: {
      backgroundColor: '#2563EB',
      transform: 'scale(1.02)',
      boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #333333',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.2s ease',
      backgroundColor: '#2a2a2a',
      color: '#ffffff'
    },
    inputLight: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.2s ease',
      backgroundColor: '#ffffff',
      color: '#000000'
    },
    inputFocus: {
      borderColor: '#dc2626', // Tesla red focus
      boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.1)'
    },
    drivewayCard: {
      border: '1px solid #333333',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1rem',
      backgroundColor: '#1a1a1a',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      transform: 'translateY(0)',
      color: '#ffffff'
    },
    drivewayCardLight: {
      border: '1px solid #E5E7EB',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '1rem',
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transform: 'translateY(0)',
      color: '#000000'
    },
    drivewayCardHover: {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 24px rgba(220, 38, 38, 0.2)', // Tesla red shadow
      borderColor: '#dc2626'
    },
    vehicleCard: {
      border: '1px solid #333333',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem',
      transition: 'all 0.3s ease',
      transform: 'scale(1)',
      backgroundColor: '#2a2a2a',
      color: '#ffffff'
    },
    vehicleCardLowBattery: {
      backgroundColor: '#2a1a1a',
      borderColor: '#dc2626'
    },
    vehicleCardGoodBattery: {
      backgroundColor: '#1a2a1a',
      borderColor: '#059669'
    }
  };

  if (step === 'login') {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="page-transition">
        <div style={{ ...styles.card, maxWidth: '400px', width: '100%', textAlign: 'center' }} className="card-entrance">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <TeslaLogo size={32} className="tesla-logo" />
            <h1 style={{ fontSize: '2.5rem', fontWeight: '300', marginLeft: '1rem', color: '#ffffff', letterSpacing: '0.05em' }}>
              Driveway Hub
            </h1>
          </div>
          <p style={{ color: '#b0b0b0', marginBottom: '1rem', fontSize: '16px', fontWeight: '300' }}>Tesla-Ready Parking Platform</p>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            padding: '8px 16px', 
            borderRadius: '20px', 
            backgroundColor: '#1a4a1a', 
            color: '#4ade80',
            fontSize: '14px',
            marginBottom: '2rem',
            border: '1px solid #166534'
          }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#22c55e', 
              borderRadius: '50%', 
              marginRight: '8px' 
            }}></span>
            API Live & Ready
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              style={styles.input}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              style={styles.input}
              required
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const emailEl = document.getElementById('email') as HTMLInputElement;
                  const passEl = document.getElementById('password') as HTMLInputElement;
                  if (emailEl?.value && passEl?.value) {
                    handleLogin(emailEl.value, passEl.value);
                  }
                }
              }}
            />
          </div>
          
          <button
            onClick={() => {
              const emailEl = document.getElementById('email') as HTMLInputElement;
              const passEl = document.getElementById('password') as HTMLInputElement;
              if (emailEl?.value && passEl?.value) {
                handleLogin(emailEl.value, passEl.value);
              } else {
                setError('Please enter both email and password');
              }
            }}
            disabled={loading}
            style={{
              ...styles.teslaButton,
              width: '100%',
              marginBottom: '1rem',
              opacity: loading ? 0.6 : 1
            }}
            className="button-hover"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
          
          <button
            onClick={() => handleLogin('ruth.tesla@driveway-hub.com', 'Demo2024!')}
            style={{
              background: 'none',
              border: 'none',
              color: '#b0b0b0',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            Use Demo Account
          </button>

          {error && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '12px', 
              backgroundColor: '#2a1a1a', 
              border: '1px solid #dc2626', 
              color: '#fca5a5', 
              borderRadius: '8px' 
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'search') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }} className="page-transition">
        <header style={{ 
          backgroundColor: '#1a1a1a', 
          borderBottom: '1px solid #333333',
          padding: '1rem 0'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeslaLogo size={28} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#ffffff', margin: '0 0 0 12px', letterSpacing: '0.05em' }}>
                Driveway Hub
              </h1>
              <span style={{ 
                marginLeft: '12px', 
                fontSize: '12px', 
                backgroundColor: '#1a4a1a', 
                color: '#4ade80', 
                padding: '4px 12px', 
                borderRadius: '12px',
                border: '1px solid #166534'
              }}>
                Live Demo
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: '#b0b0b0' }}>Welcome, {user?.first_name}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('driveway_hub_token');
                  setToken(null);
                  setUser(null);
                  setStep('login');
                }}
                style={{ background: 'none', border: 'none', color: '#b0b0b0', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#ffffff', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              Find Your Perfect Parking Spot
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#b0b0b0', fontWeight: '300' }}>
              Secure, convenient parking for your Tesla
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '400', color: '#ffffff', marginBottom: '1.5rem' }}>
                Available Driveways
              </h3>
              
              {driveways.map((driveway) => (
                <div
                  key={driveway.id}
                  style={styles.drivewayCard}
                  className="driveway-card"
                  onClick={() => handleDrivewaySelect(driveway)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: '400', color: '#ffffff', margin: 0 }}>
                          {driveway.title}
                        </h4>
                        {driveway.has_ev_charging && (
                          <span style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <TeslaChargingIcon />
                            Tesla Charging
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#b0b0b0', fontSize: '14px', margin: '0 0 1rem 0' }}>
                        {driveway.description}
                      </p>
                      {driveway.has_ev_charging && driveway.estimated_charge_time && (
                        <div style={{
                          fontSize: '12px',
                          color: '#ffffff',
                          backgroundColor: '#dc2626',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <TeslaChargingIcon />
                          {driveway.estimated_charge_time} • {driveway.charging_rate_kw}kW
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                          ${driveway.hourly_rate}/hour
                        </span>
                        <span style={{ color: '#b0b0b0' }}>
                          ${driveway.daily_rate}/day
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#b0b0b0' }}>
                        <span>📍 Hosted by {driveway.host_name}</span>
                      </div>
                    </div>
                    <button style={{
                      ...styles.teslaButton,
                      marginLeft: '1rem'
                    }} className="button-hover">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.card} className="slide-in">
              <h3 style={{ fontSize: '1.5rem', fontWeight: '400', color: '#ffffff', marginBottom: '1rem' }}>
                Your Vehicles
              </h3>
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} style={{
                  ...styles.vehicleCard,
                  ...(vehicle.needs_charging ? styles.vehicleCardLowBattery : styles.vehicleCardGoodBattery)
                }} className="vehicle-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h4 style={{ fontWeight: '400', color: '#ffffff', margin: 0 }}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h4>
                        {vehicle.needs_charging && (
                          <span style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontWeight: '500'
                          }}>
                            Low Battery
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#b0b0b0', fontSize: '14px', margin: '0 0 8px 0' }}>
                        License: {vehicle.license_plate}
                      </p>
                      <BatteryIndicator 
                        batteryLevel={vehicle.battery_level} 
                        isCharging={vehicle.is_charging} 
                      />
                      <ChargingRecommendation vehicle={vehicle} />
                    </div>
                    <TeslaVehicleIcon model={vehicle.model} className="tesla-vehicle-icon" />
                  </div>
                </div>
              ))}
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#1a2a3a',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <h4 style={{ fontWeight: '500', color: '#60a5fa', margin: '0 0 0.5rem 0' }}>
                  Tesla Integration Ready
                </h4>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                  Once connected, we'll automatically send navigation and parking instructions to your Tesla.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'book') {
    const pricing = calculateTotal();
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }} className="page-transition">
        <header style={{ 
          backgroundColor: '#1a1a1a', 
          borderBottom: '1px solid #333333',
          padding: '1rem 0'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeslaLogo size={24} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#ffffff', margin: '0 0 0 12px', letterSpacing: '0.05em' }}>
                Complete Your Booking
              </h1>
            </div>
            <button
              onClick={() => setStep('search')}
              style={{ background: 'none', border: 'none', color: '#b0b0b0', cursor: 'pointer' }}
            >
              ← Back to Search
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
          {selectedDriveway && (
            <div style={{ ...styles.card, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '400', margin: 0, color: '#ffffff' }}>
                  {selectedDriveway.title}
                </h3>
                {selectedDriveway.has_ev_charging && (
                  <span style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '12px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <TeslaChargingIcon />
                    Tesla Charging
                  </span>
                )}
              </div>
              <p style={{ color: '#b0b0b0', margin: '0 0 1rem 0' }}>{selectedDriveway.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
                  ${selectedDriveway.hourly_rate}/hour
                </span>
                <span style={{ color: '#b0b0b0' }}>📍 Hosted by {selectedDriveway.host_name}</span>
              </div>
            </div>
          )}

          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#ffffff', marginBottom: '0.5rem' }}>
                Select Vehicle
              </label>
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const vehicle = vehicles.find(v => v.id === e.target.value);
                  setSelectedVehicle(vehicle || null);
                }}
                style={{
                  ...styles.input,
                  backgroundColor: '#2a2a2a',
                  border: '2px solid #333333',
                  color: '#ffffff'
                }}
              >
                <option value="">Choose your vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    🔋 {vehicle.battery_level}% | {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <div style={{ marginTop: '8px' }}>
                  <BatteryIndicator 
                    batteryLevel={selectedVehicle.battery_level} 
                    isCharging={selectedVehicle.is_charging} 
                  />
                  <ChargingRecommendation vehicle={selectedVehicle} driveway={selectedDriveway} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#ffffff', marginBottom: '0.5rem' }}>
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#ffffff', marginBottom: '0.5rem' }}>
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {startTime && endTime && selectedDriveway && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#1a2a3a',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <h4 style={{ fontWeight: '500', color: '#60a5fa', margin: '0 0 1rem 0' }}>
                  Booking Summary
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff' }}>
                    <span>Duration: {calculateHours()} hours</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b0b0b0' }}>
                    <span>Platform fee (15%):</span>
                    <span>${pricing.platformFee.toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontWeight: 'bold', 
                    fontSize: '18px', 
                    borderTop: '1px solid #475569', 
                    paddingTop: '0.5rem', 
                    marginTop: '0.5rem',
                    color: '#22c55e'
                  }}>
                    <span>Total:</span>
                    <span>${pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#2a1a1a', 
                border: '1px solid #dc2626', 
                color: '#fca5a5', 
                borderRadius: '8px' 
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleBookingSubmit}
              disabled={loading || !selectedVehicle || !startTime || !endTime}
              style={{
                ...styles.teslaButton,
                width: '100%',
                backgroundColor: loading || !selectedVehicle || !startTime || !endTime ? '#4a4a4a' : '#dc2626',
                cursor: loading || !selectedVehicle || !startTime || !endTime ? 'not-allowed' : 'pointer'
              }}
              className="button-hover"
            >
              {loading ? 'Creating Booking...' : 'Book Now'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="page-transition">
        <div style={{ ...styles.card, maxWidth: '500px', width: '100%', textAlign: 'center' }} className="card-entrance">
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#1a4a1a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            border: '2px solid #22c55e'
          }} className="success-checkmark">
            <svg width="32" height="32" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
              <path 
                className="checkmark-path"
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7"
                style={{
                  strokeDasharray: '100',
                  strokeDashoffset: '100'
                }}
              />
            </svg>
          </div>
          
          <h2 style={{ fontSize: '2rem', fontWeight: '300', color: '#22c55e', marginBottom: '1rem', letterSpacing: '0.05em' }} className="green-reveal">
            Booking Confirmed!
          </h2>
          
          {booking && (
            <div style={{
              textAlign: 'left',
              backgroundColor: '#2a2a2a',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              border: '1px solid #333333'
            }} className="card-entrance">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '500', color: '#b0b0b0' }}>Booking Reference:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ffffff' }}>{booking.booking_reference}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#b0b0b0' }}>Total Paid:</span>
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>${booking.total_amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#888888' }}>
                <span>Host receives:</span>
                <span>${booking.host_payout.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#888888' }}>
                <span>Platform fee:</span>
                <span>${booking.platform_fee.toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={resetBooking}
              style={{ ...styles.teslaButton, width: '100%' }}
              className="button-hover"
            >
              Book Another Spot
            </button>
            
            <div style={{ fontSize: '14px', color: '#b0b0b0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="success-item">
                <TeslaVehicleIcon model="Model 3" className="car-animation" />
                <span>Navigation sent to your Tesla</span>
              </div>
              <div style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="success-item">
                <span style={{ color: '#22c55e' }}>✅</span>
                <span>Host has been notified</span>
              </div>
              <div style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} className="success-item">
                <span style={{ color: '#22c55e' }}>✅</span>
                <span>Confirmation email sent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;