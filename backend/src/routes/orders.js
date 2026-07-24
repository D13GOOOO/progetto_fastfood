const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { controllaRuoloRistoratore, autenticaToken } = require('../middlewares/auth');

/**
 * @swagger
 * /api/orders/stats/{ristoratoreId}:
 *   get:
 *     summary: Calcola le statistiche aggregate per un ristorante
 *     description: Restituisce il totale incassi, gli ordini totali, gli ordini pendenti e il piatto più venduto usando l'aggregazione di MongoDB.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: ristoratoreId
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID del ristoratore
 *     responses:
 *       200:
 *         description: Statistiche calcolate con successo
 *       500:
 *         description: Errore del server
 */
router.get('/stats/:ristoratoreId', controllaRuoloRistoratore, async (req, res) => {
    try {
        const ristoId = req.params.ristoratoreId;

        if (String(req.user.id) !== String(ristoId)) {
            return res.status(403).json({ message: 'Non puoi consultare le statistiche di un altro ristorante.' });
        }

        const statsBase = await Order.aggregate([
            { $match: { ristoratoreId: ristoId } },
            {
                $group: {
                    _id: null,
                    totaleIncassi: { $sum: "$prezzoTotale" },
                    ordiniTotali: { $sum: 1 },
                    ordiniPendenti: {
                        $sum: { $cond: [{ $ne: ["$stato", "Consegnato"] }, 1, 0] }
                    }
                }
            }
        ]);

        const piattoTopAgg = await Order.aggregate([
            { $match: { ristoratoreId: ristoId } },
            { $unwind: "$piatti" },
            {
                $group: {
                    _id: "$piatti.nomePiatto",
                    totaleVenduti: { $sum: "$piatti.quantita" }
                }
            },
            { $sort: { totaleVenduti: -1 } },
            { $limit: 1 }
        ]);

        const risultato = {
            incassi: statsBase.length > 0 ? statsBase[0].totaleIncassi : 0,
            totali: statsBase.length > 0 ? statsBase[0].ordiniTotali : 0,
            pendenti: statsBase.length > 0 ? statsBase[0].ordiniPendenti : 0,
            piattoTop: piattoTopAgg.length > 0 ? piattoTopAgg[0]._id : "Nessun dato"
        };

        res.status(200).json(risultato);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel calcolo delle statistiche', error: error.message });
    }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Invia un nuovo ordine
 *     description: Crea un nuovo ordine nel database. Calcola automaticamente il tempo di attesa stimato in base agli ordini attualmente "Ordinato" o "In preparazione" per quello specifico ristoratore.
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
 *                 description: Stato iniziale dell'ordine (Default "Ordinato")
 *                 example: "Ordinato"
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
router.post('/', autenticaToken, async (req, res) => {
    try {
        if (req.user.ruolo !== 'cliente') {
            return res.status(403).json({ message: 'Solo i clienti possono inviare ordini.' });
        }

        const { piatti, totale, stato, ristoratoreId } = req.body;
        const utenteId = req.user.id;

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
            stato: { $in: ['Ordinato', 'In preparazione'] }
        });

        const tempoAttesaStimato = 10 + (ordiniInCoda * 5);

        const nuovoOrdine = new Order({
            utente: utenteId,
            piatti: piattiFormattati,
            prezzoTotale: totale,
            stato: stato || 'Ordinato',
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
 *                     example: "Ordinato"
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
router.get('/', autenticaToken, async (req, res) => {
    try {
        const { ristoratoreId } = req.query;
        let filtro = {};

        if (req.user.ruolo === 'cliente') {
            filtro = { utente: req.user.id };
        } else if (req.user.ruolo === 'ristoratore') {
            const idRichiesto = ristoratoreId || req.user.id;
            if (String(idRichiesto) !== String(req.user.id)) {
                return res.status(403).json({ message: 'Non puoi consultare gli ordini di un altro ristorante.' });
            }
            filtro = { ristoratoreId: idRichiesto };
        } else {
            return res.status(403).json({ message: 'Ruolo non autorizzato.' });
        }

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
 *     description: Permette al ristoratore di far avanzare lo stato dell'ordine.
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
 *                 enum: ['Ordinato', 'In preparazione', 'Consegnato']
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
 *                   example: "Stato dell'ordine aggiornato con successo!"
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
 *                   example: "Stato dell'ordine non valido."
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
 *                   example: "Errore nell'aggiornamento dello stato"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.put('/:id/status', controllaRuoloRistoratore, async (req, res) => {
    try {
        const { stato } = req.body;
        const statiValidi = ['Ordinato', 'In preparazione', 'Consegnato'];

        if (!statiValidi.includes(stato)) {
            return res.status(400).json({ message: 'Stato dell\'ordine non valido.' });
        }

        const ordineEsistente = await Order.findById(req.params.id);
        if (!ordineEsistente) {
            return res.status(404).json({ message: 'Ordine non trovato.' });
        }

        if (String(ordineEsistente.ristoratoreId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Non puoi aggiornare l\'ordine di un altro ristorante.' });
        }

        const ordineAggiornato = await Order.findByIdAndUpdate(
            req.params.id,
            { stato: stato },
            { new: true }
        );

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

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Recupera un singolo ordine tramite ID
 *     description: Restituisce i dettagli di un ordine specifico cercandolo tramite il suo ID nativo di MongoDB. Popola automaticamente i dati del cliente associato.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) dell'ordine da recuperare
 *     responses:
 *       200:
 *         description: Ordine recuperato con successo
 *       404:
 *         description: Ordine non trovato
 *       500:
 *         description: Errore interno del server
 */
router.get('/:id', autenticaToken, async (req, res) => {
    try {
        const ordine = await Order.findById(req.params.id).populate('utente', 'nome cognome email');
        
        if (!ordine) {
            return res.status(404).json({ message: 'Ordine non trovato' });
        }

        const isOwnerCliente = req.user.ruolo === 'cliente' && String(ordine.utente._id) === String(req.user.id);
        const isOwnerRistoratore = req.user.ruolo === 'ristoratore' && String(ordine.ristoratoreId) === String(req.user.id);

        if (!isOwnerCliente && !isOwnerRistoratore) {
            return res.status(403).json({ message: 'Accesso negato. Non sei autorizzato a visualizzare questo ordine.' });
        }
        
        res.status(200).json(ordine);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dell\'ordine', error: error.message });
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Elimina un ordine
 *     description: Rimuove definitivamente un ordine dal database tramite il suo ID (ObjectId). Utile per annullare ordini errati o pulire lo storico.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID dell'ordine da eliminare
 *     responses:
 *       200:
 *         description: Eliminazione completata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ordine eliminato con successo"
 *       404:
 *         description: Ordine non trovato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ordine non trovato"
 *       500:
 *         description: Errore interno del server
 */
router.delete('/:id', controllaRuoloRistoratore, async (req, res) => {
    try {
        // 1. Cerco l'ordine senza eliminarlo
        const ordineDaEliminare = await Order.findById(req.params.id);
        
        if (!ordineDaEliminare) {
            return res.status(404).json({ message: 'Ordine non trovato' });
        }

        if (String(ordineDaEliminare.ristoratoreId) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Non puoi eliminare gli ordini di un altro ristorante.' });
        }

        await Order.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Ordine eliminato con successo' });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'eliminazione', error: error.message });
    }
});

module.exports = router;