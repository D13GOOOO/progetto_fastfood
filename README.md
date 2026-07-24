# FastFood Delivery & Restaurant Management

*Progetto sviluppato nel corso di Programmazione Web e Mobile (Laurea Triennale in Informatica, Università degli Studi di Milano - UNIMI) tenuto dal Professor Valerio Bellandi.*

Una piattaforma web full-stack per la gestione degli ordini e dei menu, progettata con un'architettura ibrida per supportare due tipologie di utenti: **Clienti** e **Ristoratori**.

## Funzionalità Principali

### Lato Cliente
*   **Esplorazione Menu:** Navigazione del catalogo globale o vetrine specifiche dei singoli ristoranti.
*   **Filtri Dinamici:** Ricerca avanzata lato client (multi-criteria) per nome, categoria, ingredienti e prezzo.
*   **Carrello e Checkout:** Gestione dello stato del carrello in LocalStorage e calcolo tempi di attesa stimati.
*   **Storico Ordini:** Area privata per tracciare lo stato di preparazione e consegna degli ordini in tempo reale.
*   **Motore di Raccomandazione:** Suggerimenti personalizzati in base alle preferenze alimentari (es. Vegetariano, Senza Glutine).

### Lato Ristoratore (Dashboard Privata)
*   **Gestione Anagrafica:** Configurazione del proprio profilo e della vetrina del locale.
*   **Gestione Menu (CRUD):** Inserimento, modifica, eliminazione di piatti personalizzati e gestione sconti temporanei.
*   **Order Management:** Modifica e aggiornamento dello stato degli ordini in entrata (Ordinato, In preparazione, Consegnato).
*   **KPI & Statistiche:** Dashboard analitica basata su *MongoDB Aggregation Pipeline* (Incassi, Top Sellers, Ordini Pendenti).

## Stack Tecnologico

*   **Frontend:** Vanilla JavaScript (ES6+), HTML5, Bootstrap 5.
*   **Backend:** Node.js, Express.js.
*   **Database:** MongoDB, Mongoose ODM.
*   **Sicurezza:** JWT (JSON Web Tokens), Bcrypt (Hashing password), Prevenzione XSS (escapeHTML), Role-Based Access Control (RBAC).

## Installazione e Avvio (Sviluppo Locale)

1. **Clona il repository**
   ```bash
   git clone [https://github.com/tuo-username/nome-repo.git](https://github.com/tuo-username/nome-repo.git)
   cd nome-repo
   ```

2. **Installa le dipendenze del backend**
   ```bash
   npm install
   ```

3. **Configurazione Variabili d'Ambiente**
   Crea un file `.env` nella root del progetto prendendo spunto da `.env.example`:
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<user>:<password>@tuocluster.mongodb.net/nomedb
   JWT_SECRET=tua_chiave_segreta_fortissima
   ```

4. **Avvia il server**
   ```bash
   npm start
   # oppure usando nodemon per l'hot-reload
   npm run dev
   ```

5. **Visualizza l'App**
   Apri il browser e naviga su: `http://localhost:3000`

## Sicurezza Implementata
*   **Password Hashing:** Nessuna password in chiaro, salvataggio tramite `bcrypt`.
*   **Auth Stateless:** Autenticazione garantita da *JSON Web Tokens (JWT)*.
*   **IDOR Prevention:** Controllo rigoroso sulla *Data Ownership* in ogni rotta (l'utente può modificare solo i *propri* dati/ordini).
*   **XSS Protection:** Funzioni di escape native prima del binding HTML lato frontend per prevenire injection malevole.
*   **Mass Assignment Protection:** Payload di aggiornamento de-strutturati e filtrati per evitare l'escalation dei privilegi.

## Documentazione API (Swagger)
Le API RESTful del backend sono completamente documentate con Swagger. 
Una volta avviato il server, è possibile testare gli endpoint visitando:
`http://localhost:3000/api-docs`