declare module 'example.foo.Hello' {
	export class Hello {
	    name: string;
	}
	
}
declare module 'example.foo.Bar' {
	import { Hello } from 'example.foo.Hello';
	export class Bar {
	    getHello(): Hello;
	    saySomething(): void;
	}
	export class Sukka {
	    getSukka(): Hello;
	}
	
}
declare module 'example.foo.world.space.Space' {
	export class Space {
	    name: string;
	}
	
}
declare module 'example.foo.world.MyWorld' {
	import { Hello } from 'example.foo.Hello';
	import { Space } from 'example.foo.world.space.Space';
	export class MyWorld {
	    getSome(): Hello;
	    getSpace(): Space;
	}
	
}