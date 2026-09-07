const https = require('https');

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2tyeGRxbHZ0aXR3aGljZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjEwODYsImV4cCI6MjEwMTU5NzA4Nn0.8I2spxI7j3YWEwOlksIS_rNLm_8rpW04fO0hZWyEWF0';

const tables = ['exam_papers', 'library_books', 'subscription_codes', 'user_app_state', 'user_download_quotas'];

async function checkTable(table) {
  return new Promise((resolve) => {
    const url = `https://rvkkrxdqlvtitwhicgbc.supabase.co/rest/v1/${table}?select=count`;
    const req = https.get(url, {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Prefer': 'count=exact'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ table, status: res.statusCode, data: data.substring(0, 100) });
      });
    });
    req.on('error', err => resolve({ table, status: 'ERROR', data: err.message }));
  });
}

async function run() {
  console.log('Testing table connections...');
  for (const t of tables) {
    const res = await checkTable(t);
    console.log(`Table [${res.table}]: Status ${res.status} | Output: ${res.data}`);
  }
}

run();
