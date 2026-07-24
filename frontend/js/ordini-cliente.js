// ordini-cliente.js
import { API_URL, escapeHTML } from './utils.js';
import { getSessioneUtente, getAuthHeaders } from './session.js';

// Scarica lo storico degli ordini dell'utente connesso e ne genera la rappresentazione grafica a schermo, ordinata per data.
export async function caricaOrdiniUtente() {
    const sessione = getSessioneUtente();
    if (!sessione) {
        window.location.href = 'login.html';
        return;
    }

    const userId = sessione.id;

    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: getAuthHeaders()
        });
        
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

            let coloreBadge = 'bg-secondary';
            let extraUi = '';

            if (ordine.stato === 'Ordinato') {
                coloreBadge = 'bg-warning text-dark';
                extraUi = `<div class="text-danger small mt-3 fw-bold">⏳ Attesa stimata: ${escapeHTML(String(ordine.tempoAttesa || 15))} minuti</div>`;
            } else if (ordine.stato === 'In preparazione') {
                coloreBadge = 'bg-primary';
                extraUi = `<div class="text-danger small mt-3 fw-bold">⏳ Attesa stimata: ${escapeHTML(String(ordine.tempoAttesa || 15))} minuti</div>`;
            } else if (ordine.stato === 'Consegnato') {
                coloreBadge = 'bg-success';
                extraUi = `<div class="text-success small mt-3 fw-bold">✔️ Ordine Completato (Ritirato)</div>`;
            }

            const listaPiatti = ordine.piatti.map(p =>
                `<li class="d-flex justify-content-between text-muted small border-bottom pb-1 mb-1">
                    <span>${escapeHTML(String(p.quantita))}x ${escapeHTML(p.nomePiatto)}</span>
                    <span>${p.prezzo ? p.prezzo.toFixed(2) : "0.00"} €</span>
                </li>`
            ).join('');

            return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0" style="border-radius: 16px;">
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
                    <div class="card-footer bg-light border-top-0 d-flex justify-content-between align-items-center" style="border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
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

document.addEventListener('DOMContentLoaded', () => {
    caricaOrdiniUtente().catch(console.error);
});