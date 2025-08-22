module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'], 
  transform: {
    ...require('ts-jest').createDefaultPreset().transform,
  },
};

