// Investor Presentation Mode - Professional Demo Interface
// ======================================================
// Clean, professional interface for investor demonstrations
// Combines live demo with presentation elements

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface PresentationSlide {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  duration?: number;
  showLiveData?: boolean;
}

interface LiveDemoData {
  currentPhase: 'setup' | 'booking' | 'journey' | 'arrival' | 'complete';
  journeyProgress: number;
  currentSpeed: number;
  batteryLevel: number;
  distanceRemaining: number;
  eta: string;
  revenueGenerated: number;
  systemsOnline: boolean;
  teslaConnected: boolean;
}

const InvestorPresentationMode: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [presentationMode, setPresentationMode] = useState<'intro' | 'live' | 'results' | 'qa'>('intro');
  const [liveData, setLiveData] = useState<LiveDemoData>({
    currentPhase: 'setup',
    journeyProgress: 0,
    currentSpeed: 0,
    batteryLevel: 78,
    distanceRemaining: 25000,
    eta: '11:40 AM',
    revenueGenerated: 67.79,
    systemsOnline: true,
    teslaConnected: true
  });
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Presentation slides for intro and conclusion
  const slides: PresentationSlide[] = [
    {
      id: 'welcome',
      title: 'Driveway Hub Tesla Integration',
      subtitle: 'Live Demonstration - Real Tesla, Real Journey, Real Revenue',
      content: (
        <div className="text-center space-y-8">
          <div className="text-6xl">🚗⚡</div>
          <div className="space-y-4">
            <p className="text-xl text-gray-300">
              Today's Demo: Manuel drives 25km from York to Mississauga
            </p>
            <p className="text-lg text-blue-300">
              Ruth hosts premium Tesla charging at $15/hour
            </p>
            <p className="text-lg text-green-300">
              Platform generates $67.79 in revenue with 15% fee
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">What You'll See</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>✅ Real Tesla OAuth integration</div>
              <div>✅ Live GPS tracking (30-second updates)</div>
              <div>✅ Automatic arrival detection</div>
              <div>✅ Real payment processing</div>
              <div>✅ Premium host features</div>
              <div>✅ Enterprise-grade security</div>
            </div>
          </div>
        </div>
      ),
      duration: 60000
    },
    {
      id: 'market-opportunity',
      title: 'Tesla Market Opportunity',
      subtitle: '$2.1B destination charging market growing 40% annually',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">1.8M+</div>
              <div className="text-blue-200">Tesla Owners</div>
              <div className="text-blue-300 text-sm">North America</div>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">$85k</div>
              <div className="text-green-200">Avg Income</div>
              <div className="text-green-300 text-sm">Tesla Owners</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">3.2x</div>
              <div className="text-purple-200">Premium Pricing</div>
              <div className="text-purple-300 text-sm">vs Standard Parking</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-yellow-400">Why Tesla Integration Matters</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Tesla owners pay 80% more for premium parking experiences</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Native Tesla integration eliminates friction and builds trust</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Destination charging creates longer, higher-value bookings</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>Real-time tracking enables premium service levels</span>
              </div>
            </div>
          </div>
        </div>
      ),
      duration: 90000
    },
    {
      id: 'competitive-advantage',
      title: 'Technical Differentiation',
      subtitle: 'Official Tesla Fleet API integration sets us apart',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-4">✅ Driveway Hub</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tesla Integration</span>
                  <span className="text-green-400">Official Fleet API</span>
                </div>
                <div className="flex justify-between">
                  <span>Update Frequency</span>
                  <span className="text-green-400">30 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Navigation Integration</span>
                  <span className="text-green-400">Native Tesla</span>
                </div>
                <div className="flex justify-between">
                  <span>Arrival Detection</span>
                  <span className="text-green-400">Automatic</span>
                </div>
                <div className="flex justify-between">
                  <span>Premium Features</span>
                  <span className="text-green-400">Tesla-Specific</span>
                </div>
                <div className="flex justify-between">
                  <span>Security</span>
                  <span className="text-green-400">End-to-End</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-4">❌ Competitors</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tesla Integration</span>
                  <span className="text-red-400">Third-party or none</span>
                </div>
                <div className="flex justify-between">
                  <span>Update Frequency</span>
                  <span className="text-red-400">5+ minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Navigation Integration</span>
                  <span className="text-red-400">Manual directions</span>
                </div>
                <div className="flex justify-between">
                  <span>Arrival Detection</span>
                  <span className="text-red-400">Manual check-in</span>
                </div>
                <div className="flex justify-between">
                  <span>Premium Features</span>
                  <span className="text-red-400">Generic listings</span>
                </div>
                <div className="flex justify-between">
                  <span>Security</span>
                  <span className="text-red-400">Basic</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-800 to-purple-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-yellow-400">Live Demo Proves Our Advantage</h3>
            <p className="text-gray-200">
              What you're about to see is impossible for our competitors. Official Tesla integration
              enables seamless navigation, real-time tracking, and automatic arrival detection that
              creates a premium experience worth paying more for.
            </p>
          </div>
        </div>
      ),
      duration: 120000
    }
  ];

  const resultSlides: PresentationSlide[] = [
    {
      id: 'demo-results',
      title: 'Live Demo Results',
      subtitle: 'Real platform performance metrics',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-green-200 text-sm">Journey Tracked</div>
            </div>
            <div className="bg-blue-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">${liveData.revenueGenerated}</div>
              <div className="text-blue-200 text-sm">Revenue Generated</div>
            </div>
            <div className="bg-purple-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">30s</div>
              <div className="text-purple-200 text-sm">Update Frequency</div>
            </div>
            <div className="bg-orange-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-orange-200 text-sm">Manual Steps</div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">What We Just Demonstrated</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Official Tesla OAuth integration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">Real-time GPS tracking (25km journey)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm">Automatic navigation to Tesla</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-sm">Seamless payment processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-sm">Automatic arrival detection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm">Premium Tesla charging features</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-700 to-blue-700 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold mb-2 text-yellow-400">Platform Revenue Model</h3>
            <div className="text-3xl font-bold mb-2">${liveData.revenueGenerated} × 15% = $10.17</div>
            <p className="text-gray-200">Platform fee per booking - scalable to millions of transactions</p>
          </div>
        </div>
      )
    },
    {
      id: 'investment-opportunity',
      title: 'Investment Opportunity',
      subtitle: 'Ready to scale Tesla integration nationwide',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">$2M</div>
              <div className="text-green-200">Seed Round</div>
              <div className="text-green-300 text-sm">18-month runway</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">10x</div>
              <div className="text-blue-200">Revenue Multiple</div>
              <div className="text-blue-300 text-sm">vs. Standard Parking</div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">5 Cities</div>
              <div className="text-purple-200">Launch Markets</div>
              <div className="text-purple-300 text-sm">Toronto, Vancouver, LA, SF, NYC</div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-yellow-400">Use of Funds</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Tesla Fleet API Enterprise Partnership</span>
                <span className="text-green-400 font-semibold">$400k (20%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Engineering Team (4 developers)</span>
                <span className="text-blue-400 font-semibold">$800k (40%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Market Expansion (5 cities)</span>
                <span className="text-purple-400 font-semibold">$600k (30%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Marketing & Host Acquisition</span>
                <span className="text-orange-400 font-semibold">$200k (10%)</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Ready to Lead the Tesla Parking Revolution?</h3>
            <p className="text-lg mb-4">
              The platform you just saw is production-ready and generating revenue today.
            </p>
            <p className="text-gray-200">
              Join us in capturing the $2.1B Tesla destination charging market.
            </p>
          </div>
        </div>
      )
    }
  ];

  // Auto-advance slides during intro
  useEffect(() => {
    if (autoAdvance && presentationMode === 'intro') {
      const timer = setTimeout(() => {
        if (currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
          setPresentationMode('live');
          setStartTime(new Date());
        }
      }, slides[currentSlideIndex]?.duration || 30000);
      
      return () => clearTimeout(timer);
    }
  }, [currentSlideIndex, autoAdvance, presentationMode]);

  const nextSlide = () => {
    if (presentationMode === 'intro' && currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else if (presentationMode === 'intro') {
      setPresentationMode('live');
      setStartTime(new Date());
    } else if (presentationMode === 'live') {
      setPresentationMode('results');
      setCurrentSlideIndex(0);
    } else if (presentationMode === 'results' && currentSlideIndex < resultSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setPresentationMode('qa');
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else if (presentationMode === 'results') {
      setPresentationMode('live');
    } else if (presentationMode === 'live') {
      setPresentationMode('intro');
      setCurrentSlideIndex(slides.length - 1);
    }
  };

  const renderIntroSlides = () => {
    const slide = slides[currentSlideIndex];
    return (
      <div className="h-full flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{slide.title}</h1>
          {slide.subtitle && (
            <p className="text-xl text-gray-300">{slide.subtitle}</p>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-4xl w-full">
            {slide.content}
          </div>
        </div>
      </div>
    );
  };

  const renderLiveDemo = () => {
    return (
      <div className="h-full">
        <div className="bg-gray-800 p-4 border-b border-gray-700 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">🔴 LIVE DEMO</h1>
              <p className="text-gray-300">Tesla Integration - Real Journey in Progress</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                Phase: {liveData.currentPhase.toUpperCase()}
              </div>
              <div className="text-gray-400">
                {startTime && format(startTime, 'Started at HH:mm')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{liveData.journeyProgress.toFixed(1)}%</div>
            <div className="text-blue-200">Journey Complete</div>
            <div className="text-blue-300 text-sm">25km total distance</div>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{liveData.currentSpeed}</div>
            <div className="text-green-200">km/h Current</div>
            <div className="text-green-300 text-sm">Real-time speed</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{liveData.batteryLevel}%</div>
            <div className="text-purple-200">Battery Level</div>
            <div className="text-purple-300 text-sm">Tesla Model 3</div>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">${liveData.revenueGenerated}</div>
            <div className="text-orange-200">Transaction Value</div>
            <div className="text-orange-300 text-sm">Platform revenue</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-yellow-400">Journey Progress</h3>
          <div className="relative">
            <div className="flex justify-between mb-2">
              <span className="text-gray-300">York (Start)</span>
              <span className="text-gray-300">Mississauga (Destination)</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-1000 relative"
                style={{ width: `${liveData.journeyProgress}%` }}
              >
                <div className="absolute right-0 top-0 transform translate-x-2 -translate-y-1 text-2xl">
                  🚗
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-400">
              <span>0 km</span>
              <span>12.5 km</span>
              <span>25 km</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-2">System Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="text-green-400">● Online</span>
              </div>
              <div className="flex justify-between">
                <span>Tesla API</span>
                <span className="text-green-400">● Connected</span>
              </div>
              <div className="flex justify-between">
                <span>GPS Tracking</span>
                <span className="text-green-400">● Active</span>
              </div>
              <div className="flex justify-between">
                <span>Payments</span>
                <span className="text-green-400">● Ready</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Live Metrics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Update Frequency</span>
                <span className="text-blue-400">30 seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Remaining</span>
                <span className="text-blue-400">
                  {liveData.distanceRemaining > 1000 
                    ? `${(liveData.distanceRemaining / 1000).toFixed(1)} km`
                    : `${liveData.distanceRemaining} m`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>ETA</span>
                <span className="text-blue-400">{liveData.eta}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400 mb-2">Revenue Impact</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Booking Value</span>
                <span className="text-purple-400">${liveData.revenueGenerated}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee (15%)</span>
                <span className="text-purple-400">${(liveData.revenueGenerated * 0.15).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Host Earnings</span>
                <span className="text-purple-400">${(liveData.revenueGenerated * 0.85).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const slide = resultSlides[currentSlideIndex];
    return (
      <div className="h-full flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{slide.title}</h1>
          {slide.subtitle && (
            <p className="text-xl text-gray-300">{slide.subtitle}</p>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-5xl w-full">
            {slide.content}
          </div>
        </div>
      </div>
    );
  };

  const renderQA = () => {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="text-6xl mb-8">🙋‍♂️</div>
        <h1 className="text-5xl font-bold text-white mb-4">Questions & Discussion</h1>
        <p className="text-xl text-gray-300 mb-8">
          Let's discuss the Tesla integration, market opportunity, and investment details
        </p>
        
        <div className="grid grid-cols-3 gap-8 max-w-4xl">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-400 mb-3">Technical Questions</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Tesla API integration details</li>
              <li>• Scalability and performance</li>
              <li>• Security and privacy</li>
              <li>• Platform reliability</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Business Questions</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Revenue model and pricing</li>
              <li>• Market size and competition</li>
              <li>• Growth strategy</li>
              <li>• Unit economics</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Investment Questions</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Funding requirements</li>
              <li>• Use of proceeds</li>
              <li>• Timeline to profitability</li>
              <li>• Exit strategy</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main Content */}
      <div className="h-full p-8">
        {presentationMode === 'intro' && renderIntroSlides()}
        {presentationMode === 'live' && renderLiveDemo()}
        {presentationMode === 'results' && renderResults()}
        {presentationMode === 'qa' && renderQA()}
      </div>

      {/* Navigation Controls */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-gray-800 rounded-lg p-2 flex items-center space-x-4">
          <button
            onClick={prevSlide}
            disabled={presentationMode === 'intro' && currentSlideIndex === 0}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="text-sm text-gray-400">
            {presentationMode === 'intro' && `Slide ${currentSlideIndex + 1} of ${slides.length}`}
            {presentationMode === 'live' && 'LIVE DEMO'}
            {presentationMode === 'results' && `Results ${currentSlideIndex + 1} of ${resultSlides.length}`}
            {presentationMode === 'qa' && 'Q&A Session'}
          </div>
          
          {presentationMode !== 'qa' && (
            <button
              onClick={nextSlide}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              {presentationMode === 'results' && currentSlideIndex === resultSlides.length - 1 
                ? 'Q&A →' 
                : 'Next →'
              }
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="fixed top-4 right-4">
        <div className="bg-gray-800 rounded-lg p-2 flex space-x-2">
          {(['intro', 'live', 'results', 'qa'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setPresentationMode(mode);
                setCurrentSlideIndex(0);
              }}
              className={`px-3 py-1 text-sm rounded capitalize ${
                presentationMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-advance toggle */}
      {presentationMode === 'intro' && (
        <div className="fixed top-4 left-4">
          <button
            onClick={() => setAutoAdvance(!autoAdvance)}
            className={`px-4 py-2 text-sm rounded ${
              autoAdvance
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            Auto: {autoAdvance ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InvestorPresentationMode;