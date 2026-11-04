/* KT60.1: classify real dossier quotes, never infer that an AI conclusion is proven. */
(function(root){'use strict';
const rules=[
 ['subject',/(инвестиционн(?:о|ото)\s+предложени|предвижда\s+се|предмет\s+на|изграждане\s+на|строителств)/iu],
 ['electricity',/(електро(?:снабд|захран)|ел\.\s*захран|присъединяван.{0,35}(?:мреж|електр)|трафопост|електропровод)/iu],
 ['water_supply',/(водоснабд|водопровод|питейн.{0,12}вод|водоизточник|водочерп|воден\s+източник)/iu],
 ['wastewater',/(отпадъчн.{0,16}вод|канализац|пречиствателн|септичн|изгребн|битово.?фекалн)/iu],
 ['procedure',/(оценк.{0,22}съвместимост|процедур.{0,45}(?:ОВОС|ОС)|решение\s+по\s+ОВОС|преценяване.{0,35}необходимост)/iu]
];
function extract(preview){
 const docs=(preview?.files||[]).filter(f=>f&&typeof f.text==='string');
 return docs.slice(0,25).map((f,index)=>{
  const body=f.text,parts=body.split(/\r?\n+|(?<=[.!?])\s+/u).filter(s=>s.trim().length>=20);
  const facts=[];
  for(const snippet of parts.slice(0,160)){
   const quote=snippet.slice(0,1000),kind=rules.find(([,rx])=>rx.test(quote))?.[0]||'dossier_excerpt';
   facts.push({kind,value:quote,quote});
  }
  return {file:f.path||f.file||('Документ '+(index+1)),text:body,error:f.error,facts};
 });
}
root.KT601Classifier=Object.freeze({extract});
})(window);
