let ristorantiOriginali = [];

document.addEventListener('DOMContentLoaded', () => {
    caricaRistoranti().catch(console.error);

    const formRicerca = document.getElementById('form-ricerca-ristoranti');
    if (formRicerca) {
        formRicerca.addEventListener('submit', applicaFiltriRistoranti);
    }
});

async function caricaRistoranti() {
    try {
        const response = await fetch('http://localhost:3000/api/restaurants');

        ristorantiOriginali = await response.json();

        renderizzaRistoranti(ristorantiOriginali);
    } catch (error) {
        console.error("Errore nel recupero ristoranti:", error);
        const contenitore = document.getElementById('ristoranti-container');
        if (contenitore) {
            contenitore.innerHTML = '<p class="text-danger text-center w-100">Errore di connessione al server.</p>';
        }
    }
}

function renderizzaRistoranti(ristoranti) {
    const contenitore = document.getElementById('ristoranti-container');
    if (!contenitore) return;

    if (ristoranti.length === 0) {
        contenitore.innerHTML = '<p class="text-muted text-center w-100 my-5">Nessun ristorante trovato con questi criteri.</p>';
        return;
    }

    contenitore.innerHTML = ristoranti.map(rist => {
        const nomeTitolare = rist.titolare && rist.titolare.nome
            ? `${rist.titolare.nome} ${rist.titolare.cognome}`
            : 'Sconosciuto';

        const idTitolare = rist.titolare && rist.titolare._id ? rist.titolare._id : rist.titolare;

        return `
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-primary mb-0">${rist.nome}</h5>
                            <span class="badge bg-light text-dark border">P.IVA: ${rist.partitaIva}</span>
                        </div>
                        <p class="text-muted small mb-3">
                            📍 ${rist.indirizzo}<br>
                            📞 ${rist.telefono}
                        </p>
                        <div class="mt-auto">
                            <p class="small text-muted mb-2">Gestito da: ${nomeTitolare}</p>
                            <a href="index.html?ristoratore=${idTitolare}" class="btn btn-outline-danger w-100 fw-bold">Vai al Menu</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function applicaFiltriRistoranti(e) {
    e.preventDefault();

    const inputNome = document.getElementById('filtro-nome-rest');
    const inputLuogo = document.getElementById('filtro-luogo');

    const nome = inputNome ? inputNome.value.toLowerCase() : '';
    const luogo = inputLuogo ? inputLuogo.value.toLowerCase() : '';

    const ristorantiFiltrati = ristorantiOriginali.filter(r => {
        const matchNome = String(r.nome || '').toLowerCase().includes(nome);
        const matchLuogo = String(r.indirizzo || '').toLowerCase().includes(luogo);

        return matchNome && matchLuogo;
    });

    renderizzaRistoranti(ristorantiFiltrati);
}