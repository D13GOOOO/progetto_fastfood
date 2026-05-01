import { API_URL, escapeHTML, mostraNotifica, mostraConferma } from './utils.js';

export let mioMenuGlobale = [];
export let catalogoDiSistema = [];

// Inietta nel DOM target un insieme di card skeleton per mantenere il layout stabile durante il caricamento di risorse multimediali e dati.
export function mostraSkeletonCards(containerId) {
    const contenitore = document.getElementById(containerId);
    if (!contenitore) return;

    contenitore.innerHTML = Array(3).fill(`
        <div class="col">
            <div class="skeleton-card h-100">
                <div class="skeleton-element skeleton-img"></div>
                <div class="card-body d-flex flex-column p-4">
                    <div class="d-flex justify-content-between mb-3">
                        <div class="skeleton-element skeleton-title m-0"></div>
                    </div>
                    <div class="d-flex gap-2 mb-3">
                        <div class="skeleton-element skeleton-badge"></div>
                    </div>
                    <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                        <div class="skeleton-element skeleton-title w-25 m-0"></div>
                        <div class="skeleton-element skeleton-btn"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Struttura il payload di un nuovo piatto e lo inserisce a db tramite POST, associandolo all'ID del ristoratore attivo.
export async function salvaPiatto(evento) {
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
            mostraNotifica('Piatto aggiunto al tuo menu con successo!', 'success');
            evento.target.reset();
            caricaMioMenu();
        } else {
            mostraNotifica('Errore durante l\'inserimento del piatto.', 'error');
        }
    } catch (error) {
        console.error("Errore salvataggio piatto:", error);
        mostraNotifica('Errore di connessione con il server.', 'error');
    }
}

// Fetcha i piatti master (creati da 'System' o privi di creatore) e renderizza il catalogo globale da cui i ristoratori possono attingere.
export async function caricaCatalogo() {
    mostraSkeletonCards('contenitore-catalogo'); 

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

// Esegue un soft-clone di un piatto di sistema, sovrascrive il creatore con l'ID corrente, e lo inietta nel database evitando duplicazioni lato client.
export async function copiaPiattoNelMenu(idPiattoBase) {
    const piattoScelto = catalogoDiSistema.find(p => String(p.idMeal) === String(idPiattoBase));
    if (!piattoScelto) return;

    const giaPresente = mioMenuGlobale.some(p => p.strMeal.toLowerCase() === piattoScelto.strMeal.toLowerCase());
    if (giaPresente) {
        mostraNotifica("Questo piatto è già presente nel tuo menu!", "error");
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
            mostraNotifica(`"${piattoScelto.strMeal}" aggiunto al tuo menu!`, "success");
            caricaMioMenu();
        } else {
            mostraNotifica('Errore durante l\'aggiunta del piatto.', 'error');
        }
    } catch (error) {
        console.error("Errore copia piatto:", error);
        mostraNotifica('Errore di connessione.', 'error');
    }
}

// Scarica l'elenco dei piatti dal server, filtrandoli localmente in base all'ID del ristoratore, ed espone i controlli UI per gestione sconti e modifiche.
export async function caricaMioMenu() {
    mostraSkeletonCards('contenitore-mio-menu'); 

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

// Inoltra una richiesta DELETE all'endpoint API, richiedendo conferma utente prima di rimuovere il record selezionato dal database.
export async function eliminaPiattoDalMenu(idMeal) {
    const confermato = await mostraConferma(
        "Elimina Piatto", 
        "Sei sicuro di voler rimuovere definitivamente questo piatto dal tuo menu?", 
        "Sì, Elimina"
    );

    if (!confermato) return;

    try {
        const response = await fetch(`${API_URL}/meals/${idMeal}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Errore durante eliminazione');

        if (response.ok) {
            const modalEl = document.getElementById('modalGestisciPiatto');
            // global bootstrap
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();

            mostraNotifica("Piatto eliminato con successo!", "success");
            caricaMioMenu();
        } else {
            mostraNotifica("Errore durante l'eliminazione del piatto.", "error");
        }
    } catch (error) {
        console.error("Errore eliminazione piatto:", error);
        mostraNotifica("Errore di connessione.", "error");
    }
}

// Interroga l'array locale dei piatti filtrati per estrarre il modello dati selezionato e popola dinamicamente i campi del form modale.
export function apriModalGestisciPiatto(idMeal) {
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
    // global bootstrap
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

// Trasmette una richiesta PUT contenente l'oggetto JSON del piatto manipolato, aggiornando le proprietà, compresi campi secondari come sconti e limitazioni.
export async function salvaModifichePiatto(evento) {
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
            // global bootstrap
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            evento.target.reset();
            
            mostraNotifica("Modifiche salvate con successo!", "success");
            caricaMioMenu();
        } else {
            mostraNotifica('Errore durante il salvataggio delle modifiche.', "error");
        }
    } catch (error) {
        console.error("Errore salvataggio piatto:", error);
        mostraNotifica('Errore di connessione col server.', "error");
    }
}