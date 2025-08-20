-- Tesla Demo Route Update - Role Reversal & Mississauga Location
-- ============================================================
-- Updates demo to show Manuel driving FROM York TO Ruth's Tesla-equipped driveway in Mississauga
-- Route: 372 McRoberts Ave, York → 528 Bluesky Crescent, Mississauga (~25km)
-- Ruth is now the HOST with premium Tesla charging at her Mississauga location
-- Manuel is now the DRIVER traveling to Ruth's location

-- =============================================================================
-- STEP 1: UPDATE USER ROLES - SWAP HOST AND DRIVER
-- =============================================================================

-- Update Manuel to be a driver (was host)
UPDATE users 
SET 
    user_type = 'driver',
    -- Clear any host-specific fields
    tesla_access_token = NULL,
    tesla_refresh_token = NULL,
    tesla_token_expires_at = NULL,
    tesla_user_id = NULL
WHERE email = 'manuel.host@driveway-hub.com';

-- Update Ruth to be a host (was driver)
UPDATE users 
SET 
    user_type = 'host'
WHERE email = 'ruth.tesla@driveway-hub.com';

-- =============================================================================
-- STEP 2: DELETE OLD DRIVEWAY AT YORK (Manuel's old hosting location)
-- =============================================================================

-- Delete old driveway photos
DELETE FROM driveway_photos 
WHERE driveway_id IN (
    SELECT d.id FROM driveways d 
    JOIN users u ON d.host_id = u.id 
    WHERE u.email = 'manuel.host@driveway-hub.com'
);

-- Delete old availability
DELETE FROM driveway_availability 
WHERE driveway_id IN (
    SELECT d.id FROM driveways d 
    JOIN users u ON d.host_id = u.id 
    WHERE u.email = 'manuel.host@driveway-hub.com'
);

-- Delete old driveway
DELETE FROM driveways 
WHERE host_id IN (
    SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com'
);

-- =============================================================================
-- STEP 3: CREATE RUTH'S PREMIUM TESLA CHARGING DRIVEWAY IN MISSISSAUGA
-- =============================================================================

WITH ruth_host AS (
    SELECT id FROM users WHERE email = 'ruth.tesla@driveway-hub.com'
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
    -- Premium GTA Pricing (Mississauga rates)
    hourly_rate,
    daily_rate,
    weekly_rate,
    monthly_rate,
    -- Booking Settings
    minimum_booking_hours,
    maximum_booking_hours,
    advance_booking_hours,
    instant_booking_enabled,
    -- Premium Tesla Features
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
    'Premium Tesla Destination - Mississauga',
    'Executive Tesla charging station in upscale Mississauga neighborhood. Features Tesla Wall Connector with 48A charging (11.5 kW), covered parking, and 24/7 security. Perfect for Tesla owners visiting the GTA. Located in quiet residential area near Creditview & Eglinton.',
    '528 Bluesky Crescent',
    'Mississauga',
    'ON',
    'L5R 2S3',
    43.571234,  -- Coordinates for Mississauga location
    -79.684567,
    'paved_asphalt',
    TRUE,  -- Premium covered parking
    220,   -- Can accommodate Model S/X/3/Y
    85,    -- Wide driveway
    80,    -- Generous height clearance
    -- Premium Mississauga pricing
    15.00,  -- $15/hour (premium rate for Tesla charging)
    95.00,  -- $95/day
    425.00, -- $425/week
    1250.00, -- $1250/month
    1,      -- Minimum 1 hour
    720,    -- Maximum 30 days
    0,      -- Instant booking available
    TRUE,   -- Allow instant booking
    TRUE,   -- Has premium EV charging
    'tesla',  -- Tesla Wall Connector
    TRUE,   -- Security camera system
    TRUE,   -- Professional lighting
    'Enter through the main driveway on Bluesky Crescent. The Tesla charging bay is clearly marked with green LED indicators. Access code #TESLA2024 opens the security gate. Wall Connector provides up to 48A charging.',
    'Welcome to our premium Tesla charging destination! The charging cable easily reaches all parking positions. Ring video doorbell available for assistance. Please ensure your Tesla is properly positioned for optimal charging. Quiet upscale neighborhood - please maintain low noise levels.',
    'active',
    TRUE
FROM ruth_host
ON CONFLICT DO NOTHING
RETURNING id AS driveway_id;

-- Add premium photos for Ruth's Mississauga Tesla charging station
WITH ruth_driveway AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'ruth.tesla@driveway-hub.com'
    LIMIT 1
)
INSERT INTO driveway_photos (driveway_id, photo_url, photo_order, caption)
SELECT 
    id,
    photo_url,
    photo_order,
    caption
FROM ruth_driveway
CROSS JOIN (VALUES
    ('https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=800', 1, 'Premium Tesla Wall Connector installation with LED status indicators'),
    ('https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800', 2, 'Spacious covered parking area designed for Tesla vehicles'),
    ('https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 3, 'Executive home with secure gated driveway'),
    ('https://images.unsplash.com/photo-1617638924444-92d272ce2b77?w=800', 4, 'Tesla destination charging with 48A/11.5kW capacity'),
    ('https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=800', 5, 'Security features including cameras and smart access control')
) AS photos(photo_url, photo_order, caption)
ON CONFLICT (driveway_id, photo_order) DO UPDATE SET
    photo_url = EXCLUDED.photo_url,
    caption = EXCLUDED.caption;

-- Set availability for Ruth's premium driveway
WITH ruth_driveway AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'ruth.tesla@driveway-hub.com'
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
    'Premium Tesla charging available 24/7 - Investor showcase period'
FROM ruth_driveway
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 4: UPDATE MANUEL'S VEHICLE (Now he's the driver with Tesla)
-- =============================================================================

-- Delete Ruth's old vehicle placeholder
DELETE FROM vehicles 
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'ruth.tesla@driveway-hub.com'
);

