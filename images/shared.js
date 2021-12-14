const matrixEntryConverter = ({ context, file }, overrides = {}) => async (
  build
) => {
  return {
    name: `buildx (${build.id})`,
    runsOn: 'ubuntu-20.04',
    ...overrides,
    checkout: {
      repository: 'merbanan/rtl_433',
      ref: build.buildArgs.rtl433GitVersion,
      path: 'rtl_433',
    },
    buildx: {
      context,
      file,
      ...overrides.buildx,
      buildArgs: Object.entries(build.buildArgs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      paltforms: build.platforms.join(','),
      cacheFrom: `type=gha,scope=${build.cacheScope}`,
      cacheTo: `type=gha,mode=max,scope=${build.cacheScope}`,
      tags: build.fullTags.join('\n'),
    },
  }
}

const promoteAppendTags = (appendTags) => async (image) => ({
  ...image,
  versions: {
    ...image.versions,
    overall: [...image.versions.overall, 'latest'],
  },
  tags: [...image.tags, ...appendTags],
})

export {
  matrixEntryConverter,
  promoteAppendTags,
}
