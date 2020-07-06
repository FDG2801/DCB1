const fileHandler = require('../fileHandler');
const Joi = require('@hapi/joi');
const autenticazioneControl = require('./gestioneAutenticazione');
const autenticazioneDAO = require('../dao/autenticazioneDAO');
const prenotazioneDAO = require('../dao/prenotazioniDAO');
const immobiliDAO = require('../dao/immobiliDAO');
const mailer = require('../nodeMailer');
const moment = require('moment');

const calcolaDifferenzaTraDate = function(date1, date2) {
    const d1 = moment(date1).valueOf();
    const d2 = moment(date2).valueOf();
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays;
}

// --- Prenotazione Casa
exports.prenotazioneCasa = function(req, res) {
    if (req.files) {
        fileHandler.controllaEstensioneFileMultipli(req.files, [".png", ".jpg", ".jpeg", ".pdf"], function(validi) {
            if (validi) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    if (msg === "OK") {
                        sess = JSON.parse(req.body.sessionData);
                        prenotazioneDAO.controllaDisponibilitaCasa(req.body.idImmobile, req.body.checkin, req.body.checkout, function(result, msg) {
                            if (msg === "NO_RESULT") {
                                prenotazioneDAO.calcolaGiorniPrenotazioni(sess.idUtente, req.body.idImmobile, function(nOfDays, msg) {
                                    if (msg === "OK") {
                                        if (nOfDays[0].SommaGiorni + calcolaDifferenzaTraDate(req.body.checkin, req.body.checkout) > 28) {
                                            req.files.forEach(function(item) {
                                                fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                                    console.log(msg);
                                                });
                                            });
                                            res.send({success: false, message: "La somma dei giorni per cui hai prenotato questa casa supera 28."});
                                        }
                                        else {
                                            var ospiti = JSON.parse(req.body.listaOspiti);
                
                                            const schema = Joi.object({
                                                checkin: Joi.required(),
                                                checkout: Joi.required(),
                                                saldo: Joi.required(),
                                                pagamentoTasseOnline: Joi.required(),
                                                numeroEsenti: Joi.required(),
                                                listaOspiti: Joi.required()
                                            });
                                
                                            var obj = {
                                                checkin: req.body.checkin,
                                                checkout: req.body.checkout,
                                                saldo: req.body.saldoTotale,
                                                pagamentoTasseOnline: req.body.tasseOnline,
                                                numeroEsenti: req.body.numeroEsenti,
                                                listaOspiti: req.body.listaOspiti
                                            };
                            
                                            const check = schema.validate(obj);
                                            if (check.error === undefined) {
                                                prenotazioneDAO.aggiungiPrenotazione(req.body.idImmobile, sess.idUtente, 
                                                    req.body.checkin, req.body.checkout, req.body.saldoTotale, req.body.tasseOnline,
                                                    req.body.numeroEsenti, ospiti, req.files, function(result, msg) {
                                                        if (msg === "OK") {
                                                            // --- Serie di funzioni finalizzate all'invio delle mail --- //
                                                            autenticazioneDAO.richiestaUtente(sess.idUtente, function(userResult, msg) {
                                                                if (msg === "OK") {
                                                                    prenotazioneDAO.richiediHostImmobile(req.body.idImmobile, function(hostResult, msg) {
                                                                        if (msg === "OK") {
                                                                            immobiliDAO.richiestaImmobile(req.body.idImmobile, function(immobileResult, msg) {
                                                                                if (msg === "OK") {
                                                                                    // Invia mail di riepilogo all'utente
                                                                                    mailer.inviaMail(userResult[0].email, "Richiesta di prenotazione effettuata",
                                                                                    "Ti confermiamo che tua richiesta di prenotazione " +
                                                                                    "per la casa '" + immobileResult[0].titolo + "' è stata inviata con successo.\n" +
                                                                                    "L'accettazione o il declino della richiesta è a discrezione dell'host.\n" +
                                                                                    "Se hai bisogno di contattare l'host per maggiori informazioni, puoi farlo all'indirizzo mail " +
                                                                                    hostResult[0].email + ".",
                                                                                    function(error, message) {
                                                                                        console.log(message);
                                                                                    });
                                                                                    mailer.inviaMail(hostResult[0].email, "Nuova richiesta di prenotazione",
                                                                                    "Ti comunichiamo che è arrivata una nuova richiesta di prenotazione " +
                                                                                    "per la casa '" + immobileResult[0].titolo + "'.\n" +
                                                                                    "Puoi vedere meglio i dettagli della prenotazione nella schermata 'Prenotazioni Ricevute' " +
                                                                                    "nella tua area riservata.\n" +
                                                                                    "Se hai bisogno di contattare l'utente per maggiori informazioni, puoi farlo all'indirizzo mail " +
                                                                                    userResult[0].email + ".",
                                                                                    function(error, message) {
                                                                                        console.log(message);
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    console.log(msg);
                                                                                    return false;
                                                                                }
                                                                            });
                                                                        }
                                                                        else {
                                                                            console.log(msg);
                                                                            return false;
                                                                        }
                                                                    });
                                                                }
                                                                else {
                                                                    console.log(msg);
                                                                    return false;
                                                                }
                                                            });
                                                            // --- fine invio mail --- //
                                                            prenotazioneDAO.richiediMaxIDPrenotazione(function(idResult, msg) {
                                                                    if (msg === "OK") {
                                                                        fileHandler.creaArchivioDocumenti(ospiti, idResult[0].id, req.files, function(msg) {
                                                                            console.log(msg);
                                                                        });
                                                                        return true;
                                                                    }
                                                                    else {
                                                                        return false;
                                                                    }
                                                                });
                                                            
                                                            res.send({success: true, message: "Prenotazione effettuata con successo!"});
                                                        }
                                                        else {
                                                            req.files.forEach(function(item) {
                                                                fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                                                    console.log(msg);
                                                                });
                                                            });
                                                            res.send({success: false, message: "Errore nella prenotazione dell'immobile: " + msg});
                                                        }
                                                    });
                                            }
                                            else {
                                                req.files.forEach(function(item) {
                                                    fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                                        console.log(msg);
                                                    });
                                                });
                                                res.send({success: false, message: "Errore: almeno uno dei campi richiesti non è stato riempito."});
                                            }
                                        }
                                    }
                                    else {
                                        req.files.forEach(function(item) {
                                            fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                                console.log(msg);
                                            });
                                        });
                                        res.send({success: false, message: "Errore nel calcolo dei giorni: " + msg});
                                    }
                                });
                            }
                            else {
                                req.files.forEach(function(item) {
                                    fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                        console.log(msg);
                                    });
                                });
                                res.send({
                                    success: false, 
                                    message: "La casa selezionata non è disponibile per il periodo selezionato."
                                });
                            }
                        });
                    }
                    else {
                        req.files.forEach(function(item) {
                            fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                console.log(msg);
                            });
                        });
                        res.send({success: false, message: "Errore: utente non loggato."});
                    }
                });
            }
            else {
                req.files.forEach(function(item) {
                    fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                        console.log(msg);
                    });
                });
                res.send({success: false, message: "Errore: almeno uno dei documenti caricati non ha un'estensione valida."});
            }
        });
    }
    else {
        res.send({success: false, message: "Non sono stati inseriti documenti."});
    }
    
}

