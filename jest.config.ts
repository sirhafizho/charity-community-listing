import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  clearMocks: true,
  coverageProvider: "v8",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/__tests__/helpers/jest.setup.ts"],
  testMatch: ["**/?(*.)+(test).[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^.+\\.(css|sass|scss)$": "<rootDir>/__tests__/helpers/styleMock.ts",
    "^.+\\.(png|jpg|jpeg|gif|webp|avif|svg)$": "<rootDir>/__tests__/helpers/fileMock.ts",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
