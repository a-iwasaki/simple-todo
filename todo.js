// TODO データを扱う純粋な関数群。DOM や localStorage には触れない。
// file:// で開けるように ES Modules は使わず、ブラウザと Node の両方から読める形にしている。
(() => {
  "use strict";

  // 変更がない場合は、受け取った配列をそのまま返す。
  function addTodo(todos, text, id) {
    const trimmed = text.trim();
    if (!trimmed) return todos;
    return [...todos, { id, text: trimmed, done: false }];
  }

  function toggleTodo(todos, id) {
    return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
  }

  // 空文字にする編集は無視して、元の内容を残す。
  function editTodo(todos, id, text) {
    const trimmed = text.trim();
    if (!trimmed) return todos;
    return todos.map((todo) => (todo.id === id ? { ...todo, text: trimmed } : todo));
  }

  function removeTodo(todos, id) {
    return todos.filter((todo) => todo.id !== id);
  }

  function clearCompleted(todos) {
    return todos.filter((todo) => !todo.done);
  }

  // filter: "all" | "active" | "completed"
  function filterTodos(todos, filter) {
    if (filter === "active") return todos.filter((todo) => !todo.done);
    if (filter === "completed") return todos.filter((todo) => todo.done);
    return todos;
  }

  // 保存データを読み込む。壊れている場合や形式が違う項目は取り除く。
  function parseTodos(json) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      return [];
    }
    if (!Array.isArray(data)) return [];
    return data.filter(
      (todo) =>
        todo !== null &&
        typeof todo === "object" &&
        typeof todo.id === "string" &&
        typeof todo.text === "string" &&
        typeof todo.done === "boolean"
    );
  }

  const api = {
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
    clearCompleted,
    filterTodos,
    parseTodos,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    globalThis.TodoLogic = api;
  }
})();
