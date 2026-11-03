from docx import Document
from docx.enum.text import WD_COLOR_INDEX
for mode in "AB":
    p=f'v26-test/templates/V26_3_Obrazec_{mode}.docx'
    d=Document(p)
    print("\n==== TEMPLATE",mode,"PARAGRAPHS",len(d.paragraphs),"====")
    for i,par in enumerate(d.paragraphs):
        if i not in ([5,6,7,10,13,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33] if mode=="A" else [5,6,7,9,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33]):
            continue
        t=par.text.replace('\n',' / ')
        print(f"PARA {i} text={t[:350]!r}")
        for j,run in enumerate(par.runs):
            s=run.text.replace('\n',' / ')
            if not s.strip():continue
            hl=run.font.highlight_color
            color=run.font.color
            print(f"  run{j} highlight={str(hl)} bold={run.bold} italic={run.italic} text={s[:180]!r}")
    print("END TEMPLATE",mode)
