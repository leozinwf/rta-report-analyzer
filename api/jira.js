function adfToText(value){if(!value)return"";if(typeof value==="string")return value;if(Array.isArray(value))return value.map(adfToText).filter(Boolean).join(" ");if(typeof value==="object"){if(value.type==="text"&&typeof value.text==="string")return value.text;return adfToText(value.content||[]);}return"";}
function issueToDto(issue,baseUrl){const f=issue.fields||{};return{key:issue.key||"",summary:f.summary||"",status:f.status?.name||"",priority:f.priority?.name||"",assignee:f.assignee?.displayName||"",description:adfToText(f.description),created:f.created||"",updated:f.updated||"",issueType:f.issuetype?.name||"",url:issue.key?`${baseUrl}/browse/${issue.key}`:""};}
function authHeaders(email,token){return{Authorization:`Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,Accept:"application/json"};}
async function jiraJson(url,headers){const response=await fetch(url,{headers});const data=await response.json().catch(()=>({}));if(!response.ok){const detail=data?.errorMessages?.join(" ")||data?.message||`HTTP ${response.status}`;throw new Error(`Jira recusou a consulta: ${detail}`);}return data;}
async function searchIssues(baseUrl,headers,jql){const fields="summary,status,priority,assignee,description,created,updated,issuetype";const all=[];let nextPageToken="",pages=0;do{const params=new URLSearchParams({jql,fields,maxResults:"100"});if(nextPageToken)params.set("nextPageToken",nextPageToken);const data=await jiraJson(`${baseUrl}/rest/api/3/search/jql?${params}`,headers);all.push(...(data.issues||[]).map((issue)=>issueToDto(issue,baseUrl)));nextPageToken=data.nextPageToken||"";pages++;}while(nextPageToken&&pages<50);return all;}
async function getSprints(baseUrl,headers,boardId,state){const values=[];let startAt=0,isLast=false;do{const params=new URLSearchParams({startAt:String(startAt),maxResults:"50",state});const data=await jiraJson(`${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?${params}`,headers);values.push(...(data.values||[]));isLast=Boolean(data.isLast);startAt+=data.maxResults||50;}while(!isLast&&startAt<500);return values;}
export default async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Método não permitido."});
 const baseUrl=String(process.env.JIRA_BASE_URL||"").replace(/\/$/,"");const email=process.env.JIRA_EMAIL||"";const token=process.env.JIRA_API_TOKEN||"";const boardId=String(process.env.JIRA_BOARD_ID||"3");
 if(!baseUrl||!email||!token)return res.status(503).json({error:"Integração Jira não configurada na Vercel."});
 const mode=String((req.method==="POST"?req.body?.mode:req.query?.mode)||"days");const days=Math.min(180,Math.max(1,Number((req.method==="POST"?req.body?.days:req.query?.days)||30)||30));const headers=authHeaders(email,token);
 try{
  let jql="",period={mode,days};
  if(mode==="activeSprint"||mode==="lastSprint"){
   let sprints=await getSprints(baseUrl,headers,boardId,mode==="activeSprint"?"active":"closed");
   if(mode==="lastSprint")sprints=sprints.sort((a,b)=>new Date(b.completeDate||b.endDate||0)-new Date(a.completeDate||a.endDate||0));
   const sprint=sprints[0];
   if(sprint){jql=`project = DM AND sprint = ${sprint.id} ORDER BY updated DESC`;period={mode,days,sprint:{id:sprint.id,name:sprint.name,state:sprint.state,startDate:sprint.startDate,endDate:sprint.endDate,completeDate:sprint.completeDate}};}
   else{jql=`project = DM AND updated >= -${days}d ORDER BY updated DESC`;period={mode:"daysFallback",days,reason:"Nenhuma sprint encontrada; aplicado período por atualização."};}
  }else{jql=`project = DM AND updated >= -${days}d ORDER BY updated DESC`;}
  const issues=await searchIssues(baseUrl,headers,jql);return res.status(200).json({readOnly:true,jql,count:issues.length,issues,period});
 }catch(error){return res.status(500).json({error:error instanceof Error?error.message:"Falha ao consultar Jira."});}
}
