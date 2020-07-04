/*
    timer: Oggetto che richiama periodicamente delle funzioni. Tali funzioni
        sono solitamente dei controlli da eseguire periodicamente.

    Funzioni:
    - Avviso rendiconto trimestrale (gestioneContabilita)
    - Avviso pagamento seconda rata (gestionePrenotazione)
    - Annullamento automatico prenotazione (gestionePrenotazione)
*/
const contabilitaControl = require('./controllers/gestioneContabilita');
const prenotazioneControl = require('./controllers/gestionePrenotazione');

exports.inizializzazioneTimer = function() {
    const day = 24 * 60 * 60 * 1000;
    setTimeout(contabilitaControl.avvisoRendicontoTrimestrale, day);
    setTimeout(prenotazioneControl.annullamentoAutomaticoPrenotazioni, day);
    setTimeout(prenotazioneControl.avvisoPagamentoSecondaRata, day);
}