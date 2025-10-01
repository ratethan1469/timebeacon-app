import bcrypt from 'bcryptjs';

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    if (url.pathname === '/api/test') {
      return new Response(JSON.stringify({ 
        message: 'API is working!', 
        timestamp: new Date() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      try {
        const { email, password, name, company } = await request.json();

        if (!email || !password || !name) {
          return new Response(JSON.stringify({ message: 'All fields required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // For demo - create a success response
        const token = 'demo-token-' + Date.now();
        
        return new Response(JSON.stringify({
          success: true,
          token,
          user: {
            id: 'demo-' + Date.now(),
            email,
            name
          }
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({ message: 'Server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();

        if (!email || !password) {
          return new Response(JSON.stringify({ message: 'Email and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // For demo - create a success response
        const token = 'demo-token-' + Date.now();
        
        return new Response(JSON.stringify({
          success: true,
          token,
          user: {
            id: 'demo-' + Date.now(),
            email,
            name: email.split('@')[0]
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({ message: 'Server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};