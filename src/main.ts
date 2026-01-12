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

const REPOS = [
  "hertzg/rtl433",
  "hertzg/rtl_433",
  "ghcr.io/hertzg/rtl_433_docker",
];

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
  // Manifest amend commands for this platform
  manifestCmds: string;
}

const platformToRunner = (platform: string) => {
  const [, arch] = platform.split("/");
  if (arch === "arm64") return "ubuntu-24.04-arm";
  return "ubuntu-24.04";
};

// Generate manifest amend command for a single platform
// Includes retry with verification to handle race conditions
const generateManifestCmd = (repo: string, tag: string, platformSuffix: string): string => {
  const manifest = `${repo}:${tag}`;
  const platformImg = `${manifest}-${platformSuffix}`;
  // Retry loop: create/amend manifest, verify platform is included, retry if not
  return [
    `for i in 1 2 3 4 5; do`,
    `  docker buildx imagetools create -t ${manifest} ${manifest} ${platformImg} 2>/dev/null || docker buildx imagetools create -t ${manifest} ${platformImg}`,
    `  docker buildx imagetools inspect ${manifest} --raw | grep -q ${platformSuffix} && break`,
    `  sleep $i`,
    `done`,
  ].join("; ");
};

const groups: Record<string, TaskGroupEntry[]> = {};
for (const task of tasks) {
  const groupKey = task.name;
  if (!groups[groupKey]) {
    groups[groupKey] = [];
  }

  for (const platform of task.platforms) {
    const suffixedTags = task.tags.map((tag) => `${tag}-${tagify(platform)}`);
    const platformSuffix = tagify(platform);

    // Generate manifest amend commands for this platform
    const manifestCmds = REPOS.flatMap((repo) =>
      task.tags.map((tag) => generateManifestCmd(repo, tag, platformSuffix))
    ).join("\n");

    groups[groupKey].push({
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
      manifestCmds,
    });
  }
}

const groupEntries = Object.entries(groups).map(([key, tasks]) => ({
  name: key,
  tasks,
}));
setOutput("matrix", groupEntries);
