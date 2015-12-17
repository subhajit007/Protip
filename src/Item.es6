/**
 * The class represents on tooltip's instance.
 */

import * as C from 'Constants'
import GravityTester from 'GravityTester'
import PositionCalculator from 'PositionCalculator'
import Observer from 'Observer'
import Util from 'Util'

export default class extends Observer {

	/* jshint ignore:start */
	Override = undefined
	/** @type {object}    Object storing some DOM elements */
	El = {}
	/** @type {object}    All the data-* properties gathered from the source element. */
	Data = {}
	/** @type {boolean}   Tells us of our protip is currently visible or not. */
	IsVisible = false
	/** @type {object}    Object storing setTimeout tasks */
	Task = {
		delayIn: undefined,
		delayOut: undefined
	}
	/* jshint ignore:end */

	/**
	 * Constructor
	 * @param id            {String}      Identifier of the protip.
	 * @param el            {Element}     Source element we are creating the instance for.
	 * @param override      [Object]      Override data-pt-* values.
	 * @returns {Item}
	 */
	constructor(id, el, override) {

		// Attaches observer event handlers
		super.constructor(el)

		/** @type {object} Override data-pt-* values. */
		this.Override = override || {}
		this.Override.identifier = id

		/** @type {jQuery}    The source element. */
		this.$source = el

		// Prepare class
		this._fetchData()
		this._prepareInternals()
		this._appendProtip()
		this._initSticky()
		this._initAutoShow()
		this._bind()

		// Add protip class if it didn't have.
		this.$source.classList.add(this.Class.settings.selector.replace('.', ''))
		// Tell the source that we are ready to go
		this.set(C.PROP_INITED, true)
	}


	get(key) {
		return this.$source.protip.get(key)
	}

	/**
	 * Data value setter. This is called through the element API
	 * @param key
	 * @param value
	 */
	set(key, value) {
		return this.$source.protip.set(key, value)
	}

	get $source() {
		return this.El.source
	}

	set $source(el) {
		this.El.source = el
	}

	get $protip() {
		return this.El.source
	}

	set $protip(el) {
		this.El.protip = el
	}

	get $arrow() {
		return this.El.arrow
	}

	set $arrow(el) {
		this.El.arrow = el
	}

	get isVisible() {
		return this.IsVisible
	}

	set isVisible(v) {
		this.IsVisible = v
	}

	/**
	 * Common handler for every mouse event.
	 *
	 * @param eventType {string} Type of the event.
	 */
	actionHandler(eventType) {
		let trigger = this.get(C.PROP_TRIGGER)

		if (this.get(C.PROP_TRIGGER) === C.TRIGGER_STICKY) { /* jshint ignore:line */
			// No handler needed for sticky
		}
		// Handling clicky protips
		else if (
			eventType === C.EVENT_CLICK
			&& (trigger === C.TRIGGER_CLICK || trigger === C.TRIGGER_CLICK2)
		) {
			this.toggle()
		}
		// Handling mouseover protips
		else if (
			trigger !== C.TRIGGER_CLICK
			&& trigger !== C.TRIGGER_CLICK2
		) {
			switch(eventType) {
				case C.EVENT_MOUSEOUT:
					this.hide()
					break
				case C.EVENT_MOUSEOVER:
					this.show()
					break
				default: break
			}
		}
	}

	/**
	 * Destroys the current intance.
	 * Reset data, hide, unbind, remove.
	 */
	destroy() {
		this.hide(true)
		this._unbind()
		this.fire(C.ITEM_EVENT_DESTROY, this.$source.get(C.PROP_IDENTIFIER))
		this.$protip.parentNode.removeChild(this.$protip)
		this.set(C.PROP_INITED, false)
			.set(C.PROP_IDENTIFIER, false)
		Object.keys(this.Task).forEach((k, task) => clearTimeout(task))
	}

