interface NodeRequireFunction {
    (id: string): any;
}
interface NodeRequire extends NodeRequireFunction {
    resolve(id: string): string;
    cache: any;
    extensions: any;
    main: any;
}
declare class Buffer{
    constructor(contents : string)
}

declare interface GulpSource {

}
declare interface GulpSourceMaps {
    sources : GulpSource[]
}
declare interface GulpFile  {
    contents : Buffer;
    path : string;
    sourceMap : GulpSourceMaps
}
declare var require: NodeRequire;