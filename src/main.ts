import { createAlpineBuildTasks } from "./alpine.config.ts";
import { createDebianBuildTasks } from "./debian.config.ts";
import { setOutput } from "@actions/core";
import { getGithubRepoTags } from "./github.ts";
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

const tags: string[] = ["master"];
tags.push(
  ...(await getGithubRepoTags("merbanan/rtl_433"))
    .map((tag) => tag.name)
    .filter((tag) => /^[0-9\.]*$/i.test(tag))
);

const alpineTasks = createAlpineBuildTasks(tags);
const debianTasks = createDebianBuildTasks(tags);

const tasks = [...alpineTasks, ...debianTasks].sort(
  (a, b) => a.name.localeCompare(b.name) * -1
);

interface TaskGroup {
  [key: string]: {
    tasks: TaskGroupEntry[];
    manifests: string;
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
}

const generateRunAfterScript = (task: BuildTask) => {
  const lines: string[] = [];
  for (const repo of REPOS) {
    for (const tag of task.tags) {
      const arches = task.platforms.map(
        (platform) => `${repo}:${tag}-${tagify(platform)}`
      );
      lines.push(
        `docker buildx imagetools create -t ${repo}:${tag} ${arches.join(" ")}`
      );
    }
  }

  return lines;
};

const platformToRunner = (platform: string) => {
  //  const [os, arch, ...rest] = platform.split("/");

  return "ubuntu-24.04";
};

const groups: TaskGroup = {};
for (const task of tasks) {
  const groupKey = `${task.name}`;
  if (!groups[groupKey]) {
    const runAfter = generateRunAfterScript(task);
    groups[groupKey] = {
      tasks: [],
      manifests: runAfter.join("\n"),
    };
  }

  for (const platform of task.platforms) {
    const suffixedTags = task.tags.map((tag) => `${tag}-${tagify(platform)}`);
    groups[groupKey].tasks.push({
      name: platform,
      gitRef: task.gitRef,
      context: task.context,
      file: task.file,
      runsOn: platformToRunner(platform),
      tags: stringifyTagsWithRepos(suffixedTags, REPOS),
      buildArgs: stringifyBuildArgs(task.buildArgs),
      platforms: stringifyPlatforms([platform]),
      cacheFrom: task.cacheFrom,
      cacheTo: task.cacheTo,
    });
  }
}

const groupEntries = Object.entries(groups).map(([key, group]) => {
  return {
    name: key,
    tasks: group.tasks,
    manifests: group.manifests,
  };
});
setOutput("matrix", groupEntries);