// --- Prenotazione B&B
exports.prenotazioneBnB = function(req, res) {
    if (req.files) {
        var listaDocumenti = req.files;
        fileHandler.controllaEstensioneFileMultipli(listaDocumenti, [".png", ".jpeg", ".jpg", ".pdf"], function(validi) {
            if (validi) {
                autenticazioneControl.checkIfLoggedIn_body(req, function(msg) {
                    if (msg === "OK") {
                        sess = JSON.parse(req.body.sessionData);
                        var ospiti = JSON.parse(req.body.listaOspiti);
                        var listaCamere = [
                            req.body.numeroCamereSingole,
                            req.body.numeroCamereDoppie,
                            req.body.numeroCamereTriple,
                            req.body.numeroCamereQuadruple,
                            req.body.numeroCamereExtra
                        ];
                        const schema = Joi.object({
                            checkin: Joi.required(),
                            checkout: Joi.required(),
                            saldo: Joi.required(),
                            pagamentoTasseOnline: Joi.required(),
                            numeroEsenti: Joi.required(),
                            listaOspiti: Joi.required()
                        });
            
                        var obj = {
                            checkin: req.body.checkin,
                            checkout: req.body.checkout,
                            saldo: req.body.saldoTotale,
                            pagamentoTasseOnline: req.body.tasseOnline,
                            numeroEsenti: req.body.numeroEsenti,
                            listaOspiti: ospiti
                        };
        
                        const check = schema.validate(obj);
                        if (check.error === undefined) {
                            prenotazioneDAO.controllaDisponibilitaCamereBnB(req.body.idImmobile, 
                                req.body.checkin, req.body.checkout, function(camereDisponibili, msg) {
                                    if (msg === "OK" || msg === "NO_RESULT") {
                                        if ((msg === "OK" && (
                                                camereDisponibili[0].singoleDisponibili - listaCamere[0] >= 0
                                             && camereDisponibili[1].doppieDisponibili - listaCamere[1] >= 0
                                             && camereDisponibili[2].tripleDisponibili - listaCamere[2] >= 0
                                             && camereDisponibili[3].quadrupleDisponibili - listaCamere[3] >= 0
                                             && camereDisponibili[4].extraDisponibili - listaCamere[4] >= 0
                                            )) || msg === "NO_RESULT") {
                                                prenotazioneDAO.aggiungiPrenotazione_BnB(req.body.idImmobile, sess.idUtente, 
                                                    req.body.checkin, req.body.checkout, req.body.saldoTotale, req.body.tasseOnline,
                                                    req.body.numeroEsenti, listaCamere, ospiti, listaDocumenti, function(result, msg) {
                                                        if (msg === "OK") {
                                                            // --- Serie di funzioni finalizzate all'invio delle mail --- //
                                                            autenticazioneDAO.richiestaUtente(sess.idUtente, function(userResult, msg) {
                                                                if (msg === "OK") {
                                                                    prenotazioneDAO.richiediHostImmobile(req.body.idImmobile, function(hostResult, msg) {
                                                                        if (msg === "OK") {                                                
                                                                            immobiliDAO.richiestaImmobile(req.body.idImmobile, function(immobileResult, msg) {
                                                                                if (msg === "OK") {
                                                                                    // Invia mail di riepilogo all'utente
                                                                                    mailer.inviaMail(userResult[0].email, "Richiesta di prenotazione effettuata",
                                                                                    "Ti confermiamo che tua richiesta di prenotazione " +
                                                                                    "per il B&B '" + immobileResult[0].titolo + "' è stata inviata con successo.\n" +
                                                                                    "L'accettazione o il declino della richiesta è a discrezione dell'host.\n" +
                                                                                    "Se hai bisogno di contattare l'host per maggiori informazioni, puoi farlo all'indirizzo mail " +
                                                                                    hostResult[0].email + ".",
                                                                                    function(error, message) {
                                                                                        console.log(message);
                                                                                    });
                                                                                    mailer.inviaMail(hostResult[0].email, "Nuova richiesta di prenotazione",
                                                                                    "Ti comunichiamo che è arrivata una nuova richiesta di prenotazione " +
                                                                                    "per il B&B '" + immobileResult[0].titolo + "'.\n" +
                                                                                    "Puoi vedere meglio i dettagli della prenotazione nella schermata 'Prenotazioni Ricevute' " +
                                                                                    "nella tua area riservata.\n" +
                                                                                    "Se hai bisogno di contattare l'utente per maggiori informazioni, puoi farlo all'indirizzo mail " +
                                                                                    userResult[0].email + ".",
                                                                                    function(error, message) {
                                                                                        console.log(message);
                                                                                    });
                                                                                }
                                                                                else {
                                                                                    console.log(msg);
                                                                                    return false;
                                                                                }
                                                                            });
                                                                        }
                                                                        else {
                                                                            console.log(msg);
                                                                            return false;
                                                                        }
                                                                    });
                                                                }
                                                                else {
                                                                    console.log(msg);
                                                                    return false;
                                                                }
                                                            });
                                                            // --- fine invio mail --- //
                                                            prenotazioneDAO.richiediMaxIDPrenotazione(function(idResult, msg) {
                                                                    if (msg === "OK") {
                                                                        fileHandler.creaArchivioDocumenti(ospiti, idResult[0].id, req.files, function(msg) {
                                                                            console.log(msg);
                                                                        });
                                                                        return true;
                                                                    }
                                                                    else {
                                                                        return false;
                                                                    }
                                                                });
                                                            
                                                            res.send({success: true, message: "Prenotazione effettuata con successo!"});
                                                        }
                                                        else {
                                                            req.files.forEach(function(item) {
                                                                fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                                                    console.log(msg);
                                                                });
                                                            });
                                                            res.send({success: false, message: "Errore nella prenotazione dell'immobile: " + msg});
                                                        }
                                                    });
                                            }   
                                        else {
                                            res.send({success: false, message: "Le camere selezionate non sono disponibili per il periodo selezionato."});
                                        }
                                    }
                                    else {
                                        res.send({success: false, message: "Errore nel controllo per la disponibilità delle camere: " + msg});
                                    }
                                });
                        }
                        else {
                            req.files.forEach(function(item) {
                                fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                    console.log(msg);
                                });
                            });
                            res.send({success: false, message: "Errore: almeno uno dei dati richiesti non è stato inserito."});
                        }
                    }
                    else {
                        req.files.forEach(function(item) {
                            fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                                console.log(msg);
                            });
                        });
                        res.send({success: false, message: "Errore: utente non loggato."});
                    }
                });
            }
            else {
                req.files.forEach(function(item) {
                    fileHandler.eliminaDocumentoOspite(item.filename, function(msg) {
                        console.log(msg);
                    });
                });
                res.send({success: false, message: "Errore: almeno uno dei documenti caricati non ha un'estensione valida."});
            }
        });
    }
    else {
        res.send({success: false, message: "Non sono stati inseriti documenti."});
    }
}

