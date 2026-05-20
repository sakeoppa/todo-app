export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  subTasks: SubTask[];
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
