const PUBLIC_TOOLS = [
  'get_documentation',
  'search_courses',
  'get_course',
  'list_official_paths',
  'get_official_path',
  'generate_learning_path',
] as const

const USER_TOOLS = [
  'get_my_profile',
  'list_my_paths',
  'get_my_path',
  'save_learning_path',
  'update_course_progress',
] as const

export function mcpDocumentation() {
  const markdown = [
    '# Cómo conectar CodeQuest',
    '',
    'Leé esta guía con get_documentation. No inventes cursos ni rutas que no salgan de las tools.',
    '',
    '## Servidores',
    '- codequest-catalogo: catálogo público en /mcp. No pide sesión. Busca cursos y arma rutas, pero no las muestra en la web.',
    '- codequest-cuenta: cuenta del usuario en /mcp/user. La primera vez abre Discord. Solo este servidor actualiza el modal En vivo.',
    '',
    '## Ruta en vivo',
    'Cuando generate_learning_path termina en codequest-cuenta, la ruta se abre en un modal sobre la página actual de CodeQuest. El indicador tiene que decir En vivo. Si dice Sin sesión, el navegador no tiene la cookie.',
    'Si hay dos rutas parecidas, la tool pide elegir y las opciones quedan en la página. La persona responde en el chat; esas opciones no se clickean.',
    'Para guardarla: usar save_learning_path.',
    '',
    '## Tools públicas',
    ...PUBLIC_TOOLS.map((name) => `- ${name}`),
    '',
    '## Tools de la cuenta',
    'Además de las públicas, con la sesión:',
    ...USER_TOOLS.map((name) => `- ${name}`),
    '',
    'generate_learning_path arma la ruta. search_courses solo busca candidatos y no ordena la ruta. get_course trae el temario de un id que ya esté en el catálogo.',
  ].join('\n')

  return {
    title: 'Cómo conectar CodeQuest a tu editor',
    markdown,
    public_tools: [...PUBLIC_TOOLS],
    user_tools: [...USER_TOOLS],
  }
}
