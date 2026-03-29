import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kudo } from '../kudos/entities/kudo.entity';
import { utcMonthKey, utcMonthRangeTimestamptz, utcStartOfMonth } from '../kudos/utils/utc-month';

export interface KudoSearchHit {
  kudoId: string;
  score: number;
  description: string;
  senderName: string;
  coreValueName: string;
  createdAt: string;
  recipients: Array<{ userId: string; name: string; points: number }>;
}

export interface AiSummaryResult {
  summary: string;
  monthKey: string;
  kudosCount: number;
  totalPointsReceived: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Kudo)
    private readonly kudosRepo: Repository<Kudo>,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI summary will return a stub.');
    }
  }

  async generateMonthlySummary(userId: string): Promise<AiSummaryResult> {
    const now = new Date();
    const monthStart = utcStartOfMonth(now);
    const monthKey = utcMonthKey(monthStart);
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz(monthStart);

    // Fetch kudos received by this user in the current month
    const kudos = await this.kudosRepo
      .createQueryBuilder('kudo')
      .innerJoinAndSelect('kudo.recipients', 'recipient')
      .innerJoinAndSelect('kudo.sender', 'sender')
      .innerJoinAndSelect('kudo.coreValue', 'coreValue')
      .where('recipient.userId = :userId', { userId })
      .andWhere('kudo.createdAt >= :startIso', { startIso })
      .andWhere('kudo.createdAt < :endExclusiveIso', { endExclusiveIso })
      .orderBy('kudo.createdAt', 'DESC')
      .getMany();

    const kudosCount = kudos.length;
    const totalPointsReceived = kudos.reduce((sum, k) => {
      const row = k.recipients.find((r) => r.userId === userId);
      return sum + (row?.points ?? 0);
    }, 0);

    if (!this.client) {
      return {
        summary: this.buildStubSummary(kudosCount, totalPointsReceived, monthKey),
        monthKey,
        kudosCount,
        totalPointsReceived,
      };
    }

    if (kudosCount === 0) {
      return {
        summary: 'Bạn chưa nhận được kudo nào trong tháng này. Hãy tiếp tục cống hiến và giao tiếp tích cực với đồng nghiệp nhé!',
        monthKey,
        kudosCount: 0,
        totalPointsReceived: 0,
      };
    }

    const kudoLines = kudos
      .map((k) => {
        const pts = k.recipients.find((r) => r.userId === userId)?.points ?? 0;
        return `- Từ ${k.sender.fullName ?? k.sender.email} (+${pts} điểm, #${k.coreValue.name}): "${k.description}"`;
      })
      .join('\n');

    const prompt = `Bạn là trợ lý HR của công ty, giọng văn thân thiện, động lực và chuyên nghiệp.

Dưới đây là danh sách kudo mà nhân viên đã nhận được trong tháng này:

${kudoLines}

Hãy viết một đoạn tóm tắt thành tích trong tháng (2-3 đoạn, bằng tiếng Việt) theo phong cách:
1. Ghi nhận cụ thể những đóng góp nổi bật
2. Nhấn mạnh các giá trị cốt lõi được đồng nghiệp đánh giá cao
3. Kết thúc bằng một câu động viên tích cực

Chỉ trả về nội dung tóm tắt, không kèm tiêu đề hay giải thích thêm.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.75,
      });

      const summary = completion.choices[0]?.message?.content?.trim() ?? '';
      return { summary, monthKey, kudosCount, totalPointsReceived };
    } catch (err) {
      this.logger.error('OpenAI request failed', err);
      return {
        summary: this.buildStubSummary(kudosCount, totalPointsReceived, monthKey),
        monthKey,
        kudosCount,
        totalPointsReceived,
      };
    }
  }

  async searchKudos(query: string, topK = 8): Promise<KudoSearchHit[]> {
    if (!this.client) {
      return [];
    }

    // Fetch recent kudos (max 150 for embedding budget)
    const kudos = await this.kudosRepo
      .createQueryBuilder('kudo')
      .innerJoinAndSelect('kudo.sender', 'sender')
      .innerJoinAndSelect('kudo.coreValue', 'coreValue')
      .innerJoinAndSelect('kudo.recipients', 'recipient')
      .innerJoinAndSelect('recipient.recipient', 'recipientUser')
      .orderBy('kudo.createdAt', 'DESC')
      .take(150)
      .getMany();

    if (kudos.length === 0) return [];

    // Build a short text per kudo for embedding
    const kudoTexts = kudos.map((k) => {
      const recipientNames = k.recipients
        .map((r) => r.recipient?.fullName ?? r.recipient?.email ?? '')
        .filter(Boolean)
        .join(', ');
      return `${k.sender.fullName ?? k.sender.email} → ${recipientNames} (#${k.coreValue.name}): ${k.description}`;
    });

    // Batch embed: query first, then all kudo texts (single API call)
    const allTexts = [query, ...kudoTexts];
    const embeddingRes = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: allTexts,
    });

    const vectors = embeddingRes.data
      .sort((a, b) => a.index - b.index)
      .map((e) => e.embedding);

    const queryVec = vectors[0]!;
    const kudoVecs = vectors.slice(1);

    // Cosine similarity (vectors from text-embedding-3-small are already unit-length)
    const scored = kudos.map((kudo, i) => ({
      kudo,
      score: cosineSimilarity(queryVec, kudoVecs[i]!),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(({ kudo, score }) => ({
      kudoId: kudo.id,
      score: Math.round(score * 1000) / 1000,
      description: kudo.description,
      senderName: kudo.sender.fullName ?? kudo.sender.email,
      coreValueName: kudo.coreValue.name,
      createdAt: kudo.createdAt.toISOString(),
      recipients: kudo.recipients.map((r) => ({
        userId: r.userId,
        name: r.recipient?.fullName ?? r.recipient?.email ?? r.userId,
        points: r.points,
      })),
    }));
  }

  private buildStubSummary(count: number, points: number, monthKey: string): string {
    return `[AI unavailable] Tháng ${monthKey}: bạn đã nhận ${count} kudo với tổng ${points} điểm. Cấu hình OPENAI_API_KEY để bật tính năng AI summary.`;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
