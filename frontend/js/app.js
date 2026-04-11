/* global bootstrap */

const API_URL = 'http://localhost:3000/api';

let menuOriginale = [];
let carrello = JSON.parse(localStorage.getItem('carrelloFastFood')) || [];
let ristorantiGlobali = [];

document.addEventListener('DOMContentLoaded', () => {
    aggiornaInterfacciaCarrello();
    caricaMenu().catch(console.error);
    controllaLogin();

    const formRicerca = document.getElementById('form-ricerca');
    if (formRicerca) {
        formRicerca.addEventListener('submit', applicaFiltri);
    }

    const btnPaga = document.getElementById('btn-paga');
    if (btnPaga) {
        btnPaga.addEventListener('click', inviaOrdine);
    }
    
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        menuContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-aggiungi-carrello')) {
                const id = e.target.getAttribute('data-id');
                aggiungiAlCarrello(id, e);
            }
        });
    }
});

function calcolaPrezzoReale(piatto) {
    let prezzo = piatto.prezzo || 0;
    if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
        if (new Date(piatto.scontoScadenza) > new Date()) {
            prezzo = prezzo - (prezzo * (piatto.scontoPercentuale / 100));
        }
    }
    return prezzo;
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

function controllaLogin() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    const areaUtente = document.getElementById('area-utente');

    if (utenteSalvato && areaUtente) {
        const dati = JSON.parse(utenteSalvato);

        let linkAreaPrivata = `<li><a class="dropdown-item py-2 custom-dropdown-item" href="ordini.html"><i class="bi bi-box-seam me-2 text-muted"></i>I miei ordini</a></li>`;
        if (dati.utente.ruolo === 'ristoratore') {
            linkAreaPrivata = `<li><a class="dropdown-item py-2 custom-dropdown-item" href="dashboard.html"><i class="bi bi-graph-up me-2 text-muted"></i>Area Ristoratore</a></li>`;
        }

        const linkProfilo = `<li><a class="dropdown-item py-2 custom-dropdown-item" href="profilo.html"><i class="bi bi-person me-2 text-muted"></i>Il mio Profilo</a></li>`;

        // FIX ALLINEAMENTO: Sostituito il toggle standard con un flexbox personalizzato e aggiunto offset al menu
        areaUtente.innerHTML = `
            <div class="dropdown">
                <a class="text-white text-decoration-none fw-medium d-flex align-items-center gap-1" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <span>Ciao, ${escapeHTML(dati.utente.nome)}</span>
                    <i class="bi bi-chevron-down ms-1" style="font-size: 0.75rem; padding-top: 2px;"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style="border-radius: 16px; min-width: 220px; margin-top: 14px !important;">
                    <li class="px-3 py-2 mb-2 bg-light rounded-3 d-flex flex-column">
                        <small class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;">Loggato come</small>
                        <strong class="text-dark">${escapeHTML(dati.utente.nome)}</strong>
                    </li>
                    ${linkProfilo}
                    ${linkAreaPrivata}
                    <li><hr class="dropdown-divider my-2"></li>
                    <li><button class="dropdown-item py-2 text-danger fw-bold custom-dropdown-item btn-logout-custom" id="btn-logout"><i class="bi bi-box-arrow-right me-2"></i>Logout</button></li>
                </ul>
            </div>
        `;
        
        document.getElementById('btn-logout').addEventListener('click', esci);
    }
}

function esci() {
    localStorage.removeItem('utenteLoggato');
    window.location.reload();
}

async function caricaMenu() {
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

        if (idRistoratore) {
            menuOriginale = piatti.filter(p => String(p.creatore) === String(idRistoratore));
            const heroTitle = document.querySelector('.hero-section h1');
            if(heroTitle) heroTitle.innerText = "Il nostro Menu Speciale";
        } else {
            menuOriginale = piatti.filter(p => p.creatore && p.creatore !== 'System').reverse();
        }

        popolaCategorie(menuOriginale);
        renderizzaMenu(menuOriginale);
    } catch (error) {
        console.error("Errore:", error);
        const contenitore = document.getElementById('menu-container');
        if (contenitore) {
            contenitore.innerHTML = '<p class="text-danger text-center w-100">Errore di connessione al server.</p>';
        }
    }
}

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

