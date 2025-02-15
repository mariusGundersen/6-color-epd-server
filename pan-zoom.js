
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

        this.limits = {
            view: {
                x: 0,
                y: 0,
                width: 480,
                height: 800
            },
            model: {
                x: 0,
                y: 0,
                width: 480,
                height: 800
            },
            maxS: 100
        };

        const src = this.getAttribute('src');
        this.canvas = document.createElement('canvas');
        this.canvas.width = 480;
        this.canvas.height = 800;
        this.ctx = this.canvas.getContext('2d');
        this.appendChild(this.canvas);

        this.style.touchAction = 'none';

        const requestSingleAnimationFrame = debouncedAnimationFrame(() => {
            this.transform = solve(this.transform, [...pointers.values()], this.limits);
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
            this.transform = solveSingle(viewPos, modelPos, s, this.limits);
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
                this.limits.model.width = this._img.width;
                this.limits.model.height = this._img.height;
            });
        }
    }

    get transform() {
        return this._transform;
    }

    set transform({ x, y, s }) {

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
        x: (event.clientX - rect.x),
        y: (event.clientY - rect.y)
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

const avgPos = (a, b, _, { length }) => ({
    x: a.x + b.x / length,
    y: a.y + b.y / length
});

/**
 *
 * @param {Transform} transform
 * @param {PosPos[]} positions
 * @returns {Transform}
 */
function solve(transform, positions, limits) {
    if (positions.length === 1) {
        const { viewPos, modelPos } = positions[0];

        transform = solveSingle(viewPos, modelPos, transform.s, limits);
    } else if (positions.length > 1) {
        transform = solveMultiple(positions);

        const avgView = positions.map(p => p.viewPos).reduce(avgPos, { x: 0, y: 0 });
        const avgModel = positions.map(p => p.modelPos).reduce(avgPos, { x: 0, y: 0 });

        transform = solveSingle(avgView, avgModel, transform.s, limits);
    }


    for (const position of positions) {
        position.modelPos = viewToModel(position.viewPos, transform);
    }

    return transform;

}


const defaultView = {
    x: 0,
    y: 0,
    width: 1,
    height: 1
};

const defaultModel = {
    x: Infinity,
    y: Infinity,
    width: Infinity,
    height: Infinity
}

/**
 *
 * @param {Pos} viewPos
 * @param {Pos} modelPos
 * @param {number} s
 * @returns {Transform}
 */
function solveSingle(viewPos, modelPos, s, { view = defaultView, model = defaultModel, sMax = Infinity } = {}) {

    s = Math.max(
        Math.min(s, sMax),
        view.width / model.width,
        view.height / model.height
    );

    return {
        x: clamp(
            (view.x + view.width) - (model.x + model.width) * s,
            viewPos.x - modelPos.x * s,
            view.x - model.x * s
        ),
        y: clamp(
            (view.y + view.height) - (model.y + model.height) * s,
            viewPos.y - modelPos.y * s,
            view.y - model.y * s
        ),
        s
    };
}

function clamp(min, v, max) {
    return Math.max(min, Math.min(v, max));
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
