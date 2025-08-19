# Driveway-Hub Database Schema Design
*PostgreSQL Database Architecture for MVP*

## Schema Overview

The Driveway-Hub database is designed to support a two-sided marketplace connecting Tesla drivers with driveway hosts, with integrated payment processing and automated vehicle control.

### Core Design Principles
- **Data Integrity**: Foreign key constraints and validation rules
- **Scalability**: Indexed queries and efficient relationships
- **Security**: Encrypted sensitive data and audit trails
- **Performance**: Optimized for geospatial queries and real-time operations

---

## Entity Relationship Diagram

```
Users (1) ──────── (0..*) Vehicles
  │
  ├── (1) ──────── (0..*) Driveways
  │
  ├── (1) ──────── (0..*) Bookings ──────── (1) Driveways
  │                   │
  │                   └── (1) ──────── (0..*) Payments
  │
  └── (1) ──────── (0..*) Reviews ──────── (1) Bookings
```

---

## Core Tables

### 1. Users Table
**Purpose**: Store all user accounts (drivers and hosts)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    profile_image_url TEXT,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('driver', 'host', 'both')),
    
    -- Tesla Integration
    tesla_access_token TEXT,
    tesla_refresh_token TEXT,
    tesla_token_expires_at TIMESTAMP,
    tesla_user_id VARCHAR(100),
    
    -- Stripe Integration
    stripe_customer_id VARCHAR(100),
    stripe_connect_account_id VARCHAR(100), -- For hosts
    
    -- Account Status
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    identity_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tesla_user_id ON users(tesla_user_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

### 2. Vehicles Table
**Purpose**: Store Tesla vehicle information linked to users

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tesla Vehicle Data
    tesla_vehicle_id BIGINT UNIQUE NOT NULL,
    vin VARCHAR(17) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    
    -- Vehicle Specifications
    length_inches INTEGER NOT NULL DEFAULT 185, -- Model 3 default
    width_inches INTEGER NOT NULL DEFAULT 73,
    height_inches INTEGER NOT NULL DEFAULT 57,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_tesla_vehicle_id ON vehicles(tesla_vehicle_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
```

### 3. Driveways Table
**Purpose**: Store driveway listings from hosts

```sql
CREATE TABLE driveways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    driveway_type VARCHAR(20) NOT NULL CHECK (driveway_type IN ('concrete', 'asphalt', 'gravel', 'paved')),
    is_covered BOOLEAN DEFAULT FALSE,
    max_vehicle_length INTEGER NOT NULL, -- inches
    max_vehicle_width INTEGER NOT NULL,  -- inches
    max_vehicle_height INTEGER,          -- inches (for covered driveways)
    
    -- Pricing
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
    listing_status VARCHAR(20) DEFAULT 'active' CHECK (listing_status IN ('active', 'inactive', 'suspended')),
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for geospatial queries
CREATE INDEX idx_driveways_location ON driveways USING GIST (
    ll_to_earth(latitude, longitude)
);
CREATE INDEX idx_driveways_host_id ON driveways(host_id);
CREATE INDEX idx_driveways_status ON driveways(listing_status, is_available);
```

### 4. Driveway Photos Table
**Purpose**: Store multiple photos for each driveway listing

```sql
CREATE TABLE driveway_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driveway_id UUID NOT NULL REFERENCES driveways(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_order INTEGER NOT NULL DEFAULT 1,
    caption TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_driveway_photos_driveway_id ON driveway_photos(driveway_id);
CREATE INDEX idx_driveway_photos_order ON driveway_photos(driveway_id, photo_order);
```

### 5. Driveway Availability Table
**Purpose**: Manage availability schedules and blocked times

```sql
CREATE TABLE driveway_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driveway_id UUID NOT NULL REFERENCES driveways(id) ON DELETE CASCADE,
    
    -- Availability Type
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('available', 'blocked', 'booked')),
    
    -- Time Range
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- Recurring Rules (for regular schedules)
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE format for complex recurring patterns
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_availability_driveway_time ON driveway_availability(driveway_id, start_time, end_time);
CREATE INDEX idx_availability_type ON driveway_availability(availability_type);
```

### 6. Bookings Table
**Purpose**: Core booking records linking drivers, vehicles, and driveways

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    driver_id UUID NOT NULL REFERENCES users(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    driveway_id UUID NOT NULL REFERENCES driveways(id),
    host_id UUID NOT NULL REFERENCES users(id),
    
    -- Booking Details
    booking_reference VARCHAR(20) UNIQUE NOT NULL, -- Human-readable reference
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- Pricing
    hourly_rate DECIMAL(8,2) NOT NULL,
    total_hours DECIMAL(4,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Status Tracking
    booking_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show')
    ),
    
    -- Tesla Integration Status
    tesla_navigation_sent BOOLEAN DEFAULT FALSE,
    auto_park_attempted BOOLEAN DEFAULT FALSE,
    auto_park_successful BOOLEAN DEFAULT FALSE,
    arrival_detected_at TIMESTAMP,
    departure_detected_at TIMESTAMP,
    
    -- Special Instructions
    driver_notes TEXT,
    host_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT valid_total_calculation CHECK (total_amount = subtotal + platform_fee)
);

-- Indexes
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_driveway_id ON bookings(driveway_id);
CREATE INDEX idx_bookings_host_id ON bookings(host_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
```

### 7. Payments Table
**Purpose**: Track all payment transactions

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    
    -- Stripe Integration
    stripe_payment_intent_id VARCHAR(200) UNIQUE NOT NULL,
    stripe_charge_id VARCHAR(200),
    
    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', etc.
    
    -- Status
    payment_status VARCHAR(20) NOT NULL CHECK (
        payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')
    ),
    
    -- Timing
    authorized_at TIMESTAMP,
    captured_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    refund_amount DECIMAL(10,2),
    
    -- Error Handling
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
```

### 8. Payouts Table
**Purpose**: Track host payouts via Stripe Connect

```sql
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    payout_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        payout_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')
    ),
    
    -- Timing
    processed_at TIMESTAMP,
    failed_at TIMESTAMP,
    paid_at TIMESTAMP,
    
    -- Error Handling
    failure_code VARCHAR(100),
    failure_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payouts_host_id ON payouts(host_id);
CREATE INDEX idx_payouts_period ON payouts(payout_period_start, payout_period_end);
CREATE INDEX idx_payouts_status ON payouts(payout_status);
```

### 9. Payout Line Items Table
**Purpose**: Detail individual bookings included in each payout

```sql
CREATE TABLE payout_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id),
    
    -- Amounts
    booking_total DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    host_amount DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payout_line_items_payout_id ON payout_line_items(payout_id);
