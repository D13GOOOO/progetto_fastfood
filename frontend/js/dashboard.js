/* global bootstrap */

const API_URL = 'http://localhost:3000/api';

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

let mioMenuGlobale = [];
let mioRistoranteId = null;

document.addEventListener('DOMContentLoaded', () => {
    controllaAccessoRistoratore();
    caricaOrdini().catch(console.error);
    caricaDatiRistorante(); 

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

    const btnEliminaModal = document.getElementById('btn-elimina-piatto-modal');
    if (btnEliminaModal) {
        btnEliminaModal.addEventListener('click', () => {
            const idMeal = document.getElementById('mod-id-piatto').value;
            eliminaPiattoDalMenu(idMeal);
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', esci);
    }

    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-stato-ordine')) {
            const idOrdine = e.target.getAttribute('data-id');
            aggiornaStato(idOrdine, e.target.value);
        }
    });

    document.body.addEventListener('click', (e) => {
        const btnCopia = e.target.closest('.btn-copia-piatto');
        if (btnCopia) {
            const idMeal = btnCopia.getAttribute('data-id');
            copiaPiattoNelMenu(idMeal);
        }

        const btnGestisci = e.target.closest('.btn-gestisci-piatto');
        if (btnGestisci) {
            const idMeal = btnGestisci.getAttribute('data-id');
            apriModalGestisciPiatto(idMeal);
        }
    });
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
        const response = await fetch(`${API_URL}/orders?ristoratoreId=${datiUtente.utente.id}`);
        if (!response.ok) throw new Error('Errore di rete durante il recupero ordini');
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
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">Nessun ordine presente al momento.</td></tr>';
            return;
        }

        ordini.sort((a, b) => new Date(b.dataOrdine).getTime() - new Date(a.dataOrdine).getTime());

        tbody.innerHTML = ordini.map(ordine => {
            const dataFormattata = new Date(ordine.dataOrdine).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'
            });
            const piattiList = ordine.piatti.map(p => `<strong class="text-dark">${escapeHTML(p.quantita)}x</strong> ${escapeHTML(p.nomePiatto)}`).join('<br>');
            const nomeCliente = ordine.utente ? `${escapeHTML(ordine.utente.nome)} ${escapeHTML(ordine.utente.cognome)}` : 'Cliente Sconosciuto';

            // Badge colori per la dashboard
            let badgeStatoColore = 'bg-secondary';
            if (ordine.stato === 'In attesa') badgeStatoColore = 'bg-warning text-dark';
            if (ordine.stato === 'In preparazione') badgeStatoColore = 'bg-primary';

            let selectStato;
            if (ordine.stato !== 'Consegnato') {
                const stati = ['In attesa', 'In preparazione', 'Consegnato'];
                selectStato = `
                    <select class="form-select form-select-sm w-auto select-stato-ordine bg-light border-0 fw-bold text-secondary rounded-pill px-3 shadow-none" data-id="${escapeHTML(String(ordine._id))}">
                        ${stati.map(s => `<option value="${escapeHTML(s)}" ${ordine.stato === s ? 'selected' : ''}>${escapeHTML(s)}</option>`).join('')}
                    </select>
                `;
            } else {
                selectStato = `<span class="badge bg-success rounded-pill px-3 py-2"><i class="bi bi-check-circle me-1"></i> Completato</span>`;
                badgeStatoColore = 'bg-success';
            }

            return `
                <tr>
                    <td class="small text-muted py-3 ps-4">${escapeHTML(dataFormattata)}</td>
                    <td class="fw-bold py-3 text-dark">${nomeCliente}</td>
                    <td class="small py-3 text-muted">${piattiList}</td>
                    <td class="fw-bold text-success py-3 fs-5">${escapeHTML(ordine.prezzoTotale.toFixed(2))} €</td>
                    <td class="py-3"><span class="badge ${badgeStatoColore} rounded-pill px-3 py-2">${escapeHTML(ordine.stato)}</span></td>
                    <td class="py-3 pe-4 text-end">${selectStato}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Errore recupero ordini:", error);
        const tbody = document.getElementById('tabella-ordini');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-5">Errore di connessione.</td></tr>';
        }
    }
}

async function aggiornaStato(idOrdine, nuovoStato) {
    try {
        const response = await fetch(`${API_URL}/orders/${idOrdine}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato: nuovoStato })
        });

        if (!response.ok) throw new Error('Errore nella risposta del server');

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
        titolare: datiUtente.utente.id
    };

    try {
        let url = `${API_URL}/restaurants`;
        let metodo = 'POST';

        if (typeof mioRistoranteId !== 'undefined' && mioRistoranteId !== null) {
            url = `${API_URL}/restaurants/${mioRistoranteId}`;
            metodo = 'PUT';
        } else {
            payload.menu = [];
        }

        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();

            if (!mioRistoranteId && data.ristorante && data.ristorante._id) {
                mioRistoranteId = data.ristorante._id;
            }

            alert('Dati del ristorante salvati con successo!');
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
        strMealThumb: document.getElementById('piatto-immagine').value || "https://placehold.co/400x300?text=Nessuna+Foto",
        strArea: "Personalizzato",
        strInstructions: "Piatto creato dal ristoratore.",
        measures: [],
        creatore: datiUtente.utente.id
    };

    try {
        const response = await fetch(`${API_URL}/meals`, {
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
        const response = await fetch(`${API_URL}/meals`);
        if (!response.ok) throw new Error('Errore nel recupero del catalogo');
        const tuttiIPiatti = await response.json();

        catalogoDiSistema = tuttiIPiatti.filter(p => !p.creatore || p.creatore === 'System');

        const contenitore = document.getElementById('contenitore-catalogo');
        if (!contenitore) return;

        if (catalogoDiSistema.length === 0) {
            contenitore.innerHTML = '<p class="text-muted text-center w-100">Nessun piatto base disponibile.</p>';
            return;
        }

        // Stile allineato ad app.js (Card moderne, bordo 16px, pulsanti a pillola)
        contenitore.innerHTML = catalogoDiSistema.map(piatto => {
            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0" style="border-radius: 16px; overflow: hidden;">
                        <div class="position-relative">
                            <img src="${escapeHTML(piatto.strMealThumb)}" class="card-img-top" alt="${escapeHTML(piatto.strMeal)}" style="height: 220px; object-fit: cover;" onerror="this.src='https://placehold.co/400x300?text=Nessuna+Foto'">
                        </div>
                        <div class="card-body d-flex flex-column p-4">
                            <h5 class="card-title fw-bold m-0 lh-sm text-dark mb-3">${escapeHTML(piatto.strMeal)}</h5>
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                <span class="badge bg-danger rounded-pill">#${escapeHTML(piatto.strCategory.toLowerCase() || 'generico')}</span>
                            </div>
                            <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                                <h4 class="fw-bold text-success m-0">${piatto.prezzo ? escapeHTML(piatto.prezzo.toFixed(2)) : "0.00"} €</h4>
                                <button class="btn btn-success fw-bold rounded-pill shadow-sm px-3 py-2 btn-copia-piatto" data-id="${escapeHTML(String(piatto.idMeal))}">
                                    <i class="bi bi-plus-lg"></i> Aggiungi
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

    const giaPresente = mioMenuGlobale.some(p => p.strMeal.toLowerCase() === piattoScelto.strMeal.toLowerCase());
    if (giaPresente) {
        alert("Attenzione: Questo piatto è già presente nel tuo menu!");
        return; 
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
        const response = await fetch(`${API_URL}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Errore durante la copia del piatto nel db');

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
        const response = await fetch(`${API_URL}/meals`);
        if (!response.ok) throw new Error('Errore nel recupero del menu');
        const tuttiIPiatti = await response.json();

        mioMenuGlobale = tuttiIPiatti.filter(p => String(p.creatore) === String(datiUtente.utente.id));
        const contenitore = document.getElementById('contenitore-mio-menu');
        if (!contenitore) return;

        if (mioMenuGlobale.length === 0) {
            contenitore.innerHTML = '<p class="text-muted text-center w-100 py-5">Non hai ancora aggiunto piatti al tuo menu. Vai in "Catalogo Base" o "Nuovo Piatto".</p>';
            return;
        }

        // Stile allineato ad app.js
        contenitore.innerHTML = mioMenuGlobale.map(piatto => {
            let bloccoPrezzo = `<h4 class="fw-bold text-success m-0">${piatto.prezzo ? piatto.prezzo.toFixed(2) : "0.00"} €</h4>`;
            let badgeSconto = '';

            if (piatto.scontoPercentuale > 0 && piatto.scontoScadenza) {
                const dataScadenza = new Date(piatto.scontoScadenza);
                if (dataScadenza > new Date()) {
                    const prezzoScontato = piatto.prezzo - (piatto.prezzo * (piatto.scontoPercentuale / 100));
                    bloccoPrezzo = `
                        <div class="d-flex flex-column">
                            <span class="text-muted text-decoration-line-through lh-1" style="font-size: 0.8rem;">${piatto.prezzo.toFixed(2)} €</span>
                            <h4 class="fw-bold text-danger m-0 lh-1 mt-1">${prezzoScontato.toFixed(2)} €</h4>
                            <div class="text-muted mt-1" style="font-size: 0.65rem;">Scade: ${dataScadenza.toLocaleDateString('it-IT')}</div>
                        </div>
                    `;
                    badgeSconto = `<span class="position-absolute top-0 start-0 badge bg-warning text-dark m-3 shadow-sm fs-6 rounded-pill">-${piatto.scontoPercentuale}%</span>`;
                }
            }

            return `
                <div class="col">
                    <div class="card h-100 shadow-sm border-0" style="border-radius: 16px; overflow: hidden;">
                        <div class="position-relative">
                            ${badgeSconto}
                            <img src="${escapeHTML(piatto.strMealThumb)}" class="card-img-top" alt="${escapeHTML(piatto.strMeal)}" style="height: 220px; object-fit: cover;" onerror="this.src='https://placehold.co/400x300?text=Nessuna+Foto'">
                        </div>
                        <div class="card-body d-flex flex-column p-4">
                            <h5 class="card-title fw-bold m-0 lh-sm text-dark mb-3 text-truncate" title="${escapeHTML(piatto.strMeal)}">${escapeHTML(piatto.strMeal)}</h5>
                            <div class="d-flex flex-wrap gap-2 mb-3">
                                <span class="badge bg-danger rounded-pill">#${escapeHTML(piatto.strCategory.toLowerCase() || 'generico')}</span>
                            </div>
                            <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                                ${bloccoPrezzo}
                                <button class="btn btn-outline-primary fw-bold rounded-pill shadow-sm px-3 py-2 btn-gestisci-piatto" data-id="${escapeHTML(String(piatto.idMeal))}">
                                    <i class="bi bi-pencil-square"></i> Modifica
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
        const response = await fetch(`${API_URL}/meals/${idMeal}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Errore durante eliminazione');

        if (response.ok) {
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
        const response = await fetch(`${API_URL}/meals/${idMeal}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Errore durante la modifica del piatto');

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

async function caricaDatiRistorante() {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) return;

    const datiUtente = JSON.parse(utenteSalvato);

    try {
        const response = await fetch(`${API_URL}/restaurants/titolare/${datiUtente.utente.id}`);
        if (!response.ok) throw new Error('Errore nel recupero dati ristorante');

        if (response.ok) {
            const ristorante = await response.json();

            if (ristorante && ristorante._id) {
                mioRistoranteId = ristorante._id;

                document.getElementById('rest-nome').value = ristorante.nome || '';
                document.getElementById('rest-piva').value = ristorante.partitaIva || '';
                document.getElementById('rest-indirizzo').value = ristorante.indirizzo || '';
                document.getElementById('rest-telefono').value = ristorante.telefono || '';
            }
        }
    } catch (error) {
        console.error("Nessun ristorante trovato o errore di connessione:", error);
    }
}