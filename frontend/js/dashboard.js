/* global bootstrap */

let mioMenuGlobale = [];

document.addEventListener('DOMContentLoaded', () => {
    controllaAccessoRistoratore();
    caricaOrdini().catch(console.error);

    const formRistorante = document.getElementById('form-ristorante');
    if (formRistorante) {
        formRistorante.addEventListener('submit', salvaRistorante);
    }

    const formPiatto = document.getElementById('form-piatto');
    if (formPiatto) {
        formPiatto.addEventListener('submit', salvaPiatto);
    }

    const formGestisciPiatto = document.getElementById('form-gestisci-piatto');
    if (formGestisciPiatto) {
        formGestisciPiatto.addEventListener('submit', salvaModifichePiatto);
    }

    // Listener per il nuovo tasto elimina dentro al modal
    const btnEliminaModal = document.getElementById('btn-elimina-piatto-modal');
    if (btnEliminaModal) {
        btnEliminaModal.addEventListener('click', () => {
            const idMeal = document.getElementById('mod-id-piatto').value;
            eliminaPiattoDalMenu(idMeal);
        });
    }
});

function controllaAccessoRistoratore() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        window.location.href = 'login.html';
        return;
    }

    const dati = JSON.parse(utenteSalvato);
    if (dati.utente.ruolo !== 'ristoratore') {
        alert('Accesso negato. Questa area è riservata ai ristoratori.');
        window.location.href = 'index.html';
        return;
    }

    const nomeRistoratore = document.getElementById('nome-ristoratore');
    if (nomeRistoratore) {
        nomeRistoratore.innerText = `Ciao, ${dati.utente.nome}`;
    }
}

function esci() {
    localStorage.removeItem('utenteLoggato');
    window.location.href = 'login.html';
}

