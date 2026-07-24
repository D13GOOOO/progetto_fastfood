const jwt = require('jsonwebtoken');

function getJwtSecret() {
    if (!process.env.JWT_SECRET) {
        console.warn("ATTENZIONE: JWT_SECRET non definito in .env. Rischio di sicurezza.");
    }
    return process.env.JWT_SECRET || 'cambia-questa-chiave-in-produzione';
}

function estraiToken(req) {
    const headerAuth = req.headers.authorization || '';
    
    if (headerAuth.startsWith('Bearer ')) {
        return headerAuth.slice(7).trim();
    }

    return req.headers['x-access-token'] || null;
}

const autenticaToken = (req, res, next) => {
    const token = estraiToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Token non fornito.' });
    }

    try {
        req.user = jwt.verify(token, getJwtSecret());
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Token non valido o scaduto.' });
    }
};

const controllaRuoloRistoratore = (req, res, next) => {
    autenticaToken(req, res, () => {
        if (req.user?.ruolo !== 'ristoratore') {
            return res.status(403).json({
                message: 'Accesso Negato: Questa operazione è riservata ai ristoratori.'
            });
        }
        return next();
    });
};

module.exports = { autenticaToken, controllaRuoloRistoratore };