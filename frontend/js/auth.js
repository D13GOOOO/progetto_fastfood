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

const regoleValidazione = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[A-Za-z])(?=.*\d).{6,}$/, 
    testo: /^[A-Za-zÀ-ÿ\s']{2,}$/ 
};

function validaCampo(input, tipoRegola) {
    if (!input) return true;
    
    const valore = input.value.trim();
    const regex = regoleValidazione[tipoRegola];
    
    if (valore.length === 0) {
        input.classList.remove('is-valid', 'is-invalid');
        return false;
    }

    const isValid = regex.test(valore);
    
    if (isValid) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
    }
    
    return isValid;
}

document.addEventListener('DOMContentLoaded', () => {
    const apiEndpoint = typeof API_URL !== 'undefined' ? API_URL : '/api';

    const regNome = document.getElementById('reg-nome');
    const regCognome = document.getElementById('reg-cognome');
    const regEmail = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');

    if (regNome) regNome.addEventListener('input', () => validaCampo(regNome, 'testo'));
    if (regCognome) regCognome.addEventListener('input', () => validaCampo(regCognome, 'testo'));
    if (regEmail) regEmail.addEventListener('input', () => validaCampo(regEmail, 'email'));
    if (regPassword) regPassword.addEventListener('input', () => validaCampo(regPassword, 'password'));

    const loginEmail = document.getElementById('email');
    if (loginEmail) loginEmail.addEventListener('input', () => validaCampo(loginEmail, 'email'));

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            if (loginEmail && !validaCampo(loginEmail, 'email')) {
                mostraNotificaAuth('Per favore, inserisci un formato email valido.', 'error');
                return;
            }

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${apiEndpoint}/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('utenteLoggato', JSON.stringify(data));
                    mostraNotificaAuth('Bentornato! Accesso effettuato con successo', 'success');

                    setTimeout(() => {
                        if (data.utente.ruolo === 'ristoratore') {
                            window.location.href = 'dashboard.html';
                        } else {
                            window.location.href = 'index.html';
                        }
                    }, 1500);
                } else {
                    const errore = await response.json();
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

            const nomeValido = validaCampo(regNome, 'testo');
            const cognomeValido = validaCampo(regCognome, 'testo');
            const emailValida = validaCampo(regEmail, 'email');
            const passValida = validaCampo(regPassword, 'password');

            if (!nomeValido || !cognomeValido || !emailValida || !passValida) {
                mostraNotificaAuth("Verifica i campi evidenziati. La password richiede almeno 6 caratteri, una lettera e un numero.", "error");
                return;
            }

            const payload = {
                nome: regNome.value,
                cognome: regCognome.value,
                email: regEmail.value,
                password: regPassword.value,
                ruolo: document.getElementById('reg-ruolo').value,
                preferenze: document.getElementById('reg-preferenze').value
            };

            try {
                const response = await fetch(`${apiEndpoint}/users/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    mostraNotificaAuth('Account creato con successo! Ora puoi effettuare il login.', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    const errore = await response.json();
                    mostraNotificaAuth('Errore: ' + (errore.message || 'Registrazione fallita'), 'error');
                }
            } catch (error) {
                console.error("Errore:", error);
                mostraNotificaAuth("Impossibile connettersi al server.", "error");
            }
        });
    }
});