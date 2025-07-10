-- Driveway-Hub Database Implementation
-- PostgreSQL 14+ with PostGIS Extensions
-- 
-- Usage:
-- 1. Create database: CREATE DATABASE driveway_hub_dev;
-- 2. Connect to database: \c driveway_hub_dev;
-- 3. Run this script: \i database-implementation.sql

-- =============================================================================
-- EXTENSIONS AND SETUP
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- PostGIS for geospatial queries (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Set timezone
SET timezone = 'UTC';

-- =============================================================================
-- CUSTOM TYPES AND DOMAINS
-- =============================================================================

-- Custom types for better type safety
CREATE TYPE user_type_enum AS ENUM ('driver', 'host', 'both');
CREATE TYPE account_status_enum AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE driveway_type_enum AS ENUM ('concrete', 'asphalt', 'gravel', 'paved');
CREATE TYPE listing_status_enum AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');
CREATE TYPE payout_status_enum AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
CREATE TYPE availability_type_enum AS ENUM ('available', 'blocked', 'booked');
CREATE TYPE review_type_enum AS ENUM ('driver_to_host', 'host_to_driver');
CREATE TYPE event_category_enum AS ENUM ('auth', 'booking', 'payment', 'tesla', 'admin', 'security');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    profile_image_url TEXT,
    user_type user_type_enum NOT NULL,
    
    -- Tesla Integration
    tesla_access_token TEXT,
    tesla_refresh_token TEXT,
    tesla_token_expires_at TIMESTAMP WITH TIME ZONE,
    tesla_user_id VARCHAR(100),
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(100),
    stripe_connect_account_id VARCHAR(100), -- For hosts
    
    -- Account Status
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    identity_verified BOOLEAN DEFAULT FALSE,
    account_status account_status_enum DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tesla Vehicle Data
    tesla_vehicle_id BIGINT UNIQUE NOT NULL,
    vin VARCHAR(17) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    
    -- Vehicle Specifications (in inches)
    length_inches INTEGER NOT NULL DEFAULT 185, -- Model 3 default
    width_inches INTEGER NOT NULL DEFAULT 73,
    height_inches INTEGER NOT NULL DEFAULT 57,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_vin CHECK (LENGTH(vin) = 17),
    CONSTRAINT valid_year CHECK (year >= 2012 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2),
    CONSTRAINT positive_dimensions CHECK (
        length_inches > 0 AND width_inches > 0 AND height_inches > 0
    )
);

-- Driveways table
CREATE TABLE driveways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Location Information
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'San Francisco',
    state VARCHAR(2) NOT NULL DEFAULT 'CA',
    zip_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Driveway Specifications
    title VARCHAR(200) NOT NULL,
    description TEXT,
    driveway_type driveway_type_enum NOT NULL,
    is_covered BOOLEAN DEFAULT FALSE,
    max_vehicle_length INTEGER NOT NULL, -- inches
    max_vehicle_width INTEGER NOT NULL,  -- inches
    max_vehicle_height INTEGER,          -- inches (for covered driveways)
    
    -- Pricing (in USD)
    hourly_rate DECIMAL(8,2) NOT NULL,
    daily_rate DECIMAL(8,2),
    weekly_rate DECIMAL(8,2),
    monthly_rate DECIMAL(8,2),
    
    -- Booking Settings
    minimum_booking_hours INTEGER DEFAULT 1,
    maximum_booking_hours INTEGER DEFAULT 168, -- 1 week
    advance_booking_hours INTEGER DEFAULT 1,
    instant_booking_enabled BOOLEAN DEFAULT TRUE,
    
    -- Special Features
    has_ev_charging BOOLEAN DEFAULT FALSE,
    charging_connector_type VARCHAR(20), -- 'tesla', 'j1772', 'ccs', etc.
    has_security_camera BOOLEAN DEFAULT FALSE,
    has_lighting BOOLEAN DEFAULT FALSE,
    
    -- Instructions
    access_instructions TEXT,
    special_instructions TEXT,
    
    -- Status
    listing_status listing_status_enum DEFAULT 'active',
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
    ),
    CONSTRAINT positive_rates CHECK (
        hourly_rate > 0 AND 
        (daily_rate IS NULL OR daily_rate > 0) AND
        (weekly_rate IS NULL OR weekly_rate > 0) AND
        (monthly_rate IS NULL OR monthly_rate > 0)
    ),
    CONSTRAINT positive_dimensions CHECK (
        max_vehicle_length > 0 AND max_vehicle_width > 0 AND
        (max_vehicle_height IS NULL OR max_vehicle_height > 0)
    ),
    CONSTRAINT valid_booking_hours CHECK (
        minimum_booking_hours > 0 AND 
        maximum_booking_hours >= minimum_booking_hours AND
        advance_booking_hours >= 0
    ),
    CONSTRAINT covered_height_required CHECK (
        (is_covered = FALSE) OR (is_covered = TRUE AND max_vehicle_height IS NOT NULL)
    )
);

