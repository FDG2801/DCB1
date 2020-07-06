const Joi = require('@hapi/joi');
const bcrypt = require('bcryptjs');
const mailer = require("../nodeMailer");
var autenticazioneDAO = require('../dao/autenticazioneDAO');
var funzionalitaDAO = require('../dao/funzionalitaDAO');
var autenticazioneControl = require('./gestioneAutenticazione');
var sessionHandler = require('../sessionHandler');
var fileHandler = require('../fileHandler');

// --- --- Funzioni per la gestione delle funzionalità degli account:
// --- Mostra area riservata
exports.accediAreaRiservata = function(req, res) {
    autenticazioneDAO.richiestaUtente(JSON.parse(req.query.sessionData).idUtente, function(datiUtente, msg) {
        if (msg === "OK") {
            let dati = datiUtente[0];
            let percorsoFoto = '';
            if (dati.foto === fileHandler.defaultAvatar || dati.foto == null) {
                percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultAvatar;
            }
            else {
                percorsoFoto = fileHandler.percorsoAvatar + dati.foto;
            }
            dati["percorsoFoto"] = percorsoFoto;

            res.send({success : true, datiUtente: dati, message : "Ok"});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: non sono stati trovati dati relativi all'utente richiesto."});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati dell'utente: " + msg});
        }
    });
}

// --- Modifica Password
exports.modificaPassword = function(req, res) {
    const schema = Joi.object({
        passwordVecchia : Joi.string().min(8).max(255).required(),
        passwordNuova : Joi.string().min(8).max(255).required()
    });

    sess = JSON.parse(req.query.sessionData);

    let obj = {
        passwordVecchia: req.query.passwordVecchia, 
        passwordNuova: req.query.passwordNuova
    }

    const check = schema.validate(obj);

    if (check.error === undefined) {
        autenticazioneDAO.richiediInfoAutenticazione(sess.email, function(queryResult, msg) {
            if (msg === "OK") {
                bcrypt.compare(req.query.passwordVecchia, queryResult[0].passwordUtente, function(err, isSame) {
                    if (isSame) {
                        bcrypt.hash(req.query.passwordNuova, 5, function(err, hashPassword) {
                            if (err) {
                                res.send({success: false, message: err});
                            }
                            else {
                                funzionalitaDAO.modificaPassword(queryResult[0].ID_Utente, hashPassword, function(result, msg) {
                                    if (msg == "OK") {
                                        res.send({success: true, message: "Password aggiornata con successo!"});
                                    }
                                    else {
                                        res.send({success: false, message: "Errore nella modifica della password: " + msg});
                                    }
                                }); 
                            }
                        });
                    }
                    else {
                        res.send({success: false, message: "Errore: la password vecchia non è corretta."});
                    }
                });
            }
            else {
                res.send({success: false, message: "Errore nella richiesta delle informazioni di autenticazione: " + msg});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: una delle password non è nel formato corretto."});
    }
}

// --- Modifica profilo:
exports.modificaProfilo = function(req, res) {
    let fileEsistente = false;
    if (req.file) {
        fileEsistente = true;
    }

    if (fileEsistente) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msgLogin) {
                    if (msgLogin === "OK") {
            
                        const schema = Joi.object({
                            numeroTelefono: Joi.string().max(20).required()
                        });
                    
                        sess = JSON.parse(req.body.sessionData);
                        numeroTelefono = req.body.telefono;
                    
                        let check = schema.validate({
                            numeroTelefono: numeroTelefono
                        });
                    
                        if (check.error === undefined) {
                            autenticazioneDAO.richiediInfoAutenticazione(sess.email, function(result, msg) {
                                if (msg === "OK") {
                                    let prevAvatar = null;
                                    autenticazioneDAO.richiestaUtente(sess.idUtente, function(qResult, msg) {
                                        if (msg == "OK") {
                                            prevAvatar = qResult[0].foto;
                                        }
                                        else {
                                            res.send({success: false, message: "Errore nella richiesta dei dati dell'utente: " + msg});
                                        }
                                    });
                                    funzionalitaDAO.modificaProfiloUtente(sess.idUtente, req.file.filename, 
                                        numeroTelefono, function(queryResult, msg) {
                                        if (msg === "OK") {
                                            fileHandler.eliminaAvatarUtente(prevAvatar, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: true, message: "Profilo modificato con successo."});
                                        }
                                        else {
                                            fileHandler.eliminaAvatarUtente(req.file.filename, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: false, message: "Errore nella modifica del profilo: " + msg});
                                        }
                                    });
                                }
                                else {
                                    fileHandler.eliminaAvatarUtente(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Errore nella richiesta di informazioni di autenticazione: " + msg});
                                }
                            });
                        }
                        else {
                            fileHandler.eliminaAvatarUtente(req.file.filename, function(msg) {
                                console.log(msg);
                            });
                            res.send({success: false, message: "Errore: il numero di telefono non è in formato valido."});
                        }
                    }
                    else {
                        fileHandler.eliminaAvatarUtente(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Errore: utente non loggato."});
                    }
                });
            }
            else {
                res.send({success: false, message: "Errore: l'estensione del file inserito non è valida."});
            }
        });
    }
    else {
        autenticazioneControl.checkIfLoggedIn_body(req, function(msgLogin) {
            if (msgLogin === "OK") {
    
                const schema = Joi.object({
                    numeroTelefono: Joi.string().max(20).required()
                });
            
                sess = JSON.parse(req.body.sessionData);
                numeroTelefono = req.body.telefono;
            
                let check = schema.validate({
                    numeroTelefono: numeroTelefono
                });
            
                if (check.error === undefined) {
                    autenticazioneDAO.richiediInfoAutenticazione(sess.email, function(result, msg) {
                        if (msg === "OK") {
                            let prevAvatar = null;
                            autenticazioneDAO.richiestaUtente(sess.idUtente, function(qResult, msg) {
                                if (msg == "OK") {
                                    prevAvatar = qResult[0].foto;
                                }
                                else {
                                    res.send({success: false, message: "Errore nella richiesta dei dati dell'utente: " + msg});
                                }
                            });
                            funzionalitaDAO.modificaProfiloUtente(sess.idUtente, prevAvatar, 
                                numeroTelefono, function(queryResult, msg) {
                                if (msg === "OK") {
                                    res.send({success: true, message: "Profilo modificato con successo."});
                                }
                                else {
                                    res.send({success: false, message: "Errore nella modifica del profilo: " + msg});
                                }
                            });
                        }
                        else {
                            res.send({success: false, message: "Errore nella richiesta di informazioni di autenticazione: " + msg});
                        }
                    });
                }
                else {
                    res.send({success: false, message: "Errore: il numero di telefono non è in formato valido."});
                }
            }
            else {
                res.send({success: false, message: "Errore: utente non loggato."});
            }
        });
    }
}
    
