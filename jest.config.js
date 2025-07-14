// File: jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts'],
  moduleNameMapper: {
    '^@gameManager/(.*)$': '<rootDir>/src/gameManager/$1',
    '^@gameManager$': '<rootDir>/src/gameManager',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@services$': '<rootDir>/src/services',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@types$': '<rootDir>/src/types'
  }
};
