import { BuildTask } from "./main.ts";
import { sortRtl433TagsDesc } from "./utils.ts";

const fetchLastDebianCycleCodenames = async () => {
  const res = await fetch("https://endoflife.date/api/debian.json");

  const cycles = await res.json() as (Array<{
    "cycle": string;
    "codename": string;
    "releaseDate": string;
    "eol": string;
    "extendedSupport": string;
    "link": string;
    "latest": string;
    "latestReleaseDate": string;
    "lts": boolean;
  }>);

  return cycles.slice(0, 2).map((cycles) =>
    cycles.codename.toLocaleLowerCase()
  );
};

const DEBIAN_VERSIONS = await fetchLastDebianCycleCodenames();
const DEBIAN_LATEST_VERSION = DEBIAN_VERSIONS[0];

const generateTags = (baseVersion: string, gitRef: string) => {
  const tags = [
    `${gitRef}-debian-${baseVersion}`,
  ];

  if (baseVersion === "latest") {
    tags.push(...[
      `${gitRef}-debian`,
    ]);
  }

  return tags;
};

export const createDebianBuildTasks = (
  gitRefs: string[],
): BuildTask[] => {
  const [latestGitRef] = sortRtl433TagsDesc(gitRefs);

  const variants = gitRefs.flatMap((gitRef) =>
    DEBIAN_VERSIONS.map((debianVersion) => {
      const isLatestGitRef = gitRef === latestGitRef;
      const isLatestBase = debianVersion === DEBIAN_LATEST_VERSION;
      return {
        gitRef,
        debianVersion,
        isLatestGitRef,
        isLatestBase,
      };
    })
  );

  const tasks: BuildTask[] = variants.map(
    ({ gitRef, debianVersion, isLatestGitRef, isLatestBase }) => {
      const tags = generateTags(debianVersion, gitRef);

      if (isLatestBase) {
        tags.push(...generateTags("latest", gitRef));
      }

      if (isLatestGitRef) {
        tags.push(...generateTags(debianVersion, "latest"));
      }

      if (isLatestBase && isLatestGitRef) {
        tags.push(...generateTags("latest", "latest"));
      }

      return {
        name: `debian-${debianVersion}-${gitRef}`,
        gitRef: gitRef,
        context: "./images/alpine/build-context",
        file: "./images/alpine/build-context/Dockerfile",
        tags,
        buildArgs: {
          rtl433GitVersion: gitRef,
          debianVersion: debianVersion,
        },
        platforms: [
          "linux/amd64",
          "linux/arm/v7",
          "linux/arm64/v8",
        ],
        cacheFrom: `type=gha,scope=debian-${debianVersion}-${gitRef}`,
        cacheTo: `type=gha,scope=debian-${debianVersion}-${gitRef}`,
      };
    },
  );

  return tasks;
};
