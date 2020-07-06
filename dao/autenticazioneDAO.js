const db = require('../database');

// --- Inserimento di un utente nel DB:
exports.inserisciUtente = function(email, passwordUtente, nome, cognome, dataNascita, callback) {
    exports.utenteGiaEsistente(email, function(giaRegistrato) {
        if (giaRegistrato) {
            callback(undefined, "Errore: utente già registrato");
        }
        else {
            const sql = "INSERT INTO Utente (email, passwordUtente, nome, cognome, dataNascita, foto) VALUES (?);";
            db.queryInserimento(sql, [[email, passwordUtente, nome, cognome, dataNascita, 'defaultAvatar.jpg']], callback);
        }
    });
}

// --- Richiesta di id_utente, email e password per l'autenticazione:
exports.richiediInfoAutenticazione = function(email, callback) {
    exports.utenteGiaEsistente(email, function(registrato) {
        if (registrato) {
            const sql = "SELECT ID_Utente, email, passwordUtente FROM Utente U WHERE email = ?";
            db.queryRichiesta(sql, [email], callback);
        }
        else {
            callback(undefined, "l'email non corrisponde a nessun utente.");
        }
    });
}

exports.controllaHost = function(idUtente, callback) {
    const sql = "SELECT restrizioni FROM Host WHERE ref_Utente = ?";
    db.queryRichiesta(sql, [idUtente], callback);
}

exports.aggiornaPassword = function(email, nuovaPassword, callback) {
    const sql = "UPDATE Utente SET passwordUtente = ? WHERE email = ?";
    db.queryAggiornamento(sql, [nuovaPassword, email], callback);
}

// --- Controlla se l'utente è già presente nel DB tramite controllo dell'email
exports.utenteGiaEsistente = function(email, callback) {
    const sql = "SELECT * FROM Utente WHERE email = ?";
    db.queryConfronto(sql, [email], function (result, msg) {
        if (msg == 'NO_MATCH') {
            callback(false);
        }
        else {
            callback(true);
        }
    });
}

exports.richiestaUtente = function(idUtente, callback) {
    const sql = "SELECT * FROM Utente WHERE ID_Utente = ?";
    db.queryRichiesta(sql, [idUtente], callback);
}

exports.richiestaDatiHost = function(idUtente, callback) {
    const sql = "SELECT * FROM Host WHERE ref_Utente = ?";

    db.queryRichiesta(sql, [idUtente], function(result, msg) {
        if (msg == 'OK') {
            callback(result, msg);
        }
        else {
            callback(undefined, msg);
        }
    });
}