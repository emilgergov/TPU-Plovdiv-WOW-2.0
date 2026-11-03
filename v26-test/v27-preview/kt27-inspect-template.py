from docx import Document
p='v26-test/templates/V26_3_Obrazec_A.docx'
d=Document(p)
for i, par in enumerate(d.paragraphs):
    t=par.text.replace('\n',' / ').replace('\t',' [TAB] ')
    print(f'{i:02d} | {t[:400]}')
print('HEADERS',len(d.sections),[x.text[:80] for x in d.sections[0].header.paragraphs])
print('FOOTERS',[x.text[:80] for x in d.sections[0].footer.paragraphs])
