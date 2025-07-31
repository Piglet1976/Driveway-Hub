import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import TeslaLogin from './components/TeslaLogin.tsx';

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
  license_plate: string;
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
  host_name: string;
}

interface BookingResponse {
  booking_id: string;
  booking_reference: string;
  total_amount: number;
  platform_fee: number;
  host_payout: number;
}

const API_BASE_URL = 'http://localhost:3000';

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
  const navigate = useNavigate();

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

  const handleLogin = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('driveway_hub_token', data.token);
      setStep('search');
      navigate('/search');
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
      navigate('/search');
    }
  }, [token, step, loadData, navigate]); // Added missing dependencies

  const handleDrivewaySelect = (driveway: Driveway) => {
    setSelectedDriveway(driveway);
    setStep('book');
    navigate('/book');
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
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
      navigate('/confirm');
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
    navigate('/search');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '2rem'
    },
    button: {
      backgroundColor: '#3B82F6',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #E5E7EB',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none'
    }
  };

  // Separate component for the book step to handle pricing
  const BookStep = () => {
    const pricing = calculateTotal();

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
        <header style={{ 
          backgroundColor: 'white', 
          borderBottom: '1px solid #E5E7EB',
          padding: '1rem 0'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
              Complete Your Booking
            </h1>
            <button
              onClick={() => setStep('search')}
              style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer' }}
            >
              ← Back to Search
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
          {selectedDriveway && (
            <div style={{ ...styles.card, marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                {selectedDriveway.title}
              </h3>
              <p style={{ color: '#6B7280', margin: '0 0 1rem 0' }}>{selectedDriveway.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>
                  ${selectedDriveway.hourly_rate}/hour
                </span>
                <span style={{ color: '#6B7280' }}>📍 Hosted by {selectedDriveway.host_name}</span>
              </div>
            </div>
          )}

          <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Select Vehicle
              </label>
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const vehicle = vehicles.find(v => v.id === e.target.value);
                  setSelectedVehicle(vehicle || null);
                }}
                style={styles.input}
              >
                <option value="">Choose your vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.license_plate})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
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
                backgroundColor: '#EBF8FF',
                borderRadius: '8px'
              }}>
                <h4 style={{ fontWeight: '500', color: '#1E40AF', margin: '0 0 1rem 0' }}>
                  Booking Summary
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Duration: {calculateHours()} hours</span>
                    <span>${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform fee (15%):</span>
                    <span>${pricing.platformFee.toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontWeight: 'bold', 
                    fontSize: '18px', 
                    borderTop: '1px solid #CBD5E0', 
                    paddingTop: '0.5rem', 
                    marginTop: '0.5rem' 
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
                backgroundColor: '#FEF2F2', 
                border: '1px solid #FECACA', 
                color: '#DC2626', 
                borderRadius: '8px' 
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleBookingSubmit}
              disabled={loading || !selectedVehicle || !startTime || !endTime}
              style={{
                ...styles.button,
                width: '100%',
                backgroundColor: loading || !selectedVehicle || !startTime || !endTime ? '#9CA3AF' : '#059669',
                cursor: loading || !selectedVehicle || !startTime || !endTime ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating Booking...' : 'Book Now'}
            </button>
          </div>
        </main>
      </div>
    );
  };

  return (
    <Routes>
      {step === 'login' && (
        <Route
          path="/"
          element={
            <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ ...styles.card, maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1F2937' }}>
                  Driveway Hub
                </h1>
                <p style={{ color: '#6B7280', marginBottom: '1rem' }}>Tesla-Ready Parking Platform</p>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  padding: '8px 16px', 
                  borderRadius: '20px', 
                  backgroundColor: '#D1FAE5', 
                  color: '#065F46',
                  fontSize: '14px',
                  marginBottom: '2rem'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    backgroundColor: '#10B981', 
                    borderRadius: '50%', 
                    marginRight: '8px' 
                  }}></span>
                  API Live & Ready
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    style={styles.input}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                </div>
                
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="email"]') as HTMLInputElement;
                    handleLogin(input?.value || 'hello@driveway-hub.app');
                  }}
                  disabled={loading}
                  style={{
                    ...styles.button,
                    width: '100%',
                    marginBottom: '1rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                
                <button
                  onClick={() => handleLogin('hello@driveway-hub.app')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B82F6',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Use Demo Account
                </button>

                {error && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '12px', 
                    backgroundColor: '#FEF2F2', 
                    border: '1px solid #FECACA', 
                    color: '#DC2626', 
                    borderRadius: '8px' 
                  }}>
                    {error}
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}
      {step === 'search' && (
        <Route
          path="/search"
          element={
            <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
              <header style={{ 
                backgroundColor: 'white', 
                borderBottom: '1px solid #E5E7EB',
                padding: '1rem 0'
              }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
                      Driveway Hub
                    </h1>
                    <span style={{ 
                      marginLeft: '12px', 
                      fontSize: '12px', 
                      backgroundColor: '#D1FAE5', 
                      color: '#065F46', 
                      padding: '4px 12px', 
                      borderRadius: '12px' 
                    }}>
                      Live Demo
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#6B7280' }}>Welcome, {user?.first_name}</span>
                    <button
                      onClick={() => {
                        localStorage.removeItem('driveway_hub_token');
                        setToken(null);
                        setUser(null);
                        setStep('login');
                        navigate('/');
                      }}
                      style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </header>

              <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1F2937', marginBottom: '1rem' }}>
                    Find Your Perfect Parking Spot
                  </h2>
                  <p style={{ fontSize: '1.25rem', color: '#6B7280' }}>
                    Secure, convenient parking for your Tesla
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1F2937', marginBottom: '1.5rem' }}>
                      Available Driveways
                    </h3>
                    
                    {driveways.map((driveway) => (
                      <div
                        key={driveway.id}
                        style={{
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '1rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={() => handleDrivewaySelect(driveway)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', margin: '0 0 0.5rem 0' }}>
                              {driveway.title}
                            </h4>
                            <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 1rem 0' }}>
                              {driveway.description}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                                ${driveway.hourly_rate}/hour
                              </span>
                              <span style={{ color: '#6B7280' }}>
                                ${driveway.daily_rate}/day
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#6B7280' }}>
                              <span>📍 Hosted by {driveway.host_name}</span>
                            </div>
                          </div>
                          <button style={{
                            ...styles.button,
                            marginLeft: '1rem'
                          }}>
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={styles.card}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem' }}>
                      Your Vehicles
                    </h3>
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontWeight: '500', color: '#1F2937', margin: '0 0 0.25rem 0' }}>
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </h4>
                            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                              License: {vehicle.license_plate}
                            </p>
                          </div>
                          <div style={{ fontSize: '1.5rem' }}>🚗</div>
                        </div>
                      </div>
                    ))}
                    
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#EBF8FF',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{ fontWeight: '500', color: '#1E40AF', margin: '0 0 0.5rem 0' }}>
                        Tesla Integration Ready
                      </h4>
                      <p style={{ color: '#1E40AF', fontSize: '14px', margin: '0 0 1rem 0' }}>
                        Once connected, we'll automatically send navigation and parking instructions to your Tesla.
                      </p>
                      <button
                        onClick={() => {
                          window.location.href = `https://auth.tesla.com/oauth2/v3/authorize?client_id=${process.env.REACT_APP_TESLA_CLIENT_ID}&redirect_uri=https://driveway-hub.app/auth/callback&response_type=code&scope=vehicle:read`;
                        }}
                        style={{
                          ...styles.button,
                          padding: '8px 16px',
                          fontSize: '14px'
                        }}
                      >
                        Connect Tesla Account
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          }
        />
      )}
      {step === 'book' && (
        <Route
          path="/book"
          element={<BookStep />}
        />
      )}
      {step === 'confirm' && (
        <Route
          path="/confirm"
          element={
            <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ ...styles.card, maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#D1FAE5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto'
                }}>
                  <svg width="32" height="32" fill="none" stroke="#059669" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669', marginBottom: '1rem' }}>
                  Booking Confirmed!
                </h2>
                
                {booking && (
                  <div style={{
                    textAlign: 'left',
                    backgroundColor: '#F9FAFB',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>Booking Reference:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{booking.booking_reference}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total Paid:</span>
                      <span style={{ fontWeight: 'bold' }}>${booking.total_amount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
                      <span>Host receives:</span>
                      <span>${booking.host_payout.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280' }}>
                      <span>Platform fee:</span>
                      <span>${booking.platform_fee.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button
                    onClick={resetBooking}
                    style={{ ...styles.button, width: '100%' }}
                  >
                    Book Another Spot
                  </button>
                    
                  <div style={{ fontSize: '14px', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ margin: 0 }}>✅ Navigation sent to your Tesla</p>
                    <p style={{ margin: 0 }}>✅ Host has been notified</p>
                    <p style={{ margin: 0 }}>✅ Confirmation email sent</p>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      )}
      <Route path="/auth/callback" element={<TeslaLogin />} />
    </Routes>
  );
}

export default App;