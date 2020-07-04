const db = require('../database');

/*
    Casi d'uso:
    - Mostra contabilità
    - Avviso rendiconto trimestrale
        - Trova gli host che non hanno fatto rendiconto
        - Applica restrizioni all'host
        - Oscura le case degli host con restrizioni
    - Effettua rendiconto
        - Cerca dati per il rendiconto
        - Rimuovi restrizioni all'host
*/

/*
    - Entrate host (tutti i pagamenti per prenotazioni relative ad immobili dell'host)
    - Pagamenti host (tutti i pagamenti per i rendiconti)
    - Numero totale ospiti (somma ospiti per prenotazioni etc etc)
*/

exports.calcolaEntrateHost = function(idHost, callback) {
    const sql = `
        SELECT SUM(Pa.importo) AS entrate
        FROM Pagamento Pa, PrenotazioneAccettata Pac, Prenotazione P, Immobile I
        WHERE Pa.ref_Prenotazione = Pac.ref_Prenotazione
            AND Pac.ref_Prenotazione = P.ID_Prenotazione
            AND P.ref_Immobile = I.ID_Immobile
            AND I.ref_Host = ?;
    `;
    
    db.queryRichiesta(sql, [idHost], callback);
}

exports.calcolaUsciteHost = function(idHost, callback) {
    const sql = `
        SELECT SUM(PR.importo) AS uscite
        FROM PagamentoRendiconto PR
        WHERE PR.ref_Host = ?
            AND PR.importo >= 0;
    `;
    
    db.queryRichiesta(sql, [idHost], callback);
}

exports.calcolaTotaleOspitiHost = function(idHost, callback) {
    const sql = `
        SELECT COUNT(*) AS numOspiti
        FROM Ospiti O, PrenotazioneAccettata Pac, Prenotazione P, Immobile I
        WHERE O.ref_Prenotazione = Pac.ref_Prenotazione
            AND Pac.ref_Prenotazione = P.ID_Prenotazione
            AND P.ref_Immobile = I.ID_Immobile
            AND I.ref_Host = ?;
    `;
    
    db.queryRichiesta(sql, [idHost], callback);
}

exports.mostraContabilita = function (idHost, anno, callback) {
    const sql = `
        CREATE OR REPLACE VIEW OspitiPerPrenotazione AS (
            SELECT P.ID_Prenotazione AS ref_Prenotazione, COUNT(*) AS numOspiti 
            FROM Ospiti O, Prenotazione P
            WHERE O.ref_Prenotazione = P.ID_Prenotazione
            GROUP BY P.ID_Prenotazione
        );

        SELECT MONTH(P.checkin) as Mese, 
            SUM(P.saldoTotale - P.pagamentoTasseOnline * (OP.numOspiti - P.numeroEsenti) * I.tasseSoggiorno) as GuadagnoMensile
        FROM PrenotazioneAccettata Pac, Prenotazione P, Immobile I, OspitiPerPrenotazione OP
        WHERE Pac.ref_Prenotazione = P.ID_Prenotazione
            AND P.ref_Immobile = I.ID_Immobile
            AND OP.ref_Prenotazione = P.ID_Prenotazione
            AND I.ref_Host = ?
            AND YEAR(P.checkin) = ?
        GROUP BY MONTH(P.checkin);
    `;
    
    db.queryRichiesta(sql, [idHost, anno], callback);
}

exports.trovaHostDaAvvisare = function (callback) {
    const sql = `
        SELECT U.ID_Utente AS ID_Utente, U.email AS email, C.nome AS comune, P.nome AS provincia
        FROM Utente U, Host H, PagamentoRendiconto PR, Comuni C, Province P
        WHERE H.ref_Utente = U.ID_Utente
            AND H.restrizioni = 0
            AND PR.ref_Host = H.ref_Utente
            AND PR.ref_Comune = C.id_comune
            AND C.ref_provincia = P.id_provincia
            AND TIMESTAMPDIFF(MONTH,
                (
                    SELECT MAX(PR1.dataPagamento)
                    FROM PagamentoRendiconto PR1
                    WHERE PR1.ref_Host = H.ref_Utente
                        AND PR1.ref_Comune = C.id_comune
                ), CURDATE()
            ) >= 3;
    `;

    db.queryRichiesta(sql, [], callback);
}

exports.applicaRestrizioni = function(idHost, callback) {
    const sql = `
        UPDATE Host SET restrizioni = true WHERE ref_Utente = ?;
        
        UPDATE Immobile SET visibile = false WHERE ref_Host = ?;
        `;
    db.queryAggiornamento(sql, [idHost, idHost], callback);
}

