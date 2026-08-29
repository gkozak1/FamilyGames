/*
  EDIT THIS FILE TO MAKE A NEW PUZZLE.

  Keep exactly 4 categories and exactly 4 items in each category.
  Put every piece of text inside quotation marks.
*/

window.CONNECTIONS_CONFIG = {
  title: "Connections",
  eyebrow: "Kozak Family Puzzle",
  instructions: "Create four groups of four!",
  mistakesAllowed: 4,

  categories: [
    {
      name: "Primary cities visited by Madeleine",
      description: "Principal city destinations",
      color: "#f9df6d",
      items: [
        { text: "PARIS" },
        { text: "WELLINGTON" },
        { text: "ROME" },
        { text: "ZURICH" },
      ],
    },
    {
      name: "French treats",
      description: "Sweet specialties from France",
      color: "#a0c35a",
      items: [
        { text: "PROFITEROLES" },
        { text: "MACARONS" },
        { text: "NAPOLEONS" },
        { text: "MADELEINES" },
      ],
    },
    {
      name: "Nicknames of colleges attended",
      description: "School team names",
      color: "#b0c4ef",
      items: [
        { text: "BILLIKENS" },
        { text: "FIGHTING IRISH" },
        { text: "MAROONS" },
        { text: "GREEN KNIGHTS" },
      ],
    },
    {
      name: "Secondary places Matt & Madeleine visited in Europe",
      description: "Stops beyond the principal destinations",
      color: "#ba81c5",
      items: [
        { text: "HELLISSANDUR" },
        { text: "CINQUE TERRE" },
        { text: "OBERAMMERGAU" },
        { text: "INTERLAKEN" },
      ],
    },
  ],
};
