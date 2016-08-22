const through = require('through2');

export class GulpConfig {
    public baseDir : string;
    public package : string;
    constructor( public target : string, options : any){
        options = options || {};
        this.baseDir = options.baseDir;
        this.package = options.package;
    }
}
export class GulpStream {
    protected  config : GulpConfig;

    constructor( target : string,props : {}){
        this.config = new GulpConfig(target, props); 
    }

    protected onFile(file : GulpFile, enc : string): void {}
    protected onEnd(){}

    public handle(outFile: string, opts: {}) {
        let self = this;
        function bufferContents(file, enc, cb) {
            let result : any = self.onFile(file, enc);
            if ( result instanceof Promise)
                return result.then( x => cb() ).catch(e => console.error(e));
            return cb();
        }
        function endStream(cb) {
            let result : any = self.onEnd();
            if( result ){
                this.push(result);
            }
            
        }
        return through.obj(bufferContents, endStream);
    }
}