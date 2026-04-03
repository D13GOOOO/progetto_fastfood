const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Invia un nuovo ordine
 *     description: Crea un nuovo ordine nel database. Calcola automaticamente il tempo di attesa stimato in base agli ordini attualmente "In attesa" o "In preparazione" per quello specifico ristoratore.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - utenteId
 *               - piatti
 *               - totale
 *             properties:
 *               utenteId:
 *                 type: string
 *                 description: ID (ObjectId) dell'utente che effettua l'ordine
 *                 example: "60d0fe4f5311236168a109cb"
 *               piatti:
 *                 type: array
 *                 description: Array degli elementi inseriti nel carrello
 *                 items:
 *                   type: object
 *                   properties:
 *                     nome:
 *                       type: string
 *                       example: "Lasagne al Pesto"
 *                     prezzo:
 *                       type: number
 *                       example: 15.00
 *               totale:
 *                 type: number
 *                 description: Prezzo totale dell'ordine
 *                 example: 30.00
 *               stato:
 *                 type: string
 *                 description: Stato iniziale dell'ordine (Default "In preparazione")
 *                 example: "In preparazione"
 *               ristoratoreId:
 *                 type: string
 *                 description: ID del ristoratore a cui è indirizzato l'ordine (Default "System")
 *                 example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       201:
 *         description: Ordine creato e salvato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ordine inviato!"
 *                 ordine:
 *                   type: object
 *                   description: L'oggetto dell'ordine appena creato, comprensivo di tempoAttesa stimato
 *       400:
 *         description: Dati mancanti o formattati in modo errato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dati dell'ordine incompleti o non validi."
 *       500:
 *         description: Errore interno del server durante il salvataggio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante l'invio"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.post('/', async (req, res) => {
    try {
        const { utenteId, piatti, totale, stato, ristoratoreId } = req.body;

        if (!utenteId || !Array.isArray(piatti) || piatti.length === 0 || totale === undefined) {
            return res.status(400).json({ message: "Dati dell'ordine incompleti o non validi." });
        }

        const piattiFormattati = piatti.map(p => ({
            nomePiatto: p.nome,
            prezzo: p.prezzo,
            quantita: 1
        }));

        const ristoId = ristoratoreId || 'System';

        const ordiniInCoda = await Order.countDocuments({
            ristoratoreId: ristoId,
            stato: { $in: ['In attesa', 'In preparazione'] }
        });

        const tempoAttesaStimato = 10 + (ordiniInCoda * 5);

        const nuovoOrdine = new Order({
            utente: utenteId,
            piatti: piattiFormattati,
            prezzoTotale: totale,
            stato: stato || 'In attesa',
            ristoratoreId: ristoId,
            tempoAttesa: tempoAttesaStimato
        });

        await nuovoOrdine.save();

        res.status(201).json({ message: 'Ordine inviato!', ordine: nuovoOrdine });
    } catch (error) {
        console.error("Errore salvataggio ordine:", error);
        res.status(500).json({ message: "Errore durante l'invio", error: error.message });
    }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Recupera la lista degli ordini
 *     description: Restituisce tutti gli ordini presenti a sistema. Se viene passato il parametro di query `ristoratoreId`, filtra i risultati restituendo solo gli ordini di quel ristorante. I dati del cliente (nome, cognome, email) vengono automaticamente popolati.
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: ristoratoreId
 *         required: false
 *         schema:
 *           type: string
 *         description: L'ID del ristoratore per filtrare gli ordini specifici del suo locale.
 *     responses:
 *       200:
 *         description: Lista degli ordini recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: ID univoco (ObjectId) dell'ordine
 *                     example: "60d0fe4f5311236168a109cc"
 *                   ristoratoreId:
 *                     type: string
 *                     description: ID del ristoratore a cui è stato fatto l'ordine
 *                     example: "60d0fe4f5311236168a109ca"
 *                   utente:
 *                     type: object
 *                     description: Dati del cliente popolati tramite referenza
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "60d0fe4f5311236168a109cb"
 *                       nome:
 *                         type: string
 *                         example: "Mario"
 *                       cognome:
 *                         type: string
 *                         example: "Rossi"
 *                       email:
 *                         type: string
 *                         example: "mario.rossi@email.com"
 *                   stato:
 *                     type: string
 *                     description: Stato attuale dell'ordine
 *                     example: "In attesa"
 *                   prezzoTotale:
 *                     type: number
 *                     description: Costo totale dell'ordine
 *                     example: 25.50
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero degli ordini"
 *                 error:
 *                   type: string
 *                   description: Messaggio di errore tecnico dal database
 */
router.get('/', async (req, res) => {
    try {
        const { ristoratoreId } = req.query;
        const filtro = ristoratoreId ? { ristoratoreId: ristoratoreId } : {};

        const ordini = await Order.find(filtro).populate('utente', 'nome cognome email');
        res.status(200).json(ordini);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero degli ordini', error: error.message });
    }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Aggiorna lo stato di consegna di un ordine
 *     description: Permette al ristoratore o al cliente di far avanzare lo stato dell'ordine (es. da "In preparazione" a "In consegna").
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId di MongoDB) dell'ordine da aggiornare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stato
 *             properties:
 *               stato:
 *                 type: string
 *                 enum: ['In attesa', 'In preparazione', 'In consegna', 'Consegnato']
 *                 description: Il nuovo stato dell'ordine
 *                 example: "In preparazione"
 *     responses:
 *       200:
 *         description: Stato dell'ordine aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stato della consegna aggiornato con successo!"
 *                 ordine:
 *                   type: object
 *                   description: L'oggetto dell'ordine aggiornato
 *       400:
 *         description: Stato fornito non valido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stato della consegna non valido."
 *       404:
 *         description: Ordine non trovato nel database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ordine non trovato."
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nell'aggiornamento della consegna"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { stato } = req.body;
        const statiValidi = ['In attesa', 'In preparazione', 'Consegnato'];

        if (!statiValidi.includes(stato)) {
            return res.status(400).json({ message: 'Stato dell\'ordine non valido.' });
        }

        const ordineAggiornato = await Order.findByIdAndUpdate(
            req.params.id,
            { stato: stato },
            { new: true }
        );

        if (!ordineAggiornato) {
            return res.status(404).json({ message: 'Ordine non trovato.' });
        }

        res.status(200).json({
            message: 'Stato dell\'ordine aggiornato con successo!',
            ordine: ordineAggiornato
        });
    } catch (error) {
        res.status(500).json({
            message: "Errore nell'aggiornamento dello stato",
            error: error.message
        });
    }
});

module.exports = router;