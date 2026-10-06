const { writeFileSync } = require("fs");

const remRE = /\d*\.?\d+\s*r?em/g;

// Media query features @nativescript/core can evaluate
// (packages/core/css-mediaquery). Anything else in a query drops that
// comma-separated query; when none survive the whole @media block goes.
const supportedMediaFeatures = [
	"width",
	"height",
	"device-width",
	"device-height",
	"orientation",
	"prefers-color-scheme",
];

// rem/em have no meaning inside NS media query lengths — Length.parse treats
// a bare number as dips, so convert to dips (16px basis like declarations).
const mqLengthRE = /(\d*\.?\d+)\s*r?em/g;

function featureIsSupported(name) {
	const base = name.replace(/^(min|max)-/, "");
	return supportedMediaFeatures.includes(base);
}

function toDip(value) {
	return value.replace(mqLengthRE, (match) => `${parseFloat(match) * 16}`);
}

/**
 * Rewrite one "(...)" media feature into NativeScript-parseable colon syntax.
 * Returns an array of feature strings (double-sided ranges split in two), or
 * null when the feature can't be evaluated by core.
 */
function rewriteMediaFeature(inner) {
	inner = inner.trim();

	// (400px <= width < 700px) and (value <= feature <= value)
	let m = inner.match(
		/^([\d.]+[a-z%]*)\s*(<=|<)\s*([a-z-]+)\s*(<=|<)\s*([\d.]+[a-z%]*)$/i,
	);
	if (m) {
		if (!featureIsSupported(m[3])) return null;
		return [`(min-${m[3]}: ${toDip(m[1])})`, `(max-${m[3]}: ${toDip(m[5])})`];
	}

	// (width >= 40rem) / (width < 40rem) — feature-first range
	m = inner.match(/^([a-z-]+)\s*(<=|>=|<|>)\s*([\d.]+[a-z%]*)$/i);
	if (m) {
		if (!featureIsSupported(m[1])) return null;
		// < and > are exclusive; min-/max- are inclusive — near-enough for
		// breakpoint boundaries, and core has no exclusive comparator.
		const prefix = m[2] === ">" || m[2] === ">=" ? "min" : "max";
		return [`(${prefix}-${m[1]}: ${toDip(m[3])})`];
	}

	// (40rem <= width) / (640px > width) — value-first range (invert)
	m = inner.match(/^([\d.]+[a-z%]*)\s*(<=|>=|<|>)\s*([a-z-]+)$/i);
	if (m) {
		if (!featureIsSupported(m[3])) return null;
		const prefix = m[2] === ">" || m[2] === ">=" ? "max" : "min";
		return [`(${prefix}-${m[3]}: ${toDip(m[1])})`];
	}

	// (min-width: 40rem) — colon syntax, core-native
	m = inner.match(/^([a-z-]+)\s*:\s*(.+)$/i);
	if (m) {
		if (!featureIsSupported(m[1])) return null;
		return [`(${m[1]}: ${toDip(m[2])})`];
	}

	// (orientation), (color-gamut) — bare feature
	m = inner.match(/^([a-z-]+)$/i);
	if (m) {
		return featureIsSupported(m[1]) ? [`(${m[1]})`] : null;
	}

	return null;
}

/**
 * Rewrite an @media prelude for NativeScript: range syntax -> colon syntax,
 * rem/em -> dip, and drop queries using features core can't evaluate.
 * Returns the rewritten prelude, or null when nothing survives.
 */
function rewriteMediaPrelude(params) {
	const queries = [];
	for (const query of params.split(",")) {
		// core's media query parser rejects `not` queries (not-sm:, not-dark:, ...)
		if (/^\s*not\b/i.test(query)) continue;
		const replaced = query.replace(/\(([^()]+)\)/g, (_, inner) => {
			const out = rewriteMediaFeature(inner);
			return out === null ? " __UNSUPPORTED_MEDIA__" : out.join(" and ");
		});
		if (!replaced.includes(" __UNSUPPORTED_MEDIA__")) {
			queries.push(replaced.trim());
		}
	}
	return queries.length ? queries.join(", ") : null;
}

/**
 * Expand :where(...) into one selector per comma alternative. Alternatives
 * without a combinator become extra conditions on the element; alternatives
 * ending in `*` put the element in that ancestor context
 * (`.x:where(.ns-dark *)` → `.ns-dark .x`); alternatives whose last compound
 * is a real condition splice it onto the element.
 */
