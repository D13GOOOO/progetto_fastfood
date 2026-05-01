import { escapeHTML, mostraNotifica } from './utils.js';

// Rimuove i dati di sessione e ricarica la pagina per effettuare il logout.
export function esci() {
    localStorage.removeItem('utenteLoggato');
    window.location.reload();
}

// Verifica la presenza di un utente loggato nel localStorage e genera il menu laterale appropriato in base al suo ruolo.
export function controllaLogin() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    const areaUtente = document.getElementById('area-utente');

    if (utenteSalvato && areaUtente) {
        const dati = JSON.parse(utenteSalvato);
        const iniziale = escapeHTML(dati.utente.nome).charAt(0).toUpperCase();

        areaUtente.innerHTML = `
            <a class="text-white text-decoration-none fw-medium d-flex align-items-center gap-2" href="#" data-bs-toggle="offcanvas" data-bs-target="#offcanvasUtente" aria-controls="offcanvasUtente">
                <div class="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 35px; height: 35px; font-size: 1rem;">
                    ${iniziale}
                </div>
                <span class="d-none d-sm-inline">Ciao, ${escapeHTML(dati.utente.nome)}</span>
            </a>
        `;

        let offcanvasElement = document.getElementById('offcanvasUtente');
        if (!offcanvasElement) {
            offcanvasElement = document.createElement('div');
            offcanvasElement.id = 'offcanvasUtente';
            offcanvasElement.className = 'offcanvas offcanvas-end shadow-lg border-0';
            offcanvasElement.setAttribute('tabindex', '-1');
            offcanvasElement.style.zIndex = '10500';
            
            document.body.appendChild(offcanvasElement);
        }

        let linkAreaPrivata = `<a href="ordini.html" class="list-group-item list-group-item-action border-0 py-3 px-4 d-flex align-items-center gap-3"><i class="bi bi-box-seam fs-5 text-muted"></i> <span class="fw-medium">I miei ordini</span></a>`;
        if (dati.utente.ruolo === 'ristoratore') {
            linkAreaPrivata = `<a href="dashboard.html" class="list-group-item list-group-item-action border-0 py-3 px-4 d-flex align-items-center gap-3"><i class="bi bi-graph-up fs-5 text-muted"></i> <span class="fw-medium">Area Ristoratore</span></a>`;
        }
        const linkProfilo = `<a href="profilo.html" class="list-group-item list-group-item-action border-0 py-3 px-4 d-flex align-items-center gap-3"><i class="bi bi-person fs-5 text-muted"></i> <span class="fw-medium">Il mio Profilo</span></a>`;

        const ruoloTesto = dati.utente.ruolo === 'ristoratore' ? 'Ristoratore' : 'Cliente';

        offcanvasElement.innerHTML = `
            <div class="offcanvas-header border-bottom py-3">
                <h6 class="offcanvas-title fw-bold text-uppercase tracking-wide text-muted" style="letter-spacing: 1px; font-size: 0.8rem;">Il tuo Account</h6>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            
            <div class="offcanvas-body d-flex flex-column p-0">
                <div class="p-4 bg-light text-center border-bottom d-flex flex-column align-items-center">
                    <div class="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm mb-3" style="width: 80px; height: 80px; font-size: 2.5rem;">
                        ${iniziale}
                    </div>
                    <h4 class="fw-bold mb-2 text-dark">${escapeHTML(dati.utente.nome)}</h4>
                    <span class="badge bg-secondary rounded-pill px-3 py-2 fw-normal">${ruoloTesto}</span>
                </div>

                <div class="list-group list-group-flush mt-2">
                    ${linkProfilo}
                    ${linkAreaPrivata}
                </div>

                <div class="mt-auto p-4 border-top">
                    <button id="btn-logout" class="btn btn-outline-danger w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-4" style="transition: all 0.2s;">
                        <i class="bi bi-box-arrow-right fs-5"></i> Disconnettiti
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btn-logout').addEventListener('click', esci);
    }
}

// Analizza i dati di sessione (localStorage) per impedire l'accesso alla dashboard agli utenti privi dei privilegi di ruolo 'ristoratore'.
export function controllaAccessoRistoratore() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        window.location.href = 'login.html';
        return;
    }

    const dati = JSON.parse(utenteSalvato);
    if (dati.utente.ruolo !== 'ristoratore') {
        mostraNotifica('Accesso negato. Questa area è riservata ai ristoratori.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    const nomeRistoratore = document.getElementById('nome-ristoratore');
    if (nomeRistoratore) {
        nomeRistoratore.innerText = `Ciao, ${dati.utente.nome}`;
    }
}