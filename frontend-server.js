const express = require('express');
const path = require('path');

const app = express();

const CLIENT_DIST = path.join(__dirname, 'client', 'dist');

// Serve built assets at both the root and /transport base path.
app.use(express.static(CLIENT_DIST));
app.use('/', express.static(CLIENT_DIST));
app.use('/transport', express.static(CLIENT_DIST));
app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});
// SPA fallback: serve index.html for the app routes.
app.get(/^\/transport(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});



const PORT = Number(process.env.FRONTEND_PORT || 2889);
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Serving from ${CLIENT_DIST}`);
});

module.exports = app;
