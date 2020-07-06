var multer = require('multer');
var fs = require('fs');
var autenticazioneDAO = require('./dao/autenticazioneDAO');
var funzionalitaDAO = require('./dao/funzionalitaDAO');
const archiver = require('archiver');
const path = require('path');

// --- Funzioni generiche:
exports.eliminaFile = function(percorsoFileInPublic, callback) {
    fs.unlink("./public/" + percorsoFileInPublic, (err) => {
        if (err) {
            callback(err)
        }
        else {
            callback("OK");
        }
    });
}

exports.controllaEstensioneFile = function(filename, listaEstensioniValide, callback) {
    let ext = path.extname(filename).toLowerCase();

    if (listaEstensioniValide.includes(ext)) {
        callback(true);
    }
    else {
        callback(false);
    }
}

exports.controllaEstensioneFileMultipli = function(listaFile, listaEstensioniValide, callback) {
    let errore = false;
    for (let i = 0; i < listaFile.length; i++) {
        let ext = path.extname(listaFile[i].originalname).toLowerCase();
        if (listaEstensioniValide.includes(ext)) {
            continue;
        }
        else {
            errore = true;
            break;
        }
    }

    callback(!errore);
}

// --- Upload/eliminazione di documenti per diventare host:
var hostDocStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/hostdocs');
    },
    filename: function (req, file, cb) {
        cb(null , 'DOC-' + Date.now() + '-' + file.originalname);
    }
});

exports.uploadDocHost = multer({
    storage: hostDocStorage
}).single('docHost');

exports.eliminaDocHost = function(nomeFile, callback) {
    fs.unlink('./public/uploads/hostdocs/' + nomeFile, (err) => {
        if (err) {
            callback(err)
        }
        else {
            callback("OK");
        }
    });
}

exports.inviaDocumentiHost = function(req, res) {
    idUtente = req.query.idUtente;

    funzionalitaDAO.richiediRichiestaHost(idUtente, function(result, msg) {
        if (msg === "OK") {
            res.sendFile(result[0].scansioneDocumento, {root: './public/uploads/hostdocs'});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: true, message: "Non è stata trovata nessuna richiesta da parte dell'utente."});
        }   
        else {
            res.send({success: false, message: msg});
        }
    });
}

// --- Upload/eliminazione di avatar utenti:
const defaultAvatar = 'defaultAvatar.jpg';

var userAvatarStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/avatarUtenti');
    },
    filename: function (req, file, cb) {
        cb(null , 'AVATAR-' + Date.now() + '-' + file.originalname);
    }
});

exports.uploadAvatarUtente = multer({
    storage: userAvatarStorage
}).single('avatarUtente');

exports.eliminaAvatarUtente = function(nomeFile, callback) {
    fs.unlink('./public/uploads/avatarUtenti/' + nomeFile, (err) => {
        if (err) {
            callback(err)
        }
        else {
            callback("OK");
        }
    });
}

exports.inviaAvatarUtente = function(req, res) {
    idUtente = req.query.idUtente;

    autenticazioneDAO.richiestaUtente(idUtente, function(result, msg) {
        if (msg === "OK") {
            if (result[0].foto === defaultAvatar || result[0].foto == null) {
                res.sendFile(defaultAvatar, {root: './public/defaults'});
            }
            else {         
                res.sendFile(result[0].foto, {root: './public/uploads/avatarUtenti'});
            }
        }
        else {
            res.send({success: false, message: msg});
        }   
    });
}

// --- Upload/eliminazione di immagini di immobili:
const defaultImmobile = 'defaultImmobile.jpg';

var immaginiImmobiliStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/immobili');
    },
    filename: function (req, file, cb) {
        cb(null , 'IMG-' + Date.now() + '-' + file.originalname);
    }
});

exports.uploadImmagineImmobile = multer({
    storage: immaginiImmobiliStorage
}).single('foto');

exports.eliminaImmagineImmobile = function(nomeFile, callback) {
    fs.unlink('./public/uploads/immobili/' + nomeFile, (err) => {
        if (err) {
            callback(err)
        }
        else {
            callback("OK");
        }
    });
}

exports.inviaImmagineImmobile = function(req, res) {
    idImmobile = req.query.idImmobile;

    immobiliDAO.richiestaImmobile(idImmobile, function(result, msg) {
        if (msg === "OK") {
            if (result[0].foto === defaultImmobile || result[0].foto == null) {
                res.sendFile(defaultImmobile, {root: './public/defaults/'});
            }
            else {
                res.sendFile(result[0].foto, {root: './public/uploads/immobili'});
            }
        }
        else {
            res.send({success: false, message: msg});
        }   
    });
}

// --- Upload di documenti degli ospiti:
var documentiOspitiStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './public/uploads/documentiOspiti');
    },
    filename: function (req, file, cb) {
        cb(null , 'IMG-' + Date.now() + '-' + file.originalname);
    }
});

exports.uploadDocumentiOspiti = multer({
    storage: documentiOspitiStorage
}).array('documentiOspiti', 50);

exports.eliminaDocumentoOspite = function(nomeFile, callback) {
    fs.unlink('./public/uploads/documentiOspiti/' + nomeFile, (err) => {
        if (err) {
            callback(err)
        }
        else {
            callback("OK");
        }
    });
}

exports.creaArchivioDocumenti = function(listaOspiti, idPrenotazione, listaFile, callback) {
    // --- Genera un file zip contenente tutti i documenti degli ospiti:
    var archiveName = 'documentiOspiti_ID-' + idPrenotazione +'.zip';

    var output = fs.createWriteStream('./public/uploads/documentiOspiti/' + archiveName);

    var zip = archiver('zip');

    zip.on('warning', function(err) {
        if (err.code === 'ENOENT') {
            console.log(err);
        } else {
            callback(err);
        }
    });

    zip.pipe(output);

    for (let i = 0; i < listaFile.length; i++) {
        let ext = path.extname('./public/uploads/documentiOspiti/' + listaFile[i].filename);
        for (let j = 0; j < listaOspiti.length; j++) {
            if (listaOspiti[j].documento == listaFile[i].originalname) {
                zip.append(fs.createReadStream('./public/uploads/documentiOspiti/' + listaFile[i].filename), 
                    {name: (i + 1) + "-" + listaOspiti[j].nome + "-" + listaOspiti[j].cognome + ext});  
            }
        }
    }

    zip.finalize();
    // --- fine generazione zip --- //

    for (var i = 0; i < listaOspiti.length; i++) {
        exports.eliminaDocumentoOspite(listaFile[i].filename, function(msg) {
            console.log(msg);
        });
    }

    callback("OK");
}

exports.richiediPercorsoArchivioDocumenti = function(idPrenotazione, callback) {
    fs.exists('./public/uploads/documentiOspiti/' + 'documentiOspiti_ID-' + idPrenotazione +'.zip', function(exists) {
        if (exists) {
            callback('uploads/documentiOspiti/' + 'documentiOspiti_ID-' + idPrenotazione +'.zip', "OK");
        }
        else {
            callback('', "NO_RESULT");
        }
    });
}

// Esporta le costanti di default e i percorsi:
exports.defaultAvatar = defaultAvatar;
exports.defaultImmobile = defaultImmobile;
exports.percorsoDefaults = 'defaults/';
exports.percorsoAvatar = 'uploads/avatarUtenti/';
exports.percorsoImmobili = 'uploads/immobili/';
exports.percorsoDocHost = 'uploads/hostdocs/';
exports.percorsoDocOspiti = 'uploads/documentiOspiti/';