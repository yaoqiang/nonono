import { onRequestGet as __api_drinks_ts_onRequestGet } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/drinks.ts"
import { onRequestPost as __api_drinks_ts_onRequestPost } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/drinks.ts"
import { onRequest as __api__middleware_ts_onRequest } from "/Users/yaoqiang/Workspace/Code/angyee/nonono/functions/api/_middleware.ts"

export const routes = [
    {
      routePath: "/api/drinks",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_drinks_ts_onRequestGet],
    },
  {
      routePath: "/api/drinks",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_drinks_ts_onRequestPost],
    },
  {
      routePath: "/api",
      mountPath: "/api",
      method: "",
      middlewares: [__api__middleware_ts_onRequest],
      modules: [],
    },
  ]