-- Create Manuel's Tesla vehicle (he's now the driver)
WITH manuel_driver AS (
    SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com'
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
    888888888,  -- Placeholder - will be updated with real Tesla ID after OAuth
    'DEMO2024TESLAMDL3',  -- Placeholder VIN
    'Manuel''s Model 3 Performance',
    'Model 3 Performance',
    2024,
    'Midnight Silver Metallic',
    185,  -- Model 3 dimensions
    73,
    57,
    TRUE
FROM manuel_driver
ON CONFLICT (tesla_vehicle_id) DO NOTHING
RETURNING id AS vehicle_id;

-- =============================================================================
-- STEP 5: UPDATE AUDIT LOGS FOR NEW CONFIGURATION
-- =============================================================================

WITH demo_users AS (
    SELECT 
        (SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com') as manuel_id,
        (SELECT id FROM users WHERE email = 'ruth.tesla@driveway-hub.com') as ruth_id
)
INSERT INTO audit_logs (user_id, event_type, event_category, description, metadata)
SELECT ruth_id, 'role_changed', 'admin', 'User role updated from driver to host for Mississauga Tesla charging station', 
    '{"old_role": "driver", "new_role": "host", "location": "Mississauga", "demo": true}'::jsonb
FROM demo_users
UNION ALL
SELECT manuel_id, 'role_changed', 'admin', 'User role updated from host to driver for demo journey',
    '{"old_role": "host", "new_role": "driver", "location": "York", "demo": true}'::jsonb
FROM demo_users
UNION ALL
SELECT ruth_id, 'listing_created', 'admin', 'Premium Tesla charging station listed in Mississauga',
    '{"address": "528 Bluesky Crescent", "features": ["tesla_wall_connector", "48A_charging", "covered", "secure", "premium"]}'::jsonb
FROM demo_users;

-- =============================================================================
-- STEP 6: UPDATE SYSTEM SETTINGS FOR NEW ROUTE
-- =============================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('demo_route_start', '372 McRoberts Ave, York, ON M6E 4R2', 'string', 'Demo route starting point (Manuel driving)', FALSE),
('demo_route_end', '528 Bluesky Crescent, Mississauga, ON L5R 2S3', 'string', 'Demo route destination (Ruth hosting)', FALSE),
('demo_route_distance', '25km', 'string', 'Demo route distance across GTA', FALSE),
('mississauga_market_active', 'true', 'boolean', 'Mississauga market is active', TRUE)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- QUERY TO VERIFY UPDATE
-- =============================================================================

-- Show updated users with new roles
SELECT 
    'Updated User Roles:' as section,
    email,
    first_name || ' ' || last_name as name,
    user_type as new_role,
    CASE 
        WHEN email = 'manuel.host@driveway-hub.com' THEN 'Driver from York'
        WHEN email = 'ruth.tesla@driveway-hub.com' THEN 'Host in Mississauga'
        ELSE 'N/A'
    END as description
FROM users 
WHERE email IN ('manuel.host@driveway-hub.com', 'ruth.tesla@driveway-hub.com')
ORDER BY 
    CASE user_type 
        WHEN 'driver' THEN 1 
        WHEN 'host' THEN 2 
    END;

-- Show new driveway details in Mississauga
SELECT 
    'New Premium Listing:' as section,
    d.title,
    d.address || ', ' || d.city || ', ' || d.state || ' ' || d.zip_code as full_address,
    '$' || d.hourly_rate || '/hr' as rate,
    'Tesla Wall Connector (48A/11.5kW)' as charging_specs
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'ruth.tesla@driveway-hub.com';

-- Show Manuel's vehicle
SELECT 
    'Driver Vehicle:' as section,
    v.display_name,
    v.model || ' ' || v.year || ' - ' || v.color as vehicle_details,
    u.first_name || ' ' || u.last_name as driver_name
FROM vehicles v
JOIN users u ON v.user_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com';

-- Show route summary
SELECT 
    'Demo Route:' as section,
    'York → Mississauga' as direction,
    '~25km across GTA' as distance,
    'Premium Tesla charging destination' as features;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESLA DEMO ROUTE UPDATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ROLE REVERSAL COMPLETE:';
    RAISE NOTICE '   Manuel: Now DRIVER (was host)';
    RAISE NOTICE '   Ruth: Now HOST (was driver)';
    RAISE NOTICE '';
    RAISE NOTICE '📍 NEW ROUTE (York → Mississauga):';
    RAISE NOTICE '   Start: 372 McRoberts Ave, York, ON M6E 4R2';
    RAISE NOTICE '          (Manuel departing location)';
    RAISE NOTICE '   End:   528 Bluesky Crescent, Mississauga, ON L5R 2S3';
    RAISE NOTICE '          (Ruth''s Tesla charging destination)';
    RAISE NOTICE '   Distance: ~25km across Greater Toronto Area';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ PREMIUM FEATURES AT DESTINATION:';
    RAISE NOTICE '   - Tesla Wall Connector (48A/11.5kW)';
    RAISE NOTICE '   - Covered executive parking';
    RAISE NOTICE '   - $15/hour premium rate';
    RAISE NOTICE '   - 24/7 security & smart access';
    RAISE NOTICE '';
    RAISE NOTICE '🚗 VEHICLE:';
    RAISE NOTICE '   Manuel''s 2024 Model 3 Performance';
    RAISE NOTICE '   Midnight Silver Metallic';
    RAISE NOTICE '';
    RAISE NOTICE '📱 LOGIN CREDENTIALS REMAIN:';
    RAISE NOTICE '   Driver: manuel.host@driveway-hub.com / Demo2024!';
    RAISE NOTICE '   Host:   ruth.tesla@driveway-hub.com / Demo2024!';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 INVESTOR DEMO FLOW:';
    RAISE NOTICE '   1. Manuel logs in as driver';
    RAISE NOTICE '   2. Authorizes his Tesla vehicle';
    RAISE NOTICE '   3. Searches for charging near Mississauga';
    RAISE NOTICE '   4. Books Ruth''s premium Tesla spot';
    RAISE NOTICE '   5. Navigation sent to Tesla';
    RAISE NOTICE '   6. Track 25km journey in real-time';
    RAISE NOTICE '   7. Arrives at premium charging destination';
    RAISE NOTICE '========================================';
END;
$$;