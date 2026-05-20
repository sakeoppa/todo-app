'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { todoStore } from '@/lib/store/todos';
import { mcpConfigStore } from '@/lib/store/mcp-config';
import { runBreakdown, type BreakdownResult } from '@/lib/ai/breakdown';

const titleSchema = z.string().trim().min(1, 'title required').max(200);
const idSchema = z.string().uuid();

export type AddTodoState = { error?: string };

export async function addTodo(_prev: AddTodoState, formData: FormData): Promise<AddTodoState> {
  const parsed = titleSchema.safeParse(formData.get('title'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'invalid title' };
  await todoStore.add(parsed.data);
  revalidatePath('/');
  return {};
}

export async function toggleTodo(id: string): Promise<void> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await todoStore.toggle(parsed.data);
  revalidatePath('/');
}

export async function toggleSubTask(todoId: string, subTaskId: string): Promise<void> {
  if (!idSchema.safeParse(todoId).success) return;
  if (!idSchema.safeParse(subTaskId).success) return;
  await todoStore.toggleSubTask(todoId, subTaskId);
  revalidatePath('/');
}

export async function deleteTodo(id: string): Promise<void> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await todoStore.remove(parsed.data);
  revalidatePath('/');
}

export async function breakdownTodo(id: string): Promise<BreakdownResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'not_found' };
  const result = await runBreakdown({ todoId: parsed.data, todoStore, mcpConfigStore });
  if (result.ok) revalidatePath('/');
  return result;
}

export async function hasApiKey(): Promise<boolean> {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
