const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Meal = require('./models/Meal');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fastfood';

mongoose
    .connect(mongoURI)
    .then(async () => {
        console.log('Connesso a MongoDB. Importazione in corso...');

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
            console.log(`${piattiPuliti.length} piatti inseriti correttamente.`);

        } catch (error) {
            console.error('Errore importazione:', error);
        } finally {
            await mongoose.disconnect();
            console.log('Operazione terminata.');
        }
    })
    .catch((errore) => {
        console.error('Errore connessione MongoDB:', errore);
    });