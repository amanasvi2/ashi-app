// Vanilla JS, no build step — this tool is local-only and never shipped,
// so there's no reason to drag in a framework for one screen.

const FAIL_CODES = {
  1: 'Not inference — answer is stated directly in the text',
  2: 'Ambiguous',
  3: 'Requires outside knowledge',
  4: "Clue sentence doesn't support the answer",
  5: 'Wrong reading level or age register',
  6: 'Figurative language in the question itself',
  7: 'Weak or defensible distractor',
  8: 'No clear problem / culturally variable cue',
};

const app = document.getElementById('app');

const state = {
  batches: [],
  batch: null,      // { file, items, meta }
  index: 0,          // pointer into batch.items (only unreviewed ones matter)
  stagedCode: null,  // 1-8 while a fail note is being entered, else null
};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Case-insensitive substring highlight — permissive on purpose, matching
// EvidenceHighlighter.tsx's reasoning that minor drift shouldn't hide the
// intent of what's being reviewed.
function highlightEvidence(scenario, evidence) {
  if (!evidence) return escapeHtml(scenario);
  const idx = scenario.toLowerCase().indexOf(evidence.toLowerCase());
  if (idx === -1) return escapeHtml(scenario) + '<p style="color:#b3261e;font-size:12px;margin-top:8px">⚠ evidence string not found verbatim in scenario</p>';
  const before = scenario.slice(0, idx);
  const match = scenario.slice(idx, idx + evidence.length);
  const after = scenario.slice(idx + evidence.length);
  return `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`;
}

async function loadBatches() {
  state.batches = await (await fetch('/api/batches')).json();
  render();
}

async function openBatch(file) {
  const data = await (await fetch(`/api/batch/${encodeURIComponent(file)}`)).json();
  state.batch = data;
  state.index = data.items.findIndex(it => !it.reviewed);
  state.stagedCode = null;
  render();
}

function currentItem() {
  return state.batch && state.index >= 0 ? state.batch.items[state.index] : null;
}

function advance() {
  const items = state.batch.items;
  let next = state.index + 1;
  while (next < items.length && items[next].reviewed) next++;
  state.index = next < items.length ? next : -1;
  state.stagedCode = null;
  render();
}

async function commit(verdict, code, note) {
  const item = currentItem();
  if (!item) return;
  item.reviewed = true; // optimistic — advance() re-scans from here regardless
  await fetch('/api/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId: item.id,
      batchFile: state.batch.file,
      type: state.batch.meta.type,
      difficulty: state.batch.meta.difficulty,
      level: state.batch.meta.level,
      profile: state.batch.meta.profile,
      verdict,
      code: code ?? undefined,
      note: note?.trim() || undefined,
    }),
  });
  advance();
}

function renderBatchPicker() {
  if (state.batches.length === 0) {
    app.innerHTML = `<h1>Item Review</h1><p>No batches yet. Run <code>npm run items:generate</code> first.</p>`;
    return;
  }
  app.innerHTML = `
    <h1>Item Review</h1>
    <ul class="batch-list">
      ${state.batches.map(b => `
        <li class="batch-row" data-file="${escapeHtml(b.file)}">
          <div>
            <div>${escapeHtml(b.file)}</div>
            <div class="meta">${b.meta.type} · difficulty ${b.meta.difficulty} · level ${b.meta.level}${b.meta.profile ? ` · ${b.meta.profile}` : ''}</div>
          </div>
          <div class="count">${b.itemCount} items</div>
        </li>
      `).join('')}
    </ul>
  `;
  app.querySelectorAll('.batch-row').forEach(row => {
    row.addEventListener('click', () => openBatch(row.dataset.file));
  });
}

function renderDone() {
  app.innerHTML = `
    <div class="done">
      <p>All items in this batch are reviewed.</p>
      <button id="back">Back to batches</button>
    </div>
  `;
  document.getElementById('back').addEventListener('click', loadBatches);
}

function renderAnswerFormat(item, level) {
  const q = item.questions[0];
  if (level === 3) {
    return `<ul class="choices">${q.choices.map((c, i) => `<li class="choice${i === 0 ? ' correct' : ''}">${escapeHtml(c)}${i === 0 ? ' (correct)' : ''}</li>`).join('')}</ul>`;
  }
  if (level === 2 && q.wordBank) {
    return `<div class="wordbank">${q.wordBank.map(w => `<span class="chip${w.correct ? ' correct' : ''}">${escapeHtml(w.text)}</span>`).join('')}</div>`;
  }
  return `<p class="expected-answer">Expected answer: ${escapeHtml(q.choices[0])}</p>`;
}

function renderItem() {
  const item = currentItem();
  if (!item) return renderDone();
  const q = item.questions[0];
  const { meta, items } = state.batch;
  const reviewedCount = items.filter(it => it.reviewed).length;

  app.innerHTML = `
    <div class="meta-strip">
      <span>${meta.type}</span>
      <span>difficulty ${meta.difficulty}</span>
      <span>level ${meta.level}</span>
      ${meta.profile ? `<span>${escapeHtml(meta.profile)}</span>` : ''}
      <span>${escapeHtml(item.id)}</span>
    </div>
    <p class="progress">${reviewedCount} / ${items.length} reviewed</p>

    <div class="card scenario">${highlightEvidence(item.scenario, q.evidence)}</div>

    <div class="card">
      <p class="question-text">${escapeHtml(q.text)}</p>
      ${q.stem ? `<p class="question-stem">Stem: "${escapeHtml(q.stem)}"</p>` : ''}
      ${renderAnswerFormat(item, meta.level)}
    </div>

    ${state.stagedCode ? `
      <div class="fail-panel">
        <p class="code-label">${state.stagedCode}. ${FAIL_CODES[state.stagedCode]}</p>
        <textarea id="note" placeholder="Optional note..."></textarea>
        <p class="hint">Enter to confirm · Escape to cancel</p>
      </div>
    ` : ''}

    <div class="keys">
      <span><kbd>p</kbd> pass</span>
      ${Object.entries(FAIL_CODES).map(([n, label]) => `<span><kbd>${n}</kbd> ${label}</span>`).join('')}
    </div>
  `;

  if (state.stagedCode) {
    const note = document.getElementById('note');
    note.focus();
  }
}

function render() {
  if (!state.batch) return renderBatchPicker();
  renderItem();
}

document.addEventListener('keydown', e => {
  if (!state.batch || !currentItem()) return;

  const noteEl = document.getElementById('note');
  const typingInNote = noteEl && document.activeElement === noteEl;

  if (typingInNote) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit('fail', state.stagedCode, noteEl.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      state.stagedCode = null;
      render();
    }
    return; // let every other key type normally into the note
  }

  if (e.key === 'p') {
    commit('pass', undefined, undefined);
  } else if (e.key >= '1' && e.key <= '8') {
    state.stagedCode = Number(e.key);
    render();
  } else if (e.key === 'Escape' && state.stagedCode) {
    state.stagedCode = null;
    render();
  }
});

loadBatches();
