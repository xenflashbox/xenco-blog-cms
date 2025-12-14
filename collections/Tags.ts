import type { CollectionConfig } from 'payload'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    description: 'Tags for article categorization and search',
    group: 'Content',
    defaultColumns: ['name', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true,
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'admin', 'editor', 'author'].includes(req.user.role || '')
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
      label: 'Tag Name',
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
        description: 'Brief description for tag pages',
      },
    },
  ],
  timestamps: true,
}