-- Driveway Photos table
CREATE TABLE driveway_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driveway_id UUID NOT NULL REFERENCES driveways(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_order INTEGER NOT NULL DEFAULT 1,
    caption TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_photo_order CHECK (photo_order > 0),
    CONSTRAINT valid_photo_url CHECK (photo_url ~* '^https?://.*\.(jpg|jpeg|png|webp)(\?.*)?$'),
    
    -- Unique constraint for order per driveway
    UNIQUE(driveway_id, photo_order)
);

-- Driveway Availability table
CREATE TABLE driveway_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driveway_id UUID NOT NULL REFERENCES driveways(id) ON DELETE CASCADE,
    
    -- Availability Type
    availability_type availability_type_enum NOT NULL,
    
    -- Time Range
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Recurring Rules (for regular schedules)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE format for complex recurring patterns
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    driver_id UUID NOT NULL REFERENCES users(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driveway_id UUID NOT NULL REFERENCES driveways(id),
    host_id UUID NOT NULL REFERENCES users(id),
    
    -- Booking Details
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Pricing (in USD)
    hourly_rate DECIMAL(8,2) NOT NULL,
    total_hours DECIMAL(4,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Status Tracking
    booking_status booking_status_enum NOT NULL DEFAULT 'pending',
    
    -- Tesla Integration Status
    tesla_navigation_sent BOOLEAN DEFAULT FALSE,
    auto_park_attempted BOOLEAN DEFAULT FALSE,
    auto_park_successful BOOLEAN DEFAULT FALSE,
    arrival_detected_at TIMESTAMP WITH TIME ZONE,
    departure_detected_at TIMESTAMP WITH TIME ZONE,
    
    -- Special Instructions
    driver_notes TEXT,
    host_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT valid_total_calculation CHECK (ABS(total_amount - (subtotal + platform_fee)) < 0.01),
    CONSTRAINT positive_amounts CHECK (
        hourly_rate > 0 AND total_hours > 0 AND 
        subtotal > 0 AND platform_fee >= 0 AND total_amount > 0
    ),
    CONSTRAINT valid_booking_reference CHECK (booking_reference ~* '^DH-[A-Z0-9]{6}$')
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    
    -- Stripe Integration
    stripe_payment_intent_id VARCHAR(200) UNIQUE NOT NULL,
    stripe_charge_id VARCHAR(200),
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', etc.
    
    -- Status
    payment_status payment_status_enum NOT NULL,
    
    -- Timing
    authorized_at TIMESTAMP WITH TIME ZONE,
    captured_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10,2),
    
    -- Error Handling
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD')),
    CONSTRAINT valid_refund_amount CHECK (
        refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount)
    )
);

-- Payouts table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES users(id),
    
    -- Stripe Connect Integration
    stripe_transfer_id VARCHAR(200) UNIQUE,
    stripe_payout_id VARCHAR(200),
    
    -- Payout Details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    
    -- Status
    payout_status payout_status_enum NOT NULL DEFAULT 'pending',
    
    -- Timing
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Error Handling
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_period CHECK (payout_period_end >= payout_period_start)
);

