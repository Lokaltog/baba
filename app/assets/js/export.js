var utils = require('./utils')

var moduleName = 'Baba'
var exportFunctions = {
	randomItem: utils.randomItem,
	splitString: function(str, divider) {
		return str.split(divider || '|')
	},
	parseElements: function() {
		return function(elements) {
			var ret = ''
			for (var el in elements) { // jshint ignore:line
				// we're not overriding the prototype in the generator
				// so we don't need a hasOwnProperty check here
				el = elements[el]

				// chained ifs compiles down to less code than a switch
				var type = typeof el
				if (type === 'string') {
					ret += el
				}
				else if (type === 'function') {
					ret += parseElements(el())()
				}
				else if (type === 'object') {
					if (Array.isArray(el)) {
						ret += parseElements(randomItem(el))()
					}
				}
			}
			return ret.trim()
		}.bind(this, arguments)
	},
	applyVariable: function(str, variable) {
		return function() {
            return variables[variable] || str
		}
	},
	applyTransforms: function() {
		return function(elements, transforms) {
			// we need to transform a string, so handle any arrays or functions first
			var parsed = parseElements(elements)()

			transforms.forEach(function(transform) {
				transform.some(function(rule) {
					if (typeof rule === 'function') {
						// function transform
						parsed = rule(parsed)
						return false
					}
					// regexp transform
					var search = new RegExp(rule[0], 'ig')
					if (parsed.match(search)) {
						parsed = parsed.replace(search, rule[1])
						return true
					}
				})
			})

			return parsed
		}.bind(this, arguments[0], [].slice.call(arguments, 1))
	},
}

function exportGrammar(vm) {
	var ret = []
	var exportedNodes = []
	var grammarExports = []
	var variables = {}

	exportedNodes.push(['SPACE', '" "'])

	// add exported functions
	for (var fn in exportFunctions) {
		if (exportFunctions.hasOwnProperty(fn)) {
			exportedNodes.push([fn, exportFunctions[fn]])
		}
	}

	// add node cache variables (unused variables will be removed by uglifyjs)
	for (var node in vm.nodeCache) {
		if (vm.nodeCache.hasOwnProperty(node)) {
			node = vm.nodeCache[node].node
			var nodeName = 'node_' + node.id
			// add exported functions as default dependencies
			var dependencies = Object.keys(exportFunctions).concat(['SPACE'])

			if (node.type === 'wordlist') {
				var data = node.elements
				var stringify = data.some(function(el) {
					return el.indexOf('|') !== -1
				})
				if (stringify) {
					// export as JSON object as '|' is present in one or more words
					data = JSON.stringify(data)
				}
				else {
					// join string with '|' to save space
					data = 'splitString(' + JSON.stringify(data.join('|')) + ')'
				}
				// ensure that word lists are defined before the sentences
				exportedNodes.unshift([nodeName, data])
			}
			else if (node.type === 'sentence') {
				var sentenceStr = ''
				var sentences = []

				if (node.elements.length > 1) {
					// randomly select sentence from sentence list
                    sentenceStr += 'parseElements(['
				}

				node.elements.forEach(function(sentence) {
					sentences.push(
						'parseElements(' + sentence.sentence.map(function(el, idx) {
							var ret = ''

							if (el.ref) {
								var node = vm.nodeCache[el.ref].node
								var grammarNode = 'node_' + node.id
								var grammarNodeTransforms = []

								if (dependencies.indexOf(grammarNode) === -1) {
									// add unique node dependencies
									dependencies.push(grammarNode)
								}

								if (grammarNode === nodeName) {
									// recursive reference, the element has to be returned from a function as it doesn't exist at parse time
									// the element has a 50% chance to return itself, usually it will repeat itself 0-2 times
									// TODO add customizable probability
									grammarNode = 'function() { return Math.random() < 0.5 ? parseElements(' + grammarNode + ') : "" }'
								}

								;(el.transform || []).forEach(function(tf) {
									tf = vm.nodeCache[tf].node
									var tfKey = 'node_' + tf.id
									grammarNodeTransforms.push(tfKey)

									if (dependencies.indexOf(tfKey) === -1) {
										dependencies.push(tfKey)
									}
								})

								if (el.variable) {
									variables[el.variable] = null
									grammarNode = 'applyVariable(' + grammarNode + ', '
									grammarNode += JSON.stringify(el.variable)
									grammarNode += ')'
								}

								if (grammarNodeTransforms.length) {
									grammarNode = 'applyTransforms(' + grammarNode + ', '
									grammarNode += grammarNodeTransforms.join(', ')
									grammarNode += ')'
								}

								ret = grammarNode
							}
							else {
								ret = JSON.stringify(el.str || '')
							}

							if (el.whitespace !== false && idx < sentence.sentence.length - 1) {
								ret += ',SPACE'
							}

							return ret
						}) + ')')
				})

				sentenceStr += sentences.join(', ')

				if (node.elements.length > 1) {
					sentenceStr += '])'
				}
				exportedNodes.push([nodeName, sentenceStr, dependencies])

				if (node.export) {
					grammarExports.push([node.label, nodeName])
				}
			}
			else if (node.transforms) {
				// add transforms regexps
				var nodeTransforms = node.transforms.map(function(tf) {
					if (typeof tf === 'string') {
						// raw function transform string (from imported/stored generator)
						return tf
					}
					if (typeof tf === 'function') {
						// stringify function
						return tf.toString()
					}
					return JSON.stringify(tf)
				})

				exportedNodes.push([nodeName, '[' + nodeTransforms.toString() + ']'])
			}
		}
	}

	// resolve exported node dependencies
	var depGraph = []
	var grammarObj = {}
	exportedNodes.forEach(function(el) {
		grammarObj[el[0]] = el[1]

		if (!el[2]) return
		el[2].forEach(function(dep) {
			depGraph.push([el[0], dep])
		})
	})

	// write variables object
	ret.push('var variables = ' + JSON.stringify(variables))

	// write exported nodes
	utils.tsort(depGraph).reverse().forEach(function(key) {
		ret.push('var ' + key + ' = ' + grammarObj[key])
	})

	ret.push('return {')

	// add generator object
	ret.push('generator: {')
	grammarExports.forEach(function(value) {
		var key = JSON.stringify(S(value[0]).slugify().toString())
		ret.push(key + ': ' + value[1] + ',')
	})
	ret.push('},')

	// add variable functions
	ret.push('variable: {')
	ret.push('obj: variables,')
	ret.push('set: function(variable, value) { variables[variable] = value },')
	ret.push('},')

	ret.push('}')

	return ret.join('\n')
}

