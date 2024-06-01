import { createAlpineBuildTasks } from "./alpine.config.ts";
import { createDebianBuildTasks } from "./debian.config.ts";
import { setOutput } from "./deps/actions.core.ts";
import { getGithubRepoTags } from "./github.ts";
import { prepareOutput } from "./utils.ts";

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

const setOutputTasks = (name: string, tasks: BuildTask[]) => {
  const outputs = prepareOutput(tasks, REPOS);

  return setOutput(name, outputs);
};

const tags = (await getGithubRepoTags("merbanan/rtl_433"))
  .map((tag) => tag.name)
  .filter((tag) => /^[0-9\.]*$/i.test(tag));
tags.push("master", "nightly");

setOutput("gitRefs", tags);

const alpineTasks = createAlpineBuildTasks(tags);
setOutputTasks("alpineTasks", alpineTasks);

const debianTasks = createDebianBuildTasks(tags);
setOutputTasks("debianTasks", debianTasks);
