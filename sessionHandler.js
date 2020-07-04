var sessioni = [];
var sessioniAdmin = [];

// --- Per utenti normali:
/*
    idUtente
    email
    isHost
    restrizioni
*/

const rimuoviSessione_Timer = function(data) {
    if (exports.esisteSessione(data)) {
        exports.cancellaSessione(data);
    }
}

exports.aggiungiSessione = function(data) {
    sessioni.push(data);
    setTimeout(rimuoviSessione_Timer, 3 * 60 * 60 * 1000, data);
}

exports.cancellaSessione = function(data) {
    for (let i = 0; i < sessioni.length; i++) {
        if (sessioni[i] == data) {
            sessioni.splice(i, 1);
        }
    }
}

exports.esisteSessione = function(data) {
    for (let i = 0; i < sessioni.length; i++) {
        if (sessioni[i].idUtente == data.idUtente) {
            return true;
        }
    }
    return false;
} 

// --- Per admin:
/*
    idAdmin
*/
const rimuoviSessioneAdmin_Timer = function(id) {
    if (exports.esisteSessioneAdmin(id)) {
        exports.cancellaSessioneAdmin(id);
    }
}

exports.aggiungiSessioneAdmin = function(id) {
    sessioniAdmin.push(id);
    setTimeout(rimuoviSessioneAdmin_Timer, 3 * 60 * 60 * 1000, id);
}

exports.cancellaSessioneAdmin = function(id) {
    for (let i = 0; i < sessioniAdmin.length; i++) {
        if (sessioniAdmin[i] == id) {
            sessioniAdmin.splice(i, 1);
        }
    }
}

exports.esisteSessioneAdmin = function(id) {
    for (let i = 0; i < sessioniAdmin.length; i++) {
        if (sessioniAdmin[i] == id) {
            return true;
        }
    }
    return false;
} 