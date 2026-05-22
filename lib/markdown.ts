import type { Todo } from './store/types';

const QUADRANT_LABELS: Record<string, string> = {
  'important-urgent':         '중요 + 긴급',
  'important-not-urgent':     '중요 + 여유',
  'not-important-urgent':     '긴급 + 덜중요',
  'not-important-not-urgent': '여유 + 덜중요',
};

const REPEAT_LABELS: Record<string, string> = {
  daily: '매일', weekly: '매주', monthly: '매월',
};

/** 파일명에 쓸 수 없는 특수문자를 언더바로 치환하고 연속 언더바를 정리 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>.,;~!@#$^&()+={}\[\]]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function todoToMarkdown(todo: Todo): string {
  const status = todo.completed ? 'completed' : 'incomplete';
  const dueDate = todo.dueDate ? todo.dueDate.slice(0, 10) : 'none';
  const createdAt = new Date(todo.createdAt).toISOString().split('T')[0];

  const subTasksMd =
    todo.subTasks && todo.subTasks.length > 0
      ? todo.subTasks.map((st) => `- [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n')
      : '하위 항목 없음';

  return `---
status: ${status}
quadrant: ${todo.quadrant}
dueDate: ${dueDate}
createdAt: ${createdAt}
---
# ${todo.title}

${todo.memo ? `> ${todo.memo}` : ''}

## 하위 항목
${subTasksMd}
`;
}

export function todosToMarkdown(todos: Todo[]): string {
  const order = [
    'important-urgent',
    'important-not-urgent',
    'not-important-urgent',
    'not-important-not-urgent',
  ] as const;

  const emojis: Record<string, string> = {
    'important-urgent': '🔴',
    'important-not-urgent': '🔵',
    'not-important-urgent': '🟡',
    'not-important-not-urgent': '⚪',
  };

  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lines: string[] = ['# 할 일 목록', '', `> 내보낸 날짜: ${date}`, ''];

  for (const q of order) {
    const items = todos.filter((t) => t.quadrant === q);
    if (!items.length) continue;

    lines.push('---', '');
    lines.push(`## ${emojis[q]} ${QUADRANT_LABELS[q]}`, '');

    for (const todo of items) {
      const status = todo.completed ? 'completed' : 'incomplete';
      const dueDate = todo.dueDate ? todo.dueDate.slice(0, 10) : 'none';
      const createdAt = new Date(todo.createdAt).toISOString().split('T')[0];

      lines.push(`### ${todo.completed ? '~~' : ''}${todo.title}${todo.completed ? '~~' : ''}`);
      lines.push(`status: ${status} · dueDate: ${dueDate} · createdAt: ${createdAt}`);
      if (todo.memo) lines.push(`> ${todo.memo}`);
      if (todo.repeat && todo.repeat !== 'none') lines.push(`🔁 ${REPEAT_LABELS[todo.repeat]}`);
      for (const s of todo.subTasks) lines.push(`- [${s.completed ? 'x' : ' '}] ${s.title}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function todoToFilename(todo: Todo): string {
  return sanitizeFilename(todo.title) + '.md';
}
