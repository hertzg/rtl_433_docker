const matrixEntryConverter = ({ context, file }, overrides = {}) => async (
  build
) => {
  return {
    name: `buildx (${build.id})`,
    runsOn: 'ubuntu-20.04',
    ...overrides,
    buildx: {
      context,
      file,
      ...overrides.buildx,
      buildArgs: Object.entries(build.buildArgs)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      paltforms: build.platforms.join(','),
      cacheFrom: `type=gha,scope=${build.flavour}`,
      cacheTo: `type=gha,scope=${build.flavour}`,
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
