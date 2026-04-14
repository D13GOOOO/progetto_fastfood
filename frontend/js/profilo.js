/* global mostraNotifica, mostraConferma, API_URL */

document.addEventListener('DOMContentLoaded', async () => {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        window.location.href = 'login.html';
        return;
    }

    const sessione = JSON.parse(utenteSalvato);
    const uid = sessione.utente.id;

    mostraSkeletonProfilo();

    try {
        const response = await fetch(`${API_URL}/users/${uid}`);
        if (!response.ok) throw new Error("Recupero profilo fallito");
        
        const utente = await response.json();

        // 2. I dati sono arrivati: popoliamo i campi (lo scheletro sparisce perché scriviamo nel value)
        const profNome = document.getElementById('prof-nome');
        if (profNome) {
            profNome.value = utente.nome || '';
            profNome.classList.remove('skeleton-element'); // Rimuoviamo l'effetto se applicato al campo
        }

        const profCognome = document.getElementById('prof-cognome');
        if (profCognome) profCognome.value = utente.cognome || '';

        const profEmail = document.getElementById('prof-email');
        if (profEmail) profEmail.value = utente.email || '';

        const profIndirizzo = document.getElementById('prof-indirizzo');
        if (profIndirizzo) profIndirizzo.value = utente.indirizzo || '';

        const profTipoPag = document.getElementById('prof-tipo-pag');
        if (profTipoPag) profTipoPag.value = utente.metodoPagamento?.tipo || 'Contanti';

        const profPref = document.getElementById('prof-pref');
        if (profPref) profPref.value = utente.preferenze || '';

    } catch (error) {
        console.error("Errore nel recupero dati profilo:", error);
        mostraNotifica("Impossibile caricare le informazioni del profilo.", "error");
    }

    const formProfilo = document.getElementById('form-profilo');
    if (formProfilo) {
        formProfilo.addEventListener('submit', async (e) => {
            e.preventDefault();

            const update = {
                nome: document.getElementById('prof-nome').value,
                cognome: document.getElementById('prof-cognome').value,
                indirizzo: document.getElementById('prof-indirizzo').value,
                preferenze: document.getElementById('prof-pref').value,
                metodoPagamento: {
                    tipo: document.getElementById('prof-tipo-pag').value
                }
            };

            try {
                const response = await fetch(`${API_URL}/users/${uid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update)
                });

                if (response.ok) {
                    mostraNotifica('Profilo aggiornato con successo!', 'success');
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

async function eliminaAccount() {
    const confermato = await mostraConferma(
        "Elimina Account", 
        "Sei sicuro? Questa azione cancellerà il tuo profilo definitivamente e non potrà essere annullata.", 
        "Sì, Elimina Account"
    );

    if (!confermato) return;

    try {
        const utenteSalvato = localStorage.getItem('utenteLoggato');
        if (!utenteSalvato) return;

        const sessione = JSON.parse(utenteSalvato);
        const uid = sessione.utente.id;

        const response = await fetch(`${API_URL}/users/${uid}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            localStorage.removeItem('utenteLoggato');
            window.location.href = 'register.html';
        } else {
            mostraNotifica('Impossibile eliminare l\'account.', 'error');
        }
    } catch (error) {
        console.error("Errore eliminazione account:", error);
        mostraNotifica("Errore di connessione durante l'eliminazione.", "error");
    }
}