function renderizzaMenu(piatti) {
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

function mostraIstruzioni(id) {
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

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function applicaFiltri(e) {
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

function aggiungiAlCarrello(id, event) {
    const piattoScelto = menuOriginale.find(p => String(p.idMeal) === String(id));
    if (piattoScelto) {
        if (carrello.length > 0) {
            if (String(carrello[0].creatore) !== String(piattoScelto.creatore)) {
                alert("Puoi ordinare da un solo ristorante per volta! Svuota il carrello o concludi l'ordine attuale prima di cambiare locale.");
                return;
            }
        }

        const piattoDaCarrello = JSON.parse(JSON.stringify(piattoScelto));

        carrello.push(piattoDaCarrello);
        aggiornaInterfacciaCarrello();
        if (event && event.target) {
            animazioneLancioCarrello(id, event.target);
        }
    }
}

function rimuoviDalCarrello(indice) {
    carrello.splice(indice, 1);
    aggiornaInterfacciaCarrello();
}

function aggiornaInterfacciaCarrello() {
    salvaCarrello();

    const contatore = document.getElementById('contatore-carrello');
    if (contatore) contatore.innerText = String(carrello.length);

    const lista = document.getElementById('lista-carrello');
    const totaleTesto = document.getElementById('totale-carrello');
    if (!lista || !totaleTesto) return;

    if (carrello.length === 0) {
        // Design carrello vuoto moderno
        lista.innerHTML = `
            <div class="text-center text-muted my-5 d-flex flex-column align-items-center">
                <i class="bi bi-bag-x fs-1 mb-3 opacity-25"></i>
                <span class="fw-medium">Il carrello è ancora vuoto!</span>
            </div>`;
        totaleTesto.innerText = '0.00 €';
        return;
    }

    let totale = 0;
    
    // FIX DESIGN CARRELLO PIENO: Layout moderno con foto miniatura, bordi arrotondati, cestino icona
    lista.innerHTML = carrello.map((item, index) => {
        const prezzoScontato = calcolaPrezzoReale(item);
        totale += prezzoScontato;
        return `
            <li class="list-group-item border-0 shadow-sm mb-3 p-2 rounded-4 d-flex justify-content-between align-items-center" style="background-color: #f8f9fa;">
                <div class="d-flex align-items-center gap-3" style="max-width: 65%;">
                    <img src="${escapeHTML(item.strMealThumb)}" alt="${escapeHTML(item.strMeal)}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <span class="text-truncate fw-bold text-dark" style="font-size: 0.95rem;">${escapeHTML(item.strMeal)}</span>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <strong class="text-success" style="font-size: 1rem;">${prezzoScontato.toFixed(2)} €</strong>
                    <button class="btn btn-light text-danger rounded-circle p-0 d-flex align-items-center justify-content-center border bg-white shadow-sm btn-rimuovi-carrello" style="width: 32px; height: 32px;" data-index="${index}" title="Rimuovi dal carrello">
                        <i class="bi bi-trash" style="pointer-events: none; font-size: 0.85rem;"></i>
                    </button>
                </div>
            </li>
        `;
    }).join('');

    totaleTesto.innerText = totale.toFixed(2) + ' €';
    
    document.querySelectorAll('.btn-rimuovi-carrello').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = Number(e.target.getAttribute('data-index'));
            rimuoviDalCarrello(index);
        });
    });
}

function salvaCarrello() {
    localStorage.setItem('carrelloFastFood', JSON.stringify(carrello));
}

function animazioneLancioCarrello(idPiatto, bottoneCliccato) {
    const cardElement = bottoneCliccato.closest('.card');
    const imageToCopy = cardElement.querySelector('.card-img-top');
    const cartButtonInHeader = document.getElementById('contatore-carrello');

    if (!cardElement || !imageToCopy || !cartButtonInHeader) return;

    const flyingMiniature = imageToCopy.cloneNode(true);
    const startRect = imageToCopy.getBoundingClientRect();
    const targetRect = cartButtonInHeader.getBoundingClientRect();

    Object.assign(flyingMiniature.style, {
        position: 'fixed',
        top: `${startRect.top}px`,
        left: `${startRect.left}px`,
        width: `${startRect.width}px`,
        height: `${startRect.height}px`,
        opacity: '0.8',
        zIndex: '9999',
        borderRadius: '50%',
        objectFit: 'cover',
        transition: 'all 0.8s ease-in-out',
        pointerEvents: 'none'
    });

    document.body.appendChild(flyingMiniature);

    requestAnimationFrame(() => {
        const translateX = targetRect.left - startRect.left + (targetRect.width / 2) - (startRect.width / 2);
        const translateY = targetRect.top - startRect.top;
        flyingMiniature.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
        flyingMiniature.style.opacity = '0.2';
    });

    setTimeout(() => {
        flyingMiniature.remove();
        cartButtonInHeader.parentElement.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            cartButtonInHeader.parentElement.classList.remove('animate__animated', 'animate__pulse');
        }, 500);
    }, 800);
}

