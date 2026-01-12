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

interface TaskGroup {
  [key: string]: {
    tasks: TaskGroupEntry[];
  };
}

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
  // For manifest creation - each job creates/updates the multi-arch manifest
  manifestTags: string;
  manifestGroup: string;
}

const platformToRunner = (platform: string) => {
  const [, arch] = platform.split("/");

  // Use native ARM64 runners for arm64 builds (no QEMU needed)
  if (arch === "arm64") {
    return "ubuntu-24.04-arm";
  }

  return "ubuntu-24.04";
};

const groups: TaskGroup = {};
for (const task of tasks) {
  const groupKey = `${task.name}`;
  if (!groups[groupKey]) {
    groups[groupKey] = {
      tasks: [],
    };
  }

  // Generate manifest tags: repo:tag for all repos and tags
  const manifestTags = REPOS.flatMap((repo) =>
    task.tags.map((tag) => `${repo}:${tag}`)
  );

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
      // Manifest info for concurrent manifest creation
      manifestTags: manifestTags.join("\n"),
      manifestGroup: groupKey,
    });
  }
}

const groupEntries = Object.entries(groups).map(([key, group]) => {
  // Extract manifest info from first task (all tasks in group share same manifest)
  const firstTask = group.tasks[0];
  // Get all platform suffixes for this group (for manifest creation)
  const platformSuffixes = group.tasks.map((t) => tagify(t.name)).join(" ");
  return {
    name: key,
    tasks: group.tasks,
    manifestGroup: firstTask?.manifestGroup ?? key,
    manifestTags: firstTask?.manifestTags ?? "",
    manifestPlatforms: platformSuffixes,
  };
});
setOutput("matrix", groupEntries);
