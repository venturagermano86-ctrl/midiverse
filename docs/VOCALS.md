# MIDIVERSE — Cantanti house

Crea **due cantanti** (call / response) come WAV **dry** da importare in Logic.

## Lock (Germano Ventura)

- Ogni voce = **una sola traccia**
- Dual: dry fisso + **Delay Designer** wet (non Stereo Delay sulla vox)
- Call-response ≥ **2 parole** per parte
- Niente “zombi” di default

## Cantanti

| id   | Nome | Ruolo    | Vibe                |
|------|------|----------|---------------------|
| mira | Mira | call     | warm club lead      |
| vale | Vale | response | breathy answer      |
| sol  | Sol  | call     | bright terrace      |
| nilo | Nilo | response | low dock            |

## Uso

```bash
./genera_vox.sh --list
./genera_vox.sh --pair hold-spin --call-singer mira --response-singer vale --bpm 124
./genera_vox.sh --call "hold the mark" --response "spin the gate"
```

Output in `demo_vocals/`:

- `{pair}__{singer}_call_dry.wav`
- `{pair}__{singer}_response_dry.wav`
- `{pair}__meta.json`

## In Logic

1. Importa i due dry su **due tracce separate**
2. Duplica ciascuna su un bus/aux wet con **Delay Designer**
3. Lascia i dry puliti; il wet risponde in call-response
