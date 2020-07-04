const db = require('../database');

/*
    Casi d'uso:
    - Ricerca
    - Visualizza Immobile (da immobiliDAO?)
*/

// --- Query per la vetrina:
exports.immobiliVetrina = function(callback) {
    const sql = `
        CREATE OR REPLACE VIEW ImmobiliVetrina AS (
            SELECT I.ID_Immobile, COUNT(DISTINCT P.ID_Prenotazione) AS numPrenotazioni
            FROM Immobile I LEFT JOIN Prenotazione P ON I.ID_Immobile = P.ref_Immobile
            WHERE I.visibile = true
            GROUP BY I.ID_Immobile
        );
        
        (
            SELECT I.ID_Immobile, I.titolo, I.descrizione, I.bnb, 
                Ca.prezzoPerNotte AS prezzo, 
                I.foto,
                Co.nome AS nomeComune,
                IV.numPrenotazioni AS pren
            FROM Immobile I, Casa Ca, Comuni Co, ImmobiliVetrina IV
            WHERE I.ID_Immobile = IV.ID_Immobile
                AND Ca.ref_Immobile = I.ID_Immobile
                AND I.ref_comune = Co.id_comune
        )
        UNION
        (
            SELECT I.ID_Immobile, I.titolo, I.descrizione, I.bnb, 
                GREATEST(CB.prezzoSingole, CB.prezzoDoppie, CB.prezzoTriple, CB.prezzoQuadruple, CB.prezzoExtra) AS prezzo,
                I.foto,
                Co.nome AS nomeComune,
                IV.numPrenotazioni AS pren
            FROM Immobile I, CamereBnB CB, Comuni Co, ImmobiliVetrina IV
            WHERE I.ID_Immobile = IV.ID_Immobile
                AND CB.ref_Immobile = I.ID_Immobile
                AND I.ref_comune = Co.id_comune
        )   
        ORDER BY pren DESC
        LIMIT ?;
    `;

    db.queryRichiesta(sql, [4], callback);
}

// --- Ricerca con comune:
exports.ricerca_Comune = function(checkin, checkout, nomeComune, nOspiti, callback) {
    let sql = `
        SET @dataCheckin = ?;
        SET @dataCheckout = ?;
        SET @nomeComune = ?;
        SET @nOspiti = ?;

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, 
                I.servizi AS servizi,
                Ca.prezzoPerNotte AS prezzo, 
                I.foto AS foto
            FROM Immobile I, Comuni Co, Casa Ca
            WHERE I.bnb = false
                AND I.visibile = true
                AND Ca.ref_Immobile = I.ID_Immobile
                AND I.ref_comune = Co.id_comune
                AND Co.nome = @nomeComune
                AND NOT EXISTS (
                    SELECT *
                    FROM Prenotazione P1, PrenotazioneAccettata PA1
                    WHERE P1.ref_Immobile = I.ID_Immobile
                        AND PA1.ref_Prenotazione = P1.ID_Prenotazione
                        AND ((@dataCheckin <= P1.checkin AND @dataCheckout >= P1.checkin)
                            OR (@dataCheckin >= P1.checkin AND @dataCheckin <= P1.checkout))
                )
                AND Ca.postiLetto >= @nOspiti
        )
        
        UNION

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, 
            I.servizi AS servizi,    
            GREATEST(CB.prezzoSingole, CB.prezzoDoppie, CB.prezzoTriple, CB.prezzoQuadruple, CB.prezzoExtra) AS prezzo,
                I.foto AS foto
            FROM Immobile I, Comuni Co, CamereBnB CB
            WHERE I.bnb = true
                AND I.visibile = true
                AND I.ID_Immobile = CB.ref_Immobile
                AND I.ref_comune = Co.id_comune
                AND CB.ref_Immobile = I.ID_Immobile
                AND Co.nome = @nomeComune
                AND @nOspiti <= (
                    SELECT (CB.numeroSingole + 2 * CB.numeroDoppie 
                        + 3 * CB.numeroTriple + 4 * CB.numeroQuadruple
                        + CB.personeCameraExtra * CB.numeroExtra) - COUNT(*)
                    FROM Prenotazione Pr1, PrenotazioneAccettata PA1, Ospiti O1
                    WHERE Pr1.ref_Immobile = I.ID_Immobile
                        AND Pr1.ID_Prenotazione = PA1.ref_Prenotazione
                        AND Pr1.ID_Prenotazione = O1.ref_Prenotazione
                        AND ((@dataCheckin <= Pr1.checkin AND @dataCheckout >= Pr1.checkin)
                            OR (@dataCheckin >= Pr1.checkin AND @dataCheckin <= Pr1.checkout))
                )
        );
    `;
    let values = [checkin, checkout, nomeComune, nOspiti];

    db.queryRichiesta(sql, values, callback);
}

