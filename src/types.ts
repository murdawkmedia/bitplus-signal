import { z } from "zod";

export const VisibilitySchema = z
  .enum(["public", "private", "dm", "login_gated", "unknown"])
  .default("public");

export const DataModeSchema = z
  .enum(["real_public", "sample_synthetic", "source_log"])
  .default("real_public");

export const ConferenceEventSchema = z.object({
  id: z.string().min(1),
  series: z.string().min(1).default("Conference"),
  name: z.string().min(1),
  edition: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  region: z.string().min(1),
  venue: z.string().optional().default(""),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  url: z.string().url(),
  tags: z.array(z.string()).default([]),
  airports: z.array(z.string()).default([]),
  directFlightFrom: z.array(z.string()).default([])
});

export const PublicSignalSchema = z.object({
  id: z.string().optional(),
  platform: z.string().min(1),
  sourceUrl: z.string().min(1),
  publicName: z.string().optional().default(""),
  excerpt: z.string().min(1),
  postedAt: z.string().optional().default(""),
  locationHint: z.string().optional().default("unknown"),
  topics: z.array(z.string()).optional().default([]),
  profileRefs: z.array(z.string()).optional().default([]),
  conferenceRefs: z.array(z.string()).optional().default([]),
  dataMode: DataModeSchema.optional().default("real_public"),
  sourceLane: z.string().optional().default("unknown"),
  provenanceNote: z.string().optional().default(""),
  visibility: VisibilitySchema
});

export const TrustProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  platform: z.string().min(1),
  trustSeed: z.boolean().optional().default(false),
  follows: z.array(z.string()).optional().default([]),
  followedBy: z.array(z.string()).optional().default([]),
  conferenceRefs: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  locationHints: z.array(z.string()).optional().default([])
});

export const TrustConferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().optional().default(""),
  url: z.string().optional().default(""),
  topics: z.array(z.string()).optional().default([])
});

export const TrustGraphSchema = z.object({
  profiles: z.array(TrustProfileSchema).optional().default([]),
  conferences: z.array(TrustConferenceSchema).optional().default([])
});

export const BuildMetaSchema = z.object({
  builtAt: z.string(),
  eventCount: z.number(),
  signalInputCount: z.number(),
  realSignalCount: z.number().optional().default(0),
  sampleSignalCount: z.number().optional().default(0),
  blockedInputCount: z.number().optional().default(0),
  sourceLaneCounts: z.array(z.object({
    sourceLane: z.string(),
    inputCount: z.number()
  })).optional().default([]),
  matchCount: z.number(),
  sourceMode: z.string()
});

export type ConferenceEvent = z.infer<typeof ConferenceEventSchema>;
export type PublicSignal = z.infer<typeof PublicSignalSchema>;
export type BuildMeta = z.infer<typeof BuildMetaSchema>;
export type TrustProfile = z.infer<typeof TrustProfileSchema>;
export type TrustConference = z.infer<typeof TrustConferenceSchema>;
export type TrustGraph = z.infer<typeof TrustGraphSchema>;

export type GateClass = "public_ok" | "public_ambiguous" | "blocked_private";
export type TravelMatch = "local" | "direct_flight_seed" | "same_region" | "unknown";
export type DataMode = z.infer<typeof DataModeSchema>;

export interface SignalMatch {
  matchId: string;
  signalId: string;
  eventId: string;
  eventName: string;
  eventEdition: string;
  eventCity: string;
  eventCountry: string;
  eventDates: string;
  eventUrl: string;
  platform: string;
  sourceUrl: string;
  publicName: string;
  excerpt: string;
  postedAt: string;
  locationHint: string;
  topics: string[];
  topicMatch: string[];
  travelMatch: TravelMatch;
  gate: GateClass;
  dataMode: DataMode;
  sourceLane: string;
  provenanceNote: string;
  trustScore: number;
  conferenceAffinityScore: number;
  trustReasons: string[];
  score: number;
  scoreBreakdown: string;
  approvalStatus: "needs_human_review" | "blocked_private";
  reachPath: string;
  draftPublicReply: string;
}
