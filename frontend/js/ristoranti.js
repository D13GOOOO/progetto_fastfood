import { API_URL, escapeHTML, mostraNotifica } from './utils.js';

let ristorantiOriginali = [];

// Inizializza l'ambiente al caricamento della pagina: avvia il recupero asincrono dei dati dei ristoranti e associa l'event listener al form di ricerca locale.
document.addEventListener('DOMContentLoaded', () => {
    caricaRistoranti().catch(console.error);

    const formRicerca = document.getElementById('form-ricerca-ristoranti');
    if (formRicerca) {
        formRicerca.addEventListener('submit', applicaFiltriRistoranti);
    }
});

// Inietta una struttura DOM temporanea (skeleton loading) per preservare il layout a griglia e fornire un feedback visivo durante la latenza di rete.
function mostraSkeletonRistoranti() {
    const contenitore = document.getElementById('ristoranti-container');
    if (!contenitore) return;

    contenitore.innerHTML = Array(6).fill(`
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="skeleton-card h-100">
                <div class="skeleton-element" style="height: 120px; width: 100%;"></div>
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between mb-3">
                        <div class="skeleton-element skeleton-title w-75 m-0"></div>
                        <div class="skeleton-element" style="width: 60px; height: 20px; border-radius: 4px;"></div>
                    </div>
                    <div class="skeleton-element skeleton-text w-100 mt-2"></div>
                    <div class="skeleton-element skeleton-text w-50 mb-4"></div>
                    <div class="border-top pt-4 text-center">
                        <div class="skeleton-element skeleton-text mx-auto mb-3" style="width: 40%;"></div>
                        <div class="skeleton-element skeleton-btn w-100"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Esegue una richiesta GET all'API per estrarre l'elenco globale dei ristoranti, memorizza la risposta per le operazioni di filtraggio lato client e ne innesca il rendering.
async function caricaRistoranti() {

    mostraSkeletonRistoranti();

    try {
        const response = await fetch(`${API_URL}/restaurants`);

        if (!response.ok) throw new Error("Errore nel recupero dei ristoranti");

        ristorantiOriginali = await response.json();

        renderizzaRistoranti(ristorantiOriginali);
    } catch (error) {
        console.error("Errore nel recupero ristoranti:", error);
        
        if (typeof mostraNotifica === 'function') {
            mostraNotifica("Impossibile caricare i ristoranti. Riprova più tardi.", "error");
        }

        const contenitore = document.getElementById('ristoranti-container');
        if (contenitore) {
            contenitore.innerHTML = '<div class="col-12"><p class="text-danger text-center w-100 py-5 fw-bold">Errore di connessione al server.</p></div>';
        }
    }
}

// Itera l'array dei ristoranti fornito come parametro, genera dinamicamente l'HTML delle card elaborando i dati anagrafici e inietta il risultato nel contenitore DOM. Gestisce anche l'empty state.
function renderizzaRistoranti(ristoranti) {
    const contenitore = document.getElementById('ristoranti-container');
    if (!contenitore) return;

    if (ristoranti.length === 0) {
        contenitore.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-1 text-muted opacity-50 mb-3 d-block"></i>
                <p class="text-muted fw-medium m-0">Nessun ristorante trovato con questi criteri di ricerca.</p>
            </div>
        `;
        return;
    }

    contenitore.innerHTML = ristoranti.map(rist => {
        const nomeTitolare = rist.titolare && rist.titolare.nome
            ? `${rist.titolare.nome} ${rist.titolare.cognome}`
            : 'Partner Selezionato';

        const idTitolare = rist.titolare && rist.titolare._id ? rist.titolare._id : rist.titolare;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius: 16px; overflow: hidden;">
                    
                    <div class="bg-danger bg-opacity-10 p-4 d-flex align-items-center justify-content-center" style="height: 120px;">
                        <i class="bi bi-shop text-danger opacity-75" style="font-size: 3rem;"></i>
                    </div>

                    <div class="card-body d-flex flex-column p-4">
                        
                        <div class="d-flex justify-content-between align-items-start mb-3 gap-2">
                            <h4 class="card-title fw-bold text-dark m-0 lh-sm text-truncate" title="${escapeHTML(rist.nome)}">${escapeHTML(rist.nome)}</h4>
                            <span class="badge bg-light text-muted border px-2 py-1 flex-shrink-0" style="font-size: 0.65rem;">P.IVA: ${escapeHTML(rist.partitaIva)}</span>
                        </div>
                        
                        <ul class="list-unstyled text-muted small mb-4 mt-2">
                            <li class="d-flex align-items-start mb-2 gap-2">
                                <i class="bi bi-geo-alt-fill text-danger mt-1"></i>
                                <span>${escapeHTML(rist.indirizzo)}</span>
                            </li>
                            <li class="d-flex align-items-center gap-2">
                                <i class="bi bi-telephone-fill text-primary"></i>
                                <span>${escapeHTML(rist.telefono)}</span>
                            </li>
                        </ul>
                        
                        <div class="mt-auto border-top pt-4 text-center">
                            <p class="small text-muted mb-3"><i class="bi bi-person-badge me-1"></i> Gestione: <strong class="text-dark">${escapeHTML(nomeTitolare)}</strong></p>
                            <a href="index.html?ristoratore=${escapeHTML(String(idTitolare))}" class="btn btn-danger w-100 fw-bold rounded-pill shadow-sm py-2">
                                Esplora il Menu <i class="bi bi-arrow-right ms-1"></i>
                            </a>
                        </div>
                        
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Intercetta l'evento di submit del form di ricerca per applicare un filtro non case-sensitive sull'array in memoria, re-invocando il rendering grafico sul nuovo sottoinsieme.
function applicaFiltriRistoranti(e) {
    e.preventDefault();

    const inputNome = document.getElementById('filtro-nome-rest');
    const inputLuogo = document.getElementById('filtro-luogo');

    const nome = inputNome ? inputNome.value.toLowerCase() : '';
    const luogo = inputLuogo ? inputLuogo.value.toLowerCase() : '';

    const ristorantiFiltrati = ristorantiOriginali.filter(r => {
        const matchNome = String(r.nome || '').toLowerCase().includes(nome);
        const matchLuogo = String(r.indirizzo || '').toLowerCase().includes(luogo);

        return matchNome && matchLuogo;
    });

    renderizzaRistoranti(ristorantiFiltrati);
}