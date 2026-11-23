# Prompt kit · spot stile open-world (Claude + Higgsfield)

I prompt immagine/video sono in **inglese** (i modelli rispondono meglio).  
Le battute del personaggio possono essere in **italiano**.  
Sostituisci i `[QUADRATI]`.

---

## 1 · Script missione (Claude)

```
I want to make a short open-world video game trailer style video in which [CHARACTER]
completes a mission: [MISSION IN ONE SENTENCE, with a goal, a countdown and an obstacle].
Write me the script in 10 shots of 4 to 8 seconds. For each shot give me:
1. What happens, in one sentence, and what changes physically (who moves, which way, which object
   changes state: a door that closes, a shutter that comes down, a product that changes hands).
2. The line the character says, 10 words max, and whether someone else is talking.
3. The game caption that goes on top (objective, +XP, stars, countdown), which will be added in the edit.
Rules: the first shot has to be the most chaotic moment (it'll be used as the hook), each
secondary character has ONE line, and the main character finishes with a dry line.
No game names, studios or logos in anything that appears on screen.
Lines can be in Italian.
```

---

## 2 · Personaggio (da 2–4 foto)

```
Create a full-body character portrait of the person in the reference photos, keeping his face,
age and features recognizable: [AGE], [HAIR]. Give him three fixed identity anchors that will
appear in every shot: [ACCESSORY 1, e.g. black over-ear DJ headphones around the neck],
[ACCESSORY 2, e.g. gold chain with small medallion], [ACCESSORY 3, e.g. black leather wristband].
Outfit: [CLOTHES, e.g. black fitted tee, dark jeans, clean white sneakers].
Standing in [PLACE, e.g. neon club alley at night], confident and unbothered. Neutral light,
full body visible, vertical frame. No text, no logos.
```

**Le 3 ancore** vanno ripetute **parola per parola** in ogni prompt successivo.

Esempio ancore GV: cuffie DJ al collo · catenina oro · wristband nero.

---

## 3 · Style test (lo step che decide tutto)

Reference in ordine: (1) personaggio · (2–4) screenshot reali del trailer/gioco (persone close-up).

```
Render this scene EXACTLY in the visual style of reference images 2, 3 and 4: an in-engine
cutscene from a next-generation AAA open-world game (Grand Theft Auto VI trailer look). Characters are high-end 3D game models:
realistic proportions and faces, but with that subtle not-quite-real game look: matte smooth skin
with soft baked detail, slightly stiff sculpted facial features, soft temporal anti-aliasing
softness, physically based materials. Lighting is soft global illumination with deep natural
shadows, a natural slightly desaturated cinematic grade, NOT oversaturated, NOT glossy,
NOT cartoon, NOT illustration, and NOT a photograph. Copy the color grade, the softness and the
skin rendering of reference 2.

The main character is the game-model version of the person in reference image 1, [AGE]:
[PHYSICAL DESCRIPTION + THE THREE ANCHORS + CLOTHES]. [ATTITUDE, e.g. Smug and unbothered].

Framing: [SHOT]. [ACTION FROZEN IN AN INSTANT].
[BACKGROUND AND SECONDARY CHARACTERS, with specific ages and what they're holding].
Setting: [PLACE with 4-5 specific objects]. [LIGHT]. Widescreen cinematic frame.
No text, no subtitles, no user interface, no button prompts, no logos, no watermark.
```

Se esce foto o cartone: **non** riscrivere il testo — cambia gli screenshot di reference.

---

## 4 · Un frame per shot

Reference: personaggio · style test approvato · 2 screenshot gioco.

```
Render EXACTLY in the look of reference image 2 (same character model, same rendering, same color
grade) and references 3 and 4: an in-engine cutscene from a next-generation AAA open-world game (GTA VI
trailer look). High-end 3D game character models with realistic proportions but a subtle not-quite-real game look:
matte smooth skin, slightly stiff sculpted features, soft anti-aliasing softness, soft global
illumination, deep natural shadows, natural slightly desaturated cinematic grade.
NOT a photograph, NOT cartoon.

Character: the same [PERSON] as in references 1 and 2, [DESCRIPTION + THREE ANCHORS + CLOTHES].

Scene: [PLACE, time of day]. [WHAT HE DOES, in the FIRST instant of the shot]. [STATE OF THE
OBJECTS THAT ARE GOING TO CHANGE]. [SHOT AND CAMERA]. Widescreen cinematic frame.
No text, no readable signs, no labels on packaging, no user interface, no logos, no watermark.
```

