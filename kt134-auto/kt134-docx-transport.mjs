/**
 * КТ134 — стабилен пренос на действителен DOCX между защитения
 * автоматичен координатор и експертния финален екран.
 * Няма синтетично съдържание или клиентски токени.
 */
export function encodeKt134Docx(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 100)
    throw new Error('KT134_WORD_NOT_GENERATED');
  // Chunk lengths must be multiples of three: individual btoa outputs
  // may then be concatenated without internal '=' padding.
  const size=8190;
  const chunks=[];
  for(let p=0;p<bytes.length;p+=size){
    const slice=bytes.subarray(p,p+size);
    let binary='';
    for(let i=0;i<slice.length;i++)binary+=String.fromCharCode(slice[i]);
    chunks.push(btoa(binary));
  }
  return chunks.join('');
}
