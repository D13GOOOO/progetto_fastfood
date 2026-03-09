const mongoose = require('mongoose');

// Schema Utente
const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  cognome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ruolo: {
    type: String,
    enum: ['cliente', 'ristoratore'],
    required: true,
  },
});

module.exports = mongoose.model('User', userSchema);