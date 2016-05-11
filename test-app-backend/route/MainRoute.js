"use realm";

import path, inject, assert, cors from realm.router;

import Permissions from test.route;

@cors()
@path("/")

@inject(Permissions, '$permission')

class MainRoute {
    static get($query, $permission) {

        return {
            a: $permission
        }
    }
    static post() {

    }
};

export MainRoute;
