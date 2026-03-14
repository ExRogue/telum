import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { NewsArticle } from './news';
import { checkCompliance } from './compliance';
import Anthropic from '@anthropic-ai/sdk';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  type: string;
  niche: string;
  description: string;
  brand_voice: string;
  brand_tone: string;
  compliance_frameworks: string;
}

export interface GeneratedContent {
  id: string;
  company_id: string;
  article_ids: string;
  content_type: string;
  title: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
  status: string;
  created_at: string;
}

type ContentType = 'newsletter' | 'linkedin' | 'podcast' | 'briefing' | 'trade_media';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

function buildArticleContext(articles: NewsArticle[]): string {
  return articles.map((a, i) => {
    const tags = JSON.parse(a.tags || '[]');
    return `Article ${i + 1}: "${a.title}"
Source: ${a.source}
Tags: ${tags.join(', ')}
Summary: ${a.summary}`;
  }).join('\n\n');
}

function buildCompanyContext(company: Company): string {
  return `Company: ${company.name}
Type: ${company.type || 'Insurance company'}
Niche: ${company.niche || 'Specialty Insurance'}
Brand Voice: ${company.brand_voice || 'Professional and authoritative'}
Description: ${company.description || ''}`;
}

const SYSTEM_PROMPT = `You are Telum, an AI content engine for the insurance industry. You generate high-quality, compliant content for insurance companies including MGAs, brokers, and insurtechs.

Rules:
- Write in British English
- Use professional, authoritative language appropriate for the insurance industry
- Include relevant regulatory disclaimers where appropriate
- Never make guarantees about returns, coverage outcomes, or market performance
- Reference the company's brand voice and niche when generating content
- Include FCA compliance disclaimers on UK-targeted content
- Do not fabricate quotes or statistics not present in the source articles`;

const TYPE_PROMPTS: Record<ContentType, string> = {
  newsletter: `Generate a professional weekly market intelligence newsletter. Structure:
1. Title with company name and week number
2. Opening paragraph summarizing the key themes
3. For each article, create a section with:
   - Headline
   - Summary of the development
   - "Why this matters for [niche]" analysis
   - Relevant tags
4. Market outlook paragraph
5. Regulatory disclaimer

Format in Markdown. Make it substantive and insightful, not just a summary.`,

  linkedin: `Generate 2 LinkedIn posts based on the articles. For each post:
1. An attention-grabbing opening hook (no emoji spam, keep it professional)
2. Key insight from the article
3. Company-specific perspective and value proposition
4. A question to drive engagement
5. Relevant hashtags

Keep each post under 1300 characters. Separate posts with "---".`,

  podcast: `Generate a podcast episode script. Structure:
1. Episode title and metadata (format, duration 15-20 min, producer)
2. Cold open with host introduction script
3. For each article (up to 3), create a segment with:
   - Segment title and estimated duration (4-5 min)
   - Host script introducing the topic
   - Key discussion points
   - Transition to next segment
4. Wrap-up with call to action
5. Outro with regulatory disclaimer

Write it as a complete, ready-to-read script.`,

  briefing: `Generate a formal client market briefing document. Structure:
1. Title, classification, date, preparer, niche focus
2. Executive summary (1 paragraph covering all developments)
3. For each article, create a "Key Development" section with:
   - Title and source/classification
   - Summary
   - Impact assessment for the company's niche
   - Recommended action
4. Forward look paragraph
5. Confidentiality notice and regulatory disclaimer

This should be a professional, boardroom-ready document.`,

  trade_media: `Generate a trade media pitch package. Structure:
1. Press release headline (attention-grabbing, newsworthy)
2. Sub-headline with company angle
3. Press release body (3-4 paragraphs):
   - Opening: The news hook tied to the article topic
   - Company perspective: How [Company] views this development
   - Expert quote placeholder: "[SPOKESPERSON NAME, TITLE at COMPANY] said: '[Generate an insightful, quotable comment about this development that positions the company as a thought leader. Make it specific and opinionated, not generic.]'"
   - Call to action / availability for interview
4. Boilerplate: Brief company description
5. Media contact template
6. Suggested pitch email (2-3 sentences to send to journalists)

Make the spokesperson quote provocative and insightful — something a journalist would actually want to use. The angle should be slightly controversial or forward-looking, backed by industry expertise.`,
};

