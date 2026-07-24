import { API_URL, mostraNotifica, mostraConferma } from './utils.js';
import { getSessioneUtente, getAuthHeaders, salvaAuthToken, rimuoviAuthToken } from './session.js';

// Inizializza la vista del profilo: verifica l'autenticazione, applica il loader visivo (skeleton) e recupera i dati anagrafici dal server.
document.addEventListener('DOMContentLoaded', async () => {
    const sessione = getSessioneUtente();
    if (!sessione) {
        window.location.href = 'login.html';
        return;
    }

    const uid = sessione.id;

    mostraSkeletonProfilo();

    try {
        const response = await fetch(`${API_URL}/users/${uid}`);
        if (!response.ok) throw new Error("Recupero profilo fallito");
        
        const utente = await response.json();

        // 1. Rimuoviamo prima la "maschera" grigia e i placeholder da TUTTI i campi
        const campiSkeletons = ['prof-nome', 'prof-cognome', 'prof-email', 'prof-indirizzo', 'prof-pref'];
        campiSkeletons.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('skeleton-element');
                el.style.background = ""; 
                el.placeholder = ""; 
            }
        });

        // 2. Compiliamo i campi con i dati veri
        const profNome = document.getElementById('prof-nome');
        if (profNome) profNome.value = utente.nome || '';

        const profCognome = document.getElementById('prof-cognome');
        if (profCognome) profCognome.value = utente.cognome || '';

        const profEmail = document.getElementById('prof-email');
        if (profEmail) profEmail.value = utente.email || '';

        const profIndirizzo = document.getElementById('prof-indirizzo');
        if (profIndirizzo) profIndirizzo.value = utente.indirizzo || '';

        const profTipoPag = document.getElementById('prof-tipo-pag');
        if (profTipoPag) profTipoPag.value = utente.metodoPagamento?.tipo || 'Contanti';

        const profPref = document.getElementById('prof-pref');
        if (profPref) {
            // Se le preferenze sono un Array, le uniamo con una virgola
            profPref.value = Array.isArray(utente.preferenze) ? utente.preferenze.join(', ') : (utente.preferenze || '');
        }

    } catch (error) {
        console.error("Errore nel recupero dati profilo:", error);
        mostraNotifica("Impossibile caricare le informazioni del profilo.", "error");
    }

    const formProfilo = document.getElementById('form-profilo');
    if (formProfilo) {
        // Intercetta il submit del form per strutturare il payload di aggiornamento e trasmetterlo all'API tramite richiesta PUT.
        formProfilo.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Trasformiamo la stringa scritta dall'utente di nuovo in un Array pulito per il database
            const preferenzeTesto = document.getElementById('prof-pref').value;
            const preferenzeArray = preferenzeTesto.split(',').map(s => s.trim()).filter(s => s !== '');

            const update = {
                nome: document.getElementById('prof-nome').value,
                cognome: document.getElementById('prof-cognome').value,
                indirizzo: document.getElementById('prof-indirizzo').value,
                preferenze: preferenzeArray,
                metodoPagamento: {
                    tipo: document.getElementById('prof-tipo-pag').value
                }
            };

            try {
                const response = await fetch(`${API_URL}/users/${uid}`, {
                    method: 'PUT',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(update)
                });

                if (response.ok) {
                    mostraNotifica('Profilo aggiornato con successo!', 'success');
                    const data = await response.json();

                    if (data.token) {
                        salvaAuthToken(data.token);
                    }
                    
                } else {
                    const errore = await response.json();
                    mostraNotifica(`Errore durante l'aggiornamento: ${errore.message || ''}`, 'error');
                }
            } catch (error) {
                console.error("Errore salvataggio profilo:", error);
                mostraNotifica("Problema di connessione con il server.", "error");
            }
        });
    }

    const btnElimina = document.getElementById('btn-elimina-account');
    if (btnElimina) {
        btnElimina.addEventListener('click', eliminaAccount);
    }
});

// Inietta classi CSS e stili temporanei sui campi di input per fornire un feedback visivo (skeleton loading) durante l'attesa della risposta di rete.
function mostraSkeletonProfilo() {
    const campi = ['prof-nome', 'prof-cognome', 'prof-email', 'prof-indirizzo', 'prof-pref'];
    
    campi.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.placeholder = "Caricamento...";
            el.style.background = "#e2e5e7"; 
            el.classList.add('skeleton-element');
        }
    });
}

// Richiede conferma esplicita prima di inoltrare una richiesta DELETE per la rimozione permanente dell'account, invalidando poi la sessione locale.
async function eliminaAccount() {
    const confermato = await mostraConferma(
        "Elimina Account", 
        "Sei sicuro? Questa azione cancellerà il tuo profilo definitivamente e non potrà essere annullata.", 
        "Sì, Elimina Account"
    );

    if (!confermato) return;

    try {
        const sessione = getSessioneUtente();
        if (!sessione) return;

        const uid = sessione.id;

        const response = await fetch(`${API_URL}/users/${uid}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            rimuoviAuthToken();
            window.location.href = 'register.html';
        } else {
            mostraNotifica('Impossibile eliminare l\'account.', 'error');
        }
    } catch (error) {
        console.error("Errore eliminazione account:", error);
        mostraNotifica("Errore di connessione durante l'eliminazione.", "error");
    }
}