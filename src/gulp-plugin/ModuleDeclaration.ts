const path = require('path');
import { GulpStream, GulpConfig} from './GulpStream';

/**
 * ModuleConfig
 */
export class ModuleConfig {
    constructor( public name: string,public path: string) { }
}

/**
 * RealmDeclaration
 */
export class RealmDeclaration {
    public dependencies : RealmDependency[] = [];
    constructor(public config: ModuleConfig) { }
}
/**
 * RealmDependency
 */
export class RealmDependency {
    constructor(public name: string, public ts_require: string = name, public matched : string) { }
}

/**
 * ModuleDeclarationParser
 */
export class ModuleDeclarationParser {
    constructor(private file: GulpFile, private config: GulpConfig) { }

    public parse(): RealmDeclaration {
        let _module: ModuleConfig = this._getModuleConfig();
        let declaration = new RealmDeclaration(_module);
        declaration.dependencies = this._parseDependencies(_module)
        return declaration;
    }

    /**
     * _parseDependencies
     * returs a list of dependencies
     * RealmDependency { name: 'example.foo.Hello', ts_name: '../Hello' }
     */
    private _parseDependencies(_module: ModuleConfig): RealmDependency[] {
        let cnt = this.file.contents.toString();
        let exp: RegExp = /from\s+('|")([^'"]+)('|")/ig
        let str;
        let dependencies: RealmDependency[] = [];;
        while (str = exp.exec(cnt)) {
            let depPath = str[2];
            let name, ts_require;
            if (depPath[0] === '.') { // if we are dealing with relative paths
                ts_require = depPath;
                name = this._convertToModule(path.join(_module.path, depPath));
            } else {
                name = depPath[0]
            }
            dependencies.push(new RealmDependency(name || depPath, ts_require, str[0]));
        }
        return dependencies;
    }

    /**
     * Get configuration
     * ModuleConfig { name: 'example.foo.world.MyWorld', path: 'foo/world' } }
     */
    private _getModuleConfig(): ModuleConfig {
        let fname = this._getRelativeFileName();
        let name = this._convertToModule(fname);
        let rPath = path.dirname(fname);
        return new ModuleConfig(name, rPath);
    }

    private _convertToModule(fname: string) {
        let name = fname.replace(/\//g, '.').replace(/\.d\.ts$/, '')
        if (this.config.package) {
            name = this.config.package + '.' + name;
        }
        return name;
    }


    /**
     * Get relative path name (subtracts baseDirectory is presented)
     * foo/world
     */
    private _getRelativeFileName(): string {
        let fname = this.file.path;
        if (this.config.baseDir) { // slicing base dir
            if (fname.indexOf(this.config.baseDir) === 0) {
                fname = fname.slice(this.config.baseDir.length, fname.length);
            }
        }
        return fname;
    }
}