function expandWhereSelector(selector) {
	const start = selector.indexOf(":where(");
	if (start === -1) return [selector];

	let depth = 1,
		end = -1;
	for (let i = start + 7; i < selector.length; i++) {
		if (selector[i] === "(") depth++;
		else if (selector[i] === ")") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return [selector];

	const before = selector.slice(0, start);
	const after = selector.slice(end + 1);
	const args = selector.slice(start + 7, end);

	const alts = [];
	depth = 0;
	let last = 0;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "(") depth++;
		else if (args[i] === ")") depth--;
		else if (args[i] === "," && depth === 0) {
			alts.push(args.slice(last, i));
			last = i + 1;
		}
	}
	alts.push(args.slice(last));

	const out = [];
	for (const alt of alts) {
		const a = alt.trim();
		// last compound after a combinator, e.g. ".space-y-reverse > X"
		const m = a.match(/^(.*[>+~\s])\s*([^\s>+~]+)$/);
		if (m) {
			const [, prefix, lastCompound] = m;
			if (lastCompound === "*") {
				out.push(`${prefix.trim()} ${before}${after}`.trim());
			} else {
				out.push(`${prefix.trim()} ${before}${lastCompound}${after}`.trim());
			}
		} else {
			out.push(`${before}${a}${after}`);
		}
	}
	return out;
}

/**
 * Split a shorthand value on whitespace that is not inside parens.
 */
function splitArgs(value) {
	return value.trim().split(/\s+(?![^()]*\))/);
}

/**
 * Tailwind v4 emits CSS logical properties for the px/py/mx/my, space, and
 * divide utilities; @nativescript/core only implements the physical sides.
 * Inline-* maps to left/right, block-* to top/bottom; start/end sides also
 * get a right-to-left override (see appendRtlOverride).
 */
const logicalToPhysical = {
	"margin-inline": ["margin-left", "margin-right"],
	"margin-inline-start": ["margin-left"],
	"margin-inline-end": ["margin-right"],
	"margin-block": ["margin-top", "margin-bottom"],
	"margin-block-start": ["margin-top"],
	"margin-block-end": ["margin-bottom"],
	"padding-inline": ["padding-left", "padding-right"],
	"padding-inline-start": ["padding-left"],
	"padding-inline-end": ["padding-right"],
	"padding-block": ["padding-top", "padding-bottom"],
	"padding-block-start": ["padding-top"],
	"padding-block-end": ["padding-bottom"],
	"border-inline-width": ["border-left-width", "border-right-width"],
	"border-inline-start-width": ["border-left-width"],
	"border-inline-end-width": ["border-right-width"],
	"border-inline-color": ["border-left-color", "border-right-color"],
	"border-block-width": ["border-top-width", "border-bottom-width"],
	"border-block-start-width": ["border-top-width"],
	"border-block-end-width": ["border-bottom-width"],
	"border-block-color": ["border-top-color", "border-bottom-color"],
};

// Start/end sides that flip in right-to-left layouts: [LTR side, RTL side].
const directionalSides = {
	"margin-inline-start": ["margin-left", "margin-right"],
	"margin-inline-end": ["margin-right", "margin-left"],
	"padding-inline-start": ["padding-left", "padding-right"],
	"padding-inline-end": ["padding-right", "padding-left"],
	"border-inline-start-width": ["border-left-width", "border-right-width"],
	"border-inline-end-width": ["border-right-width", "border-left-width"],
};

// The LTR physical rule stays as-is; this override follows it, flipping the
// side under core's .ns-rtl root class (core 9.0+). :where() keeps the override's
// specificity equal to the original's, so later physical utilities (pl-*, pr-*)
// still win as on the web; elsewhere the override never matches.

function appendRtlOverride(rule) {
	const flipped = rule.nodes.filter((node) => node.type === "decl" && directionalSides[node.prop]);
	if (!flipped.length) return;

	const values = new Map();
	for (const decl of flipped) {
		const [ltrSide, rtlSide] = directionalSides[decl.prop];
		if (!values.has(ltrSide)) values.set(ltrSide, "unset");
		values.set(rtlSide, decl.value);
	}

	const override = rule.clone({
		selectors: rule.selectors.map((selector) => `:where(.ns-rtl) ${selector}`),
		nodes: [],
	});
	for (const [prop, value] of values) {
		override.append({ prop, value });
	}
	// visitors receive proxies, so the marker lives on the node, not in a WeakSet
	override.raws.nsRtlOverride = true;
	rule.after(override);
}

