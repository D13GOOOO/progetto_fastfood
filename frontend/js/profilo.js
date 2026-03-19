document.addEventListener('DOMContentLoaded', async () => {
    const utenteSalvato = localStorage.getItem('utenteLoggato');
    if (!utenteSalvato) {
        window.location.href = 'login.html';
        return;
    }

    const sessione = JSON.parse(utenteSalvato);
    const uid = sessione.utente.id;

    try {
        const response = await fetch(`http://localhost:3000/api/users/${uid}`);
        if (response.ok) {
            const utente = await response.json();

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
            if (profPref) profPref.value = utente.preferenze || '';
        }
    } catch (error) {
        console.error("Errore nel recupero dati profilo:", error);
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
                const response = await fetch(`http://localhost:3000/api/users/${uid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update)
                });

                if (response.ok) {
                    alert('Profilo aggiornato con successo!');
                } else {
                    alert('Errore durante l\'aggiornamento.');
                }
            } catch (error) {
                console.error("Errore salvataggio profilo:", error);
            }
        });
    }
});

async function eliminaAccount() {
    if (!confirm("Sei sicuro? Questa azione cancellerà il tuo profilo definitivamente.")) {
        return;
    }

    try {
        const utenteSalvato = localStorage.getItem('utenteLoggato');
        if (!utenteSalvato) return;

        const sessione = JSON.parse(utenteSalvato);
        const uid = sessione.utente.id;

        const response = await fetch(`http://localhost:3000/api/users/${uid}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            localStorage.removeItem('utenteLoggato');
            window.location.href = 'register.html';
        } else {
            alert('Impossibile eliminare l\'account.');
        }
    } catch (error) {
        console.error("Errore eliminazione account:", error);
    }
}