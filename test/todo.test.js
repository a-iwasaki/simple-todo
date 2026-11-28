"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  addTodo,
  toggleTodo,
  editTodo,
  removeTodo,
  clearCompleted,
  filterTodos,
  parseTodos,
} = require("../todo.js");

const sample = () => [
  { id: "a", text: "牛乳を買う", done: false },
  { id: "b", text: "掃除する", done: true },
];

test("addTodo は前後の空白を除いて末尾に追加する", () => {
  const todos = sample();
  const next = addTodo(todos, "  本を読む　", "c");
  assert.deepEqual(next.at(-1), { id: "c", text: "本を読む", done: false });
  assert.equal(next.length, 3);
  assert.equal(todos.length, 2, "元の配列は変更しない");
});

test("addTodo は空白だけの入力を無視する", () => {
  const todos = sample();
  assert.equal(addTodo(todos, " 　 ", "c"), todos);
});

test("toggleTodo は対象の完了状態だけを反転する", () => {
  const todos = sample();
  const next = toggleTodo(todos, "a");
  assert.equal(next[0].done, true);
  assert.equal(next[1].done, true);
  assert.equal(todos[0].done, false, "元の項目は変更しない");
});

test("editTodo は内容を更新する", () => {
  assert.equal(editTodo(sample(), "a", " パンを買う ")[0].text, "パンを買う");
});

test("editTodo は空にする編集を無視する", () => {
  const todos = sample();
  assert.equal(editTodo(todos, "a", "   "), todos);
});

test("removeTodo は対象を削除する", () => {
  assert.deepEqual(removeTodo(sample(), "a").map((t) => t.id), ["b"]);
});

test("clearCompleted は完了済みを削除する", () => {
  assert.deepEqual(clearCompleted(sample()).map((t) => t.id), ["a"]);
});

test("filterTodos は状態で絞り込む", () => {
  const ids = (filter) => filterTodos(sample(), filter).map((t) => t.id);
  assert.deepEqual(ids("all"), ["a", "b"]);
  assert.deepEqual(ids("active"), ["a"]);
  assert.deepEqual(ids("completed"), ["b"]);
});

test("parseTodos は保存データを復元する", () => {
  assert.deepEqual(parseTodos(JSON.stringify(sample())), sample());
});

test("parseTodos は壊れたデータでも空配列を返す", () => {
  for (const json of [null, "", "{", "{}", "123", '"text"']) {
    assert.deepEqual(parseTodos(json), [], `入力: ${json}`);
  }
});

test("parseTodos は形式が違う項目を取り除く", () => {
  const json = JSON.stringify([null, 1, { id: "x" }, { id: 1, text: "a", done: false }, sample()[0]]);
  assert.deepEqual(parseTodos(json), [sample()[0]]);
});
