import { TextDocumentContentProvider, Uri, CancellationToken, OutputChannel, window, workspace } from 'vscode';
import * as core from '@salesforce/core'
import { exec } from 'child_process'
import { promises as fsPromise } from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';


export class SalesforceTextDocumentProvider implements TextDocumentContentProvider {

    private output: OutputChannel;
    private storagePath: string;

    constructor(output: OutputChannel, storagePath: string) {
        this.output = output;
        this.storagePath = storagePath;
    }

    async provideTextDocumentContent(uri: Uri, token: CancellationToken) {
        let user = uri.fragment;

        this.output.appendLine(`Running diff against ${user}`);

        if (path.extname(uri.fsPath) === '.cls') {
            return this.provideApexContent(uri, user, token);
        } else {
            return this.providerOtherContent(uri, user, token);
        }
    }


    /**
     * Provider for Apex only... 
     * Will likely depreciate once other provider is proven stable.
     *
     * @param {vscode.Uri} uri
     * @param {vscode.CancellationToken} token
     * @returns
     */
    private async provideApexContent(uri: Uri, user: string, token: CancellationToken) {
        return new Promise<string>(async (resolve, reject) => {
            try {
                let conn = await core.Connection.create({
                    authInfo: await core.AuthInfo.create({ username: user })
                })

                let qry = `SELECT Name, Body FROM ApexClass WHERE Name = '${path.basename(uri.fsPath, '.cls')}' LIMIT 1`;
                this.output.appendLine(`Retrieving source: ${qry}`);
                let result = await conn.tooling.query<{ Body: string }>(qry);
                if(result.done && result.records){
                    if(result.records.length){
                        return resolve(result.records[0].Body);
                    }else{
                        return resolve('');
                    }
                }
                throw new Error('Failed to Retrieve Source');
            } catch (e) {
                reject(e);
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
    private async providerOtherContent(uri: Uri, user: string, token: CancellationToken) {
        return new Promise<string>(async (resolve, reject) => {
            let dir = __dirname;
            try {

                let tmpDir = this.getTempPath(path.dirname(uri.path))
                let tmpFile = this.getTempPath(uri.path);
                let workspaceTmp = this.getTempPath(workspace.rootPath);
                
                //kinda scary
                await new Promise((resolve, reject) => {
                    rimraf(
                        workspaceTmp,
                        (err) => {
                            if(err){
                                reject(err);
                            }else{
                                resolve();
                            }
                        }
                    );
                });

                await core.fs.mkdirp(tmpDir);
                await fsPromise.copyFile(path.join(workspace.rootPath, 'sfdx-project.json'), path.join(workspaceTmp, 'sfdx-project.json'));
                await fsPromise.writeFile(tmpFile, '<?xml version="1.0" ?>');
                
                // await fsPromise.copyFile(uri.fsPath, tmpFile);
                let ogStat = await fsPromise.stat(tmpFile);

                let retrieveCmd = `sfdx force:source:retrieve -p "${tmpFile}" -u ${user}`;

                process.chdir(tmpDir);

                this.output.appendLine(`Retrieving source: ${retrieveCmd}`);

                await new Promise((resolve, reject) => {
                    exec(retrieveCmd, (err, stdout, stderr) => {
                        if (err) {
                            this.output.appendLine(stderr);
                            reject(new Error('Failed to pull source from org!'));
                        }
                        this.output.appendLine(stdout);
                        resolve();
                    });
                });
                try{
                    let resultFile = await this.getResultPath(tmpFile);
                    
                    let data = await fsPromise.readFile(resultFile, "utf8");
                    if(resultFile === tmpFile){
                        // let newStat = await fsPromise.stat(tmpFile);
                        // if(ogStat.mtimeMs === newStat.mtimeMs){ //file wasn't updated
                        if(data === '<?xml version="1.0" ?>'){
                            resolve('');
                        }
                        
                        // }
                    }   
                    return resolve(data);
                }catch(e){
                    throw new Error('Could not find source file in org!');
                }
            } catch (e) {
                reject(e);
            } finally {
                process.chdir(dir);
            }
        });
    }


    /*** PATH HELPERS ***/
    private getTempPath(p: string) {
        return path.join(this.storagePath, p);
    }

    //ugh: hack due to https://github.com/forcedotcom/cli/issues/97 
    private async getResultPath(tmpFile: string) {

        let relPath = tmpFile.replace(path.join(this.getTempPath(workspace.rootPath)), '');

        let project = await core.SfdxProject.resolve()
        let projectJson = await project.resolveProjectConfig();
        let defaultPackageDir = (projectJson['packageDirectories'] as any[]).find(item => item.default);


        if (relPath.startsWith(path.sep + defaultPackageDir.path)) {
            relPath = relPath.replace(path.sep + defaultPackageDir.path, '');
        }

        if (!relPath.startsWith(path.sep + path.join('main', 'default'))) {
            relPath = path.join('main', 'default', relPath);
        }

        return path.join(this.getTempPath(workspace.rootPath), defaultPackageDir.path, relPath);
    }
}