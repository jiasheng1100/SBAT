import { BratFrontendEditor } from "./Brat.js"
import { Octokit } from "https://esm.sh/octokit@2.1.0";


let fileSelector = document.getElementById('fileSelector');
let downloadButton = document.getElementById('downloadButton');
let downloadArea = document.getElementById('downloadArea');
let patArea = document.getElementById('patArea')
let repoSelectArea = document.getElementById('repoSelectArea')
let fileSelectArea = document.getElementById('fileSelectArea')
let personalAccessToken = document.getElementById('personalAccessToken');
let authenticationButton = document.getElementById('authenticationButton');
let repoSelect = document.getElementById('repoSelect');
let repoSelectButton = document.getElementById('repoSelectButton');
let fileSelect = document.getElementById('fileSelect');
let fileSelectButton = document.getElementById('fileSelectButton');
let commitPatArea = document.getElementById('commitPatArea')
let commitPersonalAccessToken = document.getElementById('commitPersonalAccessToken')
let commitAuthenticationButton = document.getElementById('commitAuthenticationButton');
let fileCreateArea = document.getElementById('fileCreateArea')
let commitFileName = document.getElementById('commitFileName')
let commitMessageArea = document.getElementById('commitMessageArea')
let commitMessage = document.getElementById('commitMessage')
let commitConfirmButton = document.getElementById('commitConfirmButton')
let octokit;
let userName;
let repos;
let files;
let repoName;
let fileName;
let text;
let brat;
let lastCommitSha;
let lastCommitTreeSha;

downloadArea.hidden = true;
repoSelectArea.hidden = true;
fileSelectArea.hidden = true;
fileCreateArea.hidden = true;
commitMessageArea.hidden = true;


authenticationButton.addEventListener('click', () => authenticationButtonClicked(personalAccessToken.value))
commitAuthenticationButton.addEventListener('click', () => authenticationButtonClicked(commitPersonalAccessToken.value));
repoSelectButton.addEventListener('click', getRepoFiles);
fileSelectButton.addEventListener('click', () => {
    console.log(personalAccessToken.value)
    if (personalAccessToken.value.length > 0) {
        getFileContent()
    }
    else {
        getLastCommit().then(createNewCommit())
    }
});
downloadButton.addEventListener('click', downloadButtonClicked);
fileSelector.addEventListener('change', (event) => {
    getFileData(event.target.files[0]);
    downloadArea.hidden = false;
})

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
    let parsedJson = JSON.parse(data);
    if (parsedJson.docData && parsedJson.collData) {
        docData = parsedJson.docData;
        collData = parsedJson.collData;
        brat.docData = docData;
        brat.collData = collData;
        updateBratEditor()
    } else {
        window.alert("Incompatible json format, file loaded as pure string")
        loadTxt(data)
    }

}

function updateBratEditor() {
    if (brat) {
        brat.dispatcher.post('collectionLoaded', [collData]);
        brat.dispatcher.post('requestRenderData', [docData]);
        brat.dispatcher.post('current', [collData, docData, {}]);
    }
}


async function authenticationButtonClicked(authKey) {
    console.log("authenticationButtonClicked")
    octokit = new Octokit({ auth: authKey });
    getUserName()
        .then(() => getUserRepos())
    patArea.hidden = true;
    repoSelectArea.hidden = false;
    commitPatArea.hidden = true;

}

const getUserName = async () => {
    try {
        const {
            data: { login },
        } = await octokit.rest.users.getAuthenticated();
        userName = login;
        console.log("Hello, %s", login);
    } catch (error) {
        console.error('Error fetching username:', error)
    }

}

const getUserRepos = async () => {
    try {
        const response = await octokit.rest.repos.listForUser({
            username: userName,
            type: "owner",
            sort: "full_name",
            per_page: 100
        })
        repos = await response.data.map(repo => repo.name);
        makeRepoDropdown()
        console.log(repos)
    } catch (error) {
        console.error('Error fetching repo list:', error)
    }
}

const makeRepoDropdown = () => {
    repoSelect.innerHTML = '';
    repos.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo;
        option.textContent = repo;
        repoSelect.appendChild(option);
    });
}

const makeFileDropdown = () => {
    fileSelect.innerHTML = '';
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelect.appendChild(option);
    });
}

async function getRepoFiles() {
    try {
        repoName = repoSelect.value;
        const response = await octokit.rest.repos.getContent({
            owner: userName,
            repo: repoName,
            path: '',
        });
        files = await response.data.map(file => file.path);
        makeFileDropdown()
        repoSelectArea.hidden = true;
        fileSelectArea.hidden = false;
    } catch (error) {
        console.error('Error fetching file list:', error)
    }
}

async function getFileContent() {
    try {
        fileName = fileSelect.value;
        const response = await octokit.rest.repos.getContent({
            owner: userName,
            repo: repoName,
            path: fileName,
        });
        if (response.data.content) {
            text = atob(response.data.content);
            if (extractJSON(text)) {
                loadJson(text)
            } else {
                loadTxt(text)
            }
        }
        fileSelectArea.hidden = true;
        personalAccessToken.value = ""
        patArea.value = ""
        patArea.hidden = false;
        commitPatArea.hidden = false;
        downloadArea.hidden = false;
    } catch (error) {
        console.error('Error fetching file content:', error)
    }
}

const extractJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

const getLastCommit = async () => {
    try {
        // get the SHA of the last commit
        const { data: refData } = await octokit.rest.git.getRef({
            owner: userName,
            repo: repoName,
            ref: `heads/main`,
        })
        lastCommitSha = refData.object.sha

        // get the last commit's tree (the datastructure that actually holds the files)
        const { data: commitData } = await octokit.rest.git.getCommit({
            owner: userName,
            repo: repoName,
            commit_sha: lastCommitSha,
        })
        lastCommitTreeSha = commitData.tree.sha

        console.log("last commit retrieval successful")

    } catch (error) {
        console.error('Error retrieving the last commit:', error);
    }
}

const createNewCommit = async () => {
    try {
        fileName = fileSelect.value;
        const dataToWrite = new Object();
        dataToWrite.docData = docData;
        dataToWrite.collData = collData;
        //const dataAsJSONString = unescape(encodeURIComponent(JSON.stringify(dataToWrite, null, "\t")));
        const dataAsJSONString = JSON.stringify(dataToWrite, null, "\t")
        // create new tree and get the SHA of the new tree

        const { data: treeData } = await octokit.rest.git.createTree({
            owner: userName,
            repo: repoName,
            base_tree: lastCommitTreeSha,
            tree: [
                {
                    path: fileName,
                    mode: '100644',
                    type: 'blob',
                    content: dataAsJSONString
                }
            ]
        });
        const newTreeSha = treeData.sha;

        // create new commit and get the SHA of the new commit
        const { data: newCommitData } = await octokit.rest.git.createCommit({
            owner: userName,
            repo: repoName,
            //message: commitMessage.value,
            message: "test commit",
            tree: newTreeSha,
            parents: [lastCommitSha]
        });
        const newCommitSha = newCommitData.sha;

        // Update the reference to point to the new commit
        await octokit.rest.git.updateRef({
            owner: userName,
            repo: repoName,
            ref: `heads/main`,
            sha: newCommitSha
        });

        console.log('new commit creation successful!');


    } catch (error) {
        console.error('Error creating new commit:', error);
    }
}