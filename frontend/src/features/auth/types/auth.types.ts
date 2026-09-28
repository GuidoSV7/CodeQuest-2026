export type SessionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
};

export type SessionRead =
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous" }
  | { status: "unreachable" };

export type SessionStatus = SessionRead["status"] | "unknown";

export type SessionSnapshot = {
  user: SessionUser | null;
};
