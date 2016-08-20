import utils from '../utils';

export interface RequireOptions
{
    target : { (...args) : any };
    injections : string[];
    locals : {};
}

/**
 * require(function(a){ })
 * require(function(){}, {local : 1})
 * 
 * require([], function(){} )
 * require([], function(){}, {local : 1})
 * 
 * require('method', function(mystuff){ })
 * require('method', function(mystuff){ }, { local : 1})
 */
class _RequireArgumentParser  {
    
    // denormalized arguments
    private first: any;
    private second: any;
    private third: any;

    // The actual target
    private target : { (...args) : any };

    // Injections (dependencies)
    private injections : string[];

    // Local variables
    private locals : {} = {};

    /**
     * Setup default value 
     * To have easier access to them
     * Due to limited amount of arguments (3) we denormalize it
     */
    constructor(input: any[]) {
        this.first = input[0];
        this.second = input[1];
        this.third = input[2];
        this.isFunction();
    }

    /**
     * Cover first case if a first argument is a function (closure)
     * 
     * require(function(a){ })
     * require(function(){}, {local : 1})
     */
    isFunction() {
        
        if (!utils.isFunction(this.first)){
            return this.isString();
        }

        this.target = this.first;
        
        this.injections = 
            utils.getParameterNamesFromFunction(this.target);
            
        // has to be a plane obejct ( { foo : bar } )
        if ( this.first && utils.isPlainObject(this.second)){
            this.locals = this.second;
        }
    }

    /**
     * Finally instead of array to define annotations
     * We might pass only one string (annotation)
     */
    isString()
    {
        if ( !utils.isString(this.first) ) {
            return this.isArray();
        }
        this.first = [this.first];
        return this.isArray();
    }

    /**
     * Cover a case when first argument is an array
     * Second argument must be present
     * require([], function(){} )
     * require([], function(){}, {local : 1})
     */
    isArray()
    {
        if (!utils.isArray(this.first)) return;
        // second argument must be ther 
        if( !utils.isFunction(this.second)){
            throw new Error("Second argument must be function/closure!");
        } 
        this.injections = this.first;
        this.target = this.second;

        // We might pass locals as a third argument
        if( utils.isPlainObject(this.third) ){
            this.locals = this.third;
        }
    }

    /**
     * Formatting the output
     */
    format() : RequireOptions
    {
        if ( !utils.isFunction(this.target) ){
            throw new Error("Require method requires a closure!");
        }
        return <RequireOptions> {
            target : this.target,
            injections : this.injections,
            locals : this.locals
        } 
    }
}



export var RequireArgumentParser = (input: any) : RequireOptions => {
    let parser = new _RequireArgumentParser(input);
    return parser.format();
}