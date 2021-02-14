const matrixEntryConverter = () => async (build) => {
  const buildxCachePath = `/tmp/.buildx-cache`
  const [cacheKey, restoreKeys] = build.cacheKeys
  return {
    name: `buildx (${build.id})`,
    cache: {
      path: buildxCachePath,
      cacheKey: cacheKey,
      restoreKeys: restoreKeys,
    },
    buildx: {
      context: './images/debian/build-context',
      file: './images/debian/build-context/Dockerfile',
      'build-args': Object.entries(build.buildArgs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      paltforms: build.platforms.join(','),
      push: true,
      pull: true,
      'cache-from': `type=local,src=${buildxCachePath}`,
      'cache-to': `type=local,dest=${buildxCachePath}`,
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
