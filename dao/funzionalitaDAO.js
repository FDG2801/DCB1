const db = require('../database');

// --- Modifica dell'utente
exports.modificaProfiloUtente = function(idUtente, foto, telefono, callback) {
    const sql =  "UPDATE Utente SET telefono = ?, foto = ? WHERE ID_Utente = ?";
    db.queryAggiornamento(sql, [telefono, foto, idUtente], callback);
} 

// --- Modifica password
exports.modificaPassword = function(id_utente, password, callback) {
    const sql = "UPDATE Utente SET passwordUtente = ? WHERE ID_Utente = ?";
    db.queryAggiornamento(sql, [password, id_utente], callback);
}

// --- Elimina account 
exports.eliminaUtente = function(id_utente, callback) {
    const sql = "DELETE FROM Utente WHERE ID_Utente = ?";
    db.queryEliminazione(sql, [id_utente], callback);
}

// Richiedi tutte le email degli utenti da rimborsare:
exports.richiediEmailRimborso = function(id_host, callback) {
    const sql = `
        SELECT U.ID_Utente AS ID_Utente, U.email AS email, SUM(Pag.importo) AS ImportoTotale
        FROM Utente U, Prenotazione P, PrenotazioneAccettata PA, Immobile I, Pagamento Pag
        WHERE U.ID_Utente = P.ref_Utente
            AND P.ID_Prenotazione = PA.ref_Prenotazione
            AND PA.ref_Prenotazione = Pag.ref_Prenotazione
            AND P.ref_Immobile = I.ID_Immobile
            AND I.ref_Host = ?
            AND P.checkin >= CURDATE()
        GROUP BY U.ID_Utente, U.email;
        `;
    
    db.queryRichiesta(sql, [id_host], callback);
}

// Richiedi tutte le email degli utenti da avvisare (non rimborsare):
exports.richiediEmailAvvisoAnnullamento = function(id_host, callback) {
    const sql = `
        SELECT DISTINCT U.ID_Utente AS ID_Utente, U.email AS email
        FROM Utente U, Prenotazione P, PrenotazioneAccettata PA, Immobile I
        WHERE U.ID_Utente = P.ref_Utente
            AND P.ID_Prenotazione = PA.ref_Prenotazione
            AND P.ref_Immobile = I.ID_Immobile
            AND I.ref_Host = ?
            AND P.checkin >= CURDATE()
            AND NOT EXISTS (
                SELECT *
                FROM Pagamento Pag
                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
            );
        `;
    
    db.queryRichiesta(sql, [id_host], callback);
}

// --- Prenotazioni pendenti:
exports.richiediPrenotazioniPendenti = function(ref_utente, callback) {
    const sql = `
        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                P.saldoTotale
            FROM Prenotazione P, Host H, Utente U, Immobile I
            WHERE P.ref_Immobile = I.ID_Immobile
                AND P.ref_Utente = ?
                AND I.ref_Host = H.ref_Utente
                AND H.ref_Utente = U.ID_Utente
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
    `;
    db.queryRichiesta(sql, [ref_utente, ref_utente], callback);
}

// --- Prenotazioni da estinguere
exports.richiediPrenotazioniDaEstinguere = function(ref_utente, callback) {
    const sql = `
        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                I.percentualeRimborso, P.saldoTotale
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneAccettata PA
            WHERE P.ref_Immobile = I.ID_Immobile
                AND I.modalitaPagamento <> 'dilazionato'
                AND P.ref_Utente = ?
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND I.ref_Host = H.ref_Utente
                AND H.ref_Utente = U.ID_Utente
                AND 1 > (
                    SELECT COUNT(*)
                    FROM Pagamento Pag
                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                )
        )

        UNION

        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                I.percentualeRimborso, P.saldoTotale
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneAccettata PA
            WHERE P.ref_Immobile = I.ID_Immobile
                AND I.modalitaPagamento = 'dilazionato'
                AND P.ref_Utente = ?
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND I.ref_Host = H.ref_Utente
                AND H.ref_Utente = U.ID_Utente
                AND 2 > (
                    SELECT COUNT(*)
                    FROM Pagamento Pag
                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                )
        )
    `;
    db.queryRichiesta(sql, [ref_utente, ref_utente], callback);
}

