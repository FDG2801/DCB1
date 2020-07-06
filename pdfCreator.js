const PDFDocument = require('pdfkit');
const fs = require('fs');
const contabilitaDAO = require('./dao/contabilitaDAO');

const dirRendiconti = './uploads/rendiconti/';

const convertDate = function(date) {
    let d = new Date(date);
    return [d.getDate(), d.getMonth() + 1, d.getFullYear()].join('/');
}

exports.generaDocumentoRendiconto = function(datiRendiconto, datiHost, nomeComune, datiImmobile, importo, callback) {
    contabilitaDAO.numeroRendicontiHostPerImmobile(datiHost.ID_Utente, datiImmobile[0].ID_Immobile, function(result, msg) {
        if (msg === "OK") {
            let nomeFile = "RENDICONTO-" + result[0].numeroRendicontiImmobile + "-" + datiImmobile[0].ID_Immobile + "-" + datiHost.ID_Utente + "_" + datiHost.nome.replace(/\s/g,'') + "_" + datiHost.cognome.replace(/\s/g,'') + ".pdf";

            // Elimina il documento di rendiconto se ne esisteva già uno con lo stesso nome
            fs.exists('./public/uploads/rendiconti/' + nomeFile, function(exists) {
                if (exists) {
                    fs.unlink('./public/uploads/rendiconti/' + nomeFile, function(err) {
                        console.log(err);
                    });
                }
            });
            var doc = new PDFDocument;

            doc.pipe(fs.createWriteStream('./public/uploads/rendiconti/' + nomeFile));

            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0');
            var yyyy = today.getFullYear();

            today = mm + '/' + dd + '/' + yyyy;

            doc.fontSize(20).text("Documento di rendiconto", {
                align: 'center'
            });

            doc.fontSize(18).fillColor('grey').text("Comune di " + nomeComune);
            doc.fontSize(18).fillColor('grey').text("Immobile: " + nomeComune);
            doc.fontSize(18).fillColor('grey').text("Indirizzo: " + datiImmobile[0].indirizzo);
            doc.fontSize(18).fillColor('grey').text("Data: " + today);
            doc.fontSize(16).fillColor('grey').text("Host: " + datiHost.nome + " " + datiHost.cognome);
            doc.fontSize(16).fillColor('grey').text("Totale Tasse: €" + importo);
            doc.moveDown();

            /*
                Per ogni prenotazione:
                - Periodo (check-in, check-out)
            */

            var datiPrenotazione = {idPrenotazione: datiRendiconto[0].ID_P, dataCheckin: datiRendiconto[0].checkin, dataCheckout: datiRendiconto[0].checkout};
            var datiOspiti = [];
            datiRendiconto.forEach(function(item) {
                if (item.ID_P != datiPrenotazione.idPrenotazione) {
                    doc.moveDown().fontSize(18).fillColor('black').text("Prenotazione: " + convertDate(datiPrenotazione.dataCheckin) + " - " + convertDate(datiPrenotazione.dataCheckout));
                    datiOspiti.forEach(function(itemOspiti) {
                        doc.fontSize(10).text("Ospite: " + itemOspiti.nomeOspite + " " + itemOspiti.cognomeOspite + "; Data di nascita: " + convertDate(itemOspiti.dataNascita));
                    });

                    datiOspiti = [];
                    datiOspiti.push({
                        nomeOspite: item.nome, 
                        cognomeOspite: item.cognome,
                        dataNascita: item.dataNascita
                    });
                    datiPrenotazione = {idPrenotazione: item.ID_P, dataCheckin: item.checkin, dataCheckout: item.checkout};
                }
                else {
                    datiOspiti.push({
                        nomeOspite: item.nome, 
                        cognomeOspite: item.cognome,
                        dataNascita: item.dataNascita
                    });
                }
            });

            doc.moveDown().fontSize(18).fillColor('black').text("Prenotazione: " + convertDate(datiPrenotazione.dataCheckin) + " - " + convertDate(datiPrenotazione.dataCheckout));
            datiOspiti.forEach(function(itemOspiti) {
                doc.fontSize(10).text("Ospite: " + itemOspiti.nomeOspite + " " + itemOspiti.cognomeOspite + "; Data di nascita: " + convertDate(itemOspiti.dataNascita));
            });

            doc.end();

            callback("OK", nomeFile);
        }
        else {
            callback("errore", undefined);
        }
    });

    
};
