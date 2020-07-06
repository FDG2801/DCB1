const db = require('../database');

/*
    Casi d'uso:
    - Richiedi tuple di "Immobile" relative all'host
    - Inserisci casa
    - Inserisci BnB
    - Modifica immobile 
    - Cancella Immobile
    - Oscura Immobile
    - Rimuovi Oscuramento Immobile
    - Visualizza Immobile Host
*/

exports.trovaComuneProvincia = function(idComune, callback) {
    const sql = `
        SELECT C.nome AS nomeComune, P.nome AS nomeProvincia 
        FROM Comuni C, Province P 
        WHERE C.id_comune = ?
            AND C.ref_provincia = P.id_provincia
        `;

    db.queryRichiesta(sql, [idComune], callback);
}

exports.trovaComuneProvinciaPerImmobile = function(idImmobile, callback) {
    const sql = `
        SELECT C.nome AS nomeComune, P.nome AS nomeProvincia 
        FROM Immobile I, Comuni C, Province P 
        WHERE I.ID_Immobile = ?
            AND I.ref_comune = C.id_comune 
            AND C.ref_provincia = P.id_provincia
        `;

    db.queryRichiesta(sql, [idImmobile], callback);
}

exports.trovaIDComune = function(nomeComune, callback) {
    const sql = 'SELECT id_comune FROM Comuni WHERE nome = ?';

    db.queryRichiesta(sql, [nomeComune], callback);
}

exports.richiediImmobiliHost = function(idUtente, callback) {
    const sql = `
                SELECT DISTINCT I.ID_Immobile, I.titolo, I.descrizione, I.indirizzo, I.bnb AS bnb, 
                    C.nome AS nome_comune, P.nome AS nome_provincia, 
                    I.visibile, H.restrizioni, I.foto AS foto
                FROM Immobile I, Comuni C, Province P, Host H
                WHERE H.ref_Utente = ?
                    AND I.ref_Host = H.ref_Utente
                    AND I.ref_comune = C.id_comune
                    AND C.ref_provincia = P.id_provincia;
                `;
    db.queryRichiesta(sql, [idUtente], callback);
}

exports.inserisciCasa = function(refHost, titolo, descrizione, regole, servizi, 
    modPag, percRimb, tasse, esenti, urlFoto, info, 
    indirizzo, cap, idComune,
    prezzoNotte, numBagni, postiLetto, callback) {

    let valuesInserisciCasa = [
        [refHost, titolo, descrizione, regole, servizi, 
            modPag, percRimb, tasse, esenti, urlFoto, info, 
            indirizzo, cap, idComune, false, true],
        [prezzoNotte, numBagni, postiLetto],
        [refHost]
    ];

    const sql = `
        INSERT INTO Immobile VALUES (NULL, ?, CURDATE());

        SET @maxID = (SELECT ID_Immobile
            FROM Immobile
            WHERE ID_Immobile = (
                SELECT MAX(I1.ID_Immobile)
                FROM Immobile I1
            )
        );

        INSERT INTO Casa VALUES (
            @maxID, ?);

        CALL aggiungiTuplaFintissima(?, @maxID);
    `;
    db.queryInserimento(sql, valuesInserisciCasa, callback);
}


exports.inserisciBnB = function( refHost, titolo, descrizione, regole, servizi, 
    modPag, modRimb, tasse, esenti, urlFoto, info,  
    indirizzo, cap, idComune,
    numeroSingole, numeroDoppie, numeroTriple, numeroQuadruple, numeroExtra, prezzoSingole,
    prezzoDoppie, prezzoTriple, prezzoQuadruple, prezzoExtra, personeCameraExtra, callback) {

    let valuesInserisciBnB = [
        [ refHost, titolo, descrizione, regole, servizi, 
            modPag, modRimb, tasse, esenti, urlFoto, info,
            indirizzo, cap, idComune, true, true],
        [ numeroSingole, numeroDoppie, numeroTriple, numeroQuadruple, 
            numeroExtra, prezzoSingole, prezzoDoppie, prezzoTriple, prezzoQuadruple, 
            prezzoExtra, personeCameraExtra ],
        [ refHost ]
    ];
    
    const sql = `
        INSERT INTO Immobile VALUES (NULL, ?, CURDATE());

        SET @maxID = (SELECT ID_Immobile
            FROM Immobile
            WHERE ID_Immobile = (
                SELECT MAX(I1.ID_Immobile)
                FROM Immobile I1
            )
        );

        INSERT INTO CamereBnB VALUES (
            @maxID, ?);

        CALL aggiungiTuplaFintissima(?, @maxID);
    `;

    db.queryInserimento(sql, valuesInserisciBnB, callback);
}

