import type { PayloadRequest } from 'payload'

interface SEOScoreRequest {
  keyword: string
  title: string
  meta_description: string
  slug: string
  content: string
  images: Array<{ alt: string }>
  links: string[]
  domain?: string
}

interface SEOScoreResponse {
  score: number
  grade: string
  total_points: number
  max_points: number
  passed_checks: number
  total_checks: number
  checks: Array<{
    id: string
    title: string
    weight: number
    passed: boolean
    description: string
    suggestion?: string
    value?: string
    target?: string
  }>
  suggestions: string[]
}

// Extract plain text from Lexical content
const extractTextFromLexical = (content: unknown): string => {
  if (!content || typeof content !== 'object') return ''
  
  const extractText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return ''
    
    const n = node as Record<string, unknown>
    
    if (n.type === 'text' && typeof n.text === 'string') {
      return n.text
    }
    
    if (Array.isArray(n.children)) {
      return n.children.map(extractText).join(' ')
    }
    
    if (n.root && typeof n.root === 'object') {
      return extractText(n.root)
    }
    
    return ''
  }
  
  return extractText(content).replace(/\s+/g, ' ').trim()
}

// Extract images with alt text from Lexical content
const extractImagesFromLexical = (content: unknown): Array<{ alt: string }> => {
  const images: Array<{ alt: string }> = []
  
  const extractImages = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    
    const n = node as Record<string, unknown>
    
    // Check for upload/image nodes
    if (n.type === 'upload' && n.value && typeof n.value === 'object') {
      const value = n.value as Record<string, unknown>
      if (typeof value.alt === 'string') {
        images.push({ alt: value.alt })
      }
    }
    
    if (Array.isArray(n.children)) {
      n.children.forEach(extractImages)
    }
    
    if (n.root && typeof n.root === 'object') {
      extractImages(n.root)
    }
  }
  
  extractImages(content)
  return images
}

// Extract links from Lexical content
const extractLinksFromLexical = (content: unknown): string[] => {
  const links: string[] = []
  
  const extractLinks = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    
    const n = node as Record<string, unknown>
    
    if (n.type === 'link' && typeof n.url === 'string') {
      links.push(n.url)
    }
    
    if (Array.isArray(n.children)) {
      n.children.forEach(extractLinks)
    }
    
    if (n.root && typeof n.root === 'object') {
      extractLinks(n.root)
    }
  }
  
  extractLinks(content)
  return links
}

interface ArticleDoc {
  id: string | number
  title: string
  slug: string
  excerpt?: string
  content?: unknown
  meta?: {
    title?: string
    description?: string
  }
  focusKeyword?: string
  featuredImage?: {
    alt?: string
  } | null
  tenant?: {
    domain?: string
  } | null
}

export const scoreArticleSEO = async (
  doc: ArticleDoc,
  req?: PayloadRequest
): Promise<SEOScoreResponse | null> => {
  const seoServiceUrl = process.env.SEO_SCORER_URL || 'https://seo-score.xencolabs.com'
  
  if (!doc.focusKeyword) {
    console.log('No focus keyword set, skipping SEO scoring')
    return null
  }
  
  try {
    // Extract content and metadata
    const contentText = extractTextFromLexical(doc.content)
    const contentImages = extractImagesFromLexical(doc.content)
    const contentLinks = extractLinksFromLexical(doc.content)
    
    // Add featured image if it has alt text
    const images = [...contentImages]
    if (doc.featuredImage?.alt) {
      images.unshift({ alt: doc.featuredImage.alt })
    }
    
    // Prepare request
    const seoRequest: SEOScoreRequest = {
      keyword: doc.focusKeyword,
      title: doc.meta?.title || doc.title,
      meta_description: doc.meta?.description || doc.excerpt || '',
      slug: doc.slug,
      content: contentText,
      images,
      links: contentLinks,
      domain: doc.tenant?.domain,
    }
    
    // Call SEO scorer service
    const response = await fetch(`${seoServiceUrl}/seo-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(seoRequest),
    })
    
    if (!response.ok) {
      throw new Error(`SEO scorer returned ${response.status}: ${response.statusText}`)
    }
    
    const result: SEOScoreResponse = await response.json()
    
    console.log(`SEO Score for "${doc.title}": ${result.score}% (${result.grade})`)
    
    return result
  } catch (error) {
    console.error('SEO scoring failed:', error)
    return null
  }
}

// Hook to update SEO score after article save
export const updateSEOScoreHook = async ({
  doc,
  req,
  operation,
}: {
  doc: ArticleDoc
  req: PayloadRequest
  operation: 'create' | 'update'
}): Promise<ArticleDoc> => {
  // Only score on update to avoid scoring incomplete drafts
  if (operation !== 'update') return doc
  
  // Only score if focus keyword is set
  if (!doc.focusKeyword) return doc
  
  try {
    const result = await scoreArticleSEO(doc, req)
    
    if (result) {
      // Update the seoScore field
      await req.payload.update({
        collection: 'articles',
        id: doc.id,
        data: {
          seoScore: result.score,
        },
        // Prevent infinite loop by skipping hooks
        depth: 0,
      })
      
      // Return doc with updated score
      return {
        ...doc,
        seoScore: result.score,
      } as ArticleDoc
    }
  } catch (error) {
    console.error('Failed to update SEO score:', error)
  }
  
  return doc
}

// Utility to batch score all articles
export const batchScoreArticles = async (
  payload: PayloadRequest['payload'],
  tenantId?: string
): Promise<{ scored: number; errors: number; results: Array<{ id: string | number; score: number | null }> }> => {
  const results: { scored: number; errors: number; results: Array<{ id: string | number; score: number | null }> } = {
    scored: 0,
    errors: 0,
    results: [],
  }
  
  const query: Record<string, unknown> = {
    focusKeyword: { exists: true },
  }
  
  if (tenantId) {
    query.tenant = { equals: tenantId }
  }
  
  const articles = await payload.find({
    collection: 'articles',
    where: query,
    limit: 100,
    depth: 2,
  })
  
  for (const article of articles.docs) {
    try {
      const scoreResult = await scoreArticleSEO(article as unknown as ArticleDoc)
      
      if (scoreResult) {
        await payload.update({
          collection: 'articles',
          id: article.id,
          data: {
            seoScore: scoreResult.score,
          },
        })
        
        results.results.push({ id: article.id, score: scoreResult.score })
        results.scored++
      } else {
        results.results.push({ id: article.id, score: null })
      }
    } catch {
      results.errors++
      results.results.push({ id: article.id, score: null })
    }
  }
  
  return results
}
