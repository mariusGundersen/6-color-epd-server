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

    let draggedElement;
    let initialSibling;
    function revertDraggedElement() {
      if (draggedElement.previousElementSibling === initialSibling) return
      initialSibling.insertAdjacentElement('afterend', draggedElement);
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
          draggedElement.closest('.timeline').classlist.add('dragging');
          initialSibling = e.currentTarget.previousElementSibling;
        }, false);

        elm.addEventListener('dragend', e => {
          if (e.dataTransfer.dropEffect !== "move") {
            revertDraggedElement()
          }
          draggedElement.closest('.timeline').classList.remove('dragging');
        }, false);

        elm.addEventListener('drop', e => {
          if(initialSibling === e.currentTarget.previousElementSibling) {
            e.stopPropagation();
          }
          e.preventDefault();
        }, false)

      });
    });
