const db = require('../database');

/*
    Casi d'uso:
    - Prenotazione casa
        - Calcola numero giorni di prnotazione per la casa
        - Inserisci informazioni prenotazione nella tabella prenotazione e ospiti nella tabella degli ospiti
    - Annulla Prenotazione (lato utente)
        - Chiedi percentuale rimborso per l'immobile di cui si deve annullare la prenotazione
        - Elimina la prenotazione dalla tabella delle prenotazioni accettate
    - Pagamento
        - Richiedi le modalità di pagamento dell'immobile e l'importo da pagare
        - Aggiungi nuovo pagamento alla tabella
        - Calcolo saldo residuo (se c'è)
    - Invio dati alla questura
    - Avviso pagamento seconda rata
    - Accetta prenotazione (lato host)
    - Declina prenotazione (lato host)
*/

//Serve a controllare il famoso limite dei 28 giorni 
exports.calcolaGiorniPrenotazioni = function(idUtente, idImmobile, callback) {
    const sql =  `
                    SELECT SUM(DATEDIFF(P.checkout, P.checkin)) as SommaGiorni
                    FROM Prenotazione P, PrenotazioneAccettata PA
                    WHERE P.ref_Utente = ?
                        AND P.ref_Immobile = ?
                        AND P.ID_Prenotazione = PA.ref_Prenotazione
                        AND (YEAR(P.checkin) = YEAR(CURDATE()) OR YEAR(P.checkout) = YEAR(CURDATE()));
                `;
    db.queryRichiesta(sql, [idUtente, idImmobile], callback);
}

exports.aggiungiPrenotazione = function( idImmobile, idUtente, dataIn, dataOut,
    saldoTot, pagaTasseOnline, numeroEsenti, listaOspiti, listaFile, callback) {
    
    let values = [];

    //Prima inseriamo la prenotazione nella tabella delle prenotaizoni
    var sql = "INSERT INTO Prenotazione VALUES (NULL, ?, CURDATE());";
    values.push([idImmobile, idUtente, dataIn, dataOut, 
        saldoTot, pagaTasseOnline, numeroEsenti]);

    const sql2 = `
            SET @ultimaPrenotazione = (
                                        SELECT MAX(ID_Prenotazione)
                                        FROM prenotazione
                                        );
        `;
    sql = sql + sql2;
    
    //Ogni ciclo di for inserisce un ospite nella tabella degli ospiti relativa alla prenotazione appena caricata
    //Devp prendere l'ID dell'ultima prenotazione aggiunta
    listaOspiti.forEach( function(item) {
        let itemValues = [item.nome, item.cognome, item.dataNascita];
        for (let i = 0; i < listaFile.length; i++) {
            if (listaFile[i].originalname === item.documento) {
                itemValues.push(listaFile[i].filename);
                break;
            }
        }
        sql = sql + `INSERT INTO Ospiti (ref_Prenotazione, nome, cognome, dataNascita, documento) VALUES (@ultimaPrenotazione, ?);`;
        values.push(itemValues);
    });

    db.queryInserimento(sql, values, callback);
}

