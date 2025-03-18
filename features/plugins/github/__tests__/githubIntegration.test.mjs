// app/features/github/__tests__/githubIntegration.test.mjs  // Use MJS extension due to ESM setup
import { describe } from "@jest/globals";
import * as octoMock from "@octokit/rest"; // Keep same import style as original
import * as fspMock from "fs/promises";
import * as pathMock from "path";

// Import actual functions under test - assuming githubIntegration.mjs exports these directly now
// Ensure filenames match your directory structure shown earlier (.mjs extensions)
import {
  saveFileToGitHub,
  saveResearchToGitHub,
  verifyGitHubConfig,
} from "../github/service"; // Adjusted path based on currentfiletree.txt showing service.js inside features/github/

describe("Git Integration Tests", () => {
  const DEFAULT_REPO_OWNER = "test-owner";
  const DEFAULT_REPO_NAME = "test-repo";

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...process.env,
      GITHUB_TOKEN: "mock-token",
      GITHUB_OWNER: DEFAULT_REPO_OWNER,
      GITHUB_REPO: DEFAULT_REPO_NAME,
      GITHUB_BRANCH: "main",
      BASE_GIT_PATH: "research/",
    };

    // Mocks now parameter-aware instead of fixed responses
    octoMock.Octokit.mockImplementation(() => ({
      repos: {
        createOrUpdateFileContents: async ({ path, content, options }) => {
          return {
            data: {
              content: {
                html_url: `https://github.com/${DEFAULT_REPO_OWNER}/${DEFAULT_REPO_NAME}/blob/main/${path}`,
              },
            },
          };
        },
        getContent: async ({ path }) => {
          const knownPaths = ["existing-file.md"];
          return knownPaths.includes(path)
            ? { data: { sha: "abc123" } }
            : Promise.reject(new Error("Not Found"));
        },
      },
    }));

    fspMock.writeFile.mockResolvedValue();
    fspMock.mkdir.mockResolvedValue();
  });

  describe("saveResearchToGitHub()", () => {
    const validResearchData = {
      query: "Test Query",
      summary: "Valid summary",
      depth: 2,
      breadthFactor: 0.707,
      timestamp: new Date(),
    };

    it("Should successfully persist both local+remote copies", async () => {
      await expect(saveResearchToGitHub(validResearchData)).resolves.toEqual(
        expect.objectContaining({
          success: true,
          localPath: /research\/\d{4}-\d{2}-\d{2}.md/,
          remoteURL: /https:\/\/.*\.md$/,
        }),
      );

      expect(fspMock.mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/research\/\d+/),
        { recursive: true },
      );

      expect(fspMock.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(validResearchData, null, ""),
        {},
      );
    });

    it("Fails gracefully when writing fails", async () => {
      fspMock.writeFile.mockRejectedValueOnce(new Error("Disk full"));

      await expect(saveResearchToGitHub(validResearchData)).rejects.toThrow(
        "Failed saving locally",
      );
    });
  });

  describe("verifyGithubConfiguration()", () => {
    [
      ["Missing Token", { GITHUB_TOKEN: undefined }, false],
      ["Incomplete Config", { GITHUB_BRANCH: "", GITHUB_PATH: "" }, false],
      ["Valid Setup", { ...process.env, GIT_COMMIT_HASH: "abc" }, true],
    ].forEach(([caseName, testEnv, isValid]) => {
      it(`Handles ${caseName} scenario`, async () => {
        Object.entries(testEnv).forEach(([k, v]) => (process.env[k] = v));

        await expect(verifyGithubConfiguration()).resolves.toBe(isValid);
      });
    });
  });
});
