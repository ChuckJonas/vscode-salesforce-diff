'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextEditor } from 'vscode';
import {core } from '@salesforce/command';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "salesforce-diff" is now active!');

    vscode.workspace.registerTextDocumentContentProvider('salesforce', {
        /**
		 * Provide salesforce textual content for a given uri.
		 *
		 * The editor will use the returned string-content to create a readonly
		 * [document](#TextDocument). Resources allocated should be released when
		 * the corresponding document has been [closed](#workspace.onDidCloseTextDocument).
		 *
		 * @param uri An uri which scheme matches the scheme this provider was [registered](#workspace.registerTextDocumentContentProvider) for.
		 * @param token A cancellation token.
		 * @return A string or a thenable that resolves to such.
		 */
		async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken){
            return new Promise<string>(async (resolve, reject) => {
                try{
                    let dir = __dirname;
                    process.chdir(vscode.workspace.rootPath);
                    let org = await core.Org.create({});
                    let conn = org.getConnection();
                    process.chdir(dir);
                    let result = await conn.tooling.query<{Body:string}>(
                        `SELECT Name, Body FROM ApexClass WHERE Name = '${path.basename(uri.fsPath,'.cls')}'`
                    );
                    if(result.done && result.records){
                        resolve(result.records[0].Body);
                    }else{
                        reject(new Error('Could not find source!'));
                    }
                }catch(e){
                    reject(e);
                }
            });
        }
    })

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerTextEditorCommand('extension.diffApexClass', async (textEditor: TextEditor) => {
        let fileName = path.basename(textEditor.document.uri.fsPath,'.cls');
        await vscode.commands.executeCommand(
            'vscode.diff',
            textEditor.document.uri,
            vscode.Uri.parse(`salesforce://${textEditor.document.uri.fsPath}`),
            `${fileName} Local vs. Salesforce`
        );
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}