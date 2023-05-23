import { BuildTask } from "./main.ts";
import { semMajor, semMinor, sortRtl433TagsDesc } from "./utils.ts";
import { sort } from "./deps/std.semver.ts";

const fetchLastAlpineCycleVersions = async () => {
  const res = await fetch("https://endoflife.date/api/alpine.json");

  const cycles = await res.json() as (Array<{
    "cycle": string;
    "releaseDate": string;
    "eol": string;
    "latest": string;
    "latestReleaseDate": string;
    "lts": boolean;
  }>);

  return cycles.slice(0, 2).map((cycles) => cycles.latest);
};

const ALPINE_VERSIONS = await fetchLastAlpineCycleVersions();
const ALPINE_LATEST_VERSION = ALPINE_VERSIONS[0];

export const createAlpineBuildTasks = (
  gitRefs: string[],
): BuildTask[] => {
  const [latestGitRef] = sortRtl433TagsDesc(gitRefs);

  const variants = gitRefs.flatMap((gitRef) =>
    ALPINE_VERSIONS.map((alpineVersion) => {
      return {
        gitRef,
        alpineVersion,
        isLatest: gitRef === latestGitRef &&
          alpineVersion === ALPINE_LATEST_VERSION,
      };
    })
  );

  const tasks: BuildTask[] = variants.map(
    ({ gitRef, alpineVersion, isLatest }) => {
      const tags = [
        `alpine-${alpineVersion}-${gitRef}`,
        `alpine-${semMinor(alpineVersion)}-${gitRef}`,
        `alpine-${semMajor(alpineVersion)}-${gitRef}`,
        `alpine${alpineVersion}-${gitRef}`,
        `alpine${semMinor(alpineVersion)}-${gitRef}`,
        `alpine${semMajor(alpineVersion)}-${gitRef}`,
        `${gitRef}-alpine${alpineVersion}`,
        `${gitRef}-alpine${semMinor(alpineVersion)}`,
        `${gitRef}-alpine${semMajor(alpineVersion)}`,
      ];

      if (isLatest) {
        tags.push("alpine-latest-latest", "alpine-latest");
      }

      return {
        name: `alpine-${alpineVersion}-${gitRef}`,
        gitRef: gitRef,
        context: "./images/alpine/build-context",
        file: "./images/alpine/build-context/Dockerfile",
        tags,
        buildArgs: {
          rtl433GitVersion: gitRef,
          alpineVersion: alpineVersion,
        },
        platforms: [
          "linux/386",
          "linux/amd64",
          "linux/arm/v6",
          "linux/arm/v7",
          "linux/arm64/v8",
          "linux/ppc64le",
          "linux/s390x",
        ],
        cacheFrom: `type=gha,scope=alpine-${alpineVersion}-${gitRef}`,
        cacheTo: `type=gha,scope=alpine-${alpineVersion}-${gitRef}`,
      };
    },
  );

  return tasks;
};
