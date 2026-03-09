const mongoose = require('mongoose');

// Schema Ordine
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
    },
  ],
  prezzoTotale: { type: Number, required: true },
  indirizzoConsegna: { type: String, default: 'Da concordare / Ritiro in sede' },
  stato: {
    type: String,
    enum: ['In attesa', 'In preparazione', 'In consegna', 'Consegnato'],
    default: 'In preparazione',
  },
  dataOrdine: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);