// --- Annulla Prenotazione
exports.annullaPrenotazione = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(datiPrenotazione, msg) {
        if (msg === "OK") {
            prenotazioneDAO.controllaPagamentiPrenotazione(req.query.idPrenotazione, function(pagamenti, msg) {
                if (msg === "OK" || msg === "NO_RESULT") {
                    let check = ((msg === "OK" 
                        && ((pagamenti[0].modalitaPagamento == "dilazionato" && pagamenti[0].NumeroPagamenti < 2)
                            || 
                            (pagamenti[0].modalitaPagamento != "dilazionato" && pagamenti[0].NumeroPagamenti < 1))) 

                        || msg === "NO_RESULT");
                    
                    if (check) {
                        prenotazioneDAO.chiediPoliticheRimborso(datiPrenotazione[0].ref_Immobile, function(polRimb, msg) {
                            if (msg === "OK") {
                                prenotazioneDAO.annullaPrenotazione(req.query.idPrenotazione, function(result, msg) {
                                    if (msg === "OK") {
                                        // --- Serie di funzioni finalizzate all'invio delle mail --- //
                                        autenticazioneDAO.richiestaUtente(sess.idUtente, function(userResult, msg) {
                                            if (msg === "OK") {
                                                prenotazioneDAO.richiediHostImmobile(datiPrenotazione[0].ref_Immobile, function(hostResult, msg) {
                                                    if (msg === "OK") {
                                                        immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(immobileResult, msg) {
                                                            if (msg === "OK") {
                                                                // Invia mail di riepilogo all'utente
                                                                mailer.inviaMail(userResult[0].email, "Conferma annullamento prenotazione",
                                                                "Ti confermiamo che tua richiesta di prenotazione " +
                                                                "per la casa '" + immobileResult[0].titolo + "' è stata cancellata con successo.\n" +
                                                                "Se sono stati effettuati pagamenti per tale prenotazione, sarà cura dell'host eseguire il rimborso.\n" +
                                                                "In particolare, l'host deve rimborsare il " + polRimb[0].percentualeRimborso + "% dei soldi versati " +
                                                                "per la prenotazione.\n Per chiarimenti, puoi contattare l'host all'indirizzo e-mail " +
                                                                hostResult[0].email + ".",
                                                                function(error, message) {
                                                                    console.log(message);
                                                                });
                                                                mailer.inviaMail(hostResult[0].email, "Annullamento prenotazione (lato utente)",
                                                                "Ti comunichiamo la prenotazione effettuata dall'utente " + userResult[0].nome + " " + userResult[0].cognome +
                                                                "per la casa '" + immobileResult[0].titolo + "' è stata annullata dall'utente stesso.\n" +
                                                                "Ti ricordiamo che hai l'obbligo di procedere al rimborso del " + polRimb[0].percentualeRimborso +
                                                                "% dei soldi versati dall'utente per tale prenotazione.\n" +
                                                                "Se hai bisogno di contattare l'utente per maggiori informazioni, puoi farlo all'indirizzo mail " +
                                                                userResult[0].email + ".",
                                                                function(error, message) {
                                                                    console.log(message);
                                                                });
                                                            }
                                                            else {
                                                                console.log(msg);
                                                                return false;
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        console.log(msg);
                                                        return false;
                                                    }
                                                });
                                            }
                                            else {
                                                console.log(msg);
                                                return false;
                                            }
                                        });
                                        // --- fine invio mail --- //
                                        res.send({success: false, message: "Prenotazione annullata con successo."});
                                    }
                                    else {
                                        res.send({success: false, message: "Errore nell'annullamento della prenotazione: " + msg});
                                    }
                                });
                            }
                            else {
                                res.send({success: false, message: "Errore nella richiesta delle politiche di rimborso: " + msg});
                            }
                        });
                    }
                    else {
                        res.send({success: false, message: "Impossibile cancellare la prenotazione una volta estinta."});
                    }
                }
                else {
                    res.send({success: false, message: "Errore nel controllo dei pagamenti: " + msg});
                }
            });
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati della prenotazione: " +msg});
        }  
    });   
}

