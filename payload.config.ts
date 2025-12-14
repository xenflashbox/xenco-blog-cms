import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import {
  lexicalEditor,
  BlockquoteFeature,
  BoldFeature,
  HeadingFeature,
  InlineCodeFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  UploadFeature,
  HorizontalRuleFeature,
  StrikethroughFeature,
  UnderlineFeature,
  HTMLConverterFeature,
} from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

// Collections
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Articles } from './collections/Articles'
import { Categories } from './collections/Categories'
import { Authors } from './collections/Authors'
import { Tags } from './collections/Tags'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Lexical editor with all blog formatting features
const richTextEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    InlineCodeFeature(),
    BlockquoteFeature(),
    OrderedListFeature(),
    UnorderedListFeature(),
    LinkFeature({
      enabledCollections: ['articles'],
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'rel',
          label: 'Rel Attribute',
          type: 'select',
          options: ['noopener', 'noreferrer', 'nofollow', 'sponsored'],
          hasMany: true,
        },
        {
          name: 'openInNewTab',
          label: 'Open in new tab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    }),
    UploadFeature({
      collections: {
        media: {
          fields: [
            {
              name: 'caption',
              type: 'text',
              label: 'Caption',
            },
          ],
        },
      },
    }),
    HorizontalRuleFeature(),
    HTMLConverterFeature({}),
  ],
})

// Define allowed origins for CORS and CSRF
const allowedOrigins = [
  'https://cms.xencolabs.com',
  'https://resumecoach.me',
  'https://blogcraft.app',
  'https://imagecrafter.app',
  'https://fightclubtech.com',
  'https://winecountrycorner.com',
  'https://promptmarketer.app',
  'https://fiberinsider.com',
]

export default buildConfig({
  // Admin panel configuration
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | Xenco Blog CMS',
    },
  },

  // Sharp for image processing
  sharp,

  // Global rich text editor
  editor: richTextEditor,

  // Collections
  collections: [
    Tenants,
    Users,
    Media,
    Articles,
    Categories,
    Authors,
    Tags,
  ],

  // Secrets & URLs
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || '',

  // TypeScript types output
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // Database - Neon PostgreSQL
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),

  // Plugins
  plugins: [
    // Multi-Tenant Plugin
    multiTenantPlugin({
      collections: {
        articles: {},
        categories: {},
        authors: {},
        tags: {},
        media: {
          useTenantAccess: false,
        },
      },
    }),

    // SEO Plugin
    seoPlugin({
      collections: ['articles'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => {
        const title = (doc as { title?: string })?.title
        return title ? `${title} | Xenco Blog` : 'Xenco Blog'
      },
      generateDescription: ({ doc }) => {
        return (doc as { excerpt?: string })?.excerpt || ''
      },
      generateURL: ({ doc }) => {
        const slug = (doc as { slug?: string })?.slug
        return slug ? `https://example.com/blog/${slug}` : ''
      },
      tabbedUI: true,
    }),

    // S3 Storage (Cloudflare R2)
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
          generateFileURL: ({ filename, prefix }) => {
            const baseUrl = process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
            return `${baseUrl}/${prefix}/${filename}`
          },
        },
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT || '',
        forcePathStyle: true,
      },
    }),
  ],

  // CORS - allow these origins to make API requests
  cors: allowedOrigins,

  // CSRF protection - origins allowed to submit forms/mutations
  csrf: allowedOrigins,

  // GraphQL disabled (using REST API)
  graphQL: {
    disable: true,
  },

  // Upload limits
  upload: {
    limits: {
      fileSize: 10000000, // 10MB
    },
  },
})