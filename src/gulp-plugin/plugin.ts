import {ModuleDeclarationParser} from './ModuleDeclaration';
import DeclarationStream from './DeclarationStream';




let RealmPlugin = (target, opts) => {
    let stream = new DeclarationStream(target, opts);
    return stream.handle(target, opts);
}

let DeclarationsPlugin = (target, opts) => {
   let stream = new DeclarationStream(target, opts);
   return stream.handle(target, opts);
}


export const builder = {
    ModuleDeclarationParser : ModuleDeclarationParser,
    RealmPlugin : RealmPlugin,
    DeclarationsPlugin : DeclarationsPlugin
};