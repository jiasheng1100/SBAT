import { BratFrontendEditor } from "./client/src/Brat.js"
import { Octokit } from "https://esm.sh/octokit@2.1.0";

// get DOM elements
let patArea = document.getElementById('patArea');
let branchSelectArea = document.getElementById('branchSelectArea');
let fileSelectArea = document.getElementById('fileSelectArea');
let personalAccessToken = document.getElementById('personalAccessToken');
let authenticationButton = document.getElementById('authenticationButton');
let branchSelect = document.getElementById('branchSelect');
let branchSelectButton = document.getElementById('branchSelectButton');
let fileSelect = document.getElementById('fileSelect');
let fileSelectButton = document.getElementById('fileSelectButton');
let commitArea = document.getElementById('commitArea');
let commitConfirmButton = document.getElementById('commitConfirmButton');
let bratArea = document.getElementById('bratArea');
let showDocButton = document.getElementById('showDocButton');
let commitMessage = document.getElementById('commitMessage');
let message = document.getElementById('message');

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

// pre-define annotated text shown in the start page
let docData = {
    "messages": [], "source_files": ["txt"], "modifications": [], "normalizations": [], "ctime": 0, "text": "This is an example of how your annotations will look.\nDouble-click or drag to select a span of characters to add your annotation.\nStart annotating your own data by authenticating with your GitHub Personal Access Token.\nThe repository name, owner, file path and branch can be specified in config.json.\n",
    "entities": [["N1", "Object", [[31, 42]]], ["N2", "Person", [[240, 245]]], ["N3", "Object", [[189, 195]]],
    ["N4", "Object", [[196, 217]]], ["N5", "Person", [[113, 117]]]], "attributes": [], "relations": [], "triggers": [],
    "events": [], "comments": [], "equivs": [], "sentence_offsets": [[0, 53], [54, 129], [130, 218], [219, 300]],
    "token_offsets": [[0, 4], [5, 7], [8, 10], [11, 18], [19, 21], [22, 25], [26, 30], [31, 42], [43, 47], [48, 53],
    [54, 66], [67, 69], [70, 74], [75, 77], [78, 84], [85, 86], [87, 91], [92, 94], [95, 105], [106, 108], [109, 112], [113, 117], [118, 129],
    [130, 135], [136, 146], [147, 151], [152, 155], [156, 160], [161, 163], [164, 178], [179, 183], [184, 188], [189, 195],
    [196, 204], [205, 211], [212, 218], [219, 222], [223, 233], [234, 239], [240, 246], [247, 251], [252, 256], [257, 260],
    [261, 267], [268, 271], [272, 274], [275, 284], [285, 287], [288, 300]]
}

// hide unwanted areas in the beginning
branchSelectArea.hidden = true;
fileSelectArea.hidden = true;
commitArea.hidden = true;
showDocButton.hidden = true;

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
            /* if the document is still loading, only initialize Brat after loaded,
            otherwise, initialize Brat straight away */
            if (document.readyState === 'loading') {
                console.log("loading")
                document.addEventListener('DOMContentLoaded', initializeBrat)
            } else {
                console.log("loaded")
                initializeBrat()
            }
        })
    /* if there is already personal access token saved in localStorage, skip the
    prompting and authenticate the user with the saved pat right away */
    .then(() => {
        if (localStorage.getItem("personalAccessToken") != null) {
            console.log("personal access token found in local storage");
            personalAccessToken.value = localStorage.getItem("personalAccessToken");
            patArea.hidden = true;
            authenticationButtonClicked();
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

// update content in Brat editor with a txt file
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

// update Brat content in editor with a json file
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

// use the dispatcher to update the content to display in Brat editor
function updateBratEditor() {
    try {
        if (brat) {
            brat.dispatcher.post('requestRenderData', [docData]);
            brat.dispatcher.post('current', [collData, docData, {}]);
        }

        // Display successful message for 5 seconds
        message.innerHTML = `Sucessfully loaded file content:<br/>${repoName}/${fileName}, branch ${branch}`;
        setTimeout(function () {
            message.innerHTML = '';
        }, 5000);
    }
    catch (error) {
        window.alert(`Error updating Brat editor\n
            error message: ${error}
            `)
    }

}

/* retrieve all existing branches of the given repository
and make a drop down list with them */
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

// make a drop down list with all branch options
const makeBranchDropdown = () => {
    branchSelect.innerHTML = '';
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        branchSelect.appendChild(option);
    });
}

// make a drop down list with all file options
const makeFileDropdown = () => {
    fileSelect.innerHTML = '';
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelect.appendChild(option);
    });
}

// click handler for authentication button
async function authenticationButtonClicked() {
    console.log("authenticationButtonClicked");
    try {
        // try to authenticate the user with the given personal access token
        pat = personalAccessToken.value;
        octokit = new Octokit({ auth: pat });
        patArea.hidden = true;
        localStorage.setItem("personalAccessToken", personalAccessToken.value);
        console.log("personal access token saved in local storage");
        // if no branch name is given in the config file, allow the user to select it
        if (!branch) {
            getRepoBranches();
            branchSelectArea.hidden = false;
            bratArea.hidden = true;
            // if no file name is given in the config file, allow the user to select it
        } else if (!fileName) {
            getBranchFiles();
            bratArea.hidden = true;
        }
        // if both branch and file names are given, display file content in the editor
        else {
            getFileContent();
        }
    } catch (error) {
        patArea.hidden = false;
        window.alert(`Error authenticating user, please try again with a different token\n
        Error message: ${error}`);
    }



}

/* 
retrieve name of files from the user-specified branch
and make a drop down list with them
*/
async function getBranchFiles() {
    /* if file path is already specified in the config file, skip this step
    and directly get file content */
    if (fileName) { getFileContent() };
    try {
        if (!branch) {
            branch = branchSelect.value;
        };
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
            Note: Please also check if you have permission to access the branch or if your Personal Access Token is still valid
            `)
    }
}

// retrieve file content and display it in the editor
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
            Note: Please also check if you have permission to access the file or if your Personal Access Token is still valid
            `)
    }
    commitArea.hidden = false;
}

// function to check if a string is in json format
const extractJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

// commit the annotations and push to repository
async function pushCommit() {
    try {
        /* prepare for the commit */

        // if current file is not json file, create a new json file with same name
        if (fileName.length > 0) {
            if (!fileName.includes(".json")) {
                fileName = fileName.replace(/\..+/i, ".json")
            }
        } else {
            fileName = "newFile.json"
        }

        // display message
        message.innerHTML = `Commiting ${repoName}/${fileName},  branch ${branch}<br/>Please wait :)`;

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

        // transform the data into a json string
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

        // Display successful message for 5 seconds
        message.innerHTML = `Commit successful!<br/>See ${repoName}/${fileName}, branch ${branch}`;
        setTimeout(function () {
            message.innerHTML = '';
        }, 5000);
    } catch (error) {
        message.innerHTML = '';
        window.alert(`Error pushing new commit\n Error message: ${error}`);
    }
}

// log doc data for debugging
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