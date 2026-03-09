const mongoose = require('mongoose');

// Schema Piatto
const mealSchema = new mongoose.Schema({
  idMeal: { type: String, required: true },
  strMeal: { type: String, required: true },
  strCategory: { type: String },
  strArea: { type: String },
  strInstructions: { type: String },
  strMealThumb: { type: String },
  ingredients: [{ type: String }],
  measures: [{ type: String }],
});

module.exports = mongoose.model('Meal', mealSchema);