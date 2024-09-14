import { BratFrontendEditor } from "./client/src/Brat.js"
import { Octokit } from "https://esm.sh/octokit@2.1.0";

// get DOM elements
let patArea = document.getElementById('patArea')
let branchSelectArea = document.getElementById('branchSelectArea')
let fileSelectArea = document.getElementById('fileSelectArea')
let personalAccessToken = document.getElementById('personalAccessToken');
let authenticationButton = document.getElementById('authenticationButton');
let branchSelect = document.getElementById('branchSelect');
let branchSelectButton = document.getElementById('branchSelectButton');
let fileSelect = document.getElementById('fileSelect');
let fileSelectButton = document.getElementById('fileSelectButton');
let commitArea = document.getElementById('commitArea')
let commitConfirmButton = document.getElementById('commitConfirmButton');
let bratArea = document.getElementById('bratArea');
let showDocButton = document.getElementById('showDocButton');
let commitMessage = document.getElementById('commitMessage');
let filePathArea = document.getElementById('filePathArea');
let filePathInfo = document.getElementById('filePathInfo')

// initialize variables
let pat;
let octokit;
let branches;
let branch;
let files;
let fileName;
let text;
let brat;
let repoName;
let repoOwner;
let collData;
// annotated text shown in the start page
let docData = {
    "messages": [], "source_files": ["txt"], "modifications": [], "normalizations": [], "ctime": 0, "text": "This is an example of how your annotation will look like.\nUpload a txt or json file to start annotating your own text.\nDouble-click or select any span to add your annotation.",
    "entities": [["N1", "Object", [[11, 18]]], ["N2", "Child", [[67, 70]]], ["N3", "Baby", [[74, 78]]]], "attributes": [], "relations": [], "triggers": [["T1", "Assassination", [[119, 131]]], ["T2", "Bomb", [[135, 141]]]], "events": [["E1", "T1", []], ["E2", "T2", []]], "comments": [],
    "collection": null, "equivs": [], "sentence_offsets": [[0, 57], [58, 118], [119, 174]], "token_offsets": [[0, 4], [5, 7], [8, 10], [11, 18], [19, 21], [22, 25], [26, 30], [31, 41], [42, 46], [47, 51], [52, 57], [58, 64], [65, 66], [67, 70], [71, 73], [74, 78], [79, 83], [84, 86],
    [87, 92], [93, 103], [104, 108], [109, 112], [113, 118], [119, 131], [132, 134], [135, 141], [142, 145], [146, 150], [151, 153], [154, 157], [158, 162], [163, 174]]
}

// hide unwanted areas in the beginning
branchSelectArea.hidden = true;
fileSelectArea.hidden = true;
commitArea.hidden = true;
showDocButton.hidden = true;
filePathArea.hidden = true;

// attach event listener to buttons
authenticationButton.addEventListener('click', authenticationButtonClicked);
branchSelectButton.addEventListener('click', getBranchFiles);
fileSelectButton.addEventListener('click', getFileContent);
commitConfirmButton.addEventListener('click', pushCommit);

// fetch config file before starting annotation editor
fetch('./config.json')
    .then(response => response.json())
    .then(
        // assign values from config file to variables
        configData => {
            collData = configData
            repoName = configData.admin_config.repoName;
            repoOwner = configData.admin_config.repoOwner;
            /* filePath and branch are optional, if not defined in config file,
            the user will be prompted to select them in the user interface */
            if (configData.admin_config.filePath) {
                fileName = configData.admin_config.filePath;
            }
            if (configData.admin_config.branch) {
                branch = configData.admin_config.branch;
            }
            if (document.readyState === 'loading') {
                console.log("loading")
                // The document is still loading, so add an event listener
                document.addEventListener('DOMContentLoaded', initializeBrat)
            } else {
                console.log("loaded")
                initializeBrat()
            }
        })
    .then(() => {
        if (localStorage.getItem("personalAccessToken") != null) {
            personalAccessToken.value = localStorage.getItem("personalAccessToken")
            patArea.hidden = true;
            authenticationButtonClicked();
            console.log("personal access token found in local storage")
        }
    })
    .catch((err) => window.alert(`error initializing annotation editor: ${err}`))

