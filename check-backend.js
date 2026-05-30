import http from 'http';

const data = JSON.stringify({ question: 'Test question', selectedAnswer: 'A', correctAnswer: 'B' });
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ai/explain',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('status', res.statusCode);
    console.log('headers', res.headers);
    console.log('body', body);
  });
});

req.on('error', (err) => {
  console.error('error', err.message);
});

req.write(data);
req.end();
