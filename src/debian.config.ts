import { BuildTask } from "./main.ts";
import { sortRtl433TagsDesc } from "./utils.ts";

const fetchLastDebianCycleCodenames = async () => {
  const res = await fetch('https://endoflife.date/api/debian.json');
  
  const cycles = await res.json() as (Array<{
    "cycle": string,
    "codename": string,
    "releaseDate": string,
    "eol": string,
    "extendedSupport": string,
    "link": string,
    "latest": string,
    "latestReleaseDate": string,
    "lts": boolean
  }>);

  return cycles.slice(0, 2).map(cycles => cycles.codename.toLocaleLowerCase());
}

const DEBIAN_VERSIONS = await fetchLastDebianCycleCodenames();
const DEBIAN_LATEST_VERSION = DEBIAN_VERSIONS[0];

export const createDebianBuildTasks = (
  gitRefs: string[],
): BuildTask[] => {
  const [latestGitRef] = sortRtl433TagsDesc(gitRefs);

  const variants = gitRefs.flatMap((gitRef) =>
    DEBIAN_VERSIONS.map((debianVersion) => {
      return {
        gitRef,
        debianVersion,
        isLatest: gitRef === latestGitRef &&
          debianVersion === DEBIAN_LATEST_VERSION,
      };
    })
  );

  const tasks: BuildTask[] = variants.map(
    ({ gitRef, debianVersion, isLatest }) => {
      const tags = [
        `debian-${debianVersion}-${gitRef}`,
        `debian${debianVersion}-${gitRef}`,
        `${gitRef}-debian${debianVersion}`,
      ];

      if (isLatest) {
        tags.push("debian-latest-latest", "debian-latest");
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
          // 'linux/386', // fails to install build dependencies
          "linux/amd64",
          // "linux/arm/v5", // fails to install build dependencies
          "linux/arm/v7",
          "linux/arm64/v8",
          // 'linux/mips64le',
          // 'linux/ppc64le',
          // 'linux/s390x', // fails to install runtime dependencies
        ],
        cacheFrom: `type=gha,scope=debian-${debianVersion}-${gitRef}`,
        cacheTo: `type=gha,scope=debian-${debianVersion}-${gitRef}`,
      };
    },
  );

  return tasks;
};
