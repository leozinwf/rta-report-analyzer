function text(value){if(!value)return"";if(typeof value==="string")return value;if(Array.isArray(value))return value.map(text).filter(Boolean).join(" ");if(typeof value==="object"){if(value.type==="text"&&typeof value.text==="string")return value.text;return text(value.content||[]);}return String(value||"");}
function dto(issue,baseUrl){const f=issue.fields||{};return{key:issue.key||"",summary:f.summary||"",status:f.status?.name||"",priority:f.priority?.name||"",assignee:f.assignee?.displayName||f.assignee?.name||"",description:text(f.description),created:f.created||"",updated:f.updated||"",issueType:f.issuetype?.name||"",url:issue.key?`${baseUrl}/browse/${issue.key}`:"",source:"tools"};}
function headers(user,password){return{Authorization:`Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,Accept:"application/json"};}
async function json(url,auth){const response=await fetch(url,{headers:auth});const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{};}catch{data={};}if(!response.ok){const detail=data?.errorMessages?.join(" ")||data?.message||`HTTP ${response.status}`;throw new Error(`Jira Tools recusou a consulta: ${detail}`);}return data;}
export default async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Método não permitido."});
 const baseUrl=String(process.env.JIRA_TOOLS_BASE_URL||"https://tools.dootax.com.br/jira").replace(/\/$/,"");
 const user=process.env.JIRA_TOOLS_USER||"";const password=process.env.JIRA_TOOLS_PASSWORD||"";const boardId=String(process.env.JIRA_TOOLS_BOARD_ID||"31");
 if(!user||!password)return res.status(503).json({error:"Jira Tools não configurado. Cadastre JIRA_TOOLS_USER e JIRA_TOOLS_PASSWORD na Vercel."});
 try{
  const auth=headers(user,password),issues=[];let startAt=0,total=0,pages=0;
  do{const params=new URLSearchParams({startAt:String(startAt),maxResults:"100",fields:"summary,status,priority,assignee,description,created,updated,issuetype"});const data=await json(`${baseUrl}/rest/agile/1.0/board/${boardId}/issue?${params}`,auth);const page=data.issues||[];issues.push(...page.map(issue=>dto(issue,baseUrl)));total=Number(data.total||issues.length);startAt+=page.length;pages++;if(!page.length)break;}while(startAt<total&&pages<50);
  return res.status(200).json({readOnly:true,source:"tools",boardId,count:issues.length,issues});
 }catch(error){return res.status(500).json({error:error instanceof Error?error.message:"Falha ao consultar Jira Tools."});}
}
