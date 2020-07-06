var immobiliDAO = require('../dao/immobiliDAO');
var autenticazioneControl = require('./gestioneAutenticazione');
var Joi = require('@hapi/joi');
var fileHandler = require('../fileHandler');
var mailer = require('../nodeMailer');

// --- Funzionalità per la gestione di immobili di un host
// --- Richiedi tutti gli immobili dell'host:
exports.richiediImmobiliHost = function(req, res) {
    sess = JSON.parse(req.query.sessionData);
    if (sess.idUtente) {
        immobiliDAO.richiediImmobiliHost(sess.idUtente, function(result, msg) {
            if (msg === "OK") {
                result.forEach(function(item) {
                    let percorsoFoto = '';
                    if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                    }
                    else {
                        percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                    }
                    item["percorsoFoto"] = percorsoFoto;
                });
                res.send({success: true, data: JSON.stringify(result), message: "Immobili trovati!"});
            }
            else if (msg === "NO_RESULT") {
                res.send({success: true, data: null, message: "Non ci sono immobili a nome di questo utente."});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: l'utente non è autenticato."});
    }
}

// --- Inserimento casa:
exports.inserisciCasa = function(req, res) {
     if (req.file) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    if (msg === "OK") {
                        sess = JSON.parse(req.body.sessionData);
                        const schema = Joi.object({
                            modalitaPagamento: Joi.string().valid('dilazionato', 'online', 'metà in loco')
                        });
                    
                        const check = schema.validate({
                            modalitaPagamento: req.body.modPagamento
                        });
                    
                        if (check.error === undefined) {
                            immobiliDAO.trovaIDComune(req.body.comune, function(comuneResult, msg) {
                                if (msg === "OK") {
                                    immobiliDAO.inserisciCasa(sess.idUtente, req.body.titolo, req.body.descrizione,
                                        req.body.regole, req.body.servizi, req.body.modPagamento, req.body.modRimborso,
                                        req.body.costoTasse, req.body.esentiTasse, req.file.filename, req.body.infoLuogo, req.body.indirizzo,
                                        req.body.cap, comuneResult[0].id_comune, req.body.prezzoNotte, req.body.numeroBagni, req.body.numeroPostiLetto, function(result, msg) {
                                            if (msg === "OK") {
                                                mailer.inviaMail(sess.email, "Notifica inserimento casa",
                                                    "Ti comunichiamo che la tua casa '" + req.body.titolo + "' è stata " +
                                                    "inserita con successo!\nAdesso potrai ricevere delle prenotazioni da parte " +
                                                    "degli utenti del sito.\nBuona fortuna!",
                                                    function(error, message) {
                                                        console.log(message);
                                                    });
                                                res.send({success: true, message: "Casa aggiunta con successo!"});
                                            }
                                            else {
                                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                                    console.log(msg);
                                                });
                                                res.send({success: false, message: "Errore nell'inserimento della casa: " + msg});
                                            }
                                    });
                                }
                                else if (msg === "NO_RESULT") {
                                    fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Il comune inserito non esiste."});
                                }
                                else {
                                    fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Errore nella ricerca del comune: " + msg});
                                } 
                            });
                        }
                        else {
                            fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                console.log(msg);
                            });
                            res.send({success: false, message: "Errore: le mo"});
                        }
                    }
                    else {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: msg});
                    }
                });
            }
            else {
                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                    console.log(msg);
                });
                res.send({success: false, message: "Errore: il file caricato non ha un'estensione corretta."});
            }
        });
        
     }
     else {
         res.send({success: false, message: "Errore: non è stata inserita una foto."});
     }
}

