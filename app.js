// 画面の描画と操作。データの変更は todo.js の関数で行う。
(() => {
  "use strict";

  const {
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
    clearCompleted,
    filterTodos,
    parseTodos,
  } = globalThis.TodoLogic;

  const STORAGE_KEY = "simple-todo:v1";
  const EMPTY_MESSAGES = {
    all: "タスクはありません。上の入力欄から追加してください。",
    active: "未完了のタスクはありません。",
    completed: "完了したタスクはありません。",
  };

  const form = document.getElementById("new-form");
  const newInput = document.getElementById("new-input");
  const errorBox = document.getElementById("error");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const list = document.getElementById("list");
  const emptyMessage = document.getElementById("empty");
  const count = document.getElementById("count");
  const clearButton = document.getElementById("clear");
  const template = document.getElementById("item-template");

  // id -> <li>。行を作り直さず更新することで、フォーカスやクリックが失われないようにする。
  const rows = new Map();
  let todos = load();
  let filter = "all";
  let editingId = null;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function load() {
    try {
      return parseTodos(localStorage.getItem(STORAGE_KEY));
    } catch {
      showError("保存データを読み込めませんでした。ブラウザの設定を確認してください。");
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      errorBox.hidden = true;
    } catch {
      showError("保存できませんでした。ページを閉じると変更が失われます。");
    }
  }

  function commit(next) {
    if (next !== todos) {
      todos = next;
      save();
    }
    render();
  }

  // crypto.randomUUID() は http で公開した場合に使えないため、自前で生成する。
  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function createRow(id) {
    const row = template.content.firstElementChild.cloneNode(true);
    const toggle = row.querySelector(".toggle");
    const text = row.querySelector(".text");
    const input = row.querySelector(".edit-input");
    const editButton = row.querySelector(".edit");

    toggle.addEventListener("change", () => {
      commitKeepingFocus(id, toggleTodo(todos, id));
    });
    text.addEventListener("dblclick", () => startEdit(id));
    editButton.addEventListener("click", () => startEdit(id));
    row.querySelector(".delete").addEventListener("click", () => {
      commitKeepingFocus(id, removeTodo(todos, id));
    });

    input.addEventListener("keydown", (event) => {
      // 日本語入力の変換確定・取り消しに使う Enter / Escape は無視する。
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key !== "Enter" && event.key !== "Escape") return;
      event.preventDefault();
      finishEdit(event.key === "Enter");
      editButton.focus();
    });
    input.addEventListener("blur", () => {
      if (editingId === id) finishEdit(true);
    });

    return row;
  }

  function updateRow(row, todo) {
    const editing = todo.id === editingId;
    const toggle = row.querySelector(".toggle");
    const text = row.querySelector(".text");

    row.classList.toggle("done", todo.done);
    toggle.checked = todo.done;
    toggle.setAttribute("aria-label", `「${todo.text}」を完了にする`);
    text.textContent = todo.text;
    text.hidden = editing;
    row.querySelector(".edit-input").hidden = !editing;
    row.querySelector(".edit").setAttribute("aria-label", `「${todo.text}」を編集`);
    row.querySelector(".delete").setAttribute("aria-label", `「${todo.text}」を削除`);
  }

  function render() {
    const visible = filterTodos(todos, filter);
    const visibleIds = new Set(visible.map((todo) => todo.id));

    for (const [id, row] of rows) {
      if (visibleIds.has(id)) continue;
      // 行を消すと blur が発生するので、先に編集状態を解除する。
      if (editingId === id) editingId = null;
      rows.delete(id);
      row.remove();
    }

    visible.forEach((todo, index) => {
      let row = rows.get(todo.id);
      if (!row) {
        row = createRow(todo.id);
        rows.set(todo.id, row);
      }
      updateRow(row, todo);
      if (list.children[index] !== row) {
        list.insertBefore(row, list.children[index] ?? null);
      }
    });

    for (const button of filterButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    }

    const remaining = filterTodos(todos, "active").length;
    count.textContent = `残り ${remaining} 件`;
    clearButton.disabled = remaining === todos.length;
    emptyMessage.textContent = EMPTY_MESSAGES[filter];
    emptyMessage.hidden = visible.length > 0;
  }

  // 操作した行が一覧から消える場合は、隣の行へフォーカスを移す。
  function commitKeepingFocus(id, next) {
    const row = rows.get(id);
    const neighbor = row?.nextElementSibling ?? row?.previousElementSibling;
    commit(next);
    if (row && !row.isConnected) {
      (neighbor?.querySelector(".toggle") ?? newInput).focus();
    }
  }

  function startEdit(id) {
    if (editingId === id) return;
    finishEdit(true);

    const todo = todos.find((item) => item.id === id);
    const input = rows.get(id)?.querySelector(".edit-input");
    if (!todo || !input) return;

    editingId = id;
    input.value = todo.text;
    render();
    input.focus();
    input.select();
  }

  function finishEdit(shouldSave) {
    const id = editingId;
    if (id === null) return;
    editingId = null;

    const input = rows.get(id)?.querySelector(".edit-input");
    commit(shouldSave && input ? editTodo(todos, id, input.value) : todos);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = addTodo(todos, newInput.value, createId());
    if (next === todos) return;

    newInput.value = "";
    // 「完了」表示のままだと追加したタスクが見えないため切り替える。
    if (filter === "completed") filter = "all";
    commit(next);
  });

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      render();
    });
  }

  clearButton.addEventListener("click", () => {
    commit(clearCompleted(todos));
    newInput.focus();
  });

  // 別のタブで変更された内容を反映し、古いデータで上書きしないようにする。
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    todos = load();
    if (!todos.some((todo) => todo.id === editingId)) editingId = null;
    render();
  });

  render();
})();
