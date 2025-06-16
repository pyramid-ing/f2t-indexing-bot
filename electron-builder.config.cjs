/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: 'com.f2t.indexing',
  productName: 'Test F2T Indexing Bot',
  directories: {
    output: 'dist/electron',
  },
  npmRebuild: false,
  publish: [
  ],
  asar: true,
  asarUnpack: [
    'node_modules/@prisma/engines/**/*',
  ],
  files: [
    'dist/main/**/*',
    'dist/preload/**/*',
    'dist/render/**/*',
  ],
  extraResources: [
    {
      from: 'node_modules/@prisma',
      to: 'node_modules/@prisma',
      filter: ['**/*'],
    },
    {
      from: 'node_modules/.prisma',
      to: 'node_modules/.prisma',
      filter: ['**/*'],
    },
    {
      from: 'node_modules/prisma',
      to: 'node_modules/prisma',
      filter: ['**/*'],
    },
    {
      from: 'resources',
      to: 'resources',
      filter: ['**/*'],
    },
  ],
  mac: {
    target: [
      'dmg',
    ],
    category: 'public.app-category.utilities',
    identity: null,
    hardenedRuntime: false,
    gatekeeperAssess: false,
  },
  win: {
    target: [
      'nsis',
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
}

module.exports = config
