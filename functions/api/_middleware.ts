/**
 * Middleware for Cloudflare Pages Functions
 * 处理 CORS 和错误
 */

// 轻量 Env 类型占位，后续如果需要可以在这里扩展绑定类型
type Env = {
  ENVIRONMENT?: string;
  DRINKS?: KVNamespace;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  // 处理 CORS 预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const response = await context.next();
    
    // 添加 CORS 头
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
