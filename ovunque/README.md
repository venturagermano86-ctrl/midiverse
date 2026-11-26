# OVUNQUE

Piattaforma che scansiona i portali digitali (Beatport, Bandcamp, Traxsource, Juno, SoundCloud, Clone, Hardwax, …) e confronta **free vs a pagamento** sulla stessa traccia.

## Diglist — due fasi

1. **Ora:** rete label (pick → label → artisti → altre label). Bandcamp username = owned/seed opzionale.
2. **Dopo (account + utenza):** croce utenti — se condividi ~4 tracce con qualcuno, ti consiglio le sue altre (wishlist/collezioni/Bandcamp). Vedi `lib/engines/diglistRoadmap.ts`.

- Home con suggerimenti + rail **Scarica gratis**
- Se è gratis su SoundCloud → CTA **Scarica gratis** (meglio di Bandcamp)
- Se è solo a pagamento → prezzo migliore tra i negozi
- Motore `lib/scanners` + `GET /api/scan/:id`

Catalogo attuale: sample data. Adapter pronti per API reali.

```bash
cd ovunque
npm install
npm run dev
```

http://127.0.0.1:3456