exports.modificaCasa = function (idImmobile, titolo, descrizione, regole, servizi,
    percRimborso, tasse, esentiTasse, urlFoto, info,
    prezzoNotte, numBagni, postiLetto, callback){
    
    let valuesModificaCasa = [titolo, descrizione, regole,
        servizi, percRimborso, tasse,
        esentiTasse, urlFoto, info, idImmobile,
        prezzoNotte, numBagni, postiLetto, idImmobile
    ];
        
    const sql = `
    UPDATE Immobile 
    SET titolo = ?, 
        descrizione = ?, 
        regoleDellaCasa = ?,
        servizi = ?,
        percentualeRimborso = ?,
        tasseSoggiorno = ?,
        esentiTasseSoggiorno = ?,
        foto = ?,
        infoLuogo = ?
    WHERE ID_Immobile = ?;

    UPDATE Casa
    SET prezzoPerNotte = ?,
        numeroBagni = ?, 
        postiLetto = ?
    WHERE ref_Immobile = ?
    `;

    db.queryAggiornamento(sql, valuesModificaCasa, callback);
} 

exports.modificaBnB = function(idImmobile, titolo, descrizione, regole,
    servizi, percRimborso, tasse,
    esentiTasse, urlFoto, info, numeroSingole,
    numeroDoppie, numeroTriple, numeroQuadruple, numeroExtra, prezzoSingole,
    prezzoDoppie, prezzoTriple, prezzoQuadruple, prezzoExtra, personeCameraExtra, callback) {
    
    let valuesModificaBnB = [ titolo, descrizione, regole,
        servizi, percRimborso, tasse,
        esentiTasse, urlFoto, info, idImmobile, 
        numeroSingole,
        numeroDoppie, numeroTriple, numeroQuadruple, numeroExtra, 
        prezzoSingole, prezzoDoppie, prezzoTriple, prezzoQuadruple, 
        prezzoExtra, personeCameraExtra, idImmobile ];

    const sql = `
    UPDATE Immobile 
    SET titolo = ?, 
        descrizione = ?, 
        regoleDellaCasa = ?,
        servizi = ?,
        percentualeRimborso = ?,
        tasseSoggiorno = ?,
        esentiTasseSoggiorno = ?,
        foto = ?,
        infoLuogo = ?
    WHERE ID_Immobile = ?;

    UPDATE CamereBnB 
    SET numeroSingole = ?, 
        numeroDoppie = ?,
        numeroTriple = ?, 
        numeroQuadruple = ?, 
        numeroExtra = ?,
        prezzoSingole = ?,
        prezzoDoppie = ?,
        prezzoTriple = ?,
        prezzoQuadruple = ?,
        prezzoExtra = ?, 
        personeCameraExtra = ?
    WHERE ref_Immobile = ?;
    `;

    db.queryAggiornamento(sql, valuesModificaBnB, callback);
}

exports.oscuraImmobile = function(idImmobile, callback){
    const sql = " UPDATE Immobile SET visibile = false WHERE ID_Immobile = ? ";
    db.queryAggiornamento(sql, [idImmobile], callback);
}

exports.rimuoviOscuramentoImmobile = function(idImmobile, callback){
    const sql = " UPDATE Immobile SET visibile = true WHERE ID_Immobile = ? ";
    db.queryAggiornamento(sql, [idImmobile], callback);
}

exports.richiestaImmobile = function(idImmobile, callback) {
    const sql = "SELECT * FROM Immobile WHERE ID_Immobile = ?";
    db.queryRichiesta(sql, [idImmobile], callback);
}

exports.richiestaDatiBnB = function(idImmobile, callback) {
    const sql = "SELECT * FROM CamereBnB WHERE ref_Immobile = ?";

    db.queryRichiesta(sql, [idImmobile], callback);
}

exports.richiestaDatiCasa = function(idImmobile, callback) {
    const sql = "SELECT * FROM Casa WHERE ref_Immobile = ?";

    db.queryRichiesta(sql, [idImmobile], callback);
}

// Richiedi tutte le email degli utenti da rimborsare:
exports.richiediEmailRimborso_Immobile = function(id_immobile, callback) {
    const sql = `
        SELECT U.ID_Utente AS ID_Utente, U.email AS email, SUM(Pag.importo) AS ImportoTotale
        FROM Utente U, Prenotazione P, PrenotazioneAccettata PA, Pagamento Pag
        WHERE U.ID_Utente = P.ref_Utente
            AND P.ID_Prenotazione = PA.ref_Prenotazione
            AND PA.ref_Prenotazione = Pag.ref_Prenotazione
            AND P.ref_Immobile = ?
            AND P.checkin >= CURDATE()
        GROUP BY U.ID_Utente, U.email;
        `;
    
    db.queryRichiesta(sql, [id_immobile], callback);
}

// Richiedi tutte le email degli utenti da avvisare (non rimborsare):
exports.richiediEmailAvvisoAnnullamento_Immobile = function(id_immobile, callback) {
    const sql = `
        SELECT DISTINCT U.ID_Utente AS ID_Utente, U.email AS email
        FROM Utente U, Prenotazione P, PrenotazioneAccettata PA
        WHERE U.ID_Utente = P.ref_Utente
            AND P.ID_Prenotazione = PA.ref_Prenotazione
            AND P.ref_Immobile = ?
            AND P.checkin >= CURDATE()
            AND NOT EXISTS (
                SELECT *
                FROM Pagamento Pag
                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
            );
        `;
    db.queryRichiesta(sql, [id_immobile], callback);
}

exports.cancellaImmobile = function (idImmobile, callback) {
    const sql = "DELETE FROM Immobile WHERE ID_Immobile = ?";
    db.queryEliminazione(sql, [idImmobile], callback);
} 