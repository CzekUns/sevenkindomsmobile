# Notifiche mobile — stato e aggancio al motore

## Implementato in questo ramo

- `mobile-news.js` / `mobile-news.css` ampliano graficamente gli **avvisi già disegnati da Seven Kingdoms**. Il pannello mostra i pixel nativi ingranditi con date, nomi e icone originali; toccando una riga il click viene inoltrato al link nativo (Diplomacy/NEWS_GO).
- Scheda **Eventi**, con voci HTML leggibili, pulsante **↗ Vai**, archiviazione degli ultimi 40 eventi della partita, deduplicazione per `id`.
- Gli eventi verificati dal motore possono essere notificati con:
  ```js
  window.SevenKingdomsMobileNews.publish({
    id: 'construction:firm-126:day-120',
    type: 'construction-complete',
    text: 'Lucius ha completato la Caserma',
    location: {x: 86, y: 115, mapSize: 400}
  });
  ```
  Tipi ammessi: `construction-complete`, `production-queue-empty`, `training-queue-empty`. `location.x/y` sono coordinate **tile del mondo**, non pixel dello schermo. I testi non vengono interpretati né inventati dal browser.
- La localizzazione `location` provoca un click sulla minimappa originale, che centra la telecamera.
- Disponibile su touch orizzontale; si può ridurre a una barra. Da desktop nascosto.

## Ancora necessario: emissione automatica dei tre eventi dal motore

**Attenzione: il repository contiene soltanto il WASM compilato della MOD, non il C++ personalizzato né la pipeline di build. Il browser non può sapere automaticamente il nome del costruttore, il tipo di edificio, il reale contenuto della coda o l'esatta coordinata dell'evento.** Il sistema di eventi client è predisposto ma NON viene attivato da euristiche basate sui soli tempi, su suoni o su riconoscimento grafico, perché produrrebbero falsi avvisi e possibili click sul luogo sbagliato.

### Punti precisi già identificati nel codice pubblico 7kaa

1. **Edificio completato**: `src/OFIRM.cpp`, nel ramo `Firm::process_construction()` con `hit_points >= max_hit_points`, subito dopo `under_construction = 0`. Esistono `builder_recno`, `firm_id`, `center_x/y` e `unitPtr` (prima che venga assegnato o liberato). Se `nation_recno == nation_array.player_recno`, inviare `unitPtr->unit_name(0)` e `firm_name()` con coordinate e ID edificio. **Una sola notifica per completamento**, non per ogni frame.
2. **War Factory**: `src/OF_WAR.cpp`, `FirmWar::process_build()`: dopo che la nuova unità è stata realmente creata, azzerato `build_unit_id`, e con `build_queue_count == 0`, inviare `production-queue-empty`. Non inviare se produzione annullata (`cancel_build_unit()`), edificio distrutto, coda vuota senza aver prodotto, o produzione sospesa per assenza di spazio/money. `FirmWar::process_queue()` da solo non significa coda COMPLETATA: può avere l'ultimo pezzo ancora attivo in `build_unit_id`.
3. **Coda di addestramento**: individuare nel codice MOD la vera queue di reclutamento/addestramento (la `FirmCamp::train_unit()` *originale* migliora continuamente le abilità dei soldati e **non rappresenta la fine di una coda**). L'evento scatta soltanto alla transizione **nonvuota → vuota dopo ultimo soldato prodotto**, mai per annullamento o interruzione.
4. **Collegamento**: esportare una funzione verso il browser con `EM_JS` o `emscripten_run_script`, passando testo UTF-8 e coordinate mondo:
   ```cpp
   #ifdef __EMSCRIPTEN__
   #include <emscripten.h>
   EM_JS(void, web_mobile_notify, (const char* eventId, const char* type,
                                    const char* text, int worldX, int worldY, int worldSize), {
     if (!window.SevenKingdomsMobileNews) return;
     window.SevenKingdomsMobileNews.publish({
       id: UTF8ToString(eventId), type: UTF8ToString(type),
       text: UTF8ToString(text),
       location: {x:worldX, y:worldY, mapSize:worldSize}
     });
   });
   #endif
   ```
   Serve almeno una ricompilazione della MOD, preservando tutte le altre funzionalità già presenti.

### Nota sul link nativo degli avvisi esistenti

Il motore gestisce già i riferimenti `NEWS_LOC_FIRM`, `NEWS_LOC_UNIT`, `NEWS_LOC_TOWN` con `News::set_loc()` e `News::put()` → `world.go_loc()`. Per aggiungere le notifiche alla **cronologia originale** (oltre alla scheda HTML) bisognerà aggiungere nuove entry `NEWS_*` e relative traduzioni; non basta solo la UI JavaScript.

Riferimenti:
- https://github.com/the3dfxdude/7kaa/blob/master/src/OFIRM.cpp
- https://github.com/the3dfxdude/7kaa/blob/master/src/OF_WAR.cpp
- https://github.com/the3dfxdude/7kaa/blob/master/src/OF_CAMP.cpp
- https://github.com/the3dfxdude/7kaa/blob/master/src/ONEWS.cpp
- https://github.com/the3dfxdude/7kaa/blob/master/src/ONEWS2.cpp
