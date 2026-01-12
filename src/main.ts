import { createAlpineBuildTasks } from "./alpine.config.ts";
import { createDebianBuildTasks } from "./debian.config.ts";
import { setOutput } from "@actions/core";
import { getGithubRepoTags, getGithubRefCommit } from "./github.ts";
import {
  tagify,
  stringifyTagsWithRepos,
  stringifyBuildArgs,
  stringifyPlatforms,
  crossTagsAndRepos,
} from "./utils.ts";
import { toPlatformPath } from "@actions/core";

export interface BuildTask {
  name: string;
  gitRef: string;
  context: string;
  file: string;
  tags: string[];
  buildArgs: {
    [key: string]: string;
    rtl433GitVersion: string;
    rtl433GitSha: string;
  };
  platforms: string[];
  cacheFrom: string;
  cacheTo: string;
}

const GHCR_REPO = "ghcr.io/hertzg/rtl_433_docker";
const DOCKER_HUB_REPOS = ["hertzg/rtl433", "hertzg/rtl_433"];
const REPOS = [...DOCKER_HUB_REPOS, GHCR_REPO];

const MAX_RELEASE_VERSIONS = 3;

const tags: string[] = ["master"];
tags.push(
  ...(await getGithubRepoTags("merbanan/rtl_433"))
    .map((tag) => tag.name)
    .filter((tag) => /^[0-9\.]*$/i.test(tag))
    .slice(0, MAX_RELEASE_VERSIONS)
);

// Fetch commit SHAs for each ref to enable proper cache busting
// For tags: SHA is immutable, so cache is stable
// For branches (master): SHA changes, so cache is invalidated on new commits
const gitRefShas = new Map<string, string>();
await Promise.all(
  tags.map(async (tag) => {
    const commit = await getGithubRefCommit("merbanan/rtl_433", tag);
    gitRefShas.set(tag, commit.sha);
  })
);

const alpineTasks = createAlpineBuildTasks(tags, gitRefShas);
const debianTasks = createDebianBuildTasks(tags, gitRefShas);

const tasks = [...alpineTasks, ...debianTasks].sort(
  (a, b) => a.name.localeCompare(b.name) * -1
);

interface TaskGroupEntry {
  name: string;
  gitRef: string;
  context: string;
  file: string;
  tags: string;
  runsOn: string;
  buildArgs: string;
  platforms: string;
  cacheFrom: string;
  cacheTo: string;
}

const platformToRunner = (platform: string) => {
  const [, arch] = platform.split("/");
  if (arch === "arm64") return "ubuntu-24.04-arm";
  return "ubuntu-24.04";
};

// Generate GHCR manifest create command for a tag across all platforms
const generateGhcrManifestCmd = (tag: string, platforms: string[]): string => {
  const manifest = `${GHCR_REPO}:${tag}`;
  const platformImages = platforms.map((p) => `${manifest}-${tagify(p)}`).join(" ");
  return `docker buildx imagetools create -t ${manifest} ${platformImages}`;
};

// Generate skopeo copy command to copy from GHCR to Docker Hub
const generateSkopeoCopyCmd = (tag: string, destRepo: string): string => {
  return `skopeo copy --all docker://${GHCR_REPO}:${tag} docker://${destRepo}:${tag}`;
};

interface GroupData {
  tasks: TaskGroupEntry[];
  originalTask: BuildTask;
}

const groups: Record<string, GroupData> = {};
for (const task of tasks) {
  const groupKey = task.name;
  if (!groups[groupKey]) {
    groups[groupKey] = { tasks: [], originalTask: task };
  }

  for (const platform of task.platforms) {
    const suffixedTags = task.tags.map((tag) => `${tag}-${tagify(platform)}`);
    const platformSuffix = tagify(platform);

    groups[groupKey].tasks.push({
      name: platform,
      gitRef: task.gitRef,
      context: task.context,
      file: task.file,
      runsOn: platformToRunner(platform),
      tags: stringifyTagsWithRepos(suffixedTags, REPOS),
      buildArgs: stringifyBuildArgs(task.buildArgs),
      platforms: stringifyPlatforms([platform]),
      cacheFrom: `${task.cacheFrom}-${platformSuffix}`,
      cacheTo: `${task.cacheTo}-${platformSuffix},mode=max`,
    });
  }
}

const groupEntries = Object.entries(groups).map(([key, { tasks, originalTask }]) => {
  // Step 1: Create manifests on GHCR (no rate limits)
  const ghcrManifestCmds = originalTask.tags
    .map((tag) => generateGhcrManifestCmd(tag, originalTask.platforms))
    .join("\n");

  // Step 2: Copy from GHCR to Docker Hub repos using skopeo
  const skopeoCopyCmds = DOCKER_HUB_REPOS.flatMap((repo) =>
    originalTask.tags.map((tag) => generateSkopeoCopyCmd(tag, repo))
  ).join("\n");

  return {
    name: key,
    tasks,
    ghcrManifestCmds,
    skopeoCopyCmds,
  };
});
setOutput("matrix", groupEntries);
