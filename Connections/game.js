(function () {
  "use strict";

  const SYMBOLS = ["🟨", "🟩", "🟦", "🟪"];
  const config = window.CONNECTIONS_CONFIG;

  function validConfig(value) {
    return Boolean(
      value &&
        value.categories &&
        value.categories.length === 4 &&
        value.categories.every(
          (category) =>
            category.name &&
            category.color &&
            category.items &&
            category.items.length === 4 &&
            category.items.every((item) => item.text),
        ),
    );
  }

  if (!validConfig(config)) {
    document.body.innerHTML =
      '<main class="config-error"><h1>Check game-config.js</h1><p>The puzzle needs exactly four categories with four items in each category.</p></main>';
    return;
  }

  const elements = {
    eyebrow: document.getElementById("eyebrow"),
    instructions: document.getElementById("instructions"),
    board: document.getElementById("board"),
    controls: document.getElementById("game-controls"),
    message: document.getElementById("message"),
    mistakes: document.getElementById("mistakes"),
    shuffle: document.getElementById("shuffle-button"),
    deselect: document.getElementById("deselect-button"),
    submit: document.getElementById("submit-button"),
    endCard: document.getElementById("end-card"),
    endTitle: document.getElementById("end-title"),
    endCopy: document.getElementById("end-copy"),
    endMessage: document.getElementById("end-message"),
    share: document.getElementById("share-button"),
    playAgain: document.getElementById("play-again-button"),
  };

  let tiles = [];
  let selected = [];
  let solved = [];
  let mistakesRemaining = config.mistakesAllowed || 4;
  let status = "playing";
  let guessRows = [];
  let submittedGuesses = [];

  function shuffle(values) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const previous = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = previous;
    }
    return copy;
  }

  function makeTiles() {
    return config.categories.flatMap((category, categoryIndex) =>
      category.items.map((item, itemIndex) => ({
        text: item.text,
        categoryIndex,
        id: `${categoryIndex}-${itemIndex}-${item.text}`,
      })),
    );
  }

  function setMessage(text) {
    elements.message.textContent = text || "\u00a0";
  }

  function remainingTiles() {
    return tiles.filter((tile) => !solved.includes(tile.categoryIndex));
  }

  function renderMistakes() {
    elements.mistakes.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = "Mistakes remaining:";
    const dots = document.createElement("span");
    dots.className = "mistake-dots";
    dots.setAttribute("aria-hidden", "true");
    for (let index = 0; index < (config.mistakesAllowed || 4); index += 1) {
      const dot = document.createElement("i");
      if (index < mistakesRemaining) dot.className = "active";
      dots.appendChild(dot);
    }
    elements.mistakes.append(label, dots);
    elements.mistakes.setAttribute(
      "aria-label",
      `${mistakesRemaining} mistakes remaining`,
    );
  }

  function solvedGroup(categoryIndex) {
    const category = config.categories[categoryIndex];
    const article = document.createElement("article");
    article.className = "solved-group";
    article.style.backgroundColor = category.color;

    const heading = document.createElement("h2");
    heading.textContent = category.name;
    const items = document.createElement("p");
    items.textContent = category.items.map((item) => item.text).join(", ");

    article.append(heading, items);
    return article;
  }

  function renderBoard(shouldShake) {
    elements.board.innerHTML = "";
    solved.forEach((categoryIndex) => {
      elements.board.appendChild(solvedGroup(categoryIndex));
    });

    if (status !== "playing") return;

    const grid = document.createElement("div");
    grid.className = `tile-grid${shouldShake ? " shake" : ""}`;

    remainingTiles().forEach((tile) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tile${selected.includes(tile.id) ? " selected" : ""}`;
      button.textContent = tile.text;
      button.setAttribute("aria-pressed", String(selected.includes(tile.id)));
      button.addEventListener("click", () => toggleTile(tile.id));
      grid.appendChild(button);
    });

    elements.board.appendChild(grid);
  }

  function updateButtons() {
    elements.deselect.disabled = selected.length === 0;
    elements.submit.disabled = selected.length !== 4;
  }

  function toggleTile(id) {
    setMessage("");
    if (selected.includes(id)) {
      selected = selected.filter((tileId) => tileId !== id);
    } else if (selected.length < 4) {
      selected.push(id);
    }
    renderBoard(false);
    updateButtons();
  }

  function finishGame(result) {
    status = result;
    if (result === "lost") {
      solved = config.categories.map((_, index) => index);
    }
    selected = [];
    renderBoard(false);
    elements.controls.classList.add("hidden");
    elements.endCard.classList.remove("hidden");
    elements.endTitle.textContent = result === "won" ? "Perfect!" : "Next time!";
    elements.endCopy.textContent =
      result === "won"
        ? "You found all four connections."
        : "The remaining connections are revealed above.";
  }

  function submitGuess() {
    if (selected.length !== 4 || status !== "playing") return;

    const signature = selected.slice().sort().join("|");
    if (submittedGuesses.includes(signature)) {
      setMessage("Already guessed!");
      return;
    }
    submittedGuesses.push(signature);

    const guessedTiles = remainingTiles().filter((tile) => selected.includes(tile.id));
    const categoryIndex = guessedTiles[0].categoryIndex;
    const correct = guessedTiles.every(
      (tile) => tile.categoryIndex === categoryIndex,
    );

    if (correct) {
      solved.push(categoryIndex);
      guessRows.push({ categoryIndex });
      selected = [];
      setMessage("");
      renderBoard(false);
      updateButtons();
      if (solved.length === config.categories.length) finishGame("won");
      return;
    }

    const counts = config.categories.map(
      (_, index) => guessedTiles.filter((tile) => tile.categoryIndex === index).length,
    );
    const oneAway = Math.max.apply(null, counts) === 3;
    mistakesRemaining -= 1;
    guessRows.push({ categoryIndex: null });
    setMessage(oneAway ? "One away…" : "Not quite");
    renderMistakes();
    renderBoard(true);
    if (mistakesRemaining <= 0) finishGame("lost");
  }

  function resetGame() {
    tiles = shuffle(makeTiles());
    selected = [];
    solved = [];
    mistakesRemaining = config.mistakesAllowed || 4;
    status = "playing";
    guessRows = [];
    submittedGuesses = [];
    elements.controls.classList.remove("hidden");
    elements.endCard.classList.add("hidden");
    elements.endMessage.textContent = "";
    setMessage("");
    renderMistakes();
    renderBoard(false);
    updateButtons();
  }

  async function shareResults() {
    const rows = guessRows.map((guess) =>
      guess.categoryIndex === null
        ? "⬛⬛⬛⬛"
        : SYMBOLS[guess.categoryIndex].repeat(4),
    );
    const result = `${config.title}\n${status === "won" ? "Solved!" : "Better luck next time"}\n${rows.join("\n")}`;

    try {
      await navigator.clipboard.writeText(result);
      elements.endMessage.textContent = "Results copied!";
    } catch {
      elements.endMessage.textContent = "Your browser blocked copying.";
    }
  }

  elements.eyebrow.textContent = config.eyebrow || "Custom Puzzle";
  elements.instructions.textContent =
    config.instructions || "Create four groups of four!";
  document.title = `${config.title || "Connections"} Game`;

  elements.shuffle.addEventListener("click", () => {
    tiles = shuffle(tiles);
    renderBoard(false);
  });
  elements.deselect.addEventListener("click", () => {
    selected = [];
    setMessage("");
    renderBoard(false);
    updateButtons();
  });
  elements.submit.addEventListener("click", submitGuess);
  elements.share.addEventListener("click", shareResults);
  elements.playAgain.addEventListener("click", resetGame);

  resetGame();
})();