-- Payout Line Items table
CREATE TABLE payout_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id),
    
    -- Amounts
    booking_total DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    host_amount DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT positive_amounts CHECK (
        booking_total > 0 AND platform_fee >= 0 AND host_amount > 0
    ),
    CONSTRAINT valid_calculation CHECK (
        ABS(host_amount - (booking_total - platform_fee)) < 0.01
    ),
    
    -- Ensure one booking per payout
    UNIQUE(payout_id, booking_id)
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    
    -- Review Content
    rating INTEGER NOT NULL,
    review_text TEXT,
    review_type review_type_enum NOT NULL,
    
    -- Status
    is_published BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviewer_not_reviewee CHECK (reviewer_id != reviewee_id),
    
    -- Ensure one review per booking per direction
    UNIQUE(booking_id, reviewer_id, review_type)
);

-- =============================================================================
-- SUPPORTING TABLES
-- =============================================================================

-- Audit Log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    event_category event_category_enum NOT NULL,
    description TEXT NOT NULL,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Related Records
    related_booking_id UUID,
    related_driveway_id UUID,
    related_payment_id UUID,
    
    -- Additional Data
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_setting_type CHECK (setting_type IN ('string', 'number', 'boolean', 'json'))
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tesla_user_id ON users(tesla_user_id) WHERE tesla_user_id IS NOT NULL;
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_users_type_status ON users(user_type, account_status);

-- Vehicles table indexes
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_tesla_vehicle_id ON vehicles(tesla_vehicle_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_active ON vehicles(user_id, is_active) WHERE is_active = TRUE;

-- Driveways table indexes
CREATE INDEX idx_driveways_host_id ON driveways(host_id);
CREATE INDEX idx_driveways_status ON driveways(listing_status, is_available);
CREATE INDEX idx_driveways_location ON driveways USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_driveways_available_location ON driveways USING GIST (ll_to_earth(latitude, longitude)) 
    WHERE listing_status = 'active' AND is_available = TRUE;
CREATE INDEX idx_driveways_city_state ON driveways(city, state);

-- Driveway Photos indexes
CREATE INDEX idx_driveway_photos_driveway_id ON driveway_photos(driveway_id);
CREATE INDEX idx_driveway_photos_order ON driveway_photos(driveway_id, photo_order);

-- Driveway Availability indexes
CREATE INDEX idx_availability_driveway_time ON driveway_availability(driveway_id, start_time, end_time);
CREATE INDEX idx_availability_type ON driveway_availability(availability_type);
CREATE INDEX idx_availability_time_range ON driveway_availability USING GIST (
    tstzrange(start_time, end_time)
);

-- Bookings table indexes
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_driveway_id ON bookings(driveway_id);
CREATE INDEX idx_bookings_host_id ON bookings(host_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_active_by_time ON bookings(booking_status, start_time, end_time) 
    WHERE booking_status IN ('confirmed', 'active');

-- Payments table indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Payouts table indexes
CREATE INDEX idx_payouts_host_id ON payouts(host_id);
CREATE INDEX idx_payouts_period ON payouts(payout_period_start, payout_period_end);
CREATE INDEX idx_payouts_status ON payouts(payout_status);

-- Payout Line Items indexes
CREATE INDEX idx_payout_line_items_payout_id ON payout_line_items(payout_id);
CREATE INDEX idx_payout_line_items_booking_id ON payout_line_items(booking_id);

-- Reviews table indexes
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_published ON reviews(reviewee_id, is_published) WHERE is_published = TRUE;

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_booking_id ON audit_logs(related_booking_id) WHERE related_booking_id IS NOT NULL;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driveways_updated_at BEFORE UPDATE ON driveways 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON driveway_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL SYSTEM SETTINGS
-- =============================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_fee_percentage', '15.0', 'number', 'Platform fee percentage (15%)', TRUE),
('max_booking_hours', '168', 'number', 'Maximum booking duration in hours (1 week)', TRUE),
('min_booking_hours', '1', 'number', 'Minimum booking duration in hours', TRUE),
('tesla_api_rate_limit', '200', 'number', 'Tesla API requests per hour limit', FALSE),
('payment_processing_fee', '2.9', 'number', 'Payment processing fee percentage', FALSE),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', FALSE),
('supported_cities', '["San Francisco"]', 'json', 'List of supported cities for MVP', TRUE),
('default_search_radius', '5', 'number', 'Default search radius in miles', TRUE),
('booking_cancellation_hours', '24', 'number', 'Hours before booking when cancellation is allowed', TRUE),
('auto_payout_day', 'friday', 'string', 'Day of week for automatic payouts', FALSE);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to generate booking reference codes
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate reference like DH-A1B2C3
        reference := 'DH-' || 
                    SUBSTRING(encode(gen_random_bytes(3), 'base64') FROM 1 FOR 6);
        reference := UPPER(TRANSLATE(reference, '+/=', 'XYZ'));
        
        -- Check if it exists
        SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_reference = reference) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
    END LOOP;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two points (in miles)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
    lat1 DECIMAL(10,8), 
    lon1 DECIMAL(11,8), 
    lat2 DECIMAL(10,8), 
    lon2 DECIMAL(11,8)
)
RETURNS DECIMAL(8,2) AS $$
BEGIN
    RETURN earth_distance(ll_to_earth(lat1, lon1), ll_to_earth(lat2, lon2)) * 0.000621371; -- Convert meters to miles
