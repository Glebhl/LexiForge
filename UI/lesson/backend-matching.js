// Matching task interactions and completion tracking

// Template for a single matching item
const itemTemplate = document.getElementById("item-template");

// Global state of the matching task
const matchingState = {
  pickedLeft: null,   // Currently selected item on the left side
  pickedRight: null,  // Currently selected item on the right side
  totalPairs: 0,      // Total number of pairs in the task
  solvedPairs: 0,     // Number of correctly solved pairs
  madeMistake: false, // Whether the user made at least one mistake
};

// Initialize matching task
// Creates DOM items and resets internal state
function initMatching(el, pairs) {

  if (!Array.isArray(pairs)) {
    throw new TypeError("pairs_must_be_array");
  }

  const grid = el.querySelector(".matching-grid");
  const columnLeft = el.querySelector(".matching-grid__column--left");
  const columnRight = el.querySelector(".matching-grid__column--right");

  // Clear previous items
  columnLeft.replaceChildren();
  columnRight.replaceChildren();

  // Reset state
  matchingState.pickedLeft = null;
  matchingState.pickedRight = null;
  matchingState.totalPairs = pairs.length;
  matchingState.solvedPairs = 0;
  matchingState.madeMistake = false;

  // Disable "Continue" button until task is solved
  lessonTaskUtils.setContinueEnabled(false);

  const rightItems = [];

  // Create items for the left column
  for (let i = 0; i < pairs.length; i++) {

    const pair = Array.isArray(pairs[i]) ? pairs[i] : [];

    const leftText = pair[0] === undefined ? "" : String(pair[0]);
    const rightText = pair[1] === undefined ? "" : String(pair[1]);

    columnLeft.append(createItemNode(leftText, i, "left"));

    // Store right column items for later shuffle
    rightItems.push({
      text: rightText,
      pairId: i
    });
  }

  // Shuffle right column to make matching non-trivial
  lessonTaskUtils.shuffleArrayInPlace(rightItems);

  // Create right column items
  for (const item of rightItems) {
    columnRight.append(
      createItemNode(item.text, item.pairId, "right")
    );
  }

  // If there are no pairs – immediately enable continue
  if (matchingState.totalPairs === 0) {
    lessonTaskUtils.setContinueEnabled(true);
  }

  // Event delegation for item clicks
  grid.addEventListener("click", function (event) {

    const item = event.target.closest(".task-choice");

    if (!item) {
      return;
    }

    handleItemClick(item);

  });
}

// Handle click on a matching item
function handleItemClick(item) {

  // Ignore already solved items
  if (item.classList.contains("is-correct")) {
    return;
  }

  const side = item.dataset.side;

  if (!side) {
    return;
  }

  // If the item is already selected -> deselect it
  if (item.classList.contains("is-selected")) {

    setState(item, "is-idle");
    setPicked(side, null);

    return;
  }

  const currentPicked = getPicked(side);

  // Replace previously selected item on the same side
  if (currentPicked && currentPicked !== item) {
    setState(currentPicked, "is-idle");
  }

  setPicked(side, item);
  setState(item, "is-selected");

  // Wait until both sides are selected
  if (!matchingState.pickedLeft || !matchingState.pickedRight) {
    return;
  }

  // Check if selected items match

  const isCorrect =
    matchingState.pickedLeft.dataset.pairId ===
    matchingState.pickedRight.dataset.pairId;

  if (isCorrect) {

    // Mark both items as correct
    setState(matchingState.pickedLeft, "is-correct");
    setState(matchingState.pickedRight, "is-correct");

    matchingState.solvedPairs += 1;

    // Enable continue button when task is finished
    if (matchingState.solvedPairs === matchingState.totalPairs) {
      lessonTaskUtils.setContinueEnabled(true);
    }

  } else {

    // Mark mistake
    matchingState.madeMistake = true;

    setState(matchingState.pickedLeft, "is-wrong");
    setState(matchingState.pickedRight, "is-wrong");
  }

  // Reset selection
  matchingState.pickedLeft = null;
  matchingState.pickedRight = null;
}

// Create DOM node for a matching item
function createItemNode(text, pairId, side) {

  const node = itemTemplate.content.cloneNode(true);
  const item = node.querySelector(".task-choice");

  item.textContent = String(text);
  item.dataset.pairId = String(pairId);
  item.dataset.side = side;

  // Default state
  item.className = "task-choice is-idle";

  return node;
}

// Apply visual state to item
function setState(item, state) {

  item.className = "task-choice";
  item.classList.add(state);

}

// Get currently selected item for a side
function getPicked(side) {

  if (side === "left") {
    return matchingState.pickedLeft;
  }

  return matchingState.pickedRight;

}

// Store selected item for a side
function setPicked(side, item) {

  if (side === "left") {
    matchingState.pickedLeft = item;
    return;
  }

  matchingState.pickedRight = item;

}

// Return task result (true if user made mistakes)
function getMatchingResults() {
  return matchingState.madeMistake;
}
