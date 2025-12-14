import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    description: 'Blog sites/brands managed in this CMS',
    group: 'Admin',
    defaultColumns: ['name', 'domain', 'slug', 'updatedAt'],
  },
  access: {
    // Only super-admins can manage tenants
    create: ({ req }) => req.user?.role === 'super-admin',
    read: ({ req }) => {
      if (req.user?.role === 'super-admin') return true
      // Users can read their assigned tenants
      return {
        id: {
          in: req.user?.tenants?.map((t: { tenant: { id: string } }) => t.tenant.id) || [],
        },
      }
    },
    update: ({ req }) => req.user?.role === 'super-admin',
    delete: ({ req }) => req.user?.role === 'super-admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Site Name',
      admin: {
        description: 'The display name for this blog site (e.g., "Resume Coach Blog")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Site Slug',
      admin: {
        description: 'URL-friendly identifier (e.g., "resume-coach")',
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
      name: 'domain',
      type: 'text',
      required: true,
      label: 'Primary Domain',
      admin: {
        description: 'The primary domain for this site (e.g., "resumecoach.me")',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Branding',
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Site Logo',
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              label: 'Favicon',
            },
            {
              name: 'primaryColor',
              type: 'text',
              label: 'Primary Brand Color',
              admin: {
                description: 'Hex color code (e.g., "#3B82F6")',
              },
            },
            {
              name: 'secondaryColor',
              type: 'text',
              label: 'Secondary Brand Color',
            },
          ],
        },
        {
          label: 'SEO Defaults',
          fields: [
            {
              name: 'tagline',
              type: 'text',
              label: 'Site Tagline',
              admin: {
                description: 'Short description for SEO and social sharing',
              },
            },
            {
              name: 'defaultMetaTitle',
              type: 'text',
              label: 'Default Meta Title',
              admin: {
                description: 'Fallback title for pages without custom SEO',
              },
            },
            {
              name: 'defaultMetaDescription',
              type: 'textarea',
              label: 'Default Meta Description',
            },
            {
              name: 'socialImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Default Social Sharing Image',
              admin: {
                description: 'Used when articles don\'t have a featured image',
              },
            },
          ],
        },
        {
          label: 'Image Generation',
          fields: [
            {
              name: 'imageStyleHints',
              type: 'textarea',
              label: 'AI Image Style Hints',
              admin: {
                description: 'Style guidance for AI-generated images (e.g., "professional photography, blue tones, minimalist")',
              },
            },
            {
              name: 'imageStylePreset',
              type: 'select',
              label: 'Image Style Preset',
              options: [
                { label: 'Professional Photography', value: 'professional' },
                { label: 'Flat Illustration', value: 'flat-illustration' },
                { label: 'Modern Minimalist', value: 'minimalist' },
                { label: 'Corporate', value: 'corporate' },
                { label: 'Tech/Futuristic', value: 'tech' },
                { label: 'Warm/Lifestyle', value: 'lifestyle' },
              ],
            },
          ],
        },
        {
          label: 'Integrations',
          fields: [
            {
              name: 'gaTrackingId',
              type: 'text',
              label: 'Google Analytics ID',
              admin: {
                description: 'e.g., G-XXXXXXXXXX',
              },
            },
            {
              name: 'meilisearchIndex',
              type: 'text',
              label: 'MeiliSearch Index Name',
              admin: {
                description: 'Custom index name (defaults to tenant slug)',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active',
      defaultValue: true,
      admin: {
        description: 'Deactivate to disable this tenant without deleting it',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
