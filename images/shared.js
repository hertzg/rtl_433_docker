const matrixEntryConverter = ({ context, file }, overrides = {}) => async (
  build
) => {
  const buildxCachePath = `/tmp/.buildx-cache`
  const [cacheKey, restoreKeys] = build.cacheKeys
  return {
    name: `buildx (${build.id})`,
    runsOn: 'ubuntu-20.04',
    ...overrides,
    cache: {
      ...overrides.cache,
      path: buildxCachePath,
      cacheKey: cacheKey,
      restoreKeys: build.cacheKeys,
    },
    buildx: {
      context,
      file,
      ...overrides.buildx,
      buildArgs: Object.entries(build.buildArgs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      paltforms: build.platforms.join(','),
      cacheFrom: `type=local,src=${buildxCachePath}`,
      cacheTo: `type=local,dest=${buildxCachePath}`,
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

module.exports = {
  matrixEntryConverter,
  promoteAppendTags,
}
