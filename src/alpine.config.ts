import { BuildTask } from "./main.ts";
import { semMajor, semMinor, sortRtl433TagsDesc } from "./utils.ts";

const fetchLastAlpineCycleVersions = async () => {
  const res = await fetch("https://endoflife.date/api/alpine.json");

  const cycles = (await res.json()) as Array<{
    cycle: string;
    releaseDate: string;
    eol: string;
    latest: string;
    latestReleaseDate: string;
    lts: boolean;
  }>;

  return cycles.slice(0, 2).map((cycles) => cycles.latest);
};

const ALPINE_VERSIONS = await fetchLastAlpineCycleVersions();
const ALPINE_LATEST_VERSION = ALPINE_VERSIONS[0];

const generateTags = (baseVersion: string, gitRef: string) => {
  const tags = [`${gitRef}-alpine-${baseVersion}`];

  if (baseVersion.includes(".")) {
    tags.push(
      ...[
        `${gitRef}-alpine-${semMinor(baseVersion)}`,
        `${gitRef}-alpine-${semMajor(baseVersion)}`,
      ]
    );
  }

  if (baseVersion === "latest") {
    tags.push(...[`${gitRef}-alpine`]);
  }

  return tags;
};

export const createAlpineBuildTasks = (gitRefs: string[]): BuildTask[] => {
  const [latestGitRef] = sortRtl433TagsDesc(gitRefs);

  const variants = gitRefs.flatMap((gitRef) =>
    ALPINE_VERSIONS.map((alpineVersion) => {
      const isLatestGitRef = gitRef === latestGitRef;
      const isLatestBase = alpineVersion === ALPINE_LATEST_VERSION;
      return {
        gitRef,
        alpineVersion,
        isLatestGitRef,
        isLatestBase,
      };
    })
  );

  const tasks: BuildTask[] = variants.map(
    ({ gitRef, alpineVersion, isLatestBase, isLatestGitRef }) => {
      const tags = generateTags(alpineVersion, gitRef);

      if (isLatestGitRef) {
        tags.push(...generateTags(alpineVersion, "latest"));
      }

      if (isLatestBase) {
        tags.push(...generateTags("latest", gitRef));
        tags.push(`${gitRef}`);
      }

      if (isLatestGitRef && isLatestBase) {
        tags.push(...generateTags("latest", "latest"));
        tags.push("latest");
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
        ],
        cacheFrom: `type=gha,scope=alpine-${alpineVersion}-${gitRef}`,
        cacheTo: `type=gha,scope=alpine-${alpineVersion}-${gitRef}`,
      };
    }
  );

  return tasks;
};
