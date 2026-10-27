# Audit sprite MOD — civiltà nuove — 27 ottobre 2026

## Esito

**Problema grafico verificato nei file, non un errore di configurazione delle direzioni:** le otto unità dei popoli aggiunti hanno le otto direzioni e tutti i frame formalmente richiesti dal motore, ma **i sei frame di camminata per direzione contengono solo tre immagini differenti**.

Per *ciascuna* delle otto nuove unità, per *ciascuna* direzione, il contenuto delle immagini è:

```
posizione frame:    1   2   3   4   5   6
immagine effettiva:  A   B   C   C   B   A
```

I duplicati sono verificati **sui byte effettivi delle immagini compresse**, non soltanto sui nomi o sugli indici delle tabelle. Il raddoppio del fotogramma centrale provoca una pausa percepibile nella camminata; manca il passaggio fluido tipico delle animazioni originali.

Le nuove unità hanno perciò **3 immagini diverse per direzione (15 in totale considerando le viste distinte)**; ad esempio `NORMAN`, `MAYA`, `GREEK` e `VIKING` hanno **5 immagini diverse per direzione (25 in totale)** con sei posizioni temporali.

La simmetria di alcuni angoli è intenzionale: il motore riflette orizzontalmente le direzioni occidentali (vedi `Sprite::need_mirror` in `src/OSPRITE.cpp`). **NON è un errore di frame mancante in NE/NO/SE/SO**, bensì una quantità insufficiente di fasi di movimento in tutte le direzioni, compresi gli angoli.

## Risultati per sprite

| Popolo | SPRITE | Frame M dichiarati (per direzione) | Immagini M distinte | Frame GM di movimento in guardia | Immagini GM distinte | Direzioni |
|---|---|---:|---:|---:|---:|---:|
| Romani | `ROMAN.SPR` | 6 | **3** | 6 | **3** | 8 |
| Celti | `CELT.SPR` | 6 | **3** | 6 | **3** | 8 |
| Sanniti | `SAMNITE.SPR` | 6 | **3** | 6 | **3** | 8 |
| Etruschi | `ETRUSCAN.SPR` | 6 | **3** | 6 | **3** | 8 |
| Mongoli | `MONGOL.SPR` | 6 | **3** | 6 | **3** | 8 |
| Iberi | `IBERIAN.SPR` | 6 | **3** | 6 | **3** | 8 |
| Babilonesi | `BABYLON.SPR` | 6 | **3** | 6 | **3** | 8 |
| Cartaginesi | `CARTHAGE.SPR` | 6 | **3** | 6 | **3** | 8 |

Per tutte le unità nuove, gli **attacchi A1 (5/5 immagini distinte), A2 (6/6), morte D (6/6) e guardia da fermi G (5/5)** risultano popolati senza ripetizioni interne. Lo stop S ha una sola immagine per direzione, come previsto. Le principali anomalie di *duplicazione* rilevate sono dunque i cicli **M** e **GM**.

Le **otto divinità aggiunte** (`JUPITER`, `CERNUNNO`, `MAMERTE`, `TINIA`, `TENGRI`, `NETON`, `MARDUK`, `BAAL_HAM`) hanno **8 frame di movimento effettivamente distinti per ciascuna delle 8 direzioni**. Non emerge la stessa carenza negli sprite divini. Nella morte D delle divinità ci sono 14 immagini distinte su 16 posizioni, un dettaglio che da solo non prova un errore (può essere una pausa voluta).

## Come ho verificato

- Repository audit: `tools/sprite-audit-probe.mjs`, `tools/sprite-frame-content-audit.mjs` e `.github/workflows/sprite-audit.yml`.
- Browser Chromium con caricamento reale di `/data/RESOURCE/STD.SET` e dei file `/data/SPRITE/*.SPR` da `mod/` (niente OCR).
- Interpretazione degli archivi `ResourceIdx` (`ORESX.cpp`), tabelle DBF `SPRITE`, `SACTION`, `SFRAME` e relativi offset binari secondo `OSPRTRES.cpp`, `OSFRMRES.cpp`, `ODB.cpp`.
- Confronto con i file originali `NORMAN`, `GREEK`, `MAYA`, `CHINESE`, `VIKING`.
- Nessuna azione `M` con frame-range fuori da SFRAME; tutti i record delle 16 nuove entità presenti.

Log: https://github.com/CzekUns/sevenkindomsmobile/actions/runs/40429677088

## Correzione consigliata

1. **Produrre almeno due nuove pose di intermezzo per ogni direzione realmente disegnata** dei soldati nuovi, per ottenere cinque fasi distinte come l'originale; ancora meglio sei fasi realmente distinte, curate e cicliche. Evitare di limitarsi a copiare/mirare le immagini. Per le direzioni ovest, usare il mirror previsto dal motore, non creare risorse duplicate senza motivo.
2. **Ripetere il lavoro anche nella sequenza GM**, dove i sei frame sono anch'essi solo tre distinti.
3. Mantenere coerenti dimensioni, offset e punto di contatto con il terreno in ogni posa per evitare scatti della figura.
4. Importare i bitmap aggiornati in `*.SPR`, aggiornando gli offset in `SFRAME` dentro `STD.SET`, e ricostruire `SPRITE.data`/metadati del pacchetto tramite tool di packaging (o l'equivalente del progetto originale). **Gli sprite originali e gli ID delle nuove unità vanno preservati.**
5. Rieseguire questo audit e un test visivo per movimento ortogonale, diagonale, guardia e cambio direzione con più entità contemporaneamente, oltre a un avvio completo della MOD.

**Non modificare solo `frame_count` né riordinare i duplicati nel WASM:** non crea immagini nuove, rischia di cambiare velocità e tempi dell'animazione e rende la camminata ancora più irregolare. Serve una correzione dei bitmap, non una maschera JavaScript.

### Limiti
L'audit dimostra l'identità binaria e i conteggi delle fasi, ma non valuta la qualità artistica delle pose o la continuità visiva di ogni singolo arto; per quest'ultima sono necessari un'anteprima a sequenza e un'ispezione manuale delle immagini.
