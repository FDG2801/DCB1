const contabilitaDAO = require('../dao/contabilitaDAO');
const mailer = require('../nodeMailer');
const pdfCreator = require('../pdfCreator');
const immobiliDAO = require('../dao/immobiliDAO');
const autenticazioneDAO = require('../dao/autenticazioneDAO');

// --- Mostra Contabilita
exports.datiContabilita = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    contabilitaDAO.mostraContabilita(sess.idUtente, req.query.anno, function(guadagniMensili, msgA) {
        if (msgA === "OK" || msgA === "NO_RESULT") {
            contabilitaDAO.calcolaEntrateHost(sess.idUtente, function(entrateTotali, msgB) {
                if (msgB === "OK" || msgB === "NO_RESULT") {
                    contabilitaDAO.calcolaUsciteHost(sess.idUtente, function(usciteTotali, msgC) {
                        if (msgC === "OK" || msgC === "NO_RESULT") {
                            contabilitaDAO.calcolaTotaleOspitiHost(sess.idUtente, function(totaleOspiti, msgD) {
                                if (msgD === "OK" || msgD === "NO_RESULT") {
                                    let entrateTot = [];
                                    let usciteTot = [];
                                    let totaleOsp = [];
                                    let listaGuadagniMensili = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

                                    if (msgA === "OK") {
                                        guadagniMensili[1].forEach(function(item) {
                                            listaGuadagniMensili[item.Mese - 1] = item.GuadagnoMensile;
                                        });
                                    }
                                    if (msgB === "OK") {
                                        entrateTot = entrateTotali[0].entrate;
                                    }
                                    if (msgA === "OK") {
                                        usciteTot = usciteTotali[0].uscite;
                                    }
                                    if (msgA === "OK") {
                                        totaleOsp = totaleOspiti[0].numOspiti;
                                    }
                                    
                                    res.send({
                                        success: true, 
                                        message: "Trovati dati contabilità!", 
                                        guadagniMensili: listaGuadagniMensili,
                                        entrateTotali: entrateTot,
                                        usciteTotali: usciteTot,
                                        totaleOspiti: totaleOsp
                                    });
                                }
                                else {
                                    res.send({success: false, message: "Errore nella richiesta del totale ospiti dell'host: " +  msgD});
                                }
                            });
                        }
                        else {
                            res.send({success: false, message: "Errore nella richiesta delle uscite dell'host: " +  msgC});
                        }
                    });
                }
                else {
                    res.send({success: false, message: "Errore nella richiesta delle entrate dell'host: " + msgB});
                }
            }); 
            
        }   
        else {
            res.send({success: false, message: "Errore nella richiesta dei guadagni mensili: " + msgA});
        }
    });
}

// --- Avviso Rendiconto Trimestrale
exports.avvisoRendicontoTrimestrale = function() {
    contabilitaDAO.trovaHostDaAvvisare(function(mailList, msg) {
        if (msg === "OK") {
            mailer.inviaAvvisoRendiconto(mailList, function(error, msg) {
                if (msg === "250 Ok") {
                    mailList.forEach(function(item) {
                        contabilitaDAO.applicaRestrizioni(item.ID_Utente, function(result, msg) {
                            if (msg === "OK") {
                                console.log("Restrizioni applicate all'host con ID" + item.ID_Utente + ".");
                            }
                            else {
                                console.log("Impossibile applicare restrizioni all'host con ID" + item.ID_Utente + ": " + msg);
                            }
                        });
                    });
                }
                else {
                    console.log("Si è verificato un errore nell'invio degli avvisi per il rendiconto.");
                }
            });
        }
        else {
            console.log("Non sono stati trovati host a cui inviare un avviso.");
        }
    });
}

