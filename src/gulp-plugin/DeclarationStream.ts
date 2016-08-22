import {GulpStream} from './GulpStream';
import {ModuleDeclarationParser, RealmDeclaration, RealmDependency} from './ModuleDeclaration';
const Concat = require('concat-with-sourcemaps');
const path = require('path');

export default class DeclarationStream extends GulpStream {
    private latestFile: any;
    private concat = new Concat(true, 'out.js', '\n');

    protected onFile(file: GulpFile, enc: string): void {
        this.latestFile = file;
        let parser  = new ModuleDeclarationParser(file, this.config);
        let contents = file.contents.toString();

        let declaration : RealmDeclaration = parser.parse();

        // Fixing dependency paths
        for (  let dependency of declaration.dependencies  ){
            if( dependency.ts_require ){
                contents = contents.split(dependency.matched)
                    .join("from '" + dependency.name + "'");
            }
        }
        // removing declare worlds
        contents = contents.replace(/\s+declare\s+/g, ' ');

        // wrapping into a module
        contents = `declare module '${declaration.config.name}' {\n\t${contents.split('\n').join('\n\t')}\n}`
        
        this.concat.add(null, contents);

    }
    protected onEnd() {
      var joinedFile = this.latestFile.clone({
         contents: false
      });
      joinedFile.path = this.config.target;
      joinedFile.contents = this.concat.content;
      return joinedFile;
      
    }
}