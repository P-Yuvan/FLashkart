require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');

connectDB();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/rfid', require('./src/routes/rfid'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ status: 'FlashCart API Running', version: '1.0.0' }));
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log('FlashCart server running on port ' + PORT));
