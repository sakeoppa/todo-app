import { NextResponse } from 'next/server';
import { todoStore } from '@/lib/store/todos';

export async function GET() {
  const todos = await todoStore.list();
  return NextResponse.json({ todos });
}
