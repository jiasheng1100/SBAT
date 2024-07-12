import { Octokit } from "https://esm.sh/octokit@2.1.0";

let patArea = document.getElementById('patArea')
let repoSelectArea = document.getElementById('repoSelectArea')
let fileSelectArea = document.getElementById('fileSelectArea')
let personalAccessToken = document.getElementById('personalAccessToken');
let authenticationButton = document.getElementById('authenticationButton');
let repoSelect = document.getElementById('repoSelect');
let repoSelectButton = document.getElementById('repoSelectButton');
let fileSelect = document.getElementById('fileSelect');
let fileSelectButton = document.getElementById('fileSelectButton');
let octokit;
let userName;
let repos;
let files;
let repoName;
let fileName;
let text;

repoSelectArea.hidden = true;
fileSelectArea.hidden = true;

authenticationButton.addEventListener('click', authenticationButtonClicked);
repoSelectButton.addEventListener('click', getRepoFiles);
fileSelectButton.addEventListener('click', getFileContent);


async function authenticationButtonClicked() {
    console.log("authenticationButtonClicked")
    let authKey = personalAccessToken.value;
    octokit = new Octokit({ auth: authKey });
    getUserName()
        .then(() => getUserRepos())
    patArea.hidden = true;
    repoSelectArea.hidden = false;

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
        //repoSelectArea.hidden = true;
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
            console.log(text)
        }
    } catch (error) {
        console.error('Error fetching file content:', error)
    }
}