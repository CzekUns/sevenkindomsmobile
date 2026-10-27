---
name: seven-kingdoms-oblique-walk
description: "Regola vincolante per creare/rifinire le animazioni di camminata obliqua delle unità di Seven Kingdoms MOD. Usare se si modificano gambe, piedi, gonne/tuniche o frame M/GM nelle diagonali NE, SE, SW, NW."
---

# Skill — camminate oblique, metodo approvato

**Stato:** metodo grafico approvato il 27-10-2026 per il prototipo romano. **Non confondere l'approvazione del movimento nella GIF con l'approvazione di uno sprite nativo pronto per il gioco.**

## Regola principale, inderogabile

Le due gambe sono **due oggetti grafici distinti**, estratti dai loro pixel originali. In ciascun passo vengono **traslate e ruotate rigidamente**, in senso opposto e attorno a punti d'anca nascosti dalla tunica/gonnellino. **Non ridimensionare, deformare, specchiare, stirare o ricostruire proceduralmente le gambe** per simulare il passo. Il busto, lo scudo, l'arma e il gonnellino restano protetti. Ogni pixel della vecchia gamba viene rimosso sotto l'orlo prima di comporre le nuove posizioni.

**Profondità costante:** la gamba esterna, quella visivamente più vicina alla camera, viene sempre disegnata **sopra** la gamba interna. Questo ordine NON si inverte quando cambia la gamba che avanza. I piedi possono cambiare posizione sul terreno, ma le due gambe non devono mai attraversarsi visivamente.

## Quando usare la skill

Ogni intervento sulle diagonali di camminata NE/D1, SE/D3, SW/D5 e NW/D7, sulle azioni `M` e `GM`, o su animazioni analoghe di altre unità. La prova iniziale è esclusivamente romana: **non propagare automaticamente lo stesso ritaglio o gli stessi angoli alle altre civiltà**. Le direzioni cardinali N/E/S/W sono fuori ambito e non devono essere alterate.

## Input obbligatori

