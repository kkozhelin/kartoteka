import { copy } from './app/content/copy'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt'],
  devtools: { enabled: false },
  css: [
    '@fontsource-variable/manrope',
    '@fontsource-variable/roboto-slab',
    '~/assets/styles/main.scss',
  ],
  typescript: { strict: true },
  app: {
    head: {
      title: copy.brand,
      link: [{ rel: 'icon', href: '/favicon.ico' }],
      htmlAttrs: { lang: 'ru' },
      meta: [{ name: 'description', content: copy.description }, { name: 'theme-color', content: '#f5f2e9' }],
    },
  },
  compatibilityDate: '2025-09-01',
})
