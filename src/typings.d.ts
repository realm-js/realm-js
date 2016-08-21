declare var $isBackend: boolean;
declare var global: any;
declare var window: Window;




declare module "b"
{
    import {Pukka} from 'a';

    export class Sukka  {
        pukka : Pukka
    }
}
declare module "a"{
    export class Pukka {
        name : string
    }
}