const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'jsonpath-plus': '<rootDir>/node_modules/jsonpath-plus/dist/index-node-cjs.cjs',
    'cheerio': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jsonpath-plus)/)',
  ],
}

module.exports = createJestConfig(customJestConfig)