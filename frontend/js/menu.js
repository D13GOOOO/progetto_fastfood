import { API_URL, calcolaPrezzoReale, escapeHTML } from './utils.js';
import { getSessioneUtente } from './session.js';

export let menuOriginale = [];
export let ristorantiGlobali = [];

// Recupera i dati dal server e gestisce la visualizzazione del menu, filtrandolo se viene richiesto un ristoratore specifico.
export async function caricaMenu() {
    mostraSkeletonMenu();
    
    try {
        const [resPiatti, resRistoranti] = await Promise.all([
            fetch(`${API_URL}/meals`),
            fetch(`${API_URL}/restaurants`)
        ]);

        if (!resPiatti.ok || !resRistoranti.ok) {
            throw new Error("Errore nel caricamento dati dal server");
        }

        const piatti = await resPiatti.json();
        ristorantiGlobali = await resRistoranti.json();

        const urlParams = new URLSearchParams(window.location.search);
        const idRistoratore = urlParams.get('ristoratore');
        const heroTitle = document.getElementById('titolo-tutto-menu');

        if (idRistoratore) {
            // Contesto: Pagina Ristorante Singolo
            menuOriginale = piatti.filter(p => String(p.creatore) === String(idRistoratore));
            if(heroTitle) heroTitle.innerText = "Il nostro Menu Speciale";
        } else {
            // Contesto: Home Page (escludiamo i template del catalogo globale di "System")
            menuOriginale = piatti.filter(p => p.creatore && p.creatore !== 'System').reverse();
            if(heroTitle) heroTitle.innerText = "Tutto il Menu";
        }

        popolaCategorie(menuOriginale);
        renderizzaMenu(menuOriginale);
        
        // Passiamo l'array menuOriginale (già contestualizzato) al motore di raccomandazione
        await caricaPiattiConsigliati(menuOriginale);

    } catch (error) {
        console.error("Errore:", error);
        const contenitore = document.getElementById('menu-container');
        if (contenitore) {
            contenitore.innerHTML = '<p class="text-danger text-center w-100">Errore di connessione al server.</p>';
        }
    }
}

