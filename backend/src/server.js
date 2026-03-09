const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = 3000;

// Configurazione Middleware
app.use(cors());
app.use(express.json());

// Configurazione Documentazione API
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Fast Food API',
      version: '1.0.0',
      description: 'Documentazione delle API per il progetto Fast Food',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./src/routes/*.js'],
};
//const swaggerDocs = swaggerJsdoc(swaggerOptions);
//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Importazione Rotte
const mealsRoutes = require('./routes/meals');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const restaurantsRoutes = require('./routes/restaurants');

// Connessione al Database
const mongoURI = 'mongodb://127.0.0.1:27017/fastfood';
mongoose
  .connect(mongoURI)
  .then(() => console.log('Connesso con successo a MongoDB'))
  .catch((errore) => console.error('Errore di connessione a MongoDB:', errore));

// Utilizzo Rotte
app.use('/api/meals', mealsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/restaurants', restaurantsRoutes);

// Rotta di base per testare il server
app.get('/', (req, res) => {
  res.json({ messaggio: 'Benvenuto nel server di Fast Food!' });
});

// Avvio Server
app.listen(PORT, () => {
  console.log(`Server avviato con successo! In ascolto sulla porta ${PORT}`);
});