// --- Inserimento bnb:
exports.inserisciBnB = function(req, res) {
    if (req.file) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    sess = JSON.parse(req.body.sessionData);
                    if (msg === "OK") {
                        const schema = Joi.object({
                            modalitaPagamento: Joi.string().valid('dilazionato', 'online', 'metà in loco')
                        });
                    
                        const check = schema.validate({
                            modalitaPagamento: req.body.modPagamento
                        });
                    
                        if (check.error === undefined) {
                            immobiliDAO.trovaIDComune(req.body.comune, function(comuneResult, msg) {
                                if (msg === "OK") {
                                    immobiliDAO.inserisciBnB(sess.idUtente, req.body.titolo, req.body.descrizione,
                                        req.body.regole, req.body.servizi, req.body.modPagamento, req.body.modRimborso,
                                        req.body.costoTasse, req.body.esentiTasse, req.file.filename, req.body.infoLuogo, req.body.indirizzo,
                                        req.body.cap, comuneResult[0].id_comune, req.body.numeroCamereSingole, req.body.numeroCamereDoppie, 
                                        req.body.numeroCamereTriple, req.body.numeroCamereQuadruple, req.body.numeroCamereExtra,
                                        req.body.prezzoCamereSingole, req.body.prezzoCamereDoppie, req.body.prezzoCamereTriple,
                                        req.body.prezzoCamereQuadruple, req.body.prezzoCamereExtra, req.body.personeCamereExtra, function(result, msg) {
                                            if (msg === "OK") {
                                                mailer.inviaMail(sess.email, "Notifica inserimento B&B",
                                                    "Ti comunichiamo che il tuo B&B '" + req.body.titolo + "' è stato " +
                                                    "inserito con successo!\nAdesso potrai ricevere delle prenotazioni da parte " +
                                                    "degli utenti del sito.\nBuona fortuna!",
                                                    function(error, message) {
                                                        console.log(message);
                                                    });
                                                res.send({success: true, message: "B&B aggiunto con successo!"});
                                            }
                                            else {
                                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                                    console.log(msg);
                                                });
                                                res.send({success: false, message: "Errore nell'inserimento dell'immobile: " + msg});
                                            }
                                    });
                                }
                                else if (msg === "NO_RESULT") {
                                    fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Il comune inserito non esiste."});
                                }
                                else {
                                    fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                        console.log(msg);
                                    });
                                    res.send({success: false, message: "Errore nella ricerca del comune: " + msg});
                                } 
                            });
                        }
                        else {
                            fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                console.log(msg);
                            });
                            res.send({success: false, message: "Errore: le modalità di pagamento non sono valide."});
                        }
                    }
                    else {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Errore: utente non loggato."});
                    }
                });
            }
            else {
                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                    console.log(msg);
                });
                res.send({success: false, message: "Errore: il file caricato non ha un'estensione valida."});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: non è stata inserita una foto."});
    }
    
}

// --- Modifica casa:
exports.modificaCasa = function(req, res) {
    if (req.file) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    if (msg === "OK") {
                        sess = JSON.parse(req.body.sessionData); 
                        immobiliDAO.richiestaImmobile(req.body.idImmobile, function(datiImmobile, msg) {
                            if (msg === "OK") {
                                let fotoDaInserire = req.file.filename;
            
                                immobiliDAO.modificaCasa(req.body.idImmobile, req.body.titolo, req.body.descrizione,
                                    req.body.regole, req.body.servizi, req.body.percentualeRimborso,
                                    req.body.costoTasse, req.body.esentiTasse, fotoDaInserire, req.body.infoLuogo,
                                    req.body.prezzoNotte, req.body.numeroBagni, req.body.numeroPostiLetto, function(result, msg) {
                                        if (msg === "OK") {
                                            fileHandler.eliminaImmagineImmobile(datiImmobile[0].foto, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: true, message: "Casa modificata con successo!"});
                                        }
                                        else {
                                            fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: false, message: "Errore nell'inserimento della casa: " + msg});
                                        }
                                });
                            }
                            else if (msg === "NO_RESULT"){
                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                    console.log(msg);
                                });
                                res.send({success: false, message: "Errore: immobile non esistente"});
                            }
                            else {
                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                    console.log(msg);
                                });
                                res.send({success: false, message: "Errore nella ricerca dei dati dell'immobile: " + msg});
                            }
                        });
                    }
                    else if (msg === "NO_RESULT") {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Utente non esistente."});
                    }
                    else {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Errore nella ricerca dei dati dell'utente: " + msg});
                    } 
                });
            }
            else {
                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                    console.log(msg);
                });
                res.send({success: false, message: "Errore: il file caricato non ha un'estensione valida."});
            }
        });
    }
    else {
        autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
            if (msg === "OK") {
                sess = JSON.parse(req.body.sessionData); 
                immobiliDAO.richiestaImmobile(req.body.idImmobile, function(datiImmobile, msg) {
                    if (msg === "OK") {
                        let fotoDaInserire = datiImmobile[0].foto;
    
                        immobiliDAO.modificaCasa(req.body.idImmobile, req.body.titolo, req.body.descrizione,
                            req.body.regole, req.body.servizi, req.body.percentualeRimborso,
                            req.body.costoTasse, req.body.esentiTasse, fotoDaInserire, req.body.infoLuogo,
                            req.body.prezzoNotte, req.body.numeroBagni, req.body.numeroPostiLetto, function(result, msg) {
                                if (msg === "OK") {
                                    res.send({success: true, message: "Casa modificata con successo!"});
                                }
                                else {
                                    res.send({success: false, message: "Errore nell'inserimento della casa: " + msg});
                                }
                        });
                    }
                    else if (msg === "NO_RESULT") {
                        res.send({success: false, message: "Errore: immobile non esistente"});
                    }
                    else {
                        res.send({success: false, message: "Errore nella ricerca dei dati dell'immobile: " + msg});
                    }
                });
            }
            else if (msg === "NO_RESULT") {
                res.send({success: false, message: "Utente non esistente."});
            }
            else {
                res.send({success: false, message: "Errore nella ricerca dei dati dell'utente: " + msg});
            } 
        });
    }
}