exports.aggiungiPrenotazione_BnB = function(idImmobile, idUtente, dataIn, dataOut, 
    saldoTot, pagaTasseOnline, numeroEsenti, 
    listaCamerePrenotate,
    listaOspiti, listaFile, callback) {
    
    let values = [];

    //Prima inseriamo la prenotazione nella tabella delle prenotaizoni
    var sql = `
        INSERT INTO Prenotazione (ref_Immobile, ref_Utente, checkin, checkout, saldoTotale, pagamentoTasseOnline, numeroEsenti, dataPrenotazione) 
        VALUES (?, CURDATE());
    `;
    values.push([idImmobile, idUtente, dataIn, dataOut, 
        saldoTot, pagaTasseOnline, numeroEsenti]);

    const sql2 = `
            SET @ultimaPrenotazione = (
                                        SELECT MAX(ID_Prenotazione)
                                        FROM Prenotazione
                                        );
        `;
    sql = sql + sql2;
    
    //Ogni ciclo di for inserisce un ospite nella tabella degli ospiti relativa alla prenotazione appena caricata
    //Devp prendere l'ID dell'ultima prenotazione aggiunta
    listaOspiti.forEach( function(item) {
        let itemValues = [item.nome, item.cognome, item.dataNascita];
        for (let i = 0; i < listaFile.length; i++) {
            if (listaFile[i].originalname === item.documento) {
                itemValues.push(listaFile[i].filename);
                break;
            }
        }
        sql = sql + `INSERT INTO Ospiti (ref_Prenotazione, nome, cognome, dataNascita, documento) VALUES (@ultimaPrenotazione, ?);`;
        values.push(itemValues);
    });

    let lista = [];

    for (let i = 0; i < listaCamerePrenotate.length; i++) {
        lista.push(listaCamerePrenotate[i]);
    }

    sql = sql + `
        INSERT INTO PrenotazioneDatiBnB (ref_Prenotazione, numeroSingolePrenotate, numeroDoppiePrenotate, numeroTriplePrenotate, numeroQuadruplePrenotate, numeroExtraPrenotate) 
        VALUES (@ultimaPrenotazione, ?);
    `;
    values.push(lista);

    db.queryInserimento(sql, values, callback);
}

exports.richiediMaxIDPrenotazione = function(callback) {
    const sql = `
        SELECT MAX(ID_Prenotazione) AS id
        FROM Prenotazione
        `;
    db.queryRichiesta(sql, [], callback);
}

exports.richiediHostImmobile = function(idImmobile, callback) {
    const sql = `
                SELECT U.ID_Utente AS ID, U.email AS email, U.nome AS nome, U.cognome AS cognome
                FROM Immobile I, Host H, Utente U
                WHERE I.ID_Immobile = ?
                    AND I.ref_Host = H.ref_Utente
                    AND H.ref_Utente = U.ID_Utente;
                `;
    db.queryRichiesta(sql, [idImmobile], callback);
}

exports.richiediDatiPrenotazione = function(idPrenotazione, callback) {
    const sql = `
                SELECT *
                FROM Prenotazione
                WHERE ID_Prenotazione = ?
                `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}

exports.richiestaCamerePrenotate = function(idPrenotazione, callback) {
    const sql = `
        SELECT PB.numeroSingolePrenotate, PB.numeroDoppiePrenotate, PB.numeroTriplePrenotate,
            PB.numeroQuadruplePrenotate, PB.numeroExtraPrenotate
        FROM Prenotazione P, PrenotazioneDatiBnB PB
        WHERE P.ID_Prenotazione = ?
            AND P.ID_Prenotazione = PB.ref_Prenotazione;
    `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}

exports.controllaPagamentiPrenotazione = function(idPrenotazione, callback) {
    const sql = `
                SELECT I.modalitaPagamento, COUNT(*) AS NumeroPagamenti
                FROM Prenotazione P, PrenotazioneAccettata PA, Pagamento Pag, Immobile I
                WHERE P.ID_Prenotazione = ?
                    AND P.ID_Prenotazione = PA.ref_Prenotazione
                    AND Pag.ref_Prenotazione = PA.ref_Prenotazione
                    AND P.ref_Immobile = I.ID_Immobile
                GROUP BY I.modalitaPagamento;
            `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}

exports.controllaDisponibilitaCasa = function(idImmobile, checkin, checkout, callback) {
    const sql = `
                SELECT *
                FROM Prenotazione P, PrenotazioneAccettata PA
                WHERE P.ref_Immobile = ?
                    AND ((? <= P.checkin AND ? >= P.checkin)
                    OR (? >= P.checkin AND ? <= P.checkout))
                    AND P.ID_Prenotazione = PA.ref_Prenotazione;
                `;
    db.queryRichiesta(sql, [idImmobile, checkin, checkout, checkin, checkin], callback);
}

