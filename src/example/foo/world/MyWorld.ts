import {Hello} from '../Hello';
import {Space} from './space/Space';

export class MyWorld {
    getSome() : Hello
    {
        return new Hello();
    }

    getSpace() : Space
    {
        return null;
    }
}