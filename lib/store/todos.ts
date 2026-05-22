// 할 일 데이터 — Supabase(클라우드 DB) 백엔드
// RLS가 켜져 있어서 모든 조회는 자동으로 "로그인한 본인" 것만 반환됨
import { createClient } from '@/lib/supabase/server';
import type { Quadrant, RepeatType, SubTask, Todo } from './types';

type Row = {
  id: string;
  title: string;
  completed: boolean;
  quadrant: Quadrant;
  memo: string | null;
  due_date: string | null;
  repeat: RepeatType;
  sub_tasks: SubTask[];
  created_at: string;
  updated_at: string;
};

function rowToTodo(r: Row): Todo {
  return {
    id: r.id,
    title: r.title,
    completed: r.completed,
    quadrant: r.quadrant ?? 'important-urgent',
    subTasks: r.sub_tasks ?? [],
    memo: r.memo ?? undefined,
    dueDate: r.due_date,
    repeat: r.repeat ?? 'none',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const todoStore = {
  async list(): Promise<Todo[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as Row[]).map(rowToTodo);
  },

  async get(id: string): Promise<Todo | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTodo(data as Row) : null;
  },

  async add(
    title: string,
    quadrant: Quadrant = 'important-urgent',
    extra?: { memo?: string; dueDate?: string | null; repeat?: RepeatType },
  ): Promise<Todo> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다');

    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        title,
        quadrant,
        memo: extra?.memo ?? null,
        due_date: extra?.dueDate ?? null,
        repeat: extra?.repeat ?? 'none',
        sub_tasks: [],
      })
      .select()
      .single();
    if (error) throw error;
    return rowToTodo(data as Row);
  },

  async toggle(id: string): Promise<Todo | null> {
    const supabase = await createClient();
    const { data: cur } = await supabase
      .from('todos')
      .select('completed')
      .eq('id', id)
      .maybeSingle();
    if (!cur) return null;

    const { data, error } = await supabase
      .from('todos')
      .update({ completed: !cur.completed })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToTodo(data as Row);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
  },

  async removeCompleted(): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('todos')
      .delete()
      .eq('completed', true)
      .select('id');
    if (error) throw error;
    return data?.length ?? 0;
  },

  async toggleSubTask(todoId: string, subTaskId: string): Promise<Todo | null> {
    const supabase = await createClient();
    const { data: cur } = await supabase
      .from('todos')
      .select('sub_tasks')
      .eq('id', todoId)
      .maybeSingle();
    if (!cur) return null;

    const subTasks = (cur.sub_tasks as SubTask[]).map((s) =>
      s.id === subTaskId ? { ...s, completed: !s.completed } : s,
    );
    const { data, error } = await supabase
      .from('todos')
      .update({ sub_tasks: subTasks })
      .eq('id', todoId)
      .select()
      .single();
    if (error) throw error;
    return rowToTodo(data as Row);
  },

  async removeSubTask(todoId: string, subTaskId: string): Promise<Todo | null> {
    const supabase = await createClient();
    const { data: cur } = await supabase
      .from('todos')
      .select('sub_tasks')
      .eq('id', todoId)
      .maybeSingle();
    if (!cur) return null;

    const subTasks = (cur.sub_tasks as SubTask[]).filter((s) => s.id !== subTaskId);
    const { data, error } = await supabase
      .from('todos')
      .update({ sub_tasks: subTasks })
      .eq('id', todoId)
      .select()
      .single();
    if (error) throw error;
    return rowToTodo(data as Row);
  },

  async appendSubTasks(
    todoId: string,
    drafts: { title: string }[],
  ): Promise<Todo | null> {
    const supabase = await createClient();
    const { data: cur } = await supabase
      .from('todos')
      .select('sub_tasks')
      .eq('id', todoId)
      .maybeSingle();
    if (!cur) return null;

    const newSubs: SubTask[] = drafts.map((d) => ({
      id: crypto.randomUUID(),
      title: d.title,
      completed: false,
    }));
    const subTasks = [...(cur.sub_tasks as SubTask[]), ...newSubs];
    const { data, error } = await supabase
      .from('todos')
      .update({ sub_tasks: subTasks })
      .eq('id', todoId)
      .select()
      .single();
    if (error) throw error;
    return rowToTodo(data as Row);
  },
};