CREATE INDEX idx_payout_line_items_booking_id ON payout_line_items(booking_id);
```

### 10. Reviews Table
**Purpose**: Store ratings and reviews from both drivers and hosts

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('driver_to_host', 'host_to_driver')),
    
    -- Status
    is_published BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one review per booking per direction
    UNIQUE(booking_id, reviewer_id, review_type)
);

-- Indexes
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

---

## Supporting Tables

### 11. Audit Log Table
**Purpose**: Track all significant system events for security and debugging

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(30) NOT NULL, -- 'auth', 'booking', 'payment', 'tesla', etc.
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_booking_id ON audit_logs(related_booking_id);
```

### 12. System Settings Table
**Purpose**: Store application configuration and feature flags

```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('platform_fee_percentage', '15.0', 'number', 'Platform fee percentage (15%)'),
('max_booking_hours', '168', 'number', 'Maximum booking duration in hours (1 week)'),
('tesla_api_rate_limit', '200', 'number', 'Tesla API requests per hour limit'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('supported_cities', '["San Francisco"]', 'json', 'List of supported cities for MVP');
```

---

## Performance Optimizations

### Database Indexes Summary
```sql
-- Geospatial optimization for driveway searches
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Additional composite indexes for common queries
CREATE INDEX idx_bookings_active_by_time ON bookings(booking_status, start_time, end_time) 
    WHERE booking_status IN ('confirmed', 'active');

CREATE INDEX idx_driveways_available_by_location ON driveways(latitude, longitude, is_available, listing_status) 
    WHERE is_available = true AND listing_status = 'active';

CREATE INDEX idx_users_active_drivers ON users(user_type, account_status, created_at) 
    WHERE user_type IN ('driver', 'both') AND account_status = 'active';

CREATE INDEX idx_users_active_hosts ON users(user_type, account_status, created_at) 
    WHERE user_type IN ('host', 'both') AND account_status = 'active';
```

### Query Optimization Notes
- **Geospatial queries** use PostGIS extensions for efficient radius searches
- **Composite indexes** optimize common query patterns
- **Partial indexes** reduce index size for filtered queries
- **JSONB fields** allow flexible metadata storage with indexing support

---

## Data Integrity & Constraints

### Foreign Key Relationships
- All user-related tables cascade on user deletion
- Booking relationships maintain referential integrity
- Payment records are preserved even if bookings are soft-deleted

### Business Logic Constraints
- Booking times must be valid (end > start)
- Ratings must be 1-5 stars
- Payment calculations must be accurate
- Vehicle dimensions must be positive

### Data Validation Rules
- Email addresses must be unique and valid format
- Phone numbers follow E.164 international format
- Addresses are validated via Google Maps API
- Tesla VINs follow standard 17-character format

---

## Backup & Recovery Strategy

### Daily Backups
- Full database backup to AWS S3
- Transaction log backup every 15 minutes
- Cross-region replication for disaster recovery

### Data Retention
- Active user data: Indefinite
- Deleted user data: 90 days then purged
- Audit logs: 7 years for compliance
- Payment records: 7 years for tax/legal requirements

---

## Security Considerations

### Sensitive Data Encryption
- Tesla tokens encrypted at rest
- Payment data follows PCI DSS requirements
- Personal information encrypted with application-level keys

### Access Control
- Row-level security for multi-tenant data
- API rate limiting per user
- Admin access logging and monitoring

### Privacy Compliance
- GDPR/CCPA data export capabilities
- Right to deletion implementation
- Data anonymization for analytics

---

*This schema is designed for PostgreSQL 14+ and optimized for the Driveway-Hub MVP requirements. All tables include proper indexing for expected query patterns and maintain data integrity through constraints and foreign keys.*
