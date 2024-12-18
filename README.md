# code-review-assistant README

This is the README for the **code-review-assistant** Visual Studio Code extension. This extension assists developers by reviewing their code and providing feedback directly in VS Code. The extension integrates with the GROQ API to send the selected code to a review system and display the result within a webview panel.

## Features

- **Code Review**: Sends the selected code or entire document to a code review system.
- **Inline Feedback**: Displays the review feedback in a webview panel with the original code.
- **Copy Code**: Allows you to easily copy the original code to the clipboard from the webview.
- **Notifications**: Displays a success notification when the code is successfully copied to the clipboard.

> Tip: This extension uses the GROQ API for code review feedback. Make sure to configure the API key in a `.env` file.

## Requirements

This extension has the following requirements:

- **Node.js**: Make sure Node.js is installed on your system.
- **GROQ API Key**: The extension requires a valid API key for the GROQ API. Add the key to the `.env` file in the root directory of your project with the following format:
  

To install the dependencies, run:

```bash
npm install

Extension Settings
This extension does not add any custom settings via the contributes.configuration extension point.

Known Issues
The extension requires an active internet connection to call the GROQ API and retrieve code review feedback.
The webview for displaying the feedback may not render properly if the GROQ_API_KEY is not set correctly.
Release Notes
1.0.0
Initial release of the code-review-assistant extension, featuring code review feedback integration via the GROQ API.
1.0.1
Fixed issue with missing feedback when API key is not set.
1.1.0
Added copy-to-clipboard functionality to easily copy the original code.
Improved error handling and notifications for failed API requests.
Working with Markdown
You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

Split the editor (Cmd+\ on macOS or Ctrl+\ on Windows and Linux)
Toggle preview (Shift+Cmd+V on macOS or Shift+Ctrl+V on Windows and Linux)
Press Ctrl+Space (Windows, Linux, macOS) to see a list of Markdown snippets
For more information
Visual Studio Code's Markdown Support
Markdown Syntax Reference