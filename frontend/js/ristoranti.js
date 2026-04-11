/* global API_URL, escapeHTML, mostraNotifica */

let ristorantiOriginali = [];

document.addEventListener('DOMContentLoaded', () => {
    caricaRistoranti().catch(console.error);

    const formRicerca = document.getElementById('form-ricerca-ristoranti');
    if (formRicerca) {
        formRicerca.addEventListener('submit', applicaFiltriRistoranti);
    }
});

async function caricaRistoranti() {
    try {
        const response = await fetch(`${API_URL}/restaurants`);

        if (!response.ok) throw new Error("Errore nel recupero dei ristoranti");

        ristorantiOriginali = await response.json();

        renderizzaRistoranti(ristorantiOriginali);
    } catch (error) {
        console.error("Errore nel recupero ristoranti:", error);
        
        // NUOVO POPUP DI ERRORE!
        if (typeof mostraNotifica === 'function') {
            mostraNotifica("Impossibile caricare i ristoranti. Riprova più tardi.", "error");
        }

        const contenitore = document.getElementById('ristoranti-container');
        if (contenitore) {
            contenitore.innerHTML = '<div class="col-12"><p class="text-danger text-center w-100 py-5 fw-bold">Errore di connessione al server.</p></div>';
        }
    }
}

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