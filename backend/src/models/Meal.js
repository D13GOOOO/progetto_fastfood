const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    idMeal: { type: String, required: true },
    strMeal: { type: String, required: true },
    prezzo: { type: Number },
    strCategory: { type: String },
    strArea: { type: String },
    strInstructions: { type: String },
    strMealThumb: { type: String },
    ingredients: [{ type: String }],
    measures: [{ type: String }],
    creatore: { type: String, default: 'System' },
    scontoPercentuale: { type: Number, default: 0 },
    scontoScadenza: { type: Date, default: null }
});

module.exports = mongoose.model('Meal', mealSchema);