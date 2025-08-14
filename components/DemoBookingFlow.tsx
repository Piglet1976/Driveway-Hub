// Tesla Demo Booking Flow - Manuel books Ruth's Spot
// =================================================
// Complete booking flow for investor demonstration
// Shows search, selection, Tesla integration, and payment

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format, addHours } from 'date-fns';

interface DrivewayListing {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  hourlyRate: number;
  dailyRate: number;
  hasEvCharging: boolean;
  chargingConnectorType: string;
  hasCoveredParking: boolean;
  hasSecurity: boolean;
  photos: string[];
  hostName: string;
  ratings: number;
  reviewCount: number;
  instantBookingEnabled: boolean;
}

interface Vehicle {
  id: string;
  displayName: string;
  model: string;
  year: number;
  color: string;
  batteryLevel: number;
  range: number;
}

const MANUEL_LOCATION = {
  lat: 43.689042,
  lng: -79.451344,
  address: '372 McRoberts Ave, York, ON M6E 4R2'
};

const DemoBookingFlow: React.FC = () => {
  // Flow state
  const [currentStep, setCurrentStep] = useState<'search' | 'select' | 'booking' | 'payment' | 'confirmation'>('search');
  const [searchLocation, setSearchLocation] = useState('Mississauga, ON');
  const [searchDate, setSearchDate] = useState(new Date());
  const [searchDuration, setSearchDuration] = useState(4); // hours
  const [listings, setListings] = useState<DrivewayListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<DrivewayListing | null>(null);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  
  // Demo data
  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = () => {
    // Ruth's premium Tesla charging driveway
    const ruthsDriveway: DrivewayListing = {
      id: 'ruth-mississauga-tesla',
      title: 'Premium Tesla Destination - Mississauga',
      description: 'Executive Tesla charging station in upscale Mississauga neighborhood. Features Tesla Wall Connector with 48A charging (11.5 kW), covered parking, and 24/7 security.',
      address: '528 Bluesky Crescent',
      city: 'Mississauga',
      state: 'ON',
      zipCode: 'L5R 2S3',
      latitude: 43.571234,
      longitude: -79.684567,
      hourlyRate: 15.00,
      dailyRate: 95.00,
      hasEvCharging: true,
      chargingConnectorType: 'Tesla Wall Connector (48A)',
      hasCoveredParking: true,
      hasSecurity: true,
      photos: [
        'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=800',
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800'
      ],
      hostName: 'Ruth T.',
      ratings: 4.9,
      reviewCount: 47,
      instantBookingEnabled: true
    };

    // Manuel's Tesla
    const manuelsTesla: Vehicle = {
      id: 'manuel-tesla-model3',
      displayName: 'Manuel\'s Model 3 Performance',
      model: 'Model 3 Performance',
      year: 2024,
      color: 'Midnight Silver Metallic',
      batteryLevel: 78,
      range: 315
    };

    setListings([ruthsDriveway]);
    setUserVehicles([manuelsTesla]);
    setSelectedVehicle(manuelsTesla);
  };

  const handleSearch = () => {
    setCurrentStep('select');
  };

  const selectListing = (listing: DrivewayListing) => {
    setSelectedListing(listing);
    setCurrentStep('booking');
  };

  const handleBooking = async () => {
    // Simulate booking creation
    const newBookingId = `DH-DEMO-${Date.now()}`;
    setBookingId(newBookingId);
    setCurrentStep('payment');

    // Auto-advance to confirmation after 3 seconds (demo)
    setTimeout(() => {
      setCurrentStep('confirmation');
    }, 3000);
  };

  const calculateTotalCost = () => {
    if (!selectedListing) return 0;
    return selectedListing.hourlyRate * searchDuration;
  };

  const renderSearchStep = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Find Tesla Charging</h2>
        <p className="text-gray-600">Search for premium Tesla charging destinations</p>
      </div>

      <div className="space-y-4">
        {/* Location Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Where do you need charging?
          </label>
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="City, address, or landmark"
          />
        </div>

        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={format(searchDate, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setSearchDate(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <select
              value={searchDuration}
              onChange={(e) => setSearchDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={24}>Full day</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
        >
          🔍 Search Tesla Charging Locations
        </button>

        {/* Demo Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-yellow-800 text-sm">
            <span className="font-semibold">Demo Mode:</span> Showing premium Tesla charging locations in Mississauga area
          </p>
        </div>
      </div>
    </div>
  );

  const renderSelectStep = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Premium Tesla Charging</h2>
          <p className="text-gray-600">
            Found {listings.length} premium location near {searchLocation}
          </p>
        </div>
        <button
          onClick={() => setCurrentStep('search')}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
        >
          ← Modify Search
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="h-96 rounded-lg overflow-hidden">
          <MapContainer
            center={[43.571234, -79.684567]}
            zoom={12}
            className="h-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Manuel's location */}
            <Marker position={[MANUEL_LOCATION.lat, MANUEL_LOCATION.lng]}>
              <Popup>
                <strong>Your Location</strong><br />
                {MANUEL_LOCATION.address}
              </Popup>
            </Marker>

            {/* Listings */}
            {listings.map((listing) => (
              <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
                <Popup>
                  <strong>{listing.title}</strong><br />
                  ${listing.hourlyRate}/hour<br />
                  {listing.chargingConnectorType}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Listing Details */}
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{listing.title}</h3>
                  <p className="text-gray-600">{listing.address}, {listing.city}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">${listing.hourlyRate}/hour</div>
                  <div className="text-sm text-gray-500">${listing.dailyRate}/day</div>
                </div>
              </div>

              <p className="text-gray-700 mb-3">{listing.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.hasEvCharging && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    ⚡ {listing.chargingConnectorType}
                  </span>
                )}
                {listing.hasCoveredParking && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    🏠 Covered
                  </span>
                )}
                {listing.hasSecurity && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                    🛡️ Secure
                  </span>
                )}
                {listing.instantBookingEnabled && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                    ⚡ Instant Book
                  </span>
                )}
              </div>

              {/* Host & Reviews */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                  <span className="text-gray-700">Hosted by {listing.hostName}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1 text-gray-700">{listing.ratings} ({listing.reviewCount} reviews)</span>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={() => selectListing(listing)}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-semibold"
              >
                Book This Tesla Charging Spot - ${calculateTotalCost().toFixed(2)} total
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBookingStep = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Confirm Your Booking</h2>

      {selectedListing && (
        <>
          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">{selectedListing.title}</h3>
            <p className="text-gray-600 mb-2">{selectedListing.address}, {selectedListing.city}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">{format(searchDate, 'PPP')}</span>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <span className="ml-2 font-medium">{format(searchDate, 'p')} - {format(addHours(searchDate, searchDuration), 'p')}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium">{searchDuration} hours</span>
              </div>
              <div>
                <span className="text-gray-500">Rate:</span>
                <span className="ml-2 font-medium">${selectedListing.hourlyRate}/hour</span>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Select Your Tesla</h3>
            {userVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedVehicle?.id === vehicle.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{vehicle.displayName}</h4>
                    <p className="text-gray-600">{vehicle.year} {vehicle.model} - {vehicle.color}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Battery</div>
                    <div className="font-semibold text-green-600">{vehicle.batteryLevel}%</div>
                    <div className="text-xs text-gray-400">{vehicle.range} km range</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tesla Features */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">🚗 Tesla Integration Enabled</h3>
            <ul className="text-green-700 text-sm space-y-1">
              <li>• Navigation will be automatically sent to your Tesla</li>
              <li>• Real-time tracking during your journey</li>
              <li>• Automatic arrival detection</li>
              <li>• Charging session monitoring</li>
            </ul>
          </div>

          {/* Cost Breakdown */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Cost Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Parking ({searchDuration} hours @ ${selectedListing.hourlyRate}/hr)</span>
                <span>${(selectedListing.hourlyRate * searchDuration).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span>$2.99</span>
              </div>
              <div className="flex justify-between">
                <span>HST (13%)</span>
                <span>${((selectedListing.hourlyRate * searchDuration + 2.99) * 0.13).toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${((selectedListing.hourlyRate * searchDuration + 2.99) * 1.13).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Book Button */}
          <button
            onClick={handleBooking}
            className="w-full bg-blue-600 text-white py-4 px-4 rounded-md hover:bg-blue-700 transition-colors text-lg font-semibold"
          >
            Confirm Booking & Send Navigation to Tesla
          </button>
        </>
      )}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Processing Payment</h2>
      <p className="text-gray-600 mb-4">Securing your Tesla charging spot...</p>
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-blue-800 text-sm">
          🚗 Navigation is being sent to your Tesla<br />
          📍 Real-time tracking will begin shortly
        </p>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">Your Tesla charging spot is reserved</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Booking Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Booking ID:</span>
            <span className="font-mono">{bookingId}</span>
          </div>
          <div className="flex justify-between">
            <span>Location:</span>
            <span>{selectedListing?.address}, {selectedListing?.city}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>{format(searchDate, 'PPP p')}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{searchDuration} hours</span>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">🚗 Tesla Integration Active</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>✅ Navigation sent to your Tesla</li>
          <li>✅ Real-time tracking enabled</li>
          <li>✅ Host notifications activated</li>
          <li>✅ Arrival detection ready</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors">
          View Live Tracking
        </button>
        <button className="bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors">
          Get Directions
        </button>
      </div>

      {/* Demo Success Message */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-yellow-800 text-sm text-center">
          <span className="font-semibold">Demo Complete!</span> Ready to begin live tracking journey
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'search': return renderSearchStep();
      case 'select': return renderSelectStep();
      case 'booking': return renderBookingStep();
      case 'payment': return renderPaymentStep();
      case 'confirmation': return renderConfirmationStep();
      default: return renderSearchStep();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {['search', 'select', 'booking', 'payment', 'confirmation'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : ['search', 'select', 'booking', 'payment', 'confirmation'].indexOf(currentStep) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {['search', 'select', 'booking', 'payment', 'confirmation'].indexOf(currentStep) > index ? '✓' : index + 1}
              </div>
              <span className="ml-2 text-sm font-medium capitalize hidden sm:inline">
                {step === 'select' ? 'Choose' : step}
              </span>
              {index < 4 && <div className="w-12 h-0.5 bg-gray-300 ml-4"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      {renderCurrentStep()}
    </div>
  );
};

export default DemoBookingFlow;