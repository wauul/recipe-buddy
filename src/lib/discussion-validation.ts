import { z } from 'zod';

export const takeTypes = {
  new_ingredient: 'New ingredient', ingredient_swap: 'Ingredient swap', quantity: 'Different quantity',
  cooking_time: 'Cooking time / temperature', technique: 'Different technique', equipment: 'Different equipment',
  serving: 'Serving idea', other: 'Other / a few changes'
} as const;
export const takeTypeSchema = z.enum(['new_ingredient', 'ingredient_swap', 'quantity', 'cooking_time', 'technique', 'equipment', 'serving', 'other']);

export const takeSchema = z.object({
  type: takeTypeSchema.default('other'),
  title: z.string().trim().min(1, 'Give your twist a short title.').max(120),
  change: z.string().trim().min(1, 'Tell us what you changed.').max(2000),
  ingredient: z.string().trim().max(120).default(''),
  reason: z.string().trim().max(2000).default('')
});
export const commentSchema = z.object({
  text: z.string().trim().min(1, 'Write a comment first.').max(2000),
  takeId: z.string().cuid().nullable().default(null)
});
export const deleteContributionSchema = z.object({
  kind: z.enum(['take', 'comment']), id: z.string().cuid()
});
export type DiscussionComment = { id: string; authorId: string; authorName: string; text: string; createdAt: string; takeId: string | null };
export type DiscussionTake = { id: string; authorId: string; authorName: string; type: keyof typeof takeTypes; title: string; change: string; ingredient: string; reason: string; createdAt: string };
export type Discussion = { ownerId: string; takes: DiscussionTake[]; comments: DiscussionComment[] };
