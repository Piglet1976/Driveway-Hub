-- Tesla Parking Demo Setup - Toronto Route (Etobicoke to York)
-- ============================================================
-- Production-ready demo data for investor demonstration
-- Route: 7 Savona Dr, Etobicoke, ON M8W 4T9 → 372 McRoberts Ave, York, ON M6E 4R2
-- Distance: ~15km across Toronto

-- =============================================================================
-- STEP 1: CREATE DEMO USERS
-- =============================================================================

-- Create Manuel as parking host at York location
INSERT INTO users (
    email,
    password_hash,
    first_name, 
    last_name,
    phone,
    user_type,
    email_verified,
    phone_verified,
    identity_verified,
    account_status,
    profile_image_url
) VALUES (
    'manuel.host@driveway-hub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNdNbMn.lK6au', -- password: Demo2024!
    'Manuel',
    'Rodriguez',
    '+14165551234',
    'host',
    TRUE,
    TRUE,
    TRUE,
    'active',
    'https://ui-avatars.com/api/?name=Manuel+Rodriguez&size=256&background=4F46E5&color=fff'
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    profile_image_url = EXCLUDED.profile_image_url
RETURNING id AS manuel_host_id;

-- Create Ruth as Tesla driver at Etobicoke location
INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    user_type,
    email_verified,
    phone_verified,
    identity_verified,
    account_status,
    profile_image_url,
    -- Tesla Integration Fields (to be populated during auth)
    tesla_access_token,
    tesla_refresh_token,
    tesla_token_expires_at,
    tesla_user_id
) VALUES (
    'ruth.tesla@driveway-hub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNdNbMn.lK6au', -- password: Demo2024!
    'Ruth',
    'Chen',
    '+14165555678',
    'driver',
    TRUE,
    TRUE,
    TRUE,
    'active',
    'https://ui-avatars.com/api/?name=Ruth+Chen&size=256&background=10B981&color=fff',
    NULL, -- Tesla tokens will be populated after OAuth
    NULL,
    NULL,
    NULL
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    profile_image_url = EXCLUDED.profile_image_url
RETURNING id AS ruth_driver_id;

-- =============================================================================
-- STEP 2: CREATE PARKING SPOT AT YORK LOCATION
-- =============================================================================

-- Create Manuel's driveway at 372 McRoberts Ave, York
WITH manuel_user AS (
    SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com'
)
INSERT INTO driveways (
    host_id,
    title,
    description,
    address,
    city,
    state,
    zip_code,
    latitude,
    longitude,
    driveway_type,
    is_covered,
    max_vehicle_length,
    max_vehicle_width,
    max_vehicle_height,
    -- Toronto Market Pricing (CAD converted to USD)
    hourly_rate,
    daily_rate,
    weekly_rate,
    monthly_rate,
    -- Booking Settings
    minimum_booking_hours,
    maximum_booking_hours,
    advance_booking_hours,
    instant_booking_enabled,
    -- Special Features
    has_ev_charging,
    charging_connector_type,
    has_security_camera,
    has_lighting,
    -- Instructions
    access_instructions,
    special_instructions,
    -- Status
    listing_status,
    is_available
) 
SELECT 
    id,
    'Premium Tesla Parking - York Toronto',
    'Secure, covered driveway in quiet York neighborhood. Perfect for Tesla vehicles with Level 2 charging available. Walking distance to York University GO station and local amenities. 24/7 security camera monitoring.',
    '372 McRoberts Ave',
    'York',
    'ON',
    'M6E 4R2',
    43.689042,  -- Actual coordinates for 372 McRoberts Ave
    -79.451344,
    'concrete',
    TRUE,  -- Covered parking
    220,   -- Can fit Model S/X
    85,    -- Wide enough for any Tesla
    75,    -- Height clearance
    -- Toronto pricing (competitive with downtown rates)
    12.00,  -- $12/hour (typical Toronto rate)
    75.00,  -- $75/day
    350.00, -- $350/week
    950.00, -- $950/month
    1,      -- Minimum 1 hour
    720,    -- Maximum 30 days
    0,      -- Instant booking
    TRUE,   -- Allow instant booking
    TRUE,   -- Has EV charging
    'tesla',  -- Tesla Wall Connector
    TRUE,   -- Security camera
    TRUE,   -- Well-lit
    'Enter through the main gate on McRoberts Ave. The driveway is on the left side of the house. Use access code #2024 for the gate. Tesla Wall Connector is mounted on the left wall.',
    'Please park fully within the marked area. The Tesla charger cable reaches all parking positions. Ring doorbell upon arrival for any assistance. Quiet residential area - please be mindful of noise after 10 PM.',
    'active',
    TRUE
FROM manuel_user
ON CONFLICT DO NOTHING
RETURNING id AS driveway_id;

-- Add photos for Manuel's driveway
WITH manuel_driveway AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'manuel.host@driveway-hub.com'
    LIMIT 1
)
INSERT INTO driveway_photos (driveway_id, photo_url, photo_order, caption)
SELECT 
    id,
    photo_url,
    photo_order,
    caption
