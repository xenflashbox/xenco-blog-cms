import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    description: 'Article categories for organization',
    group: 'Content',
    defaultColumns: ['name', 'slug', 'parent', 'updatedAt'],
  },
  access: {
    read: () => true, // Public access
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'admin', 'editor'].includes(req.user.role || '')
    },
    update: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'admin', 'editor'].includes(req.user.role || '')
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'admin'].includes(req.user.role || '')
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Category Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'URL Slug',
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.name) {
              return siblingData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            }
            if (typeof value === 'string') {
              return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Brief description for category pages and SEO',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      label: 'Parent Category',
      admin: {
        description: 'For hierarchical category structure',
      },
      filterOptions: ({ id }) => {
        // Prevent circular references
        if (id) {
          return { id: { not_equals: id } }
        }
        return {}
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Category Image',
      admin: {
        description: 'Image for category listings',
      },
    },
    {
      name: 'color',
      type: 'text',
      label: 'Category Color',
      admin: {
        description: 'Hex color code for UI styling (e.g., "#3B82F6")',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Featured Category',
      defaultValue: false,
      admin: {
        description: 'Show in featured category sections',
        position: 'sidebar',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Display Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first',
      },
    },
  ],
  timestamps: true,
}
