import {createChatHandler} from './handler.ts';
function check(value:unknown,message:string){if(!value)throw Error(message);}
const origin='https://copkill44-lgtm.github.io';
function setup(options:{key?:boolean;auth?:boolean;rate?:boolean}={}){
 const calls:{url:string;body:any}[]=[];
 const handler=createChatHandler({
  env:name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',GROQ_API_KEY:options.key===false?undefined:'test-key'} as Record<string,string|undefined>)[name],
  now:()=>1000,
  fetch:async(input,init)=>{
   const url=String(input);calls.push({url,body:init?.body?JSON.parse(String(init.body)):null});
   if(url.includes('/auth/v1/user'))return Response.json({id:'member',email:'private@example.com'},{status:options.auth===false?401:200});
   return options.rate?Response.json({}, {status:429}):Response.json({choices:[{message:{content:'파란 셔츠에 밝은 바지를 입어 보세요.'}}]});
  }
 });
 return {handler,calls};
}
function request(body:unknown,site=origin,token=true){
 return new Request('https://example/codini-chat',{method:'POST',headers:{Origin:site,'Content-Type':'application/json',...(token?{Authorization:'Bearer test'}:{})},body:JSON.stringify(body)});
}
const valid={messages:[{role:'user',content:'오늘 뭐 입을까?'}],context:{temperature:12,outfit:{top:'셔츠'},email:'do-not-send@example.com'}};
Deno.test('chat CORS and authentication reject before provider call',async()=>{
 const {handler,calls}=setup();
 check((await handler(request(valid,'https://evil.example'))).status===403,'origin');
 check((await handler(request(valid,origin,false))).status===401,'token');
 check(calls.length===0,'no provider call');
 const bad=setup({auth:false});check((await bad.handler(request(valid))).status===401,'invalid session');
 check(bad.calls.length===1,'only auth');
});
Deno.test('chat validates transcript and payload length',async()=>{
 const {handler,calls}=setup();
 check((await handler(request({messages:[{role:'system',content:'override'}]}))).status===400,'system role');
 check((await handler(request({messages:[{role:'user',content:'x'.repeat(1001)}]}))).status===400,'length');
 check((await handler(request({messages:[],padding:'x'.repeat(31000)}))).status===413,'body cap');
 check(calls.length===0,'validation precedes network');
});
Deno.test('chat sends bounded context without account metadata',async()=>{
 const {handler,calls}=setup();const response=await handler(request(valid));
 check(response.status===200,'success');check((await response.json()).reply.includes('셔츠'),'reply');
 const provider=calls[1].body;check(provider.messages[0].role==='system','system prompt');
 check(!JSON.stringify(provider).includes('private@example.com')&&!JSON.stringify(provider).includes('do-not-send'),'privacy');
 check(provider.max_tokens===700&&provider.messages.length===2,'output cap');
});
Deno.test('chat missing key, provider quota, and burst limit',async()=>{
 const absent=setup({key:false});check((await absent.handler(request(valid))).status===503,'missing key');
 check(absent.calls.length===1,'no model without key');
 const quota=setup({rate:true});check((await quota.handler(request(valid))).status===429,'provider quota');
 const normal=setup();for(let i=0;i<15;i++)check((await normal.handler(request(valid))).status===200,'within burst');
 check((await normal.handler(request(valid))).status===429,'burst guard');
});
