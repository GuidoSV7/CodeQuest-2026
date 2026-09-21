export type SessionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
};

export type SessionSnapshot = {
  user: SessionUser | null;
};