	/**
	 * Toggles the tooltip visibility state.
	 */
	toggle() {
		this.isVisible && this.hide()
		!this.isVisible && this.show()
	}

	/**
	 * Make a tooltip visible.
	 *
	 * @param force          [boolean]  If 'true' there will be no timeouts.
	 * @param preventTrigger [boolean]  If 'true' protipShow won't be triggered.
	 */
	show(force, preventTrigger) {

		// No title? Why tooltip?
		if (!this.get(C.PROP_TITLE)) return

		// Clear timeouts
		clearTimeout(this.Task.delayOut)
		clearTimeout(this.Task.delayIn)
		clearTimeout(this.Task.autoHide)

		// Set new timeout task if needed
		let delayIn = this.get(C.PROP_DELAY_IN)
		if (!force && delayIn) {
			this.Task.delayIn = setTimeout(() => this.show(true), delayIn)
			// Return, our timeout will call again later...
			return
		}

		// Auto hide
		let autoHide = this.get(C.PROP_AUTOHIDE)
		if (autoHide !== false) {
			this.Task.autoHide = setTimeout(() => this.hide(true), this.data.autoHide)
		}

		let style;

		// Handle gravity/non-gravity based position calculations
		if (this.get(C.PROP_GRAVITY)) {
			style = new GravityTester(this)
			delete style.position
		}
		else {
			style = new PositionCalculator(this)
		}

		// Fire show event and add open class
		this.$source.classList.add(C.SELECTOR_OPEN)
		!preventTrigger && this.fire(C.EVENT_PROTIP_SHOW, this)

		// Apply styles, classes
		Util.extend(this.$protip.style, style)
		this.$protip.classList.add(C.SELECTOR_SHOW)

		// If we need animation
		let animate = this.get(C.PROP_ANIMATE)
		animate
		&& this.$protip.classList.add(C.SELECTOR_ANIMATE)
		&& this.$protip.classList.add(animate)

		// Set visibility
		this.isVisible = true
	}

	/**
	 * Apply a position to the tooltip.
	 *
	 * @param position
	 */
	applyPosition (position) {
		this.$protip.setAttribute(C.DEFAULT_NAMESPACE + '-' + C.PROP_POSITION, position)
	}

	/**
	 * Make a tooltip invisible.
	 *
	 * @param force          [boolean]  If 'true' there will be no timeouts.
	 * @param preventTrigger [boolean]  If 'true' protipHide event won't be triggered.
	 */
	hide (force, preventTrigger) {

		clearTimeout(this.Task.delayOut);
		clearTimeout(this.Task.delayIn);
		clearTimeout(this.Task.autoHide);

		// Set new timeout task if needed
		let delayOut = this.get(C.PROP_DELAY_OUT)
		if (!force && delayOut) {
			this._task.delayOut = setTimeout(() => this.hide(true), delayOut)
			// Return, our timeout will call again later...
			return
		}

		// Fire show event and remove open class
		this.$source.classList.remove(C.SELECTOR_OPEN)
		!preventTrigger && this.fire(C.EVENT_PROTIP_HIDE, this)

		// Remove classes and set visibility
		this.$protip.classList.remove(C.SELECTOR_SHOW)
		this.$protip.classList.remove(C.SELECTOR_ANIMATE)
		this.$protip.classList.remove(this.get(C.PROP_ANIMATE))

		this._isVisible = false
	}

	/**
	 * Returns arrow offset (width/height)
	 *
	 * @returns {{width: number, height: number}}
	 */
	getArrowOffset() {
		return {
			width : this.$arrow.offsetWidth,
			height: this.$arrow.offsetHeight
		}
	}