exports.controllaDisponibilitaCamereBnB = function(idImmobile, checkin, checkout, callback) {
    const sql = `
            SELECT (CB.numeroSingole - SUM(PB.numeroSingolePrenotate)) AS singoleDisponibili, 
                (CB.numeroDoppie - SUM(PB.numeroDoppiePrenotate)) AS doppieDisponibili,
                (CB.numeroTriple - SUM(PB.numeroTriplePrenotate)) AS tripleDisponibili, 
                (CB.numeroQuadruple - SUM(PB.numeroQuadruplePrenotate)) AS quadrupleDisponibili,
                (CB.numeroExtra - SUM(PB.numeroExtraPrenotate)) AS extraDisponibili
            FROM Prenotazione P, PrenotazioneDatiBnB PB, Immobile I, CamereBnB CB
            WHERE I.ID_Immobile = ?
                AND CB.ref_Immobile = I.ID_Immobile
                AND P.ref_Immobile = I.ID_Immobile
                AND P.ID_Prenotazione = PB.ref_Prenotazione
                AND ((? <= P.checkin AND ? >= P.checkin)
                OR (? >= P.checkin AND ? <= P.checkout))
            GROUP BY I.ID_Immobile;
        `;
    db.queryRichiesta(sql, [
            idImmobile, 
            checkin, 
            checkout, 
            checkin,
            checkin
        ],
        callback);
}

exports.chiediPoliticheRimborso = function(idImmobile, callback) {
    const sql = `
                SELECT percentualeRimborso
                FROM Immobile
                WHERE ID_Immobile = ?
                `;
    db.queryRichiesta(sql, [idImmobile], callback);
}

exports.annullaPrenotazione = function(ID_Prenotazione, callback) {
    const sql = "DELETE FROM Prenotazione WHERE ID_Prenotazione = ?";
    db.queryEliminazione(sql, [ID_Prenotazione], callback);
}

exports.chiediModPagamento = function (ID_Prenotazione, callback) {
    const sql = `
    SELECT I.ID_Immobile, I.modalitaPagamento, P.saldoTotale
    FROM Immobile I, Prenotazione P
    WHERE P.ID_Prenotazione = ?
        AND P.ref_Immobile = I.ID_Immobile
    `;
    db.queryRichiesta(sql, [ID_Prenotazione], callback);
}

exports.effettuaPagamento = function(idPrenotazione, importo, callback) {
    const sql =  "INSERT INTO Pagamento VALUES (NULL, ?, ?, CURDATE());";
    db.queryInserimento(sql, [idPrenotazione, importo], callback);
}

exports.richiediSaldoResiduo = function(idPrenotazione, callback) {
    const sql = `
        SELECT P.ID_Prenotazione, (P.saldoTotale - SUM(Pg.importo)) AS saldoResiduo
        FROM Prenotazione P, PrenotazioneAccettata Pa, Pagamento Pg
        WHERE P.ID_Prenotazione = ?
            AND P.ID_Prenotazione = Pa.ref_Prenotazione
            AND Pa.ref_Prenotazione = Pg.ref_Prenotazione
        GROUP BY P.ID_Prenotazione
    `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}

// per avviso pagamento seconda rata
exports.richiediPrenotazioniDaSaldare = function (callback) {
    const sql = `
    SELECT P.ID_Prenotazione AS ID_Prenotazione
    FROM Immobile I, Prenotazione P, PrenotazioneAccettata Pa
    WHERE I.modalitaPagamento = 'dilazionato'
        AND I.ID_Immobile = P.ref_Immobile
        AND P.ID_Prenotazione = Pa.ref_Prenotazione 
        AND P.checkin - CURDATE() <= 6
        AND 2 > (
            SELECT COUNT(*)
            FROM Pagamento Pg
            WHERE Pg.ref_Prenotazione = Pa.ref_Prenotazione
        );
    `;
    db.queryRichiesta(sql, [], callback);
}

