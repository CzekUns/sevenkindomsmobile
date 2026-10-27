# ROMAN — prima applicazione della skill camminate oblique

**Stato:** revisione visiva obbligatoria prima del merge. Gli archivi sotto `native-candidate/` **non sono caricati dal sito**.

## Intervento

- Soltanto **ROMAN** e azioni `M` / `GM`.
- Solo direzioni NE (D1), SE (D3), SW (D5), NW (D7).
- 6 fotogrammi ciascuna: 48 PNG nativi, GIF normale, GIF lenta, strip prima/dopo, maschere e A/CENTRO/B.
- Gambe ritagliate da bitmap ROMAN.SPR esistenti e separate in interna/esterna. Movimento 1:1 con rotazione + traslazione dei rispettivi perni all'anca, senza ridimensionare.
- Gamba **esterna sempre sopra la interna**, busto e gonnellino sopra entrambe.
- Prima del montaggio i vecchi pixel delle gambe vengono rimossi sotto l'orlo dentro la regione definita per quella vista; ombra indice 0 resta fissa.
- Palette 8-bit invariata, rendering a nearest-neighbor.
- Nuove dimensioni e coordinate SFRAME aggiornate uniformemente per i soli 48 frame; il valore di base per STD.SET è quello **effettivamente caricato dalla MOD**, `mod/god-shadow-candidate/STD.SET`.

## Cosa è stato realmente verificato

- Decoder/encoder degli archivi `.SPR` e aggiornamento di `STD.SET`.
- Tutti i fotogrammi **non obliqui dei Romani** uguali byte per byte ai bitmap precedenti.
- Tutti i file delle altre civiltà e divinità **non modificati**.
- Dimensioni e offset dei 48 nuovi frame coerenti con la tabella SFRAME.
- Nel test Chromium la MOD carica **17 archivi nativi**, avvia la partita e resta funzionante con il ROMAN.SPR candidato e la nuova STD.SET temporaneamente iniettati: `RESTORED_GAME_SMOKE_SUCCESS=true`.

## Limiti da verificare prima del merge

1. Guardare le 8 GIF `ROMAN-{M|GM}-{NE|SE|SW|NW}.gif`; **non basta** il test automatico.
2. Verificare che in F3/F4 le gambe non si incrocino in modo innaturale, soprattutto in GM.
3. Controllare gli ultimi pixel sotto il gonnellino e tutte le transizioni, incluse F6→F1 e le ombre; alcune scarpe possono essere poco nitide a risoluzione nativa.
4. Provare in gioco un'unità romana nelle quattro diagonali e confrontare con la GIF approvata da utente nel pacchetto `Seven_Kingdoms_Skill_Camminate_Oblique.zip`.
5. Solo dopo approvazione esplicita si può copiare `native-candidate/ROMAN.SPR` in `mod/sprite-restoration-candidate/` e `native-candidate/STD.SET` in `mod/god-shadow-candidate/`, seguiti da **nuovo test** e merge separato.

## Link rapidi

- `ROMAN-M-NE.gif`, `ROMAN-M-SE.gif` — camminata normale.
- `ROMAN-GM-NE.gif`, `ROMAN-GM-SE.gif` — guardia.
- `ROMAN-M-NE-before-after.png` e `ROMAN-M-SE-before-after.png`.
- `ROMAN-M-NE-masks.png` — gamba interna, gamba esterna e busto pulito.
- `frames/ROMAN/<M|GM>/<direzione>/F01.png…F06.png` — frame singoli.

**Tutti i file sono un candidato artistico, non una versione approvata.**
