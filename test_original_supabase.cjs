const https = require('https');

const originalUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co/rest/v1/exam_papers?select=count';

https.get(originalUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('ORIGINAL SUPABASE STATUS:', res.statusCode);
    console.log('DATA:', data);
  });
}).on('error', err => {
  console.log('ERROR:', err.message);
});
