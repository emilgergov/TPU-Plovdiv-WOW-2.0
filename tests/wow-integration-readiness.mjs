import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
const html=readFileSync('WOW_APP.html','utf8');
const index=readFileSync('index.html','utf8');
const adapter=existsSync('species-catalogue.js')?readFileSync('species-catalogue.js','utf8'):'';
const dataPath='data/species-stories-792.json';
let stories=null,dataError=null;
if(existsSync(dataPath)){try{stories=JSON.parse(readFileSync(dataPath,'utf8'))}catch(e){dataError=e.message}}
const validStories=stories&&typeof stories==='object'&&!Array.isArray(stories)&&Object.keys(stories).length===792&&Object.entries(stories).every(([k,v])=>k.trim()&&typeof v==='string'&&v.trim());
const checks={
 approvedSpeciesStories:Boolean(validStories),
 speciesSearch:index.includes('species-catalogue.js')&&adapter.includes('Търси вид по научно име'),
 speciesDetailStory:adapter.includes('data[name]')&&adapter.includes('addEventListener'),
 goalsView:/Цели на опазване|Цели и режими|Целеви записи/.test(html),
 legalRegimesView:/Правни режими|Режими и ограничения|Правни записи/.test(html),
 missingIndicatorsNotice:/индикатор[^\n]{0,180}ПРЕДСТОИ|ПРЕДСТОИ[^\n]{0,180}индикатор/i.test(html),
 missingFinancingNotice:/финансиран[^\n]{0,180}ПРЕДСТОИ|ПРЕДСТОИ[^\n]{0,180}финансиран/i.test(html)
};
const report={kind:'integration-readiness',scope:'static source and story-data checks, not browser proof',checks,passed:Object.values(checks).filter(Boolean).length,total:Object.keys(checks).length,dataError,warning:'A PASS is not proof that records belong to the selected zone or render correctly.'};
mkdirSync('wow-test-results',{recursive:true});writeFileSync('wow-test-results/integration-readiness.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.passed!==report.total)process.exitCode=1;