// function to start annotation editor
function initializeBrat() {
    brat = new BratFrontendEditor(document.getElementById("brat"), collData, docData);
    brat.dispatcher.on('sglclick', this, function (data) {
        console.log(data);
    });
}

// function to update content in editor with a txt file
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

// function to update content in editor with a json file
function loadJson(data) {
    console.log("loadJson")
    let parsedJson = JSON.parse(data);
    if (parsedJson.text && parsedJson.entities && parsedJson.attributes) {
        docData = parsedJson;
        brat.docData = docData;
        updateBratEditor()
    } else {
        window.alert("Incompatible json format, file loaded as pure string")
        loadTxt(data)
    }

}

function updateBratEditor() {
    if (brat) {
        brat.dispatcher.post('requestRenderData', [docData]);
        brat.dispatcher.post('current', [collData, docData, {}]);
    }
}

async function getRepoBranches() {
    try {
        branches = await octokit.rest.repos.listBranches({
            owner: repoOwner,
            repo: repoName
        }).then(response => response.data.map(branch => branch.name));
        makeBranchDropdown()
        console.log(branches)
    } catch (error) {
        window.alert(`Error fetching branches from the repository, please check if the following information is correct:\n
            repository owner: ${repoOwner}\n
            repository name: ${repoName}\n
            error message: ${error}\n
            Hint: if all information is correct, it could be that you do not have permission to access the repository
            `)
    }
}

