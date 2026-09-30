'use client';
import { useEffect } from 'react';

export function ScrollReveals() {
  useEffect(() => {
    if (
      !('IntersectionObserver' in window) ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const sections = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.remove('motion-pending');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    for (const section of sections) {
      if (section.getBoundingClientRect().top >= innerHeight) {
        section.classList.add('motion-pending');
        observer.observe(section);
      }
    }
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.classList.remove('motion-pending'));
    };
  }, []);
  return null;
}
