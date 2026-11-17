// No alias rewriting: a signed mailbox must match the invitation exactly,
// apart from ASCII case. This validator never reads browser identity headers.
export const normalizeKT125Email=v=>typeof v==='string'&&v.length<=254&&v===v.trim()&&!v.includes('*')&&
 /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(v)
 ?v.toLowerCase():null;
