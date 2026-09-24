export type GithubPreviewFixture = {
  readonly badgeLabel: string;
  readonly snippet: string;
  readonly repositoryLabel: null;
};

export const githubPreviewFixture: GithubPreviewFixture = {
  badgeLabel: "Backend con Nest",
  snippet: "[![DevTalles Route](badge-url)](profile-url)",
  repositoryLabel: null,
};
