const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Creazione Ordine
router.post('/', async (req, res) => {
  try {
    const { utenteId, piatti, totale, stato } = req.body;

    const piattiFormattati = piatti.map(p => ({
      nomePiatto: p.nome,
      prezzo: p.prezzo,
      quantita: 1
    }));

    const nuovoOrdine = new Order({
      utente: utenteId,
      piatti: piattiFormattati,
      prezzoTotale: totale,
      stato: stato || 'In preparazione'
    });

    await nuovoOrdine.save();

    res.status(201).json({ message: 'Ordine inviato con successo!', ordine: nuovoOrdine });
  } catch (error) {
    console.error("Errore salvataggio ordine:", error);
    res.status(500).json({
      message: "Errore durante l'invio dell'ordine",
      error: error.message,
    });
  }
});

// Recupero Ordini
router.get('/', async (req, res) => {
  try {
    const ordini = await Order.find().populate('utente', 'nome cognome email');
    res.json(ordini);
  } catch (error) {
    res.status(500).json({
      message: 'Errore nel recupero degli ordini',
      error: error.message,
    });
  }
});

// Aggiornamento Stato Ordine
router.put('/:id/status', async (req, res) => {
  try {
    const { stato } = req.body;

    const statiValidi = [
      'In attesa',
      'In preparazione',
      'In consegna',
      'Consegnato',
    ];
    if (!statiValidi.includes(stato)) {
      return res
          .status(400)
          .json({ message: 'Stato della consegna non valido.' });
    }

    const ordineAggiornato = await Order.findByIdAndUpdate(
        req.params.id,
        { stato: stato },
        { new: true }
    );

    if (!ordineAggiornato) {
      return res.status(404).json({ message: 'Ordine non trovato.' });
    }

    res.json({
      message: 'Stato della consegna aggiornato con successo!',
      ordine: ordineAggiornato,
    });
  } catch (error) {
    res.status(500).json({
      message: "Errore nell'aggiornamento della consegna",
      error: error.message,
    });
  }
});

module.exports = router;