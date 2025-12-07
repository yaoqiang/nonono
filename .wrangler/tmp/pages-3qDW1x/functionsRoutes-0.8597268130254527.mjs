import { onRequestGet as __api_agent_ts_onRequestGet } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/agent.ts"
import { onRequestOptions as __api_agent_ts_onRequestOptions } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/agent.ts"
import { onRequestPost as __api_agent_ts_onRequestPost } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/agent.ts"
import { onRequest as __api__middleware_ts_onRequest } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/_middleware.ts"

export const routes = [
    {
      routePath: "/api/agent",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_agent_ts_onRequestGet],
    },
  {
      routePath: "/api/agent",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_agent_ts_onRequestOptions],
    },
  {
      routePath: "/api/agent",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_agent_ts_onRequestPost],
    },
  {
      routePath: "/api",
      mountPath: "/api",
      method: "",
      middlewares: [__api__middleware_ts_onRequest],
      modules: [],
    },
  ]