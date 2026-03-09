const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');

// Recupero Piatti
router.get('/', async (req, res) => {
  try {
    const meals = await Meal.find();
    res.json(meals);
  } catch (error) {
    res.status(500).json({
      message: 'Errore nel recupero dei piatti',
      error: error.message,
    });
  }
});

module.exports = router;