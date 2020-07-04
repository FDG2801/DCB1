CREATE TABLE `Utente` (
  `ID_Utente` int PRIMARY KEY AUTO_INCREMENT,
  `email` string,
  `password` string,
  `nome` string,
  `cognome` string,
  `dataNascita` date,
  `telefono` string,
  `foto` string
);

CREATE TABLE `Host` (
  `ref_Utente` int PRIMARY KEY AUTO_INCREMENT,
  `restrizioni` boolean,
  `codiceFiscale` string,
  `scansioneDocumento` string,
  `tipoDocumento` string
);

CREATE TABLE `Admin` (
  `ID_Admin` int PRIMARY KEY AUTO_INCREMENT,
  `email` string,
  `password` string
);

CREATE TABLE `Immobile` (
  `ID_Immobile` int AUTO_INCREMENT,
  `ref_Host` int,
  `titolo` string,
  `descrizione` longtext,
  `regoleDellaCasa` longtext,
  `tariffePercentuali` string,
  `servizi` string,
  `modalitaPagamento` string,
  `modalitaRimborso` string,
  `tasseSoggiorno` string,
  `esentiTasseSoggiorno` string,
  `foto` string,
  `infoLuogo` longtext,
  `numeroCamere` string,
  PRIMARY KEY (`ID_Immobile`, `ref_Host`)
);

CREATE TABLE `Casa` (
  `ref_Immobile` int PRIMARY KEY AUTO_INCREMENT,
  `prezzoPerNotte` int,
  `numeroBagni` int
);

CREATE TABLE `BnB` (
  `ref_Immobile` int PRIMARY KEY AUTO_INCREMENT,
  `tipoCamere` int,
  `prezziCamere` int
);

CREATE TABLE `Prenotazione` (
  `ID_Prenotazione` int PRIMARY KEY AUTO_INCREMENT,
  `ref_Immobile` int,
  `ref_Utente` int,
  `checkin` date,
  `checkout` date,
  `saldoTotale` double,
  `saldoResiduo` double
);

CREATE TABLE `Ospiti` (
  `ID_Ospite` int PRIMARY KEY AUTO_INCREMENT,
  `ref_Prenotazione` int,
  `nome` string,
  `cognome` string,
  `email` string,
  `documento` string
);

CREATE TABLE `RichiestaHost` (
  `ref_Utente` int PRIMARY KEY,
  `codiceFiscale` string,
  `scansioneDocumento` string,
  `tipoDocumento` string
);

CREATE TABLE `Pagamento` (
  `ID_Pagamento` int PRIMARY KEY AUTO_INCREMENT,
  `ref_Prenotazione` int,
  `importo` double,
  `dataPagamento` date
);

ALTER TABLE `Utente` ADD FOREIGN KEY (`ID_Utente`) REFERENCES `Host` (`ref_Utente`);

ALTER TABLE `Immobile` ADD FOREIGN KEY (`ID_Immobile`) REFERENCES `Casa` (`ref_Immobile`);

ALTER TABLE `Immobile` ADD FOREIGN KEY (`ID_Immobile`) REFERENCES `BnB` (`ref_Immobile`);

ALTER TABLE `Immobile` ADD FOREIGN KEY (`ref_Host`) REFERENCES `Host` (`ref_Utente`);

ALTER TABLE `Prenotazione` ADD FOREIGN KEY (`ref_Utente`) REFERENCES `Utente` (`ID_Utente`);

ALTER TABLE `Prenotazione` ADD FOREIGN KEY (`ref_Immobile`) REFERENCES `Immobile` (`ID_Immobile`);

ALTER TABLE `Ospiti` ADD FOREIGN KEY (`ref_Prenotazione`) REFERENCES `Prenotazione` (`ID_Prenotazione`);

ALTER TABLE `RichiestaHost` ADD FOREIGN KEY (`ref_Utente`) REFERENCES `Utente` (`ID_Utente`);

ALTER TABLE `Pagamento` ADD FOREIGN KEY (`ref_Prenotazione`) REFERENCES `Prenotazione` (`ID_Prenotazione`);