// --- Modifica BnB
exports.modificaBnB = function(req, res) {
    if (req.file) {
        fileHandler.controllaEstensioneFile(req.file.originalname, [".png", ".jpg", ".jpeg"], function(isValid) {
            if (isValid) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    if (msg === "OK") {
                        sess = JSON.parse(req.body.sessionData);
                        immobiliDAO.richiestaImmobile(req.body.idImmobile, function(datiImmobile, msg) {
                            if (msg === "OK") {
                                let fotoDaInserire = req.file.filename;
                                
                                immobiliDAO.modificaBnB(req.body.idImmobile, req.body.titolo, req.body.descrizione,
                                    req.body.regole, req.body.servizi, req.body.percentualeRimborso,
                                    req.body.costoTasse, req.body.esentiTasse, fotoDaInserire, req.body.infoLuogo,
                                    req.body.numeroCamereSingole, req.body.numeroCamereDoppie, req.body.numeroCamereTriple, 
                                    req.body.numeroCamereQuadruple, req.body.numeroCamereExtra, req.body.prezzoCamereSingole, 
                                    req.body.prezzoCamereDoppie, req.body.prezzoCamereTriple, req.body.prezzoCamereQuadruple, 
                                    req.body.prezzoCamereExtra, req.body.personeCamereExtra, function(result, msg) {
                                        if (msg === "OK") {
                                            fileHandler.eliminaImmagineImmobile(datiImmobile[0].foto, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: true, message: "B&B modificato con successo!"});
                                        }
                                        else {
                                            fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                                console.log(msg);
                                            });
                                            res.send({success: false, message: "Errore nell'inserimento dell'immobile: " + msg});
                                        }
                                });
                            }
                            else if (msg === "NO_RESULT"){
                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                    console.log(msg);
                                });
                                res.send({success: false, message: "Errore: immobile non esistente"});
                            }
                            else {
                                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                                    console.log(msg);
                                });
                                res.send({success: false, message: "Errore nella ricerca dei dati dell'immobile: " + msg});
                            }
                        });
                    }
                    else if (msg === "NO_RESULT") {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Utente non esistente."});
                    }
                    else {
                        fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                            console.log(msg);
                        });
                        res.send({success: false, message: "Errore nella ricerca dei dati dell'utente: " + msg});
                    } 
                });
            }
            else {
                fileHandler.eliminaImmagineImmobile(req.file.filename, function(msg) {
                    console.log(msg);
                });
                res.send({success: false, message: "Errore: il file caricato non ha un'estensione valida."});
            }
        });
        
    }
    else {
        autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
            if (msg === "OK") {
                sess = JSON.parse(req.body.sessionData);
                immobiliDAO.richiestaImmobile(req.body.idImmobile, function(datiImmobile, msg) {
                    if (msg === "OK") {
                        let fotoDaInserire = datiImmobile[0].foto;
                        
                        immobiliDAO.modificaBnB(req.body.idImmobile, req.body.titolo, req.body.descrizione,
                            req.body.regole, req.body.servizi, req.body.percentualeRimborso,
                            req.body.costoTasse, req.body.esentiTasse, fotoDaInserire, req.body.infoLuogo,
                            req.body.numeroCamereSingole, req.body.numeroCamereDoppie, req.body.numeroCamereTriple, 
                            req.body.numeroCamereQuadruple, req.body.numeroCamereExtra, req.body.prezzoCamereSingole, 
                            req.body.prezzoCamereDoppie, req.body.prezzoCamereTriple, req.body.prezzoCamereQuadruple, 
                            req.body.prezzoCamereExtra, req.body.personeCamereExtra, function(result, msg) {
                                if (msg === "OK") {
                                    res.send({success: true, message: "B&B modificato con successo!"});
                                }
                                else {
                                    res.send({success: false, message: "Errore nell'inserimento dell'immobile: " + msg});
                                }
                        });
                    }
                    else if (msg === "NO_RESULT"){
                        res.send({success: false, message: "Errore: immobile non esistente"});
                    }
                    else {
                        res.send({success: false, message: "Errore nella ricerca dei dati dell'immobile: " + msg});
                    }
                });
            }
            else if (msg === "NO_RESULT") {
                res.send({success: false, message: "Utente non esistente."});
            }
            else {
                res.send({success: false, message: "Errore nella ricerca dei dati dell'utente: " + msg});
            } 
        });
    }
}

