import utils from './utils';


/**
 * Each function
 * Iterates any objects including Promises
 */
export var Each = (argv: any, cb: { (...args): any }) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const isObject = utils.isPlainObject(argv);
        let index: number = -1;
        let iterate = () => {
            index++;
            if (index < argv.length) {
                let key = isObject ? Object.keys(argv)[index] : index;
                let value = isObject ? argv[key] : argv[index];
                // Promises need to be resolved
                if (utils.isPromise(value)) {
                    value.then(data => { results.push(data); iterate(); }).catch(reject);
                } else {
                    let res = cb(...[value, key]);
                    if (utils.isPromise(res)) {
                        res.then((a) => {
                            results.push(a);
                            iterate();
                        }).catch(reject);
                    } else {
                        results.push(res);
                        iterate();
                    }
                }
            } else return resolve(results);
        };
        return iterate();
    });
}
