import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import getDb from './db';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Telum/1.0 Insurance Content Platform',
  },
});

// Insurance industry RSS feeds
const INSURANCE_FEEDS = [
  { url: 'https://www.insurancejournal.com/feed/', source: 'Insurance Journal', category: 'general' },
  { url: 'https://www.reinsurancene.ws/feed/', source: 'Reinsurance News', category: 'reinsurance' },
  { url: 'https://www.artemis.bm/feed/', source: 'Artemis', category: 'ils' },
  { url: 'https://www.insurancetimes.co.uk/rss', source: 'Insurance Times', category: 'uk_market' },
  { url: 'https://www.theinsurer.com/feed/', source: 'The Insurer', category: 'specialty' },
  { url: 'https://www.commercialriskonline.com/feed/', source: 'Commercial Risk', category: 'commercial' },
];

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  category: string;
  tags: string;
  published_at: string;
  fetched_at: string;
}

export async function fetchNewsFeeds(): Promise<{ fetched: number; errors: string[] }> {
  const db = getDb();
  let totalFetched = 0;
  const errors: string[] = [];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const feed of INSURANCE_FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      const items = result.items.slice(0, 15); // Latest 15 per feed

      for (const item of items) {
        const id = uuidv4();
        const tags = extractTags(item.title || '', item.contentSnippet || '');

        insertStmt.run(
          id,
          item.title || 'Untitled',
          item.contentSnippet?.substring(0, 500) || '',
          item.content || item.contentSnippet || '',
          feed.source,
          item.link || '',
          feed.category,
          JSON.stringify(tags),
          item.isoDate || new Date().toISOString()
        );
        totalFetched++;
      }
    } catch (err) {
      errors.push(`${feed.source}: ${(err as Error).message}`);
    }
  }

  return { fetched: totalFetched, errors };
}

export function getLatestNews(limit = 20, category?: string): NewsArticle[] {
  const db = getDb();

  if (category && category !== 'all') {
    return db.prepare(
      'SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?'
    ).all(category, limit) as NewsArticle[];
  }

  return db.prepare(
    'SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?'
  ).all(limit) as NewsArticle[];
}

export function getArticlesByIds(ids: string[]): NewsArticle[] {
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(
    `SELECT * FROM news_articles WHERE id IN (${placeholders})`
  ).all(...ids) as NewsArticle[];
}

