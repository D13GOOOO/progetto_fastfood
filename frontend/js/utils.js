export const API_URL = '/api';

// Calcola il prezzo finale applicando l'eventuale sconto, verificando prima la data di scadenza.
export function calcolaPrezzoReale(piatto) {
    let prezzo = piatto.prezzo || 0;
    if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
        if (new Date(piatto.scontoScadenza) > new Date()) {
            prezzo = prezzo - (prezzo * (piatto.scontoPercentuale / 100));
        }
    }
    return prezzo;
}

// Converte i caratteri speciali in entità HTML per prevenire vulnerabilità di tipo XSS.
export function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

// Crea e mostra dinamicamente un messaggio di notifica (toast) a comparsa, con dismissione automatica.
export function mostraNotifica(messaggio, tipo = 'error') {
    let container = document.getElementById('toast-container-custom');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-custom';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const classeColore = tipo === 'success' ? 'toast-success' : 'toast-error';
    const classeIcona = tipo === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';

    toast.className = `toast-custom ${classeColore}`;
    toast.innerHTML = `
        <i class="bi ${classeIcona}"></i>
        <p class="testo">${escapeHTML(messaggio)}</p>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 6000);
}

// Restituisce una Promise che apre un modale di conferma personalizzato, utile per prevenire azioni accidentali da parte dell'utente.
export function mostraConferma(titolo, messaggio, testoConferma = "Sì, procedi") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        
        const box = document.createElement('div');
        box.className = 'custom-confirm-box';
        
        box.innerHTML = `
            <div class="custom-confirm-icon">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h4 class="fw-bold text-dark mb-2">${escapeHTML(titolo)}</h4>
            <p class="text-muted small mb-4">${escapeHTML(messaggio)}</p>
            <div class="d-flex gap-3 w-100">
                <button class="btn btn-light fw-bold w-50 rounded-pill text-muted btn-annulla">Annulla</button>
                <button class="btn btn-danger fw-bold w-50 rounded-pill btn-conferma">${escapeHTML(testoConferma)}</button>
            </div>
        `;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            box.classList.add('show');
        });

        const chiudi = (esito) => {
            overlay.classList.remove('show');
            box.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
                resolve(esito); 
            }, 300);
        };

        box.querySelector('.btn-annulla').addEventListener('click', () => chiudi(false));
        box.querySelector('.btn-conferma').addEventListener('click', () => chiudi(true));
    });
}