// --- Diventa Host
exports.diventaHost = function(req, res) {
    if (req.file) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg", ".pdf"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msgLogin) {
                    if (msgLogin === "OK") {

                        let schema = Joi.object({
                            cf: Joi.string().min(16).max(16).required(),
                            tipo: Joi.string().required()
                        });
                        sess = JSON.parse(req.body.sessionData);
                        cf = req.body.codiceFiscale;
                        tipo = req.body.tipoDocumento;
                    
                        let check = schema.validate({
                            cf: cf,
                            tipo: tipo
                        });
                    
                        if (check.error === undefined) {
                            autenticazioneDAO.richiediInfoAutenticazione(sess.email, function(autResult, msg) {
                                if (msg === "OK") {
                                    let prevDoc = null;
                                    funzionalitaDAO.richiediRichiestaHost(sess.idUtente, function(qResult, msg) {
                                        if (msg === "OK") {
                                            prevDoc = qResult[0].scansioneDocumento;
                                        }
                                    });
                                    funzionalitaDAO.diventaHost(sess.idUtente, cf, req.file.filename, tipo, function(insResult, msg) {
                                        if (msg === "OK") {
                                            if (prevDoc != null) {
                                                fileHandler.eliminaDocHost(prevDoc, function(msg) {
                                                    console.log(msg);
                                                });
                                            }
                                            res.send({success: true, message: "Richiesta eseguita con successo!"});
                                        }
                                        else {
                                            fileHandler.eliminaDocHost(req.file.filename, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: false, message: "Errore nell'aggiunta dei dati dell'host: " + msg});
                                        }
                                    });
                                }
                                else if (msg == "NO_RESULT") {
                                    fileHandler.eliminaDocHost(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Utente non esistente."});
                                }
                                else {
                                    fileHandler.eliminaDocHost(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Errore nella richiesta dei dati di autenticazione: " + msg});
                                } 
                            });
                        }   
                        else {
                            fileHandler.eliminaDocHost(req.file.filename, function(msg) {
                                console.log(msg);
                            });
                            res.send({success: false, message: "Errore: i dati non sono validi."});
                        }
            
                    }
                    else {
                        fileHandler.eliminaDocHost(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Errore: utente non loggato."});
                    }
                });
            }
            else {
                res.send({success: false, message: "Errore: l'estensione del file inserito non è valida."});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: non è stato caricato alcun file."});
    }
}

