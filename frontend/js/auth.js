document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('utenteLoggato', JSON.stringify(data));

                    alert('Bentornato! Accesso effettuato con successo');

                    if (data.utente.ruolo === 'ristoratore') {
                        window.location.href = 'dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    const errore = await response.json();
                    alert('Errore: ' + (errore.message || 'Credenziali non valide'));
                }
            } catch (error) {
                console.error("Errore di connessione:", error);
                alert("Impossibile connettersi al server.");
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
                const response = await fetch('http://localhost:3000/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome, cognome, email, password, ruolo, preferenze })
                });

                if (response.ok) {
                    alert('Account creato con successo! Ora puoi effettuare il login.');
                    window.location.href = 'login.html';
                } else {
                    const errore = await response.json();
                    alert('Errore: ' + (errore.message || 'Registrazione fallita'));
                }
            } catch (error) {
                console.error("Errore:", error);
                alert("Impossibile connettersi al server.");
            }
        });
    }
});