/* =========================================================
   DailyHabits — client-side app
   Talks to the JSON API; renders the grid and notes with
   plain DOM manipulation — no framework, no bundler.
   ========================================================= */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// State
let currentYear, currentMonth; // 0-indexed month

function init() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  document
    .getElementById("prev-month")
    .addEventListener("click", () => navigate(-1));
  document
    .getElementById("next-month")
    .addEventListener("click", () => navigate(1));

  document
    .getElementById("new-habit-btn")
    .addEventListener("click", openHabitModal);
  document
    .getElementById("habit-cancel")
    .addEventListener("click", closeHabitModal);
  document.getElementById("habit-form").addEventListener("submit", submitHabit);

  document
    .getElementById("new-note-btn")
    .addEventListener("click", openNoteModal);
  document
    .getElementById("note-cancel")
    .addEventListener("click", closeNoteModal);
  document.getElementById("note-form").addEventListener("submit", submitNote);

  // Close modals on overlay click
  document.getElementById("habit-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeHabitModal();
  });
  document.getElementById("note-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeNoteModal();
  });

  // Close modals on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeHabitModal();
      closeNoteModal();
    }
  });

  render();
  loadNotes();
}

function navigate(delta) {
  currentMonth += delta;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  render();
  loadNotes();
}

function monthParam() {
  return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
}

// =========================================================
// Grid rendering
// =========================================================

async function render() {
  const mp = monthParam();
  document.getElementById("month-label").textContent =
    `${MONTH_NAMES[currentMonth]} ${currentYear}`;

  const habits = await apiFetch(`/api/habits?month=${mp}`);
  const container = document.getElementById("habit-grid-container");
  container.innerHTML = "";

  if (!habits.length) {
    container.innerHTML =
      '<div class="empty-habits">No habits yet — add one below.</div>';
    return;
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isCurrentMonth =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  const table = document.createElement("table");
  table.className = "habit-table";

  // Build two header rows: day letters + day numbers
  const thead = table.createTHead();

  const trLetters = thead.insertRow();
  th(trLetters, "", "col-name"); // empty corner

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(currentYear, currentMonth, d);
    const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon…6=Sun
    const cell = th(trLetters, DAY_LETTERS[dayOfWeek]);
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (isCurrentMonth && dateStr === todayStr) cell.classList.add("col-today");
  }
  th(trLetters, "Goal", "col-goal");
  th(trLetters, "Achieved", "col-achieved");

  const trNumbers = thead.insertRow();
  th(trNumbers, "Habit", "col-name");

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = th(trNumbers, String(d));
    if (isCurrentMonth && dateStr === todayStr) cell.classList.add("col-today");
  }
  th(trNumbers, "", "col-goal");
  th(trNumbers, "", "col-achieved");

  // Body rows
  const tbody = table.createTBody();

  for (const habit of habits) {
    const checkedSet = new Set(habit.checkedDates);
    const tr = tbody.insertRow();

    // Name cell
    const nameTd = tr.insertCell();
    nameTd.className = "col-name";
    nameTd.textContent = habit.name;

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const td = tr.insertCell();
      td.className = "cell-day";
      if (isCurrentMonth && dateStr === todayStr) td.classList.add("col-today");

      const inner = document.createElement("div");
      inner.className = "cell-inner";

      const checkSvg = makeCheckSvg();

      if (checkedSet.has(dateStr)) {
        td.classList.add("checked");
        inner.style.background = habit.color;
        checkSvg.classList.add("visible");
      }

      inner.appendChild(checkSvg);
      td.appendChild(inner);

      td.addEventListener("click", () =>
        toggleCheck(
          habit,
          dateStr,
          td,
          inner,
          checkSvg,
          checkedSet,
          achievedTd,
        ),
      );
    }

    // Goal cell
    const goalTd = tr.insertCell();
    goalTd.className = "col-goal";
    goalTd.textContent = habit.goal;

    // Achieved cell
    const achievedTd = tr.insertCell();
    achievedTd.className = "col-achieved";
    updateAchievedCell(achievedTd, habit.achieved, habit.goal);
  }

  container.appendChild(table);
}

function makeCheckSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "#ffffff");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "cell-check-svg");
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  poly.setAttribute("points", "3,9 6.5,12.5 13,4");
  svg.appendChild(poly);
  return svg;
}

