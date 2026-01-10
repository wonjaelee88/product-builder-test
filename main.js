const SET_COUNT = 5;
const NUMBERS_PER_SET = 6;
const MAX_NUMBER = 49;

const generateSet = () => {
    const set = new Set();
    while (set.size < NUMBERS_PER_SET) {
        set.add(Math.floor(Math.random() * MAX_NUMBER) + 1);
    }
    return Array.from(set).sort((a, b) => a - b);
};

document.getElementById('generate').addEventListener('click', () => {
    const numbersDiv = document.getElementById('numbers');
    numbersDiv.innerHTML = '';

    for (let i = 0; i < SET_COUNT; i++) {
        const p = document.createElement('p');
        p.textContent = `Set ${i + 1}: ${generateSet().join(', ')}`;
        numbersDiv.appendChild(p);
    }
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});
