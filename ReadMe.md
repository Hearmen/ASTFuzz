# AST FUZZ

This is a new type of mutation fuzz for jvascript engine.

This Fuzzer use AST as a medium for fuzzing. This method can not only effectively avoid the generation of meaningless code, but also greatly improve the grammar coverage.


## Design

Below is the overall design of this fuzz. For a more details, see [mohamoha.club](http://mohamoha.club)
```
/*
	Mutation fuzz 

	seed  ->  AST  -> Shadow -> mutated AST -> js code 


						     mutated AST
		 			/              |               \
	  statement mutate    expression mutate    value mutate
	


	1. pretreat the seeds ,  parse js into AST, and mark the node that should not be mutated

	2. Traverse the AST to analys the mutate-need information of each node, stored them in and corresponding object named Path. The informations include scope, accessiable varibles, valueinfo of each varibles and so on
	
	3. Traverse the AST ,mutate the unmarked node according to the corresponding Path
	
	4. transfer AST back to js.
*/

```

## Usage

This fuzz is based on esprima, and maybe you need to install nodejs first, and install a required package

```
npm install escope
```

You can use this fuzz as shown in file `testcase.js`.

And you can also use this like below

```
> node generator.js  $seedfile  $output_file
```



## TODO
This fuzzer is far from complete, there is so much things to do.

- the valueInfo analys has not complete.
- the mutate module has not yet started writing (mutate in `esbuilder` is just for quick start)
