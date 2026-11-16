/**
 * KT123 legal coverage inventory; NOT a replacement for exact law texts.
 * Every route identifies evidence families to inspect. "manual" is an explicit
 * limit on automation, never a license to infer an outcome from four statuses.
 * Legal text provenance: V11 verified corpus / exact article extracts.
 */
export const LEGAL_TESTS=Object.freeze([
 {id:"ZOOS_A1",law:"ЗООС",reference:"приложение № 1, чл. 92",required:["activity","scope","annexCategory","verifiedActVersion"],result:"A1"},
 {id:"ZOOS_A2",law:"ЗООС",reference:"приложение № 2, чл. 93",required:["activity","scope","annexCategory","verifiedActVersion"],result:"A2"},
 {id:"ZOOS_ART93",law:"ЗООС",reference:"чл. 93",required:["annexCategory","proposalType","procedureStatus"],result:"EIA_SCREENING"},
 {id:"OS_ART2_1",law:"Наредба за ОС",reference:"чл. 2, ал. 1",required:["proposalType","applicableCategory","actualLegalText","gis"],result:"OS1"},
 {id:"OS_ART2_2",law:"Наредба за ОС",reference:"чл. 2, ал. 2",required:["OS1_EXCLUDED","proposalType","actualLegalText"],result:"OS2"},
 {id:"OS_ART6A",law:"Наредба за ОС",reference:"чл. 6а",required:["competence","actualLegalText"],result:"OS_COMPETENCE"},
 {id:"ZBR_ART31",law:"ЗБР",reference:"чл. 31",required:["naturaStatus","effects","purpose","actualLegalText"],result:"OS_FURTHER"},
 {id:"OVOS_ART4_6",law:"Наредба за ОВОС",reference:"чл. 4–6",required:["notification","procedureStatus","actualLegalText"],result:"OVOS_ROUTE"},
 {id:"NEO_ART2_3",law:"Наредба за ЕО",reference:"чл. 2–3",required:["planOrProgram","actualLegalText","consultation"],result:"EO_ROUTE"},
 {id:"APK_CASE",law:"АПК",reference:"приложими разпоредби според вида производство",required:["proceduralStanding","competence","deadline","actualLegalText"],result:"ADMIN_ROUTE"}
]);
const routeType={1:"OS_NOTICE",2:"MISSING_FACT",3:"EXTERNAL_OPINION",4:"EIA_NOTICE",5:"OS_NOTICE",
 6:"OS_FORMAL_DECISION",7:"EIA_SCREENING_DECISION",8:"EIA_FINAL_DECISION",9:"TERMINATION",
 10:"EO_NOTICE",11:"EO_SCREENING_DECISION",12:"EO_OPINION",13:"EXPERT_REVIEW",
 14:"FILE_CHECK",15:"INDEPENDENT_GIS",16:"CASE_ARCHIVE",17:"COMPLAINT_REPLY",
 18:"SIGNAL_REPLY",19:"OBJECTION",20:"TRANSFER",21:"INSPECTION_NOTICE",22:"PROPOSAL_REPLY"};
const families={OS_NOTICE:["ZOOS_A1","ZOOS_A2","OS_ART2_1","OS_ART2_2","OS_ART6A","ZBR_ART31"],
 MISSING_FACT:["APK_CASE","ZOOS_A2","OS_ART2_1"],
 EXTERNAL_OPINION:["APK_CASE"],EIA_NOTICE:["ZOOS_A1","ZOOS_A2","ZOOS_ART93","OVOS_ART4_6"],
 OS_FORMAL_DECISION:["OS_ART2_1","ZBR_ART31","OS_ART6A"],
 EIA_SCREENING_DECISION:["ZOOS_ART93","OVOS_ART4_6"],EIA_FINAL_DECISION:["ZOOS_A1","OVOS_ART4_6"],
 TERMINATION:["APK_CASE"],EO_NOTICE:["NEO_ART2_3"],EO_SCREENING_DECISION:["NEO_ART2_3"],
 EO_OPINION:["NEO_ART2_3"],EXPERT_REVIEW:[],FILE_CHECK:[],INDEPENDENT_GIS:[],
 CASE_ARCHIVE:[],COMPLAINT_REPLY:["APK_CASE"],SIGNAL_REPLY:["APK_CASE"],
 OBJECTION:["APK_CASE"],TRANSFER:["APK_CASE"],INSPECTION_NOTICE:["APK_CASE"],
 PROPOSAL_REPLY:["APK_CASE"]};
export const ROUTE_PRECONDITIONS=Object.freeze(Object.fromEntries(
 Object.entries(routeType).map(([id,type])=>[Number(id),Object.freeze({type,legalTests:Object.freeze(families[type]||[]),
  requiresExpertConfirmation:type!=="INDEPENDENT_GIS",automaticFinalAct:false})])
));
export const MODEL_BOUNDARY=Object.freeze({
 invariant:"Няма издаване на административен акт без експерт, точна норма, доказателства и процедурни предпоставки.",
 covered:"Матрица от 4 статуса и 22 панела; 10 изрични правни проверки и източници от V11.",
 notClaimed:"Нито цялата съдебна практика, нито всеки граничен случай, нито актуализация извън проверения V11 архив са доказано изчерпани.",
 documentationOnly:true
});
