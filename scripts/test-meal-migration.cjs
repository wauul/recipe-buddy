const assert=require('node:assert/strict');
const {PrismaClient}=require('@prisma/client');
const {mkdirSync,readdirSync,copyFileSync,writeFileSync,cpSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const upgradeName='recipe_buddy_meal_upgrade_'+Date.now().toString();const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'55433');assert.equal(url.pathname,'/recipe_buddy_meal_test');
const current=new PrismaClient();
async function main(){
 const exists=await current.$queryRawUnsafe("SELECT datname FROM pg_database WHERE datname='"+upgradeName+"'");
 if(exists.length)throw new Error('Upgrade test database exists; refusing to reset it.');
 assert.match(upgradeName,/^recipe_buddy_meal_upgrade_[0-9]+$/);await current.$executeRawUnsafe('CREATE DATABASE '+upgradeName);
 url.pathname='/'+upgradeName;const env={...process.env,DATABASE_URL:url.href,VERCEL_ENV:'preview'};
 const root='.test-build/meal-upgrade/'+upgradeName+'/prisma';mkdirSync(root+'/migrations',{recursive:true});
 const old=spawnSync('git',['show','HEAD:prisma/schema.prisma'],{encoding:'utf8'});assert.equal(old.status,0);writeFileSync(root+'/schema.prisma',old.stdout);
 copyFileSync('prisma/migrations/migration_lock.toml',root+'/migrations/migration_lock.toml');
 for(const folder of readdirSync('prisma/migrations',{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('20261004')))cpSync('prisma/migrations/'+folder.name,root+'/migrations/'+folder.name,{recursive:true});
 function migrate(){const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema',root+'/schema.prisma'],{encoding:'utf8',env});assert.equal(result.status,0,'Migration failed; inspect the guarded upgrade test database.');}
 migrate();const upgraded=new PrismaClient({datasources:{db:{url:url.href}}});
 try {
  await upgraded.user.create({data:{id:'upgrade-chef',email:'upgrade@example.test',username:'Legacy chef'}});
  await upgraded.$executeRawUnsafe(`INSERT INTO "Recipe" ("id","userId","title","servings","ingredients","steps","updatedAt") VALUES ('upgrade-recipe','upgrade-chef','Legacy rice',4,'[{"name":"rice","quantity":"300","unit":"g"}]'::jsonb,'["Cook rice."]'::jsonb,NOW())`);
  await upgraded.cookedLog.create({data:{id:'upgrade-cooked',userId:'upgrade-chef',recipeId:'upgrade-recipe',date:new Date('2026-10-03')}});
  for(const d of readdirSync('prisma/migrations',{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('20261004')))cpSync('prisma/migrations/'+d.name,root+'/migrations/'+d.name,{recursive:true});copyFileSync('prisma/schema.prisma',root+'/schema.prisma');migrate();migrate();
  assert.equal(await upgraded.cookedLog.count(),1);assert.equal(await upgraded.recipe.count(),1);assert.equal(await upgraded.mealKitchen.count(),0);assert.equal(await upgraded.mealProfile.count(),0);assert.equal(await upgraded.mealPost.count(),0);
  mkdirSync('test-results/meals',{recursive:true});writeFileSync('test-results/meals/migration.json',JSON.stringify({result:'pass',database:'isolated upgrade test',legacyCookingRecords:1,legacyRecipes:1,inventedMeals:0,migrationReplay:'no pending migrations'},null,2));console.log('PASS legacy recipe/cooked-day preservation, no invented meals and migration replay');
 } finally {await upgraded.$disconnect();}
}
main().finally(()=>current.$disconnect()).catch(e=>{console.error(e.name,e.code ?? "");process.exitCode=1;});