export function searchNews(query: string, limit = 20): NewsArticle[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM news_articles WHERE title LIKE ? OR summary LIKE ? ORDER BY published_at DESC LIMIT ?`
  ).all(`%${query}%`, `%${query}%`, limit) as NewsArticle[];
}

function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: string[] = [];

  const tagMap: Record<string, string[]> = {
    'cyber': ['cyber', 'ransomware', 'data breach', 'cybersecurity', 'hacking'],
    'climate': ['climate', 'hurricane', 'flood', 'wildfire', 'catastrophe', 'nat cat'],
    'regulation': ['fca', 'regulation', 'compliance', 'solvency', 'eiopa', 'sec', 'dol'],
    'lloyds': ["lloyd's", 'lloyds', 'syndicate', 'corporation of lloyds'],
    'reinsurance': ['reinsurance', 'retro', 'treaty', 'facultative', 'cedent', 'cession'],
    'insurtech': ['insurtech', 'startup', 'funding', 'series a', 'series b', 'venture'],
    'liability': ['liability', 'd&o', 'e&o', 'professional indemnity', 'pi'],
    'property': ['property', 'commercial property', 'real estate', 'building'],
    'marine': ['marine', 'cargo', 'hull', 'p&i', 'shipping'],
    'aviation': ['aviation', 'aerospace', 'airline', 'aircraft'],
    'ils': ['ils', 'cat bond', 'catastrophe bond', 'insurance-linked', 'sidecar'],
    'manda': ['acquisition', 'merger', 'takeover', 'deal'],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['general'];
}

// Seed database with sample articles for demo
export function seedDemoArticles() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as count FROM news_articles').get() as any).count;
  if (count > 0) return;

  const articles = [
    {
      title: "Lloyd's Syndicates Adopt New Cyber War Exclusion Clauses Ahead of 2026 Renewals",
      summary: "The Lloyd's Market Association has released updated model cyber war exclusion clauses that will become mandatory for all syndicates writing cyber risks from 1 April 2026. The move follows increasing nation-state cyber activity and aims to provide clarity on coverage boundaries.",
      category: 'cyber',
      tags: ['cyber', 'lloyds', 'regulation'],
      source: 'Insurance Times',
    },
    {
      title: "SEC Finalises Cyber Incident Disclosure Rules: What Insurers Need to Know",
      summary: "The Securities and Exchange Commission has adopted final rules requiring public companies to disclose material cybersecurity incidents within four business days. Insurance carriers and MGAs with public filings face new reporting obligations that could reshape cyber underwriting approaches.",
      category: 'cyber',
      tags: ['cyber', 'regulation'],
      source: 'Insurance Journal',
    },
    {
      title: "Catastrophe Bond Market Hits Record $48bn as Cyber ILS Emerges",
      summary: "The insurance-linked securities market has reached a record $48 billion in outstanding cat bonds, with the first dedicated cyber catastrophe bonds successfully placed in Q1 2026. Investors are increasingly comfortable with cyber risk transfer mechanisms.",
      category: 'ils',
      tags: ['cyber', 'ils', 'reinsurance'],
      source: 'Artemis',
    },
    {
      title: "London Market MGAs Report 15% Premium Growth in Specialty Lines",
      summary: "Managing General Agents operating in the London Market have reported robust premium growth of 15% year-over-year in specialty lines including cyber, D&O, and professional indemnity. The growth is driven by both rate increases and new capacity deployment.",
      category: 'specialty',
      tags: ['lloyds', 'manda'],
      source: 'The Insurer',
    },
    {
      title: "FCA Launches Review of Insurance Distribution Chain Following Consumer Duty Concerns",
      summary: "The Financial Conduct Authority has announced a thematic review of insurance distribution chains, focusing on how Consumer Duty obligations are being met across the delegated authority ecosystem. MGAs and brokers will need to demonstrate clear value to end customers.",
      category: 'uk_market',
      tags: ['regulation', 'lloyds'],
      source: 'Insurance Times',
    },
    {
      title: "Climate Risk Modelling: How AI is Transforming Nat Cat Underwriting",
      summary: "Leading reinsurers are deploying machine learning models alongside traditional catastrophe models from RMS and AIR to improve natural catastrophe risk assessment. Early results show 20-30% improvement in loss ratio prediction for property portfolios.",
      category: 'reinsurance',
      tags: ['climate', 'reinsurance', 'insurtech'],
      source: 'Reinsurance News',
    },
    {
      title: "Insurtech Funding Rebounds: $2.1bn Raised in Q1 2026",
      summary: "Global insurtech funding has bounced back strongly with $2.1 billion raised in Q1 2026, marking a 45% increase from Q4 2025. B2B infrastructure plays and AI-enabled distribution platforms are attracting the largest rounds.",
      category: 'general',
      tags: ['insurtech', 'manda'],
      source: 'Insurance Journal',
    },
    {
      title: "Professional Indemnity Market Hardens as Claims Surge in Construction Sector",
      summary: "The professional indemnity market is experiencing significant rate hardening with increases of 15-25% at renewal for construction-related risks. Cladding claims, defective building materials, and ESG-related design liability are driving the trend.",
      category: 'specialty',
      tags: ['liability', 'property'],
      source: 'Commercial Risk',
    },
    {
      title: "Marine Insurance: Global Trade Disruptions Create New Opportunities for Specialty Carriers",
      summary: "Ongoing geopolitical tensions and trade route disruptions continue to create opportunities in the marine insurance market. War risk premiums for certain corridors have tripled, and specialty carriers with deep marine expertise are winning new business.",
      category: 'specialty',
      tags: ['marine', 'property'],
      source: 'The Insurer',
    },
    {
      title: "Delegated Authority: Coverholder Oversight Technologies See Rapid Adoption",
      summary: "New technology platforms for managing coverholder relationships and delegated authority oversight are seeing rapid adoption across the London Market. Capacity providers are investing heavily in real-time bordereaux data and automated audit trails.",
      category: 'uk_market',
      tags: ['lloyds', 'insurtech', 'regulation'],
      source: 'Insurance Times',
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  articles.forEach((a, i) => {
    const pubDate = new Date(now.getTime() - i * 3600000 * 8); // Spread over past days
    insertStmt.run(
      uuidv4(),
      a.title,
      a.summary,
      a.summary, // Use summary as content for demo
      a.source,
      '#',
      a.category,
      JSON.stringify(a.tags),
      pubDate.toISOString()
    );
  });
}
