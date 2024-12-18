const vscode = require('vscode');
const { Groq } = require("groq-sdk");
require('dotenv').config({ path: __dirname + '/.env' });

console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY); // Debug variabel

function activate(context) {
    let disposable = vscode.commands.registerCommand('code-review-assistant.runReview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Tidak ada editor aktif!');
            return;
        }

        // Memeriksa apakah ada teks yang dipilih
        const selection = editor.selection;
        let code;
        if (selection.isEmpty) {
            // Jika tidak ada teks yang dipilih, ambil seluruh dokumen
            code = editor.document.getText();
        } else {
            // Jika ada teks yang dipilih, ambil hanya teks yang diseleksi
            code = editor.document.getText(selection);
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            vscode.window.showErrorMessage('API Key GROQ belum diatur di file .env');
            return;
        }

        const groq = new Groq({ apiKey });

        try {
            vscode.window.showInformationMessage('Sending the code to review...');

            const response = await groq.chat.completions.create({
                model: 'mixtral-8x7b-32768',
                messages: [
                    { role: 'system', content: 'You are an expert code reviewer.' },
                    { role: 'user', content: `Please review the following code:\n\n${code}` }, // Memperbaiki interpolasi string
                ],
            });

            const reviewResult = response.choices[0]?.message?.content || 'No response received.';

            // Membuat Webview untuk output
            const panel = vscode.window.createWebviewPanel(
                'codeReview', // ID Webview
                'Code Review Output', // Judul Tab
                vscode.ViewColumn.One, // Lokasi Webview
                { enableScripts: true } // Mengizinkan JavaScript di Webview
            );

            // Konten HTML untuk Webview
            panel.webview.html = getWebviewContent(reviewResult, code);

            vscode.window.showInformationMessage('Code Review selesai! Lihat di tab output.');
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`Terjadi kesalahan: ${error.message}`); // Memperbaiki error handling
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(reviewResult, code) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Review Output</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 10px;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
            }
            h1 {
                color: #007acc;
            }
            .review-box {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #e8f5e9;
                border-left: 4px solid #4caf50;
                border-radius: 5px;
                white-space: pre-wrap;
            }
            .code-container {
                margin-top: 20px;
                position: relative;
                background: #1e1e1e;
                color: #d4d4d4;
                border-radius: 5px;
                overflow-x: auto;
                font-family: monospace;
                padding: 15px;
            }
            .code-box {
                white-space: pre-wrap;
                margin: 0;
            }
            .copy-button {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #007acc;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            .copy-button:hover {
                background: #005a9e;
            }
            .notification {
                display: none;
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #007acc;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                animation: fadeOut 3s forwards;
            }
            @keyframes fadeOut {
                0% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; display: none; }
            }
        </style>
    </head>
    <body>
        <h1>Code Review Summary</h1>
        
        <div class="review-box">
            <p>${reviewResult.replace(/\n/g, '<br>')}</p>
        </div>
        
        <h1>Original Code</h1>
        
        <div class="code-container">
            <button class="copy-button" onclick="copyToClipboard()">Copy Code</button>
            <div class="code-box" id="codeBlock">${code}</div>
        </div>

        <div class="notification" id="copyNotification">Code Copied!</div>

        <script>
            function copyToClipboard() {
                const codeBlock = document.getElementById('codeBlock').innerText;
                navigator.clipboard.writeText(codeBlock).then(() => {
                    const notification = document.getElementById('copyNotification');
                    notification.style.display = 'block';
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 3000);
                }, (err) => {
                    alert('Gagal menyalin kode: ' + err);
                });
            }
        </script>
    </body>
    </html>`;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
