// Importazioni Necessarie
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- Rotta per la Registrazione Utente ---
router.post('/register', async (req, res) => {
  try {
    const { nome, cognome, email, password, ruolo } = req.body;

    const nuovoUtente = new User({
      nome,
      cognome,
      email,
      password,
      ruolo,
    });

    await nuovoUtente.save();

    res.status(201).json({
      message: 'Utente registrato con successo!',
      utente: nuovoUtente,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Errore durante la registrazione',
      error: error.message,
    });
  }
});

// --- NUOVA Rotta per il Login Utente ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Cerchiamo se esiste un utente con questa email nel database
    const utente = await User.findOne({ email });

    // 2. Se l'utente non esiste, o se la password è sbagliata, diamo errore
    if (!utente || utente.password !== password) {
      return res.status(401).json({ message: 'Email o password non validi' });
    }

    // 3. Se le credenziali sono giuste, rispondiamo con successo (evitando di inviare la password indietro!)
    res.status(200).json({
      message: 'Login effettuato con successo!',
      utente: {
        id: utente._id,
        nome: utente.nome,
        cognome: utente.cognome,
        email: utente.email,
        ruolo: utente.ruolo
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Errore durante il login',
      error: error.message,
    });
  }
});

// Esportazione del Modulo
module.exports = router;