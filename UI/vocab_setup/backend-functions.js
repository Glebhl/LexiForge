// ID counter
let nextId = 0;

const tpl = document.getElementById('card-template');
const list = document.getElementById('cards');

function renumberCards() {
  const cards = list.querySelectorAll('.card');

  cards.forEach((card, i) => {
    card.dataset.id = String(i);
  });

  nextId = cards.length;

  const suffix = nextId === 1 ? "" : "s";

  document.getElementById('deck-amount').textContent =
    `Deck: ${nextId} card${suffix}`;
}

function captureCardPositions() {
  const positions = new Map();

  list.querySelectorAll('.card').forEach((card) => {
    positions.set(card, card.getBoundingClientRect());
  });

  return positions;
}

function animateCardReflow(previousPositions) {
  const cards = list.querySelectorAll('.card');

  cards.forEach((card) => {
    const previousRect = previousPositions.get(card);

    if (!previousRect) {
      return;
    }

    const currentRect = card.getBoundingClientRect();
    const deltaX = previousRect.left - currentRect.left;
    const deltaY = previousRect.top - currentRect.top;

    if (!deltaX && !deltaY) {
      return;
    }

    card.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' }
      ],
      {
        duration: 220,
        easing: 'ease'
      }
    );
  });
}

function addCard(word, unit, part, level, transcription, translation, defenition, example) {
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector('.card');
  const id = String(nextId++);

  card.dataset.id = id;
  card.querySelector('.word').textContent = word;
  card.querySelector('.tag--purple').textContent = unit;
  card.querySelector('.tag--green').textContent = part;
  card.querySelector('.tag--amber').textContent = level;
  card.querySelector('.transcription').textContent = transcription;
  card.querySelector('.translation').textContent = translation;
  card.querySelector('.defenition').textContent = defenition;
  card.querySelector('.example').textContent = example;
  
  list.append(node);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add('fade-enter-active');
    });
  });

  card.addEventListener('transitionend', () => {
    card.classList.remove('fade-enter');
    card.classList.remove('fade-enter-active');
  }, { once: true });

  renumberCards();

  return id;
}

function animateCardRemoval(card, onRemoved) {
  if (!card || card.classList.contains('fade-exit-active')) {
    return;
  }

  const previousPositions = captureCardPositions();
  card.classList.add('fade-exit');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add('fade-exit-active');
    });
  });

  card.addEventListener('transitionend', () => {
    card.remove();
    renumberCards();
    animateCardReflow(previousPositions);

    if (typeof onRemoved === 'function') {
      onRemoved();
    }
  }, { once: true });
}

function removeCard(id) {
  const card = list.querySelector(`.card[data-id="${id}"]`);
  animateCardRemoval(card);
}

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-btn');
  if (!btn) return;

  const item = btn.closest('.card');
  const removedId = item.dataset.id;

  animateCardRemoval(item, () => {
    backend.emitEvent('card-closed', { id: removedId });
  });
});

function setHint(hint) {
  document.getElementById('hint').innerHTML = hint;
}

// UI actions (JS -> Python)
document.getElementById('btn-go').addEventListener('click', () => {
  backend.emitEvent('btn-click', { id: "generate" });
});

document.getElementById("btn-start").addEventListener('click', () => {
  backend.emitEvent('btn-click', { id: 'start_lesson' });
});
