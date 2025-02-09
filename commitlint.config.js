module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'test', 'chore', 'refactor', 'perf']],
    'subject-case': [0, 'never'],
    'subject-exclamation-mark': [0, 'never'],
    'body-max-line-length': [0, 'never'],
    'footer-max-line-length': [2, 'always', 200],
    'header-max-length': [2, 'always', 200],
  },
};
