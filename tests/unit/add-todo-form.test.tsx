import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/app/actions', () => ({
  addTodo: vi.fn().mockResolvedValue({}),
}));

import { AddTodoForm } from '@/app/components/AddTodoForm';

describe('AddTodoForm', () => {
  it('renders an input and submit button', () => {
    render(<AddTodoForm />);
    expect(screen.getByPlaceholderText('새 할 일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /추가/ })).toBeInTheDocument();
  });
});
