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
});
