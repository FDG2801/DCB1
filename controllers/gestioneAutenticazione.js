const Joi = require('@hapi/joi');
const bcrypt = require('bcryptjs');
const autenticazioneDAO = require("../dao/autenticazioneDAO");
const passwordGenerator = require("generate-password");
const mailer = require("../nodeMailer");
var session = require('express-session');
var sessionHandler = require('../sessionHandler');
const fileHandler = require('../fileHandler');

// --- Funzioni per la gestione di Autenticazione:
// Funzione per l'inserimento di un utente nel DB
exports.creaUtente = function(req, res) {
    const schema = Joi.object({
        email : Joi.string().max(255).email().required(),
        passwordUtente : Joi.string().min(8).max(255).required(),
        nome : Joi.string().min(2).max(50).required(),
        cognome : Joi.string().min(2).max(50).required(),
        dataNascita : Joi.required()
    });

    const result = schema.validate(req.query);

    console.log(result);
    
    if (result.error === undefined) {
        const data = req.query;

        autenticazioneDAO.utenteGiaEsistente(req.query.email, function(exists) {
            if (!exists) {
                bcrypt.hash(data.passwordUtente, 5, function(err, hashPassword) {
                    autenticazioneDAO.inserisciUtente(data.email, hashPassword, data.nome, data.cognome, data.dataNascita, function(result, msg) {
                        if (msg === "OK") {
                            mailer.inviaMail(req.query.email, 
                                'DCBooking - Registrazione Account',
                                'Benvenuto ' + req.query.nome + " " + req.query.cognome + 
                                "!\nGrazie per esserti iscritto al nostro sito. Speriamo di poterti aiutare nei tuoi prossimi viaggi.\n " +
                                "Qualora dovessi dimenticare la tua password utilizza il nostro servizio di recupero password nell'area di autenticazione." + 
                                "\n\nSe sei interessato a lavorare con noi e affittare le tue case o BnB, entra nel sito, accedi alla tua area riservata e clicca su \"Diventa un'host\"!",
                                function(error, response) {
                                if (response == "250 Ok") {
                                    res.send({success : true, message: "Utente registrato con successo!"});
                                }
                                else {
                                    res.send({success : false, message: "Errore nell'invio della mail: " + error});
                                }
                            });
                        }
                        else {
                            res.send({success : false, message: "Errore nell'inserimento dell'utente:" + msg});
                        }
                    });
                });
            }
            else {
                res.send({success: false, message: "Errore: esiste già un utente con l'e-mail inserita"});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: " + result.error.details[0].message});
    }
}

// Funzione per effettuare il login dell'utente
exports.loginUtente = function(req, res) {
    const schema = Joi.object({
        email : Joi.string().email(),
        passwordUtente : Joi.string()
    });

    const checkEmail = schema.validate(req.query);

    if (checkEmail.error === undefined) {
        autenticazioneDAO.richiediInfoAutenticazione(req.query.email, function(queryResult, msg) {
            if (msg == 'OK') {
                bcrypt.compare(req.query.passwordUtente, queryResult[0].passwordUtente, function(err, isSame) {
                    if (isSame) {
                        autenticazioneDAO.controllaHost(queryResult[0].ID_Utente, function(resultHost, msg) {
                            if (msg == 'NO_RESULT') {
                                let dat = {
                                    idUtente : queryResult[0].ID_Utente,
                                    email : queryResult[0].email,
                                    isHost : false,
                                    restrizioni : false
                                };
                                sessionHandler.aggiungiSessione(dat);
                                res.send({success : true, session : dat, message : "Utente loggato con successo!"});
                            }
                            else if (msg == 'OK') {
                                let dat = {
                                    idUtente : queryResult[0].ID_Utente,
                                    email : queryResult[0].email,
                                    isHost : true,
                                    restrizioni : (resultHost[0].restrizioni == 0)? false : true
                                };
                                sessionHandler.aggiungiSessione(dat);
                                res.send({success : true, session : dat, message : "Host loggato con successo!"});
                            }
                            else {
                                res.send({success : false, message : "Errore nel controllo host: " + msg});
                            }
                        });
                    }
                    else {
                        res.send({success : false, message : "Errore: la password non è corretta."});
                    }
                });
            }
            else {
                res.send({success : false, message : "Errore nella richiesta delle informazioni di autenticazione: " + msg});
            }
        });
    }
    else {
        res.send({success : false, message : "Errore: l'email non è in un formato valido."});
    }
}

// Funzione per il logout
exports.logoutUtente = function(req, res) {
    sessionHandler.cancellaSessione(JSON.parse(req.query.sessionData));

    res.send({success : true, message : "Logout eseguito con successo."});
}

// Funzione per il recupero della password; genera automaticamente una password
exports.recuperoPassword = function(req, res) {
    const schema = Joi.object({
        email : Joi.string().email()
    });

    const checkEmail = schema.validate(req.query);

    if (checkEmail.error === undefined) {
        var newPassword = passwordGenerator.generate({
            length : 12,
            numbers : true,
            uppercase : true,
            lowercase : true
        });

        autenticazioneDAO.utenteGiaEsistente(req.query.email, function(exists) {
            if (exists) {
                bcrypt.hash(newPassword, 5, function(err, cryptedPassword) {
                    autenticazioneDAO.aggiornaPassword(req.query.email, cryptedPassword, function(result, msg) {
                        if (msg == 'OK') {
                            mailer.inviaMail(req.query.email, 
                                'DCBooking - Recupero Password',
                                'Ciao,\nQui di seguito la nuova password che è stata generata:\n\n' +
                                newPassword + 
                                '\n\nPuoi accedere al tuo account con questa password e cambiarla a tuo piacimento.',
                                function(error, response) {
                                if (response == "250 Ok") {
                                    res.send({success : true, message : "Password cambiata con successo, controlla la tua casella di posta."});
                                }
                                else {
                                    res.send({success : false, message : "Errore nell'invio della e-mail: " + error});
                                }
                            });
                        }
                        else {
                            res.send({success : false, message : "Errore nell'aggiornamento password: " + msg});
                        }
                    }); 
                });
            }
            else {
                res.send({success: false, message: "Non esiste un utente con la e-mail inserita."});
            }
        });
    }
    else {
        res.send({success : false, message : "Errore: l'email non è in un formato valido."});
    }
}

// Funzione per controllare se l'utente è loggato
exports.checkIfLoggedIn = function(req, res, next) {
    if (req.query.sessionData) {
        sess = JSON.parse(req.query.sessionData);
        if (sessionHandler.esisteSessione(sess)) {
            next();
        }
        else {
            res.send({success : false, message : "Errore: utente non loggato."});
        }
    }
    else {
        res.send({success : false, message : "Errore: non è presente una sessione."});
    }
}

// Funzione per controllare se l'utente è loggato
exports.checkIfLoggedIn_body = function(req, callback) {
    if (req.body.sessionData) {
        sess = JSON.parse(req.body.sessionData);
        if (sessionHandler.esisteSessione(sess)) {
            callback("OK");
        }
        else {
            callback("Utente non loggato, rifare login.");
        }
    }
    else {
        callback("Non è stata inviata nessuna sessione.");
    }
}

exports.checkIfUserIsHost = function(req, res, next) {
    sess = JSON.parse(req.query.sessionData);
    if (sess.isHost) {
        next();
    }
    else {
        res.send({success : false, message : "Errore: Questa funzionalità è esclusiva per gli host."});
    }
}

exports.richiediUtente = function(req, res) {
    sess = JSON.parse(req.query.sessionData);
    if (sess) {
        autenticazioneDAO.richiestaUtente(sess.idUtente, function (result, msg){
            if (msg == 'OK') {
                let percorsoFoto = '';
                if (result[0].foto === fileHandler.defaultAvatar || result[0].foto == null) {
                    percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultAvatar;
                }
                else {
                    percorsoFoto = fileHandler.percorsoAvatar + result[0].foto;
                }
                res.send({success : true, data : JSON.stringify(result[0]), percorsoAvatar: percorsoFoto});
            }
            else {
                res.send({success : false, data : undefined, message: "Errore nella richiesta dei dati dell'utente: " + msg});
            }
        }); 
    }
    else {
        res.send({success : false, message : "Errore: non è presente una sessione."});
    }
}

exports.richiediDatiHost = function(req, res) {
    sess = JSON.parse(req.query.sessionData);
    if (sess) {
        autenticazioneDAO.richiestaDatiHost(sess.idUtente, function (result, msg){
            if (msg == 'OK') {
                res.send({success : true, data : JSON.stringify(result[0]), message : "Trovati dati host"});
            }
            else {
                res.send({success : false, data : undefined, message : "L'utente richiesto non è un host."});
            }
        }); 
    }
    else {
        res.send({success : false, message : "Errore: non è presente una sessione."});
    }
}