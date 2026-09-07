const https = require('https');

const url = 'https://rvkkrxdqlvtitwhicgbc.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2tyeGRxbHZ0aXR3aGljZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjEwODYsImV4cCI6MjEwMTU5NzA4Nn0.8I2spxI7j3YWEwOlksIS_rNLm_8rpW04fO0hZWyEWF0';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2a2tyeGRxbHZ0aXR3aGljZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjEwODYsImV4cCI6MjEwMTU5NzA4Nn0.8I2spxI7j3YWEwOlksIS_rNLm_8rpW04fO0hZWyEWF0';

const req = https.get(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('PATHS:', Object.keys(parsed.paths || {}));
    } catch(e) {
      console.log('RESPONSE:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});
