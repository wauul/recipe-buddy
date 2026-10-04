"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { request } from "@/lib/client";
import { useTranslation } from "./language-provider";
type Feed = {
  posts: {
    id: string;
    owned: boolean;
    author: string;
    caption: string;
    rating: number | null;
    date: string;
    photo: string | null;
    recipe: { id: string; owned: boolean } | null;
    reactions: number;
    reacted: boolean;
  }[];
  nextCursor: string | null;
};
export function MealActivity() {
  const { t, locale } = useTranslation();
  const [feed, setFeed] = useState<Feed | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async (cursor?: string) => {
    try {
      const next = await request<Feed>(
        "/api/meals/activity" +
          (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
      );
      setFeed((prior) =>
        cursor
          ? { ...next, posts: [...(prior?.posts ?? []), ...next.posts] }
          : next,
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="meal-activity">
      <h2>{t("Friends activity")}</h2>
      {error && (
        <p role="alert">
          {t(error)} <button onClick={() => load()}>{t("Retry")}</button>
        </p>
      )}
      {!feed && !error && <p role="status">{t("Loading…")}</p>}
      {feed?.posts.length === 0 && (
        <p>
          {t(
            "No cooking results shared yet. Publish selected fields from your cooking follow-up.",
          )}
        </p>
      )}
      {feed?.posts.map((post) => (
        <article className="meal-row" key={post.id}>
          <h3>{post.author}</h3>
          <small>{new Date(post.date).toLocaleDateString(locale)}</small>
          {post.photo && (
            <Image
              unoptimized
              width={400}
              height={300}
              src={post.photo}
              alt={t("Shared cooking result")}
              style={{ maxWidth: "100%", width: 400, borderRadius: 12 }}
            />
          )}
          <p>{post.caption}</p>
          {post.rating !== null && (
            <p>
              {t("Personal enjoyment rating")}: {post.rating}/5
            </p>
          )}
          {post.recipe && (
            <Link
              href={`/${post.recipe.owned ? "recipes" : "shared"}/${post.recipe.id}`}
            >
              {t("View recipe")}
            </Link>
          )}
          <button
            className="button secondary"
            aria-pressed={post.reacted}
            onClick={async () => {
              try {
                await request(`/api/meals/activity/${post.id}`, "POST", {
                  react: !post.reacted,
                });
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Try again.");
              }
            }}
          >
            {t(post.reacted ? "Remove reaction" : "React")} · {post.reactions}
          </button>
          {post.owned && (
            <>
            {post.photo && <button className="text-button" onClick={async()=>{try{await request(`/api/meals/activity/${post.id}/media`,"DELETE",{});await load()}catch(e){setError(e instanceof Error?e.message:"Try again.")}}}>{t("Delete published photo")}</button>}
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await request(`/api/meals/activity/${post.id}`, "DELETE", {});
                  await load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Try again.");
                }
              }}
            >
              {t("Delete my post")}
            </button>
            </>
          )}
        </article>
      ))}
      {feed?.nextCursor && (
        <button
          className="button secondary"
          onClick={() => load(feed.nextCursor!)}
        >
          {t("Load more")}
        </button>
      )}
    </section>
  );
}