	/**
	 * Fetches every data-* properties from the source element.
	 * It extends the defaults, then it applies back to the element.
	 *
	 * @private
	 * TILL
	 */
	_fetchData() {

		// Fetch
		$.each(this.classInstance.settings.defaults, $.proxy(function(key){
			this.data[key] = this.El.source.data(this._namespaced(key));
		}, this));

		// Merge/Extend
		this.data = $.extend({}, this.classInstance.settings.defaults, this.data);
		this.data = $.extend({}, this.data, this._override);

		// Now apply back to the element
		$.each(this.data, $.proxy(function(key, value){
			this.El.source.data(this._namespaced(key), value);
		}, this));
	}

	/**
	 * A package function to call several setup procedures.
	 *
	 * @private
	 */
	_prepareInternals() {
		this._setTarget();
		this._detectTitle();
		this._checkInteractive();
	}

	/**
	 * Checks if the tooltip should be interactive and applies delayout according to it.
	 *
	 * @private
	 */
	_checkInteractive() {
		if (this.data.interactive) {
			this.data.delayOut = this.data.delayOut || C.DEFAULT_DELAY_OUT;
		}
	}

	/**
	 * Initializes sticky protips.
	 *
	 * @private
	 */
	_initSticky() {
		(this.data.trigger === C.TRIGGER_STICKY) && this.show();
	}

	/**
	 * Initializes autoShow protips.
	 *
	 * @private
	 */
	_initAutoShow() {
		this.data.autoShow && this.show();
	}

	/**
	 * Generates the output HTML for the tooltip from the template.
	 * Also appends it to the proper place.
	 *
	 * @private
	 */
	_appendProtip() {

		// Generate HTML from template
		this.El.protip = nano(this.classInstance.settings.protipTemplate, {
			classes: this._getClassList(),
			widthType: this._getWidthType(),
			width: this._getWidth(),
			content: this.data.title,
			icon: this._getIconTemplate(),
			arrow: this.data.arrow ? C.TEMPLATE_ARROW : '',
			identifier: this.data.identifier
		});

		// Convert to jQuery object and append
		this.El.protip = $(this.El.protip);
		this.El.protipArrow = this.El.protip.find('.' + C.SELECTOR_PREFIX + C.SELECTOR_ARROW);
		this.El.target.append(this.El.protip);
	}

	/**
	 * Generate a space separated class list based on the settings.
	 *
	 * @returns {string} The final class list.
	 * @private
	 */
	_getClassList() {
		var classList = [];
		var skin      = this.data.skin;
		var size      = this.data.size;
		var scheme    = this.data.scheme;

		// Main container class
		classList.push(C.SELECTOR_PREFIX + C.SELECTOR_CONTAINER);
		// Skin class
		classList.push(C.SELECTOR_SKIN_PREFIX + skin);
		// Size class
		classList.push(C.SELECTOR_SKIN_PREFIX + skin + C.SELECTOR_SIZE_PREFIX + size);
		// Scheme class
		classList.push(C.SELECTOR_SKIN_PREFIX + skin + C.SELECTOR_SCHEME_PREFIX + scheme);
		// Custom classes
		this.data.classes && classList.push(this.data.classes);
		// Mixin classes
		this.data.mixin && classList.push(this._parseMixins());

		return classList.join(' ');
	}


	_parseMixins() {
		var mixin = [];

		this.data.mixin && this.data.mixin.split(' ').forEach(function(val){
			val && mixin.push(C.SELECTOR_MIXIN_PREFIX + val);
		}, this);

		return mixin.join(' ');
	}

	/**
	 * Determines the type of width.
	 *
	 * @returns {C.ATTR_MAX_WIDTH || C.ATTR_WIDTH}
	 * @private
	 */
	_getWidthType() {
		return !isNaN(this.data.width) ? C.ATTR_MAX_WIDTH : C.ATTR_WIDTH;
	}

	/**
	 * Width getter
	 *
	 * @returns {Number}
	 * @private
	 */
	_getWidth() {
		return parseInt(this.data.width, 10);
	}