const makeBranchDropdown = () => {
    branchSelect.innerHTML = '';
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        branchSelect.appendChild(option);
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

async function authenticationButtonClicked() {
    console.log("authenticationButtonClicked")
    pat = personalAccessToken.value
    octokit = new Octokit({ auth: pat });
    if (!branch) {
        getRepoBranches();
        branchSelectArea.hidden = false;
        bratArea.hidden = true;
    } else if (!fileName) {
        getBranchFiles();
        bratArea.hidden = true;
    }
    else {
        getFileContent();
    }
    patArea.hidden = true;
    localStorage.setItem("personalAccessToken", personalAccessToken.value)
    console.log("personal access token saved in local storage")
}

/* 
retrieve name of files from the user-specified branch
and make a drop down list with them
*/
async function getBranchFiles() {
    /* if file path is already specified in the config file, skil this step
    and directly get file content */
    if (fileName) { getFileContent() };
    try {
        branch = branchSelect.value
        const response = await octokit.rest.repos.getContent({
            owner: repoOwner,
            repo: repoName,
            path: '',
            ref: branch
        });
        files = await response.data.map(file => file.path);
        makeFileDropdown();
        branchSelectArea.hidden = true;
        fileSelectArea.hidden = false;
    } catch (error) {
        window.alert(`Error fetching files from the branch, please check if the following information is correct:\n
            repository owner: ${repoOwner}\n
            repository name: ${repoName}\n
            file path: /\n
            branch: ${branch}\n
            error message: ${error}\n
            Hint: if all information is correct, it could be that you do not have permission to access the branch
            `)
    }
}

async function getFileContent() {
    try {
        if (!fileName) {
            fileName = fileSelect.value;
        }
        const response = await octokit.rest.repos.getContent({
            owner: repoOwner,
            repo: repoName,
            path: fileName,
            ref: branch
        });
        console.log(response)
        if (response.data.content) {
            text = atob(response.data.content);
            if (extractJSON(text)) {
                loadJson(text)
            } else {
                loadTxt(text)
            }
        }
        fileSelectArea.hidden = true;
        bratArea.hidden = false;
    } catch (error) {
        window.alert(`Error fetching file content, please check if the following information is correct:\n
            repository owner: ${repoOwner}\n
            repository name: ${repoName}\n
            file path: ${fileName}\n
            branch: ${branch}\n
            error message: ${error}\n
            Hint: if all information is correct, it could be that the file does not exist anymore or you do not have permission to access the file
            `)
    }
    commitArea.hidden = false;
    filePathArea.hidden = false;
    filePathInfo.value = repoName + "/" + fileName + `\nbranch ${branch}`
}

const extractJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

async function pushCommit() {
    try {
        /* retrieve previous commit */

        // get the SHA of the last commit
        const { data: refData } = await octokit.rest.git.getRef({
            owner: repoOwner,
            repo: repoName,
            ref: `heads/${branch}`,
        })
        const lastCommitSha = refData.object.sha

        // get the last commit's tree (the datastructure that actually holds the files)
        const { data: commitData } = await octokit.rest.git.getCommit({
            owner: repoOwner,
            repo: repoName,
            commit_sha: lastCommitSha,
        })
        const lastCommitTreeSha = commitData.tree.sha

        // get the tree with all files from the last commit
        const treeData = await octokit.rest.git.getTree({
            owner: repoOwner,
            repo: repoName,
            tree_sha: lastCommitTreeSha,
            recursive: "true", // fetch all files recursively
        }).then(response => response.data.tree)

        console.log("last commit retrieval successful")

        /* create new commit */

        // if current file is not json file, create a new json file with same name
        if (fileName.length > 0) {
            if (!fileName.includes(".json")) {
                fileName = fileName.replace(/\..+/i, ".json")
            }
        } else {
            fileName = "newFile.json"
        }
        const dataAsJSONString = JSON.stringify(docData, null, "\t");

        // find if the file already exists in the tree
        const existingFileIndex = treeData.findIndex(item => item.path === fileName);

        // if the file exists, remove it in oder to add updated file
        if (existingFileIndex >= 0) {
            treeData.splice(existingFileIndex, 1);
        }

        // add updated file
        treeData.push({
            path: fileName,
            mode: '100644',
            type: 'blob',
            content: dataAsJSONString
        })

        // create new tree with updated file
        const { data: newTreeData } = await octokit.rest.git.createTree({
            owner: repoOwner,
            repo: repoName,
            base_tree: lastCommitTreeSha,
            tree: treeData,
        });
        const newTreeSha = newTreeData.sha;

        // create new commit and get the SHA of the new commit
        const { data: newCommitData } = await octokit.rest.git.createCommit({
            owner: repoOwner,
            repo: repoName,
            message: commitMessage.value,
            tree: newTreeSha,
            parents: [lastCommitSha]
        });
        const newCommitSha = newCommitData.sha;

        // Update the reference to point to the new commit
        await octokit.rest.git.updateRef({
            owner: repoOwner,
            repo: repoName,
            ref: `heads/${branch}`,
            sha: newCommitSha
        });

        console.log('new commit creation successful!');


    } catch (error) {
        window.alert('Error pushing new commit:', error);
    }
}

showDocButton.addEventListener('click', () => console.log(docData));

/* Implementation of uploading and downloading local file:

            <div id="downloadArea" class="block">
                <div>Save annotated file</div>
                <textarea style="width:150px; height:50px" id="fileNameToSaveAs">Enter file name here...</textarea>
                <button id="downloadButton" type="button">Download</button>
            </div>
            <div id="uploadArea" class="block">
                <div>Upload new file (.txt / .json)</div>
                <input type="file" id="fileSelector" accept=".txt, .json" style="text-align:center">
            </div>
            
let fileSelector = document.getElementById('fileSelector');
let downloadButton = document.getElementById('downloadButton');
let downloadArea = document.getElementById('downloadArea');


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

/*
const getUserName = async () => {
    try {
        const {
            data: { login },
        } = await octokit.rest.users.getAuthenticated();
        userName = login;
        console.log("Hello, %s", login);
    } catch (error) {
        window.alert('Error fetching username:', error)
    }

}
*/