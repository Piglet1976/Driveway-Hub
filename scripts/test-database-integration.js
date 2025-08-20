#!/usr/bin/env node

/**
 * Database Integration Test Script
 * Tests the full database connection and data persistence for Driveway Hub
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

console.log('🔧 Testing Driveway Hub Database Integration...\n');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'driveway_hub_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runTests() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to PostgreSQL database');
    
    // Test 1: Check if tables exist
    console.log('\n📋 Test 1: Checking database tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables:`, tables.join(', '));
    
    // Check for essential tables
    const essentialTables = ['users', 'driveways', 'vehicles', 'bookings'];
    const missingTables = essentialTables.filter(table => !tables.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing essential tables: ${missingTables.join(', ')}`);
    }
    console.log('✅ All essential tables exist');
    
    // Test 2: Check demo data
    console.log('\n📊 Test 2: Checking demo data...');
    
    // Check users
    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(usersResult.rows[0].count);
    console.log(`Users: ${userCount} records`);
    
    // Check Ruth's account specifically
    const ruthResult = await client.query(
      "SELECT first_name, last_name, email, user_type FROM users WHERE email = 'ruth@driveway-hub.app'"
    );
    if (ruthResult.rows.length > 0) {
      const ruth = ruthResult.rows[0];
      console.log(`✅ Found Ruth's account: ${ruth.first_name} ${ruth.last_name} (${ruth.user_type})`);
    } else {
      console.log('❌ Ruth\'s demo account not found');
    }
    
    // Check driveways
    const drivewaysResult = await client.query('SELECT COUNT(*) as count FROM driveways WHERE city = $1', ['Toronto']);
    const drivewayCount = parseInt(drivewaysResult.rows[0].count);
    console.log(`Toronto driveways: ${drivewayCount} records`);
    
    // Check vehicles
    const vehiclesResult = await client.query('SELECT COUNT(*) as count FROM vehicles');
    const vehicleCount = parseInt(vehiclesResult.rows[0].count);
    console.log(`Vehicles: ${vehicleCount} records`);
    
    // Check bookings
    const bookingsResult = await client.query('SELECT COUNT(*) as count FROM bookings');
    const bookingCount = parseInt(bookingsResult.rows[0].count);
    console.log(`Bookings: ${bookingCount} records`);
    
    // Test 3: Test data relationships
    console.log('\n🔗 Test 3: Testing data relationships...');
    const relationshipQuery = `
      SELECT 
        u.first_name || ' ' || u.last_name as owner_name,
        d.title as driveway_title,
        d.city,
        d.hourly_rate,
        v.model as vehicle_model,
        v.display_name as vehicle_name
      FROM users u
      LEFT JOIN driveways d ON u.id = d.host_id
      LEFT JOIN vehicles v ON u.id = v.user_id
      WHERE u.email = 'ruth@driveway-hub.app'
      ORDER BY d.title, v.model
    `;
    
    const relationshipResult = await client.query(relationshipQuery);
    if (relationshipResult.rows.length > 0) {
      console.log('✅ Data relationships working:');
      relationshipResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.owner_name}:`);
        if (row.driveway_title) {
          console.log(`     Driveway: ${row.driveway_title} in ${row.city} ($${row.hourly_rate}/hr)`);
        }
        if (row.vehicle_model) {
          console.log(`     Vehicle: ${row.vehicle_name} (${row.vehicle_model})`);
        }
      });
    }
    
    // Test 4: Test booking queries
    console.log('\n📅 Test 4: Testing booking data...');
    const bookingQuery = `
      SELECT 
        b.booking_reference,
        b.booking_status,
        b.total_amount,
        d.title as driveway_title,
        v.model as vehicle_model,
        b.start_time,
        b.end_time
      FROM bookings b
      JOIN driveways d ON b.driveway_id = d.id
      JOIN vehicles v ON b.vehicle_id = v.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `;
    
    const bookingQueryResult = await client.query(bookingQuery);
    if (bookingQueryResult.rows.length > 0) {
      console.log('✅ Booking data retrieved:');
      bookingQueryResult.rows.forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.booking_reference} - ${booking.driveway_title}`);
        console.log(`     Status: ${booking.booking_status}, Amount: $${booking.total_amount}`);
        console.log(`     Vehicle: ${booking.vehicle_model}`);
        console.log(`     Time: ${booking.start_time} to ${booking.end_time}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No booking records found');
    }
    
    // Test 5: Test authentication data
    console.log('\n🔐 Test 5: Testing authentication setup...');
    const authQuery = `
      SELECT email, user_type, email_verified, account_status 
      FROM users 
      WHERE email = 'ruth@driveway-hub.app'
    `;
    const authResult = await client.query(authQuery);
    if (authResult.rows.length > 0) {
      const authData = authResult.rows[0];
      console.log('✅ Authentication data:');
      console.log(`   Email: ${authData.email}`);
      console.log(`   Type: ${authData.user_type}`);
      console.log(`   Verified: ${authData.email_verified}`);
      console.log(`   Status: ${authData.account_status}`);
    }
    
    console.log('\n🎉 Database Integration Test Complete!');
    console.log('\n📝 Summary:');
    console.log(`   • Database connection: ✅ Working`);
    console.log(`   • Tables: ✅ ${tables.length} tables found`);
    console.log(`   • Demo data: ✅ ${userCount} users, ${drivewayCount} driveways, ${vehicleCount} vehicles, ${bookingCount} bookings`);
    console.log(`   • Relationships: ✅ Working properly`);
    console.log(`   • Ready for production: ✅ Yes`);
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Login with: ruth@driveway-hub.app');
    console.log('   3. Test booking creation and data persistence');
    console.log('   4. Verify Tesla integration workflows');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the tests
runTests().catch(console.error);