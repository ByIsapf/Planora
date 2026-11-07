// ==========================================
// ORGANIZADOR DO DIA A DIA
// ==========================================

const STORAGE_KEY = "organizador-tarefas";

const PERIODS = ["manha", "tarde", "noite"];
const PERIOD_NAMES = { manha: "a manhã", tarde: "a tarde", noite: "a noite" };

const PRIORITY_RANK = { alta: 0, media: 1, baixa: 2 };
const PRIORITY_LABELS = { alta: "Alta", media: "Média", baixa: "Baixa" };

// ELEMENTOS

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const periodSelect = document.getElementById("task-period");
const prioritySelect = document.getElementById("task-priority");
const filterButtons = document.querySelectorAll(".filter");
const clearButton = document.getElementById("clear-done");

const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");

const lists = {};
const counts = {};

PERIODS.forEach((period) => {
    lists[period] = document.getElementById(`list-${period}`);
    counts[period] = document.getElementById(`count-${period}`);
});

// ESTADO

let tasks = loadTasks();
let currentFilter = "all";

// ARMAZENAMENTO

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
        // se o navegador bloquear o armazenamento, o app segue funcionando
    }
}

// DATA DE HOJE

function showToday() {
    const now = new Date();

    const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
    const date = now.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

    document.getElementById("weekday").textContent =
        weekday.charAt(0).toUpperCase() + weekday.slice(1);
    document.getElementById("date").textContent = date;

    // já deixa o período atual selecionado no formulário
    const hour = now.getHours();
    periodSelect.value = hour < 12 ? "manha" : hour < 18 ? "tarde" : "noite";
}

// AÇÕES

function addTask(text) {
    tasks.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text,
        period: periodSelect.value,
        priority: prioritySelect.value,
        done: false,
        createdAt: Date.now(),
    });

    saveTasks();
}

function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    task.done = !task.done;
    saveTasks();
    render();

    // mantém o foco no checkbox para quem usa o teclado
    const checkbox = document.querySelector(`input[data-id="${id}"]`);
    if (checkbox) checkbox.focus();
}

function deleteTask(id) {
    tasks = tasks.filter((item) => item.id !== id);
    saveTasks();
    render();
}

function clearDone() {
    const total = tasks.filter((item) => item.done).length;
    if (total === 0) return;

    const message = total === 1
        ? "Remover a tarefa concluída?"
        : `Remover as ${total} tarefas concluídas?`;

    if (!window.confirm(message)) return;

    tasks = tasks.filter((item) => !item.done);
    saveTasks();
    render();
}

function setFilter(filter) {
    currentFilter = filter;

    filterButtons.forEach((button) => {
        const active = button.dataset.filter === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    render();
}

// RENDERIZAÇÃO

function matchesFilter(task) {
    if (currentFilter === "pending") return !task.done;
    if (currentFilter === "done") return task.done;
    return true;
}

// pendentes primeiro, depois por prioridade e por ordem de criação
function compareTasks(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return a.createdAt - b.createdAt;
}

function createTaskItem(task) {
    const item = document.createElement("li");
    item.className = `task priority-${task.priority}`;
    if (task.done) item.classList.add("is-done");

    const label = document.createElement("label");
    label.className = "task-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.dataset.id = task.id;
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    label.append(checkbox, text);

    const priority = document.createElement("span");
    priority.className = "task-priority";
    priority.textContent = PRIORITY_LABELS[task.priority];

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "task-delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Excluir tarefa: ${task.text}`);
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(label, priority, remove);
    return item;
}

function createEmptyMessage(period, hasTasks) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = hasTasks
        ? "Nenhuma tarefa neste filtro."
        : `Nada planejado para ${PERIOD_NAMES[period]}.`;
    return empty;
}

function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter((item) => item.done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    if (total === 0) {
        progressText.textContent = "Nenhuma tarefa ainda";
    } else {
        const noun = total === 1 ? "tarefa concluída" : "tarefas concluídas";
        const prefix = done === total ? "Tudo feito! " : "";
        progressText.textContent = `${prefix}${done} de ${total} ${noun}`;
    }

    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(percent));
}

function render() {
    PERIODS.forEach((period) => {
        const inPeriod = tasks.filter((item) => item.period === period);
        const visible = inPeriod.filter(matchesFilter).sort(compareTasks);

        lists[period].replaceChildren();

        if (visible.length === 0) {
            lists[period].append(createEmptyMessage(period, inPeriod.length > 0));
        } else {
            visible.forEach((task) => lists[period].append(createTaskItem(task)));
        }

        counts[period].textContent = inPeriod.filter((item) => !item.done).length;
    });

    updateProgress();
    clearButton.disabled = !tasks.some((item) => item.done);
}

// EVENTOS

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    addTask(text);

    input.value = "";
    input.focus();

    // garante que a nova tarefa apareça, mesmo com filtro ativo
    setFilter("all");
});

filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
});

clearButton.addEventListener("click", clearDone);

// INÍCIO

showToday();
render();