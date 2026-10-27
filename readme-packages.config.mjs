/** @type {{ repoUrl: string, packages: Array<{ id: string, name: string, dir: string, title: string, blurb: string, homepage: string }> }} */
export default {
  repoUrl: 'https://github.com/MurzNN/js-pointing-bubble',
  packages: [
    {
      id: 'vue',
      name: 'vue-pointing-bubble',
      dir: 'packages/vue',
      title: 'vue-pointing-bubble',
      blurb:
        'Vue 3 callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.',
      homepage: 'https://murznn.github.io/js-pointing-bubble/vue/',
    },
    {
      id: 'react',
      name: 'react-pointing-bubble',
      dir: 'packages/react',
      title: 'react-pointing-bubble',
      blurb:
        'React callout / speech bubble whose SVG tail points exactly at coordinates or a DOM element.',
      homepage: 'https://murznn.github.io/js-pointing-bubble/react/',
    },
  ],
}
