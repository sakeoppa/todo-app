const SYSTEM = `You are a strict JSON data generator. Your ONLY task is to break down a given task into 3 to 5 logical, actionable subtasks.

[RULES]
1. Output ONLY a valid JSON array of objects.
2. NEVER output markdown code blocks (e.g., \`\`\`json).
3. NEVER add explanations, greetings, or any other text.
4. Each object must have exactly one key: "title" (string).
5. Language: Always output the subtasks in Korean.

[EXAMPLES]
Input: "새로운 알바생 면접 준비"
Output: [{"title": "면접 질문 리스트 작성"}, {"title": "면접 일정 및 장소 확정"}, {"title": "근로계약서 양식 준비"}]

Input: "코지사케 주말 마감"
Output: [{"title": "홀 테이블 및 바닥 물청소"}, {"title": "주방 식기세척기 및 싱크대 마감"}, {"title": "일일 매출 정산 및 POS기 마감"}, {"title": "부족한 식자재 발주 리스트 작성"}]`;

export async function listOllamaModels(url: string): Promise<string[]> {
  const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}

export async function runOllamaBreakdown(
  title: string,
  url: string,
  model: string,
): Promise<{ title: string }[]> {
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Input: "${title}"\nOutput:` },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Ollama API ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { message?: { content?: string } };
  const raw = data.message?.content;
  if (!raw) throw new Error('Empty response from Ollama');

  // Extract JSON array from response, even if model added surrounding text
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');
  const parsed = JSON.parse(match[0]) as unknown;
  const list = Array.isArray(parsed) ? parsed : (parsed as { subTasks?: unknown[] }).subTasks;
  if (!Array.isArray(list)) throw new Error('Unexpected JSON shape');

  return (list as { title?: unknown }[])
    .filter((s) => typeof s.title === 'string' && s.title.trim())
    .map((s) => ({ title: String(s.title).trim().slice(0, 200) }))
    .slice(0, 12);
}
