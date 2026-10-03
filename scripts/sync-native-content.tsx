import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from 'cheerio';
import { writeFileSync } from 'node:fs';
import { ChefBadge } from '../src/components/chef-badge';
import { ApronIcon } from '../src/components/apron-icon';
import { faqs } from '../src/lib/help';
import { french } from '../src/lib/messages.fr';
import { chefLevels } from '../src/lib/chef-levels';

// Preserve the web app's original artwork and FAQ content in the native app.
Object.assign(globalThis, { React });
const root = 'mobile/android/app/src/main';
for (const language of ['en', 'fr']) {
  // Printing remains a web-only feature at the user's explicit request.
  const rows = faqs.filter(f => f.question !== 'How do I print a recipe?').map(f => ({ question: language === 'fr' ? french[f.question] ?? f.question : f.question, answer: language === 'fr' ? french[f.answer] ?? f.answer : f.answer }));
  writeFileSync(`${root}/assets/help-${language}.json`, JSON.stringify(rows, null, 2) + '\n');
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll("'", "\\'").replaceAll('"', '\\"');
  writeFileSync(`${root}/res/${language === 'fr' ? 'values-fr' : 'values'}/chef_levels.xml`, '<resources>\n' + chefLevels.map(level => `    <string name="chef_description_${level.level}">${escape(language === 'fr' ? french[level.description] ?? level.description : level.description)}</string>`).join('\n') + '\n</resources>\n');
}
function vector(markup: string, viewport: number, gold = false) {
  const $ = load(markup, { xml: true });
  function children(parent: ReturnType<typeof $>): string {
    return parent.children().toArray().map(node => {
      const e = $(node), tag = node.type === 'tag' ? node.tagName : '';
      if (tag === 'svg') return children(e);
      if (tag === 'g') {
        const transform = e.attr('transform') ?? '';
        const translate = transform.match(/translate\((\d+) (\d+)\)/), scale = transform.match(/scale\(([\d.]+)\)/);
        return `<group${translate ? ` android:translateX="${translate[1]}" android:translateY="${translate[2]}"` : ''}${scale ? ` android:scaleX="${scale[1]}" android:scaleY="${scale[1]}"` : ''}>${children(e)}</group>`;
      }
      if (tag !== 'path' && tag !== 'ellipse') return '';
      let path = e.attr('d') ?? '';
      if (tag === 'ellipse') { const x = Number(e.attr('cx')), y = Number(e.attr('cy')), rx = Number(e.attr('rx')), ry = Number(e.attr('ry')); path = `M${x-rx},${y}a${rx},${ry} 0,1 0 ${rx*2},0a${rx},${ry} 0,1 0 ${-rx*2},0`; }
      const klass = e.attr('class') ?? '';
      const fill = klass === 'badge-patch' ? (gold ? '#FCF0DF' : '@color/illustration_fill') : klass === 'badge-paint' ? '#E8D9C6' : klass === 'badge-detail' ? '#D99B4E' : klass === 'badge-herb' ? '#91BD86' : e.attr('fill') === 'currentColor' ? '@color/illustration_line' : '#00000000';
      return `<path android:pathData="${path}" android:fillColor="${fill}" android:fillAlpha="${e.attr('fill-opacity') ?? '1'}" android:strokeColor="${gold ? '#A56824' : '@color/illustration_line'}" android:strokeWidth="${klass === 'badge-patch' ? 1.2 : klass === 'badge-stitch' ? .8 : viewport === 32 ? 1.8 : 3}" android:strokeAlpha="${klass === 'badge-stitch' ? .4 : 1}" android:strokeLineCap="round" android:strokeLineJoin="round" />`;
    }).join('\n');
  }
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${viewport}dp" android:height="${viewport}dp" android:viewportWidth="${viewport}" android:viewportHeight="${viewport}">\n${children($('svg').first())}\n</vector>\n`;
}
for (let level = 1; level <= 7; level++) writeFileSync(`${root}/res/drawable/chef_badge_${level}.xml`, vector(renderToStaticMarkup(<ChefBadge level={level} />), 120, level === 7));
for (const filled of [false, true]) writeFileSync(`${root}/res/drawable/apron${filled ? '_filled' : ''}.xml`, vector(renderToStaticMarkup(<ApronIcon filled={filled} />), 32));
console.log('Synced ten bilingual mobile FAQs and original web chef/apron artwork.');
