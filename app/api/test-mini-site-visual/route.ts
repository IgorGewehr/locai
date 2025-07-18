/**
 * Página de teste visual para debug do mini-site
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || 'default-tenant';
  const origin = new URL(request.url).origin;
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Mini-Site - ${tenantId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .section {
            padding: 30px;
            border-bottom: 1px solid #f0f0f0;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section h2 {
            color: #667eea;
            margin-top: 0;
            font-size: 1.8em;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            margin: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.2s;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .button.secondary {
            background: #f8f9fa;
            color: #667eea;
            border: 2px solid #667eea;
        }
        .button.danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        }
        .button.success {
            background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
        }
        .info-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }
        .info-box.success {
            background: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        .info-box.error {
            background: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
        }
        .info-box.warning {
            background: #fff3cd;
            border-color: #ffeaa7;
            color: #856404;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .card h3 {
            margin-top: 0;
            color: #667eea;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
            margin-left: 10px;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
        }
        .status.warning {
            background: #fff3cd;
            color: #856404;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #667eea;
        }
        .code {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            white-space: pre-wrap;
            overflow-x: auto;
            margin: 10px 0;
        }
        .url-box {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: monospace;
            word-break: break-all;
            color: #1976d2;
        }
        .actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }
            .section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Debug Mini-Site</h1>
            <p>Tenant ID: <strong>${tenantId}</strong></p>
        </div>
        
        <div class="section">
            <h2>📋 Status do Sistema</h2>
            <div id="status-loading" class="loading">
                🔄 Carregando informações do sistema...
            </div>
            <div id="status-content" style="display: none;"></div>
        </div>
        
        <div class="section">
            <h2>🔧 Ações Rápidas</h2>
            <div class="actions">
                <button class="button" onclick="debugComplete()">🔍 Debug Completo</button>
                <button class="button success" onclick="fixAuto()">🔧 Correção Automática</button>
                <button class="button secondary" onclick="openMiniSite()">🌐 Abrir Mini-Site</button>
                <button class="button secondary" onclick="openDashboard()">📊 Dashboard</button>
            </div>
        </div>
        
        <div class="section">
            <h2>🌐 Links Importantes</h2>
            <div class="grid">
                <div class="card">
                    <h3>Mini-Site Público</h3>
                    <div class="url-box">${origin}/site/${tenantId}</div>
                    <button class="button" onclick="testUrl('${origin}/site/${tenantId}')">Testar</button>
                </div>
                <div class="card">
                    <h3>Dashboard Mini-Site</h3>
                    <div class="url-box">${origin}/dashboard/mini-site</div>
                    <button class="button" onclick="testUrl('${origin}/dashboard/mini-site')">Testar</button>
                </div>
                <div class="card">
                    <h3>API do Mini-Site</h3>
                    <div class="url-box">${origin}/api/mini-site/${tenantId}</div>
                    <button class="button" onclick="testUrl('${origin}/api/mini-site/${tenantId}')">Testar</button>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Resultados dos Testes</h2>
            <div id="results-content"></div>
        </div>
    </div>

    <script>
        const tenantId = '${tenantId}';
        const origin = '${origin}';
        
        // Função para debug completo
        async function debugComplete() {
            showLoading('Executando debug completo...');
            try {
                const response = await fetch(\`\${origin}/api/debug-mini-site-complete?tenantId=\${tenantId}\`);
                const data = await response.json();
                showResults('Debug Completo', data);
            } catch (error) {
                showError('Erro no debug completo', error);
            }
        }
        
        // Função para correção automática
        async function fixAuto() {
            showLoading('Executando correção automática...');
            try {
                const response = await fetch(\`\${origin}/api/fix-mini-site-auto\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenantId })
                });
                const data = await response.json();
                showResults('Correção Automática', data);
                
                // Recarregar status após correção
                setTimeout(() => {
                    loadStatus();
                }, 2000);
            } catch (error) {
                showError('Erro na correção automática', error);
            }
        }
        
        // Função para abrir mini-site
        function openMiniSite() {
            window.open(\`\${origin}/site/\${tenantId}\`, '_blank');
        }
        
        // Função para abrir dashboard
        function openDashboard() {
            window.open(\`\${origin}/dashboard/mini-site\`, '_blank');
        }
        
        // Função para testar URL
        async function testUrl(url) {
            showLoading(\`Testando \${url}...\`);
            try {
                const response = await fetch(url);
                const data = await response.text();
                showResults(\`Teste de URL: \${url}\`, {
                    success: response.ok,
                    status: response.status,
                    size: data.length,
                    preview: data.substring(0, 500) + '...'
                });
            } catch (error) {
                showError(\`Erro ao testar \${url}\`, error);
            }
        }
        
        // Função para mostrar loading
        function showLoading(message) {
            const content = document.getElementById('results-content');
            content.innerHTML = \`<div class="loading">\${message}</div>\`;
        }
        
        // Função para mostrar resultados
        function showResults(title, data) {
            const content = document.getElementById('results-content');
            content.innerHTML = \`
                <h3>\${title}</h3>
                <div class="info-box \${data.success ? 'success' : 'error'}">
                    <strong>Status:</strong> \${data.success ? '✅ Sucesso' : '❌ Erro'}
                </div>
                <div class="code">\${JSON.stringify(data, null, 2)}</div>
            \`;
        }
        
        // Função para mostrar erro
        function showError(title, error) {
            const content = document.getElementById('results-content');
            content.innerHTML = \`
                <h3>\${title}</h3>
                <div class="info-box error">
                    <strong>Erro:</strong> \${error.message || error}
                </div>
            \`;
        }
        
        // Função para carregar status
        async function loadStatus() {
            try {
                const response = await fetch(\`\${origin}/api/debug-mini-site-complete?tenantId=\${tenantId}\`);
                const data = await response.json();
                
                const statusContent = document.getElementById('status-content');
                const statusLoading = document.getElementById('status-loading');
                
                statusLoading.style.display = 'none';
                statusContent.style.display = 'block';
                
                const statusClass = data.success ? 'success' : 'error';
                statusContent.innerHTML = \`
                    <div class="info-box \${statusClass}">
                        <strong>Status Geral:</strong> \${data.summary?.status || 'Desconhecido'}
                        <span class="status \${statusClass}">\${data.summary?.issues || 0} problemas</span>
                    </div>
                    \${data.summary?.issuesList?.length > 0 ? 
                        '<div class="info-box warning"><strong>Problemas:</strong><ul>' + 
                        data.summary.issuesList.map(issue => '<li>' + issue + '</li>').join('') + 
                        '</ul></div>' : ''
                    }
                    \${data.summary?.solutionsList?.length > 0 ? 
                        '<div class="info-box success"><strong>Soluções:</strong><ul>' + 
                        data.summary.solutionsList.map(solution => '<li>' + solution + '</li>').join('') + 
                        '</ul></div>' : ''
                    }
                \`;
            } catch (error) {
                const statusContent = document.getElementById('status-content');
                const statusLoading = document.getElementById('status-loading');
                
                statusLoading.style.display = 'none';
                statusContent.style.display = 'block';
                statusContent.innerHTML = \`
                    <div class="info-box error">
                        <strong>Erro ao carregar status:</strong> \${error.message}
                    </div>
                \`;
            }
        }
        
        // Carregar status inicialmente
        loadStatus();
    </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}