const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal');
const mongoose = require('mongoose');

/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Recupera l'intero catalogo dei piatti
 *     description: Restituisce la lista completa di tutti i piatti presenti nel database, inclusi i piatti predefiniti (System) e quelli creati dai vari ristoratori.
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Lista dei piatti recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   idMeal:
 *                     type: string
 *                     description: ID univoco del piatto
 *                     example: "CUST-1709827364512"
 *                   strMeal:
 *                     type: string
 *                     description: Nome del piatto
 *                     example: "Lasagne al Pesto"
 *                   prezzo:
 *                     type: number
 *                     description: Prezzo del piatto
 *                     example: 15.00
 *                   strCategory:
 *                     type: string
 *                     description: Categoria (es. Pasta, Carne)
 *                     example: "Pasta"
 *                   creatore:
 *                     type: string
 *                     description: ID del ristoratore o "System"
 *                     example: "System"
 *       500:
 *         description: Errore interno del server durante la lettura del database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero dei piatti"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore generato dal DB
 */
router.get('/', async (req, res) => {
    try {
        const meals = await Meal.find();
        res.status(200).json(meals);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dei piatti', error: error.message });
    }
});

/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Crea un nuovo piatto
 *     description: Aggiunge un nuovo piatto personalizzato al menu. Genera automaticamente un ID univoco (idMeal) basato sul timestamp.
 *     tags: [Meals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strMeal
 *               - prezzo
 *             properties:
 *               strMeal:
 *                 type: string
 *                 description: Il nome del piatto
 *                 example: "Hamburger Doppio Burger"
 *               prezzo:
 *                 type: number
 *                 description: Il prezzo del piatto in euro
 *                 example: 8.50
 *               strCategory:
 *                 type: string
 *                 description: La categoria del piatto (default "Generico")
 *                 example: "Carne"
 *               strArea:
 *                 type: string
 *                 description: L'origine geografica del piatto
 *                 example: "Americana"
 *               strInstructions:
 *                 type: string
 *                 description: Istruzioni per la preparazione
 *                 example: "Cuocere la carne sulla piastra, tostare il pane..."
 *               strMealThumb:
 *                 type: string
 *                 description: URL dell'immagine del piatto
 *                 example: "https://via.placeholder.com/150"
 *               ingredients:
 *                 type: array
 *                 description: Array degli ingredienti
 *                 items:
 *                   type: string
 *                 example: ["Pane", "Carne", "Cheddar"]
 *               measures:
 *                 type: array
 *                 description: Array delle quantità corrispondenti agli ingredienti
 *                 items:
 *                   type: string
 *                 example: ["1", "200g", "2 fette"]
 *               creatore:
 *                 type: string
 *                 description: L'ID del ristoratore che ha creato il piatto (default "System")
 *                 example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       201:
 *         description: Piatto creato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Piatto creato con successo!"
 *                 piatto:
 *                   type: object
 *                   description: L'oggetto completo del piatto appena salvato nel DB
 *       400:
 *         description: Campi obbligatori mancanti
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Nome del piatto e prezzo sono campi obbligatori."
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante la creazione del piatto"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.post('/', async (req, res) => {
    try {
        const { strMeal, prezzo, strCategory, strArea, strInstructions, strMealThumb, ingredients, measures, creatore } = req.body;

        if (!strMeal || prezzo === undefined) {
            return res.status(400).json({ message: "Nome del piatto e prezzo sono campi obbligatori." });
        }

        const idMeal = 'CUST-' + Date.now();

        const nuovoPiatto = new Meal({
            idMeal,
            strMeal,
            prezzo,
            strCategory: strCategory || "Generico",
            strArea,
            strInstructions,
            strMealThumb: strMealThumb || "https://via.placeholder.com/150",
            ingredients,
            measures,
            creatore: creatore || "System"
        });

        await nuovoPiatto.save();

        res.status(201).json({ message: 'Piatto creato con successo!', piatto: nuovoPiatto });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante la creazione del piatto', error: error.message });
    }
});

/**
 * @swagger
 * /api/meals/{id}:
 *   put:
 *     summary: Modifica i dettagli di un piatto
 *     description: Aggiorna tutte le informazioni di un piatto esistente tramite il suo idMeal, inclusa l'eventuale promozione a tempo.
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'identificativo personalizzato (idMeal) del piatto da modificare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               strMeal:
 *                 type: string
 *                 description: Il nome del piatto
 *                 example: "Lasagne al Pesto"
 *               prezzo:
 *                 type: number
 *                 description: Il prezzo base del piatto
 *                 example: 15.00
 *               strCategory:
 *                 type: string
 *                 description: La categoria del piatto
 *                 example: "Pasta"
 *               ingredients:
 *                 type: array
 *                 description: Array di ingredienti
 *                 items:
 *                   type: string
 *                 example: ["Pasta", "Pesto", "Besciamella"]
 *               strMealThumb:
 *                 type: string
 *                 description: URL dell'immagine del piatto
 *                 example: "https://example.com/lasagne.jpg"
 *               scontoPercentuale:
 *                 type: number
 *                 description: Percentuale di sconto (inserire 0 per rimuoverlo)
 *                 example: 20
 *               scontoScadenza:
 *                 type: string
 *                 format: date-time
 *                 description: Data e ora di scadenza della promozione in formato ISO
 *                 example: "2026-03-20T16:00:00.000Z"
 *     responses:
 *       200:
 *         description: Piatto aggiornato con successo e restituito nella risposta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Piatto non trovato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Piatto non trovato"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore interno del server"
 */
router.put('/:id', async (req, res) => {
    try {
        const {
            strMeal,
            prezzo,
            strCategory,
            ingredients,
            strMealThumb,
            scontoPercentuale,
            scontoScadenza
        } = req.body;

        const piattoAggiornato = await Meal.findOneAndUpdate(
            { idMeal: req.params.id },
            {
                strMeal: strMeal,
                prezzo: prezzo,
                strCategory: strCategory,
                ingredients: ingredients,
                strMealThumb: strMealThumb,
                scontoPercentuale: scontoPercentuale || 0,
                scontoScadenza: scontoScadenza ? new Date(scontoScadenza) : null
            },
            { new: true }
        );

        if (!piattoAggiornato) {
            return res.status(404).json({ message: "Piatto non trovato" });
        }

        res.json(piattoAggiornato);
    } catch (error) {
        console.error("Errore aggiornamento piatto:", error);
        res.status(500).json({ message: "Errore interno del server" });
    }
});

/**
 * @swagger
 * /api/meals/{id}:
 *   delete:
 *     summary: Elimina un piatto dal database
 *     description: Rimuove un piatto specifico cercandolo tramite il suo idMeal personalizzato o il suo _id nativo di MongoDB.
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'identificativo del piatto (idMeal o ObjectId)
 *     responses:
 *       200:
 *         description: Piatto eliminato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Piatto eliminato con successo
 *       404:
 *         description: Piatto non trovato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Piatto non trovato
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Errore interno del server
 */
router.delete('/:id', async (req, res) => {
    try {
        const idDaCercare = req.params.id;
        const queryDiRicerca = { $or: [{ idMeal: String(idDaCercare) }] };

        if (mongoose.isValidObjectId(idDaCercare)) {
            queryDiRicerca.$or.push({ _id: idDaCercare });
        }

        const piattoEliminato = await Meal.findOneAndDelete(queryDiRicerca);

        if (!piattoEliminato) {
            return res.status(404).json({ message: "Piatto non trovato" });
        }

        res.json({ message: "Piatto eliminato con successo" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Errore interno del server" });
    }
});

module.exports = router;