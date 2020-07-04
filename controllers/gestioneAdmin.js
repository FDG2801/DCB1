const adminDAO = require('../dao/adminDAO');
const bcrypt = require('bcryptjs');
const fileHandler = require('../fileHandler');
const mailer = require('../nodeMailer');
const sessionHandler = require('../sessionHandler');

// --- Login Admin
exports.loginAdmin = function(req, res) {
    adminDAO.richiediAdmin(req.query.email, function(result, msg) {
        if (msg === "OK") {
            bcrypt.compare(req.query.password, result[0].passwordAdmin, function(err, isSame) {
                if (err) {
                    res.send({success: false, idAdmin: -1, message: "Errore nel controllo della password: " + err});
                }
                else {
                    sessionHandler.aggiungiSessioneAdmin(result[0].ID_Admin);
                    res.send({success: true, idAdmin: result[0].ID_Admin, message: "Admin loggato con successo!"});
                }
            });
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, idAdmin: -1, message: "Credenziali errate."});
        }
        else {
            res.send({success: false, idAdmin: -1, message: "Impossibile trovare admin: " + msg});
        }
    });
}

// --- Visualizza Richieste Host
exports.visualizzaRichiestaHost = function(req, res) {
    adminDAO.richiestePendenti(function (result, msg) {
        if (msg === "OK") {
            result.forEach(function(item) {
                let percorsoFoto = '';
                if (item.foto === fileHandler.defaultAvatar || item.foto == null) {
                    percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultAvatar;
                }
                else {
                    percorsoFoto = fileHandler.percorsoAvatar + item.foto;
                }
                item["percorsoFoto"] = percorsoFoto;

                let percorsoDocs = fileHandler.percorsoDocHost + item.scansioneDocumento;
                item["percorsoDocs"] = percorsoDocs;
            });
            res.send({success: true, richieste: JSON.stringify(result), message: "Richieste trovate."});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: true, richieste: null, message: "Non vi sono richieste pendenti."});
        }
        else {
            res.send({success: false, message: "Errore nella ricerca di richieste pendenti: " + msg});
        }
    });
}

// --- Controlla se l'admin ha eseguito il login (i.e. esiste una sessione)
exports.controllaLoginAdmin = function(req, res, next) {
    if (req.query.idAdmin) {
        if (sessionHandler.esisteSessioneAdmin(req.query.idAdmin)) {
            next();
        }
        else {
            res.send({success: false, message: "Admin non loggato"});
        }
    }
    else {
        res.send({success: false, message: "Errore: nessuna sessione admin trovata"});
    }
}

// --- Accetta richiesta
exports.accettaRichiestaHost = function(req, res) {
    adminDAO.accettaRichiestaPendente(req.query.idUtente, function(result, msg) {
        if (msg === "OK") {
            adminDAO.eliminaRichiestaPendente(req.query.idUtente, function(result, msg) {
                if (msg === "OK") {
                    mailer.inviaMail(req.query.email, "Accettazione richiesta host", 
                    "Congratulazioni! La tua richiesta per diventare host è stata approvata da " 
                    + "uno dei nostri admin. Adesso sarai in grado di mettere in affitto i tuoi immobili.\n"
                    + "Ricordati però che avrai l'obbligo legale di inviare un rendiconto con cadenza almeno "
                    + "trimestrale agli uffici del turismo dei comuni in cui sono situati i tuoi immobili.\n"
                    + "Avrai inoltre la possibilità di visionare i tuoi guadagni mensili, il tutto nella"
                    + "tua nuova area riservata.\n",
                    function(error, response) {
                        if (response == "250 Ok") {
                            res.send({success : true, message : "Richiesta accettata!"});
                        }
                        else {
                            res.send({success : false, message : "Errore nell'invio della mail: " + error});
                        }
                    });
                }
                else {
                    res.send({success : false, message : "Errore nell'eliminazione della richiesta pendente: " + msg});
                }
            });
        }
        else {
            res.send({success: false, message: "Errore nell'accettazione della richiesta: " + msg});
        }
    });
}

// --- Declina richiesta
exports.declinaRichiestaHost = function(req, res) {
    adminDAO.eliminaRichiestaPendente(req.query.idUtente, function(result, msg) {
        if (msg === "OK") {
            mailer.inviaMail(req.query.email, "Declino richiesta host", 
                "Congratulazioni! La tua richiesta per diventare host è stata rifiutata da " 
                + "uno dei nostri admin per i seguenti motivi:\n"
                + req.query.motivazioni,
                function(error, response) {
                    if (response == "250 Ok") {
                        res.send({success : true, message : "Richiesta rifiutata!"});
                    }
                    else {
                        res.send({success : false, message : "Errore nell'invio della mail: " + error});
                    }
            });
        }
        else {
            res.send({success: false, message: "Errore nell'eliminazione della richiesta pendente: " + msg});
        }
    });
}

// --- Logout Admin
exports.logoutAdmin = function(req, res) {
    sessionHandler.cancellaSessioneAdmin(req.query.idAdmin);
    res.send({success: true, message: "Logout admin eseguito con successo!"});
}