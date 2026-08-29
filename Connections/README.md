# The Jewel of the Lochs — Four-Facet Connections

Upload the contents of this folder to the `FamilyGames/Connections` directory in your GitHub Pages repository.

The four personalized entrances and assignments are:

1. Mustard — secondary destinations — code block 1: `https://gkozak1.github.io/FamilyGames/Connections/?facet=mustard`
2. Peacock — French treats — code block 2: `https://gkozak1.github.io/FamilyGames/Connections/?facet=peacock`
3. Plum — capitals — code block 3: `https://gkozak1.github.io/FamilyGames/Connections/?facet=plum`
4. Scarlet — college nicknames/mascots — code block 4: `https://gkozak1.github.io/FamilyGames/Connections/?facet=scarlet`

Opening the base address without a facet parameter displays a printable Assistant page with all four QR codes.

## Files to upload

Upload every file and folder here, including:

- `index.html`
- `styles.css`
- `game.js`
- `game-config.js`
- `diamond-logo.png`
- the `facets` folder
- the `qr` folder

## Editing the puzzle

All category assignments, acceptable answer keywords, ordering instructions, fragments, and the final 16-character code are in `game-config.js`.

The `acceptedKeywordSets` entries are alternatives. A player succeeds when their answer contains all the word stems in any one listed set. For example, `["french", "treat"]` accepts “French treats” and longer wording containing those two concepts.

If the destination address changes, update `baseUrl` in `scripts/generate-qr-codes.mjs` in the full source package and regenerate the QR codes.

## Player flow

Each QR code permanently selects a different anchor clue. The player:

1. Selects three additional clues and submits a connection.
2. Identifies the recovered connection in words.
3. Orders the four clues according to the personalized instruction.
4. Receives one fixed four-character fragment.
5. Exchanges fragments and block numbers with the other sleuths.
6. Reconstructs and decodes the complete 16-character transmission.

Progress is saved separately on each phone. There is no limit on guesses and no shared server state.