async function caricaOrdini() {
    try {
        const utenteSalvato = localStorage.getItem('utenteLoggato');
        if (!utenteSalvato) return;

        const datiUtente = JSON.parse(utenteSalvato);
        const response = await fetch(`http://localhost:3000/api/orders?ristoratoreId=${datiUtente.utente.id}`);
        const ordini = await response.json();
        const tbody = document.getElementById('tabella-ordini');

        const statIncassi = document.getElementById('stat-incassi');
        const statTotali = document.getElementById('stat-totali');
        const statPendenti = document.getElementById('stat-pendenti');

        if (statIncassi && statTotali && statPendenti) {
            let totaleGuadagni = 0;
            let ordiniPendenti = 0;

            ordini.forEach(o => {
                totaleGuadagni += o.prezzoTotale;
                if (o.stato !== 'Consegnato') {
                    ordiniPendenti++;
                }
            });

            statIncassi.innerText = totaleGuadagni.toFixed(2) + ' €';
            statTotali.innerText = String(ordini.length);
            statPendenti.innerText = String(ordiniPendenti);
        }

        if (!tbody) return;

        if (ordini.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nessun ordine presente al momento.</td></tr>';
            return;
        }

        ordini.sort((a, b) => new Date(b.dataOrdine).getTime() - new Date(a.dataOrdine).getTime());

        tbody.innerHTML = ordini.map(ordine => {
            const dataFormattata = new Date(ordine.dataOrdine).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
            });
            const piattiList = ordine.piatti.map(p => `${p.quantita}x ${p.nomePiatto}`).join('<br>');
            const nomeCliente = ordine.utente ? `${ordine.utente.nome} ${ordine.utente.cognome}` : 'Cliente Sconosciuto';

            let selectStato;
            if (ordine.stato !== 'Consegnato') {
                const stati = ['In attesa', 'In preparazione', 'In consegna', 'Consegnato'];
                selectStato = `
                    <select class="form-select form-select-sm w-auto" onchange="aggiornaStato('${String(ordine._id)}', this.value)">
                        ${stati.map(s => `<option value="${s}" ${ordine.stato === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                `;
            } else {
                selectStato = `<span class="badge bg-success">Completato</span>`;
            }

            return `
                <tr>
                    <td class="small text-muted">${dataFormattata}</td>
                    <td class="fw-bold">${nomeCliente}</td>
                    <td class="small">${piattiList}</td>
                    <td class="fw-bold text-success">${ordine.prezzoTotale.toFixed(2)} €</td>
                    <td><span class="badge bg-secondary">${ordine.stato}</span></td>
                    <td>${selectStato}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Errore recupero ordini:", error);
        const tbody = document.getElementById('tabella-ordini');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Errore di connessione.</td></tr>';
        }
    }
}

async function aggiornaStato(idOrdine, nuovoStato) {
    try {
        const response = await fetch(`http://localhost:3000/api/orders/${idOrdine}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato: nuovoStato })
        });

        if (response.ok) {
            await caricaOrdini();
        } else {
            alert('Errore durante l\'aggiornamento dello stato.');
        }
    } catch (error) {
        console.error("Errore aggiornamento:", error);
    }
}

async function salvaRistorante(evento) {
    evento.preventDefault();
    const datiUtente = JSON.parse(localStorage.getItem('utenteLoggato'));

    const payload = {
        nome: document.getElementById('rest-nome').value,
        partitaIva: document.getElementById('rest-piva').value,
        indirizzo: document.getElementById('rest-indirizzo').value,
        telefono: document.getElementById('rest-telefono').value,
        titolare: datiUtente.utente.id,
        menu: []
    };

    try {
        const response = await fetch('http://localhost:3000/api/restaurants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Dati del ristorante salvati con successo!');
            evento.target.reset();
        } else {
            alert('Errore durante il salvataggio.');
        }
    } catch (error) {
        console.error("Errore salvataggio ristorante:", error);
    }
}

async function salvaPiatto(evento) {
    evento.preventDefault();

    const stringaIngredienti = document.getElementById('piatto-ingredienti').value;
    const arrayIngredienti = stringaIngredienti.split(',').map(ing => ing.trim());
    const datiUtente = JSON.parse(localStorage.getItem('utenteLoggato'));

    const payload = {
        strMeal: document.getElementById('piatto-nome').value,
        prezzo: parseFloat(document.getElementById('piatto-prezzo').value),
        strCategory: document.getElementById('piatto-categoria').value || "Generico",
        ingredients: arrayIngredienti,
        strMealThumb: document.getElementById('piatto-immagine').value || "https://via.placeholder.com/150",
        strArea: "Personalizzato",
        strInstructions: "Piatto creato dal ristoratore.",
        measures: [],
        creatore: datiUtente.utente.id
    };

    try {
        const response = await fetch('http://localhost:3000/api/meals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('Piatto aggiunto al tuo menu con successo!');
            evento.target.reset();
            caricaMioMenu();
        } else {
            alert('Errore durante l\'inserimento del piatto.');
        }
    } catch (error) {
        console.error("Errore salvataggio piatto:", error);
    }
}

let catalogoDiSistema = [];
setTimeout(() => {
    caricaCatalogo().catch(console.error);
    caricaMioMenu().catch(console.error);
}, 500);

async function caricaCatalogo() {
    try {
        const response = await fetch('http://localhost:3000/api/meals');
        const tuttiIPiatti = await response.json();

        catalogoDiSistema = tuttiIPiatti.filter(p => !p.creatore || p.creatore === 'System');

        const contenitore = document.getElementById('contenitore-catalogo');
        if (!contenitore) return;

        if (catalogoDiSistema.length === 0) {
            contenitore.innerHTML = '<p class="text-muted text-center w-100">Nessun piatto base disponibile.</p>';
            return;
        }

        contenitore.innerHTML = catalogoDiSistema.map(piatto => {
            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${piatto.strMealThumb}" class="card-img-top" alt="${piatto.strMeal}" style="height: 160px; object-fit: cover;">
                        <div class="card-body d-flex flex-column p-3">
                            <h6 class="fw-bold mb-2">${piatto.strMeal}</h6>
                            <div><span class="badge bg-secondary mb-3">${piatto.strCategory}</span></div>
                            <div class="mt-auto">
                                <p class="text-success fw-bold mb-3">${piatto.prezzo ? piatto.prezzo.toFixed(2) : "0.00"} €</p>
                                <button class="btn btn-sm btn-success w-100 fw-bold" onclick="copiaPiattoNelMenu('${String(piatto.idMeal)}')">
                                    + Aggiungi al mio Menu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Errore recupero catalogo:", error);
    }
}

async function copiaPiattoNelMenu(idPiattoBase) {
    const piattoScelto = catalogoDiSistema.find(p => String(p.idMeal) === String(idPiattoBase));
    if (!piattoScelto) return;

    // CONTROLLO DUPLICATI
    const giaPresente = mioMenuGlobale.some(p => p.strMeal.toLowerCase() === piattoScelto.strMeal.toLowerCase());
    if (giaPresente) {
        alert("Attenzione: Questo piatto è già presente nel tuo menu!");
        return; // Blocca l'esecuzione
    }

    const datiUtente = JSON.parse(localStorage.getItem('utenteLoggato'));

    const payload = {
        idMeal: new Date().getTime().toString(),
        strMeal: piattoScelto.strMeal,
        prezzo: piattoScelto.prezzo || 10.00,
        strCategory: piattoScelto.strCategory,
        ingredients: piattoScelto.ingredients,
        strMealThumb: piattoScelto.strMealThumb,
        strArea: piattoScelto.strArea,
        strInstructions: piattoScelto.strInstructions,
        measures: piattoScelto.measures,
        creatore: datiUtente.utente.id
    };

    try {
        const response = await fetch('http://localhost:3000/api/meals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(`"${piattoScelto.strMeal}" aggiunto al tuo menu!`);
            caricaMioMenu();
        } else {
            alert('Errore durante la copia del piatto.');
        }
    } catch (error) {
        console.error("Errore copia piatto:", error);
    }
}

async function caricaMioMenu() {
    try {
        const datiUtente = JSON.parse(localStorage.getItem('utenteLoggato'));
        const response = await fetch('http://localhost:3000/api/meals');
        const tuttiIPiatti = await response.json();

        mioMenuGlobale = tuttiIPiatti.filter(p => String(p.creatore) === String(datiUtente.utente.id));
        const contenitore = document.getElementById('contenitore-mio-menu');
        if (!contenitore) return;

        if (mioMenuGlobale.length === 0) {
            contenitore.innerHTML = '<p class="text-muted text-center w-100 py-4">Non hai ancora aggiunto piatti al tuo menu. Vai in "Catalogo Base" o "Nuovo Piatto".</p>';
            return;
        }

        contenitore.innerHTML = mioMenuGlobale.map(piatto => {
            let infoPrezzo = `<p class="text-success fw-bold mb-3">${piatto.prezzo ? piatto.prezzo.toFixed(2) : "0.00"} €</p>`;

            if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
                const dataScadenza = new Date(piatto.scontoScadenza);
                if (dataScadenza > new Date()) {
                    const prezzoScontato = piatto.prezzo - (piatto.prezzo * (piatto.scontoPercentuale / 100));
                    infoPrezzo = `
                        <div class="mb-3">
                            <span class="text-muted text-decoration-line-through small d-block">${piatto.prezzo.toFixed(2)} €</span>
                            <span class="text-danger fw-bold">${prezzoScontato.toFixed(2)} €</span>
                            <span class="badge bg-warning text-dark ms-1">-${piatto.scontoPercentuale}%</span>
                            <div class="text-muted mt-1" style="font-size: 0.75rem;">Scade: ${dataScadenza.toLocaleDateString('it-IT')} ${dataScadenza.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    `;
                }
            }

            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${piatto.strMealThumb}" class="card-img-top" alt="${piatto.strMeal}" style="height: 160px; object-fit: cover;">
                        <div class="card-body d-flex flex-column p-3">
                            <h6 class="fw-bold mb-2 text-truncate" title="${piatto.strMeal}">${piatto.strMeal}</h6>
                            <div><span class="badge bg-secondary mb-3">${piatto.strCategory}</span></div>
                            <div class="mt-auto">
                                ${infoPrezzo}
                                <button class="btn btn-sm btn-outline-primary w-100 fw-bold" onclick="apriModalGestisciPiatto('${String(piatto.idMeal)}')">
                                    Gestisci
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Errore recupero mio menu:", error);
    }
}

async function eliminaPiattoDalMenu(idMeal) {
    if (!confirm("Sei sicuro di voler rimuovere definitivamente questo piatto dal tuo menu?")) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/meals/${idMeal}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Chiude il modal prima di ricaricare il menu
            const modalEl = document.getElementById('modalGestisciPiatto');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();

            alert("Piatto eliminato con successo!");
            caricaMioMenu();
        } else {
            alert("Errore durante l'eliminazione del piatto.");
        }
    } catch (error) {
        console.error("Errore eliminazione piatto:", error);
    }
}

function apriModalGestisciPiatto(idMeal) {
    const piatto = mioMenuGlobale.find(p => String(p.idMeal) === String(idMeal));
    if(!piatto) return;

    document.getElementById('mod-id-piatto').value = piatto.idMeal;
    document.getElementById('mod-nome').value = piatto.strMeal;
    document.getElementById('mod-prezzo').value = piatto.prezzo || 0;
    document.getElementById('mod-categoria').value = piatto.strCategory || '';
    document.getElementById('mod-ingredienti').value = Array.isArray(piatto.ingredients) ? piatto.ingredients.join(', ') : '';
    document.getElementById('mod-immagine').value = piatto.strMealThumb || '';

    document.getElementById('mod-sconto-percentuale').value = piatto.scontoPercentuale || 0;

    if (piatto.scontoScadenza) {
        const d = new Date(piatto.scontoScadenza);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('mod-sconto-scadenza').value = d.toISOString().slice(0,16);
    } else {
        document.getElementById('mod-sconto-scadenza').value = '';
    }

    const modalEl = document.getElementById('modalGestisciPiatto');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function salvaModifichePiatto(evento) {
    evento.preventDefault();
    const idMeal = document.getElementById('mod-id-piatto').value;

    const payload = {
        strMeal: document.getElementById('mod-nome').value,
        prezzo: parseFloat(document.getElementById('mod-prezzo').value),
        strCategory: document.getElementById('mod-categoria').value,
        ingredients: document.getElementById('mod-ingredienti').value.split(',').map(i => i.trim()),
        strMealThumb: document.getElementById('mod-immagine').value,
        scontoPercentuale: parseInt(document.getElementById('mod-sconto-percentuale').value, 10) || 0,
        scontoScadenza: document.getElementById('mod-sconto-scadenza').value || null
    };

    try {
        const response = await fetch(`http://localhost:3000/api/meals/${idMeal}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const modalEl = document.getElementById('modalGestisciPiatto');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            evento.target.reset();
            caricaMioMenu();
        } else {
            alert('Errore durante il salvataggio delle modifiche.');
        }
    } catch (error) {
        console.error("Errore salvataggio piatto:", error);
    }
}