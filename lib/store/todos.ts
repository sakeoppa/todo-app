import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readJson, updateJson } from './atomic-json';
import type { SubTask, Todo, TodosFile } from './types';

const EMPTY: TodosFile = { todos: [] };

export function createTodoStore(filePath: string) {
  return {
    async list(): Promise<Todo[]> {
      const f = await readJson<TodosFile>(filePath, EMPTY);
      return f.todos;
    },

    async get(id: string): Promise<Todo | null> {
      const f = await readJson<TodosFile>(filePath, EMPTY);
      return f.todos.find((t) => t.id === id) ?? null;
    },

    async add(title: string): Promise<Todo> {
      const now = new Date().toISOString();
      const todo: Todo = {
        id: randomUUID(),
        title,
        completed: false,
        subTasks: [],
        createdAt: now,
        updatedAt: now,
      };
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: [...cur.todos, todo],
      }));
      return todo;
    },

    async toggle(id: string): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== id) return t;
          found = { ...t, completed: !t.completed, updatedAt: bump(t.updatedAt) };
          return found;
        }),
      }));
      return found;
    },

    async toggleSubTask(todoId: string, subTaskId: string): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== todoId) return t;
          const subTasks = t.subTasks.map((s) =>
            s.id === subTaskId ? { ...s, completed: !s.completed } : s,
          );
          found = { ...t, subTasks, updatedAt: bump(t.updatedAt) };
          return found;
        }),
      }));
      return found;
    },

    async remove(id: string): Promise<void> {
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.filter((t) => t.id !== id),
      }));
    },

    async appendSubTasks(
      todoId: string,
      drafts: { title: string }[],
    ): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== todoId) return t;
          const newSubs: SubTask[] = drafts.map((d) => ({
            id: randomUUID(),
            title: d.title,
            completed: false,
          }));
          found = {
            ...t,
            subTasks: [...t.subTasks, ...newSubs],
            updatedAt: bump(t.updatedAt),
          };
          return found;
        }),
      }));
      return found;
    },
  };
}

function bump(prev: string): string {
  const now = new Date().toISOString();
  return now === prev ? new Date(Date.now() + 1).toISOString() : now;
}

export const todoStore = createTodoStore(path.join(process.cwd(), 'data', 'todos.json'));
