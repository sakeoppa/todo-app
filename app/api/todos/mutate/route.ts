import { NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { todoStore } from '@/lib/store/todos';
import { runBreakdown } from '@/lib/ai/breakdown';
import { createClient } from '@/lib/supabase/server';
import type { Quadrant, RepeatType } from '@/lib/store/types';

const VALID_QUADRANTS: Quadrant[] = [
  'important-urgent',
  'important-not-urgent',
  'not-important-urgent',
  'not-important-not-urgent',
];
const VALID_REPEATS: RepeatType[] = ['none', 'daily', 'weekly', 'monthly'];

const idSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(200);

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('invalid json');
  }

  const action = body.action;
  if (!action) return bad('missing action');

  try {
    switch (action) {
      case 'add': {
        const titleParsed = titleSchema.safeParse(body.title);
        if (!titleParsed.success) return bad('invalid title');
        const quadrant = VALID_QUADRANTS.includes(body.quadrant as Quadrant)
          ? (body.quadrant as Quadrant)
          : 'important-urgent';
        const memo = typeof body.memo === 'string' && body.memo.trim() ? body.memo.trim() : undefined;
        const dueDate = typeof body.dueDate === 'string' && body.dueDate.trim() ? body.dueDate.trim() : null;
        const repeat = VALID_REPEATS.includes(body.repeat as RepeatType)
          ? (body.repeat as RepeatType)
          : 'none';
        const todo = await todoStore.add(titleParsed.data, quadrant, { memo, dueDate, repeat });
        revalidatePath('/');
        return NextResponse.json({ ok: true, id: todo.id });
      }

      case 'toggle': {
        if (!idSchema.safeParse(body.id).success) return bad('invalid id');
        await todoStore.toggle(body.id as string);
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'delete': {
        if (!idSchema.safeParse(body.id).success) return bad('invalid id');
        await todoStore.remove(body.id as string);
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'deleteCompleted': {
        await todoStore.removeCompleted();
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'toggleSub': {
        if (!idSchema.safeParse(body.todoId).success || !idSchema.safeParse(body.subTaskId).success) {
          return bad('invalid id');
        }
        await todoStore.toggleSubTask(body.todoId as string, body.subTaskId as string);
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'addSub': {
        if (!idSchema.safeParse(body.todoId).success) return bad('invalid id');
        const titleParsed = titleSchema.safeParse(body.title);
        if (!titleParsed.success) return bad('invalid title');
        await todoStore.appendSubTasks(body.todoId as string, [{ title: titleParsed.data }]);
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'removeSub': {
        if (!idSchema.safeParse(body.todoId).success || !idSchema.safeParse(body.subTaskId).success) {
          return bad('invalid id');
        }
        await todoStore.removeSubTask(body.todoId as string, body.subTaskId as string);
        revalidatePath('/');
        return NextResponse.json({ ok: true });
      }

      case 'breakdown': {
        if (!idSchema.safeParse(body.id).success) return bad('invalid id');
        const result = await runBreakdown({ todoId: body.id as string });
        if (result.ok) revalidatePath('/');
        return NextResponse.json(result);
      }

      default:
        return bad(`unknown action: ${action}`);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'server error' },
      { status: 500 },
    );
  }
}