// --- Elimina Account
exports.eliminaAccount = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    autenticazioneDAO.richiediInfoAutenticazione(req.query.email, function(result, msg) {
        if (msg === "OK") {
            funzionalitaDAO.richiediEmailRimborso(result[0].idUtente, function(mailResult, msg) {
                if (msg === "OK" || msg === "NO_RESULT") {
                    funzionalitaDAO.richiediEmailAvvisoAnnullamento(result[0].idUtente, function(mailResult2, msg) {
                        if (msg === "OK" || msg === "NO_RESULT") {
                            mailer.inviaMailRimborso(mailResult, mailResult2, result[0], function(error, msg) {
                                if (msg === "250 Ok") {
                                    funzionalitaDAO.eliminaUtente(result[0].ID_Utente, function(result, msg) {
                                        if (msg === "OK") {
                                            let mailList = [];

                                            mailResult.forEach(function(item) {
                                                mailList.push({email: item.email, importo: item.ImportoTotale});
                                            });

                                            let testoRimborso = "Ci dispiace che tu abbia eliminato il tuo account!\n" +
                                                "Siamo sicuri che avrai avuto i tuoi motivi, e se tra di essi ce ne " +
                                                "sono di inerenti a delle insoddisfazioni riguardanti il nostro sito " +
                                                "ti preghiamo, se ne hai voglia, di contattarci per darci un feedback " +
                                                "in modo da poterlo migliorare.\n" +
                                                "Ti auguriamo buona fortuna nei tuoi futuri viaggi!";
                                            
                                            if (sess.isHost && mailList.length > 0) {
                                                let testoRimborso = "\nTi ricordiamo che, in qualità di host, hai il dovere di rimborsare " +
                                                    "gli utenti che hanno eseguito delle prenotazioni presso i tuoi immobili e che hanno " +
                                                    "effettuato dei pagamenti per le loro prenotazioni. Di seguito una lista contenente " +
                                                    "gli indirizzi e-mail degli utenti da rimborsare e i relativi importi:\n\n";
                                                mailList.forEach(function(item) {
                                                    testoRimborso = testoRimborso + "E-mail utente: " + item.email + ", quantità da rimborsare: €" + item.importo + "\n"
                                                });

                                                mailer.inviaMail(sess.email, "Informazioni per rimborso utenti", 
                                                    testoRimborso,
                                                    function(error, message) {
                                                        console.log(message);
                                                });
                                            }

                                            mailer.inviaMail(sess.email, "Notifica eliminazione account", 
                                                "Ci dispiace che tu abbia eliminato il tuo account!\n" +
                                                "Siamo sicuri che avrai avuto i tuoi motivi, e se tra di essi ce ne " +
                                                "sono di inerenti a delle insoddisfazioni riguardanti il nostro sito " +
                                                "ti preghiamo, se ne hai voglia, di contattarci per darci un feedback " +
                                                "in modo da poterlo migliorare.\n" +
                                                "Ti auguriamo buona fortuna nei tuoi futuri viaggi!",
                                            function(error, message) {
                                                console.log(message);
                                            });

                                            sessionHandler.cancellaSessione(sess);
                                            res.send({success: true, message: "Utente eliminato con successo."});
                                        }
                                        else {
                                            res.sens({success: false, message: "Errore nell'eliminazione dell'account: " + msg});
                                        }
                                    });
                                }
                                else {
                                    res.send({success: false, message: "Errore nell'invio delle e-mail degli utenti da avvisare: " + msg})
                                }
                            });
                        } 
                        else {
                            res.send({success: false, message: "Errore nella richiesta delle e-mail degli utenti da avvisare: " + msg});
                        }
                    });
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta delle e-mail degli utenti da rimborsare: " + msg});
                }
            });            
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: utente inesistente"});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati di autenticazione: " + msg});
        }
    });
}