// --- Richiesta modalità pagamento
exports.richiestaDatiPagamento = function(req, res) {
    prenotazioneDAO.chiediModPagamento(req.query.idPrenotazione, function(result, msg) {
        if (msg === "OK") {
            res.send({success: true, data: result[0], message: "Trovate modalità di pagamento!"});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta delle modalità di pagamento: " + msg});
        }
    });
}

// --- Invio dati questura (non esportata in quanto chiamata solo dall'oggetto stesso)
const invioDatiQuestura = function(idPrenotazione) {
    prenotazioneDAO.richiediDatiPrenotazione(idPrenotazione, function(datiPrenotazione, msg) {
        if (msg === "OK") {
            immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                if (msg === "OK") {
                    prenotazioneDAO.richiediHostImmobile(datiImmobile[0].ID_Immobile, function(datiHost, msg) {
                        if (msg === "OK") {
                            prenotazioneDAO.richiediOspitiPrenotazione(idPrenotazione, function(datiOspiti, msg) {
                                if (msg === "OK") {
                                    immobiliDAO.trovaComuneProvincia(datiImmobile[0].ref_comune, function(risultati, msg) {
                                        if (msg === "OK") {
                                            mailer.inviaMailQuestura(datiOspiti, datiHost[0], datiImmobile[0], datiPrenotazione[0].checkin,
                                                datiPrenotazione[0].checkout, datiPrenotazione[0].ID_Prenotazione, 
                                                risultati[0].nomeComune, risultati[0].nomeProvincia, function(error, message){
                                                    if (message === "250 Ok") {
                                                        return true;
                                                    }
                                                    else {
                                                        return false;
                                                    }
                                                });
                                        }
                                        else {
                                            return false;
                                        }
                                    });
                                }
                                else {
                                    return false;
                                }
                            });
                        }
                        else {
                            return false;
                        }
                    });
                }   
                else {
                    return false;
                }
            });
        }
        else {
            return false;
        }
    });
}

