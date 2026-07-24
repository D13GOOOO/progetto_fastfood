import { aggiornaInterfacciaCarrello, aggiungiAlCarrello, inviaOrdine } from './carrello.js';
import { controllaLogin } from './session.js';
import { caricaMenu, applicaFiltri } from './menu.js';

// Inizializza l'interfaccia al caricamento della pagina: prepara il carrello, verifica il login e imposta gli eventi principali.
document.addEventListener('DOMContentLoaded', () => {
    aggiornaInterfacciaCarrello();
    controllaLogin();

    // Gestione Eventi del Menu (Home)
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        caricaMenu().catch(console.error);
        
        // Event delegation per gestire il click sul pulsante "Aggiungi" generato dinamicamente
        menuContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-aggiungi-carrello')) {
                const id = e.target.getAttribute('data-id');
                aggiungiAlCarrello(id, e);
            }
        });
    }

    const grigliaConsigliati = document.getElementById('griglia-consigliati');
    if (grigliaConsigliati) {
        grigliaConsigliati.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('btn-aggiungi-carrello')) {
                const id = e.target.getAttribute('data-id');
                aggiungiAlCarrello(id, e);
            }
        });
    }

    // Gestione Eventi dei Filtri
    const formRicerca = document.getElementById('form-ricerca');
    if (formRicerca) {
        formRicerca.addEventListener('submit', applicaFiltri);
    }

    // Gestione Evento Pagamento
    const btnPaga = document.getElementById('btn-paga');
    if (btnPaga) {
        btnPaga.addEventListener('click', inviaOrdine);
    }
});