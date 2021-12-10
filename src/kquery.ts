export function documentReady(fn: any) {
    // see if DOM is already available
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

const CLASS_HIDDEN = 'hidden';
const DISPLAY_NONE = 'none';

export class K$ extends Array<HTMLElement> {
    isK$: boolean;
    constructor(args: any) {
        super();
        this.isK$ = true;

        if (args.length === 1 && Array.isArray(args[0])) args[0].forEach((i) => this.push(i), this);
        else
            K$.convertArgumentsToElementsArray(args, window.document).forEach(
                (i) => (i instanceof HTMLElement ? this.push(i) : null),
                this,
            );
    }

    // process a callback against every HTMLElement in an array
    static iterate(elementArray: Element[], callbackfn: (value: Element, index: number, array: Element[]) => void) {
        elementArray.forEach((element, index, array) => callbackfn(element, index, array));
    }

    // HTMLCollections are not arrays, process to an array for aggregation
    static convertHTMLCollectionToArray(collection: HTMLCollection | NodeList): Node[] {
        const result: Element[] = [];
        if (collection instanceof HTMLCollection || collection instanceof NodeList) {
            for (let i = 0; i < collection.length; i++) {
                const item = collection.item(i);
                if (item instanceof Element) result.push(item);
            }
        } else if (collection !== null && collection !== undefined) result.push(collection);
        return result;
    }

    // HTMLElement parser..
    // take unlimited parameters in an array to process into a complete array of objects
    // elements are added, strings are processed as a query against the parent,
    // HTMLCollections concatenated directly.
    // this is an aggregation tool similar to JQuery
    static convertArgumentsToElementsArray(args: any[], elementParent: ParentNode): Node[] {
        let result: Node[] = [];
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            let newCollection: Node[] = [];
            if (a instanceof HTMLElement || a instanceof DocumentFragment) result = result.concat([a]);
            else if (a instanceof K$) result = result.concat(a);
            else if (typeof a === 'string') {
                newCollection = K$.convertHTMLCollectionToArray(elementParent.querySelectorAll(a));
                if (newCollection.length > 0) result = result.concat(newCollection);
            } else if (a instanceof HTMLCollection) {
                newCollection = K$.convertHTMLCollectionToArray(a);
                if (newCollection.length > 0) result = result.concat(newCollection);
            } else if (a !== null && a !== undefined)
                throw new Error(args[i].toString() + 'does not represent a valid Element, selector, or HTMLCollection');
        }
        return result;
    }

    static asK$(...args: any): K$ {
        // return a new aggregate based on arguments
        // for somereason _K$ instanceof always resolves to Array.
        // we need to test if we are an array with isK$ == true and pass it through
        if (
            args.length === 1 &&
            typeof args[0] === 'object' &&
            args[0] instanceof K$ /* || (args[0] instanceof Array && args[0].isK$) */
        )
            return args[0];

        return new K$(args);
    }

    // example: "<DIV>hi</DIV>" or "<P>hi</P>"
    static createHTMLElementFromString(elementStr: string): HTMLElement {
        const wrapper = document.createElement('DIV');
        wrapper.innerHTML = elementStr;
        return wrapper.firstElementChild as HTMLElement;
    }

    static newFragment(): DocumentFragment {
        return document.createDocumentFragment();
    }

    static getDiv(innerHTML?: string, classes?: string): HTMLDivElement {
        const divElement = document.createElement('DIV') as HTMLDivElement;
        if (classes) classes.split(' ').forEach((c) => divElement.classList.add(c));
        if (innerHTML) divElement.innerHTML = innerHTML;
        return divElement;
    }

    // convert string html into actual dom element inside a K$
    // supports only a single top level item
    static parse(data: string): K$ {
        if (!data) return K$.asK$(K$.getDiv());
        const content = this.createHTMLElementFromString(data);
        return K$.asK$(content);
    }

    get parentNode() {
        if (this.first) return this.first.parentNode;
        else return undefined;
    }
    public findChild(...args: any): K$ {
        let result: Node[] = [];
        this.forEach((e) => {
            const collection = K$.convertArgumentsToElementsArray(args, e);
            if (collection.length > 0) result = result.concat(collection);
        });
        return new K$(result);
    }
    each(callback: (value: Element, index: number, array: Element[]) => void) {
        K$.iterate(this, callback);
        return this;
    }

    get first() {
        if (this.length > 0) return this[0];
        else return undefined;
    }

    get visible() {
        if (this.first === undefined) return false;
        return !this.first.classList.contains(CLASS_HIDDEN) && (this.first as HTMLElement).style.display !== DISPLAY_NONE;
    }

    set visible(v) {
        if (v) this.show();
        else this.hide();
    }

    show() {
        // uses a class driven approach so it can be customized
        function _show(e: HTMLElement) {
            e.classList.remove(CLASS_HIDDEN);
        }
        this.forEach(_show);
        return this;
    }
    hide() {
        function _hide(e: HTMLElement) {
            e.classList.add(CLASS_HIDDEN);
            /*
                  if (e._originalDisplayStyle != undefined) return;
                  e._originalDisplayStyle = e.style.display
                  e.style.display = "none";
                    */
        }
        this.forEach(_hide);
        return this;
    }
    remove() {
        return this.detach();
    }
    text(v: any) {
        if (v !== undefined) {
            this.forEach((e) => (e.innerText = v));
            return this;
        } else if (this.first) return this.first.innerText;
        else return '';
    }
    focus() {
        if (this.first) this.first.focus();
        return this;
    }
    attr(name: string, value: string) {
        if (!this.first) return;
        if (!name) return;

        if (value !== undefined) {
            this.forEach((e) => e.setAttribute(name, value));
            return this;
        } else return this.first.getAttribute(name);
    }
    // deals with boolean attributes only
    prop(name: string, value: string) {
        if (!this.first && value === undefined) {
            return undefined;
        }
        const a = this.first?.getAttribute(name);
        if (value === undefined) return a !== null && a !== undefined;
        else {
            this.forEach((e) => {
                if (value) e.setAttribute(name, value);
                else e.removeAttribute(name);
            });
            return this;
        }
    }
    removeAttr(name: string) {
        this.forEach((e) => {
            e.removeAttribute(name);
        });
        return this;
    }
    val(v: any) {
        if (v !== undefined) {
            this.forEach((e) => {
                if (e instanceof HTMLInputElement) e.value = v;
                else e.setAttribute('value', v);
            });
            return this;
        } else if (this.first) {
            if (this.first instanceof HTMLInputElement) return this.first.value;
            else return this.first.getAttribute('value');
        } else return '';
    }
    html(v: any) {
        if (v !== undefined) {
            this.forEach((e) => (e.innerHTML = v));
            return this;
        } else if (this.first) return this.first.innerHTML;
        else return '';
    }
    append(element: HTMLElement | K$ | HTMLElement[]) {
        if (!this.first) return;
        if (element instanceof K$ || element instanceof Array) K$.iterate(element, (e) => this.first?.appendChild(e));
        else this.first.appendChild(element);

        return this;
    }
    prepend(element: HTMLElement | K$ | HTMLElement[]) {
        if (!this.first) return;
        if (element instanceof K$ || element instanceof Array)
            K$.iterate(element, (e) => this.first?.insertBefore(e, this.first.firstElementChild));
        else this.first.insertBefore(element, this.first.firstElementChild);

        return this;
    }
    appendTo(item: any) {
        K$.asK$(item).append(this);
        return this;
    }
    prependTo(item: any) {
        K$.asK$(item).prepend(this);
        return this;
    }
    detach() {
        K$.iterate(this, (e) => {
            if (e.parentNode) e.parentNode.removeChild(e);
        });
        return this;
    }
    removeClass(classes: string) {
        this.forEach((e) => {
            classes.split(' ').forEach((c) => e.classList.remove(c));
        });
        return this;
    }
    addClass(classes: string) {
        this.forEach((e) => {
            classes.split(' ').forEach((c) => e.classList.add(c));
        });
        return this;
    }
    hasClass(classname: string) {
        return this.first && this.first.classList.contains(classname);
    }
    addEventListener(eventName: string, callback: EventListenerOrEventListenerObject) {
        this.forEach((e) => e.addEventListener(eventName, callback));
        return this;
    }
    removeEventListener(eventName: string, callback: EventListenerOrEventListenerObject) {
        this.forEach((e) => e.addEventListener(eventName, callback));
        return this;
    }
    get empty(): boolean {
        return this.length === 0;
    }
}

export function $(...args: any) {
    return K$.asK$(...args);
}
