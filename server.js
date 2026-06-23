'use strict';

require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');

const houseRoutes = require('./routes/houseRoutes');
const characterRoutes = require('./routes/characterRoutes');
const quoteRoutes = require('./routes/quoteRoutes');

connectDB();

const app = express();

app.use(express.json());

const port = process.env.PORT || 3001;

app.all('*', function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use('/api/houses', houseRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/quotes', quoteRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Server Error' });
});

app.listen(port, function() {
    console.log('Server running on port', port);
});