'use client';
import { useTranslation } from '@/components/language-provider';

import { useEffect, useRef, useState } from 'react';
import { CookingIllustration } from './cooking-illustration';
export function RecipeArt({
  vibe,
  small = false,
  imageUrl = '',
  title = 'Recipe',
}: {
  vibe: string;
  small?: boolean;
  imageUrl?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState('');
  const photo = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (photo.current?.complete && photo.current.naturalWidth === 0) setFailed(imageUrl);
  }, [imageUrl]);
  if (imageUrl && failed !== imageUrl)
    return (
      <div className={`recipe-art recipe-photo ${small ? 'small' : ''}`}>
        {/* User images load directly, without a server-side image proxy. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={photo}
          src={imageUrl}
          alt={t(title)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(imageUrl)}
        />
      </div>
    );
  return (
    <div className={`recipe-art art-${vibe} ${small ? 'small' : ''}`} aria-hidden="true">
      <div className="recipe-placeholder">
        <CookingIllustration vibe={vibe} />
        <span>{t('From your kitchen')}</span>
      </div>
    </div>
  );
}
export function Vibe({ vibe }: { vibe: string }) {
  const { t } = useTranslation();
  return <span className={`vibe vibe-${vibe}`}>{t(vibe)}</span>;
}
