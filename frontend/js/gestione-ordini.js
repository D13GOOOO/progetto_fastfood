import { API_URL, escapeHTML, mostraNotifica } from './utils.js';
import { getSessioneUtente, getAuthHeaders } from './session.js';

// Inietta una struttura DOM segnaposto (skeleton) per la tabella degli ordini per migliorare l'esperienza utente durante il parsing di rete.
export function mostraSkeletonOrdini() {
    const tbody = document.getElementById('tabella-ordini');
    if (tbody) {
        tbody.innerHTML = Array(4).fill(`
            <tr>
                <td class="py-3 ps-4"><div class="skeleton-element skeleton-text w-75"></div></td>
                <td class="py-3"><div class="skeleton-element skeleton-text w-100"></div></td>
                <td class="py-3"><div class="skeleton-element skeleton-text w-100"></div></td>
                <td class="py-3"><div class="skeleton-element skeleton-text w-50"></div></td>
                <td class="py-3"><div class="skeleton-element skeleton-badge"></div></td>
                <td class="py-3 pe-4 text-end"><div class="skeleton-element skeleton-btn mx-auto" style="width: 100px;"></div></td>
            </tr>
        `).join('');
    }
}

// Interroga l'API per recuperare lo storico ordini associato all'ID del ristoratore, calcola i KPI (incassi totali, ordini pendenti) e compila dinamicamente la tabella.
export async function caricaOrdini() {
    mostraSkeletonOrdini(); 

    try {
        const datiUtente = getSessioneUtente();
        if (!datiUtente) return;

        try {
            const statsResponse = await fetch(`${API_URL}/orders/stats/${datiUtente.id}`, {
                headers: getAuthHeaders()
            });
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                const statIncassi = document.getElementById('stat-incassi');
                const statTotali = document.getElementById('stat-totali');
                const statPendenti = document.getElementById('stat-pendenti');
                const statPiattoTop = document.getElementById('stat-piatto-top');

                if (statIncassi) statIncassi.innerText = stats.incassi.toFixed(2) + ' €';
                if (statTotali) statTotali.innerText = String(stats.totali);
                if (statPendenti) statPendenti.innerText = String(stats.pendenti);
                if (statPiattoTop) {
                    statPiattoTop.innerText = escapeHTML(stats.piattoTop);
                    statPiattoTop.title = escapeHTML(stats.piattoTop);
                }
            }
        } catch (e) {
            console.error("Errore recupero statistiche:", e);
        }

        const response = await fetch(`${API_URL}/orders?ristoratoreId=${datiUtente.id}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Errore di rete durante il recupero ordini');
        const ordini = await response.json();
        const tbody = document.getElementById('tabella-ordini');

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
            const piattiList = ordine.piatti.map(p => `<strong class="text-dark">${escapeHTML(String(p.quantita))}x</strong> ${escapeHTML(p.nomePiatto)}`).join('<br>');
            const nomeCliente = ordine.utente ? `${escapeHTML(ordine.utente.nome)} ${escapeHTML(ordine.utente.cognome)}` : 'Cliente Sconosciuto';

            let badgeStatoColore = 'bg-secondary';
            if (ordine.stato === 'Ordinato') badgeStatoColore = 'bg-warning text-dark';
            if (ordine.stato === 'In preparazione') badgeStatoColore = 'bg-primary';

            let selectStato;
            if (ordine.stato !== 'Consegnato') {
                const stati = ['Ordinato', 'In preparazione', 'Consegnato'];
                selectStato = `
                    <select class="form-select form-select-sm w-auto select-stato-ordine bg-light border-0 fw-bold text-secondary rounded-pill px-3 shadow-none mx-auto" data-id="${escapeHTML(String(ordine._id))}">
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
                    <td class="py-3 pe-4 text-center">${selectStato}</td>
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

// Esegue una richiesta PUT al server per aggiornare lo stato di elaborazione di un singolo ordine. Richiama un refresh della tabella su esito positivo.
export async function aggiornaStato(idOrdine, nuovoStato) {
    try {
        const datiUtente = getSessioneUtente();
        const response = await fetch(`${API_URL}/orders/${idOrdine}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ stato: nuovoStato })
        });

        if (!response.ok) throw new Error('Errore nella risposta del server');

        if (response.ok) {
            mostraNotifica("Stato ordine aggiornato", "success");
            await caricaOrdini();
        } else {
            mostraNotifica("Errore durante l'aggiornamento dello stato.", "error");
        }
    } catch (error) {
        console.error("Errore aggiornamento:", error);
        mostraNotifica("Errore di connessione durante l'aggiornamento.", "error");
    }
}