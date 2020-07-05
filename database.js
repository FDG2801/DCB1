var mysql = require('mysql');

// Connessione al database
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DCBdatabase',
    multipleStatements: true
});

connection.connect(function(error) {
    if(!!error){
        console.log('Errore: impossibile connettersi al database');
    } else {
        console.log('Connesso al database');
    }
});

/*
    Query per inserimento di dati
    In caso di successo, ritorna i risultati e un messaggio 'OK';
    In caso contrario, ritorna un oggetto "undefined" e il messaggio di errore.
*/
exports.queryInserimento = function insertQuery(sql, queryParams, callback) {
    connection.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback(undefined, err);
        }
        else {
            callback(result, "OK");
        }
    });
}

/*
    Query per le richieste
    In caso di successo, ritorna i risultati e un messaggio 'OK';
    In caso contrario, ritorna un oggetto "undefined" e il messaggio di errore.
*/
exports.queryRichiesta = function requestQuery(sql, queryParams, callback) {
    connection.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback(undefined, err);
        }
        else {
            callback(result, (result.length > 0) ? "OK" : "NO_RESULT");
        }
    });
}

/*
    Query per i confronti (se esistono tuple di X con valori Y)
    In caso di successo, ritorna la prima tupla del risultato e un messaggio 'OK';
    In caso contrario, ritorna un oggetto "undefined" e il messaggio di errore.
*/
exports.queryConfronto = function matchQuery(sql, queryParams, callback) {
    connection.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback(undefined, err);
        }
        else {
            callback(result[0], (result.length > 0) ? "OK" : "NO_MATCH");
        }
    });
}

/*
    Query per aggiornamento di dati
    In caso di successo, ritorna null e un messaggio 'OK';
    In caso contrario, ritorna null e il messaggio di errore.
*/
exports.queryAggiornamento = function updateQuery(sql, queryParams, callback) {
    connection.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback(null, err);
        }
        else {
            callback(null, "OK");
        }
    });
}

/*
    Query per l'eliminazione di dati
    In caso di successo, ritorna null e un messaggio 'OK';
    In caso contrario, ritorna null e il messaggio di errore.
*/
exports.queryEliminazione = function deleteQuery(sql, queryParams, callback) {
    connection.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback(null, err);
        }
        else {
            callback(null, "OK");
        }
    });
}

/*
    Query generica
    Ritorna 'OK' se la connessione è andata a buon fine, 'CONNECTION_ERROR' altrimenti
*/
exports.queryGenerica = function genericQuery(sql, queryParams, callback, conn = connection) {
    conn.query(sql, queryParams, function(err, result, fields) {
        if (err) {
            console.log(err);
            callback('CONNECTION_ERROR');
        }
        else {
            callback('OK');
        }
    })
}
/*
    Altri tipi di query:
    - richiesta; ritorna tuple + msg
    - confronto (se esistono tuple di X con valori Y); ritorna tuple + msg
    - aggiornamento; ritorna null + msg
    - eliminazione?; ritorna null + msg
*/