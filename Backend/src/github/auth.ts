import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { env } from "../config/env.js";
import { GitHubAuthError } from "../errors/GitHubError.js";

export async function createInstallationOctokit(installationId: number): Promise<Octokit> {
  if (!env.githubAppId || !env.githubPrivateKey) {
    throw new GitHubAuthError("Missing GitHub App credentials");
  }

  try {
    const auth = createAppAuth({
      appId: env.githubAppId,
      privateKey: env.githubPrivateKey,
      installationId,
    });

    const installationAuth = await auth({ type: "installation" });

    return new Octokit({
      auth: installationAuth.token,
    });
  } catch (error) {
    throw new GitHubAuthError("Failed to authenticate GitHub installation", { installationId }, error);
  }
}

export function createAppOctokit(): Octokit {
  if (!env.githubAppId || !env.githubPrivateKey) {
    throw new GitHubAuthError("Missing GitHub App credentials");
  }

  try {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.githubAppId,
        privateKey: env.githubPrivateKey,
      },
    });
  } catch (error) {
    throw new GitHubAuthError("Failed to initialize GitHub App authentication", undefined, error);
  }
}

export function createUserOctokit(accessToken: string): Octokit {
  if (!accessToken) {
    throw new GitHubAuthError("Missing GitHub OAuth token");
  }

  return new Octokit({
    auth: accessToken,
  });
}