END;
$$ LANGUAGE plpgsql;

-- Function to check if a vehicle fits in a driveway
CREATE OR REPLACE FUNCTION vehicle_fits_driveway(
    vehicle_length INTEGER,
    vehicle_width INTEGER,
    vehicle_height INTEGER,
    driveway_max_length INTEGER,
    driveway_max_width INTEGER,
    driveway_max_height INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN vehicle_length <= driveway_max_length 
        AND vehicle_width <= driveway_max_width
        AND (driveway_max_height IS NULL OR vehicle_height <= driveway_max_height);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =============================================================================

-- Sample users (passwords are hashed with bcrypt)
INSERT INTO users (email, password_hash, first_name, last_name, user_type, email_verified) VALUES
('driver@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNdNbMn.lK6au', 'John', 'Driver', 'driver', TRUE),
('host@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNdNbMn.lK6au', 'Sarah', 'Host', 'host', TRUE),
('both@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNdNbMn.lK6au', 'Alex', 'Both', 'both', TRUE);

-- Sample vehicles
INSERT INTO vehicles (user_id, tesla_vehicle_id, vin, display_name, model, year, color) 
SELECT 
    u.id, 
    123456789, 
    '5YJ3E1EA1JF000001', 
    'My Model 3', 
    'Model 3', 
    2023, 
    'Pearl White'
FROM users u WHERE u.email = 'driver@test.com';

-- Sample driveways
INSERT INTO driveways (
    host_id, 
    title, 
    description, 
    address, 
    latitude, 
    longitude, 
    driveway_type, 
    is_covered, 
    max_vehicle_length, 
    max_vehicle_width, 
    max_vehicle_height, 
    hourly_rate
) 
SELECT 
    u.id,
    'Secure Covered Driveway in Mission',
    'Well-lit, gated driveway perfect for Tesla parking. Easy access and secure location.',
    '123 Mission St, San Francisco, CA 94103',
    37.7749,
    -122.4194,
    'concrete',
    TRUE,
    200,
    80,
    70,
    8.50
FROM users u WHERE u.email = 'host@test.com';

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for available driveways with host information
CREATE VIEW available_driveways AS
SELECT 
    d.*,
    u.first_name as host_first_name,
    u.profile_image_url as host_profile_image,
    COALESCE(AVG(r.rating), 0) as host_rating,
    COUNT(r.id) as host_review_count
FROM driveways d
JOIN users u ON d.host_id = u.id
LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.is_published = TRUE
WHERE d.listing_status = 'active' AND d.is_available = TRUE
GROUP BY d.id, u.id;

-- View for booking summaries
CREATE VIEW booking_summaries AS
SELECT 
    b.*,
    d.title as driveway_title,
    d.address as driveway_address,
    d.latitude as driveway_latitude,
    d.longitude as driveway_longitude,
    driver.first_name as driver_first_name,
    driver.last_name as driver_last_name,
    host.first_name as host_first_name,
    host.last_name as host_last_name,
    v.display_name as vehicle_display_name,
    v.model as vehicle_model,
    p.payment_status
FROM bookings b
JOIN driveways d ON b.driveway_id = d.id
JOIN users driver ON b.driver_id = driver.id
JOIN users host ON b.host_id = host.id
JOIN vehicles v ON b.vehicle_id = v.id
LEFT JOIN payments p ON p.booking_id = b.id;

-- View for host earnings summary
CREATE VIEW host_earnings AS
SELECT 
    h.id as host_id,
    h.first_name,
    h.last_name,
    COUNT(b.id) as total_bookings,
    SUM(CASE WHEN b.booking_status = 'completed' THEN b.subtotal - b.platform_fee ELSE 0 END) as total_earnings,
    AVG(CASE WHEN r.review_type = 'driver_to_host' THEN r.rating END) as average_rating,
    COUNT(CASE WHEN r.review_type = 'driver_to_host' THEN r.id END) as review_count
FROM users h
LEFT JOIN bookings b ON h.id = b.host_id
LEFT JOIN reviews r ON r.reviewee_id = h.id AND r.is_published = TRUE
WHERE h.user_type IN ('host', 'both')
GROUP BY h.id, h.first_name, h.last_name;

-- =============================================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =============================================================================

-- Procedure to search for available driveways
CREATE OR REPLACE FUNCTION search_available_driveways(
    search_lat DECIMAL(10,8),
    search_lng DECIMAL(11,8),
    search_radius_miles DECIMAL(4,2) DEFAULT 5,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    vehicle_length INTEGER DEFAULT NULL,
    vehicle_width INTEGER DEFAULT NULL,
    vehicle_height INTEGER DEFAULT NULL
)
RETURNS TABLE (
    driveway_id UUID,
    title VARCHAR(200),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    distance_miles DECIMAL(8,2),
    hourly_rate DECIMAL(8,2),
    is_covered BOOLEAN,
    has_ev_charging BOOLEAN,
    host_first_name VARCHAR(100),
    host_rating DECIMAL(3,2),
    host_review_count BIGINT,
    instant_booking BOOLEAN
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.address,
        d.latitude,
        d.longitude,
        calculate_distance_miles(search_lat, search_lng, d.latitude, d.longitude) as distance_miles,
        d.hourly_rate,
        d.is_covered,
        d.has_ev_charging,
        u.first_name,
        COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) as host_rating,
        COUNT(r.id) as host_review_count,
        d.instant_booking_enabled
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    LEFT JOIN reviews r ON r.reviewee_id = u.id AND r.is_published = TRUE
    WHERE 
        d.listing_status = 'active' 
        AND d.is_available = TRUE
        AND calculate_distance_miles(search_lat, search_lng, d.latitude, d.longitude) <= search_radius_miles
        AND (vehicle_length IS NULL OR vehicle_fits_driveway(
            vehicle_length, 
            COALESCE(vehicle_width, 0), 
            COALESCE(vehicle_height, 0),
            d.max_vehicle_length, 
            d.max_vehicle_width, 
            d.max_vehicle_height
        ))
        AND (start_time IS NULL OR end_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM driveway_availability da
            WHERE da.driveway_id = d.id
            AND da.availability_type = 'blocked'
            AND da.start_time < end_time
            AND da.end_time > start_time
        ))
        AND (start_time IS NULL OR end_time IS NULL OR NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.driveway_id = d.id
            AND b.booking_status IN ('confirmed', 'active')
            AND b.start_time < end_time
            AND b.end_time > start_time
        ))
    GROUP BY d.id, u.id
    ORDER BY distance_miles ASC;
