/* global bootstrap */

let menuOriginale = [];
let carrello = [];
let ristorantiGlobali = [];

document.addEventListener('DOMContentLoaded', () => {
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
});

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
                Ciao, ${dati.utente.nome}
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                ${linkProfilo} 
                ${linkAreaPrivata}
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger fw-bold" onclick="esci()">Logout</button></li>
            </ul>
        `;
    }
}

function esci() {
    localStorage.removeItem('utenteLoggato');
    window.location.reload();
}

async function caricaMenu() {
    try {
        const [resPiatti, resRistoranti] = await Promise.all([
            fetch('http://localhost:3000/api/meals'),
            fetch('http://localhost:3000/api/restaurants')
        ]);

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
        let bloccoPrezzo = `<h6 class="fw-bold text-success mb-3">${piatto.prezzo ? piatto.prezzo.toFixed(2) : "0.00"} €</h6>`;
        let badgeSconto = '';

        if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
            const dataScadenza = new Date(piatto.scontoScadenza);
            if (dataScadenza > new Date()) {
                const prezzoScontato = piatto.prezzo - (piatto.prezzo * (piatto.scontoPercentuale / 100));
                bloccoPrezzo = `
                    <div class="mb-3">
                        <span class="text-muted text-decoration-line-through small me-2">${piatto.prezzo.toFixed(2)} €</span>
                        <h6 class="fw-bold text-danger d-inline">${prezzoScontato.toFixed(2)} €</h6>
                    </div>
                `;
                badgeSconto = `<span class="position-absolute top-0 end-0 badge bg-warning text-dark m-2 shadow-sm fs-6">-${piatto.scontoPercentuale}%</span>`;
            }
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
                    <img src="${piatto.strMealThumb}" class="card-img-top" alt="${piatto.strMeal}">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold m-0">${piatto.strMeal}</h5>
                            <span class="badge bg-danger">${piatto.strCategory}</span>
                        </div>
                        <p class="text-muted small mb-3">👨‍🍳 Preparato da: <strong>${nomeRistorante}</strong></p>
                        ${bloccoPrezzo}
                        <button class="btn btn-primary w-100 mt-auto fw-bold" onclick="aggiungiAlCarrello('${piatto.idMeal}', event)">
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

        let prezzoAttuale = p.prezzo || 0;
        if (p.scontoPercentuale > 0 && p.scontoScadenza && new Date(p.scontoScadenza) > new Date()) {
            prezzoAttuale = p.prezzo - (p.prezzo * (p.scontoPercentuale / 100));
        }
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
        if (piattoDaCarrello.scontoPercentuale > 0 && piattoDaCarrello.scontoScadenza) {
            if (new Date(piattoDaCarrello.scontoScadenza) > new Date()) {
                piattoDaCarrello.prezzo = piattoDaCarrello.prezzo - (piattoDaCarrello.prezzo * (piattoDaCarrello.scontoPercentuale / 100));
            }
        }

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
        totale += item.prezzo || 0;
        return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span class="text-truncate" style="max-width: 70%;">${item.strMeal}</span>
                <div>
                    <span class="badge bg-success me-2">${item.prezzo ? item.prezzo.toFixed(2) : "0.00"} €</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="rimuoviDalCarrello(${index})">X</button>
                </div>
            </li>
        `;
    }).join('');

    totaleTesto.innerText = totale.toFixed(2) + ' €';
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
        totaleOrdine += piatto.prezzo || 0;
        return { nome: piatto.strMeal, prezzo: piatto.prezzo };
    });

    const payloadOrdine = {
        utenteId: userId,
        piatti: piattiOrdinati,
        totale: parseFloat(totaleOrdine.toFixed(2)),
        stato: "In preparazione",
        ristoratoreId: ristId
    };

    try {
        const response = await fetch('http://localhost:3000/api/orders', {
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
                const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
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
        const response = await fetch('http://localhost:3000/api/orders');
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
                extraUi = `<div class="text-danger small mt-3 fw-bold">⏳ Attesa stimata: ${ordine.tempoAttesa || 15} minuti</div>`;
            }

            if (ordine.stato === 'In consegna') {
                coloreBadge = 'bg-info text-dark';
                extraUi = `<button class="btn btn-sm btn-success w-100 mt-3 fw-bold shadow-sm" onclick="confermaRicezioneCliente('${ordine._id}')">Conferma Ricezione Ordine</button>`;
            } else if (ordine.stato === 'Consegnato') {
                coloreBadge = 'bg-success';
                extraUi = `<div class="text-success small mt-3 fw-bold">✔️ Ordine Completato</div>`;
            }

            const listaPiatti = ordine.piatti.map(p =>
                `<li class="d-flex justify-content-between text-muted small border-bottom pb-1 mb-1">
                    <span>${p.quantita}x ${p.nomePiatto}</span>
                    <span>${p.prezzo ? p.prezzo.toFixed(2) : "0.00"} €</span>
                </li>`
            ).join('');

            return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold m-0 text-primary">Ordine del ${dataFormattata}</h6>
                            <span class="badge ${coloreBadge}">${ordine.stato}</span>
                        </div>
                        <ul class="list-unstyled mb-0">
                            ${listaPiatti}
                        </ul>
                        ${extraUi}
                    </div>
                    <div class="card-footer bg-light border-top-0 d-flex justify-content-between align-items-center">
                        <span class="text-muted small" style="font-size: 0.7rem;">ID: ${String(ordine._id).substring(0, 8)}...</span>
                        <h5 class="fw-bold text-success m-0">${ordine.prezzoTotale.toFixed(2)} €</h5>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Errore recupero ordini:", error);
    }
}

async function confermaRicezioneCliente(idOrdine) {
    if(!confirm("Confermi di aver ricevuto l'ordine?")) return;

    try {
        const response = await fetch(`http://localhost:3000/api/orders/${idOrdine}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato: 'Consegnato' })
        });

        if (response.ok) {
            alert('Grazie per aver confermato! Buon appetito!');
            await caricaOrdiniUtente();
        } else {
            alert('Errore di comunicazione col server.');
        }
    } catch (error) {
        console.error("Errore:", error);
    }
}