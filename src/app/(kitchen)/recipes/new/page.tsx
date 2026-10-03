import { RecipeForm } from '@/components/recipe-form';
export default async function NewRecipe(props: { searchParams: Promise<{ from?: string }> }) {
  const searchParams = await props.searchParams;
  return <RecipeForm fromBrowser={searchParams.from === 'extension'} />;
}
