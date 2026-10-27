# Hotfix camminate 8 civiltà — SE e verifica Est
Data: 27 ottobre 2026

## Segnalazione in partita
- **NW (nord-ovest)**: giudicata corretta; NON MODIFICARE.
- **SE (sud-est, camminata in discesa)**: l'arto sinistro sullo schermo continua a guidare; sembra una camminata con gamba sempre avanti.
- **E (est, Mongoli)**: sospetta vista diagonale al posto del profilo laterale.

## Mappatura reale dei frame (7kaa)
Azioni `M` e `GM` di `STD.SET/SACTION`: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW.
`Sprite::need_mirror` specchia le viste verso Ovest: in uno sprite a 8 direzioni le viste SW/W/NW sono normalmente riflessi delle controparti orientali.
La grafica in `D3` viene usata quando il motore richiede SE; `D2` quando richiede E. Prima di modificare la mappatura del motore, verificare quale direzione di marcia viene richiesta e confrontarla con la proiezione su schermo.

## Patch sperimentale SE
- Solo in direzione **D3**, per tutte le otto civiltà e per `M/GM`, il ciclo diventa `A, A', B, B', C, C'`, con gamba di appoggio specchiata in ciascuna fase opposta.
- Gli arti vengono riflessi nella zona sotto il bacino, con perno di ancoraggio; torso, armi e materiali indicizzati restano inalterati.
- Le fasi esistenti su D7 NW e D1 NE non sono ridisegnate. D5 SW non è modificata.
- La MOD continuerà a usare il proprio loader nativo prima dell'avvio del motore; `STD.SET` e 8 `.SPR` saranno rigenerati e testati.
- Verifica dimensioni, offset, palette invariata, sprite classici invariati.

## Check visivo prima del merge
1. Comparare in-game SE D3 (normale e guardia) e NW D7 con almeno Mongoli, Romani e Celti.
2. Verificare che il piede alternativo non fluttui o si separi dal polpaccio; l'alternanza deve essere visibile anche in marcia continua e quando cambia direzione.
3. Guardare `contact-sheets/MONGOL-walk.png` e `MONGOL-GM-walk.png` (D3) del ramo, più le altre civiltà.
4. Verificare E D2 in-game: se è realmente una vista 3/4 errata, correggere esclusivamente D2 o l'associazione motore documentando il problema; non scambiare D2 e D1 alla cieca.
5. NON dichiarare collaudo visivo superato in base al solo test automatizzato di avvio.

**Nessun merge automatico** finché non c'è un'anteprima delle nuove pose verificata.
