'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextEditor } from 'vscode';
import { Aliases, Org } from '@salesforce/core'
import * as path from 'path';
import { SalesforceTextDocumentProvider } from './salesforceTextDocumentProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    vscode.workspace.registerTextDocumentContentProvider('salesforce', new SalesforceTextDocumentProvider(vscode.window.createOutputChannel('salesforce-diff'), context.storagePath));

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.diffSelectOrg', async (textEditor: TextEditor) => {
        let user = await getOrgSelection();
        openDiff(textEditor, user);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand('extension.diffDefaultOrg', async (textEditor: TextEditor) => {
        let user = await getDefaultUser();
        openDiff(textEditor, user);
    }));

    const openDiff = async (textEditor: TextEditor, user: string) => {
        let fileName = path.basename(textEditor.document.uri.fsPath, '.cls');
        await vscode.commands.executeCommand(
            'vscode.diff',
            textEditor.document.uri,
            vscode.Uri.parse(`salesforce://${textEditor.document.uri.fsPath}#${user}`),
            `${fileName}: Local <-> ${user}`
        );
    }

    const getOrgSelection = async () => {
        let aliases = await Aliases.create({});
        let orgs = aliases.getGroup('orgs') as { [key: string]: string };
        let user = await vscode.window.showQuickPick(Object.values(orgs));
        return user;
    }

    const getDefaultUser = async () => {
        let dir = __dirname;
        try {
            process.chdir(vscode.workspace.rootPath);
            let org = await Org.create({});
            return org.getUsername();
        } catch (e) { }
        finally {
            process.chdir(dir);
        }
    }

}

// this method is called when your extension is deactivated
export function deactivate() {
    //todo: clean up temp files
}