// --- Pagamento
exports.effettuaPagamento = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.effettuaPagamento(req.query.idPrenotazione, req.query.importo, function(pagamentoResult, msg) {
        if (msg === "OK") {
            // --- Serie di funzioni finalizzate all'invio delle mail --- //
            prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(prenResult, msg) {
                if (msg === "OK") {
                    autenticazioneDAO.richiestaUtente(sess.idUtente, function(userResult, msg) {
                        if (msg === "OK") {
                            prenotazioneDAO.richiediHostImmobile(prenResult[0].ref_Immobile, function(hostResult, msg) {
                                if (msg === "OK") {
                                    immobiliDAO.richiestaImmobile(prenResult[0].ref_Immobile, function(immobileResult, msg) {
                                        if (msg === "OK") {
                                            // Invia mail di riepilogo all'utente
                                            mailer.inviaMail(userResult[0].email, "Conferma di avvenuto pagamento",
                                            "Ti confermiamo che il pagamento di €" + req.query.importo + " per la tua prenotazione " +
                                            "relativa all'immobile '" + immobileResult[0].titolo + "' è stato effettuato con successo.\n.",
                                            function(error, message) {
                                                console.log(message);
                                            });
                                            mailer.inviaMail(hostResult[0].email, "Ricevuto pagamento",
                                            "Ti comunichiamo che è stato effettuato un pagamento di €" + req.query.importo + " per una prenotazione " +
                                            "relativa all'immobile '" + immobileResult[0].titolo + "' a nome di " 
                                            + userResult[0].nome + " " + userResult[0].cognome +".\n",
                                            function(error, message) {
                                                console.log(message);
                                            });

                                            prenotazioneDAO.richiediSaldoResiduo(req.query.idPrenotazione, function(saldoResult, msg) {
                                                if (msg === "OK" && saldoResult[0].saldoResiduo <= 0) {
                                                    invioDatiQuestura(req.query.idPrenotazione);
                                                }
                                            });
                                            res.send({success: true, message: "Pagamento effettuato con successo!"});
                                        }
                                        else {
                                            res.send({success: false, message: "Errore nella richiesta dei dati dell'immobile: " + msg});
                                        }
                                    });
                                }
                                else {
                                    res.send({success: false, message: "Errore nella richiesta dei dati dell'host: " + msg});
                                }
                            });
                        }
                        else {
                            res.send({success: false, message: "Errore nella richiesta dei dati dell'utente: " + msg});
                        }
                    });
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta dei dati di prenotazione: " + msg});
                }
                // --- fine invio mail --- //
            });
        }
        else {
            res.send({success: false, message: "Errore nel pagamento: " + msg});
        }
    });
}

// --- Avviso Pagamento Seconda Rata
// Richiamata automaticamente dal sistema
exports.avvisoPagamentoSecondaRata = function() {
    prenotazioneDAO.richiediPrenotazioniDaSaldare(function(listaPrenotazioni, msg) {
        if (msg === "OK") {
            listaPrenotazioni.forEach(function(item) {
                prenotazioneDAO.richiediDatiPrenotazione(item.ID_Prenotazione, function(datiPrenotazione, msg) {
                    if (msg === "OK") {
                        immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                            if (msg === "OK") {
                                autenticazioneDAO.richiestaUtente(datiPrenotazione[0].ref_Utente, function(datiUtente, msg) {
                                    if (msg === "OK") {
                                        let mailObj = {
                                            email: datiUtente[0].email,
                                            titolo: datiImmobile[0].titolo,
                                            checkin: datiPrenotazione[0].checkin,
                                            checkout: datiPrenotazione[0].checkout
                                        };

                                        mailer.inviaAvvisoSecondaRata(mailObj, function(error, message) {
                                            if (message === "250 Ok") {
                                                console.log("Inviato avviso all'utente " + mailObj.email +" per il saldo della seconda rata di un pagamento.");
                                            }
                                            else {
                                                console.log("Si è verificato un errore nell'invio degli avvisi di pagamento:\n" + message);
                                            }
                                        });
                                    }
                                    else {
                                        return false;
                                    }
                                });
                            }
                            else {
                                return false;
                            }
                        });
                    }
                    else {
                        return false;
                    }
                });
            });
        }
        else if (msg === "NO_RESULT"){
            console.log("Non vi sono prenotazioni da saldare urgentemente.");
        }
        else {
            console.log("Si è verificato un errore nel controllo delle prenotazioni da saldare:\n" + msg);
        }
    });
}

