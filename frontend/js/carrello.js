import { API_URL, calcolaPrezzoReale, escapeHTML, mostraNotifica } from './utils.js';
import { getSessioneUtente, getAuthHeaders } from './session.js';
import { menuOriginale } from './menu.js';

export let carrello = JSON.parse(localStorage.getItem('carrelloFastFood')) || [];

// Aggiunge un piatto al carrello, impedendo l'inserimento se appartiene a un ristoratore diverso o se l'utente non è loggato.
export function aggiungiAlCarrello(id, event) {
    // 1. BLOCCO DI SICUREZZA: Verifica immediata del login
    const sessione = getSessioneUtente();
    if (!sessione) {
        mostraNotifica("Devi effettuare l'accesso per poter ordinare!", "error");
        // Opzionale: Reindirizzamento automatico
        setTimeout(() => window.location.href = 'login.html', 1500);
        return; // Interrompe subito l'esecuzione
    }

    // 2. LOGICA ORIGINALE DEL CARRELLO
    const piattoScelto = menuOriginale.find(p => String(p.idMeal) === String(id));
    if (piattoScelto) {
        if (carrello.length > 0) {
            if (String(carrello[0].creatore) !== String(piattoScelto.creatore)) {
                mostraNotifica("Non puoi ordinare da due ristoranti diversi! Concludi o svuota l'ordine attuale.", "error");
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

// Rimuove un elemento dal carrello tramite il suo indice posizionale e aggiorna l'interfaccia.
export function rimuoviDalCarrello(indice) {
    carrello.splice(indice, 1);
    aggiornaInterfacciaCarrello();
}

// Ricalcola il totale, salva i dati aggiornati nel localStorage e rigenera l'HTML della lista carrello.
export function aggiornaInterfacciaCarrello() {
    salvaCarrello();

    const contatore = document.getElementById('contatore-carrello');
    if (contatore) contatore.innerText = String(carrello.length);

    const lista = document.getElementById('lista-carrello');
    const totaleTesto = document.getElementById('totale-carrello');
    if (!lista || !totaleTesto) return;

    if (carrello.length === 0) {
        lista.innerHTML = `
            <div class="text-center text-muted my-5 d-flex flex-column align-items-center">
                <i class="bi bi-bag-x fs-1 mb-3 opacity-25"></i>
                <span class="fw-medium">Il carrello è ancora vuoto!</span>
            </div>`;
        totaleTesto.innerText = '0.00 €';
        return;
    }

    let totale = 0;
    
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

// Salva in modo persistente lo stato attuale del carrello nel localStorage per prevenire perdite di dati.
export function salvaCarrello() {
    localStorage.setItem('carrelloFastFood', JSON.stringify(carrello));
}

// Gestisce l'animazione di transizione clonando l'immagine del piatto e muovendola verso l'icona del carrello.
export function animazioneLancioCarrello(idPiatto, bottoneCliccato) {
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

// Formatta i dati del carrello e invia l'ordine al server, bloccando preventivamente l'operazione se l'utente non è autenticato.
export async function inviaOrdine() {
    if (carrello.length === 0) {
        mostraNotifica("Il carrello è vuoto!", "error");
        return;
    }

    const sessione = getSessioneUtente();
    if (!sessione) {
        mostraNotifica("Effettua l'accesso per ordinare.", "error");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000); 
        return;
    }

    const userId = sessione.id;
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
        ristoratoreId: ristId
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payloadOrdine)
        });

        if (response.ok) {
            mostraNotifica("Ordine completato con successo!", "success");
            carrello.length = 0; // Svuota l'array mantenendo il riferimento
            aggiornaInterfacciaCarrello();

            const offcanvasElement = document.getElementById('carrelloOffcanvas');
            if (offcanvasElement) {
                // global bootstrap
                const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement) || new bootstrap.Offcanvas(offcanvasElement);
                if (offcanvas) offcanvas.hide();
            }
        } else {
            const errore = await response.json();
            mostraNotifica("Errore: " + (errore.message || "Riprova più tardi."), "error");
        }
    } catch (error) {
        console.error("Errore:", error);
        mostraNotifica("Errore di connessione.", "error");
    }
}