// --- Visualizza prenotazioni effettuate
exports.richiediPrenotazioniEffettuate = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    funzionalitaDAO.richiediPrenotazioniArchiviate(sess.idUtente, function(prenArchiviate, msgA) {
        if (msgA === "OK" || msgA === "NO_RESULT") {
            funzionalitaDAO.richiediPrenotazioniDaEstinguere(sess.idUtente, function(prenDaEstinguere, msgB) {
                if (msgB === "OK" || msgB === "NO_RESULT") {
                    funzionalitaDAO.richiediPrenotazioniPendenti(sess.idUtente, function(prenPendenti, msgC) {
                        if (msgC === "OK" || msgC === "NO_RESULT") {
                            let prenArch = [];
                            let prenEst = [];
                            let prenPend = [];

                            if (msgA === "OK") {
                                prenArchiviate.forEach(function(item) {
                                    let percorsoFoto = '';
                                    if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                    }
                                    else {
                                        percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                                    }
                                    item["percorsoFoto"] = percorsoFoto;
                                });
                                prenArch = prenArchiviate;
                            }
                            if (msgB === "OK") {
                                prenDaEstinguere.forEach(function(item) {
                                    let percorsoFoto = '';
                                    if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                    }
                                    else {
                                        percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                                    }
                                    item["percorsoFoto"] = percorsoFoto;
                                });
                                prenEst = prenDaEstinguere;
                            }
                            if (msgC === "OK") {
                                prenPendenti.forEach(function(item) {
                                    let percorsoFoto = '';
                                    if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                    }
                                    else {
                                        percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                                    }
                                    item["percorsoFoto"] = percorsoFoto;
                                });
                                prenPend = prenPendenti;
                            }

                            res.send({
                                success: true, 
                                prenotazioniArchiviate: JSON.stringify(prenArch),
                                prenotazioniDaEstinguere: JSON.stringify(prenEst),
                                prenotazioniPendenti: JSON.stringify(prenPend), 
                                message: "Prenotazioni trovate!"
                            });
                        }
                        else {
                            res.send({success: false, message: "Errore nella richiesta delle prenotazioni pendenti: " + msgC});
                        }
                    });                    
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta delle prenotazioni ad estinguere: " + msgB});
                }
            });
        }
        else {
            res.send({success: false, message: "Errore nella richiesta delle prenotazioni archiviate: " + msgA});
        }
    });
}

// --- Visualizza prenotazioni ricevute
exports.richiediPrenotazioniRicevute = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    funzionalitaDAO.richiediPrenotazioniRicevute(sess.idUtente, function(prenotazioniDaValutare, msgA) {
        if (msgA === "OK" || msgA === "NO_RESULT") {
            funzionalitaDAO.richiediPrenotazioniRicevute_Archiviate(sess.idUtente, function(prenotazioniArchiviate, msgB) {
                if (msgB === "OK" || msgB === "NO_RESULT") {
                    let prenDaValutare = [];
                    let prenArchiviate = [];
                    if (msgA === "OK") {
                        prenotazioniDaValutare.forEach(function(item) {
                            let percorsoFoto = '';
                            if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                                percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                            }
                            else {
                                percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                            }
                            item["percorsoFoto"] = percorsoFoto;
                        });
                        prenDaValutare = prenotazioniDaValutare;
                    }
                    if (msgB === "OK") {
                        prenotazioniArchiviate.forEach(function(item) {
                            let percorsoFoto = '';
                            if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                                percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                            }
                            else {
                                percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                            }
                            item["percorsoFoto"] = percorsoFoto;
                        });
                        prenArchiviate = prenotazioniArchiviate;
                    } 

                    res.send({
                        success: true, 
                        prenotazioniDaValutare: JSON.stringify(prenotazioniDaValutare), 
                        prenotazioniArchiviate: JSON.stringify(prenotazioniArchiviate), 
                        message: "Prenotazioni trovate!"
                    });
                }
                else {
                    res.send({
                        success: false,  
                        message: "Errore nella richiesta delle prenotazioni archiviate: " + msgB
                    });
                }
            });   
        }
        else {
            res.send({
                success: false,  
                message: "Errore nella richiesta delle prenotazioni da valutare: " + msgA
            });
        }
    });
}