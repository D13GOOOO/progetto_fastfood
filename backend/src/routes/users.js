const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { autenticaToken } = require('../middlewares/auth');

function getJwtSecret() {
    return process.env.JWT_SECRET || 'cambia-questa-chiave-in-produzione';
}

function generaTokenUtente(utente) {
    return jwt.sign(
        {
            id: utente._id.toString(),
            nome: utente.nome,
            cognome: utente.cognome,
            email: utente.email,
            ruolo: utente.ruolo,
            preferenze: utente.preferenze || []
        },
        getJwtSecret(),
        { expiresIn: '7d' }
    );
}

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     description: Crea un nuovo account nel sistema. Effettua la validazione dei campi obbligatori e controlla che l'email non sia già presente nel database prima di procedere al salvataggio. La password viene automaticamente hashata tramite bcrypt prima del salvataggio.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cognome
 *               - email
 *               - password
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Il nome dell'utente
 *                 example: "Luca"
 *               cognome:
 *                 type: string
 *                 description: Il cognome dell'utente
 *                 example: "Bianchi"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: L'indirizzo email univoco
 *                 example: "luca.bianchi@email.com"
 *               password:
 *                 type: string
 *                 description: La password per l'accesso (verrà salvata criptata)
 *                 example: "SuperSicura123!"
 *               ruolo:
 *                 type: string
 *                 description: Il ruolo dell'utente (Default "cliente")
 *                 example: "cliente"
 *               metodoPagamento:
 *                 type: object
 *                 description: Informazioni sul metodo di pagamento predefinito
 *                 properties:
 *                   tipo:
 *                     type: string
 *                     enum: ['Carta di Credito', 'Prepagata', 'Contanti']
 *                     example: "Contanti"
 *               preferenze:
 *                 type: array
 *                 description: Array di preferenze alimentari o tag (opzionale)
 *                 items:
 *                   type: string
 *                 example: ["Vegetariano", "Senza glutine"]
 *     responses:
 *       201:
 *         description: Utente creato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utente registrato con successo!"
 *                 utente:
 *                   type: object
 *                   description: L'oggetto completo del nuovo utente appena salvato
 *       400:
 *         description: Dati non validi o email già esistente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email già registrata."
 *       500:
 *         description: Errore interno del server durante la registrazione
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante la registrazione"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.post('/register', async (req, res) => {
    try {
        const { nome, cognome, email, password, ruolo, preferenze, metodoPagamento } = req.body;

        if (!nome || !cognome || !email || !password) {
            return res.status(400).json({ message: 'Compilare tutti i campi obbligatori.' });
        }

        const utenteEsistente = await User.findOne({ email });
        if (utenteEsistente) {
            return res.status(400).json({ message: 'Email già registrata.' });
        }

        const ruoloSicuro = ruolo ? ruolo.toLowerCase() : 'cliente';

        let pagamentoSicuro = { tipo: 'Contanti' };
        if (metodoPagamento && metodoPagamento.tipo) {
            pagamentoSicuro.tipo = metodoPagamento.tipo;
        }

        let preferenzeSicure = [];
        if (Array.isArray(preferenze)) {
            preferenzeSicure = preferenze;
        } else if (typeof preferenze === 'string' && preferenze.trim() !== '') {
            preferenzeSicure = preferenze.split(',').map(p => p.trim());
        }

        const nuovoUtente = new User({
            nome,
            cognome,
            email,
            password, 
            ruolo: ruoloSicuro,
            metodoPagamento: pagamentoSicuro, 
            preferenze: preferenzeSicure,
        });

        await nuovoUtente.save();
        res.status(201).json({ message: 'Utente registrato con successo!', utente: nuovoUtente });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante la registrazione', error: error.message });
    }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Effettua il login di un utente
 *     description: Autentica un utente (cliente o ristoratore) nel sistema verificando le credenziali (email e password) utilizzando un confronto crittografico sicuro (bcrypt). In caso di successo, restituisce le informazioni essenziali del profilo.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: L'indirizzo email dell'utente
 *                 example: "mario.rossi@email.com"
 *               password:
 *                 type: string
 *                 description: La password dell'account
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login completato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login effettuato con successo!"
 *                 utente:
 *                   type: object
 *                   description: I dati essenziali dell'utente loggato
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "60d0fe4f5311236168a109cb"
 *                     nome:
 *                       type: string
 *                       example: "Mario"
 *                     cognome:
 *                       type: string
 *                       example: "Rossi"
 *                     email:
 *                       type: string
 *                       example: "mario.rossi@email.com"
 *                     ruolo:
 *                       type: string
 *                       description: Ruolo dell'utente (es. cliente o ristoratore)
 *                       example: "cliente"
 *       400:
 *         description: Dati mancanti nella richiesta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email e password sono obbligatorie."
 *       401:
 *         description: Credenziali non valide (email non trovata o password errata)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email o password non validi"
 *       500:
 *         description: Errore interno del server durante il processo di login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore durante il login"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e password sono obbligatorie.' });
        }

        const utente = await User.findOne({ email });
        
        if (!utente) {
            return res.status(401).json({ message: 'Email o password non validi' });
        }

        const passwordCorretta = await utente.comparaPassword(password);
        
        if (!passwordCorretta) {
            return res.status(401).json({ message: 'Email o password non validi' });
        }

        const token = generaTokenUtente(utente);

        res.status(200).json({
            message: 'Login effettuato con successo!',
            token,
            utente: {
                id: utente._id,
                nome: utente.nome,
                cognome: utente.cognome,
                email: utente.email,
                ruolo: utente.ruolo,
                preferenze: utente.preferenze
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante il login', error: error.message });
    }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Recupera l'elenco degli utenti registrati
 *     description: Restituisce tutti gli utenti registrati nel sistema senza includere la password. Se viene passato il parametro di query ruolo, filtra il risultato per clienti o ristoratori.
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: ruolo
 *         required: false
 *         schema:
 *           type: string
 *           enum: [cliente, ristoratore]
 *         description: Filtra gli utenti per tipologia.
 *     responses:
 *       200:
 *         description: Lista degli utenti recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "60d0fe4f5311236168a109cb"
 *                   nome:
 *                     type: string
 *                     example: "Mario"
 *                   cognome:
 *                     type: string
 *                     example: "Rossi"
 *                   email:
 *                     type: string
 *                     example: "mario.rossi@email.com"
 *                   ruolo:
 *                     type: string
 *                     example: "cliente"
 *       400:
 *         description: Ruolo richiesto non valido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ruolo non valido."
 *       500:
 *         description: Errore interno del server durante il recupero della lista
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero utenti"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.get('/', autenticaToken, async (req, res) => {
    try {
        if (req.user.ruolo === 'cliente') {
            return res.status(403).json({ message: 'Accesso negato. Non sei autorizzato a visualizzare la lista utenti.' });
        }

        const { ruolo } = req.query;
        const filtro = {};

        if (ruolo) {
            const ruoloNormalizzato = String(ruolo).toLowerCase();
            const ruoliValidi = ['cliente', 'ristoratore'];

            if (!ruoliValidi.includes(ruoloNormalizzato)) {
                return res.status(400).json({ message: 'Ruolo non valido.' });
            }

            filtro.ruolo = ruoloNormalizzato;
        }

        const utenti = await User.find(filtro)
            .select('-password')
            .sort({ ruolo: 1, nome: 1, cognome: 1, email: 1 });

        res.status(200).json(utenti);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero utenti', error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Recupera i dati di un singolo utente
 *     description: Restituisce le informazioni del profilo di un utente (cliente o ristoratore) cercandolo tramite il suo ID nativo di MongoDB. Per motivi di sicurezza, il campo della password viene omesso dalla risposta.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) dell'utente da recuperare
 *     responses:
 *       200:
 *         description: Dati dell'utente recuperati con successo (password esclusa)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID univoco dell'utente
 *                   example: "60d0fe4f5311236168a109cb"
 *                 nome:
 *                   type: string
 *                   example: "Mario"
 *                 cognome:
 *                   type: string
 *                   example: "Rossi"
 *                 email:
 *                   type: string
 *                   example: "mario.rossi@email.com"
 *                 ruolo:
 *                   type: string
 *                   description: Il ruolo dell'utente nel sistema (es. cliente o ristoratore)
 *                   example: "cliente"
 *       404:
 *         description: Utente non trovato nel database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utente non trovato"
 *       500:
 *         description: Errore interno del server durante la lettura dei dati
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore nel recupero dati"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.get('/:id', autenticaToken, async (req, res) => {
    try {
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ message: 'Accesso negato. Non puoi visualizzare il profilo di un altro utente.' });
        }

        const utente = await User.findById(req.params.id).select('-password');
        if (!utente) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }
        res.status(200).json(utente);
    } catch (error) {
        res.status(500).json({ message: 'Errore nel recupero dati', error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Aggiorna il profilo di un utente
 *     description: Modifica i dati di un account utente esistente (cliente o ristoratore) passando l'ID e i campi da aggiornare nel corpo della richiesta. NOTA se si invia la password, questa verrà hashata tramite il middleware di Mongoose.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) dell'utente da modificare
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Il nuovo nome dell'utente
 *                 example: "Luigi"
 *               cognome:
 *                 type: string
 *                 description: Il nuovo cognome dell'utente
 *                 example: "Verdi"
 *               email:
 *                 type: string
 *                 description: Il nuovo indirizzo email
 *                 example: "luigi.verdi@email.com"
 *               indirizzo:
 *                 type: string
 *                 description: L'indirizzo di fatturazione o consegna
 *                 example: "Via Roma 1, Milano"
 *               telefono:
 *                 type: string
 *                 description: Il nuovo numero di telefono
 *                 example: "3331234567"
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profilo aggiornato!"
 *                 utente:
 *                   type: object
 *                   description: L'oggetto completo dell'utente con i nuovi dati salvati
 *       404:
 *         description: L'utente specificato non è stato trovato nel database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utente non trovato"
 *       500:
 *         description: Errore interno del server durante la fase di aggiornamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore aggiornamento"
 *                 error:
 *                   type: string
 *                   description: Messaggio di errore tecnico fornito da Mongoose
 */
router.put('/:id', autenticaToken, async (req, res) => {
    try {
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ message: 'Non puoi modificare il profilo di un altro utente.' });
        }

        const utente = await User.findById(req.params.id);
        
        if (!utente) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        const campiAggiornabili = ['nome', 'cognome', 'email', 'password', 'metodoPagamento', 'preferenze', 'indirizzo'];
        
        campiAggiornabili.forEach(campo => {
            if (req.body[campo] !== undefined) {
                utente[campo] = req.body[campo];
            }
        });

        const utenteAggiornato = await utente.save();
        const tokenAggiornato = generaTokenUtente(utenteAggiornato);

        res.status(200).json({
            message: 'Profilo aggiornato!',
            token: tokenAggiornato,
            utente: {
                id: utenteAggiornato._id,
                nome: utenteAggiornato.nome,
                cognome: utenteAggiornato.cognome,
                email: utenteAggiornato.email,
                ruolo: utenteAggiornato.ruolo, 
                preferenze: utenteAggiornato.preferenze
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Errore aggiornamento', error: error.message });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina un account utente
 *     description: Rimuove definitivamente un utente (cliente o ristoratore) dal database tramite il suo ID nativo di MongoDB.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'ID (ObjectId) dell'utente da eliminare
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
 *                   example: "Account rimosso con successo"
 *       404:
 *         description: Utente non trovato nel sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utente non trovato"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Errore rimozione"
 *                 error:
 *                   type: string
 *                   description: Dettaglio tecnico dell'errore
 */
router.delete('/:id', autenticaToken, async (req, res) => {
    try {
        if (String(req.user.id) !== String(req.params.id)) {
            return res.status(403).json({ message: 'Non puoi eliminare il profilo di un altro utente.' });
        }

        const utenteRimosso = await User.findByIdAndDelete(req.params.id);
        if (!utenteRimosso) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }
        res.status(200).json({ message: 'Account rimosso con successo' });
    } catch (error) {
        res.status(500).json({ message: 'Errore rimozione', error: error.message });
    }
});

module.exports = router;