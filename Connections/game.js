(function () {
  "use strict";

  const config = window.CONNECTIONS_CONFIG;
  const app = document.getElementById("app");
  const QR_BASE_URL = "https://gkozak1.github.io/FamilyGames/Connections/";
  const TILE_ORDER = [5, 12, 1, 14, 8, 3, 10, 7, 0, 15, 4, 11, 6, 2, 13, 9];

  if (!validConfig(config)) {
    app.innerHTML =
      '<main class="config-error"><h1>Check game-config.js</h1><p>The puzzle needs four categories, four facets, and four items in each category.</p></main>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const sessionId = config.sessionId;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sessionId || "")) {
    app.innerHTML = '<main class="config-error"><h1>Check the session link</h1><p>Session names use letters, numbers, hyphens and underscores.</p></main>';
    return;
  }
  const facetParameter = params.get("facet");
  const facet = config.facets.find(
    (candidate) =>
      candidate.id === String(facetParameter || "").toLowerCase() ||
      String(candidate.partNumber) === facetParameter,
  );

  if (!facet) {
    renderLauncher();
    return;
  }

  const allTiles = makeTiles();
  let tiles = TILE_ORDER.map((position) => allTiles[position]);
  const anchor = allTiles.find((tile) => tile.text === facet.anchorText);
  const targetCategory = config.categories[facet.categoryIndex];
  let state = restoreState();
  let message = "";
  let shouldShake = false;
  let assistantHelp = false;

  let sync = null;
  let sharedAssembly = ["", "", "", ""];
  let syncStatus = { connected: false, pending: false, message: "Connecting — your progress is saved on this device." };
  let celebrated = false;
  render();
  startSync();

  async function startSync() {
    try {
      const { createConnectionsSync } = await import("./firebase-sync.mjs");
      sync = createConnectionsSync({ sessionId, facet, facets: config.facets,
        config: window.CONNECTIONS_FIREBASE_CONFIG, puzzleId: config.puzzleId,
        onState: value => {
          const changedEpoch = state.epoch !== null && state.epoch !== value.epoch;
          if (value.reset || changedEpoch || (state.epoch === null && value.epoch !== 0)) {
            state = blankState(); celebrated = false; message = "The assistant has started a fresh round.";
            sync?.cancelPending();
          }
          state.epoch = value.epoch;
          sharedAssembly = value.assembly;
          if (value.ownPublished) state.phase = "assemble";
          if (["assemble", "complete"].includes(state.phase)) {
            state.phase = sharedAssembly.every(Boolean) ? "complete" : "assemble";
          }
          saveState();
          if (value.reset || changedEpoch || ["assemble", "complete"].includes(state.phase)) render();
        },
        onStatus: value => { syncStatus = value; updateSyncStatus(); }
      });
      if (["assemble", "complete"].includes(state.phase)) sync.publish();
    } catch (_) {
      syncStatus = { connected: false, pending: true, message: "Connection interrupted — progress saved. Retrying automatically." };
      updateSyncStatus();
      setTimeout(startSync, 5000);
    }
  }
  function updateSyncStatus() {
    const el = document.getElementById("sync-status");
    if (!el) return;
    el.textContent = syncStatus.message;
    el.className = `sync-status ${syncStatus.connected && !syncStatus.pending ? "online" : "pending"}`;
  }

  function validConfig(value) {
    return Boolean(
      value &&
        value.categories &&
        value.categories.length === 4 &&
        value.facets &&
        value.facets.length === 4 &&
        value.finalCode &&
        value.finalCode.length === 16 &&
        value.categories.every(
          (category) =>
            category.name &&
            category.color &&
            category.items &&
            category.items.length === 4 &&
            category.items.every((item) => item.text),
        ) &&
        value.facets.every(
          (item) =>
            item.id &&
            item.color &&
            item.orderedItems &&
            item.orderedItems.length === 4 &&
            item.code &&
            item.code.length === 4,
        ),
    );
  }

  function makeTiles() {
    return config.categories.flatMap((category, categoryIndex) =>
      category.items.map((item, itemIndex) => ({
        text: item.text,
        categoryIndex,
        id: `${categoryIndex}-${itemIndex}`,
      })),
    );
  }

  function blankState() {
    return {
      phase: "connection",
      epoch: null,
      selected: anchor ? [anchor.id] : [],
      categoryAnswer: "",
      orderSelection: [],
      assembly: ["", "", "", ""],
    };
  }

  function storageKey() {
    return `${config.puzzleId}:${sessionId}:${facet.id}:game`;
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey()) || "null");
      if (!saved) return blankState();
      if (saved.epoch === undefined) saved.epoch = null;
      if (!saved.selected || !saved.selected.includes(anchor.id)) saved.selected = [anchor.id];
      if (!Array.isArray(saved.orderSelection)) saved.orderSelection = [];
      if (!Array.isArray(saved.assembly) || saved.assembly.length !== 4) {
        saved.assembly = ["", "", "", ""];
      }
      return saved;
    } catch (_error) {
      return blankState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch (_error) {
      // The puzzle still works if a browser blocks local storage.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ordinal(value) {
    if (value === 1) return "1st";
    if (value === 2) return "2nd";
    if (value === 3) return "3rd";
    return `${value}th`;
  }

  function normalize(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function keywordMatches(word, keyword) {
    if (word === keyword) return true;
    if (Math.min(word.length, keyword.length) < 3) return false;
    return word.startsWith(keyword) || keyword.startsWith(word);
  }

  function categoryAnswerMatches(answer) {
    const words = normalize(answer).split(/\s+/).filter(Boolean);
    return facet.acceptedKeywordSets.some((set) =>
      set.every((keyword) =>
        words.some((word) => keywordMatches(word, normalize(keyword))),
      ),
    );
  }

  function shuffled(values) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const previous = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = previous;
    }
    return copy;
  }

  function diamondPath(complete) {
    return complete ? "facets/complete.svg" : `facets/${facet.id}.svg`;
  }

  function shell(content, complete) {
    return `
      <main class="game-shell" style="--facet-color:${facet.color}">
        <header class="site-header">
          <div class="brand-lockup">
            <img class="facet-diamond" src="${diamondPath(complete)}" width="66" height="66" alt="" />
            <div class="header-copy">
              <span class="eyebrow">${escapeHtml(config.title)}</span>
              <span class="header-divider" aria-hidden="true"></span>
              <span class="header-instructions">${escapeHtml(facet.label)}</span>
            </div>
          </div>
          <details class="how-to">
            <summary>How to play</summary>
            <div class="how-to-card">
              <strong>Your colored clue is permanently selected.</strong>
              <p>Find the other three clues in its connection. You may try as many times as needed.</p>
              <p>Only your facet can recover this part of the final message.</p>
            </div>
          </details>
        </header>
        <section class="game" aria-label="${escapeHtml(facet.label)} Connections puzzle">
          ${content}
        </section>
        <p id="sync-status" class="sync-status" role="status" aria-live="polite"></p>
        <footer>
          <span>${escapeHtml(facet.label)}</span><span aria-hidden="true">•</span>
          ${["assemble", "complete"].includes(state.phase) ? "" : '<button id="reset-facet" type="button">Start this facet over</button>'}
        </footer>
      </main>`;
  }

  function render() {
    if (state.phase === "identify") renderIdentify();
    else if (state.phase === "order") renderOrder();
    else if (state.phase === "assemble") renderAssembly(false);
    else if (state.phase === "complete") renderAssembly(true);
    else renderConnection();
    bindReset();
    updateSyncStatus();
    saveState();
  }

  function renderConnection() {
    const tileButtons = tiles
      .map((tile) => {
        const selected = state.selected.includes(tile.id);
        const isAnchor = tile.id === anchor.id;
        return `
          <button type="button" class="tile${selected ? " selected" : ""}${isAnchor ? " anchor" : ""}"
            data-tile-id="${tile.id}" aria-pressed="${selected}" aria-label="${escapeHtml(tile.text)}${isAnchor ? ", permanently selected" : ""}">
            ${isAnchor ? '<span class="anchor-mark" aria-hidden="true">◆</span>' : ""}
            <span>${escapeHtml(tile.text)}</span>
          </button>`;
      })
      .join("");

    app.innerHTML = shell(`
      <div class="stage-heading">
        <p class="stage-label">Facet ${facet.partNumber} of 4</p>
        <h1>Recover your connection</h1>
        <p>Find the three clues that belong with the permanently selected clue.</p>
      </div>
      <div class="tile-grid${shouldShake ? " shake" : ""}">${tileButtons}</div>
      <div class="message" role="status" aria-live="polite">${message || "&nbsp;"}</div>
      <div class="button-row">
        <button class="pill-button" id="shuffle-button" type="button">Shuffle</button>
        <button class="pill-button" id="deselect-button" type="button" ${state.selected.length === 1 ? "disabled" : ""}>Deselect all</button>
        <button class="pill-button submit-button" id="submit-button" type="button" ${state.selected.length !== 4 ? "disabled" : ""}>Submit</button>
      </div>`, false);

    app.querySelectorAll("[data-tile-id]").forEach((button) => {
      button.addEventListener("click", () => toggleTile(button.dataset.tileId));
    });
    document.getElementById("shuffle-button").addEventListener("click", () => {
      tiles = shuffled(tiles);
      renderConnection();
      bindReset();
      updateSyncStatus();
    });
    document.getElementById("deselect-button").addEventListener("click", () => {
      state.selected = [anchor.id];
      message = "";
      render();
    });
    document.getElementById("submit-button").addEventListener("click", submitConnection);
    shouldShake = false;
  }

  function toggleTile(id) {
    if (id === anchor.id) return;
    message = "";
    if (state.selected.includes(id)) {
      state.selected = state.selected.filter((tileId) => tileId !== id);
    } else if (state.selected.length < 4) {
      state.selected.push(id);
    }
    render();
  }

  function submitConnection() {
    if (state.selected.length !== 4) return;
    const guessed = allTiles.filter((tile) => state.selected.includes(tile.id));
    const correct = guessed.every((tile) => tile.categoryIndex === facet.categoryIndex);
    if (correct) {
      state.phase = "identify";
      message = "";
      render();
      return;
    }
    const targetCount = guessed.filter((tile) => tile.categoryIndex === facet.categoryIndex).length;
    message = targetCount === 3 ? "One away…" : "Not quite";
    shouldShake = true;
    render();
  }

  function renderIdentify() {
    const recovered = targetCategory.items
      .map((item) => `<span>${escapeHtml(item.text)}</span>`)
      .join("");
    app.innerHTML = shell(`
      <section class="stage-card">
        <img class="stage-diamond" src="${diamondPath(false)}" alt="" />
        <p class="stage-label">Connections recovered</p>
        <h1>Identify the connection</h1>
        <div class="recovered-row">${recovered}</div>
        <label class="answer-field">
          <span>What connects these four clues?</span>
          <textarea id="category-answer" placeholder="Describe the connection" rows="3">${escapeHtml(state.categoryAnswer)}</textarea>
        </label>
        <div class="message" role="status" aria-live="polite">${message || "&nbsp;"}</div>
        ${assistantHelp ? '<div class="assistant-note">Tell the Assistant the connection you mean. The Assistant may suggest words the Archive needs to recognize. Revise your answer and try again.</div>' : ""}
        <div class="button-row">
          <button class="pill-button" id="ask-assistant" type="button">Ask Assistant</button>
          <button class="pill-button submit-button" id="identify-button" type="button" ${state.categoryAnswer.trim() ? "" : "disabled"}>Identify</button>
        </div>
      </section>`, false);

    const textarea = document.getElementById("category-answer");
    textarea.addEventListener("input", () => {
      state.categoryAnswer = textarea.value;
      message = "";
      document.getElementById("identify-button").disabled = !state.categoryAnswer.trim();
      saveState();
    });
    document.getElementById("ask-assistant").addEventListener("click", () => {
      assistantHelp = true;
      render();
    });
    document.getElementById("identify-button").addEventListener("click", () => {
      if (categoryAnswerMatches(state.categoryAnswer)) {
        state.phase = "order";
        message = "";
        assistantHelp = false;
      } else {
        message = "That wording has not recovered the connection yet.";
      }
      render();
    });
  }

  function renderOrder() {
    const slots = Array.from({ length: 4 })
      .map((_, index) => `
        <button type="button" class="order-slot${state.orderSelection[index] ? " filled" : ""}" data-order-remove="${index}" ${state.orderSelection[index] ? "" : "disabled"}>
          <b>${index + 1}</b><span>${escapeHtml(state.orderSelection[index] || "Choose a clue")}</span>
        </button>`)
      .join("");
    const choices = targetCategory.items
      .map((item) => {
        const position = state.orderSelection.indexOf(item.text);
        return `
          <button type="button" class="order-choice${position >= 0 ? " chosen" : ""}" data-order-item="${escapeHtml(item.text)}">
            ${position >= 0 ? `<b>${position + 1}</b>` : ""}<span>${escapeHtml(item.text)}</span>
          </button>`;
      })
      .join("");

    app.innerHTML = shell(`
      <section class="stage-card">
        <img class="stage-diamond" src="${diamondPath(false)}" alt="" />
        <p class="stage-label">${escapeHtml(targetCategory.name)}</p>
        <h1>Order your clues</h1>
        <p class="order-instruction">${escapeHtml(facet.orderInstruction)}</p>
        <div class="order-slots" aria-label="Your ordered clues">${slots}</div>
        <p class="tap-direction">Tap the clues below in the correct order.</p>
        <div class="order-choices">${choices}</div>
        <div class="message" role="status" aria-live="polite">${message || "&nbsp;"}</div>
        <div class="button-row">
          <button class="pill-button" id="clear-order" type="button" ${state.orderSelection.length ? "" : "disabled"}>Clear order</button>
          <button class="pill-button submit-button" id="check-order" type="button" ${state.orderSelection.length === 4 ? "" : "disabled"}>Check order</button>
        </div>
      </section>`, false);

    app.querySelectorAll("[data-order-item]").forEach((button) => {
      button.addEventListener("click", () => toggleOrderItem(button.dataset.orderItem));
    });
    app.querySelectorAll("[data-order-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const text = state.orderSelection[Number(button.dataset.orderRemove)];
        if (text) toggleOrderItem(text);
      });
    });
    document.getElementById("clear-order").addEventListener("click", () => {
      state.orderSelection = [];
      message = "";
      render();
    });
    document.getElementById("check-order").addEventListener("click", checkOrder);
  }

  function toggleOrderItem(text) {
    message = "";
    if (state.orderSelection.includes(text)) {
      state.orderSelection = state.orderSelection.filter((item) => item !== text);
    } else if (state.orderSelection.length < 4) {
      state.orderSelection.push(text);
    }
    render();
  }

  function checkOrder() {
    const correct = facet.orderedItems.every(
      (item, index) => state.orderSelection[index] === item,
    );
    if (correct) {
      state.phase = "assemble";
      sync?.publish();
      message = "";
    } else {
      message = "The clues are not yet in the correct order.";
    }
    render();
  }

  function renderAssembly() {
    const parts = sharedAssembly.slice();
    // An earned local fragment stays visible while its upload is pending.
    parts[facet.partNumber - 1] = facet.code;
    const complete = sharedAssembly.every(Boolean);
    const firstReveal = complete && !celebrated;
    if (complete) celebrated = true;
    state.phase = complete ? "complete" : "assemble";
    const count = sharedAssembly.filter(Boolean).length;
    const blocks = config.facets.slice().sort((a, b) => a.partNumber - b.partNumber).map(owner => {
      const part = parts[owner.partNumber - 1];
      const confirmed = !!sharedAssembly[owner.partNumber - 1];
      const name = owner.label.replace(" Facet", "");
      return `<div class="code-block ${part ? "recovered" : "waiting"}" style="--block-color:${owner.color}">
        <span>${escapeHtml(name)}</span>
        <div class="code-value" aria-label="${escapeHtml(name)} fragment">${escapeHtml(part || "····")}</div>
        <small>${confirmed ? "Recovered" : part ? "Sharing…" : `Waiting for ${escapeHtml(name)}`}</small>
      </div>`;
    }).join("");
    app.innerHTML = shell(`
      <section class="stage-card assembly-card ${complete ? "transmission-complete" : ""} ${firstReveal ? "just-completed" : ""}">
        <img class="stage-diamond" src="${diamondPath(complete)}" alt="${complete ? "All four diamond facets illuminated" : "Your diamond facet"}" />
        <p class="stage-label">${complete ? "The four facets are united." : "Facet authenticated"}</p>
        <h1>${complete ? "Decode the recovered transmission" : "Your fragment is recovered"}</h1>
        <p>${complete ? "The message has no spaces and may use abbreviations." : "The other fragments will appear here as each sleuth recovers them."}</p>
        <div class="assembly-grid ${complete ? "complete" : ""}">${blocks}</div>
        <p class="recovery-count" role="status">${complete ? "All 4 fragments recovered" : `${count} of 4 fragments shared`}</p>
        ${complete ? `<div class="continuous-code">${escapeHtml(sharedAssembly.join(""))}</div>
          <div class="final-instruction">When you understand Nigel’s instruction, state it to his erstwhile assistant.</div>` : ""}
        <div class="message" role="status" aria-live="polite">${message || "&nbsp;"}</div>
      </section>`, complete);
  }

  function bindReset() {
    const reset = document.getElementById("reset-facet");
    if (!reset) return;
    reset.addEventListener("click", () => {
      if (!window.confirm("Start this facet again from the beginning?")) return;
      try {
        localStorage.removeItem(storageKey());
      } catch (_error) {
        // Continue with an in-memory reset.
      }
      const epoch = state.epoch;
      state = blankState();
      state.epoch = epoch;
      sync?.cancelPending();
      tiles = TILE_ORDER.map((position) => allTiles[position]);
      message = "";
      assistantHelp = false;
      render();
    });
  }

  function renderLauncher() {
    const cards = config.facets
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((item) => `
        <article class="qr-card" style="--facet-color:${item.color}">
          <img src="qr/facet-${item.partNumber}-${item.id}.svg" alt="QR code for ${escapeHtml(item.label)}" />
          <h2>${escapeHtml(item.label)}</h2>
          <p>Code block ${item.partNumber} of 4</p>
          <div class="qr-actions">
            <a href="?facet=${item.id}">Open facet</a>
            <a href="qr/facet-${item.partNumber}-${item.id}.svg" download>Download QR</a>
          </div>
        </article>`)
      .join("");

    app.innerHTML = `
      <main class="launcher-shell">
        <section class="launcher-card">
          <img class="launcher-diamond" src="facets/complete.svg" alt="" />
          <p class="kicker">The Jewel of the Lochs</p>
          <h1>Four-Facet Connections</h1>
          <p class="launcher-copy">Give each sleuth one QR code. Every code opens a different facet of the same puzzle.</p>
          <div class="qr-grid">${cards}</div>
          <p class="print-note">The QR codes open personalized versions of <strong>${escapeHtml(QR_BASE_URL.replace("https://", ""))}</strong>.</p>
        </section>
      </main>`;
  }
})();
