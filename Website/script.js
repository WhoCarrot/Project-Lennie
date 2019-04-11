const vibrators = [];
let new_settings;
let elementCount = 0;
let host = '192.168.4.1';

let container, buttons, settings, footer;

class Vibrator {
    constructor(_id) {
        this.id = _id;
        this.ontime = 0;
        this.delay = 0;
        this.next = 0;
    }
}

const createVibratorButton = (vibrator, amount) => {
    let cols;
    if (amount > 6) cols = 'one';
    else if (amount > 4) cols = 'two';
    else if (amount == 4) cols = 'three';
    else if (amount == 3) cols = 'four';
    else if (amount == 2) cols = 'six';
    else if (amount == 1) cols = 'twelve';
    element = document.createElement('div');
    element.classList.add(...['columns', cols, 'button-holder']);
    element.innerHTML += `
        <button class="button-primary" id="add-vibrator-${vibrator.id}" onclick="addVibrator(${vibrator.id})">Add ${vibrator.id}</button>
    `;
    return element;
};

const addVibrator = (id) => {
    const vibrator = vibrators.filter(vibrator => vibrator.id === id)[0];
    const keys = Object.keys(new_settings);
    let settingId = Math.max(...keys);
    if (settingId == -Infinity) settingId = -1;
    const element = createVibratorElement(vibrator, true, settingId + 1);
    settings.appendChild(element);
};

const deleteVibrator = (id) => {
    const vibrator = document.getElementById(`vibrator-${id}`);
    settings.removeChild(vibrator);
    delete new_settings[id];
    updateLocalStorage();
};

const createVibratorElement = (vibrator, update = false, settingsId = null) => {
    const element = document.createElement('div');
    element.classList.add(...['row', 'vibrator-settings', (elementCount % 2 == 0 ? 'dark' : 'light')]);
    element.id = `vibrator-${settingsId}`;
    element.innerHTML = 
        `<div class="columns twelve vibrator-header">
            <code>vibrator: ${vibrator.id},\tsetting: ${settingsId}</code>
            <button class="button-primary" onclick="deleteVibrator(${settingsId})">X</button>
        </div>
        <div class="row">
            <div class="vibrator-setting four columns">
                <label for="ontime">On time (ms)</label>
                <input xSetting="${settingsId}" class="u-full-width" type="number" id="ontime" value="${vibrator.ontime}">
            </div>
            <div class="vibrator-setting four columns">
                <label for="delay">Delay (ms)</label>
                <input xSetting="${settingsId}" class="u-full-width" type="number" id="delay" value="${vibrator.delay}">
            </div>
            <div class="vibrator-setting four columns">
                <label for="next">Next</label>
                <input xSetting="${settingsId}" class="u-full-width" type="number" id="next" value="${vibrator.next}">
            </div>
        </div>`;

    if (update)
        updateVibrator(vibrator.id, vibrator.ontime, vibrator.delay, vibrator.next, settingsId);

    for (let input of element.getElementsByTagName('input')) {
        input.addEventListener('change', onUpdate);
    }
    elementCount++;

    return element;
};

const onUpdate = (event) => {
    const settingId = parseInt(event.target.attributes.xsetting.value);
    const id = event.target.id;
    let value = parseInt(event.target.value);
    let setting = new_settings[settingId];
    let {ontime, delay, next} = setting;

    if (id === 'ontime') ontime = value;
    else if (id === 'delay') delay = value;
    else if (id === 'next') next = value;

    updateVibrator(id, ontime, delay, next, settingId);
};

const updateVibrator = (id, ontime, delay, next, settingId) => {
    if (new_settings[settingId] == null) new_settings[settingId] = new Vibrator(id);
    new_settings[settingId].ontime = ontime;
    new_settings[settingId].delay = delay;
    new_settings[settingId].next = next;
    updateLocalStorage();
};

const updateLocalStorage = () => {
    window.localStorage.setItem('settings', JSON.stringify(new_settings));
};

const submit = () => {
    const hardnessfrom = document.getElementById('hardnessfrom').value;
    const hardnessto = document.getElementById('hardnessto').value;
    const lengthfrom = document.getElementById('lengthfrom').value;
    const lengthto = document.getElementById('lengthto').value;
    const experimenttimeduration = document.getElementById('experimenttimeduration').value;
    const setbackpercentage = document.getElementById('setbackpercentage').value;

    const values = Object.values(new_settings);
    const jsonString = JSON.stringify({
        values,
        hardnessfrom,
        hardnessto,
        lengthfrom,
        lengthto,
        experimenttimeduration,
        setbackpercentage
    });
    const xhttp = new XMLHttpRequest();
    xhttp.open('POST', "http://" + host + "/vibrators", true);
    xhttp.setRequestHeader('Content-type', 'application/json');
    xhttp.send(jsonString);
};

const updateSettings = (settingId, vibrator) => {
    if (settingId == -1) new_settings.push(vibrator);
    else new_settings[settingId] = vibrator;
};

window.onload = () => {
    // Initialize element & relative variables
    // host = window.location.host;
    container = document.getElementsByClassName('container')[0];
    buttons = document.getElementById('vibrator-buttons');
    settings = document.getElementById('vibrator-settings');
    footer = document.getElementById('footer');

    // Get the settings from the localstorage
    try {
        settingString = window.localStorage.getItem('settings');
        if (!settingString || settingString == '') new_settings = {};
        else new_settings = JSON.parse(settingString);
    } catch {
        new_settings = {};
    }

    // Set element count to max of setting id's
    for (let key of Object.keys(new_settings)) {
        const value = new_settings[key];
        settings.appendChild(createVibratorElement(value, false, key));
    }

    // Add buttons to the screen
    for (let i = 0; i < 4; i++) {
        vibrators.push(new Vibrator(i));
    }
    vibrators.forEach(vibrator => {
        buttons.appendChild(createVibratorButton(vibrator, vibrators.length));
    });
    

    // Set height of container to match remaining pixels on the screen so the scollbar works
    settings.style.height = window.innerHeight - settings.offsetTop - settings.style.marginBottom - footer.clientHeight + 'px';
};