-- =============================================================================
-- GARAGE REALISM UPDATE - 372 McRoberts Ave, York
-- =============================================================================
-- Updates the demo database to accurately reflect the real garage situation
-- This ensures investor authenticity by matching the actual property
-- Date: 2025-01-14
-- =============================================================================

-- =============================================================================
-- STEP 1: UPDATE MAIN DRIVEWAY/GARAGE DETAILS
-- =============================================================================

-- Update the main parking spot to reflect it's a garage, not a driveway
UPDATE driveways d
SET 
    -- Update title to reflect garage
    title = 'Private Residential Garage - York Toronto',
    
    -- Update description to focus on garage benefits (no charging)
    description = 'Secure, enclosed garage in quiet York residential neighborhood. ' ||
                  'Full weather protection for your vehicle with private access. ' ||
                  'Located on a safe residential street with easy access to York University GO station. ' ||
                  'Perfect for daily parking, long-term storage, or protecting your vehicle from Toronto winters.',
    
    -- Keep the actual address
    address = '372 McRoberts Ave',
    
    -- Update type to reflect garage structure
    driveway_type = 'garage',  -- Changed from 'concrete'
    
    -- Garage is definitely covered
    is_covered = TRUE,
    
    -- REMOVE ALL CHARGING CAPABILITIES
    has_ev_charging = FALSE,
    charging_connector_type = NULL,  -- Remove Tesla connector reference
    
    -- Keep security features (realistic for garage)
    has_security_camera = TRUE,
    has_lighting = TRUE,
    
    -- Update access instructions (no charging references)
    access_instructions = 'Enter through the main gate on McRoberts Ave. ' ||
                         'The garage is on the left side of the house. ' ||
                         'Use access code #2024 for automatic garage door opener. ' ||
                         'Please ensure garage door is fully closed after entry.',
    
    -- Update special instructions (remove charging, emphasize garage benefits)
    special_instructions = 'Please park fully within the garage and ensure adequate clearance on all sides. ' ||
                          'The garage door must be closed during your parking session for security. ' ||
                          'Quiet residential area - please be mindful of noise after 10 PM. ' ||
                          'Contact host if you need assistance with garage door operation.',
    
    -- Update pricing to reflect garage premium (covered parking worth more)
    hourly_rate = 15.00,   -- Increased from $12 (garage commands premium)
    daily_rate = 85.00,    -- Increased from $75
    weekly_rate = 425.00,  -- Increased from $350
    monthly_rate = 1150.00, -- Increased from $950
    
    -- Update timestamps
    updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE d.host_id = u.id 
AND u.email = 'manuel.host@driveway-hub.com';

-- =============================================================================
-- STEP 2: UPDATE DRIVEWAY FEATURES (Make them garage-specific)
-- =============================================================================

-- First, remove any existing features for this driveway
DELETE FROM driveway_features df
USING driveways d, users u
WHERE df.driveway_id = d.id
AND d.host_id = u.id
AND u.email = 'manuel.host@driveway-hub.com';

-- Add realistic garage-specific features
WITH garage_spot AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'manuel.host@driveway-hub.com'
    LIMIT 1
)
INSERT INTO driveway_features (driveway_id, feature_name, feature_value, feature_category)
SELECT 
    id,
    feature_name,
    feature_value,
    feature_category
FROM garage_spot
CROSS JOIN (VALUES
    -- Structure features
    ('enclosed_garage', 'true', 'structure'),
    ('automatic_door', 'true', 'structure'),
    ('weather_protected', 'true', 'structure'),
    ('private_access', 'true', 'structure'),
    
    -- Security features
    ('locked_garage', 'true', 'security'),
    ('residential_area', 'true', 'security'),
    ('door_code_access', 'true', 'security'),
    ('theft_protection', 'true', 'security'),
    
    -- Convenience features
    ('winter_storage', 'true', 'convenience'),
    ('sheltered_parking', 'true', 'convenience'),
    ('no_street_parking', 'true', 'convenience'),
    ('easy_access', 'true', 'convenience'),
    
    -- NO CHARGING FEATURES - explicitly state this
    ('ev_charging', 'false', 'amenities'),
    ('standard_outlet_only', 'true', 'amenities')
) AS features(feature_name, feature_value, feature_category);

-- =============================================================================
-- STEP 3: UPDATE PHOTO CAPTIONS AND PREPARE FOR REAL PHOTOS
-- =============================================================================