// --- Annullamento automatico prenotazioni
// Richiamata automaticamente dal sistema
exports.annullamentoAutomaticoPrenotazioni = function() {
    prenotazioneDAO.richiediPrenotazioniDaAnnullare(function(listaPrenotazioni, msg) {
        if (msg === "OK") {
            listaPrenotazioni.forEach(function(item) {
                prenotazioneDAO.richiediDatiPrenotazione(item.ID_Prenotazione, function(datiPrenotazione, msg) {
                    if (msg === "OK") {
                        immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                            if (msg === "OK") {
                                autenticazioneDAO.richiestaUtente(datiPrenotazione[0].ref_Utente, function(datiUtente, msg) {
                                    if (msg === "OK") {
                                        let mailObj = {
                                            email: datiUtente[0].email,
                                            titolo: datiImmobile[0].titolo,
                                            checkin: datiPrenotazione[0].checkin,
                                            checkout: datiPrenotazione[0].checkout
                                        };

                                        mailer.inviaAvvisoAnnullamentoPrenotazione(mailObj, function(error, message) {
                                            if (message === "250 Ok") {
                                                console.log("Inviato avvisi all'utente " + mailObj.email +" per l'annullamento delle loro prenotazioni.");
                                            }
                                            else {
                                                console.log("Si è verificato un errore nell'invio degli avvisi di annullamento prenotazione:\n" + message);
                                            }
                                        });
                                    }
                                    else {
                                        console.log("Errore nella richiesta dei dati dell'host:\n" + msg);
                                    }
                                });
                            }
                            else {
                                console.log("Errore nella richiesta dei dati dell'immobile:\n" + msg);
                            }
                        });
                    }
                    else {
                        console.log("Errore nella richiesta dei dati della prenotazione:\n" + msg);
                    }
                });

                prenotazioneDAO.annullaPrenotazione(item.ID_Prenotazione, function(result, msg) {
                    if (msg === "OK") {
                        console.log("Prenotazione annullata: " + item.ID_Prenotazione);
                    }
                    else {
                        console.log("Impossibile annullare la prenotazione " + item.ID_Prenotazione + ":\n" + msg);
                    }
                });
            });
        }
        else if (msg === "NO_RESULT"){
            console.log("Non vi sono prenotazioni da annullare.");
        }
        else {
            console.log("Si è verificato un errore nel controllo delle prenotazioni da annullare:\n" + msg);
        }
    });
}

// --- Accetta Prenotazione:
exports.accettaPrenotazione = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.accettaPrenotazione(req.query.idPrenotazione, function(result, msg) {
        if (msg === "OK") {
            prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(datiPrenotazione, msg) {
                if (msg === "OK") {
                    immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                        if (msg === "OK") {
                            autenticazioneDAO.richiestaUtente(datiPrenotazione[0].ref_Utente, function(datiUtente, msg) {
                                if (msg === "OK") {
                                    mailer.inviaMail(datiUtente[0].email, "Prenotazione accettata", 
                                    "Ti comunichiamo che la tua prenotazione per l'immobile " +
                                    datiImmobile[0].titolo + " per il periodo dal " + 
                                    datiPrenotazione[0].checkin + " al " + datiPrenotazione[0].checkout + " è stata accettata dall'host.\n" +
                                    "Ti ricordiamo che dovrai effettuare almeno un pagamento entro tre giorni dalla data odierna, " +
                                    "pena l'annullamento automatico della prenotazione. Inoltre, nel caso in cui l'immobile avesse come " +
                                    "modalità di pagamento un tipo di pagamento dilazionato (ovvero da pagare in due rate online) dovrai saldare " +
                                    "il pagamento entro e non oltre tre giorni prima della data di check-in. A tal proposito, ti verrà inviato " +
                                    "un avviso tre giorni prima la scadenza.", function(error, message) {
                                        console.log(message);
                                    });
                                }
                                else {
                                    console.log(msg);
                                    return false;
                                }
                            });
                        }
                        else {
                            console.log(msg);
                            return false;
                        }
                    });
                }
                else {
                    console.log(msg);
                    return false;
                }
            });

            res.send({success: true, message: "Prenotazione accettata con successo!"});
        }
        else {
            res.send({success: false, message: "Errore nell'accettazione della prenotazione: " + msg});
        }
    });
}

// --- Declina Prenotazione:
exports.declinaPrenotazione = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.declinaPrenotazione(req.query.idPrenotazione, req.query.motivazioni, function(result, msg) {
        if (msg === "OK") {
            prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(datiPrenotazione, msg) {
                if (msg === "OK") {
                    immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                        if (msg === "OK") {
                            prenotazioneDAO.richiediHostImmobile(datiImmobile[0].ID_Immobile, function(datiHost, msg) {
                                autenticazioneDAO.richiestaUtente(datiPrenotazione[0].ref_Utente, function(datiUtente, msg) {
                                    if (msg === "OK") {
                                        mailer.inviaMail(datiUtente[0].email, "Prenotazione declinata", 
                                        "Ti comunichiamo che la tua prenotazione per l'immobile " +
                                        datiImmobile[0].titolo + " per il periodo dal " + 
                                        datiPrenotazione[0].checkin + " al " + datiPrenotazione[0].checkout + " è stata rifiutata dall'host " +
                                        "per i seguenti motivi:\n'" + req.query.motivazioni +
                                        "'\n" +
                                        "Per ulteriori chiarimenti, puoi contattare l'host all'indirizzo e-mail " + datiHost[0].email + "\n", 
                                        function(error, message) {
                                            console.log(message);
                                        });
                                    }
                                    else {
                                        console.log(msg);
                                        return false;
                                    }
                                });
                            });
                        }
                        else {
                            console.log(msg);
                            return false;
                        }
                    });
                }
                else {
                    console.log(msg);
                    return false;
                }
            });

            res.send({success: true, message: "Prenotazione rifiutata con successo!"});
        }
        else {
            res.send({success: false, message: "Errore nel rifiuto della prenotazione: " + msg});
        }
    });
}