END;
$ LANGUAGE plpgsql;

-- Procedure to create a new booking
CREATE OR REPLACE FUNCTION create_booking(
    p_driver_id UUID,
    p_vehicle_id UUID,
    p_driveway_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_driver_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR(20),
    total_amount DECIMAL(10,2),
    host_id UUID
) AS $
DECLARE
    v_host_id UUID;
    v_hourly_rate DECIMAL(8,2);
    v_total_hours DECIMAL(4,2);
    v_subtotal DECIMAL(10,2);
    v_platform_fee DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_booking_id UUID;
    v_booking_reference VARCHAR(20);
    v_platform_fee_pct DECIMAL(4,2);
BEGIN
    -- Get platform fee percentage from settings
    SELECT CAST(setting_value AS DECIMAL(4,2)) INTO v_platform_fee_pct
    FROM system_settings 
    WHERE setting_key = 'platform_fee_percentage';
    
    -- Get driveway details
    SELECT host_id, hourly_rate INTO v_host_id, v_hourly_rate
    FROM driveways 
    WHERE id = p_driveway_id AND listing_status = 'active' AND is_available = TRUE;
    
    IF v_host_id IS NULL THEN
        RAISE EXCEPTION 'Driveway not available for booking';
    END IF;
    
    -- Calculate pricing
    v_total_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
    v_subtotal := v_hourly_rate * v_total_hours;
    v_platform_fee := v_subtotal * (v_platform_fee_pct / 100.0);
    v_total_amount := v_subtotal + v_platform_fee;
    
    -- Generate booking reference
    v_booking_reference := generate_booking_reference();
    
    -- Create booking
    INSERT INTO bookings (
        driver_id,
        vehicle_id,
        driveway_id,
        host_id,
        booking_reference,
        start_time,
        end_time,
        hourly_rate,
        total_hours,
        subtotal,
        platform_fee,
        total_amount,
        driver_notes
    ) VALUES (
        p_driver_id,
        p_vehicle_id,
        p_driveway_id,
        v_host_id,
        v_booking_reference,
        p_start_time,
        p_end_time,
        v_hourly_rate,
        v_total_hours,
        v_subtotal,
        v_platform_fee,
        v_total_amount,
        p_driver_notes
    ) RETURNING id INTO v_booking_id;
    
    -- Log the booking creation
    INSERT INTO audit_logs (
        user_id,
        event_type,
        event_category,
        description,
        related_booking_id
    ) VALUES (
        p_driver_id,
        'booking_created',
        'booking',
        'New booking created: ' || v_booking_reference,
        v_booking_id
    );
    
    RETURN QUERY SELECT v_booking_id, v_booking_reference, v_total_amount, v_host_id;