// --- Oscura immoblie
exports.oscuraImmobile = function(req, res) {
    immobiliDAO.oscuraImmobile(req.query.idImmobile, function(result, msg) {
        if (msg === "OK") {
            res.send({success: true, message: "Immobile oscurato con successo!"});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: immobile non trovato"});
        }
        else {
            res.send({success: false, message: "Errore nell'oscuramento: " + msg});
        }
    });
}

// --- Rimuovi Oscuramento immoblie
exports.rimuoviOscuramentoImmobile = function(req, res) {
    immobiliDAO.rimuoviOscuramentoImmobile(req.query.idImmobile, function(result, msg) {
        if (msg === "OK") {
            res.send({success: true, message: "Rimosso oscuramento con successo!"});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: immobile non trovato"});
        }
        else {
            res.send({success: false, message: "Errore nella rimozione dell'oscuramento: " + msg});
        }
    });
}

// --- Cancella immobile
exports.cancellaImmobile = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    immobiliDAO.richiestaImmobile(req.query.idImmobile, function(datiImmobile, msg) {
        if (msg === "OK") {
            immobiliDAO.richiediEmailRimborso_Immobile(req.query.idImmobile, function(mailList_R, msg) {
                if (msg === "OK" || msg === "NO_RESULT") {
                    immobiliDAO.richiediEmailAvvisoAnnullamento_Immobile(req.query.idImmobile, function(mailList_A, msg) {
                        if (msg === "OK" || msg === "NO_RESULT") {
                            mailer.inviaMailRimborso_Immobile(mailList_R, mailList_A, datiImmobile, sess.email, function(error, msg) {
                                if (msg === "250 Ok") {
                                    immobiliDAO.cancellaImmobile(req.query.idImmobile, function(result, msg) {
                                        if (msg === "OK") {
                                            res.send({success: true, message: "Immobile eliminato con successo."});
                                        }
                                        else {
                                            res.sens({success: false, message: "Errore nell'eliminazione dell'immobile: " + msg});
                                        }
                                    });
                                }
                                else {
                                    res.send({success: false, message: "Errore nell'invio delle e-mail per il rimborso: " + msg})
                                }
                            });
                        }
                        else {
                            res.send({success: false, message: "Errore nell'invio delle e-mail per gli avvisi: " + msg});
                        }
                    });
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta delle e-mail di rimborso: " + msg});
                }
            });
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: immobile non trovato."});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati dell'immobile: " + msg});
        }
    });
}

// --- Visualizza immobile
exports.visualizzaImmobile = function(req, res) {
    immobiliDAO.richiestaImmobile(req.query.idImmobile, function(datiImmobile, msg) {
        if (msg === "OK") {
            immobiliDAO.trovaComuneProvincia(datiImmobile[0].ref_comune, function(datiComune, msg) {
                if (msg === "OK") {
                    let percorsoFoto = '';
                    if (datiImmobile[0].foto === fileHandler.defaultImmobile || datiImmobile[0].foto == null) {
                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                    }
                    else {
                        percorsoFoto = fileHandler.percorsoImmobili + datiImmobile[0].foto;
                    }
                    if (datiImmobile[0].bnb == 0) {
                        immobiliDAO.richiestaDatiCasa(req.query.idImmobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                res.send({
                                    success: true, 
                                    message: "Casa trovata", 
                                    datiImmobile: JSON.stringify(datiImmobile[0]), 
                                    datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                    comune: datiComune[0].nomeComune,
                                    provincia: datiComune[0].nomeProvincia,
                                    percorsoFoto: percorsoFoto
                                });
                            }
                            else {
                                res.send({success: false, message: "Errore nella richiesta dei dati della casa: " + msg});
                            }
                        });
                    }
                    else {
                        immobiliDAO.richiestaDatiBnB(req.query.idImmobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                res.send({
                                    success: true, 
                                    message: "B&B trovato", 
                                    datiImmobile: JSON.stringify(datiImmobile[0]), 
                                    datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                    comune: datiComune[0].nomeComune,
                                    provincia: datiComune[0].nomeProvincia,
                                    percorsoFoto: percorsoFoto
                                });
                            }
                            else {
                                res.send({success: false, message: "Errore nella richiesta dei dati del B&B: " + msg});
                            }
                        });
                    }
                }
                else if (msg === "NO_RESULT") {
                    res.send({success: false, message: "Errore: comune non trovato."});
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta del comune: " + msg});
                }
            });
        }
        else if (msg === "NO_RESULT") {
            res.send({success: false, message: "Errore: immobile non esistente"});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati dell'immobile: " + msg});
        }
    });
}