const oppositeSide = {
	left: "right",
	right: "left",
	top: "bottom",
	bottom: "top",
	"inline-start": "inline-end",
	"inline-end": "inline-start",
	"block-start": "block-end",
	"block-end": "block-start",
};

function swapSides(prop) {
	return prop.replace(
		/-(inline-start|inline-end|block-start|block-end|left|right|top|bottom)(?=-|$)/,
		(_, side) => `-${oppositeSide[side]}`,
	);
}

/**
 * Tailwind v4 transform utilities set `--tw-translate-*`/`--tw-scale-*`
 * custom properties in the same rule, then apply them via `translate:`/
 * `scale:` shorthands — neither shorthand exists on core, per-axis props
 * (translateX/scaleX/scaleY) are animation-only and never apply through
 * the stylesheet, and `transform:` is the only door in.
 *
 * Composition strategy: the `transform:` value passes through core's
 * var() substitution before transformConverter parses it, so every
 * utility emits the FULL four-axis expression reading the other
 * utilities' --tw-* vars with identity fallbacks. Last rule wins the
 * transform decl but resolves *all* applied vars — translate-x-* +
 * scale-* on one element composes, same var mechanism as the web.
 *
 * The catch: core doesn't resolve nested var()/calc() — a --tw-* value
 * like 'calc(var(--spacing) * 4)' would re-introduce a var at the
 * use site. So the --tw-* decl VALUES are rewritten to literal numbers
 * (--spacing × N for the spacing-calc form, %→factor for scale,
 * rem→dips), making every var() single-hop.
 */
const transformVarToFn = {
	"--tw-translate-x": "translateX",
	"--tw-translate-y": "translateY",
	"--tw-scale-x": "scaleX",
	"--tw-scale-y": "scaleY",
};
const TRANSFORM_VALUE =
	"translateX(var(--tw-translate-x, 0)) " +
	"translateY(var(--tw-translate-y, 0)) " +
	"scaleX(var(--tw-scale-x, 1)) " +
	"scaleY(var(--tw-scale-y, 1))";

// dip value of 1 × --spacing (theme.css ships --spacing: .25rem → 4)
const rootSpacing = new WeakMap();
function resolveSpacing(root) {
	if (rootSpacing.has(root)) return rootSpacing.get(root);
	let value = 4;
	root.walkDecls("--spacing", (decl) => {
		const n = parseFloat(decl.value);
		if (Number.isNaN(n)) return;
		value = decl.value.includes("rem") || decl.value.includes("em") ? n * 16 : n;
	});
	rootSpacing.set(root, value);
	return value;
}

// Core's transform parser ignores `%`, so a percent translate (translate-x-1/2,
// translate-x-full) would move by that many dips instead of the view's size.
const UNSUPPORTED_TRANSFORM_ARG = Symbol("unsupported");

