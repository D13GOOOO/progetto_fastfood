const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Meal = require('./models/Meal');

const mongoURI = 'mongodb://127.0.0.1:27017/fastfood';

// Connessione al Database
mongoose
    .connect(mongoURI)
    .then(async () => {
        console.log("Connesso a MongoDB. Importazione in corso...");

        try {
            // Lettura dati da JSON
            const filePath = path.join(__dirname, '../data/meals 1.json');
            const rawData = fs.readFileSync(filePath);
            const mealsData = JSON.parse(rawData);

            // Reset collezione Meal
            await Meal.deleteMany({});
            console.log('Database pulito.');

            // Rimozione ID esistenti
            const piattiPuliti = mealsData.map((piatto) => {
                delete piatto._id;
                return piatto;
            });

            // Inserimento nuovi documenti
            await Meal.insertMany(piattiPuliti);
            console.log(`${piattiPuliti.length} piatti inseriti correttamente.`);

        } catch (error) {
            console.error("Errore importazione:", error);
        } finally {
            // Chiusura connessione
            mongoose.disconnect();
            console.log('Operazione terminata.');
        }
    })
    .catch((errore) => {
        console.error('Errore connessione MongoDB:', errore);
    });