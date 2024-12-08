import './pan-zoom.js';

document.querySelector("input[type=file]").addEventListener('change', e => {
    const file = e.currentTarget.files[0];

    const img = document.querySelector('pan-zoom');

    const reader = new FileReader();
    reader.onload = (e) => {
        img.setAttribute('src', e.target.result);
    };
    reader.readAsDataURL(file);
});

document.querySelector('button').addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    var data = new FormData()
    data.append('file', input.files[0]);

    await fetch('/upload', {
        method: 'POST',
        body: data
    });
});
