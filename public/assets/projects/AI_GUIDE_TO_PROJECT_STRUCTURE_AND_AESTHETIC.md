# AI Guide to Project Structure and Aesthetic

## Core Aesthetic: Neo-Brutalism
- **Containers & Spacing**: Limit `.brutalist-panel` wrappers strictly to images, metadata tags, and overarching layout structures. **NEVER** wrap core chronological text blocks inside colorful bento-boxes. Paragraphs must remain completely clean and flat on the native background.
- **Colors**: Strictly adhere to the CSS variable palette (`var(--bg-color)`, `var(--text-primary)`, `var(--accent)`, `var(--accent-purple)`). Reserve intense saturated accents exclusively for pill tags, metadata arrays, and functional buttons.
- **Typography**: Heavily utilize bold font-weights for headers (e.g. `fontWeight: 900`), and strict tracking (e.g. `letterSpacing: '-1px'`). Ensure inline semantic labels are given aggressive horizontal padding (`padding: '6px 16px'`) to permanently avoid cramped borders. Describe implementations with strict technical composure—drop all hyperbolic filler (e.g. do not say "flawlessly").
- **Images**: Encase assets within `.brutalist-panel` frames possessing native `padding: 0` and `overflow: hidden`. Do not apply fixed heights to image wrappers. Use `<img style={{ width: '100%', height: 'auto', display: 'block' }} />` to mathematically force the geometric boundaries to mold exactly to the dynamic asset ratios, permanently extinguishing all letter-boxing artifacts. Embed a native digital crop (`transform: scale(1.05)`) onto the `img` tags to cleanly push imperfect slide borders out into the hidden overflow frame!

## Narrative Structure for Project Breakdowns
1. **Hero**: A massively scaled, wide-aspect image or GIF bound to the top of the project.
2. **Context Block**: Include a title, primary overview description, and simple category pill.
3. **Metadata Array**: Located directly below the layout description. Utilize a horizontally distributed flex-container of `.brutalist-panel` pills displaying core metrics like `Role`, `Team`, and `Tech Stack` dynamically. Avoid burying collaborators arbitrarily within the body text!
4. **Alternating Grid Sections**: Break technical features down chronologically utilizing iterating `display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'` layouts. Left/Right alternating balances the content. 
5. **Chronological Progression**: Always mirror the exact operational phase sequence of technical development (e.g. Problem -> Dataset -> Preprocessing -> Model Architecture -> Conclusion/Results).
6. **Culmination**: Always ensure high-fidelity dynamic visual data (GIFs/Video) culminates massively at the structural conclusion of a sequential technical narrative.
