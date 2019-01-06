// BOOKMARKS FOLDER
function saveBookmarksFolder(e) {
    e.preventDefault();
    input_value = document.querySelector("#PUB_bookmarks_folder").value;
    if (!input_value) {
        throw new Error("invalid input for PUB_bookmarks_folder");
    }
    return updateBookmarksFolder(input_value)
        .then((ignore) => {
            let error_div = document.querySelector("#error-bookmarks-folder");
            if (!error_div.classList.contains("hidden")) {
                error_div.classList.add("hidden");
            }
        })
        .catch((err) => {
            let error_div = document.querySelector("#error-bookmarks-folder");
            let error_msg = document.querySelector("#error-bookmarks-folder-message");
            error_div.classList.remove("hidden");
            error_msg.innerHTML = err;
        });
}

function updateBookmarksFolder(new_folder) {
    return browser.bookmarks.search({title: new_folder})
        .then((bookmarks) => {
            if (bookmarks.length > 1) {
                throw Error("Already duplicated folder");
            }
            return new_folder;
        })
        .then(setBookmarksFolderName)
        .then(restoreOptions)
        .then(clearAllInputs);
}

function restoreBookmarksFolder(folder_name) {
    document.querySelector("#the-folder").innerText = folder_name;
}

function clearBookmarksFolderInput() {
    document.querySelector("#PUB_bookmarks_folder").value = null;
    document.querySelector("#PUB_import_folder").value = null;
}

function importFolder(e) {
    e.preventDefault();
    input_value = document.querySelector("#PUB_import_folder").value;
    if (!input_value) {
        throw new Error("invalid input for PUB_import_folder");
    }
    return importUrlsFromFolder(input_value)
        .then(clearBookmarksFolderInput);
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
                let rule = rules[i];
                let name = document.createTextNode(`[${rule.name}]`);
                let desc = document.createTextNode(`${rule.rule}`);
                let dt = document.createElement("dt");
                let dd = document.createElement("dd");
                let remove = document.createElement("span");
                remove.setAttribute("id", rule.id);
                remove.classList.add("remove");
                remove.appendChild(document.createTextNode("(remove)"));
                remove.addEventListener("click", removeClickedRule);
                dt.appendChild(name);
                dt.appendChild(remove);
                dd.appendChild(desc);
                list.appendChild(dt);
                list.appendChild(dd);
            }
        });
}

function removeClickedRule() {
    let id = this.id;
    removeRule(id)
        .then(restoreOptions);
}

function clearRulesInput() {
    document.querySelector("#PUB_rules_selector_name").value = null;
    document.querySelector("#PUB_rules_selector_rule").value = null;
}


// SUGGESTIONS
function saveSuggestionsListLength(e) {
    e.preventDefault();
    let input_value = document.querySelector("#PUB_suggestions_list_length").value;
    let new_value = parseInt(input_value);
    if (isNaN(new_value)) {
        throw Error("invalid input for PUB_suggestions_list_length");
    }
    return setSuggestionsListLength(new_value)
        .then(restoreOptions)
        .then(clearAllInputs);
}

function restoreSuggestions() {
    return getSuggestionsListLength()
        .then((suggestions_list_length) => {
            document.querySelector("#current-suggestions").innerText = suggestions_list_length;
        });
}

function clearSuggestions() {
    document.querySelector("#PUB_suggestions_list_length").value = null;
}


// WHOLE PAGE MANAGEMENT
function restoreOptions() {
    return getBookmarksFolderName()
        .then(restoreBookmarksFolder)
        .then(restoreRules)
        .then(restoreSuggestions);
}

function clearAllInputs() {
    clearBookmarksFolderInput();
    clearRulesInput();
    clearSuggestions();
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#PUB_bookmarks_folder_selector").addEventListener("submit", saveBookmarksFolder);
document.querySelector("#PUB_import_folder_selector").addEventListener("submit", importFolder);
document.querySelector("#PUB_rules_selector").addEventListener("submit", addRule);
document.querySelector("#PUB_suggestions_selector").addEventListener("submit", saveSuggestionsListLength);
