let menuCompleto = [];
let carrello = [];

document.addEventListener('DOMContentLoaded', () => {
    caricaMenu();
    controllaLogin();

    const btnPaga = document.getElementById('btn-paga');
    if (btnPaga) {
        btnPaga.addEventListener('click', inviaOrdine);
    }
});

// Gestione Autenticazione
function controllaLogin() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    const areaUtente = document.getElementById('area-utente');

    if (utenteSalvato && areaUtente) {
        const dati = JSON.parse(utenteSalvato);

        areaUtente.innerHTML = `
            <a class="nav-link dropdown-toggle fw-bold text-success" href="#" role="button" data-bs-toggle="dropdown">
                Ciao, ${dati.utente.nome}
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li><a class="dropdown-item" href="#">I miei ordini</a></li>
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

// Caricamento Menu
async function caricaMenu() {
    try {
        const response = await fetch('http://localhost:3000/api/meals');
        const piatti = await response.json();

        menuCompleto = piatti.slice(0, 12);
        const contenitore = document.getElementById('menu-container');
        contenitore.innerHTML = '';

        menuCompleto.forEach(piatto => {
            const prezzo = (Math.random() * 10 + 5).toFixed(2);
            piatto.prezzo = parseFloat(prezzo);

            const card = `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm">
                        <img src="${piatto.strMealThumb}" class="card-img-top" alt="${piatto.strMeal}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title fw-bold">${piatto.strMeal}</h5>
                            <p class="badge bg-danger w-50">${piatto.strCategory}</p>
                            <h6 class="fw-bold text-success">${piatto.prezzo} €</h6>
                            <button class="btn btn-primary w-100 mt-auto" onclick="aggiungiAlCarrello('${piatto.idMeal}')">
                                Aggiungi al Carrello
                            </button>
                        </div>
                    </div>
                </div>
            `;
            contenitore.innerHTML += card;
        });

    } catch (error) {
        console.error("Errore:", error);
        document.getElementById('menu-container').innerHTML =
            '<p class="text-danger text-center w-100">Errore di connessione al server.</p>';
    }
}

// Gestione Carrello
function aggiungiAlCarrello(id) {
    const piattoScelto = menuCompleto.find(p => p.idMeal === id);

    if (piattoScelto) {
        carrello.push(piattoScelto);
        aggiornaInterfacciaCarrello();
    }
}

function rimuoviDalCarrello(indice) {
    carrello.splice(indice, 1);
    aggiornaInterfacciaCarrello();
}

function aggiornaInterfacciaCarrello() {
    document.getElementById('contatore-carrello').innerText = carrello.length;
    const lista = document.getElementById('lista-carrello');
    const totaleTesto = document.getElementById('totale-carrello');

    if (carrello.length === 0) {
        lista.innerHTML = '<li class="list-group-item text-center text-muted my-4">Il carrello è ancora vuoto!</li>';
        totaleTesto.innerText = '0.00 €';
        return;
    }

    lista.innerHTML = '';
    let totale = 0;

    carrello.forEach((item, index) => {
        totale += item.prezzo;
        lista.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span class="text-truncate" style="max-width: 70%;">${item.strMeal}</span>
                <div>
                    <span class="badge bg-success me-2">${item.prezzo} €</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="rimuoviDalCarrello(${index})">X</button>
                </div>
            </li>
        `;
    });

    totaleTesto.innerText = totale.toFixed(2) + ' €';
}

// Gestione Ordine
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

    let totaleOrdine = 0;
    const piattiOrdinati = carrello.map(piatto => {
        totaleOrdine += piatto.prezzo;
        return { nome: piatto.strMeal, prezzo: piatto.prezzo };
    });

    const payloadOrdine = {
        utenteId: userId,
        piatti: piattiOrdinati,
        totale: parseFloat(totaleOrdine.toFixed(2)),
        stato: "In preparazione"
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
            const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
            if (offcanvas) offcanvas.hide();
        } else {
            const errore = await response.json();
            alert("Errore: " + (errore.message || "Riprova più tardi."));
        }
    } catch (error) {
        console.error("Errore:", error);
        alert("Errore di connessione.");
    }
}