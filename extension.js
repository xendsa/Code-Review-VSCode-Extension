// extension.js
const vscode = require('vscode');
const { Groq } = require('groq-sdk');
const { marked } = require('marked');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function activate(context) {
  let currentEditor = vscode.window.activeTextEditor;
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      currentEditor = editor;
    }
  }, null, context.subscriptions);

  const disposable = vscode.commands.registerCommand('code-review-assistant.runReview', async () => {
    const panel = vscode.window.createWebviewPanel(
      'codeReview',
      'Code Review Assistant',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const nonce = getNonce();
    panel.webview.html = getWebviewContent(panel.webview, nonce);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      try {
        if (message.command === 'runReview') {
          const model = message.model;
          const method = message.method;

          // Get the active editor code
          const editor = currentEditor || vscode.window.activeTextEditor;
          if (!editor) {
            panel.webview.postMessage({ command: 'error', text: 'Tidak ada editor aktif. Buka file yang ingin direview.' });
            return;
          }
          const selection = editor.selection;
          const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

          // Build prompt based on method
          const prompt = buildPrompt(method, code);

          // Read API key
          const apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) {
            panel.webview.postMessage({ command: 'error', text: 'GROQ_API_KEY belum diatur di .env' });
            return;
          }

          const groq = new Groq({ apiKey });

          panel.webview.postMessage({ command: 'status', text: 'Mengirim kode ke API untuk direview...' });

          // Call GROQ chat completion with chosen model
          const response = await groq.chat.completions.create({
            model: model || 'openai/gpt-oss-120b',
            messages: [
              { role: 'system', content: 'You are an expert code reviewer. Always format your responses clearly using Markdown headers, numbered lists, and tables for high readability. Explain outputs in Bahasa Indonesia.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
            max_tokens: 2000,
          });

          const reviewResult = response.choices?.[0]?.message?.content || 'No response received from model.';

          let suggestedCode = '';
          const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)```/;
          const match = codeBlockRegex.exec(reviewResult);
          if (match) {
            suggestedCode = match[1].trim();
          }

          const reviewResultHtml = marked.parse(reviewResult);

          panel.webview.postMessage({
            command: 'reviewResult',
            resultHtml: reviewResultHtml,
            suggestedCode: suggestedCode,
            originalCode: code
          });
        }
      } catch (err) {
        console.error(err);
        panel.webview.postMessage({ command: 'error', text: `Terjadi kesalahan: ${err.message || err}` });
      }
    }, undefined, context.subscriptions);
  });

  context.subscriptions.push(disposable);
}

function deactivate() { }

function buildPrompt(method, code) {
  const header = `Tolong review kode berikut ini. Berikan respons dalam format Markdown yang rapi dan terstruktur.\nPastikan kamu menggunakan:\n1. **Header** (misal: ## Ringkasan, ## Daftar Masalah, ## Saran Perbaikan)\n2. **Tabel** untuk menyajikan daftar masalah (disarankan format kolom: No, Masalah, Keparahan/Prioritas, Penjelasan Singkat).\n3. **Numbering / Bullet points** untuk detail penjelasan.\n4. **Blok kode** (fenced code block) untuk saran perbaikan kode.\n\nJawablah sepenuhnya dalam Bahasa Indonesia.\n\n`;
  let specifics = '';

  switch ((method || '').toLowerCase()) {
    case 'security':
      specifics = 'Fokus pada potensi kerentanan keamanan (injection, unsafe deserialization, improper auth, insecure dependencies), rekomendasi mitigasi, dan contoh perbaikan.';
      break;
    case 'performance':
      specifics = 'Fokus pada masalah performa: algoritma, kompleksitas, I/O blocking, memory leaks, dan rekomendasi optimasi.';
      break;
    case 'bug detection':
      specifics = 'Cari bug potensial, edge case yang tidak tertangani, condition race, dan rekomendasi test yang relevan.';
      break;
    case 'documentation & readability':
    case 'documentation':
    case 'docs':
      specifics = 'Fokus pada keterbacaan, penamaan, komentar, struktur fungsi, modularitas, dan saran perbaikan dokumentasi.';
      break;
    case 'clean code':
    default:
      specifics = 'Gunakan prinsip Clean Code: penamaan, single responsibility, ukuran fungsi, duplikasi, dan simple refactoring suggestions.';
      break;
  }

  return `${header}Task: ${specifics}\n\n---\n\nCode:\n\n${code}\n\n---\n\nSilakan berikan review kode sesuai dengan struktur dan format yang diminta di atas (menggunakan Header, Tabel, List, dan Blok Kode).`;
}

function getWebviewContent(webview, nonce) {
  const models = [
    { id: 'openai/gpt-oss-120b', label: 'GPT-OSS-120B (Default)' },
    { id: 'llama/llama-3-70b', label: 'Llama-3-70B' },
    { id: 'mixtral/mixtral-8x7b', label: 'Mixtral-8x7B' },
    { id: 'llama/llama-3-8b', label: 'Llama-3-8B' }
  ];

  const methods = [
    'Clean Code',
    'Security',
    'Performance',
    'Bug Detection',
    'Documentation'
  ];

  // Build options HTML
  const modelOptions = models.map(m => `<option value="${m.id}">${m.label}</option>`).join('\n');
  const methodOptions = methods.map(m => `<option value="${m}">${m}</option>`).join('\n');

  // Cyber Dark Tech CSS + minimal layout
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}'; connect-src https: http: data:;">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Code Review Assistant</title>
<style>
  :root{
    --bg:#0b0f14;
    --panel:#0f1720;
    --card:#0b1220;
    --muted:#9aa5b1;
    --accent:#00e6d3;
    --accent2:#7c4dff;
    --glow: 0 6px 20px rgba(124,77,255,0.12), 0 2px 6px rgba(0,230,211,0.06);
    --radius:12px;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace;
  }

  html,body{
    height:100%;
    margin:0;
    background: radial-gradient(1200px 400px at 10% 10%, rgba(124,77,255,0.06), transparent 6%),
                linear-gradient(180deg, rgba(2,6,23,1), rgba(8,12,18,1));
    color: #e6eef6;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    -webkit-font-smoothing:antialiased;
    padding:14px;
  }

  .header{
    display:flex;
    gap:12px;
    align-items:center;
    margin-bottom:14px;
  }
  .logo {
    width:46px; height:46px; border-radius:10px;
    background: linear-gradient(135deg,var(--accent2), var(--accent));
    box-shadow: var(--glow);
    display:flex; align-items:center; justify-content:center;
    font-weight:700; color:#051018;
  }
  h1{ font-size:16px; margin:0; }
  p.sub { margin:0; color:var(--muted); font-size:12px; }

  .controls {
    display:flex; gap:12px; align-items:center; margin-bottom:14px;
  }
  .card {
    background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: var(--radius);
    padding:14px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  }

  select, button {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--accent);
    padding:8px 10px;
    border-radius:8px;
    font-size:13px;
    min-width:160px;
    outline:none;
  }

  .btn-primary {
    background: linear-gradient(90deg,var(--accent2),var(--accent));
    color: #021018;
    font-weight:600;
    box-shadow: 0 6px 18px rgba(124,77,255,0.12);
  }

  .layout {
    display:grid;
    grid-template-columns: 1fr 420px;
    gap:14px;
    align-items:start;
  }

  .output {
    background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
    border-radius:10px;
    padding:12px;
    height: 66vh;
    overflow:auto;
    border: 1px solid rgba(255,255,255,0.03);
    font-size:13px;
  }

  .panel-right {
    min-height: 66vh;
    padding:12px;
    display:flex;
    flex-direction:column;
    gap:10px;
  }

  .section-title { font-size:12px; color:var(--muted); margin-bottom:6px; }

  pre.code {
    background: linear-gradient(180deg, rgba(8,10,12,0.6), rgba(10,14,18,0.6));
    padding:10px;
    border-radius:8px;
    overflow:auto;
    font-family: var(--mono);
    font-size:12px;
    line-height:1.45;
    border: 1px solid rgba(255,255,255,0.02);
  }

  .mini {
    display:flex; gap:8px; align-items:center;
  }

  .notice {
    color: var(--muted);
    font-size:12px;
    padding:8px;
    border-radius:8px;
    background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
    border: 1px solid rgba(255,255,255,0.02);
  }

  .actions { display:flex; gap:8px; align-items:center; }

  .chip {
    padding:6px 8px;
    font-size:12px;
    border-radius:999px;
    border: 1px solid rgba(255,255,255,0.03);
    color: var(--muted);
    background: transparent;
  }

  .result-summary { margin-bottom:10px; }

  .copy-btn {
    padding:6px 8px;
    border-radius:8px;
    border: none;
    cursor:pointer;
    font-size:12px;
  }

  footer { margin-top:12px; color:var(--muted); font-size:12px; }

  /* responsive */
  @media (max-width:1000px) {
    .layout { grid-template-columns: 1fr; }
    .panel-right { order: 2; }
  }

  /* Markdown styles */
  .output table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13px;
  }
  .output th, .output td {
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,0.06);
    text-align: left;
  }
  .output th {
    background: rgba(255,255,255,0.03);
    color: var(--accent);
    font-weight: 600;
  }
  .output tbody tr:hover {
    background: rgba(255,255,255,0.015);
  }
  .output ul, .output ol {
    padding-left: 20px;
    margin: 10px 0;
  }
  .output h1, .output h2, .output h3, .output h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    color: #fff;
    font-weight: 600;
  }
  .output code {
    background: rgba(255,255,255,0.08);
    padding: 2px 5px;
    border-radius: 4px;
    font-family: var(--mono);
    color: #e6eef6;
  }
  .output pre {
    background: linear-gradient(180deg, rgba(8,10,12,0.6), rgba(10,14,18,0.6)) !important;
    padding: 12px !important;
    border-radius: 8px !important;
    border: 1px solid rgba(255,255,255,0.03) !important;
    overflow-x: auto;
  }
  .output pre code {
    background: transparent;
    padding: 0;
  }
  .output blockquote {
    border-left: 4px solid var(--accent);
    margin: 12px 0;
    padding: 6px 12px;
    color: var(--muted);
    background: rgba(255,255,255,0.01);
    border-radius: 0 4px 4px 0;
  }
  .output a {
    color: var(--accent);
    text-decoration: none;
  }
  .output a:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">CRA</div>
    <div>
      <h1>Code Review Assistant</h1>
      <p class="sub">Cyber Dark Tech • Pilih model & metode lalu tekan Run Review</p>
    </div>
  </div>

  <div class="controls card">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div>
        <div class="section-title">Model</div>
        <select id="modelSelect">
          ${modelOptions}
        </select>
      </div>

      <div>
        <div class="section-title">Method</div>
        <select id="methodSelect">
          ${methodOptions}
        </select>
      </div>

      <div style="display:flex;align-items:center;">
        <div style="margin-right:8px" class="section-title">Action</div>
        <button id="runBtn" class="btn-primary">Run Review</button>
      </div>

      <div style="margin-left:auto" class="mini">
        <div class="chip">Theme: Cyber Dark</div>
        <div class="chip" id="statusChip">Idle</div>
      </div>
    </div>
  </div>

  <div class="layout">
    <div class="card output" id="output">
      <div id="intro" class="notice">Hasil review akan tampil di sini. Gunakan selection di editor untuk mereview sebagian kode, atau buka file dan biarkan kosong untuk mereview seluruh file.</div>
      <div id="resultArea"></div>
    </div>

    <div class="panel-right">
      <div class="card">
        <div class="section-title">Preview & Actions</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div>
            <div class="section-title">Suggested Code</div>
            <pre id="suggested" class="code">—</pre>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="copy-btn" id="copySuggested">Copy Suggested</button>
              <button class="copy-btn" id="saveSuggested">Save as file</button>
            </div>
          </div>

          <div>
            <div class="section-title">Original Code</div>
            <pre id="original" class="code">—</pre>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="copy-btn" id="copyOriginal">Copy Original</button>
            </div>
          </div>

        </div>
      </div>

      <div class="card">
        <div class="section-title">Tips</div>
        <div style="color:var(--muted);font-size:13px">
          • Pilih model sesuai kebutuhan (lebih besar -> lebih akurat & mahal).<br>
          • Untuk review cepat pakai Llama-3-8B / Mixtral. Untuk analisis mendalam pakai Llama-3-70B / GPT-OSS-120B.<br>
          • Jika hasil mengandung blok kode, akan otomatis diekstrak ke Suggested Code.
        </div>
        <footer>Built for your thesis — keep iterating 🔧</footer>
      </div>
    </div>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  const runBtn = document.getElementById('runBtn');
  const modelSelect = document.getElementById('modelSelect');
  const methodSelect = document.getElementById('methodSelect');
  const statusChip = document.getElementById('statusChip');
  const resultArea = document.getElementById('resultArea');
  const suggested = document.getElementById('suggested');
  const original = document.getElementById('original');
  const copySuggested = document.getElementById('copySuggested');
  const copyOriginal = document.getElementById('copyOriginal');
  const saveSuggested = document.getElementById('saveSuggested');

  runBtn.addEventListener('click', () => {
    const model = modelSelect.value;
    const method = methodSelect.value;
    statusChip.innerText = 'Running...';
    vscode.postMessage({ command: 'runReview', model, method });
  });

  copySuggested.addEventListener('click', () => {
    navigator.clipboard.writeText(suggested.innerText).then(() => {
      statusChip.innerText = 'Suggested copied';
      setTimeout(()=> statusChip.innerText = 'Idle', 1500);
    });
  });

  copyOriginal.addEventListener('click', () => {
    navigator.clipboard.writeText(original.innerText).then(() => {
      statusChip.innerText = 'Original copied';
      setTimeout(()=> statusChip.innerText = 'Idle', 1500);
    });
  });

  saveSuggested.addEventListener('click', () => {
    vscode.postMessage({ command: 'saveSuggested', content: suggested.innerText || '' });
  });

  // When messages come from extension
  window.addEventListener('message', event => {
    const msg = event.data;
    if (!msg) return;
    switch(msg.command) {
      case 'status':
        statusChip.innerText = msg.text || '...';
        break;
      case 'error':
        statusChip.innerText = 'Error';
        resultArea.innerHTML = '<div style="color:#ff6b6b;margin-bottom:10px;">'+escapeHtml(msg.text)+'</div>';
        break;
      case 'reviewResult':
        statusChip.innerText = 'Done';
        resultArea.innerHTML = msg.resultHtml || '';
        suggested.innerText = msg.suggestedCode || '—';
        original.innerText = msg.originalCode || '—';
        break;
    }
  });

  // Escape util
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // send save request handler
  window.addEventListener('message', () => {}); // noop to ensure handler exists

</script>
</body>
</html>`;
}

// Utility: create a short nonce
function getNonce() {
  return (Math.random().toString(36).slice(2, 12));
}

module.exports = {
  activate,
  deactivate,
};
