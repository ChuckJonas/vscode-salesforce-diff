'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TextEditor } from 'vscode';
import { core } from '@salesforce/command';
import * as path from 'path';
import { promises as fsPromise } from 'fs';
import { fs } from '@salesforce/core'
import { exec } from 'child_process'

let output = vscode.window.createOutputChannel('salesforce-diff');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

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
        async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken) {
            if (path.extname(uri.fsPath) === 'cls') {
                return provideApexContent(uri, token);
            } else {
                return providerOtherContent(uri, token);
            }
        }
    });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerTextEditorCommand('extension.diffApexClass', async (textEditor: TextEditor) => {
        let fileName = path.basename(textEditor.document.uri.fsPath, '.cls');
        await vscode.commands.executeCommand(
            'vscode.diff',
            textEditor.document.uri,
            vscode.Uri.parse(`salesforce://${textEditor.document.uri.fsPath}`),
            `${fileName} Local vs. Salesforce`
        );
    });

    context.subscriptions.push(disposable);


    /*** DIFF providers ***/

    /**
     * Provider for Apex only... 
     * Will likely depreciate once other provider is proven stable.
     *
     * @param {vscode.Uri} uri
     * @param {vscode.CancellationToken} token
     * @returns
     */
    async function provideApexContent(uri: vscode.Uri, token: vscode.CancellationToken) {
        return new Promise<string>(async (resolve, reject) => {
            let dir = __dirname;
            try {
                process.chdir(vscode.workspace.rootPath);
                let org = await core.Org.create({});
                let conn = org.getConnection();
                output.appendLine(`Running diff against ${org.getUsername()}`);
                
                let qry = `SELECT Name, Body FROM ApexClass WHERE Name = '${path.basename(uri.fsPath, '.cls')}'`;
                output.appendLine(`Retrieving source: ${qry}`);
                let result = await conn.tooling.query<{ Body: string }>(qry);

                if (result.done && result.records && result.records.length) {
                    resolve(result.records[0].Body);
                } else {
                    reject(new Error('Could not find source file!'));
                }
            } catch (e) {
                reject(e);
            }finally{
                process.chdir(dir);
            }
        });
    }

    /**
     * Provider using force:source:retrieve
     *
     * @param {vscode.Uri} uri
     * @param {vscode.CancellationToken} token
     * @returns
     */
    async function providerOtherContent(uri: vscode.Uri, token: vscode.CancellationToken) {
        return new Promise<string>(async (resolve, reject) => {
            let dir = __dirname;
            try {
                process.chdir(vscode.workspace.rootPath);
                let org = await core.Org.create({});

                // let conn = org.getConnection();
                output.appendLine(`Running diff against ${org.getUsername()}`);

                let tmpDir = getTempPath(path.dirname(uri.path))
                let tmpFile = getTempPath(uri.path);

                await fs.mkdirp(tmpDir);
                await fsPromise.copyFile(path.join(vscode.workspace.rootPath, 'sfdx-project.json'), path.join(getTempPath(vscode.workspace.rootPath), 'sfdx-project.json'));
                await fsPromise.copyFile(uri.fsPath, tmpFile);

                let retrieveCmd = `sfdx force:source:retrieve -p "${tmpFile}" -u ${org.getUsername()}`;

                process.chdir(tmpDir);

                output.appendLine(`Retrieving source: ${retrieveCmd}`);

                await new Promise((resolve, reject) => {
                    exec(retrieveCmd, (err, stdout, stderr) => {
                        if (err) {
                            output.appendLine(stderr);
                            reject(new Error('Could not find source file!'));
                        }
                        output.appendLine(stdout);
                        resolve();
                    });
                });
                let resultFile = await getResultPath(tmpFile);
                let data = await fs.readFile(resultFile, "utf8");
                await fs.unlink(tmpFile);
                if (tmpFile != resultFile) {
                    await fs.unlink(resultFile);
                }
                return resolve(data);
            } catch (e) {
                reject(e);
            } finally {
                process.chdir(dir);
            }
        });
    }

    /*** PATH HELPERS ***/
    const getTempPath = (p: string) => {
        return path.join(context.storagePath, p);
    }

    //ugh: hack due to https://github.com/forcedotcom/cli/issues/97 
    const getResultPath = async (tmpFile: string) => {

        let relPath = tmpFile.replace(path.join(getTempPath(vscode.workspace.rootPath)), '');

        let project = await core.SfdxProject.resolve()
        let projectJson = await project.resolveProjectConfig();
        let defaultPackageDir = (projectJson['packageDirectories'] as any[]).find(item => item.default);


        if (relPath.startsWith(path.sep + defaultPackageDir.path)) {
            relPath = relPath.replace(path.sep + defaultPackageDir.path, '');
        }

        if (!relPath.startsWith(path.sep + path.join('main', 'default'))) {
            relPath = path.join('main', 'default', relPath);
        }

        return path.join(getTempPath(vscode.workspace.rootPath), defaultPackageDir.path, relPath);
    }
}


// this method is called when your extension is deactivated
export function deactivate() { }