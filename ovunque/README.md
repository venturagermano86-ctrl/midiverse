# OVUNQUE

Piattaforma che scansiona i portali digitali (Beatport, Bandcamp, Traxsource, Juno, SoundCloud, Clone, Hardwax, …) e confronta **free vs a pagamento** sulla stessa traccia.

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
