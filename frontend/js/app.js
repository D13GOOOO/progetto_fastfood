/* global bootstrap */

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

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
    
    // Event delegation per i bottoni "Aggiungi al carrello"
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

// Funzione di utilità per calcolare il prezzo reale (DRY)
function calcolaPrezzoReale(piatto) {
    let prezzo = piatto.prezzo || 0;
    if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
        if (new Date(piatto.scontoScadenza) > new Date()) {
            prezzo = prezzo - (prezzo * (piatto.scontoPercentuale / 100));
        }
    }
    return prezzo;
}

// Prevenzione XSS di base
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

        let linkAreaPrivata = `<li><a class="dropdown-item" href="ordini.html">I miei ordini</a></li>`;
        if (dati.utente.ruolo === 'ristoratore') {
            linkAreaPrivata = `<li><a class="dropdown-item" href="dashboard.html">Area Ristoratore</a></li>`;
        }

        const linkProfilo = `<li><a class="dropdown-item" href="profilo.html">Il mio Profilo</a></li>`;

        areaUtente.innerHTML = `
            <a class="nav-link dropdown-toggle fw-bold text-success" href="#" role="button" data-bs-toggle="dropdown">
                Ciao, ${escapeHTML(dati.utente.nome)}
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                ${linkProfilo} 
                ${linkAreaPrivata}
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger fw-bold" id="btn-logout">Logout</button></li>
            </ul>
        `;
        
        // Colleghiamo l'evento click per il logout via JavaScript
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
        
        let bloccoPrezzo = `<h6 class="fw-bold text-success mb-3">${prezzoScontato.toFixed(2)} €</h6>`;
        let badgeSconto = '';

        if (prezzoScontato < (piatto.prezzo || 0)) {
            bloccoPrezzo = `
                <div class="mb-3">
                    <span class="text-muted text-decoration-line-through small me-2">${piatto.prezzo.toFixed(2)} €</span>
                    <h6 class="fw-bold text-danger d-inline">${prezzoScontato.toFixed(2)} €</h6>
                </div>
            `;
            badgeSconto = `<span class="position-absolute top-0 end-0 badge bg-warning text-dark m-2 shadow-sm fs-6">-${piatto.scontoPercentuale}%</span>`;
        }

        const ristorante = ristorantiGlobali.find(r =>
            String(r.titolare) === String(piatto.creatore) ||
            (r.titolare && String(r.titolare._id) === String(piatto.creatore))
        );
        const nomeRistorante = ristorante ? ristorante.nome : "Ristorante Partner";

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm position-relative">
                    ${badgeSconto}
                    <img src="${escapeHTML(piatto.strMealThumb)}" class="card-img-top" alt="${escapeHTML(piatto.strMeal)}">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold m-0">${escapeHTML(piatto.strMeal)}</h5>
                            <span class="badge bg-danger">${escapeHTML(piatto.strCategory)}</span>
                        </div>
                        <p class="text-muted small mb-3">👨‍🍳 Preparato da: <strong>${escapeHTML(nomeRistorante)}</strong></p>
                        ${bloccoPrezzo}
                        <button class="btn btn-primary w-100 mt-auto fw-bold btn-aggiungi-carrello" data-id="${piatto.idMeal}">
                            Aggiungi al Carrello
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
        lista.innerHTML = '<li class="list-group-item text-center text-muted my-4">Il carrello è ancora vuoto!</li>';
        totaleTesto.innerText = '0.00 €';
        return;
    }

    let totale = 0;
    lista.innerHTML = carrello.map((item, index) => {
        const prezzoScontato = calcolaPrezzoReale(item);
        totale += prezzoScontato;
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span class="text-truncate" style="max-width: 70%;">${escapeHTML(item.strMeal)}</span>
                <div>
                    <span class="badge bg-success me-2">${prezzoScontato.toFixed(2)} €</span>
                    <button class="btn btn-sm btn-outline-danger btn-rimuovi-carrello" data-index="${index}">X</button>
                </div>
            </li>
        `;
    }).join('');

    totaleTesto.innerText = totale.toFixed(2) + ' €';
    
    // Riapplica event listener per i bottoni rimuovi (dato che abbaimo riscritto il DOM della lista)
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