1. Sprite originale del personaggio nella direzione oggetto di modifica, alla **risoluzione nativa** e con trasparenza/palette leggibili; eventuale equipaggiamento va tenuto separato dove possibile.
2. Una sequenza di riferimento che mostri un passo realmente alternato (per esempio le sei pose autentiche degli Egizi di Seven Kingdoms) e il numero di frame richiesto dal motore.
3. Il **campione approvato romano**: `roman_camminata_occlusione_corretta.gif` e `roman_occlusione_confronto.png`, disponibili anche nel pacchetto locale di riferimento. Se non presenti nel repository o negli allegati, recuperare i campioni: **non dichiarare equivalenti nuove immagini non confrontate con la GIF approvata**.
4. Informazioni per `SFRAME` (dimensioni, crop e punto d'ancoraggio) e palette di gioco, quando si prepara un'integrazione nativa.

## Procedura da seguire nell'ordine

1. **Bloccare busto e gonnellino.** Isolare il torso completo fino all'orlo; non modificare armatura, scudo, armi, viso, proporzioni o colori di fazione.
2. **Mascherare separatamente le gambe.** Creare un layer per la gamba esterna e uno per l'interna. Ogni pixel deve appartenere a **una sola** gamba; non includere nell'estrazione ombre, fondale o tunica.
3. **Pulizia totale.** Rimuovere dalla base tutte le parti delle vecchie gambe sotto il gonnellino, incluse le briciole di 1–2 pixel, anche lungo i bordi e tra le cosce. Non lasciare moncherini, gambe fantasma o scarpe duplicate.
4. **Perni nascosti.** Definire un pivot per ciascuna anca, nascosto sotto il gonnellino. I due perni e gli angoli si tarano sul personaggio, non vengono copiati in modo assoluto dal prototipo romano.
5. **Scambio rigido.** Portare la gamba interna dalla posizione arretrata a quella avanzata con **traslazione + rotazione**; portare l'esterna in senso opposto, conservando per ciascuna *la stessa lunghezza e larghezza* e gli stessi pixel sorgente. Non simulare il passo cambiando la scala.
6. **Passo centrale reale.** Inserire la posa con entrambe le gambe vicine alla verticale sotto il bacino mentre si incrociano le traiettorie. Deve esistere una transizione credibile fra passo A e passo B; non replicare sempre la stessa gamba avanti.
7. **Compositing fisso (dal fondo al primo piano):** ombra ancorata al terreno → gamba interna → **gamba esterna** → busto/gonnellino originale. La gamba esterna copre sempre l'interna nella zona di sovrapposizione, anche al centro del ciclo. Nessuno scambio di z-index durante l'animazione.
8. **Render pixel art:** traslazioni e rotazioni a scala 1:1 sullo sprite nativo; campionamento **nearest neighbor**; eventuali ingrandimenti solo per l'anteprima. Preservare contorni e palette. Se una rotazione apre piccoli buchi, correggerli localmente senza dilatare la gamba.
9. **Controllo ciclico:** confrontare ogni frame alla stessa origine di terra; mostrare **GIF normale, GIF lenta, tre pose A/CENTRO/B e maschere separate**. Verificare piedi, ginocchia, cucitura sotto l'orlo e alternanza, prima di generare altri orientamenti.
10. **Integrazione controllata:** solo dopo approvazione grafica, convertire nel formato sprite nativo del gioco, correggere crop/origine in `SFRAME`, testare `M` e `GM`, verificare specchiamenti del renderer e aprire PR di revisione. Non fare merge prima del collaudo.

## Sequenza di riferimento approvata (prototipo, NON file SFRAME)

La GIF campione contiene **otto pose** per visualizzare il movimento completo:
`A → transizione 1 → passo centrale → transizione 2 → B → ritorno 2 → centro ritorno → ritorno 1 → A`.

Nel prototipo i parametri normalizzati sono `t = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25]`, con asse esterno sempre in primo piano. Questi valori riguardano **solo la visualizzazione approvata**, non il numero di fotogrammi richiesto dal motore. Il gioco può richiedere **sei** frame: adattare/ri-disegnare un ciclo a sei pose mantenendo entrambe le battute del passo e il passaggio centrale, senza tagliare frame arbitrariamente. Validare nuovamente la GIF a sei frame.

## Cosa NON fare

- Non usare ImageGen per produrre automaticamente sei frame di camminata: ripete spesso la stessa gamba avanti. Può eventualmente produrre un **design statico**, non sostituisce le pose.
- Non scambiare le gambe con **zoom**, compressione o semplice specchio dell'intera metà inferiore.
- Non sovrapporre l'interna all'esterna a metà ciclo.
- Non trascinare l'ombra insieme al piede né limitarsi a renderla più scura senza curarne la superficie.
- Non ritoccare direzioni cardinali, civiltà estranee o i frame originali funzionanti.
- Non considerare riuscito il risultato perché lo script termina o Chromium avvia il gioco: la **qualità visiva della GIF è un gate separato**.

## Verifiche di accettazione

- [ ] La gamba davanti cambia davvero fra i due passi e la fase centrale è leggibile.
- [ ] Gambe: nessun ridimensionamento, stiramento o cambio involontario di volume.
- [ ] **La gamba esterna copre SEMPRE quella interna** nell'intersezione.
- [ ] Sotto il gonnellino: **zero pixel residui** delle vecchie gambe.
- [ ] Nessuna disconnessione tra coscia, ginocchio, tibia e piede, né piede duplicato.
- [ ] Busto, gonnellino, colori, scudo e arma invariati.
- [ ] Ombra stabile rispetto al terreno e proporzionata al personaggio.
- [ ] Nessuno scatto fra ultimo e primo fotogramma, anche nella GIF lenta.
- [ ] Nessuna regressione alle altre direzioni o ad altre civiltà.
- [ ] Campione confrontato visivamente con la **GIF romana approvata**; reviewer ha approvato la direzione interessata.

## Formato di consegna per OGNI nuova direzione

`frames/<unità>/<modalità>/<direzione>/F01…F06.png` (o il numero corretto per il renderer), PNG trasparenti e allineati; `preview.gif`, `preview-slow.gif`, `poses-A-center-B.png`, `masks-front-back.png`, `QA.md` (anatomia, occlusione, palette, offset, confronti e approvazione). Conservare asset e codice sorgente dei ritagli per interventi successivi.

## Riferimenti

- `references/APPROVED-ROMAN.md`: specifica del prototipo approvato e parametri **non universali**.
- In caso di conflitto con vecchi script di traslazione automatica o inversione del layering (`restore_walk_frames.py` e derivati), **questa skill prevale** per la revisione artistica.
