export type Quadrant =
  | 'important-urgent'
  | 'important-not-urgent'
  | 'not-important-urgent'
  | 'not-important-not-urgent';

export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  quadrant: Quadrant;
  subTasks: SubTask[];
  memo?: string;
  dueDate?: string | null;
  repeat?: RepeatType;
  createdAt: string;
  updatedAt: string;
};

export type TodosFile = { todos: Todo[] };

export type McpServerConfig = {
  id: string;
  name: string;
  transport: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export type McpConfigFile = { servers: McpServerConfig[] };
