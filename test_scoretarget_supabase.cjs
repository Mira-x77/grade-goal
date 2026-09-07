const https = require('https');

const url = 'https://aaayzhvqgqptgqaxxbdh.supabase.co/rest/v1/exam_papers?select=id,title,subject,year';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

https.get(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', data.substring(0, 300));
  });
}).on('error', err => {
  console.log('ERROR:', err.message);
});