-- Update existing photo records to remove charging references
UPDATE driveway_photos dp
SET 
    -- Keep URLs as placeholders but update captions
    caption = CASE photo_order
        WHEN 1 THEN 'Spacious enclosed garage with automatic door'
        WHEN 2 THEN 'Interior view showing weather protection and security'
        WHEN 3 THEN 'Private residential setting with secure access'
        WHEN 4 THEN 'Well-maintained garage space with ample room'
        ELSE caption
    END,
    -- Add metadata for photo replacement tracking
    metadata = jsonb_build_object(
        'is_placeholder', true,
        'awaiting_real_photo', true,
        'photo_type', CASE photo_order
            WHEN 1 THEN 'exterior_front'
            WHEN 2 THEN 'interior_wide'
            WHEN 3 THEN 'street_view'
            WHEN 4 THEN 'interior_detail'
            ELSE 'other'
        END,
        'updated_date', CURRENT_DATE::text,
        'notes', 'Placeholder image - awaiting real photos from property owner'
    ),
    updated_at = CURRENT_TIMESTAMP
FROM driveways d, users u
WHERE dp.driveway_id = d.id
AND d.host_id = u.id
AND u.email = 'manuel.host@driveway-hub.com';

-- =============================================================================
-- STEP 4: CREATE PHOTO UPLOAD TRACKING TABLE (if not exists)
-- =============================================================================

-- Create a tracking table for real photo uploads
CREATE TABLE IF NOT EXISTS photo_upload_queue (
    id SERIAL PRIMARY KEY,
    driveway_id INTEGER REFERENCES driveways(id),
    photo_position INTEGER NOT NULL,
    expected_photo_type VARCHAR(50),
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, uploaded, approved
    placeholder_url TEXT,
    real_photo_url TEXT,
    upload_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP,
    approved_at TIMESTAMP,
    UNIQUE(driveway_id, photo_position)
);

-- Insert tracking records for Manuel's garage photos
WITH garage_spot AS (
    SELECT d.id 
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'manuel.host@driveway-hub.com'
    LIMIT 1
)
INSERT INTO photo_upload_queue (
    driveway_id, 
    photo_position, 
    expected_photo_type, 
    placeholder_url,
    upload_notes
)
SELECT 
    gs.id,
    photo_position,
    expected_type,
    placeholder_url,
    upload_notes
FROM garage_spot gs
CROSS JOIN (VALUES
    (1, 'exterior_front', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 
     'Need: Front view of garage door from street'),
    (2, 'interior_wide', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 
     'Need: Interior shot showing parking space'),
    (3, 'street_view', 'https://images.unsplash.com/photo-1590725121839-892b458a74fe?w=800', 
     'Need: Street view showing house number and entrance'),
    (4, 'interior_detail', 'https://images.unsplash.com/photo-1617638924741-92d272ce2b77?w=800', 
     'Need: Detail shot of garage interior, showing space and condition')
) AS photos(photo_position, expected_type, placeholder_url, upload_notes)
ON CONFLICT (driveway_id, photo_position) DO UPDATE SET
    upload_notes = EXCLUDED.upload_notes,
    upload_status = 'pending';

-- =============================================================================
-- STEP 5: UPDATE AVAILABILITY NOTES
-- =============================================================================

UPDATE driveway_availability da
SET 
    notes = 'Garage available for parking - authentic Toronto location for investor demo',
    updated_at = CURRENT_TIMESTAMP
FROM driveways d, users u
WHERE da.driveway_id = d.id
AND d.host_id = u.id
AND u.email = 'manuel.host@driveway-hub.com';

-- =============================================================================
-- STEP 6: UPDATE AUDIT LOGS
-- =============================================================================

-- Add audit entry for the realism update
WITH manuel_user AS (
    SELECT id FROM users WHERE email = 'manuel.host@driveway-hub.com'
)
INSERT INTO audit_logs (user_id, event_type, event_category, description, metadata)
SELECT 
    id,
    'listing_updated',
    'admin',
    'Updated listing to accurately reflect real garage (no charging)',
    jsonb_build_object(
        'changes', jsonb_build_object(
            'removed', ARRAY['Tesla charging', 'EV capabilities', 'driveway references'],
            'added', ARRAY['Garage features', 'Weather protection', 'Enclosed parking'],
            'updated_pricing', jsonb_build_object(
                'hourly', 15.00,
                'daily', 85.00,
                'weekly', 425.00,
                'monthly', 1150.00
            )
        ),
        'reason', 'Investor demo authenticity - matching real property',
        'property_type', 'garage',
        'update_date', CURRENT_DATE::text
    )
FROM manuel_user;

-- =============================================================================
-- STEP 7: UPDATE SYSTEM SETTINGS FOR GARAGE FOCUS
-- =============================================================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('garage_premium_enabled', 'true', 'boolean', 'Enable premium pricing for enclosed garages', TRUE),
('garage_features_highlight', 'true', 'boolean', 'Highlight garage-specific features in search', TRUE),
('photo_upload_pending', 'true', 'boolean', 'System awaiting real property photos', FALSE),
('demo_property_type', 'garage', 'string', 'Demo property is a garage, not driveway', FALSE)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = CURRENT_TIMESTAMP;

