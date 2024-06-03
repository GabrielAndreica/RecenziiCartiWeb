const mongoose = require('mongoose');

// Definirea schemei pentru modelul 'Carte'
const carteSchema = new mongoose.Schema({
    titlu: {
        type: String,
        required: true
    },
    descriere: {
        type: String,
        required: true
    },
    categorie: {
        type: String,
        required: true
    },
    imagine: {
        type: String,
        required: true
    }
});

// Definirea modelului 'Carte' folosind schema definită
const Carte = mongoose.model('cartis', carteSchema);

// Exportarea modelului pentru a putea fi utilizat în alte module
module.exports = Carte;
