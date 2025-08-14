-- Payment & Completion Flow for Tesla Demo
-- =========================================
-- Simulates the complete payment lifecycle for investor demonstration

-- =============================================================================
-- PAYMENT PROCESSING FUNCTIONS
-- =============================================================================

-- Function to process demo payment
CREATE OR REPLACE FUNCTION process_demo_payment(
    p_booking_id UUID,
    p_payment_method VARCHAR(50) DEFAULT 'demo_card'
)
RETURNS TABLE (
    payment_id UUID,
    stripe_intent_id VARCHAR(200),
    amount DECIMAL(10,2),
    status VARCHAR(50),
    message TEXT
) AS $$
DECLARE
    v_payment_id UUID;
    v_amount DECIMAL(10,2);
    v_stripe_intent_id VARCHAR(200);
    v_booking_record RECORD;
BEGIN
    -- Get booking details
    SELECT * INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;
    
    -- Generate demo Stripe payment intent ID
    v_stripe_intent_id := 'pi_demo_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 16);
    v_amount := v_booking_record.total_amount;
    
    -- Create payment record
    INSERT INTO payments (
        booking_id,
        stripe_payment_intent_id,
        stripe_charge_id,
        amount,
        currency,
        payment_method,
        payment_status,
        authorized_at,
        captured_at
    ) VALUES (
        p_booking_id,
        v_stripe_intent_id,
        'ch_demo_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 16),
        v_amount,
        'CAD', -- Canadian dollars for Toronto demo
        p_payment_method,
        'succeeded',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_payment_id;
    
    -- Update booking status to confirmed
    UPDATE bookings
    SET 
        booking_status = 'confirmed',
        confirmed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_booking_id;
    
    -- Log payment event
    INSERT INTO audit_logs (
        user_id,
        event_type,
        event_category,
        description,
        related_booking_id,
        related_payment_id,
        metadata
    ) VALUES (
        v_booking_record.driver_id,
        'payment_processed',
        'payment',
        'Demo payment processed for booking ' || v_booking_record.booking_reference,
        p_booking_id,
        v_payment_id,
        jsonb_build_object(
            'amount', v_amount,
            'currency', 'CAD',
            'method', p_payment_method,
            'demo', true
        )
    );
    
    RETURN QUERY
    SELECT 
        v_payment_id,
        v_stripe_intent_id,
        v_amount,
        'succeeded'::VARCHAR(50),
        'Payment processed successfully for demo'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BOOKING COMPLETION FUNCTIONS
-- =============================================================================

-- Function to complete demo booking
CREATE OR REPLACE FUNCTION complete_demo_booking(
    p_booking_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    host_earnings DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    total_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_booking_record RECORD;
    v_host_earnings DECIMAL(10,2);
BEGIN
    -- Get booking details
    SELECT * INTO v_booking_record
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;
    
    -- Calculate host earnings
    v_host_earnings := v_booking_record.subtotal - v_booking_record.platform_fee;
    
    -- Update booking to completed
    UPDATE bookings
    SET 
        booking_status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        departure_detected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_booking_id;
    
    -- Create payout record for host
    INSERT INTO payouts (
        host_id,
        amount,
        currency,
        payout_period_start,
        payout_period_end,
        payout_status,
        processed_at
    ) VALUES (
        v_booking_record.host_id,
        v_host_earnings,
        'CAD',
        CURRENT_DATE,
        CURRENT_DATE,
        'pending',
        CURRENT_TIMESTAMP
    );
    
    -- Log completion
    INSERT INTO audit_logs (
        user_id,
        event_type,
        event_category,
        description,
        related_booking_id,
        metadata
    ) VALUES (
        v_booking_record.driver_id,
        'booking_completed',
        'booking',
        'Demo booking completed: ' || v_booking_record.booking_reference,
        p_booking_id,
        jsonb_build_object(
            'host_earnings', v_host_earnings,
            'platform_fee', v_booking_record.platform_fee,
            'total_amount', v_booking_record.total_amount,
            'demo', true
        )
    );
    
    RETURN QUERY
    SELECT 
        TRUE,
        'Booking completed successfully'::TEXT,
        v_host_earnings,
        v_booking_record.platform_fee,
        v_booking_record.total_amount;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEMO BOOKING CREATION WITH PAYMENT
-- =============================================================================

-- Function to create a complete demo booking with payment
CREATE OR REPLACE FUNCTION create_demo_booking_with_payment()
RETURNS TABLE (
    booking_id UUID,
    booking_reference VARCHAR(20),
    payment_id UUID,
    total_amount DECIMAL(10,2),
    status TEXT
) AS $$
DECLARE
    v_driver_id UUID;
    v_host_id UUID;
    v_vehicle_id UUID;
    v_driveway_id UUID;
    v_booking_id UUID;
    v_booking_ref VARCHAR(20);
    v_payment_id UUID;
    v_total_amount DECIMAL(10,2);
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user IDs
    SELECT id INTO v_driver_id FROM users WHERE email = 'ruth.tesla@driveway-hub.com';
    SELECT id INTO v_host_id FROM users WHERE email = 'manuel.host@driveway-hub.com';
    
    -- Get vehicle and driveway
    SELECT id INTO v_vehicle_id FROM vehicles WHERE user_id = v_driver_id LIMIT 1;
    SELECT id INTO v_driveway_id FROM driveways WHERE host_id = v_host_id LIMIT 1;
    
    -- Set booking times (2 hours from now, 3-hour duration)
    v_start_time := CURRENT_TIMESTAMP + INTERVAL '2 hours';
    v_end_time := v_start_time + INTERVAL '3 hours';
    
    -- Generate unique booking reference
    v_booking_ref := 'DH-DEMO' || TO_CHAR(CURRENT_TIMESTAMP, 'MMDD');
    
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
        booking_status,
        driver_notes,
        host_notes
    ) VALUES (
        v_driver_id,
        v_vehicle_id,
        v_driveway_id,
        v_host_id,
        v_booking_ref,
        v_start_time,
        v_end_time,
        12.00, -- Toronto rate
        3.0,
        36.00, -- 3 hours × $12
        5.40,  -- 15% platform fee
        41.40, -- Total
        'pending',
        'Demo booking for investor presentation - Tesla integration showcase',
        'VIP demo guest - please ensure best experience'
    ) RETURNING id, total_amount INTO v_booking_id, v_total_amount;
    
    -- Process payment automatically
    INSERT INTO payments (
        booking_id,
        stripe_payment_intent_id,
        stripe_charge_id,
        amount,
        currency,
        payment_method,
        payment_status,
        authorized_at,
        captured_at
    ) VALUES (
        v_booking_id,
        'pi_demo_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 16),
        'ch_demo_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 16),
        v_total_amount,
        'CAD',
        'demo_card',
        'succeeded',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_payment_id;
    
    -- Confirm booking
    UPDATE bookings
    SET 
        booking_status = 'confirmed',
        confirmed_at = CURRENT_TIMESTAMP
    WHERE id = v_booking_id;
    
    RETURN QUERY
    SELECT 
        v_booking_id,
        v_booking_ref,
        v_payment_id,
        v_total_amount,
        'Booking created and payment processed'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- REVIEW SYSTEM FOR DEMO
-- =============================================================================

-- Function to create demo reviews
CREATE OR REPLACE FUNCTION create_demo_reviews(
    p_booking_id UUID
)
RETURNS TABLE (
    review_id UUID,
    reviewer_name TEXT,
    reviewee_name TEXT,
    rating INTEGER,
    review_text TEXT
) AS $$
DECLARE
    v_driver_id UUID;
    v_host_id UUID;
    v_driver_review_id UUID;
    v_host_review_id UUID;
BEGIN
    -- Get user IDs from booking
    SELECT driver_id, host_id INTO v_driver_id, v_host_id
    FROM bookings
    WHERE id = p_booking_id;
    
    -- Create driver's review of host
    INSERT INTO reviews (
        booking_id,
        reviewer_id,
        reviewee_id,
        rating,
        review_text,
        review_type
    ) VALUES (
        p_booking_id,
        v_driver_id,
        v_host_id,
        5,
        'Excellent parking spot! Easy to find, secure, and the Tesla charger worked perfectly. Manuel was very responsive and helpful. Highly recommend for Tesla owners visiting York.',
        'driver_to_host'
    ) RETURNING id INTO v_driver_review_id;
    
    -- Create host's review of driver
    INSERT INTO reviews (
        booking_id,
        reviewer_id,
        reviewee_id,
        rating,
        review_text,
        review_type
    ) VALUES (
        p_booking_id,
        v_host_id,
        v_driver_id,
        5,
        'Ruth was a perfect guest! Arrived on time, parked neatly, and left the space clean. The Tesla integration made everything smooth. Would definitely host again!',
        'host_to_driver'
    ) RETURNING id INTO v_host_review_id;
    
    -- Return created reviews
    RETURN QUERY
    SELECT 
        r.id,
        u1.first_name || ' ' || u1.last_name,
        u2.first_name || ' ' || u2.last_name,
        r.rating,
        r.review_text
    FROM reviews r
    JOIN users u1 ON r.reviewer_id = u1.id
    JOIN users u2 ON r.reviewee_id = u2.id
    WHERE r.id IN (v_driver_review_id, v_host_review_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEMO STATISTICS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW demo_statistics AS
SELECT 
    'Total Demo Bookings' as metric,
    COUNT(*) as value
FROM bookings
WHERE driver_notes LIKE '%demo%' OR host_notes LIKE '%demo%'

UNION ALL

SELECT 
    'Demo Revenue (CAD)' as metric,
    COALESCE(SUM(total_amount), 0) as value
FROM bookings
WHERE driver_notes LIKE '%demo%' OR host_notes LIKE '%demo%'

UNION ALL

SELECT 
    'Platform Fees Earned (CAD)' as metric,
    COALESCE(SUM(platform_fee), 0) as value
FROM bookings
WHERE driver_notes LIKE '%demo%' OR host_notes LIKE '%demo%'

UNION ALL

SELECT 
    'Average Demo Rating' as metric,
    COALESCE(AVG(rating), 0) as value
FROM reviews r
JOIN bookings b ON r.booking_id = b.id
WHERE b.driver_notes LIKE '%demo%' OR b.host_notes LIKE '%demo%'

UNION ALL

SELECT 
    'Tesla Integrations' as metric,
    COUNT(DISTINCT tesla_user_id) as value
FROM users
WHERE tesla_user_id IS NOT NULL;

-- =============================================================================
-- QUICK DEMO SETUP PROCEDURE
-- =============================================================================

CREATE OR REPLACE FUNCTION setup_complete_demo()
RETURNS TABLE (
    step TEXT,
    result TEXT
) AS $$
DECLARE
    v_booking_id UUID;
    v_payment_id UUID;
BEGIN
    -- Step 1: Create demo booking
    SELECT booking_id INTO v_booking_id
    FROM create_demo_booking_with_payment();
    
    RETURN QUERY SELECT 'Booking Created'::TEXT, v_booking_id::TEXT;
    
    -- Step 2: Simulate arrival
    UPDATE bookings
    SET 
        booking_status = 'active',
        arrival_detected_at = CURRENT_TIMESTAMP,
        tesla_navigation_sent = TRUE,
        auto_park_attempted = TRUE,
        auto_park_successful = TRUE
    WHERE id = v_booking_id;
    
    RETURN QUERY SELECT 'Arrival Simulated'::TEXT, 'Vehicle arrived and parked'::TEXT;
    
    -- Step 3: Complete booking
    PERFORM complete_demo_booking(v_booking_id);
    
    RETURN QUERY SELECT 'Booking Completed'::TEXT, 'Payment processed and host paid'::TEXT;
    
    -- Step 4: Add reviews
    PERFORM create_demo_reviews(v_booking_id);
    
    RETURN QUERY SELECT 'Reviews Added'::TEXT, '5-star reviews exchanged'::TEXT;
    
    -- Return summary
    RETURN QUERY 
    SELECT 
        'Demo Complete'::TEXT, 
        'Booking ' || b.booking_reference || ' - Total: $' || b.total_amount::TEXT
    FROM bookings b
    WHERE b.id = v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DEMO EXECUTION
-- =============================================================================

-- To run a complete demo:
-- SELECT * FROM setup_complete_demo();

-- To create just a booking with payment:
-- SELECT * FROM create_demo_booking_with_payment();

-- To view demo statistics:
-- SELECT * FROM demo_statistics;

-- To process a payment for existing booking:
-- SELECT * FROM process_demo_payment('booking_id_here');

-- To complete a booking:
-- SELECT * FROM complete_demo_booking('booking_id_here');

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=======================================';
    RAISE NOTICE 'PAYMENT & COMPLETION FLOW READY!';
    RAISE NOTICE '=======================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  - create_demo_booking_with_payment()';
    RAISE NOTICE '  - process_demo_payment(booking_id)';
    RAISE NOTICE '  - complete_demo_booking(booking_id)';
    RAISE NOTICE '  - create_demo_reviews(booking_id)';
    RAISE NOTICE '  - setup_complete_demo()';
    RAISE NOTICE '';
    RAISE NOTICE 'Payment Flow:';
    RAISE NOTICE '  1. Booking created (pending)';
    RAISE NOTICE '  2. Payment authorized';
    RAISE NOTICE '  3. Booking confirmed';
    RAISE NOTICE '  4. Vehicle arrives (active)';
    RAISE NOTICE '  5. Session ends (completed)';
    RAISE NOTICE '  6. Host receives payout';
    RAISE NOTICE '';
    RAISE NOTICE 'Demo Pricing (Toronto Market):';
    RAISE NOTICE '  Hourly Rate: $12.00 CAD';
    RAISE NOTICE '  Platform Fee: 15%';
    RAISE NOTICE '  3-hour booking: $41.40 total';
    RAISE NOTICE '  Host earnings: $30.60';
    RAISE NOTICE '  Platform revenue: $5.40';
    RAISE NOTICE '=======================================';
END;
$$;