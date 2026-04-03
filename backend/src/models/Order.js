const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    utente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    piatti: [
        {
            nomePiatto: { type: String, required: true },
            prezzo: { type: Number },
            quantita: { type: Number, required: true, default: 1 },
        }
    ],
    prezzoTotale: { type: Number, required: true },
    indirizzoConsegna: { type: String, default: 'Ritiro in sede' },
    stato: {
        type: String,
        enum: ['In attesa', 'In preparazione', 'Consegnato'],
        default: 'In attesa',
    },
    ristoratoreId: { type: String, default: 'System' },
    tempoAttesa: { type: Number, default: 15 },
    dataOrdine: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);