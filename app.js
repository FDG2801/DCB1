var express = require('express');
var cors = require('cors');
var path = require('path');
var bodyParser = require('body-parser');

var app = express();

var autenticazioneControl = require('./controllers/gestioneAutenticazione');
var funzionalitaControl = require('./controllers/gestioneFunzionalitaAccount');
var immobiliControl = require('./controllers/gestioneImmobili');
var contabilitaControl = require('./controllers/gestioneContabilita');
var adminControl = require('./controllers/gestioneAdmin');
var ricercaControl = require('./controllers/gestioneRicerca');
var prenotazioneControl = require('./controllers/gestionePrenotazione');
var fileHandler = require('./fileHandler');



app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const isLogged = autenticazioneControl.checkIfLoggedIn;
const isLogged_body = autenticazioneControl.checkIfLoggedIn_body;
const isHost = autenticazioneControl.checkIfUserIsHost;

// --- --- Gestione di tutte le richieste HTTP:
// --- Gestione Account:
// Autenticazione:
app.post('/registrazioneUtente', autenticazioneControl.creaUtente);
app.get('/host', isLogged, isHost, autenticazioneControl.richiediDatiHost);
app.post('/loginUtente', autenticazioneControl.loginUtente);
app.post('/logoutUtente', autenticazioneControl.logoutUtente);
app.post('/recuperoPassword', autenticazioneControl.recuperoPassword);
app.get('/isLoggedIn', isLogged, function(req, res) {
    res.send({success: true, message: "Loggato"});
});

// Funzionalità Account:
app.post('/areaRiservata', isLogged, funzionalitaControl.accediAreaRiservata);
app.post('/modificaPassword', isLogged, funzionalitaControl.modificaPassword);
app.post('/eliminaAccount', isLogged, funzionalitaControl.eliminaAccount);
app.post('/modificaProfilo', fileHandler.uploadAvatarUtente, funzionalitaControl.modificaProfilo);
app.post('/diventaHost', fileHandler.uploadDocHost, funzionalitaControl.diventaHost);
app.get('/prenotazioniEffettuate', isLogged, funzionalitaControl.richiediPrenotazioniEffettuate);
app.get('/prenotazioniRicevute', isLogged, isHost, funzionalitaControl.richiediPrenotazioniRicevute);

// --- Gestione Immobile
app.get('/mieiImmobili', isLogged, immobiliControl.richiediImmobiliHost);
app.post('/inserisciCasa', fileHandler.uploadImmagineImmobile, immobiliControl.inserisciCasa);
app.post('/inserisciBnB', fileHandler.uploadImmagineImmobile, immobiliControl.inserisciBnB);
app.post('/cancellaImmobile', isLogged, isHost, immobiliControl.cancellaImmobile);
app.post('/modificaBnB', fileHandler.uploadImmagineImmobile, immobiliControl.modificaBnB);
app.post('/modificaCasa', fileHandler.uploadImmagineImmobile, immobiliControl.modificaCasa);
app.post('/oscuraImmobile', immobiliControl.oscuraImmobile);
app.post('/rimuoviOscuramentoImmobile', immobiliControl.rimuoviOscuramentoImmobile);
app.get('/visualizzaImmobile', immobiliControl.visualizzaImmobile);

// --- Gestione Contabilità
app.get('/datiContabilita', isLogged, isHost, contabilitaControl.datiContabilita);
app.post('/pagamentoRendiconto', isLogged, isHost, contabilitaControl.effettuaPagamentoRendiconto);
app.get('/totaleTasseRendiconto', isLogged, isHost, contabilitaControl.richiediTotaleTasseRendiconto);
app.get('/comuniDaRendicontare', isLogged, isHost, contabilitaControl.comuniDaRendicontare);

// --- Gestione Admin
app.post('/loginAdmin', adminControl.loginAdmin);
app.get('/richiesteHost', adminControl.controllaLoginAdmin, adminControl.visualizzaRichiestaHost);
app.post('/accettaRichiestaHost', adminControl.accettaRichiestaHost);
app.post('/declinaRichiestaHost', adminControl.declinaRichiestaHost);
app.post('/logoutAdmin', adminControl.logoutAdmin);

// --- Gestione Ricerca
app.get('/ricerca_Comune', ricercaControl.ricerca_Comune);
app.get('/immobiliVetrina', ricercaControl.richiediImmobiliVetrina);

// --- Gestione Prenotazione
app.post('/prenotazioneCasa', fileHandler.uploadDocumentiOspiti, prenotazioneControl.prenotazioneCasa);
app.post('/prenotazioneBnB', fileHandler.uploadDocumentiOspiti, prenotazioneControl.prenotazioneBnB);
app.post('/annullaPrenotazione', isLogged, prenotazioneControl.annullaPrenotazione);
app.get('/modalitaPagamentoPrenotazione', isLogged, prenotazioneControl.richiestaDatiPagamento);
app.post('/effettuaPagamento', isLogged, prenotazioneControl.effettuaPagamento);
app.post('/accettaPrenotazione', isLogged, isHost, prenotazioneControl.accettaPrenotazione);
app.post('/declinaPrenotazione', isLogged, isHost, prenotazioneControl.declinaPrenotazione);
app.get('/riepilogoPrenotazioneHost', isLogged, isHost, prenotazioneControl.riepilogoPrenotazione_Host);
app.get('/riepilogoPrenotazioneUtente', isLogged, prenotazioneControl.riepilogoPrenotazione_Utente);

// --- Route generiche:
app.get('/richiediDatiUtente', autenticazioneControl.richiediUtente);
// --- --- --- //

const adminDAO = require('./dao/adminDAO');

adminDAO.aggiungiAdmin_Init(function(result, msg) {
    if (msg === "OK") {
        console.log("Aggiunti admin con successo!");
    }
    else {
        console.log("Si è verificato un errore nell'inserimento degli admin: " + msg);
    }
});

// --- Inizializza i timer per far scattare i controlli periodici:
const day = 24 * 60 * 60 * 1000;
setInterval(contabilitaControl.avvisoRendicontoTrimestrale, day);
setInterval(prenotazioneControl.annullamentoAutomaticoPrenotazioni, day);
setInterval(prenotazioneControl.avvisoPagamentoSecondaRata, day);

app.listen(1337);
module.exports = app;