exports.richiediPrenotazioniDaAnnullare = function(callback) {
    const sql = `
        (
            SELECT P.ID_Prenotazione
            FROM Prenotazione P, PrenotazioneAccettata Pa
            WHERE P.ID_Prenotazione = Pa.ref_Prenotazione
                AND (CURDATE() - Pa.dataAccettazione) >= 3
                AND NOT EXISTS (
                    SELECT *
                    FROM Pagamento Pg1
                    WHERE Pg1.ref_Prenotazione = Pa.ref_Prenotazione
                )
        )

        UNION

        (
            SELECT P.ID_Prenotazione
            FROM Immobile I, Prenotazione P, PrenotazioneAccettata Pa
            WHERE I.modalitaPagamento = 'dilazionato'
                AND I.ID_Immobile = P.ref_Immobile
                AND P.ID_Prenotazione = Pa.ref_Prenotazione 
                AND P.checkin - CURDATE() <= 3
                AND 2 > (
                    SELECT COUNT(*)
                    FROM Pagamento Pg
                    WHERE Pg.ref_Prenotazione = Pa.ref_Prenotazione
                )
        );
    `;

    db.queryRichiesta(sql, [], callback);
}

exports.accettaPrenotazione = function (idPrenotazione, callback) {
    const sql = "INSERT INTO PrenotazioneAccettata VALUES (?, CURDATE())";
    db.queryInserimento(sql, [idPrenotazione], callback);
}

exports.declinaPrenotazione = function (idPrenotazione, motivazioniRifiuto, callback) {
    const sql = "INSERT INTO PrenotazioneRifiutata VALUES (?, ?, CURDATE())";
    db.queryInserimento(sql, [idPrenotazione, motivazioniRifiuto], callback);
}

exports.richiediOspitiPrenotazione = function(idPrenotazione, callback) {
    const sql = `
                SELECT *
                FROM Ospiti
                WHERE ref_Prenotazione = ?;
            `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}

exports.richiediTipoPrenotazione = function(idPrenotazione, callback) {
    const sql = `
                SET @idPrenotazione = ?;
                SET @pendente = (
                    SELECT COUNT(*)
                    FROM Prenotazione P
                    WHERE P.ID_Prenotazione = @idPrenotazione
                        AND NOT EXISTS (
                            SELECT *
                            FROM PrenotazioneAccettata PA
                            WHERE PA.ref_Prenotazione = P.ID_Prenotazione
                        )
                        AND NOT EXISTS (
                            SELECT *
                            FROM PrenotazioneRifiutata PR
                            WHERE PR.ref_Prenotazione = P.ID_Prenotazione
                        )
                );
                SET @daEvadere = (
                    SELECT COUNT(*)
                    FROM Prenotazione P, PrenotazioneAccettata PA, Immobile I
                    WHERE P.ID_Prenotazione = @idPrenotazione
                        AND PA.ref_Prenotazione = P.ID_Prenotazione
                        AND I.ID_Immobile = P.ref_Immobile
                        AND (
                                (
                                I.modalitaPagamento = "dilazionato"
                                AND 2 > (
                                    SELECT COUNT(*)
                                    FROM Pagamento Pag
                                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                                )
                            )
                            OR  (
                                I.modalitaPagamento <> "dilazionato"
                                AND 1 > (
                                    SELECT COUNT(*)
                                    FROM Pagamento Pag
                                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                                )
                            )
                        )
                );
                SET @archiviata = (
                    (
                        SELECT COUNT(*)
                        FROM Prenotazione P, PrenotazioneAccettata PA, Immobile I
                        WHERE P.ID_Prenotazione = @idPrenotazione
                            AND PA.ref_Prenotazione = P.ID_Prenotazione
                            AND I.ID_Immobile = P.ref_Immobile
                            AND (
                                    (
                                    I.modalitaPagamento = "dilazionato"
                                    AND 2 > (
                                        SELECT COUNT(*)
                                        FROM Pagamento Pag
                                        WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                                    )
                                )
                                OR  (
                                    I.modalitaPagamento <> "dilazionato"
                                    AND 1 > (
                                        SELECT COUNT(*)
                                        FROM Pagamento Pag
                                        WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                                    )
                                )
                            )
                    )
                    UNION
                    (
                        SELECT COUNT(*)
                    )
                );
            `;
    db.queryRichiesta(sql, [idPrenotazione], callback);
}