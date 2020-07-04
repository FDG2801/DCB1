const ricercaDAO = require('../dao/ricercaDAO');
const Joi = require('@hapi/joi');
const fileHandler = require('../fileHandler');

exports.richiediImmobiliVetrina = function(req, res) {
    ricercaDAO.immobiliVetrina(function(listaImmobili, msg) {
        if (msg === "OK") {
            listaImmobili.shift();
            listaImmobili[0].forEach(function(item) {
                let percorsoFoto = '';
                if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                    percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                }
                else {
                    percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                }
                item["percorsoFoto"] = percorsoFoto;
            });
            res.send({success: true, listaImmobili: JSON.stringify(listaImmobili[0]), message: "Immobili trovati!"});
        }
        else if (msg === "NO_RESULT") {
            res.send({success: true, listaImmobili: JSON.stringify([]), message: "Sembra che non ci siano immobili..."});
        }
        else {
            res.send({success: false, message: "Errore nella richiesta degli immobili della vetrina: " + msg});
        }
    });
}

exports.ricerca_Comune = function(req, res) {
    const schema = Joi.object({
        checkin: Joi.required(),
        checkout: Joi.required(),
        nOspiti: Joi.required(),
        comune: Joi.required()
    });

    var obj = {
        checkin: req.query.checkin,
        checkout: req.query.checkout,
        nOspiti: req.query.ospiti,
        comune: req.query.comune
    };

    var check = schema.validate(obj);

    if (check.error === undefined) {
        ricercaDAO.ricerca_Comune(req.query.checkin, req.query.checkout, req.query.comune ,req.query.ospiti,
            function(result, msg) {
            if (msg === "OK") {
                for(let i = 0; i < 4; i++) {
                    result.shift();
                }
                result[0].forEach(function(item) {
                    let percorsoFoto = '';
                    if (item.foto === fileHandler.defaultImmobile || item.foto == null) {
                        percorsoFoto = fileHandler.percorsoDefaults + fileHandler.defaultImmobile;
                    }
                    else {
                        percorsoFoto = fileHandler.percorsoImmobili + item.foto;
                    }
                    item["percorsoFoto"] = percorsoFoto;
                });
                res.send({success: true, data: JSON.stringify(result[0]), message: "Immobili trovati!"});
            }
            else if (msg === "NO_RESULT") {
                res.send({success: true, data: undefined, message: "Nessun immobile trovato."});
            }
            else {
                res.send({success: false, message: "Errore nella ricerca: " + msg});
            }
        });
    }
    else {
        res.send({success: false, message: "Errore: almeno uno dei parametri richiesti non è stato inserito."});
    }
}