async function inviaOrdine() {
    if (carrello.length === 0) {
        alert("Il carrello è vuoto!");
        return;
    }

    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        alert("Effettua l'accesso per ordinare.");
        window.location.href = 'login.html';
        return;
    }

    const datiUtente = JSON.parse(utenteSalvato);
    const userId = datiUtente.utente.id;
    const ristId = carrello[0].creatore;

    let totaleOrdine = 0;
    const piattiOrdinati = carrello.map(piatto => {
        const prezzoVero = calcolaPrezzoReale(piatto);
        totaleOrdine += prezzoVero;
        return { nome: piatto.strMeal, prezzo: prezzoVero };
    });

    const payloadOrdine = {
        utenteId: userId,
        piatti: piattiOrdinati,
        totale: parseFloat(totaleOrdine.toFixed(2)),
        stato: "In attesa",
        ristoratoreId: ristId
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadOrdine)
        });

        if (response.ok) {
            alert("Ordine completato con successo!");
            carrello = [];
            aggiornaInterfacciaCarrello();

            const offcanvasElement = document.getElementById('carrelloOffcanvas');
            if (offcanvasElement) {
                const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement) || new bootstrap.Offcanvas(offcanvasElement);
                if (offcanvas) offcanvas.hide();
            }
        } else {
            const errore = await response.json();
            alert("Errore: " + (errore.message || "Riprova più tardi."));
        }
    } catch (error) {
        console.error("Errore:", error);
        alert("Errore di connessione.");
    }
}

async function caricaOrdiniUtente() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        window.location.href = 'login.html';
        return;
    }

    const datiUtente = JSON.parse(utenteSalvato);
    const userId = datiUtente.utente.id;

    try {
        const response = await fetch(`${API_URL}/orders`);
        
        if (!response.ok) throw new Error("Errore nel recupero degli ordini");
        
        const tuttiGliOrdini = await response.json();

        const mieiOrdini = tuttiGliOrdini.filter(o => {
            if (!o.utente) return false;
            const idOrdineUtente = typeof o.utente === 'object' ? o.utente._id : o.utente;
            return String(idOrdineUtente) === String(userId);
        });

        mieiOrdini.sort((a, b) => new Date(b.dataOrdine).getTime() - new Date(a.dataOrdine).getTime());

        const contenitore = document.getElementById('ordini-container');
        if (!contenitore) return;

        if (mieiOrdini.length === 0) {
            contenitore.innerHTML = '<div class="col-12"><p class="text-muted text-center py-5">Non hai ancora effettuato ordini.</p></div>';
            return;
        }

        contenitore.innerHTML = mieiOrdini.map(ordine => {
            const dataFormattata = new Date(ordine.dataOrdine).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
            });

            let coloreBadge = 'bg-warning text-dark';
            let extraUi = '';

            if (ordine.stato === 'In preparazione' || ordine.stato === 'In attesa') {
                extraUi = `<div class="text-danger small mt-3 fw-bold">⏳ Attesa stimata: ${escapeHTML(String(ordine.tempoAttesa || 15))} minuti</div>`;
            } else if (ordine.stato === 'Consegnato') {
                coloreBadge = 'bg-success';
                extraUi = `<div class="text-success small mt-3 fw-bold">✔️ Ordine Completato</div>`;
            }

            const listaPiatti = ordine.piatti.map(p =>
                `<li class="d-flex justify-content-between text-muted small border-bottom pb-1 mb-1">
                    <span>${escapeHTML(String(p.quantita))}x ${escapeHTML(p.nomePiatto)}</span>
                    <span>${p.prezzo ? p.prezzo.toFixed(2) : "0.00"} €</span>
                </li>`
            ).join('');

            return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold m-0 text-primary">Ordine del ${escapeHTML(dataFormattata)}</h6>
                            <span class="badge ${coloreBadge}">${escapeHTML(ordine.stato)}</span>
                        </div>
                        <ul class="list-unstyled mb-0">
                            ${listaPiatti}
                        </ul>
                        ${extraUi}
                    </div>
                    <div class="card-footer bg-light border-top-0 d-flex justify-content-between align-items-center">
                        <span class="text-muted small" style="font-size: 0.7rem;">ID: ${escapeHTML(String(ordine._id).substring(0, 8))}...</span>
                        <h5 class="fw-bold text-success m-0">${ordine.prezzoTotale.toFixed(2)} €</h5>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Errore recupero ordini:", error);
        const contenitore = document.getElementById('ordini-container');
        if (contenitore) {
            contenitore.innerHTML = '<div class="col-12"><p class="text-danger text-center w-100 py-5">Errore di connessione al server. Riprova più tardi.</p></div>';
        }
    }
}