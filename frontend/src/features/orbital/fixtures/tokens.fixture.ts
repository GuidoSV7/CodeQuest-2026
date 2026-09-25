export type TokenPreviewFixture = {
  readonly maskedToken: string;
  readonly label: string;
  readonly isRealCredential: false;
};

export const tokenPreviewFixture: TokenPreviewFixture = {
  maskedToken: "dvt_ [masked] ████████ 4f2a",
  label: "Token de demostración local",
  isRealCredential: false,
};
