# Kit: spot stile GTA con Claude + Higgsfield

Guida operativa estratta dal reel di [@mikcosentino](https://www.instagram.com/reel/DgFzhaPIuqM/) (Claude × Higgsfield, CTA “BLACK”) e adattata al brand **Germano Ventura** / Midiverse.

> Il reel chiede di scrivere “BLACK” in DM per la guida privata. Qui hai il metodo pubblico equivalente (pipeline Claude + Higgsfield Seedance, stile open-world), già pronto da usare per promo DJ, Midiverse e pack MIDI.

## Cosa fa il reel (in breve)

- **Promessa:** creare siti, edit, film e campagne “stile GTA” con Claude + [Higgsfield](https://higgsfield.ai).
- **Finestra:** ~3 giorni di accesso gratis (countdown sul telefono nel video).
- **CTA:** commenta / scrivi `BLACK` → guida.

Tu non dipendi dal DM: sotto c’è il flusso che funziona.

## Stack

| Ruolo | Tool | Note |
| --- | --- | --- |
| Orchestrazione / script | Claude (Code o chat) | Scrive missione, shot list, caption HUD |
| Immagini (personaggio + frame) | Higgsfield / Nano Banana / Gemini image | Approva **prima** di spendere crediti video |
| Video | Higgsfield · Seedance 2.0 | L’immagine va come **start frame**, non come reference |
| Montaggio | CapCut / Premiere / DaVinci + HUD overlay | HUD, timer, stelle, minimap: **in post**, mai nel prompt video |
| Font titoli | Pricedown (DaFont) — scaricalo tu | Licenza: ok video commerciale, non ridistribuire il file |

### MCP (opzionale, Claude Code)

```bash
claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp
```

Senza `--transport http` Higgsfield spesso non parte. Dopo l’auth `/mcp`, **riapri** la sessione.

## Regola d’oro (3 layer)

1. **AI video** → solo persone, luoghi, azione. Niente testo, HUD, loghi.
2. **Montaggio** → missione, obiettivi, timer, stelle, +XP, titoli.
3. **Registrazione reale** → schermo prodotto (Midiverse / player / IG) se serve, croppato.

Scrivere “GTA style” a parole → spesso foto reale o cartone.  
**Mostra** 3–4 screenshot reali del trailer/gioco come reference → lo stile si blocca.

## Pipeline (stop a ogni fase finché non OK)

1. Script 10 shot (obiettivo + countdown + ostacolo) → `prompts.md` §1  
2. Personaggio da 2–4 foto → §2 (3 ancore fisse)  
3. Style test sullo shot più difficile → §3  
4. Un frame per shot → §4 (checklist 8 punti)  
5. Video da ogni frame (2 varianti) → §5  
6. Montaggio + HUD → §6  

Prompt master copy-paste: §7.  
Esempi pronti Germano Ventura / Midiverse: `missioni-gv.md`.

## Budget tipico (ordine di grandezza)

| Seedance 2.0 | 6 s | 8 s |
| --- | --- | --- |
| 720p (test) | ~27 crediti | ~36 |
| 1080p | ~54 | ~72 |

10 shot × 2 varianti a 1080p ≈ **~1.200 crediti**. Testa a 720p.

## Etichetta e legal

- Attiva la label **contenuto AI** su Instagram / Meta.
- Chiedi consenso se usi il volto di qualcuno.
- Non mettere brand/loghi reali nei frame; HUD e claim solo su cose **visibili** nel video/prodotto.
- Non rivendicare partnership Rockstar / GTA: parla di “stile open-world / trailer AAA”, non del marchio nel caption pubblico se non sei coperto.

## File in questa cartella

| File | Contenuto |
| --- | --- |
| `README.md` | Questa guida |
| `prompts.md` | Prompt pronti (EN per i modelli, linee IT ok) |
| `missioni-gv.md` | 3 missioni già scritte per Germano Ventura / Midiverse |
