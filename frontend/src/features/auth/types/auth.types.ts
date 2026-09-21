export type SessionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
};

/** Placeholder until Discord cookie session is wired end-to-end in the UI. */
export type SessionSnapshot = {
  user: SessionUser | null;
};
