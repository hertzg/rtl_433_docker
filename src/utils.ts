import { BuildTask } from "./main.ts";

export const fetchGitTagNames = async (repo: string) => {
  const res = await fetch(`https://api.github.com/repos/${repo}/tags`);
  const tags: { name: string; [key: string]: unknown }[] = await res.json();
  return tags.map((tag) => tag.name);
};

export const semUp = (sem: string, dots: number) =>
  sem.split(".").slice(0, dots).join(".");

export const semMinor = (sem: string) => semUp(sem, 2);

export const semMajor = (sem: string) => semUp(sem, 1);

const RTL433_TAG_REGEX = /^(\d+)\.(\d+)$/i;
export const sortRtl433TagsDesc = (tags: string[]) => {
  return tags
    .filter((tag) => RTL433_TAG_REGEX.test(tag))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
};

export const prepareOutput = (tasks: BuildTask[], repos: string[]) => {
  return tasks.map((task) => {
    const tags = task.tags
      .flatMap((tag) => repos.map((repo) => `${repo}:${tag}`))
      .join("\n");

    const buildArgs = Object.entries(task.buildArgs)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const platforms = task.platforms.join(",");

    return {
      ...task,
      tags,
      buildArgs,
      platforms,
    };
  });
};