function compress(code) {
	var ast = UglifyJS.parse(code)
	var compressor = UglifyJS.Compressor({
		unsafe: true,
		pure_getters: true,
	})
	ast.figure_out_scope()
	var compressed_ast = ast.transform(compressor)
	compressed_ast.figure_out_scope()
	compressed_ast.compute_char_frequency()
	compressed_ast.mangle_names()

	return compressed_ast.print_to_string()
}

module.exports = {
	export: function (vm, type, uglify) {
		var grammar = exportGrammar(vm)
		var grammarName = (vm.generator.grammar.name || 'Unnamed text generator')
		var grammarAuthor = (vm.generator.grammar.author || 'an unknown author')

		var exported = ''
		var comment = [
			'/**',
			' * ' + grammarName + ' by ' + grammarAuthor,
			' *',
			' * Made with Baba: http://baba.computer/',
			' */',
		].join('\n')

		switch (type) {
			default:
		case 'module':
			// wrap in UMD, compatible with AMD/CommonJS/browser
			exported = [
				'(function (root, factory) {',
				'if (typeof define === "function" && define.amd) { define([], factory) }',
				'else if (typeof exports === "object") { module.exports = factory() }',
				'else { root.' + moduleName + ' = factory() }',
				'}(this, function() {',
				grammar,
				'}))',
			].join('\n')
			break

		case 'executable':
			comment = '#!/usr/bin/env node\n\n' + comment

			exported = [
				'(function() { var Baba = (function() {',
				'' + grammar + '',
				'})()',

				'var path = require("path")',
				'var args = process.argv.slice(2)',
				'var validMethods = Object.keys(Baba.generator)',
				'var validVariables = Object.keys(Baba.variable.obj)',
				'var output = []',

				'function usage() {',
				'process.stdout.write("' +
					[grammarName + ' by ' + grammarAuthor,
					 '',
					 'Made with Baba: http://baba.computer/',
					 '',
					 'Usage:',
					 '',
					 '    " + path.basename(process.argv[1]) + validVariables.map(function(el) { return " [ --" + el + "=VALUE ]" }).join("") + " [ " + validMethods.join(" | ") + " ]',
					 '',
					 '',
					].join('\\n') + '")',
				'process.exit(1)',
				'}',
				'if (!args.length) { usage() }',
				'args.some(function(arg) {',
				'try {',
				'if (arg.substr(0, 2) === "--") {',
				'var variable = arg.substr(2).split("=")',
				'if (validVariables.indexOf(variable[0]) === -1) throw "Invalid variable: " + variable[0]',
				'Baba.variable.set(variable[0], variable[1])',
				'} else {',
				'if (validMethods.indexOf(arg) === -1) throw "Invalid generator: " + arg',
				'output.push(Baba.generator[arg]())',
				'}', '}',
				'catch (e) {',
				'process.stdout.write(e + "\\n\\n")',
				'usage()',
				'return true',
				'}', '})',
				'process.stdout.write(output.join("\\n\\n") + "\\n")',
				'})()',
			].join('\n')
			break
		}

		if (uglify) {
			exported = compress(exported)
		}

		return comment + '\n' + exported
	},
}
