// zod schemas validating every request/response shape in docs/API.md.
// Server routes parse requests with these; client and CLI scripts can reuse
// them to validate responses.
import { z } from 'zod';

export const pollPhaseSchema = z.enum(['Registration', 'Voting', 'Closed']);

export const hexStringSchema = z.string().regex(/^[0-9a-fA-F]+$/, 'must be a hex string');

export const createPollRequestSchema = z.object({
  title: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(80)).min(2).max(4),
  contractAddress: hexStringSchema
});
export type CreatePollRequest = z.infer<typeof createPollRequestSchema>;

export const pollMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  options: z.array(z.string()).min(2).max(4),
  contractAddress: hexStringSchema,
  phase: pollPhaseSchema
});
export type PollMetadataDto = z.infer<typeof pollMetadataSchema>;

export const pollTallySchema = z.object({
  tally: z.array(z.number().int().nonnegative()).min(2).max(4),
  totalVotes: z.number().int().nonnegative(),
  nullifierCount: z.number().int().nonnegative(),
  merkleRoot: hexStringSchema,
  phase: pollPhaseSchema
});
export type PollTallyDto = z.infer<typeof pollTallySchema>;

export const pollCommitmentsSchema = z.object({
  depth: z.number().int().positive(),
  commitments: z.array(hexStringSchema)
});
export type PollCommitmentsDto = z.infer<typeof pollCommitmentsSchema>;

export const sponsorRequestSchema = z.object({
  finalizedTx: hexStringSchema
});
export type SponsorRequest = z.infer<typeof sponsorRequestSchema>;

export const sponsorResponseSchema = z.object({
  txId: z.string()
});
export type SponsorResponse = z.infer<typeof sponsorResponseSchema>;

export const pollIdParamSchema = z.object({
  id: z.string().min(1)
});
