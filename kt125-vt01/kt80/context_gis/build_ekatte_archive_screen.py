#!/usr/bin/env python3
# КТ80 КТ81 — пълен доказателствен архивен предфилтър по ЕКАТТЕ.
# Без геометрии на землища/строителни граници НЕ издава „НЕ ПРЕСИЧА“.
import collections, csv, gzip, hashlib, json, pathlib, re, sys

BASE=pathlib.Path(__file__).resolve().parents[2]
INDEX=BASE/'v26-test/gis-data/pi-master/browser-index'
ADMIN=BASE/'v26-test/gis-data/pi-master/admin-ekatte-212-groups.json'
CSV=BASE/'v26-test/gis-data/pi-master/EKATTE_212_CODES_IN_USE.csv'
OUTPUT=BASE/'kt80/context_gis/ekatte_212_archive_screen.json'
EXPECTED={'parcels':917417,'zz':176553,'zt':2746,'codes':212,'parts':67}
def require(check,msg):
    if not check:raise ValueError('КТ81 БЛОКИРАНО: '+msg)

def classify(c):
    # Архивен предфилтър, не геометрично доказателство.
    if c['zz_pairs'] or c['zt_pairs']:return 'RECORDED_OVERLAP_SOMEWHERE_IN_EKATTE'
    return 'NO_RECORDED_PARCEL_OVERLAP_NOT_PROOF'

def administrative():
    mapdata=json.loads(ADMIN.read_text(encoding='utf8'))
    require(mapdata['province']=='Пловдив','област')
    mapping={}
    for municipality,codes in mapdata['municipalities'].items():
        for code in codes:
            require(re.fullmatch(r'\d{5}',code) and code not in mapping,'дублиран ЕКАТТЕ '+str(code))
            mapping[code]=municipality
    require(len(mapping)==EXPECTED['codes'],'212 ЕКАТТЕ непълни')
    with CSV.open(encoding='utf-8-sig',newline='') as f: table=list(csv.DictReader(f))
    catalog={}
    for row in table:
        code=row['ekatte_code']
        require(code in mapping and code not in catalog,'неизвестен/повторен ЕКАТТЕ '+code)
        catalog[code]=dict(ekatte=code,settlement=row['settlement_name_from_gis'],
                           municipality=mapping[code],province='Пловдив',
                           archived_parcel_count=int(row['parcel_count']),
                           parcels=0,zz_pairs=0,zt_pairs=0,
                           overlap_class='UNVERIFIED')
    require(len(catalog)==EXPECTED['codes'],'каталог ЕКАТТЕ непълен')
    return catalog

def aggregate():
    m=json.loads((INDEX/'manifest.json').read_text(encoding='utf8'))
    require(m['schema']=='kt77-pi-master-browser-v1' and m['status']=='VERIFIED','валидирана версия')
    require(len(m['parts'])==EXPECTED['parts'],'67 части')
    require(m['total_unique_parcels']==EXPECTED['parcels'] and m['zz_pairs']==EXPECTED['zz'] and m['zt_pairs']==EXPECTED['zt'],'декларирани суми')
    catalog=administrative();ids=set();by_prefix=set()
    for part in m['parts']:
        fname=part['file'];require(bool(re.fullmatch(r'pi-master-\d{2}\.json\.gz',fname)) and fname not in by_prefix,'дублиран сегмент '+fname)
        by_prefix.add(fname)
        blob=(INDEX/fname).read_bytes()
        require(hashlib.sha256(blob).hexdigest()==part['sha256'],'SHA256 '+fname)
        rows=json.loads(gzip.decompress(blob).decode('utf8'))
        require(isinstance(rows,list) and len(rows)==part['records'],'брой записи '+fname)
        for r in rows:
            cad=r.get('cadnum');require(isinstance(cad,str) and bool(re.fullmatch(r'\d{5}\.\d+\.\d+',cad)),'невалиден идентификатор')
            require(cad not in ids and cad[:2]==fname[10:12],'дублиран/погрешен идентификатор '+cad)
            ids.add(cad);code=cad[:5];require(code in catalog,'неизвестен ЕКАТТЕ '+code)
            require(r.get('municipality')==catalog[code]['municipality'] and r.get('province')=='Пловдив','несъответстващ административен профил '+cad)
            zz=r.get('zz');zt=r.get('zt')
            require(isinstance(zz,list) and isinstance(zt,list),'непълна пространствена структура '+cad)
            c=catalog[code];c['parcels']+=1;c['zz_pairs']+=len(zz);c['zt_pairs']+=len(zt)
    require(len(ids)==EXPECTED['parcels'] and len(by_prefix)==EXPECTED['parts'],'непълен архив')
    require(sum(c['zz_pairs'] for c in catalog.values())==EXPECTED['zz'],'суми ЗЗ')
    require(sum(c['zt_pairs'] for c in catalog.values())==EXPECTED['zt'],'суми ЗТ')
    for c in catalog.values():
        require(c['parcels']==c['archived_parcel_count'],'непълно землище/ЕKАТТЕ '+c['ekatte'])
        c['overlap_class']=classify(c)
        c['geometry_exclusion_proven']=False
        c['boundary_geometry_verified']=False
        c['zt_complete_polygon_layer_verified']=False
    result={'schema':'kt81-ekatte-archive-screen-v1','status':'ARCHIVE_COMPLETE_GEOMETRIC_EXCLUSION_NOT_VERIFIED',
      'source_manifest_sha256':hashlib.sha256((INDEX/'manifest.json').read_bytes()).hexdigest(),
      'provenance':'KT77 PI MASTER 67 verified gzip parts; KT78 municipality mapping; cadastral archive, not administrative geometries',
      'counts':dict(ekatte=len(catalog),parcels=len(ids),zz_pairs=EXPECTED['zz'],zt_pairs=EXPECTED['zt']),
      'evidence_rule':'НУЛА архивни пресичания НЕ означава доказано отсъствие на ЗЗ/ЗТ; териториалните граници и пълните ЗТ геометрии липсват.',
      'entries':[catalog[k] for k in sorted(catalog)]}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('КТ81 архивен предфилтър: PASS, ЕКАТТЕ',len(catalog),'ПИ',len(ids),'ЗЗ',EXPECTED['zz'],'ЗТ',EXPECTED['zt'])
    print('Категорично НЕ ПРЕСИЧА: 0 (липсват необходимите гранични слоеве)')
    return result

def selftest():
    require(classify({'zz_pairs':0,'zt_pairs':0})=='NO_RECORDED_PARCEL_OVERLAP_NOT_PROOF','безопасно отрицание')
    require(classify({'zz_pairs':1,'zt_pairs':0})=='RECORDED_OVERLAP_SOMEWHERE_IN_EKATTE','ЗЗ')
    require(classify({'zz_pairs':0,'zt_pairs':1})=='RECORDED_OVERLAP_SOMEWHERE_IN_EKATTE','ЗТ')
    require(len(administrative())==212,'административен индекс')
    print('КТ81 локални логически тестове PASS')

if __name__=='__main__':
    try:
        if '--selftest' in sys.argv:selftest()
        else:aggregate()
    except Exception as ex:
        print(str(ex),file=sys.stderr);sys.exit(1)
