import './dnd.touch.min.js?autoload';
import './pan-zoom.js';

document.querySelector("input[type=file]").addEventListener('change', e => {
  const file = e.currentTarget.files[0];

  const img = document.querySelector('pan-zoom');

  const reader = new FileReader();
  reader.onload = (e) => {
    img.setAttribute('src', e.target.result);
  };
  reader.readAsDataURL(file);

  const dialog = document.querySelector('dialog');

  dialog.showModal();
});

document.querySelector('button[type=submit]').addEventListener('click', async e => {
  const button = e.currentTarget;
  button.disabled = true;

  const blob = await new Promise(res => document.querySelector('pan-zoom').canvas.toBlob(res, 'image/jpeg'));

  await fetch('/upload', {
    method: 'POST',
    body: blob
  });

  button.textContent = 'SUCCESS!!!';
  location.reload();
});

function isBefore(el1, el2) {
  if (el2.parentNode !== el1.parentNode) return false;
  for (let cur = el1.previousElementSibling; cur; cur = cur.previousElementSibling) {
    if (cur === el2)
      return true;
  }
  return false;
}

/** @type {Element | null} */
let draggedElement = null;
/** @type {Element | null} */
let initialPreviousSibling = null;
/** @type {Element | null} */
let initialNextSibling = null;
function revertDraggedElement() {
  if (hasNotMoved(draggedElement)) return
  initialPreviousSibling?.insertAdjacentElement('afterend', draggedElement) ?? initialNextSibling.insertAdjacentElement('beforebegin', draggedElement);
}

function hasNotMoved(element) {
  return element.previousElementSibling === initialPreviousSibling && element.nextElementSibling === initialNextSibling
}

htmx.onLoad(function (content) {

  content.querySelectorAll('li[draggable=true]').forEach(elm => {
    elm.addEventListener('dragover', e => {
      e.dataTransfer.dropEffect = "move";
      e.preventDefault();
      if (e.currentTarget == draggedElement) return;
      e.currentTarget.insertAdjacentElement(isBefore(draggedElement, e.currentTarget) ? 'beforebegin' : 'afterend', draggedElement);
    }, false);

    elm.addEventListener('dragleave', e => {
      if (e.relatedTarget?.closest('[draggable=true]') === false) {
        revertDraggedElement()
      }
    }, false);

    let _elm;
    elm.addEventListener('pointerdown', e => {
      _elm = e.target;
    }, false);

    elm.addEventListener('dragstart', e => {
      if (!_elm.closest('.drag-handle') || _elm.closest('.htmx-request')) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", null); // Thanks to bqlou for their comment.
      draggedElement = e.currentTarget;
      draggedElement.closest('.timeline').classList.add('dragging');
      initialPreviousSibling = e.currentTarget.previousElementSibling;
      initialNextSibling = e.currentTarget.nextElementSibling;
    }, false);

    elm.addEventListener('dragend', e => {
      if (e.dataTransfer.dropEffect !== "move") {
        revertDraggedElement()
      }
      draggedElement.closest('.timeline').classList.remove('dragging');
    }, false);

    elm.addEventListener('drop', e => {
      if (hasNotMoved(e.target)) {
        e.stopPropagation();
      }
      e.preventDefault();
    }, false)

  });

  initDropZone(content.querySelector('.remove-drop-zone'));
});

/**
 *
 * @param {HTMLElement} elm
 */
function initDropZone(elm) {
  if (!elm) return;

  elm.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    draggedElement.remove();
  });

  elm.addEventListener('drop', e => {
    e.preventDefault();
    elm.querySelector('input[name=remove]').value = true;
  })
}
