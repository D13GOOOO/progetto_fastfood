import { API_URL, mostraNotifica } from './utils.js';

let mioRistoranteId = null;

// Richiama i metadati del profilo ristorante pre-esitente in base all'ID titolare per auto-popolare i campi di configurazione nell'UI.
export async function caricaDatiRistorante() {
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

// Raccoglie i dati anagrafici dal form ed effettua una richiesta POST (creazione) o PUT (aggiornamento) per profilare il ristorante nel database.
export async function salvaRistorante(evento) {
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

            mostraNotifica('Dati del ristorante salvati con successo!', 'success');
        } else {
            mostraNotifica('Errore durante il salvataggio.', 'error');
        }
    } catch (error) {
        console.error("Errore salvataggio ristorante:", error);
        mostraNotifica('Errore di connessione con il server.', 'error');
    }
}