const mongoose = require('mongoose');

// Schema Ristorante
const restaurantSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  indirizzo: { type: String, required: true },
  titolare: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  menu: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
    },
  ],
});

module.exports = mongoose.model('Restaurant', restaurantSchema);