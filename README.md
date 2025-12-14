# Xenco Blog CMS

Multi-tenant blog content management system built with Payload CMS 3.x, deployed on Vercel with Neon PostgreSQL and Cloudflare R2 storage.

## Features

- **Multi-Tenant Architecture** - Manage multiple blog sites from a single CMS instance
- **Rich Content Editing** - Lexical editor with headings, lists, block quotes, images, links
- **SEO Optimization** - Built-in SEO fields with integration to SEO Scorer service
- **MeiliSearch Integration** - Full-text search with automatic index sync
- **AI Image Generation** - Integration with Gemini image generation service
- **R2 Media Storage** - Cloudflare R2 for scalable, cost-effective media hosting
- **Role-Based Access** - Super Admin, Admin, Editor, Author, Viewer roles
- **API-First** - Full REST API for headless publishing workflows

## Tech Stack

- **CMS**: Payload CMS 3.15
- **Framework**: Next.js 15
- **Database**: Neon PostgreSQL (serverless)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Search**: MeiliSearch
- **Hosting**: Vercel

## Quick Start

### Prerequisites

1. **Vercel Account** - [vercel.com](https://vercel.com) (Pro recommended)
2. **Neon Account** - [neon.tech](https://neon.tech)
3. **Cloudflare Account** - [cloudflare.com](https://cloudflare.com) with R2 enabled
4. **GitHub Account** - For repository hosting

### Step 1: Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click **Create Project**
3. Name it `xenco-blog-cms`
4. Select **US East** region (or match your Vercel region)
5. Copy the **Pooled Connection String**

### Step 2: Create Cloudflare R2 Bucket

1. Log into Cloudflare Dashboard
2. Go to **R2 Object Storage** → **Create bucket**
3. Name: `payload-media`
4. After creation, go to **Settings** → **Public access** → Enable
5. Go to **R2** → **Manage R2 API Tokens** → **Create API Token**
   - Permissions: Object Read & Write
   - Specify bucket: `payload-media`
6. Copy the **Access Key ID** and **Secret Access Key**

### Step 3: Deploy to Vercel

1. Push this repository to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Configure Environment Variables:

```
PAYLOAD_SECRET=<generate-with-openssl-rand-base64-32>
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.vercel.app
DATABASE_URL=<neon-connection-string>
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=payload-media
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
MEILISEARCH_HOST=https://search.xencolabs.com
MEILISEARCH_KEY=<your-meilisearch-key>
SEO_SCORER_URL=https://seo-score.xencolabs.com
IMAGE_GEN_API_URL=https://image-gen.xencolabs.com
IMAGE_GEN_API_KEY=<your-api-key>
```

6. Click **Deploy**

### Step 4: Create Initial Admin User

After deployment, visit `/admin` to create your first user:

1. Go to `https://your-domain.vercel.app/admin`
2. You'll be prompted to create the first user
3. This user automatically becomes a **super-admin**

## Project Structure

```
├── app/
│   ├── (payload)/          # Payload admin & API routes
│   │   ├── admin/          # Admin panel
│   │   └── api/            # REST API endpoints
│   └── api/
│       └── health/         # Health check endpoint
├── collections/
│   ├── Tenants.ts          # Multi-tenant configuration
│   ├── Users.ts            # CMS users with roles
│   ├── Articles.ts         # Blog articles
│   ├── Categories.ts       # Article categories
│   ├── Authors.ts          # Article authors
│   ├── Tags.ts             # Article tags
│   └── Media.ts            # Image uploads
├── hooks/
│   ├── meilisearchSync.ts  # Search index sync
│   └── seoScoring.ts       # SEO score calculation
├── payload.config.ts       # Main Payload configuration
└── next.config.mjs         # Next.js configuration
```

## Collections

### Tenants
Each tenant represents a blog site with its own branding, SEO defaults, and content isolation.

| Field | Description |
|-------|-------------|
| name | Display name (e.g., "Resume Coach Blog") |
| slug | URL identifier (e.g., "resume-coach") |
| domain | Primary domain (e.g., "resumecoach.me") |
| logo | Site logo |
| primaryColor | Brand color |
| imageStyleHints | AI image generation style guidance |

### Articles
Rich content articles with SEO optimization.

| Field | Description |
|-------|-------------|
| title | Article headline |
| slug | URL-friendly identifier |
| excerpt | Brief summary |
| content | Lexical rich text |
| featuredImage | Hero image |
| keyTakeaways | Bullet point summary |
| focusKeyword | SEO target keyword |
| seoScore | Auto-calculated SEO score |
| status | draft/review/scheduled/published/archived |

## API Usage

### Authentication

```bash
# Using API Key
curl -H "Authorization: users API-Key YOUR_KEY" \
  https://cms.xencolabs.com/api/articles

# Using Bearer Token (after login)
curl -H "Authorization: Bearer YOUR_JWT" \
  https://cms.xencolabs.com/api/articles
```

### Create Article

```bash
curl -X POST https://cms.xencolabs.com/api/articles \
  -H "Authorization: users API-Key YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "10 Tips for Better Resumes",
    "slug": "10-tips-better-resumes",
    "excerpt": "Expert tips for creating standout resumes",
    "tenant": 1,
    "author": 1,
    "status": "published",
    "content": {
      "root": {
        "type": "root",
        "children": [
          {
            "type": "paragraph",
            "children": [{"type": "text", "text": "Your content here..."}]
          }
        ]
      }
    }
  }'
```

### Query Articles

```bash
# Get published articles for a tenant
curl "https://cms.xencolabs.com/api/articles?where[tenant][equals]=1&where[status][equals]=published"

# Get article by slug
curl "https://cms.xencolabs.com/api/articles?where[slug][equals]=10-tips-better-resumes"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYLOAD_SECRET` | Yes | 32+ char secret for JWT signing |
| `PAYLOAD_PUBLIC_SERVER_URL` | Yes | Full URL of deployment |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API secret |
| `R2_BUCKET` | Yes | R2 bucket name |
| `R2_ENDPOINT` | Yes | R2 API endpoint URL |
| `MEILISEARCH_HOST` | No | MeiliSearch URL |
| `MEILISEARCH_KEY` | No | MeiliSearch API key |
| `SEO_SCORER_URL` | No | SEO scoring service URL |
| `IMAGE_GEN_API_URL` | No | AI image generation URL |
| `IMAGE_GEN_API_KEY` | No | AI image generation API key |

## Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# ...

# Start development server
npm run dev

# Generate TypeScript types
npm run generate:types
```

## Webhooks & Integrations

### MeiliSearch Auto-Sync
Articles are automatically synced to MeiliSearch when:
- Published for the first time
- Updated while published
- Unpublished (removed from index)

### SEO Scoring
When an article has a `focusKeyword` set, the SEO scorer service is called on save to calculate and store the SEO score.

### AI Image Generation
The Media collection supports AI image generation via the Gemini service. Set `generateWithAI: true` and provide an `aiPrompt` to auto-generate images.

## License

Private - Xenco Labs
