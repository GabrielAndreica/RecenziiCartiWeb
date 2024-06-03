const express = require('express');
const router = express.Router();
const Carte = require('./carte'); // Asigură-te că modelul este la calea corectă

// Endpoint pentru a obține toate cărțile sau pentru filtrare după categorie
router.get('/carti', async (req, res) => {
    try {
        const categorie = req.query.categorie;
        let carti;
        if (categorie && categorie !== 'Toate') {
            carti = await Carte.find({ categorie: categorie });
        } else {
            carti = await Carte.find();
        }
        res.json(carti);
    } catch (error) {
        res.status(500).json({ message: 'Eroare la obținerea cărților' });
    }
});

// Ruta pentru obținerea detaliilor unei cărți
router.get('/carti/:id', async (req, res) => {
    try {
        const carte = await Carte.findById(req.params.id);
        if (!carte) {
            return res.status(404).json({ error: 'Cartea nu a fost găsită.' });
        }
        res.json(carte);
    } catch (error) {
        console.error('Eroare la obținerea detaliilor cărții:', error);
        res.status(500).json({ error: 'Eroare la obținerea detaliilor cărții.' });
    }
});

module.exports = router;