// Estrae le categorie univoche dai piatti disponibili e popola dinamicamente la tendina dei filtri.
function popolaCategorie(piatti) {
    const select = document.getElementById('filtro-categoria');
    if (!select) return;

    const categorie = [...new Set(piatti.map(p => String(p.strCategory)))].sort();

    categorie.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

// Genera e inserisce nel DOM le card HTML per ogni piatto, calcolando prezzi e sconti in tempo reale.
export function renderizzaMenu(piatti) {
    const contenitore = document.getElementById('menu-container');
    if (!contenitore) return;

    if (piatti.length === 0) {
        contenitore.innerHTML = '<p class="text-muted text-center w-100 my-5">Nessun piatto trovato in questo menu.</p>';
        return;
    }

    contenitore.innerHTML = piatti.map(piatto => {
        const prezzoScontato = calcolaPrezzoReale(piatto);
        
        let bloccoPrezzo = `<h4 class="fw-bold text-success m-0">${prezzoScontato.toFixed(2)} €</h4>`;
        let badgeSconto = '';

        if (prezzoScontato < (piatto.prezzo || 0)) {
            bloccoPrezzo = `
                <div class="d-flex flex-column">
                    <span class="text-muted text-decoration-line-through lh-1" style="font-size: 0.8rem;">${piatto.prezzo.toFixed(2)} €</span>
                    <h4 class="fw-bold text-danger m-0 lh-1 mt-1">${prezzoScontato.toFixed(2)} €</h4>
                </div>
            `;
            badgeSconto = `<span class="position-absolute top-0 start-0 badge bg-warning text-dark m-3 shadow-sm fs-6 rounded-pill">-${piatto.scontoPercentuale}%</span>`;
        }

        const ristorante = ristorantiGlobali.find(r =>
            String(r.titolare) === String(piatto.creatore) ||
            (r.titolare && String(r.titolare._id) === String(piatto.creatore))
        );
        const nomeRistorante = ristorante ? ristorante.nome : "Ristorante Partner";

        const badgeArea = piatto.strArea 
            ? `<span class="badge bg-light text-secondary border rounded-pill">#${escapeHTML(piatto.strArea.toLowerCase())}</span>` 
            : '';

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius: 16px; overflow: hidden;">
                    
                    <div class="position-relative">
                        ${badgeSconto}
                        <img src="${escapeHTML(piatto.strMealThumb)}" class="card-img-top" alt="${escapeHTML(piatto.strMeal)}" style="height: 220px; object-fit: cover; cursor: pointer;" onclick="mostraIstruzioni('${piatto.idMeal}')" title="Clicca per la ricetta">
                    </div>

                    <div class="card-body d-flex flex-column p-4">
                        
                        <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
                            <h5 class="card-title fw-bold m-0 lh-sm text-dark">${escapeHTML(piatto.strMeal)}</h5>
                            <a href="#" class="text-muted text-decoration-none flex-shrink-0" onclick="mostraIstruzioni('${piatto.idMeal}'); return false;" title="Leggi Ricetta">
                                <i class="bi bi-info-circle fs-5" style="transition: color 0.2s;" onmouseover="this.style.color='var(--accent-color)'" onmouseout="this.style.color=''"></i>
                            </a>
                        </div>
                        
                        <div class="d-flex flex-wrap gap-2 mb-3">
                            <span class="badge bg-danger rounded-pill">#${escapeHTML(piatto.strCategory.toLowerCase())}</span>
                            ${badgeArea}
                        </div>
                        
                        <div class="d-flex align-items-center text-muted mb-4" style="font-size: 0.9rem;">
                            <i class="bi bi-shop me-2 opacity-75"></i>
                            <span>da <strong class="text-dark">${escapeHTML(nomeRistorante)}</strong></span>
                        </div>

                        <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                            ${bloccoPrezzo}
                            <button class="btn btn-primary fw-bold rounded-pill shadow-sm px-4 btn-aggiungi-carrello" data-id="${piatto.idMeal}">
                                + Aggiungi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Costruisce e mostra un modale Bootstrap contenente la ricetta e le istruzioni del piatto selezionato.
export function mostraIstruzioni(id) {
    const piatto = menuOriginale.find(p => String(p.idMeal) === String(id));
    if (!piatto) return;
    
    let modalElement = document.getElementById('modalRicetta');
    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.id = 'modalRicetta';
        modalElement.className = 'modal fade';
        modalElement.setAttribute('tabindex', '-1');
        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
                    <div class="modal-header border-bottom-0 pb-0">
                        <h5 class="modal-title fw-bold fs-4" id="modalRicettaTitolo"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-2">
                        <p id="modalRicettaTesto" class="text-muted" style="white-space: pre-wrap; line-height: 1.7; font-size: 0.95rem;"></p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    }

    document.getElementById('modalRicettaTitolo').innerText = piatto.strMeal;
    document.getElementById('modalRicettaTesto').textContent = piatto.strInstructions;

    // global bootstrap
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Rende la funzione disponibile globalmente per poter essere chiamata dai tag "onclick" generati nell'HTML
window.mostraIstruzioni = mostraIstruzioni;

// Filtra l'array dei piatti in base ai criteri inseriti dall'utente e aggiorna la griglia visiva.
export function applicaFiltri(e) {
    e.preventDefault();

    const nome = document.getElementById('filtro-nome').value.toLowerCase();
    const categoria = document.getElementById('filtro-categoria').value;
    const prezzoMax = parseFloat(document.getElementById('filtro-prezzo').value);
    const ingrediente = document.getElementById('filtro-ingrediente').value.toLowerCase();

    const piattiFiltrati = menuOriginale.filter(p => {
        const matchNome = String(p.strMeal).toLowerCase().includes(nome);
        const matchCategoria = categoria === "" || p.strCategory === categoria;

        const prezzoAttuale = calcolaPrezzoReale(p);
        const matchPrezzo = isNaN(prezzoMax) || (prezzoAttuale <= prezzoMax);

        const matchIngrediente = ingrediente === "" || (Array.isArray(p.ingredients) && p.ingredients.some(ing =>
            ing && String(ing).toLowerCase().includes(ingrediente)
        ));

        return matchNome && matchCategoria && matchPrezzo && matchIngrediente;
    });

    renderizzaMenu(piattiFiltrati);
}

// Inserisce dei segnaposto animati (skeleton loader) nel DOM per migliorare la UX durante i tempi di risposta della rete.
export function mostraSkeletonMenu() {
    const contenitore = document.getElementById('menu-container');
    if (!contenitore) return;

    const skeletonHtml = Array(6).fill(`
        <div class="col-md-4 mb-4">
            <div class="skeleton-card h-100">
                <div class="skeleton-element skeleton-img"></div>
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between mb-3">
                        <div class="skeleton-element skeleton-title m-0"></div>
                        <div class="skeleton-element" style="width: 24px; height: 24px; border-radius: 50%;"></div>
                    </div>
                    <div class="d-flex gap-2 mb-3">
                        <div class="skeleton-element skeleton-badge"></div>
                        <div class="skeleton-element skeleton-badge"></div>
                    </div>
                    <div class="skeleton-element skeleton-text w-50 mb-4"></div>
                    <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                        <div class="skeleton-element skeleton-title w-25 m-0"></div>
                        <div class="skeleton-element skeleton-btn"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    contenitore.innerHTML = skeletonHtml;
}

// Motore di raccomandazione: filtra l'array di piatti fornito in input (Home Globale o Menu Singolo Ristorante)
export async function caricaPiattiConsigliati(piattiContestoCorrente) {
    const contenitoreConsigliati = document.getElementById('sezione-consigliati');
    const grigliaConsigliati = document.getElementById('griglia-consigliati');
    
    if (!contenitoreConsigliati || !grigliaConsigliati) return;

    // Se l'array del menu è vuoto (es. ristorante senza piatti), disattiviamo subito la vetrina
    if (!piattiContestoCorrente || piattiContestoCorrente.length === 0) {
        contenitoreConsigliati.classList.add('d-none');
        return;
    }

    const sessione = getSessioneUtente();
    if (!sessione) {
        contenitoreConsigliati.classList.add('d-none');
        return;
    }

    if (sessione.ruolo !== 'cliente') {
        contenitoreConsigliati.classList.add('d-none');
        return;
    }

    const preferenzeRaw = sessione.preferenze || [];
    const preferenzeArray = Array.isArray(preferenzeRaw) ? preferenzeRaw : preferenzeRaw.split(',').map(s => s.trim());
    
    contenitoreConsigliati.classList.remove('d-none');
    grigliaConsigliati.innerHTML = Array(4).fill(`
        <div class="col">
            <div class="skeleton-card h-100 border-0" style="border-radius: 16px; box-shadow: 0 6px 20px rgba(255, 193, 7, 0.2);">
                <div class="skeleton-element skeleton-img" style="height: 180px;"></div>
                <div class="card-body d-flex flex-column p-4">
                    <div class="skeleton-element skeleton-title w-75 mb-3"></div>
                    <div class="skeleton-element skeleton-badge w-50 mb-3"></div>
                    <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                        <div class="skeleton-element skeleton-title w-25 m-0"></div>
                        <div class="skeleton-element skeleton-btn" style="width: 100px; height: 38px; border-radius: 50rem;"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    try {
        // Usiamo l'array già filtrato invece di interrogare nuovamente il database!
        let piattiSuggeriti = piattiContestoCorrente.filter(piatto => {
            const matchPreferenza = preferenzeArray.some(pref => {
                if (!pref) return false;
                const term = pref.toLowerCase();
                
                const inCat = piatto.strCategory && piatto.strCategory.toLowerCase().includes(term);
                const inIngr = Array.isArray(piatto.ingredients) && piatto.ingredients.some(ing => ing && ing.toLowerCase().includes(term));
                
                return inCat || inIngr;
            });
            
            const prezzoScontato = calcolaPrezzoReale(piatto);
            const eInOfferta = prezzoScontato < (piatto.prezzo || 0);

            return matchPreferenza || eInOfferta;
        });

        piattiSuggeriti = piattiSuggeriti.sort(() => 0.5 - Math.random()).slice(0, 4);

        if (piattiSuggeriti.length > 0) {
            grigliaConsigliati.innerHTML = piattiSuggeriti.map(piatto => {
                const prezzoScontato = calcolaPrezzoReale(piatto);
                let badgeSconto = '';
                
                if (prezzoScontato < (piatto.prezzo || 0)) {
                    badgeSconto = `<span class="badge bg-warning text-dark m-3 position-absolute top-0 start-0 shadow-sm fs-6 rounded-pill">-${piatto.scontoPercentuale}%</span>`;
                }
                
                return `
                <div class="col">
                    <div class="card h-100 border-0" style="border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(255, 193, 7, 0.2);">
                        <div class="position-relative">
                            ${badgeSconto}
                            <img src="${escapeHTML(piatto.strMealThumb)}" class="card-img-top" style="height: 180px; object-fit: cover;" onerror="this.src='https://placehold.co/400x300?text=Nessuna+Foto'">
                        </div>
                        <div class="card-body d-flex flex-column p-4">
                            <h5 class="card-title fw-bold m-0 lh-sm text-dark mb-3 text-truncate" title="${escapeHTML(piatto.strMeal)}">${escapeHTML(piatto.strMeal)}</h5>
                            
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                <span class="badge bg-warning text-dark rounded-pill">#${escapeHTML(piatto.strCategory.toLowerCase())}</span>
                            </div>
                            
                            <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                                <h5 class="fw-bold text-success m-0">${prezzoScontato.toFixed(2)} €</h5>
                                <button class="btn btn-warning fw-bold rounded-pill shadow-sm px-3 py-2 btn-aggiungi-carrello" data-id="${escapeHTML(piatto.idMeal)}">
                                    <i class="bi bi-cart-plus"></i> Aggiungi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else {
            contenitoreConsigliati.classList.add('d-none');
            grigliaConsigliati.innerHTML = '';
        }
    } catch (error) {
        console.error("Errore nel rendering dei consigliati:", error);
        contenitoreConsigliati.classList.add('d-none');
        grigliaConsigliati.innerHTML = '';
    }
}