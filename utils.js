const fetch = require("node-fetch");

const fetchSourceGitTags = () =>
  fetch("https://api.github.com/repos/merbanan/rtl_433/tags")
    .then((res) => res.json())
    .then((tags) => tags.map((tag) => tag.name))
    .then(([latest, ...tags]) => ({ latest, tags }));

module.exports = { fetchSourceGitTags };
