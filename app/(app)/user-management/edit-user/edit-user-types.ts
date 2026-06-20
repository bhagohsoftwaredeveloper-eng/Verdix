import { z } from 'zod';

export type User = {
  uid: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  creationTime: string;
  userType?: string;
  permissions: string[];
};

export const editUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().min(1, 'Display name is required'),
  password: z.string()
    .transform(v => v === '' ? undefined : v)
    .pipe(z.string().min(6, 'Password must be at least 6 characters long').optional()),
  userType: z.string().min(1, 'User type is required'),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: 'You have to select at least one permission.',
  }),
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