// Evaluates calc() arithmetic over unitless numbers; null for anything else.
function evaluateArithmetic(expression) {
	const tokens = expression.replace(/calc\(/g, "(").match(/\d*\.?\d+|[-+*/()]|\S/g) ?? [];
	let i = 0;
	const factor = () => {
		const token = tokens[i++];
		if (token === "-") return -factor();
		if (token === "+") return factor();
		if (token === "(") {
			const value = sum();
			return tokens[i++] === ")" ? value : NaN;
		}
		return /^\d*\.?\d+$/.test(token) ? parseFloat(token) : NaN;
	};
	const product = () => {
		let value = factor();
		while (tokens[i] === "*" || tokens[i] === "/") {
			value = tokens[i++] === "*" ? value * factor() : value / factor();
		}
		return value;
	};
	const sum = () => {
		let value = product();
		while (tokens[i] === "+" || tokens[i] === "-") {
			value = tokens[i++] === "+" ? value + product() : value - product();
		}
		return value;
	};
	const value = sum();
	return i === tokens.length && Number.isFinite(value) ? value : null;
}

// Resolve a --tw-* arg to a literal for translateX(N)/scaleX(N).
// 'calc(var(--spacing) * 4)' → spacing × 4; '95%' / 'calc(100% * -1)' →
// 0.95 / -1 (scale); '16px'/'-8'/'1rem' → number (rem → ×16).
function resolveTransformArg(raw, isScale, root) {
	const v = raw.trim();
	const spacingCalc = v.match(/^calc\(var\(--spacing\)\s*\*\s*(-?[\d.]+)\)$/);
	if (spacingCalc) {
		return resolveSpacing(root) * parseFloat(spacingCalc[1]);
	}
	if (v.includes("var(")) return null;
	if (!isScale && v.includes("%")) return UNSUPPORTED_TRANSFORM_ARG;
	if (v.startsWith("calc(")) {
		return evaluateArithmetic(v.replace(/(\d*\.?\d+)%/g, (_, n) => `${parseFloat(n) / 100}`));
	}
	const n = parseFloat(v);
	if (Number.isNaN(n)) return null;
	if (isScale) return v.endsWith("%") ? n / 100 : n;
	return v.endsWith("rem") || v.endsWith("em") ? n * 16 : n;
}

// Rules already merged — re-entering per decl would double-emit.
const mergedTransformRules = new WeakSet();

function isSupportedProperty(prop, val = null) {
	const rules = supportedProperties[prop];
	if (!rules) return false;

	if (val) {
		if (unsupportedValues.some((unit) => val.endsWith(unit))) {
			return false;
		}

		if (Array.isArray(rules)) {
			return rules.includes(val);
		}
	}

	return true;
}

function isSupportedSelector(selector) {
	const hasUnsupportedPseudoSelector = unsupportedPseudoSelectors.some(
		(pseudo) => selector.includes(pseudo)
	);

	return !hasUnsupportedPseudoSelector;
}

function isPlaceholderPseudoSelector(selector) {
	return selector.includes("::placeholder");
}

/**
 * @param {@} options
 * @returns {import('postcss').Plugin}
 */
module.exports = (options = { debug: false }) => {
	return {
		postcssPlugin: "postcss-nativescript",
		AtRule: {
			// NativeScript's media query engine covers width/height/
			// device-*/orientation/prefers-color-scheme in colon syntax.
			// Rewrite Tailwind's range syntax into it and drop only the
			// queries that use features core can't evaluate.
			media(mediaAtRule) {
				const rewritten = rewriteMediaPrelude(mediaAtRule.params);
				if (rewritten === null) {
					return mediaAtRule.remove();
				}
				mediaAtRule.params = rewritten;
			},

			// Flatten @supports rules instead of removing them.
			// NativeScript Core 8.9.1+ supports color-mix() (see NativeScript/NativeScript#10718),
			// and Tailwind v4 wraps opacity modifier utilities in @supports(color: color-mix(...)).
			supports(supportsAtRule) {
				if (!supportsAtRule.nodes || !supportsAtRule.nodes.length) {
					return supportsAtRule.remove();
				}
				supportsAtRule.replaceWith(...supportsAtRule.nodes);
			},

			// remove @property rules
			// Tailwind v4 uses these for custom property definitions
			property(propertyAtRule) {
				propertyAtRule.remove();
			},

			// Tailwind v4 wraps most output in @layer blocks (base/theme/utilities).
			// NativeScript's CSS engine does not implement CSS Cascade Layers,
			// so rules inside @layer would otherwise be ignored.
			//
			// Flatten those layers by lifting their child rules into the parent,
			// preserving order so specificity/cascade still work as expected.
			layer(layerAtRule) {
				if (!layerAtRule.nodes || !layerAtRule.nodes.length) {
					return layerAtRule.remove();
				}

				layerAtRule.replaceWith(...layerAtRule.nodes);
			},
		},
		// Uncomment to debug the final output
		// OnceExit(rule) {
		//   writeFileSync('./tailwind-output.css', rule.toString());
		// },
		Rule(rule) {
			if (rule.raws.nsRtlOverride) return;

			// remove rules with empty selectors (can happen after stripping ::placeholder)
			if (!rule.selector || rule.selector.trim() === '') {
				return rule.remove();
			}

			// remove empty rules
			if (rule.nodes.length === 0) {
				return rule.remove();
			}

			// remove rules that contain CSS nesting (& selector) - not supported in NativeScript
			// Tailwind v4 uses nesting for variants like dark mode and space utilities
			if (rule.selector.includes('&')) {
				return rule.remove();
			}

			// replace :root and :host pseudo selector, introduced in Tailwind 4+ with .ns-root for var handling.
			if (rule.selector.includes(":root") || rule.selector.includes(":host")) {
				const rootClasses = '.ns-root, .ns-modal';
				rule.selectors = rule.selectors.map((selector) =>
					selector.replace(/:root/, rootClasses).replace(/:host/, rootClasses)
				);
			}

			// remove rules with unsupported selectors
			if (!isSupportedSelector(rule.selector)) {
				return rule.remove();
			}

			// convert ::placeholder pseudo selector
			// to use placeholder-color declaration
			if (isPlaceholderPseudoSelector(rule.selector)) {
				const placeholderSelectors = [];
				rule.selectors.forEach((selector) => {
					if (isPlaceholderPseudoSelector(selector)) {
						const cleaned = selector.replace(/::placeholder/g, "").trim();
						// Only add non-empty selectors
						if (cleaned) {
							placeholderSelectors.push(cleaned);
						}
					}
				});
				// If all selectors became empty, remove the rule
				if (placeholderSelectors.length === 0) {
					return rule.remove();
				}
				if (placeholderSelectors.length) {
					rule.selectors = placeholderSelectors;
					rule.walkDecls((decl) => {
						if (decl.prop === "color") {
							decl.replaceWith(decl.clone({ prop: "placeholder-color" }));
						}
					});
				}
				// rule.selector.replace('::placeholder', '')
			}

			// expand :where() (Tailwind v4 emits it for dark: and space-*/divide-*)
			// so the selectors below can be rewritten into forms core matches.
			while (rule.selectors.some((s) => s.includes(":where("))) {
				rule.selectors = rule.selectors.flatMap(expandWhereSelector);
			}

			// replace space and divide selectors to use a simpler selector that works in ns (v4 and newer)
			if (rule.selector.includes(":not(:last-child)")) {
				rule.selectors = rule.selectors.map((selector) => {
					return selector.replace(":not(:last-child)", "* + *");
				});
				// v4 puts the gap on the end side of all-but-last children; `* + *`
				// selects all-but-first, so the gap moves to the start side.
				rule.walkDecls(/^(margin|border)-/, (decl) => {
					decl.prop = swapSides(decl.prop);
				});
			}

			// replace space and divide selectors to use a simpler selector that works in ns (older versions)
			if (rule.selector.includes(":not([hidden]) ~ :not([hidden])")) {
				rule.selectors = rule.selectors.map((selector) => {
					return selector.replace(":not([hidden]) ~ :not([hidden])", "* + *");
				});
			}

			appendRtlOverride(rule);
		},
		Declaration(decl) {
			// tailvind v4 changed how the divide and space utilities work, now we need to set two variables called
			// --tw-divide-x-reverse and --tw-divide-y-reverse but for them to work we need to remove the variable
			// declarations from the divide and space utilities classes
			const broken = /--tw-(divide|space)-[xy]-reverse/g;

			if (decl.prop?.match(broken) && decl.parent.selector?.match(/\.(divide|space)-[xy]/)) {
				return decl.remove();
			}

			// invalid with core 8.8+ at moment
			// Note: could be supported at somepoint
			if (decl.prop === "placeholder-color" && decl.value?.includes("color-mix")) {
				return decl.remove();
			}

			// invalid with core 8.8+ at moment
			// Note: could be supported at somepoint
			if (decl.value?.includes("currentColor")) {
				return decl.remove();
			}

			// logical -> physical property sides (px-*/py-*/mx-*/my-*,
			// space-*/divide-*, ps-*/pe-*/ms-*/me-*, border-x/y on v4).
			// Inserted declarations are re-visited by this same handler.
			const physical = logicalToPhysical[decl.prop];
			if (physical) {
				const clones = physical.map((prop) =>
					decl.clone({ prop }),
				);
				decl.parent.insertAfter(decl, clones);
				return decl.remove();
			}

			// max-w-none/max-h-none: core spells "no maximum" as auto and rejects none
			if ((decl.prop === "max-width" || decl.prop === "max-height") && decl.value === "none") {
				return decl.replaceWith(decl.clone({ value: "auto" }));
			}

			// replace vertical-align: middle
			// with    vertical-align: center
			if (decl.prop === "vertical-align") {
				switch (decl.value) {
					case "middle":
						return decl.replaceWith(decl.clone({ value: "center" }));
				}
			}

			// declarations that define unsupported variables/rules
			if (
				[
					"tw-ring",
					"tw-shadow",
					"tw-ordinal",
					"tw-slashed-zero",
					"tw-numeric",
				].some((varName) => decl.prop.startsWith(`--${varName}`))
			) {
				return decl.remove();
			}

			// Convert em/rem values to device pixel values
			// assuming 16 as the basis for rem and
			// treating em as rem
			if (decl.value.includes("rem") || decl.value.includes("em")) {
				decl.value = decl.value.replace(remRE, (match, offset, value) => {
					const converted = "" + parseFloat(match) * 16;

					options.debug &&
						console.log("replacing r?em value", {
							match,
							offset,
							value,
							converted,
						});

					return converted;
				});
				options.debug &&
					console.log({
						final: decl.value,
					});
			}

			// Transform utilities: rewrite --tw-* values to literals so the
			// shared transform decl's var()s resolve single-hop, then emit
			// `transform:` once per rule (literal shorthand args get baked in).
			if (
				decl.prop in transformVarToFn ||
				decl.prop === "translate" ||
				decl.prop === "scale"
			) {
				const rule = decl.parent;
				if (mergedTransformRules.has(rule)) {
					// merge already ran — leave remaining decls (the --tw-*
					// vars are the composition channel and must survive)
					return;
				}
				mergedTransformRules.add(rule);

				// literal pieces from translate:/scale: shorthands override
				// the matching var() slot
				const parts = {
					tx: "var(--tw-translate-x, 0)",
					ty: "var(--tw-translate-y, 0)",
					sx: "var(--tw-scale-x, 1)",
					sy: "var(--tw-scale-y, 1)",
				};
				// Only rules applying a translate:/scale: shorthand get a transform;
				// rules that just initialize the vars (the `*` reset) must not.
				let hasShorthand = false;
				let hasSupportedArg = false;
				const isLiteral = (v) => v != null && v !== UNSUPPORTED_TRANSFORM_ARG;
				for (const sib of [...(rule.nodes ?? [])]) {
					if (sib.type !== "decl") continue;
					const fn = transformVarToFn[sib.prop];
					if (fn) {
						const v = resolveTransformArg(sib.value, fn.startsWith("scale"), decl.root());
						if (v === UNSUPPORTED_TRANSFORM_ARG) {
							sib.remove();
							continue;
						}
						if (v != null) {
							sib.value = `${v}`;
						}
						hasSupportedArg = true;
					} else if (sib.prop === "translate" || sib.prop === "scale") {
						const isS = sib.prop === "scale";
						hasShorthand = true;
						if (sib.value.trim() === "none") {
							parts[isS ? "sx" : "tx"] = isS ? "1" : "0";
							parts[isS ? "sy" : "ty"] = isS ? "1" : "0";
							hasSupportedArg = true;
						} else if (!sib.value.includes("var(")) {
							const [x, y] = splitArgs(sib.value);
							const xv = resolveTransformArg(x, isS, decl.root());
							if (isLiteral(xv)) {
								parts[isS ? "sx" : "tx"] = `${xv}`;
								hasSupportedArg = true;
							}
							const yv = y ?? (isS ? x : undefined);
							const yr = yv !== undefined ? resolveTransformArg(yv, isS, decl.root()) : null;
							if (isLiteral(yr)) {
								parts[isS ? "sy" : "ty"] = `${yr}`;
								hasSupportedArg = true;
							}
						}
						sib.remove();
					}
				}
				if (hasShorthand && hasSupportedArg) {
					const value =
						`translateX(${parts.tx}) translateY(${parts.ty}) ` +
						`scaleX(${parts.sx}) scaleY(${parts.sy})`;
					// `decl` itself may have been folded away above, so it can't anchor this.
					rule.prepend(decl.clone({ prop: "transform", value }));
				}
				// shorthand decls are folded into transform; --tw-* vars stay
				// (rewritten to literals — they're the composition channel)
				return;
			}

			// remove unsupported properties
			if (
				!decl.prop.startsWith("--") &&
				!isSupportedProperty(decl.prop, decl.value)
			) {
				// options.debug && console.log('removing ', decl.prop, decl.value)
				return decl.remove();
			}
		},
	};
};
module.exports.postcss = true;

// Property allowlist — kept in sync with the CssProperty registry in
// @nativescript/core (packages/core ui/styling/style-properties.ts plus
// per-view registrations). Properties core parses but that aren't valid
// Tailwind output are still listed so hand-written CSS survives the pass.
const supportedProperties = {
	"align-content": true,
	"align-items": true,
	"align-self": true,
	"android-content-inset": true,
	"android-content-inset-left": true,
	"android-content-inset-right": true,
	"android-selected-tab-highlight-color": true,
	"android-status-bar-background": true,
	"android-elevation": true,
	"android-dynamic-elevation-offset": true,
	animation: true,
	"animation-delay": true,
	"animation-direction": true,
	"animation-duration": true,
	"animation-fill-mode": true,
	"animation-iteration-count": true,
	"animation-name": true,
	"animation-timing-function": true,
	background: true,
	"background-color": true,
	"background-image": true,
	"background-position": true,
	"background-repeat": ["repeat", "repeat-x", "repeat-y", "no-repeat"],
	"background-size": true,
	"border-bottom-color": true,
	"border-bottom-left-radius": true,
	"border-bottom-right-radius": true,
	"border-bottom-width": true,
	"border-color": true,
	"border-left-color": true,
	"border-left-width": true,
	"border-radius": true,
	"border-right-color": true,
	"border-right-width": true,
	"border-top-color": true,
	"border-top-left-radius": true,
	"border-top-right-radius": true,
	"border-top-width": true,
	"border-width": true,
	"box-shadow": true,
	"clip-path": true,
	color: true,
	"column-gap": true,
	"corner-shape": ["squircle", "round"],
	direction: ["ltr", "rtl"],
	flex: true,
	"flex-flow": true,
	"flex-grow": true,
	"flex-direction": true,
	"flex-shrink": true,
	"flex-wrap": true,
	"flex-wrap-before": true,
	font: true,
	"font-family": true,
	"font-size": true,
	"font-style": ["italic", "normal"],
	"font-weight": true,
	"font-variation-settings": true,
	gap: true,
	height: true,
	"highlight-color": true,
	"horizontal-align": ["left", "center", "right", "stretch"],
	"icon-font-family": true,
	"justify-content": true,
	"justify-items": true,
	"justify-self": true,
	"letter-spacing": true,
	"line-height": true,
	margin: true,
	"margin-bottom": true,
	"margin-left": true,
	"margin-right": true,
	"margin-top": true,
	"margin-block": true,
	"margin-block-start": true,
	"margin-block-end": true,
	"margin-inline": true,
	"margin-inline-start": true,
	"margin-inline-end": true,
	"max-height": true,
	"max-lines": true,
	"max-width": true,
	"min-height": true,
	"min-width": true,
	"off-background-color": true,
	opacity: true,
	order: true,
	padding: true,
	"padding-block": true,
	"padding-bottom": true,
	"padding-inline": true,
	"padding-left": true,
	"padding-right": true,
	"padding-top": true,
	perspective: true,
	"place-content": true,
	"placeholder-color": true,
	"place-items": true,
	"place-self": true,
	rotate: true,
	rotatex: true,
	rotatey: true,
	"row-gap": true,
	// core registers these camelCase cssNames (style-properties.ts)
	scaleX: true,
	scaleY: true,
	"selected-background-color": true,
	"selected-tab-text-color": true,
	"selected-text-color": true,
	"separator-color": true,
	"status-bar-style": true,
	"tab-background-color": true,
	"tab-text-color": true,
	"tab-text-font-size": true,
	"text-transform": true,
	"text-align": ["left", "center", "right"],
	"text-decoration": ["none", "line-through", "underline"],
	"text-overflow": ["clip", "ellipsis"],
	"text-shadow": true,
	"text-stroke": true,
	"text-transform": ["none", "capitalize", "uppercase", "lowercase"],
	"tint-color": true,
	transform: true,
	translateX: true,
	translateY: true,
	"vertical-align": ["top", "center", "middle", "bottom", "stretch"],
	visibility: ["visible", "hidden", "collapse", "collapsed"],
	"white-space": ["normal", "nowrap", "wrap"],
	width: true,
	"z-index": true,
};

const unsupportedPseudoSelectors = [":focus-within", ":hover"];
const unsupportedValues = ["max-content", "min-content", "vh", "vw"];
