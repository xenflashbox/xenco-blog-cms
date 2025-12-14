import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 512,
        position: 'centre',
      },
      {
        name: 'feature',
        width: 1200,
        height: 630,
        position: 'centre',
      },
      {
        name: 'hero',
        width: 1920,
        height: 1080,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    crop: true,
  },
  admin: {
    useAsTitle: 'alt',
    description: 'Images and media files',
    group: 'Content',
    defaultColumns: ['filename', 'alt', 'mimeType', 'updatedAt'],
  },
  access: {
    read: () => true, // Public access to media
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
  hooks: {
    afterChange: [
      // Generate AI image if this is a placeholder
      async ({ doc, req }) => {
        if (doc.generateWithAI && !doc.url && process.env.IMAGE_GEN_API_URL) {
          try {
            const response = await fetch(`${process.env.IMAGE_GEN_API_URL}/api/v1/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.IMAGE_GEN_API_KEY || '',
              },
              body: JSON.stringify({
                prompt: doc.aiPrompt || doc.alt,
                aspect_ratio: '16:9',
              }),
            })
            
            if (response.ok) {
              const result = await response.json()
              // Update the media record with the generated image URL
              // This would need to download and re-upload, or use URL directly
              console.log('AI image generated:', result.image?.image_url)
            }
          } catch (error) {
            console.error('AI image generation failed:', error)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Alt Text',
      admin: {
        description: 'Descriptive text for accessibility and SEO (required)',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
      admin: {
        description: 'Optional caption displayed below the image',
      },
    },
    {
      name: 'credit',
      type: 'text',
      label: 'Credit/Attribution',
      admin: {
        description: 'Photo credit or source attribution',
      },
    },
    {
      name: 'generateWithAI',
      type: 'checkbox',
      label: 'Generate with AI',
      defaultValue: false,
      admin: {
        description: 'Use AI image generation service',
        condition: (_, siblingData) => !siblingData?.filename,
      },
    },
    {
      name: 'aiPrompt',
      type: 'textarea',
      label: 'AI Generation Prompt',
      admin: {
        description: 'Detailed prompt for AI image generation',
        condition: (_, siblingData) => siblingData?.generateWithAI,
      },
    },
  ],
  timestamps: true,
}
