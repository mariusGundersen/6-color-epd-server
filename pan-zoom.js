
class PanZoom extends HTMLElement {
    static observedAttributes = ['src'];
    constructor() {
        super();

        const pointers = new Map();
        this._transform = {
            x: 0,
            y: 0,
            s: 1
        };

        const src = this.getAttribute('src');
        this.canvas = document.createElement('canvas');
        this.canvas.width = 480;
        this.canvas.height = 800;
        this.ctx = this.canvas.getContext('2d');
        this.appendChild(this.canvas);

        this.style.touchAction = 'none';

        const requestSingleAnimationFrame = debouncedAnimationFrame(() => {
            this.transform = solve(this.transform, ...pointers.values());
        });

        this.addEventListener('pointerdown', e => {
            const viewPos = getViewPos(e);
            const modelPos = viewToModel(viewPos, this.transform);
            pointers.set(e.pointerId, { modelPos, viewPos });

            this.setPointerCapture(e.pointerId);
        }, false);

        this.addEventListener('pointermove', e => {
            if (!pointers.has(e.pointerId)) return;

            const viewPos = getViewPos(e);
            const pointer = pointers.get(e.pointerId);
            pointer.viewPos = viewPos;

            requestSingleAnimationFrame();
        }, false);

        this.addEventListener('lostpointercapture', e => {
            if (!pointers.has(e.pointerId)) return;

            pointers.delete(e.pointerId);
        }, false);

        const SCROLL_FACTOR = 1.2;
        this.addEventListener('wheel', e => {
            const viewPos = getViewPos(e);
            const modelPos = viewToModel(viewPos, this.transform);
            let s = this.transform.s;
            s *= e.deltaY > 0 ? 1 / SCROLL_FACTOR : SCROLL_FACTOR;
            s = Math.max(0.1, Math.min(s, 100));
            this.transform = solveSingle(viewPos, modelPos, s);
            e.preventDefault();
        })
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src') {
            this._img = new Image();
            this._img.src = newValue;
            this._img.addEventListener('load', () => {
                const imgAspectRatio = this._img.width / this._img.height;
                const boxAspectRatio = this.canvas.width / this.canvas.height;

                this.minS = (imgAspectRatio < boxAspectRatio)
                    ? this.canvas.width / this._img.width
                    : this.canvas.height / this._img.height;
                this.transform = {
                    x: this.canvas.width / 2 - this._img.width * this.minS / 2,
                    y: this.canvas.height / 2 - this._img.height * this.minS / 2,
                    s: this.minS
                };
            });
        }
    }

    get transform() {
        return this._transform;
    }

    set transform({ x, y, s }) {
        if (this._img) {
            s = Math.max(s, this.minS);
            x = Math.min(0, Math.max(x, this.canvas.width - this._img.width * s));
            y = Math.min(0, Math.max(y, this.canvas.height - this._img.height * s));
        }
        this._transform.x = x;
        this._transform.y = y;
        this._transform.s = s;
        this.ctx.reset();
        this.ctx.scale(s, s);
        this.ctx.drawImage(this._img, x / s, y / s);
    }
}

customElements.define("pan-zoom", PanZoom);

// @ts-check

/**
 * @typedef {{clientX: number, clientY: number, currentTarget: HTMLElement}} PointerEvent
 * @typedef {{x: number, y: number}} Pos
 * @typedef {{x: number, y: number, s: number}} Transform
 * @typedef {{modelPos: Pos, viewPos: Pos}} PosPos
 */

/**
 * 
 * @param {PointerEvent} event
 * @returns {Pos}
 */
function getViewPos(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
        x: event.clientX - rect.x,
        y: event.clientY - rect.y
    };
}

/**
 * 
 * @param {Pos} modelPos 
 * @param {Transform} transform 
 * @returns {Pos}
 */
function modelToView(modelPos, transform) {
    return {
        x: transform.s * modelPos.x + transform.x,
        y: transform.s * modelPos.y + transform.y
    };
}

/**
 * 
 * @param {Pos} viewPos 
 * @param {Transform} transform 
 * @returns {Pos}
 */
function viewToModel(viewPos, transform) {
    return {
        x: (viewPos.x - transform.x) / transform.s,
        y: (viewPos.y - transform.y) / transform.s
    };
}

/**
 * 
 * @param {Transform} transform 
 * @param {PosPos[]} positions 
 * @returns {Transform}
 */
function solve(transform, ...positions) {
    if (positions.length === 1) {
        const { viewPos, modelPos } = positions[0];

        return solveSingle(viewPos, modelPos, transform.s);
    } else if (positions.length > 1) {
        transform = solveMultiple(positions);

        for (const position of positions) {
            position.modelPos = viewToModel(position.viewPos, transform);
        }

        return transform;
    } else {
        return transform;
    }
}

/**
 * 
 * @param {Pos} viewPos
 * @param {Pos} modelPos 
 * @param {number} s 
 * @returns {Transform}
 */
function solveSingle(viewPos, modelPos, s) {
    return {
        x: viewPos.x - modelPos.x * s,
        y: viewPos.y - modelPos.y * s,
        s
    };
}

/**
 * 
 * @param {PosPos[]} positions 
 * @returns {Transform}
 */
function solveMultiple(positions) {

    // ax = b
    // ata x = atb
    // ata^-1 ata x = ata^-1 atb
    // x = ata^-1 atb

    const len = positions.length;
    let m00 = 0, m01 = 0, m02 = 0;
    let v0 = 0, v1 = 0, v2 = 0;
    for (const { viewPos, modelPos } of positions) {
        m00 += modelPos.x ** 2 + modelPos.y ** 2;
        m01 += modelPos.x;
        m02 += modelPos.y;
        v0 += viewPos.x * modelPos.x + viewPos.y * modelPos.y;
        v1 += viewPos.x;
        v2 += viewPos.y;
    }

    //       [m00  m01  m02]
    // ata = [m01  len    0]
    //       [m02    0  len]
    //
    //       [v0]
    // atb = [v1]
    //       [v2]

    const det = m00 * len ** 2 - len * m01 ** 2 - len * m02 ** 2;
    const inv00 = len ** 2;
    const inv01 = -len * m01;
    const inv02 = -len * m02;
    const inv12 = m01 * m02;
    const inv11 = len * m00 - m02 ** 2;
    const inv22 = len * m00 - m01 ** 2;

    //            1   [inv00  inv01  inv02]
    // ata^-1 = ----- [inv01  inv11  inv12]
    //           det  [inv02  inv12  inv22]

    return {
        s: (inv00 * v0 + inv01 * v1 + inv02 * v2) / det,
        x: (inv01 * v0 + inv11 * v1 + inv12 * v2) / det,
        y: (inv02 * v0 + inv12 * v1 + inv22 * v2) / det
    };
}

/**
 * 
 * @param {Transform} transform
 * @returns {string} 
 */
function toMatrix({ x, y, s }) {
    return `matrix(${s}, 0, 0, ${s}, ${x}, ${y})`;
}

/**
 * 
 * @param {() => void} func 
 * @returns {() => void}
 */
function debouncedAnimationFrame(func) {
    let requested = false;
    return () => {
        if (!requested) {
            requested = true;
            requestAnimationFrame(() => {
                requested = false;
                func();
            });
        }
    }
}
