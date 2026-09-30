import { z } from 'zod';
export const apronReviewSchema = z.object({
  rating: z.number().int().min(1, 'Choose at least one apron.').max(5, 'Choose up to five aprons.'),
  text: z.string().trim().max(1000, 'Keep your review under 1,000 characters.').default(''),
});
export const canReviewRecipe = (recipeChefId: string, reviewingChefId: string) =>
  recipeChefId !== reviewingChefId;
export type ApronReviewInput = z.infer<typeof apronReviewSchema>;
export type RecipeReviews = {
  ownerId: string;
  reviews: {
    id: string;
    authorId: string;
    chefName: string;
    rating: number;
    text: string;
    updatedAt: string;
  }[];
};
