const vscode = require('vscode');
const { Groq } = require("groq-sdk");
require('dotenv').config({ path: __dirname + '/.env' });

function activate(context) {
    let disposable = vscode.commands.registerCommand('code-review-assistant.runReview', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Tidak ada editor aktif!');
            return;
        }

        const selection = editor.selection;
        let code;
        if (selection.isEmpty) {
            code = editor.document.getText();
        } else {
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
                    { role: 'user', content: `Please review the following code:\n\n${code}` },
                ],
            });

            const reviewResult = response.choices[0]?.message?.content || 'No response received.';

            const panel = vscode.window.createWebviewPanel(
                'codeReview',
                'Code Review Output',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = getWebviewContent(reviewResult, code);

            vscode.window.showInformationMessage('Code Review selesai! Lihat di tab output.');
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`Terjadi kesalahan: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(reviewResult, code) {
    const { processedReview, suggestedCode } = processReviewText(reviewResult);

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
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #007acc;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-size: 14px;
                z-index: 1000;
                animation: fadeInOut 3s ease-in-out;
            }
            .notification.error {
                background-color: #d32f2f;
            }
            @keyframes fadeInOut {
                0% {
                    opacity: 0;
                    transform: translateY(20px);
                }
                10%, 90% {
                    opacity: 1;
                    transform: translateY(0);
                }
                100% {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }
        </style>
    </head>
    <body>
        <h1>Code Review Summary</h1>
        <div class="review-box">
            ${processedReview}
        </div>
        
        <h1>Suggested Code</h1>
        <div class="code-container">
            <button class="copy-button" onclick="copyToClipboard('suggestedCode')">Copy Code</button>
            <div class="code-box" id="suggestedCode">${suggestedCode}</div>
        </div>

        <h1>Original Code</h1>
        <div class="code-container">
            <button class="copy-button" onclick="copyToClipboard('originalCode')">Copy Code</button>
            <div class="code-box" id="originalCode">${code}</div>
        </div>

        <script>
            function copyToClipboard(elementId) {
                const codeBlock = document.getElementById(elementId).innerText;
                navigator.clipboard.writeText(codeBlock).then(() => {
                    showNotification('Code copied to clipboard!');
                }, (err) => {
                    showNotification('Failed to copy code: ' + err, true);
                });
            }

            function showNotification(message, isError = false) {
                const notification = document.createElement('div');
                notification.innerText = message;
                notification.className = \`notification \${isError ? 'error' : 'success'}\`;

                document.body.appendChild(notification);

                // Remove the notification after 3 seconds
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            }
        </script>
    </body>
    </html>`;
}


function processReviewText(reviewText) {
    const lines = reviewText.split('\n');
    let processedReview = '';
    let suggestedCode = '';
    let inCodeBlock = false;

    lines.forEach(line => {
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
        } else if (inCodeBlock) {
            suggestedCode += `${line}\n`;
        } else {
            processedReview += `${line}<br>`;
        }
    });

    // Trim extra line breaks for cleaner output
    processedReview = processedReview.trim();
    suggestedCode = suggestedCode.trim();

    return { processedReview, suggestedCode };
}


function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
