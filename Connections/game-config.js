/*
  FOUR-FACET PUZZLE CONFIGURATION

  The categories section remains the ordinary 4-by-4 Connections puzzle.
  The facets section assigns one category, anchor clue, acceptable answer
  wording, ordering instruction, and four-character fragment to each QR code.
*/

window.CONNECTIONS_CONFIG = {
  title: "The Jewel of the Lochs",
  instructions: "Recover your connection",
  puzzleId: "jewel-of-the-lochs-four-facets-v1",
  finalCode: "MAKE3PUTSHOL1GRN",

  facets: [
    {
      id: "scarlet",
      label: "Scarlet Facet",
      color: "#c6404d",
      categoryIndex: 2,
      anchorText: "BILLIKENS (G)",
      partNumber: 4,
      acceptedKeywordSets: [
        ["college", "nickname"],
        ["college", "mascot"],
        ["school", "team"],
      ],
      orderInstruction:
        "Put the college nicknames in chronological order of the first year attended.",
      orderedItems: [
        "GREEN KNIGHTS (1)",
        "BILLIKENS (G)",
        "FIGHTING IRISH (R)",
        "MAROONS (N)",
      ],
      code: "1GRN",
    },
    {
      id: "peacock",
      label: "Peacock Facet",
      color: "#007c91",
      categoryIndex: 1,
      anchorText: "MACARONS (3)",
      partNumber: 2,
      acceptedKeywordSets: [
        ["french", "treat"],
        ["french", "dessert"],
        ["french", "pastr"],
      ],
      orderInstruction: "Put the French treats in alphabetical order.",
      orderedItems: [
        "MACARONS (3)",
        "MADELEINES (P)",
        "NAPOLEONS (U)",
        "PROFITEROLES (T)",
      ],
      code: "3PUT",
    },
    {
      id: "mustard",
      label: "Mustard Facet",
      color: "#c69100",
      categoryIndex: 3,
      anchorText: "CINQUE TERRE (M)",
      partNumber: 1,
      acceptedKeywordSets: [
        ["places", "visited"],
        ["europe", "matt", "madeleine"],
        ["secondary", "places"],
      ],
      orderInstruction: "Put the places in the order Matt and Madeleine visited them.",
      orderedItems: [
        "CINQUE TERRE (M)",
        "INTERLAKEN (A)",
        "OBERAMMERGAU (K)",
        "HELLISSANDUR (E)",
      ],
      code: "MAKE",
    },
    {
      id: "plum",
      label: "Plum Facet",
      color: "#7b4f76",
      categoryIndex: 0,
      anchorText: "PARIS (S)",
      partNumber: 3,
      acceptedKeywordSets: [
        ["capital", "madeleine"],
        ["capital", "visited"],
        ["capital", "countr"],
      ],
      orderInstruction:
        "Put the capitals in alphabetical order of the countries they are capitals of.",
      orderedItems: [
        "PARIS (S)",
        "REYKJAVIK (H)",
        "DUBLIN (O)",
        "ROME (L)",
      ],
      code: "SHOL",
    },
  ],

  // Leave this categories section unchanged for The Jewel of the Lochs.
  categories: [
    {
      name: "Capital cities visited by Madeleine",
      description: "Principal city destinations",
      color: "#f9df6d",
      items: [
        { text: "PARIS (S)" },
        { text: "REYKJAVIK (H)" },
        { text: "ROME (L)" },
        { text: "DUBLIN (O)" },
      ],
    },
    {
      name: "French treats",
      description: "Sweet specialties from France",
      color: "#a0c35a",
      items: [
        { text: "PROFITEROLES (T)" },
        { text: "MACARONS (3)" },
        { text: "NAPOLEONS (U)" },
        { text: "MADELEINES (P)" },
      ],
    },
    {
      name: "Nicknames of colleges attended",
      description: "School team names",
      color: "#b0c4ef",
      items: [
        { text: "BILLIKENS (G)" },
        { text: "FIGHTING IRISH (R)" },
        { text: "MAROONS (N)" },
        { text: "GREEN KNIGHTS (1)" },
      ],
    },
    {
      name: "Secondary places Matt & Madeleine visited in Europe",
      description: "Stops beyond the principal destinations",
      color: "#ba81c5",
      items: [
        { text: "HELLISSANDUR (E)" },
        { text: "CINQUE TERRE (M)" },
        { text: "OBERAMMERGAU (K)" },
        { text: "INTERLAKEN (A)" },
      ],
    },
  ],
};
