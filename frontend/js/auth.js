/* global API_URL, mostraNotifica */

function mostraNotificaAuth(messaggio, tipo = 'error') {
    let container = document.getElementById('toast-container-custom');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-custom';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    
    const classeColore = tipo === 'success' ? 'toast-success' : 'toast-error';
    const classeIcona = tipo === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';

    // Rimuoviamo escapeHTML se non è presente in questo file, 
    // oppure usiamo il testo grezzo (sicuro per stringhe scritte da noi)
    toast.className = `toast-custom ${classeColore}`;
    toast.innerHTML = `
        <i class="bi ${classeIcona}"></i>
        <p class="testo">${messaggio}</p>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 6000);
}

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_URL}/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('utenteLoggato', JSON.stringify(data));

                    // NUOVO POPUP DI SUCCESSO!
                    mostraNotificaAuth('Bentornato! Accesso effettuato con successo', 'success');

                    // Ritardo di 1.5 secondi per far vedere l'animazione prima del redirect
                    setTimeout(() => {
                        if (data.utente.ruolo === 'ristoratore') {
                            window.location.href = 'dashboard.html';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 1500);
                    
                } else {
                    const errore = await response.json();
                    // NUOVO POPUP DI ERRORE!
                    mostraNotificaAuth('Errore: ' + (errore.message || 'Credenziali non valide'), 'error');
                }
            } catch (error) {
                console.error("Errore di connessione:", error);
                mostraNotificaAuth("Impossibile connettersi al server.", "error");
            }
        });
    }

    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const nome = document.getElementById('reg-nome').value;
            const cognome = document.getElementById('reg-cognome').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const ruolo = document.getElementById('reg-ruolo').value;
            const preferenze = document.getElementById('reg-preferenze').value;

            try {
                const response = await fetch(`${API_URL}/users/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, cognome, email, password, ruolo, preferenze })
                });

                if (response.ok) {
                    // NUOVO POPUP DI SUCCESSO!
                    mostraNotificaAuth('Account creato con successo! Ora puoi effettuare il login.', 'success');
                    
                    // Ritardo di 2 secondi per far leggere il messaggio prima del redirect
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                    
                } else {
                    const errore = await response.json();
                    // NUOVO POPUP DI ERRORE!
                    mostraNotificaAuth('Errore: ' + (errore.message || 'Registrazione fallita'), 'error');
                }
            } catch (error) {
                console.error("Errore:", error);
                mostraNotificaAuth("Impossibile connettersi al server.", "error");
            }
        });
    }
});