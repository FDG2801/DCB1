const nodemailer = require('nodemailer');
const archiver = require('archiver');
const fileHandler = require('./fileHandler');
const path = require('path');
const fs = require('fs');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'dcbooking2020@gmail.com',
    pass: 'Dcbooking!2020'
  }
});

const convertDate = function(date) {
    let d = new Date(date);
    return [d.getDate(), d.getMonth()+1, d.getFullYear()].join('/');
}

exports.inviaMail = function (emailDestinatario, soggetto, testo, callback) {
    var mailOptions = {
        from: 'dcbooking2020@gmail.com',
        to: emailDestinatario,
        subject: soggetto,
        text: 
        'Ciao! Grazie per aver scelto DCBooking.\n\n' 
        + testo 
        + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
    };

    let errore = false;

    transporter.sendMail(mailOptions, function(error, info, callback){
        if (error) {
            console.log('errore grrrravissimo: ' + error);
            console.log('problema! ' + info.response);
            errore = true;
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaMailRimborso = function(listaMailRimborso, listaMailAvviso, datiHost, callback) {
    let errore = false;
    listaMailRimborso.forEach(function (arrayItem) {
        var mailDest = arrayItem.email;
        var importoTotale = arrayItem.ImportoTotale;

        var mailOptions_Rimborso = {
            from: 'dcbooking2020@gmail.com',
            to: mailDest,
            subject: 'Annullamento prenotazione',
            text: 
            'Ciao! Grazie per aver scelto DCBooking.\n\n' 
            + 'Ti comunichiamo che le tue prenotazioni presso gli immobili di ' 
            + datiHost.nome + ' ' + datiHost.cognome 
            + ' sono state annullate in quanto il suo account è stato cancellato.'
            + '\nSarà responsabilità dell\'host procedere al rimborso di €' + importoTotale + '.'
            + '\nPuoi contattare l\'host all\'indirizzo ' + datiHost.email + '.' 
            + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
        }

        transporter.sendMail(mailOptions_Rimborso, function(error, info){
            if (error) {
                errore = true
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });

    listaMailAvviso.forEach(function (arrayItem) {
        var mailDest = arrayItem.email;

        var mailOptions_Avviso = {
            from: 'dcbooking2020@gmail.com',
            to: mailDest,
            subject: 'Annullamento prenotazione',
            text: 
            'Ciao! Grazie per aver scelto DCBooking.\n\n' 
            + 'Ti comunichiamo che le tue prenotazioni presso gli immobili di ' 
            + datiHost.nome + ' ' + datiHost.cognome 
            + ' sono state annullate in quanto il suo account è stato cancellato.'
            + '\nNon avendo ancora eseguito pagamenti per le prenotazioni, non hai diritto a nessun rimborso.'
            + '\nPuoi contattare l\'host all\'indirizzo ' + datiHost.email + ' per ulteriori chiarimenti.' 
            + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
        }

        transporter.sendMail(mailOptions_Avviso, function(error, info) {
            if (error) {
                console.log(error);
                errore = true;
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaMailRimborso_Immobile = function(listaMailRimborso, listaMailAvviso, datiImmobile, emailHost, callback) {
    errore = false;
    listaMailRimborso.forEach(function (arrayItem) {
        var mailDest = arrayItem.email;
        var importoTotale = arrayItem.ImportoTotale;

        var mailOptions_Rimborso = {
            from: 'dcbooking2020@gmail.com',
            to: mailDest,
            subject: 'Annullamento prenotazione',
            text: 
            'Ciao! Grazie per aver scelto DCBooking.\n\n' 
            + "Ti comunichiamo che le tue prenotazioni presso l'immobile "
            + datiImmobile.titolo
            + ' sono state annullate in quanto esso è stato eliminato dal proprio host.'
            + '\nSarà responsabilità dell\'host procedere al rimborso di €' + importoTotale + '.'
            + '\nPuoi contattare l\'host all\'indirizzo ' + emailHost + '.' 
            + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
        }

        transporter.sendMail(mailOptions_Rimborso, function(error, info){
            if (error) {
                console.log(error);
                errore = true;
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });

    listaMailAvviso.forEach(function (arrayItem) {
        var mailDest = arrayItem.email;

        var mailOptions_Avviso = {
            from: 'dcbooking2020@gmail.com',
            to: mailDest,
            subject: 'Annullamento prenotazione',
            text: 
            'Ciao! Grazie per aver scelto DCBooking.\n\n' 
            + 'Ti comunichiamo che le tue prenotazioni presso l\'immobile ' 
            + datiImmobile.titolo
            + ' sono state annullate in quanto in quanto esso è stato eliminato dal proprio host.'
            + '\nNon avendo ancora eseguito pagamenti per le prenotazioni, non hai diritto a nessun rimborso.'
            + '\nPuoi contattare l\'host all\'indirizzo ' + emailHost + ' per ulteriori chiarimenti.' 
            + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
        }

        transporter.sendMail(mailOptions_Avviso, function(error, info) {
            if (error) {
                console.log(error);
                errore = true;
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaAvvisoRendiconto = function(listaMail, callback) {
    errore = false;
    listaMail.forEach(function (arrayItem) {
        var mailDest = arrayItem.email;
        var comune = arrayItem.comune;
        var provincia = arrayItem.provincia;

        var mailOptions_Avviso = {
            from: 'dcbooking2020@gmail.com',
            to: mailDest,
            subject: 'Avviso rendiconto non effettuato',
            text: 
            'Ciao! Grazie per aver scelto DCBooking.\n\n' 
            + 'Ti comunichiamo che sono passati tre mesi dal tuo ultimo rendiconto effettuato ' 
            + "per il comune di " + comune + ' (provincia di ' + provincia + ").\n"
            + 'Abbiamo applicato delle restrizioni al tuo account e oscurato tutti i tuoi immobili '
            + 'in attesa che il rendiconto venga effettuato. Le restrizioni verranno rimosse una '
            + "volta eseguito." 
            + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
        }

        transporter.sendMail(mailOptions_Avviso, function(error, info){
            if (error) {
                console.log(error);
                errore = true;
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }); 

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

// Dati immobile nome comune, indirizzo e provincia
exports.inviaMailQuestura = function (listaOspiti, datiHost, datiImmobile, dataCheckIn, dataCheckOut, idPrenotazione, nomeComune, nomeProvincia, callback) {
    var elenco_ospiti = ""; 

    listaOspiti.forEach(function (arrayItem) {
        elenco_ospiti += "NOME E COGNOME: " + arrayItem.nome + " " + arrayItem.cognome + "; EMAIL: " + arrayItem.email + "; NATO IL: " + arrayItem.dataNascita + "\n";
    });

    var mail_questura = {
        from: "dcbooking2020@gmail.com",
        //Mail di testing (Ovviamente non possiamo inviare alla questura)
        to: "francex99@gmail.com",
        subject: "Avviso affitto casa",
        text: "Questa mail è generata automaticamente e serve per comunicare alla questura dell'affitto di un immobile.\n"
            + "Si comunica che:\n" 
            + datiHost.nome + " " + datiHost.cognome + " ha affittato una proprietà localizzata a " 
            + nomeComune + " (" + nomeProvincia + ")" + " al seguente indirizzo: "
            + datiImmobile.indirizzo + " da giorno " + convertDate(dataCheckIn) + " a giorno " + convertDate(dataCheckOut) + "\n\n"  
            + "Si forniscono inoltre, di seguito, le generalità degli ospiti e i rispettivi documenti: \n"
            + elenco_ospiti,
        attachments: [
            {
                path: './public/uploads/documentiOspiti/' + 'documentiOspiti_ID-' + idPrenotazione + ".zip"
            }
        ]
    }

    var errore = false;
    transporter.sendMail(mail_questura, function(error, info){
        if (error) {
            console.log(error);
            errore = true;
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaAvvisoSecondaRata = function(datiMail, callback) {
    errore = false;
    var mailDest = datiMail.email;
    var titoloImmobile = datiMail.titolo;
    var checkin = datiMail.checkin;
    var checkout = datiMail.checkout;

    var mailOptions_Avviso = {
        from: 'dcbooking2020@gmail.com',
        to: mailDest,
        subject: 'Avviso pagamento seconda rata',
        text: 
        'Ciao! Grazie per aver scelto DCBooking.\n\n' 
        + 'Ti inviamo questa e-mail per ricordarti che devi ancora pagare la seconda rata ' 
        + "per la prenotazione effettuata per l'immobile " + titoloImmobile + " per il periodo dal " 
        + convertDate(checkin) + " al " + convertDate(checkout) +".\n"
        + 'Ti ricordiamo che la prenotazione verrà annullata automaticamente nel caso in cui '
        + 'non venisse effettuato il saldo.'
        + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
    }

    transporter.sendMail(mailOptions_Avviso, function(error, info){
        if (error) {
            console.log(error);
            errore = true;
        } else {
            console.log('Email sent: ' + info.response);
        }
        
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaAvvisoAnnullamentoPrenotazione = function(datiMail, callback) {
    errore = false;
    var mailDest = datiMail.email;
    var titoloImmobile = datiMail.titolo;
    var checkin = datiMail.checkin;
    var checkout = datiMail.checkout;

    var mailOptions_Avviso = {
        from: 'dcbooking2020@gmail.com',
        to: mailDest,
        subject: 'Avviso annullamento automatico prenotazione',
        text: 
        'Ciao! Grazie per aver scelto DCBooking.\n\n' 
        + 'Ti inviamo questa e-mail per comunicarti che la prenotazione da te effettuata ' 
        + "per l'immobile " + titoloImmobile + " per il periodo dal " 
        + convertDate(checkin) + " al " + convertDate(checkout) +" è stata annullata automaticamente causa mancato pagamento.\n"
        + '\n--- --- ---\nQuesta e-mail è stata inviata automaticamente, non rispondere pls'
    }

    transporter.sendMail(mailOptions_Avviso, function(error, info){
        if (error) {
            console.log(error);
            errore = true;
        } else {
            console.log('Email sent: ' + info.response);
        }
        
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}

exports.inviaMailRendiconto = function (nomeFileRendiconto, datiUtente, datiComune, callback) {
    
    var mailOptions = {
        from: "dcbooking2020@gmail.com",
        //Mail di testing (Ovviamente non possiamo inviare alla questura)
        to: "antonino.monti02@community.unipa.it",
        subject: "Rendiconto - comune di " + datiComune.nomeComune + "(" + datiComune.nomeProvincia + ")",
        text: "In allegato il documento del rendiconto effettuato da " 
            + datiUtente.nome + " " + datiUtente.cognome
            + " per il comune di " + datiComune.nomeComune 
            + " (provincia di " + datiComune.nomeProvincia + ").\n",
        attachments: [
            {
                path: './public/uploads/rendiconti/' + nomeFileRendiconto
            }
        ]
    }

    var errore = false;
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
            errore = true;
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    if (errore == false) {
        callback(undefined, "250 Ok");
    }
    else {
        callback(undefined, "Errore");
    }
}