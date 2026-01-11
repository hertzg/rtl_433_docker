export interface GithubRepoTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
  node_id: string;
}

export const getGithubRepoTags = async (
  repo: string,
): Promise<GithubRepoTag[]> => {
  const res = await fetch(`https://api.github.com/repos/${repo}/tags`);
  const tags = await res.json();
  return tags;
};

export interface GithubCommit {
  sha: string;
  url: string;
}

export const getGithubRefCommit = async (
  repo: string,
  ref: string,
): Promise<GithubCommit> => {
  const res = await fetch(`https://api.github.com/repos/${repo}/commits/${ref}`);
  const commit = await res.json();
  return { sha: commit.sha, url: commit.url };
};
