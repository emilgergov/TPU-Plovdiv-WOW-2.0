#!/usr/bin/env python3
"""KT77 PI MASTER. Rebuild public read-only index from immutable GIS shard archives.
No map, document, or AI generator is read or modified.
Fail closed unless complete counts and pilots agree with KT78.
"""
import collections,csv,glob,gzip,hashlib,json,math,os,pathlib,re,sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
GIS=ROOT.parent
OUT=ROOT/'browser-index'
MAP=ROOT/'admin-ekatte-212-groups.json'
EXPECTED=dict(parcels=917417,zz_pairs=176553,zt_pairs=2746,source_zz_fragments=181154)
CASES={
 '46989.205.218':('Лъки',1,1),
 '47086.6.15':('Марица',0,1),
 '37277.49.53':('Карлово',4,1),
 '56784.13.102':('Пловдив',0,0),
 '36676.129.457':('Садово',1,0),
 '99087.40.46':('Асеновград',0,1)
}
def check(condition,message):
 if not condition:raise RuntimeError('KT77 INDEX BLOCKED: '+message)
def load_gz(p):
 with gzip.open(p,'rt',encoding='utf-8') as fp:return json.load(fp)
def consolidate():
 administrative=json.loads(MAP.read_text(encoding='utf-8'))
 groups=administrative['municipalities']
 check(administrative['province']=='Пловдив','wrong province')
 check(len(groups)==18,'municipality total != 18')
 mapping={}
 for municipality,codes in groups.items():
  for code in codes:
   check(re.fullmatch(r'\d{5}',code) and code not in mapping,'duplicate/invalid EKATTE '+code)
   mapping[code]=municipality
 check(len(mapping)==212,'212 EKATTE mapping incomplete')
 sources=sorted(GIS.glob('parcels_??.json.gz'))
 check(len(sources)==67,'67 parcel sources missing')
 overlap_sources=sorted(GIS.glob('overlays_??.json.gz'))
 check(len(overlap_sources)==62,'62 zone-overlap sources missing')
 rows_by_prefix={}
 all_cadnums=set()
 seen_ekatte=set()
 for source in sources:
  prefix=source.stem.split('_')[1].split('.')[0]
  entries=load_gz(source)
  check(isinstance(entries,list),'invalid parcel source '+source.name)
  rows=[]
  for item in entries:
   check(isinstance(item,list) and len(item)>=4,'bad parcel input')
   cad,settlement,locality,area=item[:4]
   check(isinstance(cad,str) and re.fullmatch(r'\d{5}\.\d+\.\d+',cad) and cad[:2]==prefix,'wrong parcel cadnum')
   check(cad not in all_cadnums,'duplicate parcel '+cad)
   check(isinstance(settlement,str) and settlement.strip() and area is not None and math.isfinite(float(area)) and float(area)>0,'bad parcel facts '+cad)
   code=cad[:5]
   check(code in mapping,'missing municipality for '+cad)
   all_cadnums.add(cad);seen_ekatte.add(code)
   rows.append(dict(cadnum=cad,settlement=settlement,municipality=mapping[code],province='Пловдив',locality=locality,area_m2=float(area),zz=[],zt=[]))
  rows_by_prefix[prefix]=rows
 check(len(all_cadnums)==917417 and len(seen_ekatte)==212,'cadastre/EKATTE counts failed')

 by_cad={}
 for pref,rows in rows_by_prefix.items():
  for x in rows:by_cad[x['cadnum']]=x
 # Original V26 overlays archive contains the FULL 181154 source fragments
 # as [cadnum, sitecode, name_bg, order_no, dv, area_ha_source].
 # Consolidate fragments per exact parcel/site pair; use original archived
 # area, *not* inferred polygon coverage or a new spatial computation.
 zz_acc={}; source_fragments=0
 for source in overlap_sources:
  for item in load_gz(source):
   check(isinstance(item,list) and len(item)>=6,'bad ZZ fragment')
   cad,code,name,_,__,area_ha=item[:6]
   check(cad in by_cad and isinstance(code,str) and re.fullmatch(r'BG\d{7}',code),'invalid ZZ reference '+str(cad))
   check(area_ha is not None and math.isfinite(float(area_ha)) and float(area_ha)>=0,'invalid ZZ area')
   key=(cad,code);area=float(area_ha)*10000
   if key not in zz_acc:zz_acc[key]=(name,[])
   zz_acc[key][1].append(area)
   source_fragments+=1
 check(source_fragments==EXPECTED['source_zz_fragments'],'source fragment count mismatch')
 check(len(zz_acc)==EXPECTED['zz_pairs'],'unique ZZ pair count mismatch')
 for (cad,code),(name,parts) in zz_acc.items():
  parcel=by_cad[cad]
  original=math.fsum(parts)
  area=original
  if original>parcel['area_m2'] and original/parcel['area_m2']<1.005:area=parcel['area_m2']
  parcel['zz'].append(dict(code=code,name=name,area_m2=area,percent=100*area/parcel['area_m2']))
 del zz_acc

 zt_files=sorted((GIS/'zt-archive').glob('PI_X_ZT_POPADA_PART_??.csv'))
 check(len(zt_files)==7,'7 ZT CSV sources missing')
 zt_pair_count=0;zt_seen=set()
 for p in zt_files:
  with p.open(encoding='utf-8-sig',newline='') as f:
   for rec in csv.DictReader(f):
    cad=rec['cadnum'];internal=rec['zt_code']
    check(cad in by_cad and (cad,internal) not in zt_seen,'invalid/duplicate ZT '+cad)
    zt_seen.add((cad,internal))
    parcel=by_cad[cad]
    original=float(rec['overlap_area_m2'])
    check(math.isfinite(original) and original>=0,'invalid ZT area')
    area=parcel['area_m2'] if original>parcel['area_m2'] and original/parcel['area_m2']<1.005 else original
    parcel['zt'].append(dict(internal_id=internal,name=rec['zt_name'],category=rec['zt_category'],area_m2=area,percent=100*area/parcel['area_m2']))
    zt_pair_count+=1
 check(zt_pair_count==EXPECTED['zt_pairs'],'ZT pair count mismatch')

 for cad,(municipality,nzz,nzt) in CASES.items():
  p=by_cad[cad]
  check(p['municipality']==municipality and len(p['zz'])==nzz and len(p['zt'])==nzt,'pilot regression '+cad)
 check(by_cad['46989.205.218']['zt'][0]['name'].upper()=='СВЕТИ ДУХ','ST DUH pilot mismatch')
 check(by_cad['47086.6.15']['zt'][0]['name'].upper()=='ТРАКИЙСКИ РАВНЕЦ','TRAKIISKI pilot mismatch')

 OUT.mkdir(parents=True,exist_ok=True)
 # Remove only old generated parts so no unverified stale shard can remain.
 for old in OUT.glob('pi-master-??.json.gz'):old.unlink()
 parts=[];total=collections.Counter()
 for prefix in sorted(rows_by_prefix):
  rows=rows_by_prefix[prefix]
  rows.sort(key=lambda x:x['cadnum'])
  for r in rows:
   r['zz'].sort(key=lambda x:x['code'])
   r['zt'].sort(key=lambda x:(x['name'],x['internal_id']))
  data=json.dumps(rows,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf-8')
  blob=gzip.compress(data,compresslevel=6,mtime=0)
  fname='pi-master-'+prefix+'.json.gz'
  (OUT/fname).write_bytes(blob)
  parts.append(dict(file=fname,records=len(rows),sha256=hashlib.sha256(blob).hexdigest()))
  total['parcels']+=len(rows)
  total['zz_pairs']+=sum(len(x['zz']) for x in rows)
  total['zt_pairs']+=sum(len(x['zt']) for x in rows)
 check(dict(total)=={k:EXPECTED[k] for k in ('parcels','zz_pairs','zt_pairs')},'final reconciliation failed '+repr(total))
 check(len(parts)==67,'missing output parts')
 manifest=dict(schema='kt77-pi-master-browser-v1',status='VERIFIED',
   total_unique_parcels=917417,zz_pairs=176553,zt_pairs=2746,ekatte_codes=212,
   source_zz_fragments=source_fragments,parts=parts,source='V26 archived GIS 258 shards + KT77-02 protected territory positive CSV + KT78 municipality map',
   admin_as_of='2026-05-15',view_rule='internal protected-area codes are NEVER presented to experts')
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('KT77 MASTER REBUILD PASS',dict(total),'67/67','212/212','municipalities 18',flush=True)
 return manifest

if __name__=='__main__':
 try:consolidate()
 except Exception as e:print(str(e),file=sys.stderr,flush=True);sys.exit(1)