function th(row, text, className) {
  const cell = document.createElement("th");
  if (text) cell.textContent = text;
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}

// =========================================================
// Toggle a check cell (optimistic update)
// =========================================================

async function toggleCheck(
  habit,
  dateStr,
  td,
  inner,
  checkSvg,
  checkedSet,
  achievedTd,
) {
  const wasChecked = checkedSet.has(dateStr);

  // Optimistic update
  if (wasChecked) {
    checkedSet.delete(dateStr);
    td.classList.remove("checked");
    inner.style.background = "";
    checkSvg.classList.remove("visible");
  } else {
    checkedSet.add(dateStr);
    td.classList.add("checked");
    inner.style.background = habit.color;
    checkSvg.classList.add("visible");
  }
  updateAchievedCell(achievedTd, checkedSet.size, habit.goal);

  try {
    await apiFetch(`/api/habits/${habit.id}/toggle`, "POST", { date: dateStr });
  } catch {
    // Revert on error
    if (wasChecked) {
      checkedSet.add(dateStr);
      td.classList.add("checked");
      inner.style.background = habit.color;
      checkSvg.classList.add("visible");
    } else {
      checkedSet.delete(dateStr);
      td.classList.remove("checked");
      inner.style.background = "";
      checkSvg.classList.remove("visible");
    }
    updateAchievedCell(achievedTd, checkedSet.size, habit.goal);
  }
}

function updateAchievedCell(td, achieved, goal) {
  td.textContent = achieved;
  if (achieved >= goal) {
    td.classList.add("achieved-ok");
  } else {
    td.classList.remove("achieved-ok");
  }
}

// =========================================================
// New Habit modal
// =========================================================

function openHabitModal() {
  document.getElementById("habit-form").reset();
  document.getElementById("habit-modal").hidden = false;
  document.getElementById("habit-name").focus();
}
function closeHabitModal() {
  document.getElementById("habit-modal").hidden = true;
}
async function submitHabit(e) {
  e.preventDefault();
  const name = document.getElementById("habit-name").value.trim();
  const goal = parseInt(document.getElementById("habit-goal").value, 10);
  if (!name || !goal) return;

  await apiFetch("/api/habits", "POST", { name, goal });
  closeHabitModal();
  render();
}

// =========================================================
// Notes
// =========================================================

async function loadNotes() {
  const notes = await apiFetch(`/api/notes?month=${monthParam()}`);
  renderNotes(notes);
}

function renderNotes(notes) {
  const list = document.getElementById("notes-list");
  list.innerHTML = "";

  if (!notes.length) {
    list.innerHTML = '<p class="notes-empty">No notes yet.</p>';
    return;
  }
  for (const note of notes) {
    list.appendChild(buildNoteCard(note));
  }
}

function buildNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";

  const ts = document.createElement("div");
  ts.className = "note-timestamp";
  ts.textContent = formatTimestamp(note.created_at);

  const content = document.createElement("div");
  content.className = "note-content";
  content.textContent = note.content;

  card.appendChild(ts);
  card.appendChild(content);
  return card;
}

function formatTimestamp(sqliteStr) {
  // SQLite stores UTC; parse as UTC and display in local time
  const dt = new Date(sqliteStr.replace(" ", "T") + "Z");
  return dt
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", " at");
}

function openNoteModal() {
  document.getElementById("note-form").reset();
  document.getElementById("note-modal").hidden = false;
  document.getElementById("note-content").focus();
}
function closeNoteModal() {
  document.getElementById("note-modal").hidden = true;
}
async function submitNote(e) {
  e.preventDefault();
  const content = document.getElementById("note-content").value.trim();
  if (!content) return;

  const note = await apiFetch("/api/notes", "POST", { content });
  closeNoteModal();

  // Prepend new note card
  const list = document.getElementById("notes-list");
  const emptyEl = list.querySelector(".notes-empty");
  if (emptyEl) emptyEl.remove();
  list.insertBefore(buildNoteCard(note), list.firstChild);
}

// =========================================================
// API helper
// =========================================================

async function apiFetch(url, method = "GET", body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// =========================================================
// Boot
// =========================================================

document.addEventListener("DOMContentLoaded", init);