FROM manuel_driveway
CROSS JOIN (VALUES
    ('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 1, 'Wide concrete driveway with Tesla Wall Connector'),
    ('https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 2, 'Covered parking area with security lighting'),
    ('https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=800', 3, 'Gated entrance with keypad access'),
    ('https://images.unsplash.com/photo-1617638924741-92d272ce2b77?w=800', 4, 'Tesla charging station detail')
) AS photos(photo_url, photo_order, caption)
ON CONFLICT (driveway_id, photo_order) DO NOTHING;

-- Set availability for Manuel's driveway (always available except for existing bookings)
WITH manuel_driveway AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'manuel.host@driveway-hub.com'
    LIMIT 1
)
INSERT INTO driveway_availability (
    driveway_id,
    availability_type,
    start_time,
    end_time,
    is_recurring,
    notes
)
SELECT 
    id,
    'available',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '90 days',
    FALSE,
    'Available for Tesla demo - investor showcase period'
FROM manuel_driveway
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 3: CREATE RUTH'S TESLA VEHICLE (Placeholder - will be updated after OAuth)
-- =============================================================================

WITH ruth_user AS (
    SELECT id FROM users WHERE email = 'ruth.tesla@driveway-hub.com'
)
INSERT INTO vehicles (
    user_id,
    tesla_vehicle_id,
    vin,
    display_name,
    model,
    year,
    color,
    length_inches,
    width_inches,
    height_inches,
    is_active
)
SELECT
    id,
    999999999,  -- Placeholder - will be updated with real Tesla ID
    'DEMO2024TESLA0001',  -- Placeholder VIN
    'Ruth''s Model 3',
    'Model 3',
    2024,
    'Pearl White',
    185,  -- Model 3 dimensions
    73,
    57,
    TRUE
FROM ruth_user
ON CONFLICT (tesla_vehicle_id) DO NOTHING
RETURNING id AS vehicle_id;

-- =============================================================================
-- STEP 4: CREATE DEMO BOOKING (OPTIONAL - For Testing)
-- =============================================================================

-- This creates a sample future booking to demonstrate the system
-- Comment out if you want to start with a clean slate

/*
WITH booking_data AS (
    SELECT 
        u_driver.id as driver_id,
        v.id as vehicle_id,
        d.id as driveway_id,
        u_host.id as host_id,
        d.hourly_rate
    FROM users u_driver
    JOIN vehicles v ON v.user_id = u_driver.id
    CROSS JOIN driveways d
    JOIN users u_host ON d.host_id = u_host.id
    WHERE u_driver.email = 'ruth.tesla@driveway-hub.com'
    AND u_host.email = 'manuel.host@driveway-hub.com'
    LIMIT 1
)
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
    booking_status,
    driver_notes,
    tesla_navigation_sent,
    auto_park_attempted
)
SELECT
    driver_id,
    vehicle_id,
    driveway_id,
    host_id,
    'DH-DEMO01',
    CURRENT_TIMESTAMP + INTERVAL '2 hours',  -- Booking starts in 2 hours
    CURRENT_TIMESTAMP + INTERVAL '5 hours',  -- 3-hour booking
    hourly_rate,
    3.0,
    hourly_rate * 3,  -- Subtotal
    hourly_rate * 3 * 0.15,  -- 15% platform fee
    hourly_rate * 3 * 1.15,  -- Total with fee
    'pending',
    'Demo booking for investor presentation - Tesla integration showcase',
    FALSE,
    FALSE
FROM booking_data
ON CONFLICT (booking_reference) DO NOTHING;
*/

-- =============================================================================
-- STEP 5: ADD SYSTEM SETTINGS FOR DEMO
-- =============================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('demo_mode', 'true', 'boolean', 'Enable demo mode for investor showcase', FALSE),
('demo_tesla_webhook_url', 'https://161.35.176.111/api/tesla/webhook', 'string', 'Tesla webhook URL for demo', FALSE),
('demo_notification_email', 'investors@driveway-hub.com', 'string', 'Email for demo notifications', FALSE),
('tesla_demo_enabled', 'true', 'boolean', 'Enable Tesla demo features', FALSE),
('toronto_market_active', 'true', 'boolean', 'Toronto market is active', TRUE)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- STEP 6: CREATE AUDIT LOG ENTRIES FOR DEMO
-- =============================================================================

WITH demo_users AS (
    SELECT 
        (SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com') as manuel_id,
        (SELECT id FROM users WHERE email = 'ruth.tesla@driveway-hub.com') as ruth_id
)
INSERT INTO audit_logs (user_id, event_type, event_category, description, metadata)
SELECT manuel_id, 'user_created', 'auth', 'Demo host account created for Toronto showcase', 
    '{"location": "York, Toronto", "demo": true}'::jsonb
FROM demo_users
UNION ALL
SELECT ruth_id, 'user_created', 'auth', 'Demo Tesla driver account created for showcase',
    '{"location": "Etobicoke, Toronto", "demo": true}'::jsonb
FROM demo_users
UNION ALL
SELECT manuel_id, 'listing_created', 'admin', 'Premium parking spot listed in York',
    '{"address": "372 McRoberts Ave", "features": ["tesla_charging", "covered", "secure"]}'::jsonb
FROM demo_users;

-- =============================================================================
-- QUERY TO VERIFY SETUP
-- =============================================================================

-- Show created users
SELECT 
    'Users Created:' as section,
    email,
    first_name || ' ' || last_name as name,
    user_type,
    CASE 
        WHEN email = 'manuel.host@driveway-hub.com' THEN '372 McRoberts Ave, York'
        WHEN email = 'ruth.tesla@driveway-hub.com' THEN '7 Savona Dr, Etobicoke'
        ELSE 'N/A'
    END as location
FROM users 
WHERE email IN ('manuel.host@driveway-hub.com', 'ruth.tesla@driveway-hub.com');

-- Show driveway details
SELECT 
    'Driveway Created:' as section,
    d.title,
    d.address || ', ' || d.city || ', ' || d.state || ' ' || d.zip_code as full_address,
    '$' || d.hourly_rate || '/hr' as hourly_rate,
    CASE WHEN d.has_ev_charging THEN 'Tesla Charging Available' ELSE 'No Charging' END as charging
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com';

-- Show vehicle placeholder
SELECT 
    'Vehicle Placeholder:' as section,
    v.display_name,
    v.model || ' ' || v.year as vehicle,
    'Awaiting Tesla OAuth Connection' as status
FROM vehicles v
JOIN users u ON v.user_id = u.id
WHERE u.email = 'ruth.tesla@driveway-hub.com';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESLA DEMO DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Route Setup:';
    RAISE NOTICE '  Start: 7 Savona Dr, Etobicoke, ON M8W 4T9 (Ruth)';
    RAISE NOTICE '  End:   372 McRoberts Ave, York, ON M6E 4R2 (Manuel)';
    RAISE NOTICE '  Distance: ~15km across Toronto';
    RAISE NOTICE '';
    RAISE NOTICE 'Login Credentials:';
    RAISE NOTICE '  Host:   manuel.host@driveway-hub.com / Demo2024!';
    RAISE NOTICE '  Driver: ruth.tesla@driveway-hub.com / Demo2024!';
    RAISE NOTICE '';
    RAISE NOTICE 'Parking Features:';
    RAISE NOTICE '  - $12/hour Toronto market rate';
    RAISE NOTICE '  - Tesla Wall Connector installed';
    RAISE NOTICE '  - Covered & secure with cameras';
    RAISE NOTICE '  - Instant booking enabled';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Ruth logs in and authorizes her Tesla';
    RAISE NOTICE '  2. Ruth searches for parking near York';
    RAISE NOTICE '  3. Ruth books Manuel''s spot';
    RAISE NOTICE '  4. Platform sends navigation to Tesla';
    RAISE NOTICE '  5. Track the 15km journey in real-time';
    RAISE NOTICE '========================================';
END;
$$;