// --- Riepilogo prenotazione - lato host
exports.riepilogoPrenotazione_Host = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(datiPrenotazione, msg) {
        if (msg === "OK") {
            immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                if (msg === "OK") {
                    if (datiImmobile[0].bnb == 0) {
                        immobiliDAO.richiestaDatiCasa(datiImmobile[0].ID_Immobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                prenotazioneDAO.richiediOspitiPrenotazione(req.query.idPrenotazione, function(listaOspiti, msg) {
                                    if (msg === "OK") {
                                        fileHandler.richiediPercorsoArchivioDocumenti(req.query.idPrenotazione, function(percorsoZip, msg) {
                                            if (msg === "OK") {
                                                let percorsoFoto = '';
                                                if (datiImmobile[0].foto === fileHandler.defaultImmobile || datiImmobile[0].foto == null) {
                                                    percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                                }
                                                else {
                                                    percorsoFoto = fileHandler.percorsoImmobili + datiImmobile[0].foto;
                                                }
                                                res.send({
                                                    success: true,
                                                    listaOspiti: JSON.stringify(listaOspiti),
                                                    datiImmobile: JSON.stringify(datiImmobile[0]),
                                                    datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                                    datiPrenotazione: JSON.stringify(datiPrenotazione[0]),
                                                    datiCamerePrenotate: null,
                                                    percorsoFotoImmobile: percorsoFoto,
                                                    percorsoArchivio: percorsoZip
                                                });
                                            }
                                            else {
                                                res.send({success: false, message: "Errore: impossibile trovare documenti degli ospiti."});
                                            }
                                        });
                                    }
                                    else if (msg === "NO_RESULT") {
                                        res.send({success: false, message: "Errore: non sono stati trovati ospiti per la prenotazione"});
                                    }
                                    
                                });
                                
                            }
                            else {
                                res.send({success: false, message: "Errore nella richiesta dei dati della casa: " + msg});
                            }
                        });
                    }   
                    else {
                        immobiliDAO.richiestaDatiBnB(datiImmobile[0].ID_Immobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                prenotazioneDAO.richiestaCamerePrenotate(req.query.idPrenotazione, function(datiCamerePrenotate, msg) {
                                    if (msg === "OK") {
                                        prenotazioneDAO.richiediOspitiPrenotazione(req.query.idPrenotazione, function(listaOspiti, msg) {
                                            if (msg === "OK") {
                                                fileHandler.richiediPercorsoArchivioDocumenti(req.query.idPrenotazione, function(percorsoZip, msg) {
                                                    if (msg === "OK") {
                                                        let percorsoFoto = '';
                                                        if (datiImmobile[0].foto === fileHandler.defaultImmobile || datiImmobile[0].foto == null) {
                                                            percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                                        }
                                                        else {
                                                            percorsoFoto = fileHandler.percorsoImmobili + datiImmobile[0].foto;
                                                        }
                                                        res.send({
                                                            success: true,
                                                            listaOspiti: JSON.stringify(listaOspiti),
                                                            datiImmobile: JSON.stringify(datiImmobile[0]),
                                                            datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                                            datiCamerePrenotate: JSON.stringify(datiCamerePrenotate[0]),
                                                            datiPrenotazione: JSON.stringify(datiPrenotazione[0]),
                                                            percorsoFotoImmobile: percorsoFoto,
                                                            percorsoArchivio: percorsoZip
                                                        });
                                                    }
                                                    else {
                                                        res.send({success: false, message: "Errore: impossibile trovare documenti degli ospiti."});
                                                    }
                                                });
                                            }
                                            else if (msg === "NO_RESULT") {
                                                res.send({success: false, message: "Errore: non sono stati trovati ospiti per la prenotazione"});
                                            }
                                        });
                                    }
                                    else {
                                        res.send({success: false, message: "Errore nella richiesta delle camere prenotate: " + msg});
                                    }
                                });                                
                            }
                            else {
                                res.send({success: false, message: "Errore nella richiesta dei dati del B&B: " + msg});
                            }
                        });
                    }
                }
                else if (msg === "NO_RESULT") {
                    res.send({success: false, message: "Errore: non esiste l'immobile relativo alla prenotazione inserita."});
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta dei dati dell'immobile: " + msg});
                }
            });
        }
        else if (msg === "NO_RESULT"){
            res.send({success: false, message: "Errore: non esiste una prenotazione con l'ID inserito."});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta dei dati della prenotazione: " + msg});
        }
    });
}

