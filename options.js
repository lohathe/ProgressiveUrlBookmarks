// BOOKMARKS FOLDER
function saveBookmarksFolder(e) {
    e.preventDefault();
    input_value = document.querySelector("#PUB_bookmarks_folder").value;
    if (!input_value) {
        throw new Error("invalid input for PUB_bookmarks_folder");
    }
    return updateBookmarksFolder(input_value);
}

function updateBookmarksFolder(new_folder) {
    return browser.storage.sync.set({
        bookmarks_folder: new_folder,
    })
    .then(restoreOptions)
    .then(clearAllInputs)
}

function restoreBookmarksFolder(folder_name) {
    document.querySelector("#the-folder").innerText = folder_name;
}

function clearBookmarksFolderInput() {
    document.querySelector("#PUB_bookmarks_folder").value = null;
}


// RULES
function addRule(e) {
    e.preventDefault();
    const new_rule = {
        name: document.querySelector("#PUB_rules_selector_name").value,
        rule: document.querySelector("#PUB_rules_selector_rule").value,
    };
    if (!new_rule.name || !new_rule.rule) {
        throw new Error("invalid input for new PUB rule");
    }
    return appendRule(new_rule)
        .then(restoreRules)
        .then(clearAllInputs);
}

function restoreRules() {
    return getRules()
        .then((rules) => {
            const list = document.querySelector("#current-rules");
            list.innerHTML = "";
            for (let i=0; i<rules.length; i++) {
                var li = document.createElement("li");
                const rule = rules[i];
                const text = document.createTextNode(`[${rule.name}] ${rule.rule}`);
                li.appendChild(text);
                list.appendChild(li);
            }
        });
}

function clearRulesInput() {
    document.querySelector("#PUB_rules_selector_name").value = null;
    document.querySelector("#PUB_rules_selector_rule").value = null;
}


// WHOLE PAGE MANAGEMENT
function restoreOptions() {
    return getBookmarksFolderName()
        .then(restoreBookmarksFolder)
        .then(restoreRules);
}

function clearAllInputs() {
    clearBookmarksFolderInput();
    clearRulesInput();
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#PUB_bookmarks_folder_selector").addEventListener("submit", saveBookmarksFolder);
document.querySelector("#PUB_rules_selector").addEventListener("submit", addRule);
