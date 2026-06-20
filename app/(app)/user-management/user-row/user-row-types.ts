export type User = {
  uid: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  userType?: string;
  creationTime: string;
  permissions: string[];
};
