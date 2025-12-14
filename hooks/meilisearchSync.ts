import { MeiliSearch } from 'meilisearch'
import type { PayloadRequest } from 'payload'

// Initialize MeiliSearch client
const getMeiliClient = () => {
  if (!process.env.MEILISEARCH_HOST) {
    throw new Error('MEILISEARCH_HOST environment variable is not set')
  }
  
  return new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_KEY || '',
  })
}

// Extract plain text from Lexical content
const extractTextFromLexical = (content: unknown): string => {
  if (!content || typeof content !== 'object') return ''
  
  const extractText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return ''
    
    const n = node as Record<string, unknown>
    
    // If it's a text node, return the text
    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text
    }
    
    // If it has children, recursively extract text
    if (Array.isArray(n.children)) {
      return n.children.map(extractText).join(' ')
    }
    
    // Handle root node
    if (n.root && typeof n.root === 'object') {
      return extractText(n.root)
    }
    
    return ''
  }
  
  return extractText(content).replace(/\s+/g, ' ').trim()
}

interface ArticleDoc {
  id: string | number
  title: string
  slug: string
  excerpt?: string
  content?: unknown
  status: string
  publishedDate?: string
  featuredImage?: {
    url?: string
    alt?: string
  } | null
  author?: {
    name?: string
    slug?: string
  } | null
  categories?: Array<{
    name?: string
    slug?: string
  }> | null
  tags?: Array<{
    name?: string
    slug?: string
  }> | null
  tenant?: {
    slug?: string
    domain?: string
    meilisearchIndex?: string
  } | null
  focusKeyword?: string
  readingTime?: number
  updatedAt?: string
}

interface MeiliSearchDocument {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  status: string
  publishedDate: string | null
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  authorName: string | null
  authorSlug: string | null
  categories: string[]
  categoryIds: string[]
  tags: string[]
  tagIds: string[]
  tenantSlug: string | null
  tenantDomain: string | null
  focusKeyword: string | null
  readingTime: number | null
  updatedAt: string
}

export const syncArticleToMeilisearch = async (
  doc: ArticleDoc,
  operation: 'create' | 'update',
  req: PayloadRequest
): Promise<void> => {
  try {
    const client = getMeiliClient()
    
    // Determine index name - use tenant-specific index if available
    const tenantSlug = doc.tenant?.slug
    const customIndex = doc.tenant?.meilisearchIndex
    const indexName = customIndex || (tenantSlug ? `articles-${tenantSlug}` : 'articles')
    
    const index = client.index(indexName)
    
    // Ensure index exists with proper settings
    try {
      await client.createIndex(indexName, { primaryKey: 'id' })
    } catch {
      // Index likely already exists, continue
    }
    
    // Configure index settings for search
    await index.updateSettings({
      searchableAttributes: [
        'title',
        'excerpt',
        'content',
        'categories',
        'tags',
        'authorName',
        'focusKeyword',
      ],
      filterableAttributes: [
        'status',
        'categories',
        'tags',
        'authorSlug',
        'tenantSlug',
        'publishedDate',
      ],
      sortableAttributes: [
        'publishedDate',
        'updatedAt',
        'title',
        'readingTime',
      ],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
    })
    
    // Only index published articles
    if (doc.status !== 'published') {
      // Remove from index if unpublished
      try {
        await index.deleteDocument(String(doc.id))
        console.log(`Removed unpublished article ${doc.id} from MeiliSearch`)
      } catch {
        // Document may not exist in index, ignore
      }
      return
    }
    
    // Prepare document for indexing
    const searchDoc: MeiliSearchDocument = {
      id: String(doc.id),
      title: doc.title,
      slug: doc.slug,
      excerpt: doc.excerpt || '',
      content: extractTextFromLexical(doc.content),
      status: doc.status,
      publishedDate: doc.publishedDate || null,
      featuredImageUrl: doc.featuredImage?.url || null,
      featuredImageAlt: doc.featuredImage?.alt || null,
      authorName: doc.author?.name || null,
      authorSlug: doc.author?.slug || null,
      categories: doc.categories?.map(c => c.name).filter(Boolean) as string[] || [],
      categoryIds: doc.categories?.map(c => (c as { id?: string }).id).filter(Boolean) as string[] || [],
      tags: doc.tags?.map(t => t.name).filter(Boolean) as string[] || [],
      tagIds: doc.tags?.map(t => (t as { id?: string }).id).filter(Boolean) as string[] || [],
      tenantSlug: tenantSlug || null,
      tenantDomain: doc.tenant?.domain || null,
      focusKeyword: doc.focusKeyword || null,
      readingTime: doc.readingTime || null,
      updatedAt: doc.updatedAt || new Date().toISOString(),
    }
    
    // Add/update document in index
    await index.addDocuments([searchDoc])
    
    console.log(`Synced article ${doc.id} to MeiliSearch index: ${indexName}`)
  } catch (error) {
    console.error('MeiliSearch sync error:', error)
    throw error
  }
}

export const deleteArticleFromMeilisearch = async (
  id: string | number,
  tenantSlug?: string
): Promise<void> => {
  try {
    const client = getMeiliClient()
    const indexName = tenantSlug ? `articles-${tenantSlug}` : 'articles'
    const index = client.index(indexName)
    
    await index.deleteDocument(String(id))
    console.log(`Deleted article ${id} from MeiliSearch index: ${indexName}`)
  } catch (error) {
    console.error('MeiliSearch delete error:', error)
    // Don't throw - deletion from search index shouldn't block other operations
  }
}

// Utility to reindex all articles for a tenant
export const reindexAllArticles = async (
  payload: PayloadRequest['payload'],
  tenantId?: string
): Promise<{ indexed: number; errors: number }> => {
  const results = { indexed: 0, errors: 0 }
  
  const query: Record<string, unknown> = {
    status: { equals: 'published' },
  }
  
  if (tenantId) {
    query.tenant = { equals: tenantId }
  }
  
  const articles = await payload.find({
    collection: 'articles',
    where: query,
    limit: 1000,
    depth: 2,
  })
  
  for (const article of articles.docs) {
    try {
      await syncArticleToMeilisearch(
        article as unknown as ArticleDoc,
        'update',
        { payload } as PayloadRequest
      )
      results.indexed++
    } catch {
      results.errors++
    }
  }
  
  return results
}
