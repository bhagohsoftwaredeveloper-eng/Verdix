export type ListUsersOutput = Array<{
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  creationTime: string;
  permissions: string[];
}>;

export async function listAllUsers(): Promise<ListUsersOutput> {
  const response = await fetch('/api/users', {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const users = await response.json();
  return users;
}
