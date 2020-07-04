var express = require('express');
var mysql = require('mysql');
var cors = require('cors');
var session = require('express-session');
var uuid = require('node-uuid');

var app = express();

app.use(session({
    genid : function(req) {
        var timestamp = Date.now();
        var id = uuid.v4();
        var sessionID = id + '$' + timestamp;
        return sessionID;
    },
    secret : "soloEquijoin",
    idUtente : null,
    email : null,
    isHost : null,
    restrizioni : null,
    idAdmin : null,
    cookie : {
        maxAge : 5 * 60 * 1000
    }
}));

var autenticazioneControl = require('./controllers/gestioneAutenticazione');
var funzionalitaControl = require('./controllers/gestioneFunzionalitaAccount');
const bodyParser = require('body-parser');

// Then use it before your routes are set up:
app.use(cors());
// parsing body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

const isLogged = autenticazioneControl.checkIfLoggedIn;

// --- Gestione di tutte le richieste HTTP:
// Autenticazione:
app.post('/registrazioneUtente', autenticazioneControl.creaUtente);
app.get('/utente', isLogged, autenticazioneControl.richiediUtente);
app.get('/host', isLogged, autenticazioneControl.richiediDatiHost);
app.post('/loginUtente', autenticazioneControl.loginUtente);
app.get('/logoutUtente', autenticazioneControl.logoutUtente);
app.post('/recuperoPassword', autenticazioneControl.logoutUtente);

// Funzionalità Account:
app.get('/areaRiservata', isLogged, funzionalitaControl.accediAreaRiservata);

// Gestione Funzionalità Account:
/*
    Casi d'uso:
    - Mostra area riservata (richiedi solo i dati dell'utente e dell'host?)
    - Modifica profilo (come modifichiamo solo i dati cambiati? Richiedi l'utente prima? Inoltre: caricamento foto!)
    - Modifica password (ok, una funzione basta; ricordarsi del controllo se la password vecchia è corretta)
    - Elimina account (ok)
    - Diventa host (caricamento file!)
    - Visualizza prenotazioni effettuate ()
    - Visualizza prenotazioni ricevute (solo host; c'è la query, ritorniamo tutte le tuple con match)
*/

// --- //
app.get('/', function(req, resp){
    connection.query("SELECT * FROM utente", function(error, rows, field) {
        if(!!error){
            console.log('Errore nella query');
        } else {
            console.log("Query riuscita");
            console.log(rows);
            //resp.send("Ciao! Questa è una risposta dal DB diretta a: " + rows[0].Nome
            //+ ", " +  rows[1].Nome + ", " +  rows[2].Nome + ", " +  rows[3].Nome);
            resp.json(rows);
        }
    });
})

app.listen(1337);
