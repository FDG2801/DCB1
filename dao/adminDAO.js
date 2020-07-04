const db = require('../database');
const bcrypt = require('bcryptjs');

/*
    Casi d'uso:
    - Login
        - Verifica esista admin
        - Mostra richieste pendenti (va fatta SOLO dopo la buona riuscita della query precedente)
    - Visualizza richiesta pendente
    - Accetta richiesta pendente
        - Trovo l'ID dell'utente da accettare
        - Lo aggiungo alla tabella degli host
        - Rimuovo dalle richieste pendenti
    - Declina richiesta pendente
*/

exports.aggiungiAdmin_Init = function(callback) {
    const listaAdmin = [
        {
            email: 'a@b.t',
            password: 'ciao'
        },
        {
            email: 'a@b.c',
            password: 'aaaa'
        }
    ];

    var sql = "";
    let values = [];

    listaAdmin.forEach(function(item) {
        var hashPassword = '';

        hashPassword = bcrypt.hashSync(item.password, 5);

        sql = sql + "CALL aggiungiAdmin(?);";
        values.push([item.email, hashPassword]);
    });

    db.queryInserimento(sql, values, callback);
}

exports.loginAdmin = function (emailInserita, passwordInserita, callback) {
    const sql = `
                SELECT *
                FROM Admin
                WHERE email = ?
                    AND passwordAdmin = ?
            `;
    db.queryRichiesta(sql, [emailInserita, passwordInserita], callback);
}

exports.richiediAdmin = function(email, callback) {
    const sql = `
                SELECT *
                FROM Admin
                WHERE email = ?
            `;
    db.queryRichiesta(sql, [email], callback);
}

exports.richiediAdmin_ID = function(idAdmin, callback) {
    const sql = `
                SELECT *
                FROM Admin
                WHERE ID_Admin = ?
            `;
    db.queryRichiesta(sql, [idAdmin], callback);
}

exports.richiestePendenti = function(callback) {
    const sql = `
            SELECT U.ID_Utente, U.email, U.nome, U.cognome, U.dataNascita, 
                U.telefono, U.foto AS foto, RH.codiceFiscale, RH.scansioneDocumento AS scansioneDocumento, RH.tipoDocumento
            FROM RichiestaHost RH, Utente U
            WHERE RH.ref_Utente = U.ID_Utente
        `;
    db.queryRichiesta(sql, [], callback);
}

exports.eliminaRichiestaPendente = function (idUtente, callback) {
    const sql = "DELETE FROM RichiestaHost WHERE ref_Utente = ?";
    db.queryEliminazione(sql, [idUtente], callback);
}

exports.accettaRichiestaPendente = function (idUtente, callback){
    console.log("Provo ad accettare la richiesta");
    const sql = `
                SET @codiceFiscale =   ( SELECT codiceFiscale 
                                         FROM RichiestaHost
                                         WHERE ref_Utente = ?
                                        );
                SET @scansioneDocumento =   ( SELECT scansioneDocumento 
                                              FROM RichiestaHost
                                              WHERE ref_Utente = ?
                                            );
                SET @tipoDocumento =   ( SELECT tipoDocumento 
                                         FROM RichiestaHost
                                         WHERE ref_Utente = ?
                                        );
                
                INSERT INTO host (ref_Utente, restrizioni, codiceFiscale, scansioneDocumento, tipoDocumento)
                VALUES (?, false, @codiceFiscale, @scansioneDocumento, @tipoDocumento);
                `;

    console.log("Richiesta accettata");
    
    db.queryInserimento(sql, [idUtente, idUtente, idUtente, idUtente], callback);
}