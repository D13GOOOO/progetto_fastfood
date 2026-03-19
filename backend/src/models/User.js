const mongoose = require('mongoose');

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
    metodoPagamento: {
        tipo: {
            type: String,
            enum: ['Carta di Credito', 'Prepagata', 'Contanti'],
            default: 'Contanti'
        },
        numeroCarta: { type: String, default: '' }
    },
    preferenze: { type: String, default: '' },
    indirizzo: { type: String, default: '' }
});

module.exports = mongoose.model('User', userSchema);