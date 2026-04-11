const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Meal = require('./models/Meal');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoURI = process.env.MONGO_URI;

mongoose
    .connect(mongoURI)
    .then(async () => {
        console.log('Connesso a MongoDB Atlas. Importazione in corso...');

        try {
            const filePath = path.join(__dirname, '../data/meals 1.json');

            const rawData = fs.readFileSync(filePath, 'utf8');
            const mealsData = JSON.parse(rawData);

            await Meal.deleteMany({});
            console.log('Database pulito.');

            const piattiPuliti = mealsData.map((piatto) => {
                delete piatto._id;
                piatto.prezzo = parseFloat((Math.random() * 10 + 5).toFixed(2));
                return piatto;
            });

            await Meal.insertMany(piattiPuliti);
            console.log(`${piattiPuliti.length} piatti inseriti correttamente nel Cloud.`);

        } catch (error) {
            console.error('Errore importazione:', error);
        } finally {
            await mongoose.disconnect();
            console.log('Operazione terminata e disconnesso da Atlas.');
        }
    })
    .catch((errore) => {
        console.error('Errore connessione MongoDB Atlas:', errore);
    });