// WOW 2.0 integration readiness: diagnostic only, not a substitute for browser QA.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const html=readFileSync('WOW_APP.html','utf8');
const checks={
  approvedSpeciesStories: /(?:wowApprovedStories|SPECIES_UNIQUE_LEARN_MORE)/.test(html),
  speciesSearch: /Търси вид по научно име/.test(html),
  speciesDetailStory: /wowApprovedStories\[name\]/.test(html),
  goalsView: /Цели на опазване|Цели и режими|Целеви записи/.test(html),
  legalRegimesView: /Правни режими|Режими и ограничения|Правни записи/.test(html),
  missingIndicatorsNotice: /индикатор[^\n]{0,180}ПРЕДСТОИ|ПРЕДСТОИ[^\n]{0,180}индикатор/i.test(html),
  missingFinancingNotice: /финансиран[^\n]{0,180}ПРЕДСТОИ|ПРЕДСТОИ[^\n]{0,180}финансиран/i.test(html)
};
const report={kind:'integration-readiness',scope:'static source markers only',checks,passed:Object.values(checks).filter(Boolean).length,total:Object.keys(checks).length,warning:'A PASS is not proof that data render correctly or belong to the selected zone.'};
mkdirSync('wow-test-results',{recursive:true});
writeFileSync('wow-test-results/integration-readiness.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.passed!==report.total){console.error('Integration incomplete: see failed checks; navigation green is not content acceptance.');process.exitCode=1;}
