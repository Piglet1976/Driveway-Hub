const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'driveway_hub_dev',
  user: 'nodeuser',
  password: 'nodepass'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err);
  } else {
    console.log('✅ Connection successful:', res.rows[0]);
  }
  process.exit();
});