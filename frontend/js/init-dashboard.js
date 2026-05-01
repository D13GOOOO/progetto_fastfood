import { controllaAccessoRistoratore, esci } from './session.js';
import { caricaOrdini, aggiornaStato } from './gestione-ordini.js';
import { caricaDatiRistorante, salvaRistorante } from './gestione-ristorante.js';
import { salvaPiatto, salvaModifichePiatto, eliminaPiattoDalMenu, apriModalGestisciPiatto, copiaPiattoNelMenu, caricaCatalogo, caricaMioMenu } from './gestione-menu.js';

// Inizializza l'ambiente della dashboard: verifica i permessi, recupera i dati iniziali e associa gli event listener.
document.addEventListener('DOMContentLoaded', () => {
    
    // Controlli di sicurezza e caricamenti iniziali
    controllaAccessoRistoratore();
    caricaOrdini().catch(console.error);
    caricaDatiRistorante(); 

    // Avvio ritardato del caricamento dei menu per evitare colli di bottiglia
    setTimeout(() => {
        caricaCatalogo().catch(console.error);
        caricaMioMenu().catch(console.error);
    }, 500);

    // Event Listeners per i form
    const formRistorante = document.getElementById('form-ristorante');
    if (formRistorante) {
        formRistorante.addEventListener('submit', salvaRistorante);
    }

    const formPiatto = document.getElementById('form-piatto');
    if (formPiatto) {
        formPiatto.addEventListener('submit', salvaPiatto);
    }

    const formGestisciPiatto = document.getElementById('form-gestisci-piatto');
    if (formGestisciPiatto) {
        formGestisciPiatto.addEventListener('submit', salvaModifichePiatto);
    }

    // Event Listener per pulsanti diretti
    const btnEliminaModal = document.getElementById('btn-elimina-piatto-modal');
    if (btnEliminaModal) {
        btnEliminaModal.addEventListener('click', () => {
            const idMeal = document.getElementById('mod-id-piatto').value;
            eliminaPiattoDalMenu(idMeal);
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', esci);
    }

    // Event Delegation (Per elementi generati dinamicamente come dropdown stati ordine e bottoni dei piatti)
    document.body.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-stato-ordine')) {
            const idOrdine = e.target.getAttribute('data-id');
            aggiornaStato(idOrdine, e.target.value);
        }
    });

    document.body.addEventListener('click', (e) => {
        const btnCopia = e.target.closest('.btn-copia-piatto');
        if (btnCopia) {
            const idMeal = btnCopia.getAttribute('data-id');
            copiaPiattoNelMenu(idMeal);
        }

        const btnGestisci = e.target.closest('.btn-gestisci-piatto');
        if (btnGestisci) {
            const idMeal = btnGestisci.getAttribute('data-id');
            apriModalGestisciPiatto(idMeal);
        }
    });
});