### Checklist prima di approvare

| Check | Fix rapido |
| --- | --- |
| Testi / loghi su insegne e pack | Prompt A sotto |
| Ora del giorno sbagliata | Prompt B |
| Stato oggetto che deve cambiare | Rigenera descrivendo lo stato |
| Direzione del movimento | Camera dietro, FORWARD |
| Ancore personaggio mancanti | Rigenera con “clearly visible” |

**A · Rimuovi testi/loghi**
```
Remove ALL text, letters, numbers and brand logos from every sign, package and building in the
image: signs become plain glowing panels, packages become plain unlabeled packaging in solid
colors. Keep everything else identical: characters, poses, lighting, composition, rendering style.
```

**B · Notte**
```
Change the sky to a dark midnight blue night sky so it is clearly late at night. Keep everything
else identical: characters, poses, lighting on the characters, composition, rendering style.
```

---

## 5 · Video da frame (Higgsfield · Seedance 2.0)

- Immagine = **`start_image`** (non reference).
- 6 s = 1 battuta · 8 s = 2 battute / azione lunga.
- 2 varianti per shot. Audio on. Niente musica nel prompt.

```
Continue from the start image keeping its exact look: an in-engine cutscene from a
next-generation open-world crime game (GTA VI trailer style), high-end 3D game character models, matte game skin,
soft global illumination, natural cinematic grade. Never live-action.

[ACTION, IN ORDER, ONE SENTENCE PER STEP:
 1) what happens first and who talks
 2) the answer: He says in Italian, low and dry: '[LINE]'
 3) what changes afterwards — use capitals: DOWN, UP, FORWARD, AWAY, EMPTY]
[CAMERA: locked medium two-shot / third-person chase camera low behind him, motion blur].
[IF THERE'S MOVEMENT: He moves FORWARD, AWAY from the camera. Everything rushes past toward the
camera. Constant forward motion, never backwards.]
[IF THERE'S CHAOS: Nobody gets hurt; it is cheeky mischief, not violence.]

Sound: [3 SPECIFIC SOUNDS, e.g. club kick drum thump, car door slam, neon buzz]. No music.
No on-screen text, no readable signs, no user interface, no logos.
```

---

## 6 · Montaggio (a Claude / al tuo editor)

```
I have my chosen clips in clips/ and optional screen recording in clips/screen.mp4.
1. Transcribe each clip with word-level timestamps.
2. Build an edit plan: hook first (most chaotic shot, 3-4 s, then "X MINUTES EARLIER" stinger),
   then story in order. Subtitles from real transcript timings.
3. Overlay game HUD in post only: mission title, objective, countdown, stars, +XP, minimap.
4. Export vertical 9:16 for Instagram Reels + 16:9 master.
Never invent HUD claims the product/recording does not show.
```

---

## 7 · Prompt master (tutto il flusso)

```
We're going to make a short open-world video game trailer style video following the prompts in prompts.md.
Character: photos in photos/. Style: game screenshots in style/.
Mission: [ONE SENTENCE — goal + countdown + obstacle].
Higgsfield budget: [CREDITS, e.g. 1,200].
Work in phases and STOP at the end of each one until I approve:
1. Script in 10 shots (prompt 1). Italian dialogue OK.
2. Character (prompt 2). Show it.
3. Style test of the hardest shot (prompt 3). Don't continue without OK.
4. One frame per shot (prompt 4) + 8-point checklist. Contact sheet.
5. Video per shot from its frame (prompt 5), 2 variants, [720p test / 1080p final].
   Before each launch, say credit cost and running total. If over budget, stop and ask.
6. Editing plan (prompt 6) with HUD in post only.
Never invent product claims; only what the real recording shows.
Brand: Germano Ventura / Midiverse. No Rockstar / GTA logos on screen.
```