exports.cercaDatiRendiconto = function(idHost, idComune, callback){
    const sql = `
        CREATE OR REPLACE VIEW TassePerPrenotazione AS (
            SELECT P.ID_Prenotazione AS ID_P, P.checkin AS checkin, P.checkout AS checkout, 
                (COUNT(*) - P.numeroEsenti) * I.tasseSoggiorno * TIMESTAMPDIFF(DAY, P.checkin, P.checkout) AS TassePrenotazione
            FROM Host H, Immobile I, Prenotazione P, PrenotazioneAccettata PA, Ospiti O
            WHERE H.ref_Utente = ?
                AND I.ref_comune = ?
                AND H.ref_Utente = I.ref_Host
                AND I.ID_Immobile = P.ref_Immobile
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND P.ID_Prenotazione = O.ref_Prenotazione
                AND P.saldoTotale <= (
                    SELECT SUM(Pag.importo)
                    FROM Pagamento Pag
                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                )
                AND (
                    SELECT MAX(PR1.dataPagamento)
                    FROM PagamentoRendiconto PR1
                    WHERE PR1.ref_Host = H.ref_Utente
                        AND PR1.ref_Comune = I.ref_comune
                ) <= (
                    SELECT MAX(Pag1.dataPagamento)
                    FROM Pagamento Pag1
                    WHERE Pag1.ref_Prenotazione = PA.ref_Prenotazione
                )
            GROUP BY P.ID_Prenotazione, P.checkin, P.checkout
        );
        
        SELECT *
        FROM TassePerPrenotazione TP, Ospiti O
        WHERE TP.ID_P = O.ref_Prenotazione;
    `;
    
    db.queryRichiesta(sql, [idHost, idComune], callback);
}

exports.richiediTotaleTasseRendiconto = function(idHost, idComune, callback){
    const sql = `
        CREATE OR REPLACE VIEW TassePerPrenotazione AS (
            SELECT P.ID_Prenotazione AS ID_P, P.checkin AS checkin, P.checkout AS checkout, 
                (COUNT(*) - P.numeroEsenti) * I.tasseSoggiorno * TIMESTAMPDIFF(DAY, P.checkin, P.checkout) AS TassePrenotazione
            FROM Host H, Immobile I, Prenotazione P, PrenotazioneAccettata PA, Ospiti O
            WHERE H.ref_Utente = ?
                AND I.ref_comune = ?
                AND H.ref_Utente = I.ref_Host
                AND I.ID_Immobile = P.ref_Immobile
                AND P.ID_Prenotazione = PA.ref_Prenotazione
                AND P.ID_Prenotazione = O.ref_Prenotazione
                AND P.saldoTotale <= (
                    SELECT SUM(Pag.importo)
                    FROM Pagamento Pag
                    WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                )
                AND (
                    SELECT MAX(PR1.dataPagamento)
                    FROM PagamentoRendiconto PR1
                    WHERE PR1.ref_Host = H.ref_Utente
                        AND PR1.ref_Comune = I.ref_comune
                ) <= (
                    SELECT MAX(Pag1.dataPagamento)
                    FROM Pagamento Pag1
                    WHERE Pag1.ref_Prenotazione = PA.ref_Prenotazione
                )
            GROUP BY P.ID_Prenotazione, P.checkin, P.checkout
        );
        
        SELECT SUM(TassePrenotazione) AS TotaleTasse
        FROM TassePerPrenotazione; 
    `;
    
    db.queryRichiesta(sql, [idHost, idComune], callback);
}

exports.pagamentoRendiconto = function(ref_Host, ref_Comune, importo, nomeDocumento, callback) {
    const sql = `
            INSERT INTO PagamentoRendiconto
            VALUES (?, CURDATE());

            UPDATE Host SET restrizioni = false WHERE ref_Utente = ?;
        `;
    db.queryInserimento(sql, [[ref_Host, ref_Comune, importo, nomeDocumento], ref_Host], callback);
}

exports.numeroRendicontiHostPerComune = function(idUtente, idComune, callback) {
    const sql = `
        SELECT COUNT(*) AS numeroRendicontiComune
        FROM PagamentoRendiconto PR
        WHERE ref_Host = ?
            AND ref_Comune = ?;
    `;

    db.queryRichiesta(sql, [idUtente, idComune], callback);
}

exports.richiediComuniDaRendicontare = function(idHost, callback) {
    const sql = `
        SELECT DISTINCT C.id_comune, C.nome
        FROM Immobile I, PagamentoRendiconto PR, Comuni C
        WHERE I.ref_Host = ?
            AND I.tasseSoggiorno >= 0
            AND PR.ref_Host = I.ref_Host
            AND PR.ref_Comune = C.id_comune
            AND I.ref_comune = C.id_comune
            AND EXISTS (
                SELECT *
                FROM Prenotazione P, PrenotazioneAccettata PA
                WHERE P.ref_Immobile = I.ID_Immobile
                    AND PA.ref_Prenotazione = P.ID_Prenotazione
                    AND P.saldoTotale <= (
                        SELECT SUM(Pag.importo)
                        FROM Pagamento Pag
                        WHERE Pag.ref_Prenotazione = PA.ref_Prenotazione
                    )
                    AND (
                        SELECT MAX(PR1.dataPagamento)
                        FROM PagamentoRendiconto PR1
                        WHERE PR1.ref_Host = PR.ref_Host
                            AND PR1.ref_Comune = PR.ref_Comune
                    ) <= (
                        SELECT MAX(Pag1.dataPagamento)
                        FROM Pagamento Pag1
                        WHERE Pag1.ref_Prenotazione = PA.ref_Prenotazione
                    )
            );
    `;

    db.queryRichiesta(sql, [idHost], callback);
}