async function generateWithClaude(
  articles: NewsArticle[],
  company: Company,
  contentType: ContentType,
  options?: { channel?: string; department?: string; }
): Promise<{ title: string; content: string }> {
  if (!anthropic) {
    // Fall back to template-based generation if no API key
    return generateWithTemplate(articles, company, contentType);
  }

  const articleContext = buildArticleContext(articles);
  const companyContext = buildCompanyContext(company);
  const typePrompt = TYPE_PROMPTS[contentType];

  let channelInstructions = '';
  if (options?.channel === 'linkedin') {
    channelInstructions = '\n\nChannel: LinkedIn. Use a punchy, provocative tone. Lead with a bold statement or contrarian take. Keep paragraphs short (1-2 sentences). End with a question to drive engagement. Use relevant hashtags.';
  } else if (options?.channel === 'email') {
    channelInstructions = '\n\nChannel: Email Newsletter. Use a structured, value-led format. Include clear section headers. Be more detailed and analytical than social media. Include a clear CTA.';
  } else if (options?.channel === 'trade_media') {
    channelInstructions = '\n\nChannel: Trade Media/PR. Write for journalists. Lead with the newsworthy angle. Include a quotable spokesperson comment. Keep it factual but with a clear opinion angle.';
  }

  let departmentContext = '';
  if (options?.department) {
    const deptMap: Record<string, string> = {
      'c-suite': 'Target audience: C-Suite executives. Focus on strategic implications, market positioning, and business impact. Use high-level language, avoid technical details.',
      'underwriting': 'Target audience: Underwriting teams. Focus on risk assessment implications, pricing impact, and portfolio considerations. Be technical and specific.',
      'claims': 'Target audience: Claims department. Focus on claims trends, settlement implications, and operational impact.',
      'technology': 'Target audience: IT/Technology teams. Focus on technical implementation, integration considerations, and technology trends.',
      'compliance': 'Target audience: Compliance officers. Focus on regulatory implications, reporting requirements, and risk management frameworks.',
      'operations': 'Target audience: Operations teams. Focus on process impact, efficiency considerations, and practical implementation.',
      'marketing': 'Target audience: Marketing teams. Focus on messaging opportunities, brand positioning, and market differentiation.',
      'sales': 'Target audience: Sales teams. Focus on conversation starters, objection handling, and competitive positioning.',
    };
    departmentContext = `\n\n${deptMap[options.department] || ''}`;
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `${companyContext}

Source Articles:
${articleContext}

Task: ${typePrompt}${channelInstructions}${departmentContext}

Generate the ${contentType} content now. Output only the content itself, no meta-commentary.`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract title from first markdown heading or first line
  const titleMatch = text.match(/^#\s+(.+)/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${company.name} — ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`;

  return { title, content: text };
}

// Template-based fallback (original implementation)
function generateWithTemplate(articles: NewsArticle[], company: Company, contentType: ContentType): { title: string; content: string } {
  switch (contentType) {
    case 'newsletter': return generateNewsletter(articles, company);
    case 'linkedin': return generateLinkedIn(articles, company);
    case 'podcast': return generatePodcast(articles, company);
    case 'briefing': return generateBriefing(articles, company);
    case 'trade_media': return generateTradeMedia(articles, company);
  }
}

export async function generateContent(
  articles: NewsArticle[],
  company: Company,
  contentTypes: ContentType[],
  options?: { channel?: string; department?: string; }
): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];
  await getDb();
  const articleIds = JSON.stringify(articles.map(a => a.id));
  const frameworks = JSON.parse(company.compliance_frameworks || '["FCA"]');

  for (const type of contentTypes) {
    const { title, content } = await generateWithClaude(articles, company, type, options);

    // Run compliance check
    const compliance = checkCompliance(content, frameworks);
    const complianceStatus = compliance.passed ? 'passed' : 'flagged';

    const id = uuidv4();
    const complianceNotes = JSON.stringify(compliance);

    await sql`
      INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, compliance_notes, status)
      VALUES (${id}, ${company.id}, ${articleIds}, ${type}, ${title}, ${content}, ${complianceStatus}, ${complianceNotes}, 'draft')
    `;

    results.push({
      id, company_id: company.id, article_ids: articleIds, content_type: type,
      title, content, compliance_status: complianceStatus,
      compliance_notes: complianceNotes, status: 'draft',
      created_at: new Date().toISOString()
    });
  }

  return results;
}

// --- TEMPLATE FALLBACK FUNCTIONS ---