-- =============================================================================
-- STEP 8: VERIFICATION QUERIES
-- =============================================================================

-- Verify main updates
SELECT 
    '=== GARAGE UPDATE VERIFICATION ===' as section;

SELECT 
    'Property Type:' as check_item,
    driveway_type as current_value,
    CASE WHEN driveway_type = 'garage' THEN '✓ CORRECT' ELSE '✗ NEEDS FIX' END as status
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com'

UNION ALL

SELECT 
    'EV Charging Removed:' as check_item,
    CASE WHEN has_ev_charging THEN 'Still Active' ELSE 'Removed' END as current_value,
    CASE WHEN NOT has_ev_charging THEN '✓ CORRECT' ELSE '✗ NEEDS FIX' END as status
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com'

UNION ALL

SELECT 
    'Pricing Updated:' as check_item,
    '$' || hourly_rate || '/hour' as current_value,
    CASE WHEN hourly_rate = 15.00 THEN '✓ GARAGE PREMIUM' ELSE '✗ CHECK PRICING' END as status
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com'

UNION ALL

SELECT 
    'Description Updated:' as check_item,
    CASE 
        WHEN description LIKE '%garage%' AND description NOT LIKE '%charging%' 
        THEN 'Garage-focused' 
        ELSE 'Needs Update' 
    END as current_value,
    CASE 
        WHEN description LIKE '%garage%' AND description NOT LIKE '%charging%' 
        THEN '✓ CORRECT' 
        ELSE '✗ NEEDS FIX' 
    END as status
FROM driveways d
JOIN users u ON d.host_id = u.id
WHERE u.email = 'manuel.host@driveway-hub.com';

-- Show photo upload queue status
SELECT 
    '=== PHOTO UPLOAD QUEUE ===' as section,
    photo_position,
    expected_photo_type,
    upload_status,
    upload_notes
FROM photo_upload_queue
WHERE driveway_id = (
    SELECT d.id FROM driveways d 
    JOIN users u ON d.host_id = u.id 
    WHERE u.email = 'manuel.host@driveway-hub.com'
)
ORDER BY photo_position;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
DECLARE
    v_updates_made INTEGER := 0;
    v_garage_id INTEGER;
    v_hourly_rate NUMERIC;
BEGIN
    -- Get garage details
    SELECT d.id, d.hourly_rate INTO v_garage_id, v_hourly_rate
    FROM driveways d
    JOIN users u ON d.host_id = u.id
    WHERE u.email = 'manuel.host@driveway-hub.com';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GARAGE REALISM UPDATE COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Location: 372 McRoberts Ave, York, ON';
    RAISE NOTICE 'Type: Private Residential GARAGE';
    RAISE NOTICE '';
    RAISE NOTICE 'Updates Applied:';
    RAISE NOTICE '  ✓ Removed all Tesla/EV charging references';
    RAISE NOTICE '  ✓ Updated from "driveway" to "garage" throughout';
    RAISE NOTICE '  ✓ Added garage-specific features (enclosed, weather protection)';
    RAISE NOTICE '  ✓ Updated pricing to garage premium ($%/hour)', v_hourly_rate;
    RAISE NOTICE '  ✓ Prepared photo placeholder system for real uploads';
    RAISE NOTICE '  ✓ Updated all descriptions and instructions';
    RAISE NOTICE '';
    RAISE NOTICE 'Garage Features Now Highlighted:';
    RAISE NOTICE '  • Fully enclosed and secure';
    RAISE NOTICE '  • Weather protection (important for Toronto winters)';
    RAISE NOTICE '  • Private residential setting';
    RAISE NOTICE '  • Automatic garage door with code access';
    RAISE NOTICE '  • Protection from theft and vandalism';
    RAISE NOTICE '  • NO EV charging (matching reality)';
    RAISE NOTICE '';
    RAISE NOTICE 'Photo Upload Status:';
    RAISE NOTICE '  • 4 placeholder photos currently active';
    RAISE NOTICE '  • Upload queue created for real photos';
    RAISE NOTICE '  • Ready to receive photos from property owner';
    RAISE NOTICE '';
    RAISE NOTICE 'For Investor Demo:';
    RAISE NOTICE '  • Authentic representation of actual property';
    RAISE NOTICE '  • Premium garage pricing justified by features';
    RAISE NOTICE '  • Ready for real photo integration';
    RAISE NOTICE '  • Focus on garage benefits over charging';
    RAISE NOTICE '========================================';
END;
$$;