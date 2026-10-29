# Asset licences

All artwork in the default ("New") set is CC0 or public domain. Checked 2026-10-28.
The "Classic" set (`src/assets/classic/`, also in `original-2015/pics/`) is the artwork of the original 2015 game. **Attribution (Joel 2026-10-29):** the original page credits "Clip art image by Cliparts.co" (https://cliparts.co/clipart/2517827, "Chess tile Knight - vector Clip Art"; the page asks for attribution and states no licence). So `Knight.png`, `KnightClear.png` and `PreviousKnight.png` look derived from that clip art, not original work. Joel 2026-10-29: keep them, with the Cliparts.co attribution in the game footer (`src/App.tsx`), the README credits and `original-2015/`.

| Shipped file | Source page | Author | Licence as stated |
|---|---|---|---|
| `src/assets/new/knight.svg` (derived: the white background rectangle removed, nothing else) | https://openclipart.org/detail/24214/chesspiece-knight | Anonymous ("Chess knight silhouette by Jakob. From old OCAL site.") | "Openclipart is 100% Public Domain." (site-wide terms; the item page has no per-item licence text) |
| `src/assets/new/wood-light.jpg` (from Wood095, 1K colour map; cropped to a square and scaled to 256 px) | https://ambientcg.com/view?id=Wood095 | ambientCG | CC0 1.0 Universal: https://docs.ambientcg.com/license |
| `src/assets/new/wood-dark.jpg` (from Wood067, 1K colour map; scaled to 256 px) | https://ambientcg.com/view?id=Wood067 | ambientCG | CC0 1.0 Universal: https://docs.ambientcg.com/license |
| `src/assets/new/face-happy.png`, `face-sad.png` (Emotes pack, vector style 2, faceHappy / faceSad) | https://kenney.nl/assets/emotes-pack | Kenney Vleugels (Kenney.nl) | Creative Commons Zero (CC0) |

The knight silhouette is tinted in the page with a CSS mask (light for the current position, dark for earlier ones).
