import test from 'node:test';
import assert from 'node:assert/strict';
import { trackedOutbound } from '../src/lib/outbound';
test('outbound attribution preserves existing parameters and fragments',()=>{
 const url=new URL(trackedOutbound('https://example.com/help?x=1&utm_source=existing#answer','https://recipe.test'));
 assert.equal(url.searchParams.get('utm_source'),'existing');assert.equal(url.searchParams.get('utm_medium'),'referral');assert.equal(url.searchParams.get('x'),'1');assert.equal(url.hash,'#answer');
});
test('internal navigation, email and other schemes do not get UTM parameters',()=>{
 for(const href of ['/friends','#main','https://recipe.test/recipes','mailto:contact@recipebuddy.waelfz.com','tel:123'])assert.equal(trackedOutbound(href,'https://recipe.test'),href);
});
