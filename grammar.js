/**
 * @file Timing Hazard Safe Hardware Descriptor Language
 * @author satiscugcat <aniketmishradps@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// grammar.js


//  0 %nonassoc PREC_NAMED_TYPE
//  1 %right LEFT_ABRACK RIGHT_ABRACK LEFT_ABRACK_EQ RIGHT_ABRACK_EQ
//  2 %right DOUBLE_GT SEMICOLON
//  3 %right KEYWORD_LET KEYWORD_SET KEYWORD_PUT
//  4 %left DOUBLE_AND DOUBLE_OR
//  5 %left EXCL_EQ DOUBLE_EQ
//  6 %left XOR AND OR PLUS MINUS
//  7 %left SHL SHR
//  8 %left ASTERISK
//  9 %left PERIOD
// 10 %left LEFT_BRACKET
// 11 $nonassoc TILDE UMINUS UAND UOR // Specifically diverging from source code here. Ambiguous grammar if I don't.
// 12 %nonassoc KEYWORD_IN
export default grammar({
    name: 'anvil',

    extras: $ => [
	/\s+/,
	$.comment,
    ],

    supertypes: $ => [
	$.expression
    ],

    conflicts: $ => [
	[$.record_field_constr, $.join_expression]
    ],
    word: $ => $.identifier,

    rules: {
	// ----- top level -----
	source_file: $ => repeat($._cunit),

	_cunit: $ => choice(
	    $.proc_def,
	    $.macro_def,
	    $.function_def,
	    $.type_def,
	    $.channel_class_def,
	    $.import_directive
	),

	import_directive: $ => choice(
	    seq('import', $.string_literal),
	    seq('extern','import', $.string_literal),
	),
	
	proc_def: $ => choice(
	    seq(
		'proc', $.identifier,
		'(', sepBy($.proc_def_arg, ','), ')',
		'{', repeat($._proc_body_item), '}'
	    ),
	    seq(
		'proc', $.identifier,
		'<', sepBy($.param_def, ','), '>',
		'(', sepBy($.proc_def_arg, ','), ')',
		'{', repeat($._proc_body_item), '}'
	    ),
	    seq(
		'proc', $.identifier,
		'(', sepBy($.proc_def_arg, ','), ')',
		'extern', '(', $.string_literal, ')',  // specify this string as "mod_name"?
		'{', repeat($._extern_item), '}'
	    ),
	),

	_proc_body_item: $ => choice(
	    $.loop_thread,
	    $.recursive_thread,
	    seq($.channel_def, ';'),
	    seq($.reg_def, ';'),
	    seq($.spawn_statement, ';'),
	    seq($.shared_var_def, ';'),
	),

	loop_thread: $ => seq(
	    'loop',
	    optional($.message_specifier),
	    '{', $.expression, '}'
	),

	recursive_thread: $ => seq(
	    'recursive',
	    '{', $.expression, '}'
	),

	spawn_statement: $ => seq('spawn', $.spawn_def),

	_extern_item: $ => choice(
	    seq(
		$.identifier,
		'(', optional($.string_literal), ':',
		optional($.string_literal), ':',
		optional($.string_literal), ')',
		';'
	    ),
	    seq(
		$.message_specifier,
		'(', optional($.string_literal), ':',
		optional($.string_literal), ':',
		optional($.string_literal), ')',
		';'
	    ),
	),	

	param_def: $ => seq($.identifier, ':', choice('int', 'type')),

	// ----- type definitions -----
	type_def: $ => choice(
	    seq(
		'type', $.identifier, optional(seq('<', sepBy($.param_def, ','), '>')),
		'=', $.data_type, ';'
	    ),
	    seq(
		'enum', $.identifier, optional(seq('<', sepBy($.param_def, ','), '>')),
		'{', sepBy1($.variant_def, ','), '}'
	    ),
	    seq(
		'enum', $.identifier, $.data_type, optional(seq('<', sepBy($.param_def, ','), '>')),
		'{', sepBy1($.variant_def, ','), '}'
	    ),
	    seq(
		'struct', $.identifier, optional(seq('<', sepBy($.param_def, ','), '>')),
		'{', sepBy1($.field_def, ','), '}'
	    ),
	),

	variant_def: $ => seq(
	    $.identifier,
	    choice(
		optional($.variant_type_spec),
		seq('=', $.literal_val)
	    )
	),
	
	variant_type_spec: $ => seq(
	    '(',
	    $.data_type,
	    optional(repeat(seq(',', $.data_type))),
	    ')'
	),

	literal_val: $ => choice(
	    $.bit_literal,
	    $.dec_literal,
	    $.hex_literal,
	    $.int_literal,
	),

	field_def: $ => seq($.identifier, ':', $.data_type),

	// ----- channel class -----
	channel_class_def: $ => seq(
	    'chan', $.identifier,
	    optional(seq('<', sepBy($.param_def, ','), '>')),
	    '{', sepBy($.message_def, ','), '}'
	),

	proc_def_arg: $ => seq(
	    optional('foreign'),
	    $.identifier,
	    optional($.array_dimm),
	    ':',
	    $.channel_direction,
	    $.channel_class_concrete,
	),
	
	array_dimm: $ =>
	prec.right(
            seq(
		'[', $.int_maybe_param, ']',
		optional($.array_dimm)
            )
	),

	channel_direction: $ => choice('left', 'right'),

	channel_def: $ => seq(
	    'chan',
	    optional('foreign'), $.identifier, '--',
	    optional('foreign'), $.identifier, ':',
	    $.channel_class_concrete,
	    optional($.array_dimm),
	),

	channel_class_concrete: $ => seq(
	    $.identifier,
	    optional(seq('<', sepBy($.param_value, ','), '>')),
	),
	spawn_def: $ => seq(
	    $.identifier,
	    optional(seq('<', sepBy($.param_value, ','), '>')),
	    '(', sepBy($.args_spawn, ','), ')'
	),

	args_spawn: $ => seq(
	    $.identifier,
	    optional($.array_index_concrete),
	),

	array_index_concrete: $ => choice(
	    seq('[', $.int_literal, ']'),
	    seq('[', $.int_literal, '+', ':', $.int_literal, ']'),
	    seq(
		'[', $.int_literal, '+', ':', $.int_literal, ']',
		$.array_index_concrete
	    ),
	    seq('[', $.int_literal, ']', $.array_index_concrete),
	),
	
	param_value: $ => choice($.int_literal, $.data_type),

	reg_def: $ => seq('reg', $.identifier, ':', $.data_type),

	term: $ => choice(
	    $.bit_literal,
	    $.dec_literal,
	    $.hex_literal,
	    $.int_literal,
	    $.identifier,
	    'recurse'
	),

	expression: $ => choice (
	    $.set_register,
	    $.term,
	    $.unary_expression,
	    $.binary_expression,
	    $.tuple,
	    $.unit,
	    $.sync_var,
	    $.ready_endpoint,
	    $.probe_endpoint,
	    $.put_val,
	    $.let_val,
	    $.let_typed_val,
	    $.join_expression,
	    $.send_packet,
	    $.receive_packet,
	    $.wait_expression,
	    $.generate_parallel,
	    $.generate_sequence,
	    $.if_branch,
	    $.function_call,
	    $.cycle_delay,
	    $.array_index_expression,
	    $.field_access_expression,
	    $.concat_expression,
	    $.concat_flat_expression,
	    $.cast_value,
	    $.block,
	    $.match_expression,
	    $.register_dereference,
	    $.enum_val,
	    $.struct_val_with,
	    $.struct_val,
	    $.debug_print,
	    $.debug_finish,
	    $.array_val
	),

	set_register: $ => prec.right(3, seq('set', field("register", $.lvalue), ':=', $.expression)),
	unit: $ => seq ('(',')'),
	tuple: $ => seq('(', $.expression, ',', sepBy(',', $.expression), ')'),
	sync_var: $ => seq('sync', field('variable', $.identifier)),
	ready_endpoint: $ => seq('ready', field("endpoint_message", $.message_specifier)),
	probe_endpoint: $ => seq('probe', field("endpoint_message", $.message_specifier)),
	put_val: $ => prec.right(3, seq('put', $.identifier, ':=', $.expression)),
	let_val: $ => prec.right(3, seq('let', field("variable", $.identifier), '=', field("value", $.expression))),
	let_typed_val: $ => prec.right(3, seq('let', field("variable", $.identifier), ':', field("type", $.data_type), '=', field("value", $.expression))),
	join_expression: $ => prec.right(2, seq($.expression, ';', $.expression)),
	send_packet: $ => seq('send', $.send_pack),
	receive_packet: $ => seq('recv', $.recv_pack),
	wait_expression: $ => prec.right(2, seq($.expression, '>>', $.expression)),
	generate_parallel: $ => seq('generate', '(', field("variable", $.identifier), ':', field("start", $.int_literal), ',', field("stop", $.int_literal), ',', field("end", $.int_literal),')', '{', $.expression,'}'),
	generate_sequence: $ => seq('generate_seq', '(', field("variable", $.identifier), ':', field("start", $.int_literal), ',', field("stop", $.int_literal), ',', field("end", $.int_literal),')', '{', $.expression,'}'),
	function_call: $ => seq('call', field("function", $.identifier), '(', sepBy(field("argument", $.expression), ','), ')'),
	cycle_delay: $ => seq('cycle', field("delay_value", $.int_literal)),
	array_index_expression: $ => prec.left(10, seq($.expression, '[', $.index,']')),
	field_access_expression: $ => prec.left(9, seq($.expression,'.',$.identifier)),
	concat_expression: $ => seq('#', '{', sepBy($.expression, ','), '}'),
	concat_flat_expression: $ => seq('#','flat','{', sepBy($.expression, ','), '}'),
	cast_value: $ => seq('<','(', field("value", $.expression),')', '::', field("type", $.data_type),'>'),
	block: $ => seq('{',$.expression,'}'),
	match_expression: $ => seq('match',$.expression, '{', sepBy($.match_arm,','),'}'),
	register_dereference: $ => seq('*', field("register", $.lvalue)),
	enum_val: $ => seq($.constructor_spec, optional(seq('(', $.expression, ')'))),
	struct_val_with: $ => seq($.identifier, '::', '{', $.expression, 'with', sepBy1($.record_field_constr, ';'), '}'),
	struct_val: $ => seq($.identifier, '::', '{', sepBy1($.record_field_constr, ';'), '}'),
	debug_print: $ => seq('dprint', $.string_literal, '(', sepBy($.expression, ','),')'),
	debug_finish: $ => 'dfinish',
	array_val: $ => seq('[',sepBy($.expression,','),']'),
	
	if_branch: $ => choice(
	    seq('if', $.expression, '{', $.expression, '}', optional($.else_branch)),
	    seq('try',$.identifier, '=', 'recv', $.recv_pack, '{', $.expression, '}', optional($.else_branch)),
	    seq('try',$.identifier, '=', 'send', $.send_pack, '{', $.expression, '}', optional($.else_branch)),
	),

	else_branch: $ => choice(
	    seq('else', '{', $.expression, '}'),
	    seq('else', $.if_branch)
	),

	constructor_spec: $ => seq(
	    $.identifier, '::', $.identifier
	),

	record_field_constr: $ => prec(2, seq(
	    $.identifier, '=', $.expression
	)),

	send_pack: $ => seq(
	    $.message_specifier, '(', $.expression, ')'
	),
	
	recv_pack: $ => $.message_specifier,

	binary_expression: $ => choice(
	    prec.left(5, seq($.expression, '==', $.expression)),
	    prec(12, seq($.expression, 'in', '{', sepBy($.expression, ','), '}')),
	    prec.left(5, seq($.expression, '!=', $.expression)),
	    prec.left(7, seq($.expression, 'shl', $.expression)),
	    prec.left(7, seq($.expression, 'shr', $.expression)),
	    prec.right(1, seq($.expression, '<', $.expression)),
	    prec.right(1, seq($.expression, '>', $.expression)),
	    prec.right(1, seq($.expression, '>=', $.expression)),
	    prec.right(1, seq($.expression, '<=', $.expression)),
	    prec.left(6, seq($.expression, '+', $.expression)),
	    prec.left(8, seq($.expression, '*', $.expression)),
	    prec.left(6, seq($.expression, '-', $.expression)),
	    prec.left(6, seq($.expression, '^', $.expression)),
	    prec.left(6, seq($.expression, '&', $.expression)),
	    prec.left(6, seq($.expression, '|', $.expression)),
	    prec.left(4, seq($.expression, '&&', $.expression)),
	    prec.left(4, seq($.expression, '||', $.expression)),
	),

	unary_expression: $ => choice(
	    prec(11, seq('-',$.expression)),
	    prec(11, seq('~',$.expression)),
	    prec(11, seq('&',$.expression)),
	    prec(11, seq('|',$.expression)),
	),

	lvalue: $ => choice(
	    $.identifier,
	    prec(9, seq($.lvalue,'.', $.identifier)),
	    prec(10, seq($.lvalue, '[', $.index, ']'))
	),

	index: $ => choice(
	    $.expression,
	    seq($.expression, '+', ':', $.expression)
	),


	match_arm: $ => seq($.expression, '=>', $.expression),

	message_def: $ => seq(
	    $.message_direction,
	    $.identifier,
	    ':', '(',
	    sepBy($.sig_type_chan_local, ','),
	    ')',
	    optional($.message_sync_mode_spec),
	    optional($.recv_message_sync_mode_spec),
	),

	recv_message_sync_mode_spec: $ => seq('-', $.message_sync_mode_spec),

	message_sync_mode_spec: $ => seq(
	    '@',
	    choice(
		seq('#',
		    choice(
			seq($.int_literal, optional(seq('~', $.int_literal))),
			seq($.identifier, optional(seq('+', $.int_literal)))
		    )
		   ),
		'dyn'
	    )
	),
	message_direction: $ => choice('left', 'right'),
	sig_type_chan_local: $ => seq(
	    choice($.data_type, 'void'),
	    '@',
	    optional($.lifetime_spec_chan_local)
	),
	int_maybe_param: $ => choice($.int_literal, $.identifier),

	data_type_no_array: $ => choice(
	    'logic',
	    prec(0, $.identifier),
	    prec.right(1, seq($.identifier, '<', sepBy($.param_value,','), '>')),
	    seq('(', sepBy($.data_type, ','), ')')
	),	
	data_type_array_range: $ => seq('[', $.int_maybe_param, ']'),
	data_type: $ => seq(
	    $.data_type_no_array,
	    repeat($.data_type_array_range),
	),

	lifetime_spec: $ => $.timestamp,
	lifetime_spec_chan_local: $ => $.timestamp_chan_local,
	timestamp: $ => choice(
	    seq('#', $.int_literal),
	    $.message_specifier,
	    'eternal',
	),

	timestamp_chan_local: $ => choice(
	    seq('#', $.int_literal),
	    seq($.identifier, optional(seq($.plus_minus, $.int_literal))),
	    'eternal',
	),

	plus_minus: $ => choice('+', '-'),

	message_specifier: $ => seq(
	    $.identifier,
	    optional($.get_array_index_string),
	    '.',
	    $.identifier
	),

	get_array_index_string: $ => repeat1(seq('[', $.int_or_id, ']')),

	int_or_id: $ => choice($.int_literal, $.identifier),
	
	shared_var_def: $ => seq(
	    'shared', '(', $.lifetime_spec, ')',
	    $.identifier,
	    'assigned', 'by',
	    $.int_literal,
	),

	macro_def: $ => seq('const', $.identifier, '=', $.int_literal, ';'),

	function_def: $ => seq(
	    'func', $.identifier,
	    '(', sepBy($.typed_arg, ','), ')',
	    '{', $.expression, '}'
	),

	typed_arg: $ => seq(
	    $.identifier,
	    optional(seq(':', $.data_type))
	),

	identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

	int_literal: $ => token(/[0-9]+/),
	bit_literal: $ => token(/[0-9]+'[bB][01]+/),
	dec_literal: $ => token(/[0-9]+'[dD][0-9]+/),
	hex_literal: $ => token(/[0-9]+'[hH][0-9a-fA-F]+/),
	string_literal: $ => token(/"[^"]*"/),

	comment: $ => choice(
	    $.block_comment,
	    $.line_comment,
	),

	block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
	line_comment: $ => token(seq('//', /.*/)),
    }
});

// ---------- helper functions ----------
function sepBy(rule, separator) {
    return optional(sepBy1(rule, separator));
}

function sepBy1(rule, separator) {
    return seq(rule, repeat(seq(separator, rule)));
}
