import node from '@contadim/config/eslint/node';

export default [
  { ignores: ['src/generated/**'] },
  ...node,
  {
    // Classes do Nest são injetadas por DI; parâmetros "não usados" em construtores são comuns.
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
