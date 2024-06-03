const express = require('express');
const path = require('path');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Adăugăm jwt
const router = express.Router();
const User = require('./user');
const Carte = require('./carte');
const carteRoutes = require('./carti'); // Importă rutele pentru cărți
const app = express();
const port = 3000;
const publicDir = path.join(__dirname, 'public'); // Calea către directorul public
const server = http.createServer(app);
const io = socketIo(server);
const MongoStore = require('connect-mongo')(session);


// Ascultă evenimentul de conectare a unui client WebSocket
io.on('connection', (socket) => {
    console.log('Utilizator conectat');

    // Ascultă evenimentul de deconectare a unui client WebSocket
    socket.on('disconnect', () => {
        console.log('Utilizator deconectat');
    });

    // Ascultă evenimentul de mesaj primit de la client
    socket.on('chat message', (msg) => {
        console.log('Mesaj primit:', msg);
        // Transmite mesajul către toți clienții conectați
        io.emit('chat message', msg);
    });
});

const portchat = process.env.PORT || 3001;

// Serverul ascultă pe portul definit
server.listen(portchat, () => {
    console.log(`Serverul WebSocket rulează pe portul ${portchat}`);
});

// Conectarea la baza de date MongoDB
mongoose.connect('mongodb://localhost:27017/Utilizatori', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectat la baza de date MongoDB!'))
    .catch(err => console.error('Eroare la conectarea la MongoDB:', err));



// Configurare middleware pentru express-session cu connect-mongo versiunea 3
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ 
        mongooseConnection: mongoose.connection,
        collection: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 zile
    })
}));

// Middleware-uri
app.use(express.static(publicDir));
app.use(express.json());
app.use('/api', carteRoutes); // Prefix pentru ruta de cărți
app.use(express.urlencoded({ extended: true }));

// Configurare Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Configurarea strategiei locale de autentificare
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { message: 'Nume de utilizator incorect.' });
            }
            if (user.password !== password) {
                return done(null, false, { message: 'Parolă incorectă.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Middleware pentru generarea token-ului JWT după autentificare cu succes
const generateToken = (user) => {
    return jwt.sign({ id: user.id, username: user.username }, 'jwtSecret', { expiresIn: '1h' });
};

// Serializarea și deserializarea utilizatorului
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});


// Rute

// Rute

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login'); // sau orice altă rută pentru autentificare
}

// Ruta GET pentru pagina chat.html
app.get('/chat', (req, res) => {
    res.render('chat', { username: req.user.username });
});

// Ruta POST pentru trimiterea mesajelor din formularul chat.html
app.post('/chat', (req, res) => {
    // Aici poți prelua mesajul trimis de client și puteți face orice altceva este necesar cu aceste date
    const message = req.body.message;
    console.log('Mesaj primit:', message);
    // Întoarce un răspuns de succes sau altceva în funcție de necesități
    res.send('Mesaj primit cu succes!');
});

app.use('/api/carti', carteRoutes); // Prefix pentru ruta de cărți


// Servește pagina HTML a detaliilor cărții
app.get('/carte/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'carte.html'));
});

// Ruta pentru a obține toți utilizatorii
router.get('/users', async (req, res) => {
    try {
        const users = await User.find(); // obține toți utilizatorii din baza de date
        res.json(users); // trimite lista de utilizatori înapoi către client în format JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare la obținerea utilizatorilor.' });
    }
});

// Adaugă alte rute pentru operații CRUD (Create, Read, Update, Delete)

module.exports = router;


app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        // Creează un nou utilizator folosind datele primite din formular
        const newUser = new User({ username, email, password });
        
        // Salvează utilizatorul în baza de date
        await newUser.save();
        
        // Redirectează utilizatorul către pagina de autentificare după înregistrare
        res.redirect('/login');
    } catch (error) {
        // Tratează erorile de salvare în baza de date
        console.error('Eroare la salvarea utilizatorului:', error);
        res.status(500).send('Eroare la salvarea utilizatorului.');
    }
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html')); 
  })

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html')); 
  })

/*app.post('/login', passport.authenticate('local', {
    successRedirect: '/lista-carti',
    failureRedirect: '/login',
    failureFlash: true
}));*/

// Ruta pentru autentificare cu JWT
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: 'Autentificare eșuată.' });
        }
        const token = generateToken(user);
        res.cookie('jwtToken', token, { httpOnly: true });
        // Redirecționează către pagina lista-carti după autentificare cu succes
        res.redirect('/lista-carti');
    })(req, res, next);
});

// Middleware pentru validarea token-ului JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Acces interzis. Token lipsește.' });
    }
    jwt.verify(token, 'jwtSecret', (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalid.' });
        }
        req.user = decoded;
        next();
    });
};

// Ruta protejată care necesită un token JWT valid
app.get('/protected', verifyToken, (req, res) => {
    // Redirecționează către pagina lista-carti
    res.redirect('/lista-carti');
});

// Ruta pentru deconectare
app.get('/logout', (req, res) => {
    // Șterge cookie-ul care conține token-ul
    res.clearCookie('jwtToken');
    // Redirecționează către pagina de conectare sau unde dorești tu
    res.redirect('/login');
});



app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard-client.html')); 
    } else {
        res.redirect('/login');
    }
});

app.get('/lista-carti', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lista-carti.html'));
});

// Definește o rută GET pentru a obține toți utilizatorii
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find(); // Obține toți utilizatorii din baza de date
        res.json(users); // Răspunde cu lista de utilizatori în format JSON
    } catch (error) {
        console.error('Eroare la obținerea utilizatorilor:', error);
        res.status(500).json({ error: 'Eroare la obținerea utilizatorilor.' });
    }
});

/*const cartile = [
    {
        titlu: 'Cartea 4',
        descriere: 'Descrierea cărții 1.',
        categorie: 'Ficțiune',
        imagine: 'https://via.placeholder.com/150'
    },
    {
        titlu: 'Cartea 5',
        descriere: 'Descrierea cărții 2.',
        categorie: 'Non-Ficțiune',
        imagine: 'https://via.placeholder.com/150'
    },
    {
        titlu: 'Cartea 6',
        descriere: 'Descrierea cărții 3.',
        categorie: 'Istorie',
        imagine: 'https://via.placeholder.com/150'
    }
];

Carte.insertMany(cartile)
    .then(docs => {
        console.log('Cărțile au fost inserate:', docs);
    })
    .catch(err => {
        console.error('Eroare la inserarea cărților:', err);
    });*/


// Pornirea serverului
app.listen(port, () => {
    console.log(`Serverul rulează la adresa http://localhost:${port}`);
});
