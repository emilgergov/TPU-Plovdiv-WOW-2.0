#!/usr/bin/env python3
"""Repackage V26 approved GIS archives into browser-ready prefix shards."""
import argparse,collections,gzip,json,pathlib,zipfile,hashlib
p=argparse.ArgumentParser()
p.add_argument('--index',required=True);p.add_argument('--geometry',required=True);p.add_argument('--out',required=True)
a=p.parse_args();out=pathlib.Path(a.out);out.mkdir(parents=True,exist_ok=True)
manifest={'version':'V26-2026-10-27','files':{},'counts':{}}
def save(name,rows):
 target=out/name
 with gzip.open(target,'wt',encoding='utf-8',compresslevel=6) as f:json.dump(rows,f,ensure_ascii=False,separators=(',',':'))
 manifest['files'][name]={'records':len(rows),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
with zipfile.ZipFile(a.index) as z:
 for n in z.namelist():
  if n.endswith('.json.gz') and '/gis-v26/' in n:
   name=n.rsplit('/',1)[-1];data=z.read(n);(out/name).write_bytes(data)
   rows=json.loads(gzip.decompress(data));manifest['files'][name]={'records':len(rows),'sha256':hashlib.sha256(data).hexdigest()}
for kind in ('parcelgeom','overlapgeom'):
 groups=collections.defaultdict(list);total=0
 with zipfile.ZipFile(a.geometry) as z:
  for n in sorted(z.namelist()):
   if n.startswith('geometry_chunks/'+kind+'_') and n.endswith('.json.gz'):
    rows=json.loads(gzip.decompress(z.read(n)));total+=len(rows)
    for row in rows:groups[str(row[0])[:2]].append(row)
 for prefix,rows in sorted(groups.items()):save(kind+'_'+prefix+'.json.gz',rows)
 manifest['counts'][kind]=total
manifest['counts']['parcels_index']=sum(v['records'] for k,v in manifest['files'].items() if k.startswith('parcels_'))
manifest['counts']['overlays_index']=sum(v['records'] for k,v in manifest['files'].items() if k.startswith('overlays_'))
assert manifest['counts']=={'parcelgeom':917418,'overlapgeom':181154,'parcels_index':917417,'overlays_index':181154},manifest['counts']
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(manifest['counts'])
