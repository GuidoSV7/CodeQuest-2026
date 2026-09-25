export type ReplanningFixture = {
  readonly before: {
    readonly title: string;
    readonly sections: readonly string[];
  };
  readonly after: {
    readonly title: string;
    readonly sections: readonly string[];
  };
  readonly reasons: readonly string[];
  readonly proposedDate: null;
};

export const replanningFixture: ReplanningFixture = {
  before: {
    title: "Ruta actual",
    sections: [
      "Git y GitHub desde cero",
      "TypeScript",
      "Docker",
      "Node",
      "Nest",
    ],
  },
  after: {
    title: "Ajuste propuesto",
    sections: [
      "Git y GitHub desde cero",
      "TypeScript",
      "Node",
      "Nest",
      "Docker",
    ],
  },
  reasons: [
    "Moví 'Docker' al final porque tu nueva meta prioriza el despliegue web",
    "Reduje a 4h/semana según tu disponibilidad actualizada",
  ],
  proposedDate: null,
};