function generateNewsletter(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} Market Intelligence — Week ${weekNum}`;

  const articleSections = articles.map((a, i) => {
    const tags = JSON.parse(a.tags || '[]');
    const tagLabels = tags.map((t: string) => `#${t}`).join(' ');
    return `### ${i + 1}. ${a.title}\n\n${a.summary}\n\n**Why this matters for ${niche}:** ${generateInsight(a, company)}\n\n${tagLabels}`;
  }).join('\n\n---\n\n');

  const content = `# ${title}\n\n*Your weekly intelligence briefing from ${company.name}*\n*${today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n---\n\n## This Week's Key Developments\n\n${articleSections}\n\n---\n\n## Market Outlook\n\nThe developments covered this week signal continued evolution in the ${niche.toLowerCase()} market. We recommend that our clients and partners review their exposure to these emerging trends and consider how they may impact renewal strategies in the coming quarters.\n\n${company.name} continues to monitor these developments and will provide updates as market conditions evolve.\n\n---\n\n*This newsletter is prepared by ${company.name} for informational purposes only. It does not constitute advice or a recommendation. ${company.name} is authorised and regulated by the Financial Conduct Authority.*\n\n*To unsubscribe, reply to this email or contact us at info@${company.name.toLowerCase().replace(/\\s+/g, '')}.com*`;

  return { title, content };
}

function generateLinkedIn(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const mainArticle = articles[0];
  const niche = company.niche || 'insurance';

  const posts = articles.slice(0, 2).map((article, i) => {
    const hook = generateHook(article);
    const insight = generateInsight(article, company);
    const tags = JSON.parse(article.tags || '[]');
    const hashtags = tags.map((t: string) => `#${t}`).join(' ');
    return `## Post ${i + 1}: ${article.title}\n\n${hook}\n\n${article.summary}\n\nHere's our take: ${insight}\n\nThe ${niche.toLowerCase()} market needs to stay ahead of developments like this. At ${company.name}, we're helping our clients navigate exactly these kinds of shifts.\n\nWhat's your view? How is this impacting your book?\n\n${hashtags} #insurance #${company.type} #marketintelligence\n\n---`;
  });

  return { title: `LinkedIn Posts — ${mainArticle.title.substring(0, 50)}...`, content: posts.join('\n\n') };
}

function generatePodcast(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} Market Pulse — Episode Script`;

  const topicSegments = articles.slice(0, 3).map((a, i) => {
    const insight = generateInsight(a, company);
    return `### Segment ${i + 1}: ${a.title}\n**Duration:** 4-5 minutes\n\n**Host script:**\n\n"Our ${i === 0 ? 'first' : i === 1 ? 'second' : 'final'} story this week takes us to ${a.source}."\n\n"${a.summary}"\n\n**Key discussion points:**\n- What this means for ${niche.toLowerCase()} specifically\n- ${insight}\n- How market participants should be positioning themselves\n\n**Transition:** "${i < articles.length - 1 ? 'Moving on to our next development...' : 'And that brings us to the end of this week\'s key stories.'}"`;
  });

  const content = `# ${title}\n\n## Episode Overview\n**Format:** Weekly market intelligence podcast\n**Duration:** 15-20 minutes\n**Produced by:** ${company.name}\n**Niche focus:** ${niche}\n\n---\n\n## Cold Open\n**Duration:** 1-2 minutes\n\n**Host script:**\n\n"Welcome to ${company.name} Market Pulse, your weekly briefing on the developments shaping the ${niche.toLowerCase()} market. I'm [Host Name], and this week we've got ${articles.length} key stories."\n\n"Let's dive straight in."\n\n---\n\n${topicSegments.join('\n\n---\n\n')}\n\n---\n\n## Wrap-Up\n\n"That's your market intelligence for this week. Don't forget to subscribe so you never miss an update. Until next time, stay sharp and stay informed."\n\n*"${company.name} Market Pulse is produced for informational purposes only and does not constitute insurance advice. ${company.name} is authorised and regulated by the Financial Conduct Authority."*`;

  return { title, content };
}

function generateBriefing(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} — Client Market Briefing`;

  const developments = articles.map((a, i) => {
    const insight = generateInsight(a, company);
    const tags = JSON.parse(a.tags || '[]');
    return `### ${i + 1}. ${a.title}\n\n**Source:** ${a.source} | **Classification:** ${tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}\n\n${a.summary}\n\n**Impact Assessment for ${niche}:**\n${insight}\n\n**Recommended Action:** ${generateAction(a, company)}`;
  });

  const content = `# ${title}\n\n**Classification:** For Client Distribution\n**Date:** ${today.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}\n**Prepared by:** ${company.name} Market Intelligence\n**Niche Focus:** ${niche}\n\n---\n\n## Executive Summary\n\nThis briefing covers ${articles.length} key market developments relevant to ${niche.toLowerCase()} from the past week.\n\n---\n\n## Key Developments\n\n${developments.join('\n\n---\n\n')}\n\n---\n\n## Forward Look\n\nBased on the developments outlined above, we anticipate continued market attention on these themes through the upcoming renewal season.\n\n---\n\n*This document is prepared by ${company.name} for the exclusive use of its clients and business partners. It does not constitute insurance or financial advice.*\n\n*${company.name} is authorised and regulated by the Financial Conduct Authority.*`;

  return { title, content };
}

