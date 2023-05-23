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