END;
$ LANGUAGE plpgsql;

-- Procedure to process weekly payouts
CREATE OR REPLACE FUNCTION process_weekly_payouts()
RETURNS TABLE (
    host_id UUID,
    payout_amount DECIMAL(10,2),
    booking_count INTEGER
) AS $
DECLARE
    payout_start DATE;
    payout_end DATE;
    host_record RECORD;
    total_amount DECIMAL(10,2);
    booking_count INTEGER;
    payout_id UUID;
BEGIN
    -- Calculate payout period (previous week)
    payout_end := CURRENT_DATE - INTERVAL '1 day';
    payout_start := payout_end - INTERVAL '6 days';
    
    -- Process payouts for each host
    FOR host_record IN 
        SELECT DISTINCT b.host_id, u.first_name, u.last_name
        FROM bookings b
        JOIN users u ON b.host_id = u.id
        WHERE b.booking_status = 'completed'
        AND b.completed_at::DATE BETWEEN payout_start AND payout_end
        AND NOT EXISTS (
            SELECT 1 FROM payout_line_items pli
            WHERE pli.booking_id = b.id
        )
    LOOP
        -- Calculate total payout amount for this host
        SELECT 
            SUM(b.subtotal - b.platform_fee),
            COUNT(*)
        INTO total_amount, booking_count
        FROM bookings b
        WHERE b.host_id = host_record.host_id
        AND b.booking_status = 'completed'
        AND b.completed_at::DATE BETWEEN payout_start AND payout_end
        AND NOT EXISTS (
            SELECT 1 FROM payout_line_items pli
            WHERE pli.booking_id = b.id
        );
        
        -- Only create payout if amount > 0
        IF total_amount > 0 THEN
            -- Create payout record
            INSERT INTO payouts (
                host_id,
                amount,
                payout_period_start,
                payout_period_end
            ) VALUES (
                host_record.host_id,
                total_amount,
                payout_start,
                payout_end
            ) RETURNING id INTO payout_id;
            
            -- Create payout line items
            INSERT INTO payout_line_items (
                payout_id,
                booking_id,
                booking_total,
                platform_fee,
                host_amount
            )
            SELECT 
                payout_id,
                b.id,
                b.subtotal,
                b.platform_fee,
                b.subtotal - b.platform_fee
            FROM bookings b
            WHERE b.host_id = host_record.host_id
            AND b.booking_status = 'completed'
            AND b.completed_at::DATE BETWEEN payout_start AND payout_end
            AND NOT EXISTS (
                SELECT 1 FROM payout_line_items pli
                WHERE pli.booking_id = b.id
            );
            
            -- Return the payout information
            RETURN QUERY SELECT host_record.host_id, total_amount, booking_count;
        END IF;
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- DATA VALIDATION PROCEDURES
-- =============================================================================