// --- Ricerca con comune e provincia:
exports.ricerca_ComuneProvincia = function(checkin, checkout, nomeComune, nomeProvincia, nOspiti, callback) {
    let sql = `
        SET @dataCheckin = ?;
        SET @dataCheckout = ?;
        SET @nomeComune = ?;
        SET @nomeProvincia = ?;
        SET @nOspiti = ?;

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, Ca.prezzoPerNotte AS prezzo
            FROM Immobile I, Comune Co, Provincia Pr, Casa Ca
            WHERE I.bnb = false
                AND Ca.ref_Immobile = I.ID_Immobile
                AND I.ref_comune = Co.id_comune
                AND Co.ref_provincia = Pr.id_provincia
                AND Co.nome = @nomeComune
                AND Pr.nome = @nomeProvincia
                AND NOT EXISTS (
                    SELECT *
                    FROM Prenotazione P1, PrenotazioneAccettata PA1
                    WHERE P1.ref_Immobile = I.ID_Immobile
                        AND PA1.ref_Prenotazione = P1.ID_Prenotazione
                        AND ((@dataCheckin <= P1.checkin AND @dataCheckout >= P1.checkin)
                            OR (@dataCheckin >= P1.checkin AND @dataCheckin <= P1.checkout))
                )
                AND Ca.postiLetto >= @nOspiti
            GROUP BY I.ID_Immobile, 
        )

        UNION

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, 
                GREATEST(CB.prezzoSingole, CB.prezzoDoppie, CB.prezzoTriple, CB.prezzoQuadruple, CB.prezzoExtra) AS prezzo
            FROM Immobile I, Comune Co, Provincia Pr, CamereBnB CB
            WHERE I.bnb = true
                AND I.ID_Immobile = CB.ref_Immobile
                AND I.ref_comune = Co.id_comune
                AND Co.ref_provincia = Pr.id_provincia
                AND CB.ref_Immobile = I.ID_Immobile
                AND Co.nome = @nomeComune
                AND Pr.nome = @nomeProvincia
                AND @nOspiti <= (
                    SELECT (CB.numeroSingole + 2 * CB.numeroDoppie 
                        + 3 * CB.numeroTriple + 4 * CB.numeroQuadruple
                        + CB.personeCameraExtra * CB.numeroExtra) - COUNT(*)
                    FROM Prenotazione Pr1, PrenotazioneAccettata PA1, Ospiti O1
                    WHERE Pr1.ref_Immobile = I.ID_Immobile
                        AND Pr1.ID_Prenotazione = PA1.ref_Prenotazione
                        AND Pr1.ID_Prenotazione = O1.ref_Prenotazione
                        AND ((@dataCheckin <= P1.checkin AND @dataCheckout >= P1.checkin)
                            OR (@dataCheckin >= P1.checkin AND @dataCheckin <= P1.checkout))
                )
        );
    `;
    let values = [checkin, checkout, nomeComune, nomeProvincia, nOspiti];

    db.queryRichiesta(sql, values, callback);
}

// --- Ricerca con solo provincia:
exports.ricerca_Provincia = function(checkin, checkout, nomeProvincia, nOspiti, callback) {
    let sql = `
        SET @dataCheckin = ?;
        SET @dataCheckout = ?;
        SET @nomeProvincia = ?;
        SET @nOspiti = ?;

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, Ca.prezzoPerNotte AS prezzo
            FROM Immobile I, Comune Co, Provincia Pr, Casa Ca
            WHERE I.bnb = false
                AND Ca.ref_Immobile = I.ID_Immobile
                AND I.ref_comune = Co.id_comune
                AND Co.ref_provincia = Pr.id_provincia
                AND Pr.nome = @nomeProvincia
                AND NOT EXISTS (
                    SELECT *
                    FROM Prenotazione P1, PrenotazioneAccettata PA1
                    WHERE P1.ref_Immobile = I.ID_Immobile
                        AND PA1.ref_Prenotazione = P1.ID_Prenotazione
                        AND ((@dataCheckin <= P1.checkin AND @dataCheckout >= P1.checkin)
                            OR (@dataCheckin >= P1.checkin AND @dataCheckin <= P1.checkout))
                )
                AND Ca.postiLetto >= @nOspiti
            GROUP BY I.ID_Immobile, 
        )

        UNION

        (
            SELECT I.ID_Immobile AS ID_Immobile, I.titolo AS titolo, I.descrizione AS descrizione, I.bnb AS bnb, 
                GREATEST(CB.prezzoSingole, CB.prezzoDoppie, CB.prezzoTriple, CB.prezzoQuadruple, CB.prezzoExtra) AS prezzo
            FROM Immobile I, Comune Co, Provincia Pr, CamereBnB CB
            WHERE I.bnb = true
                AND I.ID_Immobile = CB.ref_Immobile
                AND I.ref_comune = Co.id_comune
                AND Co.ref_provincia = Pr.id_provincia
                AND CB.ref_Immobile = I.ID_Immobile
                AND Pr.nome = @nomeProvincia
                AND @nOspiti <= (
                    SELECT (CB.numeroSingole + 2 * CB.numeroDoppie 
                        + 3 * CB.numeroTriple + 4 * CB.numeroQuadruple
                        + CB.personeCameraExtra * CB.numeroExtra) - COUNT(*)
                    FROM Prenotazione Pr1, PrenotazioneAccettata PA1, Ospiti O1
                    WHERE Pr1.ref_Immobile = I.ID_Immobile
                        AND Pr1.ID_Prenotazione = PA1.ref_Prenotazione
                        AND Pr1.ID_Prenotazione = O1.ref_Prenotazione
                        AND ((@dataCheckin <= P1.checkin AND @dataCheckout >= P1.checkin)
                            OR (@dataCheckin >= P1.checkin AND @dataCheckin <= P1.checkout))
                )
        );
    `;
    let values = [checkin, checkout, nomeProvincia, nOspiti];

    db.queryRichiesta(sql, values, callback);
}