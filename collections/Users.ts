import type { CollectionConfig, Where } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
    useAPIKey: true,
  },
  admin: {
    useAsTitle: 'name',
    description: 'CMS users with role-based access',
    group: 'Admin',
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
  },
  access: {
    // Allow first user creation, then only super-admins
    create: async ({ req }) => {
      // Allow if no users exist (first user setup)
      if (!req.user) {
        const existingUsers = await req.payload.find({
          collection: 'users',
          limit: 1,
        })
        if (existingUsers.totalDocs === 0) {
          return true
        }
      }
      return req.user?.role === 'super-admin'
    },
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      const tenantIds = req.user.tenants?.map((t: { tenant: { id: string } | string }) => 
        typeof t.tenant === 'object' ? t.tenant.id : t.tenant
      ) || []
      const query: Where = {
        or: [
          { id: { equals: req.user.id } },
          { 'tenants.tenant': { in: tenantIds } },
        ],
      }
      return query
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return { id: { equals: req.user.id } }
    },
    delete: ({ req }) => req.user?.role === 'super-admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Author', value: 'author' },
        { label: 'Viewer', value: 'viewer' },
      ],
      access: {
        // Temporarily simplified for debugging
        create: () => true,
        read: () => true,
        update: ({ req }) => {
          if (!req.user) return false
          return true
        },
        delete: ({ req }) => req.user?.role === 'super-admin',
      },
      },
      admin: {
        description: 'User permission level',
        position: 'sidebar',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Profile Picture',
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
      admin: {
        description: 'Short biography for author pages',
      },
    },
    // The tenants array field is automatically added by the multi-tenant plugin
    // but we can customize it here if needed
  ],
  timestamps: true,
}