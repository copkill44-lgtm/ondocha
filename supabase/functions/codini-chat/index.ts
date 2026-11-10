import { createChatHandler } from "./handler.ts";
Deno.serve(createChatHandler({env: name => Deno.env.get(name), fetch, now: () => Date.now()}));
