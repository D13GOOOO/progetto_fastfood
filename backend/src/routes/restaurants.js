const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// Creazione Ristorante
router.post('/', async (req, res) => {
  try {
    const { nome, indirizzo, titolare, menu } = req.body;

    const nuovoRistorante = new Restaurant({
      nome,
      indirizzo,
      titolare,
      menu,
    });

    await nuovoRistorante.save();
    res.status(201).json({
      message: 'Ristorante creato con successo!',
      ristorante: nuovoRistorante,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Errore durante la creazione',
      error: error.message
    });
  }
});

// Recupero Ristoranti
router.get('/', async (req, res) => {
  try {
    const ristoranti = await Restaurant.find()
        .populate('titolare', 'nome cognome email')
        .populate('menu', 'strMeal strCategory strMealThumb');

    res.json(ristoranti);
  } catch (error) {
    res.status(500).json({
      message: 'Errore nel recupero dei ristoranti',
      error: error.message,
    });
  }
});

module.exports = router;