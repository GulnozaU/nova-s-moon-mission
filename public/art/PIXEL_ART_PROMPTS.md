# Soft pixel art prompts (for Gemini / similar)

Goal: **slightly** pixel — readable kids game, not harsh 8-bit. Think cozy farm-sim tiles: soft pastel, thick outline, mild pixel edges.

Use these for optional re-exports into `public/art/` and `public/art/cutouts/`. Until new files land, the current storybook PNGs still work in Phaser.

## Style lock (prepend to every prompt)

```
Soft pixel storybook game art, mild pixelation (not harsh 8-bit), thick warm-brown outline,
pastel peach sage dusty-blue cream, flat lighting, transparent background for cutouts,
no photoreal, no text, kid-friendly Moon base
```

## Backgrounds (1408×768 or 16:9)

1. **Surface hub** — lunar dust ground, three building doors (home, greenhouse dome, lab), radio dish, rover, solar panels, soft sky  
2. **Crew home** — bunks, water cleaner box, air maker, bed, hatch  
3. **Greenhouse** — plant trays, grow light bar, water tap  
4. **Science lab** — analyzer, sample rack, wall storm screen  

## Cutouts (square, transparent)

Nova boy astronaut · Sam · Mira · Ana · power chip · water drop · supply crate · radio dish · rover · plant tray stages 0–3 · bed marker · door glow

## Notes

- Prefer **PNG** with alpha for cutouts.  
- Keep palette close to cream `#fff8ef`, ink `#3a3348`, sage, peach.  
- Drop finished files into `public/art/` / `public/art/cutouts/` with the same filenames the game already loads when possible.