// --- Riepilogo prenotazione - lato utente
exports.riepilogoPrenotazione_Utente = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    prenotazioneDAO.richiediDatiPrenotazione(req.query.idPrenotazione, function(datiPrenotazione, msg) {
        if (msg === "OK") {
            immobiliDAO.richiestaImmobile(datiPrenotazione[0].ref_Immobile, function(datiImmobile, msg) {
                if (msg === "OK") {
                    if (datiImmobile[0].bnb == 0) {
                        immobiliDAO.richiestaDatiCasa(datiImmobile[0].ID_Immobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                prenotazioneDAO.richiediOspitiPrenotazione(req.query.idPrenotazione, function(listaOspiti, msg) {
                                    if (msg === "OK") {
                                        fileHandler.richiediPercorsoArchivioDocumenti(req.query.idPrenotazione, function(percorsoZip, msg) {
                                            if (msg === "OK") {
                                                let percorsoFoto = '';
                                                if (datiImmobile[0].foto === fileHandler.defaultImmobile || datiImmobile[0].foto == null) {
                                                    percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                                }
                                                else {
                                                    percorsoFoto = fileHandler.percorsoImmobili + datiImmobile[0].foto;
                                                }
                                                res.send({
                                                    success: true,
                                                    listaOspiti: JSON.stringify(listaOspiti),
                                                    datiImmobile: JSON.stringify(datiImmobile[0]),
                                                    datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                                    datiPrenotazione: JSON.stringify(datiPrenotazione[0]),
                                                    datiCamerePrenotate: null,
                                                    percorsoFotoImmobile: percorsoFoto,
                                                    percorsoArchivio: percorsoZip
                                                });
                                            }
                                            else {
                                                res.send({success: false, message: "Errore: impossibile trovare documenti degli ospiti."});
                                            }
                                        });
                                    }
                                    else if (msg === "NO_RESULT") {
                                        res.send({success: false, message: "Errore: non sono stati trovati ospiti per la prenotazione"});
                                    }
                                });
                            }
                            else {
                                res.send({success: false, message: msg});
                            }
                        });
                    }   
                    else {
                        immobiliDAO.richiestaDatiBnB(datiImmobile[0].ID_Immobile, function(datiSpecifici, msg) {
                            if (msg === "OK") {
                                prenotazioneDAO.richiestaCamerePrenotate(req.query.idPrenotazione, function(datiCamerePrenotate, msg) {
                                    if (msg === "OK") {
                                        prenotazioneDAO.richiediOspitiPrenotazione(req.query.idPrenotazione, function(listaOspiti, msg) {
                                            if (msg === "OK") {
                                                fileHandler.richiediPercorsoArchivioDocumenti(req.query.idPrenotazione, function(percorsoZip, msg) {
                                                    if (msg === "OK") {
                                                        let percorsoFoto = '';
                                                        if (datiImmobile[0].foto === fileHandler.defaultImmobile || datiImmobile[0].foto == null) {
                                                            percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                                                        }
                                                        else {
                                                            percorsoFoto = fileHandler.percorsoImmobili + datiImmobile[0].foto;
                                                        }
                                                        res.send({
                                                            success: true,
                                                            listaOspiti: JSON.stringify(listaOspiti),
                                                            datiImmobile: JSON.stringify(datiImmobile[0]),
                                                            datiSpecifici: JSON.stringify(datiSpecifici[0]),
                                                            datiCamerePrenotate: JSON.stringify(datiCamerePrenotate[0]),
                                                            datiPrenotazione: JSON.stringify(datiPrenotazione[0]),
                                                            percorsoFotoImmobile: percorsoFoto,
                                                            percorsoArchivio: percorsoZip
                                                        });
                                                    }
                                                    else {
                                                        res.send({success: false, message: "Errore: impossibile trovare documenti degli ospiti."});
                                                    }
                                                });
                                            }
                                            else if (msg === "NO_RESULT") {
                                                res.send({success: false, message: "Errore: non sono stati trovati ospiti per la prenotazione"});
                                            }
                                        });
                                    }
                                    else {
                                        res.send({success: false, message: msg});
                                    }
                                });                                
                            }
                            else {
                                res.send({success: false, message: msg});
                            }
                        });
                    }
                }
                else if (msg === "NO_RESULT") {
                    res.send({success: false, message: "Errore: non esiste l'immobile relativo alla prenotazione inserita."});
                }
                else {
                    res.send({success: false, message: msg});
                }
            });
        }
        else if (msg === "NO_RESULT"){
            res.send({success: false, message: "Errore: non esiste una prenotazione con l'ID inserito."});
        }
        else {
            res.send({success: false, message: msg});
        }
    });
}