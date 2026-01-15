export type CreateUserInput = {
  username: string;
  password?: string;
  permissions: string[];
};

export async function createUser(input: CreateUserInput): Promise<any> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  return response.json();
}
