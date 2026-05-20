import { mcpConfigStore } from '@/lib/store/mcp-config';
import { McpServerForm } from '@/app/components/McpServerForm';
import { McpServerList } from '@/app/components/McpServerList';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const servers = await mcpConfigStore.list();
  return (
    <main className="space-y-6">
      <McpServerForm />
      <section>
        <h2 className="mb-2 text-lg font-semibold">등록된 서버</h2>
        <McpServerList servers={servers} />
      </section>
    </main>
  );
}
