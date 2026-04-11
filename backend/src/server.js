const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Fast Food API',
            version: '1.0.0',
            description: 'Documentazione RESTful API per il progetto Fast Food Express',
        },
        servers: [{ url: 'http://localhost:3000' }], 
    },
    apis: [path.join(__dirname, 'routes/*.js')],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const mongoURI = process.env.MONGO_URI;

mongoose
    .connect(mongoURI)
    .then(() => console.log('Connesso con successo a MongoDB Atlas!'))
    .catch((errore) => console.error('Errore critico di connessione a MongoDB:', errore));

app.use('/api/users', require('./routes/users')); 
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/orders', require('./routes/orders'));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Fast Food API Server is running' });
});

app.listen(PORT, () => {
    console.log(`Server avviato! API Docs: http://localhost:${PORT}/api-docs`);
});