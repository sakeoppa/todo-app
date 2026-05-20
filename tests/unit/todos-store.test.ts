// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTodoStore } from '@/lib/store/todos';

function freshStore() {
  const dir = mkdtempSync(path.join(tmpdir(), 'todos-store-'));
  return createTodoStore(path.join(dir, 'todos.json'));
}

describe('todo store', () => {
  let store: ReturnType<typeof freshStore>;
  beforeEach(() => { store = freshStore(); });

  it('returns an empty list initially', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('adds a todo with id, timestamps, empty sub-tasks', async () => {
    const t = await store.add('Write design doc');
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.title).toBe('Write design doc');
    expect(t.completed).toBe(false);
    expect(t.subTasks).toEqual([]);
    expect(t.createdAt).toBe(t.updatedAt);
    const all = await store.list();
    expect(all).toHaveLength(1);
  });

  it('toggles a todo', async () => {
    const t = await store.add('x');
    const toggled = await store.toggle(t.id);
    expect(toggled?.completed).toBe(true);
    expect(toggled?.updatedAt).not.toBe(t.updatedAt);
  });

  it('returns null when toggling a missing todo', async () => {
    expect(await store.toggle('does-not-exist')).toBeNull();
  });

  it('deletes a todo', async () => {
    const a = await store.add('a');
    const b = await store.add('b');
    await store.remove(a.id);
    const all = await store.list();
    expect(all.map((t) => t.id)).toEqual([b.id]);
  });

  it('appends sub-tasks', async () => {
    const t = await store.add('parent');
    const updated = await store.appendSubTasks(t.id, [
      { title: 'sub a' },
      { title: 'sub b' },
    ]);
    expect(updated?.subTasks).toHaveLength(2);
    expect(updated?.subTasks[0].title).toBe('sub a');
    expect(updated?.subTasks[0].completed).toBe(false);
    expect(updated?.subTasks[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('toggles a sub-task', async () => {
    const t = await store.add('parent');
    const withSubs = await store.appendSubTasks(t.id, [{ title: 'sub' }]);
    const subId = withSubs!.subTasks[0].id;
    const after = await store.toggleSubTask(t.id, subId);
    expect(after?.subTasks[0].completed).toBe(true);
  });

  it('finds by id', async () => {
    const a = await store.add('a');
    expect((await store.get(a.id))?.title).toBe('a');
    expect(await store.get('nope')).toBeNull();
  });
});