// --- Prenotazioni estinte o rifiutate:
exports.richiediPrenotazioniArchiviate = function(ref_utente, callback) {
    const sql = `
        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                P.saldoTotale, 0 AS rifiutata
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneAccettata PA
            WHERE P.ref_Immobile = I.ID_Immobile
                AND P.ref_Utente = ?
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND I.ref_Host = H.ref_Utente
                AND H.ref_Utente = U.ID_Utente
                AND (
                        (
                            2 <= (
                                SELECT COUNT(*)
                                FROM Pagamento Pag
                                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                            )
                            AND I.modalitaPagamento = "dilazionato"
                        )
                        OR
                        (
                            EXISTS (
                                SELECT *
                                FROM Pagamento Pag
                                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                            )
                            AND I.modalitaPagamento <> "dilazionato"
                        )
                    )
        )

        UNION

        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                P.saldoTotale, 1 AS rifiutata
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneRifiutata PR
            WHERE P.ref_Immobile = I.ID_Immobile
                AND P.ref_Utente = ?
                AND P.ID_Prenotazione = PR.ref_Prenotazione
                AND I.ref_Host = H.ref_Utente
                AND H.ref_Utente = U.ID_Utente
        );
    `;
    db.queryRichiesta(sql, [ref_utente, ref_utente], callback);
}

//Visualizza prenotazioni ricevute
exports.richiediPrenotazioniRicevute = function(ref_host, callback){
    const sql = `
        SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
            P.saldoTotale
        FROM Prenotazione P, Utente U, Immobile I
        WHERE P.ref_Immobile = I.ID_Immobile
            AND I.ref_Host = ?
            AND P.ref_Utente = U.ID_Utente
            AND NOT EXISTS (
                SELECT *
                FROM PrenotazioneAccettata PA
                WHERE PA.ref_Prenotazione = P.ID_Prenotazione
            )
            AND NOT EXISTS (
                SELECT *
                FROM PrenotazioneRifiutata PR
                WHERE PR.ref_Prenotazione = P.ID_Prenotazione
            );
    `;
    db.queryRichiesta(sql, [ref_host], callback);
}

// --- Prenotazioni ricevute estinte o rifiutate:
exports.richiediPrenotazioniRicevute_Archiviate = function(ref_host, callback) {
    const sql = `
        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                P.saldoTotale, 0 AS rifiutata
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneAccettata PA
            WHERE P.ref_Immobile = I.ID_Immobile
                AND I.ref_Host = ?
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND P.ref_Utente = U.ID_Utente
                AND (
                        (
                            2 <= (
                                SELECT COUNT(*)
                                FROM Pagamento Pag
                                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                            )
                            AND I.modalitaPagamento = "dilazionato"
                        )
                        OR
                        (
                            EXISTS (
                                SELECT *
                                FROM Pagamento Pag
                                WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                            )
                            AND I.modalitaPagamento <> "dilazionato"
                        )
                    )
        )

        UNION

        (
            SELECT P.ID_Prenotazione, I.titolo, P.checkin, P.checkout, I.foto, U.nome, U.cognome,
                P.saldoTotale, 1 AS rifiutata
            FROM Prenotazione P, Host H, Utente U, Immobile I, PrenotazioneRifiutata PR
            WHERE P.ref_Immobile = I.ID_Immobile
                AND I.ref_Host = ?
                AND P.ID_Prenotazione = PR.ref_Prenotazione
                AND P.ref_Utente = U.ID_Utente
        );
    `;
    db.queryRichiesta(sql, [ref_host, ref_host], callback);
}


//Richiedi di diventare host
exports.diventaHost = function (idUtente, cf, urlScansioneDocumento, tipoDocumento, callback){
    const sql = "CALL nuovaRichiestaHost(?)";
    db.queryInserimento(sql, [[idUtente, cf, urlScansioneDocumento, tipoDocumento]], callback);
}

// Controlla se esiste una richiesta per diventare host:
exports.richiediRichiestaHost = function (idUtente, callback) {
    const sql = "SELECT * FROM RichiestaHost WHERE ref_Utente = ?";
    db.queryRichiesta(sql, [idUtente], callback);
}

