import type { CollectionConfig } from 'payload'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
    description: 'Article authors and contributors',
    group: 'Content',
    defaultColumns: ['name', 'title', 'email', 'updatedAt'],
  },
  access: {
    read: () => true, // Public access for author pages
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
      label: 'Full Name',
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
      name: 'title',
      type: 'text',
      label: 'Job Title',
      admin: {
        description: 'e.g., "Senior Editor" or "Contributing Writer"',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Profile Photo',
      admin: {
        description: 'Square image recommended (400x400px)',
      },
    },
    {
      name: 'bio',
      type: 'richText',
      label: 'Biography',
      admin: {
        description: 'Author bio for author pages',
      },
    },
    {
      name: 'shortBio',
      type: 'textarea',
      label: 'Short Bio',
      admin: {
        description: 'One-line bio for article bylines',
      },
      maxLength: 200,
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      admin: {
        description: 'Not displayed publicly unless configured',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'twitterHandle',
          type: 'text',
          label: 'Twitter/X',
          admin: {
            description: '@username',
            width: '50%',
          },
        },
        {
          name: 'linkedinUrl',
          type: 'text',
          label: 'LinkedIn URL',
          admin: {
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'website',
      type: 'text',
      label: 'Personal Website',
    },
    {
      name: 'linkedUser',
      type: 'relationship',
      relationTo: 'users',
      label: 'Linked CMS User',
      admin: {
        description: 'Link to a CMS user account (optional)',
        position: 'sidebar',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active Author',
      defaultValue: true,
      admin: {
        description: 'Inactive authors won\'t appear in dropdowns',
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
