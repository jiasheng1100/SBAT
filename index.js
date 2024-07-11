//import * as BratFrontendEditor from "./dist/brat-frontend-editor.js";
//const defaultExport = BratFrontendEditor.default;
import { BratFrontendEditor } from "./Brat.js"
//import data from './example.json';
//import collData from './config.json';

let fileSelector = document.getElementById('fileSelector');
let downloadButton = document.getElementById('downloadButton');
let downloadArea = document.getElementById('downloadArea');
downloadArea.hidden = true;
let brat;


let options = {
    assetsPath: "static/", webFontURLs: ['fonts/Astloch-Bold.ttf', 'fonts/PT_Sans-Caption-Web-Regular.ttf', 'fonts/Liberation_Sans-Regular.ttf'], ajax: 'local', overWriteModals: false, maxFragmentLength: 30, showTooltip: true
};

let docData = {
    "messages": [], "source_files": ["txt"], "modifications": [], "normalizations": [], "ctime": 0, "text": "This is an example of how your annotation will look like.\nUpload a txt or json file to start annotating your own text.\nDouble-click or select any span to add your annotation.",
    "entities": [["N1", "Object", [[11, 18]]], ["N2", "Child", [[67, 70]]], ["N3", "Baby", [[74, 78]]]], "attributes": [], "relations": [], "triggers": [["T1", "Assassination", [[119, 131]]], ["T2", "Bomb", [[135, 141]]]], "events": [["E1", "T1", []], ["E2", "T2", []]], "comments": [],
    "collection": null, "equivs": [], "sentence_offsets": [[0, 57], [58, 118], [119, 174]], "token_offsets": [[0, 4], [5, 7], [8, 10], [11, 18], [19, 21], [22, 25], [26, 30], [31, 41], [42, 46], [47, 51], [52, 57], [58, 64], [65, 66], [67, 70], [71, 73], [74, 78], [79, 83], [84, 86],
    [87, 92], [93, 103], [104, 108], [109, 112], [113, 118], [119, 131], [132, 134], [135, 141], [142, 145], [146, 150], [151, 153], [154, 157], [158, 162], [163, 174]]
}

let collData;

const initializeBrat = () => {
    brat = new BratFrontendEditor(document.getElementById("brat"), collData, docData, options);
    brat.dispatcher.on('sglclick', this, function (data) {
        console.log(data);
        console.log(brat);
    });
}

fetch('./config.json')
    .then(response => response.json())
    .then(
        configData => {
            collData = configData
            if (document.readyState === 'loading') {
                console.log("loading")
                // The document is still loading, so add an event listener
                document.addEventListener('DOMContentLoaded', initializeBrat)
            } else {
                console.log("loaded")
                initializeBrat()
            }
        })

downloadButton.addEventListener('click', downloadButtonClicked);
fileSelector.addEventListener('change', (event) => {
    getFileData(event.target.files[0]);
    downloadArea.hidden = false;
})

function downloadButtonClicked() {
    console.log("downloadButtonClicked")
    let dataToWrite = new Object();
    dataToWrite.docData = docData;
    dataToWrite.collData = collData;
    let textFileAsBlob = new Blob([JSON.stringify(dataToWrite, null, "\t")], { type: 'application/json' });
    let downloadLink = document.createElement("a");
    downloadLink.download = document.getElementById('fileNameToSaveAs').value;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null) {
        // Chrome allows the link to be clicked
        // without actually adding it to the DOM.
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    }
    else {
        // Firefox requires the link to be added to the DOM
        // before it can be clicked.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }
    // Programmatically clicks the download link
    downloadLink.click();
}

// remove the link element from the DOM after it is clicked
function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

function getFileData(uploadedFile) {
    console.log("getFileData")
    let reader = new FileReader();
    reader.addEventListener('load', function (e) {
        if (uploadedFile.type == 'text/plain') {
            loadTxt(e.target.result);
        }
        if (uploadedFile.type == 'application/json') {
            loadJson(e.target.result);
        }
    });
    reader.readAsText(uploadedFile);
}

function loadTxt(textData) {
    console.log("loadTxt")
    docData = {
        "messages": [],
        "source_files": ["txt"],
        "modifications": [],
        "normalizations": [],
        "ctime": 0,
        "text": textData,
        "entities": [],
        "attributes": [],
        "relations": [],
        "triggers": [],
        "events": [],
        "comments": []
    };
    brat.docData = docData
    updateBratEditor()
}

function loadJson(data) {
    console.log("loadJson")
    let json = data;
    let parsedJson = JSON.parse(json);
    docData = parsedJson.docData;
    collData = parsedJson.collData;
    updateBratEditor()
}

function updateBratEditor() {
    if (brat) {
        brat.dispatcher.post('collectionLoaded', [collData]);
        brat.dispatcher.post('requestRenderData', [docData]);
        brat.dispatcher.post('current', [collData, docData, {}]);
    }
}