# Campione di approvazione — Romano, oblique

**Approvazione:** 27/10/2026. La versione accettata è quella **con gamba esterna sempre davanti all'interna**, successiva alla rifinitura del passo centrale e alla rimozione dei residui.

## File grafici della sessione originale

- `roman_camminata_occlusione_corretta.gif` — GIF definitiva approvata, 8 fotogrammi, 460 × 535 px (anteprima ingrandita, NON sprite nativo).
- `roman_camminata_occlusione_corretta_lenta.gif` — stesso ciclo rallentato.
- `roman_occlusione_confronto.png` — pose A, CENTRO, B.
- `roman_occlusione_dettaglio_centrale.png` — dettaglio della sovrapposizione nel passo centrale.
- `roman_occlusione_mascherature.png` — gamba interna, esterna e busto isolati.
- `refine_roman_walk_occlusion.py` — script che ha generato la GIF approvata, con riferimento a un'immagine sorgente ingrandita proveniente da ImageGen. È una **dimostrazione** per quello specifico campione, non un generatore universale di sprite nativi.

I binari di esempio possono essere distribuiti come pacchetto allegato allo sviluppo; se non sono presenti nella cartella GitHub, richiederli prima del confronto di qualità. **Non dedurre l'approvazione da un vecchio filename come `roman_camminata_rifinita.gif`**: prima dell'ultima iterazione lo z-index cambiava a metà camminata.

## Numeri del prototipo approvato: NON riutilizzarli come default

Dall'immagine originale di **279 × 355 px** sono state create due maschere delle gambe con perni locali all'immagine:
- gamba interna/posteriore: `(131,263)` verso `(162,267)`, rotazione `-28° × t`;
- gamba esterna/anteriore: `(165,260)` verso `(130,260)`, rotazione `+48° × t`;
- transizione `t = [0,.25,.5,.75,1,.75,.5,.25]`;
- ordine dei layer SEMPRE `ombra → interna → esterna → gonnellino/busto`.

**Attenzione:** il prototipo proviene da un'anteprima ingrandita, con coordinate assolute riferite a quel ritaglio. Per qualsiasi nuovo soldato cambiano maschere, perni, angoli e allineamento. Non rimpicciolire/ingrandire una gamba per simulare profondità; usa solo trasformazioni rigide 1:1 e mascheratura corretta.

## Esempio di montaggio concettuale

```python
# In pseudocodice: immagine indicizzata o RGBA con alpha corretto.
# Mai interpolazioni o resize di una gamba.
inner_pose = rotate_translate(inner_leg, inner_pivot, inner_target, inner_angle,
                              nearest_neighbor=True, scale=1)
outer_pose = rotate_translate(outer_leg, outer_pivot, outer_target, outer_angle,
                              nearest_neighbor=True, scale=1)
out = composite(shadow_fixed_to_ground, inner_pose)
out = composite(out, outer_pose)   # sempre in primo piano
out = composite(out, skirt_and_torso_clean)
```

I controlli pixel (trasparenza, maschere disgiunte, clipping, assenza di residui e rispetto della palette) precedono l'esportazione nel formato nativo. Il renderer può usare bitmap specchiati per SW/NW: verificare la direzione della camera prima di stabilire quale sia la gamba visivamente esterna.
