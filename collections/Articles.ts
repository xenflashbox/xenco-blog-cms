import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    description: 'Blog articles and posts',
    group: 'Content',
    defaultColumns: ['title', 'status', 'author', 'publishedDate', 'updatedAt'],
    listSearchableFields: ['title', 'excerpt', 'slug'],
    preview: (doc) => {
      const tenant = doc?.tenant as { domain?: string } | undefined
      if (tenant?.domain && doc?.slug) {
        return `https://${tenant.domain}/blog/${doc.slug}`
      }
      return null
    },
  },
  access: {
    read: ({ req }) => {
      // Public can read published articles
      if (!req.user) {
        return { status: { equals: 'published' } }
      }
      // Logged in users can read all articles in their tenants
      return true
    },
    create: ({ req }) => {
      if (!req.user) return false
      const allowedRoles = ['super-admin', 'admin', 'editor', 'author']
      return allowedRoles.includes(req.user.role || '')
    },
    update: ({ req }) => {
      if (!req.user) return false
      const allowedRoles = ['super-admin', 'admin', 'editor']
      if (allowedRoles.includes(req.user.role || '')) return true
      // Authors can only update their own articles
      if (req.user.role === 'author') {
        return { author: { equals: req.user.id } }
      }
      return false
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'admin'].includes(req.user.role || '')
    },
  },
  versions: {
    drafts: {
      autosave: {
        interval: 30000, // 30 seconds
      },
    },
    maxPerDoc: 10,
  },
  hooks: {
    beforeChange: [
      // Auto-generate slug from title if not provided
      async ({ data, operation }) => {
        if (operation === 'create' && data?.title && !data?.slug) {
          data.slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        }
        return data
      },
      // Set publishedDate when status changes to published
      async ({ data, originalDoc }) => {
        if (data?.status === 'published' && originalDoc?.status !== 'published') {
          if (!data.publishedDate) {
            data.publishedDate = new Date().toISOString()
          }
        }
        return data
      },
    ],
    afterChange: [
      // Sync to MeiliSearch after save
      async ({ doc, req, operation }) => {
        if (process.env.MEILISEARCH_HOST && doc.status === 'published') {
          try {
            const { syncArticleToMeilisearch } = await import('../hooks/meilisearchSync')
            await syncArticleToMeilisearch(doc, operation, req)
          } catch (error) {
            console.error('MeiliSearch sync failed:', error)
            // Don't throw - MeiliSearch sync failure shouldn't block article save
          }
        }
        return doc
      },
    ],
  },
  fields: [
    // Main content tab
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              label: 'Article Title',
              admin: {
                description: 'The main headline for this article',
              },
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              label: 'URL Slug',
              admin: {
                description: 'URL-friendly identifier (auto-generated from title if empty)',
              },
              hooks: {
                beforeValidate: [
                  ({ value }) => {
                    if (typeof value === 'string') {
                      return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    }
                    return value
                  },
                ],
              },
            },
            {
              name: 'excerpt',
              type: 'textarea',
              label: 'Excerpt',
              admin: {
                description: 'Brief summary for article listings and SEO (150-300 characters recommended)',
              },
              maxLength: 500,
            },
            {
              name: 'content',
              type: 'richText',
              required: true,
              label: 'Article Content',
              admin: {
                description: 'The main article body - use headings, lists, quotes, and images for professional formatting',
              },
            },
          ],
        },
        {
          label: 'Media',
          fields: [
            {
              name: 'featuredImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Featured Image',
              admin: {
                description: 'Main hero image for the article (recommended: 1200x630px)',
              },
            },
            {
              name: 'featuredImageCaption',
              type: 'text',
              label: 'Featured Image Caption',
            },
            {
              name: 'gallery',
              type: 'array',
              label: 'Image Gallery',
              admin: {
                description: 'Additional images for the article',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'caption',
                  type: 'text',
                },
              ],
            },
          ],
        },
        {
          label: 'Key Takeaways',
          fields: [
            {
              name: 'keyTakeaways',
              type: 'array',
              label: 'Key Takeaways',
              admin: {
                description: 'Bullet points summarizing main points (displayed in a highlight box)',
              },
              fields: [
                {
                  name: 'takeaway',
                  type: 'text',
                  required: true,
                },
              ],
              maxRows: 7,
            },
            {
              name: 'tldr',
              type: 'textarea',
              label: 'TL;DR Summary',
              admin: {
                description: 'One-paragraph summary for readers who want the quick version',
              },
              maxLength: 500,
            },
          ],
        },
        {
          label: 'Organization',
          fields: [
            {
              name: 'categories',
              type: 'relationship',
              relationTo: 'categories',
              hasMany: true,
              label: 'Categories',
              admin: {
                description: 'Primary topic categories',
              },
              filterOptions: ({ data }) => {
                // Filter to same tenant
                if (data?.tenant) {
                  return { tenant: { equals: data.tenant } }
                }
                return true
              },
            },
            {
              name: 'tags',
              type: 'relationship',
              relationTo: 'tags',
              hasMany: true,
              label: 'Tags',
              admin: {
                description: 'Additional topic tags for search and filtering',
              },
              filterOptions: ({ data }) => {
                if (data?.tenant) {
                  return { tenant: { equals: data.tenant } }
                }
                return {}
              },
            },
            {
              name: 'author',
              type: 'relationship',
              relationTo: 'authors',
              required: true,
              label: 'Author',
              filterOptions: ({ data }) => {
                if (data?.tenant) {
                  return { tenant: { equals: data.tenant } }
                }
                return {}
              },
            },
            {
              name: 'relatedArticles',
              type: 'relationship',
              relationTo: 'articles',
              hasMany: true,
              label: 'Related Articles',
              admin: {
                description: 'Manually selected related content',
              },
              filterOptions: ({ data, id }) => {
                const conditions: Record<string, unknown> = {}
                if (data?.tenant) {
                  conditions.tenant = { equals: data.tenant }
                }
                if (id) {
                  conditions.id = { not_equals: id }
                }
                return conditions
              },
              maxRows: 5,
            },
          ],
        },
        // SEO tab is automatically added by the SEO plugin
      ],
    },
    // Sidebar fields
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Under Review', value: 'review' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Publication status',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      label: 'Published Date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Auto-set when published, or schedule for future',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Featured Article',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Show in featured/hero sections',
      },
    },
    {
      name: 'readingTime',
      type: 'number',
      label: 'Reading Time (minutes)',
      admin: {
        position: 'sidebar',
        description: 'Auto-calculated based on content length',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            // Estimate reading time from content
            // This is a rough estimate - assumes ~200 words per minute
            const content = siblingData?.content
            if (content) {
              // Count words in Lexical content (rough estimate from JSON)
              const text = JSON.stringify(content)
              const wordCount = text.split(/\s+/).length / 3 // Divide by 3 to account for JSON structure
              return Math.max(1, Math.ceil(wordCount / 200))
            }
            return 1
          },
        ],
      },
    },
    {
      name: 'seoScore',
      type: 'number',
      label: 'SEO Score',
      admin: {
        position: 'sidebar',
        description: 'Score from SEO analysis (0-100)',
        readOnly: true,
      },
      min: 0,
      max: 100,
    },
    {
      name: 'focusKeyword',
      type: 'text',
      label: 'Focus Keyword',
      admin: {
        position: 'sidebar',
        description: 'Primary keyword for SEO optimization',
      },
    },
  ],
  timestamps: true,
}
