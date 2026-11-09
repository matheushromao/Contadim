import globals from 'globals';
import tseslint from 'typescript-eslint';

import base from './base.js';

/** ESLint para pacotes que rodam em Node.js (api, core, contracts). */
export default tseslint.config(...base, {
  languageOptions: {
    globals: globals.node,
  },
});
