import babaParser from './parser/baba';

export default (grammar) => {
	const parsed = babaParser.parse(grammar);
	const getIdentifier = it => `baba$${it.join('__').replace(/[^a-z0-9_]/ig, '_')}`;

	const reduceTree = (nodes, context=[]) => {
		return nodes.map(node => {
			const [type, identifier, ...args] = node;
			try {
				const obj = ({
					meta_statement() {
						switch (identifier) {
						case 'import':
							return {
								type,
								identifier,

								file: args[0][0][1], // Raw value of first argument
								alias: args[0][1][1], // Raw value of second argument
								meta: true,
							};
						case 'export': {
							const parsedArgs = reduceTree(args[0]);
							return {
								type,
								identifier,

								key: parsedArgs[0],
								value: parsedArgs[1],
								meta: true,
							};
						}
						}
						return { type };
					},
					scope_block() {
						const fullContext = context.concat(identifier[1]);
						const name = getIdentifier(fullContext);
						const children = reduceTree(args[0], fullContext);

						const valueChildren = children.filter(it => !it.meta);
						let value = valueChildren.join(', ');
						if (valueChildren.length > 1) {
							// Only call choice method on lists with more than one item
							value = `baba$$choice(() => [${value}])`;
						}
						else {
							// Single values must be stringified
							value = `${value}`;
						}

						return { type, value, name, children };
					},
					list_block() {
						const fullContext = identifier ? context.concat(identifier[1]) : context;
						const name = getIdentifier(fullContext);
						const children = reduceTree(args[0], fullContext);

						const valueChildren = children.filter(it => !it.meta);
						let value = valueChildren.join(', ');
						if (valueChildren.length > 1) {
							// Only call choice method on lists with more than one item
							value = `baba$$choice(() => [${value}])`;
						}
						else {
							// Single values must be stringified
							value = `${value}`;
						}

						return { type, value, name, children };
					},
					identifier() {
						let name = getIdentifier(identifier.split('.'));
						if (identifier.substr(0, 1) === '$') {
							// Variable reference
							const varIdent = identifier.slice(1);
							name = `baba$$var(${JSON.stringify(varIdent)}, () => ${getIdentifier(varIdent.split('.'))})`;
						}
						return { type, name };
					},
					interpolated_string() {
						const children = reduceTree(identifier, context);
						const weight = args[0] || 1;
						let value = `baba$$concat(() => [${children.filter(it => !it.meta).join(', ')}])`;
						if (weight > 1) {
							value = `new Array(${weight}).fill(${value})`;
						}
						return { type, value, children };
					},
					tag() {
						const [type, contents, quantifier] = node;
						const children = reduceTree(contents, context);
						let value = `${children.filter(it => !it.meta).join(', ')}`;
						if (quantifier === '?') {
							// Optional quantifier
							value = `baba$$choice(() => [${value}, ''])`;
						}
						return { type, value, children };
					},
					tag_choice() {
						const [type, left, right] = node;
						const children = reduceTree(left).concat(reduceTree(right));
						const value = `baba$$choice(() => [${children.filter(it => !it.meta).join(', ')}])`;
						return {
							type,
							value,
							children,
						};
					},
					tag_concat() {
						const [type, left, right] = node;
						const children = reduceTree(left).concat(reduceTree(right));
						const value = `baba$$concat(() => [${children.filter(it => !it.meta).join(', ')}])`;
						return {
							type,
							value,
							children,
						};
					},
					literal() {
						const value = JSON.stringify(identifier);
						return { type, value };
					},
					transform() {
						let [type, args, func] = node;
						args = reduceTree([args]);
						func = reduceTree([func]);
						const value = `${func}$func(${args.join(', ')})`;
						return {
							type,
							value,
							children: args.concat(func),
						};
					},
					call() {
						const children = reduceTree(args[0], context);
						const name = `${getIdentifier(identifier[1].split('.'))}$func(${children.join(', ')})`;
						return { type, name, children };
					},
					mapping() {
						return { type };
					},
				})[type]();
				obj.toString = function() {
					return this.name || this.value || '__MISSING_ID__';
				};
				return obj;
			}
			catch (e) {
				console.error('Error in "%s" handler: %s', type, e);
			}
			return { type };
		});
	};

	const getScript = tree => {
		// Collect data for export
		const meta = {
			export: [], // exported parameters
			import: [], // imported files
		};

		const vars = {};
		const collect = nodes => {
			nodes.forEach(node => {
				// console.log(node.children);
				if (node.children) {
					collect(node.children);
				}
				if (!node.meta && node.name && node.value) {
					vars[node.name] = node;
				}
				else if (node.meta) {
					meta[node.identifier].push(node);
				}
				else {
					// Value node
				}
			});
		};
		collect(tree);

		const functions = [];
		const exports = [];
		
		meta.import.forEach(node => {
			const obj = require(node.file);
			Object.keys(obj).forEach(f => {
				functions.push([getIdentifier([node.alias, f]), obj[f].toString()]);
			});
		});
		meta.export.forEach(node => {
			exports.push([node.key.toString(), node.value.value ? node.value.value : node.value.name]);
		});

		return `
		module.exports = (() => {
		// Utils
		function baba$$ClosureWrapper(fn) {
			// Closure wrapper that just converts the contents to a string, this 
			// allows top-level definitions to be wrapped in closures to avoid 
			// issues with undefined variables
			this.toString = () => {
				return (typeof fn === 'function' ? fn() : fn) + '';
			}
		}
		const baba$$choice = fn => {
			let cached;
			return new baba$$ClosureWrapper(() => {
				if (!cached) {
					// Flatten array (e.g. arrays of weighted items)
					cached = Array.prototype.concat.apply([], fn());
				}
				const ret = cached[Math.floor(Math.random() * cached.length)];
				return ret;
			})
		};
		const baba$$concat = fn => new baba$$ClosureWrapper(() => fn().join(''));
		const baba$$re = (str, rules) => {
			// Regex rule helper
			let ret;
			str += '';
			rules.some(filter => ret = str.match(filter[0]) && str.replace(filter[0], filter[1]));
			return ret;
		}
		let baba$$vars = {};
		const baba$$var = (id, ref) => baba$$vars[id] || ref();

		// Imported functions
		${functions.map(v => `const ${v[0]}$func = ${v[1]};`).join('\n')}

		// Grammar rules
		${Object.keys(vars).map(v => `const ${v} = new baba$$ClosureWrapper(${vars[v].value});`).join('\n')}

		// Exported nodes
		return {
			${exports.map(v => `${v[0]}: vars => { baba$$vars = vars || {}; return ${v[1]} + '' },`).join('\n')}
		};
		})();`;
	};

	const tree = reduceTree(parsed);
	return getScript(tree);
};