// --- Effettua Rendiconto:
const generaDocumentoRendiconto = function(idUtente, idImmobile, importo, callback) {
    immobiliDAO.trovaComuneProvinciaPerImmobile(idImmobile, function(datiComune, msg) {
        autenticazioneDAO.richiestaUtente(idUtente, function(datiUtente, msg) {
            contabilitaDAO.cercaDatiRendiconto(idImmobile, function(datiRendiconto, msg) {
                if (msg === "OK") {
                    immobiliDAO.richiestaImmobile(idImmobile, function(datiImmobile, msg) {
                        if (msg === "OK") {
                            pdfCreator.generaDocumentoRendiconto(datiRendiconto[1], datiUtente[0], 
                                datiComune[0].nomeComune, datiImmobile, importo,
                                function(msg, nomeFile) {
                                if (msg === "OK") {
                                    callback(nomeFile, "OK");
                                }
                                else {
                                    callback("", "Errore nella generazione del documento:\n" + msg);
                                }
                            });
                        }
                        else if (msg === "NO_RESULT") {
                            callback("", "Errore: l'immobile specificato non è esistente.");
                        }
                        else {
                            callback("", "Errore nella ricerca dei dati dell'immobile: " + msg);
                        }
                    });
                }
                else if (msg === "NO_RESULT") {
                    callback("", "Non sono stati trovati dati per il rendiconto.");
                }
                else {
                    callback("", msg);
                }
            });
        });
    });
}

exports.effettuaPagamentoRendiconto = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    if (req.query.idImmobile) {
        autenticazioneDAO.richiestaUtente(sess.idUtente, function(datiUtente, msg) {
            if (msg === "OK") {
                generaDocumentoRendiconto(sess.idUtente, req.query.idImmobile, req.query.importo, function(nomeFile, msg) {
                    if (msg === "OK") {
                        contabilitaDAO.pagamentoRendiconto(sess.idUtente, req.query.idImmobile, req.query.importo, nomeFile, function(result, msg) {
                            if (msg === "OK") {
                                mailer.inviaMailRendiconto_Host(datiUtente[0].email, nomeFile, req.query.importo, function(error, message) {
                                        console.log(message);
                                    }); 
                                immobiliDAO.trovaComuneProvinciaPerImmobile(req.query.idImmobile, function(datiComune, msg) {
                                    if (msg === "OK") {
                                        immobiliDAO.richiestaImmobile(req.query.idImmobile, function(datiImmobile, msg) {
                                            if (msg === "OK"){
                                                mailer.inviaMailRendiconto(nomeFile, datiUtente[0], datiComune[0], datiImmobile[0], function(error, message) {
                                                    console.log(message);
                                                });
                                            }
                                            else if (msg === "NO_RESULT") {
                                                console.log("Errore: impossibile trovare l'immobile");
                                            }
                                            else {
                                                console.log("Errore: " + msg);
                                            }
                                        });
                                    }
                                    else if (msg === "NO_RESULT") {
                                        console.log("Errore: impossibile trovare il comune");
                                    }
                                    else {
                                        console.log("Errore: " +  msg);
                                    }
                                });
                                res.send({success: true, message: "Rendiconto effettuato con successo."});
                            }
                            else {
                                res.send({success: false, message: "Errore nel pagamento delle tasse di soggiorno: " + msg});
                            }
                        });
                    }
                    else {
                        res.send({success: false, message: "Errore nella generazione del documento di rendiconto: " + msg});
                    }
                });
            }
            else {
                res.send({success: false, message: "Errore nella richiesta dei dati dell'utente: " + msg});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: non è stato specificato un immobile."});
    }
}

exports.richiediTotaleTasseRendiconto = function(req, res) {
    sess = JSON.parse(req.query.sessionData); 

    if (req.query.idImmobile) {
        contabilitaDAO.richiediTotaleTasseRendiconto(req.query.idImmobile, function(result, msg) {
            if (msg === "OK") {
                console.log("Risultato tasse: ", result);
                res.send({success: true, totaleTasse: result[1][0].TotaleTasse, message: "Totale tasse calcolato."});
            }
            else if (msg === "NO_RESULT") {
                res.send({success: false, message: "Errore: non sono state trovate prenotazioni con relative tasse da versare."});
            }
            else {
                res.send({success: false, message: "Errore nel calcolo delle tasse da versare: " + msg});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: non è stato specificato un immobile."});
    }
}

exports.immobiliDaRendicontare = function(req, res) {
    sess = JSON.parse(req.query.sessionData);

    contabilitaDAO.richiediImmobiliDaRendicontare(sess.idUtente, function(listaImmobili, msg) {
        if (msg === "OK") {
            res.send({success: true, listaImmobili: JSON.stringify(listaImmobili), message: "Trovati immobili!"});
        }       
        else if (msg === "NO_RESULT") {
            res.send({success: true, listaImmobili: JSON.stringify([]), message: "Nessun immobile per cui fare rendiconto."});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta di immobili per cui eseguire un rendiconto: " + msg});
        }
    });
}