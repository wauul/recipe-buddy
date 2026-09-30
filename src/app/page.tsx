import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, ShoppingBasket, Users, Check, Plus } from 'lucide-react';
import { KitchenPlate } from '@/components/kitchen-plate';
import { CookingIllustration } from '@/components/cooking-illustration';
import { ChefBadge } from '@/components/chef-badge';
import { chefLevels } from '@/lib/chef-levels';
import { Brand } from '@/components/brand';
import { ScrollReveals } from '@/components/scroll-reveals';

export const metadata: Metadata = {
  title: 'Recipe Buddy | A little home for your best recipes',
  description:
    'Keep your favorite recipes, turn them into a shopping list, and share them with fellow chefs. Your own little corner of the kitchen.',
};

export default function Home() {
  return (
    <main id="main" tabIndex={-1} className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1>
            A little home for
            <br />
            <span>your best recipes.</span>
          </h1>
          <p>
            The pasta you make on repeat. That cake everyone asks for. Keep them close, cook them
            again, and pass the good ones on.
          </p>
          <div className="landing-actions">
            <Link href="/signup" className="button primary">
              <Plus size={18} aria-hidden="true" />
              Start your recipe box
            </Link>
            <a href="#how-it-works" className="text-button">
              Take a look around
            </a>
          </div>
          <p className="landing-privacy">
            <Check size={16} aria-hidden="true" />
            Your recipes stay private until you share them.
          </p>
        </div>
        <div className="landing-hero-art">
          <span className="plate-caption">Good food. Kept close.</span>
          <KitchenPlate />
          <span className="plate-footnote">
            A recipe worth saving is a recipe worth making again.
          </span>
        </div>
      </section>

      <section
        id="how-it-works"
        className="landing-workflow"
        aria-labelledby="workflow-heading"
        data-reveal
      >
        <div className="landing-section-heading">
          <h2 id="workflow-heading">
            Less hunting.
            <br />
            More cooking.
          </h2>
          <p>From “where did I save that?” to dinner on the table.</p>
        </div>
        <ol className="workflow-list">
          <li>
            <div className="workflow-number">01</div>
            <BookOpen aria-hidden="true" size={28} />
            <h3>Keep the good ones</h3>
            <p>
              Write your own recipe or import one from a website. Ingredients, steps and your own
              photos, all in one place.
            </p>
          </li>
          <li>
            <div className="workflow-number">02</div>
            <ShoppingBasket aria-hidden="true" size={28} />
            <h3>Shop with a plan</h3>
            <p>
              Choose what you want to cook. Recipe Buddy combines the ingredients into a shopping
              list you can check as you go.
            </p>
          </li>
          <li>
            <div className="workflow-number">03</div>
            <Users aria-hidden="true" size={28} />
            <h3>Pass a recipe along</h3>
            <p>
              Invite a friend, share a favorite, and swap kitchen twists. A little less scrolling. A
              little more “you have to try this.”
            </p>
          </li>
        </ol>
      </section>

      <section className="landing-chefs" aria-labelledby="chefs-heading" data-reveal>
        <div className="landing-section-heading">
          <h2 id="chefs-heading">
            Every kitchen
            <br />
            starts somewhere.
          </h2>
          <div>
            <p>
              Here, everyone’s a chef. Grow your recipe box and earn apron reviews from the chefs
              you share with.
            </p>
            <p>Seven levels. A badge for every chapter of your kitchen story.</p>
          </div>
        </div>
        <ol className="landing-levels">
          {chefLevels.map((level) => (
            <li key={level.level}>
              <div className="landing-level-art">
                <ChefBadge level={level.level} />
              </div>
              <span>Level {level.level}</span>
              <h3>{level.name}</h3>
            </li>
          ))}
        </ol>
        <p className="landing-points">
          10 points per saved recipe. 2 points per apron received. One chef level that brings them
          together.
        </p>
      </section>

      <section className="landing-last-call" aria-labelledby="join-heading" data-reveal>
        <div className="landing-last-art">
          <CookingIllustration compact />
        </div>
        <div>
          <h2 id="join-heading">
            Your next favorite
            <br />
            deserves a place.
          </h2>
          <p>Start with one recipe. Make yourself at home.</p>
        </div>
        <Link href="/signup" className="button primary">
          Join the kitchen
        </Link>
      </section>
      <footer className="landing-footer">
        <Brand href="/" />
        <p>Made for the meals worth making again.</p>
        <a href="mailto:contact@recipebuddy.waelfz.com">Say hello</a>
        <Link href="/privacy">Privacy</Link>
        <Link href="/login">Chef login</Link>
      </footer>
      <ScrollReveals />
    </main>
  );
}
