const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

/**
 * @swagger
 * /api/restaurants:
 *   post:
 *     summary: Crea un nuovo ristorante
 *     description: Permette a un ristoratore di registrare il proprio locale nel sistema. I campi nome, indirizzo, partita IVA e titolare sono obbligatori.
 *     tags: [Restaurants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - indirizzo
 *               - partitaIva
 *               - titolare
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Il nome del ristorante
 *                 example: "Pizzeria Da Mario"
 *               indirizzo:
 *                 type: string
 *                 description: L'indirizzo fisico del locale
 *                 example: "Via Roma 10, Milano"
 *               telefono:
 *                 type: string
 *                 description: Numero di telefono (opzionale)
 *                 example: "0212345678"
 *               partitaIva:
 *                 type: string
 *                 description: Partita IVA del ristorante
 *                 example: "IT12345678901"
 *               titolare:
 *                 type: string
 *                 description: ID (ObjectId) dell'utente ristoratore
 *                 example: "60d0fe4f5311236168a109ca"
 *               menu:
 *                 type: array
 *                 description: Array di ID dei piatti associati al menu (opzionale)
 *                 items:
 *                   type: string
 *                 example: ["60d0fe4f5311236168a109ce", "60d0fe4f5311236168a109cf"]
 *     responses:
 *       201:
 *         description: Ristorante creato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ristorante creato con successo!"
 *                 ristorante:
 *                   type: object
 *                   description: L'oggetto completo del ristorante salvato nel database
 *       400:
 *         description: Dati obbligatori mancanti nella richiesta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Nome, Indirizzo, Partita IVA e Titolare sono obbligatori."
 *       500:
 *         description: Errore interno del server durante il salvataggio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante la creazione"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore generato dal DB
 */
router.post('/', async (req, res) => {
    try {
        const { nome, indirizzo, telefono, partitaIva, titolare, menu } = req.body;

        if (!nome || !indirizzo || !partitaIva || !titolare) {
            return res.status(400).json({ message: "Nome, Indirizzo, Partita IVA e Titolare sono obbligatori." });
        }

        const nuovoRistorante = new Restaurant({
            nome,
            indirizzo,
            telefono: telefono || "Non specificato",
            partitaIva,
            titolare,
            menu: menu || [],
        });

        await nuovoRistorante.save();
        res.status(201).json({ message: 'Ristorante creato con successo!', ristorante: nuovoRistorante });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante la creazione', error: error.message });
    }
});

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Recupera la lista di tutti i ristoranti
 *     description: Restituisce l'elenco completo dei ristoranti a sistema. Include i dati espansi del titolare (nome, cognome, email) e le informazioni essenziali dei piatti presenti nel menu (nome, categoria, immagine) tramite aggregazione (populate).
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: Lista dei ristoranti recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: ID univoco (ObjectId) del ristorante
 *                     example: "60d0fe4f5311236168a109cd"
 *                   nome:
 *                     type: string
 *                     description: Nome del locale
 *                     example: "Burger King"
 *                   titolare:
 *                     type: object
 *                     description: Dati del ristoratore proprietario (popolati)
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109ca"
 *                       nome:
 *                         type: string
 *                         example: "Diego"
 *                       cognome:
 *                         type: string
 *                         example: "Rossi"
 *                       email:
 *                         type: string
 *                         example: "diego@example.com"
 *                   menu:
 *                     type: array
 *                     description: Lista dei piatti associati al ristorante (popolati)
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d0fe4f5311236168a109ce"
 *                         strMeal:
 *                           type: string
 *                           example: "Hamburger Doppio Burger"
 *                         strCategory:
 *                           type: string
 *                           example: "Carne"
 *                         strMealThumb:
 *                           type: string
 *                           example: "https://via.placeholder.com/150"
 *       500:
 *         description: Errore interno del server durante il recupero dei dati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero dei ristoranti"
 *                 error:
 *                   type: string
 *                   description: Messaggio di errore tecnico generato dal DB
 */
router.get('/', async (req, res) => {
    try {
        const ristoranti = await Restaurant.find()
            .populate('titolare', 'nome cognome email')
            .populate('menu', 'strMeal strCategory strMealThumb');

        res.status(200).json(ristoranti);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei ristoranti', error: error.message });
    }
});

/**
 * @swagger
 * /api/restaurants/titolare/{id}:
 *   get:
 *     summary: Recupera un ristorante tramite l'ID del titolare
 *     description: Restituisce i dettagli del ristorante associato all'ID del titolare fornito.
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) dell'utente ristoratore titolare
 *     responses:
 *       200:
 *         description: Ristorante trovato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Dettagli del ristorante trovato (o null se non trovato)
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero del ristorante"
 *                 error:
 *                   type: string
 *                   description: Messaggio di errore tecnico
 */
router.get('/titolare/:id', async (req, res) => {
    try {
        const ristorante = await Restaurant.findOne({ titolare: req.params.id });
        res.status(200).json(ristorante);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero del ristorante', error: error.message });
    }
});

/**
 * @swagger
 * /api/restaurants/{id}:
 *   put:
 *     summary: Aggiorna un ristorante esistente
 *     description: Modifica i dati di un ristorante esistente specificandone l'ID.
 *     tags: [Restaurants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) del ristorante da aggiornare
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: I campi del ristorante che si desidera aggiornare
 *             properties:
 *               nome:
 *                 type: string
 *               indirizzo:
 *                 type: string
 *               telefono:
 *                 type: string
 *               partitaIva:
 *                 type: string
 *               menu:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Ristorante aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ristorante aggiornato con successo!"
 *                 ristorante:
 *                   type: object
 *                   description: I dati aggiornati del ristorante
 *       404:
 *         description: Ristorante non trovato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ristorante non trovato"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante l'aggiornamento"
 *                 error:
 *                   type: string
 */
router.put('/:id', async (req, res) => {
    try {
        const ristoranteAggiornato = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!ristoranteAggiornato) {
            return res.status(404).json({ message: 'Ristorante non trovato' });
        }
        res.status(200).json({ message: 'Ristorante aggiornato con successo!', ristorante: ristoranteAggiornato });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'aggiornamento', error: error.message });
    }
});

module.exports = router;