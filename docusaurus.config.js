// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'HaCasa',
  tagline: 'A Modern HomeAssistant Theme',
  favicon: 'img/other/HaCasa_Logo_mark_color.svg',

  // Set the production url of your site here
  url: 'https://damianeickhoff.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/HaCasa',
  trailingSlash: false,
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'damianeickhoff', // Usually your GitHub org/user name.
  projectName: 'HaCasa', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          breadcrumbs: false,
          sidebarCollapsed: false,
          editUrl:
            "https://github.com/damianeickhoff/HaCasa/tree/main/"
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({

      // Replace with your project's social card
      image: 'img/other/hacasa_cover.jpg',
      navbar: {
        title: '',
        logo: {
          alt: 'HaCasa-Logo',
          src: 'img/other/HaCasa_Logo_Color.png',
          srcDark: 'img/other/HaCasa_Logo_White.png',
          style: {"padding-left": '15px',"height":'20px',"display":'flex',"margin-top":'5%'},
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',

          },
          {
            href: 'https://github.com/damianeickhoff/HaCasa',
            position: 'right',
            className: "header-github-link",
            "aria-label": "GitHub repository",
          },
        ],
      },
      announcementBar: {
        id: 'project_development',
        content:
          'This project and the documentation are still in development.',
        backgroundColor: '#C4AA87',
        textColor: '#fff',
        isCloseable: true,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