-- Function to validate booking time conflicts
CREATE OR REPLACE FUNCTION check_booking_conflicts(
    p_driveway_id UUID,
    p_start_time TIMESTAMP WITH TIME ZONE,
    p_end_time TIMESTAMP WITH TIME ZONE,
    p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for existing bookings
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE driveway_id = p_driveway_id
    AND booking_status IN ('confirmed', 'active')
    AND start_time < p_end_time
    AND end_time > p_start_time
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
    
    -- Check for blocked availability
    IF conflict_count = 0 THEN
        SELECT COUNT(*) INTO conflict_count
        FROM driveway_availability
        WHERE driveway_id = p_driveway_id
        AND availability_type = 'blocked'
        AND start_time < p_end_time
        AND end_time > p_start_time;
    END IF;
    
    RETURN conflict_count > 0;
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- CLEANUP AND MAINTENANCE PROCEDURES
-- =============================================================================

-- Procedure to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 2555) -- 7 years
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- Procedure to anonymize old location data
CREATE OR REPLACE FUNCTION anonymize_old_location_data(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $
DECLARE
    updated_count INTEGER;
BEGIN
    -- Remove precise location data from old completed bookings
    UPDATE bookings 
    SET driver_notes = NULL
    WHERE booking_status = 'completed'
    AND completed_at < CURRENT_DATE - INTERVAL '1 day' * retention_days
    AND driver_notes IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for database performance metrics
CREATE VIEW db_performance_metrics AS
SELECT 
    'total_users' as metric_name,
    COUNT(*)::TEXT as metric_value,
    CURRENT_TIMESTAMP as calculated_at
FROM users
WHERE account_status = 'active'

UNION ALL

SELECT 
    'total_active_driveways' as metric_name,
    COUNT(*)::TEXT as metric_value,
    CURRENT_TIMESTAMP as calculated_at
FROM driveways
WHERE listing_status = 'active'

UNION ALL

SELECT 
    'total_bookings_today' as metric_name,
    COUNT(*)::TEXT as metric_value,
    CURRENT_TIMESTAMP as calculated_at
FROM bookings
WHERE created_at::DATE = CURRENT_DATE

UNION ALL

SELECT 
    'revenue_today' as metric_name,
    COALESCE(SUM(platform_fee), 0)::TEXT as metric_value,
    CURRENT_TIMESTAMP as calculated_at
FROM bookings
WHERE created_at::DATE = CURRENT_DATE
AND booking_status IN ('confirmed', 'active', 'completed');

-- =============================================================================
-- FINAL SETUP AND PERMISSIONS
-- =============================================================================

-- Create application user for the API
-- DO $
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'driveway_hub_api') THEN
--         CREATE ROLE driveway_hub_api WITH LOGIN PASSWORD 'your_secure_password_here';
--     END IF;
-- END
-- $;

-- Grant permissions to application user
-- GRANT CONNECT ON DATABASE driveway_hub_dev TO driveway_hub_api;
-- GRANT USAGE ON SCHEMA public TO driveway_hub_api;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO driveway_hub_api;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO driveway_hub_api;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO driveway_hub_api;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $
BEGIN
    RAISE NOTICE 'Driveway-Hub database setup completed successfully!';
    RAISE NOTICE 'Database includes:';
    RAISE NOTICE '- % tables with complete schema', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE '- % indexes for performance optimization', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE '- % stored procedures for common operations', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION');
    RAISE NOTICE '- Sample data loaded for testing';
    RAISE NOTICE '- Views and performance monitoring ready';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update passwords and security settings for production';
    RAISE NOTICE '2. Configure backup and monitoring';
    RAISE NOTICE '3. Run performance tests with expected data volumes';
    RAISE NOTICE '4. Set up API connection with connection pooling';
END;
$;