function generateTradeMedia(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const mainArticle = articles[0];
  const tags = JSON.parse(mainArticle.tags || '[]');
  const title = `${company.name} — Trade Media Pitch: ${mainArticle.title.substring(0, 60)}`;

  const content = `# PRESS RELEASE: ${mainArticle.title}

## ${company.name} Weighs In on Key ${niche} Market Development

**FOR IMMEDIATE RELEASE**

**${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}**

---

${mainArticle.summary}

As a leading ${company.type === 'mga' ? 'Managing General Agent' : company.type === 'broker' ? 'broker' : 'insurtech firm'} in the ${niche.toLowerCase()} space, ${company.name} sees this development as a significant indicator of where the market is heading.

"[SPOKESPERSON NAME, TITLE at ${company.name}] said: '${generateInsight(mainArticle, company)} The industry needs to move beyond reactive positioning and start building frameworks that anticipate these shifts. Those who adapt early will capture the opportunity; those who wait will find themselves playing catch-up.'"

${company.name} is available for expert commentary on this and related ${niche.toLowerCase()} developments. To arrange an interview, please contact the media team below.

---

## About ${company.name}

${company.description || `${company.name} is a ${company.type === 'mga' ? 'Managing General Agent' : company.type === 'broker' ? 'specialist broker' : 'insurtech company'} focused on the ${niche.toLowerCase()} market.`}

---

## Media Contact

**Name:** [Media Contact Name]
**Email:** press@${company.name.toLowerCase().replace(/\\s+/g, '')}.com
**Phone:** [Phone Number]

---

## Suggested Pitch Email

Subject: Expert comment available: ${mainArticle.title.substring(0, 50)}

Hi [Journalist Name],

Following the recent developments around ${tags[0] || niche.toLowerCase()}, ${company.name} has a strong perspective on what this means for the ${niche.toLowerCase()} market. Our spokesperson is available for interview and can provide expert commentary on the implications for the wider industry.

Would you be interested in a quote or a brief call?`;

  return { title, content };
}

// --- HELPERS ---

function generateHook(article: NewsArticle): string {
  const tags = JSON.parse(article.tags || '[]');
  if (tags.includes('regulation')) return 'Important regulatory update that will impact how the industry approaches risk.';
  if (tags.includes('ils') || tags.includes('reinsurance')) return 'New data just dropped that has significant implications for the specialty market.';
  if (tags.includes('cyber')) return 'Breaking development in the insurance market that every underwriter should be watching closely.';
  return 'The market is shifting. Here is what you need to know about the latest development.';
}

function generateInsight(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');
  const niche = company.niche || 'specialty insurance';
  const insights: Record<string, string> = {
    cyber: `For ${niche} specialists, this development directly impacts how cyber risk is assessed, priced, and transferred.`,
    regulation: `Regulatory shifts like this require immediate attention from ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'insurtech firms'} in the ${niche} space.`,
    lloyds: `As a ${niche} specialist in the London Market, this has direct implications for how we structure and place risk.`,
    reinsurance: `The reinsurance market dynamics described here will flow through to the ${niche} market via pricing, capacity, and treaty terms.`,
    climate: `Climate risk continues to reshape the insurance landscape for ${niche} practitioners.`,
    insurtech: `The technology evolution in insurance continues to accelerate for ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'carriers'}.`,
    ils: `The convergence of traditional and alternative risk transfer creates new opportunities for ${niche}.`,
  };
  for (const tag of tags) {
    if (insights[tag]) return insights[tag];
  }
  return `This development has implications across the ${niche} market.`;
}

function generateAction(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');
  if (tags.includes('regulation')) return 'Review compliance framework and update internal processes.';
  if (tags.includes('cyber')) return 'Assess current cyber exposure and review policy wordings.';
  if (tags.includes('climate')) return 'Review natural catastrophe exposure models and update accumulation scenarios.';
  if (tags.includes('lloyds')) return 'Monitor capacity provider communications and review placement strategy.';
  if (tags.includes('reinsurance')) return 'Evaluate reinsurance programme structure and engage with partners ahead of renewal.';
  return 'Monitor developments and assess potential impact on current portfolio.';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function getContentByCompany(companyId: string, type?: string): Promise<GeneratedContent[]> {
  await getDb();
  if (type) {
    const result = await sql`SELECT * FROM generated_content WHERE company_id = ${companyId} AND content_type = ${type} ORDER BY created_at DESC`;
    return result.rows as unknown as GeneratedContent[];
  }
  const result = await sql`SELECT * FROM generated_content WHERE company_id = ${companyId} ORDER BY created_at DESC`;
  return result.rows as unknown as GeneratedContent[];
}
