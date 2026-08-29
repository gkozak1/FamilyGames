/*
  EDIT THIS FILE TO MAKE A NEW PUZZLE.

  Keep exactly 4 categories and exactly 4 items in each category.
  Put every piece of text inside quotation marks.
*/

window.CONNECTIONS_CONFIG = {
  title: "Connections",
  eyebrow: "The Jewel of the Lochs",
  instructions: "Create four groups of four!",
  mistakesAllowed: 4,

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
        { text: "PROFITEROLE (T)" },
        { text: "MACARON (3)" },
        { text: "NAPOLEON (U)" },
        { text: "MADELEINE (P)" },
      ],
    },
    {
      name: "Nicknames in the singular of colleges attended",
      description: "School team names",
      color: "#b0c4ef",
      items: [
        { text: "BILLIKEN (G)" },
        { text: "FIGHTING IRISH (R)" },
        { text: "MAROON (N)" },
        { text: "GREEN KNIGHT (1)" },
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