	/**
	 * Compiles the icon template.
	 *
	 * @returns {string}  HTML string
	 * @private
	 */
	_getIconTemplate() {
		return this.data.icon ?
			Util.nano(this.classInstance.settings.iconTemplate, {
				icon: this.data.icon
			})
			: '';
	}

	/**
	 * Detects where to get the title from.
	 *
	 * @private
	 */
	_detectTitle() {
		if (this.data.title && (this.data.title.charAt(0) === '#' || this.data.title.charAt(0) === '.')) {
			this.data.titleSource = this.data.titleSource || this.data.title;
			this.data.title = $(this.data.title).html();
		}
		else if (this.data.title && this.data.title.charAt(0) === ':') {
			var which = this.data.title.substring(1);
			switch (which) {
				case C.PSEUDO_NEXT:
					this.data.title = this.El.source.next().html();
					break;
				case C.PSEUDO_PREV:
					this.data.title = this.El.source.prev().html();
					break;
				case C.PSEUDO_THIS:
					this.data.title = this.El.source.html();
					break;
				default: break;
			}
		}

		// Set to interactive if detects link
		if (this.data.title && this.data.title.indexOf('<a ')+1) {
			this.data.interactive = true;
		}
	}

	/**
	 * Set the target element where the protip should be appended to.
	 *
	 * @private
	 */
	_setTarget() {
		var target = this._getData(C.PROP_TARGET);

		// Target is itself
		if (target === true) {
			target = this.El.source;
		}

		// If has target container
		else if (target === C.SELECTOR_BODY && this.El.source.closest(C.SELECTOR_TARGET).length) {
			target = this.El.source.closest(C.SELECTOR_TARGET);
		}

		// Target is a selector
		else if (target) {
			target = $(target);
		}

		// No target, use body
		else {
			target = $(C.SELECTOR_BODY);
		}

		// We need proper position
		if (target.css('position') === 'static') {
			target.css({position: 'relative'});
		}

		this.El.target = target;
	}

	/**
	 * Data-* property getter. Attaches namespace.
	 *
	 * @param key       Data attribute key.
	 * @returns {*}
	 * @private
	 */
	_getData(key) {
		return this.El.source.data(this._namespaced(key));
	}

	/**
	 * Returns the namespaced version of a data-* property.
	 *
	 * @param string {string}
	 * @returns {string}
	 * @private
	 */
	_namespaced(string) {
		return this.classInstance.namespaced(string);
	}

	/**
	 * Mouseenter event handler.
	 *
	 * @private
	 */
	_onProtipMouseenter() {
		clearTimeout(this._task.delayOut);
	}

	/**
	 * Mouseleave event handler.
	 *
	 * @private
	 */
	_onProtipMouseleave() {
		(this.data.trigger === C.TRIGGER_HOVER) && this.hide();
	}

	/**
	 * Attaches event handlers.
	 *
	 * @private
	 */
	_bind() {
		if (this.data.interactive) {
			this.El.protip
				.on(C.EVENT_MOUSEENTER, $.proxy(this._onProtipMouseenter, this))
				.on(C.EVENT_MOUSELEAVE, $.proxy(this._onProtipMouseleave, this));
		}

		if (this.data.observer) {
			this._observerInstance = new MutationObserver(function() {
				this.classInstance.reloadItemInstance(this.El.source);
			}.bind(this));

			this._observerInstance.observe(this.El.source.get(0), {
				attributes: true,
				childList: false,
				characterData: false,
				subtree: false
			});
		}
	}

	/**
	 * Removes event handlers.
	 *
	 * @private
	 */
	_unbind() {
		this.off()
		if (this.data.interactive) {
			this.El.protip
				.off(C.EVENT_MOUSEENTER, $.proxy(this._onProtipMouseenter, this))
				.off(C.EVENT_MOUSELEAVE, $.proxy(this._onProtipMouseleave, this));
		}

		if (this.data.observer) {
			this._observerInstance.disconnect();
		}
	}
}