function adfToText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(adfToText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    if (value.type === "text" && typeof value.text === "string") return value.text;
    return adfToText(value.content || []);
  }
  return "";
}
function issueToDto(issue, baseUrl) { const f=issue.fields||{}; return { key:issue.key||"", summary:f.summary||"", status:f.status?.name||"", priority:f.priority?.name||"", assignee:f.assignee?.displayName||"", description:adfToText(f.description), created:f.created||"", updated:f.updated||"", issueType:f.issuetype?.name||"", url:issue.key?`${baseUrl}/browse/${issue.key}`:"" }; }
export default async function handler(req,res) {
  if(req.method!=="POST") return res.status(405).json({error:"Método não permitido."});
  const { baseUrl:rawBaseUrl, email, token, jql:rawJql }=req.body||{};
  const baseUrl=String(rawBaseUrl||"").replace(/\/$/,""); const jql=String(rawJql||"project = DM ORDER BY updated DESC");
  if(!/^https:\/\/[a-z0-9.-]+\.atlassian\.net$/i.test(baseUrl)) return res.status(400).json({error:"Informe uma URL Jira Cloud válida (*.atlassian.net)."});
  if(!email||!token) return res.status(400).json({error:"Informe e-mail e API token do Jira."});
  try {
    const auth=Buffer.from(`${email}:${token}`).toString("base64"); const fields="summary,status,priority,assignee,description,created,updated,issuetype"; const allIssues=[]; let nextPageToken=""; let pages=0;
    do { const params=new URLSearchParams({jql,fields,maxResults:"100"}); if(nextPageToken)params.set("nextPageToken",nextPageToken); const response=await fetch(`${baseUrl}/rest/api/3/search/jql?${params}`,{headers:{Authorization:`Basic ${auth}`,Accept:"application/json"}}); const data=await response.json().catch(()=>({})); if(!response.ok){const detail=data?.errorMessages?.join(" ")||data?.message||`HTTP ${response.status}`; return res.status(response.status).json({error:`Jira recusou a consulta: ${detail}`});} allIssues.push(...(data.issues||[]).map((issue)=>issueToDto(issue,baseUrl))); nextPageToken=data.nextPageToken||""; pages++; } while(nextPageToken&&pages<50);
    return res.status(200).json({readOnly:true,jql,count:allIssues.length,issues:allIssues});
  } catch(error){ return res.status(500).json({error:error instanceof Error?error.message:"Falha ao consultar Jira."}); }
}
