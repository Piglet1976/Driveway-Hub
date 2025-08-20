-- Demo Data Seeding Script for Driveway Hub
-- Creates Ruth's account and Toronto driveways with proper schema compliance

-- =============================================================================
-- USERS - Ruth's Demo Account
-- =============================================================================

INSERT INTO users (
    id, email, password_hash, first_name, last_name, phone, user_type,
    email_verified, phone_verified, account_status
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'ruth@driveway-hub.app',
    '$2b$12$LQv3c1yqBwuvHidOLLEtauOLlYrNE8VJx0pCJRdJ2fYuTkFJ5Wfm.',  -- bcrypt hash of 'demo123'
    'Ruth',
    'Sanchez',
    '+14166789012',
    'both',
    TRUE,
    TRUE,
    'active'
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    email_verified = EXCLUDED.email_verified,
    phone_verified = EXCLUDED.phone_verified,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- VEHICLES - Ruth's Tesla Model 3
-- =============================================================================

INSERT INTO vehicles (
    id, user_id, tesla_vehicle_id, vin, display_name, model, year, color,
    length_inches, width_inches, height_inches, is_active
) VALUES (
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    1234567890123456,
    '5YJ3E1EA4JF123456',
    'Ruth''s Model 3',
    'Model 3',
    2023,
    'Pearl White Multi-Coat',
    185,  -- Tesla Model 3 length
    73,   -- Tesla Model 3 width  
    57,   -- Tesla Model 3 height
    TRUE
) ON CONFLICT (tesla_vehicle_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Alternative VIN in case first one conflicts
INSERT INTO vehicles (
    id, user_id, tesla_vehicle_id, vin, display_name, model, year, color,
    length_inches, width_inches, height_inches, is_active
) VALUES (
    '770e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    2345678901234567,
    '5YJ3E1EA4JF654321',
    'Ruth''s Backup Tesla',
    'Model Y',
    2024,
    'Midnight Silver Metallic',
    194,  -- Tesla Model Y length
    76,   -- Tesla Model Y width
    64,   -- Tesla Model Y height
    TRUE
) ON CONFLICT (tesla_vehicle_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- DRIVEWAYS - Toronto Premium Locations
-- =============================================================================

-- Driveway 1: Financial District High-Rise
INSERT INTO driveways (
    id, host_id, address, city, state, zip_code, latitude, longitude,
    title, description, driveway_type, is_covered,
    max_vehicle_length, max_vehicle_width, max_vehicle_height,
    hourly_rate, daily_rate, weekly_rate,
    has_ev_charging, charging_connector_type, has_security_camera, has_lighting,
    access_instructions, listing_status
) VALUES (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '123 Bay Street, Unit 1205',
    'Toronto',
    'ON',
    'M5J 2R8',
    43.6426,
    -79.3871,
    'Downtown Financial District - Covered Parking',
    'Premium covered parking spot in luxury high-rise building. Perfect for Tesla vehicles with dedicated EV charging. Located in heart of Toronto''s Financial District with 24/7 security.',
    'concrete',
    TRUE,
    200,  -- inches - accommodates most vehicles
    80,   -- inches - standard parking width
    75,   -- inches - covered parking height
    8.50,
    68.00,
    450.00,
    TRUE,
    'tesla',
    TRUE,
    TRUE,
    'Building entrance on Bay St. Take elevator to P1 level. Spot #1205 is marked with Tesla charging symbol. Key code: 1234 (will be provided after booking).',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    hourly_rate = EXCLUDED.hourly_rate,
    updated_at = CURRENT_TIMESTAMP;

-- Driveway 2: King Street West Condo
INSERT INTO driveways (
    id, host_id, address, city, state, zip_code, latitude, longitude,
    title, description, driveway_type, is_covered,
    max_vehicle_length, max_vehicle_width, max_vehicle_height,
    hourly_rate, daily_rate, weekly_rate,
    has_ev_charging, charging_connector_type, has_security_camera, has_lighting,
    access_instructions, listing_status
) VALUES (
    '990e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '456 King Street West, Unit 2104',
    'Toronto',
    'ON',
    'M5V 1M3',
    43.6436,
    -79.3957,
    'King West Entertainment District - EV Ready',
    'Modern condo parking in Toronto''s hottest neighborhood. Steps from restaurants, theaters, and nightlife. Tesla Supercharger network nearby.',
    'concrete',
    TRUE,
    195,  -- slightly smaller spot
    75,
    72,
    7.25,
    58.00,
    385.00,
    TRUE,
    'j1772',
    TRUE,
    TRUE,
    'Enter through main lobby on King St W. Security desk will provide parking pass. Take elevator to P2. Spot #2104. EV charging station is Wall Connector compatible.',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    hourly_rate = EXCLUDED.hourly_rate,
    updated_at = CURRENT_TIMESTAMP;

-- Driveway 3: Yorkville Luxury
INSERT INTO driveways (
    id, host_id, address, city, state, zip_code, latitude, longitude,
    title, description, driveway_type, is_covered,
    max_vehicle_length, max_vehicle_width, max_vehicle_height,
    hourly_rate, daily_rate, weekly_rate,
    has_ev_charging, charging_connector_type, has_security_camera, has_lighting,
    access_instructions, listing_status
) VALUES (
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '789 Yonge Street, Penthouse Level',
    'Toronto',
    'ON',
    'M4W 2G8',
    43.6708,
    -79.3871,
    'Yorkville Luxury - Premium Tesla Parking',
    'Exclusive penthouse-level parking in prestigious Yorkville district. Concierge service, valet available. Perfect for luxury vehicles and special occasions.',
    'concrete',
    TRUE,
    210,  -- extra spacious
    85,   -- wider spot
    80,   -- high ceiling
    12.00,
    95.00,
    630.00,
    TRUE,
    'tesla',
    TRUE,
    TRUE,
    'Yorkville entrance with concierge. Mention you have parking reservation. Valet service available for $25 extra. Penthouse parking level accessible via private elevator.',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    hourly_rate = EXCLUDED.hourly_rate,
    updated_at = CURRENT_TIMESTAMP;

-- Driveway 4: Distillery District Historic
INSERT INTO driveways (
    id, host_id, address, city, state, zip_code, latitude, longitude,
    title, description, driveway_type, is_covered,
    max_vehicle_length, max_vehicle_width,
    hourly_rate, daily_rate, weekly_rate,
    has_ev_charging, has_security_camera, has_lighting,
    access_instructions, listing_status
) VALUES (
    'bb0e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '321 Mill Street, Building 49',
    'Toronto',
    'ON',
    'M5A 3C4',
    43.6504,
    -79.3594,
    'Historic Distillery District - Outdoor Parking',
    'Charming outdoor parking in Toronto''s historic Distillery District. Walking distance to galleries, cafes, and weekend markets. Great for day trips and cultural visits.',
    'asphalt',
    FALSE,  -- outdoor parking
    190,
    78,
    6.50,
    52.00,
    325.00,
    FALSE,  -- no EV charging
    TRUE,
    TRUE,
    'Mill Street entrance near Tank House Cafe. Look for Building 49 signs. Your parking spot will be clearly marked. Weekend markets nearby - arrive early!',
    'active'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    hourly_rate = EXCLUDED.hourly_rate,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- SAMPLE BOOKINGS - Show booking history
-- =============================================================================

INSERT INTO bookings (
    id, driveway_id, driver_id, host_id, vehicle_id, 
    booking_reference, start_time, end_time, total_hours, hourly_rate, 
    subtotal, platform_fee, total_amount, booking_status
) VALUES (
    'cc0e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,  -- Financial District
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth as driver
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth as host (owns the driveway)
    '660e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth's Model 3
    'DH-ABC123',
    '2024-01-15 09:00:00-05',
    '2024-01-15 17:00:00-05',
    8,
    8.50,
    68.00,
    5.00,
    73.00,
    'completed'
) ON CONFLICT (id) DO UPDATE SET
    booking_status = EXCLUDED.booking_status,
    updated_at = CURRENT_TIMESTAMP;

-- Upcoming booking
INSERT INTO bookings (
    id, driveway_id, driver_id, host_id, vehicle_id,
    booking_reference, start_time, end_time, total_hours, hourly_rate,
    subtotal, platform_fee, total_amount, booking_status
) VALUES (
    'dd0e8400-e29b-41d4-a716-446655440000'::uuid,
    '990e8400-e29b-41d4-a716-446655440000'::uuid,  -- King West
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth as driver
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth as host
    '660e8400-e29b-41d4-a716-446655440000'::uuid,  -- Ruth's Model 3
    'DH-XYZ789',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP + INTERVAL '2 days 4 hours',
    4,
    7.25,
    29.00,
    2.00,
    31.00,
    'confirmed'
) ON CONFLICT (id) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    booking_status = EXCLUDED.booking_status,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- ACTIVITY LOG ENTRIES
-- =============================================================================

INSERT INTO activity_log (
    id, user_id, activity_type, activity_data, created_at
) VALUES (
    'ee0e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'registration',
    '{"email": "ruth@driveway-hub.app", "user_type": "both"}',
    CURRENT_TIMESTAMP - INTERVAL '30 days'
),
(
    'ff0e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'driveway_created',
    '{"driveway_id": "880e8400-e29b-41d4-a716-446655440000", "title": "Downtown Financial District"}',
    CURRENT_TIMESTAMP - INTERVAL '25 days'
);

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

-- Add a final query to confirm data was inserted
DO $$
BEGIN
    RAISE NOTICE 'Demo data seeding completed successfully!';
    RAISE NOTICE 'Created user: ruth@driveway-hub.app (password: demo123)';
    RAISE NOTICE 'Created % driveways in Toronto', (SELECT COUNT(*) FROM driveways WHERE city = 'Toronto');
    RAISE NOTICE 'Created % vehicles', (SELECT COUNT(*) FROM vehicles);
    RAISE NOTICE 'Created % sample bookings', (SELECT COUNT(*) FROM bookings);
END $$;