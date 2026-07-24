const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 

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
    preferenze: { type: [String], default: [] },
    indirizzo: { type: String, default: '' }
});

userSchema.pre('save', async function() {

    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Metodo di supporto per confrontare la password digitata durante il login con l'hash salvato a db
userSchema.methods.comparaPassword = async function(passwordDigitata) {
    return await bcrypt.compare(passwordDigitata, this.password);
};

module.exports = mongoose.model('User', userSchema);